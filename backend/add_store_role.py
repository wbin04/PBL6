#!/usr/bin/env python
"""
Script để thêm role "Cửa hàng" vào database
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

from apps.authentication.models import Role

def add_store_role():
    """Thêm role Cửa hàng nếu chưa có"""
    try:
        role, created = Role.objects.get_or_create(
            role_name='Cửa hàng',
            defaults={'role_name': 'Cửa hàng'}
        )
        
        if created:
            print(f"✅ Đã tạo role mới: {role.role_name}")
        else:
            print(f"ℹ️  Role đã tồn tại: {role.role_name}")
            
        return role
        
    except Exception as e:
        print(f"❌ Lỗi khi tạo role: {e}")
        return None

if __name__ == '__main__':
    print("🚀 Bắt đầu thêm role Cửa hàng...")
    add_store_role()
    print("✨ Hoàn thành!")
