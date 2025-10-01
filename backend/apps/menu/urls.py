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
    path('store/foods/<int:food_id>/', views.store_food_detail, name='store_food_detail'),
    path('store/foods/<int:food_id>/sizes/', views.food_sizes_list, name='store_food_sizes_list'),
    path('store/foods/<int:food_id>/sizes/<int:size_id>/', views.food_size_detail, name='store_food_size_detail'),
    
    # Admin endpoints
    path('admin/foods/', views.admin_foods_list, name='admin_foods_list'),
    path('admin/foods/<int:food_id>/', views.admin_food_detail, name='admin_food_detail'),
    
    # FoodSize management endpoints (admin can also use these)
    path('admin/foods/<int:food_id>/sizes/', views.food_sizes_list, name='food_sizes_list'),
    path('admin/foods/<int:food_id>/sizes/<int:size_id>/', views.food_size_detail, name='food_size_detail'),
]
