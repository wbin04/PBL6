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
]
