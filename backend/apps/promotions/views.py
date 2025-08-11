from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework import status
from django.utils import timezone
from .models import Promo
from .serializers import PromoSerializer


@api_view(['GET'])
@permission_classes([AllowAny])
def promo_list(request):
    """Get active promotions"""
    promos = Promo.objects.filter(
        is_active=True,
        start_date__lte=timezone.now(),
        end_date__gte=timezone.now()
    )
    serializer = PromoSerializer(promos, many=True)
    return Response(serializer.data)


@api_view(['POST'])
def validate_promo(request):
    """Validate promo code"""
    promo_code = request.data.get('promo_code')
    total_amount = float(request.data.get('total_amount', 0))
    
    if not promo_code:
        return Response({'error': 'Promo code is required'}, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        promo = Promo.objects.get(
            id=promo_code,
            is_active=True,
            start_date__lte=timezone.now(),
            end_date__gte=timezone.now()
        )
        
        if total_amount < promo.minimum_pay:
            return Response({
                'valid': False,
                'error': f'Minimum order amount is {promo.minimum_pay:,.0f} VND'
            })
        
        discount_amount = total_amount * promo.percent / 100
        final_amount = total_amount - discount_amount
        
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
