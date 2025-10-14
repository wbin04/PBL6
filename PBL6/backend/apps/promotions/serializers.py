from rest_framework import serializers
from .models import Promo


class PromoSerializer(serializers.ModelSerializer):
    is_active = serializers.ReadOnlyField()
    store_name = serializers.CharField(source='store.store_name', read_only=True)
    store_id = serializers.IntegerField(source='store.id', read_only=True)
    
    class Meta:
        model = Promo
        fields = ['id', 'name', 'category', 'discount_value', 'minimum_pay', 'max_discount_amount', 'start_date', 'end_date', 'store', 'store_id', 'store_name', 'is_active']
        
    def to_representation(self, instance):
        data = super().to_representation(instance)
        # Add backward compatibility for old API consumers
        if instance.category == 'PERCENT':
            data['percent'] = instance.discount_value
            if instance.max_discount_amount:
                data['description'] = f"{instance.name} - {instance.discount_value}% off (max {instance.max_discount_amount:,.0f}đ)"
            else:
                data['description'] = f"{instance.name} - {instance.discount_value}% off"
        else:
            data['percent'] = 0
            data['description'] = f"{instance.name} - {instance.discount_value:,.0f}đ off"
        return data
    
    def validate(self, data):
        """Validate that max_discount_amount is only set for PERCENT category"""
        category = data.get('category')
        max_discount_amount = data.get('max_discount_amount')
        
        if category == 'AMOUNT' and max_discount_amount is not None:
            raise serializers.ValidationError({
                'max_discount_amount': 'Số tiền giảm tối đa chỉ áp dụng cho loại giảm giá theo phần trăm (PERCENT)'
            })
        
        if category == 'PERCENT' and max_discount_amount is not None and max_discount_amount <= 0:
            raise serializers.ValidationError({
                'max_discount_amount': 'Số tiền giảm tối đa phải lớn hơn 0'
            })
            
        return data
