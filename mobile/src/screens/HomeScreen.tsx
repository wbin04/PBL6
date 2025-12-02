import React, { useEffect, useState } from 'react';
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
} from 'react-native';
import { useNavigation, CompositeNavigationProp } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MainTabParamList, RootStackParamList, Category, Food, Store } from '@/types';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '@/store';
import { fetchCategories, fetchFoods } from '@/store/slices/menuSlice';
import { fetchStores } from '@/store/slices/storesSlice';
import { CategoryCard, FoodCard, StoreCard } from '@/components';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, BORDER_RADIUS } from '@/constants';

const { width } = Dimensions.get('window');

export const HomeScreen: React.FC = () => {
  type HomeNavigationProp = CompositeNavigationProp<
    BottomTabNavigationProp<MainTabParamList, 'Home'>,
    NativeStackNavigationProp<RootStackParamList>
  >;
  const navigation = useNavigation<HomeNavigationProp>();
  const dispatch = useDispatch<AppDispatch>();
  
  const { categories, foods, loading } = useSelector((state: RootState) => state.menu);
  const { stores, loading: storesLoading } = useSelector((state: RootState) => state.stores);
  const [refreshing, setRefreshing] = useState(false);
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const { user } = useSelector((state: RootState) => state.auth);

  // Debug log để kiểm tra state
  console.log('showNotificationModal:', showNotificationModal);

  useEffect(() => {
    dispatch(fetchCategories());
    dispatch(fetchFoods({ page: 1 }));
    dispatch(fetchStores());
  }, [dispatch]);

  const handleCategoryPress = (categoryId: number) => {
    navigation.navigate('Menu', { categoryId, showAllCategories: false, showAllFoods: false });
  };

  const handleFoodPress = (foodId: number) => {
    navigation.navigate('FoodDetail', { foodId });
  };

  const handleStorePress = (storeId: number) => {
    navigation.navigate('StoreDetail', { storeId });
  };

  const handleAddToCart = (foodId: number) => {
    console.log('Add to cart:', foodId);
  };

  const handleSearchPress = () => {
    // Navigate to Menu tab and focus on search input
    navigation.navigate('Menu', { 
      focusSearch: true,
      showAllCategories: false, 
      showAllFoods: false 
    });
  };

  const handleViewAllCategories = () => {
    // Navigate to Menu tab and show category modal
    navigation.navigate('Menu', { 
      showCategoryModal: true,
      showAllCategories: true, 
      showAllFoods: false 
    });
  };

  const handleViewAllFoods = () => {
    navigation.navigate('Menu', { 
      showAllFoods: true, 
      showAllCategories: false 
    });
  };

  const renderCategory = ({ item, index }: { item: Category; index: number }) => (
    <View style={[styles.categoryWrapper, index % 2 === 1 && styles.categoryWrapperRight]}>
      <CategoryCard
        category={item}
        onPress={() => handleCategoryPress(item.id)}
      />
    </View>
  );

  const renderFoodHorizontal = ({ item }: { item: Food }) => (
    <View style={styles.horizontalFoodCard}>
      <FoodCard
        food={item}
        onPress={() => handleFoodPress(item.id)}
        onAddToCart={() => handleAddToCart(item.id)}
      />
    </View>
  );

  const renderStoreHorizontal = ({ item }: { item: Store }) => (
    <StoreCard
      store={item}
      onPress={() => handleStorePress(item.id)}
    />
  );

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await dispatch(fetchCategories());
      await dispatch(fetchFoods({ page: 1 }));
      await dispatch(fetchStores());
    } finally {
      setRefreshing(false);
    }
  };

  const getCurrentGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Chào buổi sáng';
    if (hour < 18) return 'Chào buổi chiều';
    return 'Chào buổi tối';
  };

  const handleNotificationPress = () => {
    console.log('Notification pressed!'); // Debug log
    setShowNotificationModal(true);
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />
      
      {/* Enhanced Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View style={styles.userInfo}>
            <Text style={styles.greeting}>
              {getCurrentGreeting()}{user ? `, ${user.username}` : ', Khách hàng'}! 👋
            </Text>
          </View>
          
          {/* Notification Bell */}
          <TouchableOpacity style={styles.notificationButton} onPress={handleNotificationPress}>
            <Ionicons name="notifications-outline" size={24} color={COLORS.white} />
            <View style={styles.notificationBadge}>
              <Text style={styles.notificationCount}>{3}</Text>
            </View>
          </TouchableOpacity>
        </View>
        
        <Text style={styles.subtitle}>Bạn muốn ăn gì hôm nay?</Text>
        
        {/* Quick Action Cards */}
        <View style={styles.quickActions}>
          <TouchableOpacity style={styles.quickAction} onPress={() => navigation.navigate('Menu')}>
            <Ionicons name="restaurant" size={20} color={COLORS.primary} />
            <Text style={styles.quickActionText}>Menu</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.quickAction} onPress={handleSearchPress}>
            <Ionicons name="search" size={20} color={COLORS.primary} />
            <Text style={styles.quickActionText}>Tìm kiếm</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.quickAction}>
            <Ionicons name="gift" size={20} color={COLORS.primary} />
            <Text style={styles.quickActionText}>Ưu đãi</Text>
          </TouchableOpacity>
        </View>
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
        {/* Categories Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleContainer}>
              <Ionicons name="grid" size={20} color={COLORS.primary} />
              <Text style={styles.sectionTitle}>Danh mục</Text>
            </View>
            <TouchableOpacity 
              style={styles.seeAllButton}
              onPress={handleViewAllCategories}
            >
              <Text style={styles.seeAll}>Xem tất cả</Text>
              <Ionicons name="arrow-forward" size={16} color={COLORS.primary} />
            </TouchableOpacity>
          </View>
          
          <FlatList
            data={(categories ?? []).slice(0, 6)}
            renderItem={renderCategory}
            keyExtractor={(item) => item.id.toString()}
            numColumns={2}
            scrollEnabled={false}
            contentContainerStyle={styles.categoriesGrid}
            columnWrapperStyle={styles.categoryRow}
          />
        </View>

        {/* Stores Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleContainer}>
              <Ionicons name="storefront" size={20} color={COLORS.primary} />
              <Text style={styles.sectionTitle}>Cửa hàng nổi bật</Text>
            </View>
            <TouchableOpacity 
              style={styles.seeAllButton}
              onPress={() => {}} // TODO: Navigate to stores list
            >
              <Text style={styles.seeAll}>Xem tất cả</Text>
              <Ionicons name="arrow-forward" size={16} color={COLORS.primary} />
            </TouchableOpacity>
          </View>
          
          <FlatList
            data={stores ?? []}
            renderItem={renderStoreHorizontal}
            keyExtractor={(item) => item.id.toString()}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.horizontalStoreList}
          />
        </View>

        {/* Popular Foods Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleContainer}>
              <Ionicons name="trending-up" size={20} color={COLORS.primary} />
              <Text style={styles.sectionTitle}>Món phổ biến</Text>
            </View>
            <TouchableOpacity 
              style={styles.seeAllButton}
              onPress={handleViewAllFoods}
            >
              <Text style={styles.seeAll}>Xem tất cả</Text>
              <Ionicons name="arrow-forward" size={16} color={COLORS.primary} />
            </TouchableOpacity>
          </View>
          
          <FlatList
            data={(foods ?? []).slice(0, 6)}
            renderItem={renderFoodHorizontal}
            keyExtractor={(item) => item.id.toString()}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.horizontalFoodList}
          />
        </View>

        {/* Featured Section */}
        <View style={styles.section}>
          <View style={styles.featuredBanner}>
            <View style={styles.featuredContent}>
              <Text style={styles.featuredTitle}>
                {'🎉 Ưu đãi đặc biệt'}
              </Text>
              <Text style={styles.featuredSubtitle}>Giảm 30% cho đơn hàng đầu tiên</Text>
              <TouchableOpacity style={styles.featuredButton}>
                <Text style={styles.featuredButtonText}>Khám phá ngay</Text>
              </TouchableOpacity>
            </View>
            <Ionicons name="gift" size={60} color={COLORS.white} style={styles.featuredIcon} />
          </View>
        </View>

        {/* Recent Orders or Recommendations */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleContainer}>
              <Ionicons name="heart" size={20} color={COLORS.primary} />
              <Text style={styles.sectionTitle}>Có thể bạn thích</Text>
            </View>
          </View>
          
          <FlatList
            data={(foods ?? []).slice(4, 6)}
            renderItem={({ item }) => (
              <View style={styles.verticalFoodCard}>
                <FoodCard
                  food={item}
                  onPress={() => handleFoodPress(item.id)}
                  onAddToCart={() => handleAddToCart(item.id)}
                />
              </View>
            )}
            keyExtractor={(item) => item.id.toString()}
            numColumns={2}
            scrollEnabled={false}
            contentContainerStyle={styles.recommendationsGrid}
            columnWrapperStyle={styles.recommendationRow}
          />
        </View>
      </ScrollView>
      
      {/* TODO: Add NotificationModal component when created */}
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
    paddingBottom: SPACING.xl,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    elevation: 10,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.sm,
  },
  
  userInfo: {
    flex: 1,
  },
  
  greeting: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.white,
    marginBottom: SPACING.xs,
  },
  
  notificationButton: {
    position: 'relative',
    padding: 8,
  },
  
  notificationBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: '#FF6B6B',
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  notificationCount: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: 'bold',
  },
  
  subtitle: {
    fontSize: 16,
    color: COLORS.white,
    opacity: 0.9,
    marginBottom: SPACING.lg,
  },
  
  quickActions: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  
  quickAction: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.lg,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  
  quickActionText: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '600',
  },
  
  content: {
    flex: 1,
    paddingHorizontal: SPACING.lg,
    marginTop: SPACING.lg,
  },
  
  section: {
    marginBottom: SPACING.xl,
  },
  
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
    paddingHorizontal: SPACING.sm,
  },
  
  sectionTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  
  seeAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  
  seeAll: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: '600',
  },
  
  categoriesGrid: {
    paddingHorizontal: SPACING.sm,
  },
  
  categoryRow: {
    justifyContent: 'space-between',
    marginBottom: SPACING.sm,
  },
  
  categoryWrapper: {
    width: '48%',
  },
  
  categoryWrapperRight: {
    marginLeft: '4%',
  },
  
  horizontalFoodList: {
    paddingHorizontal: SPACING.sm,
  },

  horizontalStoreList: {
    paddingHorizontal: SPACING.sm,
  },
  
  horizontalFoodCard: {
    width: width * 0.7,
    marginRight: SPACING.md,
  },
  
  featuredBanner: {
    backgroundColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.lg,
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: SPACING.sm,
    elevation: 8,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  
  featuredContent: {
    flex: 1,
  },
  
  featuredTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.white,
    marginBottom: SPACING.xs,
  },
  
  featuredSubtitle: {
    fontSize: 14,
    color: COLORS.white,
    opacity: 0.9,
    marginBottom: SPACING.md,
  },
  
  featuredButton: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.md,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.lg,
    alignSelf: 'flex-start',
  },
  
  featuredButtonText: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  
  featuredIcon: {
    opacity: 0.3,
  },
  
  recommendationsGrid: {
    paddingHorizontal: SPACING.sm,
  },
  
  recommendationRow: {
    justifyContent: 'space-between',
  },
  
  verticalFoodCard: {
    width: '48%',
  },
});
