from django.urls import path
from . import views

urlpatterns = [
    path('create/', views.create_payment, name='create_payment'),
    path('webhook/', views.payment_webhook, name='payment_webhook'),
    # PayOS endpoints
    path('payos/create-link/', views.create_payment_link, name='create_payment_link'),
    path('payos/check-status/', views.check_payment_status, name='check_payment_status'),
    path('payos-return', views.payos_return, name='payos_return'),
]
