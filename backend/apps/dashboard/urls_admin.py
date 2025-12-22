from django.urls import path

from .views import (
    DashboardOverviewAPIView,
    RevenueChartAPIView,
    TopStoresAPIView,
    OrderStatusAPIView,
    FunnelConversionAPIView,
    OrderHeatmapAPIView,
    StoresTableAPIView,
)

urlpatterns = [
    path('overview/', DashboardOverviewAPIView.as_view(), name='dashboard_overview'),
    path('revenue-chart/', RevenueChartAPIView.as_view(), name='dashboard_revenue_chart'),
    path('top-stores/', TopStoresAPIView.as_view(), name='dashboard_top_stores'),
    path('order-status/', OrderStatusAPIView.as_view(), name='dashboard_order_status'),
    path('funnel/', FunnelConversionAPIView.as_view(), name='dashboard_funnel'),
    path('order-heatmap/', OrderHeatmapAPIView.as_view(), name='dashboard_order_heatmap'),
    path('stores-table/', StoresTableAPIView.as_view(), name='dashboard_stores_table'),
]
