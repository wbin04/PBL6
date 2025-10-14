from django.db import models
from django.utils import timezone


class Category(models.Model):
    cate_name = models.CharField(max_length=50)
    image = models.TextField(blank=True)
    
    class Meta:
        db_table = 'category'
        verbose_name_plural = "Categories"
    
    def __str__(self):
        return self.cate_name


class Food(models.Model):
    title = models.CharField(max_length=255)
    description = models.CharField(max_length=500, blank=True)
    price = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    image = models.TextField(blank=True)
    availability = models.CharField(max_length=50, default='Còn hàng')
    category = models.ForeignKey(Category, on_delete=models.CASCADE, related_name='foods', db_column='cate_id')
    store = models.ForeignKey('stores.Store', on_delete=models.CASCADE, related_name='foods', db_column='store_id', null=True, blank=True)
    # created_date = models.DateTimeField(default=timezone.now)  # Temporarily commented out
    
    class Meta:
        db_table = 'food'
    
    def __str__(self):
        return self.title
    
    @property
    def average_rating(self):
        """Calculate average rating for this food item"""
        try:
            ratings = self.ratings.all()
            if ratings.exists():
                total = sum(getattr(rating, 'rating', 0) for rating in ratings)
                return total / ratings.count()
        except Exception:
            # In case rating column is missing or other DB error
            return 0
        return 0

    @property
    def rating_count(self):
        """Get total number of ratings for this food item"""
        try:
            return self.ratings.count()
        except Exception:
            return 0


class FoodSize(models.Model):
    size_name = models.CharField(max_length=50)
    price = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    food = models.ForeignKey(Food, on_delete=models.CASCADE, related_name='sizes')
    
    class Meta:
        db_table = 'food_size'
        unique_together = ('food', 'size_name')
    
    def __str__(self):
        return f"{self.food.title} - {self.size_name}"
