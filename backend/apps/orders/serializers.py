from rest_framework import serializers
from .models import Order, OrderDetail
from apps.menu.serializers import FoodListSerializer, FoodSizeSerializer
from apps.authentication.serializers import UserSerializer
from apps.shipper.serializers import ShipperSerializer
from apps.stores.models import Store
from apps.ratings.models import RatingFood
from apps.menu.models import Food, FoodSize  # needed for raw SQL item fetching
from django.utils import timezone
from apps.utils import VietnamDateTimeField


class OrderDetailSerializer(serializers.ModelSerializer):
    food = FoodListSerializer(read_only=True)
    food_option = FoodSizeSerializer(read_only=True)
    subtotal = serializers.ReadOnlyField()
    size_display = serializers.SerializerMethodField()
    price_breakdown = serializers.SerializerMethodField()
    
    class Meta:
        model = OrderDetail
        fields = ['id', 'food', 'food_option', 'quantity', 'food_price', 'food_option_price', 'food_note', 'subtotal', 'size_display', 'price_breakdown']
    
    def get_size_display(self, obj):
        """Get readable size information with price"""
        if obj.food_option and obj.food_option_price and obj.food_option_price > 0:
            return f"Size {obj.food_option.size_name}: +{int(obj.food_option_price):,}đ"
        return ""
    
    def get_price_breakdown(self, obj):
        """Get detailed price breakdown"""
        breakdown = []
        
        # Use food_price from OrderDetail, but fallback to food.price if food_price is 0
        actual_food_price = obj.food_price if obj.food_price > 0 else obj.food.price
        
        # Add base food price with formatted display
        food_display = f"{obj.food.title} {int(actual_food_price):,}đ"
        breakdown.append({
            'type': 'food',
            'name': obj.food.title,
            'display': food_display,
            'price': float(actual_food_price),
            'quantity': obj.quantity,
            'total': float(actual_food_price) * obj.quantity
        })
        
        # Add size price if exists
        if obj.food_option and obj.food_option_price and obj.food_option_price > 0:
            size_display = f"Size {obj.food_option.size_name}: +{int(obj.food_option_price):,}đ"
            breakdown.append({
                'type': 'size',
                'name': f"Size {obj.food_option.size_name}",
                'display': size_display,
                'price': float(obj.food_option_price),
                'quantity': obj.quantity,
                'total': float(obj.food_option_price) * obj.quantity
            })
            
        return breakdown


class OrderSerializer(serializers.ModelSerializer):
    # Flag if current user already rated this order
    is_rated = serializers.SerializerMethodField()
    # Use method field to fetch order items without relying on ORM id
    items = serializers.SerializerMethodField()
    user = UserSerializer(read_only=True)
    user_id = serializers.IntegerField(write_only=True)
    shipper = ShipperSerializer(read_only=True)
    shipper_id = serializers.IntegerField(write_only=True, required=False, allow_null=True)
    # Add store information
    store_name = serializers.CharField(source='store.store_name', read_only=True)
    store_id = serializers.IntegerField(write_only=True, required=False, allow_null=True)
    store_info_id = serializers.IntegerField(source='store.id', read_only=True)
    store_image = serializers.CharField(source='store.image', read_only=True)
    store_address = serializers.CharField(source='store.address', read_only=True, allow_null=True)
    store_latitude = serializers.SerializerMethodField()
    store_longitude = serializers.SerializerMethodField()
    route_polyline = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    # Sử dụng VietnamDateTimeField để tự động convert sang múi giờ Việt Nam
    created_date = VietnamDateTimeField(read_only=True)
    cancelled_date = VietnamDateTimeField(read_only=True, required=False, allow_null=True)
    # Thêm thông tin promotion discount
    promo_discount = serializers.SerializerMethodField()
    applied_promos = serializers.SerializerMethodField()
    
    class Meta:
        model = Order
        fields = [
            'id', 'user', 'user_id', 'order_status', 'delivery_status', 'total_money',
            'payment_method', 'receiver_name', 'phone_number',
            'ship_address', 'ship_latitude', 'ship_longitude', 'route_polyline', 'note', 'promo', 'shipper', 'shipper_id', 
            'shipping_fee', 'group_id', 'cancel_reason', 'cancelled_date', 'cancelled_by_role', 'store_id',
            'store_name', 'store_info_id', 'store_image', 'store_address', 'store_latitude', 'store_longitude', 'items', 'is_rated', 
            'created_date', 'promo_discount', 'applied_promos',
            'total_before_discount', 'total_discount', 'total_after_discount',
            'refund_requested', 'refund_status', 'bank_name', 'bank_account'
        ]
        read_only_fields = ['id', 'created_date']
    
    
    def get_created_date_display(self, obj):
        """DEPRECATED: Use created_date field directly (already in Vietnam timezone)"""
        # This method is kept for backward compatibility but is no longer needed
        # The created_date field is now automatically converted to Vietnam timezone
        if not obj.created_date:
            return None
            
        # Chuyển về múi giờ Việt Nam (UTC+7)
        vietnam_tz = timezone.get_fixed_timezone(7 * 60)  # 7 giờ * 60 phút
        vn_time = obj.created_date.astimezone(vietnam_tz)
        
        # Định dạng thời gian
        return vn_time.strftime("%Y-%m-%d %H:%M:%S")

    def get_items(self, obj):
        from django.db import connection
        from apps.menu.serializers import FoodListSerializer, FoodSizeSerializer
        # raw SQL to fetch order items with separate food_price and food_option_price
        with connection.cursor() as cursor:
            cursor.execute(
                "SELECT food_id, food_option_id, quantity, food_price, food_option_price, food_note FROM order_detail WHERE order_id = %s", [obj.id]
            )
            rows = cursor.fetchall()
        # Bulk fetch food and food_size objects
        food_ids = [r[0] for r in rows]
        food_option_ids = [r[1] for r in rows if r[1] is not None]
        
        foods = {f.id: f for f in Food.objects.filter(id__in=food_ids)}
        food_options = {fs.id: fs for fs in FoodSize.objects.filter(id__in=food_option_ids)}
        
        items = []
        for food_id, food_option_id, qty, food_price, food_option_price, food_note in rows:
            food = foods.get(food_id)
            if not food:
                continue
            
            food_serializer = FoodListSerializer(food, context=self.context)
            food_option_data = None
            size_display = ""
            price_breakdown = []
            
            # Use food_price from OrderDetail, but fallback to food.price if food_price is 0
            actual_food_price = food_price if food_price > 0 else food.price
            
            # Add base food price to breakdown with formatted display
            food_display = f"{food.title} {int(actual_food_price):,}đ"
            price_breakdown.append({
                'type': 'food',
                'name': food.title,
                'display': food_display,
                'price': float(actual_food_price),
                'quantity': qty,
                'total': float(actual_food_price) * qty
            })
            
            if food_option_id and food_option_id in food_options:
                food_option = food_options[food_option_id]
                food_option_data = FoodSizeSerializer(food_option, context=self.context).data
                
                # Only show size info if there's an additional price
                if food_option_price and food_option_price > 0:
                    size_display = f"Size {food_option.size_name}: +{int(food_option_price):,}đ"
                    
                    # Add size price to breakdown
                    price_breakdown.append({
                        'type': 'size',
                        'name': f"Size {food_option.size_name}",
                        'display': size_display,
                        'price': float(food_option_price),
                        'quantity': qty,
                        'total': float(food_option_price) * qty
                    })
            
            # Calculate subtotal: base food price + option price (if exists) * quantity
            item_subtotal = actual_food_price * qty
            if food_option_price:
                item_subtotal += food_option_price * qty
                
            items.append({
                'id': f"{obj.id}_{food_id}_{food_option_id or 0}",  # unique identifier
                'food': food_serializer.data,
                'food_option': food_option_data,
                'quantity': qty,
                'food_price': actual_food_price,  # Use corrected price
                'food_option_price': food_option_price,
                'food_note': food_note,
                'subtotal': float(item_subtotal),
                'size_display': size_display,  # Readable size info
                'price_breakdown': price_breakdown  # Detailed price breakdown
            })
        return items
    
    def get_is_rated(self, obj):
        request = self.context.get('request', None)
        if not request or not request.user or not request.user.is_authenticated:
            return False
        return RatingFood.objects.filter(order_id=obj.id, user=request.user).exists()
    
    def get_promo_discount(self, obj):
        """Get total discount amount from applied promos"""
        from apps.promotions.order_promo import OrderPromo
        from django.db.models import Sum
        
        total = OrderPromo.objects.filter(order=obj).aggregate(
            total=Sum('applied_amount')
        )['total']
        
        return float(total) if total else 0
    
    def get_applied_promos(self, obj):
        """Get list of applied promos with details"""
        from apps.promotions.order_promo import OrderPromo
        from apps.promotions.serializers import OrderPromoSerializer
        
        order_promos = OrderPromo.objects.filter(order=obj).select_related('promo')
        return OrderPromoSerializer(order_promos, many=True).data

    def get_store_latitude(self, obj):
        return float(obj.store.latitude) if obj.store and obj.store.latitude is not None else None

    def get_store_longitude(self, obj):
        return float(obj.store.longitude) if obj.store and obj.store.longitude is not None else None


class OrderListSerializer(serializers.ModelSerializer):
    """Lighter serializer for order list views"""
    items_count = serializers.SerializerMethodField()
    shipper = ShipperSerializer(read_only=True)
    # Sử dụng VietnamDateTimeField để tự động convert sang múi giờ Việt Nam
    created_date = VietnamDateTimeField(read_only=True)
    cancelled_date = VietnamDateTimeField(read_only=True, required=False, allow_null=True)
    
    class Meta:
        model = Order
        fields = [
            'id', 'order_status', 'delivery_status', 'total_money', 'payment_method',
            'receiver_name', 'shipper', 'items_count', 'created_date',
            'cancel_reason', 'cancelled_date', 'cancelled_by_role',
            'refund_requested', 'refund_status', 'bank_name', 'bank_account'
        ]
    
    def get_items_count(self, obj):
        return obj.details.count()
