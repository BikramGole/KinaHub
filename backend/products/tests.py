from django.test import TestCase, Client
from django.urls import reverse
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework import status
from users.models import User
from products.models import Product, Category, Brand, Review
from sellers.models import Store, SellerProfile
import json


class RegressionTests(TestCase):
    """Regression tests for fixed bugs."""

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
            price=1000, stock=10, rating=4.5,
        )
        self.product2 = Product.objects.create(
            name="Test Product 2", slug="test-product-2",
            category=self.cat, brand=self.brand, store=self.store,
            price=500, stock=5, rating=3.0,
        )
        self.user = User.objects.create_user(
            username="customer", email="test@test.com", password="test123",
            role="customer",
        )
        Review.objects.create(
            product=self.product, rating=5,
            comment="Great!", user=self.user,
        )

    def test_categories_returns_array(self):
        """Bug 3: Categories must return plain array, not paginated dict."""
        resp = self.client.get("/api/products/categories/")
        self.assertEqual(resp.status_code, 200)
        self.assertIsInstance(resp.json(), list)

    def test_brands_returns_array(self):
        """Bug 3: Brands must return plain array, not paginated dict."""
        resp = self.client.get("/api/products/brands/")
        self.assertEqual(resp.status_code, 200)
        self.assertIsInstance(resp.json(), list)

    def test_reviews_returns_array(self):
        """Bug 3: Reviews must return plain array, not paginated dict."""
        resp = self.client.get("/api/products/reviews/")
        self.assertEqual(resp.status_code, 200)
        self.assertIsInstance(resp.json(), list)

    def test_similar_products_returns_200(self):
        """Bug 1: Similar products must return 200, not 500 FieldError."""
        resp = self.client.get(
            f"/api/products/items/{self.product.slug}/similar/"
        )
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertIsInstance(data, list)

    def test_similar_products_empty_list_for_singleton(self):
        """Similar products for only product in DB returns empty list."""
        self.product2.delete()
        resp = self.client.get(
            f"/api/products/items/{self.product.slug}/similar/"
        )
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.json(), [])

    def test_inactive_products_are_hidden_from_catalog_and_recommendations(self):
        self.product2.is_active = False
        self.product2.save(update_fields=["is_active"])

        catalog = self.client.get("/api/products/items/")
        recommendations = self.client.get(f"/api/products/items/{self.product.slug}/similar/")

        self.assertNotIn(self.product2.slug, [item["slug"] for item in catalog.json()])
        self.assertNotIn(self.product2.slug, [item["slug"] for item in recommendations.json()])

    def test_products_list_returns_array(self):
        """Product listing must return plain array."""
        resp = self.client.get("/api/products/items/")
        self.assertEqual(resp.status_code, 200)
        self.assertIsInstance(resp.json(), list)

    def test_products_list_filters_by_category(self):
        resp = self.client.get("/api/products/items/?category=test-cat")
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(len(resp.json()), 2)

    def test_products_list_filters_by_search(self):
        resp = self.client.get("/api/products/items/?q=Test Product")
        self.assertEqual(resp.status_code, 200)
        self.assertGreaterEqual(len(resp.json()), 1)

    def test_products_list_empty_category(self):
        resp = self.client.get("/api/products/items/?category=nonexistent")
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.json(), [])

    def test_product_detail_returns_200(self):
        resp = self.client.get(f"/api/products/items/{self.product.slug}/")
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.json()["slug"], self.product.slug)

    def test_product_detail_404_for_missing_slug(self):
        resp = self.client.get("/api/products/items/nonexistent-slug/")
        self.assertEqual(resp.status_code, 404)

    def test_homepage_returns_dict_with_keys(self):
        resp = self.client.get("/api/products/homepage/")
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        expected_keys = {
            "random", "newest", "laptops", "fashion",
            "groceries", "books", "categories", "featured",
        }
        self.assertTrue(expected_keys.issubset(data.keys()))

    def test_suggestions_returns_list(self):
        resp = self.client.get("/api/products/suggestions/?q=test")
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertIn("suggestions", data)
        self.assertIsInstance(data["suggestions"], list)

    def test_suggestions_single_char_returns_empty(self):
        resp = self.client.get("/api/products/suggestions/?q=a")
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.json()["suggestions"], [])

    def test_reviews_filtered_by_product(self):
        resp = self.client.get(
            f"/api/products/reviews/?product={self.product.slug}"
        )
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(len(resp.json()), 1)

    def test_reviews_no_filter_returns_all(self):
        resp = self.client.get("/api/products/reviews/")
        self.assertEqual(resp.status_code, 200)
        self.assertGreaterEqual(len(resp.json()), 1)

    def test_user_cannot_edit_another_users_review(self):
        review = Review.objects.get(product=self.product, user=self.user)
        other_user = User.objects.create_user(
            username="other-customer", email="other@test.com", password="test123",
        )
        token = RefreshToken.for_user(other_user).access_token

        response = self.client.patch(
            f"/api/products/reviews/{review.id}/",
            data={"comment": "Changed by another user"},
            content_type="application/json",
            HTTP_AUTHORIZATION=f"Bearer {token}",
        )

        self.assertEqual(response.status_code, 403)
        review.refresh_from_db()
        self.assertEqual(review.comment, "Great!")

    def test_ping(self):
        resp = self.client.get("/ping/")
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.json(), {"status": "ok"})

    def test_maintenance_endpoint_is_not_publicly_routable(self):
        """A removed maintenance endpoint must not expose command execution."""
        resp = self.client.get("/run-seed/?cmd=eval&code=raise%20SystemExit")
        self.assertEqual(resp.status_code, 404)
