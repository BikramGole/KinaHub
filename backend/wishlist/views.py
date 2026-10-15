from rest_framework import permissions, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from products.models import Product
from .models import Wishlist
from .serializers import WishlistSerializer, WishlistModifySerializer


class WishlistViewSet(viewsets.ViewSet):
    """Current-user wishlist. One wishlist per user (get_or_create)."""
    permission_classes = [permissions.IsAuthenticated]

    def _get_wishlist(self, user):
        wishlist, _ = Wishlist.objects.prefetch_related(
            'products__category', 'products__brand', 'products__store', 'products__images'
        ).get_or_create(user=user)
        return wishlist

    def list(self, request):
        wishlist = self._get_wishlist(request.user)
        return Response(WishlistSerializer(wishlist, context={'request': request}).data)

    @action(detail=False, methods=['post'])
    def add(self, request):
        serializer = WishlistModifySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        product = get_object_or_404(
            Product, slug=serializer.validated_data['product_slug'], is_active=True
        )
        wishlist = self._get_wishlist(request.user)
        wishlist.products.add(product)
        return Response(WishlistSerializer(wishlist, context={'request': request}).data)

    @action(detail=False, methods=['post'])
    def remove(self, request):
        serializer = WishlistModifySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        product = get_object_or_404(Product, slug=serializer.validated_data['product_slug'])
        wishlist = self._get_wishlist(request.user)
        wishlist.products.remove(product)
        return Response(WishlistSerializer(wishlist, context={'request': request}).data)

    @action(detail=False, methods=['post', 'delete'])
    def clear(self, request):
        wishlist = self._get_wishlist(request.user)
        wishlist.products.clear()
        return Response(WishlistSerializer(wishlist, context={'request': request}).data)

    @action(detail=False, methods=['get'], url_path='check')
    def check(self, request):
        slug = (request.query_params.get('product') or '').strip()
        if not slug:
            return Response({'in_wishlist': False})
        wishlist = self._get_wishlist(request.user)
        exists = wishlist.products.filter(slug=slug).exists()
        return Response({'in_wishlist': exists})
