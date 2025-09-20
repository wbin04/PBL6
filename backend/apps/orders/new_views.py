# New order creation view with multiple promotions support

from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from django.db import transaction
from decimal import Decimal

from .models import Order, OrderDetail
from apps.promotions.models import Promo, OrderPromo
from apps.cart.models import Cart, Item
from .serializers import OrderSerializer


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_order_with_multiple_promos(request):
    """Create order with support for multiple promotions"""
    try:
        with transaction.atomic():
            # Get cart
            cart = Cart.objects.get(user=request.user)
            
            # Group cart items by store
            items_by_store = {}
            cart_items = cart.items.select_related('food__store')
            
            for item in cart_items:
                store_id = item.food.store.id
                if store_id not in items_by_store:
                    items_by_store[store_id] = []
                items_by_store[store_id].append(item)
            
            if not items_by_store:
                return Response({'error': 'Cart is empty'}, status=status.HTTP_400_BAD_REQUEST)
            
            # Get promo IDs from request
            promo_ids = request.data.get('promo_ids', [])
            valid_promos = []
            
            if promo_ids:
                valid_promos = Promo.objects.filter(
                    id__in=promo_ids, 
                    is_active=True
                )
            
            # Base order data
            shipping_fee = Decimal('15000')  # Fixed shipping fee per store
            base_order_data = {
                'user': request.user,
                'receiver_name': request.data.get('receiver_name'),
                'phone_number': request.data.get('phone_number'),
                'ship_address': request.data.get('ship_address'),
                'note': request.data.get('note', ''),
                'payment_method': request.data.get('payment_method', 'COD'),
                'shipping_fee': shipping_fee
            }
            
            created_orders = []
            first_order_id = None
            
            # Create separate order for each store
            for store_id, store_items in items_by_store.items():
                # Calculate subtotal for this store
                store_subtotal = Decimal('0')
                for item in store_items:
                    store_subtotal += item.food.price * item.quantity
                
                # Create order
                order = Order.objects.create(
                    **base_order_data,
                    store_id=store_id,
                    total_before_discount=store_subtotal + shipping_fee,
                    total_discount=Decimal('0'),
                    total_after_discount=store_subtotal + shipping_fee
                )
                
                # Set group_id
                if first_order_id is None:
                    first_order_id = order.id
                order.group_id = first_order_id
                order.save()
                
                # Create order details
                for item in store_items:
                    OrderDetail.objects.create(
                        order=order,
                        food=item.food,
                        quantity=item.quantity,
                        price=item.food.price,
                        food_note=item.item_note or ''
                    )
                
                # Apply promotions for this store
                for promo in valid_promos:
                    if promo.scope == 'GLOBAL' or (promo.scope == 'STORE' and promo.store_id == store_id):
                        if promo.is_valid_for_order(store_subtotal, store_id):
                            # Create OrderPromo - trigger will calculate applied_amount
                            OrderPromo.objects.create(
                                order=order,
                                promo=promo
                            )
                
                created_orders.append(order)
            
            # Clear cart
            cart.items.all().delete()
            cart.update_total()
            
            # Return response
            serializer = OrderSerializer(created_orders, many=True)
            return Response({
                'message': f'Đã tạo {len(created_orders)} đơn hàng cho {len(items_by_store)} cửa hàng',
                'group_id': first_order_id,
                'orders': serializer.data
            }, status=status.HTTP_201_CREATED)
            
    except Cart.DoesNotExist:
        return Response({'error': 'No cart found'}, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
