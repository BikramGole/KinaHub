import hashlib
import json
import os
import sys
import urllib.request
from collections import defaultdict
from decimal import Decimal
from pathlib import Path
from urllib.parse import urlparse

import django
from django.db.models import Count
from django.utils.text import slugify


BACKEND_DIR = Path(__file__).resolve().parents[1]
PROJECT_DIR = BACKEND_DIR.parent
PRODUCT_MEDIA_DIR = PROJECT_DIR / "frontend" / "public" / "product-media"
REPORT_PATH = BACKEND_DIR / "catalog_audit_report.md"

sys.path.insert(0, str(BACKEND_DIR))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "core.settings")
django.setup()

from products.models import Product, ProductImage  # noqa: E402


IMAGE_SOURCE_OVERRIDES = {
	"reusable-water-bottle": {
		"local": "reusable-water-bottle-1l.jpg",
		"confidence": 96,
		"reason": "Exact reusable bottle local asset already exists.",
	},
	"bamboo-lunch-box-3": {
		"local": "bamboo-lunch-box.jpg",
		"confidence": 95,
		"reason": "Exact bamboo lunch box local asset already exists.",
	},
	"jute-tote-bag-2": {
		"url": "https://upload.wikimedia.org/wikipedia/commons/8/80/Reusable_Bag_3.jpg",
		"filename": "jute-tote-bag-2.jpg",
		"confidence": 82,
		"reason": "Reusable fabric tote image; close match for a jute tote product.",
	},
	"bamboo-toothbrush": {
		"url": "https://upload.wikimedia.org/wikipedia/commons/e/e5/Humble_Brush.jpg",
		"filename": "bamboo-toothbrush.jpg",
		"confidence": 92,
		"reason": "Direct bamboo toothbrush image from Wikimedia Commons.",
	},
	"steel-straw-set-1": {
		"url": "https://upload.wikimedia.org/wikipedia/commons/5/59/Metal_straw.jpg",
		"filename": "steel-straw-set-1.jpg",
		"confidence": 84,
		"reason": "Metal straw image; acceptable for steel straw set, but not a full set packshot.",
	},
	"compost-bin": {
		"url": "https://upload.wikimedia.org/wikipedia/commons/6/66/Black_domestic_compost_bin.jpg",
		"filename": "compost-bin.jpg",
		"confidence": 94,
		"reason": "Direct domestic compost bin image from Wikimedia Commons.",
	},
	"reusable-grocery-bag-3": {
		"url": "https://upload.wikimedia.org/wikipedia/commons/thumb/2/21/Grocery_bag_of_healthy_foods.jpg/960px-Grocery_bag_of_healthy_foods.jpg",
		"filename": "reusable-grocery-bag-3.jpg",
		"confidence": 90,
		"reason": "Reusable grocery bag with grocery contents.",
	},
}

LOW_CONFIDENCE_THRESHOLD = 80


def primary_image(product):
	return product.images.order_by("-is_primary", "order", "id").first()


def media_url(filename):
	return f"/product-media/{filename}"


def media_path_from_url(image_url):
	if not image_url or not image_url.startswith("/product-media/"):
		return None
	return PRODUCT_MEDIA_DIR / image_url.removeprefix("/product-media/")


def file_sha256(path):
	hasher = hashlib.sha256()
	with open(path, "rb") as handle:
		for chunk in iter(lambda: handle.read(1024 * 1024), b""):
			hasher.update(chunk)
	return hasher.hexdigest()


def safe_extension(url, fallback=".jpg"):
	path = urlparse(url).path.lower()
	for ext in (".jpg", ".jpeg", ".png", ".webp"):
		if path.endswith(ext):
			return ext
	return fallback


def download_image(url, filename):
	PRODUCT_MEDIA_DIR.mkdir(parents=True, exist_ok=True)
	target = PRODUCT_MEDIA_DIR / filename
	if target.exists() and target.stat().st_size > 0:
		return media_url(filename), False
	request = urllib.request.Request(
		url,
		headers={
			"User-Agent": "KinaHubCatalogAudit/1.0 (local demo media repair)",
			"Accept": "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
		},
	)
	with urllib.request.urlopen(request, timeout=20) as response:
		content_type = response.headers.get("Content-Type", "")
		if not content_type.startswith("image/"):
			raise ValueError(f"Expected image response for {url}, got {content_type}")
		target.write_bytes(response.read())
	return media_url(filename), True


def find_exact_local_image(product):
	candidates = [
		product.slug,
		slugify(product.name),
		slugify(product.name.removesuffix(" 1").removesuffix(" 2").removesuffix(" 3")),
	]
	for base in candidates:
		for ext in (".jpg", ".jpeg", ".png", ".webp"):
			path = PRODUCT_MEDIA_DIR / f"{base}{ext}"
			if path.exists():
				return path.name
	return None


def decimal_to_str(value):
	if isinstance(value, Decimal):
		return str(value)
	return value


def snapshot_stats():
	duplicate_image_urls = (
		ProductImage.objects.values("image_url")
		.annotate(count=Count("id"))
		.filter(count__gt=1)
		.count()
	)
	duplicate_names = (
		Product.objects.values("name")
		.annotate(count=Count("id"))
		.filter(count__gt=1)
		.count()
	)
	non_local = ProductImage.objects.exclude(image_url__startswith="/product-media/").count()
	no_images = Product.objects.filter(images__isnull=True).count()
	return {
		"products": Product.objects.count(),
		"product_images": ProductImage.objects.count(),
		"products_without_images": no_images,
		"non_product_media_images": non_local,
		"duplicate_name_groups": duplicate_names,
		"duplicate_image_url_groups": duplicate_image_urls,
	}


def rename_duplicate_products():
	renamed = []
	duplicate_names = (
		Product.objects.values("name")
		.annotate(count=Count("id"))
		.filter(count__gt=1)
		.order_by("name")
	)
	for group in duplicate_names:
		products = list(
			Product.objects.filter(name=group["name"])
			.select_related("store", "category", "brand")
			.order_by("id")
		)
		for index, product in enumerate(products[1:], start=2):
			old_name = product.name
			store_name = product.store.name if product.store else product.category.name
			base_name = f"{old_name} - {store_name}"
			new_name = base_name
			if Product.objects.filter(name=new_name).exclude(pk=product.pk).exists():
				new_name = f"{base_name} Variant {index}"
			while Product.objects.filter(name=new_name).exclude(pk=product.pk).exists():
				index += 1
				new_name = f"{base_name} Variant {index}"
			product.name = new_name
			product.save(update_fields=["name", "updated_at"])
			product.images.update(alt_text=new_name)
			renamed.append(
				{
					"id": product.id,
					"slug": product.slug,
					"old_name": old_name,
					"new_name": new_name,
				}
			)
	return renamed


def repair_images():
	corrected = []
	manual_review = []
	missing = []

	for product in Product.objects.select_related("category", "brand", "store").prefetch_related("images").order_by("id"):
		image = primary_image(product)
		if not image:
			missing.append({"id": product.id, "slug": product.slug, "name": product.name})
			continue

		current_url = image.image_url
		override = IMAGE_SOURCE_OVERRIDES.get(product.slug)
		new_url = None
		confidence = 0
		reason = ""
		downloaded = False

		if override:
			if "local" in override:
				path = PRODUCT_MEDIA_DIR / override["local"]
				if path.exists():
					new_url = media_url(override["local"])
				else:
					manual_review.append(
						{
							"id": product.id,
							"slug": product.slug,
							"name": product.name,
							"reason": f"Expected local override missing: {override['local']}",
							"confidence": 0,
						}
					)
					continue
			else:
				try:
					filename = override.get("filename") or f"{product.slug}{safe_extension(override['url'])}"
					new_url, downloaded = download_image(override["url"], filename)
				except Exception as exc:
					manual_review.append(
						{
							"id": product.id,
							"slug": product.slug,
							"name": product.name,
							"reason": f"Download failed: {exc}",
							"confidence": 0,
						}
					)
					continue
			confidence = override["confidence"]
			reason = override["reason"]
		elif not current_url.startswith("/product-media/"):
			local_filename = find_exact_local_image(product)
			if local_filename:
				new_url = media_url(local_filename)
				confidence = 88
				reason = "External image replaced with exact slug/name local media match."
			else:
				manual_review.append(
					{
						"id": product.id,
						"slug": product.slug,
						"name": product.name,
						"reason": "External image has no exact local media match.",
						"confidence": 0,
					}
				)
				continue
		else:
			path = media_path_from_url(current_url)
			if not path or not path.exists():
				local_filename = find_exact_local_image(product)
				if local_filename:
					new_url = media_url(local_filename)
					confidence = 88
					reason = "Broken local image path replaced with exact slug/name match."
				else:
					missing.append(
						{
							"id": product.id,
							"slug": product.slug,
							"name": product.name,
							"missing_url": current_url,
						}
					)
					continue

		if not new_url or new_url == current_url:
			continue

		image.image_url = new_url
		image.alt_text = product.name
		image.is_primary = True
		image.order = 0
		image.save(update_fields=["image_url", "alt_text", "is_primary", "order"])
		record = {
			"id": product.id,
			"slug": product.slug,
			"name": product.name,
			"old_image": current_url,
			"new_image": new_url,
			"confidence": confidence,
			"reason": reason,
			"downloaded": downloaded,
		}
		corrected.append(record)
		if confidence < LOW_CONFIDENCE_THRESHOLD:
			manual_review.append(record | {"reason": f"Low confidence: {reason}"})

	return corrected, manual_review, missing


def duplicate_image_hashes():
	buckets = defaultdict(list)
	for image in ProductImage.objects.select_related("product").order_by("product_id"):
		path = media_path_from_url(image.image_url)
		if not path or not path.exists() or not path.is_file():
			continue
		buckets[file_sha256(path)].append(
			{
				"product_id": image.product_id,
				"product": image.product.name,
				"slug": image.product.slug,
				"image": image.image_url,
			}
		)
	return [items for items in buckets.values() if len(items) > 1]


def duplicate_image_urls():
	rows = []
	for group in (
		ProductImage.objects.values("image_url")
		.annotate(count=Count("id"))
		.filter(count__gt=1)
		.order_by("-count")
	):
		rows.append(
			{
				"image_url": group["image_url"],
				"count": group["count"],
				"products": [
					{"id": img.product_id, "name": img.product.name, "slug": img.product.slug}
					for img in ProductImage.objects.filter(image_url=group["image_url"]).select_related("product")
				],
			}
		)
	return rows


def write_report(before, after, corrected_images, renamed_products, manual_review, missing_images, duplicate_urls, duplicate_hash_groups):
	def table(headers, rows):
		if not rows:
			return "_None._\n"
		output = ["| " + " | ".join(headers) + " |", "| " + " | ".join(["---"] * len(headers)) + " |"]
		output.extend("| " + " | ".join(str(row.get(header, "")).replace("\n", " ") for header in headers) + " |" for row in rows)
		return "\n".join(output) + "\n"

	manual_rows = [
		{
			"id": item.get("id"),
			"slug": item.get("slug"),
			"name": item.get("name"),
			"confidence": item.get("confidence", ""),
			"reason": item.get("reason", ""),
		}
		for item in manual_review
	]
	duplicate_url_rows = [
		{
			"image_url": item["image_url"],
			"count": item["count"],
			"products": ", ".join(f"{p['id']}:{p['slug']}" for p in item["products"]),
		}
		for item in duplicate_urls
	]
	duplicate_hash_rows = [
		{
			"hash_group": index,
			"count": len(items),
			"products": ", ".join(f"{p['product_id']}:{p['slug']}" for p in items),
		}
		for index, items in enumerate(duplicate_hash_groups, start=1)
	]

	content = [
		"# Product Catalog Audit Report",
		"",
		"Generated by `backend/scripts/audit_repair_catalog.py`.",
		"",
		"## Before / After Statistics",
		"",
		"```json",
		json.dumps({"before": before, "after": after}, indent=2, default=decimal_to_str),
		"```",
		"",
		"## Corrected Images",
		"",
		table(["id", "slug", "name", "old_image", "new_image", "confidence", "reason"], corrected_images),
		"",
		"## Renamed Product Titles",
		"",
		table(["id", "slug", "old_name", "new_name"], renamed_products),
		"",
		"## Manual Review",
		"",
		table(["id", "slug", "name", "confidence", "reason"], manual_rows),
		"",
		"## Missing Images",
		"",
		table(["id", "slug", "name", "missing_url"], missing_images),
		"",
		"## Duplicate Image URLs After Repair",
		"",
		table(["image_url", "count", "products"], duplicate_url_rows),
		"",
		"## Duplicate File Hashes After Repair",
		"",
		table(["hash_group", "count", "products"], duplicate_hash_rows),
		"",
	]
	REPORT_PATH.write_text("\n".join(content), encoding="utf-8")


def main():
	PRODUCT_MEDIA_DIR.mkdir(parents=True, exist_ok=True)
	before = snapshot_stats()
	renamed_products = rename_duplicate_products()
	corrected_images, manual_review, missing_images = repair_images()
	duplicate_urls = duplicate_image_urls()
	duplicate_hash_groups = duplicate_image_hashes()
	after = snapshot_stats()
	write_report(
		before,
		after,
		corrected_images,
		renamed_products,
		manual_review,
		missing_images,
		duplicate_urls,
		duplicate_hash_groups,
	)
	print(json.dumps({
		"before": before,
		"after": after,
		"corrected_images": len(corrected_images),
		"renamed_products": len(renamed_products),
		"manual_review": len(manual_review),
		"missing_images": len(missing_images),
		"duplicate_image_hash_groups": len(duplicate_hash_groups),
		"report": str(REPORT_PATH),
	}, indent=2))


if __name__ == "__main__":
	main()
