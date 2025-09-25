from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.pagination import PageNumberPagination
from django.shortcuts import get_object_or_404
from django.db.models import Q
from .models import Shipper
from .serializers import ShipperSerializer, ShipperCreateSerializer, ShipperUserCreateSerializer
from apps.authentication.models import User


class ShipperPagination(PageNumberPagination):
    page_size = 10
    page_size_query_param = 'per_page'
    max_page_size = 100


class ShipperViewSet(viewsets.ModelViewSet):
    """ViewSet cho quản lý Shipper"""
    queryset = Shipper.objects.select_related('user').all()
    serializer_class = ShipperSerializer
    pagination_class = ShipperPagination
    # permission_classes = [permissions.IsAuthenticated]  # Temporarily disable for testing
    
    def get_queryset(self):
        queryset = Shipper.objects.select_related('user').all()
        
        # Tìm kiếm theo tên, email, phone
        search = self.request.query_params.get('search')
        if search:
            queryset = queryset.filter(
                Q(user__fullname__icontains=search) |
                Q(user__email__icontains=search) |
                Q(user__phone__icontains=search)
            )
        
        # Lọc theo role (nếu cần)
        role = self.request.query_params.get('role')
        if role:
            queryset = queryset.filter(user__role=role)
            
        return queryset.order_by('-id')
    
    def get_serializer_class(self):
        if self.action == 'create':
            return ShipperCreateSerializer
        elif self.action == 'create_with_user':
            return ShipperUserCreateSerializer
        return ShipperSerializer
    
    def list(self, request, *args, **kwargs):
        """Danh sách shipper"""
        queryset = self.filter_queryset(self.get_queryset())
        
        # Pagination
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        
        serializer = self.get_serializer(queryset, many=True)
        return Response({
            'shippers': serializer.data,
            'total_shippers': queryset.count()
        })
    
    def create(self, request, *args, **kwargs):
        """Tạo shipper từ user có sẵn"""
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        shipper = serializer.save()
        
        response_serializer = ShipperSerializer(shipper)
        return Response(response_serializer.data, status=status.HTTP_201_CREATED)
    
    def retrieve(self, request, *args, **kwargs):
        """Chi tiết shipper"""
        instance = self.get_object()
        serializer = self.get_serializer(instance)
        return Response(serializer.data)
    
    def update(self, request, *args, **kwargs):
        """Cập nhật thông tin shipper"""
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        
        # Cập nhật thông tin user nếu có
        user_data = {}
        if 'fullname' in request.data:
            user_data['fullname'] = request.data['fullname']
        if 'phone' in request.data:
            user_data['phone_number'] = request.data['phone']  # Đổi từ phone thành phone_number
        if 'email' in request.data:
            user_data['email'] = request.data['email']
        if 'address' in request.data:
            user_data['address'] = request.data['address']
        
        # Cập nhật User
        if user_data:
            for field, value in user_data.items():
                setattr(instance.user, field, value)
            instance.user.save()
        
        # Cập nhật Shipper (nếu có thêm fields)
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        
        return Response(serializer.data)
    
    def destroy(self, request, *args, **kwargs):
        """Xóa shipper"""
        instance = self.get_object()
        self.perform_destroy(instance)
        return Response({
            'message': 'Đã xóa shipper thành công'
        }, status=status.HTTP_200_OK)
    
    @action(detail=False, methods=['post'])
    def create_with_user(self, request):
        """Tạo User và Shipper cùng lúc"""
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
            shipper = Shipper.objects.select_related('user').get(user_id=user_id)
            serializer = self.get_serializer(shipper)
            return Response(serializer.data)
        except Shipper.DoesNotExist:
            return Response(
                {'error': 'Shipper không tồn tại'}, 
                status=status.HTTP_404_NOT_FOUND
            )
    
    @action(detail=False, methods=['get'])
    def available_users(self, request):
        """Danh sách User có role Shipper chưa có profile Shipper"""
        # Lấy các user_id đã có shipper profile
        existing_shipper_users = Shipper.objects.values_list('user_id', flat=True)
        
        # Lấy users có role Shipper và chưa có profile
        try:
            from apps.authentication.models import Role
            shipper_role = Role.objects.get(role_name='Shipper')
            available_users = User.objects.filter(
                role=shipper_role
            ).exclude(
                id__in=existing_shipper_users
            ).values('id', 'fullname', 'email', 'phone_number', 'address')
        except Role.DoesNotExist:
            available_users = User.objects.none().values('id', 'fullname', 'email', 'phone_number', 'address')
        
        return Response({
            'available_users': list(available_users)
        })
    
    @action(detail=False, methods=['get'])
    def statistics(self, request):
        """Thống kê shipper"""
        total_shippers = Shipper.objects.count()
        
        # Tìm role có tên là 'Shipper'
        try:
            from apps.authentication.models import Role
            shipper_role = Role.objects.get(role_name='Shipper')
            total_users_with_shipper_role = User.objects.filter(role=shipper_role).count()
        except Role.DoesNotExist:
            total_users_with_shipper_role = 0
        
        available_users = total_users_with_shipper_role - total_shippers
        
        return Response({
            'total_shippers': total_shippers,
            'total_users_with_shipper_role': total_users_with_shipper_role,
            'available_users': available_users
        })
