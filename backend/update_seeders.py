import os

base = "/home/neo/Project/kina_ai/backend/"
files = ["seed_dukan.py", "seed_clothes.py", "seed_groceries.py"]

for f in files:
    path = os.path.join(base, f)
    if not os.path.exists(path):
        continue
    with open(path, "r") as fh:
        content = fh.read()
        
    # Replace download_image definition
    content = content.replace("def download_image(source_url, target_filename):", "def download_image(source_url, target_filename, store_slug=\"\"):\n    store_dir = os.path.join(product_media_dir, store_slug) if store_slug else product_media_dir")
    content = content.replace("os.makedirs(product_media_dir, exist_ok=True)\n    target_path = os.path.join(product_media_dir, target_filename)", "os.makedirs(store_dir, exist_ok=True)\n    target_path = os.path.join(store_dir, target_filename)")
    content = content.replace('return f"/product-media/{target_filename}"', 'return f"/product-media/{store_slug}/{target_filename}" if store_slug else f"/product-media/{target_filename}"')
    
    # Replace product image path checking in seed_dukan.py
    if "slug_image_path = os.path.join(product_media_dir, f\"{product.slug}.{extension}\")" in content:
        content = content.replace("slug_image_path = os.path.join(product_media_dir, f\"{product.slug}.{extension}\")", "slug_image_path = os.path.join(product_media_dir, store.slug, f\"{product.slug}.{extension}\")")
        content = content.replace("image_url = f\"/product-media/{product.slug}.{extension}\"", "image_url = f\"/product-media/{store.slug}/{product.slug}.{extension}\"")
        
    if "image_url = download_image(image_url, local_filename)" in content:
        content = content.replace("image_url = download_image(image_url, local_filename)", "image_url = download_image(image_url, local_filename, store.slug)")
        
    # In seed_clothes.py
    if "image_url = download_image(item['image'], local_filename)" in content:
        content = content.replace("image_url = download_image(item['image'], local_filename)", "image_url = download_image(item['image'], local_filename, fake_store.slug)")
        
    # Write back
    with open(path, "w") as fh:
        fh.write(content)
        
print("Seeding scripts updated")
