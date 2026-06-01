from django.db.models import Q, DecimalField
from django.db.models.functions import Coalesce
from rest_framework import viewsets, permissions
from rest_framework.decorators import action
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

class ProductViewSet(viewsets.ModelViewSet):
    queryset = Product.objects.filter(is_active=True).select_related('store', 'category', 'brand').prefetch_related('images')
    serializer_class = ProductSerializer
    permission_classes = [ProductAccessPermission]
    lookup_field = 'slug'

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
                return Product.objects.filter(store=store).select_related('store', 'category', 'brand').prefetch_related('images')
            if self.request.user.effective_role == "admin":
                return Product.objects.all().select_related('store', 'category', 'brand').prefetch_related('images')

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

    def perform_create(self, serializer):
        if self.request.user.effective_role == "admin":
            serializer.save()
            return
        seller_profile = getattr(self.request.user, "seller_profile", None)
        store = getattr(seller_profile, "store", None)
        if not store:
            raise ValidationError({"store": "Complete seller onboarding before adding products."})
        serializer.save(store=store)

    def perform_update(self, serializer):
        product = self.get_object()
        if self.request.user.effective_role == "admin":
            serializer.save()
            return
        store = getattr(getattr(self.request.user, "seller_profile", None), "store", None)
        if product.store_id != getattr(store, "id", None):
            raise PermissionDenied("You can only manage your own store products.")
        serializer.save(store=store)

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

class CategoryViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Category.objects.all()
    serializer_class = CategorySerializer
    permission_classes = [permissions.AllowAny]

class BrandViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Brand.objects.all()
    serializer_class = BrandSerializer
    permission_classes = [permissions.AllowAny]


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
            name = self.request.user.get_full_name().strip() or self.request.user.email
        if not name:
            name = 'Guest'
        rating = int(self.request.data.get('rating') or 5)
        rating = max(1, min(rating, 5))
        serializer.save(
            product=product,
            user=self.request.user if self.request.user.is_authenticated else None,
            name=name,
            rating=rating,
            is_verified_purchase=False,
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
