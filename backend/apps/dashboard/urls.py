from django.urls import path
from .views import admin_dashboard_metrics, store_dashboard_metrics

urlpatterns = [
    path('admin/', admin_dashboard_metrics, name='admin_dashboard_metrics'),
    path('store/<int:store_id>/', store_dashboard_metrics, name='store_dashboard_metrics'),
]