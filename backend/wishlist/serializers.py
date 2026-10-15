from rest_framework import serializers
from products.serializers import ProductListSerializer
from .models import Wishlist


class WishlistSerializer(serializers.ModelSerializer):
    products = ProductListSerializer(many=True, read_only=True)
    count = serializers.SerializerMethodField()

    class Meta:
        model = Wishlist
        fields = ['id', 'products', 'count', 'created_at']
        read_only_fields = ['id', 'products', 'count', 'created_at']

    def get_count(self, obj):
        return obj.products.count()


class WishlistModifySerializer(serializers.Serializer):
    product_slug = serializers.SlugField()

    def validate_product_slug(self, value):
        from products.models import Product
        if not Product.objects.filter(slug=value, is_active=True).exists():
            raise serializers.ValidationError('Product not found or unavailable.')
        return value
