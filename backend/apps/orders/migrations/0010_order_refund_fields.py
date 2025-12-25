from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('orders', '0009_order_route_polyline'),
    ]

    operations = [
        migrations.AddField(
            model_name='order',
            name='bank_account',
            field=models.CharField(blank=True, max_length=50, null=True),
        ),
        migrations.AddField(
            model_name='order',
            name='bank_name',
            field=models.CharField(blank=True, max_length=100, null=True),
        ),
        migrations.AddField(
            model_name='order',
            name='refund_requested',
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name='order',
            name='refund_status',
            field=models.CharField(choices=[('Không', 'Không'), ('Chờ xử lý', 'Chờ xử lý'), ('Đã hoàn thành', 'Đã hoàn thành')], default='Không', max_length=20),
        ),
    ]
