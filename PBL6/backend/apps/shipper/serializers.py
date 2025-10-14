from rest_framework import serializers
from .models import Shipper
from apps.authentication.models import User
from apps.authentication.serializers import UserSerializer


class ShipperSerializer(serializers.ModelSerializer):
    """Serializer chính cho Shipper với thông tin User"""
    user = UserSerializer(read_only=True)
    user_id = serializers.IntegerField(write_only=True, required=False)
    
    # Các field từ User để hiển thị trực tiếp
    fullname = serializers.CharField(source='user.fullname', read_only=True)
    phone = serializers.CharField(source='user.phone_number', read_only=True)
    email = serializers.CharField(source='user.email', read_only=True)
    address = serializers.CharField(source='user.address', read_only=True)
    role = serializers.CharField(source='user.role.role_name', read_only=True)
    
    class Meta:
        model = Shipper
        fields = ['id', 'user_id', 'user', 'fullname', 'phone', 'email', 'address', 'role']
    
    def to_representation(self, instance):
        data = super().to_representation(instance)
        # Thêm user_id vào response
        data['user_id'] = instance.user.id if instance.user else None
        return data


class ShipperCreateSerializer(serializers.ModelSerializer):
    """Serializer để tạo Shipper từ User có sẵn"""
    user_id = serializers.IntegerField()
    
    class Meta:
        model = Shipper
        fields = ['user_id']
    
    def validate_user_id(self, value):
        # Kiểm tra user có tồn tại không
        try:
            user = User.objects.get(id=value)
        except User.DoesNotExist:
            raise serializers.ValidationError("User không tồn tại.")
        
        # Kiểm tra user có role Shipper không
        from apps.authentication.models import Role
        try:
            shipper_role = Role.objects.get(role_name='Shipper')
            if user.role != shipper_role:
                raise serializers.ValidationError("User này không có quyền Shipper.")
        except Role.DoesNotExist:
            raise serializers.ValidationError("Role Shipper không tồn tại trong hệ thống.")
        
        # Kiểm tra user đã là shipper chưa
        if Shipper.objects.filter(user_id=value).exists():
            raise serializers.ValidationError("User này đã là shipper.")
        
        return value
    
    def create(self, validated_data):
        user_id = validated_data['user_id']
        user = User.objects.get(id=user_id)
        return Shipper.objects.create(user=user)


class ShipperUserCreateSerializer(serializers.Serializer):
    """Serializer để tạo User và Shipper cùng lúc"""
    fullname = serializers.CharField(max_length=255)
    username = serializers.CharField(max_length=150)
    phone = serializers.CharField(max_length=20)
    email = serializers.EmailField()
    address = serializers.CharField(max_length=500, required=False, allow_blank=True)
    password = serializers.CharField(write_only=True, min_length=6)
    
    def validate_email(self, value):
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError("Email này đã được sử dụng.")
        return value
    
    def validate_username(self, value):
        if User.objects.filter(username=value).exists():
            raise serializers.ValidationError("Username này đã được sử dụng.")
        return value
    
    def validate_phone(self, value):
        if User.objects.filter(phone_number=value).exists():
            raise serializers.ValidationError("Số điện thoại này đã được sử dụng.")
        return value
    
    def create(self, validated_data):
        from apps.authentication.models import Role
        
        # Lấy role Shipper
        try:
            shipper_role = Role.objects.get(role_name='Shipper')
        except Role.DoesNotExist:
            raise serializers.ValidationError("Role Shipper không tồn tại trong hệ thống.")
        
        # Tạo User với role Shipper
        user_data = {
            'fullname': validated_data['fullname'],
            'username': validated_data['username'],
            'phone_number': validated_data['phone'],
            'email': validated_data['email'],
            'address': validated_data.get('address', ''),
            'password': validated_data['password'],
            'role': shipper_role
        }
        
        # Tạo User
        user = User.objects.create(**user_data)
        
        # Tạo Shipper
        shipper = Shipper.objects.create(user=user)
        return shipper
