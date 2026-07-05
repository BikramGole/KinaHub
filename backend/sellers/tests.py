from django.test import TestCase, Client
from users.models import User
from products.models import Product, Category, Brand
from sellers.models import Store, SellerProfile


class SellerRegressionTests(TestCase):
    """Regression tests for seller endpoints."""

    def setUp(self):
        self.client = Client()
        self.seller = User.objects.create_user(
            username="seller", email="seller@test.com", password="seller123",
            role="seller",
        )
        self.profile = SellerProfile.objects.create(
            user=self.seller, business_name="Test Biz", status="verified",
        )
        self.store = Store.objects.create(
            name="Test Store", slug="test-store",
            description="Test", is_active=True,
            seller=self.profile,
        )
        self.cat = Category.objects.create(name="Test Cat", slug="test-cat")
        self.brand = Brand.objects.create(name="Test Brand")
        self.product = Product.objects.create(
            name="Test Product", slug="test-product",
            category=self.cat, brand=self.brand, store=self.store,
            price=1000, stock=10,
        )

    def _auth_seller(self):
        resp = self.client.post("/api/token/", {
            "email": "seller@test.com", "password": "seller123",
            "seller_code": "mafia",
        }, content_type="application/json")
        self.assertEqual(resp.status_code, 200)
        uid = resp.json()["user_id"]
        user = User.objects.get(pk=uid)
        otp = user.otp_code
        resp2 = self.client.post("/api/token/verify-2fa/", {
            "user_id": uid, "otp_code": otp,
        }, content_type="application/json")
        self.assertEqual(resp2.status_code, 200)
        token = resp2.json()["access"]
        return {"HTTP_AUTHORIZATION": f"Bearer {token}"}

    def test_stores_returns_array(self):
        """Bug 2: Stores must return plain array, not paginated dict."""
        resp = self.client.get("/api/sellers/stores/")
        self.assertEqual(resp.status_code, 200)
        self.assertIsInstance(resp.json(), list)

    def test_stores_inactive_not_returned(self):
        self.store.is_active = False
        self.store.save()
        resp = self.client.get("/api/sellers/stores/")
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.json(), [])

    def test_stores_empty_list(self):
        Store.objects.all().delete()
        resp = self.client.get("/api/sellers/stores/")
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.json(), [])

    def test_store_detail(self):
        resp = self.client.get("/api/sellers/stores/test-store/")
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.json()["slug"], "test-store")

    def test_store_detail_404(self):
        resp = self.client.get("/api/sellers/stores/nonexistent/")
        self.assertEqual(resp.status_code, 404)

    def test_seller_dashboard(self):
        headers = self._auth_seller()
        resp = self.client.get(
            "/api/sellers/profiles/dashboard/", **headers
        )
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        expected_keys = {
            "store", "products", "active_products", "orders",
        }
        self.assertTrue(expected_keys.issubset(data.keys()))

    def test_seller_dashboard_unauthenticated(self):
        resp = self.client.get("/api/sellers/profiles/dashboard/")
        self.assertEqual(resp.status_code, 401)

    def test_seller_profiles_list_requires_auth(self):
        resp = self.client.get("/api/sellers/profiles/")
        self.assertEqual(resp.status_code, 401)

    def test_seller_profiles_list_for_seller(self):
        headers = self._auth_seller()
        resp = self.client.get("/api/sellers/profiles/", **headers)
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertIn("results", data)
        self.assertIsInstance(data["results"], list)

    def test_seller_profiles_list_for_non_seller(self):
        user = User.objects.create_user(
            username="regular", email="regular@test.com", password="test123",
        )
        resp = self.client.post("/api/token/", {
            "email": "regular@test.com", "password": "test123",
        }, content_type="application/json")
        uid = resp.json()["user_id"]
        user_obj = User.objects.get(pk=uid)
        resp2 = self.client.post("/api/token/verify-2fa/", {
            "user_id": uid, "otp_code": user_obj.otp_code,
        }, content_type="application/json")
        token = resp2.json()["access"]
        resp3 = self.client.get(
            "/api/sellers/profiles/",
            HTTP_AUTHORIZATION=f"Bearer {token}",
        )
        self.assertEqual(resp3.status_code, 403)
