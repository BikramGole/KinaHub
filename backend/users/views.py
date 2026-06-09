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
        role = request.data.get("role", "customer")
        business_name = request.data.get("business_name", "")

        if not access_token:
            return Response({"error": "No access token provided"}, status=400)

        if role == "seller" and not business_name:
            return Response({"error": "Business name is required for seller accounts."}, status=400)

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
                    role=role,
                )
                from crm.models import SellerRecord
                from sellers.models import SellerProfile, Store
                
                if role == "seller":
                    seller = SellerProfile.objects.create(user=user, business_name=business_name)
                    Store.objects.create(seller=seller, name=business_name)
                    SellerRecord.objects.create(seller=seller)
                else:
                    CustomerProfile.objects.create(user=user, full_name=f"{first_name} {last_name}".strip())
                    CustomerRecord.objects.create(user=user)
                
                ActivityLog.objects.create(
                    actor=user, verb="registered_with_google",
                    target_type="user", target_id=str(user.id),
                    metadata={"role": role}
                )

            refresh = RefreshToken.for_user(user)
            return Response({
                "access": str(refresh.access_token),
                "refresh": str(refresh),
                "user": UserSerializer(user).data,
            })

        except Exception as e:
            return Response({"error": f"Google login failed: {str(e)}"}, status=400)


from rest_framework_simplejwt.views import TokenObtainPairView
from django.utils import timezone
import random
from django.core.mail import send_mail, EmailMultiAlternatives
from django.template.loader import render_to_string
from django.shortcuts import get_object_or_404
from rest_framework_simplejwt.tokens import RefreshToken

class LoginWithOTPView(TokenObtainPairView):
    def post(self, request, *args, **kwargs):
        # Validate credentials (email & password)
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        user = serializer.user
        otp = f"{random.randint(100000, 999999)}"
        user.otp_code = otp
        user.otp_created_at = timezone.now()
        user.save(update_fields=['otp_code', 'otp_created_at'])
        
        subject = "Your KinaHub Login Code"
        from_email = settings.DEFAULT_FROM_EMAIL
        to_email = user.email
        
        html_content = render_to_string("emails/otp_login.html", {"otp": otp})
        text_content = f"Your login verification code is: {otp}. It expires in 5 minutes."
        
        msg = EmailMultiAlternatives(subject, text_content, from_email, [to_email])
        msg.attach_alternative(html_content, "text/html")
        msg.send(fail_silently=False)
        
        return Response({
            "require_2fa": True,
            "user_id": user.id,
            "message": "A verification code has been sent to your email."
        })

class VerifyOTPView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        user_id = request.data.get("user_id")
        otp_code = request.data.get("otp_code")
        
        if not user_id or not otp_code:
            return Response({"error": "Missing user_id or otp_code"}, status=400)
            
        user = User.objects.filter(id=user_id).first()
        if not user:
            return Response({"error": "Invalid user"}, status=400)
            
        if user.otp_code != str(otp_code):
            return Response({"error": "Invalid verification code"}, status=400)
            
        if not user.otp_created_at or (timezone.now() - user.otp_created_at).total_seconds() > 300:
            return Response({"error": "Verification code expired"}, status=400)
            
        user.otp_code = ""
        user.otp_created_at = None
        user.save(update_fields=['otp_code', 'otp_created_at'])
        
        refresh = RefreshToken.for_user(user)
        return Response({
            "access": str(refresh.access_token),
            "refresh": str(refresh),
            "user": UserSerializer(user).data
        })


class RequestDeleteAccountView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        user = request.user
        otp = f"{random.randint(100000, 999999)}"
        user.otp_code = otp
        user.otp_created_at = timezone.now()
        user.save(update_fields=['otp_code', 'otp_created_at'])

        subject = "KinaHub — Account Deletion Verification"
        from_email = settings.DEFAULT_FROM_EMAIL
        to_email = user.email

        html_content = render_to_string("emails/otp_delete_account.html", {
            "otp": otp,
            "email": user.email,
        })
        text_content = (
            f"You requested to delete your KinaHub account ({user.email}).\n"
            f"Your verification code is: {otp}\n"
            f"This code expires in 5 minutes.\n\n"
            f"If you did not request this, please change your password immediately."
        )

        msg = EmailMultiAlternatives(subject, text_content, from_email, [to_email])
        msg.attach_alternative(html_content, "text/html")
        msg.send(fail_silently=False)

        return Response({"message": "A verification code has been sent to your email."})


class ConfirmDeleteAccountView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        otp_code = request.data.get("otp_code")
        if not otp_code:
            return Response({"error": "Verification code is required."}, status=400)

        user = request.user

        if user.otp_code != str(otp_code):
            return Response({"error": "Invalid verification code."}, status=400)

        if not user.otp_created_at or (timezone.now() - user.otp_created_at).total_seconds() > 300:
            return Response({"error": "Verification code has expired."}, status=400)

        # Permanently delete
        user.delete()
        return Response({"message": "Your account has been permanently deleted."})

