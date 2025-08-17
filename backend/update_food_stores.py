#!/usr/bin/env python
"""
Script để cập nhật một số food items với store_id
"""
import os
import sys
import django

# Add the project root to Python path
sys.path.append('/'.join(__file__.split('\\')[:-1]))

# Set Django settings
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'fastfood_api.settings')

# Setup Django
django.setup()

from apps.menu.models import Food
from apps.stores.models import Store

def update_food_stores():
    """Cập nhật một số food items với store_id"""
    try:
        # Lấy các stores
        stores = list(Store.objects.all())
        if not stores:
            print("❌ Không có store nào trong database")
            return
            
        print(f"📍 Tìm thấy {len(stores)} cửa hàng:")
        for store in stores:
            print(f"  - {store.id}: {store.store_name}")
        
        # Lấy các food items
        foods = list(Food.objects.all())
        if not foods:
            print("❌ Không có food item nào trong database")
            return
            
        print(f"🍔 Tìm thấy {len(foods)} món ăn")
        
        # Cập nhật food items với store_id ngẫu nhiên để demo
        import random
        updated_count = 0
        
        for food in foods:
            if not food.store_id:  # Chỉ cập nhật những món chưa có store
                store = random.choice(stores)
                food.store = store
                food.save()
                print(f"  ✅ {food.title} -> {store.store_name}")
                updated_count += 1
        
        print(f"🎉 Đã cập nhật {updated_count} món ăn với cửa hàng tương ứng")
        
    except Exception as e:
        print(f"❌ Lỗi khi cập nhật food stores: {e}")
        import traceback
        traceback.print_exc()

if __name__ == '__main__':
    print("🚀 Bắt đầu cập nhật food items với stores...")
    update_food_stores()
    print("✨ Hoàn thành!")
