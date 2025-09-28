from rest_framework import serializers
from .models import Category, Food, FoodSize
from apps.stores.serializers import StoreSerializer
from django.conf import settings


class CategorySerializer(serializers.ModelSerializer):
    name = serializers.CharField(source='cate_name')  # Map cate_name to name for frontend
    foods_count = serializers.SerializerMethodField()
    image_url = serializers.SerializerMethodField()
    
    class Meta:
        model = Category
        fields = ['id', 'name', 'cate_name', 'image', 'image_url', 'foods_count']
    
    def get_foods_count(self, obj):
        return obj.foods.count()  # Count all foods regardless of availability
    
    def get_image_url(self, obj):
        """Return full URL for the category image"""
        if obj.image:
            request = self.context.get('request')
            # Ensure path includes assets/ folder
            image_path = obj.image
            if not image_path.startswith('assets/'):
                image_path = f'assets/{image_path}'
            path = settings.MEDIA_URL + image_path
            if request:
                return request.build_absolute_uri(path)
            return f'http://localhost:8000{path}'
        return None


class FoodSizeSerializer(serializers.ModelSerializer):
    class Meta:
        model = FoodSize
        fields = ['id', 'size_name', 'price']


class FoodSerializer(serializers.ModelSerializer):
    category = CategorySerializer(read_only=True)
    category_id = serializers.IntegerField(write_only=True, required=False)
    store = StoreSerializer(read_only=True)
    store_id = serializers.IntegerField(write_only=True, required=False, allow_null=True)
    sizes = FoodSizeSerializer(many=True, read_only=True)
    average_rating = serializers.FloatField(source='avg_rating', read_only=True)
    rating_count = serializers.IntegerField(source='rating_count_annotated', read_only=True)
    image_url = serializers.SerializerMethodField()
    
    class Meta:
        model = Food
        fields = [
            'id', 'title', 'description', 'price', 'image', 'image_url',
            'category', 'category_id', 'store', 'store_id', 'availability', 
            'sizes', 'average_rating', 'rating_count'
        ]
        read_only_fields = ['id']
        extra_kwargs = {
            'category': {'write_only': True, 'required': False},  # Allow frontend to send 'category' field
        }
    
    def to_internal_value(self, data):
        # Handle 'category' field from frontend before normal validation
        if 'category' in data and isinstance(data['category'], int):
            # Make a copy to avoid modifying original data
            data = data.copy()
            data['category_id'] = data.pop('category')
        return super().to_internal_value(data)
    
    from django.conf import settings  # ensure settings import for MEDIA_URL
    def get_image_url(self, obj):
        """Return full URL for the image stored in obj.image"""
        if obj.image:
            request = self.context.get('request')
            # Ensure path includes assets/ folder
            image_path = obj.image
            if not image_path.startswith('assets/'):
                image_path = f'assets/{image_path}'
            path = settings.MEDIA_URL + image_path  # '/media/' + 'assets/spaghetti.png'
            if request:
                return request.build_absolute_uri(path)
            return f'http://localhost:8000{path}'
        return None


class FoodListSerializer(serializers.ModelSerializer):
    """Lighter serializer for food list views"""
    category = CategorySerializer(read_only=True)
    category_name = serializers.CharField(source='category.cate_name', read_only=True)
    store = StoreSerializer(read_only=True)
    store_name = serializers.CharField(source='store.store_name', read_only=True)
    sizes = FoodSizeSerializer(many=True, read_only=True)
    average_rating = serializers.FloatField(source='avg_rating', read_only=True)
    rating_count = serializers.IntegerField(source='rating_count_annotated', read_only=True)
    image_url = serializers.SerializerMethodField()
    
    class Meta:
        model = Food
        fields = [
            'id', 'title', 'description', 'price', 'image', 'image_url',
            'category', 'category_name', 'store', 'store_name', 'availability',
            'sizes', 'average_rating', 'rating_count'
        ]
    
    from django.conf import settings  # ensure settings import for MEDIA_URL
    def get_image_url(self, obj):
        """Return full URL for the image stored in obj.image"""
        if obj.image:
            request = self.context.get('request')
            # Ensure path includes assets/ folder
            image_path = obj.image
            if not image_path.startswith('assets/'):
                image_path = f'assets/{image_path}'
            path = settings.MEDIA_URL + image_path
            if request:
                return request.build_absolute_uri(path)
            return f'http://localhost:8000{path}'
        return None
