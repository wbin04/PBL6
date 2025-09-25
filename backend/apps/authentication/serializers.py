from rest_framework import serializers
from rest_framework_simplejwt.tokens import RefreshToken
from django.db.models import Q
from .models import User, Role


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


class UserSerializer(serializers.ModelSerializer):
    role = serializers.StringRelatedField(read_only=True)
    role_id = serializers.IntegerField(source='role.id', read_only=True)
    
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'fullname', 'phone_number', 'address', 'role', 'role_id', 'created_date']
        read_only_fields = ['id', 'created_date']


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, validators=[], max_length=30)
    password_confirm = serializers.CharField(write_only=True, max_length=30)
    
    class Meta:
        model = User
        fields = ['email', 'username', 'fullname', 'phone_number', 'address', 'password', 'password_confirm']
    
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
    
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'fullname', 'phone_number', 
                 'address', 'created_date', 'role', 'role_id', 'is_active']
        read_only_fields = ['id', 'created_date']
