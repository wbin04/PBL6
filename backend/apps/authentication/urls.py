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
]
