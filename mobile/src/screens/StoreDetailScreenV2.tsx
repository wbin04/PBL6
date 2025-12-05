import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, Image, TouchableOpacity, ScrollView, ActivityIndicator, Alert, Dimensions, StatusBar } from 'react-native';
import { IMAGE_MAP } from '../assets/imageMap';
import { useNavigation } from '@react-navigation/native';
import { RouteProp, useRoute } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Star, Clock, ArrowLeft } from 'lucide-react-native';
import { Ionicons } from '@expo/vector-icons';
import { API_CONFIG, COLORS, SPACING, BORDER_RADIUS, SHADOWS } from "@/constants";
import { apiClient } from '@/services/api';
import { storesService } from '@/services';
import { Store } from '@/types';
import { Fonts } from '@/constants/Fonts';

const { width: screenWidth } = Dimensions.get('window');

// Không dùng mock data cứng, chỉ nhận từ params

type RouteParams = {
  storeId: string;
  name?: string;
  address?: string;
  image?: any;
  foods?: any[];
  rating?: number;
  delivery?: string;
  time?: string;
  vouchers?: any[];
};

type Food = {
  id: number;
  title: string;
  description: string;
  price: number;
  image: string;
  category: {
    id: number;
    name: string;
  };
  store: {
    id: number;
    store_name: string;
  };
  avg_rating: number;
  rating_count_annotated: number;
  rating_count: number;
  name?: string;
  rating?: number;
  reviews?: any[];
  hasApiSizes?: boolean;
  sizes?: Array<{
    id: string | number;
    name: string;
    price: number;
    displayName: string;
  }> | null; // null if no sizes
};

export const StoreDetailScreenV2 = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<{ params: RouteParams }, 'params'>>();
  const { storeId, name, address, image, foods: routeFoods, rating, delivery, time, vouchers } = route.params;

  const [tab, setTab] = useState('all');
  const [foods, setFoods] = useState<Food[]>(routeFoods || []);
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<any[]>([]);
  const [storeInfo, setStoreInfo] = useState<Store | null>(null);
  const [storeStats, setStoreStats] = useState<{
    total_foods: number;
    total_orders: number;
    total_revenue: number;
    average_rating: number;
    total_ratings: number;
  } | null>(null);

  // Function to create image source URL
  const getImageSource = (imageValue: any) => {
    if (!imageValue) {
      return require('../assets/images/placeholder.png');
    }
    
    // If image is already a full URL
    if (typeof imageValue === 'string' && imageValue.startsWith('http')) {
      return { uri: imageValue };
    }
    
    // If it's a string path from API
    if (typeof imageValue === 'string') {
      // Check if it's an IMAGE_MAP key first (for backward compatibility)
      if (IMAGE_MAP[imageValue]) {
        return IMAGE_MAP[imageValue];
      }
      
      // Otherwise, construct full URL from media path
      const baseUrl = API_CONFIG.BASE_URL.replace("/api", ""); // Remove /api from base URL
      const fullUrl = `${baseUrl}/media/${imageValue}`;
      console.log('Store detail image URL:', fullUrl);
      return { uri: fullUrl };
    }
    
    // If it's already an object (local require)
    return imageValue;
  };

  // Format price for display
  const formatPrice = (price: number) => {
    return `${price.toLocaleString('vi-VN')}₫`;
  };

    const fetchStoreInfo = async () => {
      if (!storeId) {
        return;
      }
      const numericId = Number(storeId);
      if (Number.isNaN(numericId)) {
        console.warn('Invalid storeId:', storeId);
        return;
      }

      try {
        const detail = await storesService.getStoreDetail(numericId);
        setStoreInfo(detail);
      } catch (error) {
        console.error('Error fetching store detail:', error);
      }
    };

    const fetchStoreStats = async () => {
      if (!storeId) {
        return;
      }
      const numericId = Number(storeId);
      if (Number.isNaN(numericId)) {
        return;
      }

      try {
        const stats = await storesService.getStoreStats(numericId);
        setStoreStats(stats);
      } catch (error) {
        console.error('Error fetching store stats:', error);
      }
    };

  // Fetch categories from API
  const fetchCategories = async () => {
    try {
      console.log('Fetching categories...');
      
      const response: any = await apiClient.get('/menu/categories/');
      
      console.log('Categories API Response:', response);
      console.log('Categories data:', response.data);
      
      let data = response.data || response;
      let categoriesData = [];
      
      if (data.results && Array.isArray(data.results)) {
        categoriesData = data.results;
      } else if (Array.isArray(data)) {
        categoriesData = data;
      } else {
        console.error('Unexpected categories API response structure:', data);
        return;
      }
      
      setCategories(categoriesData);
      console.log('Categories loaded:', categoriesData);
      
    } catch (error: any) {
      console.error('Error fetching categories:', error);
      console.error('Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        statusText: error.response?.statusText
      });
      
      // Don't show error alert for categories as it's not critical
      // Just log the error and continue with empty categories
    }
  };

  // Fetch foods from API
  const fetchFoods = async () => {
    try {
      setLoading(true);
      console.log('Fetching foods for store:', storeId);
      
      // Use larger page_size to get all foods at once
      const response: any = await apiClient.get('/menu/items/', {
        params: { 
          store: storeId,
          page_size: 100 // Increase page size to get all items
        }
      });
      
      console.log('Foods API Response:', response);
      console.log('Foods data:', response.data);
      
      let data = response.data || response;
      let foodsData = [];
      
      if (data.results && Array.isArray(data.results)) {
        foodsData = data.results;
        console.log(`Loaded ${foodsData.length} foods from API (total count: ${data.count})`);
        
        // If there are more pages, log warning
        if (data.has_next) {
          console.warn('More pages available, consider implementing pagination');
        }
      } else if (Array.isArray(data)) {
        foodsData = data;
        console.log(`Loaded ${foodsData.length} foods from API`);
      } else {
        console.error('Unexpected foods API response structure:', data);
        Alert.alert('Lưu ý', 'Không thể tải danh sách món ăn');
        return;
      }
      
      // Helper function to generate hash from string
      const hashString = (str: string): number => {
        let hash = 0;
        if (str.length === 0) return hash;
        for (let i = 0; i < str.length; i++) {
          const char = str.charCodeAt(i);
          hash = ((hash << 5) - hash) + char;
          hash = hash & hash; // Convert to 32-bit integer
        }
        return Math.abs(hash);
      };

      // Map API data to match UI expectations  
      const mappedFoods = foodsData.map((food: any) => ({
        ...food,
        name: food.title, // Map title to name for UI compatibility
        rating: food.average_rating || 0,
        price: parseFloat(food.price), // Keep as number for calculations, format in UI
        priceFormatted: `${parseFloat(food.price).toLocaleString('vi-VN')}₫`, // Formatted price for display
        reviews: [], // Will be populated when needed
        // FIX: Only include sizes if the food actually has sizes from API
        hasApiSizes: food.sizes && Array.isArray(food.sizes) && food.sizes.length > 0,
        sizes: food.sizes && Array.isArray(food.sizes) && food.sizes.length > 0 
          ? food.sizes.map((size: any) => ({
              id: size.id,
              name: size.size_name,
              price: parseFloat(size.price || 0),
              displayName: `${size.size_name}${parseFloat(size.price) > 0 ? ` (+${parseFloat(size.price).toLocaleString('vi-VN')}₫)` : ''}`
            }))
          : null, // No sizes if not available from API
        // Use rating_count from API, with fallback to rating_count_annotated or 0
        rating_count: food.rating_count || food.rating_count_annotated || 0,
        // Create category object from category_name if not already present
        category: food.category ? food.category : {
          id: hashString(food.category_name || 'Chưa phân loại'),
          name: food.category_name || 'Chưa phân loại'
        }
      }));
      
      console.log(`Successfully loaded ${mappedFoods.length} foods for store ${storeId}`);
      console.log('First few foods with sizes info:', mappedFoods.slice(0, 3).map((food: any) => ({
        id: food.id,
        name: food.name,
        hasApiSizes: food.hasApiSizes,
        sizesCount: food.sizes ? food.sizes.length : 0,
        sizesPreview: food.sizes ? food.sizes.map((s: any) => s.displayName) : 'No sizes'
      })));
      
      // Debug: Log foods with sizes
      const foodsWithSizes = mappedFoods.filter((food: any) => food.hasApiSizes);
      
      if (foodsWithSizes.length > 0) {
        console.log(`Found ${foodsWithSizes.length} foods with API sizes:`);
        foodsWithSizes.forEach((food: any) => {
          console.log(`- ${food.name}: ${food.sizes.length} sizes`);
          food.sizes.forEach((size: any) => {
            console.log(`  * ${size.displayName} (ID: ${size.id}, Price: +${size.price}₫)`);
          });
        });
      } else {
        console.log('No foods found with API sizes');
      }
      
      // FIX: For foods with rating > 0 but rating_count = 0, the count might be missing from list API
      // Add debugging to see this issue
      const foodsWithMissingCount = mappedFoods.filter((food: any) => 
        (food.rating > 0 || food.average_rating > 0) && food.rating_count === 0
      );
      
      if (foodsWithMissingCount.length > 0) {
        console.log(`Found ${foodsWithMissingCount.length} foods with rating > 0 but rating_count = 0:`);
        foodsWithMissingCount.forEach((food: any) => {
          console.log(`- ${food.name}: rating=${food.rating}, rating_count=${food.rating_count}`);
        });
        console.log('This suggests the list API rating_count field needs to be synced with ratings table');
      }
      
      setFoods(mappedFoods);
      
      // Extract unique categories from foods using category_name
      const storeFoodCategories = foodsData.reduce((acc: any[], food: any) => {
        const categoryName = food.category_name || 'Chưa phân loại';
        const existingCategory = acc.find(cat => cat.name === categoryName);
        
        if (!existingCategory) {
          acc.push({
            id: hashString(categoryName),
            name: categoryName
          });
        }
        return acc;
      }, []);
      
      // If we have store-specific categories, use them; otherwise use global categories
      if (storeFoodCategories.length > 0) {
        setCategories(storeFoodCategories);
        console.log(`Store categories loaded: ${storeFoodCategories.length} categories`);
        console.log('Categories:', storeFoodCategories.map((cat: any) => cat.name));
      } else {
        console.log('No store-specific categories, using global categories');
      }
      
    } catch (error: any) {
      console.error('Error fetching foods:', error);
      console.error('Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        statusText: error.response?.statusText
      });
      
      let errorMessage = 'Không thể tải danh sách món ăn';
      if (error.response?.status === 401) {
        errorMessage = 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.';
      } else if (error.response?.status === 403) {
        errorMessage = 'Không có quyền truy cập.';
      } else if (error.message) {
        errorMessage += ': ' + error.message;
      }
      
      Alert.alert('Lỗi', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Always fetch categories
    fetchCategories();
    fetchStoreInfo();
    fetchStoreStats();
    
    // Fetch foods if not provided in route params
    if (storeId && (!routeFoods || routeFoods.length === 0)) {
      fetchFoods();
    }
  }, [storeId]);

  // Filter foods by selected tab/category
  const filteredFoods = foods.filter(food => {
    if (tab === 'all') return true;

    if (tab === 'main') {
      const catName = food.category?.name?.toLowerCase() || '';
      return catName.includes('chính') || catName.includes('main');
    }

    const selectedCategory = categories.find(c => c.id.toString() === tab);
    if (!selectedCategory) return false;

    const foodCatName = (food.category?.name || '').toLowerCase();
    const selectedCatName = (selectedCategory.name || '').toLowerCase();

    const match = foodCatName === selectedCatName;
    console.log(
      `Food: ${food.name}, foodCat: ${foodCatName}, selectedCat: ${selectedCatName}, Match: ${match}`
    );
    return match;
  });

  // Debug logging
  useEffect(() => {
    console.log('Current state:');
    console.log('- Foods:', foods.length);
    console.log('- Categories:', categories.length, categories.map(c => `${c.name} (${c.id})`));
    console.log('- Selected tab:', tab);
    console.log('- Filtered foods:', filteredFoods.length);
  }, [foods, categories, tab, filteredFoods]);

  // Nếu có truyền params thì ưu tiên dùng
  const fallbackRatingCount = foods.reduce((total, food) => total + (food.rating_count || 0), 0);
  const computedRating = storeStats?.average_rating ?? rating ?? 0;
  const computedRatingCount = storeStats?.total_ratings ?? fallbackRatingCount;

  const store = {
    id: storeId,
    name: storeInfo?.store_name ?? name ?? '',
    address: storeInfo?.address ?? address ?? '',
    headerImage: storeInfo?.image ?? image ?? null,
    foods: foods,
    rating: computedRating,
    ratingCount: computedRatingCount,
    delivery: delivery ?? '',
    time: time ?? '',
    vouchers: vouchers ?? [],
  };

  const storeRatingDisplay = (store.rating ?? 0) > 0 ? Number(store.rating).toFixed(1) : 'Chưa có';
  const storeRatingCountDisplay = store.ratingCount || 0;

  // Render food item
  const renderFoodItem = ({ item }: { item: Food }) => {
    const numericRating = Number(item.rating ?? item.avg_rating ?? 0);
    const formattedRating = numericRating > 0 ? numericRating.toFixed(1) : '0.0';

    return (
      <TouchableOpacity
        style={styles.foodCard}
        onPress={() => {
          // FIX: Don't generate mock reviews, let FoodDetailPopup fetch real data from API
          let reviews: any[] = []; // Always empty, let API handle reviews
          
          navigation.navigate('FoodDetailPopup', {
            foodId: item.id,
            image: item.image,
            name: item.name,
            price: item.price,
            rating: item.rating,
            description: item.description ?? 'Mô tả món ăn...',
            sizes: item.sizes, // Pass actual sizes (null if no sizes) or FoodDetailPopup will handle null
            reviews, // Empty array, API will provide real reviews
            storeName: store.name,
          });
        }}
      >
        <Image
          source={getImageSource(item.image)}
          style={styles.foodImage}
          onError={() => console.log('Food image load error:', item.name)}
        />
        <View style={styles.foodInfo}>
          <Text style={styles.foodName} numberOfLines={2}>{item.name || item.title}</Text>
          <Text style={styles.foodDescription} numberOfLines={2}>
            {item.description || 'Món ăn ngon'}
          </Text>
          <View style={styles.foodFooter}>
            <Text style={styles.foodPrice}>{formatPrice(item.price)}</Text>
            <View style={styles.ratingContainer}>
              <Star color="#f59e0b" size={14} />
              <Text style={styles.foodRating}>{formattedRating}</Text>
              <Text style={styles.ratingCount}>({item.rating_count || 0})</Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.safeArea}>
      {/* Cover + nút back giống StoreDetailScreen */}
      <View style={styles.coverWrap}>
        <Image
          source={getImageSource(store.headerImage)}
          style={styles.coverImage}
          resizeMode="cover"
          onError={() =>
            console.log('Header image load error for store:', store.name)
          }
        />

        <View style={styles.topBar}>
          <TouchableOpacity
            style={styles.topBtn}
            onPress={() => navigation.goBack()}
            activeOpacity={0.8}
          >
            <Ionicons name="arrow-back" size={18} color={COLORS.text} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Thông tin cửa hàng + stats giống StoreDetailScreen nhưng dùng dữ liệu V2 */}
      <View style={styles.storeDetailsCard}>
        <View style={styles.inlineMeta}>
          <View style={styles.metaItem}>
            <Ionicons name="star" size={16} color="#F59E0B" />
            <Text style={styles.metaBold}>
              {storeRatingDisplay === 'Chưa có'
                ? '0.0'
                : storeRatingDisplay}
            </Text>
            <Text style={styles.metaGray}>
              ({storeRatingCountDisplay} đánh giá)
            </Text>
          </View>

          {!!foods.length && (
            <View style={styles.metaItem}>
              <Ionicons
                name="restaurant-outline"
                size={16}
                color={COLORS.gray500}
              />
              <Text style={styles.metaGray}>
                {foods.length} món
              </Text>
            </View>
          )}

          {!!storeStats?.total_orders && (
            <View style={styles.metaItem}>
              <Ionicons
                name="receipt-outline"
                size={16}
                color={COLORS.gray500}
              />
              <Text style={styles.metaGray}>
                {storeStats.total_orders} đơn
              </Text>
            </View>
          )}
        </View>

        <Text style={styles.storeName}>{store.name}</Text>
        <Text style={styles.storeDescription}>
          {store.address || 'Địa chỉ đang được cập nhật'}
        </Text>
      </View>

      {/* Tabs filter + danh sách món giữ nguyên */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.tabScrollView}
        contentContainerStyle={styles.tabBox}
      >
        <TouchableOpacity
          style={[styles.tabBtn, tab === 'all' && styles.tabActive]}
          onPress={() => setTab('all')}
        >
          <Text
            style={[
              styles.tabText,
              tab === 'all' && styles.tabTextActive,
            ]}
          >
            Tất cả
          </Text>
        </TouchableOpacity>

        {categories.length > 0 &&
          categories.map((category) => (
            <TouchableOpacity
              key={category.id}
              style={[
                styles.tabBtn,
                tab === category.id.toString() && styles.tabActive,
              ]}
              onPress={() => {
                console.log(
                  'Selected category:',
                  category.name,
                  'ID:',
                  category.id,
                );
                setTab(category.id.toString());
              }}
            >
              <Text
                style={[
                  styles.tabText,
                  tab === category.id.toString() && styles.tabTextActive,
                ]}
                numberOfLines={1}
              >
                {category.name}
              </Text>
            </TouchableOpacity>
          ))}

        {categories.length === 0 && !loading && (
          <TouchableOpacity
            style={[styles.tabBtn, tab === 'main' && styles.tabActive]}
            onPress={() => setTab('main')}
          >
            <Text
              style={[
                styles.tabText,
                tab === 'main' && styles.tabTextActive,
              ]}
            >
              Bữa chính
            </Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      {/* Nội dung danh sách món */}
      <View style={styles.foodListContainer}>
        <View style={styles.foodListHeaderRow}>
          <Text style={styles.foodListTitle}>
            Tất cả món ăn ({filteredFoods.length})
            {loading && ' - Đang tải...'}
          </Text>
        </View>

        {loading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#ea580c" />
            <Text style={styles.loadingText}>Đang tải món ăn...</Text>
          </View>
        )}

        {!loading && filteredFoods.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>Không có món ăn nào</Text>
          </View>
        ) : (
          <FlatList
            data={filteredFoods}
            keyExtractor={(item) => item.id.toString()}
            renderItem={renderFoodItem}
            scrollEnabled={true}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.foodListContent}
          />
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },

  // === Cover + top bar giống StoreDetailScreen ===
  coverWrap: {
    width: '100%',
    height: 260,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    overflow: 'hidden',
    backgroundColor: COLORS.gray100,
  },
  coverImage: {
    width: '100%',
    height: '100%',
  },
  topBar: {
    position: 'absolute',
    top: 40,
    left: 16,
    right: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  topBtn: {
    backgroundColor: COLORS.white,
    padding: 8,
    borderRadius: 999,
    ...SHADOWS.sm,
  },

  // === Store details card giống StoreDetailScreen ===
  storeDetailsCard: {
    backgroundColor: COLORS.white,
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.md,
    gap: 8,
  },
  inlineMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaBold: {
    color: COLORS.text,
    fontFamily: Fonts.LeagueSpartanBold,
    fontSize: 14,
  },
  metaGray: {
    color: COLORS.gray500,
    fontFamily: Fonts.LeagueSpartanRegular,
    fontSize: 13,
  },
  storeName: {
    fontSize: 24,
    color: COLORS.text,
    marginTop: 4,
    fontFamily: Fonts.LeagueSpartanBold,
  },
  storeDescription: {
    fontSize: 15,
    color: COLORS.textSecondary,
    lineHeight: 22,
    marginTop: 4,
    fontFamily: Fonts.LeagueSpartanRegular,
  },

  // === Tabs filter giống restaurants/index (pill, ngang, scroll) ===
  tabScrollView: {
    marginTop: 8,
    marginBottom: 4,
    maxHeight: 54,
  },
  tabBox: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 8,
    alignItems: 'center',
  },
  tabBtn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 999,
    backgroundColor: '#f3f4f6',
    minWidth: 80,
    maxWidth: screenWidth * 0.45,
  },
  tabActive: {
    backgroundColor: '#eb5523',
    borderWidth: 1,
    borderColor: '#f97316',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 3,
    elevation: 2,
  },
  tabText: {
    textAlign: 'center',
    color: '#6b7280',
    fontSize: 14,
    fontFamily: Fonts.LeagueSpartanMedium,
  },
  tabTextActive: {
    color: '#ffffff',
    fontFamily: Fonts.LeagueSpartanSemiBold,
  },

  // === Food list ===
  foodListContainer: {
    flex: 1,
    marginTop: 8,
  },
  foodListHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 4,
  },
  foodListTitle: {
    fontSize: 16,
    color: '#111827',
    fontFamily: Fonts.LeagueSpartanSemiBold,
  },
  foodListContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
    paddingTop: 8,
  },

  foodCard: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    marginBottom: 12,
    padding: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  foodImage: {
    width: 80,
    height: 80,
    borderRadius: 12,
    backgroundColor: '#f3f4f6',
  },
  foodInfo: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'space-between',
  },
  foodName: {
    fontSize: 15,
    fontFamily: Fonts.LeagueSpartanSemiBold,
    color: '#111827',
    marginBottom: 2,
  },
  foodDescription: {
    fontSize: 12,
    color: '#6b7280',
    fontFamily: Fonts.LeagueSpartanRegular,
    marginBottom: 6,
  },
  foodFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  foodPrice: {
    color: '#ef4444',
    fontSize: 15,
    fontFamily: Fonts.LeagueSpartanBold,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  foodRating: {
    color: '#f59e0b',
    fontSize: 13,
    marginLeft: 2,
    fontFamily: Fonts.LeagueSpartanSemiBold,
  },
  ratingCount: {
    color: '#6b7280',
    fontSize: 11,
    marginLeft: 2,
    fontFamily: Fonts.LeagueSpartanRegular,
  },

  loadingContainer: {
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 8,
    fontSize: 14,
    color: '#6b7280',
    fontFamily: Fonts.LeagueSpartanRegular,
  },
  emptyContainer: {
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 15,
    color: '#6b7280',
    fontFamily: Fonts.LeagueSpartanRegular,
    fontStyle: 'italic',
  },
});

// No default export, use named export above