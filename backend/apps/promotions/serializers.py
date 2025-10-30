from rest_framework import serializers
from .models import Promo
from .order_promo import OrderPromo
from apps.utils import VietnamDateTimeField


class PromoSerializer(serializers.ModelSerializer):
    is_active = serializers.ReadOnlyField()
    store_name = serializers.CharField(source='store.store_name', read_only=True, allow_null=True)
    discount_type = serializers.CharField(source='category', read_only=True)
    scope = serializers.CharField(read_only=True)
    
    class Meta:
        model = Promo
        fields = ['id', 'name', 'scope', 'discount_type', 'category', 'discount_value', 'minimum_pay', 'max_discount_amount', 'start_date', 'end_date', 'store', 'store_id', 'store_name', 'is_active']
        read_only_fields = ['scope', 'discount_type']
        extra_kwargs = {
            'store': {'required': False, 'allow_null': True},
            'category': {'required': False}  # Will be synced from discount_type
        }
        
    def to_representation(self, instance):
        data = super().to_representation(instance)
        
        # Add store_id property (0 if store is None, otherwise store.id)
        data['store_id'] = instance.store.id if instance.store else 0
        
        # Add discount_type from category
        data['discount_type'] = instance.discount_type
        data['scope'] = instance.scope
        
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
    
    def create(self, validated_data):
        """Override create to handle discount_type mapping to category"""
        # Map discount_type to category if provided
        if 'discount_type' in self.initial_data:
            validated_data['category'] = self.initial_data['discount_type']
        
        return super().create(validated_data)
    
    def update(self, instance, validated_data):
        """Override update to handle discount_type mapping to category"""
        # Map discount_type to category if provided
        if 'discount_type' in self.initial_data:
            validated_data['category'] = self.initial_data['discount_type']
        
        return super().update(instance, validated_data)
    
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


class OrderPromoSerializer(serializers.ModelSerializer):
    """Serializer for OrderPromo with Vietnam timezone"""
    created_at = VietnamDateTimeField(read_only=True)
    promo_name = serializers.CharField(source='promo.name', read_only=True)
    
    class Meta:
        model = OrderPromo
        fields = ['id', 'order', 'promo', 'promo_name', 'applied_amount', 'note', 'created_at']
        read_only_fields = ['id', 'created_at']
