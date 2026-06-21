"""Seed SpaceX store - run with: python manage.py shell < seed_spacex.py"""
import os
import django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "core.settings")
django.setup()

from decimal import Decimal
from django.contrib.auth import get_user_model
from django.utils.text import slugify
from products.models import Category, Brand, Product, ProductImage, Review, Inventory
from sellers.models import SellerProfile, Store

User = get_user_model()


def unique_store_slug(name: str) -> str:
    base = slugify(name)
    slug = base
    suffix = 2
    while Store.objects.filter(slug=slug).exists():
        slug = f"{base}-{suffix}"
        suffix += 1
    return slug


seller_user, _ = User.objects.update_or_create(
    email="spacex@kinahub.local",
    defaults={
        "username": "spacex@kinahub.local",
        "first_name": "SpaceX",
        "last_name": "Store",
        "role": "seller",
        "is_active": True,
    },
)
seller_user.set_password("spacex123")
seller_user.save()

seller_profile, _ = SellerProfile.objects.update_or_create(
    user=seller_user,
    defaults={"business_name": "SpaceX", "phone": "+1-310-363-6000", "status": "verified"},
)

spacex_store, _ = Store.objects.update_or_create(
    seller=seller_profile,
    defaults={
        "name": "SpaceX",
        "slug": unique_store_slug("SpaceX"),
        "description": (
            "SpaceX designs, manufactures, and launches advanced rockets and spacecraft. "
            "Founded in 2002 by Elon Musk, the company revolutionized spaceflight with the first "
            "reusable rocket, Falcon 9, and is developing Starship to make life multiplanetary. "
            "Based at Starbase in Boca Chica, Texas."
        ),
        "address": "Starbase, Boca Chica Beach, Cameron County, Texas, United States",
        "area": "Starbase, Boca Chica",
        "map_url": "https://www.google.com/maps/search/?api=1&query=Starbase%20Boca%20Chica%20Texas",
        "support_email": "spacex@kinahub.local",
        "support_phone": "+1-310-363-6000",
        "logo_url": "https://images.unsplash.com/photo-1517976487492-5750f3195933?auto=format&fit=crop&w=600&q=80",
        "banner_url": "https://images.unsplash.com/photo-1778034499052-0314f29f48a4?auto=format&fit=crop&w=1600&q=80",
        "is_active": True,
    },
)
print(f"Store ready: {spacex_store.name} (slug: {spacex_store.slug})")

rocket_cat, _ = Category.objects.update_or_create(
    name="Rockets & Spacecraft",
    defaults={"description": "Launch vehicles, spacecraft, and crew transport systems", "order": 20},
)
sat_cat, _ = Category.objects.update_or_create(
    name="Satellites & Internet",
    defaults={"description": "Satellite hardware, internet terminals, and communication systems", "order": 21},
)
print("Categories ready")

spacex_brand, _ = Brand.objects.get_or_create(name="SpaceX")
print("Brand ready")

products_data = [
    {
        "name": "Falcon 9",
        "category": rocket_cat,
        "brand": spacex_brand,
        "price": Decimal("67000000.00"),
        "discount_price": None,
        "stock": 5,
        "rating": Decimal("4.9"),
        "tag": "Reusable",
        "is_featured": True,
        "image_url": "https://images.unsplash.com/photo-1580551730007-11f498ebb39d?auto=format&fit=crop&w=900&q=80",
        "description": (
            "Falcon 9 is a reusable, two-stage rocket designed and manufactured by SpaceX for the "
            "reliable and safe transport of people and payloads into Earth orbit and beyond. "
            "It is the world's first orbital-class reusable rocket, drastically reducing the cost "
            "of space access. Falcon 9 has launched over 300 missions including crewed flights, "
            "cargo resupply to the ISS, and large satellite deployments."
        ),
        "specifications": (
            "Height: 70 m (229.6 ft)\n"
            "Diameter: 3.7 m (12 ft)\n"
            "Mass: 549,054 kg (1,207,920 lb)\n"
            "Stages: 2\n"
            "Payload to LEO: 22,800 kg (50,265 lb) expendable / 15,600 kg (34,392 lb) reusable\n"
            "Payload to GTO: 8,300 kg (18,300 lb) expendable / 5,500 kg (12,100 lb) reusable\n"
            "First Stage Engines: 9 × Merlin 1D\n"
            "Second Stage Engine: 1 × Merlin 1D Vacuum\n"
            "Reusability: First stage lands autonomously on drone ship or launch pad\n"
            "Price per launch: $67M (reusable)"
        ),
    },
    {
        "name": "Falcon Heavy",
        "category": rocket_cat,
        "brand": spacex_brand,
        "price": Decimal("97000000.00"),
        "discount_price": None,
        "stock": 3,
        "rating": Decimal("4.9"),
        "tag": "Heavy Lift",
        "is_featured": True,
        "image_url": "https://images.unsplash.com/photo-1541185933-ef5d8ed016c2?auto=format&fit=crop&w=900&q=80",
        "description": (
            "Falcon Heavy is the world's most powerful operational rocket, capable of lifting "
            "nearly 64 metric tons into orbit. It features three Falcon 9 nine-engine cores "
            "whose 27 Merlin engines generate more than 5 million pounds of thrust at liftoff. "
            "All three boosters are reusable, landing back on Earth after launch."
        ),
        "specifications": (
            "Height: 70 m (229.6 ft)\n"
            "Width: 12.2 m (39.9 ft) across the three cores\n"
            "Mass: 1,420,788 kg (3,125,735 lb)\n"
            "Engines: 27 × Merlin 1D (9 per core)\n"
            "Thrust at liftoff: 22,819 kN (5,130,000 lbf)\n"
            "Payload to LEO: 63,800 kg (140,700 lb)\n"
            "Payload to GTO: 26,700 kg (58,900 lb)\n"
            "Payload to Mars: 16,800 kg (37,000 lb)\n"
            "Reusability: All three cores land back on Earth\n"
            "Price per launch: $97M (fully reusable)"
        ),
    },
    {
        "name": "Starship V3",
        "category": rocket_cat,
        "brand": spacex_brand,
        "price": Decimal("2000000000.00"),
        "discount_price": None,
        "stock": 2,
        "rating": Decimal("5.0"),
        "tag": "Super Heavy",
        "is_featured": True,
        "image_url": "https://images.unsplash.com/photo-1608920585318-b4895fcd2e55?auto=format&fit=crop&w=900&q=80",
        "description": (
            "Starship V3 is the largest and most powerful launch vehicle ever built, standing "
            "124.4 meters tall. Designed for fully reusable super-heavy lift, it enables missions "
            "to the Moon, Mars, and beyond. The Starship spacecraft stacks atop the Super Heavy "
            "booster, powered by Raptor engines burning liquid methane and liquid oxygen."
        ),
        "specifications": (
            "Total Height: 124.4 m (408 ft)\n"
            "Super Heavy Booster Height: 71 m (233 ft)\n"
            "Starship Spacecraft Height: 53.4 m (175 ft)\n"
            "Diameter: 9 m (29.5 ft)\n"
            "Booster Engines: 33 × Raptor 3 (methane/LOX)\n"
            "Spacecraft Engines: 6 × Raptor 3 (3 Vacuum + 3 Sea Level)\n"
            "Total Thrust: ~75,000 kN (17,000,000 lbf)\n"
            "Payload to LEO: 200,000 kg (440,000 lb) reusable\n"
            "Payload to Moon: 100,000 kg (220,000 lb)\n"
            "Propellant: Liquid methane (CH₄) + Liquid oxygen (LOX)\n"
            "Reusability: Fully reusable (both stages)\n"
            "Price per launch: ~$2B (development cost)"
        ),
    },
    {
        "name": "Crew Dragon",
        "category": rocket_cat,
        "brand": spacex_brand,
        "price": Decimal("55000000.00"),
        "discount_price": None,
        "stock": 4,
        "rating": Decimal("4.8"),
        "tag": "Crewed",
        "is_featured": True,
        "image_url": "https://upload.wikimedia.org/wikipedia/commons/7/7d/Crew_Dragon_at_the_ISS_for_Demo_Mission_1_%28cropped%29.jpg",
        "description": (
            "Crew Dragon is a reusable spacecraft designed by SpaceX to carry up to 7 astronauts "
            "to and from Earth orbit. It features an advanced launch escape system, an autonomous "
            "docking capability, and a sleek interior with touchscreen controls. Crew Dragon has "
            "transported NASA astronauts, private missions, and cargo to the International Space "
            "Station."
        ),
        "specifications": (
            "Height: 8.1 m (26.6 ft)\n"
            "Diameter: 4.0 m (13 ft)\n"
            "Crew capacity: Up to 7 astronauts\n"
            "Launch abort: 8 SuperDraco engines (integrated escape system)\n"
            "Docking: Autonomous with NASA IDSS standard\n"
            "Propulsion: 16 Draco thrusters (orbital maneuvering)\n"
            "Power: Solar panels (torso section)\n"
            "Reusability: Up to 5 flights per capsule\n"
            "Price per seat: ~$55M"
        ),
    },
    {
        "name": "Starlink Internet Kit",
        "category": sat_cat,
        "brand": spacex_brand,
        "price": Decimal("599.00"),
        "discount_price": None,
        "stock": 500,
        "rating": Decimal("4.5"),
        "tag": "Internet",
        "is_featured": True,
        "image_url": "https://images.unsplash.com/photo-1769888594832-76988416b5a7?auto=format&fit=crop&w=900&q=80",
        "description": (
            "Starlink delivers high-speed, low-latency broadband internet anywhere on the planet "
            "via the world's largest satellite constellation. The Standard Kit includes a phased-array "
            "antenna, WiFi router, power supply, and all cables needed for self-installation. "
            "With speeds up to 220 Mbps and latency as low as 20 ms, it works in remote areas, "
            "RVs, maritime vessels, and homes worldwide."
        ),
        "specifications": (
            "Antenna: Electronically steered phased array\n"
            "Antenna Weight: 2.9 kg (6.4 lb)\n"
            "Antenna Rating: IP67 (weatherproof)\n"
            "Router: WiFi 6, tri-band 4×4 MU-MIMO\n"
            "Coverage: Up to 3,200 ft² (297 m²)\n"
            "Ethernet Ports: 2 × latching LAN ports\n"
            "Download Speed: 25–220 Mbps\n"
            "Latency: 20–40 ms\n"
            "Power Consumption: 75–100 W avg\n"
            "Operating Temp: -30°C to 50°C\n"
            "Snow Melt: Up to 40 mm/hr\n"
            "Subscription: $120/mo (residential)\n"
            "Includes: Antenna, router, power supply, 75 ft cable, mounting base"
        ),
    },
    {
        "name": "Starlink Satellite (Single Unit)",
        "category": sat_cat,
        "brand": spacex_brand,
        "price": Decimal("250000.00"),
        "discount_price": None,
        "stock": 100,
        "rating": Decimal("4.7"),
        "tag": "Satellite",
        "is_featured": False,
        "image_url": "https://images.unsplash.com/photo-1699541948287-9c8ce85624ce?auto=format&fit=crop&w=900&q=80",
        "description": (
            "Each Starlink satellite is a compact, flat-panel design mass-produced at SpaceX's "
            "facility in Redmond, Washington. Equipped with Hall-effect thrusters using krypton "
            "propellant, autonomous collision avoidance, and laser inter-satellite links, these "
            "satellites form a low Earth orbit constellation providing global broadband coverage. "
            "At ~$250K per unit, they cost a fraction of traditional communications satellites."
        ),
        "specifications": (
            "Mass: ~260 kg (573 lb)\n"
            "Form Factor: Flat panel\n"
            "Propulsion: Hall-effect thruster (krypton)\n"
            "Inter-Satellite Links: Laser optical (V3.0+)\n"
            "Orbit: ~550 km LEO\n"
            "Bandwidth: ~20 Gbps per satellite\n"
            "Phased Array Antenna: Digital beamforming\n"
            "Autonomous Collision Avoidance: Yes\n"
            "Constellation: ~12,000 planned satellites\n"
            "Production Rate: Up to 60 satellites per week\n"
            "Price per unit: ~$250,000"
        ),
    },
]

review_people = [
    ("Elon Musk", "Outstanding performance.", True),
    ("Gwynne Shotwell", "Flawless execution as always.", True),
    ("NASA Administrator", "Reliable and cost-effective.", True),
    ("Tom Mueller", "Incredible engineering achievement.", True),
]


def seed_reviews(product):
    if Review.objects.filter(product=product).exists():
        return
    for i, (name, prefix, verified) in enumerate(review_people):
        Review.objects.create(
            product=product,
            user=None,
            name=name,
            rating=5,
            title=prefix,
            comment=f"{prefix} The {product.name} exceeds all expectations. A game-changer for the space industry.",
            is_verified_purchase=verified,
        )


for idx, pdata in enumerate(products_data):
    image_url = pdata.pop("image_url")
    cat = pdata.pop("category")

    product, created = Product.objects.update_or_create(
        name=pdata["name"],
        defaults={
            **pdata,
            "category": cat,
            "store": spacex_store,
            "is_active": True,
            "specifications": pdata.get("specifications", ""),
        },
    )

    ProductImage.objects.update_or_create(
        product=product,
        is_primary=True,
        defaults={"image_url": image_url, "alt_text": pdata["name"], "order": 0},
    )

    Inventory.objects.update_or_create(
        product=product,
        defaults={"sku": f"SPX-{slugify(pdata['name']).upper()}", "quantity": pdata["stock"], "low_stock_threshold": 1},
    )

    seed_reviews(product)
    status = "Created" if created else "Updated"
    print(f"  {status}: {product.name} — ${product.price:,.2f}")

print(f"\nDone! SpaceX store is ready at slug: '{spacex_store.slug}'")
print("Login: spacex@kinahub.local / spacex123")
