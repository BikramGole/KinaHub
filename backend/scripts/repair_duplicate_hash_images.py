import hashlib
import json
import os
import re
import sys
import time
import urllib.parse
import urllib.request
from collections import defaultdict
from pathlib import Path

import django


BACKEND_DIR = Path(__file__).resolve().parents[1]
PROJECT_DIR = BACKEND_DIR.parent
PRODUCT_MEDIA_DIR = PROJECT_DIR / "frontend" / "public" / "product-media"
REPORT_PATH = BACKEND_DIR / "duplicate_hash_image_repair_report.md"

sys.path.insert(0, str(BACKEND_DIR))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "core.settings")
django.setup()

from products.models import ProductImage  # noqa: E402


STOPWORDS = {
	"the", "and", "with", "for", "pack", "set", "pro", "mini", "ultra", "classic",
	"modern", "sleek", "fit", "comfort", "wireless", "portable", "dukan", "kina",
	"basics", "variant", "store", "new", "road", "everest", "pokhara", "bharatpur",
	"thamel", "boudha", "kalanki", "general", "mart", "hub", "suppliers",
}

QUERY_OVERRIDES = {
	"laptop-sleeve": "laptop sleeve product",
	"usb-c-dock-1": "USB C dock product",
	"mechanical-keyboard": "mechanical keyboard product",
	"wireless-mouse-3": "computer mouse product",
	"laptop-cooling-pad": "laptop cooling pad",
	"webcam-hd-2": "webcam product",
	"portable-monitor": "portable monitor",
	"laptop-backpack-1": "laptop backpack",
	"psx-retro-console": "playstation console",
	"xbox-series-controller-3": "xbox controller",
	"gaming-chair-pro": "gaming chair",
	"rgb-mouse-pad-2": "computer mouse pad",
	"arcade-stick": "arcade joystick",
	"vr-headset-1": "virtual reality headset",
	"game-storage-rack": "video game storage rack",
	"canon-eos-r50": "Canon camera",
	"nikon-z50-2": "Nikon camera",
	"tripod-stand": "camera tripod",
	"action-camera-1": "action camera",
	"camera-bag-3": "camera bag",
	"lens-cleaning-kit": "lens cleaning kit",
	"ring-light-camera-kit-2": "ring light camera",
	"anime-art-book-2": "anime art book",
	"nepali-grammar-guide-3": "Nepali grammar book",
	"javascript-quick-ref-4": "JavaScript book",
	"history-atlas-1": "history atlas book",
	"a4-notebook-bundle-2": "notebook stationery",
	"highlighter-set": "highlighter pen set",
	"geometry-box-1": "geometry box stationery",
	"planner-notebook": "planner notebook",
	"sticky-notes-pack-3": "sticky notes",
	"marker-set": "marker pen set",
	"school-backpack": "school backpack",
	"lunch-box-set-1": "lunch box",
	"study-lamp": "desk study lamp",
	"scientific-calculator-3": "scientific calculator",
	"exam-answer-sheet-pack": "answer sheet paper",
	"water-bottle-set": "water bottle",
	"raspberry-pi-5-kit": "Raspberry Pi board",
	"arduino-uno-kit-2": "Arduino Uno board",
	"graphic-tablet": "drawing tablet",
	"usb-c-hub-1": "USB C hub",
	"portable-ssd": "portable SSD",
	"phone-case-pack-3": "phone case",
	"laptop-stand": "laptop stand",
	"cable-organizer-2": "cable organizer",
	"github-fork-t-shirt": "t shirt product",
	"oversized-hoodie-1": "hoodie clothing",
	"denim-jacket": "denim jacket",
	"sneaker-pack-3": "sneakers shoes",
	"graphic-tee": "graphic t shirt",
	"cargo-pants-2": "cargo pants",
	"cap-and-beanie-set": "beanie cap",
	"streetwear-shirt-1": "streetwear shirt",
	"led-desk-light": "LED desk lamp",
	"air-purifier-mini-3": "air purifier",
	"smart-bulb-pack": "smart light bulb",
	"kitchen-storage-rack-2": "kitchen storage rack",
	"blender-pro": "kitchen blender",
	"rice-cooker-1": "rice cooker",
	"curtain-set": "curtain",
	"mixer-grinder": "mixer grinder",
	"electric-kettle-2": "electric kettle",
	"air-fryer": "air fryer",
	"water-filter-1": "water filter",
	"toaster-oven": "toaster oven",
	"hand-blender-3": "hand blender",
	"vacuum-cleaner": "vacuum cleaner",
	"rice-cooker-mini-2": "rice cooker",
	"basketball-pro-2": "basketball",
	"dumbbell-set": "dumbbells",
	"resistance-bands-1": "resistance bands",
	"yoga-mat": "yoga mat",
	"gym-water-bottle-3": "gym water bottle",
	"skate-helmet": "skate helmet",
	"jump-rope-2": "jump rope",
	"bike-phone-holder-1": "bike phone holder",
	"tyre-inflator-3": "tire inflator",
	"bike-lock": "bike lock",
	"car-vacuum-2": "car vacuum cleaner",
	"dash-cam": "dash camera",
	"riding-gloves-1": "riding gloves",
	"pet-toy-pack": "pet toy",
	"pet-grooming-brush-3": "pet grooming brush",
	"dog-collar": "dog collar",
	"cat-litter-2": "cat litter",
	"pet-water-bowl": "pet bowl",
	"leash-set-1": "dog leash",
	"wai-wai-noodles": "instant noodles",
	"dettol-soap-pack-3": "soap bar",
	"fortune-sunflower-oil": "sunflower oil bottle",
	"aashirvaad-atta-2": "wheat flour bag",
	"basmati-rice-bag": "rice bag",
	"organic-eggs-1": "eggs carton",
	"fresh-apples": "apples",
	"cold-coffee-3": "cold coffee bottle",
	"iphone-16-cover": "phone case",
	"samsung-charger-2": "phone charger",
	"usb-c-fast-cable": "USB C cable",
	"power-bank-20000mah-1": "power bank",
	"wireless-earbuds": "earbuds",
	"screen-protector-3": "screen protector",
	"foldable-phone-case": "phone case",
	"mobile-grip-stand-2": "phone ring stand",
	"bluetooth-speaker": "bluetooth speaker",
	"wireless-headphones-3": "headphones",
	"earbuds-pro": "wireless earbuds",
	"soundbar-mini-2": "soundbar",
	"podcast-mic": "microphone",
	"studio-headphones-1": "studio headphones",
	"portable-audio-dac": "audio DAC",
	"car-audio-adapter-3": "car audio adapter",
}


def tokenize(text):
	return {
		token
		for token in re.findall(r"[a-z0-9]+", text.lower())
		if len(token) > 2 and token not in STOPWORDS
	}


def file_sha256(path):
	hasher = hashlib.sha256()
	with open(path, "rb") as handle:
		for chunk in iter(lambda: handle.read(1024 * 1024), b""):
			hasher.update(chunk)
	return hasher.hexdigest()


def media_path(image_url):
	if not image_url.startswith("/product-media/"):
		return None
	return PRODUCT_MEDIA_DIR / image_url.removeprefix("/product-media/")


def duplicate_hash_groups():
	buckets = defaultdict(list)
	for image in ProductImage.objects.select_related("product", "product__category").order_by("product_id"):
		path = media_path(image.image_url)
		if path and path.exists():
			buckets[file_sha256(path)].append(image)
	return [items for items in buckets.values() if len(items) > 1]


def commons_candidates(query):
	params = urllib.parse.urlencode({
		"action": "query",
		"format": "json",
		"generator": "search",
		"gsrnamespace": 6,
		"gsrlimit": 8,
		"gsrsearch": query,
		"prop": "imageinfo",
		"iiprop": "url|mime|size",
		"iiurlwidth": 900,
	})
	url = f"https://commons.wikimedia.org/w/api.php?{params}"
	request = urllib.request.Request(url, headers={"User-Agent": "KinaHubCatalogAudit/1.0"})
	data = json.load(urllib.request.urlopen(request, timeout=12))
	pages = data.get("query", {}).get("pages", {})
	candidates = []
	for page in pages.values():
		info = (page.get("imageinfo") or [{}])[0]
		mime = info.get("mime", "")
		if not mime.startswith("image/") or mime == "image/svg+xml":
			continue
		candidates.append({
			"title": page.get("title", ""),
			"url": info.get("thumburl") or info.get("url"),
			"mime": mime,
			"width": info.get("thumbwidth") or info.get("width"),
			"height": info.get("thumbheight") or info.get("height"),
		})
	return candidates


def score_candidate(product, candidate):
	product_tokens = tokenize(f"{product.name} {product.category.name} {QUERY_OVERRIDES.get(product.slug, '')}")
	title_tokens = tokenize(candidate["title"])
	if not product_tokens or not title_tokens:
		return 0
	overlap = product_tokens & title_tokens
	score = 45 + min(len(overlap) * 16, 48)
	if any(token in title_tokens for token in tokenize(product.category.name)):
		score += 8
	if candidate.get("url"):
		score += 4
	return min(score, 99)


def extension_for(candidate):
	mime = candidate.get("mime", "")
	if mime == "image/png":
		return ".png"
	if mime == "image/webp":
		return ".webp"
	return ".jpg"


def download(candidate, product):
	filename = f"{product.slug}{extension_for(candidate)}"
	target = PRODUCT_MEDIA_DIR / filename
	if target.exists() and target.stat().st_size > 0:
		return f"/product-media/{filename}", False
	request = urllib.request.Request(candidate["url"], headers={"User-Agent": "KinaHubCatalogAudit/1.0"})
	with urllib.request.urlopen(request, timeout=18) as response:
		content_type = response.headers.get("Content-Type", "")
		if not content_type.startswith("image/"):
			raise ValueError(f"Expected image, got {content_type}")
		target.write_bytes(response.read())
	return f"/product-media/{filename}", True


def should_repair_group(images):
	slugs = [image.product.slug for image in images]
	# Same item listed in different stores can keep the same image.
	if len(images) <= 3 and all(slugs[0].rstrip("-1234567890") == slug.rstrip("-1234567890") for slug in slugs):
		return False
	repairable = set(QUERY_OVERRIDES)
	return len(images) >= 4 and any(slug in repairable for slug in slugs[1:])


def main():
	PRODUCT_MEDIA_DIR.mkdir(parents=True, exist_ok=True)
	repairs = []
	manual = []
	skipped = []

	for group in duplicate_hash_groups():
		if not should_repair_group(group):
			skipped.append([image.product.slug for image in group])
			continue
		for image in group[1:]:
			product = image.product
			if product.slug not in QUERY_OVERRIDES:
				continue
			query = QUERY_OVERRIDES.get(product.slug) or f"{product.name} {product.category.name}"
			print(f"Searching image for {product.slug}: {query}", flush=True)
			try:
				candidates = commons_candidates(query)
			except Exception as exc:
				manual.append({"id": product.id, "slug": product.slug, "query": query, "reason": f"Search failed: {exc}", "confidence": 0})
				continue
			scored = sorted(
				((score_candidate(product, candidate), candidate) for candidate in candidates if candidate.get("url")),
				key=lambda item: item[0],
				reverse=True,
			)
			if not scored or scored[0][0] < 80:
				manual.append({
					"id": product.id,
					"slug": product.slug,
					"name": product.name,
					"query": query,
					"reason": "No Wikimedia candidate reached 80% confidence.",
					"confidence": scored[0][0] if scored else 0,
					"best_title": scored[0][1]["title"] if scored else "",
				})
				continue
			confidence, candidate = scored[0]
			try:
				new_url, downloaded = download(candidate, product)
			except Exception as exc:
				manual.append({"id": product.id, "slug": product.slug, "query": query, "reason": f"Download failed: {exc}", "confidence": confidence})
				continue
			old_url = image.image_url
			image.image_url = new_url
			image.alt_text = product.name
			image.save(update_fields=["image_url", "alt_text"])
			repairs.append({
				"id": product.id,
				"slug": product.slug,
				"name": product.name,
				"old_image": old_url,
				"new_image": new_url,
				"confidence": confidence,
				"source_title": candidate["title"],
				"downloaded": downloaded,
			})
			time.sleep(0.2)

	remaining_groups = duplicate_hash_groups()
	report = [
		"# Duplicate Hash Image Repair Report",
		"",
		"## Summary",
		"",
		f"- Images repaired: {len(repairs)}",
		f"- Manual review items: {len(manual)}",
		f"- Skipped same-item groups: {len(skipped)}",
		f"- Duplicate hash groups remaining: {len(remaining_groups)}",
		"",
		"## Repaired",
		"",
		"```json",
		json.dumps(repairs, indent=2),
		"```",
		"",
		"## Manual Review",
		"",
		"```json",
		json.dumps(manual, indent=2),
		"```",
	]
	REPORT_PATH.write_text("\n".join(report), encoding="utf-8")
	print(json.dumps({
		"repaired": len(repairs),
		"manual_review": len(manual),
		"skipped_same_item_groups": len(skipped),
		"duplicate_hash_groups_remaining": len(remaining_groups),
		"report": str(REPORT_PATH),
	}, indent=2))


if __name__ == "__main__":
	main()
