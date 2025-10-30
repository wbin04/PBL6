import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '@/types';
import { COLORS, SPACING, BORDER_RADIUS } from '@/constants';
import { ordersService } from '@/services';
import { Order } from '@/types';

type CancelDetailScreenRouteProp = RouteProp<RootStackParamList, 'CancelDetail'>;

export default function CancelDetailScreen() {
  const navigation = useNavigation();
  const route = useRoute<CancelDetailScreenRouteProp>();
  
  const { orderId } = route.params || {};
  
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchOrderDetail = async () => {
      if (!orderId) {
        setError('Không tìm thấy ID đơn hàng');
        setLoading(false);
        return;
      }

      try {
        const orderData = await ordersService.getOrderDetail(parseInt(orderId));
        console.log('Fetched order data:', JSON.stringify(orderData, null, 2));
        setOrder(orderData);
      } catch (err) {
        console.error('Error fetching order detail:', err);
        setError('Không thể tải chi tiết đơn hàng');
      } finally {
        setLoading(false);
      }
    };

    fetchOrderDetail();
  }, [orderId]);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Đang tải chi tiết đơn hàng...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !order) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={48} color={COLORS.error} />
          <Text style={styles.errorText}>{error || 'Không tìm thấy đơn hàng'}</Text>
          <TouchableOpacity 
            style={styles.retryButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.retryButtonText}>Quay lại</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.white} />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color={COLORS.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Chi tiết đơn hủy</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Cancel Status */}
        <View style={styles.statusSection}>
          <View style={styles.statusHeader}>
            <Text style={styles.cancelStatus}>Đã hủy đơn hàng</Text>
            <View style={styles.clockIcon}>
              <Ionicons name="time-outline" size={24} color={COLORS.primary} />
            </View>
          </View>
          <Text style={styles.cancelDate}>
            vào {order.cancelled_date || order.created_date}
          </Text>
          {order.cancelled_by_role && (
            <Text style={styles.cancelledByText}>
              Hủy bởi: {order.cancelled_by_role}
            </Text>
          )}
        </View>

        {/* Store and Products Info */}
        <View style={styles.productSection}>
          {order.items.map((item, index) => (
            <View key={item.id}>
              {index === 0 && (
                <View style={styles.shopHeader}>
                  <Ionicons name="storefront-outline" size={16} color={COLORS.textSecondary} />
                  <Text style={styles.shopName}>{item.food.store?.store_name || 'Cửa hàng'}</Text>
                  <Ionicons name="chevron-forward" size={16} color={COLORS.textSecondary} />
                </View>
              )}

              <View style={styles.productCard}>
                <Image 
                  source={{ uri: item.food.image_url || item.food.image }} 
                  style={styles.productImage}
                  defaultSource={require('../assets/images/placeholder-logo.png')}
                  onError={(error) => console.log('Image load error:', error.nativeEvent.error, 'URL:', item.food.image_url || item.food.image)}
                  onLoad={() => console.log('Image loaded successfully:', item.food.image_url || item.food.image)}
                />
                <View style={styles.productInfo}>
                  <Text style={styles.productName} numberOfLines={2}>
                    {item.food.title}
                  </Text>
                  {item.food_note && (
                    <Text style={styles.productDescription}>
                      Ghi chú: {item.food_note}
                    </Text>
                  )}
                  <View style={styles.priceQuantity}>
                    <Text style={styles.productPrice}>
                      ₫{Number(item.subtotal).toLocaleString('vi-VN')}
                    </Text>
                    <Text style={styles.quantity}>x{item.quantity}</Text>
                  </View>
                </View>
              </View>
              
              {index < order.items.length - 1 && (
                <View style={styles.itemSeparator} />
              )}
            </View>
          ))}
        </View>

        {/* Order Details */}
        <View style={styles.detailsSection}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Người nhận</Text>
            <Text style={styles.detailValue}>{order.receiver_name}</Text>
          </View>
          
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Số điện thoại</Text>
            <Text style={styles.detailValue}>{order.phone_number}</Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Địa chỉ giao hàng</Text>
            <Text style={[styles.detailValue, styles.addressText]} numberOfLines={2}>
              {order.ship_address}
            </Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Thời gian đặt</Text>
            <Text style={styles.detailValue}>{order.created_date}</Text>
          </View>

          {order.cancelled_date && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Thời gian hủy</Text>
              <Text style={styles.detailValue}>{order.cancelled_date}</Text>
            </View>
          )}

          {order.cancelled_by_role && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Hủy bởi</Text>
              <Text style={[styles.detailValue, styles.cancelledByValue]}>{order.cancelled_by_role}</Text>
            </View>
          )}

          {order.cancel_reason && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Lý do hủy</Text>
              <Text style={[styles.detailValue, styles.reasonText]} numberOfLines={3}>
                {order.cancel_reason}
              </Text>
            </View>
          )}

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Phương thức thanh toán</Text>
            <Text style={styles.detailValue}>
              {order.payment_method === 'cash' ? 'COD' : 
               order.payment_method === 'vnpay' ? 'VNPay' : 'Momo'}
            </Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Tổng tiền</Text>
            <Text style={[styles.detailValue, styles.totalPrice]}>
              {order.total_money}
            </Text>
          </View>
        </View>

        {/* Action Button */}
        <View style={styles.buttonSection}>
          <TouchableOpacity 
            style={styles.detailButton}
            onPress={() => {
              // Navigate back to orders
              navigation.goBack();
            }}
          >
            <Text style={styles.detailButtonText}>Chi tiết đơn hàng</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  loadingText: {
    marginTop: SPACING.md,
    fontSize: 16,
    color: COLORS.textSecondary,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    padding: SPACING.lg,
  },
  errorText: {
    fontSize: 16,
    color: COLORS.error,
    textAlign: 'center',
    marginBottom: SPACING.md,
  },
  retryButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
  },
  retryButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '500',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray200,
  },
  backButton: {
    padding: SPACING.xs,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
  },
  headerRight: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  statusSection: {
    backgroundColor: COLORS.white,
    padding: SPACING.md,
    marginBottom: SPACING.xs,
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.xs,
  },
  cancelStatus: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.primary,
  },
  clockIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.gray100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelDate: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  cancelledByText: {
    fontSize: 14,
    color: COLORS.error,
    marginTop: SPACING.xs,
    fontWeight: '500',
  },
  productSection: {
    backgroundColor: COLORS.white,
    padding: SPACING.md,
    marginBottom: SPACING.xs,
  },
  shopHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
    paddingBottom: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray200,
  },
  shopName: {
    flex: 1,
    marginLeft: SPACING.xs,
    fontSize: 14,
    color: COLORS.text,
    fontWeight: '500',
  },
  productCard: {
    flexDirection: 'row',
    marginBottom: SPACING.sm,
  },
  productImage: {
    width: 80,
    height: 80,
    borderRadius: BORDER_RADIUS.sm,
    backgroundColor: COLORS.gray100,
  },
  productInfo: {
    flex: 1,
    marginLeft: SPACING.sm,
    justifyContent: 'space-between',
  },
  productName: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.text,
    lineHeight: 18,
  },
  productDescription: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginVertical: SPACING.xs,
  },
  priceQuantity: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  productPrice: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  quantity: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  itemSeparator: {
    height: 1,
    backgroundColor: COLORS.gray200,
    marginVertical: SPACING.sm,
  },
  detailsSection: {
    backgroundColor: COLORS.white,
    padding: SPACING.md,
    marginBottom: SPACING.xs,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray100,
  },
  detailLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
    flex: 1,
  },
  detailValue: {
    fontSize: 14,
    color: COLORS.text,
    textAlign: 'right',
    flex: 2,
  },
  addressText: {
    textAlign: 'right',
    lineHeight: 18,
  },
  reasonText: {
    textAlign: 'right',
    lineHeight: 18,
  },
  cancelledByValue: {
    color: COLORS.error,
    fontWeight: '500',
  },
  totalPrice: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.primary,
  },
  buttonSection: {
    backgroundColor: COLORS.white,
    padding: SPACING.md,
    marginTop: SPACING.sm,
  },
  detailButton: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.gray300,
    borderRadius: BORDER_RADIUS.md,
    paddingVertical: SPACING.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: COLORS.text,
  },
});