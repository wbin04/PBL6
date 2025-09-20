from django.contrib import admin
from .models import Shipper


@admin.register(Shipper)
class ShipperAdmin(admin.ModelAdmin):
    list_display = ['id', 'user', 'get_user_fullname', 'get_user_phone']
    list_filter = ['user__created_date']
    search_fields = ['user__fullname', 'user__username', 'user__email', 'user__phone_number']
    raw_id_fields = ['user']
    
    def get_user_fullname(self, obj):
        return obj.user.fullname if obj.user else ''
    get_user_fullname.short_description = 'Tên đầy đủ'
    
    def get_user_phone(self, obj):
        return obj.user.phone_number if obj.user else ''
    get_user_phone.short_description = 'Số điện thoại'
