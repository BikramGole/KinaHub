import os
import django
import re

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "core.settings")
django.setup()

from products.models import ProductImage

base_dir = "/home/neo/Project/kina_ai/frontend/public"
media_dir = os.path.join(base_dir, "product-media")

# Create a map of filename to its relative path in product-media
file_map = {}
for root, dirs, files in os.walk(media_dir):
    for f in files:
        rel_path = os.path.relpath(os.path.join(root, f), base_dir)
        name_no_ext = os.path.splitext(f)[0]
        # We store the base name (no extension) to its full path
        file_map[name_no_ext] = f"/{rel_path}"

images = ProductImage.objects.all()
fixed_count = 0
not_found = 0

pattern = re.compile(r'-\d+$')

for img in images:
    url = img.image_url
    if not url: continue
    
    file_path = os.path.join(base_dir, url.lstrip('/'))
    if not os.path.exists(file_path):
        filename = os.path.basename(url)
        name_no_ext = os.path.splitext(filename)[0]
        
        # Try stripping -2, -3 etc.
        stripped_name = pattern.sub('', name_no_ext)
        
        if name_no_ext in file_map:
            img.image_url = file_map[name_no_ext]
            img.save()
            fixed_count += 1
        elif stripped_name in file_map:
            img.image_url = file_map[stripped_name]
            img.save()
            fixed_count += 1
        else:
            not_found += 1
            print(f"Still missing: {filename} -> tried {stripped_name}")

print(f"Fixed {fixed_count} more images.")
print(f"Still missing {not_found} images.")
