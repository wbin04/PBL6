from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from django.shortcuts import get_object_or_404
from django.core.paginator import Paginator
from django.db.models import Q
from decimal import Decimal, ROUND_HALF_UP
from .models import Order, OrderDetail
from .serializers import OrderSerializer, OrderDetailSerializer
from apps.menu.models import Food
from apps.cart.models import Cart, Item
from apps.promotions.models import Promo
from django.db import connection
from apps.stores.models import Store
from apps.utils.shipping import (
    driving_distance_km,
    calculate_shipping_fee,
    normalize_coordinate,
)


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def order_list_create(request):
    """List orders or create new order"""
    if request.method == 'GET':
        # Check if this is a shipper query for available orders
        shipper_filter = request.GET.get('shipper__isnull')
        delivery_status_filter = request.GET.get('delivery_status')
        
        if shipper_filter == 'true' and delivery_status_filter:
            # This is a request for available orders (shipper use case)
            orders = Order.objects.filter(
                shipper__isnull=True,
                delivery_status=delivery_status_filter
            ).exclude(
                Q(order_status='Đã hủy') | Q(order_status='Đã huỷ')  # Exclude cancelled orders (both spellings)
            ).exclude(
                Q(delivery_status='Đã hủy') | Q(delivery_status='Đã huỷ')  # Also exclude by delivery_status (both spellings)
            ).order_by('-created_date')
        else:
            # List user's orders sorted by id descending (normal user use case)
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

            store_ids = [store_id for store_id in items_by_store.keys() if store_id is not None]
            stores_cache = {store.id: store for store in Store.objects.filter(id__in=store_ids)}
            
            # Get food prices for calculating totals
            food_ids = [food_id for food_id, _, _, _, _ in cart_rows]
            foods = {f.id: f for f in Food.objects.filter(id__in=food_ids)}
            
            # Get food options for price calculations
            food_option_ids = [food_option_id for _, _, _, _, food_option_id in cart_rows if food_option_id]
            food_options = {}
            if food_option_ids:
                from apps.menu.models import FoodSize
                food_options = {fs.id: fs for fs in FoodSize.objects.filter(id__in=food_option_ids)}
            
            # Determine drop-off coordinates (prefer request payload, fallback to profile)
            customer_latitude = normalize_coordinate(request.data.get('ship_latitude'))
            customer_longitude = normalize_coordinate(request.data.get('ship_longitude'))

            if customer_latitude is None or customer_longitude is None:
                customer_latitude = normalize_coordinate(getattr(request.user, 'latitude', None))
                customer_longitude = normalize_coordinate(getattr(request.user, 'longitude', None))

            # Base order data
            base_order_data = {
                'user_id': request.user.id,
                'receiver_name': request.data.get('receiver_name'),
                'phone_number': request.data.get('phone_number'),
                'ship_address': request.data.get('ship_address'),
                'ship_latitude': customer_latitude,
                'ship_longitude': customer_longitude,
                'note': request.data.get('note', ''),
                'payment_method': request.data.get('payment_method', 'COD'),
            }
            
            # Apply promo if provided
            promo_discount = Decimal('0')
            applied_promos = []
            
            # Debug: Print received promo data
            print(f"Received promo data: promo_ids={request.data.get('promo_ids')}, discount_amount={request.data.get('discount_amount')}")
            
            # Handle multiple promos (new format)
            promo_ids = request.data.get('promo_ids', [])
            discount_amount = request.data.get('discount_amount', 0)
            promo_details = request.data.get('promo_details', [])  # New: detailed promo info
            
            if promo_ids and discount_amount:
                # Use discount amount calculated by frontend - convert to Decimal
                promo_discount = Decimal(str(discount_amount))
                applied_promos = promo_ids
                # Set first promo as primary for database storage
                base_order_data['promo'] = promo_ids[0] if promo_ids else None
                print(f"Applied multiple promos: {applied_promos}, discount: {promo_discount}")
                print(f"Promo details: {promo_details}")
                
                # Store promo info for order_promo table
                try:
                    from apps.promotions.order_promo import OrderPromo
                    multi_promo_support = True
                except ImportError:
                    multi_promo_support = False
                
                # Validate discount amount is reasonable
                if promo_discount > Decimal('10000000'):  # 10 million VND max discount
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
                
                store_obj = stores_cache.get(store_id)
                distance_km = None
                route_polyline = None
                if store_obj:
                    route_info = driving_distance_km(
                        getattr(store_obj, 'latitude', None),
                        getattr(store_obj, 'longitude', None),
                        customer_latitude,
                        customer_longitude,
                    )
                    distance_km = route_info.distance_km
                    route_polyline = route_info.polyline

                shipping_fee_decimal = calculate_shipping_fee(distance_km)
                store_total_before_discount = store_subtotal + shipping_fee_decimal
                
                print(f"Store {store_id}: subtotal={store_subtotal}, distance_km={distance_km}, shipping={shipping_fee_decimal}, before_discount={store_total_before_discount}")
                
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
                    store_total = store_total.quantize(Decimal('0.001'), rounding=ROUND_HALF_UP)
                    print(f"Store {store_id}: final total after discount={store_total}")
                else:
                    store_total = store_total_before_discount.quantize(Decimal('0.001'), rounding=ROUND_HALF_UP)
                    print(f"Store {store_id}: no discount applied, final total={store_total}")
                
                # Validate total_money is reasonable  
                if store_total > Decimal('9999999999.999'):  # Max 13 digits with 3 decimal places
                    print(f"ERROR: Store {store_id} total too large: {store_total}")
                    print(f"DEBUG: subtotal={store_subtotal}, shipping={shipping_fee_decimal}, discount={store_discount}")
                    print(f"DEBUG: before_discount={store_total_before_discount}")
                    return Response({
                        'error': f'Calculated total for store {store_id} is too large: {store_total}. Subtotal: {store_subtotal}, Shipping: {shipping_fee_decimal}, Discount: {store_discount}'
                    }, status=status.HTTP_400_BAD_REQUEST)
                
                # Create order data for this store
                order_data = base_order_data.copy()
                # total_money should be FOOD ONLY (no shipping, no discount applied)
                order_data['total_money'] = float(store_subtotal)
                order_data['store_id'] = store_id
                order_data['shipping_fee'] = shipping_fee_decimal
                if route_polyline:
                    order_data['route_polyline'] = route_polyline
                
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
                    if route_polyline and not order.route_polyline:
                        order.route_polyline = route_polyline
                    
                    # Update financial fields if they exist
                    if hasattr(order, 'total_before_discount'):
                        # total_money is already set to store_subtotal (food only)
                        # Now calculate with shipping and discount
                        order.total_before_discount = store_subtotal + shipping_fee_decimal
                        order.total_discount = store_discount
                        order.total_after_discount = max(shipping_fee_decimal, order.total_before_discount - store_discount)
                        # total_money remains as food subtotal only (no shipping, no discount)
                    
                    order.save()
                    
                    # Save promotions for this specific store
                    if applied_promos and multi_promo_support and promo_details:
                        try:
                            # Find promos that apply to this store
                            for promo_detail in promo_details:
                                promo_id = promo_detail.get('promo_id')
                                promo_store_id = promo_detail.get('store_id')
                                promo_discount_amount = Decimal(str(promo_detail.get('discount', 0)))
                                
                                # Apply promo to this order if:
                                # 1. It's a system-wide promo (store_id = 0), OR
                                # 2. It's specific to this store
                                if promo_store_id == 0:
                                    # System-wide promo: distribute proportionally
                                    if total_cart_amount > Decimal('0'):
                                        store_ratio = store_subtotal / total_cart_amount
                                        individual_discount = (promo_discount_amount * store_ratio).quantize(Decimal('0.01'), rounding='ROUND_HALF_UP')
                                    else:
                                        individual_discount = Decimal('0')
                                elif promo_store_id == store_id:
                                    # Store-specific promo: full discount
                                    individual_discount = promo_discount_amount
                                else:
                                    # This promo doesn't apply to this store
                                    continue
                                
                                if individual_discount > Decimal('0'):
                                    promo = Promo.objects.get(id=promo_id)
                                    OrderPromo.objects.create(
                                        order=order,
                                        promo=promo,
                                        applied_amount=individual_discount,
                                        note=f"Store {store_id}"
                                    )
                                    print(f"Saved promo {promo_id} for order {order.id}, store {store_id}, discount: {individual_discount}")
                        except Exception as e:
                            print(f"Warning: Could not save promos for store {store_id}: {e}")
                            import traceback
                            traceback.print_exc()
                    
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
    bank_name = request.data.get('bank_name')
    bank_account = request.data.get('bank_account')
    refund_requested_flag = request.data.get('refund_requested')
    
    print(f"New status: {new_status}")
    print(f"Cancel reason: {cancel_reason}")
    
    # Only allow customer to cancel with Vietnamese status
    if new_status not in ['Đã huỷ', 'Đã hủy']:
        return Response({'error': 'Trạng thái không hợp lệ'}, status=status.HTTP_400_BAD_REQUEST)
    
    # Only cancel if current status is 'Chờ xác nhận'
    if order.order_status not in ['Chờ xác nhận']:
        return Response({'error': 'Không thể hủy đơn hàng này'}, status=status.HTTP_400_BAD_REQUEST)
    
    order.order_status = new_status
    if cancel_reason:
        order.cancel_reason = cancel_reason
        print(f"Saved cancel_reason: {cancel_reason}")
    
    # Set cancellation information
    if new_status == 'Đã huỷ':
        from apps.orders.models import get_vietnam_time
        order.cancelled_date = get_vietnam_time()
        order.cancelled_by_role = 'Khách hàng'  # Customer is cancelling
        print(f"Set cancelled_date and cancelled_by_role: Khách hàng")

        # Handle refund info when non-cash payment
        non_cash_payment = str(order.payment_method).lower() not in ['cash', 'cod']
        refund_requested = refund_requested_flag is True or non_cash_payment
        if refund_requested:
            order.refund_requested = True
            order.refund_status = 'Chờ xử lý'
            if bank_name:
                order.bank_name = bank_name
            if bank_account:
                order.bank_account = bank_account
    
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
    
    # Pagination with configurable per_page
    page = request.GET.get('page', 1)
    per_page = min(int(request.GET.get('per_page', 10)), 100)  # Max 100 per page for performance
    paginator = Paginator(orders, per_page)
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
    orders = Order.objects.filter(shipper=shipper).order_by('-created_date')
    
    # Filter by delivery status or order status
    status_filter = request.GET.get('delivery_status') or request.GET.get('status') 
    if status_filter:
        if status_filter == 'Đã hủy' or status_filter == 'Đã huỷ':
            # For cancelled tab, show orders where EITHER delivery_status OR order_status is cancelled
            # Handle both spellings: "Đã hủy" and "Đã huỷ"
            # This handles cases where customer cancels after shipper acceptance (delivery_status="Đã xác nhận", order_status="Đã huỷ")
            orders = Order.objects.filter(
                Q(delivery_status='Đã hủy') | Q(order_status='Đã hủy') |
                Q(delivery_status='Đã huỷ') | Q(order_status='Đã huỷ'),
                shipper=shipper
            ).order_by('-created_date')
            print(f"DEBUG: Filtering cancelled orders for shipper {shipper.id}")
        else:
            # For other statuses, filter by delivery_status and exclude cancelled orders
            if status_filter == 'Đã xác nhận':
                # For accepted orders, show only those that are not cancelled by customer
                orders = orders.filter(
                    delivery_status=status_filter
                ).exclude(
                    Q(order_status='Đã hủy') | Q(order_status='Đã huỷ')  # Exclude customer-cancelled orders (both spellings)
                )
                print(f"DEBUG: Filtering accepted orders (excluding customer-cancelled) for shipper {shipper.id}")
            else:
                # For other statuses, filter normally
                try:
                    orders = orders.filter(delivery_status=status_filter)
                    print(f"DEBUG: Filtering by delivery_status: {status_filter}")
                except:
                    orders = orders.filter(order_status=status_filter)
                    print(f"DEBUG: Filtering by order_status: {status_filter}")
    
    print(f"DEBUG: Found {orders.count()} orders for shipper {shipper.id}")
    
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
    
    new_status = request.data.get('delivery_status') or request.data.get('order_status')
    
    # Define valid delivery status transitions for shipper
    valid_transitions = {
        'Chờ xác nhận': ['Đã xác nhận'],   # Can accept pending orders
        'Đã xác nhận': ['Đã lấy hàng'],    # After accepting, can pick up
        'Đã lấy hàng': ['Đang giao'],      # After pickup, start delivery  
        'Đang giao': ['Đã giao'],          # After delivery start, mark as delivered
        'Đã giao': []                       # Cannot change from delivered
    }
    
    current_status = order.delivery_status  # Use delivery_status instead of order_status
    if current_status not in valid_transitions:
        return Response({
            'error': f'Cannot update delivery status from {current_status}'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    if new_status not in valid_transitions[current_status]:
        return Response({
            'error': f'Invalid delivery status transition from {current_status} to {new_status}'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    order.delivery_status = new_status  # Update delivery_status instead of order_status
    
    # Also update order_status based on delivery_status for consistency
    if new_status == 'Đã lấy hàng':
        order.order_status = 'Đã lấy hàng'
    elif new_status == 'Đang giao':
        order.order_status = 'Đang giao'  
    elif new_status == 'Đã giao':
        order.order_status = 'Đã giao'
    
    print(f"DEBUG: Updating order {order.id}")
    print(f"DEBUG: Before save - delivery_status: {order.delivery_status}, order_status: {order.order_status}")
    
    order.save()
    
    # Refresh from database to verify
    order.refresh_from_db()
    print(f"DEBUG: After save - delivery_status: {order.delivery_status}, order_status: {order.order_status}")
    
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
        bank_name = request.data.get('bank_name')
        bank_account = request.data.get('bank_account')
        refund_requested_flag = request.data.get('refund_requested')
        
        if not new_status:
            return Response({'error': 'order_status is required'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Determine cancellation role based on user role
        cancelled_by_role = None
        if new_status in ['Đã huỷ', 'Đã hủy']:
            if request.user.role == 'Quản lý':
                cancelled_by_role = 'Quản lý'
            else:
                cancelled_by_role = 'Cửa hàng'  # Store manager
        
        # Validate status transition (admin has more freedom)
        valid_statuses = ['Chờ xác nhận', 'Đã xác nhận', 'Đang chuẩn bị', 'Sẵn sàng', 'Đã lấy hàng', 'Đã giao', 'Đã huỷ']
        if new_status not in valid_statuses:
            return Response({'error': 'Invalid status'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Update order
        order.order_status = new_status
        if cancel_reason:
            order.cancel_reason = cancel_reason
        
        # Set cancellation info if being cancelled
        if new_status in ['Đã huỷ', 'Đã hủy']:
            from apps.orders.models import get_vietnam_time
            order.cancelled_date = get_vietnam_time()
            order.cancelled_by_role = cancelled_by_role

            # Handle refund info if supplied or required
            non_cash_payment = str(order.payment_method).lower() not in ['cash', 'cod']
            refund_requested = refund_requested_flag is True or non_cash_payment
            if refund_requested:
                order.refund_requested = True
                order.refund_status = 'Chờ xử lý'
                if bank_name:
                    order.bank_name = bank_name
                if bank_account:
                    order.bank_account = bank_account
        
        order.save()
        
        return Response(OrderSerializer(order).data)
        
    except Order.DoesNotExist:
        return Response({'error': 'Order not found'}, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def shipper_accept_order(request, order_id):
    """Allow shipper to accept an available order"""
    from apps.shipper.models import Shipper
    
    try:
        shipper = Shipper.objects.get(user=request.user)
    except Shipper.DoesNotExist:
        return Response({'error': 'User is not a shipper'}, status=status.HTTP_403_FORBIDDEN)
    
    try:
        # Find order that has no shipper assigned and is waiting for confirmation
        order = Order.objects.get(
            id=order_id, 
            shipper__isnull=True,
            delivery_status='Chờ xác nhận'
        )
    except Order.DoesNotExist:
        return Response({
            'error': 'Order not found or already assigned to another shipper'
        }, status=status.HTTP_404_NOT_FOUND)
    
    # Assign shipper and update status
    order.shipper = shipper
    order.delivery_status = 'Đã xác nhận'
    
    print(f"DEBUG: Accepting order {order.id}")
    print(f"DEBUG: Before save - shipper: {order.shipper}, delivery_status: {order.delivery_status}")
    
    order.save()
    
    # Refresh from database to verify
    order.refresh_from_db()
    print(f"DEBUG: After save - shipper: {order.shipper}, delivery_status: {order.delivery_status}")
    
    serializer = OrderSerializer(order)
    return Response({
        'message': 'Order accepted successfully',
        'order': serializer.data
    })


@api_view(['GET'])
# @permission_classes([IsAuthenticated])  # Tạm thời comment để test
def get_orders_by_shipper(request, shipper_id):
    """Get orders assigned to specific shipper"""
    from apps.shipper.models import Shipper
    
    try:
        shipper = Shipper.objects.get(id=shipper_id)
    except Shipper.DoesNotExist:
        return Response({'error': 'Shipper not found'}, status=status.HTTP_404_NOT_FOUND)
    
    # Get orders assigned to this shipper
    orders = Order.objects.filter(shipper=shipper).order_by('-created_date')
    
    # Group by delivery_status
    status_counts = {}
    all_statuses = ['Chờ xác nhận', 'Đã xác nhận', 'Đang giao', 'Đã giao', 'Đã hủy', 'Đã huỷ']
    
    for status_name in all_statuses:
        if status_name in ['Đã hủy', 'Đã huỷ']:
            # For cancelled, count both delivery_status and order_status cancelled
            count = orders.filter(
                Q(delivery_status__in=['Đã hủy', 'Đã huỷ']) | 
                Q(order_status__in=['Đã hủy', 'Đã huỷ'])
            ).count()
        else:
            count = orders.filter(delivery_status=status_name).count()
        status_counts[status_name] = count
    
    # Get filtered orders if status is specified
    status_filter = request.GET.get('delivery_status')
    if status_filter:
        if status_filter in ['Đã hủy', 'Đã huỷ']:
            orders = orders.filter(
                Q(delivery_status__in=['Đã hủy', 'Đã huỷ']) | 
                Q(order_status__in=['Đã hủy', 'Đã huỷ'])
            )
        else:
            orders = orders.filter(delivery_status=status_filter)
    
    # Pagination
    page = request.GET.get('page', 1)
    per_page = request.GET.get('per_page', 20)
    paginator = Paginator(orders, per_page)
    page_obj = paginator.get_page(page)
    
    serializer = OrderSerializer(page_obj, many=True, context={'request': request})
    return Response({
        'shipper': {
            'id': shipper.id,
            'user_id': shipper.user.id,
            'fullname': shipper.user.fullname,
            'phone': shipper.user.phone_number,
            'email': shipper.user.email,
            'address': shipper.user.address,
        },
        'status_counts': status_counts,
        'total_orders': orders.count() if not status_filter else Order.objects.filter(shipper=shipper).count(),
        'orders': {
            'count': paginator.count,
            'num_pages': paginator.num_pages,
            'current_page': page_obj.number,
            'has_next': page_obj.has_next(),
            'has_previous': page_obj.has_previous(),
            'results': serializer.data
        }
    })
