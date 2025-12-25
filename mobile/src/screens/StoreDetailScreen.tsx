import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  StatusBar,
  RefreshControl,
  Dimensions,
  Image,
  Alert,
  Modal,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList, Category, Food } from '@/types';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '@/store';
import { fetchStoreDetail } from '@/store/slices/storesSlice';
import { fetchCategories } from '@/store/slices/menuSlice';
import { FoodCard } from '@/components';
import { Ionicons } from '@expo/vector-icons';
import { MoreHorizontal, Home as HomeIcon } from 'lucide-react-native';
import { COLORS, SPACING, BORDER_RADIUS, SHADOWS, API_CONFIG } from '@/constants';
import { storesService } from '@/services';
import { Fonts } from '@/constants/Fonts';

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
  
  // Popup menu state
  const [menuVisible, setMenuVisible] = useState(false);
  const goHome = () => {
    setMenuVisible(false);
    navigation.navigate('MainTabs');
  };

  const [refreshing, setRefreshing] = useState(false);
  const [storeFoods, setStoreFoods] = useState<Food[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [foodsLoading, setFoodsLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMoreFoods, setHasMoreFoods] = useState(true);
  const [storeStats, setStoreStats] = useState<StoreStats | null>(null);

  // Fetch store detail when component mounts
  useEffect(() => {
    if (storeId) {
      dispatch(fetchStoreDetail(storeId));
      dispatch(fetchCategories());
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
        <Text
          style={[
            styles.categoryChipText,
            isSelected && styles.categoryChipTextSelected
          ]}
        >
          {item.cate_name}
        </Text>
      </TouchableOpacity>
    );
  };

  const renderFood = ({ item }: { item: Food }) => (
    <FoodCard
      food={item}
      onPress={() => handleFoodPress(item.id)}
      onAddToCart={() => handleAddToCart(item.id)}
      style={styles.foodCard}
    />
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
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <StatusBar
        barStyle="light-content"
        backgroundColor="transparent"
        translucent
      />

      <FlatList
        data={storeFoods || []}
        renderItem={renderFood}
        keyExtractor={(item) => item.id.toString()}
        numColumns={2}
        columnWrapperStyle={styles.foodsRow}
        contentContainerStyle={styles.listContent}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.1}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[COLORS.primary]}
            tintColor={COLORS.primary}
          />
        }
        ListHeaderComponent={
          <>
            {/* Cover image + back button giống layout RestaurantDetail */}
            <View style={styles.coverWrap}>
              <Image
                source={getImageSource(currentStore.image)}
                style={styles.coverImage}
                resizeMode="cover"
                onError={(error) => {
                  console.log(
                    'StoreDetailScreen - Image load error:',
                    error.nativeEvent.error
                  );
                }}
                defaultSource={require('@/assets/images/placeholder.png')}
              />

              <View style={styles.topBar}>
                <TouchableOpacity
                  style={styles.topBtn}
                  onPress={() => navigation.goBack()}
                  activeOpacity={0.8}
                >
                  <Ionicons name="arrow-back" size={18} color={COLORS.text} />
                </TouchableOpacity>
                <Pressable
                  style={styles.topBtn}
                  onPress={() => setMenuVisible(true)}
                >
                  <MoreHorizontal size={20} color={COLORS.text} />
                </Pressable>
              </View>
                  {/* ===== MENU POPUP ===== */}
                  <Modal transparent visible={menuVisible} animationType="fade">
                    <Pressable
                      style={styles.menuOverlay}
                      onPress={() => setMenuVisible(false)}
                    >
                      <View style={styles.menuBox}>
                        <Pressable style={styles.menuItem} onPress={goHome}>
                          <HomeIcon size={18} color={COLORS.text} />
                          <Text style={styles.menuText}>Về trang chủ</Text>
                        </Pressable>
                      </View>
                    </Pressable>
                  </Modal>
            </View>

            {/* Thông tin cửa hàng + stats */}
            <View style={styles.storeDetailsCard}>
              <View style={styles.inlineMeta}>
                <View style={styles.metaItem}>
                  <Ionicons name="star" size={16} color="#F59E0B" />
                  <Text style={styles.metaBold}>
                    {storeStats?.average_rating
                      ? Number(storeStats.average_rating).toFixed(1)
                      : '0.0'}
                  </Text>
                  <Text style={styles.metaGray}>
                    ({storeStats?.total_ratings || 0} đánh giá)
                  </Text>
                </View>

                <View style={styles.metaItem}>
                  <Ionicons
                    name="restaurant-outline"
                    size={16}
                    color={COLORS.gray500}
                  />
                  <Text style={styles.metaGray}>
                    {storeStats?.total_foods || storeFoods.length} món
                  </Text>
                </View>

                <View style={styles.metaItem}>
                  <Ionicons
                    name="receipt-outline"
                    size={16}
                    color={COLORS.gray500}
                  />
                  <Text style={styles.metaGray}>
                    {storeStats?.total_orders || 0} đơn
                  </Text>
                </View>
              </View>

              <Text style={styles.storeName}>{currentStore.store_name}</Text>
              <Text style={styles.storeDescription}>
                {currentStore.description || 'Cửa hàng thực phẩm chất lượng cao'}
              </Text>
            </View>

            {/* Danh mục món ăn (tabs) */}
            <View style={styles.categoriesSection}>
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

            {/* Title list món ăn + nút xoá bộ lọc */}
            <View style={styles.foodHeaderRow}>
              <Text style={styles.sectionTitle}>
                {selectedCategory
                  ? `Món ${
                      (categories || []).find(
                        (c) => c.id === selectedCategory
                      )?.cate_name || ''
                    } (${(storeFoods || []).length})`
                  : `Tất cả món ăn (${
                      storeStats ? storeStats.total_foods : (storeFoods || []).length
                    })`}
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
          </>
        }
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
    </SafeAreaView>
  );
};

const R = 24;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  /* ===== MENU POPUP ===== */
  menuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.15)',
    justifyContent: 'flex-start',
    paddingTop: 90,
    paddingRight: 16,
    alignItems: 'flex-end',
  },
  menuBox: {
    backgroundColor: '#fff',
    borderRadius: 12,
    width: 180,
    paddingVertical: 8,
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 1, height: 2 },
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  menuText: {
    fontFamily: Fonts.LeagueSpartanMedium,
    fontSize: 14,
    color: COLORS.text,
  },

  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },

  // === Cover + top bar ===
  coverWrap: {
    width: '100%',
    height: 260,
    borderBottomLeftRadius: R,
    borderBottomRightRadius: R,
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

  // === Store details ===
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
    fontWeight: 'bold',
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

  // === Categories section ===
  categoriesSection: {
    backgroundColor: COLORS.white,
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.md,
    paddingTop: SPACING.sm,
    marginBottom: SPACING.xs,
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
    fontFamily: Fonts.LeagueSpartanSemiBold,
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
    fontFamily: Fonts.LeagueSpartanMedium,
  },

  categoryChipTextSelected: {
    color: COLORS.white,
    fontFamily: Fonts.LeagueSpartanSemiBold,
  },

  clearFilterButton: {
    padding: SPACING.xs,
  },

  clearFilterText: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: '500',
    fontFamily: Fonts.LeagueSpartanMedium,
  },

  // === List header cho phần món ăn ===
  foodHeaderRow: {
    backgroundColor: COLORS.white,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },

  // === Foods grid ===
  listContent: {
    paddingBottom: SPACING.xl,
  },

  foodsRow: {
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
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
    fontFamily: Fonts.LeagueSpartanSemiBold,
  },
});
