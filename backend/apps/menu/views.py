from rest_framework.decorators import api_view, permission_classes, parser_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework.response import Response
from rest_framework import status
from django.core.paginator import Paginator
from django.db.models import Q, Avg, Count, Value
from django.db.models.functions import Coalesce
from django.conf import settings
from .models import Category, Food, FoodSize
from .serializers import CategorySerializer, FoodSerializer, FoodListSerializer, FoodSizeSerializer
from apps.stores.models import Store
from apps.stores.serializers import StoreSerializer


def _build_media_url(request, file_field):
    if not file_field:
        return None
    try:
        # Support both FileField objects and plain string paths stored in DB
        if hasattr(file_field, 'url'):
            path = file_field.url
        else:
            path = str(file_field)

        if not path:
            return None

        # If already an absolute URL, return as-is
        if str(path).startswith('http'):
            return str(path)

        normalized = str(path).lstrip('/')
        normalized = normalized.replace('\\', '/')

        # Strip leading media/ if present and ensure assets/ prefix for consistency
        if normalized.startswith('media/'):
            normalized = normalized[len('media/'):]
        if not normalized.startswith('assets/'):
            normalized = f'assets/{normalized}'

        full_path = f"{settings.MEDIA_URL}{normalized}"
        if request:
            return request.build_absolute_uri(full_path)
        return f"http://localhost:8000{full_path}"
    except Exception:
        return None


@api_view(['GET'])
@permission_classes([AllowAny])
def search_foods_grouped(request):
    """Search foods by keyword and group results by store."""
    query = request.GET.get('q') or request.GET.get('search')
    if not query:
        return Response({'error': 'Vui lòng nhập từ khóa tìm kiếm'}, status=status.HTTP_400_BAD_REQUEST)

    foods = Food.objects.select_related('store').filter(
        Q(title__icontains=query) | Q(description__icontains=query)
    )

    grouped = {}
    total_foods = 0
    for food in foods:
        if not food.store:
            continue

        total_foods += 1
        store = food.store
        if store.id not in grouped:
            grouped[store.id] = {
                'store_id': store.id,
                'store_name': store.store_name,
                'store_image': _build_media_url(request, store.image),
                'foods': [],
            }

        grouped[store.id]['foods'].append({
            'id': food.id,
            'title': food.title,
            'price': food.price,
            'image': _build_media_url(request, food.image),
        })

    results = list(grouped.values())

    return Response({
        'query': query,
        'total_stores': len(results),
        'total_foods': total_foods,
        'results': results,
    })


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

        # Convert to list to preserve annotations before pagination
        foods_list = list(foods)
        paginator = Paginator(foods_list, page_size)
        page_obj = paginator.get_page(page)

        serializer = FoodListSerializer(page_obj, many=True, context={'request': request})
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
    
    serializer = FoodSerializer(food, context={'request': request})
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
        foods = Food.objects.filter(category=category)\
            .annotate(
                avg_rating=Coalesce(Avg('ratings__rating'), Value(0.0)),
                rating_count_annotated=Count('ratings')
            )
        # Pagination
        page = int(request.GET.get('page', 1)) if request.GET.get('page') else 1
        page_size = int(request.GET.get('page_size', 12)) if request.GET.get('page_size') else 12
        # Convert to list to preserve annotations before pagination
        foods_list = list(foods)
        paginator = Paginator(foods_list, page_size)
        page_obj = paginator.get_page(page)

        serializer = FoodListSerializer(page_obj, many=True, context={'request': request})
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


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def store_foods_list(request):
    """Get foods for the authenticated store manager"""
    if not is_store_manager(request.user):
        return Response({'error': 'Store Manager access required'}, status=status.HTTP_403_FORBIDDEN)
    
    try:
        # Get the store managed by the user
        user_store = Store.objects.get(manager=request.user)
    except Store.DoesNotExist:
        return Response({'error': 'Store not found for user'}, status=status.HTTP_404_NOT_FOUND)
    
    # Get all foods for this store
    foods = Food.objects.filter(store=user_store)\
        .select_related('category', 'store')\
        .annotate(
            avg_rating=Coalesce(Avg('ratings__rating'), Value(0.0)),
            rating_count_annotated=Count('ratings')
        )\
        .order_by('-id')
    
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
    
    # Pagination with configurable page size
    try:
        page = int(request.GET.get('page', 1))
    except ValueError:
        page = 1
    try:
        page_size = int(request.GET.get('page_size', 12))
    except ValueError:
        page_size = 12
    
    # Convert to list to preserve annotations before pagination
    foods_list = list(foods)
    paginator = Paginator(foods_list, page_size)
    page_obj = paginator.get_page(page)
    
    serializer = FoodListSerializer(page_obj, many=True, context={'request': request})
    return Response({
        'count': paginator.count,
        'num_pages': paginator.num_pages,
        'current_page': page_obj.number,
        'has_next': page_obj.has_next(),
        'has_previous': page_obj.has_previous(),
        'next': f"?page={page_obj.next_page_number()}&page_size={page_size}" if page_obj.has_next() else None,
        'previous': f"?page={page_obj.previous_page_number()}&page_size={page_size}" if page_obj.has_previous() else None,
        'results': serializer.data,
        'store': {
            'id': user_store.id,
            'name': user_store.store_name
        }
    })


@api_view(['GET', 'PUT', 'DELETE'])
@parser_classes([MultiPartParser, FormParser, JSONParser])
@permission_classes([IsAuthenticated])
def store_food_detail(request, food_id):
    """Get, update, or delete a specific food item for store manager"""
    if not is_store_manager(request.user):
        return Response({'error': 'Store Manager access required'}, status=status.HTTP_403_FORBIDDEN)
    
    try:
        # Get the store managed by the user
        user_store = Store.objects.get(manager=request.user)
    except Store.DoesNotExist:
        return Response({'error': 'Store not found for user'}, status=status.HTTP_404_NOT_FOUND)
    
    try:
        food = Food.objects.get(id=food_id, store=user_store)
    except Food.DoesNotExist:
        return Response({'error': 'Food not found or access denied'}, status=status.HTTP_404_NOT_FOUND)
    
    if request.method == 'GET':
        serializer = FoodSerializer(food)
        return Response(serializer.data)
    
    elif request.method == 'PUT':
        # Handle file upload for image
        data = request.data.copy()
        old_image_path = None
        
        if 'image_file' in request.FILES:
            from django.core.files.storage import default_storage
            import os
            import uuid
            
            # Store old image path for later deletion
            old_image_path = None
            if food.image:
                old_image_path = str(food.image)
            
            file = request.FILES['image_file']
            # Generate unique filename to avoid collisions
            file_extension = os.path.splitext(file.name)[1]
            unique_filename = f"{uuid.uuid4().hex}{file_extension}"
            filename = f"assets/{unique_filename}"
            path = default_storage.save(filename, file)
            data['image'] = path
            
        # Remove file key to prevent validation errors
        data.pop('image_file', None)
        
        # Ensure store_id is set to user's store
        data['store_id'] = user_store.id
        
        serializer = FoodSerializer(food, data=data, partial=True)
        if serializer.is_valid():
            serializer.save()
            
            # Try to delete old image file after successful save
            if old_image_path and 'image_file' in request.FILES:
                try:
                    from django.core.files.storage import default_storage
                    if default_storage.exists(old_image_path):
                        default_storage.delete(old_image_path)
                except Exception as e:
                    print(f"Warning: Could not delete old image file {old_image_path}: {e}")
            
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    elif request.method == 'DELETE':
        food.delete()
        return Response({'message': 'Food deleted successfully'}, status=status.HTTP_204_NO_CONTENT)


# Admin-only views for food management
def is_admin(user):
    return user.is_authenticated and user.role and user.role.id == 2

def is_store_manager(user):
    return user.is_authenticated and user.role and user.role.id == 3

def is_admin_or_store_manager(user):
    return user.is_authenticated and user.role and user.role.id in [2, 3]


@api_view(['GET', 'POST'])
@parser_classes([MultiPartParser, FormParser, JSONParser])
@permission_classes([IsAuthenticated])
def admin_foods_list(request):
    if not is_admin_or_store_manager(request.user):
        return Response({'error': 'Admin or Store Manager access required'}, status=status.HTTP_403_FORBIDDEN)
    
    if request.method == 'GET':
        foods = Food.objects.select_related('category', 'store').order_by('-id')
        
        # If user is store manager, filter by their store
        if is_store_manager(request.user):
            # Restrict to the store managed by the user
            try:
                user_store = Store.objects.get(manager=request.user)
                foods = foods.filter(store=user_store)
            except Store.DoesNotExist:
                return Response({'error': 'Store not found for user'}, status=status.HTTP_404_NOT_FOUND)
        
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
        
        # Store filter (for admin only)
        if is_admin(request.user):
            store_id = request.GET.get('store')
            if store_id:
                foods = foods.filter(store_id=store_id)
        
        # Pagination with configurable page size
        try:
            page = int(request.GET.get('page', 1))
        except ValueError:
            page = 1
        try:
            page_size = int(request.GET.get('page_size', 10))
        except ValueError:
            page_size = 10
        
        # Convert to list to preserve annotations before pagination
        foods_list = list(foods)
        paginator = Paginator(foods_list, page_size)
        page_obj = paginator.get_page(page)
        
        serializer = FoodSerializer(page_obj, many=True)
        return Response({
            'count': paginator.count,
            'num_pages': paginator.num_pages,
            'current_page': page_obj.number,
            'has_next': page_obj.has_next(),
            'has_previous': page_obj.has_previous(),
            'next': f"?page={page_obj.next_page_number()}" if page_obj.has_next() else None,
            'previous': f"?page={page_obj.previous_page_number()}" if page_obj.has_previous() else None,
            'results': serializer.data,
            # Legacy fields for backward compatibility
            'foods': serializer.data,
            'total_pages': paginator.num_pages,
            'total_foods': paginator.count
        })
    
    elif request.method == 'POST':
        # Handle file upload for new food image
        data = request.data.copy()
        
        # If user is store manager, automatically set store_id
        if is_store_manager(request.user):
            try:
                user_store = Store.objects.get(manager=request.user)
                data['store_id'] = user_store.id
            except Store.DoesNotExist:
                return Response({'error': 'Store not found for user'}, status=status.HTTP_404_NOT_FOUND)
            except Exception as e:
                return Response({'error': 'Store not found for user'}, status=status.HTTP_404_NOT_FOUND)
        
        if 'image_file' in request.FILES:
            from django.core.files.storage import default_storage
            import os
            import uuid
            file = request.FILES['image_file']
            # Generate unique filename to avoid collisions
            file_extension = os.path.splitext(file.name)[1]
            unique_filename = f"{uuid.uuid4().hex}{file_extension}"
            filename = f"assets/{unique_filename}"
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
    if not is_admin_or_store_manager(request.user):
        return Response({'error': 'Admin or Store Manager access required'}, status=status.HTTP_403_FORBIDDEN)
    
    try:
        food = Food.objects.get(id=food_id)
        
        # If user is store manager, check if food belongs to their store
        if is_store_manager(request.user):
            try:
                user_store = Store.objects.get(manager=request.user)
                if food.store != user_store:
                    return Response({'error': 'Access denied to this food item'}, status=status.HTTP_403_FORBIDDEN)
            except Store.DoesNotExist:
                return Response({'error': 'Store not found for user'}, status=status.HTTP_404_NOT_FOUND)
                
    except Food.DoesNotExist:
        return Response({'error': 'Food not found'}, status=status.HTTP_404_NOT_FOUND)
    
    if request.method == 'GET':
        serializer = FoodSerializer(food)
        return Response(serializer.data)
    
    elif request.method == 'PUT':
        # Handle file upload for image
        data = request.data.copy()
        old_image_path = None
        
        if 'image_file' in request.FILES:
            from django.core.files.storage import default_storage
            import os
            import uuid
            
            # Store old image path for later deletion (image field is TextField, not FileField)
            old_image_path = None
            if food.image:
                old_image_path = str(food.image)  # image is a TextField containing the path
            
            file = request.FILES['image_file']
            # Generate unique filename to avoid collisions
            file_extension = os.path.splitext(file.name)[1]
            unique_filename = f"{uuid.uuid4().hex}{file_extension}"
            filename = f"assets/{unique_filename}"
            path = default_storage.save(filename, file)
            data['image'] = path
            
        # Remove file key to prevent validation errors
        data.pop('image_file', None)
        serializer = FoodSerializer(food, data=data, partial=True)
        if serializer.is_valid():
            serializer.save()
            
            # Try to delete old image file after successful save
            if old_image_path and 'image_file' in request.FILES:
                try:
                    from django.core.files.storage import default_storage
                    if default_storage.exists(old_image_path):
                        default_storage.delete(old_image_path)
                except Exception as e:
                    # Log error but don't fail the request
                    print(f"Warning: Could not delete old image file {old_image_path}: {e}")
            
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    elif request.method == 'DELETE':
        food.delete()
        return Response({'message': 'Food deleted successfully'}, status=status.HTTP_204_NO_CONTENT)


# FoodSize management endpoints
@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def food_sizes_list(request, food_id):
    """Get or create food sizes for a specific food"""
    if not is_admin_or_store_manager(request.user):
        return Response({'error': 'Admin or Store Manager access required'}, status=status.HTTP_403_FORBIDDEN)
    
    try:
        food = Food.objects.get(id=food_id)
        
        # If user is store manager, check if food belongs to their store
        if is_store_manager(request.user):
            try:
                user_store = Store.objects.get(manager=request.user)
                if food.store != user_store:
                    return Response({'error': 'Access denied to this food item'}, status=status.HTTP_403_FORBIDDEN)
            except Store.DoesNotExist:
                return Response({'error': 'Store not found for user'}, status=status.HTTP_404_NOT_FOUND)
                
    except Food.DoesNotExist:
        return Response({'error': 'Food not found'}, status=status.HTTP_404_NOT_FOUND)
    
    if request.method == 'GET':
        sizes = FoodSize.objects.filter(food=food).order_by('id')
        serializer = FoodSizeSerializer(sizes, many=True)
        return Response(serializer.data)
    
    elif request.method == 'POST':
        data = request.data.copy()
        
        # Validate required fields
        if not data.get('size_name'):
            return Response({'error': 'size_name is required'}, status=status.HTTP_400_BAD_REQUEST)
        if 'price' not in data:
            return Response({'error': 'price is required'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Check if size with same name already exists for this food
        if FoodSize.objects.filter(food=food, size_name=data.get('size_name')).exists():
            return Response({'error': 'Size with this name already exists for this food'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Create the size
        try:
            food_size = FoodSize.objects.create(
                food=food,
                size_name=data['size_name'],
                price=data['price']
            )
            serializer = FoodSizeSerializer(food_size)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET', 'PUT', 'DELETE'])
@permission_classes([IsAuthenticated])
def food_size_detail(request, food_id, size_id):
    """Get, update, or delete a specific food size"""
    if not is_admin_or_store_manager(request.user):
        return Response({'error': 'Admin or Store Manager access required'}, status=status.HTTP_403_FORBIDDEN)
    
    try:
        food = Food.objects.get(id=food_id)
        
        # If user is store manager, check if food belongs to their store
        if is_store_manager(request.user):
            try:
                user_store = Store.objects.get(manager=request.user)
                if food.store != user_store:
                    return Response({'error': 'Access denied to this food item'}, status=status.HTTP_403_FORBIDDEN)
            except Store.DoesNotExist:
                return Response({'error': 'Store not found for user'}, status=status.HTTP_404_NOT_FOUND)
                
    except Food.DoesNotExist:
        return Response({'error': 'Food not found'}, status=status.HTTP_404_NOT_FOUND)
    
    try:
        food_size = FoodSize.objects.get(id=size_id, food=food)
    except FoodSize.DoesNotExist:
        return Response({'error': 'Food size not found'}, status=status.HTTP_404_NOT_FOUND)
    
    if request.method == 'GET':
        serializer = FoodSizeSerializer(food_size)
        return Response(serializer.data)
    
    elif request.method == 'PUT':
        data = request.data.copy()
        
        # Check if updating size_name would create duplicate
        if 'size_name' in data and data['size_name'] != food_size.size_name:
            if FoodSize.objects.filter(food=food, size_name=data['size_name']).exists():
                return Response({'error': 'Size with this name already exists for this food'}, status=status.HTTP_400_BAD_REQUEST)
        
        serializer = FoodSizeSerializer(food_size, data=data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    elif request.method == 'DELETE':
        food_size.delete()
        return Response({'message': 'Food size deleted successfully'}, status=status.HTTP_204_NO_CONTENT)
