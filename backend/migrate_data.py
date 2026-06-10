import os
import django
from django.core.files import File

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from users.models import User
from products.models import Category, Product, ProductImage
from sellers.models import Store

def copy_data():
    print("Copying Users...")
    users = User.objects.using('old').all()
    for user in users:
        # Check if exists
        if not User.objects.using('default').filter(id=user.id).exists():
            new_user = User(
                id=user.id,
                password=user.password,
                last_login=user.last_login,
                is_superuser=user.is_superuser,
                username=user.username,
                first_name=user.first_name,
                last_name=user.last_name,
                email=user.email,
                is_staff=user.is_staff,
                is_active=user.is_active,
                date_joined=user.date_joined,
                role=user.role,
                phone=user.phone,
                address=user.address,
            )
            new_user.save(using='default')
            print(f"Copied user {new_user.username}")

    print("Copying Categories...")
    categories = Category.objects.using('old').all()
    for cat in categories:
        if not Category.objects.using('default').filter(id=cat.id).exists():
            new_cat = Category(
                id=cat.id,
                name=cat.name,
                slug=cat.slug,
                description=cat.description,
            )
            new_cat.save(using='default')
            print(f"Copied category {new_cat.name}")

    print("Copying Stores...")
    from sellers.models import SellerProfile
    stores = Store.objects.using('old').all()
    for store in stores:
        if not Store.objects.using('default').filter(id=store.id).exists():
            try:
                seller_user = User.objects.using('default').get(id=store.seller_id)
            except User.DoesNotExist:
                print(f"Skipping store {store.name} because seller {store.seller_id} does not exist")
                continue
            
            seller_profile, _ = SellerProfile.objects.using('default').get_or_create(
                user=seller_user,
                defaults={'business_name': store.name}
            )

            new_store = Store(
                id=store.id,
                seller=seller_profile,
                name=store.name,
                slug=store.slug,
                description=store.description,
                logo_url=store.logo_url,
                banner_url=store.banner_url,
                support_email=store.support_email,
                support_phone=store.support_phone,
                address=store.address,
                area=store.area,
                map_url=store.map_url,
                is_active=store.is_active,
                created_at=store.created_at,
                updated_at=store.updated_at,
            )
            new_store.save(using='default')
            print(f"Copied store {new_store.name}")

    print("Copying Products...")
    products = Product.objects.using('old').all()
    for prod in products:
        if not Product.objects.using('default').filter(id=prod.id).exists():
            # fetch the related objects from default DB
            try:
                store = Store.objects.using('default').get(id=prod.store_id)
                category = Category.objects.using('default').get(id=prod.category_id)
            except (Store.DoesNotExist, Category.DoesNotExist):
                print(f"Skipping product {prod.name} due to missing relation")
                continue
            
            new_prod = Product(
                id=prod.id,
                store=store,
                category=category,
                name=prod.name,
                slug=prod.slug,
                description=prod.description,
                price=prod.price,
                discount_price=prod.discount_price,
                stock=prod.stock,
                is_active=prod.is_active,
                is_featured=prod.is_featured,
                rating=getattr(prod, 'rating', 0.0),
                base_delivery_fee=getattr(prod, 'base_delivery_fee', 0.0),
                delivery_time_estimate=getattr(prod, 'delivery_time_estimate', '1-2 days'),
                created_at=prod.created_at,
                updated_at=prod.updated_at,
            )
            
            new_prod.save(using='default')
            print(f"Copied product {new_prod.name}")

            # Now copy ProductImages
            old_images = ProductImage.objects.using('old').filter(product_id=prod.id)
            for old_img in old_images:
                new_img = ProductImage(
                    product=new_prod,
                    alt_text=old_img.alt_text,
                    is_primary=old_img.is_primary,
                )
                if old_img.image_url:
                    try:
                        import cloudinary.uploader
                        img_path = old_img.image_url.lstrip('/')
                        full_path = os.path.join('media', img_path)
                        if os.path.exists(full_path):
                            print(f"Uploading {full_path} to Cloudinary...")
                            result = cloudinary.uploader.upload(full_path)
                            new_img.image_url = result['secure_url']
                        else:
                            new_img.image_url = old_img.image_url
                    except Exception as e:
                        print(f"Could not copy image for {prod.name}: {e}")
                new_img.save(using='default')

if __name__ == '__main__':
    copy_data()
