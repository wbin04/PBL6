from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from rest_framework_simplejwt.tokens import RefreshToken
from django.db.models import Q
from django.contrib.auth import authenticate
from django.core.paginator import Paginator
from django.db.models import Q
from django.utils import timezone
from django.db import transaction
from .serializers import LoginSerializer, UserSerializer, RegisterSerializer
from .models import User, Role
from apps.shipper.models import Shipper
from apps.stores.models import Store


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
    data = serializer.data
    
    # Debug logging
    import logging
    logger = logging.getLogger(__name__)
    logger.info(f"=== Profile Request ===")
    logger.info(f"User ID: {request.user.id}")
    logger.info(f"Username: {request.user.username}")
    logger.info(f"Role: {request.user.role.role_name if request.user.role else None}")
    logger.info(f"Role ID: {request.user.role.id if request.user.role else None}")
    logger.info(f"Serialized data: {data}")
    
    return Response(data)


@api_view(['PUT'])
@permission_classes([IsAuthenticated])
def update_profile_view(request):
    serializer = UserSerializer(request.user, data=request.data, partial=True)
    
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data)
    
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def change_password_view(request):
    """Change password for authenticated user after verifying old password."""
    old_password = request.data.get('old_password')
    new_password = request.data.get('new_password')
    confirm = request.data.get('new_password_confirm')

    if not old_password or not new_password or not confirm:
        return Response({'error': 'Vui lòng điền đầy đủ thông tin'}, status=status.HTTP_400_BAD_REQUEST)

    if not request.user.check_password(old_password):
        return Response({'error': 'Mật khẩu cũ không đúng'}, status=status.HTTP_400_BAD_REQUEST)

    if new_password != confirm:
        return Response({'error': 'Mật khẩu xác nhận không khớp'}, status=status.HTTP_400_BAD_REQUEST)

    if len(new_password) < 6:
        return Response({'error': 'Mật khẩu phải có ít nhất 6 ký tự'}, status=status.HTTP_400_BAD_REQUEST)

    request.user.set_password(new_password)
    request.user.save(update_fields=['password'])

    return Response({'message': 'Đổi mật khẩu thành công'}, status=status.HTTP_200_OK)

@api_view(['POST'])
@permission_classes([AllowAny])
def reset_password_view(request):
    """Reset password via email, username, or phone number identifier"""
    identifier = request.data.get('identifier')
    new_password = request.data.get('new_password')
    confirm = request.data.get('new_password_confirm')
    
    if not identifier or not new_password or not confirm:
        return Response({
            'error': 'Vui lòng điền đầy đủ thông tin'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    if new_password != confirm:
        return Response({
            'error': 'Mật khẩu xác nhận không khớp'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    if len(new_password) < 6:
        return Response({
            'error': 'Mật khẩu phải có ít nhất 6 ký tự'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        user = User.objects.get(
            Q(email__iexact=identifier) |
            Q(username__iexact=identifier) |
            Q(phone_number__iexact=identifier)
        )
    except User.DoesNotExist:
        return Response({
            'error': 'Không tìm thấy người dùng với thông tin này'
        }, status=status.HTTP_404_NOT_FOUND)
    
    # IMPORTANT: Use set_password() to properly hash the password
    user.set_password(new_password)
    user.save()
    
    return Response({
        'message': 'Đặt lại mật khẩu thành công',
        'user': {
            'email': user.email,
            'username': user.username
        }
    }, status=status.HTTP_200_OK)


# Admin-only views (require role_id = 2)
def is_admin(user):
    return user.is_authenticated and user.role and user.role.id == 2


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def admin_customers_list(request):
    if not is_admin(request.user):
        return Response({'error': 'Admin access required'}, status=status.HTTP_403_FORBIDDEN)
    
    # Get all admin-manageable users (roles 2, 3, 4) and apply search filter if provided
    customers = User.objects.filter(role_id__in=[2, 3, 4])
    search = request.GET.get('search')
    if search:
        customers = customers.filter(
            Q(fullname__icontains=search) |
            Q(phone_number__icontains=search) |
            Q(email__icontains=search)
        )
    customers = customers.order_by('-created_date')
    
    # Pagination with optional page_size override; allow page_size=all to fetch everything
    page_size_param = request.GET.get('page_size')
    if page_size_param and str(page_size_param).lower() == 'all':
        serializer = UserSerializer(customers, many=True)
        return Response({
            'customers': serializer.data,
            'total_pages': 1,
            'current_page': 1,
            'total_customers': len(serializer.data)
        })

    try:
        page_size = int(page_size_param) if page_size_param else 10
    except ValueError:
        page_size = 10

    page = request.GET.get('page', 1)
    paginator = Paginator(customers, 50)
    page_obj = paginator.get_page(page)
    
    serializer = UserSerializer(page_obj, many=True)
    
    return Response({
        'customers': serializer.data,
        'total_pages': paginator.num_pages,
        'current_page': int(page),
        'total_customers': paginator.count,
        'page_size': page_size
    })


@api_view(['GET', 'PUT'])
@permission_classes([IsAuthenticated])
def admin_customer_detail(request, customer_id):
    if not is_admin(request.user):
        return Response({'error': 'Admin access required'}, status=status.HTTP_403_FORBIDDEN)
    
    try:
        customer = User.objects.get(id=customer_id, role_id__in=[2, 3, 4])
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
        customer = User.objects.get(id=customer_id, role_id__in=[2, 3, 4])
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


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def update_shipper_registration(request):
    """Update user's shipper registration status"""
    status_value = request.data.get('is_registered')
    
    if status_value is None:
        return Response({'error': 'is_registered field is required'}, status=status.HTTP_400_BAD_REQUEST)
    
    # Convert string to boolean if needed
    if isinstance(status_value, str):
        status_value = status_value.lower() in ['true', '1', 'yes']
    
    request.user.is_shipper_registered = status_value
    request.user.save()
    
    return Response({
        'message': 'Shipper registration status updated successfully',
        'is_shipper_registered': request.user.is_shipper_registered
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def update_store_registration(request):
    """Update user's store registration status"""
    status_value = request.data.get('is_registered')
    
    if status_value is None:
        return Response({'error': 'is_registered field is required'}, status=status.HTTP_400_BAD_REQUEST)
    
    # Convert string to boolean if needed
    if isinstance(status_value, str):
        status_value = status_value.lower() in ['true', '1', 'yes']
    
    request.user.is_store_registered = status_value
    request.user.save()
    
    return Response({
        'message': 'Store registration status updated successfully',
        'is_store_registered': request.user.is_store_registered
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_registration_status(request):
    """Get user's registration status for shipper and store"""
    return Response({
        'is_shipper_registered': request.user.is_shipper_registered,
        'is_store_registered': request.user.is_store_registered
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_shipper_applications(request):
    """Get list of users who applied to be shippers (admin only)"""
    if not is_admin(request.user):
        return Response({'error': 'Admin access required'}, status=status.HTTP_403_FORBIDDEN)
    
    # Get users with is_shipper_registered = True
    applications = User.objects.filter(is_shipper_registered=True).order_by('-created_date')
    
    # Apply search filter if provided
    search = request.GET.get('search')
    if search:
        applications = applications.filter(
            Q(fullname__icontains=search) |
            Q(phone_number__icontains=search) |
            Q(email__icontains=search)
        )
    
    # Pagination
    page = request.GET.get('page', 1)
    paginator = Paginator(applications, 10)  # 10 applications per page
    page_obj = paginator.get_page(page)
    
    serializer = UserSerializer(page_obj, many=True)
    
    return Response({
        'applications': serializer.data,
        'total_pages': paginator.num_pages,
        'current_page': int(page),
        'total_applications': paginator.count
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def approve_shipper_application(request, user_id):
    """Approve shipper application (admin only)"""
    if not is_admin(request.user):
        return Response({'error': 'Admin access required'}, status=status.HTTP_403_FORBIDDEN)
    
    try:
        user = User.objects.get(id=user_id, is_shipper_registered=True)
    except User.DoesNotExist:
        return Response({'error': 'Application not found'}, status=status.HTTP_404_NOT_FOUND)
    
    # Check if user already has a shipper record
    if hasattr(user, 'shipper'):
        return Response({'error': 'User is already a shipper'}, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        with transaction.atomic():
            # Get or create shipper role
            shipper_role, _ = Role.objects.get_or_create(role_name='Người vận chuyển')
            
            # Update user role and reset registration status using update() to avoid datetime field issues
            User.objects.filter(id=user_id).update(
                role=shipper_role,
                is_shipper_registered=False
            )
            
            # Refresh the user object
            user.refresh_from_db()
            
            # Check if shipper already exists for this user
            try:
                shipper = Shipper.objects.get(user=user)
                # Shipper already exists, just return success
                return Response({
                    'message': 'Shipper application approved successfully (shipper already exists)',
                    'user': UserSerializer(user).data,
                    'shipper_id': shipper.id
                })
            except Shipper.DoesNotExist:
                # Create new shipper record
                shipper = Shipper.objects.create(user=user)
            
            return Response({
                'message': 'Shipper application approved successfully',
                'user': UserSerializer(user).data,
                'shipper_id': shipper.id
            })
        
    except Exception as e:
        return Response({
            'error': f'Failed to create shipper record: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def reject_shipper_application(request, user_id):
    """Reject shipper application (admin only)"""
    if not is_admin(request.user):
        return Response({'error': 'Admin access required'}, status=status.HTTP_403_FORBIDDEN)
    
    try:
        user = User.objects.get(id=user_id, is_shipper_registered=True)
    except User.DoesNotExist:
        return Response({'error': 'Application not found'}, status=status.HTTP_404_NOT_FOUND)
    
    # Reset registration status without changing role
    user.is_shipper_registered = False
    user.save()
    
    return Response({
        'message': 'Shipper application rejected',
        'user': UserSerializer(user).data
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_store_applications(request):
    """Get list of users who applied to be store managers (admin only)"""
    if not is_admin(request.user):
        return Response({'error': 'Admin access required'}, status=status.HTTP_403_FORBIDDEN)
    
    # Get users with is_store_registered = True
    applications = User.objects.filter(is_store_registered=True).order_by('-created_date')
    
    # Apply search filter if provided
    search = request.GET.get('search')
    if search:
        applications = applications.filter(
            Q(fullname__icontains=search) |
            Q(phone_number__icontains=search) |
            Q(email__icontains=search)
        )
    
    # Pagination
    page = request.GET.get('page', 1)
    paginator = Paginator(applications, 10)  # 10 applications per page
    page_obj = paginator.get_page(page)
    
    serializer = UserSerializer(page_obj, many=True)
    
    return Response({
        'applications': serializer.data,
        'total_pages': paginator.num_pages,
        'current_page': int(page),
        'total_applications': paginator.count
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def approve_store_application(request, user_id):
    """Approve store application (admin only)"""
    if not is_admin(request.user):
        return Response({'error': 'Admin access required'}, status=status.HTTP_403_FORBIDDEN)
    
    try:
        user = User.objects.get(id=user_id, is_store_registered=True)
    except User.DoesNotExist:
        return Response({'error': 'Application not found'}, status=status.HTTP_404_NOT_FOUND)
    
    # Check if user already manages a store
    if hasattr(user, 'managed_store'):
        return Response({'error': 'User already manages a store'}, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        with transaction.atomic():
            # Get or create store manager role (assuming role_id = 3 for store managers)
            store_manager_role, _ = Role.objects.get_or_create(role_name='Cửa hàng')
            
            # Update user role and reset registration status using update() to avoid datetime field issues
            User.objects.filter(id=user_id).update(
                role=store_manager_role,
                is_store_registered=False
            )
            
            # Refresh the user object
            user.refresh_from_db()
            
            # Check if store already exists for this user
            try:
                store = Store.objects.get(manager=user)
                # Store already exists, just return success
                return Response({
                    'message': 'Store application approved successfully (store already exists)',
                    'user': UserSerializer(user).data,
                    'store_id': store.id,
                }, status=status.HTTP_200_OK)
            except Store.DoesNotExist:
                # Create new store record with default values
                store = Store.objects.create(
                    store_name=user.fullname or f"Cửa hàng {user.username}",
                    image="assets/store-icon.png",
                    description=user.address or "Chưa cập nhật địa chỉ",
                    address=user.address or "",
                    latitude=getattr(user, 'latitude', None),
                    longitude=getattr(user, 'longitude', None),
                    manager=user
                )
            
            return Response({
                'message': 'Store application approved successfully',
                'user': UserSerializer(user).data,
                'store_id': store.id,
                'store_name': store.store_name
            })
        
    except Exception as e:
        return Response({
            'error': f'Failed to create store record: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def reject_store_application(request, user_id):
    """Reject store application (admin only)"""
    if not is_admin(request.user):
        return Response({'error': 'Admin access required'}, status=status.HTTP_403_FORBIDDEN)
    
    try:
        user = User.objects.get(id=user_id, is_store_registered=True)
    except User.DoesNotExist:
        return Response({'error': 'Application not found'}, status=status.HTTP_404_NOT_FOUND)
    
    # Reset registration status without changing role
    user.is_store_registered = False
    user.save()
    
    return Response({
        'message': 'Store application rejected',
        'user': UserSerializer(user).data
    })
