import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Plus, Minus, ShoppingCart, Store as StoreIcon, Star, Flame, TrendingUp } from 'lucide-react-native';
import { Fonts } from '@/constants/Fonts';
import { API_CONFIG } from '@/constants';
import { useDispatch } from 'react-redux';
import { addToCart } from '@/store/slices/cartSlice';
import { AppDispatch } from '@/store';

interface FoodItem {
  id: number;
  title: string;
  description?: string;
  price: string;
  image: string;
  image_url?: string; // Alternative field for image
  store_id: number;
  store_name: string;
  // Statistics fields (for recommendations)
  average_rating?: number;
  avg_rating?: number;
  total_sold?: number;
  badge_type?: 'best_seller' | 'top_rated' | 'trending' | '';
  badge_text?: string;
  sizes?: Array<{
    id: number;
    size_name: string;
    price: string;
  }>;
}

interface StoreGroup {
  store_id: number;
  store_name: string;
  foods: FoodItem[];
}

interface FoodListMessageProps {
  foods: FoodItem[];
  statisticsType?: 'best_seller' | 'top_rated' | 'trending';
}

export const FoodListMessage: React.FC<FoodListMessageProps> = ({ foods, statisticsType }) => {
  const navigation = useNavigation<any>();
  const dispatch = useDispatch<AppDispatch>();
  const [quantities, setQuantities] = useState<{ [key: number]: number }>({});

  // Gom nhóm món ăn theo cửa hàng
  const groupedFoods = React.useMemo(() => {
    const groups: { [key: number]: StoreGroup } = {};
    
    foods.forEach((food) => {
      if (!groups[food.store_id]) {
        groups[food.store_id] = {
          store_id: food.store_id,
          store_name: food.store_name,
          foods: [],
        };
      }
      groups[food.store_id].foods.push(food);
    });

    return Object.values(groups);
  }, [foods]);

  const getQuantity = (foodId: number): number => {
    return quantities[foodId] || 1;
  };

  const updateQuantity = (foodId: number, delta: number) => {
    const currentQty = getQuantity(foodId);
    const newQty = Math.max(1, Math.min(99, currentQty + delta));
    setQuantities((prev) => ({ ...prev, [foodId]: newQty }));
  };

  const handleAddToCart = async (food: FoodItem) => {
    try {
      const quantity = getQuantity(food.id);
      
      await dispatch(
        addToCart({
          food_id: food.id,
          quantity,
        })
      ).unwrap();

      Alert.alert('Thành công', `Đã thêm ${quantity} ${food.title} vào giỏ hàng`);
      
      // Reset quantity về 1 sau khi thêm
      setQuantities((prev) => ({ ...prev, [food.id]: 1 }));
    } catch (error: any) {
      Alert.alert('Lỗi', error.message || 'Không thể thêm vào giỏ hàng');
    }
  };

  const handleStorePress = (storeId: number, storeName: string) => {
    navigation.navigate('StoreDetailScreen', {
      storeId,
      storeName,
    });
  };

  const handleFoodPress = (foodId: number) => {
    navigation.navigate('FoodDetail', { foodId });
  };

  const formatPrice = (price: string | number): string => {
    const numPrice = typeof price === 'string' ? parseFloat(price) : price;
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(numPrice);
  };

  const getImageUrl = (food: FoodItem): string => {
    const imageUrl = food.image_url || food.image;
    
    if (!imageUrl) {
      return 'https://via.placeholder.com/150';
    }
    
    // Nếu đã là URL đầy đủ, dùng trực tiếp
    if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
      return imageUrl;
    }
    
    // Nếu là đường dẫn tương đối, xây dựng URL đầy đủ
    const baseUrl = API_CONFIG.BASE_URL.replace('/api', ''); // Loại bỏ /api khỏi URL
    
    // Nếu imageUrl đã có /media, dùng luôn
    if (imageUrl.startsWith('/media')) {
      return `${baseUrl}${imageUrl}`;
    }
    
    // Nếu không có /media, thêm vào
    return `${baseUrl}/media${imageUrl.startsWith('/') ? '' : '/'}${imageUrl}`;
  };

  // Render badge dựa trên loại thống kê
  const renderBadge = (food: FoodItem) => {
    const badgeType = food.badge_type || statisticsType;
    const rating = food.average_rating || food.avg_rating || 0;
    const sold = food.total_sold || 0;
    
    if (badgeType === 'best_seller' && sold > 0) {
      return (
        <View style={[styles.badge, styles.badgeBestSeller]}>
          <Flame size={12} color="#fff" />
          <Text style={styles.badgeText}>
            {food.badge_text || `${sold} đã bán`}
          </Text>
        </View>
      );
    }
    
    if (badgeType === 'top_rated' && rating > 0) {
      const stars = '⭐'.repeat(Math.min(5, Math.round(rating)));
      return (
        <View style={[styles.badge, styles.badgeTopRated]}>
          <Star size={12} color="#fff" fill="#fff" />
          <Text style={styles.badgeText}>
            {food.badge_text || `${rating.toFixed(1)}`}
          </Text>
        </View>
      );
    }
    
    if (badgeType === 'trending') {
      return (
        <View style={[styles.badge, styles.badgeTrending]}>
          <TrendingUp size={12} color="#fff" />
          <Text style={styles.badgeText}>
            {food.badge_text || 'Hot 🔥'}
          </Text>
        </View>
      );
    }
    
    // Show rating if available (even without badge_type)
    if (rating > 0) {
      return (
        <View style={[styles.badge, styles.badgeRating]}>
          <Star size={10} color="#FFD700" fill="#FFD700" />
          <Text style={[styles.badgeText, { color: '#333' }]}>
            {rating.toFixed(1)}
          </Text>
        </View>
      );
    }
    
    return null;
  };

  if (!foods || foods.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      {groupedFoods.map((group) => (
        <View key={group.store_id} style={styles.storeGroup}>
          {/* Store Header */}
          <TouchableOpacity
            style={styles.storeHeader}
            onPress={() => handleStorePress(group.store_id, group.store_name)}
            activeOpacity={0.7}
          >
            <View style={styles.storeIconContainer}>
              <StoreIcon size={20} color="#e95322" />
            </View>
            <View style={styles.storeInfo}>
              <Text style={styles.storeName}>{group.store_name}</Text>
              <Text style={styles.foodCount}>
                {group.foods.length} món ăn
              </Text>
            </View>
            <Text style={styles.viewStore}>Xem cửa hàng →</Text>
          </TouchableOpacity>

          {/* Foods List */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.foodsList}
          >
            {group.foods.map((food) => (
              <View key={food.id} style={styles.foodCard}>
                {/* Food Image with Badge */}
                <TouchableOpacity
                  onPress={() => handleFoodPress(food.id)}
                  activeOpacity={0.8}
                >
                  <View style={styles.imageContainer}>
                    <Image
                      source={{ uri: getImageUrl(food) }}
                      style={styles.foodImage}
                      resizeMode="cover"
                    />
                    {/* Badge Overlay */}
                    {renderBadge(food)}
                  </View>
                </TouchableOpacity>

                {/* Food Info */}
                <TouchableOpacity
                  style={styles.foodInfo}
                  onPress={() => handleFoodPress(food.id)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.foodName} numberOfLines={2}>
                    {food.title}
                  </Text>
                  <Text style={styles.foodPrice}>
                    {formatPrice(food.price)}
                  </Text>
                  {/* Show stats if available */}
                  {(food.total_sold || food.average_rating || food.avg_rating) && (
                    <View style={styles.statsRow}>
                      {food.total_sold ? (
                        <Text style={styles.statsText}>🔥 {food.total_sold} đã bán</Text>
                      ) : null}
                      {(food.average_rating || food.avg_rating) ? (
                        <Text style={styles.statsText}>
                          ⭐ {(food.average_rating || food.avg_rating || 0).toFixed(1)}
                        </Text>
                      ) : null}
                    </View>
                  )}
                </TouchableOpacity>

                {/* Quantity Controls */}
                <View style={styles.quantityContainer}>
                  <TouchableOpacity
                    style={styles.quantityButton}
                    onPress={() => updateQuantity(food.id, -1)}
                  >
                    <Minus size={16} color="#e95322" />
                  </TouchableOpacity>
                  
                  <Text style={styles.quantity}>
                    {getQuantity(food.id)}
                  </Text>
                  
                  <TouchableOpacity
                    style={styles.quantityButton}
                    onPress={() => updateQuantity(food.id, 1)}
                  >
                    <Plus size={16} color="#e95322" />
                  </TouchableOpacity>
                </View>

                {/* Add to Cart Button */}
                <TouchableOpacity
                  style={styles.addToCartButton}
                  onPress={() => handleAddToCart(food)}
                  activeOpacity={0.7}
                >
                  <ShoppingCart size={16} color="#fff" />
                  <Text style={styles.addToCartText}>Thêm vào giỏ</Text>
                </TouchableOpacity>
              </View>
            ))}
          </ScrollView>
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: 16,
  },
  storeGroup: {
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  storeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#fef3f0',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  storeIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  storeInfo: {
    flex: 1,
  },
  storeName: {
    fontSize: 16,
    fontFamily: Fonts.LeagueSpartanBold,
    color: '#111827',
    marginBottom: 2,
  },
  foodCount: {
    fontSize: 12,
    fontFamily: Fonts.LeagueSpartanRegular,
    color: '#6B7280',
  },
  viewStore: {
    fontSize: 14,
    fontFamily: Fonts.LeagueSpartanSemiBold,
    color: '#e95322',
  },
  foodsList: {
    padding: 12,
    gap: 12,
  },
  foodCard: {
    width: 160,
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  imageContainer: {
    position: 'relative',
  },
  foodImage: {
    width: '100%',
    height: 120,
    backgroundColor: '#f3f4f6',
  },
  // Badge styles
  badge: {
    position: 'absolute',
    top: 8,
    left: 8,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  badgeBestSeller: {
    backgroundColor: '#ef4444',
  },
  badgeTopRated: {
    backgroundColor: '#f59e0b',
  },
  badgeTrending: {
    backgroundColor: '#8b5cf6',
  },
  badgeRating: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  badgeText: {
    fontSize: 10,
    fontFamily: Fonts.LeagueSpartanSemiBold,
    color: '#fff',
  },
  foodInfo: {
    padding: 12,
    paddingBottom: 8,
  },
  foodName: {
    fontSize: 14,
    fontFamily: Fonts.LeagueSpartanSemiBold,
    color: '#111827',
    marginBottom: 4,
    height: 36,
  },
  foodPrice: {
    fontSize: 16,
    fontFamily: Fonts.LeagueSpartanBold,
    color: '#e95322',
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 8,
  },
  statsText: {
    fontSize: 11,
    fontFamily: Fonts.LeagueSpartanRegular,
    color: '#6B7280',
  },
  quantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingBottom: 8,
    gap: 8,
  },
  quantityButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#fef3f0',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e95322',
  },
  quantity: {
    fontSize: 16,
    fontFamily: Fonts.LeagueSpartanBold,
    color: '#111827',
    minWidth: 28,
    textAlign: 'center',
  },
  addToCartButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#e95322',
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginHorizontal: 8,
    marginBottom: 8,
    borderRadius: 8,
    gap: 6,
  },
  addToCartText: {
    fontSize: 13,
    fontFamily: Fonts.LeagueSpartanSemiBold,
    color: '#fff',
  },
});
