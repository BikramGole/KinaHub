import csv
import os
import sys
from decimal import Decimal
from pathlib import Path

import django


BACKEND_DIR = Path(__file__).resolve().parents[1]
PROJECT_DIR = BACKEND_DIR.parent
CSV_PATH = PROJECT_DIR / "product_pricing_audit_fixed(1).csv"

sys.path.insert(0, str(BACKEND_DIR))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "core.settings")
django.setup()

from products.models import Product  # noqa: E402


def parse_money(value):
	value = (value or "").strip()
	if not value:
		return None
	return Decimal(value)


def main():
	rows = list(csv.DictReader(CSV_PATH.open(encoding="utf-8")))
	by_slug = {product.slug: product for product in Product.objects.all()}
	updated = []
	missing = []

	for row in rows:
		product = by_slug.get(row["slug"])
		if not product:
			missing.append(row["slug"])
			continue

		new_price = Decimal(row["price"])
		new_discount = parse_money(row["discount_price"])

		updates = []
		if product.price != new_price:
			product.price = new_price
			updates.append("price")
		current_discount = product.discount_price if product.discount_price is not None else None
		if current_discount != new_discount:
			product.discount_price = new_discount
			updates.append("discount_price")

		if updates:
			product.save(update_fields=updates + ["updated_at"])
			updated.append(
				{
					"id": product.id,
					"slug": product.slug,
					"name": product.name,
					"price": str(product.price),
					"discount_price": str(product.discount_price) if product.discount_price is not None else "",
					"updated_fields": updates,
				}
			)

	print(f"updated {len(updated)} products")
	print(f"missing {len(missing)} products")
	if missing:
		print("missing slugs:")
		for slug in missing[:50]:
			print(slug)


if __name__ == "__main__":
	main()
