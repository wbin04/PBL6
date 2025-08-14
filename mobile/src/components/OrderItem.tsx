import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, BORDER_RADIUS, SHADOWS } from '@/constants';
import { Order } from '@/types';

interface OrderItemProps {
  order: Order;
  onPress: (orderId: number) => void;
  formatPrice: (price: number) => string;
}

const OrderItem: React.FC<OrderItemProps> = ({
  order,
  onPress,
  formatPrice,
}) => {
  const getStatusColor = (status: string) => {
    switch (status) {
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

  const getStatusText = (status: string) => {
    // Return the status as-is since it's already in Vietnamese
    return status;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Tính subtotal và tổng gồm phí giao hàng
  const subtotal = order.items.reduce((sum, item) => sum + item.subtotal, 0);
  const shippingFee = 15000;
  const total = subtotal + shippingFee;
  return (
    <TouchableOpacity
      style={styles.orderCard}
      onPress={() => onPress(order.id)}
      activeOpacity={0.8}
    >
      <View style={styles.orderHeader}>
        <View style={styles.orderInfo}>
          <Text style={styles.orderId}>Đơn hàng #{order.id}</Text>
          <Text style={styles.orderDate}>{formatDate(order.created_date)}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(order.order_status) }]}>
          <Text style={styles.statusText}>{getStatusText(order.order_status)}</Text>
        </View>
      </View>

        <View style={styles.orderDetails}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Tổng số món:</Text>
            <Text style={styles.detailValue}>{order.items.length}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Tổng cộng:</Text>
            <Text style={styles.totalAmount}>{formatPrice(total)}</Text>
          </View>
        </View>

      <View style={styles.orderFooter}>
        <TouchableOpacity
          style={styles.viewDetailButton}
          onPress={() => onPress(order.id)}
          activeOpacity={0.8}
        >
          <Text style={styles.viewDetailText}>Xem chi tiết</Text>
          <Ionicons name="chevron-forward" size={16} color={COLORS.primary} />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  orderCard: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.lg,
    marginVertical: SPACING.xs,
    padding: SPACING.md,
    ...SHADOWS.sm,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.md,
  },
  orderInfo: {
    flex: 1,
  },
  orderId: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  orderDate: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  statusBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.sm,
  },
  statusText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: '600',
  },
  orderDetails: {
    marginBottom: SPACING.md,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  detailLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  detailValue: {
    fontSize: 14,
    color: COLORS.text,
    fontWeight: '600',
  },
  totalAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  orderFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    borderTopWidth: 1,
    borderTopColor: COLORS.divider,
    paddingTop: SPACING.sm,
  },
  viewDetailButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  viewDetailText: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: '600',
    marginRight: SPACING.xs,
  },
});

export default OrderItem;
