from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from django.shortcuts import get_object_or_404
from django.core.paginator import Paginator
from django.db.models import Q
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
        # Create new order
        try:
            # Get cart
            cart = Cart.objects.get(user=request.user)
            # Retrieve cart items via raw SQL since Item model lacks an id column
            with connection.cursor() as cursor:
                cursor.execute(
                    "SELECT food_id, quantity FROM item WHERE cart_id = %s", [cart.id]
                )
                cart_rows = cursor.fetchall()
            if not cart_rows:
                return Response({'error': 'Cart is empty'}, status=status.HTTP_400_BAD_REQUEST)
            
            # Create order
            order_data = {
                'user_id': request.user.id,
                'receiver_name': request.data.get('receiver_name'),
                'phone_number': request.data.get('phone_number'),
                'ship_address': request.data.get('ship_address'),
                'note': request.data.get('note', ''),
                'payment_method': request.data.get('payment_method', 'cash'),
                'total_money': cart.total_money
            }
            
            # Apply promo if provided
            promo_id = request.data.get('promo_id')
            if promo_id:
                try:
                    promo = Promo.objects.get(id=promo_id, is_active=True)
                    if cart.total_money >= promo.minimum_pay:
                        discount = cart.total_money * promo.percent / 100
                        order_data['total_money'] = cart.total_money - discount
                        order_data['promo'] = promo.id
                except Promo.DoesNotExist:
                    pass
            
            serializer = OrderSerializer(data=order_data)
            if serializer.is_valid():
                order = serializer.save()
                
                # Insert order details via raw SQL to avoid ORM RETURNING id issue
                with connection.cursor() as cursor:
                    for food_id, quantity in cart_rows:
                        cursor.execute(
                            "INSERT INTO order_detail (order_id, food_id, quantity) VALUES (%s, %s, %s)",
                            [order.id, food_id, quantity]
                        )
                
                # Clear cart items via raw SQL and update total
                with connection.cursor() as cursor:
                    cursor.execute("DELETE FROM item WHERE cart_id = %s", [cart.id])
                cart.update_total()
                
                return Response(OrderSerializer(order).data, status=status.HTTP_201_CREATED)
            
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
            
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
    order = get_object_or_404(Order, pk=pk, user=request.user)
    
    new_status = request.data.get('order_status')
    # Only allow customer to cancel with Vietnamese status
    if new_status not in ['Đã hủy']:
        return Response({'error': 'Trạng thái không hợp lệ'}, status=status.HTTP_400_BAD_REQUEST)
    
    # Only cancel if current status is 'Chờ xác nhận'
    if order.order_status not in ['Chờ xác nhận']:
        return Response({'error': 'Không thể hủy đơn hàng này'}, status=status.HTTP_400_BAD_REQUEST)
    
    order.order_status = new_status
    order.save()
    
    return Response(OrderSerializer(order).data)


# Admin-only views for order management
def is_admin(user):
    return user.is_authenticated and user.role and user.role.id == 2


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def admin_orders_list(request):
    if not is_admin(request.user):
        return Response({'error': 'Admin access required'}, status=status.HTTP_403_FORBIDDEN)
    
    # List admin orders sorted by descending ID
    orders = Order.objects.select_related('user').order_by('-id')
    
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
