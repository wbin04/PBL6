from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.db import connection
from .models import Cart
from apps.menu.models import Food
import json


def dict_fetchall(cursor):
    """Return all rows from a cursor as a list of dictionaries"""
    columns = [col[0] for col in cursor.description]
    return [dict(zip(columns, row)) for row in cursor.fetchall()]


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_cart(request):
    """Get user's cart with all items"""
    print("get_cart view called!")  # Debug log
    try:
        # Use authenticated user
        print(f"Using authenticated user: {request.user.username}")  # Debug log
        
        # Get or create cart
        cart, created = Cart.objects.get_or_create(user=request.user)
        
        # Get cart items using raw SQL with store and size information
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT 
                    i.id as item_id,
                    i.cart_id,
                    i.food_id,
                    i.food_option_id,
                    i.quantity,
                    i.item_note,
                    f.id as food_id,
                    f.title,
                    f.description,
                    f.price,
                    f.image,
                    f.availability,
                    f.store_id,
                    s.id as store_id,
                    s.store_name,
                    s.address as store_address,
                    s.latitude as store_latitude,
                    s.longitude as store_longitude,
                    s.description as store_description,
                    s.image as store_image,
                    fs.id as size_id,
                    fs.size_name,
                    fs.price as size_price
                FROM item i
                JOIN food f ON i.food_id = f.id
                JOIN stores s ON f.store_id = s.id
                LEFT JOIN food_size fs ON i.food_option_id = fs.id
                WHERE i.cart_id = %s
                ORDER BY s.store_name, f.title
            """, [cart.id])
            
            items_data = dict_fetchall(cursor)
        
        # Calculate totals with simplified calculation
        total_money = 0
        items_count = sum(item['quantity'] for item in items_data)
        
        # Process each item to calculate subtotal
        for item in items_data:
            # Calculate subtotal using simple logic
            base_price = float(item['price'])
            size_price = float(item['size_price']) if item['size_price'] else 0.0
            quantity = item['quantity']
            
            # Subtotal = (base_price + size_price) * quantity
            item['subtotal'] = (base_price + size_price) * quantity
            total_money += item['subtotal']
        
        # Round to 3 decimal places and update cart total in database
        cart.total_money = round(total_money, 3)
        cart.save()
        
        # Format response
        response_data = {
            'id': cart.id,
            'total_money': total_money,
            'items_count': items_count,
            'items': [{
                'id': item['item_id'],
                'food': {
                    'id': item['food_id'],
                    'title': item['title'],
                    'description': item['description'],
                    'price': item['price'],
                    'image': item['image'],
                    'availability': item['availability'],
                    'store': {
                        'id': item['store_id'],
                        'store_name': item['store_name'],
                        'address': item.get('store_address'),
                        'latitude': item.get('store_latitude'),
                        'longitude': item.get('store_longitude'),
                        'description': item['store_description'],
                        'image': item['store_image']
                    }
                },
                'food_id': item['food_id'],
                'food_option_id': item['food_option_id'],
                'size': {
                    'id': item['size_id'],
                    'size_name': item['size_name'],
                    'price': item['size_price']
                } if item['size_id'] else None,
                'quantity': item['quantity'],
                'item_note': item['item_note'],
                'subtotal': item['subtotal']
            } for item in items_data]
        }
        
        return Response(response_data)
        
    except Exception as e:
        return Response(
            {'error': str(e)}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def add_to_cart(request):
    """Add item to cart or update quantity if already exists"""
    food_id = request.data.get('food_id')
    quantity = request.data.get('quantity', 1)
    food_option_id = request.data.get('food_option_id')  # Size ID
    toppings = request.data.get('toppings', {})  # {toppingId: quantity}
    item_note = request.data.get('item_note')
    
    if not food_id:
        return Response(
            {'error': 'food_id is required'}, 
            status=status.HTTP_400_BAD_REQUEST
        )
    
    try:
        food = get_object_or_404(Food, id=food_id)
        
        # Use authenticated user
        cart, created = Cart.objects.get_or_create(user=request.user)
        
        # Add main food item
        with connection.cursor() as cursor:
            # Check if exact item exists (same food_id and food_option_id)
            if food_option_id:
                cursor.execute("""
                    SELECT id, quantity FROM item 
                    WHERE cart_id = %s AND food_id = %s AND food_option_id = %s
                """, [cart.id, food_id, food_option_id])
            else:
                cursor.execute("""
                    SELECT id, quantity FROM item 
                    WHERE cart_id = %s AND food_id = %s AND food_option_id IS NULL
                """, [cart.id, food_id])
            
            result = cursor.fetchone()
            
            if result:
                # Update existing main item
                item_id, current_quantity = result
                new_quantity = current_quantity + quantity
                
                if item_note:
                    cursor.execute(
                        "UPDATE item SET quantity = %s, item_note = %s WHERE id = %s",
                        [new_quantity, item_note, item_id]
                    )
                else:
                    cursor.execute(
                        "UPDATE item SET quantity = %s WHERE id = %s",
                        [new_quantity, item_id]
                    )
                
                message = f'Updated {food.title} quantity in cart'
                main_quantity = new_quantity
            else:
                # Insert new main item
                if food_option_id:
                    cursor.execute("""
                        INSERT INTO item (cart_id, food_id, food_option_id, quantity, item_note) 
                        VALUES (%s, %s, %s, %s, %s)
                    """, [cart.id, food_id, food_option_id, quantity, item_note])
                else:
                    cursor.execute("""
                        INSERT INTO item (cart_id, food_id, quantity, item_note) 
                        VALUES (%s, %s, %s, %s)
                    """, [cart.id, food_id, quantity, item_note])
                
                main_quantity = quantity
                message = f'Added {food.title} to cart'
        
        # Add each topping as a separate item
        topping_items = []
        if toppings:
            for topping_id, topping_quantity in toppings.items():
                if topping_quantity > 0:
                    topping_food = get_object_or_404(Food, id=int(topping_id))
                    
                    with connection.cursor() as cursor:
                        # Check if topping already exists in cart
                        cursor.execute("""
                            SELECT id, quantity FROM item 
                            WHERE cart_id = %s AND food_id = %s AND food_option_id IS NULL
                        """, [cart.id, topping_id])
                        
                        topping_result = cursor.fetchone()
                        
                        if topping_result:
                            # Update existing topping
                            topping_item_id, current_topping_qty = topping_result
                            new_topping_qty = current_topping_qty + topping_quantity
                            cursor.execute(
                                "UPDATE item SET quantity = %s WHERE id = %s",
                                [new_topping_qty, topping_item_id]
                            )
                        else:
                            # Insert new topping
                            cursor.execute("""
                                INSERT INTO item (cart_id, food_id, quantity) 
                                VALUES (%s, %s, %s)
                            """, [cart.id, topping_id, topping_quantity])
                    
                    topping_items.append({
                        'food_id': int(topping_id),
                        'title': topping_food.title,
                        'quantity': topping_quantity
                    })
        
        # Update cart total
        cart.update_total()
        
        return Response({
            'message': message,
            'item': {
                'food': {
                    'id': food.id,
                    'title': food.title,
                    'price': food.price,
                    'image': food.image
                },
                'food_id': food.id,
                'food_option_id': food_option_id,
                'quantity': main_quantity,
                'item_note': item_note,
                'toppings_added': topping_items
            }
        }, status=status.HTTP_201_CREATED)
        
    except Food.DoesNotExist:
        return Response(
            {'error': 'Food item not found'}, 
            status=status.HTTP_404_NOT_FOUND
        )
    except Exception as e:
        return Response(
            {'error': str(e)}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['PUT', 'DELETE'])
@permission_classes([IsAuthenticated])
def update_cart_item(request, food_id):
    """Update or delete a cart item"""
    try:
        # Use authenticated user instead of hardcoded user
        cart = Cart.objects.get(user=request.user)
        
        # Check if item exists
        with connection.cursor() as cursor:
            cursor.execute(
                "SELECT quantity FROM item WHERE cart_id = %s AND food_id = %s",
                [cart.id, food_id]
            )
            result = cursor.fetchone()
            
            if not result:
                return Response(
                    {'error': 'Item not found in cart'}, 
                    status=status.HTTP_404_NOT_FOUND
                )
        
        if request.method == 'DELETE':
            with connection.cursor() as cursor:
                cursor.execute(
                    "DELETE FROM item WHERE cart_id = %s AND food_id = %s",
                    [cart.id, food_id]
                )
            cart.update_total()
            return Response({'message': 'Item removed from cart'})
        
        elif request.method == 'PUT':
            new_quantity = request.data.get('quantity')
            item_note = request.data.get('item_note')
            
            # Build update query dynamically based on provided fields
            update_fields = []
            update_values = []
            
            if new_quantity is not None:
                if new_quantity < 1:
                    return Response(
                        {'error': 'Quantity must be at least 1'}, 
                        status=status.HTTP_400_BAD_REQUEST
                    )
                update_fields.append('quantity = %s')
                update_values.append(new_quantity)
            
            if item_note is not None:
                update_fields.append('item_note = %s')
                update_values.append(item_note)
            
            if not update_fields:
                return Response(
                    {'error': 'No fields to update'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Add WHERE clause values
            update_values.extend([cart.id, food_id])
            
            with connection.cursor() as cursor:
                query = f"UPDATE item SET {', '.join(update_fields)} WHERE cart_id = %s AND food_id = %s"
                cursor.execute(query, update_values)
            
            # Only update total if quantity changed
            if new_quantity is not None:
                cart.update_total()
            
            # Get updated item data
            with connection.cursor() as cursor:
                cursor.execute(
                    "SELECT quantity, item_note FROM item WHERE cart_id = %s AND food_id = %s",
                    [cart.id, food_id]
                )
                updated_item = cursor.fetchone()
            
            # Get food details
            food = get_object_or_404(Food, id=food_id)
            
            return Response({
                'message': 'Cart item updated',
                'item': {
                    'food': {
                        'id': food.id,
                        'title': food.title,
                        'price': food.price,
                        'image': food.image
                    },
                    'food_id': food.id,
                    'quantity': updated_item[0],
                    'item_note': updated_item[1],
                    'subtotal': food.price * updated_item[0]
                }
            })
            
    except Cart.DoesNotExist:
        return Response(
            {'error': 'Cart not found'}, 
            status=status.HTTP_404_NOT_FOUND
        )
    except Exception as e:
        return Response(
            {'error': str(e)}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['DELETE'])
# @permission_classes([IsAuthenticated])  # Temporarily disabled for testing
@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def remove_from_cart(request, food_id):
    """Remove item from cart"""
    try:
        # Use authenticated user
        cart = Cart.objects.get(user=request.user)
        
        with connection.cursor() as cursor:
            # Check if item exists
            cursor.execute(
                "SELECT quantity FROM item WHERE cart_id = %s AND food_id = %s",
                [cart.id, food_id]
            )
            result = cursor.fetchone()
            
            if not result:
                return Response(
                    {'error': 'Item not found in cart'}, 
                    status=status.HTTP_404_NOT_FOUND
                )
            
            # Delete item
            cursor.execute(
                "DELETE FROM item WHERE cart_id = %s AND food_id = %s",
                [cart.id, food_id]
            )
        
        cart.update_total()
        return Response({'message': 'Item removed from cart'})
        
    except Cart.DoesNotExist:
        return Response(
            {'error': 'Cart not found'}, 
            status=status.HTTP_404_NOT_FOUND
        )
    except Exception as e:
        return Response(
            {'error': str(e)}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['DELETE'])
# @permission_classes([IsAuthenticated])  # Temporarily disabled for testing
@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def clear_cart(request):
    """Clear all items from cart"""
    try:
        # Use authenticated user
        cart = Cart.objects.get(user=request.user)
        
        with connection.cursor() as cursor:
            cursor.execute(
                "DELETE FROM item WHERE cart_id = %s",
                [cart.id]
            )
        
        cart.update_total()
        return Response({'message': 'Cart cleared'})
        
    except Cart.DoesNotExist:
        return Response(
            {'error': 'Cart not found'}, 
            status=status.HTTP_404_NOT_FOUND
        )
