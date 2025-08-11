from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework import status


@api_view(['POST'])
def create_payment(request):
    """Mock payment creation - will be implemented when payment system is added"""
    order_id = request.data.get('order_id')
    method = request.data.get('method', 'COD')
    
    return Response({
        'message': f'Payment method {method} for order {order_id} processed',
        'method': method,
        'status': 'success'
    })


@api_view(['POST'])
@permission_classes([AllowAny])
def payment_webhook(request):
    """Mock payment webhook - will be implemented when payment system is added"""
    return Response({'success': True})
