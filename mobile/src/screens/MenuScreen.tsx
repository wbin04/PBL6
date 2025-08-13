import React, { useEffect, useState, useRef } from 'react';
import { StatusBar } from 'expo-status-bar';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  TextInput,
  TouchableOpacity,
  Modal,
} from 'react-native';
import { useNavigation, useRoute, RouteProp, CompositeNavigationProp } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useDispatch, useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import {
  fetchCategories,
  fetchFoods,
  fetchFoodsByCategory,
} from '@/store/slices/menuSlice';
import { MainTabParamList, RootStackParamList, Category, Food } from '@/types';
import { RootState, AppDispatch } from '@/store';
import { FoodCard } from '@/components';
import { COLORS, SPACING, BORDER_RADIUS } from '@/constants';

// Menu screen with category filter and search
type MenuRouteProp = RouteProp<MainTabParamList, 'Menu'>;
type MenuNavigationProp = CompositeNavigationProp<
  BottomTabNavigationProp<MainTabParamList, 'Menu'>,
  NativeStackNavigationProp<RootStackParamList>
>;

const MenuScreen: React.FC = () => {
  const route = useRoute<MenuRouteProp>();
  const navigation = useNavigation<MenuNavigationProp>();
  const dispatch = useDispatch<AppDispatch>();
  const { categories, foods, loading } = useSelector((state: RootState) => state.menu);
  const { user } = useSelector((state: RootState) => state.auth);

  const [searchText, setSearchText] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<number>(
    route.params?.categoryId ?? 0,
  );
  const [displayedFoods, setDisplayedFoods] = useState<Food[]>([]);
  const [showCategoryModal, setShowCategoryModal] = useState<boolean>(false);
  const searchInputRef = useRef<TextInput>(null);

  // handle navigation params: focus search input or open category modal
  useEffect(() => {
    if (route.params?.focusSearch) {
      searchInputRef.current?.focus();
    }
    if (route.params?.showCategoryModal) {
      setShowCategoryModal(true);
    }
  }, [route.params?.focusSearch, route.params?.showCategoryModal]);

  // initial load when route param changes
  useEffect(() => {
    dispatch(fetchCategories());
    const catId = route.params?.categoryId ?? 0;
    setSelectedCategory(catId);
    if (catId === 0) {
      dispatch(fetchFoods({ page: 1 }));
    } else {
      dispatch(fetchFoodsByCategory({ categoryId: catId, page: 1 }));
    }
  }, [dispatch, route.params?.categoryId]);

  // apply searchText filter
  useEffect(() => {
    let list = foods;
    if (searchText.trim()) {
      const lower = searchText.toLowerCase();
      list = list.filter(item => item.title.toLowerCase().includes(lower));
    }
    setDisplayedFoods(list);
  }, [foods, searchText]);

  const onCategoryChange = (value: number) => {
    setSelectedCategory(value);
    if (value === 0) {
      dispatch(fetchFoods({ page: 1 }));
    } else {
      dispatch(fetchFoodsByCategory({ categoryId: value, page: 1 }));
    }
    setSearchText('');
    setShowCategoryModal(false);
  };

  const getSelectedCategoryName = () => {
    if (selectedCategory === 0) return 'Tất cả danh mục';
    const category = categories.find(cat => cat.id === selectedCategory);
    return category?.cate_name || 'Tất cả danh mục';
  };

  const handleFoodPress = (foodId: number) => {
    navigation.navigate('FoodDetail', { foodId });
  };

  if (loading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar style="light" backgroundColor={COLORS.primary} />
      <View style={styles.header}>
        <Text style={styles.greeting}>
          {user ? `Xin chào, ${user.username}!` : 'Chào mừng đến FastFood!'}
        </Text>
        <Text style={styles.subtitle}>Bạn muốn ăn gì hôm nay?</Text>
      </View>
      
      <View style={styles.filterContainer}>
        {/* Search Input with Icon */}
        <View style={styles.searchContainer}>
          <View style={styles.searchInputWrapper}>
              <Ionicons 
              name="search" 
              size={20} 
              color={COLORS.gray500} 
              style={styles.searchIcon}
            />
            <TextInput
              ref={searchInputRef}
              style={styles.searchInput}
              placeholder="Tìm kiếm món ăn..."
              value={searchText}
              onChangeText={setSearchText}
              placeholderTextColor={COLORS.gray500}
            />
            {searchText.length > 0 && (
              <TouchableOpacity 
                style={styles.clearButton}
                onPress={() => setSearchText('')}
              >
                <Ionicons name="close-circle" size={20} color={COLORS.gray500} />
              </TouchableOpacity>
            )}
          </View>
          <TouchableOpacity 
            style={styles.searchButton}
            onPress={() => {}}
          >
            <Ionicons name="search" size={20} color={COLORS.white} />
          </TouchableOpacity>
        </View>

        {/* Custom Category Picker */}
        <TouchableOpacity
          style={styles.categorySelector}
          onPress={() => setShowCategoryModal(true)}
        >
          <View style={styles.categorySelectorContent}>
            <Ionicons 
              name="restaurant" 
              size={20} 
              color={COLORS.primary} 
              style={styles.categoryIcon}
            />
            <Text style={styles.categoryText}>
              {getSelectedCategoryName()}
            </Text>
            <Ionicons 
              name="chevron-down" 
              size={20} 
              color={COLORS.gray500}
            />
          </View>
        </TouchableOpacity>
      </View>

      {/* Category Selection Modal */}
      <Modal
        visible={showCategoryModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowCategoryModal(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowCategoryModal(false)}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Chọn danh mục</Text>
              <TouchableOpacity
                onPress={() => setShowCategoryModal(false)}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={24} color={COLORS.gray500} />
              </TouchableOpacity>
            </View>
            
            <FlatList
              data={[{ id: 0, cate_name: 'Tất cả danh mục' }, ...categories]}
              keyExtractor={(item) => item.id.toString()}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.categoryOption,
                    selectedCategory === item.id && styles.selectedCategoryOption
                  ]}
                  onPress={() => onCategoryChange(item.id)}
                >
                  <Text style={[
                    styles.categoryOptionText,
                    selectedCategory === item.id && styles.selectedCategoryOptionText
                  ]}>
                    {item.cate_name}
                  </Text>
                  {selectedCategory === item.id && (
                    <Ionicons name="checkmark" size={20} color={COLORS.primary} />
                  )}
                </TouchableOpacity>
              )}
              showsVerticalScrollIndicator={false}
            />
          </View>
        </TouchableOpacity>
      </Modal>

      <FlatList
        data={displayedFoods}
        renderItem={({ item }) => (
          <View style={styles.foodCardContainer}>
            <FoodCard food={item} onPress={() => handleFoodPress(item.id)} />
          </View>
        )}
        keyExtractor={item => item.id.toString()}
        numColumns={2}
        contentContainerStyle={styles.list}
        columnWrapperStyle={styles.row}
      />
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
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.lg,
    borderBottomLeftRadius: 25,
    borderBottomRightRadius: 25,
  },
  greeting: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.white,
    marginBottom: SPACING.xs,
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.white,
    opacity: 0.9,
  },
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterContainer: {
    padding: SPACING.md,
    backgroundColor: COLORS.background,
  },
  
  // Search Container Styles
  searchContainer: {
    flexDirection: 'row',
    marginBottom: SPACING.sm,
    gap: SPACING.xs,
  },
  searchInputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: SPACING.sm,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  searchIcon: {
    marginRight: SPACING.xs,
  },
  searchInput: {
    flex: 1,
    paddingVertical: SPACING.sm,
    fontSize: 16,
    color: COLORS.text,
  },
  clearButton: {
    marginLeft: SPACING.xs,
    padding: 4,
  },
  searchButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },

  // Category Selector Styles
  categorySelector: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.md,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  categorySelectorContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.md,
  },
  categoryIcon: {
    marginRight: SPACING.xs,
  },
  categoryText: {
    flex: 1,
    fontSize: 16,
    color: COLORS.text,
    fontWeight: '500',
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.lg,
    width: '85%',
    maxHeight: '70%',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
  borderBottomColor: COLORS.divider,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  closeButton: {
    padding: SPACING.xs,
  },
  categoryOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
  borderBottomColor: COLORS.divider,
  },
  selectedCategoryOption: {
  backgroundColor: `${COLORS.primary}10`,
  },
  categoryOptionText: {
    fontSize: 16,
    color: COLORS.text,
  },
  selectedCategoryOptionText: {
    color: COLORS.primary,
    fontWeight: '600',
  },

  // List Styles
  list: {
    paddingBottom: SPACING.md,
    paddingHorizontal: SPACING.sm,
  },
  row: {
    justifyContent: 'space-between',
  },
  foodCardContainer: {
    width: '48%', // Slightly less than 50% to account for spacing
    marginBottom: SPACING.sm,
  },
});

export default MenuScreen;