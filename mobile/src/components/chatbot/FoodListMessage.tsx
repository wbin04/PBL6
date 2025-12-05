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
import { Plus, Minus, ShoppingCart, Store as StoreIcon } from 'lucide-react-native';
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
  store_id: number;
  store_name: string;
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
}

export const FoodListMessage: React.FC<FoodListMessageProps> = ({ foods }) => {
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

  const getImageUrl = (imageUrl: string): string => {
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
                {/* Food Image */}
                <TouchableOpacity
                  onPress={() => handleFoodPress(food.id)}
                  activeOpacity={0.8}
                >
                  <Image
                    source={{ uri: getImageUrl(food.image) }}
                    style={styles.foodImage}
                    resizeMode="cover"
                  />
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
  foodImage: {
    width: '100%',
    height: 120,
    backgroundColor: '#f3f4f6',
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
