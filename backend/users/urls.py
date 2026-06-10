from django.urls import include, path
from rest_framework.routers import DefaultRouter
from .views import (
    AddressViewSet,
    ConfirmDeleteAccountView,
    ConfirmPasswordResetView,
    CustomerProfileViewSet,
    RegisterView,
    RequestDeleteAccountView,
    RequestPasswordResetView,
    SendPromoEmailView,
    UserViewSet,
    me,
)

router = DefaultRouter()
router.register("users", UserViewSet, basename="user")
router.register("addresses", AddressViewSet, basename="address")
router.register("customers", CustomerProfileViewSet, basename="customer-profile")

urlpatterns = [
    path("register/", RegisterView.as_view(), name="register"),
    path("me/", me, name="me"),
    path("delete-account/request/", RequestDeleteAccountView.as_view(), name="delete_account_request"),
    path("delete-account/confirm/", ConfirmDeleteAccountView.as_view(), name="delete_account_confirm"),
    path("password-reset/request/", RequestPasswordResetView.as_view(), name="password_reset_request"),
    path("password-reset/confirm/", ConfirmPasswordResetView.as_view(), name="password_reset_confirm"),
    path("promo/send/", SendPromoEmailView.as_view(), name="promo_send"),
    path("", include(router.urls)),
]
