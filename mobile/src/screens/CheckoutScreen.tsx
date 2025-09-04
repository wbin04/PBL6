import React, { useState, useEffect } from 'react';
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
import { RootStackParamList, CreateOrderRequest, CartItem } from '@/types';
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
  const { selectedIds } = route.params;
  const dispatch = useDispatch<AppDispatch>();
  const { user } = useSelector((state: RootState) => state.auth);
  const { cart, loading: cartLoading } = useSelector((state: RootState) => state.cart);
  const { loading: orderLoading } = useSelector((state: RootState) => state.orders);

  const [deliveryInfo, setDeliveryInfo] = useState<DeliveryInfo>({
    receiverName: user?.fullname || '',
    phoneNumber: user?.phone_number || '',
    address: user?.address || '',
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
  const selectedCartItems: CartItem[] = cartItems.filter(item => selectedIds.includes(item.id));
  const subtotal = selectedCartItems.reduce((sum, item) => sum + item.subtotal, 0);
  const total = subtotal + (selectedCartItems.length > 0 ? SHIPPING_FEE : 0) - discount;

  const handleInputChange = (field: keyof DeliveryInfo, value: string) => {
    setDeliveryInfo(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleApplyPromo = async () => {
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
  };

  const validateForm = (): boolean => {
    if (!deliveryInfo.receiverName.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập tên người nhận');
      return false;
    }

    if (!deliveryInfo.phoneNumber.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập số điện thoại');
      return false;
    }

    if (!/^[0-9]{10,11}$/.test(deliveryInfo.phoneNumber)) {
      Alert.alert('Lỗi', 'Số điện thoại không hợp lệ');
      return false;
    }

    if (!deliveryInfo.address.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập địa chỉ giao hàng');
      return false;
    }

    if (cartItems.length === 0) {
      Alert.alert('Lỗi', 'Giỏ hàng trống');
      return false;
    }

    return true;
  };

  const handlePlaceOrder = async () => {
    if (!validateForm()) return;

    const orderData: CreateOrderRequest = {
      payment_method: paymentMethod,
      receiver_name: deliveryInfo.receiverName,
      phone_number: deliveryInfo.phoneNumber,
      ship_address: deliveryInfo.address,
      note: deliveryInfo.note || undefined,
      promo: promoCode || undefined,
    };

    try {
      const result = await dispatch(createOrder(orderData)).unwrap();
      
      Alert.alert(
        'Thành công',
        'Đơn hàng của bạn đã được đặt thành công!',
        [
          {
            text: 'OK',
            onPress: () => {
              navigation.reset({
                index: 0,
                routes: [
                  {
                    name: 'MainTabs',
                    params: { screen: 'Orders' },
                  },
                ],
              });
            },
          },
        ]
      );
    } catch (error: any) {
      console.error('Error placing order:', error);
      Alert.alert('Lỗi', error.message || 'Không thể đặt hàng. Vui lòng thử lại.');
    }
  };

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
          <Text style={styles.sectionTitle}>Thông tin giao hàng</Text>
          
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Tên người nhận</Text>
            <TextInput
              style={styles.textInput}
              value={deliveryInfo.receiverName}
              onChangeText={(value) => handleInputChange('receiverName', value)}
              placeholder="Nhập tên người nhận"
              placeholderTextColor={COLORS.gray400}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Số điện thoại</Text>
            <TextInput
              style={styles.textInput}
              value={deliveryInfo.phoneNumber}
              onChangeText={(value) => handleInputChange('phoneNumber', value)}
              placeholder="Nhập số điện thoại"
              placeholderTextColor={COLORS.gray400}
              keyboardType="phone-pad"
              maxLength={11}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Địa chỉ giao hàng</Text>
            <TextInput
              style={[styles.textInput, styles.textArea]}
              value={deliveryInfo.address}
              onChangeText={(value) => handleInputChange('address', value)}
              placeholder="Nhập địa chỉ giao hàng"
              placeholderTextColor={COLORS.gray400}
              multiline
              numberOfLines={3}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Ghi chú (tùy chọn)</Text>
            <TextInput
              style={[styles.textInput, styles.textArea]}
              value={deliveryInfo.note}
              onChangeText={(value) => handleInputChange('note', value)}
              placeholder="Nhập ghi chú cho đơn hàng"
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
});

export default CheckoutScreen;

