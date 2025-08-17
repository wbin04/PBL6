#!/usr/bin/env python
"""
Setup script to create store manager assignments.
This script can be run to assign store managers to stores.
"""

import os
import sys
import django

# Add the backend directory to Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'fastfood_api.settings')
django.setup()

from apps.authentication.models import User, Role
from apps.stores.models import Store, StoreManager

def setup_store_managers():
    """Create store manager assignments"""
    print("Setting up store manager assignments...")
    
    try:
        # Get or create Store role (role_id = 3)
        store_role, created = Role.objects.get_or_create(
            id=3,
            defaults={'role_name': 'Cửa hàng'}
        )
        if created:
            print(f"Created Store role: {store_role}")
        
        # Create sample stores if they don't exist
        store1, created = Store.objects.get_or_create(
            id=1,
            defaults={
                'store_name': 'FastFood Chi nhánh 1',
                'description': 'Chi nhánh đầu tiên của FastFood',
                'image': 'assets/store1.png'
            }
        )
        if created:
            print(f"Created store: {store1}")
            
        store2, created = Store.objects.get_or_create(
            id=2,
            defaults={
                'store_name': 'FastFood Chi nhánh 2', 
                'description': 'Chi nhánh thứ hai của FastFood',
                'image': 'assets/store2.png'
            }
        )
        if created:
            print(f"Created store: {store2}")
        
        # Create sample store manager users
        store_manager1, created = User.objects.get_or_create(
            username='store1_manager',
            defaults={
                'email': 'store1@fastfood.com',
                'fullname': 'Quản lý Chi nhánh 1',
                'password': '123',
                'role': store_role,
                'phone_number': '0123456789',
                'address': '123 Nguyễn Trãi, Hà Nội'
            }
        )
        if created:
            print(f"Created store manager: {store_manager1}")
            
        store_manager2, created = User.objects.get_or_create(
            username='store2_manager',
            defaults={
                'email': 'store2@fastfood.com',
                'fullname': 'Quản lý Chi nhánh 2',
                'password': '123',
                'role': store_role,
                'phone_number': '0987654321',
                'address': '456 Lê Lợi, TP.HCM'
            }
        )
        if created:
            print(f"Created store manager: {store_manager2}")
        
        # Create store manager assignments
        assignment1, created = StoreManager.objects.get_or_create(
            user=store_manager1,
            store=store1
        )
        if created:
            print(f"Created assignment: {assignment1}")
            
        assignment2, created = StoreManager.objects.get_or_create(
            user=store_manager2,
            store=store2
        )
        if created:
            print(f"Created assignment: {assignment2}")
        
        print("\nStore manager setup completed!")
        print("\nStore Managers:")
        print(f"- Username: store1_manager, Password: 123 (manages {store1.store_name})")
        print(f"- Username: store2_manager, Password: 123 (manages {store2.store_name})")
        
    except Exception as e:
        print(f"Error setting up store managers: {e}")
        return False
    
    return True

if __name__ == '__main__':
    setup_store_managers()