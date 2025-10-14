from django.urls import path
from . import views

urlpatterns = [
    path('', views.rating_list_create, name='ratings'),
    path('<int:pk>/', views.rating_detail, name='rating_detail'),
]
