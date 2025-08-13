import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  Alert,
} from 'react-native';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '@/store';
import { addToCart } from '@/store/slices/cartSlice';
import { menuService, cartService } from '@/services';
import { FoodDetail, RootStackParamList } from '@/types';
import { COLORS, SPACING, BORDER_RADIUS, SHADOWS, API_CONFIG } from '@/constants';

type FoodDetailRouteProp = RouteProp<RootStackParamList, 'FoodDetail'>;
type FoodDetailNavigationProp = NativeStackNavigationProp<RootStackParamList, 'FoodDetail'>;

const FoodDetailScreen: React.FC = () => {
  const route = useRoute<FoodDetailRouteProp>();
  const navigation = useNavigation<FoodDetailNavigationProp>();
  const dispatch = useDispatch<AppDispatch>();
  const { user } = useSelector((state: RootState) => state.auth);

  const [foodDetail, setFoodDetail] = useState<FoodDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [addingToCart, setAddingToCart] = useState(false);

  useEffect(() => {
    loadFoodDetail();
  }, [route.params.foodId]);

  const loadFoodDetail = async () => {
    try {
      setLoading(true);
      const data = await menuService.getFoodDetail(route.params.foodId);
      setFoodDetail(data);
    } catch (error) {
      console.error('Error loading food detail:', error);
      Alert.alert('Lỗi', 'Không thể tải thông tin món ăn');
    } finally {
      setLoading(false);
    }
  };

  const handleQuantityChange = (delta: number) => {
    const newQuantity = quantity + delta;
    if (newQuantity >= 1 && newQuantity <= 99) {
      setQuantity(newQuantity);
    }
  };

  const handleAddToCart = async () => {
    if (!foodDetail || !user) {
      Alert.alert('Thông báo', 'Bạn cần đăng nhập để thêm món vào giỏ hàng');
      return;
    }

    if (!foodDetail.availability) {
      Alert.alert('Thông báo', 'Món ăn này hiện đang hết hàng');
      return;
    }

    try {
      setAddingToCart(true);
      const result = await dispatch(addToCart({ 
        food_id: foodDetail.id, 
        quantity 
      }));
      
      if (addToCart.fulfilled.match(result)) {
        Alert.alert(
          'Thành công',
          `Đã thêm ${quantity} ${foodDetail.title} vào giỏ hàng`,
          [
            { text: 'OK', onPress: () => navigation.goBack() }
          ]
        );
        setQuantity(1);
      } else {
        Alert.alert('Lỗi', 'Không thể thêm món vào giỏ hàng');
      }
    } catch (error) {
      console.error('Error adding to cart:', error);
      Alert.alert('Lỗi', 'Không thể thêm món vào giỏ hàng');
    } finally {
      setAddingToCart(false);
    }
  };

  const handleViewReviews = () => {
    if (!foodDetail) return;
    navigation.navigate('RatingScreen', { foodId: foodDetail.id });
  };

  const formatPrice = (price: string) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(parseInt(price));
  };

  const getImageUri = (imageUrl: string) => {
    return imageUrl.startsWith('http')
      ? imageUrl
      : `${API_CONFIG.BASE_URL.replace(/\/api$/, '')}/media/${imageUrl}`;
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.loader}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      </View>
    );
  }

  if (!foodDetail) {
    return (
      <View style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Không tìm thấy thông tin món ăn</Text>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Text style={styles.backButtonText}>Quay lại</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backIcon} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Chi tiết món ăn</Text>
        <TouchableOpacity style={styles.favoriteIcon}>
          <Ionicons name="heart-outline" size={24} color={COLORS.white} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Food Image */}
        <View style={styles.imageContainer}>
          <Image
            source={{ uri: getImageUri(foodDetail.image) }}
            style={styles.foodImage}
            resizeMode="cover"
          />
          {foodDetail.availability=="Hết hàng" && (
            <View style={styles.unavailableOverlay}>
              <Text style={styles.unavailableText}>Tạm hết hàng</Text>
            </View>
          )}
        </View>

        {/* Food Info */}
        <View style={styles.infoContainer}>
          <View style={styles.titleSection}>
            <Text style={styles.foodTitle}>{foodDetail.title}</Text>
            <View style={styles.availabilityContainer}>
              <View style={[
                styles.availabilityBadge,
                { backgroundColor: foodDetail.availability=="Còn hàng" ? COLORS.success : COLORS.error }
              ]}>
                <Text style={styles.availabilityText}>
                  {foodDetail.availability}
                </Text>
              </View>
            </View>
          </View>

          <Text style={styles.foodPrice}>{formatPrice(foodDetail.price)}</Text>

          {/* Rating */}
          {foodDetail.rating_count && foodDetail.rating_count > 0 ? (
            <View style={styles.ratingContainer}>
              <View style={styles.ratingInfo}>
                <Ionicons name="star" size={20} color="#FFD700" />
                <Text style={styles.ratingText}>
                  {foodDetail.average_rating?.toFixed(1)}
                </Text>
                <Text style={styles.ratingCount}>
                  ({foodDetail.rating_count} đánh giá)
                </Text>
              </View>
              <TouchableOpacity style={styles.viewReviewsButton} onPress={handleViewReviews}>
                <Text style={styles.viewReviewsText}>Xem đánh giá</Text>
                <Ionicons name="chevron-forward" size={16} color={COLORS.primary} />
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.noReviewsContainer}>
              <Text style={styles.noReviewsText}>Chưa có đánh giá nào</Text>
            </View>
          )}

          {/* Category */}
          <View style={styles.categoryContainer}>
            <Text style={styles.categoryLabel}>Danh mục:</Text>
            <Text style={styles.categoryText}>{foodDetail.category.cate_name}</Text>
          </View>

          {/* Description */}
          <View style={styles.descriptionContainer}>
            <Text style={styles.descriptionLabel}>Mô tả:</Text>
            <Text style={styles.descriptionText}>{foodDetail.description}</Text>
          </View>
        </View>
      </ScrollView>

      {/* Bottom Section */}
      <View style={styles.bottomContainer}>
        {foodDetail.availability=="Còn hàng" ? (
          <>
            {/* Quantity Selector */}
            <View style={styles.quantityContainer}>
              <Text style={styles.quantityLabel}>Số lượng:</Text>
              <View style={styles.quantitySelector}>
                <TouchableOpacity
                  style={styles.quantityButton}
                  onPress={() => handleQuantityChange(-1)}
                  disabled={quantity <= 1}
                >
                  <Ionicons name="remove" size={20} color={quantity <= 1 ? COLORS.gray400 : COLORS.primary} />
                </TouchableOpacity>
                <Text style={styles.quantityText}>{quantity}</Text>
                <TouchableOpacity
                  style={styles.quantityButton}
                  onPress={() => handleQuantityChange(1)}
                  disabled={quantity >= 99}
                >
                  <Ionicons name="add" size={20} color={quantity >= 99 ? COLORS.gray400 : COLORS.primary} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Add to Cart Button */}
            <TouchableOpacity
              style={[styles.addToCartButton, addingToCart && styles.addToCartButtonDisabled]}
              onPress={handleAddToCart}
              disabled={addingToCart}
            >
              {addingToCart ? (
                <ActivityIndicator size="small" color={COLORS.white} />
              ) : (
                <>
                  <Ionicons name="cart" size={20} color={COLORS.white} />
                  <Text style={styles.addToCartText}>
                    Thêm vào giỏ - {formatPrice((parseInt(foodDetail.price) * quantity).toString())}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </>
        ) : (
          <View style={styles.unavailableContainer}>
            <Text style={styles.unavailableMessage}>Món ăn này hiện đang tạm hết hàng</Text>
          </View>
        )}
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.lg,
  },
  errorText: {
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: SPACING.lg,
  },
  backButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
  },
  backButtonText: {
    color: COLORS.white,
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    paddingTop: 50,
  },
  backIcon: {
    padding: SPACING.xs,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.white,
    marginHorizontal: SPACING.md,
  },
  favoriteIcon: {
    padding: SPACING.xs,
  },
  content: {
    flex: 1,
  },
  imageContainer: {
    position: 'relative',
    height: 300,
  },
  foodImage: {
    width: '100%',
    height: '100%',
  },
  unavailableOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  unavailableText: {
    color: COLORS.white,
    fontSize: 20,
    fontWeight: 'bold',
  },
  infoContainer: {
    padding: SPACING.lg,
  },
  titleSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.sm,
  },
  foodTitle: {
    flex: 1,
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text,
    marginRight: SPACING.md,
  },
  availabilityContainer: {
    alignItems: 'flex-end',
  },
  availabilityBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.sm,
  },
  availabilityText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: '600',
  },
  foodPrice: {
    fontSize: 22,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginBottom: SPACING.md,
  },
  ratingContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
  },
  noReviewsContainer: {
    backgroundColor: COLORS.white,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.lg,
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  noReviewsText: {
    fontSize: 16,
    color: COLORS.textSecondary,
  },
  ratingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginLeft: SPACING.xs,
  },
  ratingCount: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginLeft: SPACING.xs,
  },
  viewReviewsButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  viewReviewsText: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: '600',
    marginRight: SPACING.xs,
  },
  categoryContainer: {
    flexDirection: 'row',
    marginBottom: SPACING.md,
  },
  categoryLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginRight: SPACING.sm,
  },
  categoryText: {
    fontSize: 16,
    color: COLORS.textSecondary,
  },
  descriptionContainer: {
    marginBottom: SPACING.xl,
  },
  descriptionLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  descriptionText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 22,
  },
  bottomContainer: {
    backgroundColor: COLORS.white,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.divider,
    ...SHADOWS.md,
  },
  quantityContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  quantityLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  quantitySelector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.gray100,
    borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: SPACING.sm,
  },
  quantityButton: {
    padding: SPACING.sm,
  },
  quantityText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
    paddingHorizontal: SPACING.md,
    minWidth: 40,
    textAlign: 'center',
  },
  addToCartButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    ...SHADOWS.sm,
  },
  addToCartButtonDisabled: {
    opacity: 0.7,
  },
  addToCartText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: SPACING.sm,
  },
  unavailableContainer: {
    backgroundColor: COLORS.gray100,
    paddingVertical: SPACING.lg,
    borderRadius: BORDER_RADIUS.lg,
    alignItems: 'center',
  },
  unavailableMessage: {
    fontSize: 16,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
});

export default FoodDetailScreen;
