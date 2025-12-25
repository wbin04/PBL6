from rest_framework import viewsets, status
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from django.shortcuts import get_object_or_404
from django.db.models import F
from decimal import Decimal
import os
import uuid
from django.core.files.storage import default_storage
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
    stores = Store.objects.exclude(id=0).select_related('manager')  # Exclude system-wide store
    serializer = StoreSerializer(stores, many=True, context={'request': request})
    return Response(serializer.data)


class StoreViewSet(viewsets.ModelViewSet):
    serializer_class = StoreSerializer
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]
    
    def get_queryset(self):
        # Store managers can only access their own store
        if hasattr(self.request.user, 'role') and self.request.user.role and self.request.user.role.role_name == 'Cửa hàng':
            return Store.objects.filter(manager=self.request.user)
        # Admins can see all stores
        return Store.objects.all()

    def _handle_update(self, request, partial=False, *args, **kwargs):
        instance = self.get_object()
        data = request.data.copy()
        old_image_path = instance.image if instance.image else None

        if 'image_file' in request.FILES:
            from django.core.files.storage import default_storage
            import os
            import uuid

            file = request.FILES['image_file']
            ext = os.path.splitext(file.name)[1]
            filename = f"assets/{uuid.uuid4().hex}{ext}"
            saved_path = default_storage.save(filename, file)
            data['image'] = saved_path

        data.pop('image_file', None)

        serializer = self.get_serializer(instance, data=data, partial=partial)
        if serializer.is_valid():
            serializer.save()

            # Delete old file if new one uploaded
            if old_image_path and 'image' in data and old_image_path != data.get('image'):
                try:
                    from django.core.files.storage import default_storage
                    if default_storage.exists(old_image_path):
                        default_storage.delete(old_image_path)
                except Exception as e:
                    print(f"Warning: could not delete old store image {old_image_path}: {e}")

            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def update(self, request, *args, **kwargs):
        return self._handle_update(request, partial=False, *args, **kwargs)

    def partial_update(self, request, *args, **kwargs):
        return self._handle_update(request, partial=True, *args, **kwargs)
    
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
        from django.db.models import Avg, Count, Value
        from django.db.models.functions import Coalesce
        
        store = self.get_object()
        foods = Food.objects.filter(store=store)\
            .select_related('category', 'store')\
            .annotate(
                avg_rating=Coalesce(Avg('ratings__rating'), Value(0.0)),
                rating_count_annotated=Count('ratings')
            )
        
        # Add pagination
        from django.core.paginator import Paginator
        page_number = request.GET.get('page', 1)
        # Convert to list to preserve annotations before pagination
        foods_list = list(foods)
        paginator = Paginator(foods_list, 12)  # 12 items per page
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
        serializer = OrderSerializer(orders, many=True, context={'request': request})
        return Response(serializer.data)
    
    @action(detail=True, methods=['patch'], url_path='orders/(?P<order_id>[^/.]+)/status')
    def update_order_status(self, request, pk=None, order_id=None):
        """Update order status for a specific order in this store"""
        store = self.get_object()
        
        # Check if order belongs to this store
        try:
            order = Order.objects.get(
                id=order_id,
                details__food__store=store
            )
        except Order.DoesNotExist:
            return Response({'error': 'Order not found or does not belong to this store'}, 
                          status=status.HTTP_404_NOT_FOUND)
        
        # Validate status
        new_status = request.data.get('order_status')
        refund_requested = request.data.get('refund_requested')
        refund_status = request.data.get('refund_status')
        bank_name = request.data.get('bank_name')
        bank_account = request.data.get('bank_account')
        proof_image_file = request.FILES.get('proof_image')
        valid_statuses = [choice[0] for choice in Order.ORDER_STATUS_CHOICES]
        
        if new_status not in valid_statuses:
            return Response({'error': 'Invalid status'}, status=status.HTTP_400_BAD_REQUEST)

        # Disallow changing status away from completed/cancelled; allow metadata updates when status unchanged
        if order.order_status in ['Đã giao', 'Đã huỷ'] and new_status != order.order_status:
            return Response({'error': 'Không thể thay đổi trạng thái khi đơn đã hoàn tất hoặc đã huỷ'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Preserve previous refund status to detect state change
        previous_refund_status = order.refund_status

        # Update order status
        order.order_status = new_status
        
        # Add cancel reason if rejecting
        if new_status == 'Đã huỷ':
            order.cancel_reason = request.data.get('cancel_reason', 'Bị từ chối bởi cửa hàng')
            order.cancelled_by_role = 'Cửa hàng'
            from django.utils import timezone
            order.cancelled_date = timezone.now()

        # Update refund info if provided
        if refund_requested is not None:
            order.refund_requested = bool(refund_requested)
        if refund_status:
            order.refund_status = refund_status
        if bank_name:
            order.bank_name = bank_name
        if bank_account:
            order.bank_account = bank_account
        if proof_image_file:
            ext = os.path.splitext(proof_image_file.name)[1]
            filename = f"assets/{uuid.uuid4().hex}{ext}"
            saved_path = default_storage.save(filename, proof_image_file)

            # Remove old proof image if replaced
            if order.proof_image and order.proof_image != saved_path:
                try:
                    if default_storage.exists(order.proof_image):
                        default_storage.delete(order.proof_image)
                except Exception:
                    # Do not fail request if cleanup fails
                    pass

            order.proof_image = saved_path
        
        order.save()

        # If refund just completed, deduct deposit by the order's total_after_discount
        if previous_refund_status != 'Đã hoàn thành' and refund_status == 'Đã hoàn thành':
            order_total = order.total_after_discount or Decimal('0')
            store.deposit = F('deposit') - order_total
            store.save(update_fields=['deposit'])
            # Refresh from DB to return updated value
            store.refresh_from_db(fields=['deposit'])
        
        serializer = OrderSerializer(order, context={'request': request})
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
