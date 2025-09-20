from rest_framework import serializers
from .models import Shipper
from apps.authentication.serializers import UserSerializer


class ShipperSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    
    class Meta:
        model = Shipper
        fields = ['id', 'user']
    
    def to_representation(self, instance):
        data = super().to_representation(instance)
        data['user_id'] = instance.user.id if instance.user else None
        return data


class ShipperCreateSerializer(serializers.ModelSerializer):
    user_id = serializers.IntegerField()
    
    class Meta:
        model = Shipper
        fields = ['user_id']
    
    def validate_user_id(self, value):
        # Kiểm tra user có tồn tại không
        from apps.authentication.models import User
        try:
            user = User.objects.get(id=value)
        except User.DoesNotExist:
            raise serializers.ValidationError("User không tồn tại.")
        
        # Kiểm tra user đã là shipper chưa
        if Shipper.objects.filter(user_id=value).exists():
            raise serializers.ValidationError("User này đã là shipper.")
        
        return value
    
    def create(self, validated_data):
        from apps.authentication.models import User
        user_id = validated_data['user_id']
        user = User.objects.get(id=user_id)
        return Shipper.objects.create(user=user)
