from rest_framework import serializers
from apps.authentication.serializers import CoordinateField
from .models import Store


class StoreSerializer(serializers.ModelSerializer):
    manager = serializers.StringRelatedField(read_only=True)
    manager_id = serializers.IntegerField(source='manager.id', read_only=True)
    manager_is_active = serializers.BooleanField(source='manager.is_active', read_only=True)
    latitude = CoordinateField(coord_type='lat')
    longitude = CoordinateField(coord_type='lon')
    
    class Meta:
        model = Store
        fields = [
            'id',
            'store_name',
            'image',
            'description',
            'address',
            'latitude',
            'longitude',
            'manager',
            'manager_id',
            'manager_is_active',
        ]
        read_only_fields = ['id', 'manager', 'manager_id', 'manager_is_active']
