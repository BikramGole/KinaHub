from django.test import TestCase
from unittest.mock import patch
from rest_framework.test import APIClient
from users.models import User


class GoogleLoginSecurityTests(TestCase):
    def test_google_login_rejects_privileged_role(self):
        response = APIClient().post(
            "/api/auth/google/",
            {
                "access_token": "__local_demo__admin",
                "email": "admin-escalation@test.com",
                "role": "admin",
            },
            format="json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.json()["error"], "Invalid account role.")


class RegistrationSecurityTests(TestCase):
    def test_register_rejects_password_that_fails_django_validators(self):
        response = APIClient().post(
            "/api/auth/register/",
            {
                "name": "Weak Password",
                "email": "weak-password@test.com",
                "password": "12345678",
                "role": "customer",
            },
            format="json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn("password", response.json())
        self.assertFalse(User.objects.filter(email="weak-password@test.com").exists())

    @patch("users.serializers.send_otp_email", side_effect=OSError("mail unavailable"))
    def test_registration_succeeds_when_otp_email_is_unavailable(self, _send_otp_email):
        response = APIClient().post(
            "/api/auth/register/",
            {
                "name": "Reliable Customer",
                "email": "reliable-customer@test.com",
                "password": "A-safe-password-2026!",
                "role": "customer",
            },
            format="json",
        )

        self.assertEqual(response.status_code, 201)
        self.assertTrue(User.objects.filter(email="reliable-customer@test.com").exists())
