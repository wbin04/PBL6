from django.db import models
from django.utils import timezone
from decimal import Decimal


class Promo(models.Model):
    SCOPE_CHOICES = [
        ('STORE', 'Store'),
        ('GLOBAL', 'Global'),
    ]
    
    DISCOUNT_TYPE_CHOICES = [
        ('PERCENT', 'Percentage'),
        ('AMOUNT', 'Amount'),
    ]
    
    name = models.CharField(max_length=255)
    scope = models.CharField(max_length=10, choices=SCOPE_CHOICES, default='STORE')
    discount_type = models.CharField(max_length=10, choices=DISCOUNT_TYPE_CHOICES, default='PERCENT')
    discount_value = models.DecimalField(max_digits=12, decimal_places=2)
    start_date = models.DateTimeField()
    end_date = models.DateTimeField()
    minimum_pay = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    max_discount_amount = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    store = models.ForeignKey('stores.Store', on_delete=models.CASCADE, null=True, blank=True, db_column='store_id')
    is_active = models.BooleanField(default=True)
    
    # Legacy fields for compatibility
    category = models.CharField(max_length=20, null=True, blank=True)  # Will be synced with discount_type
    
    class Meta:
        db_table = 'promo'
    
    def save(self, *args, **kwargs):
        # Sync legacy field
        self.category = self.discount_type
        # Set scope based on store_id
        # Check if store_id is 0 (system-wide) or None
        if self.store_id and self.store_id != 0:
            self.scope = 'STORE'
        else:
            self.scope = 'GLOBAL'
        super().save(*args, **kwargs)
    
    def __str__(self):
        return self.name
    
    @property
    def store_id(self):
        """Compatibility property for existing code"""
        return self.store.id if self.store else 0
    
    def is_valid_for_order(self, order_amount, store_id=None):
        """Check if promo is valid for given order"""
        now = timezone.now()
        
        # Check time validity
        start_date = self.start_date
        end_date = self.end_date
        
        # Make timezone-aware if naive
        if timezone.is_naive(start_date):
            start_date = timezone.make_aware(start_date)
        if timezone.is_naive(end_date):
            end_date = timezone.make_aware(end_date)
            
        if not (start_date <= now <= end_date):
            return False
            
        # Check active status
        if not self.is_active:
            return False
            
        # Check minimum payment
        if order_amount < self.minimum_pay:
            return False
            
        # Check store scope
        if self.scope == 'STORE' and self.store_id != store_id:
            return False
            
        return True
    
    def calculate_discount(self, order_amount):
        """Calculate discount amount for given order total"""
        # Convert order_amount to Decimal để tránh lỗi type mixing
        if isinstance(order_amount, (int, float)):
            order_amount = Decimal(str(order_amount))
        
        if self.discount_type == 'PERCENT':
            discount = order_amount * self.discount_value / Decimal('100')
            # Áp dụng giới hạn tối đa nếu có
            if self.max_discount_amount:
                discount = min(discount, self.max_discount_amount)
        else:  # AMOUNT
            discount = self.discount_value
            
        return max(Decimal('0'), discount)


# Import OrderPromo from separate file
from .order_promo import OrderPromo

