from rest_framework import serializers
from .models import RatingFood
class RatingFoodSerializer(serializers.ModelSerializer):
	# Automatically set the user from the request
	user = serializers.HiddenField(default=serializers.CurrentUserDefault())

	class Meta:
		model = RatingFood
		# Map 'rating' attribute to 'point' column
		fields = ['id', 'food', 'order', 'user', 'rating', 'content']
		read_only_fields = ['id']
