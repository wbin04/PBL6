from django.db import models


class Store(models.Model):
    store_name = models.CharField(max_length=100)
    image = models.TextField(blank=True, help_text="URL path to store image (e.g., assets/store1.png)")
    description = models.TextField(blank=True)
    
    class Meta:
        db_table = 'stores'
    
    def __str__(self):
        return self.store_name
