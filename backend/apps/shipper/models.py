from django.db import models
from apps.authentication.models import User


class Shipper(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, db_column='user_id')
    
    class Meta:
        db_table = 'shipper'
    
    def __str__(self):
        return f"Shipper: {self.user.fullname}"
