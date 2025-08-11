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
    try:
        # Get or create cart
        cart, created = Cart.objects.get_or_create(user=request.user)
        
        # Get cart items using raw SQL
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT 
                    i.cart_id,
                    i.food_id,
                    i.quantity,
                    f.id as food_id,
                    f.title,
                    f.description,
                    f.price,
                    f.image,
                    f.availability,
                    (i.quantity * f.price) as subtotal
                FROM item i
                JOIN food f ON i.food_id = f.id
                WHERE i.cart_id = %s
                ORDER BY f.title
            """, [cart.id])
            
            items_data = dict_fetchall(cursor)
        
        # Calculate totals
        total_money = sum(item['subtotal'] for item in items_data)
        items_count = sum(item['quantity'] for item in items_data)
        
        # Update cart total in database
        cart.total_money = total_money
        cart.save()
        
        # Format response
        response_data = {
            'id': cart.id,
            'total_money': total_money,
            'items_count': items_count,
            'items': [{
                'food': {
                    'id': item['food_id'],
                    'title': item['title'],
                    'description': item['description'],
                    'price': item['price'],
                    'image': item['image'],
                    'availability': item['availability']
                },
                'food_id': item['food_id'],
                'quantity': item['quantity'],
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
    
    if not food_id:
        return Response(
            {'error': 'food_id is required'}, 
            status=status.HTTP_400_BAD_REQUEST
        )
    
    try:
        food = get_object_or_404(Food, id=food_id)
        
        # Get or create cart
        cart, created = Cart.objects.get_or_create(user=request.user)
        
        # Check if item already exists and update/insert using raw SQL
        with connection.cursor() as cursor:
            # Check if item exists
            cursor.execute(
                "SELECT quantity FROM item WHERE cart_id = %s AND food_id = %s",
                [cart.id, food_id]
            )
            result = cursor.fetchone()
            
            if result:
                # Update existing item
                new_quantity = result[0] + quantity
                cursor.execute(
                    "UPDATE item SET quantity = %s WHERE cart_id = %s AND food_id = %s",
                    [new_quantity, cart.id, food_id]
                )
                message = f'Updated {food.title} quantity in cart'
            else:
                # Insert new item
                cursor.execute(
                    "INSERT INTO item (cart_id, food_id, quantity) VALUES (%s, %s, %s)",
                    [cart.id, food_id, quantity]
                )
                new_quantity = quantity
                message = f'Added {food.title} to cart'
        
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
                'quantity': new_quantity,
                'subtotal': food.price * new_quantity
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
            if new_quantity is None or new_quantity < 1:
                return Response(
                    {'error': 'Quantity must be at least 1'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            with connection.cursor() as cursor:
                cursor.execute(
                    "UPDATE item SET quantity = %s WHERE cart_id = %s AND food_id = %s",
                    [new_quantity, cart.id, food_id]
                )
            
            cart.update_total()
            
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
                    'quantity': new_quantity,
                    'subtotal': food.price * new_quantity
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
@permission_classes([IsAuthenticated])
def remove_from_cart(request, food_id):
    """Remove item from cart"""
    try:
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
@permission_classes([IsAuthenticated])
def clear_cart(request):
    """Clear all items from cart"""
    try:
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
