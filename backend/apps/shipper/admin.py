from django.contrib import admin
from .models import Shipper


@admin.register(Shipper)
class ShipperAdmin(admin.ModelAdmin):
    list_display = ['id', 'get_user_fullname', 'get_user_phone', 'get_user_email', 'user']
    list_filter = ['user__role', 'user__created_date']
    search_fields = ['user__fullname', 'user__email', 'user__phone']
    raw_id_fields = ['user']
    
    def get_user_fullname(self, obj):
        return obj.user.fullname if obj.user else '-'
    get_user_fullname.short_description = 'Họ tên'
    get_user_fullname.admin_order_field = 'user__fullname'
    
    def get_user_phone(self, obj):
        return obj.user.phone if obj.user else '-'
    get_user_phone.short_description = 'Số điện thoại'
    get_user_phone.admin_order_field = 'user__phone'
    
    def get_user_email(self, obj):
        return obj.user.email if obj.user else '-'
    get_user_email.short_description = 'Email'
    get_user_email.admin_order_field = 'user__email'
    
    def get_queryset(self, request):
        return super().get_queryset(request).select_related('user')
