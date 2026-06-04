import os
import re
import sys
from pathlib import Path

import django


BACKEND_DIR = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND_DIR))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "core.settings")
django.setup()

from products.models import Product  # noqa: E402


SOURCE_TAGS = {"Fake Store", "DummyJSON", "Platzi Fake Store", "Fake Store API", "DummyJSON Products API", "Platzi Fake Store API"}


def has_discount(product):
	return bool(product.discount_price and product.discount_price < product.price)


def title_has(product, *words):
	title = product.name.lower()
	return any(word in title for word in words)


def deal_tag(product):
	category = product.category.name.lower()
	rating = float(product.rating or 0)

	if has_discount(product):
		if title_has(product, "ssd", "monitor", "laptop", "headset", "camera", "mouse", "keyboard"):
			return "TECH DEAL"
		if title_has(product, "hoodie", "jacket", "t-shirt", "shirt", "tee", "jogger", "sneaker", "cap"):
			return "STYLE DEAL"
		if category in {"beauty"}:
			return "BEAUTY DEAL"
		if category in {"home", "appliances"}:
			return "HOME DEAL"
		if category in {"groceries"}:
			return "DAILY DEAL"
		return "BEST DEAL"

	if rating >= 4.7:
		return "TOP RATED"
	if product.stock <= 12:
		return "LIMITED STOCK"
	if title_has(product, "ssd", "drive", "monitor", "mouse", "keyboard", "laptop", "headset", "charger"):
		return "TECH PICK"
	if title_has(product, "hoodie", "jacket", "shirt", "tee", "jogger", "sneaker", "cap", "shoes"):
		return "STYLE PICK"
	if title_has(product, "perfume", "mascara", "lipstick", "nail", "palette", "powder"):
		return "BEAUTY PICK"
	if category in {"groceries"}:
		return "DAILY NEED"
	if category in {"home", "appliances"}:
		return "HOME PICK"
	if category in {"gaming"}:
		return "GAMING PICK"
	if category in {"audio"}:
		return "AUDIO PICK"
	if category in {"school", "books", "stationery"}:
		return "STUDY PICK"
	return "SHOP PICK"


def clean_specs(product):
	lines = []
	changed = False
	for line in (product.specifications or "").splitlines():
		if re.match(r"^\s*Source:\s*(Fake Store API|DummyJSON Products API|Platzi Fake Store API)\s*$", line):
			changed = True
			continue
		lines.append(line)
	specs = "\n".join(lines).strip()
	return specs, changed


def main():
	changed = []
	for product in Product.objects.select_related("category").order_by("id"):
		updates = {}
		if product.tag in SOURCE_TAGS:
			updates["tag"] = deal_tag(product)
		specs, specs_changed = clean_specs(product)
		if specs_changed:
			updates["specifications"] = specs
		if not updates:
			continue
		for field, value in updates.items():
			setattr(product, field, value)
		product.save(update_fields=[*updates.keys(), "updated_at"])
		changed.append({
			"id": product.id,
			"slug": product.slug,
			"name": product.name,
			"tag": product.tag,
			"fields": sorted(updates),
		})

	print(f"Retagged/cleaned {len(changed)} products")
	for item in changed[:120]:
		print(f"{item['id']}: {item['slug']} -> {item['tag']} ({', '.join(item['fields'])})")


if __name__ == "__main__":
	main()
