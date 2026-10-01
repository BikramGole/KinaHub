from django.test import TestCase
from rest_framework.test import APIClient


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
