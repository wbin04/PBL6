from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status


from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework import status
from rest_framework.response import Response
from .models import RatingFood
from .serializers import RatingFoodSerializer

@api_view(['GET', 'POST'])
@permission_classes([AllowAny])
def rating_list_create(request):
    if request.method == 'GET':
        # Fetch only existing fields for ratings
        from django.db.models import F
        food_id = request.GET.get('food')
        order_id = request.GET.get('order')
        qs = RatingFood.objects.all()
        if food_id:
            qs = qs.filter(food_id=food_id)
        if order_id:
            qs = qs.filter(order_id=order_id)
        # Fetch raw values and manually map to avoid annotation conflicts
        raw = qs.values('user__username', 'rating', 'content')
        data = [
            {
                'username': item['user__username'],
                'rating': item['rating'],
                'content': item['content'],
            }
            for item in raw
        ]
        return Response(data)
    # POST
    if not request.user or not request.user.is_authenticated:
        return Response({'detail': 'Authentication required'}, status=status.HTTP_401_UNAUTHORIZED)
    # Serializer HiddenField will set user from request
    serializer = RatingFoodSerializer(data=request.data, context={'request': request})
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET', 'PUT', 'DELETE'])
@permission_classes([IsAuthenticated])
def rating_detail(request, pk):
    try:
        rating = RatingFood.objects.only('id', 'food', 'user', 'rating', 'content').get(pk=pk)
    except RatingFood.DoesNotExist:
        return Response({'detail': 'Rating not found'}, status=status.HTTP_404_NOT_FOUND)
    if request.method == 'GET':
        serializer = RatingFoodSerializer(rating)
        return Response(serializer.data)
    if request.method == 'PUT':
        if rating.user != request.user:
            return Response({'detail': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)
        serializer = RatingFoodSerializer(rating, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    # DELETE
    if rating.user != request.user:
        return Response({'detail': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)
    rating.delete()
    return Response(status=status.HTTP_204_NO_CONTENT)
