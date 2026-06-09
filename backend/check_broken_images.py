import os
import django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "core.settings")
django.setup()

from products.models import ProductImage

base_dir = "/home/neo/Project/kina_ai/frontend/public"
images = ProductImage.objects.all()
broken = []

for img in images:
    url = img.image_url
    if not url: continue
    
    # URL is likely something like /product-media/store-slug/image.jpg
    # We need to check if this file exists in frontend/public
    file_path = os.path.join(base_dir, url.lstrip('/'))
    if not os.path.exists(file_path):
        broken.append((img.id, url, img.product.name))

print(f"Total images: {images.count()}")
print(f"Broken links: {len(broken)}")
for b in broken[:10]:
    print(f"ID: {b[0]}, URL: {b[1]}, Product: {b[2]}")
