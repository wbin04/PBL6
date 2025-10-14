from rest_framework import serializers
from .models import Cart, Item
from apps.menu.serializers import FoodListSerializer, FoodSizeSerializer


class ItemSerializer(serializers.ModelSerializer):
    food = FoodListSerializer(read_only=True)
    food_id = serializers.IntegerField(write_only=True)
    food_option = FoodSizeSerializer(read_only=True)
    food_option_id = serializers.IntegerField(write_only=True, required=False, allow_null=True)
    subtotal = serializers.ReadOnlyField()
    
    class Meta:
        model = Item
        fields = ['id', 'food', 'food_id', 'food_option', 'food_option_id', 'quantity', 'item_note', 'subtotal']


class CartSerializer(serializers.ModelSerializer):
    items = ItemSerializer(many=True, read_only=True)
    items_count = serializers.SerializerMethodField()
    
    class Meta:
        model = Cart
        fields = ['id', 'total_money', 'items', 'items_count']
    
    def get_items_count(self, obj):
        return sum(item.quantity for item in obj.items.all())
