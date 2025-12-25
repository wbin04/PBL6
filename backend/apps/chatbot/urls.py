from django.urls import path
from . import views

urlpatterns = [
    path('chat/', views.chat_endpoint, name='chatbot-chat'),
    path('cart/', views.get_cart, name='chatbot-cart'),
    path('cart/clear/', views.clear_cart, name='chatbot-clear-cart'),
    path('menu/', views.get_menu, name='chatbot-menu'),
]
