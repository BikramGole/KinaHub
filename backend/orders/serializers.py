from decimal import Decimal, ROUND_HALF_UP

from django.db import transaction
from rest_framework import serializers
from crm.models import ActivityLog, Notification
from products.models import Product
from products.serializers import ProductSerializer
from .models import Order, OrderItem, Payment




PROMO_CODES = {
    "aura10": Decimal("10"),
    "balensarkar12": Decimal("12"),
}


class OrderItemSerializer(serializers.ModelSerializer):
    product = ProductSerializer(read_only=True)
    product_id = serializers.PrimaryKeyRelatedField(source="product", queryset=Product.objects.filter(is_active=True), write_only=True)

    class Meta:
        model = OrderItem
        fields = ["id", "product", "product_id", "quantity", "price"]
        read_only_fields = ["id", "product", "price"]


class PaymentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Payment
        fields = ["id", "method", "status", "amount", "provider_reference", "created_at", "updated_at"]
        read_only_fields = ["id", "status", "amount", "provider_reference", "created_at", "updated_at"]


class OrderSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(many=True)
    payment = PaymentSerializer(read_only=True)
    customer_email = serializers.EmailField(source="user.email", read_only=True)
    promo_code = serializers.CharField(required=False, allow_blank=True)

    class Meta:
        model = Order
        fields = [
            "id",
            "customer_email",
            "status",
            "payment_method",
            "delivery_eta",
            "delivery_fee",
            "promo_code",
            "discount_amount",
            "total_price",
            "shipping_address",
            "customer_note",
            "items",
            "payment",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "customer_email",
            "status",
            "delivery_eta",
            "delivery_fee",
            "discount_amount",
            "total_price",
            "payment",
            "created_at",
            "updated_at",
        ]

    def validate_promo_code(self, value):
        code = (value or "").strip().lower()
        if code and code not in PROMO_CODES:
            raise serializers.ValidationError("Promo code is not valid.")
        return code

    def validate_items(self, items):
        if not items:
            raise serializers.ValidationError("Order must contain at least one item.")

        requested_quantities = {}
        for item in items:
            product = item["product"]
            quantity = item["quantity"]
            if quantity < 1:
                raise serializers.ValidationError("Quantity must be at least 1.")
            if product.pk in requested_quantities:
                raise serializers.ValidationError("Each product may only appear once in an order.")
            requested_quantities[product.pk] = requested_quantities.get(product.pk, 0) + quantity
            if product.stock < requested_quantities[product.pk]:
                raise serializers.ValidationError(f"{product.name} only has {product.stock} units available.")
        return items

    @transaction.atomic
    def create(self, validated_data):
        from .utils import calculate_delivery_info
        items_data = validated_data.pop("items")
        user = self.context["request"].user
        promo_code = validated_data.get("promo_code", "").strip().lower()
        shipping_address = validated_data.get("shipping_address", "")

        requested_quantities = {}
        for item in items_data:
            product_id = item["product"].pk
            requested_quantities[product_id] = requested_quantities.get(product_id, 0) + item["quantity"]

        locked_products = Product.objects.select_for_update().select_related(
            "category", "store__seller__user", "inventory"
        ).in_bulk(requested_quantities)
        if len(locked_products) != len(requested_quantities):
            raise serializers.ValidationError({"items": "One or more products are no longer available."})
        for product_id, quantity in requested_quantities.items():
            product = locked_products[product_id]
            if not product.is_active or product.stock < quantity:
                raise serializers.ValidationError(
                    {"items": f"{product.name} only has {product.stock} units available."}
                )

        for item in items_data:
            item["product"] = locked_products[item["product"].pk]
        
        products = [item["product"] for item in items_data]
        quantity_map = {item["product"].id: item["quantity"] for item in items_data}
        total_fee, item_deliveries = calculate_delivery_info(shipping_address, products, quantity_map)
        
        # Aggregate unique ETAs
        unique_etas = set(info["eta"] for info in item_deliveries.values())
        delivery_eta = ", ".join(unique_etas) if unique_etas else "Unknown"
        
        subtotal = sum(
            (item["product"].current_price * item["quantity"] for item in items_data),
            Decimal("0"),
        )
        discount_rate = PROMO_CODES.get(promo_code, Decimal("0"))
        discount_amount = (subtotal * discount_rate / Decimal("100")).quantize(
            Decimal("0.01"),
            rounding=ROUND_HALF_UP,
        )
        total = (subtotal + total_fee - discount_amount).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)

        validated_data["promo_code"] = promo_code
        validated_data["delivery_fee"] = total_fee
        validated_data["delivery_eta"] = delivery_eta
        validated_data["discount_amount"] = discount_amount
        validated_data["total_price"] = total
        order = Order.objects.create(user=user, **validated_data)

        order_items = []
        for item in items_data:
            product = item["product"]
            quantity = item["quantity"]
            order_items.append(OrderItem(order=order, product=product, quantity=quantity, price=product.current_price))
            product.stock -= quantity
            product.save(update_fields=["stock"])
            if hasattr(product, "inventory"):
                product.inventory.quantity = product.stock
                product.inventory.save(update_fields=["quantity", "updated_at"])

        OrderItem.objects.bulk_create(order_items)
        Payment.objects.create(order=order, method=order.payment_method, amount=total)
        ActivityLog.objects.create(
            actor=user,
            verb="created_order",
            target_type="order",
            target_id=str(order.id),
            metadata={"payment_method": order.payment_method, "total": str(total)},
        )
        Notification.objects.create(
            user=user,
            notification_type="order",
            title=f"Order #{order.id} placed",
            body=f"Your order total is Rs. {total}.",
        )

        seller_users = {
            item["product"].store.seller.user
            for item in items_data
            if item["product"].store and item["product"].store.seller
        }
        for seller_user in seller_users:
            Notification.objects.create(
                user=seller_user,
                notification_type="order",
                title=f"New order #{order.id}",
                body="A customer placed an order containing your products.",
            )
        return order


class OrderStatusSerializer(serializers.ModelSerializer):
    class Meta:
        model = Order
        fields = ["status"]
