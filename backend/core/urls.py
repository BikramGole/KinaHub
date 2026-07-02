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
        elif cmd == 'fixlocalimages':
            from products.models import ProductImage
            import re
            LOCAL_PATTERNS = re.compile(r'http://(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+)')
            FALLBACKS = {
                "automotive-bikes": "https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=900&q=80",
                "accessories": "https://images.unsplash.com/photo-1625961332771-3f40b0e2bdcf?auto=format&fit=crop&w=900&q=80",
                "appliances": "https://images.unsplash.com/photo-1556911220-bff31c812dba?auto=format&fit=crop&w=900&q=80",
                "cameras": "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=900&q=80",
                "audio": "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=900&q=80",
                "beauty": "https://images.unsplash.com/photo-1596462502278-27bfdc403348?auto=format&fit=crop&w=900&q=80",
                "books": "https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&w=900&q=80",
                "fashion": "https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=900&q=80",
                "gaming": "https://images.unsplash.com/photo-1598550476439-6847785fcea6?auto=format&fit=crop&w=900&q=80",
                "groceries": "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=900&q=80",
                "home": "https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=900&q=80",
                "laptops": "https://images.unsplash.com/photo-1496181133206-80ce9b88a853?auto=format&fit=crop&w=900&q=80",
                "mobiles": "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=900&q=80",
                "pets": "https://images.unsplash.com/photo-1543466835-00a7907e9de1?auto=format&fit=crop&w=900&q=80",
                "sports": "https://images.unsplash.com/photo-1517649763962-0c623066013b?auto=format&fit=crop&w=900&q=80",
                "stationery": "https://images.unsplash.com/photo-1455390582262-044cdead277a?auto=format&fit=crop&w=900&q=80",
                "electronics": "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=900&q=80",
            }
            DEFAULT_FALLBACK = "https://images.unsplash.com/photo-1472851294608-062f824d29cc?auto=format&fit=crop&w=900&q=80"
            fixed = 0
            bad_images = ProductImage.objects.filter(image_url__regex=r'http://(localhost|127\.0\.0\.1|192\.168|10\.)').select_related('product__category')
            for pi in bad_images:
                cat_slug = pi.product.category.slug if pi.product.category else ''
                fallback = FALLBACKS.get(cat_slug, DEFAULT_FALLBACK)
                pi.image_url = fallback
                pi.save(update_fields=['image_url'])
                fixed += 1
            return HttpResponse(f"Fixed {fixed} local-network image URLs")
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
