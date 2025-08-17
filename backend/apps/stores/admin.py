from django.contrib import admin
from .models import Store


@admin.register(Store)
class StoreAdmin(admin.ModelAdmin):
    list_display = ['id', 'store_name', 'description']
    search_fields = ['store_name', 'description']
    list_filter = ['store_name']
