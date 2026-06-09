import os
import django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "core.settings")
django.setup()

from products.models import ImageCurationRating

count = ImageCurationRating.objects.count()
ImageCurationRating.objects.all().delete()
print(f"Deleted {count} ImageCurationRating records.")
