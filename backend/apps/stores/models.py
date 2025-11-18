from django.db import models
from django.conf import settings


class Store(models.Model):
    store_name = models.CharField(max_length=100)
    image = models.TextField(blank=True, help_text="URL path to store image (e.g., assets/store1.png)")
    description = models.TextField(blank=True)
    address = models.CharField(max_length=255, blank=True, null=True)
    latitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    longitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    manager = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, 
                                  null=True, blank=True, db_column='user_id',
                                  related_name='managed_store',
                                  help_text="Store manager user (role_id = 3)")
    
    class Meta:
        db_table = 'stores'
    
    def __str__(self):
        return self.store_name
