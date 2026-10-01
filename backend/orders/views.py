from django.db.models import Sum, Count, Q
from crm.models import ActivityLog, Notification
from rest_framework import permissions, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import MethodNotAllowed
from rest_framework.response import Response
from .models import Order
from .serializers import OrderSerializer, OrderStatusSerializer


class OrderViewSet(viewsets.ModelViewSet):
    serializer_class = OrderSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = None

    def get_queryset(self):
        user = self.request.user
        queryset = Order.objects.select_related("user", "payment").prefetch_related("items__product", "items__product__images")
        if user.effective_role == "admin":
            return queryset
        if user.effective_role == "seller":
            store = getattr(getattr(user, "seller_profile", None), "store", None)
            return queryset.filter(items__product__store=store).distinct()
        return queryset.filter(user=user)

    def update(self, request, *args, **kwargs):
        raise MethodNotAllowed(request.method, detail="Orders cannot be edited after placement.")

    def destroy(self, request, *args, **kwargs):
        raise MethodNotAllowed(request.method, detail="Orders cannot be deleted after placement.")

    @action(detail=False, methods=["get"])
    def summary(self, request):
        queryset = self.get_queryset()
        agg = queryset.aggregate(
            orders=Count("id"),
            pending=Count("id", filter=Q(status="pending")),
            processing=Count("id", filter=Q(status="processing")),
            delivered=Count("id", filter=Q(status="delivered")),
            revenue=Sum("total_price"),
        )
        return Response({
            "orders": agg["orders"],
            "pending": agg["pending"],
            "processing": agg["processing"],
            "delivered": agg["delivered"],
            "revenue": str(agg["revenue"] or 0),
        })

    @action(detail=True, methods=["patch"])
    def status(self, request, pk=None):
        user = request.user
        if user.effective_role not in ["seller", "admin"]:
            return Response({"detail": "Only sellers and admins can update order status."}, status=403)

        order = self.get_object()
        if user.effective_role == "seller":
            store = getattr(getattr(user, "seller_profile", None), "store", None)
            if not store or order.items.exclude(product__store=store).exists():
                return Response(
                    {"detail": "Sellers can only update orders fulfilled entirely by their store."},
                    status=403,
                )
        serializer = OrderStatusSerializer(order, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        old_status = order.status
        serializer.save()

        ActivityLog.objects.create(
            actor=user,
            verb="updated_order_status",
            target_type="order",
            target_id=str(order.id),
            metadata={"from": old_status, "to": order.status},
        )
        Notification.objects.create(
            user=order.user,
            notification_type="status",
            title=f"Order #{order.id} is now {order.status}",
            body="Your order status was updated.",
        )
        return Response(OrderSerializer(order, context={"request": request}).data)

    @action(detail=False, methods=["post"], permission_classes=[permissions.AllowAny])
    def calculate_delivery(self, request):
        from .utils import calculate_delivery_info
        from products.models import Product

        shipping_address = request.data.get("shipping_address", "")
        items = request.data.get("items", [])
        if not isinstance(shipping_address, str) or not shipping_address.strip():
            return Response({"detail": "A shipping address is required."}, status=400)
        if not isinstance(items, list) or not items:
            return Response({"detail": "At least one item is required."}, status=400)

        quantity_map = {}
        for item in items:
            if not isinstance(item, dict):
                return Response({"detail": "Each item must be an object."}, status=400)
            product_id = item.get("product_id")
            quantity = item.get("quantity")
            if isinstance(product_id, bool) or not isinstance(product_id, int):
                return Response({"detail": "Each item needs a valid product ID."}, status=400)
            if isinstance(quantity, bool) or not isinstance(quantity, int) or quantity < 1:
                return Response({"detail": "Item quantity must be at least 1."}, status=400)
            quantity_map[product_id] = quantity_map.get(product_id, 0) + quantity

        products_by_id = Product.objects.select_related("category", "store").filter(
            id__in=quantity_map,
            is_active=True,
        ).in_bulk()
        if len(products_by_id) != len(quantity_map):
            return Response({"detail": "One or more products are unavailable."}, status=400)
        if any(products_by_id[product_id].stock < quantity for product_id, quantity in quantity_map.items()):
            return Response({"detail": "One or more products do not have enough stock."}, status=400)

        products = list(products_by_id.values())
        total_fee, item_deliveries = calculate_delivery_info(shipping_address, products, quantity_map)

        return Response({
            "total_fee": str(total_fee),
            "item_deliveries": item_deliveries
        })
