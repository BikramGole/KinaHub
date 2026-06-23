import os
from django.core.management.base import BaseCommand
from products.models import ProductImage

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
}

BASE_DIR = os.environ.get(
    'PRODUCT_MEDIA_DIR',
    os.path.join(
        os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__)))),
        '..', 'frontend', 'public', 'product-media',
    ),
)

class Command(BaseCommand):
    help = "Restore product images from local files by matching product slug to filenames"

    def handle(self, *args, **options):
        if not os.path.isdir(BASE_DIR):
            self.stderr.write(f"product-media directory not found at {BASE_DIR}")
            return

        files = {}
        for root, dirs, filenames in os.walk(BASE_DIR):
            for f in filenames:
                name, ext = os.path.splitext(f)
                key = name.lower()
                rel = os.path.relpath(os.path.join(root, f), BASE_DIR)
                if key not in files:
                    files[key] = rel

        restored = 0
        fallback_used = 0
        created = 0

        for pi in ProductImage.objects.filter(
            image_url__startswith='https://images.unsplash.com'
        ).select_related('product__category').iterator():
            slug_lower = pi.product.slug.lower()

            if slug_lower in files:
                pi.image_url = f"/product-media/{files[slug_lower]}"
                pi.save(update_fields=['image_url'])
                restored += 1
            else:
                cat_slug = pi.product.category.slug if pi.product.category else ''
                fallback = FALLBACKS.get(cat_slug,
                    "https://images.unsplash.com/photo-1472851294608-062f824d29cc?auto=format&fit=crop&w=900&q=80")
                if pi.image_url != fallback:
                    pi.image_url = fallback
                    pi.save(update_fields=['image_url'])
                    fallback_used += 1

        # Also create image rows for products that have NO images at all
        from products.models import Product
        products_without_images = Product.objects.filter(images__isnull=True).select_related('category')
        for product in products_without_images.iterator():
            slug_lower = product.slug.lower()
            if slug_lower in files:
                image_url = f"/product-media/{files[slug_lower]}"
            else:
                cat_slug = product.category.slug if product.category else ''
                image_url = FALLBACKS.get(cat_slug,
                    "https://images.unsplash.com/photo-1472851294608-062f824d29cc?auto=format&fit=crop&w=900&q=80")
            ProductImage.objects.create(
                product=product,
                image_url=image_url,
                alt_text=product.name,
                is_primary=True,
                order=0,
            )
            created += 1
            self.stdout.write(f"  Created image for: {product.slug}")

        self.stdout.write(self.style.SUCCESS(f"Restored {restored} images from local files"))
        if fallback_used:
            self.stdout.write(f"Kept fallback for {fallback_used} products (no matching file)")
        if created:
            self.stdout.write(self.style.SUCCESS(f"Created {created} new image rows for imageless products"))
        self.stdout.write(self.style.SUCCESS("Done"))
