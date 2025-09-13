import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '@/types';
import { COLORS, SPACING, BORDER_RADIUS } from '@/constants';

type CancelDetailScreenRouteProp = RouteProp<RootStackParamList, 'CancelDetail'>;

export default function CancelDetailScreen() {
  const navigation = useNavigation();
  const route = useRoute<CancelDetailScreenRouteProp>();
  
  // Lấy thông tin thực từ route params
  const { 
    orderId = '1', 
    shopName = 'Dung Chu Chumia Make Up',
    productName = 'Phấn Phủ MC color Air Fit 35g Hạt Phấn Mịn...',
    productPrice = '₫207,000',
    productImage 
  } = route.params || {};

  // Sử dụng dữ liệu thực từ params
  const orderDetail = {
    id: orderId,
    status: 'Đã hủy đơn hàng',
    cancelDate: '14-09-2025 01:21',
    shop: shopName,
    product: {
      name: productName,
      description: 'tone L2 nude có nhuộ',
      price: productPrice,
      image: productImage || require('../assets/images/placeholder-logo.png')
    },
    customerRequest: 'Yêu cầu bởi',
    buyer: 'Người mua',
    requestDate: '14-09-2025 01:21',
    reason: 'Muốn thay đổi sản phẩm trong đơn hàng (size, màu sắc, số lượng,...)',
    paymentMethod: 'COD'
  };

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
            <Text style={styles.cancelStatus}>{orderDetail.status}</Text>
            <View style={styles.clockIcon}>
              <Ionicons name="time-outline" size={24} color={COLORS.primary} />
            </View>
          </View>
          <Text style={styles.cancelDate}>vào {orderDetail.cancelDate}</Text>
        </View>

        {/* Shop and Product Info */}
        <View style={styles.productSection}>
          <View style={styles.shopHeader}>
            <Ionicons name="storefront-outline" size={16} color={COLORS.textSecondary} />
            <Text style={styles.shopName}>{orderDetail.shop}</Text>
            <Ionicons name="chevron-forward" size={16} color={COLORS.textSecondary} />
          </View>

          <View style={styles.productCard}>
            <Image source={orderDetail.product.image} style={styles.productImage} />
            <View style={styles.productInfo}>
              <Text style={styles.productName} numberOfLines={2}>
                {orderDetail.product.name}
              </Text>
              <Text style={styles.productDescription}>
                {orderDetail.product.description}
              </Text>
              <Text style={styles.productPrice}>
                {typeof orderDetail.product.price === 'string' 
                  ? orderDetail.product.price 
                  : `₫${(orderDetail.product.price as number).toLocaleString()}`}
              </Text>
            </View>
          </View>
        </View>

        {/* Order Details */}
        <View style={styles.detailsSection}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Yêu cầu bởi</Text>
            <Text style={styles.detailValue}>{orderDetail.buyer}</Text>
          </View>
          
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Yêu cầu vào</Text>
            <Text style={styles.detailValue}>{orderDetail.requestDate}</Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Lý do</Text>
            <Text style={[styles.detailValue, styles.reasonText]} numberOfLines={3}>
              {orderDetail.reason}
            </Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Phương thức thanh toán</Text>
            <Text style={styles.detailValue}>{orderDetail.paymentMethod}</Text>
          </View>
        </View>

        {/* Action Button */}
        <View style={styles.buttonSection}>
          <TouchableOpacity 
            style={styles.detailButton}
            onPress={() => {
              // TODO: Navigate to full order details or reorder
              console.log('Chi tiết đơn hàng pressed');
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
  productPrice: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
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
  reasonText: {
    textAlign: 'right',
    lineHeight: 18,
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