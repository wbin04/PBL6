from rest_framework import serializers
from .models import Order, OrderDetail
from apps.menu.serializers import FoodListSerializer
from apps.authentication.serializers import UserSerializer
from apps.ratings.models import RatingFood
from apps.menu.models import Food  # needed for raw SQL item fetching


class OrderDetailSerializer(serializers.ModelSerializer):
    food = FoodListSerializer(read_only=True)
    subtotal = serializers.ReadOnlyField()
    # Use food.id as identifier since order_detail has composite PK
    id = serializers.IntegerField(source='food_id', read_only=True)
    
    class Meta:
        model = OrderDetail
        fields = ['id', 'food', 'quantity', 'subtotal']


class OrderSerializer(serializers.ModelSerializer):
    # Flag if current user already rated this order
    is_rated = serializers.SerializerMethodField()
    # Use method field to fetch order items without relying on ORM id
    items = serializers.SerializerMethodField()
    user = UserSerializer(read_only=True)
    user_id = serializers.IntegerField(write_only=True)
    
    class Meta:
        model = Order
        fields = [
            'id', 'user', 'user_id', 'order_status', 'total_money',
            'payment_method', 'receiver_name', 'phone_number',
            'ship_address', 'note', 'promo', 'items', 'is_rated', 'created_date'
        ]
        read_only_fields = ['id', 'created_date']

    def get_items(self, obj):
        from django.db import connection
        from apps.menu.serializers import FoodListSerializer
        # raw SQL to fetch cart items
        with connection.cursor() as cursor:
            cursor.execute(
                "SELECT food_id, quantity FROM order_detail WHERE order_id = %s", [obj.id]
            )
            rows = cursor.fetchall()
        # Bulk fetch food objects
        food_ids = [r[0] for r in rows]
        foods = {f.id: f for f in Food.objects.filter(id__in=food_ids)}
        items = []
        for food_id, qty in rows:
            food = foods.get(food_id)
            if not food:
                continue
            serializer = FoodListSerializer(food)
            items.append({
                'id': food_id,
                'food': serializer.data,
                'quantity': qty,
                'subtotal': food.price * qty
            })
        return items
    
    def get_is_rated(self, obj):
        request = self.context.get('request', None)
        if not request or not request.user or not request.user.is_authenticated:
            return False
        return RatingFood.objects.filter(order_id=obj.id, user=request.user).exists()


class OrderListSerializer(serializers.ModelSerializer):
    """Lighter serializer for order list views"""
    items_count = serializers.SerializerMethodField()
    
    class Meta:
        model = Order
        fields = [
            'id', 'order_status', 'total_money', 'payment_method',
            'receiver_name', 'items_count', 'created_date'
        ]
    
    def get_items_count(self, obj):
        return obj.items.count()
