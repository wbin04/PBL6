# Generated manually on 2025-09-19 to remove deprecated price column
from django.db import migrations


def remove_price_column(apps, schema_editor):
    """Remove the deprecated price column from order_detail table"""
    with schema_editor.connection.cursor() as cursor:
        cursor.execute("ALTER TABLE order_detail DROP COLUMN IF EXISTS price")


def add_price_column(apps, schema_editor):
    """Add back the price column for reverse migration"""
    with schema_editor.connection.cursor() as cursor:
        cursor.execute("ALTER TABLE order_detail ADD COLUMN price NUMERIC(10,2)")


class Migration(migrations.Migration):

    dependencies = [
        ('orders', '0005_alter_order_created_date'),
    ]

    operations = [
        migrations.RunPython(remove_price_column, add_price_column),
    ]