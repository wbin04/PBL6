# Generated manually to match existing database structure

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('ratings', '0003_initial'),
        ('orders', '0001_initial'),
    ]

    operations = [
        # Since the database already has the correct structure, we just need to
        # tell Django about the state without actually changing anything
        migrations.RunSQL(
            "SELECT 1;",  # Simple query that does nothing but succeeds
            reverse_sql="SELECT 1;"
        ),
    ]
