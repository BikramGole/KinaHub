import os
import sys
import django
from decimal import Decimal

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "core.settings")
django.setup()

from django.contrib.auth import get_user_model
from sellers.models import SellerProfile, Store
from products.models import Category, Product, ProductImage

User = get_user_model()

def seed_groceries():
    print("Seeding groceries and food stores...")

    # Create Groceries and Food categories
    cat_grocery, _ = Category.objects.get_or_create(
        slug="groceries",
        defaults={"name": "Groceries", "description": "Daily essentials and groceries"}
    )
    cat_food, _ = Category.objects.get_or_create(
        slug="food",
        defaults={"name": "Food & Beverages", "description": "Fresh food, snacks, and drinks"}
    )

    # 1. Create a Store: FreshMart
    mart_user, created = User.objects.get_or_create(email="freshmart@example.com", defaults={"username": "freshmart", "phone": "9800000001", "role": "seller", "first_name": "Fresh", "last_name": "Mart"})
    if created: mart_user.set_password("password123")
    mart_user.save()
    
    mart_seller, _ = SellerProfile.objects.get_or_create(user=mart_user, defaults={"business_name": "FreshMart Groceries", "status": "verified"})
    
    freshmart, _ = Store.objects.get_or_create(
        seller=mart_seller,
        slug="freshmart",
        defaults={
            "name": "FreshMart",
            "description": "Your neighborhood grocery store with fresh produce and daily essentials.",
            "logo_url": "https://loremflickr.com/200/200/store",
            "banner_url": "https://loremflickr.com/800/400/grocery",
            "address": "Baneshwor, Kathmandu",
            "area": "Baneshwor",
            "is_active": True
        }
    )

    # 2. Create a Store: Zomato Bites
    bites_user, created = User.objects.get_or_create(email="bites@example.com", defaults={"username": "zomatobites", "phone": "9800000002", "role": "seller", "first_name": "Zomato", "last_name": "Bites"})
    if created: bites_user.set_password("password123")
    bites_user.save()

    bites_seller, _ = SellerProfile.objects.get_or_create(user=bites_user, defaults={"business_name": "Zomato Bites", "status": "verified"})
    
    zomatobites, _ = Store.objects.get_or_create(
        seller=bites_seller,
        slug="zomato-bites",
        defaults={
            "name": "Zomato Bites",
            "description": "Hot and fresh meals delivered straight to your door.",
            "logo_url": "https://loremflickr.com/200/200/restaurant",
            "banner_url": "https://loremflickr.com/800/400/food",
            "address": "Thamel, Kathmandu",
            "area": "Thamel",
            "is_active": True
        }
    )

    # Grocery Products for FreshMart
    groceries = [
        {
            "name": "Fresh Red Apples (1kg)",
            "slug": "fresh-red-apples-1kg",
            "price": "250.00",
            "stock": 100,
            "description": "Sweet, crisp, and freshly picked red apples from local farms.",
            "image": "/product-media/apples.png",
            "delivery_time_estimate": "1-2 business days",
            "base_delivery_fee": "100.00",
            "store": freshmart,
            "category": cat_grocery
        },
        {
            "name": "Amul Pure Milk (1L)",
            "slug": "amul-pure-milk-1l",
            "price": "110.00",
            "stock": 50,
            "description": "Pasteurized standardized milk, rich in calcium and vitamins.",
            "image": "https://images.unsplash.com/photo-1550583724-b2692b85b150?auto=format&fit=crop&w=900&q=80",
            "delivery_time_estimate": "1-2 business days",
            "base_delivery_fee": "100.00",
            "store": freshmart,
            "category": cat_grocery
        },
        {
            "name": "Whole Wheat Bread",
            "slug": "whole-wheat-bread-brown",
            "price": "80.00",
            "stock": 30,
            "description": "Healthy brown bread baked daily with 100% whole wheat flour.",
            "image": "https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=900&q=80",
            "delivery_time_estimate": "1-2 business days",
            "base_delivery_fee": "100.00",
            "store": freshmart,
            "category": cat_grocery
        },
        {
            "name": "Organic Free-Range Eggs (12 Pack)",
            "slug": "organic-eggs-12-pack",
            "price": "220.00",
            "stock": 40,
            "description": "Farm fresh organic eggs from free-roaming hens.",
            "image": "/product-media/organic-eggs-12-pack.png",
            "delivery_time_estimate": "1-2 business days",
            "base_delivery_fee": "100.00",
            "store": freshmart,
            "category": cat_grocery
        },
        {
            "name": "Basmati Rice (5kg Bag)",
            "slug": "basmati-rice-5kg",
            "price": "1250.00",
            "stock": 20,
            "description": "Premium long-grain basmati rice with exceptional aroma.",
            "image": "https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=900&q=80",
            "delivery_time_estimate": "1-2 business days",
            "base_delivery_fee": "100.00",
            "store": freshmart,
            "category": cat_grocery
        },
        {
            "name": "Onions (1kg)",
            "slug": "fresh-onions-1kg",
            "price": "90.00",
            "stock": 200,
            "description": "Fresh and dry local onions.",
            "image": "/product-media/fresh-onions-1kg.png",
            "delivery_time_estimate": "1-2 business days",
            "base_delivery_fee": "100.00",
            "store": freshmart,
            "category": cat_grocery
        }
    ]

    # Food Products for Zomato Bites
    foods = [
        {
            "name": "Chicken Biryani",
            "slug": "special-chicken-biryani",
            "price": "350.00",
            "stock": 20,
            "description": "Aromatic basmati rice cooked with tender chicken pieces and secret spices. Served with raita.",
            "image": "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?auto=format&fit=crop&w=900&q=80",
            "delivery_time_estimate": "30-45 mins",
            "base_delivery_fee": "80.00",
            "store": zomatobites,
            "category": cat_food
        },
        {
            "name": "Margherita Pizza (12 Inch)",
            "slug": "classic-margherita-pizza",
            "price": "550.00",
            "stock": 15,
            "description": "Classic wood-fired pizza with fresh tomato sauce, mozzarella, and basil leaves.",
            "image": "https://images.unsplash.com/photo-1604068549290-dea0e4a305ca?auto=format&fit=crop&w=900&q=80",
            "delivery_time_estimate": "30-45 mins",
            "base_delivery_fee": "80.00",
            "store": zomatobites,
            "category": cat_food
        },
        {
            "name": "Veg Momo (10 pcs)",
            "slug": "steamed-veg-momo",
            "price": "150.00",
            "stock": 50,
            "description": "Authentic Nepali steamed dumplings stuffed with finely chopped fresh vegetables.",
            "image": "https://images.unsplash.com/photo-1496116218417-1a781b1c416c?auto=format&fit=crop&w=900&q=80",
            "delivery_time_estimate": "30-45 mins",
            "base_delivery_fee": "80.00",
            "store": zomatobites,
            "category": cat_food
        },
        {
            "name": "Spicy Chicken Wings (6 pcs)",
            "slug": "hot-spicy-wings",
            "price": "380.00",
            "stock": 25,
            "description": "Crispy fried chicken wings tossed in our signature hot sauce.",
            "image": "https://images.unsplash.com/photo-1569691899455-88464f6d3ab1?auto=format&fit=crop&w=900&q=80",
            "delivery_time_estimate": "30-45 mins",
            "base_delivery_fee": "80.00",
            "store": zomatobites,
            "category": cat_food
        },
        {
            "name": "Cold Coffee with Ice Cream",
            "slug": "cold-coffee-icecream",
            "price": "220.00",
            "stock": 30,
            "description": "Refreshing blended cold coffee topped with a scoop of vanilla ice cream.",
            "image": "/product-media/cold-coffee-icecream.png",
            "delivery_time_estimate": "30-45 mins",
            "base_delivery_fee": "80.00",
            "store": zomatobites,
            "category": cat_food
        }
    ]

    all_items = groceries + foods

    for item in all_items:
        product, created = Product.objects.update_or_create(
            slug=item["slug"],
            defaults={
                "name": item["name"],
                "store": item["store"],
                "category": item["category"],
                "description": item["description"],
                "price": Decimal(item["price"]),
                "stock": item["stock"],
                "delivery_time_estimate": item["delivery_time_estimate"],
                "base_delivery_fee": Decimal(item["base_delivery_fee"]),
                "is_active": True,
                "specifications": "{}"
            }
        )
        if created:
            ProductImage.objects.create(
                product=product,
                image_url=item["image"],
                alt_text=item["name"],
                is_primary=True,
                order=0
            )
            print(f"Created {item['name']}")
        else:
            img = product.images.first()
            if img:
                img.image_url = item["image"]
                img.save()
            else:
                ProductImage.objects.create(
                    product=product,
                    image_url=item["image"],
                    alt_text=item["name"],
                    is_primary=True,
                    order=0
                )
            print(f"Updated {item['name']}")

    print("Seeding complete!")

if __name__ == "__main__":
    seed_groceries()
