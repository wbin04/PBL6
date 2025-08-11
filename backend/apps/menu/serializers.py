from rest_framework import serializers
from .models import Category, Food


class CategorySerializer(serializers.ModelSerializer):
    foods_count = serializers.SerializerMethodField()
    
    class Meta:
        model = Category
        fields = ['id', 'cate_name', 'image', 'foods_count']
    
    def get_foods_count(self, obj):
        return obj.foods.count()  # Count all foods regardless of availability


class FoodSerializer(serializers.ModelSerializer):
    category = CategorySerializer(read_only=True)
    category_id = serializers.IntegerField(write_only=True)
    average_rating = serializers.FloatField(source='avg_rating', read_only=True)
    rating_count = serializers.IntegerField(source='rating_count_annotated', read_only=True)
    
    class Meta:
        model = Food
        fields = [
            'id', 'title', 'description', 'price', 'image', 
            'category', 'category_id', 'availability', 
            'average_rating', 'rating_count'
        ]
        read_only_fields = ['id']


class FoodListSerializer(serializers.ModelSerializer):
    """Lighter serializer for food list views"""
    category_name = serializers.CharField(source='category.cate_name', read_only=True)
    average_rating = serializers.FloatField(source='avg_rating', read_only=True)
    rating_count = serializers.IntegerField(source='rating_count_annotated', read_only=True)
    
    class Meta:
        model = Food
        fields = [
            'id', 'title', 'description', 'price', 'image', 
            'category_name', 'availability', 'average_rating', 'rating_count'
        ]
