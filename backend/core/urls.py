from django.contrib import admin
from django.urls import path, include
from django.views.generic import RedirectView
from django.http import JsonResponse
from rest_framework_simplejwt.views import (
    TokenRefreshView,
)
from users.views import LoginWithOTPView, VerifyOTPView, GoogleLoginView
from django.conf import settings
from django.conf.urls.static import static

from products.views import curation_view


def ping(request):
    """Lightweight no-DB endpoint for keep-alive pings."""
    return JsonResponse({'status': 'ok'})


urlpatterns = [
    path('ping/', ping, name='ping'),
    path('', RedirectView.as_view(url='/api/products/')),
    path('curation/', curation_view, name='curation_view'),
    path('admin/', admin.site.urls),
    path('api/auth/', include('users.urls')),
    path('api/products/', include('products.urls')),
    path('api/sellers/', include('sellers.urls')),
    path('api/', include('orders.urls')),
    path('api/crm/', include('crm.urls')),
    path('api/token/', LoginWithOTPView.as_view(), name='token_obtain_pair'),
    path('api/auth/google/', GoogleLoginView.as_view(), name='google_login'),
    path('api/token/verify-2fa/', VerifyOTPView.as_view(), name='token_verify_2fa'),
    path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)

