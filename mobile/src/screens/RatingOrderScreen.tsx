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
import { COLORS, SPACING, BORDER_RADIUS, SHADOWS } from '@/constants';
import { ordersService, ratingsService } from '@/services';

type RatingOrderScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'RatingOrder'>;
type RatingOrderScreenRouteProp = RouteProp<RootStackParamList, 'RatingOrder'>;

export const RatingOrderScreen: React.FC = () => {
  const navigation = useNavigation<RatingOrderScreenNavigationProp>();
  const route = useRoute<RatingOrderScreenRouteProp>();
  const { orderId } = route.params;
  
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [rating, setRating] = useState<number>(0);
  const [ratingContent, setRatingContent] = useState<string>('');

  useEffect(() => {
    fetchOrderDetail();
  }, [orderId]);

  const fetchOrderDetail = async () => {
    try {
      setLoading(true);
      const response = await ordersService.getOrderDetail(orderId);
      setOrder(response);
    } catch (error: any) {
      console.error('Error fetching order detail:', error);
      Alert.alert('Lỗi', 'Không thể tải thông tin đơn hàng');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitRating = async () => {
    try {
      if (rating < 1) {
        Alert.alert('Lỗi', 'Vui lòng chọn số sao đánh giá');
        return;
      }

      if (!order?.items) {
        Alert.alert('Lỗi', 'Không tìm thấy thông tin món ăn');
        return;
      }

      setSubmitting(true);

      // Submit rating for each item in the order
      for (const item of order.items) {
        console.log('Submitting rating for food:', item.food.id, 'order:', order.id);
        await ratingsService.createRating({
          food: item.food.id,
          order: order.id,
          rating,
          content: ratingContent.trim(),
        });
      }

      console.log('Rating submitted successfully for order:', order.id);

      Alert.alert(
        'Thành công', 
        'Cảm ơn bạn đã đánh giá!',
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
      Alert.alert('Lỗi', 'Không thể gửi đánh giá: ' + (error.message || 'Vui lòng thử lại'));
    } finally {
      setSubmitting(false);
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
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(date);
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
          <Text style={styles.headerTitle}>Đánh giá đơn hàng</Text>
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
        <Text style={styles.headerTitle}>Đánh giá đơn hàng</Text>
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
            <Text style={styles.infoLabel}>Ngày đặt:</Text>
            <Text style={styles.infoValue}>{formatDate(order.created_date)}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Tổng cộng:</Text>
            <Text style={[styles.infoValue, styles.priceText]}>{formatPrice(total)}</Text>
          </View>
          <View style={styles.statusContainer}>
            <Ionicons name="checkmark-circle" size={20} color={COLORS.success} />
            <Text style={styles.statusText}>Đã giao thành công</Text>
          </View>
        </View>

        {/* Order Items */}
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
        </View>

        {/* Rating Form */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Đánh giá của bạn</Text>
          
          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>Điểm đánh giá *</Text>
            <View style={styles.ratingContainer}>
              {[1, 2, 3, 4, 5].map((star) => (
                <TouchableOpacity
                  key={star}
                  onPress={() => setRating(star)}
                  style={styles.starButton}
                >
                  <Ionicons
                    name={star <= rating ? 'star' : 'star-outline'}
                    size={36}
                    color={star <= rating ? COLORS.warning : COLORS.gray400}
                  />
                </TouchableOpacity>
              ))}
            </View>
            {rating > 0 && (
              <Text style={styles.ratingText}>
                {rating === 1 && '⭐ Rất tệ'}
                {rating === 2 && '⭐⭐ Tệ'}
                {rating === 3 && '⭐⭐⭐ Bình thường'}
                {rating === 4 && '⭐⭐⭐⭐ Tốt'}
                {rating === 5 && '⭐⭐⭐⭐⭐ Xuất sắc'}
              </Text>
            )}
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>Nội dung đánh giá</Text>
            <TextInput
              style={[styles.formInput, styles.textArea]}
              value={ratingContent}
              onChangeText={setRatingContent}
              placeholder="Chia sẻ trải nghiệm của bạn về đơn hàng này... (tùy chọn)"
              placeholderTextColor={COLORS.textSecondary}
              multiline
              numberOfLines={4}
              maxLength={500}
            />
            <Text style={styles.characterCount}>
              {ratingContent.length}/500 ký tự
            </Text>
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
            <Text style={styles.infoLabel}>Địa chỉ:</Text>
            <Text style={styles.infoValue}>{order.ship_address}</Text>
          </View>
        </View>
      </ScrollView>

      {/* Submit Button */}
      <View style={styles.bottomContainer}>
        <TouchableOpacity
          style={[styles.submitButton, (submitting || rating < 1) && styles.disabledButton]}
          onPress={handleSubmitRating}
          disabled={submitting || rating < 1}
        >
          {submitting ? (
            <ActivityIndicator size="small" color={COLORS.white} />
          ) : (
            <Ionicons name="star" size={20} color={COLORS.white} />
          )}
          <Text style={styles.submitButtonText}>
            {submitting ? 'Đang gửi...' : 'Gửi đánh giá'}
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
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: SPACING.md,
    paddingVertical: SPACING.sm,
    backgroundColor: `${COLORS.success}10`,
    borderRadius: BORDER_RADIUS.md,
    gap: SPACING.sm,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.success,
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
  formGroup: {
    marginBottom: SPACING.lg,
  },
  formLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: SPACING.md,
  },
  ratingContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingVertical: SPACING.md,
    backgroundColor: COLORS.gray100,
    borderRadius: BORDER_RADIUS.md,
  },
  starButton: {
    padding: SPACING.xs,
  },
  ratingText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.primary,
    textAlign: 'center',
    marginTop: SPACING.sm,
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
    height: 100,
    textAlignVertical: 'top',
  },
  characterCount: {
    fontSize: 12,
    color: COLORS.textSecondary,
    textAlign: 'right',
    marginTop: SPACING.xs,
  },
  bottomContainer: {
    backgroundColor: COLORS.white,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.lg,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  submitButton: {
    backgroundColor: COLORS.warning,
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
  submitButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.white,
  },
});
