from rest_framework import serializers
from .models import Promo


class PromoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Promo
        fields = ['id', 'description', 'percent', 'minimum_pay', 'start_date', 'end_date', 'is_active']
