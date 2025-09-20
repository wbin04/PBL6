from rest_framework import viewsets, status
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from django.shortcuts import get_object_or_404
from .models import Store
from .serializers import StoreSerializer
from apps.menu.models import Food
from apps.menu.serializers import FoodSerializer
from apps.orders.models import Order, OrderDetail
from apps.orders.serializers import OrderSerializer


@api_view(['GET'])
@permission_classes([AllowAny])
def store_list_public(request):
    """Public endpoint to get all stores (excluding system-wide store)"""
    stores = Store.objects.exclude(id=0)  # Exclude system-wide store
    serializer = StoreSerializer(stores, many=True, context={'request': request})
    return Response(serializer.data)


class StoreViewSet(viewsets.ModelViewSet):
    serializer_class = StoreSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        # Store managers can only access their own store
        if hasattr(self.request.user, 'role') and self.request.user.role and self.request.user.role.role_name == 'Cửa hàng':
            return Store.objects.filter(manager=self.request.user)
        # Admins can see all stores
        return Store.objects.all()
    
    @action(detail=False, methods=['get'])
    def my_store(self, request):
        """Get the current user's managed store"""
        try:
            store = Store.objects.get(manager=request.user)
            serializer = self.get_serializer(store)
            return Response(serializer.data)
        except Store.DoesNotExist:
            return Response({'error': 'No store found for this user'}, status=status.HTTP_404_NOT_FOUND)
    
    @action(detail=True, methods=['get'])
    def foods(self, request, pk=None):
        """Get all foods for this store with pagination"""
        store = self.get_object()
        foods = Food.objects.filter(store=store)
        
        # Add pagination
        from django.core.paginator import Paginator
        page_number = request.GET.get('page', 1)
        paginator = Paginator(foods, 12)  # 12 items per page
        page_obj = paginator.get_page(page_number)
        
        # Use FoodSerializer with request context so image_url is built correctly
        serializer = FoodSerializer(page_obj, many=True, context={'request': request})
        
        # Return paginated response
        return Response({
            'count': paginator.count,
            'next': page_obj.next_page_number() if page_obj.has_next() else None,
            'previous': page_obj.previous_page_number() if page_obj.has_previous() else None,
            'results': serializer.data,
        })
    
    @action(detail=True, methods=['get'])
    def orders(self, request, pk=None):
        """Get all orders for this store"""
        store = self.get_object()
        # Get orders that contain items from this store
        orders = Order.objects.filter(
            details__food__store=store
        ).distinct().order_by('-created_date')
        serializer = OrderSerializer(orders, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['get'])
    def stats(self, request, pk=None):
        """Get store statistics"""
        store = self.get_object()
        
        # Count foods
        total_foods = Food.objects.filter(store=store).count()
        
        # Count orders
        total_orders = Order.objects.filter(
            details__food__store=store
        ).distinct().count()
        
        # Calculate total revenue
        total_revenue = 0
        order_details = OrderDetail.objects.filter(food__store=store)
        for detail in order_details:
            # Use food_price from OrderDetail (price at time of order)
            total_revenue += detail.food_price * detail.quantity
        
        # Calculate average rating and total rating count for the store
        from django.db.models import Avg, Count
        from apps.ratings.models import RatingFood
        
        # Get all ratings for foods in this store
        store_ratings = RatingFood.objects.filter(food__store=store)
        
        average_rating = 0
        total_ratings = 0
        
        if store_ratings.exists():
            rating_stats = store_ratings.aggregate(
                avg_rating=Avg('rating'),
                total_count=Count('id')
            )
            average_rating = round(rating_stats['avg_rating'] or 0, 1)
            total_ratings = rating_stats['total_count'] or 0
        
        return Response({
            'total_foods': total_foods,
            'total_orders': total_orders,
            'total_revenue': total_revenue,
            'average_rating': average_rating,
            'total_ratings': total_ratings
        })
