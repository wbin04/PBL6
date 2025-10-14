from django.db import models
from django.conf import settings
from django.utils import timezone
from apps.menu.models import Food
from apps.stores.models import Store


def get_vietnam_time():
    """Trả về thời gian hiện tại theo múi giờ Việt Nam"""
    now = timezone.now()
    # Chuyển về múi giờ Việt Nam (UTC+7)
    vietnam_tz = timezone.get_fixed_timezone(7 * 60)  # 7 giờ * 60 phút
    return now.astimezone(vietnam_tz)


class Order(models.Model):
    ORDER_STATUS_CHOICES = [
        ('Chờ xác nhận', 'Chờ xác nhận'),
        ('Đã xác nhận', 'Đã xác nhận'),
        ('Đang chuẩn bị', 'Đang chuẩn bị'),
        ('Sẵn sàng', 'Sẵn sàng'),
        ('Đã lấy hàng', 'Đã lấy hàng'),
        ('Đã giao', 'Đã giao'),
        ('Đã huỷ', 'Đã huỷ'),
    ]
    
    DELIVERY_STATUS_CHOICES = [
        ('Chờ xác nhận', 'Chờ xác nhận'),
        ('Đã xác nhận', 'Đã xác nhận'), 
        ('Đã lấy hàng', 'Đã lấy hàng'),
        ('Đang giao', 'Đang giao'),
        ('Đã huỷ', 'Đã huỷ'),
    ]
    
    CANCELLED_BY_ROLE_CHOICES = [
        ('Khách hàng', 'Khách hàng'),
        ('Cửa hàng', 'Cửa hàng'),
        ('Quản lý', 'Quản lý'),
    ]
    
    created_date = models.DateTimeField(default=get_vietnam_time)
    
    # New financial fields
    total_before_discount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    total_discount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    total_after_discount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    shipping_fee = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    
    # Legacy field for compatibility - will be removed after migration
    total_money = models.DecimalField(max_digits=13, decimal_places=3, null=True, blank=True)
    
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, db_column='user_id')
    order_status = models.CharField(max_length=30, choices=ORDER_STATUS_CHOICES, default='Chờ xác nhận')
    delivery_status = models.CharField(max_length=30, choices=DELIVERY_STATUS_CHOICES, default='Chờ xác nhận')
    note = models.CharField(max_length=50, blank=True)
    payment_method = models.CharField(max_length=20, default='COD')
    receiver_name = models.CharField(max_length=50)
    ship_address = models.CharField(max_length=100)
    phone_number = models.CharField(max_length=10)
    
    # Legacy promo field - will be removed after migration
    promo = models.ForeignKey('promotions.Promo', on_delete=models.SET_NULL, null=True, blank=True, db_column='promo_id', related_name='legacy_orders')
    
    shipper = models.ForeignKey('shipper.Shipper', on_delete=models.SET_NULL, null=True, blank=True, db_column='shipper_id')
    cancel_reason = models.CharField(max_length=255, blank=True, null=True)
    cancelled_date = models.DateTimeField(null=True, blank=True)  # Thời gian hủy đơn
    cancelled_by_role = models.CharField(max_length=20, choices=CANCELLED_BY_ROLE_CHOICES, null=True, blank=True)  # Ai hủy đơn
    group_id = models.IntegerField(null=True, blank=True)  # Group orders from same checkout together
    store = models.ForeignKey(Store, on_delete=models.CASCADE, db_column='store_id', null=True, blank=True)  # Store for this specific order
    
    # New many-to-many relationship with promotions
    promotions = models.ManyToManyField('promotions.Promo', through='promotions.OrderPromo', blank=True, related_name='orders')
    
    class Meta:
        db_table = 'orders'
    
    def __str__(self):
        return f"Order #{self.id} - {self.user.fullname}"
    
    def get_total_discount(self):
        """Calculate total discount from all applied promotions"""
        from apps.promotions.models import OrderPromo
        return OrderPromo.objects.filter(order=self).aggregate(
            total=models.Sum('applied_amount')
        )['total'] or 0
    
    def get_applied_promotions(self):
        """Get all promotions applied to this order"""
        from apps.promotions.models import OrderPromo
        return OrderPromo.objects.filter(order=self).select_related('promo')


class OrderDetail(models.Model):
    order = models.ForeignKey(Order, on_delete=models.CASCADE, db_column='order_id', related_name='details')
    food = models.ForeignKey(Food, on_delete=models.CASCADE, db_column='food_id')
    food_option = models.ForeignKey('menu.FoodSize', on_delete=models.CASCADE, db_column='food_option_id', null=True, blank=True)
    quantity = models.IntegerField()
    food_price = models.DecimalField(max_digits=10, decimal_places=2)
    food_note = models.CharField(max_length=255, blank=True, null=True)
    food_option_price = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)

    class Meta:
        db_table = 'order_detail'

    def __str__(self):
        return f"{self.quantity}x {self.food.title}"

    @property
    def subtotal(self):
        # Use food_price from OrderDetail, but fallback to food.price if food_price is 0
        actual_food_price = self.food_price if self.food_price > 0 else self.food.price
        
        # Calculate total price per item: base food price + option price (if any)
        item_price = actual_food_price
        if self.food_option_price:
            item_price += self.food_option_price
        return item_price * self.quantity
