from django.db import models


class Store(models.Model):
    store_name = models.CharField(max_length=100)
    image = models.TextField(blank=True, help_text="URL path to store image (e.g., assets/store1.png)")
    description = models.TextField(blank=True)
    
    class Meta:
        db_table = 'stores'
    
    def __str__(self):
        return self.store_name


class StoreManager(models.Model):
    """Maps store managers (users with role_id=3) to stores"""
    user = models.ForeignKey('authentication.User', on_delete=models.CASCADE, db_column='user_id')
    store = models.ForeignKey(Store, on_delete=models.CASCADE, db_column='store_id')
    created_date = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'store_managers'
        unique_together = ('user', 'store')
    
    def __str__(self):
        return f"{self.user.username} manages {self.store.store_name}"
