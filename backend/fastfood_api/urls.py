from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from django.http import JsonResponse

def api_root(request):
    """API Root endpoint"""
    return JsonResponse({
        'message': 'Welcome to FastFood API',
        'version': '1.0',
        'endpoints': {
            'authentication': '/api/auth/',
            'menu': '/api/menu/',
            'cart': '/api/cart/',
            'orders': '/api/orders/',
            'payments': '/api/payments/',
            'promotions': '/api/promotions/',
            'ratings': '/api/ratings/',
            'stores': '/api/stores/',
            'shipper': '/api/shipper/',
            'admin': '/admin/',
        }
    })

urlpatterns = [
    path('', api_root, name='api_root'),
    path('admin/', admin.site.urls),
    path('api/auth/', include('apps.authentication.urls')),
    path('api/menu/', include('apps.menu.urls')),
    path('api/cart/', include('apps.cart.urls')),
    path('api/orders/', include('apps.orders.urls')),
    path('api/payments/', include('apps.payments.urls')),
    path('api/promotions/', include('apps.promotions.urls')),
    path('api/ratings/', include('apps.ratings.urls')),
    path('api/stores/', include('apps.stores.urls')),
    path('api/shipper/', include('apps.shipper.urls')),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
