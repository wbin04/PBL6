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


# Admin CRUD Operations (role_id = 2 - Quản lý)
def is_admin(user):
    """Check if user is admin (Quản lý)"""
    return user.is_authenticated and user.role_id and user.role_id == 2


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def admin_promo_list(request):
    """Get system-wide promotions only (store_id=0)"""
    import logging
    from django.db import connection
    logger = logging.getLogger(__name__)
    
    if not is_admin(request.user):
        return Response({'error': 'Admin access required'}, status=status.HTTP_403_FORBIDDEN)
    
    # Get system-wide promotions where store_id = 0 in database
    # Use filter with store__id=0 to specifically target the system store
    promos = Promo.objects.filter(store__id=0).order_by('-id')
    
    # Log the actual SQL query being executed
    logger.info(f"=== ADMIN PROMO LIST DEBUG ===")
    logger.info(f"User: {request.user.id}, Role: {request.user.role_id}")
    logger.info(f"SQL Query: {promos.query}")
    logger.info(f"Found {promos.count()} system-wide promotions (store_id=0)")
    
    # Log all promotions returned
    for promo in promos:
        store_id_value = promo.store.id if promo.store else None
        logger.info(f"  Promo {promo.id}: {promo.name}, store_id={store_id_value}, scope={promo.scope}")
    
    serializer = PromoSerializer(promos, many=True)
    result_data = serializer.data
    
    # Log serialized data
    logger.info(f"Serialized data count: {len(result_data)}")
    for item in result_data:
        logger.info(f"  Returning: ID={item.get('id')}, Name={item.get('name')}, store_id={item.get('store_id')}")
    
    return Response(result_data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def admin_create_promo(request):
    """Create system-wide promotion (Admin only) - store_id will be 0 in DB"""
    import logging
    logger = logging.getLogger(__name__)
    
    if not is_admin(request.user):
        return Response({'error': 'Admin access required'}, status=status.HTTP_403_FORBIDDEN)
    
    # For system-wide promotions, we need to handle store_id = 0
    # Since store is a ForeignKey, we need to get or create a dummy store with id=0
    from apps.stores.models import Store
    
    data = request.data.copy()
    # Remove store field from data
    if 'store' in data:
        del data['store']
    
    logger.info(f"Admin creating global promotion with data: {data}")
    
    serializer = PromoSerializer(data=data)
    if serializer.is_valid():
        # Get or create a system-wide "store" with id=0
        # This is a special placeholder for global promotions
        system_store, created = Store.objects.get_or_create(
            id=0,
            defaults={
                'store_name': 'System-Wide Promotions',
                'address': 'N/A',
                'phone_number': 'N/A',
                'manager_id': None
            }
        )
        if created:
            logger.info("Created system-wide store placeholder (id=0)")
        
        # Save with store_id = 0
        promo = serializer.save(store=system_store)
        logger.info(f"Created global promotion {promo.id}: {promo.name}, store_id={promo.store.id if promo.store else 'None'}, scope={promo.scope}")
        return Response(PromoSerializer(promo).data, status=status.HTTP_201_CREATED)
    
    logger.error(f"Validation errors: {serializer.errors}")
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def admin_promo_detail(request, promo_id):
    """Get promotion detail (Admin only)"""
    if not is_admin(request.user):
        return Response({'error': 'Admin access required'}, status=status.HTTP_403_FORBIDDEN)
    
    promo = get_object_or_404(Promo, id=promo_id)
    serializer = PromoSerializer(promo)
    return Response(serializer.data)


@api_view(['PUT', 'PATCH'])
@permission_classes([IsAuthenticated])
def admin_update_promo(request, promo_id):
    """Update promotion (Admin only)"""
    import logging
    logger = logging.getLogger(__name__)
    
    if not is_admin(request.user):
        return Response({'error': 'Admin access required'}, status=status.HTTP_403_FORBIDDEN)
    
    promo = get_object_or_404(Promo, id=promo_id)
    
    # For system-wide promotions, ensure store_id remains 0
    from apps.stores.models import Store
    data = request.data.copy()
    # Remove store field
    if 'store' in data:
        del data['store']
    
    logger.info(f"Admin updating promotion {promo_id} with data: {data}")
    
    serializer = PromoSerializer(promo, data=data, partial=True)
    if serializer.is_valid():
        # Ensure system store exists
        system_store, _ = Store.objects.get_or_create(
            id=0,
            defaults={
                'store_name': 'System-Wide Promotions',
                'address': 'N/A',
                'phone_number': 'N/A',
                'manager_id': None
            }
        )
        
        # Keep store_id = 0 for global promotions
        updated_promo = serializer.save(store=system_store)
        logger.info(f"Updated promotion {promo_id}: {updated_promo.name}, store_id={updated_promo.store.id if updated_promo.store else 'None'}, scope={updated_promo.scope}")
        return Response(PromoSerializer(updated_promo).data)
    
    logger.error(f"Validation errors: {serializer.errors}")
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def admin_delete_promo(request, promo_id):
    """Delete promotion (Admin only)"""
    import logging
    logger = logging.getLogger(__name__)
    
    if not is_admin(request.user):
        return Response({'error': 'Admin access required'}, status=status.HTTP_403_FORBIDDEN)
    
    try:
        promo = Promo.objects.get(id=promo_id)
        promo_name = promo.name
        promo.delete()
        
        logger.info(f"Admin deleted promotion {promo_id}: {promo_name}")
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
    except Exception as e:
        logger.error(f"Error deleting promo {promo_id}: {str(e)}")
        return Response({
            'success': False,
            'error': 'Internal server error'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
