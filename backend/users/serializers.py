from rest_framework import serializers
from rest_framework_simplejwt.tokens import RefreshToken
from crm.models import ActivityLog, CustomerRecord, SellerRecord
from sellers.models import SellerProfile, Store
from .models import Address, CustomerProfile, User
from .email_utils import send_otp_email, send_welcome_email
from django.conf import settings


class UserSerializer(serializers.ModelSerializer):
    effective_role = serializers.CharField(read_only=True)

    class Meta:
        model = User
        fields = ["id", "username", "email", "first_name", "last_name", "phone", "address", "role", "effective_role", "is_active", "date_joined"]
        read_only_fields = ["id", "effective_role", "is_active", "date_joined"]


class RegisterSerializer(serializers.Serializer):
    ROLE_CHOICES = ("customer", "seller")

    name = serializers.CharField(max_length=200)
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, min_length=8)
    role = serializers.ChoiceField(choices=ROLE_CHOICES)
    business_name = serializers.CharField(max_length=220, required=False, allow_blank=True)
    seller_code = serializers.CharField(max_length=50, required=False, allow_blank=True, write_only=True)

    def validate_email(self, value):
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError("A user with this email already exists.")
        return value

    def validate(self, attrs):
        if attrs["role"] == "seller":
            if not attrs.get("business_name"):
                raise serializers.ValidationError({"business_name": "Business name is required for seller accounts."})
            if attrs.get("seller_code") != getattr(settings, 'SELLER_REGISTRATION_CODE', 'mafia'):
                raise serializers.ValidationError({"seller_code": "Invalid seller code. Unauthorized access prevented."})
        return attrs

    def create(self, validated_data):
        name = validated_data["name"].strip()
        first_name, _, last_name = name.partition(" ")
        user = User.objects.create_user(
            username=validated_data["email"],
            email=validated_data["email"],
            password=validated_data["password"],
            role=validated_data["role"],
            first_name=first_name,
            last_name=last_name,
        )

        if user.role == User.ROLE_CUSTOMER:
            CustomerProfile.objects.create(user=user, full_name=name)
            CustomerRecord.objects.create(user=user)
        else:
            seller = SellerProfile.objects.create(user=user, business_name=validated_data["business_name"])
            Store.objects.create(seller=seller, name=validated_data["business_name"])
            SellerRecord.objects.create(seller=seller)

        ActivityLog.objects.create(actor=user, verb="registered", target_type="user", target_id=str(user.id), metadata={"role": user.role})
        try:
            send_welcome_email(user.email, name)
        except Exception:
            pass
        return user

    def to_representation(self, user):
        import random
        from django.utils import timezone

        otp = f"{random.randint(100000, 999999)}"
        user.otp_code = otp
        user.otp_created_at = timezone.now()
        user.save(update_fields=['otp_code', 'otp_created_at'])

        send_otp_email(user.email, otp, "Your KinaHub Registration Code")

        return {
            "require_2fa": True,
            "user_id": user.id,
            "message": "A verification code has been sent to your email."
        }


class AddressSerializer(serializers.ModelSerializer):
    class Meta:
        model = Address
        fields = "__all__"
        read_only_fields = ["id", "user", "created_at"]


class CustomerProfileSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)

    class Meta:
        model = CustomerProfile
        fields = ["id", "user", "full_name", "notes", "lifetime_value", "created_at", "updated_at"]
        read_only_fields = ["id", "user", "lifetime_value", "created_at", "updated_at"]
