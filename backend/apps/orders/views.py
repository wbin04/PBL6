from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from django.shortcuts import get_object_or_404
from django.core.paginator import Paginator
from django.db.models import Q
from decimal import Decimal
from .models import Order, OrderDetail
from .serializers import OrderSerializer, OrderDetailSerializer
from apps.menu.models import Food
from apps.cart.models import Cart, Item
from apps.promotions.models import Promo
from django.db import connection


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def order_list_create(request):
    """List orders or create new order"""
    if request.method == 'GET':
        # List user's orders sorted by id descending
        orders = Order.objects.filter(user=request.user).order_by('-id')

        # Filter by status
        status_filter = request.GET.get('status')
        if status_filter:
            orders = orders.filter(order_status=status_filter)
        
        # Pagination
        page = request.GET.get('page', 1)
        paginator = Paginator(orders, 10)
        page_obj = paginator.get_page(page)

        # Serialize with request context for is_rated flag
        serializer = OrderSerializer(page_obj, many=True, context={'request': request})
        return Response({
            'count': paginator.count,
            'num_pages': paginator.num_pages,
            'current_page': page_obj.number,
            'has_next': page_obj.has_next(),
            'has_previous': page_obj.has_previous(),
            'results': serializer.data
        })
    
    elif request.method == 'POST':
        # Create new order(s) - split by stores
        try:
            # Get cart
            cart = Cart.objects.get(user=request.user)
            # Retrieve cart items via raw SQL to get food_option_id
            with connection.cursor() as cursor:
                cursor.execute(
                    "SELECT i.food_id, i.quantity, i.item_note, f.store_id, i.food_option_id FROM item i JOIN food f ON i.food_id = f.id WHERE i.cart_id = %s", 
                    [cart.id]
                )
                cart_rows = cursor.fetchall()
            if not cart_rows:
                return Response({'error': 'Cart is empty'}, status=status.HTTP_400_BAD_REQUEST)
            
            # Group cart items by store
            items_by_store = {}
            for food_id, quantity, item_note, store_id, food_option_id in cart_rows:
                if store_id not in items_by_store:
                    items_by_store[store_id] = []
                items_by_store[store_id].append((food_id, quantity, item_note, food_option_id))
            
            # Get food prices for calculating totals
            food_ids = [food_id for food_id, _, _, _, _ in cart_rows]
            foods = {f.id: f for f in Food.objects.filter(id__in=food_ids)}
            
            # Get food options for price calculations
            food_option_ids = [food_option_id for _, _, _, _, food_option_id in cart_rows if food_option_id]
            food_options = {}
            if food_option_ids:
                from apps.menu.models import FoodSize
                food_options = {fs.id: fs for fs in FoodSize.objects.filter(id__in=food_option_ids)}
            
            # Base order data - use Decimal for shipping_fee
            from decimal import Decimal
            shipping_fee = 15000  # Fixed shipping fee per store
            base_order_data = {
                'user_id': request.user.id,
                'receiver_name': request.data.get('receiver_name'),
                'phone_number': request.data.get('phone_number'),
                'ship_address': request.data.get('ship_address'),
                'note': request.data.get('note', ''),
                'payment_method': request.data.get('payment_method', 'COD'),
                'shipping_fee': Decimal(str(shipping_fee))
            }
            
            # Apply promo if provided
            from decimal import Decimal
            promo_discount = Decimal('0')
            applied_promos = []
            
            # Debug: Print received promo data
            print(f"Received promo data: promo_ids={request.data.get('promo_ids')}, discount_amount={request.data.get('discount_amount')}")
            
            # Handle multiple promos (new format)
            promo_ids = request.data.get('promo_ids', [])
            discount_amount = request.data.get('discount_amount', 0)
            
            if promo_ids and discount_amount:
                # Use discount amount calculated by frontend - convert to Decimal
                promo_discount = Decimal(str(discount_amount))
                applied_promos = promo_ids
                # Set first promo as primary for database storage
                base_order_data['promo'] = promo_ids[0] if promo_ids else None
                print(f"Applied multiple promos: {applied_promos}, discount: {promo_discount}")
                
                # Store promo info for order_promo table
                try:
                    from apps.promotions.order_promo import OrderPromo
                    multi_promo_support = True
                except ImportError:
                    multi_promo_support = False
                
                # Validate discount amount is reasonable
                if promo_discount > Decimal('1000000'):  # 1 million VND max discount
                    print(f"ERROR: Discount too large: {promo_discount}")
                    return Response({
                        'error': f'Số tiền giảm giá quá lớn: {promo_discount}'
                    }, status=status.HTTP_400_BAD_REQUEST)
            else:
                # Handle single promo (legacy format)  
                promo_id = request.data.get('promo_id')
                if promo_id:
                    try:
                        from django.utils import timezone
                        now = timezone.now()
                        promo = Promo.objects.get(
                            id=promo_id, 
                            start_date__lte=now,
                            end_date__gte=now
                        )
                        if cart.total_money >= promo.minimum_pay:
                            # Sử dụng method calculate_discount từ model
                            promo_discount = promo.calculate_discount(cart.total_money)
                            base_order_data['promo'] = promo.id
                            applied_promos = [promo_id]
                            print(f"Applied single promo: {promo_id}, discount: {promo_discount}")
                    except Promo.DoesNotExist:
                        print(f"Promo {promo_id} not found or expired")
                        pass
            
            created_orders = []
            first_order_id = None
            
            # Calculate total cart amount for promo distribution
            total_cart_amount = Decimal('0')
            store_subtotals = {}
            for store_id, store_items in items_by_store.items():
                store_subtotal = Decimal('0')
                for food_id, quantity, item_note, food_option_id in store_items:
                    food = foods.get(food_id)
                    if food:
                        # Calculate item total: food_price + food_option_price (if any)
                        item_price = food.price
                        if food_option_id and food_option_id in food_options:
                            item_price += food_options[food_option_id].price
                        store_subtotal += item_price * Decimal(str(quantity))
                store_subtotals[store_id] = store_subtotal
                total_cart_amount += store_subtotal
            
            print(f"Total cart amount: {total_cart_amount}, Promo discount: {promo_discount}")
            print(f"Number of stores: {len(items_by_store)}")
            
            # Create separate order for each store
            for store_id, store_items in items_by_store.items():
                store_subtotal = store_subtotals[store_id]
                
                # Calculate total = subtotal + shipping fee - use Decimal
                shipping_fee_decimal = Decimal(str(shipping_fee))
                store_total_before_discount = store_subtotal + shipping_fee_decimal
                
                print(f"Store {store_id}: subtotal={store_subtotal}, shipping={shipping_fee_decimal}, before_discount={store_total_before_discount}")
                
                # Apply promo discount proportionally based on store subtotal
                store_discount = Decimal('0')
                if promo_discount > Decimal('0') and total_cart_amount > Decimal('0'):
                    # For single store: apply full discount to that store
                    if len(items_by_store) == 1:
                        store_discount = promo_discount
                    else:
                        # For multiple stores: distribute proportionally
                        store_ratio = store_subtotal / total_cart_amount
                        store_discount = (promo_discount * store_ratio).quantize(Decimal('1'), rounding='ROUND_HALF_UP')
                    
                    print(f"Store {store_id}: calculated discount={store_discount}")
                    
                    # Apply discount but ensure total >= shipping_fee
                    store_total = max(shipping_fee_decimal, store_total_before_discount - store_discount)
                    # Round to 3 decimal places
                    store_total = store_total.quantize(Decimal('0.001'), rounding='ROUND_HALF_UP')
                    print(f"Store {store_id}: final total after discount={store_total}")
                else:
                    store_total = store_total_before_discount.quantize(Decimal('0.001'), rounding='ROUND_HALF_UP')
                    print(f"Store {store_id}: no discount applied, final total={store_total}")
                
                # Validate total_money is reasonable  
                if store_total > Decimal('9999999999.999'):  # Max 13 digits with 3 decimal places
                    print(f"ERROR: Store {store_id} total too large: {store_total}")
                    print(f"DEBUG: subtotal={store_subtotal}, shipping={shipping_fee_decimal}, discount={store_discount}")
                    print(f"DEBUG: before_discount={store_total_before_discount}")
                    return Response({
                        'error': f'Calculated total for store {store_id} is too large: {store_total}. Subtotal: {store_subtotal}, Shipping: {shipping_fee_decimal}, Discount: {store_discount}'
                    }, status=status.HTTP_400_BAD_REQUEST)
                
                # Round to 3 decimal places
                store_total = round(store_total, 3)
                
                # Create order data for this store
                order_data = base_order_data.copy()
                order_data['total_money'] = store_total
                order_data['store_id'] = store_id
                
                # Only set promo on the first order (for database storage)
                if len(created_orders) > 0:
                    order_data.pop('promo', None)
                
                serializer = OrderSerializer(data=order_data)
                if serializer.is_valid():
                    order = serializer.save()
                    
                    # Set group_id - first order's id becomes the group_id for all
                    if first_order_id is None:
                        first_order_id = order.id
                    
                    order.group_id = first_order_id
                    
                    # Update financial fields if they exist
                    if hasattr(order, 'total_before_discount'):
                        # Calculate store subtotal without shipping
                        store_subtotal_only = store_total - shipping_fee_decimal
                        if len(created_orders) == 0 and promo_discount > Decimal('0'):
                            # For first order, apply proportional discount
                            store_discount = promo_discount  # Apply full discount to first store for simplicity
                        else:
                            store_discount = Decimal('0')
                            
                        order.total_before_discount = store_subtotal_only + shipping_fee_decimal
                        order.total_discount = store_discount
                        order.total_after_discount = max(shipping_fee_decimal, order.total_before_discount - store_discount)
                        order.total_money = order.total_after_discount  # Keep legacy field in sync
                    
                    order.save()
                    
                    # Save multiple promotions if supported
                    if len(created_orders) == 0 and applied_promos and multi_promo_support:
                        try:
                            for promo_id in applied_promos:
                                promo = Promo.objects.get(id=promo_id)
                                # Calculate individual promo discount
                                individual_discount = promo.calculate_discount(store_subtotal_only)
                                OrderPromo.objects.create(
                                    order=order,
                                    promo=promo,
                                    applied_amount=individual_discount
                                )
                        except Exception as e:
                            print(f"Warning: Could not save multiple promos: {e}")
                    
                    # Insert order details for this store
                    with connection.cursor() as cursor:
                        for food_id, quantity, item_note, food_option_id in store_items:
                            food = foods.get(food_id)
                            if food:
                                # Get food_option price if exists
                                food_option_price = None
                                if food_option_id and food_option_id in food_options:
                                    food_option_price = food_options[food_option_id].price
                                
                                # Insert order detail with separate food_price and food_option_price
                                cursor.execute(
                                    "INSERT INTO order_detail (order_id, food_id, food_option_id, quantity, food_price, food_option_price, food_note) VALUES (%s, %s, %s, %s, %s, %s, %s)",
                                    [order.id, food_id, food_option_id, quantity, food.price, food_option_price, item_note]
                                )
                    
                    created_orders.append(order)
                else:
                    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
            
            # Clear cart items via raw SQL and update total
            with connection.cursor() as cursor:
                cursor.execute("DELETE FROM item WHERE cart_id = %s", [cart.id])
            cart.update_total()
            
            # Return all created orders
            serializer = OrderSerializer(created_orders, many=True)
            return Response({
                'message': f'Đã tạo {len(created_orders)} đơn hàng cho {len(items_by_store)} cửa hàng',
                'group_id': first_order_id,
                'orders': serializer.data
            }, status=status.HTTP_201_CREATED)
            
        except Cart.DoesNotExist:
            return Response({'error': 'No cart found'}, status=status.HTTP_404_NOT_FOUND)


@api_view(['GET', 'PUT'])
@permission_classes([IsAuthenticated])
def order_detail(request, pk):
    """Get or update order detail"""
    order = get_object_or_404(Order, pk=pk, user=request.user)
    if request.method == 'GET':
        serializer = OrderSerializer(order, context={'request': request})
        return Response(serializer.data)
    # PUT: update receiver info if status is 'Chờ xác nhận'
    if order.order_status != 'Chờ xác nhận':
        return Response({'error': 'Không thể cập nhật đơn hàng này'}, status=status.HTTP_400_BAD_REQUEST)
    # Update allowed fields
    order.receiver_name = request.data.get('receiver_name', order.receiver_name)
    order.phone_number = request.data.get('phone_number', order.phone_number)
    order.ship_address = request.data.get('ship_address', order.ship_address)
    order.note = request.data.get('note', order.note)
    order.save()
    serializer = OrderSerializer(order)
    return Response(serializer.data)


@api_view(['PUT'])
@permission_classes([IsAuthenticated])
def update_order_status(request, pk):
    """Update order status"""
    print(f"=== UPDATE ORDER STATUS DEBUG ===")
    print(f"Order ID: {pk}")
    print(f"Request data: {request.data}")
    print(f"User: {request.user}")
    
    order = get_object_or_404(Order, pk=pk, user=request.user)
    
    new_status = request.data.get('order_status')
    cancel_reason = request.data.get('cancel_reason')
    
    print(f"New status: {new_status}")
    print(f"Cancel reason: {cancel_reason}")
    
    # Only allow customer to cancel with Vietnamese status
    if new_status not in ['Đã hủy']:
        return Response({'error': 'Trạng thái không hợp lệ'}, status=status.HTTP_400_BAD_REQUEST)
    
    # Only cancel if current status is 'Chờ xác nhận'
    if order.order_status not in ['Chờ xác nhận']:
        return Response({'error': 'Không thể hủy đơn hàng này'}, status=status.HTTP_400_BAD_REQUEST)
    
    order.order_status = new_status
    if cancel_reason:
        order.cancel_reason = cancel_reason
        print(f"Saved cancel_reason: {cancel_reason}")
    
    # Set cancellation information
    if new_status == 'Đã hủy':
        from apps.orders.models import get_vietnam_time
        order.cancelled_date = get_vietnam_time()
        order.cancelled_by_role = 'Khách hàng'  # Customer is cancelling
        print(f"Set cancelled_date and cancelled_by_role: Khách hàng")
    
    order.save()
    print(f"Order saved successfully")
    print(f"=== END UPDATE ORDER STATUS DEBUG ===")
    
    return Response(OrderSerializer(order).data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def cancel_order_group(request, pk):
    """Cancel all orders in a group after checking conditions"""
    order = get_object_or_404(Order, pk=pk, user=request.user)
    
    # If order has no group_id, treat as single order cancellation
    if not order.group_id:
        return update_order_status(request, pk)
    
    # Get all orders in the same group
    group_orders = Order.objects.filter(group_id=order.group_id, user=request.user)
    
    # Check if all orders in group are still "Chờ xác nhận"
    non_pending_orders = group_orders.exclude(order_status='Chờ xác nhận')
    if non_pending_orders.exists():
        non_pending_list = list(non_pending_orders.values_list('id', 'order_status'))
        return Response({
            'error': 'Không thể hủy nhóm đơn hàng này. Có đơn hàng đã được xử lý.',
            'non_pending_orders': non_pending_list
        }, status=status.HTTP_400_BAD_REQUEST)
    
    # Get group order details for confirmation message
    group_details = []
    for group_order in group_orders:
        group_details.append({
            'id': group_order.id,
            'store_name': group_order.store.store_name if group_order.store else 'Chưa xác định',
            'total_money': float(group_order.total_money),
            'order_status': group_order.order_status
        })
    
    # If this is just a check request, return group details
    if request.data.get('check_only'):
        return Response({
            'can_cancel': True,
            'group_orders': group_details,
            'total_orders': len(group_details)
        })
    
    # If confirmed, cancel all orders in the group
    if request.data.get('confirmed'):
        cancelled_orders = []
        from apps.orders.models import get_vietnam_time
        cancel_time = get_vietnam_time()
        
        for group_order in group_orders:
            group_order.order_status = 'Đã hủy'
            group_order.delivery_status = 'Đã hủy'
            group_order.cancelled_date = cancel_time
            group_order.cancelled_by_role = 'Khách hàng'  # Group cancellation is done by customer
            group_order.save()
            cancelled_orders.append(group_order.id)
        
        return Response({
            'message': f'Đã hủy thành công {len(cancelled_orders)} đơn hàng trong nhóm',
            'cancelled_orders': cancelled_orders
        })
    
    # If not confirmed, return group details for user confirmation
    return Response({
        'requires_confirmation': True,
        'group_orders': group_details,
        'total_orders': len(group_details),
        'message': f'Bạn sắp hủy {len(group_details)} đơn hàng. Xác nhận để tiếp tục.'
    })


# Admin-only views for order management
def is_admin(user):
    return user.is_authenticated and user.role_id and user.role_id == 2

def is_store_manager(user):
    return user.is_authenticated and user.role_id and user.role_id == 3

def is_admin_or_store_manager(user):
    return is_admin(user) or is_store_manager(user)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def admin_orders_list(request):
    if not is_admin_or_store_manager(request.user):
        return Response({'error': 'Admin or Store Manager access required'}, status=status.HTTP_403_FORBIDDEN)
    
    # List orders sorted by descending ID
    orders = Order.objects.select_related('user').order_by('-id')
    # If store manager, filter orders by their store
    if is_store_manager(request.user):
        from apps.stores.models import Store
        try:
            user_store = Store.objects.get(manager=request.user)
            orders = orders.filter(orderdetail__food__store=user_store).distinct()
        except Store.DoesNotExist:
            return Response({'error': 'Store not found for user'}, status=status.HTTP_404_NOT_FOUND)
        except Exception:
            return Response({'error': 'Store not found for user'}, status=status.HTTP_404_NOT_FOUND)
    
    # Filter by status
    status_filter = request.GET.get('status')
    if status_filter:
        orders = orders.filter(order_status=status_filter)
    
    # Search by customer info, order ID, or receiver name
    search = request.GET.get('search')
    if search:
        orders = orders.filter(
            Q(user__fullname__icontains=search) |
            Q(user__phone_number__icontains=search) |
            Q(user__email__icontains=search) |
            Q(id__icontains=search) |
            Q(receiver_name__icontains=search)
        )
    
    # Pagination
    page = request.GET.get('page', 1)
    paginator = Paginator(orders, 10)
    page_obj = paginator.get_page(page)
    
    serializer = OrderSerializer(page_obj, many=True)
    return Response({
        'orders': serializer.data,
        'total_pages': paginator.num_pages,
        'current_page': int(page),
        'total_orders': paginator.count
    })


@api_view(['GET', 'PUT'])
@permission_classes([IsAuthenticated])
def admin_order_detail(request, order_id):
    if not is_admin(request.user):
        return Response({'error': 'Admin access required'}, status=status.HTTP_403_FORBIDDEN)
    
    try:
        order = Order.objects.select_related('user').get(id=order_id)
    except Order.DoesNotExist:
        return Response({'error': 'Order not found'}, status=status.HTTP_404_NOT_FOUND)
    
    if request.method == 'GET':
        serializer = OrderSerializer(order)
        return Response(serializer.data)
    
    elif request.method == 'PUT':
        # Admin can update order status
        new_status = request.data.get('order_status')
        valid_statuses = [
            'Chờ xác nhận', 'Đã xác nhận', 'Đang chuẩn bị', 
            'Đang giao', 'Đã giao', 'Đã hủy'
        ]
        
        if new_status not in valid_statuses:
            return Response({'error': 'Invalid status'}, status=status.HTTP_400_BAD_REQUEST)
        
        order.order_status = new_status
        order.save()
        
        serializer = OrderSerializer(order)
        return Response(serializer.data)


@api_view(['PUT'])
@permission_classes([IsAuthenticated])
def assign_shipper(request, order_id):
    """Assign shipper to order (Admin only)"""
    if not is_admin(request.user):
        return Response({'error': 'Admin access required'}, status=status.HTTP_403_FORBIDDEN)
    
    try:
        order = Order.objects.get(id=order_id)
    except Order.DoesNotExist:
        return Response({'error': 'Order not found'}, status=status.HTTP_404_NOT_FOUND)
    
    shipper_id = request.data.get('shipper_id')
    
    if shipper_id:
        # Assign shipper
        from apps.shipper.models import Shipper
        try:
            shipper = Shipper.objects.get(id=shipper_id)
            order.shipper = shipper
            # Auto update status if assigning shipper
            if order.order_status in ['Chờ xác nhận', 'Đã xác nhận']:
                order.order_status = 'Đang giao'
        except Shipper.DoesNotExist:
            return Response({'error': 'Shipper not found'}, status=status.HTTP_404_NOT_FOUND)
    else:
        # Unassign shipper
        order.shipper = None
        # Revert status if unassigning shipper
        if order.order_status == 'Đang giao':
            order.order_status = 'Đã xác nhận'
    
    order.save()
    
    serializer = OrderSerializer(order)
    return Response({
        'message': 'Shipper assignment updated successfully',
        'order': serializer.data
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def shipper_orders(request):
    """Get orders assigned to current shipper"""
    from apps.shipper.models import Shipper
    
    try:
        shipper = Shipper.objects.get(user=request.user)
    except Shipper.DoesNotExist:
        return Response({'error': 'User is not a shipper'}, status=status.HTTP_403_FORBIDDEN)
    
    # Get orders assigned to this shipper
    orders = Order.objects.filter(shipper=shipper).order_by('-id')
    
    # Filter by status
    status_filter = request.GET.get('status')
    if status_filter:
        orders = orders.filter(order_status=status_filter)
    
    # Pagination
    page = request.GET.get('page', 1)
    paginator = Paginator(orders, 10)
    page_obj = paginator.get_page(page)
    
    serializer = OrderSerializer(page_obj, many=True, context={'request': request})
    return Response({
        'count': paginator.count,
        'num_pages': paginator.num_pages,
        'current_page': page_obj.number,
        'has_next': page_obj.has_next(),
        'has_previous': page_obj.has_previous(),
        'results': serializer.data
    })


@api_view(['PUT'])
@permission_classes([IsAuthenticated])
def update_delivery_status(request, order_id):
    """Update delivery status by shipper"""
    from apps.shipper.models import Shipper
    
    try:
        shipper = Shipper.objects.get(user=request.user)
    except Shipper.DoesNotExist:
        return Response({'error': 'User is not a shipper'}, status=status.HTTP_403_FORBIDDEN)
    
    try:
        order = Order.objects.get(id=order_id, shipper=shipper)
    except Order.DoesNotExist:
        return Response({'error': 'Order not found or not assigned to you'}, status=status.HTTP_404_NOT_FOUND)
    
    new_status = request.data.get('order_status')
    
    # Shipper can only update between 'Đang giao' and 'Đã giao'
    valid_transitions = {
        'Đang giao': ['Đã giao'],
        'Đã giao': []  # Cannot change from delivered
    }
    
    current_status = order.order_status
    if current_status not in valid_transitions:
        return Response({
            'error': f'Cannot update status from {current_status}'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    if new_status not in valid_transitions[current_status]:
        return Response({
            'error': f'Invalid status transition from {current_status} to {new_status}'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    order.order_status = new_status
    order.save()
    
    serializer = OrderSerializer(order)
    return Response({
        'message': 'Delivery status updated successfully',
        'order': serializer.data
    })


@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
def admin_update_order_status(request, pk):
    """Update order status by admin or store manager"""
    try:
        # Admin can access all orders, store manager can only access their store orders
        if request.user.role == 'Quản lý':  # Admin
            order = get_object_or_404(Order, pk=pk)
        else:
            # Store manager - check if order belongs to their store
            # This would need store management logic implementation
            order = get_object_or_404(Order, pk=pk)
        
        new_status = request.data.get('order_status')
        cancel_reason = request.data.get('cancel_reason')
        
        if not new_status:
            return Response({'error': 'order_status is required'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Determine cancellation role based on user role
        cancelled_by_role = None
        if new_status == 'Đã hủy':
            if request.user.role == 'Quản lý':
                cancelled_by_role = 'Quản lý'
            else:
                cancelled_by_role = 'Cửa hàng'  # Store manager
        
        # Validate status transition (admin has more freedom)
        valid_statuses = ['Chờ xác nhận', 'Đã xác nhận', 'Đang chuẩn bị', 'Sẵn sàng', 'Đã lấy hàng', 'Đã giao', 'Đã hủy']
        if new_status not in valid_statuses:
            return Response({'error': 'Invalid status'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Update order
        order.order_status = new_status
        if cancel_reason:
            order.cancel_reason = cancel_reason
        
        # Set cancellation info if being cancelled
        if new_status == 'Đã hủy':
            from apps.orders.models import get_vietnam_time
            order.cancelled_date = get_vietnam_time()
            order.cancelled_by_role = cancelled_by_role
        
        order.save()
        
        return Response(OrderSerializer(order).data)
        
    except Order.DoesNotExist:
        return Response({'error': 'Order not found'}, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
