from django.contrib import admin
from .models import ChatSession, ChatMessage, ChatCart


@admin.register(ChatSession)
class ChatSessionAdmin(admin.ModelAdmin):
    list_display = ['session_id', 'user', 'created_at', 'updated_at']
    list_filter = ['created_at', 'updated_at']
    search_fields = ['session_id', 'user__username', 'user__email']
    readonly_fields = ['created_at', 'updated_at']


@admin.register(ChatMessage)
class ChatMessageAdmin(admin.ModelAdmin):
    list_display = ['session', 'is_user', 'message_preview', 'intent', 'created_at']
    list_filter = ['is_user', 'intent', 'created_at']
    search_fields = ['message', 'session__session_id']
    readonly_fields = ['created_at']
    
    def message_preview(self, obj):
        return obj.message[:50] + ('...' if len(obj.message) > 50 else '')
    message_preview.short_description = 'Message'


@admin.register(ChatCart)
class ChatCartAdmin(admin.ModelAdmin):
    list_display = ['session', 'food', 'food_size', 'quantity', 'total_price', 'created_at']
    list_filter = ['created_at']
    search_fields = ['session__session_id', 'food__title']
    readonly_fields = ['created_at', 'total_price']
