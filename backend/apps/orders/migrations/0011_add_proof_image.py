from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('orders', '0010_order_refund_fields'),
    ]

    operations = [
        migrations.AddField(
            model_name='order',
            name='proof_image',
            field=models.CharField(max_length=255, null=True, blank=True),
        ),
    ]
