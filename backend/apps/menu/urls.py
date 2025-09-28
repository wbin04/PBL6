from django.urls import path
from . import views

urlpatterns = [
    path('categories/', views.category_list, name='categories'),
    path('stores/', views.store_list, name='stores'),
    path('items/', views.food_list, name='food_list'),
    path('items/<int:pk>/', views.food_detail, name='food_detail'),
    path('categories/<int:category_id>/foods/', views.category_foods, name='category_foods'),
    
    # Store manager endpoints
    path('store/foods/', views.store_foods_list, name='store_foods_list'),
    
    # Admin endpoints
    path('admin/foods/', views.admin_foods_list, name='admin_foods_list'),
    path('admin/foods/<int:food_id>/', views.admin_food_detail, name='admin_food_detail'),
]
