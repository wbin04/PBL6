from django.urls import path
from . import views

urlpatterns = [
    path('', views.order_list_create, name='orders'),
    path('<int:pk>/', views.order_detail, name='order_detail'),
    path('<int:pk>/status/', views.update_order_status, name='update_status'),
    
    # Admin endpoints
    path('admin/', views.admin_orders_list, name='admin_orders_list'),
    path('admin/<int:order_id>/', views.admin_order_detail, name='admin_order_detail'),
]
