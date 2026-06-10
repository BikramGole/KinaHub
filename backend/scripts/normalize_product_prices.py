import csv
import json
import os
import sys
from decimal import Decimal, ROUND_HALF_UP
from pathlib import Path

import django


BACKEND_DIR = Path(__file__).resolve().parents[1]
PROJECT_DIR = BACKEND_DIR.parent
CSV_PATH = PROJECT_DIR / "product_pricing_audit_fixed(1).csv"
REPORT_PATH = BACKEND_DIR / "pricing_normalization_report.json"

sys.path.insert(0, str(BACKEND_DIR))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "core.settings")
django.setup()

from products.models import Product  # noqa: E402


TECH_KEYWORDS = {
	"laptop", "macbook", "phone", "iphone", "galaxy", "samsung", "pixel",
	"tablet", "monitor", "desktop", "gaming", "playstation", "xbox",
	"ssd", "dock", "keyboard", "mouse", "headphones", "earbuds", "speaker",
	"camera", "webcam", "router", "network", "charger", "power bank", "watch",
	"smart band", "smartwatch", "drone", "console", "graphics tablet", "usb-c hub",
}

JEWELRY_KEYWORDS = {
	"ring", "bracelet", "necklace", "earring", "jewelry", "jewellery", "gold", "silver",
	"micropave", "plated", "pendant", "chain", "bangle",
}

FURNITURE_KEYWORDS = {
	"sofa", "bed", "chair", "table", "sink", "armchair", "wardrobe", "cabinet",
	"shelf", "dresser", "stool", "desk", "bookcase",
}

HOME_APPLIANCE_KEYWORDS = {
	"refrigerator", "fridge", "air fryer", "toaster", "kettle", "rice cooker",
	"blender", "mixer", "vacuum", "water filter", "purifier", "oven", "fan",
}

BOOK_KEYWORDS = {
	"book", "guide", "grammar", "atlas", "novel", "workbook", "prep", "reference",
}

SCHOOL_KEYWORDS = {
	"notebook", "calculator", "backpack", "answer sheet", "clipboard", "planner",
	"highlighter", "marker", "geometry box", "sticky notes", "stationery", "school",
}

GROCERY_KEYWORDS = {
	"rice", "atta", "flour", "oil", "egg", "eggs", "apple", "apples", "coffee",
	"tea", "noodles", "soap", "bread", "milk", "beef", "chicken", "fish", "cucumber",
	"banana", "onion", "fruit", "vegetable",
}

SPORTS_KEYWORDS = {
	"dumbbell", "basketball", "football", "ball", "yoga", "mat", "helmet", "rope",
	"resistance", "gym", "fit", "fitness", "skate", "bike",
}

PET_KEYWORDS = {
	"pet", "dog", "cat", "litter", "collar", "leash", "toy", "water bowl", "food",
	"grooming", "brush",
}

ECO_KEYWORDS = {
	"bamboo", "reusable", "jute", "straw", "compost", "sustainable", "eco",
}

FASHION_KEYWORDS = {
	"shirt", "t-shirt", "tee", "hoodie", "jacket", "jogger", "pants", "sweatshirt",
	"cap", "beanie", "sneaker", "shoe", "dress", "skirt", "kurta", "jeans",
}


def qmoney(value):
	return Decimal(value).quantize(Decimal("1"), rounding=ROUND_HALF_UP)


def lower_text(product):
	parts = [product.name, product.category.name]
	if product.brand:
		parts.append(product.brand.name)
	if product.tag:
		parts.append(product.tag)
	return " ".join(parts).lower()


def contains_any(text, keywords):
	return any(keyword in text for keyword in keywords)


def category_cap(product):
	text = lower_text(product)
	category = product.category.name

	if contains_any(text, JEWELRY_KEYWORDS):
		return Decimal("100000")
	if contains_any(text, FURNITURE_KEYWORDS):
		return Decimal("150000")
	if category == "Mobiles" or "iphone" in text or "galaxy" in text or "pixel" in text:
		return Decimal("250000")
	if category == "Laptops" or "macbook" in text or "xps" in text or "ideapad" in text:
		return Decimal("250000")
	if category == "Gaming" or contains_any(text, {"playstation", "xbox", "nintendo", "console", "gaming desktop"}):
		return Decimal("150000")
	if category == "Cameras" or "camera" in text or "lens" in text or "tripod" in text:
		return Decimal("120000")
	if category == "Audio":
		return Decimal("50000")
	if category == "Networking" or "router" in text or "mesh" in text or "wifi" in text:
		return Decimal("50000")
	if category == "Appliances" or contains_any(text, HOME_APPLIANCE_KEYWORDS):
		if "refrigerator" in text or "fridge" in text:
			return Decimal("50000")
		return Decimal("15000")
	if category == "Home":
		return Decimal("15000")
	if category == "Fashion":
		if contains_any(text, FASHION_KEYWORDS):
			return Decimal("8000")
		return Decimal("8000")
	if category == "Books":
		return Decimal("2500")
	if category == "Stationery" or category == "School":
		return Decimal("3000")
	if category == "Groceries":
		return Decimal("2500")
	if category == "Pets":
		return Decimal("3000")
	if category == "Eco & Sustainable":
		return Decimal("3000")
	if category == "Sports":
		return Decimal("8000")
	if category == "Automotive & Bikes":
		return Decimal("12000")
	if category == "Accessories":
		if contains_any(text, TECH_KEYWORDS):
			return Decimal("35000")
		if contains_any(text, JEWELRY_KEYWORDS):
			return Decimal("100000")
		if contains_any(text, SCHOOL_KEYWORDS):
			return Decimal("6000")
		if contains_any(text, FURNITURE_KEYWORDS):
			return Decimal("150000")
		return Decimal("6000")
	return Decimal("10000")


def discount_from_price(price, original_discount):
	if original_discount is None:
		return None
	if original_discount >= price:
		return None
	ratio = (original_discount / price) if price else Decimal("0")
	if ratio <= 0 or ratio >= 1:
		return None
	new_discount = qmoney(price * ratio)
	if new_discount >= price:
		new_discount = qmoney(price * Decimal("0.9"))
	if new_discount >= price:
		new_discount = price - Decimal("1")
	return new_discount


def main():
	rows = list(csv.DictReader(CSV_PATH.open(encoding="utf-8")))
	csv_by_slug = {row["slug"]: row for row in rows}
	updated = []
	manual = []

	for product in Product.objects.select_related("category", "brand").all().order_by("id"):
		csv_row = csv_by_slug.get(product.slug)
		if not csv_row:
			manual.append({"slug": product.slug, "reason": "Missing in CSV"})
			continue

		cap = category_cap(product)
		current_price = product.price
		current_discount = product.discount_price
		target_price = current_price if current_price <= cap else cap
		target_discount = discount_from_price(target_price, current_discount)

		if target_price == current_price and target_discount == current_discount:
			continue

		product.price = target_price
		product.discount_price = target_discount
		product.save(update_fields=["price", "discount_price", "updated_at"])
		updated.append(
			{
				"id": product.id,
				"slug": product.slug,
				"name": product.name,
				"category": product.category.name,
				"old_price": str(current_price),
				"new_price": str(target_price),
				"old_discount": str(current_discount) if current_discount is not None else "",
				"new_discount": str(target_discount) if target_discount is not None else "",
				"cap": str(cap),
			}
		)

	summary = {
		"updated": len(updated),
		"manual": len(manual),
		"updated_items": updated,
		"manual_items": manual,
	}
	REPORT_PATH.write_text(json.dumps(summary, indent=2), encoding="utf-8")
	print(json.dumps({"updated": len(updated), "manual": len(manual), "report": str(REPORT_PATH)}, indent=2))


if __name__ == "__main__":
	main()
