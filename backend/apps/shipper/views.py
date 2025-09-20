from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from .models import Shipper
from .serializers import ShipperSerializer, ShipperCreateSerializer
from apps.authentication.models import User


class ShipperViewSet(viewsets.ModelViewSet):
    queryset = Shipper.objects.all()
    serializer_class = ShipperSerializer
    
    def get_serializer_class(self):
        if self.action == 'create':
            return ShipperCreateSerializer
        return ShipperSerializer
    
    def create(self, request, *args, **kwargs):
        """Tạo shipper mới"""
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        shipper = serializer.save()
        
        response_serializer = ShipperSerializer(shipper)
        return Response(response_serializer.data, status=status.HTTP_201_CREATED)
    
    @action(detail=False, methods=['get'])
    def by_user(self, request):
        """Lấy thông tin shipper theo user_id"""
        user_id = request.query_params.get('user_id')
        if not user_id:
            return Response(
                {'error': 'user_id là bắt buộc'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            shipper = Shipper.objects.get(user_id=user_id)
            serializer = self.get_serializer(shipper)
            return Response(serializer.data)
        except Shipper.DoesNotExist:
            return Response(
                {'error': 'Shipper không tồn tại'}, 
                status=status.HTTP_404_NOT_FOUND
            )
    
    @action(detail=True, methods=['delete'])
    def remove_shipper(self, request, pk=None):
        """Xóa shipper"""
        shipper = self.get_object()
        shipper.delete()
        return Response(
            {'message': 'Đã xóa shipper thành công'}, 
            status=status.HTTP_200_OK
        )
