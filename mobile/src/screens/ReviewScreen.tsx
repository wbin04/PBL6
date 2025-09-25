import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, Image, TextInput, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRoute, useNavigation, RouteProp } from "@react-navigation/native";
import { RootStackParamList } from "@/types";
import { ordersService, ratingService } from "@/services";
import { Order, OrderItem } from "@/types";

type ReviewScreenRouteProp = RouteProp<RootStackParamList, 'Review'>;

export default function ReviewScreen() {
  const route = useRoute<ReviewScreenRouteProp>();
  const navigation = useNavigation();

  // Lấy thông tin từ route params
  const { orderId } = route.params || { orderId: 1 };

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");

  // Load order details
  useEffect(() => {
    loadOrderDetails();
  }, [orderId]);

  const loadOrderDetails = async () => {
    try {
      setLoading(true);
      const orderData = await ordersService.getOrderDetail(orderId);
      setOrder(orderData);
    } catch (error) {
      console.error('Error loading order details:', error);
      Alert.alert('Lỗi', 'Không thể tải thông tin đơn hàng. Vui lòng thử lại sau.');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    navigation.goBack();
  };

  const handleSubmit = async () => {
    if (rating === 0) {
      Alert.alert('Thông báo', 'Vui lòng chọn số sao đánh giá');
      return;
    }

    if (!order) {
      Alert.alert('Lỗi', 'Không có thông tin đơn hàng');
      return;
    }

    try {
      setSubmitting(true);

      // Tạo rating cho từng món ăn trong đơn hàng
      const ratingPromises = order.items.map(item =>
        ratingService.createRating({
          food: item.food.id,
          order: order.id,
          rating: rating,
          content: comment.trim() || "",
        })
      );

      await Promise.all(ratingPromises);

      Alert.alert(
        'Thành công',
        'Cảm ơn bạn đã đánh giá!',
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack()
          }
        ]
      );
    } catch (error) {
      console.error('Error submitting ratings:', error);
      Alert.alert('Lỗi', 'Không thể gửi đánh giá. Vui lòng thử lại sau.');
    } finally {
      setSubmitting(false);
    }
  };

  // Helper function to get image URL
  const getImageUrl = (imagePath: string) => {
    if (!imagePath) return null;

    // If it's already a complete URL, return it
    if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
      return imagePath;
    }

    // Use hardcoded IP for mobile app
    const hardcodedHost = '192.168.4.51';
    const port = 8000;

    // If it starts with '/media', it's already a correct relative path
    if (imagePath.startsWith('/media')) {
      return `http://${hardcodedHost}:${port}${imagePath}`;
    }

    // If it starts with 'assets/' or other path, convert to full path
    if (imagePath.startsWith('assets/')) {
      return `http://${hardcodedHost}:${port}/media/${imagePath}`;
    }

    // Default case, assume it's a relative path
    return `http://${hardcodedHost}:${port}/media/${imagePath}`;
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#E95322" />
        <Text style={styles.loadingText}>Đang tải thông tin đơn hàng...</Text>
      </View>
    );
  }

  if (!order) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={48} color="#E95322" />
        <Text style={styles.errorText}>Không thể tải thông tin đơn hàng</Text>
        <TouchableOpacity style={styles.retryButton} onPress={loadOrderDetails}>
          <Text style={styles.retryButtonText}>Thử lại</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleCancel} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {order.is_rated ? 'Xem đánh giá' : 'Đánh giá đơn hàng'}
        </Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Order Info */}
        <View style={styles.orderInfo}>
          <Text style={styles.orderTitle}>Đơn hàng #{order.id}</Text>
          <Text style={styles.orderDate}>
            {new Date(order.created_date).toLocaleDateString('vi-VN')} - {new Date(order.created_date).toLocaleTimeString('vi-VN')}
          </Text>
        </View>

        {/* Food Items List */}
        <View style={styles.foodList}>
          <Text style={styles.sectionTitle}>Các món đã đặt:</Text>
          {order.items.map((item, index) => (
            <View key={index} style={styles.foodItem}>
              <Image
                source={item.food.image ? { uri: getImageUrl(item.food.image) } : require('@/assets/images/placeholder-logo.png')}
                style={styles.foodImage}
                resizeMode="cover"
              />
              <View style={styles.foodInfo}>
                <Text style={styles.foodName} numberOfLines={2}>
                  {item.food.title}
                </Text>
                <Text style={styles.foodQuantity}>x{item.quantity}</Text>
                <Text style={styles.foodUnitPrice}>
                  {parseInt(item.food.price || '0').toLocaleString()}đ × {item.quantity}
                </Text>
              </View>
              <Text style={styles.foodPrice}>
                {item.subtotal > 0 ? item.subtotal.toLocaleString() : (parseInt(item.food.price || '0') * item.quantity).toLocaleString()}đ
              </Text>
            </View>
          ))}
        </View>

        {/* Rating Section */}
        {order.is_rated ? (
          <View style={styles.alreadyRatedSection}>
            <Ionicons name="checkmark-circle" size={48} color="#4CAF50" />
            <Text style={styles.alreadyRatedTitle}>Đã đánh giá</Text>
            <Text style={styles.alreadyRatedDesc}>
              Cảm ơn bạn đã đánh giá đơn hàng này!
            </Text>
          </View>
        ) : (
          <View style={styles.ratingSection}>
            <Text style={styles.sectionTitle}>Đánh giá của bạn</Text>
            <Text style={styles.ratingDesc}>Hãy cho chúng tôi biết bạn nghĩ gì về các món ăn này</Text>

            {/* Star Rating */}
            <View style={styles.starsRow}>
              {[1,2,3,4,5].map((star) => (
                <TouchableOpacity
                  key={star}
                  onPress={() => setRating(star)}
                  style={styles.starButton}
                >
                  <Ionicons
                    name={star <= rating ? "star" : "star-outline"}
                    size={36}
                    color="#E95322"
                  />
                </TouchableOpacity>
              ))}
            </View>

            {/* Comment Input */}
            <Text style={styles.commentLabel}>Để lại bình luận (không bắt buộc)</Text>
            <TextInput
              style={styles.textInput}
              placeholder="Viết đánh giá của bạn..."
              placeholderTextColor="#B8A97F"
              value={comment}
              onChangeText={setComment}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>
        )}

        {/* Submit Button - Only show if not rated */}
        {!order.is_rated && (
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.cancelBtn, submitting && styles.disabledButton]}
              onPress={handleCancel}
              disabled={submitting}
            >
              <Text style={styles.cancelText}>Hủy</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.submitBtn, submitting && styles.disabledButton]}
              onPress={handleSubmit}
              disabled={submitting || rating === 0}
            >
              {submitting ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.submitText}>Gửi đánh giá</Text>
              )}
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFE082" },
  loadingContainer: {
    flex: 1,
    backgroundColor: "#FFE082",
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#E95322',
    marginTop: 12,
  },
  errorContainer: {
    flex: 1,
    backgroundColor: "#FFE082",
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#E95322',
    textAlign: 'center',
    marginTop: 12,
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: '#E95322',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
  },
  retryButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingTop: 50,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  placeholder: {
    width: 40,
  },
  content: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    marginTop: 24,
    flex: 1,
    padding: 24,
  },
  orderInfo: {
    marginBottom: 24,
  },
  orderTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#3B1F0A",
    marginBottom: 4,
  },
  orderDate: {
    fontSize: 14,
    color: "#666",
  },
  foodList: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: "#3B1F0A",
    marginBottom: 16,
  },
  foodItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    padding: 12,
    backgroundColor: '#FFF7D6',
    borderRadius: 12,
  },
  foodImage: {
    width: 50,
    height: 50,
    borderRadius: 8,
    marginRight: 12,
  },
  foodInfo: {
    flex: 1,
  },
  foodName: {
    fontSize: 14,
    fontWeight: '600',
    color: "#3B1F0A",
    marginBottom: 4,
  },
  foodQuantity: {
    fontSize: 12,
    color: "#666",
  },
  foodUnitPrice: {
    fontSize: 12,
    color: "#666",
    marginTop: 2,
  },
  foodPrice: {
    fontSize: 14,
    fontWeight: '600',
    color: "#E95322",
  },
  ratingSection: {
    marginBottom: 24,
  },
  ratingDesc: {
    fontSize: 14,
    color: "#666",
    marginBottom: 20,
    textAlign: 'center',
  },
  starsRow: {
    flexDirection: "row",
    justifyContent: "center",
    marginBottom: 20,
  },
  starButton: {
    padding: 4,
  },
  commentLabel: {
    fontSize: 15,
    color: "#3B1F0A",
    fontWeight: "500",
    marginBottom: 12,
  },
  textInput: {
    backgroundColor: "#FFF7D6",
    borderRadius: 16,
    padding: 12,
    fontSize: 15,
    color: "#3B1F0A",
    minHeight: 80,
    textAlignVertical: 'top',
  },
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
    marginBottom: 32,
  },
  cancelBtn: {
    backgroundColor: "#FFE3D6",
    borderRadius: 20,
    paddingVertical: 12,
    paddingHorizontal: 32,
    marginRight: 8,
    flex: 1,
    alignItems: 'center',
  },
  cancelText: {
    color: "#E95322",
    fontWeight: "bold",
    fontSize: 16,
  },
  submitBtn: {
    backgroundColor: "#E95322",
    borderRadius: 20,
    paddingVertical: 12,
    paddingHorizontal: 32,
    flex: 1,
    alignItems: 'center',
  },
  submitText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
  disabledButton: {
    opacity: 0.6,
  },
  alreadyRatedSection: {
    alignItems: 'center',
    paddingVertical: 40,
    marginBottom: 24,
  },
  alreadyRatedTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginTop: 16,
    marginBottom: 8,
  },
  alreadyRatedDesc: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
  },
});