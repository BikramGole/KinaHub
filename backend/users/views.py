from rest_framework import permissions, viewsets
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.views import APIView
from .models import Address, CustomerProfile, User
from .serializers import AddressSerializer, CustomerProfileSerializer, RegisterSerializer, UserSerializer


class RegisterView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        return Response(serializer.to_representation(user), status=201)


@api_view(["GET"])
@permission_classes([permissions.IsAuthenticated])
def me(request):
    return Response(UserSerializer(request.user).data)


class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all().order_by("-date_joined")
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAdminUser]


class AddressViewSet(viewsets.ModelViewSet):
    serializer_class = AddressSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        if self.request.user.effective_role == "admin":
            return Address.objects.select_related("user")
        return Address.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class CustomerProfileViewSet(viewsets.ModelViewSet):
    serializer_class = CustomerProfileSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        if self.request.user.effective_role == "admin":
            return CustomerProfile.objects.select_related("user")
        return CustomerProfile.objects.filter(user=self.request.user)

import requests as http_requests
from rest_framework_simplejwt.tokens import RefreshToken
from django.conf import settings
from crm.models import ActivityLog, CustomerRecord

class GoogleLoginView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        access_token = request.data.get("access_token")
        if not access_token:
            return Response({"error": "No access token provided"}, status=400)

        try:
            # Fetch user info from Google using the access token
            resp = http_requests.get(
                "https://www.googleapis.com/oauth2/v3/userinfo",
                headers={"Authorization": f"Bearer {access_token}"},
                timeout=10,
            )
            if resp.status_code != 200:
                return Response({"error": "Invalid Google token"}, status=400)

            info = resp.json()
            email = info.get("email")
            first_name = info.get("given_name", "")
            last_name = info.get("family_name", "")

            if not email:
                return Response({"error": "Google account missing email"}, status=400)

            user = User.objects.filter(email=email).first()
            if not user:
                user = User.objects.create_user(
                    username=email,
                    email=email,
                    first_name=first_name,
                    last_name=last_name,
                    role="customer",
                )
                CustomerProfile.objects.create(user=user, full_name=f"{first_name} {last_name}".strip())
                CustomerRecord.objects.create(user=user)
                ActivityLog.objects.create(
                    actor=user, verb="registered_with_google",
                    target_type="user", target_id=str(user.id),
                )

            refresh = RefreshToken.for_user(user)
            return Response({
                "access": str(refresh.access_token),
                "refresh": str(refresh),
                "user": UserSerializer(user).data,
            })

        except Exception as e:
            return Response({"error": f"Google login failed: {str(e)}"}, status=400)

