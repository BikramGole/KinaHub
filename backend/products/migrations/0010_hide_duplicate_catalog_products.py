from django.db import migrations


def hide_duplicate_catalog_products(apps, schema_editor):
    """Retain legacy duplicates as inactive records instead of deleting them."""
    Product = apps.get_model("products", "Product")
    seen = set()
    duplicate_ids = []

    for product in Product.objects.order_by("store_id", "name", "created_at", "id").iterator():
        key = (product.store_id, product.name.strip().casefold())
        if key in seen:
            duplicate_ids.append(product.pk)
        else:
            seen.add(key)

    Product.objects.filter(pk__in=duplicate_ids, is_active=True).update(is_active=False)


class Migration(migrations.Migration):

    dependencies = [
        ("products", "0009_product_products_pr_is_acti_2fee29_idx_and_more"),
    ]

    operations = [
        migrations.RunPython(hide_duplicate_catalog_products, migrations.RunPython.noop),
    ]
