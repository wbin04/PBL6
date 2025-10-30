from django.urls import path
from . import views

urlpatterns = [
    path('', views.promo_list, name='promo_list'),
    path('validate/', views.validate_promo, name='validate_promo'),
    
    # CRUD endpoints for store managers
    path('create/', views.create_promo, name='create_promo'),
    path('<int:promo_id>/', views.promo_detail, name='promo_detail'),
    path('<int:promo_id>/update/', views.update_promo, name='update_promo'),
    path('<int:promo_id>/delete/', views.delete_promo, name='delete_promo'),
    
    # Admin CRUD endpoints (system-wide promotions)
    path('admin/', views.admin_promo_list, name='admin_promo_list'),
    path('admin/create/', views.admin_create_promo, name='admin_create_promo'),
    path('admin/<int:promo_id>/', views.admin_promo_detail, name='admin_promo_detail'),
    path('admin/<int:promo_id>/update/', views.admin_update_promo, name='admin_update_promo'),
    path('admin/<int:promo_id>/delete/', views.admin_delete_promo, name='admin_delete_promo'),
]
