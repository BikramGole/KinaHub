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


from django.http import HttpResponse
import traceback
from django.core.management import call_command

from django.core.management.color import no_style
from django.db import connection
from django.apps import apps

def run_seed(request):
    try:
        if connection.vendor == 'postgresql':
            sequence_sql = connection.ops.sequence_reset_sql(no_style(), apps.get_models())
            with connection.cursor() as cursor:
                for sql in sequence_sql:
                    cursor.execute(sql)
                    
        call_command('seed_spacex')
        return HttpResponse("Success - Sequences reset and SpaceX seeded")
    except Exception as e:
        return HttpResponse(f"<pre>{traceback.format_exc()}</pre>")

urlpatterns = [
    path('ping/', ping, name='ping'),
    path('run-seed/', run_seed, name='run-seed'),
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

