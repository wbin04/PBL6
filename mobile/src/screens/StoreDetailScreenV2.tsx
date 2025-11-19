import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, Image, TouchableOpacity, ScrollView, ActivityIndicator, Alert, Dimensions } from 'react-native';
import { IMAGE_MAP } from '../assets/imageMap';
import { useNavigation } from '@react-navigation/native';
import { RouteProp, useRoute } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Star, Clock, BadgePercent } from 'lucide-react-native';
import { API_CONFIG } from "@/constants";
import { apiClient } from '@/services/api';
import { storesService } from '@/services';
import { Store } from '@/types';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

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
  rating_count: number; // Add rating_count field
  // Additional fields for compatibility
  name?: string;
  rating?: number;
  reviews?: any[];
  hasApiSizes?: boolean; // Indicates if food has sizes from API
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
      // Filter by category name containing "chính" or "main"
      return food.category?.name?.toLowerCase().includes('chính') || 
             food.category?.name?.toLowerCase().includes('main');
    }
    // Filter by specific category ID
    const categoryMatch = food.category?.id.toString() === tab;
    console.log(`Food: ${food.name}, Category: ${food.category?.name} (ID: ${food.category?.id}), Selected tab: ${tab}, Match: ${categoryMatch}`);
    return categoryMatch;
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
    foods: foods, // Use state foods instead of route params
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
    <SafeAreaView style={styles.safeArea}>
      {/* Back Button */}
      <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
        <Text style={styles.backIcon}>{'←'}</Text>
      </TouchableOpacity>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header Image */}
        <Image
          source={getImageSource(store.headerImage)}
          style={styles.headerImage}
          resizeMode="cover"
          onError={() => console.log('Header image load error for store:', store.name)}
        />

        {/* Info Section */}
        <View style={styles.infoBox}>
          <View style={styles.rowCenter}>
            <Star color="#f59e0b" size={18} />
            <Text style={styles.ratingText}>
              {storeRatingDisplay}
            </Text>
            <Text style={styles.reviewCount}>
              ({storeRatingCountDisplay} đánh giá)
            </Text>
            <Text style={styles.dot}>·</Text>
            <Text style={styles.delivery}>{store.delivery}</Text>
            <Text style={styles.dot}>·</Text>
            <Clock color="#6b7280" size={16} />
            <Text style={styles.time}>{store.time}</Text>
          </View>
          <Text style={styles.storeName} numberOfLines={2}>{store.name}</Text>
          <Text style={styles.storeDesc} numberOfLines={3}>{store.address}</Text>
        </View>

        {/* Tabs */}
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
            <Text style={[styles.tabText, tab === 'all' && styles.tabTextActive]}>Tất cả</Text>
          </TouchableOpacity>
          {categories.length > 0 && categories.map((category, index) => (
            <TouchableOpacity
              key={category.id}
              style={[styles.tabBtn, tab === category.id.toString() && styles.tabActive]}
              onPress={() => {
                console.log('Selected category:', category.name, 'ID:', category.id);
                setTab(category.id.toString());
              }}
            >
              <Text style={[styles.tabText, tab === category.id.toString() && styles.tabTextActive]} numberOfLines={1}>
                {category.name}
              </Text>
            </TouchableOpacity>
          ))}
          {categories.length === 0 && !loading && (
            <TouchableOpacity
              style={[styles.tabBtn, tab === 'main' && styles.tabActive]}
              onPress={() => setTab('main')}
            >
              <Text style={[styles.tabText, tab === 'main' && styles.tabTextActive]}>Bữa chính</Text>
            </TouchableOpacity>
          )}
        </ScrollView>

        {/* Food List */}
        <View style={styles.foodListContainer}>
          <Text style={styles.foodListTitle}>
            Tất cả món ăn ({filteredFoods.length})
            {loading && ' - Đang tải...'}
          </Text>

          {loading && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#ea580c" />
              <Text>Đang tải món ăn...</Text>
            </View>
          )}

          {!loading && filteredFoods.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>Không có món ăn nào</Text>
            </View>
          ) : (
            <FlatList
              data={filteredFoods}
              keyExtractor={item => item.id.toString()}
              renderItem={renderFoodItem}
              scrollEnabled={false}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.foodListContent}
            />
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { 
    flex: 1, 
    backgroundColor: '#fff7ed' 
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 24,
  },
  backBtn: {
    position: 'absolute',
    top: 50,
    left: 16,
    zIndex: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    borderRadius: 20,
    padding: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 2,
  },
  backIcon: {
    fontSize: 22,
    color: '#ea580c',
    fontWeight: 'bold',
  },
  headerImage: {
    width: screenWidth,
    height: 180,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  infoBox: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    borderRadius: 16,
    padding: 16,
    marginTop: -24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  rowCenter: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    marginBottom: 8,
    flexWrap: 'wrap'
  },
  ratingText: { 
    color: '#f59e0b', 
    fontWeight: 'bold', 
    marginLeft: 4, 
    fontSize: 15 
  },
  reviewCount: { 
    color: '#6b7280', 
    fontSize: 14, 
    marginLeft: 4 
  },
  dot: { 
    color: '#d1d5db', 
    marginHorizontal: 6, 
    fontSize: 16 
  },
  delivery: { 
    color: '#10b981', 
    fontWeight: 'bold', 
    fontSize: 14 
  },
  time: { 
    color: '#6b7280', 
    fontSize: 14, 
    marginLeft: 4 
  },
  storeName: { 
    fontSize: 20, 
    fontWeight: 'bold', 
    color: '#1f2937', 
    marginBottom: 4,
    lineHeight: 26
  },
  storeDesc: { 
    fontSize: 14, 
    color: '#6b7280', 
    lineHeight: 20
  },
  tabScrollView: {
    marginTop: 24,
    marginBottom: 8,
    maxHeight: 50,
  },
  tabBox: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 8,
    alignItems: 'center'
  },
  tabBtn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: '#f3f4f6',
    minWidth: 80,
    maxWidth: screenWidth * 0.35,
  },
  tabActive: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#f59e0b',
  },
  tabText: { 
    textAlign: 'center', 
    color: '#6b7280', 
    fontWeight: 'bold', 
    fontSize: 14
  },
  tabTextActive: { 
    color: '#f59e0b' 
  },
  foodListContainer: {
    flex: 1,
    marginTop: 16,
  },
  foodListTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginHorizontal: 16,
    marginBottom: 12,
    color: '#1f2937',
  },
  foodListContent: {
    paddingHorizontal: 16,
  },
  foodCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 12,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
    minHeight: 100,
  },
  foodImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
  },
  foodInfo: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'space-between',
  },
  foodName: { 
    fontWeight: 'bold', 
    fontSize: 16, 
    color: '#1f2937',
    lineHeight: 20,
    marginBottom: 4
  },
  foodDescription: {
    fontSize: 13,
    color: '#6b7280',
    lineHeight: 18,
    marginBottom: 8
  },
  foodFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  foodPrice: { 
    color: '#ef4444', 
    fontWeight: 'bold', 
    fontSize: 16 
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  foodRating: { 
    color: '#f59e0b', 
    fontWeight: 'bold', 
    fontSize: 13,
    marginLeft: 2
  },
  ratingCount: { 
    color: '#6b7280', 
    fontSize: 12, 
    marginLeft: 2 
  },
  loadingContainer: { 
    alignItems: 'center', 
    padding: 20 
  },
  emptyContainer: {
    alignItems: 'center',
    padding: 40
  },
  emptyText: {
    fontSize: 16,
    color: '#6b7280',
    fontStyle: 'italic'
  }
});

// No default export, use named export above