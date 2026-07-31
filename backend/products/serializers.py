from rest_framework import serializers
from sellers.serializers import StoreSerializer
from .models import Product, Category, Brand, ProductImage, Inventory, Review

class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ['id', 'name', 'slug', 'description']

class BrandSerializer(serializers.ModelSerializer):
    class Meta:
        model = Brand
        fields = ['id', 'name', 'slug']

class ProductImageSerializer(serializers.ModelSerializer):
    image_url = serializers.SerializerMethodField()

    class Meta:
        model = ProductImage
        fields = ['id', 'image_url', 'alt_text', 'is_primary', 'order']

    def get_image_url(self, obj):
        return resolve_image_url(obj.image_url, self.context)

def resolve_image_url(url, context=None):
    if not url:
        return url
    if url.startswith('/media/'):
        request = context.get('request') if context else None
        if request:
            return request.build_absolute_uri(url)
        from django.conf import settings
        frontend = getattr(settings, 'FRONTEND_URL', '').rstrip('/')
        if frontend:
            return f'{frontend}{url}'
        return url
    if url.startswith('/product-media/'):
        from django.conf import settings
        frontend = getattr(settings, 'FRONTEND_URL', '').rstrip('/')
        if frontend:
            return f'{frontend}{url}'
        return url
    return url


class InventorySerializer(serializers.ModelSerializer):
    available_quantity = serializers.IntegerField(read_only=True)

    class Meta:
        model = Inventory
        fields = ["sku", "quantity", "low_stock_threshold", "reserved_quantity", "available_quantity", "updated_at"]
    read_only_fields = ["reserved_quantity", "available_quantity", "updated_at"]


class ReviewSerializer(serializers.ModelSerializer):
    created_at = serializers.DateTimeField(read_only=True)
    updated_at = serializers.DateTimeField(read_only=True)
    image_url = serializers.SerializerMethodField()
    video_url = serializers.SerializerMethodField()

    def get_image_url(self, obj):
        return resolve_image_url(obj.image_url, self.context)

    def get_video_url(self, obj):
        return resolve_image_url(obj.video_url, self.context)

    class Meta:
        model = Review
        fields = [
            "id",
            "product",
            "name",
            "rating",
            "title",
            "comment",
            "image_url",
            "video_url",
            "is_verified_purchase",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "product", "created_at", "updated_at", "is_verified_purchase"]

class ProductListSerializer(serializers.ModelSerializer):
    category = serializers.SerializerMethodField()
    brand = serializers.SerializerMethodField()
    store = serializers.SerializerMethodField()
    image_url = serializers.URLField(source='primary_image_url_sub', read_only=True)
    review_count = serializers.IntegerField(read_only=True)
    average_rating = serializers.FloatField(read_only=True)
    specs = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = [
            'id', 'name', 'slug', 'store', 'category', 'brand',
            'description', 'specs', 'price', 'discount_price', 'stock', 'rating',
            'tag', 'image_url', 'review_count', 'average_rating', 'is_featured', 'is_active',
            'created_at', 'updated_at'
        ]

    def get_category(self, obj):
        return {'id': obj.category_id, 'name': obj.category.name, 'slug': obj.category.slug} if obj.category_id else None

    def get_brand(self, obj):
        return {'id': obj.brand_id, 'name': obj.brand.name, 'slug': obj.brand.slug} if obj.brand_id else None

    def get_store(self, obj):
        return {'id': obj.store_id, 'name': obj.store.name, 'slug': obj.store.slug} if obj.store_id else None

    def get_specs(self, obj):
        return obj.get_specs_list()


class ProductSerializer(ProductListSerializer):
    category_id = serializers.PrimaryKeyRelatedField(source="category", queryset=Category.objects.all(), write_only=True)
    brand_id = serializers.PrimaryKeyRelatedField(source="brand", queryset=Brand.objects.all(), write_only=True, required=False, allow_null=True)
    images = ProductImageSerializer(many=True, read_only=True)
    primary_image_url = serializers.URLField(write_only=True, required=False, allow_blank=True)
    remove_image_ids = serializers.ListField(
        child=serializers.IntegerField(),
        write_only=True,
        required=False,
        allow_empty=True,
    )
    inventory = InventorySerializer(read_only=True)
    category = CategorySerializer(read_only=True)
    brand = BrandSerializer(read_only=True)
    store = StoreSerializer(read_only=True)

    class Meta:
        model = Product
        fields = [
            'id', 'name', 'slug', 'store', 'category', 'category_id', 'brand', 'brand_id',
            'description', 'specifications', 'specs',
            'price', 'discount_price', 'stock', 'rating',
            'tag', 'images', 'primary_image_url', 'remove_image_ids', 'inventory', 'review_count', 'average_rating', 'is_featured', 'is_active',
            'created_at', 'updated_at'
        ]
        read_only_fields = ["id", "slug", "store", "images", "inventory", "created_at", "updated_at"]

    def create(self, validated_data):
        image_url = validated_data.pop("primary_image_url", "")
        product = Product.objects.create(**validated_data)
        Inventory.objects.create(product=product, quantity=product.stock)
        if image_url:
            ProductImage.objects.create(product=product, image_url=image_url, alt_text=product.name, is_primary=True)
        return product

    def update(self, instance, validated_data):
        image_url = validated_data.pop("primary_image_url", "")
        remove_ids = validated_data.pop("remove_image_ids", None)
        product = super().update(instance, validated_data)
        Inventory.objects.update_or_create(product=product, defaults={"quantity": product.stock})
        if remove_ids:
            product.images.filter(id__in=remove_ids).delete()
        if image_url:
            ProductImage.objects.update_or_create(
                product=product,
                order=0,
                defaults={"image_url": image_url, "alt_text": product.name, "is_primary": True},
            )
        return product
