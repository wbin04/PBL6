from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import StoreViewSet, store_list_public

router = DefaultRouter()
router.register(r'', StoreViewSet, basename='store')

urlpatterns = [
    path('public/', store_list_public, name='store-list-public'),
    path('', include(router.urls)),
]
