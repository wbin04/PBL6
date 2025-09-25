from rest_framework import serializers
from .models import Store


class StoreSerializer(serializers.ModelSerializer):
    manager = serializers.StringRelatedField(read_only=True)
    
    class Meta:
        model = Store
        fields = ['id', 'store_name', 'image', 'description', 'manager']
