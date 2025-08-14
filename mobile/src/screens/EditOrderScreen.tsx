import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  StatusBar,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { RootStackParamList, Order } from '@/types';
import { COLORS, SPACING, BORDER_RADIUS, SHADOWS, ENDPOINTS } from '@/constants';
import { ordersService } from '@/services';
import { apiClient } from '@/services/api';

type EditOrderScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'EditOrder'>;
type EditOrderScreenRouteProp = RouteProp<RootStackParamList, 'EditOrder'>;

export const EditOrderScreen: React.FC = () => {
  const navigation = useNavigation<EditOrderScreenNavigationProp>();
  const route = useRoute<EditOrderScreenRouteProp>();
  const { orderId } = route.params;
  
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [editForm, setEditForm] = useState({
    receiver_name: '',
    phone_number: '',
    ship_address: '',
    note: '',
  });

  useEffect(() => {
    fetchOrderDetail();
  }, [orderId]);

  const fetchOrderDetail = async () => {
    try {
      setLoading(true);
      const response = await ordersService.getOrderDetail(orderId);
      setOrder(response);
      // Initialize edit form with current order data
      setEditForm({
        receiver_name: response.receiver_name || '',
        phone_number: response.phone_number || '',
        ship_address: response.ship_address || '',
        note: response.note || '',
      });
    } catch (error: any) {
      console.error('Error fetching order detail:', error);
      Alert.alert('Lỗi', 'Không thể tải thông tin đơn hàng');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      if (!editForm.receiver_name.trim() || !editForm.phone_number.trim() || !editForm.ship_address.trim()) {
        Alert.alert('Lỗi', 'Vui lòng điền đầy đủ thông tin bắt buộc');
        return;
      }

      setSaving(true);
      // Use apiClient to update order
      console.log('Updating order with data:', editForm);
      await apiClient.put(ENDPOINTS.ORDER_DETAIL(orderId), editForm);
      console.log('Order updated successfully for orderId:', orderId);
      
      Alert.alert(
        'Thành công', 
        'Cập nhật thông tin đơn hàng thành công!',
        [
          {
            text: 'OK',
            onPress: () => {
              // Navigate back and refresh the order detail
              navigation.goBack();
            }
          }
        ]
      );
    } catch (error: any) {
      Alert.alert('Lỗi', 'Không thể cập nhật đơn hàng: ' + (error.message || 'Vui lòng thử lại'));
    } finally {
      setSaving(false);
    }
  };

  const formatPrice = (price: number | string) => {
    const numPrice = typeof price === 'string' ? parseFloat(price) : price;
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(numPrice);
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color={COLORS.white} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Cập nhật đơn hàng</Text>
        </View>
        <View style={styles.loader}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      </View>
    );
  }

  if (!order) {
    return null;
  }

  const subtotal = order.items.reduce((sum, item) => sum + item.subtotal, 0);
  const shippingFee = 15000;
  const total = subtotal + shippingFee;

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
        <Text style={styles.headerTitle}>Cập nhật đơn hàng</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Order Summary */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Thông tin đơn hàng</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Mã đơn:</Text>
            <Text style={styles.infoValue}>#{order.id}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Tổng cộng:</Text>
            <Text style={[styles.infoValue, styles.priceText]}>{formatPrice(total)}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Số món:</Text>
            <Text style={styles.infoValue}>{order.items.length} món</Text>
          </View>
        </View>

        {/* Edit Form */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Thông tin giao hàng</Text>
          
          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>Tên người nhận *</Text>
            <TextInput
              style={styles.formInput}
              value={editForm.receiver_name}
              onChangeText={(text) => setEditForm({ ...editForm, receiver_name: text })}
              placeholder="Nhập tên người nhận"
              placeholderTextColor={COLORS.textSecondary}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>Số điện thoại *</Text>
            <TextInput
              style={styles.formInput}
              value={editForm.phone_number}
              onChangeText={(text) => setEditForm({ ...editForm, phone_number: text })}
              placeholder="Nhập số điện thoại"
              placeholderTextColor={COLORS.textSecondary}
              keyboardType="phone-pad"
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>Địa chỉ giao hàng *</Text>
            <TextInput
              style={[styles.formInput, styles.textArea]}
              value={editForm.ship_address}
              onChangeText={(text) => setEditForm({ ...editForm, ship_address: text })}
              placeholder="Nhập địa chỉ giao hàng"
              placeholderTextColor={COLORS.textSecondary}
              multiline
              numberOfLines={3}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>Ghi chú</Text>
            <TextInput
              style={[styles.formInput, styles.textArea]}
              value={editForm.note}
              onChangeText={(text) => setEditForm({ ...editForm, note: text })}
              placeholder="Nhập ghi chú (tùy chọn)"
              placeholderTextColor={COLORS.textSecondary}
              multiline
              numberOfLines={2}
            />
          </View>
        </View>

        {/* Order Items Preview */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Món ăn đã đặt</Text>
          {order.items.map((item, index) => (
            <View key={item.id} style={styles.itemRow}>
              <View style={styles.itemInfo}>
                <Text style={styles.itemName} numberOfLines={2}>
                  {item.food.title}
                </Text>
                <Text style={styles.itemPrice}>
                  {formatPrice(item.food.price)} x {item.quantity}
                </Text>
              </View>
              <Text style={styles.itemTotal}>
                {formatPrice(item.subtotal)}
              </Text>
            </View>
          ))}
          
          <View style={styles.totalContainer}>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Tổng cộng:</Text>
              <Text style={styles.totalValue}>{formatPrice(total)}</Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Save Button */}
      <View style={styles.bottomContainer}>
        <TouchableOpacity
          style={[styles.saveButton, saving && styles.disabledButton]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator size="small" color={COLORS.white} />
          ) : (
            <Ionicons name="checkmark-circle-outline" size={20} color={COLORS.white} />
          )}
          <Text style={styles.saveButtonText}>
            {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
          </Text>
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
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.white,
  },
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  infoLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  infoValue: {
    fontSize: 14,
    color: COLORS.text,
    fontWeight: '600',
  },
  priceText: {
    color: COLORS.primary,
    fontWeight: 'bold',
  },
  formGroup: {
    marginBottom: SPACING.lg,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  formInput: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    fontSize: 16,
    color: COLORS.text,
    backgroundColor: COLORS.white,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
  },
  itemInfo: {
    flex: 1,
    marginRight: SPACING.md,
  },
  itemName: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  itemPrice: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  itemTotal: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  totalContainer: {
    marginTop: SPACING.md,
    paddingTop: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.divider,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
    paddingVertical: SPACING.lg,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  saveButton: {
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    gap: SPACING.sm,
    ...SHADOWS.sm,
  },
  disabledButton: {
    backgroundColor: COLORS.gray300,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.white,
  },
});
