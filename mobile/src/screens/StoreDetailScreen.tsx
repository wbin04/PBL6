import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  FlatList,
  TouchableOpacity,
  StatusBar,
  RefreshControl,
  Dimensions,
  Image,
  Alert,
} from 'react-native';
import { useNavigation, useRoute, useFocusEffect, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList, Category, Food, Store } from '@/types';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '@/store';
import { fetchStoreDetail } from '@/store/slices/storesSlice';
import { fetchCategories } from '@/store/slices/menuSlice';
import { FoodCard, CategoryCard } from '@/components';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, BORDER_RADIUS, SHADOWS, API_CONFIG } from '@/constants';
import { storesService, menuService } from '@/services';

interface StoreStats {
  total_foods: number;
  total_orders: number;
  total_revenue: number;
  average_rating: number;
  total_ratings: number;
}

const { width, height } = Dimensions.get('window');

type StoreDetailNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'StoreDetail'
>;

type StoreDetailRouteProp = RouteProp<RootStackParamList, 'StoreDetail'>;

interface StoreDetailProps {}

export const StoreDetailScreen: React.FC<StoreDetailProps> = () => {
  const navigation = useNavigation<StoreDetailNavigationProp>();
  const route = useRoute<StoreDetailRouteProp>();
  const { storeId } = route.params;
  
  const dispatch = useDispatch<AppDispatch>();
  const { currentStore, loading } = useSelector((state: RootState) => state.stores);
  const { categories } = useSelector((state: RootState) => state.menu);
  
  const [refreshing, setRefreshing] = useState(false);
  const [storeFoods, setStoreFoods] = useState<Food[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [foodsLoading, setFoodsLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMoreFoods, setHasMoreFoods] = useState(true);
  const [storeStats, setStoreStats] = useState<{
    total_foods: number;
    total_orders: number;
    total_revenue: number;
    average_rating: number;
    total_ratings: number;
  } | null>(null);

  // Fetch store detail when component mounts
  useEffect(() => {
    if (storeId) {
      dispatch(fetchStoreDetail(storeId));
      dispatch(fetchCategories()); // Also fetch categories
      fetchStoreFoods();
      fetchStoreStats();
    }
  }, [storeId, dispatch]);

  // Fetch store stats
  const fetchStoreStats = async () => {
    try {
      console.log('StoreDetailScreen - fetchStoreStats called for storeId:', storeId);
      const stats = await storesService.getStoreStats(storeId);
      console.log('StoreDetailScreen - Store stats:', stats);
      setStoreStats(stats);
    } catch (error) {
      console.error('Error fetching store stats:', error);
    }
  };

  // Fetch store foods
  const fetchStoreFoods = async (page = 1, categoryId?: number, reset = false) => {
    try {
      console.log('StoreDetailScreen - fetchStoreFoods called with:', { storeId, page, categoryId, reset });
      setFoodsLoading(true);
      
      const response = await storesService.getStoreFoods(storeId, page);
      console.log('StoreDetailScreen - API response:', response);
      
      let foods = response.results;
      console.log('StoreDetailScreen - Foods from API:', foods?.length || 0, 'items');
      
      // Filter by category if selected
      if (categoryId) {
        const beforeFilter = foods?.length || 0;
        foods = foods.filter(food => food.category?.id === categoryId);
        console.log('StoreDetailScreen - After category filter:', foods?.length || 0, 'items (was', beforeFilter, ')');
      }
      
      if (reset || page === 1) {
        setStoreFoods(foods || []);
        console.log('StoreDetailScreen - Set foods (reset):', foods?.length || 0, 'items');
      } else {
        setStoreFoods(prev => {
          const newFoods = [...(prev || []), ...(foods || [])];
          console.log('StoreDetailScreen - Set foods (append):', newFoods.length, 'items');
          return newFoods;
        });
      }
      
      setHasMoreFoods(!!response.next);
      setCurrentPage(page);
    } catch (error) {
      console.error('Error fetching store foods:', error);
      Alert.alert('Lỗi', 'Không thể tải danh sách món ăn');
    } finally {
      setFoodsLoading(false);
    }
  };

  // Handle category selection
  const handleCategoryPress = (categoryId: number) => {
    if (selectedCategory === categoryId) {
      setSelectedCategory(null);
      fetchStoreFoods(1, undefined, true);
    } else {
      setSelectedCategory(categoryId);
      fetchStoreFoods(1, categoryId, true);
    }
  };

  // Handle load more foods
  const handleLoadMore = () => {
    if (!foodsLoading && hasMoreFoods) {
      fetchStoreFoods(currentPage + 1, selectedCategory || undefined);
    }
  };

  const handleFoodPress = (foodId: number) => {
    navigation.navigate('FoodDetail', { foodId });
  };

  const handleAddToCart = (foodId: number) => {
    console.log('Add to cart:', foodId);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await dispatch(fetchStoreDetail(storeId));
      await fetchStoreFoods(1, selectedCategory || undefined, true);
      await fetchStoreStats();
    } finally {
      setRefreshing(false);
    }
  };

  const getImageSource = (imageUrl?: string) => {
    console.log('StoreDetailScreen - imageUrl:', imageUrl);
    
    if (imageUrl) {
      if (imageUrl.startsWith('http')) {
        console.log('StoreDetailScreen - Using full URL:', imageUrl);
        return { uri: imageUrl };
      }
      
      const baseUrl = API_CONFIG.BASE_URL.replace('/api', '');
      const imagePath = imageUrl.startsWith('/') ? imageUrl : `/${imageUrl}`;
      const fullUrl = `${baseUrl}/media/${imagePath}`;
      
      console.log('StoreDetailScreen - Constructed URL:', fullUrl);
      console.log('StoreDetailScreen - Base URL:', baseUrl);
      console.log('StoreDetailScreen - Image path:', imagePath);
      
      return { uri: fullUrl };
    }
    
    console.log('StoreDetailScreen - Using fallback image');
    return require('@/assets/images/placeholder.png');
  };

  const renderCategory = ({ item }: { item: Category }) => {
    const isSelected = selectedCategory === item.id;
    return (
      <TouchableOpacity
        style={[
          styles.categoryChip,
          isSelected && styles.categoryChipSelected
        ]}
        onPress={() => handleCategoryPress(item.id)}
      >
        <Text style={[
          styles.categoryChipText,
          isSelected && styles.categoryChipTextSelected
        ]}>
          {item.cate_name}
        </Text>
      </TouchableOpacity>
    );
  };

  const renderFood = ({ item }: { item: Food }) => (
    <View style={styles.foodCard}>
      <FoodCard
        food={item}
        onPress={() => handleFoodPress(item.id)}
        onAddToCart={() => handleAddToCart(item.id)}
      />
    </View>
  );

  if (loading && !currentStore) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />
        <Text>Đang tải...</Text>
      </View>
    );
  }

  if (!currentStore) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />
        <Text>Không tìm thấy cửa hàng</Text>
        <TouchableOpacity 
          style={styles.retryButton}
          onPress={() => dispatch(fetchStoreDetail(storeId))}
        >
          <Text style={styles.retryButtonText}>Thử lại</Text>
        </TouchableOpacity>
      </View>
    );
  }

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
        <Text style={styles.headerTitle} numberOfLines={1}>
          {currentStore.store_name}
        </Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[COLORS.primary]}
            tintColor={COLORS.primary}
          />
        }
      >
        {/* Store Info */}
        <View style={styles.storeInfoSection}>
          <Image
            source={getImageSource(currentStore.image)}
            style={styles.storeImage}
            resizeMode="cover"
            onError={(error) => {
              console.log('StoreDetailScreen - Image load error:', error.nativeEvent.error);
            }}
            defaultSource={require('@/assets/images/placeholder.png')}
          />
          
          <View style={styles.storeDetails}>
            <Text style={styles.storeName}>{currentStore.store_name}</Text>
            <Text style={styles.storeDescription}>
              {currentStore.description || 'Cửa hàng thực phẩm chất lượng cao'}
            </Text>
            
            <View style={styles.storeStats}>
              <View style={styles.statItem}>
                <Ionicons name="star" size={16} color="#FFB800" />
                <Text style={styles.statText}>
                  {storeStats?.average_rating || '0.0'}
                </Text>
                <Text style={styles.statLabel}>
                  ({storeStats?.total_ratings || 0} đánh giá)
                </Text>
              </View>
              
              <View style={styles.statItem}>
                <Ionicons name="restaurant-outline" size={16} color={COLORS.gray500} />
                <Text style={styles.statText}>
                  {storeStats?.total_foods || 0}
                </Text>
                <Text style={styles.statLabel}>món ăn</Text>
              </View>
              
              <View style={styles.statItem}>
                <Ionicons name="receipt-outline" size={16} color={COLORS.gray500} />
                <Text style={styles.statText}>
                  {storeStats?.total_orders || 0}
                </Text>
                <Text style={styles.statLabel}>đơn hàng</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Categories Filter */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Danh mục món ăn</Text>
          
          <FlatList
            data={categories || []}
            renderItem={renderCategory}
            keyExtractor={(item) => item.id.toString()}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoriesContainer}
          />
        </View>

        {/* Foods List */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              {selectedCategory 
                ? `Món ${(categories || []).find(c => c.id === selectedCategory)?.cate_name || ''} (${(storeFoods || []).length})`
                : `Tất cả món ăn (${storeStats ? storeStats.total_foods : (storeFoods || []).length})`
              }
            </Text>
            
            {selectedCategory && (
              <TouchableOpacity
                onPress={() => {
                  setSelectedCategory(null);
                  fetchStoreFoods(1, undefined, true);
                }}
                style={styles.clearFilterButton}
              >
                <Text style={styles.clearFilterText}>Xóa bộ lọc</Text>
              </TouchableOpacity>
            )}
          </View>
          
          <FlatList
            data={storeFoods || []}
            renderItem={renderFood}
            keyExtractor={(item) => item.id.toString()}
            numColumns={2}
            scrollEnabled={false}
            contentContainerStyle={styles.foodsGrid}
            columnWrapperStyle={styles.foodsRow}
            onEndReached={handleLoadMore}
            onEndReachedThreshold={0.1}
            ListEmptyComponent={
              foodsLoading ? (
                <View style={styles.emptyState}>
                  <Text>Đang tải danh sách món ăn...</Text>
                </View>
              ) : (
                <View style={styles.emptyState}>
                  <Text>Không có món ăn nào</Text>
                </View>
              )
            }
            ListFooterComponent={
              foodsLoading && (storeFoods || []).length > 0 ? (
                <View style={styles.loadingFooter}>
                  <Text>Đang tải thêm...</Text>
                </View>
              ) : null
            }
          />
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  header: {
    backgroundColor: COLORS.primary,
    paddingTop: 50,
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    ...SHADOWS.sm,
  },
  
  backButton: {
    padding: SPACING.xs,
  },
  
  headerTitle: {
    flex: 1,
    color: COLORS.white,
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginHorizontal: SPACING.sm,
  },
  
  headerRight: {
    width: 32, // Same as back button to center title
  },
  
  content: {
    flex: 1,
  },
  
  storeInfoSection: {
    backgroundColor: COLORS.white,
    marginBottom: SPACING.sm,
  },
  
  storeImage: {
    width: '100%',
    height: 200,
  },
  
  storeDetails: {
    padding: SPACING.lg,
  },
  
  storeName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  
  storeDescription: {
    fontSize: 16,
    color: COLORS.textSecondary,
    lineHeight: 24,
    marginBottom: SPACING.md,
  },
  
  storeStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  
  statText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  
  statLabel: {
    fontSize: 12,
    color: COLORS.gray500,
  },
  
  section: {
    backgroundColor: COLORS.white,
    padding: SPACING.lg,
    marginBottom: SPACING.sm,
  },
  
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  
  categoriesContainer: {
    paddingVertical: SPACING.sm,
  },
  
  categoryChip: {
    backgroundColor: COLORS.gray100,
    borderRadius: BORDER_RADIUS.full,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    marginRight: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  
  categoryChipSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  
  categoryChipText: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.text,
  },
  
  categoryChipTextSelected: {
    color: COLORS.white,
  },
  
  clearFilterButton: {
    padding: SPACING.xs,
  },
  
  clearFilterText: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: '500',
  },
  
  foodsGrid: {
    paddingBottom: SPACING.md,
  },
  
  foodsRow: {
    justifyContent: 'space-between',
  },
  
  foodCard: {
    width: '48%',
    marginBottom: SPACING.md,
  },
  
  loadingFooter: {
    padding: SPACING.lg,
    alignItems: 'center',
  },
  
  emptyState: {
    padding: SPACING.lg,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 100,
  },
  
  retryButton: {
    backgroundColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.md,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.lg,
    marginTop: SPACING.md,
  },
  
  retryButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '600',
  },
});