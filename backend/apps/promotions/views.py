from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from django.utils import timezone
from django.shortcuts import get_object_or_404
from .models import Promo
from .serializers import PromoSerializer


def is_store_manager(user):
    """Check if user is a store manager"""
    return user.is_authenticated and user.role_id and user.role_id == 3


@api_view(['GET'])
@permission_classes([AllowAny])
def promo_list(request):
    """Get promotions - all for store managers, only active for public"""
    # Check if it's an authenticated store manager requesting all promos for their store
    if request.user.is_authenticated and is_store_manager(request.user):
        try:
            from apps.stores.models import Store
            user_store = Store.objects.get(manager=request.user)
            promos = Promo.objects.filter(store=user_store).order_by('-id')
        except Store.DoesNotExist:
            promos = Promo.objects.none()
    else:
        # Public access - only active promotions
        now = timezone.now()
        promos = Promo.objects.filter(
            start_date__lte=now,
            end_date__gte=now
        )
        
        # Filter by store if store_id provided
        store_id = request.GET.get('store') or request.GET.get('store_id')
        if store_id:
            promos = promos.filter(store_id=store_id)
    
    serializer = PromoSerializer(promos, many=True)
    return Response(serializer.data)


@api_view(['POST'])
def validate_promo(request):
    """Validate promo code"""
    from decimal import Decimal
    
    promo_id = request.data.get('promo_id')
    total_amount = request.data.get('total_amount', 0)
    
    # Convert total_amount to Decimal để tránh type mixing
    if isinstance(total_amount, (int, float)):
        total_amount = Decimal(str(total_amount))
    
    if not promo_id:
        return Response({'error': 'Promo ID is required'}, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        now = timezone.now()
        promo = Promo.objects.get(
            id=promo_id,
            start_date__lte=now,
            end_date__gte=now
        )
        
        if total_amount < promo.minimum_pay:
            return Response({
                'valid': False,
                'error': f'Minimum order amount is {promo.minimum_pay:,.0f} VND'
            })
        
        # Sử dụng method calculate_discount từ model
        discount_amount = promo.calculate_discount(total_amount)
        final_amount = max(Decimal('0'), total_amount - discount_amount)
        
        return Response({
            'valid': True,
            'discount_amount': f'{discount_amount:.2f}',
            'final_amount': f'{final_amount:.2f}',
            'promo': PromoSerializer(promo).data
        })
        
    except Promo.DoesNotExist:
        return Response({
            'valid': False,
            'error': 'Invalid or expired promo code'
        })


# CRUD Operations for Store Managers
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_promo(request):
    """Create new promotion (Store Manager only)"""
    if not is_store_manager(request.user):
        return Response({'error': 'Store Manager access required'}, status=status.HTTP_403_FORBIDDEN)
    
    # Get user's store
    from apps.stores.models import Store
    try:
        user_store = Store.objects.get(manager=request.user)
        request.data['store'] = user_store.id
    except Store.DoesNotExist:
        return Response({'error': 'No store assigned to user'}, status=status.HTTP_400_BAD_REQUEST)
    
    serializer = PromoSerializer(data=request.data)
    if serializer.is_valid():
        promo = serializer.save()
        return Response(PromoSerializer(promo).data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def promo_detail(request, promo_id):
    """Get promotion detail"""
    try:
        promo = Promo.objects.get(id=promo_id)
        
        # Store managers can only see their own store's promos
        if is_store_manager(request.user):
            from apps.stores.models import Store
            user_store = Store.objects.get(manager=request.user)
            if promo.store != user_store:
                return Response({'error': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)
        
        serializer = PromoSerializer(promo)
        return Response(serializer.data)
    except Promo.DoesNotExist:
        return Response({'error': 'Promotion not found'}, status=status.HTTP_404_NOT_FOUND)


@api_view(['PUT'])
@permission_classes([IsAuthenticated])
def update_promo(request, promo_id):
    """Update promotion (Store Manager only)"""
    if not is_store_manager(request.user):
        return Response({'error': 'Store Manager access required'}, status=status.HTTP_403_FORBIDDEN)
    
    try:
        promo = Promo.objects.get(id=promo_id)
        
        # Check if promo belongs to user's store
        from apps.stores.models import Store
        user_store = Store.objects.get(manager=request.user)
        if promo.store != user_store:
            return Response({'error': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)
        
        # Ensure store remains the same
        request.data['store'] = user_store.id
        
        serializer = PromoSerializer(promo, data=request.data, partial=True)
        if serializer.is_valid():
            promo = serializer.save()
            return Response(PromoSerializer(promo).data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
    except Promo.DoesNotExist:
        return Response({'error': 'Promotion not found'}, status=status.HTTP_404_NOT_FOUND)
    except Store.DoesNotExist:
        return Response({'error': 'No store assigned to user'}, status=status.HTTP_400_BAD_REQUEST)


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def delete_promo(request, promo_id):
    """Delete promotion (Store Manager only)"""
    import logging
    logger = logging.getLogger(__name__)
    
    logger.info(f"DELETE request for promo {promo_id} from user {request.user.id}")
    
    if not is_store_manager(request.user):
        logger.warning(f"Non-store manager {request.user.id} tried to delete promo {promo_id}")
        return Response({'error': 'Store Manager access required'}, status=status.HTTP_403_FORBIDDEN)
    
    try:
        promo = Promo.objects.get(id=promo_id)
        logger.info(f"Found promo {promo_id}: {promo.name}")
        
        # Check if promo belongs to user's store
        from apps.stores.models import Store
        user_store = Store.objects.get(manager=request.user)
        if promo.store != user_store:
            logger.warning(f"User {request.user.id} tried to delete promo {promo_id} from different store")
            return Response({'error': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)
        
        promo_name = promo.name  # Store name before deletion
        promo.delete()
        logger.info(f"Successfully deleted promo {promo_id}: {promo_name}")
        
        return Response({
            'success': True,
            'message': f'Promotion "{promo_name}" deleted successfully'
        }, status=status.HTTP_200_OK)
        
    except Promo.DoesNotExist:
        logger.error(f"Promo {promo_id} not found for deletion")
        return Response({
            'success': False,
            'error': f'Promotion with ID {promo_id} not found'
        }, status=status.HTTP_404_NOT_FOUND)
    except Store.DoesNotExist:
        logger.error(f"No store found for user {request.user.id}")
        return Response({
            'success': False,
            'error': 'No store assigned to user'
        }, status=status.HTTP_400_BAD_REQUEST)
    except Exception as e:
        logger.error(f"Unexpected error deleting promo {promo_id}: {str(e)}")
        return Response({
            'success': False,
            'error': 'Internal server error'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
