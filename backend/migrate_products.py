import os
import django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "core.settings")
django.setup()

from sellers.models import Store
from products.models import Product

CATEGORY_TO_STORE_NAME = {
    "Appliances": "Baneshwor Home Mart",
    "Home": "Baneshwor Home Mart",
    "Beauty": "Everest Lifestyle Mart",
    "Groceries": "Barat Kirana Pasal",
    "Books": "Boudha Books & Stationery",
    "School": "Boudha Books & Stationery",
    "Stationery": "Boudha Books & Stationery",
    "Clothing & Apparel": "Fashion Hub",
    "Fashion": "Thamel Style House",
    "Sports": "Kalanki Sports Hub",
    "Gaming": "New Road Console Garage",
    "Audio": "New Road Tech Suppliers",
    "Laptops": "New Road Tech Suppliers",
    "Mobiles": "New Road Tech Suppliers",
    "Cameras": "New Road Tech Suppliers",
    "Networking": "New Road Tech Suppliers",
    "Accessories": "New Road Tech Suppliers",
    "Pets": "Patan Eco & Pet Mart",
    "Eco & Sustainable": "Patan Eco & Pet Mart",
    "Automotive & Bikes": "Teku Auto & Bike Store",
    "Food & Beverages": "Zomato Bites"
}

# Fetch the best target store object for each category
store_map = {}
for name in CATEGORY_TO_STORE_NAME.values():
    if name not in store_map:
        store_map[name] = Store.objects.filter(name=name).first()

products = Product.objects.all()
migrated = 0

for p in products:
    if not p.category: continue
    
    target_store_name = CATEGORY_TO_STORE_NAME.get(p.category.name)
    if not target_store_name: continue
    
    target_store = store_map.get(target_store_name)
    if not target_store: continue
    
    old_store_name = p.store.name if p.store else "None"
    
    current_store_valid = False
    
    if p.store:
        cat = p.category.name
        store = p.store.name
        
        # Valid categories for specific stores (or types of stores)
        if cat in ["Fashion", "Clothing & Apparel"]:
            if "Fashion" in store or "Apparel" in store or store in ["Thamel Style House", "Pokhara Modern Mall", "Fashion Hub", "Bharatpur General Store"]:
                current_store_valid = True
        elif cat in ["Accessories"]:
            if store in ["Pokhara Modern Mall", "Bharatpur General Store", "New Road Tech Suppliers"]:
                current_store_valid = True
        elif cat in ["Home", "Appliances"]:
            if store in ["Baneshwor Home Mart", "Pokhara Modern Mall"]:
                current_store_valid = True
        elif cat in ["Beauty"]:
            if store in ["Everest Lifestyle Mart", "Baneshwor Home Mart"]:
                current_store_valid = True
        elif cat in ["Gaming"]:
            if store in ["New Road Console Garage", "Bharatpur General Store"]:
                current_store_valid = True
        elif cat in ["Books", "School", "Stationery"]:
            if store in ["Boudha Books & Stationery"]:
                current_store_valid = True
        elif cat in ["Sports"]:
            if store in ["Kalanki Sports Hub"]:
                current_store_valid = True
        elif cat in ["Audio", "Laptops", "Mobiles", "Cameras", "Networking"]:
            if store in ["New Road Tech Suppliers"]:
                current_store_valid = True
        elif cat in ["Groceries", "Food & Beverages"]:
            if store in ["Barat Kirana Pasal", "FreshMart", "Zomato Bites"]:
                current_store_valid = True
        elif cat in ["Pets", "Eco & Sustainable"]:
            if store in ["Patan Eco & Pet Mart"]:
                current_store_valid = True
        elif cat in ["Automotive & Bikes"]:
            if store in ["Teku Auto & Bike Store"]:
                current_store_valid = True

    if not current_store_valid:
        if p.store != target_store:
            p.store = target_store
            p.save()
            migrated += 1
            print(f"Moved [{p.category.name}] {p.name} from {old_store_name} to {target_store.name}")

print(f"Successfully migrated {migrated} products.")
