from decimal import Decimal
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from django.utils.text import slugify
from products.models import Category, Brand, Product, ProductImage, Review, Inventory
from sellers.models import SellerProfile, Store

User = get_user_model()

def _unique_store_slug(name):
    base = slugify(name)
    slug = base
    suffix = 2
    while Store.objects.filter(slug=slug).exists():
        slug = f"{base}-{suffix}"
        suffix += 1
    return slug

PRODUCTS = [
    {
        "name": "Falcon 9",
        "category_slug": "rockets-spacecraft",
        "price": Decimal("67000000.00"),
        "stock": 5,
        "rating": Decimal("4.9"),
        "tag": "Reusable",
        "is_featured": True,
        "image_url": "https://images.unsplash.com/photo-1580551730007-11f498ebb39d?auto=format&fit=crop&w=900&q=80",
        "description": "Falcon 9 is a reusable, two-stage rocket designed and manufactured by SpaceX for the reliable and safe transport of people and payloads into Earth orbit and beyond. It is the world's first orbital-class reusable rocket, drastically reducing the cost of space access.",
        "specifications": (
            "Height: 70 m (229.6 ft)\n"
            "Diameter: 3.7 m (12 ft)\n"
            "Mass: 549,054 kg (1,207,920 lb)\n"
            "Stages: 2\n"
            "Payload to LEO: 22,800 kg expendable / 15,600 kg reusable\n"
            "Payload to GTO: 8,300 kg expendable / 5,500 kg reusable\n"
            "First Stage Engines: 9 × Merlin 1D\n"
            "Second Stage Engine: 1 × Merlin 1D Vacuum\n"
            "Reusability: First stage lands autonomously\n"
            "Price per launch: $67M (reusable)"
        ),
    },
    {
        "name": "Falcon Heavy",
        "category_slug": "rockets-spacecraft",
        "price": Decimal("97000000.00"),
        "stock": 3,
        "rating": Decimal("4.9"),
        "tag": "Heavy Lift",
        "is_featured": True,
        "image_url": "https://images.unsplash.com/photo-1541185933-ef5d8ed016c2?auto=format&fit=crop&w=900&q=80",
        "description": "Falcon Heavy is the world's most powerful operational rocket, capable of lifting nearly 64 metric tons into orbit. It features three Falcon 9 nine-engine cores whose 27 Merlin engines generate more than 5 million pounds of thrust at liftoff.",
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
        "category_slug": "rockets-spacecraft",
        "price": Decimal("99000000.00"),
        "stock": 2,
        "rating": Decimal("5.0"),
        "tag": "Super Heavy",
        "is_featured": True,
        "image_url": "https://images.unsplash.com/photo-1608920585318-b4895fcd2e55?auto=format&fit=crop&w=900&q=80",
        "description": "Starship V3 is the largest and most powerful launch vehicle ever built, standing 124.4 meters tall. Designed for fully reusable super-heavy lift, it enables missions to the Moon, Mars, and beyond.",
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
            "Propellant: Liquid methane + Liquid oxygen\n"
            "Reusability: Fully reusable (both stages)\n"
            "Price per launch: ~$2B (development cost)"
        ),
    },
    {
        "name": "Crew Dragon",
        "category_slug": "rockets-spacecraft",
        "price": Decimal("55000000.00"),
        "stock": 4,
        "rating": Decimal("4.8"),
        "tag": "Crewed",
        "is_featured": True,
        "image_url": "https://upload.wikimedia.org/wikipedia/commons/7/7d/Crew_Dragon_at_the_ISS_for_Demo_Mission_1_%28cropped%29.jpg",
        "description": "Crew Dragon is a reusable spacecraft designed by SpaceX to carry up to 7 astronauts to and from Earth orbit. It features an advanced launch escape system, autonomous docking capability, and a sleek interior with touchscreen controls.",
        "specifications": (
            "Height: 8.1 m (26.6 ft)\n"
            "Diameter: 4.0 m (13 ft)\n"
            "Crew capacity: Up to 7 astronauts\n"
            "Launch abort: 8 SuperDraco engines\n"
            "Docking: Autonomous with NASA IDSS standard\n"
            "Propulsion: 16 Draco thrusters\n"
            "Power: Solar panels\n"
            "Reusability: Up to 5 flights per capsule\n"
            "Price per seat: ~$55M"
        ),
    },
    {
        "name": "Starlink Internet Kit",
        "category_slug": "satellites-internet",
        "price": Decimal("599.00"),
        "stock": 500,
        "rating": Decimal("4.5"),
        "tag": "Internet",
        "is_featured": True,
        "image_url": "https://images.unsplash.com/photo-1769888594832-76988416b5a7?auto=format&fit=crop&w=900&q=80",
        "description": "Starlink delivers high-speed, low-latency broadband internet anywhere on the planet via the world's largest satellite constellation. The Standard Kit includes a phased-array antenna, WiFi router, power supply, and all cables.",
        "specifications": (
            "Antenna: Electronically steered phased array\n"
            "Antenna Weight: 2.9 kg (6.4 lb)\n"
            "Antenna Rating: IP67 (weatherproof)\n"
            "Router: WiFi 6, tri-band 4×4 MU-MIMO\n"
            "Coverage: Up to 3,200 ft² (297 m²)\n"
            "Download Speed: 25–220 Mbps\n"
            "Latency: 20–40 ms\n"
            "Power Consumption: 75–100 W avg\n"
            "Snow Melt: Up to 40 mm/hr\n"
            "Subscription: $120/mo (residential)\n"
            "Includes: Antenna, router, power supply, 75 ft cable"
        ),
    },
    {
        "name": "Starlink Satellite (Single Unit)",
        "category_slug": "satellites-internet",
        "price": Decimal("250000.00"),
        "stock": 100,
        "rating": Decimal("4.7"),
        "tag": "Satellite",
        "is_featured": False,
        "image_url": "https://images.unsplash.com/photo-1699541948287-9c8ce85624ce?auto=format&fit=crop&w=900&q=80",
        "description": "Each Starlink satellite is a compact, flat-panel design mass-produced at SpaceX's facility in Redmond, Washington. Equipped with Hall-effect thrusters, autonomous collision avoidance, and laser inter-satellite links.",
        "specifications": (
            "Mass: ~260 kg (573 lb)\n"
            "Form Factor: Flat panel\n"
            "Propulsion: Hall-effect thruster (krypton)\n"
            "Inter-Satellite Links: Laser optical\n"
            "Orbit: ~550 km LEO\n"
            "Bandwidth: ~20 Gbps per satellite\n"
            "Phased Array Antenna: Digital beamforming\n"
            "Constellation: ~12,000 planned satellites\n"
            "Price per unit: ~$250,000"
        ),
    },
]

REVIEWS = [
    ("Elon Musk", "Outstanding performance."),
    ("Gwynne Shotwell", "Flawless execution as always."),
    ("NASA Administrator", "Reliable and cost-effective."),
    ("Tom Mueller", "Incredible engineering achievement."),
]

class Command(BaseCommand):
    help = "Seed the SpaceX store with rockets, spacecraft, and satellite products"

    def handle(self, *args, **options):
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

        store, store_created = Store.objects.get_or_create(
            seller=seller_profile,
            defaults={
                "name": "SpaceX",
                "slug": _unique_store_slug("SpaceX"),
                "description": (
                    "SpaceX designs, manufactures, and launches advanced rockets and spacecraft. "
                    "Founded in 2002 by Elon Musk, the company revolutionized spaceflight with the first "
                    "reusable rocket, Falcon 9, and is developing Starship to make life multiplanetary."
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
        if not store_created:
            # Update mutable fields without touching the slug
            Store.objects.filter(pk=store.pk).update(
                name="SpaceX",
                is_active=True,
                logo_url="https://images.unsplash.com/photo-1517976487492-5750f3195933?auto=format&fit=crop&w=600&q=80",
                banner_url="https://images.unsplash.com/photo-1778034499052-0314f29f48a4?auto=format&fit=crop&w=1600&q=80",
            )
        self.stdout.write(self.style.SUCCESS(f"Store: {store.name} (slug: {store.slug})"))

        rocket_cat, _ = Category.objects.update_or_create(
            name="Rockets & Spacecraft",
            defaults={"slug": "rockets-spacecraft", "description": "Launch vehicles, spacecraft, and crew transport systems", "order": 20},
        )
        sat_cat, _ = Category.objects.update_or_create(
            name="Satellites & Internet",
            defaults={"slug": "satellites-internet", "description": "Satellite hardware, internet terminals, and communication systems", "order": 21},
        )
        categories = {"rockets-spacecraft": rocket_cat, "satellites-internet": sat_cat}
        self.stdout.write(self.style.SUCCESS("Categories ready"))

        brand, _ = Brand.objects.get_or_create(name="SpaceX")
        self.stdout.write(self.style.SUCCESS("Brand ready"))

        for pdata in PRODUCTS:
            pdata = dict(pdata)  # copy so we don't mutate the module-level list
            image_url = pdata.pop("image_url")
            cat_slug = pdata.pop("category_slug")

            product, created = Product.objects.update_or_create(
                name=pdata["name"],
                defaults={
                    **pdata,
                    "category": categories[cat_slug],
                    "store": store,
                    "brand": brand,
                    "is_active": True,
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

            if not Review.objects.filter(product=product).exists():
                for name, title in REVIEWS:
                    Review.objects.create(
                        product=product,
                        user=None,
                        name=name,
                        rating=5,
                        title=title,
                        comment=f"{title} The {product.name} exceeds all expectations. A game-changer for the space industry.",
                        is_verified_purchase=True,
                    )

            self.stdout.write(self.style.SUCCESS(f"  {'Created' if created else 'Updated'}: {product.name}"))

        self.stdout.write(self.style.SUCCESS(f"\nDone! Visit /store/{store.slug} to see the store."))
