from django.urls import include, path
from rest_framework.routers import DefaultRouter
from .views import AddressViewSet, CustomerProfileViewSet, RegisterView, UserViewSet, me, RequestDeleteAccountView, ConfirmDeleteAccountView

router = DefaultRouter()
router.register("users", UserViewSet, basename="user")
router.register("addresses", AddressViewSet, basename="address")
router.register("customers", CustomerProfileViewSet, basename="customer-profile")

urlpatterns = [
    path("register/", RegisterView.as_view(), name="register"),
    path("me/", me, name="me"),
    path("delete-account/request/", RequestDeleteAccountView.as_view(), name="delete_account_request"),
    path("delete-account/confirm/", ConfirmDeleteAccountView.as_view(), name="delete_account_confirm"),
    path("", include(router.urls)),
]

