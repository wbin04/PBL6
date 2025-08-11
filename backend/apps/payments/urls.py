from django.urls import path
from . import views

urlpatterns = [
    path('create/', views.create_payment, name='create_payment'),
    path('webhook/', views.payment_webhook, name='payment_webhook'),
]
