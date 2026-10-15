from django.test import TestCase, Client
from rest_framework_simplejwt.tokens import RefreshToken
from users.models import User
from products.models import Product, Category
from sellers.models import Store, SellerProfile
from .models import Wishlist


class WishlistApiTests(TestCase):
    def setUp(self):
        self.client = Client()
        self.cat = Category.objects.create(name="Wish Cat", slug="wish-cat")
        self.seller_user = User.objects.create_user(
            username="wish-seller", email="wish-seller@test.com",
            password="test123", role="seller",
        )
        self.seller_profile = SellerProfile.objects.create(
            user=self.seller_user, business_name="Wish Biz", status="verified",
        )
        self.store = Store.objects.create(
            name="Wish Store", slug="wish-store", description="Test",
            is_active=True, seller=self.seller_profile,
        )
        self.product = Product.objects.create(
            name="Wish Product", slug="wish-product", category=self.cat,
            store=self.store, price=999, stock=10, rating=4.0,
        )
        self.user = User.objects.create_user(
            username="wisher", email="wisher@test.com",
            password="test123", role="customer",
        )
        self.token = str(RefreshToken.for_user(self.user).access_token)
        self.auth = {"HTTP_AUTHORIZATION": f"Bearer {self.token}"}

    def test_requires_auth(self):
        resp = self.client.get("/api/wishlist/")
        self.assertEqual(resp.status_code, 401)

    def test_empty_wishlist_returns_array(self):
        resp = self.client.get("/api/wishlist/", **self.auth)
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertIn("products", data)
        self.assertEqual(data["products"], [])
        self.assertEqual(data["count"], 0)

    def test_add_and_remove_flow(self):
        add = self.client.post(
            "/api/wishlist/add/",
            data={"product_slug": "wish-product"},
            content_type="application/json",
            **self.auth,
        )
        self.assertEqual(add.status_code, 200)
        self.assertEqual(add.json()["count"], 1)

        check = self.client.get("/api/wishlist/check/?product=wish-product", **self.auth)
        self.assertEqual(check.json(), {"in_wishlist": True})

        remove = self.client.post(
            "/api/wishlist/remove/",
            data={"product_slug": "wish-product"},
            content_type="application/json",
            **self.auth,
        )
        self.assertEqual(remove.status_code, 200)
        self.assertEqual(remove.json()["count"], 0)

    def test_add_invalid_slug_rejected(self):
        resp = self.client.post(
            "/api/wishlist/add/",
            data={"product_slug": "does-not-exist"},
            content_type="application/json",
            **self.auth,
        )
        self.assertEqual(resp.status_code, 400)

    def test_clear_empties_wishlist(self):
        wishlist, _ = Wishlist.objects.get_or_create(user=self.user)
        wishlist.products.add(self.product)
        resp = self.client.post("/api/wishlist/clear/", content_type="application/json", **self.auth)
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.json()["count"], 0)
