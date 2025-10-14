# Generated manually

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('cart', '0002_item_toppings'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='item',
            name='toppings',
        ),
    ]