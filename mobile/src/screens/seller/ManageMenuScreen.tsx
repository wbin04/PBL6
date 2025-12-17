import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image, Switch, TouchableWithoutFeedback, ActivityIndicator, Alert, Dimensions, TextInput } from 'react-native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Swipeable } from 'react-native-gesture-handler';
import { Trash2, Menu, X, ShoppingBag, Plus, User } from 'lucide-react-native';
import { useSelector } from 'react-redux';
import { RootState } from '../../store/index';
import axios from 'axios';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { API_CONFIG } from '@/constants';
import { IMAGE_MAP, type ImageName } from "@/assets/imageMap";
import { Fonts } from '@/constants/Fonts';
import Sidebar from '@/components/sidebar';

const menuItems = [
  { title: 'Trang chủ', icon: Menu, section: 'dashboard' },
  { title: 'Mua hàng', icon: ShoppingBag, section: 'buy' },
  { title: 'Quản lí món ăn', icon: ShoppingBag, section: 'foods' },
  { title: 'Quản lí đơn hàng', icon: ShoppingBag, section: 'orders' },
  { title: 'Quản lí khuyến mãi', icon: ShoppingBag, section: 'promotions' },
  { title: 'Thống kê', icon: Menu, section: 'analytics' },
];

const { width: screenWidth } = Dimensions.get('window');

interface ManageMenuScreenProps {
  navigation: NativeStackNavigationProp<any>;
}

interface MenuItem {
  id: number;
  title: string;
  description: string;
  price: string;
  image: string;
  availability: string;
  average_rating?: number;
  rating_count?: number;
  store_name?: string;
  category?: {
    id: number;
    name: string;
  };
}

function getImageSource(img?: ImageName | string) {
  if (typeof img === "string" && img.startsWith("assets/")) {
    const baseUrl = API_CONFIG.BASE_URL.replace("/api", "");
    const fullUrl = `${baseUrl}/media/${img}`;
    return { uri: fullUrl };
  }
  
  if (typeof img === "string" && !img.startsWith("/") && !img.includes("://")) {
    const baseUrl = API_CONFIG.BASE_URL.replace("/api", "");
    const fullUrl = `${baseUrl}/media/${img}`;
    return { uri: fullUrl };
  }
  
  return require("@/assets/images/gourmet-burger.png");
}

const ManageMenuScreen: React.FC<ManageMenuScreenProps> = ({ navigation }) => {
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<any[]>([]);
  const [selectedTab, setSelectedTab] = useState('all');
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [searchText, setSearchText] = useState('');
  const { user, tokens } = useSelector((state: RootState) => state.auth);

  // Debug log để kiểm tra categories
  useEffect(() => {
    console.log('=== CATEGORIES STATE CHANGED ===');
    console.log('Categories length:', categories.length);
    console.log('Categories type:', typeof categories);
    console.log('Is array:', Array.isArray(categories));
    if (categories.length > 0) {
      console.log('First category:', categories[0]);
      console.log('Categories structure:', JSON.stringify(categories.slice(0, 3)));
    }
  }, [categories]);

  const hashString = (str: string): number => {
    let hash = 0;
    if (str.length === 0) return hash;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash);
  };

  const fetchMenu = useCallback(async () => {
    if (!user || !tokens?.access) {
      console.warn('No user or access token found');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      console.log('Fetching menu for store manager...');

      let allFoods: any[] = [];
      
      const endpoints = [
        `${API_CONFIG.BASE_URL}/menu/store/foods/`,
        `${API_CONFIG.BASE_URL}/menu/admin/foods/`,
      ];

      let success = false;
      
      for (const baseEndpoint of endpoints) {
        try {
          console.log(`Trying endpoint: ${baseEndpoint}`);
          let nextUrl: string | null = `${baseEndpoint}?page_size=100`;
          let page = 1;
          let endpointFoods: any[] = [];

          while (nextUrl) {
            console.log(`Fetching page ${page}: ${nextUrl}`);
            const response: any = await axios.get(nextUrl, {
              headers: {
                'Authorization': `Bearer ${tokens.access}`,
              },
            });
            const data: any = response.data;
            
            if (data.results && Array.isArray(data.results)) {
              endpointFoods = endpointFoods.concat(data.results);
              if (data.next) {
                nextUrl = data.next.startsWith('http') ? data.next : `${API_CONFIG.BASE_URL.replace('/api', '')}${data.next}`;
              } else if (data.has_next) {
                page++;
                nextUrl = `${baseEndpoint}?page=${page}&page_size=100`;
              } else {
                nextUrl = null;
              }
              console.log(`Page ${page}: loaded ${data.results.length} foods, total so far: ${endpointFoods.length}, has_next: ${data.has_next}`);
            } else if (Array.isArray(data.foods)) {
              endpointFoods = endpointFoods.concat(data.foods);
              nextUrl = null;
              console.log(`Non-paginated: loaded ${data.foods.length} foods`);
            } else if (Array.isArray(data)) {
              endpointFoods = endpointFoods.concat(data);
              nextUrl = null;
              console.log(`Array response: loaded ${data.length} foods`);
            } else {
              console.warn('Unexpected foods response structure:', data);
              nextUrl = null;
            }
          }
          
          if (endpointFoods.length > 0) {
            const mappedFoods = endpointFoods.map((food: any) => {
              let categoryObj = food.category;
              if (!categoryObj || typeof categoryObj !== 'object') {
                categoryObj = {
                  id: hashString(food.category_name || 'Chưa phân loại'),
                  name: food.category_name || 'Chưa phân loại'
                };
              } else if (!categoryObj.name) {
                categoryObj = {
                  ...categoryObj,
                  name: categoryObj.cate_name || food.category_name || 'Chưa phân loại'
                };
              }
              return {
                ...food,
                category: categoryObj
              };
            });
            
            allFoods = mappedFoods;
            console.log(`Successfully loaded ${allFoods.length} foods from ${baseEndpoint}`);
            
            const storeFoodCategories = mappedFoods.reduce((acc: any[], food: any) => {
              if (food.category) {
                const existingCategory = acc.find(cat => cat.id === food.category.id);
                if (!existingCategory) {
                  acc.push({
                    id: food.category.id,
                    name: food.category.name
                  });
                }
              }
              return acc;
            }, []);
            
            if (storeFoodCategories.length > 0) {
              setCategories(prev => {
                if (prev.length === 0) {
                  console.log(`Store categories loaded from foods: ${storeFoodCategories.length} categories`);
                  return storeFoodCategories;
                }
                const prevIds = prev.map(c => c.id).sort().join(',');
                const newIds = storeFoodCategories.map(c => c.id).sort().join(',');
                if (prevIds !== newIds) {
                  console.log(`Categories changed: ${prev.length} -> ${storeFoodCategories.length}`);
                  return storeFoodCategories;
                }
                return prev;
              });
            }
            
            success = true;
            break;
          } else {
            console.log(`No foods found from ${baseEndpoint}, trying next endpoint`);
          }
        } catch (endpointError: any) {
          console.warn(`Failed to fetch from ${baseEndpoint}:`, endpointError.response?.data || endpointError.message);
          continue;
        }
      }

      if (!success) {
        console.error('All endpoints failed');
        Alert.alert('Lỗi', 'Không thể tải danh sách món ăn từ bất kỳ endpoint nào');
      }
      
      setMenu(allFoods);
    } catch (error) {
      console.error('Error fetching menu:', error);
      Alert.alert('Lỗi', 'Không thể tải danh sách món ăn');
    } finally {
      setLoading(false);
    }
  }, [user, tokens]);

  useFocusEffect(
    useCallback(() => {
      fetchMenu();
    }, [fetchMenu])
  );

  const filteredMenu = React.useMemo(() => menu.filter(item => {
    const matchSearch = searchText.trim() === '' || 
      item.title?.toLowerCase().includes(searchText.toLowerCase()) ||
      item.description?.toLowerCase().includes(searchText.toLowerCase());
    
    if (selectedTab === 'all') return matchSearch;
    if (selectedTab === 'main') {
      return matchSearch && (
        item.category?.name?.toLowerCase().includes('chính') || 
        item.category?.name?.toLowerCase().includes('main')
      );
    }
    const categoryMatch = item.category?.id.toString() === selectedTab;
    return matchSearch && categoryMatch;
  }), [menu, searchText, selectedTab]);

  const categoryCounts = React.useMemo(() => {
    const counts: Record<number, number> = {};
    menu.forEach(item => {
      if (item.category?.id) {
        counts[item.category.id] = (counts[item.category.id] || 0) + 1;
      }
    });
    console.log('Category counts calculated:', counts);
    return counts;
  }, [menu]);

  const handleToggle = async (id: number) => {
    if (!user || !tokens?.access) return;
    
    try {
      const item = menu.find(item => item.id === id);
      if (!item) return;

      const newAvailability = item.availability === 'Còn hàng' ? 'Hết hàng' : 'Còn hàng';
      
      setMenu(prev => prev.map(item =>
        item.id === id ? { ...item, availability: newAvailability } : item
      ));

      await axios.put(`${API_CONFIG.BASE_URL}/menu/admin/foods/${id}/`, {
        availability: newAvailability,
      }, {
        headers: {
          'Authorization': `Bearer ${tokens.access}`,
        },
      });

      console.log(`Updated food ${id} availability to ${newAvailability}`);
    } catch (error) {
      console.error('Error updating availability:', error);
      fetchMenu();
      Alert.alert('Lỗi', 'Không thể cập nhật trạng thái món ăn');
    }
  };

  const handleDeleteFood = async (id: number) => {
    if (!user || !tokens?.access) return;

    Alert.alert(
      'Xác nhận xóa',
      'Bạn có chắc chắn muốn xóa món ăn này?',
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xóa',
          style: 'destructive',
          onPress: async () => {
            try {
              setMenu(prev => prev.filter(item => item.id !== id));

              await axios.delete(`${API_CONFIG.BASE_URL}/menu/admin/foods/${id}/`, {
                headers: {
                  'Authorization': `Bearer ${tokens.access}`,
                },
              });

              console.log(`Deleted food ${id}`);
            } catch (error) {
              console.error('Error deleting food:', error);
              fetchMenu();
              Alert.alert('Lỗi', 'Không thể xóa món ăn');
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loaderContainer} edges={['top']}>
        <ActivityIndicator size="large" color="#ea580c" />
        <Text style={styles.loadingText}>Đang tải...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Sidebar chung */}
      <Sidebar
        isOpen={sidebarVisible}
        onClose={() => setSidebarVisible(false)}
        menuItems={menuItems}
        onMenuItemPress={(section) => {
          setSidebarVisible(false);
          
          if (section === 'dashboard') {
            navigation.navigate('SellerDashboard');
          } else if (section === 'foods') {
            // Already on this screen
          } else if (section === 'promotions') {
            navigation.navigate('SellerVoucherManagementScreen');
          } else if (section === 'orders') {
            navigation.navigate('NewOrderListScreen');
          } else if (section === 'analytics') {
            navigation.navigate('SellerDashboard', { section: 'analytics' });
          } else if (section === 'buy') {
            navigation.reset({ index: 0, routes: [{ name: 'MainTabs' }] });
          }
        }}
      />

      {/* Header */}
      <View style={styles.headerWrap}>
        <View style={styles.headerTopRow}>
          <TouchableOpacity
            onPress={() => setSidebarVisible(true)}
            style={styles.roundIconBtn}
          >
            <Menu size={24} color="#eb5523" />
          </TouchableOpacity>

          <Text style={styles.headerTitle}>Quản lý thực đơn</Text>

          <TouchableOpacity 
            style={styles.roundIconBtn}
            onPress={() => navigation.navigate('SellerProfileScreen')}
          >
            <User size={24} color="#eb5523" />
          </TouchableOpacity>
        </View>

        {/* Search Box giữ nguyên */}
        <View style={styles.searchRow}>
          <View style={styles.searchBox}>
            <TextInput
              style={styles.searchInput}
              placeholder="Tìm theo tên món, mô tả..."
              placeholderTextColor="#9ca3af"
              value={searchText}
              onChangeText={setSearchText}
              returnKeyType="search"
            />
            {searchText.length > 0 ? (
              <TouchableOpacity
                onPress={() => setSearchText('')}
                style={styles.clearBtn}
              >
                <Ionicons name="close-circle" size={16} color="#9ca3af" />
              </TouchableOpacity>
            ) : null}
            <TouchableOpacity style={styles.searchBtn} activeOpacity={0.8}>
              <Ionicons name="search" size={16} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Category Tabs: KHÔNG còn nút Thêm trong tabs */}
      <View style={styles.tabs}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabsContent}
        >
          {/* Tab Tất cả */}
          <TouchableOpacity
            style={[styles.tab, selectedTab === 'all' && styles.tabActive]}
            onPress={() => setSelectedTab('all')}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.tabText,
                selectedTab === 'all' && styles.tabTextActive,
              ]}
            >
              Tất cả
            </Text>
            <View
              style={[
                styles.countBadge,
                selectedTab === 'all' && styles.countBadgeActive,
              ]}
            >
              <Text
                style={[
                  styles.countText,
                  selectedTab === 'all' && styles.countTextActive,
                ]}
              >
                {menu.length}
              </Text>
            </View>
          </TouchableOpacity>

          {/* Category tabs */}
          {categories && categories.length > 0
            ? categories
                .filter((cat) => cat && cat.id && cat.name)
                .map((category) => {
                  const count = categoryCounts[category.id] || 0;
                  const isActive = selectedTab === category.id.toString();
                  return (
                    <TouchableOpacity
                      key={category.id}
                      style={[styles.tab, isActive && styles.tabActive]}
                      onPress={() => {
                        setSelectedTab(category.id.toString());
                      }}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[styles.tabText, isActive && styles.tabTextActive]}
                        numberOfLines={1}
                      >
                        {category.name}
                      </Text>
                      <View
                        style={[
                          styles.countBadge,
                          isActive && styles.countBadgeActive,
                        ]}
                      >
                        <Text
                          style={[
                            styles.countText,
                            isActive && styles.countTextActive,
                          ]}
                        >
                          {count}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  );
                })
            : null}
        </ScrollView>
      </View>

      <View style={styles.foundWrap}>
        <Text style={styles.foundText}>
          Tìm thấy{' '}
          <Text style={styles.foundNum}>{filteredMenu.length}</Text> món ăn
        </Text>

        <TouchableOpacity
          style={styles.addBtn}
          onPress={() =>
            navigation.navigate('AddFoodScreen', {
              onRefresh: fetchMenu,
              categories: categories,
            })
          }
        >
          <Ionicons name="add" size={18} color="#fff" />
          <Text style={styles.addBtnText}>Thêm</Text>
        </TouchableOpacity>
      </View>

      {/* Menu list giữ nguyên */}
      <ScrollView
        style={styles.menuScrollView}
        contentContainerStyle={styles.menuScrollContent}
        showsVerticalScrollIndicator={false}
      >
        {filteredMenu.length === 0 ? (
          <View style={styles.emptyContainer}>
            <ShoppingBag
              size={64}
              color="#d1d5db"
              style={{ marginBottom: 16 }}
            />
            <Text style={styles.emptyText}>
              {searchText
                ? 'Không tìm thấy món ăn nào'
                : selectedTab === 'all'
                ? 'Chưa có món ăn nào'
                : 'Không có món trong danh mục này'}
            </Text>
            <Text style={styles.emptySubText}>
              {searchText
                ? 'Thử từ khóa khác'
                : selectedTab === 'all'
                ? 'Nhấn nút "Thêm" để bắt đầu'
                : 'Thử chọn danh mục khác'}
            </Text>
          </View>
        ) : (
          filteredMenu.map((item) => (
            <Swipeable
              key={item.id}
              renderRightActions={() => (
                <TouchableOpacity
                  style={styles.deleteBtn}
                  onPress={() => handleDeleteFood(item.id)}
                >
                  <Trash2 color="#fff" size={24} />
                </TouchableOpacity>
              )}
            >
              <TouchableWithoutFeedback
                onPress={() =>
                  navigation.navigate('FoodDetailScreen', item)
                }
              >
                <View style={styles.menuCard}>
                  <Image
                    source={getImageSource(item.image)}
                    style={styles.menuImage}
                  />
                  <View style={styles.menuInfo}>
                    <Text style={styles.menuName} numberOfLines={1}>
                      {item.title}
                    </Text>
                    <Text style={styles.menuPrice}>
                      {parseInt(item.price).toLocaleString()}₫
                    </Text>
                    <View style={styles.menuMeta}>
                      <Text style={styles.menuRating}>
                        ⭐ {item.average_rating?.toFixed(1) || '0.0'}
                      </Text>
                      <Text style={styles.menuDivider}>•</Text>
                      <Text style={styles.menuReviews}>
                        {item.rating_count || 0} đánh giá
                      </Text>
                      {item.category?.name ? (
                        <>
                          <Text style={styles.menuDivider}>•</Text>
                          <Text
                            style={styles.categoryBadge}
                            numberOfLines={1}
                          >
                            {item.category.name}
                          </Text>
                        </>
                      ) : null}
                    </View>
                  </View>
                  <View style={styles.menuActions}>
                    <Switch
                      value={item.availability === 'Còn hàng'}
                      onValueChange={() => handleToggle(item.id)}
                      trackColor={{ false: '#d1d5db', true: '#86efac' }}
                      thumbColor={
                        item.availability === 'Còn hàng'
                          ? '#22c55e'
                          : '#f3f4f6'
                      }
                    />
                    <TouchableOpacity
                      style={styles.editBtn}
                      onPress={() =>
                        navigation.navigate('EditFoodScreen', {
                          food: item,
                          onEditFood: fetchMenu,
                          categories: categories,
                        })
                      }
                    >
                      <Ionicons
                        name="create-outline"
                        size={18}
                        color="#ea580c"
                      />
                    </TouchableOpacity>
                  </View>
                </View>
              </TouchableWithoutFeedback>
            </Swipeable>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#ffffff',
  },
  loaderContainer: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center', 
    backgroundColor: '#ffffff',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 15,
    color: '#6b7280',
    fontFamily: Fonts.LeagueSpartanRegular,
  },

  headerWrap: {
    backgroundColor: '#f5cb58',
    paddingTop: 0,
    paddingBottom: 12,
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 20,
    marginBottom: 20,
    paddingHorizontal: 16,
  },
  roundIconBtn: {
    backgroundColor: '#FFFFFF',
    padding: 10,
    borderRadius: 999,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
    elevation: 1,
  },
  headerTitle: {
    fontSize: 20,
    color: '#ffffff',
    fontFamily: Fonts.LeagueSpartanExtraBold,
  },

  // Search Box
  searchRow: {
    paddingBottom: 8,
    paddingHorizontal: 16,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 999,
    paddingLeft: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  searchInput: {
    flex: 1,
    height: 42,
    fontSize: 14,
    color: '#111827',
    fontFamily: Fonts.LeagueSpartanRegular,
  },
  clearBtn: {
    paddingHorizontal: 4,
  },
  searchBtn: {
    height: 42,
    width: 42,
    borderRadius: 999,
    backgroundColor: '#EB552D',
    alignItems: 'center',
    justifyContent: 'center',
    margin: 4,
  },

  tabs: {
    backgroundColor: '#fff',
    paddingTop: 12,
    paddingBottom: 12,
  },
  tabsContent: {
    paddingHorizontal: 16,
    paddingRight: 24,
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: 10,
  },

  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ea580c',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
  },
  addBtnText: {
    color: '#fff',
    fontFamily: Fonts.LeagueSpartanBold,
    fontSize: 14,
  },
  
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: '#F2F3F5',
  },
  tabActive: {
    backgroundColor: '#EB552D',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  tabText: {
    color: '#6B7280',
    fontFamily: Fonts.LeagueSpartanMedium,
    fontSize: 14,
  },
  tabTextActive: {
    color: '#FFFFFF',
    fontFamily: Fonts.LeagueSpartanSemiBold,
    fontSize: 14,
  },
  countBadge: {
    marginLeft: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    backgroundColor: '#e5e7eb',
  },
  countBadgeActive: {
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  countText: {
    fontSize: 11,
    color: '#6b7280',
    fontFamily: Fonts.LeagueSpartanBold,
  },
  countTextActive: {
    color: '#fff',
  },

  // Found Bar
  foundWrap: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
    backgroundColor: '#F6F7F8',
    paddingVertical: 8,
    paddingHorizontal: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  foundText: {
    color: '#6B7280',
    marginLeft: 6,
    fontSize: 15,
    fontFamily: Fonts.LeagueSpartanRegular,
  },
  foundNum: {
    color: '#111827',
    fontFamily: Fonts.LeagueSpartanBold,
  },

  // Menu List
  menuScrollView: {
    flex: 1,
  },
  menuScrollContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 100,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
  },
  emptyText: {
    fontSize: 18,
    color: '#9ca3af',
    marginBottom: 6,
    fontFamily: Fonts.LeagueSpartanSemiBold,
  },
  emptySubText: {
    fontSize: 14,
    color: '#d1d5db',
    textAlign: 'center',
    fontFamily: Fonts.LeagueSpartanRegular,
  },
  menuCard: { 
    flexDirection: 'row', 
    backgroundColor: '#fff', 
    borderRadius: 16, 
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#f3f4f6',
    shadowColor: '#000', 
    shadowOpacity: 0.04, 
    shadowRadius: 6, 
    elevation: 2,
  },
  menuImage: { 
    width: 68, 
    height: 68, 
    borderRadius: 12, 
    backgroundColor: '#f9fafb',
    marginRight: 12,
  },
  menuInfo: { 
    flex: 1,
    justifyContent: 'space-between',
  },
  menuName: { 
    fontSize: 15, 
    color: '#1f2937',
    fontFamily: Fonts.LeagueSpartanBold,
    marginBottom: 4,
  },
  menuPrice: { 
    fontSize: 16, 
    color: '#ea580c',
    fontFamily: Fonts.LeagueSpartanBold,
    marginBottom: 4,
  },
  menuMeta: { 
    flexDirection: 'row', 
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  menuRating: { 
    fontSize: 13, 
    color: '#f59e0b',
    fontFamily: Fonts.LeagueSpartanMedium,
  },
  menuDivider: { 
    color: '#d1d5db', 
    fontSize: 14,
  },
  menuReviews: { 
    fontSize: 12, 
    color: '#9ca3af',
    fontFamily: Fonts.LeagueSpartanRegular,
  },
  categoryBadge: { 
    fontSize: 11, 
    color: '#6366f1',
    backgroundColor: '#e0e7ff',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    fontFamily: Fonts.LeagueSpartanMedium,
    maxWidth: 80,
  },
  menuActions: { 
    alignItems: 'center', 
    justifyContent: 'space-between',
    marginLeft: 8,
  },
  editBtn: { 
    marginTop: 8,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#fef3e2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteBtn: { 
    backgroundColor: '#eb5523', 
    justifyContent: 'center', 
    alignItems: 'center', 
    width: 90,
    borderRadius: 16, 
    marginLeft: 8,
    marginBottom: 12,
  },
});

export default ManageMenuScreen;
