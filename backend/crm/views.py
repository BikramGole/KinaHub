from django.db.models import Count, Q
from rest_framework import permissions, viewsets
from rest_framework.response import Response
from rest_framework.views import APIView
from orders.models import Order
from products.models import Product
from sellers.models import SellerProfile
from users.models import User
from .models import ActivityLog, CustomerRecord, Lead, Message, Notification, SellerRecord, Ticket
from .serializers import (
    ActivityLogSerializer,
    CustomerRecordSerializer,
    LeadSerializer,
    MessageSerializer,
    NotificationSerializer,
    SellerRecordSerializer,
    TicketSerializer,
)


class IsAdminOrOwner(permissions.BasePermission):
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated)


class AdminOnly(permissions.BasePermission):
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.effective_role == "admin")


class CustomerRecordViewSet(viewsets.ModelViewSet):
    queryset = CustomerRecord.objects.select_related("user")
    serializer_class = CustomerRecordSerializer
    permission_classes = [AdminOnly]


class SellerRecordViewSet(viewsets.ModelViewSet):
    queryset = SellerRecord.objects.select_related("seller", "seller__user")
    serializer_class = SellerRecordSerializer
    permission_classes = [AdminOnly]


class LeadViewSet(viewsets.ModelViewSet):
    queryset = Lead.objects.select_related("assigned_to")
    serializer_class = LeadSerializer
    permission_classes = [AdminOnly]


class TicketViewSet(viewsets.ModelViewSet):
    serializer_class = TicketSerializer
    permission_classes = [IsAdminOrOwner]

    def get_queryset(self):
        user = self.request.user
        queryset = Ticket.objects.select_related("customer", "seller", "order")
        if user.effective_role == "admin":
            return queryset
        if user.effective_role == "seller":
            return queryset.filter(seller__user=user)
        return queryset.filter(customer=user)

    def perform_create(self, serializer):
        serializer.save(customer=self.request.user)


class MessageViewSet(viewsets.ModelViewSet):
    serializer_class = MessageSerializer
    permission_classes = [IsAdminOrOwner]

    def get_queryset(self):
        user = self.request.user
        return Message.objects.filter(sender=user) | Message.objects.filter(recipient=user)

    def perform_create(self, serializer):
        serializer.save(sender=self.request.user)


class NotificationViewSet(viewsets.ModelViewSet):
    serializer_class = NotificationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Notification.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class ActivityLogViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = ActivityLog.objects.select_related("actor")
    serializer_class = ActivityLogSerializer
    permission_classes = [AdminOnly]


class CRMOverviewView(APIView):
    permission_classes = [AdminOnly]

    def get(self, request):
        user_counts = User.objects.aggregate(
            users=Count("id"),
            customers=Count("id", filter=Q(role="customer")),
        )
        return Response({
            "users": user_counts["users"],
            "customers": user_counts["customers"],
            "sellers": SellerProfile.objects.count(),
            "products": Product.objects.count(),
            "orders": Order.objects.count(),
            "tickets_open": Ticket.objects.filter(status="open").count(),
            "leads": Lead.objects.count(),
        })

