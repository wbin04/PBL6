from django.db import models
from django.conf import settings
from apps.menu.models import Food


class Order(models.Model):
    created_date = models.DateTimeField(auto_now_add=True)
    total_money = models.DecimalField(max_digits=10, decimal_places=0)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, db_column='user_id')
    order_status = models.CharField(max_length=30, default='Chờ xác nhận')
    note = models.CharField(max_length=50, blank=True)
    payment_method = models.CharField(max_length=20, default='COD')
    receiver_name = models.CharField(max_length=50)
    ship_address = models.CharField(max_length=100)
    phone_number = models.CharField(max_length=10)
    promo = models.ForeignKey('promotions.Promo', on_delete=models.SET_NULL, null=True, blank=True, db_column='promo_id')
    
    class Meta:
        db_table = 'orders'
    
    def __str__(self):
        return f"Order #{self.id} - {self.user.fullname}"


class OrderDetail(models.Model):
    order = models.ForeignKey(Order, on_delete=models.CASCADE, db_column='order_id')
    # Use food_id as primary key since table has composite PK without id
    # Composite primary key using order_id + food_id; treat food_id as OneToOne to avoid warning
    food = models.OneToOneField(Food, on_delete=models.CASCADE, db_column='food_id', primary_key=True)
    quantity = models.IntegerField()

    class Meta:
        db_table = 'order_detail'
        managed = False  # existing table

    def __str__(self):
        return f"{self.quantity}x {self.food.title}"

    @property
    def subtotal(self):
        return self.food.price * self.quantity
