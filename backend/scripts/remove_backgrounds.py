import os
import django
import sys
from rembg import remove
from PIL import Image

# Setup Django Environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from products.models import ProductImage

project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
public_media_dir = os.path.join(project_root, 'frontend', 'public')

def remove_background(image_path, output_path):
    try:
        input_image = Image.open(image_path)
        output_image = remove(input_image)
        output_image.save(output_path, 'PNG')
        return True
    except Exception as e:
        print(f"Failed to process {image_path}: {e}")
        return False

print("Fetching product images from database...")
images = ProductImage.objects.all()
total = images.count()

print(f"Total images to process: {total}")

processed = 0
failed = 0
skipped = 0

for img in images:
    if img.image_url.endswith('.png'):
        print(f"Skipping {img.image_url} (already a PNG)")
        skipped += 1
        continue
        
    old_rel_path = img.image_url.lstrip('/')
    old_full_path = os.path.join(public_media_dir, old_rel_path)
    
    if not os.path.exists(old_full_path):
        print(f"File not found: {old_full_path}")
        failed += 1
        continue
        
    # Generate new path
    name_without_ext = os.path.splitext(old_rel_path)[0]
    new_rel_path = f"{name_without_ext}.png"
    new_full_path = os.path.join(public_media_dir, new_rel_path)
    
    print(f"Processing ({processed+skipped+failed+1}/{total}): {old_rel_path}")
    
    if remove_background(old_full_path, new_full_path):
        # Update database
        img.image_url = f"/{new_rel_path}"
        img.save()
        
        # Delete old file
        try:
            os.remove(old_full_path)
        except Exception as e:
            print(f"Could not delete old file {old_full_path}: {e}")
            
        processed += 1
    else:
        failed += 1

print("\n--- Summary ---")
print(f"Successfully processed and converted: {processed}")
print(f"Skipped (already PNG): {skipped}")
print(f"Failed: {failed}")
