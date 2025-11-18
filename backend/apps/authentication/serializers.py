from decimal import Decimal, InvalidOperation, ROUND_HALF_UP

from rest_framework import serializers
from rest_framework_simplejwt.tokens import RefreshToken
from django.db.models import Q
from .models import User, Role
from apps.utils import VietnamDateTimeField


class CoordinateField(serializers.Field):
    """Serializer field that accepts float/decimal strings and rounds to 6 decimals."""

    default_error_messages = {
        'invalid': 'Tọa độ không hợp lệ',
        'range': 'Tọa độ nằm ngoài phạm vi cho phép',
    }

    def __init__(self, *, allow_null: bool = True, coord_type: str = 'lat', **kwargs):
        super().__init__(allow_null=allow_null, required=False, **kwargs)
        self.coord_type = coord_type

    def to_internal_value(self, data):
        if data in (None, '', 'null'):
            return None

        try:
            decimal_value = Decimal(str(data))
        except (InvalidOperation, ValueError, TypeError):
            self.fail('invalid')

        quantized = decimal_value.quantize(Decimal('0.000001'), rounding=ROUND_HALF_UP)

        if self.coord_type == 'lat' and not (-90 <= quantized <= 90):
            self.fail('range')
        if self.coord_type == 'lon' and not (-180 <= quantized <= 180):
            self.fail('range')

        return quantized

    def to_representation(self, value):
        if value is None:
            return None
        return float(value)


class LoginSerializer(serializers.Serializer):
    # Accept username, email, or phone number as identifier
    email = serializers.CharField()
    password = serializers.CharField()

    def validate(self, attrs):
        identifier = attrs.get('email')
        password = attrs.get('password')

        if not identifier or not password:
            msg = 'Must include "email" and "password".'
            raise serializers.ValidationError(msg, code='authorization')

        # Lookup by email, username, or phone number
        try:
            user = User.objects.get(
                Q(email__iexact=identifier) |
                Q(username__iexact=identifier) |
                Q(phone_number__iexact=identifier)
            )
        except User.DoesNotExist:
            msg = 'Unable to log in with provided credentials.'
            raise serializers.ValidationError(msg, code='authorization')

        # Verify password (plaintext comparison since passwords are stored as plaintext)
        if user.password != password:
            msg = 'Unable to log in with provided credentials.'
            raise serializers.ValidationError(msg, code='authorization')

        attrs['user'] = user
        return attrs


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, validators=[], max_length=30)
    password_confirm = serializers.CharField(write_only=True, max_length=30)
    latitude = CoordinateField(coord_type='lat')
    longitude = CoordinateField(coord_type='lon')
    
    class Meta:
        model = User
        fields = ['email', 'username', 'fullname', 'phone_number', 'address', 'latitude', 'longitude', 'password', 'password_confirm']
    
    def validate(self, attrs):
        if attrs['password'] != attrs['password_confirm']:
            raise serializers.ValidationError("Passwords don't match.")
        return attrs
    
    def create(self, validated_data):
        # Remove password confirmation
        validated_data.pop('password_confirm', None)
        # Extract raw password to store directly
        raw_password = validated_data.pop('password')
        # Get or create customer role
        customer_role, _ = Role.objects.get_or_create(role_name='Khách hàng')
        # Create user instance without hashing
        user = User(
            email=validated_data['email'],
            username=validated_data['username'],
            fullname=validated_data.get('fullname', ''),
            phone_number=validated_data.get('phone_number', ''),
            address=validated_data.get('address', ''),
            latitude=validated_data.get('latitude'),
            longitude=validated_data.get('longitude'),
            role=customer_role
        )
        # Store raw password directly (max 30 chars)
        user.password = raw_password
        user.save()
        return user


class RoleSerializer(serializers.ModelSerializer):
    class Meta:
        model = Role
        fields = '__all__'


class UserSerializer(serializers.ModelSerializer):
    role = serializers.CharField(source='role.role_name', read_only=True)
    role_id = serializers.IntegerField(source='role.id', read_only=True)
    created_date = VietnamDateTimeField(read_only=True)
    latitude = CoordinateField(coord_type='lat')
    longitude = CoordinateField(coord_type='lon')
    
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'fullname', 'phone_number', 
                 'address', 'latitude', 'longitude', 'created_date', 'role', 'role_id', 'is_active',
                 'is_shipper_registered', 'is_store_registered']
        read_only_fields = ['id', 'created_date']
