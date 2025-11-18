from rest_framework import serializers
from apps.authentication.serializers import CoordinateField
from .models import Store


class StoreSerializer(serializers.ModelSerializer):
    manager = serializers.StringRelatedField(read_only=True)
    latitude = CoordinateField(coord_type='lat')
    longitude = CoordinateField(coord_type='lon')
    
    class Meta:
        model = Store
        fields = ['id', 'store_name', 'image', 'description', 'address', 'latitude', 'longitude', 'manager']
        read_only_fields = ['id', 'manager']
