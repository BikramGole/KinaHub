from django.db.models import Count, DecimalField, ExpressionWrapper, F, Q, Sum
from rest_framework.exceptions import PermissionDenied
from rest_framework import permissions, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from orders.models import OrderItem
from products.models import Product
from .models import SellerProfile, Store
from .serializers import SellerProfileSerializer, StoreSerializer


class IsSellerOrAdmin(permissions.BasePermission):
    def has_permission(self, request, view):
        user = request.user
        return bool(user and user.is_authenticated and (user.effective_role in ["seller", "admin"]))


class StorePermission(permissions.BasePermission):
    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return True
        user = request.user
        return bool(user and user.is_authenticated and (user.effective_role in ["seller", "admin"]))


class SellerProfileViewSet(viewsets.ModelViewSet):
    serializer_class = SellerProfileSerializer
    permission_classes = [IsSellerOrAdmin]

    def get_queryset(self):
        queryset = SellerProfile.objects.select_related("user").prefetch_related("store")
        if self.request.user.effective_role == "admin":
            return queryset
        return queryset.filter(user=self.request.user)

    def perform_update(self, serializer):
        if self.request.user.effective_role != "admin":
            forbidden = {"status", "internal_notes"} & set(self.request.data.keys())
            if forbidden:
                raise PermissionDenied("Only admins can change seller moderation fields.")
        serializer.save()

    @action(detail=False, methods=["get"])
    def dashboard(self, request):
        seller_profile = getattr(request.user, "seller_profile", None)
        if not seller_profile:
            return Response({"detail": "Seller profile not found."}, status=404)

        store = getattr(seller_profile, "store", None)
        if not store:
            return Response({"store": None, "products": 0, "active_products": 0, "orders": 0, "units_sold": 0, "revenue": "0", "top_products": []})

        product_stats = Product.objects.filter(store=store).aggregate(
            total=Count("id"),
            active=Count("id", filter=Q(is_active=True)),
        )

        line_total = ExpressionWrapper(F("price") * F("quantity"), output_field=DecimalField(max_digits=12, decimal_places=2))
        order_stats = OrderItem.objects.filter(product__store=store).aggregate(
            distinct_orders=Count("order", distinct=True),
            units_sold=Sum("quantity"),
            revenue=Sum(line_total),
        )

        return Response({
            "store": StoreSerializer(store).data,
            "products": product_stats["total"],
            "active_products": product_stats["active"],
            "orders": order_stats["distinct_orders"] or 0,
            "units_sold": order_stats["units_sold"] or 0,
            "revenue": str(order_stats["revenue"] or 0),
            "top_products": list(
                Product.objects.filter(store=store)
                .annotate(order_count=Count("order_items"))
                .order_by("-order_count")
                .values("id", "name", "stock", "order_count")[:5]
            ),
        })


class StoreViewSet(viewsets.ModelViewSet):
    serializer_class = StoreSerializer
    permission_classes = [StorePermission]
    lookup_field = "slug"

    def get_queryset(self):
        queryset = Store.objects.filter(is_active=True).select_related("seller", "seller__user")
        if self.request.method in permissions.SAFE_METHODS:
            return queryset
        if self.request.user.effective_role == "admin":
            return Store.objects.select_related("seller", "seller__user")
        return queryset.filter(seller__user=self.request.user)

    def perform_create(self, serializer):
        seller_profile = self.request.user.seller_profile
        serializer.save(seller=seller_profile)
