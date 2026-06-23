import os
from django.core.management.base import BaseCommand
from django.conf import settings
from products.models import ProductImage

FALLBACK_IMAGES = {
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
    "networking": "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=900&q=80",
    "pets": "https://images.unsplash.com/photo-1543466835-00a7907e9de1?auto=format&fit=crop&w=900&q=80",
    "school": "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=900&q=80",
    "sports": "https://images.unsplash.com/photo-1517649763962-0c623066013b?auto=format&fit=crop&w=900&q=80",
    "stationery": "https://images.unsplash.com/photo-1455390582262-044cdead277a?auto=format&fit=crop&w=900&q=80",
    "eco-sustainable": "https://images.unsplash.com/photo-1472141521881-95d0f57e1f47?auto=format&fit=crop&w=900&q=80",
}

class Command(BaseCommand):
    help = "Fix broken product image URLs and optionally upload to Cloudinary"

    def add_arguments(self, parser):
        parser.add_argument('--cloudinary', action='store_true', help='Upload images to Cloudinary')

    def handle(self, *args, **options):
        cloudinary_enabled = bool(getattr(settings, 'CLOUDINARY_CLOUD_NAME', ''))

        product_media_dir = None
        try:
            base_dir = settings.BASE_DIR
            project_root = os.path.dirname(base_dir)
            product_media_dir = os.path.join(project_root, 'frontend', 'public', 'product-media')
        except Exception:
            pass

        fixed = 0
        cloudinary_uploaded = 0

        for pi in ProductImage.objects.select_related('product__category').iterator():
            url = pi.image_url
            if not url:
                continue

            # Fix relative /product-media/ URLs
            if '/product-media/' in url:
                filename = url.rsplit('/', 1)[-1]
                if product_media_dir:
                    filepath = os.path.join(product_media_dir, filename)
                    if os.path.exists(filepath) and options.get('cloudinary') and cloudinary_enabled:
                        try:
                            import cloudinary.uploader
                            result = cloudinary.uploader.upload(
                                filepath,
                                folder='kinahub/products',
                                public_id=pi.product.slug,
                                overwrite=True,
                            )
                            pi.image_url = result.get('secure_url', url)
                            pi.save(update_fields=['image_url'])
                            cloudinary_uploaded += 1
                            self.stdout.write(f"  Uploaded {filename} to Cloudinary")
                            continue
                        except Exception as e:
                            self.stdout.write(f"  Cloudinary upload failed for {filename}: {e}")

                # If file doesn't exist, use category fallback
                if not os.path.exists(filepath or ''):
                    cat_slug = pi.product.category.slug if pi.product.category else ''
                    fallback = FALLBACK_IMAGES.get(cat_slug,
                        "https://images.unsplash.com/photo-1472851294608-062f824d29cc?auto=format&fit=crop&w=900&q=80")
                    pi.image_url = fallback
                    pi.save(update_fields=['image_url'])
                    fixed += 1
                    self.stdout.write(f"  Fixed: {pi.product.name} -> {cat_slug} fallback")

            # Fix relative /media/ URLs by uploading to Cloudinary
            elif url.startswith('/media/') and cloudinary_enabled and options.get('cloudinary'):
                filepath = os.path.join(settings.MEDIA_ROOT, url.replace('/media/', ''))
                if os.path.exists(filepath):
                    try:
                        import cloudinary.uploader
                        result = cloudinary.uploader.upload(
                            filepath,
                            folder='kinahub/products',
                            public_id=pi.product.slug,
                            overwrite=True,
                        )
                        pi.image_url = result.get('secure_url', url)
                        pi.save(update_fields=['image_url'])
                        cloudinary_uploaded += 1
                        self.stdout.write(f"  Uploaded {url} to Cloudinary")
                    except Exception as e:
                        self.stdout.write(f"  Cloudinary upload failed for {url}: {e}")

        self.stdout.write(self.style.SUCCESS(f"Fixed {fixed} broken image URLs"))
        if cloudinary_uploaded:
            self.stdout.write(self.style.SUCCESS(f"Uploaded {cloudinary_uploaded} to Cloudinary"))
