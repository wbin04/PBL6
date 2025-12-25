from django.core.management.base import BaseCommand
from django.db import connection


class Command(BaseCommand):
    help = 'Fix all PostgreSQL sequences to match the current max IDs in tables'

    def handle(self, *args, **options):
        # List of tables to fix (table_name, sequence_name)
        tables_to_fix = [
            ('orders', 'orders_id_seq'),
            ('order_detail', 'order_detail_id_seq'),
            ('food', 'food_id_seq'),
            ('category', 'category_id_seq'),
            ('stores', 'stores_id_seq'),
            ('cart', 'cart_id_seq'),
            ('promo', 'promo_id_seq'),
            ('rating_food', 'rating_food_id_seq'),
            ('item', 'item_id_seq'),
            ('users', 'users_id_seq'),
            ('shipper', 'shipper_id_seq'),
            ('food_size', 'food_size_id_seq'),
        ]
        
        with connection.cursor() as cursor:
            for table_name, sequence_name in tables_to_fix:
                try:
                    # Get the current max ID from table
                    cursor.execute(f"SELECT COALESCE(MAX(id), 0) FROM {table_name}")
                    max_id = cursor.fetchone()[0]
                    
                    # Set the sequence to max_id + 1
                    cursor.execute(f"SELECT setval('{sequence_name}', {max_id + 1}, false)")
                    
                    self.stdout.write(
                        self.style.SUCCESS(
                            f'✓ Reset {sequence_name} to {max_id + 1} (table: {table_name})'
                        )
                    )
                except Exception as e:
                    self.stdout.write(
                        self.style.WARNING(
                            f'✗ Failed to reset {sequence_name}: {str(e)}'
                        )
                    )
