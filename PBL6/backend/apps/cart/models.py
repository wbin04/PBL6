from django.db import models, connection
from django.conf import settings
from apps.menu.models import Food


class Cart(models.Model):
    total_money = models.DecimalField(max_digits=13, decimal_places=3, default=0)
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, db_column='user_id')
    
    class Meta:
        db_table = 'cart'
    
    def __str__(self):
        return f"Cart of {self.user.username}"
    
    @property
    def items(self):
        """Return QuerySet of cart items"""
        from apps.cart.models import Item
        return Item.objects.filter(cart=self)
     
    def update_total(self):
        """Update cart total based on items"""
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT COALESCE(SUM(
                    i.quantity * (f.price + COALESCE(fs.price, 0))
                ), 0) 
                FROM item i 
                JOIN food f ON i.food_id = f.id 
                LEFT JOIN food_size fs ON i.food_option_id = fs.id
                WHERE i.cart_id = %s
            """, [self.id])
            total = cursor.fetchone()[0]
            self.total_money = total
            self.save()


class Item(models.Model):
    cart = models.ForeignKey(Cart, on_delete=models.CASCADE, related_name='items', db_column='cart_id')
    food = models.ForeignKey(Food, on_delete=models.CASCADE, db_column='food_id')
    food_option = models.ForeignKey('menu.FoodSize', on_delete=models.CASCADE, db_column='food_option_id', null=True, blank=True)
    quantity = models.IntegerField(default=1)
    item_note = models.CharField(max_length=255, blank=True, null=True)

    class Meta:
        db_table = 'item'

    def __str__(self):
        return f"{self.quantity}x {self.food.title}"

    @property
    def subtotal(self):
        base_price = float(self.food.price)
        size_price = float(self.food_option.price) if self.food_option else 0.0
        
        # Total = (base + size) * quantity
        return (base_price + size_price) * self.quantity
