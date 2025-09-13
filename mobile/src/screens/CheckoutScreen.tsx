import React, { useState, useEffect, useMemo, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  StatusBar,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '@/store';
import { fetchCart } from '@/store/slices/cartSlice';
import { createOrder } from '@/store/slices/ordersSlice';
import { RootStackParamList, CreateOrderRequest, CartItem, Food } from '@/types';
import { COLORS, SPACING, BORDER_RADIUS, SHADOWS } from '@/constants';
import { CheckoutFoodItem } from '@/components';

type CheckoutScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Checkout'>;
type CheckoutScreenRouteProp = RouteProp<RootStackParamList, 'Checkout'>;

interface DeliveryInfo {
  receiverName: string;
  phoneNumber: string;
  address: string;
  note: string;
}

const CheckoutScreen: React.FC = () => {
  const navigation = useNavigation<CheckoutScreenNavigationProp>();
  const route = useRoute<CheckoutScreenRouteProp>();
  
  console.log('CheckoutScreen - ALL route params:', route.params);

  const params = (route.params || {}) as any;
  const { selectedIds = [], cartItems: reorderCartItems, isReorder, shopName: reorderShopName } = params;

  console.log('CheckoutScreen - selectedIds:', selectedIds);
  console.log('CheckoutScreen - reorderCartItems:', reorderCartItems);
  console.log('CheckoutScreen - isReorder:', isReorder);
  console.log('CheckoutScreen - reorderShopName:', reorderShopName);
  
  const dispatch = useDispatch<AppDispatch>();
  const { user } = useSelector((state: RootState) => state.auth);
  const { cart, loading: cartLoading } = useSelector((state: RootState) => state.cart);
  const { loading: orderLoading } = useSelector((state: RootState) => state.orders);

  const [deliveryInfo, setDeliveryInfo] = useState<DeliveryInfo>({
    receiverName: 'Lý Hoàng Quyên',
    phoneNumber: '(+84) 867 517 503',
    address: '142/18 Au Co, Phường Hòa Khánh Bắc, Quận Liên Chiều, Đà Nẵng',
    note: '',
  });

  const [promoCode, setPromoCode] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'vnpay' | 'momo'>('cash');
  const [applyingPromo, setApplyingPromo] = useState<boolean>(false);
  const [discount, setDiscount] = useState<number>(0);

  const SHIPPING_FEE = 15000;

  useEffect(() => {
    dispatch(fetchCart());
  }, [dispatch]);

  const cartItems = cart?.items || [];
  
  // Memoize selectedCartItems để tối ưu performance  
  const selectedCartItems = useMemo((): CartItem[] => {
    if (isReorder && reorderCartItems) {
      return reorderCartItems.map((item: any) => ({
        id: parseInt(item.id),
        food: {
          id: parseInt(item.id),
          title: item.name,
          description: '',
          price: item.price.toString(),
          image: item.image,
          availability: 'available'
        },
        quantity: item.quantity,
        subtotal: item.price * item.quantity
      }));
    }
    
    // Kiểm tra selectedIds tồn tại và là array
    if (!selectedIds || !Array.isArray(selectedIds)) {
      return [];
    }
    
    return cartItems.filter(item => selectedIds.includes(item.id));
  }, [isReorder, reorderCartItems, cartItems, selectedIds]);
    
  console.log('CheckoutScreen - selectedCartItems:', selectedCartItems);
  
  // Memoize calculations để tối ưu performance
  const subtotal = useMemo(() => 
    selectedCartItems.reduce((sum, item) => sum + item.subtotal, 0),
    [selectedCartItems]
  );
  
  const total = useMemo(() => 
    subtotal + (selectedCartItems.length > 0 ? SHIPPING_FEE : 0) - discount,
    [subtotal, selectedCartItems.length, discount]
  );

  const handleInputChange = useCallback((field: keyof DeliveryInfo, value: string) => {
    setDeliveryInfo(prev => ({
      ...prev,
      [field]: value,
    }));
  }, []);

  const handleApplyPromo = useCallback(async () => {
    if (!promoCode.trim()) {
      Alert.alert('Thông báo', 'Vui lòng nhập mã khuyến mãi');
      return;
    }

    setApplyingPromo(true);
    try {
      // TODO: Call promo validation API
      // const result = await promotionsService.validatePromoCode(promoCode);
      // Mock validation
      if (promoCode.toLowerCase() === 'save10') {
        setDiscount(subtotal * 0.1); // 10% discount
        Alert.alert('Thành công', 'Đã áp dụng mã khuyến mãi!');
      } else {
        Alert.alert('Lỗi', 'Mã khuyến mãi không hợp lệ');
      }
    } catch (error) {
      console.error('Error applying promo:', error);
      Alert.alert('Lỗi', 'Không thể áp dụng mã khuyến mãi');
    } finally {
      setApplyingPromo(false);
    }
  }, [promoCode, subtotal]);

  const validateForm = useCallback((): boolean => {
    // Bỏ hết validation - luôn return true
    return true;
  }, [deliveryInfo, cartItems.length]);

  const handlePlaceOrder = useCallback(async () => {
    // Bỏ validation - đặt hàng luôn

    // Tạo đơn hàng mock đơn giản
    const newOrder = {
      id: Date.now().toString(),
      items: selectedCartItems.map(item => ({
        id: item.id.toString(),
        name: item.food.title,
        price: parseFloat(item.food.price),
        quantity: item.quantity,
        image: item.food.image
      })),
      totalAmount: total,
      status: 'pending',
      orderDate: new Date().toISOString(),
      deliveryInfo: {
        receiverName: deliveryInfo.receiverName || 'Khách hàng',
        phoneNumber: deliveryInfo.phoneNumber || '0123456789',
        address: deliveryInfo.address || 'Địa chỉ giao hàng',
        note: deliveryInfo.note || ''
      },
      paymentMethod,
      promoCode
    };

    try {
      // Lưu đơn hàng vào AsyncStorage
      const existingOrdersJson = await AsyncStorage.getItem('pendingOrders');
      const existingOrders = existingOrdersJson ? JSON.parse(existingOrdersJson) : [];
      existingOrders.unshift(newOrder);
      await AsyncStorage.setItem('pendingOrders', JSON.stringify(existingOrders));
      
      console.log('Đặt hàng thành công:', newOrder);
      
      // Chuyển thẳng về trang Orders
      navigation.reset({
        index: 0,
        routes: [
          {
            name: 'MainTabs',
            params: { screen: 'Orders' },
          },
        ],
      });
      
    } catch (error: any) {
      console.error('Lỗi lưu đơn hàng:', error);
    }
  }, [validateForm, paymentMethod, deliveryInfo, promoCode, selectedCartItems, total, navigation]);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(price);
  };

  const paymentMethods = [
    { value: 'cash', label: 'Thanh toán khi nhận hàng', icon: 'cash-outline' },
    { value: 'vnpay', label: 'VNPay', icon: 'card-outline' },
    { value: 'momo', label: 'MoMo', icon: 'wallet-outline' },
  ] as const;

  if (cartLoading && !cart) {
    return (
      <View style={styles.container}>
        <View style={styles.loader}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={COLORS.white} />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.greeting}>Bạn đang ở bước cuối cùng.</Text>
          <Text style={styles.subtitle}>Hoàn tất thanh toán ngay chứ?</Text>
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Delivery Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Giao hàng đến</Text>
          
          <View style={styles.deliveryCard}>
            <View style={styles.deliveryIcon}>
              <Ionicons name="location" size={16} color={COLORS.white} />
            </View>
            
            <View style={styles.deliveryDetails}>
              <Text style={styles.deliveryName}>
                {deliveryInfo.receiverName} - {deliveryInfo.phoneNumber}
              </Text>
              <Text style={styles.deliveryAddress}>{deliveryInfo.address}</Text>
            </View>
            
            <TouchableOpacity 
              style={styles.updateButton}
              onPress={() => (navigation as any).navigate('AddressSelection')}
            >
              <Text style={styles.updateButtonText}>Cập nhật</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Ghi chú cho shipper (ví dụ: gọi trước khi đến)</Text>
            <TextInput
              style={[styles.textInput, styles.textArea]}
              value={deliveryInfo.note}
              onChangeText={(value) => handleInputChange('note', value)}
              placeholder="Nhập ghi chú (không bắt buộc)"
              placeholderTextColor={COLORS.gray400}
              multiline
              numberOfLines={2}
            />
          </View>
        </View>

        {/* Order Items */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Món ăn đã chọn ({selectedCartItems.length})</Text>
          {selectedCartItems.map((item) => (
            <CheckoutFoodItem
              key={item.id}
              item={item}
              formatPrice={formatPrice}
              onPress={(foodId) => navigation.navigate('FoodDetail', { foodId })}
            />
          ))}
        </View>

        {/* Promo Code */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Mã khuyến mãi</Text>
          <View style={styles.promoContainer}>
            <TextInput
              style={[styles.textInput, styles.promoInput]}
              value={promoCode}
              onChangeText={setPromoCode}
              placeholder="Nhập mã khuyến mãi"
              placeholderTextColor={COLORS.gray400}
            />
            <TouchableOpacity
              style={styles.applyButton}
              onPress={handleApplyPromo}
              disabled={applyingPromo}
            >
              {applyingPromo ? (
                <ActivityIndicator size="small" color={COLORS.white} />
              ) : (
                <Text style={styles.applyButtonText}>Áp dụng</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Payment Method */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Phương thức thanh toán</Text>
          {paymentMethods.map((method) => (
            <TouchableOpacity
              key={method.value}
              style={[
                styles.paymentOption,
                paymentMethod === method.value && styles.selectedPaymentOption,
              ]}
              onPress={() => setPaymentMethod(method.value)}
            >
              <View style={styles.paymentLeft}>
                <Ionicons
                  name={method.icon as any}
                  size={24}
                  color={paymentMethod === method.value ? COLORS.primary : COLORS.gray500}
                />
                <Text
                  style={[
                    styles.paymentText,
                    paymentMethod === method.value && styles.selectedPaymentText,
                  ]}
                >
                  {method.label}
                </Text>
              </View>
              <Ionicons
                name={paymentMethod === method.value ? 'radio-button-on' : 'radio-button-off'}
                size={20}
                color={paymentMethod === method.value ? COLORS.primary : COLORS.gray400}
              />
            </TouchableOpacity>
          ))}
        </View>

  {/* Order Summary */}
  <View style={styles.section}>
          <Text style={styles.sectionTitle}>Chi tiết thanh toán</Text>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Tạm tính:</Text>
            <Text style={styles.summaryValue}>{formatPrice(subtotal)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Phí giao hàng:</Text>
            <Text style={styles.summaryValue}>
              {formatPrice(selectedCartItems.length > 0 ? SHIPPING_FEE : 0)}
            </Text>
          </View>
          {discount > 0 && (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Giảm giá:</Text>
              <Text style={[styles.summaryValue, styles.discountText]}>-{formatPrice(discount)}</Text>
            </View>
          )}
          <View style={[styles.summaryRow, styles.totalRow]}>
            <Text style={styles.totalLabel}>Tổng cộng:</Text>
            <Text style={styles.totalValue}>{formatPrice(total)}</Text>
          </View>
        </View>
      </ScrollView>

      {/* Bottom Button */}
      <View style={styles.bottomContainer}>
        <TouchableOpacity
          style={[styles.orderButton, orderLoading && styles.orderButtonDisabled]}
          onPress={handlePlaceOrder}
          disabled={orderLoading}
        >
          {orderLoading ? (
            <ActivityIndicator size="small" color={COLORS.white} />
          ) : (
            <Text style={styles.orderButtonText}>Đặt hàng</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    backgroundColor: COLORS.primary,
    paddingTop: 50,
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.lg,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    elevation: 10,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    marginRight: SPACING.md,
  },
  headerContent: {
    flex: 1,
  },
  greeting: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.white,
    marginBottom: SPACING.xs,
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.white,
    opacity: 0.9,
  },
  content: {
    flex: 1,
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.lg,
  },
  section: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
    ...SHADOWS.sm,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: SPACING.md,
  },
  inputGroup: {
    marginBottom: SPACING.md,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  textInput: {
    borderWidth: 1,
    borderColor: COLORS.gray300,
    borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    fontSize: 16,
    color: COLORS.text,
    backgroundColor: COLORS.white,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  promoContainer: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  promoInput: {
    flex: 1,
  },
  applyButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 80,
  },
  applyButtonText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '600',
  },
  paymentOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.gray300,
  },
  selectedPaymentOption: {
    borderColor: COLORS.primary,
    backgroundColor: `${COLORS.primary}10`,
  },
  paymentLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  paymentText: {
    fontSize: 16,
    color: COLORS.text,
    marginLeft: SPACING.sm,
  },
  selectedPaymentText: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  summaryLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  summaryValue: {
    fontSize: 14,
    color: COLORS.text,
    fontWeight: '600',
  },
  discountText: {
    color: COLORS.success,
  },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: COLORS.divider,
    paddingTop: SPACING.sm,
    marginBottom: 0,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  totalValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  bottomContainer: {
    backgroundColor: COLORS.white,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.divider,
    ...SHADOWS.md,
  },
  orderButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    alignItems: 'center',
    ...SHADOWS.sm,
  },
  orderButtonDisabled: {
    opacity: 0.5,
  },
  orderButtonText: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: 'bold',
  },
  deliveryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    marginBottom: SPACING.md,
    ...SHADOWS.sm,
  },
  deliveryIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
  },
  deliveryDetails: {
    flex: 1,
  },
  deliveryName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
  },
  deliveryAddress: {
    fontSize: 14,
    color: COLORS.gray600,
    lineHeight: 20,
  },
  updateButton: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.md,
    marginLeft: SPACING.lg, // Thêm margin để xa địa chỉ hơn
  },
  updateButtonText: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: '600',
  },
});

export default CheckoutScreen;

