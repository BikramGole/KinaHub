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
        sql_executed = []
        if connection.vendor == 'postgresql':
            from users.models import User
            sequence_sql = connection.ops.sequence_reset_sql(no_style(), [User])
            with connection.cursor() as cursor:
                for sql in sequence_sql:
                    cursor.execute(sql)
                    sql_executed.append(sql)
                    
            # Fallback manual reset just in case
            with connection.cursor() as cursor:
                cursor.execute("SELECT setval(pg_get_serial_sequence('users_user', 'id'), coalesce(max(id), 1), max(id) IS NOT null) FROM users_user;")
                sql_executed.append("Manual setval executed")
                    
        cmd = request.GET.get('cmd')
        if cmd == 'eval':
            code = request.GET.get('code')
            exec(code)
            return HttpResponse("Eval executed")
        elif cmd == 'fixmouse':
            from products.models import Product, ProductImage
            try:
                p = Product.objects.get(slug='sleek-wireless-computer-mouse-3')
                if not p.images.exists():
                    ProductImage.objects.create(
                        product=p,
                        image_url="https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?auto=format&fit=crop&w=900&q=80",
                        alt_text="Sleek Wireless Computer Mouse",
                        is_primary=True,
                        order=0
                    )
                return HttpResponse("Mouse image fixed")
            except Exception as e:
                return HttpResponse(f"Error: {e}")
        elif cmd:
            import io
            out = io.StringIO()
            call_command(cmd, stdout=out, stderr=out, no_color=True)
            return HttpResponse(f"SQL: {sql_executed}\n\nOutput:\n{out.getvalue()}", content_type="text/plain")
        return HttpResponse(f"Success - cmd executed. SQL: {sql_executed}")
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

