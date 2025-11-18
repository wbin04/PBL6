from rest_framework import serializers
from .models import ChatSession, ChatMessage, ChatCart
from apps.menu.serializers import FoodSerializer, FoodSizeSerializer


class ChatMessageSerializer(serializers.ModelSerializer):
    class Meta:
        model = ChatMessage
        fields = ['id', 'message', 'is_user', 'intent', 'created_at']
        read_only_fields = ['id', 'created_at']


class ChatCartItemSerializer(serializers.ModelSerializer):
    food_name = serializers.CharField(source='food.title', read_only=True)
    food_price = serializers.DecimalField(source='food.price', max_digits=10, decimal_places=2, read_only=True)
    size_name = serializers.CharField(source='food_size.size_name', read_only=True, allow_null=True)
    size_price = serializers.DecimalField(source='food_size.price', max_digits=10, decimal_places=2, read_only=True, allow_null=True)
    store_name = serializers.CharField(source='food.store.store_name', read_only=True)
    total_price = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
    
    class Meta:
        model = ChatCart
        fields = ['id', 'food', 'food_name', 'food_price', 'food_size', 'size_name', 
                  'size_price', 'quantity', 'store_name', 'total_price', 'created_at']
        read_only_fields = ['id', 'created_at']


class ChatSessionSerializer(serializers.ModelSerializer):
    messages = ChatMessageSerializer(many=True, read_only=True)
    cart_items = ChatCartItemSerializer(many=True, read_only=True)
    
    class Meta:
        model = ChatSession
        fields = ['id', 'session_id', 'user', 'created_at', 'updated_at', 'state', 'messages', 'cart_items']
        read_only_fields = ['id', 'created_at', 'updated_at']


class ChatRequestSerializer(serializers.Serializer):
    message = serializers.CharField(max_length=1000, required=True)
    session_id = serializers.CharField(max_length=255, required=True)


class ChatResponseSerializer(serializers.Serializer):
    reply = serializers.CharField()
    intent = serializers.CharField(required=False, allow_blank=True)
    data = serializers.JSONField(required=False, default=dict)
