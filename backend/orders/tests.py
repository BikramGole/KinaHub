from django.test import TestCase, Client
from rest_framework import status
from users.models import User
from products.models import Product, Category, Brand
from sellers.models import Store, SellerProfile
from orders.models import Order
import json


class OrderRegressionTests(TestCase):
    """Regression tests for order endpoints."""

    def setUp(self):
        self.client = Client()
        self.cat = Category.objects.create(name="Test Cat", slug="test-cat")
        self.brand = Brand.objects.create(name="Test Brand")
        self.seller_user = User.objects.create_user(
            username="seller", email="seller@test.com", password="test123", role="seller",
        )
        self.seller_profile = SellerProfile.objects.create(
            user=self.seller_user, business_name="Test Biz", status="verified",
        )
        self.store = Store.objects.create(
            name="Test Store", slug="test-store",
            description="Test", is_active=True,
            seller=self.seller_profile,
        )
        self.product = Product.objects.create(
            name="Test Product", slug="test-product",
            category=self.cat, brand=self.brand, store=self.store,
            price=1000, stock=10,
        )
        self.user = User.objects.create_user(
            username="customer", email="test@test.com", password="test123",
            role="customer",
        )
        self.order = Order.objects.create(
            user=self.user, total_price=1000,
            payment_method="cod", shipping_address="Test",
        )

    def _auth_header(self):
        resp = self.client.post("/api/token/", {
            "email": "test@test.com", "password": "test123",
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

    def test_orders_summary_returns_correct_shape(self):
        """Bug 4: Orders summary must return dict with correct keys."""
        headers = self._auth_header()
        resp = self.client.get(
            "/api/orders/summary/", **headers
        )
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        expected_keys = {"orders", "pending", "processing", "delivered", "revenue"}
        self.assertTrue(expected_keys.issubset(data.keys()))
        self.assertIsInstance(data["orders"], int)
        self.assertIsInstance(data["revenue"], (int, float, str))

    def test_orders_summary_with_no_orders(self):
        """Summary returns zeros when user has no orders."""
        new_user = User.objects.create_user(
            username="empty", email="empty@test.com", password="test123",
        )
        resp = self.client.post("/api/token/", {
            "email": "empty@test.com", "password": "test123",
        }, content_type="application/json")
        uid = resp.json()["user_id"]
        user = User.objects.get(pk=uid)
        headers = {"HTTP_AUTHORIZATION": f"Bearer {self._get_token(user, uid)}"}
        resp = self.client.get("/api/orders/summary/", **headers)
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertEqual(data["orders"], 0)
        self.assertIn(str(data["revenue"]), ("0", 0))

    def _get_token(self, user, uid):
        otp = user.otp_code
        resp = self.client.post("/api/token/verify-2fa/", {
            "user_id": uid, "otp_code": otp,
        }, content_type="application/json")
        return resp.json()["access"]

    def test_orders_list_returns_array(self):
        """Orders list must return plain array."""
        headers = self._auth_header()
        resp = self.client.get("/api/orders/", **headers)
        self.assertEqual(resp.status_code, 200)
        self.assertIsInstance(resp.json(), list)

    def test_orders_create_201(self):
        """Authenticated user can create an order."""
        headers = self._auth_header()
        resp = self.client.post(
            "/api/orders/",
            data=json.dumps({
                "items": [{"product_id": self.product.id, "quantity": 1}],
                "payment_method": "cod",
                "shipping_address": "Test Address",
            }),
            content_type="application/json",
            **headers,
        )
        self.assertEqual(resp.status_code, 201)
        data = resp.json()
        self.assertIn("id", data)
        self.assertEqual(data["status"], "pending")

    def test_orders_create_fails_without_auth(self):
        resp = self.client.post(
            "/api/orders/",
            data=json.dumps({
                "items": [{"product_id": self.product.id, "quantity": 1}],
                "payment_method": "cod",
                "shipping_address": "Test",
            }),
            content_type="application/json",
        )
        self.assertEqual(resp.status_code, 401)

    def test_orders_create_fails_without_stock(self):
        self.product.stock = 0
        self.product.save()
        headers = self._auth_header()
        resp = self.client.post(
            "/api/orders/",
            data=json.dumps({
                "items": [{"product_id": self.product.id, "quantity": 1}],
                "payment_method": "cod",
                "shipping_address": "Test",
            }),
            content_type="application/json",
            **headers,
        )
        self.assertEqual(resp.status_code, 400)

    def test_orders_summary_authenticated_only(self):
        resp = self.client.get("/api/orders/summary/")
        self.assertEqual(resp.status_code, 401)

    def test_orders_list_authenticated_only(self):
        resp = self.client.get("/api/orders/")
        self.assertEqual(resp.status_code, 401)

    def test_order_detail(self):
        headers = self._auth_header()
        resp = self.client.get(
            f"/api/orders/{self.order.id}/", **headers
        )
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.json()["id"], self.order.id)

    def test_order_detail_404(self):
        headers = self._auth_header()
        resp = self.client.get("/api/orders/99999/", **headers)
        self.assertEqual(resp.status_code, 404)
