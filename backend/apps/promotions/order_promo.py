from django.db import models
from django.utils import timezone
import pytz


class OrderPromo(models.Model):
    """Simple model for order-promotion relationship"""
    order = models.ForeignKey('orders.Order', on_delete=models.CASCADE)
    promo = models.ForeignKey('promotions.Promo', on_delete=models.CASCADE)
    applied_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    note = models.CharField(max_length=255, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'order_promo'
        unique_together = ['order', 'promo']
        managed = True  # Django should manage this table
    
    def save(self, *args, **kwargs):
        # Auto-calculate applied_amount if not set
        if not self.applied_amount and self.promo and self.order:
            # Calculate discount based on order amount and promo rules
            order_amount = getattr(self.order, 'total_before_discount', self.order.total_money)
            if self.promo.is_valid_for_order(order_amount, self.order.store_id):
                self.applied_amount = self.promo.calculate_discount(order_amount)
        super().save(*args, **kwargs)
        
        # Update order totals after saving
        self.update_order_totals()
    
    def delete(self, *args, **kwargs):
        order = self.order
        super().delete(*args, **kwargs)
        # Update order totals after deletion
        self.update_order_totals_for_order(order)
    
    def update_order_totals(self):
        """Update order's total_discount and total_after_discount"""
        self.update_order_totals_for_order(self.order)
    
    @staticmethod
    def update_order_totals_for_order(order):
        """Update totals for a specific order"""
        total_discount = OrderPromo.objects.filter(order=order).aggregate(
            total=models.Sum('applied_amount')
        )['total'] or 0
        
        # Update order
        order.total_discount = total_discount
        order.total_after_discount = max(0, order.total_before_discount - total_discount)
        order.save()
    
    def __str__(self):
        return f"Order {self.order_id} - Promo {self.promo.name} - {self.applied_amount}"
