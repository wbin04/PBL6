from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ShipperViewSet

router = DefaultRouter()
router.register(r'shippers', ShipperViewSet)

urlpatterns = [
    path('', include(router.urls)),
]
