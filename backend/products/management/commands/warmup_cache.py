"""
Management command: warmup_cache

Run during Render start (before gunicorn) to pre-populate the
locmem cache with homepage data so the very first user request
is served from cache, not a cold DB query.

Usage: python manage.py warmup_cache
"""
from django.core.management.base import BaseCommand
from django.core.cache import cache
from django.db.models import Avg, Count, DecimalField
from django.db.models.functions import Coalesce


class Command(BaseCommand):
    help = 'Pre-warms the homepage_data cache so the first request is instant.'

    def handle(self, *args, **kwargs):
        self.stdout.write('Warming up cache...')
        try:
            from products.models import Product, Category
            from products.serializers import ProductSerializer, CategorySerializer

            def serialize_products(qs, limit=10):
                products = qs.select_related('store', 'category', 'brand').prefetch_related('images').annotate(
                    review_count=Count('reviews', distinct=True),
                    average_rating=Coalesce(Avg('reviews__rating'), 'rating', output_field=DecimalField(max_digits=3, decimal_places=2)),
                )[:limit]
                return ProductSerializer(products, many=True).data

            base_qs = Product.objects.filter(is_active=True)

            data = {
                'random': serialize_products(base_qs.order_by('?'), limit=40),
                'newest': serialize_products(base_qs.order_by('-created_at'), limit=16),
                'laptops': serialize_products(base_qs.filter(category__slug='laptops'), limit=10),
                'fashion': serialize_products(base_qs.filter(category__slug='fashion'), limit=10),
                'groceries': serialize_products(base_qs.filter(category__slug='groceries'), limit=10),
                'books': serialize_products(base_qs.filter(category__slug='books'), limit=10),
                'featured': serialize_products(base_qs.filter(is_featured=True), limit=12),
                'categories': CategorySerializer(Category.objects.all(), many=True).data,
            }
            cache.set('homepage_data', data, 60 * 15)
            self.stdout.write(self.style.SUCCESS(f'Cache warm! {len(data["random"])} random products loaded.'))
        except Exception as e:
            self.stdout.write(self.style.WARNING(f'Cache warmup failed (non-fatal): {e}'))
