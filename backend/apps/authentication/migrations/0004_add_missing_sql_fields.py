from django.db import migrations

class Migration(migrations.Migration):
    dependencies = [
        ('authentication', '0003_add_first_and_last_name'),
    ]
    operations = [
        migrations.RunSQL(
            sql="""
                ALTER TABLE users ADD COLUMN IF NOT EXISTS first_name varchar(150) NOT NULL DEFAULT '';
                ALTER TABLE users ADD COLUMN IF NOT EXISTS last_name varchar(150) NOT NULL DEFAULT '';
            """,
            reverse_sql="""
                ALTER TABLE users DROP COLUMN IF EXISTS first_name;
                ALTER TABLE users DROP COLUMN IF EXISTS last_name;
            """,
        ),
    ]
