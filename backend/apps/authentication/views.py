from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from rest_framework_simplejwt.tokens import RefreshToken
from django.db.models import Q
from django.contrib.auth import authenticate
from django.core.paginator import Paginator
from django.db.models import Q
from .serializers import LoginSerializer, UserSerializer, RegisterSerializer
from .models import User


@api_view(['POST'])
@permission_classes([AllowAny])
def login_view(request):
    # print(f"Login attempt with data: {request.data}")  # Debug log
    serializer = LoginSerializer(data=request.data, context={'request': request})
    
    if serializer.is_valid():
        user = serializer.validated_data['user']
        refresh = RefreshToken.for_user(user)
        response_data = {
            'refresh': str(refresh),
            'access': str(refresh.access_token),
            'user': UserSerializer(user).data
        }
        # print("Serialized user JSON:", response_data['user'])  # Debug: print user JSON
        print(f"Login successful for user: {user.email}")  # Debug log
        return Response(response_data)
    
    print(f"Login failed with errors: {serializer.errors}")  # Debug log
    return Response({'error': 'Invalid credentials'}, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([AllowAny])
def register_view(request):
    serializer = RegisterSerializer(data=request.data)
    
    if serializer.is_valid():
        user = serializer.save()
        refresh = RefreshToken.for_user(user)
        
        return Response({
            'refresh': str(refresh),
            'access': str(refresh.access_token),
            'user': UserSerializer(user).data
        }, status=status.HTTP_201_CREATED)
    
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([AllowAny])
def refresh_view(request):
    try:
        refresh_token = request.data['refresh']
        token = RefreshToken(refresh_token)
        
        return Response({
            'access': str(token.access_token),
        })
    except Exception as e:
        return Response({'error': 'Invalid refresh token'}, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def profile_view(request):
    serializer = UserSerializer(request.user)
    return Response(serializer.data)


@api_view(['PUT'])
@permission_classes([IsAuthenticated])
def update_profile_view(request):
    serializer = UserSerializer(request.user, data=request.data, partial=True)
    
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data)
    
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@api_view(['POST'])
@permission_classes([AllowAny])
def reset_password_view(request):
    """Reset password via email, username, or phone number identifier"""
    identifier = request.data.get('identifier')
    new_password = request.data.get('new_password')
    confirm = request.data.get('new_password_confirm')
    if not identifier or not new_password or not confirm:
        return Response({'error': 'Vui lòng điền đầy đủ thông tin'}, status=status.HTTP_400_BAD_REQUEST)
    if new_password != confirm:
        return Response({'error': 'Mật khẩu xác nhận không khớp'}, status=status.HTTP_400_BAD_REQUEST)
    try:
        user = User.objects.get(
            Q(email__iexact=identifier) |
            Q(username__iexact=identifier) |
            Q(phone_number__iexact=identifier)
        )
    except User.DoesNotExist:
        return Response({'error': 'Không tìm thấy người dùng'}, status=status.HTTP_404_NOT_FOUND)
    # Update plaintext password
    user.password = new_password
    user.save()
    return Response({'message': 'Đặt lại mật khẩu thành công'})


# Admin-only views (require role_id = 2)
def is_admin(user):
    return user.is_authenticated and user.role and user.role.id == 2


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def admin_customers_list(request):
    if not is_admin(request.user):
        return Response({'error': 'Admin access required'}, status=status.HTTP_403_FORBIDDEN)
    
    # Get all customers (role_id = 1) and apply search filter if provided
    customers = User.objects.filter(role_id=1)
    search = request.GET.get('search')
    if search:
        customers = customers.filter(
            Q(fullname__icontains=search) |
            Q(phone_number__icontains=search) |
            Q(email__icontains=search)
        )
    customers = customers.order_by('-created_date')
    
    # Pagination
    page = request.GET.get('page', 1)
    paginator = Paginator(customers, 10)  # 10 customers per page
    page_obj = paginator.get_page(page)
    
    serializer = UserSerializer(page_obj, many=True)
    
    return Response({
        'customers': serializer.data,
        'total_pages': paginator.num_pages,
        'current_page': int(page),
        'total_customers': paginator.count
    })


@api_view(['GET', 'PUT'])
@permission_classes([IsAuthenticated])
def admin_customer_detail(request, customer_id):
    if not is_admin(request.user):
        return Response({'error': 'Admin access required'}, status=status.HTTP_403_FORBIDDEN)
    
    try:
        customer = User.objects.get(id=customer_id, role_id=1)
    except User.DoesNotExist:
        return Response({'error': 'Customer not found'}, status=status.HTTP_404_NOT_FOUND)
    
    if request.method == 'GET':
        serializer = UserSerializer(customer)
        return Response(serializer.data)
    
    elif request.method == 'PUT':
        # Only allow updating certain fields
        allowed_fields = ['fullname', 'phone_number', 'address']
        update_data = {k: v for k, v in request.data.items() if k in allowed_fields}
        
        serializer = UserSerializer(customer, data=update_data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def admin_toggle_customer_status(request, customer_id):
    """Toggle customer active/inactive status"""
    if not is_admin(request.user):
        return Response({'error': 'Admin access required'}, status=status.HTTP_403_FORBIDDEN)
    
    try:
        customer = User.objects.get(id=customer_id, role_id=1)
    except User.DoesNotExist:
        return Response({'error': 'Customer not found'}, status=status.HTTP_404_NOT_FOUND)
    
    # Toggle the is_active status
    customer.is_active = not customer.is_active
    customer.save()
    
    serializer = UserSerializer(customer)
    return Response({
        'message': f'Customer {"activated" if customer.is_active else "deactivated"} successfully',
        'customer': serializer.data
    })
