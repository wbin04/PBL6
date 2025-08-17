#!/usr/bin/env python
"""
Script để thêm role "Cửa hàng" và một số dữ liệu mẫu cho stores
"""
import os
import sys
import django

# Setup Django
sys.path.append(os.path.join(os.path.dirname(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'fastfood_api.settings')
django.setup()

from apps.authentication.models import Role
from apps.stores.models import Store

def add_store_role():
    """Thêm role Cửa hàng nếu chưa có"""
    role, created = Role.objects.get_or_create(role_name='Cửa hàng')
    if created:
        print("✅ Đã thêm role 'Cửa hàng' thành công!")
    else:
        print("ℹ️ Role 'Cửa hàng' đã tồn tại.")
    return role

def add_sample_stores():
    """Thêm một số cửa hàng mẫu"""
    stores_data = [
        {
            'store_name': 'KFC Vietnam',
            'image': 'assets/kfc-logo.png',
            'description': 'Nhà hàng gà rán nổi tiếng thế giới'
        },
        {
            'store_name': 'McDonald\'s Vietnam',
            'image': 'assets/mcdonalds-logo.png',
            'description': 'Chuỗi thức ăn nhanh hàng đầu'
        },
        {
            'store_name': 'Burger King',
            'image': 'assets/burger-king-logo.png',
            'description': 'Chuyên về burger và thức ăn nhanh'
        },
        {
            'store_name': 'Pizza Hut',
            'image': 'assets/pizza-hut-logo.png',
            'description': 'Chuyên pizza và đồ ăn Ý'
        },
        {
            'store_name': 'Domino\'s Pizza',
            'image': 'assets/dominos-logo.png',
            'description': 'Giao pizza nhanh chóng'
        }
    ]
    
    created_count = 0
    for store_data in stores_data:
        store, created = Store.objects.get_or_create(
            store_name=store_data['store_name'],
            defaults={
                'image': store_data['image'],
                'description': store_data['description']
            }
        )
        if created:
            created_count += 1
            print(f"✅ Đã thêm cửa hàng: {store.store_name}")
        else:
            print(f"ℹ️ Cửa hàng đã tồn tại: {store.store_name}")
    
    print(f"\n📊 Tổng kết: Đã thêm {created_count} cửa hàng mới")

if __name__ == '__main__':
    print("🚀 Bắt đầu cập nhật dữ liệu...")
    
    # Thêm role Cửa hàng
    add_store_role()
    
    # Thêm cửa hàng mẫu
    add_sample_stores()
    
    print("\n✨ Hoàn thành cập nhật dữ liệu!")
