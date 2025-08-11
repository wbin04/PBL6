from django.db import models


class Promo(models.Model):
    id = models.CharField(max_length=20, primary_key=True)
    percent = models.IntegerField()
    start_date = models.DateTimeField()
    end_date = models.DateTimeField()
    minimum_pay = models.FloatField()
    
    class Meta:
        db_table = 'promo'
    
    def __str__(self):
        return f"{self.id} - {self.percent}%"
