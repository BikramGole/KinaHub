import hashlib
import json
import os
import sys
import time
from pathlib import Path

import django


BACKEND_DIR = Path(__file__).resolve().parents[1]
PROJECT_DIR = BACKEND_DIR.parent
PRODUCT_MEDIA_DIR = PROJECT_DIR / "frontend" / "public" / "product-media"

sys.path.insert(0, str(BACKEND_DIR))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "core.settings")
django.setup()

from products.models import Product  # noqa: E402
from scripts.replace_generated_images_with_real import (  # noqa: E402
	commons_candidates,
	download_candidate,
	openverse_candidates,
	query_for,
	score,
)


TARGET_SLUGS = [
	"exam-clipboard-2",
	"diversified-pro-books-see-prep-guide-137",
	"entrance-exam-mastery",
	"english-grammar-workbook-1",
	"nepali-grammar-guide-3",
	"marker-set",
	"rgb-mouse-pad-2",
	"mechanical-keyboard",
	"curtain-set",
	"electric-kettle-2",
	"air-fryer",
	"water-filter-1",
	"rice-cooker-mini-2",
	"yoga-mat",
	"fresh-apples",
	"foldable-phone-case",
	"mobile-grip-stand-2",
	"earbuds-pro",
]

QUERY_OVERRIDES = {
	"exam-clipboard-2": "clipboard stationery product",
	"diversified-pro-books-see-prep-guide-137": "SEE exam preparation book",
	"entrance-exam-mastery": "entrance exam preparation book",
	"english-grammar-workbook-1": "english grammar workbook cover",
	"nepali-grammar-guide-3": "nepali grammar book cover",
	"marker-set": "marker pen set product",
	"rgb-mouse-pad-2": "RGB gaming mouse pad product",
	"mechanical-keyboard": "mechanical keyboard product",
	"curtain-set": "curtain set product",
	"electric-kettle-2": "electric kettle appliance",
	"air-fryer": "air fryer appliance",
	"water-filter-1": "water filter product",
	"rice-cooker-mini-2": "electric rice cooker appliance",
	"yoga-mat": "yoga mat product",
	"fresh-apples": "fresh apples fruit",
	"foldable-phone-case": "foldable phone case product",
	"mobile-grip-stand-2": "phone ring stand product",
	"earbuds-pro": "wireless earbuds product",
}


def media_path(image_url):
	if not image_url.startswith("/product-media/"):
		return None
	return PRODUCT_MEDIA_DIR / image_url.removeprefix("/product-media/")


def sha256(path):
	hasher = hashlib.sha256()
	with open(path, "rb") as handle:
		for chunk in iter(lambda: handle.read(1024 * 1024), b""):
			hasher.update(chunk)
	return hasher.hexdigest()


def duplicate_hashes_for_new():
	hashes = {}
	for product in Product.objects.filter(id__gt=167).prefetch_related("images"):
		image = product.images.first()
		if not image:
			continue
		path = media_path(image.image_url)
		if path and path.exists():
			hashes.setdefault(sha256(path), []).append(product.slug)
	return {digest: slugs for digest, slugs in hashes.items() if len(slugs) > 1}


def main():
	PRODUCT_MEDIA_DIR.joinpath("real-new-catalog").mkdir(parents=True, exist_ok=True)
	before = duplicate_hashes_for_new()
	repaired = []
	manual = []

	for index, slug in enumerate(TARGET_SLUGS, start=1):
		product = Product.objects.select_related("category", "brand", "store").prefetch_related("images").get(slug=slug)
		image = product.images.first()
		query = QUERY_OVERRIDES.get(slug) or query_for(product)
		print(f"[{index}/{len(TARGET_SLUGS)}] {slug}: {query}", flush=True)
		candidates = []
		for provider in (openverse_candidates, commons_candidates):
			try:
				candidates.extend(provider(query))
			except Exception as exc:
				manual.append({"slug": slug, "query": query, "provider_error": str(exc)})
			time.sleep(0.7)
			if candidates:
				break

		scored = sorted(
			((score(product, query, candidate), candidate) for candidate in candidates),
			key=lambda item: item[0],
			reverse=True,
		)
		if not scored:
			manual.append({"slug": slug, "query": query, "reason": "no candidates"})
			continue

		last_error = ""
		for confidence, candidate in scored[:4]:
			if confidence < 45:
				continue
			try:
				new_url = download_candidate(candidate, slug)
			except Exception as exc:
				last_error = str(exc)
				continue
			old_url = image.image_url
			image.image_url = new_url
			image.alt_text = product.name
			image.save(update_fields=["image_url", "alt_text"])
			repaired.append(
				{
					"slug": slug,
					"old_image": old_url,
					"new_image": new_url,
					"confidence": confidence,
					"source_title": candidate.get("title", ""),
				}
			)
			break
		else:
			manual.append({"slug": slug, "query": query, "reason": last_error or "no downloadable candidate"})

	after = duplicate_hashes_for_new()
	report = {
		"before_duplicate_groups": before,
		"after_duplicate_groups": after,
		"repaired": repaired,
		"manual": manual,
	}
	report_path = BACKEND_DIR / "remaining_new_image_duplicate_report.json"
	report_path.write_text(json.dumps(report, indent=2), encoding="utf-8")
	print(json.dumps({"repaired": len(repaired), "manual": len(manual), "remaining_duplicate_groups": len(after), "report": str(report_path)}, indent=2))


if __name__ == "__main__":
	main()
