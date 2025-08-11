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
    title = models.CharField(max_length=50)
    description = models.CharField(max_length=100, blank=True)
    price = models.DecimalField(max_digits=10, decimal_places=0)
    image = models.TextField(blank=True)
    category = models.ForeignKey(Category, on_delete=models.CASCADE, related_name='foods', db_column='cate_id')
    availability = models.CharField(max_length=30, default='Còn hàng')
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
