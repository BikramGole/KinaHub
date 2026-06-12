from django.db.models import Avg, Count, DecimalField, Q
from django.db.models.functions import Coalesce
from django.core.cache import cache
from rest_framework import viewsets, permissions
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.exceptions import PermissionDenied, ValidationError
from django.shortcuts import get_object_or_404
from .models import Product, Category, Brand, Review
from .serializers import ProductSerializer, CategorySerializer, BrandSerializer, ReviewSerializer

class ProductAccessPermission(permissions.BasePermission):
    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return True
        return bool(request.user and request.user.is_authenticated and request.user.effective_role in ["seller", "admin"])

def product_queryset(include_inactive: bool = False):
    queryset = Product.objects.all() if include_inactive else Product.objects.filter(is_active=True)
    return (
        queryset
        .select_related('store', 'category', 'brand')
        .prefetch_related('images')
        .annotate(
            review_count=Count('reviews', distinct=True),
            average_rating=Coalesce(Avg('reviews__rating'), 'rating', output_field=DecimalField(max_digits=3, decimal_places=2)),
        )
    )

class ProductViewSet(viewsets.ModelViewSet):
    queryset = product_queryset()
    serializer_class = ProductSerializer
    permission_classes = [ProductAccessPermission]
    lookup_field = 'slug'

    def list(self, request, *args, **kwargs):
        response = super().list(request, *args, **kwargs)
        if not getattr(request.user, 'is_authenticated', False) and not request.query_params.get('mine'):
            response['Cache-Control'] = 'public, max-age=300, stale-while-revalidate=600'
        return response

    def retrieve(self, request, *args, **kwargs):
        response = super().retrieve(request, *args, **kwargs)
        if not getattr(request.user, 'is_authenticated', False):
            response['Cache-Control'] = 'public, max-age=300, stale-while-revalidate=600'
        return response

    def get_queryset(self):
        queryset = super().get_queryset()

        category = self.request.query_params.get('category')
        brand = self.request.query_params.get('brand')
        store = self.request.query_params.get('store')
        featured = self.request.query_params.get('featured')
        query = self.request.query_params.get('q')
        price_min = self.request.query_params.get('price_min')
        price_max = self.request.query_params.get('price_max')
        sort = self.request.query_params.get('sort', '').lower().strip()
        mine = self.request.query_params.get('mine', 'false').lower() == 'true'

        if mine:
            if not self.request.user.is_authenticated:
                return queryset.none()
            if self.request.user.effective_role == "seller":
                store = getattr(getattr(self.request.user, "seller_profile", None), "store", None)
                return product_queryset().filter(store=store)
            if self.request.user.effective_role == "admin":
                return product_queryset(include_inactive=True)

        if category:
            queryset = queryset.filter(category__slug=category)
        if brand:
            queryset = queryset.filter(brand__slug=brand)
        if store:
            queryset = queryset.filter(store__slug=store)
        if featured:
            queryset = queryset.filter(is_featured=featured.lower() == 'true')
        if query:
            queryset = queryset.filter(
                Q(name__icontains=query) |
                Q(description__icontains=query) |
                Q(category__name__icontains=query) |
                Q(brand__name__icontains=query) |
                Q(store__name__icontains=query)
            )

        if price_min or price_max:
            queryset = queryset.annotate(
                effective_price=Coalesce('discount_price', 'price', output_field=DecimalField(max_digits=10, decimal_places=2))
            )
            if price_min:
                queryset = queryset.filter(effective_price__gte=price_min)
            if price_max:
                queryset = queryset.filter(effective_price__lte=price_max)

        is_random = self.request.query_params.get('random', 'false').lower() == 'true'
        if sort == 'price_low':
            queryset = queryset.annotate(
                effective_price=Coalesce('discount_price', 'price', output_field=DecimalField(max_digits=10, decimal_places=2))
            ).order_by('effective_price', '-created_at')
        elif sort == 'price_high':
            queryset = queryset.annotate(
                effective_price=Coalesce('discount_price', 'price', output_field=DecimalField(max_digits=10, decimal_places=2))
            ).order_by('-effective_price', '-created_at')
        elif sort == 'rating_high':
            queryset = queryset.order_by('-rating', '-created_at')
        elif sort == 'rating_low':
            queryset = queryset.order_by('rating', '-created_at')
        elif sort == 'newest':
            queryset = queryset.order_by('-created_at')
        elif sort == 'oldest':
            queryset = queryset.order_by('created_at')
        elif sort == 'name_az':
            queryset = queryset.order_by('name', '-created_at')
        elif sort == 'name_za':
            queryset = queryset.order_by('-name', '-created_at')
        elif sort == 'featured':
            queryset = queryset.order_by('-is_featured', '-created_at')
        elif is_random:
            # Note: order_by('?') is expensive on large datasets, but for small-mid size tech site it's fine.
            # Alternately we could fetch all IDs and shuffle them in memory if needed.
            return queryset.order_by('?')

        return queryset

    def _save_uploaded_images(self, product, files):
        """Upload image files and create ProductImage records."""
        import os
        from django.conf import settings as django_settings
        from django.core.files.storage import FileSystemStorage

        for idx, img_file in enumerate(files):
            is_primary = idx == 0 and not product.images.exists()
            cloud_name = getattr(django_settings, 'CLOUDINARY_CLOUD_NAME', '')
            if cloud_name:
                try:
                    import cloudinary.uploader
                    result = cloudinary.uploader.upload(
                        img_file,
                        folder='kinahub/products',
                        public_id=f"{product.slug}-{idx}",
                        overwrite=True,
                    )
                    url = result.get('secure_url', '')
                except Exception:
                    url = ''
            else:
                upload_dir = os.path.join(django_settings.MEDIA_ROOT, 'products')
                os.makedirs(upload_dir, exist_ok=True)
                fs = FileSystemStorage(location=upload_dir)
                filename = fs.save(img_file.name, img_file)
                url = f"/media/products/{filename}"
            if url:
                ProductImage.objects.create(
                    product=product,
                    image_url=url,
                    alt_text=product.name,
                    is_primary=is_primary,
                    order=product.images.count(),
                )

    def perform_create(self, serializer):
        if self.request.user.effective_role == "admin":
            product = serializer.save()
        else:
            seller_profile = getattr(self.request.user, "seller_profile", None)
            store = getattr(seller_profile, "store", None)
            if not store:
                raise ValidationError({"store": "Complete seller onboarding before adding products."})
            product = serializer.save(store=store)
        files = self.request.FILES.getlist('images')
        if files:
            self._save_uploaded_images(product, files)

    def perform_update(self, serializer):
        product = self.get_object()
        if self.request.user.effective_role == "admin":
            updated = serializer.save()
        else:
            store = getattr(getattr(self.request.user, "seller_profile", None), "store", None)
            if product.store_id != getattr(store, "id", None):
                raise PermissionDenied("You can only manage your own store products.")
            updated = serializer.save(store=store)
        files = self.request.FILES.getlist('images')
        if files:
            self._save_uploaded_images(updated, files)

    @action(detail=True, methods=["get"], url_path="similar")
    def similar_products(self, request, slug=None):
        product = self.get_object()
        base_price = float(product.discount_price or product.price or 0)
        candidates = (
            Product.objects.filter(is_active=True)
            .exclude(pk=product.pk)
            .select_related("store", "category", "brand")
            .prefetch_related("images")
        )

        scored = []
        for candidate in candidates:
            score = 0.0
            if candidate.category_id == product.category_id:
                score += 60
            if candidate.brand_id and candidate.brand_id == product.brand_id:
                score += 30
            if candidate.store_id and candidate.store_id == product.store_id:
                score += 20

            candidate_price = float(candidate.discount_price or candidate.price or 0)
            if base_price and candidate_price:
                price_gap = abs(candidate_price - base_price) / max(base_price, candidate_price)
                score += max(0.0, 20 - (price_gap * 100))

            score += min(float(candidate.rating or 0) * 2.5, 12)
            if candidate.is_featured:
                score += 5
            if candidate.category_id == product.category_id and candidate.brand_id == product.brand_id:
                score += 8

            scored.append((score, candidate))

        scored.sort(key=lambda item: (item[0], item[1].rating, item[1].created_at), reverse=True)
        ranked = [candidate for score, candidate in scored[:12] if score > 0]

        if len(ranked) < 6:
            fallback = (
                Product.objects.filter(is_active=True)
                .exclude(pk=product.pk)
                .select_related("store", "category", "brand")
                .prefetch_related("images")
                .order_by("-rating", "-created_at")[:12]
            )
            existing_ids = {item.pk for item in ranked}
            for candidate in fallback:
                if candidate.pk not in existing_ids:
                    ranked.append(candidate)
                if len(ranked) >= 12:
                    break

        serializer = self.get_serializer(ranked[:12], many=True)
        return Response(serializer.data)

from django.utils.decorators import method_decorator
from django.views.decorators.cache import cache_page

class CategoryViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Category.objects.all()
    serializer_class = CategorySerializer
    permission_classes = [permissions.AllowAny]

    @method_decorator(cache_page(60 * 60))
    def dispatch(self, *args, **kwargs):
        return super().dispatch(*args, **kwargs)

class BrandViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Brand.objects.all()
    serializer_class = BrandSerializer
    permission_classes = [permissions.AllowAny]

    @method_decorator(cache_page(60 * 60))
    def dispatch(self, *args, **kwargs):
        return super().dispatch(*args, **kwargs)


class ReviewViewSet(viewsets.ModelViewSet):
    queryset = Review.objects.select_related('product', 'user')
    serializer_class = ReviewSerializer
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        queryset = super().get_queryset()
        product_slug = self.request.query_params.get('product')
        if product_slug:
            queryset = queryset.filter(product__slug=product_slug)
        return queryset

    def perform_create(self, serializer):
        product_ref = self.request.data.get('product')
        if not product_ref:
            raise ValidationError({"product": "Product is required."})
        product = get_object_or_404(Product, slug=product_ref)
        name = (self.request.data.get('name') or '').strip()
        if not name and self.request.user.is_authenticated:
            full_name = f"{self.request.user.first_name} {self.request.user.last_name}".strip()
            name = full_name or self.request.user.email or self.request.user.username
        if not name:
            name = 'Guest'
        rating = int(self.request.data.get('rating') or 5)
        rating = max(1, min(rating, 5))
        from django.core.files.storage import FileSystemStorage
        import os
        from django.conf import settings

        # Handle files
        image_url = ''
        video_url = ''
        
        image_file = self.request.FILES.get('image')
        if image_file:
            fs = FileSystemStorage(location=os.path.join(settings.MEDIA_ROOT, 'reviews'))
            filename = fs.save(image_file.name, image_file)
            image_url = f"/media/reviews/{filename}"
            
        video_file = self.request.FILES.get('video')
        if video_file:
            fs = FileSystemStorage(location=os.path.join(settings.MEDIA_ROOT, 'reviews'))
            filename = fs.save(video_file.name, video_file)
            video_url = f"/media/reviews/{filename}"

        serializer.save(
            product=product,
            user=self.request.user if self.request.user.is_authenticated else None,
            name=name,
            rating=rating,
            is_verified_purchase=False,
            image_url=image_url,
            video_url=video_url
        )


class SearchSuggestionsView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        query = (request.query_params.get('q') or '').strip().lower()
        if len(query) < 2:
            return Response({'suggestions': []})

        suggestions = []
        seen = set()

        def add_suggestion(value: str):
            normalized = value.strip().lower()
            if normalized and normalized not in seen:
                seen.add(normalized)
                suggestions.append(value.strip())

        # 1. Exact or partial category matches
        categories = Category.objects.filter(
            Q(name__icontains=query) | Q(slug__icontains=query) | Q(description__icontains=query)
        ).values_list('name', 'slug')[:4]
        for category_name, category_slug in categories:
            add_suggestion(category_name)
            add_suggestion(f"{category_name} products")
            add_suggestion(f"{category_slug.replace('-', ' ')} deals")

        # 2. Products matching query
        products = Product.objects.filter(
            is_active=True
        ).filter(
            Q(name__icontains=query) |
            Q(category__name__icontains=query) |
            Q(category__slug__icontains=query) |
            Q(brand__name__icontains=query) |
            Q(store__name__icontains=query) |
            Q(description__icontains=query)
        ).select_related('category', 'brand', 'store')[:24]

        for p in products:
            add_suggestion(p.name)
            if p.brand:
                add_suggestion(f"{p.brand.name} {p.category.name}")
                add_suggestion(f"{p.brand.name} {p.name}")
            add_suggestion(f"{p.category.name} from {p.store.name}" if p.store else f"{p.category.name} products")
            if p.store:
                add_suggestion(f"{p.name} from {p.store.name}")
                add_suggestion(f"{p.store.name} {p.category.name}")
                add_suggestion(f"{p.store.name} store")
            # Suggest a more specific comparison/search phrase for marketplace-style navigation.
            if p.brand:
                add_suggestion(f"{p.category.name} {p.brand.name}")
                add_suggestion(f"{p.brand.name} {p.category.name} from {p.store.name}" if p.store else f"{p.brand.name} {p.category.name}")

        # Return top 8
        return Response({'suggestions': suggestions[:8]})

from django.conf import settings
from django.core.files.storage import FileSystemStorage
from django.shortcuts import render, redirect
from django.views.decorators.csrf import csrf_exempt
from .models import ImageCurationRating

@csrf_exempt
def curation_view(request):
    total = Product.objects.count()
    count = ImageCurationRating.objects.count()

    if request.method == "POST":
        action = request.POST.get("action")
        
        if action == "undo":
            last_rating = ImageCurationRating.objects.order_by('-updated_at').first()
            if last_rating:
                last_rating.delete()
            return redirect('curation_view')
            
        product_id = request.POST.get("product_id")
        rating = request.POST.get("rating")
        new_image = request.FILES.get("new_image")
        
        try:
            product = Product.objects.get(id=product_id)
            
            if new_image:
                import os
                # Ensure target directory exists in the frontend public folder
                base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__))) # backend dir
                project_root = os.path.dirname(base_dir) # kina_ai dir
                target_dir = os.path.join(project_root, 'frontend', 'public', 'product-media')
                os.makedirs(target_dir, exist_ok=True)
                
                # Save the new image as [slug].ext
                ext = new_image.name.split('.')[-1]
                if not ext: ext = 'jpg'
                filename = f"{product.slug}.{ext}"
                filepath = os.path.join(target_dir, filename)
                
                # Remove old file if it exists to overwrite
                if os.path.exists(filepath):
                    os.remove(filepath)
                    
                fs = FileSystemStorage(location=target_dir)
                fs.save(filename, new_image)
                
                # Update the ProductImage in database to use frontend path
                new_url = f"/product-media/{filename}"
                product_img = product.images.first()
                if product_img:
                    product_img.image_url = new_url
                    product_img.save()
                else:
                    ProductImage.objects.create(product=product, image_url=new_url, is_primary=True)
                
                # If they upload an image, automatically count it as 'good'
                rating = "good"
                
            if rating:
                ImageCurationRating.objects.update_or_create(
                    product=product,
                    defaults={'rating': rating}
                )
                
        except Product.DoesNotExist:
            pass
            
        return redirect('curation_view')

    # GET request - find next unrated product
    unrated_products = Product.objects.filter(curation_rating__isnull=True).order_by('id')
    product = unrated_products.first()
    product_image = product.images.first() if product else None

    context = {
        'product': product,
        'product_image': product_image,
        'count': count,
        'total': total,
    }
    return render(request, 'products/curation.html', context)


import os
import requests

class AiChatView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        messages = request.data.get("messages", [])
        if not messages:
            return Response({"error": "No messages provided"}, status=400)
            
        api_key = os.environ.get("OPENROUTER_API_KEY")
        if not api_key:
            return Response({"error": "OPENROUTER_API_KEY not configured on server"}, status=501)

        model = request.data.get("model", "google/gemma-2-9b-it:free")
        
        try:
            response = requests.post(
                "https://openrouter.ai/api/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json",
                    "HTTP-Referer": "https://kinahub.vercel.app",
                    "X-Title": "KinaHub",
                },
                json={
                    "model": model,
                    "messages": messages,
                    "temperature": 0.7,
                },
                timeout=15
            )
            response.raise_for_status()
            data = response.json()
            return Response(data)
        except Exception as e:
            return Response({"error": str(e)}, status=500)

@api_view(['GET'])
@permission_classes([permissions.AllowAny])
def homepage_data(request):
    data = cache.get('homepage_data')
    if data:
        return Response(data)

    def serialize_products(qs, limit=10):
        # We manually apply the annotations used in product_queryset so the serializer works correctly.
        products = qs.select_related('store', 'category', 'brand').prefetch_related('images').annotate(
            review_count=Count('reviews', distinct=True),
            average_rating=Coalesce(Avg('reviews__rating'), 'rating', output_field=DecimalField(max_digits=3, decimal_places=2)),
        )[:limit]
        return ProductSerializer(products, many=True, context={'request': request}).data

    base_qs = Product.objects.filter(is_active=True)

    random_products = serialize_products(base_qs.order_by('?'), limit=40)
    newest = serialize_products(base_qs.order_by('-created_at'), limit=16)
    laptops = serialize_products(base_qs.filter(category__slug='laptops'), limit=10)
    fashion = serialize_products(base_qs.filter(category__slug='fashion'), limit=10)
    groceries = serialize_products(base_qs.filter(category__slug='groceries'), limit=10)
    books = serialize_products(base_qs.filter(category__slug='books'), limit=10)
    featured = serialize_products(base_qs.filter(is_featured=True), limit=12)

    categories = Category.objects.all()
    categories_data = CategorySerializer(categories, many=True, context={'request': request}).data

    data = {
        'random': random_products,
        'newest': newest,
        'laptops': laptops,
        'fashion': fashion,
        'groceries': groceries,
        'books': books,
        'categories': categories_data,
        'featured': featured,
    }

    cache.set('homepage_data', data, 60 * 15)  # Cache for 15 minutes
    return Response(data)
