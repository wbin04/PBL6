from django.db import models
from django.conf import settings
from apps.menu.models import Food
from apps.orders.models import Order

class RatingFood(models.Model):
	RATINGS = [(i, i) for i in range(1, 6)]
	# Map rating value to existing 'point' column in database
	rating = models.FloatField(db_column='point', choices=RATINGS)
	content = models.TextField(blank=True)
	food = models.ForeignKey(Food, on_delete=models.CASCADE, related_name='ratings', db_column='food_id')
	user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, db_column='user_id')
	# Link to order via existing 'order_id' column
	order = models.ForeignKey(Order, on_delete=models.CASCADE, db_column='order_id')

	class Meta:
		db_table = 'rating_food'
		unique_together = (('user', 'food', 'order'),)

	def __str__(self):
		return f"{self.user} rated {self.food} as {self.rating}"
