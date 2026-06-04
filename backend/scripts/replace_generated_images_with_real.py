import hashlib
import json
import os
import re
import sys
import time
import urllib.parse
import urllib.request
from pathlib import Path

import django


BACKEND_DIR = Path(__file__).resolve().parents[1]
PROJECT_DIR = BACKEND_DIR.parent
PRODUCT_MEDIA_DIR = PROJECT_DIR / "frontend" / "public" / "product-media"
REAL_DIR = PRODUCT_MEDIA_DIR / "real-new-catalog"
REPORT_PATH = BACKEND_DIR / "real_image_replacement_report.md"

sys.path.insert(0, str(BACKEND_DIR))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "core.settings")
django.setup()

from products.models import Product  # noqa: E402


STOPWORDS = {
	"the", "and", "with", "for", "pack", "set", "pro", "mini", "classic", "modern",
	"sleek", "fit", "comfort", "wireless", "portable", "dukan", "kina", "basics",
	"variant", "store", "new", "road", "everest", "pokhara", "bharatpur", "general",
	"mart", "hub", "suppliers", "product", "photo", "image",
}

QUERY_OVERRIDES = {
	"mens-cotton-jacket-2": "mens cotton jacket product",
	"see-prep-guide": "exam preparation books",
	"2-physics-book-3": "physics textbook",
	"entrance-exam-mastery": "entrance exam preparation books",
	"python-programming-book-2": "python programming book",
	"gk-nepal-book": "general knowledge book",
	"english-grammar-workbook-1": "english grammar workbook",
	"novel-collection": "novel books stack",
	"kids-story-book-3": "kids story book",
	"a4-notebook-bundle-2": "notebook stack",
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
	"exam-clipboard-2": "exam clipboard",
	"water-bottle-set": "water bottle set",
	"psx-retro-console": "playstation console",
	"xbox-series-controller-3": "xbox controller",
	"gaming-chair-pro": "gaming chair",
	"rgb-mouse-pad-2": "RGB mouse pad",
	"arcade-stick": "arcade joystick controller",
	"vr-headset-1": "virtual reality headset",
	"game-storage-rack": "video game storage rack",
	"mechanical-keyboard-3": "mechanical keyboard",
	"raspberry-pi-5-kit": "raspberry pi board",
	"arduino-uno-kit-2": "arduino uno board",
	"graphic-tablet": "drawing tablet",
	"usb-c-hub-1": "USB C hub",
	"portable-ssd": "portable SSD",
	"phone-case-pack-3": "phone case",
	"laptop-stand": "laptop stand",
	"cable-organizer-2": "cable organizer",
	"github-fork-t-shirt": "github t shirt",
	"oversized-hoodie-1": "oversized hoodie",
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
	"rice-cooker-1": "electric rice cooker",
	"curtain-set": "curtain set",
	"bed-sheet-set-3": "bed sheet set",
	"basketball-pro-2": "basketball ball",
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
	"riding-gloves-1": "motorcycle riding gloves",
	"canon-eos-r50": "Canon camera",
	"nikon-z50-2": "Nikon camera",
	"tripod-stand": "camera tripod",
	"action-camera-1": "action camera",
	"camera-bag-3": "camera bag",
	"lens-cleaning-kit": "lens cleaning kit",
	"ring-light-camera-kit-2": "ring light",
	"cat-food-chicken-1": "cat food bag",
	"pet-toy-pack": "pet toys",
	"pet-grooming-brush-3": "pet grooming brush",
	"dog-collar": "dog collar",
	"cat-litter-2": "cat litter",
	"pet-water-bowl": "pet water bowl",
	"leash-set-1": "dog leash",
	"wai-wai-noodles": "instant noodles packet",
	"dettol-soap-pack-3": "soap bar pack",
	"fortune-sunflower-oil": "sunflower oil bottle",
	"aashirvaad-atta-2": "wheat flour bag",
	"basmati-rice-bag": "basmati rice bag",
	"organic-eggs-1": "eggs carton",
	"fresh-apples": "fresh apples",
	"cold-coffee-3": "cold coffee bottle",
	"iphone-16-cover": "phone case",
	"samsung-charger-2": "phone charger",
	"usb-c-fast-cable": "USB C cable",
	"power-bank-20000mah-1": "power bank",
	"wireless-earbuds": "wireless earbuds",
	"screen-protector-3": "screen protector",
	"foldable-phone-case": "foldable phone case",
	"mobile-grip-stand-2": "phone ring stand",
	"laptop-sleeve": "laptop sleeve",
	"usb-c-dock-1": "USB C dock",
	"mechanical-keyboard": "mechanical keyboard",
	"wireless-mouse-3": "computer mouse",
	"laptop-cooling-pad": "laptop cooling pad",
	"webcam-hd-2": "webcam",
	"portable-monitor": "portable monitor",
	"laptop-backpack-1": "laptop backpack",
	"bluetooth-speaker": "bluetooth speaker",
	"wireless-headphones-3": "headphones",
	"earbuds-pro": "wireless earbuds",
	"soundbar-mini-2": "soundbar speaker",
	"podcast-mic": "podcast microphone",
	"studio-headphones-1": "studio headphones",
	"portable-audio-dac": "audio DAC",
	"car-audio-adapter-3": "car audio adapter",
	"mixer-grinder": "mixer grinder",
	"electric-kettle-2": "electric kettle",
	"air-fryer": "air fryer",
	"water-filter-1": "water filter",
	"toaster-oven": "toaster oven",
	"hand-blender-3": "hand blender",
	"vacuum-cleaner": "vacuum cleaner",
	"rice-cooker-mini-2": "electric rice cooker",
	"anime-art-book-2": "anime art book",
	"nepali-grammar-guide-3": "nepali grammar book",
	"javascript-quick-ref-4": "javascript programming book",
	"history-atlas-1": "history atlas book",
	"diversified-pro-books-see-prep-guide-137": "exam preparation books",
}


def tokenize(text):
	return {
		token
		for token in re.findall(r"[a-z0-9]+", text.lower())
		if len(token) > 2 and token not in STOPWORDS
	}


def clean_name(name):
	return (
		name.replace(" - Bharatpur General Store", "")
		.replace(" - Everest Lifestyle Mart", "")
		.replace(" - Pokhara Modern Mall", "")
		.replace(" Variant 3", "")
		.strip()
	)


def query_for(product):
	return QUERY_OVERRIDES.get(product.slug) or f"{clean_name(product.name)} {product.category.name}"


def open_json(url):
	request = urllib.request.Request(url, headers={"User-Agent": "KinaHubCatalogRepair/1.0"})
	with urllib.request.urlopen(request, timeout=18) as response:
		return json.load(response)


def openverse_candidates(query):
	url = "https://api.openverse.org/v1/images/?" + urllib.parse.urlencode(
		{"q": query, "page_size": 8, "mature": "false"}
	)
	data = open_json(url)
	return [
		{
			"title": item.get("title") or "",
			"url": item.get("thumbnail") or item.get("url") or "",
			"full_url": item.get("url") or "",
			"source": "openverse",
			"license": item.get("license") or "",
		}
		for item in data.get("results", [])
		if item.get("thumbnail") or item.get("url")
	]


def commons_candidates(query):
	url = "https://commons.wikimedia.org/w/api.php?" + urllib.parse.urlencode(
		{
			"action": "query",
			"format": "json",
			"generator": "search",
			"gsrnamespace": 6,
			"gsrlimit": 8,
			"gsrsearch": query,
			"prop": "imageinfo",
			"iiprop": "url|mime|size",
			"iiurlwidth": 900,
		}
	)
	data = open_json(url)
	pages = data.get("query", {}).get("pages", {})
	results = []
	for page in pages.values():
		info = (page.get("imageinfo") or [{}])[0]
		mime = info.get("mime", "")
		if not mime.startswith("image/") or mime == "image/svg+xml":
			continue
		results.append(
			{
				"title": page.get("title") or "",
				"url": info.get("thumburl") or info.get("url") or "",
				"source": "commons",
				"license": "commons",
			}
		)
	return results


def score(product, query, candidate):
	product_tokens = tokenize(f"{query} {clean_name(product.name)} {product.category.name}")
	title_tokens = tokenize(candidate["title"])
	if not title_tokens:
		return 50
	overlap = product_tokens & title_tokens
	score_value = 48 + min(len(overlap) * 14, 42)
	if any(token in title_tokens for token in tokenize(product.category.name)):
		score_value += 6
	bad_words = {"person", "people", "girl", "boy", "man", "woman", "jambalaya", "ring"}
	if title_tokens & bad_words and not product_tokens & bad_words:
		score_value -= 18
	return max(0, min(score_value, 96))


def extension_from_response(content_type, url):
	if "png" in content_type:
		return ".png"
	if "webp" in content_type:
		return ".webp"
	if "jpeg" in content_type or "jpg" in content_type:
		return ".jpg"
	path = urllib.parse.urlparse(url).path.lower()
	for ext in (".jpg", ".jpeg", ".png", ".webp"):
		if path.endswith(ext):
			return ".jpg" if ext == ".jpeg" else ext
	return ".jpg"


def download_image(url, slug):
	request = urllib.request.Request(url, headers={"User-Agent": "KinaHubCatalogRepair/1.0"})
	with urllib.request.urlopen(request, timeout=25) as response:
		content_type = response.headers.get("Content-Type", "")
		if not content_type.startswith("image/"):
			raise ValueError(f"Expected image, got {content_type}")
		body = response.read()
		if len(body) < 3000:
			raise ValueError("Downloaded image is suspiciously small")
		extension = extension_from_response(content_type, url)
		digest = hashlib.sha1(body).hexdigest()[:10]
		filename = f"{slug}-{digest}{extension}"
		target = REAL_DIR / filename
		target.write_bytes(body)
	return f"/product-media/real-new-catalog/{filename}"


def download_candidate(candidate, slug):
	errors = []
	for url in [candidate.get("url"), candidate.get("full_url")]:
		if not url:
			continue
		try:
			return download_image(url, slug)
		except Exception as exc:
			errors.append(str(exc))
	raise ValueError("; ".join(errors) or "candidate has no usable URL")


def exact_root_local(product):
	for ext in (".jpg", ".jpeg", ".png", ".webp"):
		path = PRODUCT_MEDIA_DIR / f"{product.slug}{ext}"
		if path.exists():
			return f"/product-media/{path.name}"
	return ""


def main():
	REAL_DIR.mkdir(parents=True, exist_ok=True)
	products = (
		Product.objects.filter(images__image_url__startswith="/product-media/generated-new-catalog/")
		.select_related("category", "brand", "store")
		.prefetch_related("images")
		.order_by("id")
	)
	repaired = []
	manual = []
	for index, product in enumerate(products, start=1):
		image = product.images.first()
		query = query_for(product)
		print(f"[{index}/{products.count()}] {product.slug}: {query}", flush=True)
		candidates = []
		for provider in (openverse_candidates, commons_candidates):
			try:
				candidates.extend(provider(query))
			except Exception as exc:
				manual.append({"slug": product.slug, "query": query, "provider_error": str(exc)})
			time.sleep(0.35)
			if candidates:
				break

		scored = sorted(
			((score(product, query, candidate), candidate) for candidate in candidates),
			key=lambda item: item[0],
			reverse=True,
		)
		new_url = ""
		confidence = 0
		source_title = ""
		source = ""
		if scored and scored[0][0] >= 56:
			confidence, candidate = scored[0]
			try:
				new_url = download_candidate(candidate, product.slug)
				source_title = candidate["title"]
				source = candidate["source"]
			except Exception as exc:
				manual.append({"slug": product.slug, "query": query, "download_error": str(exc), "candidate": candidate})
				new_url = ""

		if not new_url:
			new_url = exact_root_local(product)
			confidence = 45
			source_title = "existing local real image fallback"
			source = "local"

		if not new_url:
			manual.append({"slug": product.slug, "query": query, "reason": "No real image found; generated image still in use"})
			continue

		old_url = image.image_url
		image.image_url = new_url
		image.alt_text = product.name
		image.is_primary = True
		image.order = 0
		image.save(update_fields=["image_url", "alt_text", "is_primary", "order"])
		repaired.append(
			{
				"id": product.id,
				"slug": product.slug,
				"name": product.name,
				"old_image": old_url,
				"new_image": new_url,
				"confidence": confidence,
				"source": source,
				"source_title": source_title,
			}
		)
		time.sleep(0.25)

	REPORT_PATH.write_text(
		"# Real Image Replacement Report\n\n"
		+ f"Repaired: {len(repaired)}\n\nManual review: {len(manual)}\n\n"
		+ "## Repaired\n\n```json\n"
		+ json.dumps(repaired, indent=2)
		+ "\n```\n\n## Manual Review\n\n```json\n"
		+ json.dumps(manual, indent=2)
		+ "\n```\n",
		encoding="utf-8",
	)
	print(json.dumps({"repaired": len(repaired), "manual": len(manual), "report": str(REPORT_PATH)}, indent=2))


if __name__ == "__main__":
	main()
