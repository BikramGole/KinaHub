import os
import django
from collections import Counter

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "core.settings")
django.setup()

from sellers.models import Store
from products.models import Product, Category

stores = Store.objects.all()

print("STORES AND THEIR PRODUCTS:")
for store in stores:
    products = Product.objects.filter(store=store)
    product_cats = [p.category.name for p in products if p.category]
    if not product_cats:
        continue
    counter = Counter(product_cats)
    primary_cat = counter.most_common(1)[0][0]
    print(f"\nStore: {store.name} (Primary Category: {primary_cat})")
    
    # Print what categories are sold here
    for cat, count in counter.items():
        print(f"  - {cat}: {count} products")
