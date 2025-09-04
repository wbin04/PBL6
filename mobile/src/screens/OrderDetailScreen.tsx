import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StatusBar,
  Alert,
} from 'react-native';
import { useNavigation, useRoute, RouteProp, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '@/store';
import { RootStackParamList, Order } from '@/types';
import { COLORS, SPACING, BORDER_RADIUS, SHADOWS } from '@/constants';
import { ordersService, cartService } from '@/services';

type OrderDetailScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'OrderDetail'>;
type OrderDetailScreenRouteProp = RouteProp<RootStackParamList, 'OrderDetail'>;

const OrderDetailScreen: React.FC = () => {
  const navigation = useNavigation<OrderDetailScreenNavigationProp>();
  const route = useRoute<OrderDetailScreenRouteProp>();
  const { orderId } = route.params;
  const dispatch = useDispatch<AppDispatch>();
  
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch order detail when screen mounts or comes into focus
  useFocusEffect(
    React.useCallback(() => {
      console.log('Screen focused, fetching order detail');
      fetchOrderDetail();
    }, [orderId])
  );

  const fetchOrderDetail = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('Fetching order detail for orderId:', orderId);
      const response = await ordersService.getOrderDetail(orderId);
      console.log('Order detail response:', {
        id: response.id,
        order_status: response.order_status,
        is_rated: response.is_rated
      });
      setOrder(response);
    } catch (error: any) {
      console.error('Error fetching order detail:', error);
      setError(error.message || 'Không thể tải chi tiết đơn hàng');
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (price: number | string) => {
    const numPrice = typeof price === 'string' ? parseFloat(price) : price;
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(numPrice);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(date);
  };

  const getStatusLabel = (status: string) => {
    const statusMap: Record<string, string> = {
      'pending': 'Chờ xác nhận',
      'confirmed': 'Đã xác nhận',
      'preparing': 'Đang chuẩn bị',
      'ready': 'Đang giao',
      'delivered': 'Đã giao',
      'cancelled': 'Đã hủy',
    };
    return statusMap[status] || status;
  };

  // Lấy màu theo nhãn trạng thái tiếng Việt
  const getStatusColor = (status: string) => {
    const label = getStatusLabel(status);
    switch (label) {
      case 'Chờ xác nhận':
        return COLORS.warning;
      case 'Đã xác nhận':
        return COLORS.info;
      case 'Đang chuẩn bị':
        return COLORS.secondary;
      case 'Đang giao':
        return COLORS.primary;
      case 'Đã giao':
        return COLORS.success;
      case 'Đã hủy':
        return COLORS.error;
      default:
        return COLORS.gray500;
    }
  };

  const getPaymentMethodLabel = (method: string) => {
    const methodMap: Record<string, string> = {
      'cash': 'Thanh toán khi nhận hàng',
      'vnpay': 'VNPay',
      'momo': 'MoMo',
    };
    return methodMap[method] || method;
  };

  const handleCancelOrder = () => {
    Alert.alert(
      'Xác nhận hủy đơn',
      'Bạn có chắc chắn muốn hủy đơn hàng này?',
      [
        { text: 'Không', style: 'cancel' },
        { text: 'Có', onPress: cancelOrder },
      ]
    );
  };

  const cancelOrder = async () => {
    try {
      setLoading(true);
  await ordersService.updateOrderStatus(orderId, 'Đã hủy');
      Alert.alert('Thành công', 'Đã hủy đơn hàng thành công!');
      fetchOrderDetail(); // Refresh order data
    } catch (error: any) {
      Alert.alert('Lỗi', 'Không thể hủy đơn hàng: ' + (error.message || 'Vui lòng thử lại'));
    } finally {
      setLoading(false);
    }
  };

  const handleEditOrder = () => {
    navigation.navigate('EditOrder', { orderId });
  };

  const handleReorder = () => {
    Alert.alert(
      'Đặt lại đơn hàng',
      'Bạn có muốn thêm tất cả món ăn từ đơn hàng này vào giỏ hàng?',
      [
        { text: 'Không', style: 'cancel' },
        { text: 'Có', onPress: reorderItems },
      ]
    );
  };

  const reorderItems = async () => {
    try {
      if (!order?.items) {
        Alert.alert('Lỗi', 'Không tìm thấy thông tin món ăn');
        return;
      }

      setLoading(true);
      
      // Add each item to cart
      for (const item of order.items) {
        await cartService.addToCart({
          food_id: item.food.id,
          quantity: item.quantity,
        });
      }
      
      Alert.alert('Thành công', 'Đã thêm tất cả món ăn vào giỏ hàng!', [
        {
          text: 'Xem giỏ hàng',
          onPress: () => navigation.reset({
            index: 0,
            routes: [
              { name: 'MainTabs', params: { screen: 'Cart' } }
            ]
          }),
        }
      ]);
    } catch (error: any) {
      Alert.alert('Lỗi', 'Không thể thêm món ăn vào giỏ hàng: ' + (error.message || 'Vui lòng thử lại'));
    } finally {
      setLoading(false);
    }
  };

  const handleRating = () => {
    navigation.navigate('RatingOrder', { orderId });
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
          <Text style={styles.headerTitle}>Chi tiết đơn hàng</Text>
        </View>
        <View style={styles.loader}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      </View>
    );
  }

  if (error || !order) {
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
          <Text style={styles.headerTitle}>Chi tiết đơn hàng</Text>
        </View>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={80} color={COLORS.error} />
          <Text style={styles.errorTitle}>Có lỗi xảy ra</Text>
          <Text style={styles.errorSubtitle}>{error}</Text>
          <TouchableOpacity 
            style={styles.retryButton}
            onPress={fetchOrderDetail}
          >
            <Text style={styles.retryText}>Thử lại</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const subtotal = order.items.reduce((sum, item) => sum + item.subtotal, 0);
  const shippingFee = 15000; // Fixed shipping fee
  // Tổng cộng bao gồm phí giao hàng
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
        <Text style={styles.headerTitle}>Chi tiết đơn hàng</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Order Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Thông tin đơn hàng</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Mã đơn:</Text>
            <Text style={styles.infoValue}>#{order.id}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Ngày tạo:</Text>
            <Text style={styles.infoValue}>{formatDate(order.created_date)}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Tổng cộng:</Text>
            <Text style={[styles.infoValue, styles.priceText]}>{formatPrice(total)}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Phương thức TT:</Text>
            <Text style={styles.infoValue}>{getPaymentMethodLabel(order.payment_method)}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Trạng thái:</Text>
            <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor(order.order_status)}20` }]}>
              <Text style={[styles.statusText, { color: getStatusColor(order.order_status) }]}> 
                {getStatusLabel(order.order_status)}
              </Text>
            </View>
          </View>
        </View>

        {/* Customer Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Thông tin khách hàng</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Tên:</Text>
            <Text style={styles.infoValue}>{order.user?.fullname || order.receiver_name}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Email:</Text>
            <Text style={styles.infoValue}>{order.user?.email || 'Không có'}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>SĐT:</Text>
            <Text style={styles.infoValue}>{order.phone_number}</Text>
          </View>
        </View>

        {/* Delivery Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Thông tin giao hàng</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Người nhận:</Text>
            <Text style={styles.infoValue}>{order.receiver_name}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>SĐT:</Text>
            <Text style={styles.infoValue}>{order.phone_number}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Địa chỉ:</Text>
            <Text style={styles.infoValue}>{order.ship_address}</Text>
          </View>
          {order.note && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Ghi chú:</Text>
              <Text style={styles.infoValue}>{order.note}</Text>
            </View>
          )}
        </View>


        {/* Order Items */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Chi tiết món ăn</Text>
          
          {/* Table Header */}
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderText, styles.itemNameColumn]}>Món ăn</Text>
            <Text style={[styles.tableHeaderText, styles.quantityColumn]}>Số lượng</Text>
            <Text style={[styles.tableHeaderText, styles.priceColumn]}>Giá</Text>
            <Text style={[styles.tableHeaderText, styles.totalColumn]}>Thành tiền</Text>
          </View>

          {/* Table Rows */}
          {order.items.map((item, index) => (
            <TouchableOpacity
              key={item.id}
              style={[styles.tableRow, index % 2 === 0 && styles.evenRow]}
              activeOpacity={0.7}
              onPress={() => navigation.navigate('FoodDetail', { foodId: item.food.id })}
            >
              <Text style={[styles.tableRowText, styles.itemNameColumn]} numberOfLines={2}>
                {item.food.title}
              </Text>
              <Text style={[styles.tableRowText, styles.quantityColumn, styles.centerText]}>
                {item.quantity}
              </Text>
              <Text style={[styles.tableRowText, styles.priceColumn, styles.rightText]}>
                {formatPrice(item.food.price)}
              </Text>
              <Text style={[styles.tableRowText, styles.totalColumn, styles.rightText]}>
                {formatPrice(item.subtotal)}
              </Text>
            </TouchableOpacity>
          ))}

          {/* Order Summary */}
          <View style={styles.summaryContainer}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Tạm tính:</Text>
              <Text style={styles.summaryValue}>{formatPrice(subtotal)}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Phí giao hàng:</Text>
              <Text style={styles.summaryValue}>{formatPrice(shippingFee)}</Text>
            </View>
            <View style={[styles.summaryRow, styles.totalRow]}>
              <Text style={styles.totalLabel}>Tổng cộng:</Text>
              <Text style={styles.totalValue}>{formatPrice(total)}</Text>
            </View>
          </View>
        </View>

        {/* Action Buttons */}
        {order && (
          <View style={styles.actionButtons}>
            {order.order_status === 'Chờ xác nhận' && (
              <>
                <TouchableOpacity style={[styles.actionButton, styles.editButton]} onPress={handleEditOrder}>
                  <Ionicons name="create-outline" size={20} color={COLORS.white} />
                  <Text style={styles.actionButtonText}>Cập nhật thông tin</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.actionButton, styles.cancelButton]} onPress={handleCancelOrder}>
                  <Ionicons name="close-circle-outline" size={20} color={COLORS.white} />
                  <Text style={styles.actionButtonText}>Hủy đơn</Text>
                </TouchableOpacity>
              </>
            )}
            {order.order_status === 'Đã giao' && (
              <>
                <TouchableOpacity style={[styles.actionButton, styles.reorderButton]} onPress={handleReorder}>
                  <Ionicons name="refresh-outline" size={20} color={COLORS.white} />
                  <Text style={styles.actionButtonText}>Đặt lại</Text>
                </TouchableOpacity>
                {!order.is_rated && (
                  <TouchableOpacity style={[styles.actionButton, styles.ratingButton]} onPress={handleRating}>
                    <Ionicons name="star-outline" size={20} color={COLORS.white} />
                    <Text style={styles.actionButtonText}>Đánh giá</Text>
                  </TouchableOpacity>
                )}
                {order.is_rated && (
                  <View style={[styles.actionButton, styles.ratedButton]}>
                    <Ionicons name="checkmark-circle-outline" size={20} color={COLORS.white} />
                    <Text style={styles.actionButtonText}>Đã đánh giá</Text>
                  </View>
                )}
              </>
            )}
          </View>
        )}
      </ScrollView>
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text,
    marginTop: SPACING.lg,
    marginBottom: SPACING.sm,
  },
  errorSubtitle: {
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: SPACING.xl,
  },
  retryButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    ...SHADOWS.sm,
  },
  retryText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: 'bold',
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
    alignItems: 'flex-start',
    marginBottom: SPACING.sm,
  },
  infoLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
    flex: 1,
  },
  infoValue: {
    fontSize: 14,
    color: COLORS.text,
    fontWeight: '600',
    flex: 2,
    textAlign: 'right',
  },
  priceText: {
    color: COLORS.primary,
    fontWeight: 'bold',
  },
  statusBadge: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    alignSelf: 'flex-start',
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: COLORS.gray100,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.xs,
    borderRadius: BORDER_RADIUS.sm,
    marginBottom: SPACING.xs,
  },
  tableHeaderText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: COLORS.text,
    textAlign: 'center',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.xs,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
  },
  evenRow: {
    backgroundColor: COLORS.gray100,
  },
  tableRowText: {
    fontSize: 12,
    color: COLORS.text,
  },
  itemNameColumn: {
    flex: 3,
  },
  quantityColumn: {
    flex: 1,
  },
  priceColumn: {
    flex: 1.5,
  },
  totalColumn: {
    flex: 1.5,
  },
  centerText: {
    textAlign: 'center',
  },
  rightText: {
    textAlign: 'right',
  },
  summaryContainer: {
    marginTop: SPACING.md,
    paddingTop: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.divider,
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
  // Action Buttons
  actionButtons: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
    ...SHADOWS.sm,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    borderRadius: BORDER_RADIUS.md,
    marginBottom: SPACING.sm,
    gap: SPACING.sm,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.white,
  },
  editButton: {
    backgroundColor: COLORS.info,
  },
  cancelButton: {
    backgroundColor: COLORS.error,
  },
  reorderButton: {
    backgroundColor: COLORS.success,
  },
  ratingButton: {
    backgroundColor: COLORS.warning,
  },
  ratedButton: {
    backgroundColor: COLORS.gray500,
  },
});

export default OrderDetailScreen;

