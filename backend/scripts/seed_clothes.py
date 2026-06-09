import os
import sys
import json
import urllib.request
import django
from decimal import Decimal

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "core.settings")
django.setup()

from django.contrib.auth import get_user_model
from sellers.models import SellerProfile, Store
from products.models import Category, Product, ProductImage

User = get_user_model()

def seed_clothes():
    print("Seeding clothing store and products from FakeStoreAPI...")

    # Create Clothing category
    cat_clothing, _ = Category.objects.get_or_create(
        slug="clothing",
        defaults={"name": "Clothing & Apparel", "description": "Fashion, clothes, and accessories."}
    )

    # Create Store: Fashion Hub
    fashion_user, created = User.objects.get_or_create(
        email="fashionhub@example.com", 
        defaults={"username": "fashionhub", "phone": "9800000003", "role": "seller", "first_name": "Fashion", "last_name": "Hub"}
    )
    if created: fashion_user.set_password("password123")
    fashion_user.save()
    
    fashion_seller, _ = SellerProfile.objects.get_or_create(user=fashion_user, defaults={"business_name": "Fashion Hub", "status": "verified"})
    
    fashionhub, _ = Store.objects.get_or_create(
        seller=fashion_seller,
        slug="fashion-hub",
        defaults={
            "name": "Fashion Hub",
            "description": "Premium clothing for men and women. Trendy, comfortable, and affordable.",
            "logo_url": "https://fakestoreapi.com/img/71li-ujtlUL._AC_UX679_.jpg",
            "banner_url": "https://fakestoreapi.com/img/81Zt42ioCgL._AC_SX679_.jpg",
            "address": "Durbar Marg, Kathmandu",
            "area": "Durbar Marg",
            "is_active": True
        }
    )

    # Fetch products
    print("Fetching men's clothing...")
    req_men = urllib.request.Request("https://fakestoreapi.com/products/category/men's%20clothing", headers={'User-Agent': 'Mozilla/5.0'})
    with urllib.request.urlopen(req_men) as response:
        mens_clothing = json.loads(response.read().decode())

    print("Fetching women's clothing...")
    req_women = urllib.request.Request("https://fakestoreapi.com/products/category/women's%20clothing", headers={'User-Agent': 'Mozilla/5.0'})
    with urllib.request.urlopen(req_women) as response:
        womens_clothing = json.loads(response.read().decode())

    all_clothes = mens_clothing + womens_clothing

    media_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "../frontend/public/product-media"))
    os.makedirs(media_dir, exist_ok=True)

    for item in all_clothes:
        slug = f"clothing-{item['id']}"
        local_image_name = f"clothing_{item['id']}.jpg"
        local_image_path = os.path.join(media_dir, local_image_name)
        
        image_url_to_use = f"/product-media/{local_image_name}"
        if not os.path.exists(local_image_path):
            print(f"Downloading image for {item['title']}...")
            try:
                req = urllib.request.Request(item['image'], headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'})
                with urllib.request.urlopen(req) as response, open(local_image_path, 'wb') as out_file:
                    out_file.write(response.read())
            except Exception as e:
                print(f"Failed to download image: {e}")
                image_url_to_use = item['image']

        # Adjust price to be somewhat realistic (NPR)
        price_npr = Decimal(str(item['price'])) * Decimal('130.0')

        product, created = Product.objects.update_or_create(
            slug=slug,
            defaults={
                "name": item["title"],
                "store": fashionhub,
                "category": cat_clothing,
                "description": item["description"],
                "price": price_npr,
                "stock": 50,
                "delivery_time_estimate": "2-3 business days",
                "base_delivery_fee": Decimal('150.00'),
                "is_active": True,
                "specifications": "{}"
            }
        )
        
        if created:
            ProductImage.objects.create(
                product=product,
                image_url=image_url_to_use,
                alt_text=item["title"],
                is_primary=True,
                order=0
            )
            print(f"Created {item['title']}")
        else:
            img = product.images.first()
            if img:
                img.image_url = image_url_to_use
                img.save()
            else:
                ProductImage.objects.create(
                    product=product,
                    image_url=image_url_to_use,
                    alt_text=item["title"],
                    is_primary=True,
                    order=0
                )
            print(f"Updated {item['title']}")

    print("Clothing seeding complete!")

if __name__ == "__main__":
    seed_clothes()
