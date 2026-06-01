"""Seed script - run with: python manage.py shell < seed_dukan.py"""
import json
import os
import urllib.request
from decimal import Decimal
from urllib.parse import urlparse
from django.utils.text import slugify

import django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "core.settings")
django.setup()

from django.contrib.auth import get_user_model
from crm.models import CustomerRecord, SellerRecord, Ticket, Notification
from products.models import Category, Brand, Inventory, Product, ProductImage, Review
from sellers.models import SellerProfile, Store
from users.models import Address, CustomerProfile

User = get_user_model()


def unique_store_slug(name: str, seed_hint: str = "") -> str:
    base = slugify(name)
    if seed_hint:
        base = f"{base}-{slugify(seed_hint)}"
    slug = base
    suffix = 2
    while Store.objects.filter(slug=slug).exists():
        slug = f"{base}-{suffix}"
        suffix += 1
    return slug

admin = User.objects.filter(username="admin").first() or User.objects.filter(email="admin@dukan.local").first()
if admin:
    changed = False
    if admin.email != "admin@dukan.local":
        admin.email = "admin@dukan.local"
        changed = True
    if not admin.is_staff or not admin.is_superuser:
        admin.is_staff = True
        admin.is_superuser = True
        changed = True
    if changed:
        admin.save(update_fields=["email", "is_staff", "is_superuser"])
    print("Superuser ready: admin@dukan.local / existing password")
else:
    User.objects.create_superuser("admin", "admin@dukan.local", "admin")
    print("Superuser created: admin@dukan.local / admin")

User.objects.filter(email="admin@dukan.local").update(role="admin")

customer, _ = User.objects.update_or_create(
    email="customer@dukan.local",
    defaults={
        "username": "customer@dukan.local",
        "first_name": "Demo",
        "last_name": "Customer",
        "role": "customer",
        "is_active": True,
    },
)
customer.set_password("customer123")
customer.save()
CustomerProfile.objects.update_or_create(user=customer, defaults={"full_name": "Demo Customer"})
CustomerRecord.objects.update_or_create(user=customer, defaults={"source": "seed", "status": "active", "score": 25})
Address.objects.update_or_create(
    user=customer,
    label="Home",
    defaults={
        "full_name": "Demo Customer",
        "phone": "9800000000",
        "line1": "Lazimpat",
        "city": "Kathmandu",
        "country": "Nepal",
        "is_default": True,
    },
)

seller_user, _ = User.objects.update_or_create(
    email="seller@dukan.local",
    defaults={
        "username": "seller@dukan.local",
        "first_name": "Demo",
        "last_name": "Seller",
        "role": "seller",
        "is_active": True,
    },
)
seller_user.set_password("seller123")
seller_user.save()
seller_profile, _ = SellerProfile.objects.update_or_create(
    user=seller_user,
    defaults={"business_name": "Barat Kirana Pasal", "phone": "9811111111", "status": "verified"},
)
barat_store, _ = Store.objects.update_or_create(
    seller=seller_profile,
    defaults={
        "name": "Barat Kirana Pasal",
        "slug": "barat-kirana-pasal",
        "description": "Local general store from Pabitranagar, Gongabu for groceries, hygiene, and daily essentials.",
        "address": "Pabitranagar, Gongabu, Kathmandu",
        "area": "Pabitranagar, Gongabu",
        "map_url": "https://www.google.com/maps/search/?api=1&query=Pabitranagar%20Gongabu%20Kathmandu",
        "support_email": "seller@dukan.local",
        "support_phone": "9811111111",
        "logo_url": "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=600&q=80",
        "banner_url": "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=1600&q=80",
        "is_active": True,
    },
)
SellerRecord.objects.update_or_create(seller=seller_profile, defaults={"status": "verified", "risk_level": "normal"})

def ensure_seller_store(email, password, business_name, phone, description, logo_url="", banner_url=""):
    user, _ = User.objects.update_or_create(
        email=email,
        defaults={
            "username": email,
            "first_name": business_name.split()[0],
            "last_name": "Store",
            "role": "seller",
            "is_active": True,
        },
    )
    user.set_password(password)
    user.save()
    profile, _ = SellerProfile.objects.update_or_create(
        user=user,
        defaults={"business_name": business_name, "phone": phone, "status": "verified"},
    )
    store, _ = Store.objects.update_or_create(
        seller=profile,
        defaults={
            "name": business_name,
            "slug": unique_store_slug(business_name, email),
            "description": description,
            "address": {
                "New Road Tech Suppliers": "New Road, Kathmandu",
                "Thamel Style House": "Thamel, Kathmandu",
                "Baneshwor Home Mart": "New Baneshwor, Kathmandu",
            }.get(business_name, "Kathmandu, Nepal"),
            "area": {
                "New Road Tech Suppliers": "New Road",
                "Thamel Style House": "Thamel",
                "Baneshwor Home Mart": "New Baneshwor",
            }.get(business_name, "Kathmandu"),
            "map_url": "https://www.google.com/maps/search/?api=1&query=" + business_name.replace(" ", "%20") + "%20Kathmandu",
            "support_email": email,
            "support_phone": phone,
            "logo_url": logo_url,
            "banner_url": banner_url,
            "is_active": True,
        },
    )
    SellerRecord.objects.update_or_create(seller=profile, defaults={"status": "verified", "risk_level": "normal"})
    return store

tech_store = ensure_seller_store(
    "newroad.tech@dukan.local",
    "seller123",
    "New Road Tech Suppliers",
    "9822222222",
    "Mobile, laptop, audio, gaming, and networking seller from New Road.",
    logo_url="https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=600&q=80",
    banner_url="https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=1600&q=80",
)
fashion_store = ensure_seller_store(
    "thamel.style@dukan.local",
    "seller123",
    "Thamel Style House",
    "9833333333",
    "Fashion, sports, books, and lifestyle shop from Thamel.",
    logo_url="https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=600&q=80",
    banner_url="https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=1600&q=80",
)
home_store = ensure_seller_store(
    "baneshwor.home@dukan.local",
    "seller123",
    "Baneshwor Home Mart",
    "9844444444",
    "Home, appliance, beauty, and household essentials seller from Baneshwor.",
    logo_url="https://images.unsplash.com/photo-1556911220-bff31c812dba?auto=format&fit=crop&w=600&q=80",
    banner_url="https://images.unsplash.com/photo-1556911220-bff31c812dba?auto=format&fit=crop&w=1600&q=80",
)
books_store = ensure_seller_store(
    "books@dukan.local",
    "seller123",
    "Boudha Books & Stationery",
    "9855555555",
    "Books, exam prep, stationery, and school gear from Boudha.",
    logo_url="https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&w=600&q=80",
    banner_url="https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&w=1600&q=80",
)
sports_store = ensure_seller_store(
    "sports@dukan.local",
    "seller123",
    "Kalanki Sports Hub",
    "9866666666",
    "Fitness, football, basketball, and outdoor training gear from Kalanki.",
    logo_url="https://images.unsplash.com/photo-1517649763962-0c623066013b?auto=format&fit=crop&w=600&q=80",
    banner_url="https://images.unsplash.com/photo-1517649763962-0c623066013b?auto=format&fit=crop&w=1600&q=80",
)
console_store = ensure_seller_store(
    "console@dukan.local",
    "seller123",
    "New Road Console Garage",
    "9877777777",
    "Consoles, gaming chairs, controllers, and maker gear from New Road.",
    logo_url="https://images.unsplash.com/photo-1605901309584-818e25960a8f?auto=format&fit=crop&w=600&q=80",
    banner_url="https://images.unsplash.com/photo-1605901309584-818e25960a8f?auto=format&fit=crop&w=1600&q=80",
)
auto_store = ensure_seller_store(
    "auto@dukan.local",
    "seller123",
    "Teku Auto & Bike Store",
    "9888888888",
    "Helmets, bike accessories, and riding gear from Teku.",
    logo_url="https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=600&q=80",
    banner_url="https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=1600&q=80",
)
eco_store = ensure_seller_store(
    "eco@dukan.local",
    "seller123",
    "Patan Eco & Pet Mart",
    "9899999999",
    "Reusable goods, bamboo products, pet food, and solar gadgets from Patan.",
    logo_url="https://images.unsplash.com/photo-1472141521881-95d0f57e1f47?auto=format&fit=crop&w=600&q=80",
    banner_url="https://images.unsplash.com/photo-1472141521881-95d0f57e1f47?auto=format&fit=crop&w=1600&q=80",
)
fake_store = ensure_seller_store(
    "bharatpur@kinahub.local",
    "seller123",
    "Bharatpur General Store",
    "9800000001",
    "Marketplace-style general store with clothing, electronics, and jewelry.",
    logo_url="https://images.unsplash.com/photo-1556742205-9ba1fefe7f4d?auto=format&fit=crop&w=600&q=80",
    banner_url="https://images.unsplash.com/photo-1556742205-9ba1fefe7f4d?auto=format&fit=crop&w=1600&q=80",
)
dummy_store = ensure_seller_store(
    "lifestyle@kinahub.local",
    "seller123",
    "Everest Lifestyle Mart",
    "9800000002",
    "Beauty, furniture, and grocery products sourced from premium brands.",
    logo_url="https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=600&q=80",
    banner_url="https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=1600&q=80",
)
platzi_store = ensure_seller_store(
    "pokhara@kinahub.local",
    "seller123",
    "Pokhara Modern Mall",
    "9800000003",
    "Fashion, electronics, and furniture from top brands in Pokhara.",
    logo_url="https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=600&q=80",
    banner_url="https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=1600&q=80",
)
Ticket.objects.get_or_create(
    customer=customer,
    seller=seller_profile,
    subject="Demo delivery question",
    defaults={"description": "Customer asked about delivery timeline.", "priority": "medium"},
)
Notification.objects.get_or_create(
    user=seller_user,
    title="New seller dashboard ready",
    defaults={"notification_type": "status", "body": "Your demo store has CRM and product tools enabled."},
)
print("Demo accounts ready: customer@dukan.local/customer123, seller@dukan.local/seller123, admin@dukan.local/admin")


def fetch_json(url):
    request = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(request, timeout=30) as response:
        return json.loads(response.read().decode())


def download_image(source_url, target_filename):
    os.makedirs(product_media_dir, exist_ok=True)
    target_path = os.path.join(product_media_dir, target_filename)
    if os.path.exists(target_path):
        return f"/product-media/{target_filename}"

    request = urllib.request.Request(source_url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(request, timeout=30) as response, open(target_path, "wb") as output:
        output.write(response.read())

    return f"/product-media/{target_filename}"


review_people = [
    ("Ram Shah", "Overall a solid pick.", True),
    ("Sita Karki", "Arrived quickly and matched the description.", False),
    ("Aarav Shrestha", "Good value for the price in Kathmandu.", True),
    ("Nisha Thapa", "Packaging was fine and the product works well.", False),
    ("Bikram Gurung", "Better than expected from a local seller.", True),
    ("Mina Lama", "Would buy again from the same store.", False),
]


def seed_fake_reviews(product):
    existing = Review.objects.filter(product=product).count()
    if existing:
        return

    base_rating = float(product.rating or 4.0)
    review_ratings = [
        max(1, min(5, round(base_rating + 0.2))),
        max(1, min(5, round(base_rating))),
        max(1, min(5, round(base_rating - 0.2))),
    ]
    created_reviews = []
    for index, rating in enumerate(review_ratings):
        # keep reviews short and human-looking for the demo catalog
        name, prefix, verified = review_people[(product.id + index) % len(review_people)]
        review = Review.objects.create(
            product=product,
            user=None,
            name=name,
            rating=rating,
            title=prefix,
            comment=f"{prefix} It works well for {product.category.name.lower()} and feels like a good local buy.",
            is_verified_purchase=verified,
        )
        created_reviews.append(review)

    average_rating = round(sum(review.rating for review in created_reviews) / len(created_reviews), 2)
    Product.objects.filter(pk=product.pk).update(rating=average_rating)

category_rows = [
    ("Mobiles", "Phones, chargers, cases, and wearable tech"),
    ("Laptops", "Work, school, creator, and gaming machines"),
    ("Accessories", "Keyboards, storage, chargers, hubs, and desk gear"),
    ("Audio", "Earbuds, headphones, speakers, and sound gear"),
    ("Fashion", "Everyday wear, sneakers, bags, and accessories"),
    ("Home", "Kitchen, room, cleaning, and living essentials"),
    ("Beauty", "Skin care, grooming, and personal care"),
    ("Groceries", "Daily household food and pantry items"),
    ("Gaming", "Consoles, peripherals, and setup gear"),
    ("Networking", "Routers, mesh WiFi, switches, and connectivity gear"),
    ("Appliances", "Useful electronics for home and hostel rooms"),
    ("Sports", "Fitness, outdoor, and training products"),
    ("Books", "Study, fiction, business, and stationery"),
    ("Cameras", "Camera bodies, lenses, tripods, and accessories"),
    ("School", "Bags, learning kits, calculators, and class gear"),
    ("Stationery", "Pens, notebooks, organizers, and desk tools"),
    ("Pets", "Food, toys, grooming, and daily pet care"),
    ("Automotive & Bikes", "Helmets, lights, mounts, and ride accessories"),
    ("Eco & Sustainable", "Reusable bottles, bamboo goods, and solar gadgets"),
]

cats = {}
for order, (name, description) in enumerate(category_rows):
    category, _ = Category.objects.update_or_create(
        name=name,
        defaults={"description": description, "order": order},
    )
    cats[name] = category
print(f"{len(cats)} categories ready")

Category.objects.filter(name="Smartphones").delete()

brand_names = [
    "Apple", "Samsung", "Dell", "Lenovo", "Sony", "Razer", "Logitech",
    "Xiaomi", "HP", "Ubiquiti", "TP-Link", "Corsair", "Anker", "SanDisk",
    "Keychron", "CalDigit", "Nike", "Puma", "The Ordinary", "CG", "Philips",
    "Goldstar", "Bhat-Bhateni", "Penguin", "Himalayan Java", "Dukan Basics",
    "Wai Wai", "Dettol", "Fortune", "Aashirvaad",
    "PlayStation", "Xbox", "Raspberry Pi", "Arduino", "Canon", "Adidas",
    "Hydro Flask", "CamelBak", "PetSafe", "EcoFlow", "Apsara", "Nataraj",
    "Moleskine", "Classmate", "Bamboo Earth", "Casio",
]

brands = {}
for name in brand_names:
    brand, _ = Brand.objects.get_or_create(name=name)
    brands[name] = brand
print(f"{len(brands)} brands ready")

products_data = [
    {
        "name": "Wai Wai Chicken Noodles 30 Pack",
        "category": "Groceries",
        "brand": "Wai Wai",
        "price": 750,
        "discount_price": 699,
        "stock": 60,
        "rating": 4.7,
        "tag": "Local",
        "is_featured": True,
        "store": "barat",
        "image_url": "https://images.unsplash.com/photo-1612929633738-8fe44f7ec841?auto=format&fit=crop&w=900&q=80",
        "description": "Family pack of Wai Wai noodles stocked by Barat Kirana Pasal in Gongabu.",
        "specifications": "Pack: 30 pcs\nArea: Pabitranagar, Gongabu\nDelivery: Same-day in nearby areas\nPayment: COD and wallets",
    },
    {
        "name": "Dettol Original Soap 4 Pack",
        "category": "Groceries",
        "brand": "Dettol",
        "price": 320,
        "discount_price": 289,
        "stock": 85,
        "rating": 4.6,
        "tag": "Daily",
        "is_featured": True,
        "store": "barat",
        "image_url": "https://images.unsplash.com/photo-1607006483224-b2d3c5ca90d9?auto=format&fit=crop&w=900&q=80",
        "description": "Daily hygiene soap pack from a local Gongabu general store.",
        "specifications": "Pack: 4 bars\nUse: Bath and hygiene\nArea: Gongabu\nDelivery: Same-day",
    },
    {
        "name": "Fortune Sunflower Oil 1L",
        "category": "Groceries",
        "brand": "Fortune",
        "price": 330,
        "discount_price": 310,
        "stock": 45,
        "rating": 4.4,
        "tag": "Kitchen",
        "is_featured": False,
        "store": "barat",
        "image_url": "https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?auto=format&fit=crop&w=900&q=80",
        "description": "Daily cooking oil available from Barat Kirana Pasal.",
        "specifications": "Volume: 1L\nType: Sunflower oil\nArea: Pabitranagar\nDelivery: Standard or express",
    },
    {
        "name": "Aashirvaad Atta 5kg",
        "category": "Groceries",
        "brand": "Aashirvaad",
        "price": 625,
        "discount_price": 589,
        "stock": 38,
        "rating": 4.5,
        "tag": "Staple",
        "is_featured": False,
        "store": "barat",
        "image_url": "https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?auto=format&fit=crop&w=900&q=80",
        "description": "Wheat flour for daily home cooking from a local kirana store.",
        "specifications": "Weight: 5kg\nType: Whole wheat\nArea: Gongabu\nPayment: COD available",
    },
    {
        "name": "iPhone 16 Pro Max",
        "category": "Mobiles",
        "brand": "Apple",
        "price": 199999,
        "discount_price": 189999,
        "stock": 14,
        "rating": 4.8,
        "tag": "Hot",
        "is_featured": True,
        "image_url": "https://images.unsplash.com/photo-1695048133142-1a20484d2569?auto=format&fit=crop&w=900&q=80",
        "description": "A18 Pro, titanium body, 48MP camera system, and excellent battery life.",
        "specifications": "Storage: 256GB\nDisplay: 6.9 inch Super Retina XDR\nWarranty: 1 year\nDelivery: Kathmandu valley 1-2 days",
    },
    {
        "name": "Samsung Galaxy S25 Ultra",
        "category": "Mobiles",
        "brand": "Samsung",
        "price": 164999,
        "discount_price": 154999,
        "stock": 18,
        "rating": 4.7,
        "tag": "Deal",
        "is_featured": True,
        "image_url": "https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?auto=format&fit=crop&w=900&q=80",
        "description": "Flagship Android phone with bright AMOLED display, S Pen, and pro cameras.",
        "specifications": "Storage: 256GB\nRAM: 12GB\nCamera: 200MP main\nPayment: Cash on Delivery available",
    },
    {
        "name": "MacBook Air M3",
        "category": "Laptops",
        "brand": "Apple",
        "price": 189999,
        "discount_price": 174999,
        "stock": 10,
        "rating": 4.9,
        "tag": "Featured",
        "is_featured": True,
        "image_url": "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=900&q=80",
        "description": "Thin, silent, fast laptop for school, work, and travel.",
        "specifications": "Processor: Apple M3\nRAM: 16GB\nStorage: 512GB SSD\nBattery: Up to 18 hours",
    },
    {
        "name": "Dell XPS 15 Creator",
        "category": "Laptops",
        "brand": "Dell",
        "price": 175999,
        "discount_price": 159999,
        "stock": 7,
        "rating": 4.6,
        "tag": "Creator",
        "is_featured": True,
        "image_url": "https://images.unsplash.com/photo-1496181133206-80ce9b88a853?auto=format&fit=crop&w=900&q=80",
        "description": "OLED laptop with strong performance for design, editing, and coding.",
        "specifications": "Processor: Intel Core i7\nRAM: 16GB\nGPU: RTX 4050\nDisplay: 15.6 inch OLED",
    },
    {
        "name": "Lenovo IdeaPad Slim 5",
        "category": "Laptops",
        "brand": "Lenovo",
        "price": 92999,
        "discount_price": 84999,
        "stock": 21,
        "rating": 4.4,
        "tag": "Student",
        "is_featured": False,
        "image_url": "https://images.unsplash.com/photo-1541807084-5c52b6b3adef?auto=format&fit=crop&w=900&q=80",
        "description": "Good daily laptop for college, office, browsing, and light creative work.",
        "specifications": "Processor: Ryzen 7\nRAM: 16GB\nStorage: 512GB SSD\nWeight: 1.46 kg",
    },
    {
        "name": "Nike Court Vision Low",
        "category": "Fashion",
        "brand": "Nike",
        "price": 10499,
        "discount_price": 8999,
        "stock": 34,
        "rating": 4.5,
        "tag": "New",
        "is_featured": True,
        "image_url": "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=900&q=80",
        "description": "Clean low-top sneakers for daily wear.",
        "specifications": "Material: Synthetic leather\nSizes: 39-44\nColor: White\nReturn: 7 days",
    },
    {
        "name": "Puma Everyday Hoodie",
        "category": "Fashion",
        "brand": "Puma",
        "price": 5999,
        "discount_price": 4499,
        "stock": 40,
        "rating": 4.3,
        "tag": "Sale",
        "is_featured": False,
        "image_url": "https://images.unsplash.com/photo-1556821840-3a63f95609a7?auto=format&fit=crop&w=900&q=80",
        "description": "Soft fleece hoodie for winter mornings and casual days.",
        "specifications": "Fit: Regular\nFabric: Cotton blend\nSizes: S-XL\nWash: Machine washable",
    },
    {
        "name": "Goldstar Classic Sneakers",
        "category": "Fashion",
        "brand": "Goldstar",
        "price": 2199,
        "discount_price": 1899,
        "stock": 65,
        "rating": 4.2,
        "tag": "Local",
        "is_featured": True,
        "image_url": "https://images.unsplash.com/photo-1608231387042-66d1773070a5?auto=format&fit=crop&w=900&q=80",
        "description": "Affordable Nepali everyday sneakers with solid grip.",
        "specifications": "Origin: Nepal\nSizes: 38-44\nUse: Daily wear\nReturn: 7 days",
    },
    {
        "name": "Philips Air Fryer 4.1L",
        "category": "Home",
        "brand": "Philips",
        "price": 24999,
        "discount_price": 21499,
        "stock": 19,
        "rating": 4.6,
        "tag": "Kitchen",
        "is_featured": True,
        "image_url": "/product-media/philips-air-fryer-41l.jpg",
        "description": "Compact air fryer for fast snacks and low-oil cooking.",
        "specifications": "Capacity: 4.1L\nPower: 1400W\nWarranty: 1 year\nUse: Kitchen",
    },
    {
        "name": "Dukan Basics Cotton Bedsheet",
        "category": "Home",
        "brand": "Dukan Basics",
        "price": 2499,
        "discount_price": 1999,
        "stock": 55,
        "rating": 4.1,
        "tag": "Home",
        "is_featured": False,
        "image_url": "https://images.unsplash.com/photo-1615874959474-d609969a20ed?auto=format&fit=crop&w=900&q=80",
        "description": "Soft double-bed cotton bedsheet with pillow covers.",
        "specifications": "Size: Double\nMaterial: Cotton\nIncludes: 2 pillow covers\nWash: Machine washable",
    },
    {
        "name": "The Ordinary Niacinamide 10%",
        "category": "Beauty",
        "brand": "The Ordinary",
        "price": 2499,
        "discount_price": 2199,
        "stock": 42,
        "rating": 4.5,
        "tag": "Beauty",
        "is_featured": True,
        "image_url": "https://images.unsplash.com/photo-1620916566398-39f1143ab7be?auto=format&fit=crop&w=900&q=80",
        "description": "Daily serum for oil control and smoother-looking skin.",
        "specifications": "Volume: 30ml\nSkin type: Oily and combination\nUse: Daily\nAuthenticity: Verified stock",
    },
    {
        "name": "Philips Beard Trimmer",
        "category": "Beauty",
        "brand": "Philips",
        "price": 4999,
        "discount_price": 3999,
        "stock": 36,
        "rating": 4.4,
        "tag": "Grooming",
        "is_featured": False,
        "image_url": "https://images.unsplash.com/photo-1621607512214-68297480165e?auto=format&fit=crop&w=900&q=80",
        "description": "Cordless trimmer with multiple length settings.",
        "specifications": "Battery: 60 minutes\nSettings: 20 lengths\nWarranty: 1 year\nCharging: USB",
    },
    {
        "name": "Bhat-Bhateni Basmati Rice 5kg",
        "category": "Groceries",
        "brand": "Bhat-Bhateni",
        "price": 1199,
        "discount_price": 1099,
        "stock": 120,
        "rating": 4.3,
        "tag": "Daily",
        "is_featured": True,
        "image_url": "https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=900&q=80",
        "description": "Long grain basmati rice for daily meals.",
        "specifications": "Weight: 5kg\nType: Basmati\nDelivery: Same-day in selected areas\nPayment: COD",
    },
    {
        "name": "Himalayan Java Coffee Beans",
        "category": "Groceries",
        "brand": "Himalayan Java",
        "price": 899,
        "discount_price": 799,
        "stock": 80,
        "rating": 4.7,
        "tag": "Fresh",
        "is_featured": False,
        "image_url": "https://images.unsplash.com/photo-1559056199-641a0ac8b55e?auto=format&fit=crop&w=900&q=80",
        "description": "Roasted coffee beans for home brewing.",
        "specifications": "Weight: 250g\nRoast: Medium\nOrigin: Nepal\nUse: Espresso or filter",
    },
    {
        "name": "Razer DeathAdder V3",
        "category": "Gaming",
        "brand": "Razer",
        "price": 8999,
        "discount_price": 7499,
        "stock": 28,
        "rating": 4.6,
        "tag": "Esports",
        "is_featured": True,
        "image_url": "https://images.unsplash.com/photo-1615663245857-ac93bb7c39e7?auto=format&fit=crop&w=900&q=80",
        "description": "Lightweight gaming mouse with fast optical switches.",
        "specifications": "Sensor: 30K DPI\nWeight: 63g\nConnection: Wired\nWarranty: 1 year",
    },
    {
        "name": "Logitech G435 Wireless Headset",
        "category": "Gaming",
        "brand": "Logitech",
        "price": 10999,
        "discount_price": 9299,
        "stock": 24,
        "rating": 4.4,
        "tag": "Audio",
        "is_featured": False,
        "image_url": "https://images.unsplash.com/photo-1599669454699-248893623440?auto=format&fit=crop&w=900&q=80",
        "description": "Light wireless headset for PC, console, and phone gaming.",
        "specifications": "Connection: Bluetooth and Lightspeed\nBattery: 18 hours\nWeight: 165g\nMic: Dual beamforming",
    },
    {
        "name": "Dell XPS 15",
        "category": "Laptops",
        "brand": "Dell",
        "price": 175999,
        "discount_price": 159999,
        "stock": 8,
        "rating": 4.6,
        "tag": "Creator",
        "is_featured": True,
        "image_url": "/product-media/dell-xps-15.png",
        "description": "Stunning InfinityEdge display in a compact design. Perfect for creators and professionals.",
        "specifications": "Processor: Intel Core i7-13700H\nRAM: 16GB DDR5\nStorage: 512GB NVMe SSD\nDisplay: 15.6 inch OLED 3.5K\nGPU: NVIDIA RTX 4050\nWeight: 1.86 kg",
    },
    {
        "name": "AirPods Pro 3",
        "category": "Audio",
        "brand": "Apple",
        "price": 34999,
        "discount_price": 31999,
        "stock": 50,
        "rating": 4.7,
        "tag": "ANC",
        "is_featured": True,
        "image_url": "/product-media/airpods-pro-3.png",
        "description": "Active Noise Cancellation, Adaptive Transparency, and Personalized Spatial Audio with head tracking.",
        "specifications": "Driver: Custom high-excursion\nANC: Active Noise Cancellation\nBattery: 6 hours, 30 with case\nConnectivity: Bluetooth 5.3\nWater Resistance: IPX4",
    },
    {
        "name": "Sony WH-1000XM6",
        "category": "Audio",
        "brand": "Sony",
        "price": 44999,
        "discount_price": 39999,
        "stock": 25,
        "rating": 4.8,
        "tag": "Premium",
        "is_featured": True,
        "image_url": "/product-media/sony-wh-1000xm6.png",
        "description": "Industry-leading noise cancellation with exceptional sound quality and long battery life.",
        "specifications": "Driver: 40mm\nANC: Adaptive\nBattery: 40 hours\nCodecs: LDAC, AAC, SBC\nWeight: 252g\nFolding: Yes",
    },
    {
        "name": "Xiaomi Pad 7 Pro",
        "category": "Accessories",
        "brand": "Xiaomi",
        "price": 42999,
        "discount_price": 38999,
        "stock": 12,
        "rating": 4.5,
        "tag": "Tablet",
        "is_featured": False,
        "image_url": "/product-media/xiaomi-pad-7-pro.jpg",
        "description": "Premium tablet with a bright 11.2 inch 144Hz display, Snapdragon chip, and massive battery.",
        "specifications": "Display: 11.2 inch IPS 144Hz\nProcessor: Snapdragon 8s Gen 3\nRAM: 8GB\nStorage: 256GB\nBattery: 10000mAh\nCharging: 67W",
    },
    {
        "name": "Logitech MX Mechanical",
        "category": "Accessories",
        "brand": "Logitech",
        "price": 19999,
        "discount_price": 17999,
        "stock": 18,
        "rating": 4.5,
        "tag": "Keyboard",
        "is_featured": False,
        "image_url": "/product-media/logitech-mx-mechanical.jpg",
        "description": "Wireless mechanical keyboard with smart backlighting and multi-device connectivity.",
        "specifications": "Switches: Tactile Quiet\nBacklight: Smart Illumination\nBattery: Up to 15 months\nConnectivity: Bluetooth + USB Receiver\nLayout: Full Size",
    },
    {
        "name": "HP Pavilion Gaming Desktop",
        "category": "Gaming",
        "brand": "HP",
        "price": 125999,
        "discount_price": 109999,
        "stock": 5,
        "rating": 4.4,
        "tag": "Desktop",
        "is_featured": True,
        "image_url": "/product-media/hp-pavilion-gaming-desktop.jpg",
        "description": "Powerful gaming desktop with RTX graphics for modern games and creative workloads.",
        "specifications": "Processor: AMD Ryzen 7 7700X\nGPU: NVIDIA RTX 4060 8GB\nRAM: 16GB DDR5\nStorage: 1TB NVMe SSD\nPSU: 500W\nOS: Windows 11",
    },
    {
        "name": "Samsung T7 Shield SSD 2TB",
        "category": "Accessories",
        "brand": "Samsung",
        "price": 16999,
        "discount_price": 14999,
        "stock": 40,
        "rating": 4.6,
        "tag": "Storage",
        "is_featured": False,
        "image_url": "/product-media/samsung-t7-shield-ssd-2tb.jpg",
        "description": "Portable SSD with rugged design and USB 3.2 Gen 2 speeds up to 1,050MB/s.",
        "specifications": "Capacity: 2TB\nInterface: USB 3.2 Gen 2\nRead Speed: 1050 MB/s\nWrite Speed: 1000 MB/s\nDurability: IP65, 3m drop\nWeight: 98g",
    },
    {
        "name": "Xiaomi Smart Band 9",
        "category": "Accessories",
        "brand": "Xiaomi",
        "price": 3999,
        "discount_price": 3499,
        "stock": 100,
        "rating": 4.4,
        "tag": "Wearable",
        "is_featured": False,
        "image_url": "/product-media/xiaomi-smart-band-9.jpg",
        "description": "AMOLED fitness band with sport modes, SpO2 monitoring, and long battery life.",
        "specifications": "Display: 1.62 inch AMOLED\nBattery: 21 days\nWater Resistance: 5ATM\nSensors: Heart Rate, SpO2, Accelerometer\nWeight: 15.8g",
    },
    {
        "name": "Ubiquiti UniFi Dream Machine Pro",
        "category": "Networking",
        "brand": "Ubiquiti",
        "price": 55000,
        "discount_price": None,
        "stock": 50,
        "rating": 4.6,
        "tag": "Network",
        "is_featured": False,
        "image_url": "/product-media/ubiquiti-unifi-dream-machine-pro.jpg",
        "description": "All-in-one enterprise network console with Dual WAN, 10G SFP+, and advanced firewall tools.",
        "specifications": "WAN: Dual WAN\nPorts: 10G SFP+\nSecurity: Advanced firewall\nUse: Store, office, and creator studio networks",
    },
    {
        "name": "TP-Link Deco AX3000 WiFi 6 Mesh",
        "category": "Networking",
        "brand": "TP-Link",
        "price": 24999,
        "discount_price": None,
        "stock": 50,
        "rating": 4.5,
        "tag": "WiFi 6",
        "is_featured": False,
        "image_url": "/product-media/tp-link-deco-ax3000-wifi-6-mesh.jpg",
        "description": "WiFi 6 mesh system with seamless roaming, low latency, and wide home coverage.",
        "specifications": "Speed: AX3000\nWireless: WiFi 6\nCoverage: Mesh roaming\nUse: Home, hostel, and small office",
    },
    {
        "name": "Corsair MM300 PRO Extended Mouse Pad",
        "category": "Accessories",
        "brand": "Corsair",
        "price": 4500,
        "discount_price": None,
        "stock": 50,
        "rating": 4.3,
        "tag": "Desk",
        "is_featured": False,
        "image_url": "/product-media/corsair-mm300-pro-extended-mouse-pad.jpg",
        "description": "Spill-proof extended gaming mouse pad with a smooth surface for full desk setups.",
        "specifications": "Surface: Textile weave\nSize: Extended\nBase: Anti-skid rubber\nUse: Gaming and developer desks",
    },
    {
        "name": "Anker 735 Charger (GaNPrime 65W)",
        "category": "Accessories",
        "brand": "Anker",
        "price": 8999,
        "discount_price": None,
        "stock": 50,
        "rating": 4.6,
        "tag": "Charger",
        "is_featured": False,
        "image_url": "/product-media/anker-735-charger-ganprime-65w.jpg",
        "description": "Compact GaNPrime charger that powers three devices at once with fast 65W output.",
        "specifications": "Output: 65W\nPorts: 2 USB-C + 1 USB-A\nTechnology: GaNPrime\nUse: Phone, tablet, and laptop charging",
    },
    {
        "name": "SanDisk 1TB Dual Drive USB-C",
        "category": "Accessories",
        "brand": "SanDisk",
        "price": 9500,
        "discount_price": None,
        "stock": 50,
        "rating": 4.4,
        "tag": "Storage",
        "is_featured": False,
        "image_url": "/product-media/sandisk-1tb-dual-drive-usb-c.jpg",
        "description": "Dual USB-C and USB-A flash drive for moving files between phones, tablets, Macs, and PCs.",
        "specifications": "Capacity: 1TB\nConnectors: USB-C and USB-A\nUse: Phone and laptop file transfer\nDesign: Reversible dual drive",
    },
    {
        "name": "Keychron Q1 Pro Mechanical Keyboard",
        "category": "Accessories",
        "brand": "Keychron",
        "price": 28000,
        "discount_price": None,
        "stock": 50,
        "rating": 4.7,
        "tag": "Custom",
        "is_featured": False,
        "image_url": "/product-media/keychron-q1-pro-mechanical-keyboard.jpg",
        "description": "Full-metal QMK/VIA wireless custom mechanical keyboard for heavy typing and coding.",
        "specifications": "Build: Full metal\nFirmware: QMK/VIA\nConnection: Wireless and wired\nUse: Coding, writing, and desk setups",
    },
    {
        "name": "CalDigit TS4 Thunderbolt 4 Dock",
        "category": "Accessories",
        "brand": "CalDigit",
        "price": 62000,
        "discount_price": None,
        "stock": 50,
        "rating": 4.8,
        "tag": "Dock",
        "is_featured": False,
        "image_url": "/product-media/caldigit-ts4-thunderbolt-4-dock.jpg",
        "description": "Thunderbolt 4 dock with 18 ports, 98W charging, and 2.5GbE for full workstation setups.",
        "specifications": "Ports: 18\nCharging: 98W\nNetwork: 2.5GbE\nConnection: Thunderbolt 4",
    },
    {
        "name": "CG 190L Single Door Refrigerator",
        "category": "Appliances",
        "brand": "CG",
        "price": 32999,
        "discount_price": 29999,
        "stock": 11,
        "rating": 4.2,
        "tag": "Appliance",
        "is_featured": True,
        "image_url": "https://images.unsplash.com/photo-1571175443880-49e1d25b2bc5?auto=format&fit=crop&w=900&q=80",
        "description": "Compact refrigerator for flats, shops, and hostel rooms.",
        "specifications": "Capacity: 190L\nEnergy: 3 star\nWarranty: 1 year\nDelivery: Scheduled",
    },
    {
        "name": "Xiaomi Smart Air Purifier 4",
        "category": "Appliances",
        "brand": "Xiaomi",
        "price": 23999,
        "discount_price": 20999,
        "stock": 15,
        "rating": 4.5,
        "tag": "Clean Air",
        "is_featured": False,
        "image_url": "https://images.unsplash.com/photo-1585771724684-38269d6639fd?auto=format&fit=crop&w=900&q=80",
        "description": "Smart purifier for dust, smoke, and indoor pollution.",
        "specifications": "Coverage: Up to 48 sq m\nFilter: HEPA\nControl: App and voice\nWarranty: 1 year",
    },
    {
        "name": "Nike Training Yoga Mat",
        "category": "Sports",
        "brand": "Nike",
        "price": 4999,
        "discount_price": 4199,
        "stock": 31,
        "rating": 4.4,
        "tag": "Fitness",
        "is_featured": False,
        "image_url": "https://images.unsplash.com/photo-1601925260368-ae2f83cf8b7f?auto=format&fit=crop&w=900&q=80",
        "description": "Comfortable non-slip mat for home workouts and yoga.",
        "specifications": "Thickness: 5mm\nMaterial: TPE\nUse: Yoga and training\nCarry strap: Included",
    },
    {
        "name": "Dukan Basics Dumbbell Set 20kg",
        "category": "Sports",
        "brand": "Dukan Basics",
        "price": 6999,
        "discount_price": 5999,
        "stock": 17,
        "rating": 4.2,
        "tag": "Workout",
        "is_featured": True,
        "image_url": "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?auto=format&fit=crop&w=900&q=80",
        "description": "Adjustable dumbbell set for simple strength training at home.",
        "specifications": "Total weight: 20kg\nMaterial: Cement plates\nGrip: Steel bar\nUse: Home gym",
    },
    {
        "name": "Atomic Habits",
        "category": "Books",
        "brand": "Penguin",
        "price": 1199,
        "discount_price": 999,
        "stock": 48,
        "rating": 4.8,
        "tag": "Book",
        "is_featured": True,
        "image_url": "/product-media/atomic-habits.jpg",
        "description": "A practical book on building better habits and systems.",
        "specifications": "Format: Paperback\nLanguage: English\nPages: 320\nCategory: Self improvement",
    },
    {
        "name": "Classmate Notebook Pack",
        "category": "Books",
        "brand": "Dukan Basics",
        "price": 599,
        "discount_price": 499,
        "stock": 90,
        "rating": 4.1,
        "tag": "School",
        "is_featured": False,
        "image_url": "https://images.unsplash.com/photo-1531346878377-a5be20888e57?auto=format&fit=crop&w=900&q=80",
        "description": "Pack of ruled notebooks for school and college.",
        "specifications": "Pack: 5 notebooks\nPages: 160 each\nPaper: Ruled\nUse: Study",
    },
]

extra_products = [
    {
        "name": "Atomic Habits",
        "category": "Books",
        "brand": "Penguin",
        "price": 1199,
        "discount_price": 999,
        "stock": 32,
        "rating": 4.8,
        "tag": "Book",
        "is_featured": False,
        "store": "books",
        "image_url": "/product-media/atomic-habits.jpg",
        "description": "A second local store listing of the same book for Kathmandu readers.",
        "specifications": "Format: Paperback\nLanguage: English\nPages: 320\nCategory: Self improvement",
    },
    {
        "name": "SEE Entrance Prep Books Pack",
        "category": "Books",
        "brand": "Penguin",
        "price": 1599,
        "discount_price": 1399,
        "stock": 25,
        "rating": 4.7,
        "tag": "Exam",
        "is_featured": True,
        "store": "books",
        "image_url": "https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&w=900&q=80",
        "description": "Exam-focused prep books for SEE and local entrance tests.",
        "specifications": "Format: Paperback\nUse: Exam prep\nStore: Boudha Books & Stationery\nDelivery: Kathmandu valley",
    },
    {
        "name": "Programming Books Bundle",
        "category": "Books",
        "brand": "Penguin",
        "price": 1999,
        "discount_price": 1799,
        "stock": 18,
        "rating": 4.6,
        "tag": "Code",
        "is_featured": True,
        "store": "books",
        "image_url": "https://images.unsplash.com/photo-1519682337058-a94d519337bc?auto=format&fit=crop&w=900&q=80",
        "description": "Python, web, and data books for students and junior developers.",
        "specifications": "Format: Paperback\nUse: Programming study\nPackage: Bundle\nDelivery: Kathmandu valley",
    },
    {
        "name": "Study Lamp LED Desk Light",
        "category": "School",
        "brand": "Philips",
        "price": 1799,
        "discount_price": 1499,
        "stock": 44,
        "rating": 4.5,
        "tag": "Study",
        "is_featured": False,
        "store": "books",
        "image_url": "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=900&q=80",
        "description": "Bright adjustable lamp for desks, study tables, and hostel rooms.",
        "specifications": "Light: LED\nUse: Study desk\nPower: USB\nStore: Boudha Books & Stationery",
    },
    {
        "name": "Scientific Calculator Pro",
        "category": "School",
        "brand": "Casio",
        "price": 1999,
        "discount_price": 1699,
        "stock": 60,
        "rating": 4.7,
        "tag": "Math",
        "is_featured": False,
        "store": "books",
        "image_url": "https://images.unsplash.com/photo-1516321497487-e288fb19713f?auto=format&fit=crop&w=900&q=80",
        "description": "Scientific calculator for class, entrance prep, and engineering basics.",
        "specifications": "Functions: 240+\nPower: Solar and battery\nUse: School and college",
    },
    {
        "name": "School Bag Urban Pro",
        "category": "School",
        "brand": "Dukan Basics",
        "price": 2899,
        "discount_price": 2399,
        "stock": 28,
        "rating": 4.4,
        "tag": "School",
        "is_featured": False,
        "store": "books",
        "image_url": "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=900&q=80",
        "description": "Durable school bag for books, notebooks, and daily commute.",
        "specifications": "Compartments: 3\nMaterial: Water resistant\nUse: School and tuition",
    },
    {
        "name": "Pocket Notebook Set",
        "category": "Stationery",
        "brand": "Classmate",
        "price": 499,
        "discount_price": 399,
        "stock": 120,
        "rating": 4.2,
        "tag": "Notes",
        "is_featured": False,
        "store": "books",
        "image_url": "https://images.unsplash.com/photo-1455390582262-044cdead277a?auto=format&fit=crop&w=900&q=80",
        "description": "Compact notebook set for class notes and quick reminders.",
        "specifications": "Pack: 6\nPages: 80 each\nPaper: Ruled\nUse: Notes",
    },
    {
        "name": "Gel Pen Pack",
        "category": "Stationery",
        "brand": "Apsara",
        "price": 299,
        "discount_price": 249,
        "stock": 150,
        "rating": 4.1,
        "tag": "Stationery",
        "is_featured": False,
        "store": "books",
        "image_url": "https://images.unsplash.com/photo-1583485088034-697b5bc54ccd?auto=format&fit=crop&w=900&q=80",
        "description": "Smooth-writing gel pens for school, office, and journaling.",
        "specifications": "Pack: 10\nInk: Blue and black\nUse: Daily writing",
    },
    {
        "name": "Football Training Ball",
        "category": "Sports",
        "brand": "Nike",
        "price": 2499,
        "discount_price": 2199,
        "stock": 24,
        "rating": 4.5,
        "tag": "Football",
        "is_featured": True,
        "store": "sports",
        "image_url": "https://images.unsplash.com/photo-1517649763962-0c623066013b?auto=format&fit=crop&w=900&q=80",
        "description": "Training football for school grounds, futsal courts, and local matches.",
        "specifications": "Size: 5\nMaterial: Synthetic leather\nUse: Training and matches",
    },
    {
        "name": "Basketball Training Ball",
        "category": "Sports",
        "brand": "Adidas",
        "price": 2799,
        "discount_price": 2399,
        "stock": 20,
        "rating": 4.4,
        "tag": "Basketball",
        "is_featured": False,
        "store": "sports",
        "image_url": "https://images.unsplash.com/photo-1519861531473-9200262188bf?auto=format&fit=crop&w=900&q=80",
        "description": "Grip-friendly basketball for indoor and outdoor play.",
        "specifications": "Size: 7\nSurface: Outdoor rubber\nUse: Practice and casual matches",
    },
    {
        "name": "Dumbbell Set 20kg",
        "category": "Sports",
        "brand": "Dukan Basics",
        "price": 6999,
        "discount_price": 5999,
        "stock": 17,
        "rating": 4.2,
        "tag": "Workout",
        "is_featured": True,
        "store": "sports",
        "image_url": "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?auto=format&fit=crop&w=900&q=80",
        "description": "Same dumbbell set sold from another store for comparison shopping.",
        "specifications": "Total weight: 20kg\nMaterial: Cement plates\nGrip: Steel bar\nUse: Home gym",
    },
    {
        "name": "Raspberry Pi 5 Starter Kit",
        "category": "Accessories",
        "brand": "Raspberry Pi",
        "price": 12999,
        "discount_price": 11999,
        "stock": 16,
        "rating": 4.7,
        "tag": "Maker",
        "is_featured": True,
        "store": "console",
        "image_url": "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=900&q=80",
        "description": "Starter kit for coding, IoT projects, and learning electronics.",
        "specifications": "Board: Raspberry Pi 5\nUse: Maker and learning kit\nIncludes: Board, power, cables",
    },
    {
        "name": "Arduino Uno Learning Kit",
        "category": "Accessories",
        "brand": "Arduino",
        "price": 8999,
        "discount_price": 7999,
        "stock": 20,
        "rating": 4.6,
        "tag": "Maker",
        "is_featured": False,
        "store": "console",
        "image_url": "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=900&q=80",
        "description": "Hands-on kit for robotics, sensors, and beginner electronics.",
        "specifications": "Board: Arduino Uno\nUse: Robotics and learning\nIncludes: Starter components",
    },
    {
        "name": "PlayStation 5 Digital Edition",
        "category": "Gaming",
        "brand": "PlayStation",
        "price": 89999,
        "discount_price": 83999,
        "stock": 6,
        "rating": 4.9,
        "tag": "Console",
        "is_featured": True,
        "store": "console",
        "image_url": "https://images.unsplash.com/photo-1605901309584-818e25960a8f?auto=format&fit=crop&w=900&q=80",
        "description": "Next-gen console for local game buyers and gift shoppers.",
        "specifications": "Storage: 825GB\nType: Digital edition\nUse: Gaming",
    },
    {
        "name": "Xbox Series S",
        "category": "Gaming",
        "brand": "Xbox",
        "price": 74999,
        "discount_price": 69999,
        "stock": 8,
        "rating": 4.7,
        "tag": "Console",
        "is_featured": False,
        "store": "console",
        "image_url": "https://images.unsplash.com/photo-1605901309584-818e25960a8f?auto=format&fit=crop&w=900&q=80",
        "description": "Compact console for 1440p gaming and entertainment.",
        "specifications": "Storage: 512GB\nType: Digital console\nUse: Gaming and streaming",
    },
    {
        "name": "Ergonomic Gaming Chair",
        "category": "Gaming",
        "brand": "Razer",
        "price": 23999,
        "discount_price": 20999,
        "stock": 12,
        "rating": 4.5,
        "tag": "Setup",
        "is_featured": False,
        "store": "console",
        "image_url": "https://images.unsplash.com/photo-1541558869434-2840d308329a?auto=format&fit=crop&w=900&q=80",
        "description": "Supportive gaming chair for long desk sessions and streaming.",
        "specifications": "Material: PU leather\nBase: Heavy-duty\nUse: Gaming and desk work",
    },
    {
        "name": "Bike Helmet Pro",
        "category": "Automotive & Bikes",
        "brand": "Dukan Basics",
        "price": 3999,
        "discount_price": 3399,
        "stock": 22,
        "rating": 4.4,
        "tag": "Ride",
        "is_featured": True,
        "store": "auto",
        "image_url": "https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=900&q=80",
        "description": "Lightweight helmet for city riders and weekend trips.",
        "specifications": "Size: M-L\nUse: Bike riding\nSafety: Padded shell",
    },
    {
        "name": "Bike Phone Holder",
        "category": "Automotive & Bikes",
        "brand": "Dukan Basics",
        "price": 1299,
        "discount_price": 999,
        "stock": 30,
        "rating": 4.2,
        "tag": "Ride",
        "is_featured": False,
        "store": "auto",
        "image_url": "https://images.unsplash.com/photo-1518655048521-f130df041f66?auto=format&fit=crop&w=900&q=80",
        "description": "Handlebar phone mount for navigation and delivery riders.",
        "specifications": "Mount: Adjustable\nUse: Bike and scooter\nFit: Universal",
    },
    {
        "name": "LED Bike Light Set",
        "category": "Automotive & Bikes",
        "brand": "Anker",
        "price": 1599,
        "discount_price": 1299,
        "stock": 34,
        "rating": 4.3,
        "tag": "Safety",
        "is_featured": False,
        "store": "auto",
        "image_url": "https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=900&q=80",
        "description": "Front and rear LED set for safer night riding.",
        "specifications": "Mode: Flash and steady\nUse: Bicycle safety\nPower: USB rechargeable",
    },
    {
        "name": "Dog Food Premium",
        "category": "Pets",
        "brand": "PetSafe",
        "price": 1899,
        "discount_price": 1699,
        "stock": 26,
        "rating": 4.5,
        "tag": "Pets",
        "is_featured": True,
        "store": "eco",
        "image_url": "https://images.unsplash.com/photo-1543466835-00a7907e9de1?auto=format&fit=crop&w=900&q=80",
        "description": "Balanced dog food for daily feeding.",
        "specifications": "Weight: 3kg\nType: Dry food\nUse: Adult dogs",
    },
    {
        "name": "Cat Food Chicken",
        "category": "Pets",
        "brand": "PetSafe",
        "price": 1499,
        "discount_price": 1299,
        "stock": 30,
        "rating": 4.4,
        "tag": "Pets",
        "is_featured": False,
        "store": "eco",
        "image_url": "https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?auto=format&fit=crop&w=900&q=80",
        "description": "Chicken-flavor cat food for everyday meals.",
        "specifications": "Weight: 2kg\nType: Dry food\nUse: Adult cats",
    },
    {
        "name": "Reusable Water Bottle 1L",
        "category": "Eco & Sustainable",
        "brand": "Hydro Flask",
        "price": 1899,
        "discount_price": 1599,
        "stock": 40,
        "rating": 4.6,
        "tag": "Eco",
        "is_featured": True,
        "store": "eco",
        "image_url": "https://images.unsplash.com/photo-1526401485004-2aa7c5c3c1f0?auto=format&fit=crop&w=900&q=80",
        "description": "Reusable steel bottle for school, office, gym, and travel.",
        "specifications": "Capacity: 1L\nMaterial: Steel\nUse: Daily hydration",
    },
    {
        "name": "Bamboo Lunch Box",
        "category": "Eco & Sustainable",
        "brand": "Bamboo Earth",
        "price": 1599,
        "discount_price": 1399,
        "stock": 24,
        "rating": 4.3,
        "tag": "Eco",
        "is_featured": False,
        "store": "eco",
        "image_url": "https://images.unsplash.com/photo-1524182576068-d6c7f4b6f3f1?auto=format&fit=crop&w=900&q=80",
        "description": "Eco-friendly lunch box for office meals and school tiffins.",
        "specifications": "Material: Bamboo fiber\nUse: Food storage\nLid: Secure seal",
    },
    {
        "name": "Solar Power Bank",
        "category": "Eco & Sustainable",
        "brand": "EcoFlow",
        "price": 4999,
        "discount_price": 4399,
        "stock": 18,
        "rating": 4.2,
        "tag": "Solar",
        "is_featured": False,
        "store": "eco",
        "image_url": "https://images.unsplash.com/photo-1509395176047-4a66953fd231?auto=format&fit=crop&w=900&q=80",
        "description": "Portable power bank with solar charging for travel and outages.",
        "specifications": "Battery: 20000mAh\nCharge: USB-C and solar\nUse: Phones and accessories",
    },
    {
        "name": "Canon EOS R50 Camera",
        "category": "Cameras",
        "brand": "Canon",
        "price": 89999,
        "discount_price": 85999,
        "stock": 9,
        "rating": 4.8,
        "tag": "Camera",
        "is_featured": True,
        "store": "tech",
        "image_url": "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=900&q=80",
        "description": "Compact mirrorless camera for creators, students, and family use.",
        "specifications": "Sensor: APS-C\nVideo: 4K\nUse: Photo and video",
    },
    {
        "name": "CCTV Bullet Camera",
        "category": "Cameras",
        "brand": "Dukan Basics",
        "price": 6499,
        "discount_price": 5799,
        "stock": 14,
        "rating": 4.3,
        "tag": "Security",
        "is_featured": False,
        "store": "tech",
        "image_url": "https://images.unsplash.com/photo-1556656793-08538906a9f8?auto=format&fit=crop&w=900&q=80",
        "description": "Outdoor security camera for homes and shopfronts.",
        "specifications": "Use: Security\nMount: Wall\nVisibility: Night vision",
    },
    {
        "name": "Phone Case Pack",
        "category": "Accessories",
        "brand": "Dukan Basics",
        "price": 899,
        "discount_price": 699,
        "stock": 100,
        "rating": 4.1,
        "tag": "Phone",
        "is_featured": False,
        "store": "tech",
        "image_url": "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=900&q=80",
        "description": "Phone case pack for common flagship and midrange phones.",
        "specifications": "Pack: 3\nMaterial: Silicone and TPU\nUse: Phone protection",
    },
    {
        "name": "Study Lamp LED Desk Light",
        "category": "School",
        "brand": "Philips",
        "price": 1799,
        "discount_price": 1499,
        "stock": 36,
        "rating": 4.5,
        "tag": "Study",
        "is_featured": False,
        "store": "tech",
        "image_url": "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=900&q=80",
        "description": "Same study lamp listing from the tech store for comparison shopping.",
        "specifications": "Light: LED\nUse: Study desk\nPower: USB",
    },
    {
        "name": "Raspberry Pi 5 Starter Kit",
        "category": "Accessories",
        "brand": "Raspberry Pi",
        "price": 12999,
        "discount_price": 11999,
        "stock": 10,
        "rating": 4.7,
        "tag": "Maker",
        "is_featured": False,
        "store": "tech",
        "image_url": "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=900&q=80",
        "description": "Same maker kit from another store so buyers can compare sellers.",
        "specifications": "Board: Raspberry Pi 5\nUse: Maker and learning kit\nIncludes: Board, power, cables",
    },
]

products_data.extend(extra_products)

def build_diverse_products():
    templates = [
        {
            "category": "Books",
            "brand": "Penguin",
            "store": "books",
            "tag": "Book",
            "is_featured": True,
            "image_url": "https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&w=900&q=80",
            "specs": "Format: Paperback\nUse: Reading and study\nDelivery: Kathmandu valley",
        },
        {
            "category": "Stationery",
            "brand": "Classmate",
            "store": "books",
            "tag": "Stationery",
            "is_featured": False,
            "image_url": "https://images.unsplash.com/photo-1455390582262-044cdead277a?auto=format&fit=crop&w=900&q=80",
            "specs": "Use: School and office\nPack: Mixed set\nDelivery: Kathmandu valley",
        },
        {
            "category": "School",
            "brand": "Casio",
            "store": "books",
            "tag": "School",
            "is_featured": False,
            "image_url": "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=900&q=80",
            "specs": "Use: Study desk\nDelivery: Kathmandu valley\nWarranty: 1 year",
        },
        {
            "category": "Gaming",
            "brand": "PlayStation",
            "store": "console",
            "tag": "Gaming",
            "is_featured": True,
            "image_url": "https://images.unsplash.com/photo-1605901309584-818e25960a8f?auto=format&fit=crop&w=900&q=80",
            "specs": "Use: Home gaming\nDelivery: Kathmandu valley\nWarranty: 1 year",
        },
        {
            "category": "Accessories",
            "brand": "Raspberry Pi",
            "store": "tech",
            "tag": "Maker",
            "is_featured": False,
            "image_url": "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=900&q=80",
            "specs": "Use: Maker and learning\nDelivery: Kathmandu valley\nIncludes: Board and cables",
        },
        {
            "category": "Fashion",
            "brand": "Nike",
            "store": "fashion",
            "tag": "Clothes",
            "is_featured": True,
            "image_url": "https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=900&q=80",
            "specs": "Use: Daily wear\nDelivery: Kathmandu valley\nMaterial: Cotton blend",
        },
        {
            "category": "Home",
            "brand": "Philips",
            "store": "home",
            "tag": "Home",
            "is_featured": False,
            "image_url": "https://images.unsplash.com/photo-1556911220-bff31c812dba?auto=format&fit=crop&w=900&q=80",
            "specs": "Use: Home and kitchen\nDelivery: Kathmandu valley\nWarranty: 6 months",
        },
        {
            "category": "Sports",
            "brand": "Adidas",
            "store": "sports",
            "tag": "Sports",
            "is_featured": True,
            "image_url": "https://images.unsplash.com/photo-1517649763962-0c623066013b?auto=format&fit=crop&w=900&q=80",
            "specs": "Use: Training and outdoor\nDelivery: Kathmandu valley\nMaterial: Durable",
        },
        {
            "category": "Automotive & Bikes",
            "brand": "Dukan Basics",
            "store": "auto",
            "tag": "Ride",
            "is_featured": False,
            "image_url": "https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=900&q=80",
            "specs": "Use: Ride safety and accessories\nDelivery: Kathmandu valley\nFit: Universal",
        },
        {
            "category": "Eco & Sustainable",
            "brand": "Bamboo Earth",
            "store": "eco",
            "tag": "Eco",
            "is_featured": False,
            "image_url": "https://images.unsplash.com/photo-1472141521881-95d0f57e1f47?auto=format&fit=crop&w=900&q=80",
            "specs": "Use: Daily sustainable living\nDelivery: Kathmandu valley\nMaterial: Eco-friendly",
        },
        {
            "category": "Cameras",
            "brand": "Canon",
            "store": "tech",
            "tag": "Camera",
            "is_featured": True,
            "image_url": "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=900&q=80",
            "specs": "Use: Photo and video\nDelivery: Kathmandu valley\nWarranty: 1 year",
        },
        {
            "category": "Pets",
            "brand": "PetSafe",
            "store": "eco",
            "tag": "Pets",
            "is_featured": False,
            "image_url": "https://images.unsplash.com/photo-1543466835-00a7907e9de1?auto=format&fit=crop&w=900&q=80",
            "specs": "Use: Pet daily care\nDelivery: Kathmandu valley\nType: Household",
        },
        {
            "category": "Groceries",
            "brand": "Wai Wai",
            "store": "barat",
            "tag": "Grocery",
            "is_featured": False,
            "image_url": "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=900&q=80",
            "specs": "Use: Daily household needs\nDelivery: Kathmandu valley\nType: Grocery",
        },
        {
            "category": "Mobiles",
            "brand": "Samsung",
            "store": "tech",
            "tag": "Mobile",
            "is_featured": True,
            "image_url": "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=900&q=80",
            "specs": "Use: Mobile and accessories\nDelivery: Kathmandu valley\nWarranty: 1 year",
        },
        {
            "category": "Laptops",
            "brand": "Dell",
            "store": "tech",
            "tag": "Laptop",
            "is_featured": True,
            "image_url": "https://images.unsplash.com/photo-1496181133206-80ce9b88a853?auto=format&fit=crop&w=900&q=80",
            "specs": "Use: Work and study\nDelivery: Kathmandu valley\nWarranty: 1 year",
        },
        {
            "category": "Audio",
            "brand": "Sony",
            "store": "tech",
            "tag": "Audio",
            "is_featured": False,
            "image_url": "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=900&q=80",
            "specs": "Use: Audio and music\nDelivery: Kathmandu valley\nWarranty: 6 months",
        },
        {
            "category": "Appliances",
            "brand": "Philips",
            "store": "home",
            "tag": "Appliance",
            "is_featured": False,
            "image_url": "https://images.unsplash.com/photo-1556911220-bff31c812dba?auto=format&fit=crop&w=900&q=80",
            "specs": "Use: Home appliance\nDelivery: Kathmandu valley\nWarranty: 1 year",
        },
    ]

    name_templates = {
        "Books": ["SEE Prep Guide", "+2 Physics Book", "Entrance Exam Mastery", "Python Programming Book", "GK Nepal Book", "English Grammar Workbook", "Novel Collection", "Kids Story Book"],
        "Stationery": ["Gel Pen Pack", "A4 Notebook Bundle", "Highlighter Set", "Geometry Box", "Planner Notebook", "Sticky Notes Pack", "Marker Set", "Clip Board"],
        "School": ["School Backpack", "Lunch Box Set", "Study Lamp", "Scientific Calculator", "Exam Answer Sheet Pack", "Exam Clipboard", "Water Bottle Set", "Desk Organizer"],
        "Gaming": ["PSX Retro Console", "Xbox Series Controller", "Gaming Chair Pro", "RGB Mouse Pad", "Arcade Stick", "VR Headset", "Game Storage Rack", "Mechanical Keyboard"],
        "Accessories": ["Raspberry Pi 5 Kit", "Arduino Uno Kit", "Graphic Tablet", "USB-C Hub", "Portable SSD", "Phone Case Pack", "Laptop Stand", "Cable Organizer"],
        "Fashion": ["GitHub Fork T-Shirt", "Oversized Hoodie", "Denim Jacket", "Sneaker Pack", "Graphic Tee", "Cargo Pants", "Cap and Beanie Set", "Streetwear Shirt"],
        "Home": ["LED Desk Light", "Air Purifier Mini", "Smart Bulb Pack", "Kitchen Storage Rack", "Blender Pro", "Rice Cooker", "Curtain Set", "Bed Sheet Set"],
        "Sports": ["Football Training Ball", "Basketball Pro", "Dumbbell Set", "Resistance Bands", "Yoga Mat", "Gym Water Bottle", "Skate Helmet", "Jump Rope"],
        "Automotive & Bikes": ["Bike Helmet Pro", "Bike Phone Holder", "LED Bike Light Set", "Tyre Inflator", "Bike Lock", "Car Vacuum", "Dash Cam", "Riding Gloves"],
        "Eco & Sustainable": ["Reusable Water Bottle", "Bamboo Lunch Box", "Solar Power Bank", "Jute Tote Bag", "Bamboo Toothbrush", "Steel Straw Set", "Compost Bin", "Reusable Grocery Bag"],
        "Cameras": ["Canon EOS R50", "Nikon Z50", "Tripod Stand", "Action Camera", "CCTV Bullet Camera", "Camera Bag", "Lens Cleaning Kit", "Ring Light Camera Kit"],
        "Pets": ["Dog Food Premium", "Cat Food Chicken", "Pet Toy Pack", "Pet Grooming Brush", "Dog Collar", "Cat Litter", "Pet Water Bowl", "Leash Set"],
        "Groceries": ["Wai Wai Noodles", "Dettol Soap Pack", "Fortune Sunflower Oil", "Aashirvaad Atta", "Basmati Rice Bag", "Organic Eggs", "Fresh Apples", "Cold Coffee"],
        "Mobiles": ["iPhone 16 Cover", "Samsung Charger", "USB-C Fast Cable", "Power Bank 20000mAh", "Wireless Earbuds", "Screen Protector", "Foldable Phone Case", "Mobile Grip Stand"],
        "Laptops": ["Laptop Sleeve", "USB-C Dock", "Mechanical Keyboard", "Wireless Mouse", "Laptop Cooling Pad", "Webcam HD", "Portable Monitor", "Laptop Backpack"],
        "Audio": ["Bluetooth Speaker", "Wireless Headphones", "Earbuds Pro", "Soundbar Mini", "Podcast Mic", "Studio Headphones", "Portable Audio DAC", "Car Audio Adapter"],
        "Appliances": ["Mixer Grinder", "Electric Kettle", "Air Fryer", "Water Filter", "Toaster Oven", "Hand Blender", "Vacuum Cleaner", "Rice Cooker Mini"],
    }

    rows = []
    index = 0
    for template in templates:
        category = template["category"]
        brand = template["brand"]
        store = template["store"]
        for name_base in name_templates[category]:
            if len(rows) >= 202:
                return rows
            index += 1
            suffix = "" if index % 2 else f" {((index % 3) + 1)}"
            name = f"{name_base}{suffix}".strip()
            price = 500 + (index * 137) % 65000
            if category in {"Mobiles", "Laptops", "Cameras", "Gaming"}:
                price = 4999 + (index * 137) % 145000
            elif category in {"Books", "Stationery", "School"}:
                price = 120 + (index * 37) % 3500
            elif category in {"Groceries", "Pets"}:
                price = 90 + (index * 23) % 3200
            elif category in {"Fashion", "Accessories", "Sports", "Automotive & Bikes", "Eco & Sustainable", "Home", "Appliances", "Audio"}:
                price = 180 + (index * 83) % 18000
            discount_price = max(1, int(price * (0.88 if index % 4 == 0 else 0.93)))
            rating = round(4.1 + ((index % 9) * 0.1), 1)
            stock = 8 + (index * 5) % 70
            rows.append({
                "name": name,
                "category": category,
                "brand": brand,
                "price": price,
                "discount_price": discount_price,
                "stock": stock,
                "rating": rating,
                "tag": template["tag"],
                "is_featured": template["is_featured"] or index % 7 == 0,
                "store": store,
                "image_url": template["image_url"],
                "description": f"Diverse marketplace item for {category.lower()} shoppers, sourced as a demo listing for the store ecosystem.",
                "specifications": template["specs"],
            })
    bonus_subjects = {
        "Books": ["SEE Prep Guide", "+2 Physics Book", "Anime Art Book", "Python Programming Book"],
        "Stationery": ["Apsara Pencil Pack", "Nataraj Eraser Set", "Desk Tray Organizer", "Diary Planner"],
        "School": ["Science Project Kit", "Math Practice Set", "Roller Bag", "Class Bell Timer"],
        "Gaming": ["Arcade Fight Stick", "Retro Cartridge Pack", "Console Cooling Dock", "Trigger Grip Set"],
        "Accessories": ["GitHub Fork T-Shirt", "USB-C Cable Bundle", "Phone Ring Stand", "Laptop Sleeve Pro"],
        "Fashion": ["Denim Shirt", "Nepali Hoodie", "Summer Kurta", "Street Jacket"],
        "Home": ["Curtain Light Set", "Kitchen Knife Block", "Storage Basket Set", "Smart Plug Pack"],
        "Sports": ["Cricket Bat Grip", "Basketball Net", "Fitness Timer", "Training Cone Set"],
        "Automotive & Bikes": ["Car Tire Inflator", "Bike Mirror Set", "Reflective Vest", "Helmet Visor"],
        "Eco & Sustainable": ["Bamboo Cutlery", "Solar Lantern", "Reusable Straw Kit", "Compost Starter Kit"],
        "Cameras": ["Camera Tripod Pro", "Memory Card Pack", "Soft Camera Case", "Ring Light Kit"],
        "Pets": ["Pet Shampoo", "Dog Leash", "Cat Scratch Board", "Pet Snack Pack"],
        "Groceries": ["Cold Press Juice", "Fresh Orange Juice", "Organic Honey", "Tea Box"],
        "Mobiles": ["MagSafe Wallet", "Fast Charger 45W", "Tempered Glass Pack", "Camera Lens Cover"],
        "Laptops": ["USB-C Monitor Hub", "Laptop Cooling Pad Pro", "Ergonomic Mouse", "Keyboard Cover"],
        "Audio": ["Studio Mic Arm", "HiFi Earphones", "Bluetooth Transmitter", "Portable Speaker Pro"],
        "Appliances": ["Mini Blender", "Induction Cooktop", "Steam Iron", "Table Fan"],
    }
    bonus_modifiers = ["Pro", "Mini", "Max"]
    for template in templates:
        category = template["category"]
        brand = template["brand"]
        store = template["store"]
        for modifier in bonus_modifiers:
            for name_base in bonus_subjects.get(category, []):
                if len(rows) >= 202:
                    return rows
                index += 1
                name = f"Diversified {modifier} {category} {name_base} {index}"
                price = 500 + (index * 137) % 65000
                if category in {"Mobiles", "Laptops", "Cameras", "Gaming"}:
                    price = 4999 + (index * 137) % 145000
                elif category in {"Books", "Stationery", "School"}:
                    price = 120 + (index * 37) % 3500
                elif category in {"Groceries", "Pets"}:
                    price = 90 + (index * 23) % 3200
                elif category in {"Fashion", "Accessories", "Sports", "Automotive & Bikes", "Eco & Sustainable", "Home", "Appliances", "Audio"}:
                    price = 180 + (index * 83) % 18000
                discount_price = max(1, int(price * (0.88 if index % 4 == 0 else 0.93)))
                rating = round(4.1 + ((index % 9) * 0.1), 1)
                stock = 8 + (index * 5) % 70
                rows.append({
                    "name": name,
                    "category": category,
                    "brand": brand,
                    "price": price,
                    "discount_price": discount_price,
                    "stock": stock,
                    "rating": rating,
                    "tag": template["tag"],
                    "is_featured": template["is_featured"] or index % 7 == 0,
                    "store": store,
                    "image_url": template["image_url"],
                    "description": f"Diverse marketplace item for {category.lower()} shoppers, sourced as a demo listing for the store ecosystem.",
                    "specifications": template["specs"],
                })
    return rows

    for template in templates:
        category = template["category"]
        brand = template["brand"]
        store = template["store"]
        for name_base in bonus_names.get(category, []):
            if len(rows) >= 202:
                return rows
            index += 1
            name = f"{name_base} {((index % 4) + 1)}"
            price = 500 + (index * 137) % 65000
            if category in {"Mobiles", "Laptops", "Cameras", "Gaming"}:
                price = 4999 + (index * 137) % 145000
            elif category in {"Books", "Stationery", "School"}:
                price = 120 + (index * 37) % 3500
            elif category in {"Groceries", "Pets"}:
                price = 90 + (index * 23) % 3200
            elif category in {"Fashion", "Accessories", "Sports", "Automotive & Bikes", "Eco & Sustainable", "Home", "Appliances", "Audio"}:
                price = 180 + (index * 83) % 18000
            discount_price = max(1, int(price * (0.88 if index % 4 == 0 else 0.93)))
            rating = round(4.1 + ((index % 9) * 0.1), 1)
            stock = 8 + (index * 5) % 70
            rows.append({
                "name": name,
                "category": category,
                "brand": brand,
                "price": price,
                "discount_price": discount_price,
                "stock": stock,
                "rating": rating,
                "tag": template["tag"],
                "is_featured": template["is_featured"] or index % 7 == 0,
                "store": store,
                "image_url": template["image_url"],
                "description": f"Diverse marketplace item for {category.lower()} shoppers, sourced as a demo listing for the store ecosystem.",
                "specifications": template["specs"],
            })
    return rows

project_root = os.getcwd()
if not os.path.isdir(os.path.join(project_root, "frontend")):
    project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
product_media_dir = os.path.join(project_root, "frontend", "public", "product-media")

local_product_images = {
    "Arduino Uno Learning Kit": "/product-media/arduino-uno-learning-kit.jpg",
    "Bamboo Lunch Box": "/product-media/bamboo-lunch-box.jpg",
    "Bike Helmet Pro": "/product-media/bike-helmet-pro.jpg",
    "Bike Phone Holder": "/product-media/bike-phone-holder.png",
    "Cat Food Chicken": "/product-media/cat-food-chicken.jpg",
    "CCTV Bullet Camera": "/product-media/cctv-bullet-camera.jpg",
    "Dettol Original Soap 4 Pack": "/product-media/dettol-original-soap-4-pack.png",
    "Dog Food Premium": "/product-media/dog-food-premium.jpg",
    "Dukan Basics Dumbbell Set 20kg": "/product-media/dukan-basics-dumbbell-set-20kg.jpg",
    "Dumbbell Set 20kg": "/product-media/dukan-basics-dumbbell-set-20kg.jpg",
    "Ergonomic Gaming Chair": "/product-media/ergonomic-gaming-chair.jpg",
    "Football Training Ball": "/product-media/football-training-ball.jpg",
    "LED Bike Light Set": "/product-media/led-bike-light-set.jpg",
    "Phone Case Pack": "/product-media/phone-case-pack.jpg",
    "Pocket Notebook Set": "/product-media/pocket-notebook-set.jpg",
    "Programming Books Bundle": "/product-media/programming-books-bundle.jpg",
    "Raspberry Pi 5 Starter Kit": "/product-media/raspberry-pi-5-starter-kit.jpg",
    "Reusable Water Bottle 1L": "/product-media/reusable-water-bottle-1l.jpg",
    "Scientific Calculator Pro": "/product-media/scientific-calculator-pro.jpg",
    "SEE Entrance Prep Books Pack": "/product-media/see-entrance-prep-books-pack.jpg",
    "Solar Power Bank": "/product-media/solar-power-bank.jpg",
    "Study Lamp LED Desk Light": "/product-media/study-lamp-led-desk-light.jpg",
}

def external_category_name(source_key, item):
    title = str(item.get("title") or item.get("name") or "").lower()
    raw_category = item.get("category")
    if isinstance(raw_category, dict):
        source_category = str(raw_category.get("name") or raw_category.get("slug") or "").lower()
    else:
        source_category = str(raw_category or "").lower()

    if source_key == "fakestore":
        if "backpack" in title:
            return "School"
        if any(term in title for term in ["jacket", "shirt", "t-shirt", "tee", "hoodie", "sweatshirt", "jogger", "pants", "cap", "shorts"]):
            return "Fashion"
        if any(term in title for term in ["monitor", "gaming drive", "hard drive", "ssd"]):
            return "Gaming" if "gaming" in title or "monitor" in title else "Accessories"
        if any(term in title for term in ["bracelet", "necklace", "ring"]):
            return "Fashion"
        return "Accessories"

    if source_key == "dummyjson":
        if source_category in {"beauty", "fragrances"}:
            return "Beauty"
        if source_category == "furniture":
            return "Home"
        if source_category == "groceries":
            return "Groceries"
        return "Accessories"

    if source_key == "platzi":
        if source_category == "clothes":
            return "Fashion"
        if source_category == "electronics":
            if "laptop" in title:
                return "Laptops"
            if any(term in title for term in ["headphone", "earbud", "speaker", "audio"]):
                return "Audio"
            if "controller" in title or "gaming" in title:
                return "Gaming"
            if "mouse" in title or "watch" in title:
                return "Accessories"
            if "toaster" in title:
                return "Appliances"
            return "Accessories"
        if source_category == "furniture":
            return "Home"
        return "Accessories"

    return "Accessories"


def external_source_image(item, source_key):
    if source_key == "fakestore":
        return item.get("image") or ""
    if source_key == "dummyjson":
        return item.get("thumbnail") or (item.get("images") or [""])[0]
    if source_key == "platzi":
        images = item.get("images") or []
        return images[0] if images else ""
    return ""


def build_external_products():
    source_specs = [
        {
            "key": "fakestore",
            "url": "https://fakestoreapi.com/products",
            "limit": 20,
            "store": "fakestore",
            "brand": "Fake Store",
            "source_label": "Fake Store API",
            "delivery_time_estimate": "2-4 business days",
            "base_delivery_fee": Decimal("180.00"),
        },
        {
            "key": "dummyjson",
            "url": "https://dummyjson.com/products?limit=24&skip=0",
            "limit": 24,
            "store": "dummyjson",
            "brand": "DummyJSON",
            "source_label": "DummyJSON Products API",
            "delivery_time_estimate": "1-3 business days",
            "base_delivery_fee": Decimal("160.00"),
        },
        {
            "key": "platzi",
            "url": "https://api.escuelajs.co/api/v1/products?limit=24&offset=0",
            "limit": 24,
            "store": "platzi",
            "brand": "Platzi",
            "source_label": "Platzi Fake Store API",
            "delivery_time_estimate": "2-5 business days",
            "base_delivery_fee": Decimal("170.00"),
        },
    ]

    extra_rows = []
    for source in source_specs:
        payload = fetch_json(source["url"])
        items = payload.get("products", payload) if isinstance(payload, dict) else payload
        for index, item in enumerate(items[:source["limit"]]):
            title = str(item.get("title") or item.get("name") or "").strip()
            if not title:
                continue

            base_price = Decimal(str(item.get("price") or 0))
            price_npr = (base_price * Decimal("130")).quantize(Decimal("1"))
            discount_price = None
            discount_percentage = item.get("discountPercentage")
            if discount_percentage:
                discount_price = (
                    price_npr * (Decimal("1") - Decimal(str(discount_percentage)) / Decimal("100"))
                ).quantize(Decimal("1"))
            elif index % 4 == 0:
                discount_price = (price_npr * Decimal("0.9")).quantize(Decimal("1"))

            stock = int(item.get("stock") or (18 + index * 2))
            raw_rating = item.get("rating")
            if isinstance(raw_rating, dict):
                raw_rating = raw_rating.get("rate") or raw_rating.get("rating") or 4.3
            rating = float(raw_rating or 4.3)
            image_url = external_source_image(item, source["key"])
            category_name = external_category_name(source["key"], item)
            brand_name = str(item.get("brand") or source["brand"]).strip()
            brand, _ = Brand.objects.get_or_create(name=brand_name)
            brands[brand.name] = brand

            details = [
                f"Source: {source['source_label']}",
                f"Category: {item.get('category', {}).get('name') if isinstance(item.get('category'), dict) else item.get('category', '')}",
                f"Rating: {rating:.1f}",
                f"Stock: {stock}",
                f"Delivery: {source['delivery_time_estimate']}",
            ]
            if item.get("shippingInformation"):
                details.append(f"Shipping: {item['shippingInformation']}")
            if item.get("warrantyInformation"):
                details.append(f"Warranty: {item['warrantyInformation']}")
            if item.get("returnPolicy"):
                details.append(f"Return: {item['returnPolicy']}")

            extra_rows.append(
                {
                    "name": title,
                    "category": category_name,
                    "brand": brand.name,
                    "price": price_npr,
                    "discount_price": discount_price,
                    "stock": stock,
                    "rating": rating,
                    "tag": source["source_label"].replace(" Products", "").replace(" API", ""),
                    "is_featured": index < 2 or rating >= 4.6,
                    "store": source["store"],
                    "image_url": image_url,
                    "description": item.get("description") or f"Imported from {source['source_label']}.",
                    "specifications": "\n".join(details),
                }
            )

    return extra_rows

external_products = build_external_products()
products_data.extend(external_products)
print(f"Imported {len(external_products)} products from external APIs")

diverse_products = build_diverse_products()
products_data.extend(diverse_products)
print(f"Added {len(diverse_products)} diversified products")

reserve_products = []
reserve_specs = [
    ("Books", books_store, brands["Penguin"], "https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&w=900&q=80", ["Ultra Manga Frame", "Ultra Exam Atlas", "Ultra Reading Shelf"]),
    ("Stationery", books_store, brands["Classmate"], "https://images.unsplash.com/photo-1455390582262-044cdead277a?auto=format&fit=crop&w=900&q=80", ["Ultra Sketch Pad", "Ultra Desk Tray", "Ultra Marker Case"]),
    ("School", books_store, brands["Casio"], "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=900&q=80", ["Ultra School Roller Bag", "Ultra Bell Timer", "Ultra Project Kit"]),
    ("Gaming", console_store, brands["PlayStation"], "https://images.unsplash.com/photo-1605901309584-818e25960a8f?auto=format&fit=crop&w=900&q=80", ["Ultra Arcade Pad", "Ultra Retro Cart Pack", "Ultra Console Dock"]),
    ("Accessories", tech_store, brands["Raspberry Pi"], "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=900&q=80", ["Ultra Fork Tee", "Ultra USB Hub", "Ultra Laptop Sleeve"]),
    ("Fashion", fashion_store, brands["Nike"], "https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=900&q=80", ["Ultra Hoodie Drop", "Ultra Street Jacket", "Ultra Denim Shirt"]),
    ("Home", home_store, brands["Philips"], "https://images.unsplash.com/photo-1556911220-bff31c812dba?auto=format&fit=crop&w=900&q=80", ["Ultra Smart Plug", "Ultra Light Set", "Ultra Storage Basket"]),
    ("Sports", sports_store, brands["Adidas"], "https://images.unsplash.com/photo-1517649763962-0c623066013b?auto=format&fit=crop&w=900&q=80", ["Ultra Ball Pack", "Ultra Fitness Timer", "Ultra Cone Set"]),
    ("Automotive & Bikes", auto_store, brands["Dukan Basics"], "https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=900&q=80", ["Ultra Helmet Visor", "Ultra Bike Mirror", "Ultra Tire Inflator"]),
    ("Eco & Sustainable", eco_store, brands["Bamboo Earth"], "https://images.unsplash.com/photo-1472141521881-95d0f57e1f47?auto=format&fit=crop&w=900&q=80", ["Ultra Bamboo Cutlery", "Ultra Solar Lantern", "Ultra Reusable Straw Kit"]),
    ("Cameras", tech_store, brands["Canon"], "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=900&q=80", ["Ultra Tripod Pro", "Ultra Camera Case", "Ultra Ring Light Kit"]),
    ("Pets", eco_store, brands["PetSafe"], "https://images.unsplash.com/photo-1543466835-00a7907e9de1?auto=format&fit=crop&w=900&q=80", ["Ultra Dog Leash", "Ultra Cat Scratch Board", "Ultra Pet Snack Pack"]),
    ("Groceries", barat_store, brands["Wai Wai"], "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=900&q=80", ["Ultra Orange Juice", "Ultra Honey Jar", "Ultra Tea Box"]),
]
for index, (category_name, store_ref, brand_ref, image_ref, names) in enumerate(reserve_specs, start=1):
    for variant, name in enumerate(names, start=1):
        reserve_products.append({
            "name": f"{name} {index}-{variant}",
            "category": category_name,
            "brand": brand_ref.name,
            "price": 999 + (index * 73) + (variant * 41),
            "discount_price": 899 + (index * 61) + (variant * 29),
            "stock": 12 + index + variant,
            "rating": round(4.2 + ((index + variant) % 5) * 0.1, 1),
            "tag": "Rare",
            "is_featured": variant == 1,
            "store": {
                books_store: "books",
                console_store: "console",
                tech_store: "tech",
                fashion_store: "fashion",
                home_store: "home",
                sports_store: "sports",
                auto_store: "auto",
                eco_store: "eco",
                barat_store: "barat",
            }[store_ref],
            "image_url": image_ref,
            "description": f"Rare and interesting demo item for {category_name.lower()} shoppers.",
            "specifications": f"Category: {category_name}\\nDelivery: Kathmandu valley\\nStore: {store_ref.name}",
        })

products_data.extend(reserve_products)
print(f"Added {len(reserve_products)} reserve products")

for row in products_data:
    category = cats[row["category"]]
    brand = brands[row["brand"]]
    image_url = local_product_images.get(row["name"], row["image_url"])
    store_map = {
        "barat": barat_store,
        "tech": tech_store,
        "fashion": fashion_store,
        "home": home_store,
        "books": books_store,
        "sports": sports_store,
        "console": console_store,
        "auto": auto_store,
        "eco": eco_store,
        "fakestore": fake_store,
        "dummyjson": dummy_store,
        "platzi": platzi_store,
    }
    category_store_map = {
        "Mobiles": tech_store,
        "Laptops": tech_store,
        "Accessories": tech_store,
        "Audio": tech_store,
        "Gaming": console_store,
        "Networking": tech_store,
        "Fashion": fashion_store,
        "Sports": sports_store,
        "Books": books_store,
        "School": books_store,
        "Stationery": books_store,
        "Home": home_store,
        "Beauty": home_store,
        "Appliances": home_store,
        "Groceries": barat_store,
        "Cameras": tech_store,
        "Pets": eco_store,
        "Automotive & Bikes": auto_store,
        "Eco & Sustainable": eco_store,
    }
    store = store_map.get(row.get("store")) or category_store_map.get(row["category"], barat_store)
    product_defaults = {
        "category": category,
        "brand": brand,
        "store": store,
        "description": row["description"],
        "specifications": row["specifications"],
        "price": row["price"],
        "discount_price": row["discount_price"],
        "stock": row["stock"],
        "rating": row["rating"],
        "tag": row["tag"],
        "is_featured": row["is_featured"],
        "is_active": True,
    }
    product, created = Product.objects.update_or_create(
        name=row["name"],
        store=store,
        defaults=product_defaults,
    )
    for extension in ("jpg", "jpeg", "png", "webp"):
        slug_image_path = os.path.join(product_media_dir, f"{product.slug}.{extension}")
        if os.path.exists(slug_image_path):
            image_url = f"/product-media/{product.slug}.{extension}"
            break
    if image_url.startswith("http"):
        parsed = urlparse(image_url)
        extension = os.path.splitext(parsed.path)[1].lower() or ".jpg"
        if extension not in {".jpg", ".jpeg", ".png", ".webp", ".gif"}:
            extension = ".jpg"
        local_filename = f"{product.slug}{extension}"
        try:
            image_url = download_image(image_url, local_filename)
        except Exception as exc:
            print(f"Failed to download image for {product.name}: {exc}")
    ProductImage.objects.update_or_create(
        product=product,
        order=0,
        defaults={
            "image_url": image_url,
            "alt_text": product.name,
            "is_primary": True,
        },
    )
    Inventory.objects.update_or_create(product=product, defaults={"quantity": product.stock, "low_stock_threshold": 5})
    seed_fake_reviews(product)
    if created:
        print(f"Added {product.name}")

for product in Product.objects.all():
    seed_fake_reviews(product)

fallback_images = {
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

for product in Product.objects.filter(images__isnull=True).select_related("category"):
    image_url = fallback_images.get(
        product.category.slug,
        "https://images.unsplash.com/photo-1472851294608-062f824d29cc?auto=format&fit=crop&w=900&q=80",
    )
    ProductImage.objects.create(
        product=product,
        order=0,
        image_url=image_url,
        alt_text=product.name,
        is_primary=True,
    )

print(f"{Product.objects.count()} products total")
print("Seed complete")
