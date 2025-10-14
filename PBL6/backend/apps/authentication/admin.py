from django.contrib import admin
from .models import User, Role


@admin.register(Role)
class RoleAdmin(admin.ModelAdmin):
    list_display = ['role_name']
    search_fields = ['role_name']


@admin.register(User)
class UserAdmin(admin.ModelAdmin):
    list_display = ['email', 'fullname', 'role', 'created_date']
    list_filter = ['role', 'created_date']
    search_fields = ['email', 'fullname']
    readonly_fields = ['created_date']
