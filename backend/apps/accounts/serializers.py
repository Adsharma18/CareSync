from rest_framework import serializers
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from .models import CustomUser


class UserSerializer(serializers.ModelSerializer):
    """
    Public user representation serializer.
    Omits sensitive authentication information such as password hashes.
    """
    class Meta:
        model = CustomUser
        fields = ('id', 'full_name', 'email', 'created_at')
        read_only_fields = ('id', 'created_at')


class RegisterSerializer(serializers.ModelSerializer):
    """
    User registration serializer.
    Accepts full_name (or name alias), email, and password.
    Enforces email uniqueness and Django password validators.
    """
    password = serializers.CharField(
        write_only=True,
        required=True,
        style={'input_type': 'password'},
        help_text="User password meeting complexity requirements."
    )
    name = serializers.CharField(
        write_only=True,
        required=False,
        help_text="Alias for full_name."
    )

    class Meta:
        model = CustomUser
        fields = ('id', 'full_name', 'name', 'email', 'password', 'created_at')
        read_only_fields = ('id', 'created_at')
        extra_kwargs = {
            'full_name': {'required': False}
        }

    def validate_email(self, value):
        normalized_email = value.strip().lower()
        if CustomUser.objects.filter(email__iexact=normalized_email).exists():
            raise serializers.ValidationError("A user with that email already exists.")
        return normalized_email

    def validate_password(self, value):
        user_instance = CustomUser(
            email=self.initial_data.get('email'),
            full_name=self.initial_data.get('full_name') or self.initial_data.get('name')
        )
        try:
            validate_password(value, user=user_instance)
        except DjangoValidationError as err:
            raise serializers.ValidationError(list(err.messages))
        return value

    def validate(self, attrs):
        # Support both 'name' and 'full_name' for flexibility
        if not attrs.get('full_name'):
            if attrs.get('name'):
                attrs['full_name'] = attrs.pop('name')
            else:
                raise serializers.ValidationError({"full_name": ["This field is required."]})
        elif 'name' in attrs:
            attrs.pop('name')

        return attrs

    def create(self, validated_data):
        user = CustomUser.objects.create_user(
            email=validated_data['email'],
            password=validated_data['password'],
            full_name=validated_data['full_name']
        )
        return user


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    """
    Custom SimpleJWT login serializer ensuring case-insensitive email matching.
    """
    def validate(self, attrs):
        if 'email' in attrs:
            attrs['email'] = attrs['email'].strip().lower()
        return super().validate(attrs)
