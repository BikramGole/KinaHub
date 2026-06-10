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
        request = self.context.get('request')
        if obj.image_url and obj.image_url.startswith('/media/') and request:
            return request.build_absolute_uri(obj.image_url)
        return obj.image_url


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
        request = self.context.get('request')
        if obj.image_url and obj.image_url.startswith('/media/') and request:
            return request.build_absolute_uri(obj.image_url)
        return obj.image_url

    def get_video_url(self, obj):
        request = self.context.get('request')
        if obj.video_url and obj.video_url.startswith('/media/') and request:
            return request.build_absolute_uri(obj.video_url)
        return obj.video_url

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

class ProductSerializer(serializers.ModelSerializer):
    category = CategorySerializer(read_only=True)
    category_id = serializers.PrimaryKeyRelatedField(source="category", queryset=Category.objects.all(), write_only=True)
    brand = BrandSerializer(read_only=True)
    brand_id = serializers.PrimaryKeyRelatedField(source="brand", queryset=Brand.objects.all(), write_only=True, required=False, allow_null=True)
    store = StoreSerializer(read_only=True)
    images = ProductImageSerializer(many=True, read_only=True)
    primary_image_url = serializers.URLField(write_only=True, required=False, allow_blank=True)
    inventory = InventorySerializer(read_only=True)
    specs = serializers.SerializerMethodField()
    review_count = serializers.SerializerMethodField()
    average_rating = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = [
            'id', 'name', 'slug', 'store', 'category', 'category_id', 'brand', 'brand_id',
            'description', 'specifications', 'specs',
            'price', 'discount_price', 'stock', 'rating', 
            'tag', 'images', 'primary_image_url', 'inventory', 'review_count', 'average_rating', 'is_featured', 'is_active',
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
        product = super().update(instance, validated_data)
        Inventory.objects.update_or_create(product=product, defaults={"quantity": product.stock})
        if image_url:
            ProductImage.objects.update_or_create(
                product=product,
                order=0,
                defaults={"image_url": image_url, "alt_text": product.name, "is_primary": True},
            )
        return product

    def get_specs(self, obj):
        return obj.get_specs_list()

    def get_review_count(self, obj):
        cached = getattr(obj, 'review_count', None)
        if cached is not None:
            return int(cached)
        return obj.reviews.count()

    def get_average_rating(self, obj):
        cached = getattr(obj, 'average_rating', None)
        if cached is not None:
            return round(float(cached), 2)
        reviews = obj.reviews.all()
        if not reviews.exists():
            return float(obj.rating)
        return round(sum(review.rating for review in reviews) / reviews.count(), 2)
