from django.contrib import admin
from .models import Category, Food


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ['cate_name']
    search_fields = ['cate_name']


@admin.register(Food)
class FoodAdmin(admin.ModelAdmin):
    list_display = ['title', 'category', 'price', 'availability']
    list_filter = ['category', 'availability']
    search_fields = ['title', 'description']
