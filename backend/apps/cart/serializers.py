from rest_framework import serializers
from .models import Cart, Item
from apps.menu.serializers import FoodListSerializer


class ItemSerializer(serializers.ModelSerializer):
    food = FoodListSerializer(read_only=True)
    food_id = serializers.IntegerField(write_only=True)
    subtotal = serializers.ReadOnlyField()
    
    # Override id to map to existing food_id, since table has no id column
    id = serializers.IntegerField(source='food_id', read_only=True)
    class Meta:
        model = Item
        fields = ['id', 'food', 'food_id', 'quantity', 'subtotal']


class CartSerializer(serializers.ModelSerializer):
    items = ItemSerializer(many=True, read_only=True)
    items_count = serializers.SerializerMethodField()
    
    class Meta:
        model = Cart
        fields = ['id', 'total_money', 'items', 'items_count']
    
    def get_items_count(self, obj):
        return sum(item.quantity for item in obj.items.all())
