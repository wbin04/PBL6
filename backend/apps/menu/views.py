from rest_framework.decorators import api_view, permission_classes, parser_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework.response import Response
from rest_framework import status
from django.core.paginator import Paginator
from django.db.models import Q, Avg, Count, Value
from django.db.models.functions import Coalesce
from django.core.files.storage import default_storage
from django.utils import timezone
from .models import Category, Food
from .serializers import CategorySerializer, FoodSerializer, FoodListSerializer
from apps.stores.models import Store
from apps.stores.serializers import StoreSerializer


@api_view(['GET'])
@permission_classes([AllowAny])
def category_list(request):
    """Get all categories"""
    categories = Category.objects.all()
    serializer = CategorySerializer(categories, many=True)
    # Return in paginated response format for frontend compatibility
    return Response({
        'count': categories.count(),
        'next': None,
        'previous': None,
        'results': serializer.data,
    })


@api_view(['GET'])
@permission_classes([AllowAny])
def store_list(request):
    """Get all stores"""
    stores = Store.objects.all()
    serializer = StoreSerializer(stores, many=True)
    # Return in paginated response format for frontend compatibility
    return Response({
        'count': stores.count(),
        'next': None,
        'previous': None,
        'results': serializer.data,
    })


@api_view(['GET'])
@permission_classes([AllowAny])
def food_list(request):
    """Get foods with filters and pagination"""
    try:
        # Include all foods regardless of availability; frontend will handle disabled state
        # Prefetch ratings to compute average_rating and rating_count
        # Fetch foods without prefetching ratings to avoid missing column errors
        foods = Food.objects.select_related('category', 'store')\
            .annotate(
                avg_rating=Coalesce(Avg('ratings__rating'), Value(0.0)),
                rating_count_annotated=Count('ratings')
            )\
            .all()

        # Filter by category
        category_id = request.GET.get('category')
        if category_id:
            foods = foods.filter(category_id=category_id)

        # Filter by store
        store_id = request.GET.get('store')
        if store_id:
            foods = foods.filter(store_id=store_id)

        # Search by title or description
        search = request.GET.get('search')
        if search:
            foods = foods.filter(
                Q(title__icontains=search) | Q(description__icontains=search)
            )

        # Price range filter
        min_price = request.GET.get('min_price')
        max_price = request.GET.get('max_price')
        if min_price:
            foods = foods.filter(price__gte=min_price)
        if max_price:
            foods = foods.filter(price__lte=max_price)

        # Sort
        sort_by = request.GET.get('sort', 'id')
        if sort_by == 'price_asc':
            foods = foods.order_by('price')
        elif sort_by == 'price_desc':
            foods = foods.order_by('-price')
        elif sort_by == 'name':
            foods = foods.order_by('title')
        elif sort_by == 'created_date':
            foods = foods.order_by('-id')  # Use id as proxy for creation order
        else:
            foods = foods.order_by('-id')  # Default to newest first by id

        # Pagination
        try:
            page = int(request.GET.get('page', 1))
        except ValueError:
            page = 1
        try:
            page_size = int(request.GET.get('page_size', 12))
        except ValueError:
            page_size = 12

        paginator = Paginator(foods, page_size)
        page_obj = paginator.get_page(page)

        serializer = FoodListSerializer(page_obj, many=True)
        return Response({
            'count': paginator.count,
            'num_pages': paginator.num_pages,
            'current_page': page_obj.number,
            'has_next': page_obj.has_next(),
            'has_previous': page_obj.has_previous(),
            'results': serializer.data
        })
    except Exception as e:
        import traceback; traceback.print_exc()
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([AllowAny])
def food_detail(request, pk):
    """Get food detail"""
    try:
        # Fetch food with related category and compute ratings
        food = Food.objects.select_related('category', 'store')\
            .annotate(
                avg_rating=Coalesce(Avg('ratings__rating'), Value(0.0)),
                rating_count_annotated=Count('ratings')
            )\
            .get(pk=pk)
    except Food.DoesNotExist:
        return Response({'error': 'Food not found'}, status=status.HTTP_404_NOT_FOUND)
    
    serializer = FoodSerializer(food)
    return Response(serializer.data)


@api_view(['GET'])
@permission_classes([AllowAny])
def category_foods(request, category_id):
    """Get foods by category"""
    try:
        category = Category.objects.get(pk=category_id)
    except Category.DoesNotExist:
        return Response({'error': 'Category not found'}, status=status.HTTP_404_NOT_FOUND)
    try:
        # Include all foods in category regardless of availability, prefetch ratings
        # Fetch category foods without prefetching ratings
        foods = Food.objects.filter(category=category)\
            .annotate(
                avg_rating=Coalesce(Avg('ratings__rating'), Value(0.0)),
                rating_count_annotated=Count('ratings')
            )
        # Pagination
        page = int(request.GET.get('page', 1)) if request.GET.get('page') else 1
        page_size = int(request.GET.get('page_size', 12)) if request.GET.get('page_size') else 12
        paginator = Paginator(foods, page_size)
        page_obj = paginator.get_page(page)

        serializer = FoodListSerializer(page_obj, many=True)
        return Response({
            'category': CategorySerializer(category).data,
            'count': paginator.count,
            'num_pages': paginator.num_pages,
            'current_page': page_obj.number,
            'has_next': page_obj.has_next(),
            'has_previous': page_obj.has_previous(),
            'results': serializer.data
        })
    except Exception as e:
        import traceback; traceback.print_exc()
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# Admin-only views for food management
def is_admin(user):
    return user.is_authenticated and user.role and user.role.id == 2

# Store manager utility functions
def is_store_manager(user):
    return user.is_authenticated and user.role and user.role.id == 3

def get_user_store(user):
    """Get the store associated with a store manager user.
    For now, this assumes store managers manage the first store.
    In a real implementation, this would be based on a User-Store relationship."""
    if not is_store_manager(user):
        return None
    # For now, return the first store. This should be replaced with proper user-store association
    from apps.stores.models import Store
    return Store.objects.first()


@api_view(['GET', 'POST'])
@parser_classes([MultiPartParser, FormParser, JSONParser])
@permission_classes([IsAuthenticated])
def admin_foods_list(request):
    if not is_admin(request.user):
        return Response({'error': 'Admin access required'}, status=status.HTTP_403_FORBIDDEN)
    
    if request.method == 'GET':
        foods = Food.objects.select_related('category').order_by('-id')
        
        # Search filter
        search = request.GET.get('search')
        if search:
            foods = foods.filter(
                Q(title__icontains=search) | Q(description__icontains=search)
            )
        
        # Category filter
        category_id = request.GET.get('category')
        if category_id:
            foods = foods.filter(category_id=category_id)
        
        # Pagination
        page = request.GET.get('page', 1)
        paginator = Paginator(foods, 10)
        page_obj = paginator.get_page(page)
        
        serializer = FoodSerializer(page_obj, many=True)
        return Response({
            'foods': serializer.data,
            'total_pages': paginator.num_pages,
            'current_page': int(page),
            'total_foods': paginator.count
        })
    
    elif request.method == 'POST':
        # Handle file upload for new food image
        data = request.data.copy()
        if 'image_file' in request.FILES:
            from django.core.files.storage import default_storage
            file = request.FILES['image_file']
            filename = f"assets/{file.name}"
            # Remove existing file to prevent name collision
            if default_storage.exists(filename):
                default_storage.delete(filename)
            path = default_storage.save(filename, file)
            data['image'] = path
            # Remove file field to prevent serializer errors
            data.pop('image_file', None)
        serializer = FoodSerializer(data=data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET', 'PUT', 'DELETE'])
@parser_classes([MultiPartParser, FormParser, JSONParser])
@permission_classes([IsAuthenticated])
def admin_food_detail(request, food_id):
    if not is_admin(request.user):
        return Response({'error': 'Admin access required'}, status=status.HTTP_403_FORBIDDEN)
    
    try:
        food = Food.objects.get(id=food_id)
    except Food.DoesNotExist:
        return Response({'error': 'Food not found'}, status=status.HTTP_404_NOT_FOUND)
    
    if request.method == 'GET':
        serializer = FoodSerializer(food)
        return Response(serializer.data)
    
    elif request.method == 'PUT':
        # Handle file upload for image
        data = request.data.copy()
        if 'image_file' in request.FILES:
            from django.core.files.storage import default_storage
            file = request.FILES['image_file']
            filename = f"assets/{file.name}"
            # Delete existing to avoid collision
            if default_storage.exists(filename):
                default_storage.delete(filename)
            path = default_storage.save(filename, file)
            data['image'] = path
        # Remove file key to prevent validation errors
        data.pop('image_file', None)
        serializer = FoodSerializer(food, data=data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    elif request.method == 'DELETE':
        food.delete()
        return Response({'message': 'Food deleted successfully'}, status=status.HTTP_204_NO_CONTENT)


# Store manager views for food management
@api_view(['GET', 'POST'])
@parser_classes([MultiPartParser, FormParser, JSONParser])
@permission_classes([IsAuthenticated])
def store_foods_list(request):
    """Store manager food management - list and create foods for their store"""
    if not is_store_manager(request.user):
        return Response({'error': 'Store manager access required'}, status=status.HTTP_403_FORBIDDEN)
    
    user_store = get_user_store(request.user)
    if not user_store:
        return Response({'error': 'No store associated with this user'}, status=status.HTTP_403_FORBIDDEN)
    
    if request.method == 'GET':
        # Only show foods from the store manager's store
        foods = Food.objects.select_related('category').filter(store=user_store).order_by('-id')
        
        # Search filter
        search = request.GET.get('search')
        if search:
            foods = foods.filter(
                Q(title__icontains=search) | Q(description__icontains=search)
            )
        
        # Category filter
        category_id = request.GET.get('category')
        if category_id:
            foods = foods.filter(category_id=category_id)
        
        # Pagination
        page = request.GET.get('page', 1)
        paginator = Paginator(foods, 10)
        page_obj = paginator.get_page(page)
        
        serializer = FoodSerializer(page_obj, many=True)
        return Response({
            'foods': serializer.data,
            'total_pages': paginator.num_pages,
            'current_page': int(page),
            'total_foods': paginator.count
        })
    
    elif request.method == 'POST':
        # Create new food for the store manager's store
        data = request.data.copy()
        # Automatically assign the food to the store manager's store
        data['store'] = user_store.id
        
        # Handle image upload
        if 'image_file' in request.FILES:
            file = request.FILES['image_file']
            filename = f"food_{timezone.now().strftime('%Y%m%d_%H%M%S')}_{file.name}"
            path = default_storage.save(filename, file)
            data['image'] = path
        # Remove file key to prevent validation errors
        data.pop('image_file', None)
        
        serializer = FoodSerializer(data=data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET', 'PUT', 'DELETE'])
@parser_classes([MultiPartParser, FormParser, JSONParser])
@permission_classes([IsAuthenticated])
def store_food_detail(request, food_id):
    """Store manager food management - get, update or delete a specific food from their store"""
    if not is_store_manager(request.user):
        return Response({'error': 'Store manager access required'}, status=status.HTTP_403_FORBIDDEN)
    
    user_store = get_user_store(request.user)
    if not user_store:
        return Response({'error': 'No store associated with this user'}, status=status.HTTP_403_FORBIDDEN)
    
    try:
        # Only allow access to foods from the store manager's store
        food = Food.objects.select_related('category').get(id=food_id, store=user_store)
    except Food.DoesNotExist:
        return Response({'error': 'Food not found in your store'}, status=status.HTTP_404_NOT_FOUND)
    
    if request.method == 'GET':
        serializer = FoodSerializer(food)
        return Response(serializer.data)
    
    elif request.method == 'PUT':
        data = request.data.copy()
        # Ensure the food remains in the store manager's store
        data['store'] = user_store.id
        
        # Handle image upload
        if 'image_file' in request.FILES:
            file = request.FILES['image_file']
            filename = f"food_{timezone.now().strftime('%Y%m%d_%H%M%S')}_{file.name}"
            # Delete old image if exists
            if food.image and default_storage.exists(filename):
                default_storage.delete(filename)
            path = default_storage.save(filename, file)
            data['image'] = path
        # Remove file key to prevent validation errors
        data.pop('image_file', None)
        serializer = FoodSerializer(food, data=data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    elif request.method == 'DELETE':
        food.delete()
        return Response({'message': 'Food deleted successfully'}, status=status.HTTP_204_NO_CONTENT)
