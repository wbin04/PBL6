from django.urls import path
from . import views

urlpatterns = [
    path('login/', views.login_view, name='login'),
    path('register/', views.register_view, name='register'),
    path('refresh/', views.refresh_view, name='refresh'),
    path('profile/', views.profile_view, name='profile'),
    path('profile/update/', views.update_profile_view, name='update_profile'),
    # Password reset via identifier
    path('reset-password/', views.reset_password_view, name='reset_password'),
    
    # Admin endpoints
    path('admin/customers/', views.admin_customers_list, name='admin_customers_list'),
    path('admin/customers/<int:customer_id>/', views.admin_customer_detail, name='admin_customer_detail'),
    path('admin/customers/<int:customer_id>/toggle-status/', views.admin_toggle_customer_status, name='admin_toggle_customer_status'),
    
    # Registration status endpoints
    path('registration/shipper/', views.update_shipper_registration, name='update_shipper_registration'),
    path('registration/store/', views.update_store_registration, name='update_store_registration'),
    path('registration/status/', views.get_registration_status, name='get_registration_status'),
    
    # Shipper application management (admin only)
    path('shipper/applications/', views.get_shipper_applications, name='get_shipper_applications'),
    path('shipper/applications/<int:user_id>/approve/', views.approve_shipper_application, name='approve_shipper_application'),
    path('shipper/applications/<int:user_id>/reject/', views.reject_shipper_application, name='reject_shipper_application'),
    
    # Store application management (admin only)
    path('store/applications/', views.get_store_applications, name='get_store_applications'),
    path('store/applications/<int:user_id>/approve/', views.approve_store_application, name='approve_store_application'),
    path('store/applications/<int:user_id>/reject/', views.reject_store_application, name='reject_store_application'),
]
