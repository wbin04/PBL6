from django.urls import path
from . import views

urlpatterns = [
    path('', views.order_list_create, name='orders'),
    path('<int:pk>/', views.order_detail, name='order_detail'),
    path('<int:pk>/status/', views.update_order_status, name='update_status'),
    path('<int:pk>/cancel-group/', views.cancel_order_group, name='cancel_order_group'),
    
    # Admin endpoints
    path('admin/', views.admin_orders_list, name='admin_orders_list'),
    path('admin/<int:order_id>/', views.admin_order_detail, name='admin_order_detail'),
    path('admin/<int:order_id>/assign-shipper/', views.assign_shipper, name='assign_shipper'),
    path('admin/<int:pk>/status/', views.admin_update_order_status, name='admin_update_order_status'),
    
    # Shipper endpoints
    path('shipper/', views.shipper_orders, name='shipper_orders'),
    path('shipper/<int:shipper_id>/orders/', views.get_orders_by_shipper, name='get_orders_by_shipper'),
    path('shipper/<int:order_id>/accept/', views.shipper_accept_order, name='shipper_accept_order'),
    path('shipper/<int:order_id>/status/', views.update_delivery_status, name='update_delivery_status'),
]
