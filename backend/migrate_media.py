import os
import django
import shutil
from urllib.parse import urlparse

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "core.settings")
django.setup()

from products.models import Product, ProductImage

project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
media_dir = os.path.join(project_root, "frontend", "public", "product-media")

moved_count = 0
missing_count = 0

for img in ProductImage.objects.select_related('product', 'product__store').all():
    store = img.product.store
    if not store:
        continue
    
    store_slug = store.slug
    store_dir = os.path.join(media_dir, store_slug)
    os.makedirs(store_dir, exist_ok=True)
    
    current_url = img.image_url
    # e.g. /product-media/real-new-catalog/cat-food.png
    parsed_path = urlparse(current_url).path
    if not parsed_path.startswith('/product-media/'):
        continue
        
    rel_path = parsed_path.replace('/product-media/', '') # real-new-catalog/cat-food.png
    if rel_path.startswith(store_slug + '/'):
        # Already correct
        continue
        
    filename = os.path.basename(rel_path)
    src_path = os.path.join(media_dir, rel_path)
    target_path = os.path.join(store_dir, filename)
    
    if not os.path.exists(src_path) and not os.path.exists(target_path):
        base, _ = os.path.splitext(rel_path)
        base_name = os.path.basename(base)
        for ext in ['.png', '.jpg', '.jpeg', '.webp']:
            if os.path.exists(os.path.join(media_dir, base + ext)):
                src_path = os.path.join(media_dir, base + ext)
                filename = base_name + ext
                target_path = os.path.join(store_dir, filename)
                break
            elif os.path.exists(os.path.join(store_dir, base_name + ext)):
                target_path = os.path.join(store_dir, base_name + ext)
                filename = base_name + ext
                break
                
    if os.path.exists(target_path):
        pass
    elif os.path.exists(src_path):
        shutil.move(src_path, target_path)
        moved_count += 1
    else:
        print(f"Still missing: {current_url}")
        missing_count += 1
        continue
        
    new_url = f"/product-media/{store_slug}/{filename}"
    if current_url != new_url:
        img.image_url = new_url
        img.save(update_fields=['image_url'])

print(f"Moved {moved_count} more files. {missing_count} missing.")

