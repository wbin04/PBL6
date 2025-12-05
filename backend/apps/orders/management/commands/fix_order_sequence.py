from django.core.management.base import BaseCommand
from django.db import connection


class Command(BaseCommand):
    help = 'Fix PostgreSQL sequence for orders table'

    def handle(self, *args, **options):
        with connection.cursor() as cursor:
            # Get the current max ID from orders table
            cursor.execute("SELECT COALESCE(MAX(id), 0) FROM orders")
            max_id = cursor.fetchone()[0]
            
            # Set the sequence to max_id + 1
            cursor.execute(f"SELECT setval('orders_id_seq', {max_id + 1}, false)")
            
            self.stdout.write(
                self.style.SUCCESS(
                    f'Successfully reset orders_id_seq to {max_id + 1}'
                )
            )
