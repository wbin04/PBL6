from django.db import models, connection
from django.conf import settings
from apps.menu.models import Food


class Cart(models.Model):
    total_money = models.DecimalField(max_digits=10, decimal_places=0, default=0)
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
                SELECT COALESCE(SUM(i.quantity * f.price), 0) 
                FROM item i 
                JOIN food f ON i.food_id = f.id 
                WHERE i.cart_id = %s
            """, [self.id])
            total = cursor.fetchone()[0]
            self.total_money = total
            self.save()


class Item(models.Model):
    # Use food_id as the primary key since table has no id column
    cart = models.ForeignKey(Cart, on_delete=models.CASCADE, related_name='items', db_column='cart_id')
    # Primary key relationship to Food; use OneToOneField to avoid FK-unique warning
    food = models.OneToOneField(Food, on_delete=models.CASCADE, db_column='food_id', primary_key=True)
    quantity = models.IntegerField(default=1)

    class Meta:
        db_table = 'item'
        managed = False  # existing table

    def __str__(self):
        return f"{self.quantity}x {self.food.title}"

    @property
    def subtotal(self):
        return self.food.price * self.quantity
