import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image, Switch, TouchableWithoutFeedback, ActivityIndicator, Alert, Dimensions } from 'react-native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Swipeable } from 'react-native-gesture-handler';
import { Trash2 } from 'lucide-react-native';
import { useSelector } from 'react-redux';
import { RootState } from '../../store/index';
import axios from 'axios';
import { useFocusEffect } from '@react-navigation/native';

import { API_CONFIG } from '@/constants';
import { IMAGE_MAP, type ImageName } from "@/assets/imageMap";

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
  // category_name?: string;
  category?: {
    id: number;
    name: string;
  };
}

function getImageSource(img?: ImageName | string) {
  // If it's a path starting with "assets/", prepend with /media/
  if (typeof img === "string" && img.startsWith("assets/")) {
    const baseUrl = API_CONFIG.BASE_URL.replace("/api", ""); // Remove /api from base URL
    const fullUrl = `${baseUrl}/media/${img}`;
    // console.log('getImageSource - Assets path detected, constructed URL:', fullUrl);
    return { uri: fullUrl };
  }
  
  // If it's a relative path without leading slash, add it with /media/ prefix
  if (typeof img === "string" && !img.startsWith("/") && !img.includes("://")) {
    const baseUrl = API_CONFIG.BASE_URL.replace("/api", ""); // Remove /api from base URL
    const fullUrl = `${baseUrl}/media/${img}`;
    // console.log('getImageSource - Relative path without slash, constructed URL:', fullUrl);
    return { uri: fullUrl };
  }
  
  return require("@/assets/images/gourmet-burger.png");
}

const ManageMenuScreen: React.FC<ManageMenuScreenProps> = ({ navigation }) => {
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<any[]>([]);
  const [selectedTab, setSelectedTab] = useState('all');
  const { user, tokens } = useSelector((state: RootState) => state.auth);

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

  // Fetch categories from API (updated to match StoreDetailScreenV2)
  const fetchCategories = useCallback(async () => {
    try {
      console.log('Fetching categories...');
      const response: any = await axios.get(`${API_CONFIG.BASE_URL}/menu/categories/`);
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
  }, []);

  // Fetch menu data from API (with page_size=100)
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
      
      // Try the new store-specific endpoint first, then fallback to admin endpoint
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
              // Use the next URL from API response if available, otherwise construct manually
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
            // Map foods to ensure category object is properly structured
            const mappedFoods = endpointFoods.map((food: any) => {
              // Use the category object from API if it's properly structured
              let categoryObj = food.category;
              if (!categoryObj || typeof categoryObj !== 'object') {
                // Fallback: create category object from category_name with hash ID
                categoryObj = {
                  id: hashString(food.category_name || 'Chưa phân loại'),
                  name: food.category_name || 'Chưa phân loại'
                };
              } else if (!categoryObj.name) {
                // If category object exists but missing name, add it from cate_name
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
            
            // Extract unique categories from mapped foods using their category objects
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
            
            // If we have store-specific categories from foods, use them; otherwise keep existing global categories
            if (storeFoodCategories.length > 0) {
              setCategories(prev => {
                // Only update if categories are actually different
                const prevIds = prev.map(c => c.id).sort();
                const newIds = storeFoodCategories.map(c => c.id).sort();
                if (JSON.stringify(prevIds) !== JSON.stringify(newIds)) {
                  console.log(`Store categories loaded from foods: ${storeFoodCategories.length} categories`);
                  console.log('Categories:', storeFoodCategories.map((cat: any) => `${cat.name} (ID: ${cat.id})`));
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

  // Reload data when screen is focused
  useFocusEffect(
    useCallback(() => {
      fetchMenu();
    }, [fetchMenu])
  );

  useEffect(() => {
    // Always fetch categories
    fetchCategories();
  }, [fetchCategories]);

  // Filter foods by selected tab/category
  const filteredMenu = menu.filter(item => {
    if (selectedTab === 'all') return true;
    if (selectedTab === 'main') {
      // Filter by category name containing "chính" or "main"
      return item.category?.name?.toLowerCase().includes('chính') || 
             item.category?.name?.toLowerCase().includes('main');
    }
    // Filter by specific category ID
    const categoryMatch = item.category?.id.toString() === selectedTab;
    console.log(`Food: ${item.title}, Category: ${item.category?.name} (ID: ${item.category?.id}), Selected tab: ${selectedTab}, Match: ${categoryMatch}`);
    return categoryMatch;
  });

  // Debug logging (reduced to prevent excessive logging)
  useEffect(() => {
    if (menu.length > 0 || categories.length > 0) {
      console.log('State update:');
      console.log('- Menu items:', menu.length);
      console.log('- Categories:', categories.length);
      console.log('- Selected tab:', selectedTab);
      console.log('- Filtered menu:', filteredMenu.length);
    }
  }, [menu.length, categories.length, selectedTab, filteredMenu.length]);

  const handleToggle = async (id: number) => {
    if (!user || !tokens?.access) return;
    
    try {
      // Find the current item
      const item = menu.find(item => item.id === id);
      if (!item) return;

      const newAvailability = item.availability === 'Còn hàng' ? 'Hết hàng' : 'Còn hàng';
      
      // Update locally first for immediate UI feedback
      setMenu(prev => prev.map(item =>
        item.id === id ? { ...item, availability: newAvailability } : item
      ));

      // Update on server
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
      // Revert the change on error
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
              // Remove from UI first for immediate feedback
              setMenu(prev => prev.filter(item => item.id !== id));

              // Delete from server
              await axios.delete(`${API_CONFIG.BASE_URL}/menu/admin/foods/${id}/`, {
                headers: {
                  'Authorization': `Bearer ${tokens.access}`,
                },
              });

              console.log(`Deleted food ${id}`);
            } catch (error) {
              console.error('Error deleting food:', error);
              // Reload data on error
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
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color="#ea580c" />
        <Text style={styles.loadingText}>Đang tải...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.headerRow}>
      </View>
      
      {/* Section title + button */}
      <View style={styles.sectionRow}>
        <Text style={styles.sectionTitle}>Thực đơn của tôi</Text>
        <TouchableOpacity 
          style={styles.addBtn} 
          onPress={() => navigation.navigate('AddFoodScreen', { 
            onRefresh: fetchMenu,
            categories: categories // Truyền categories cho AddFoodScreen
          })}
        >
          <Text style={styles.addBtnText}>+ Thêm món</Text>
        </TouchableOpacity>
      </View>

      {/* Category Tabs */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.tabScrollView}
        contentContainerStyle={styles.tabBox}
      >
        <TouchableOpacity
          style={[styles.tabBtn, selectedTab === 'all' && styles.tabActive]}
          onPress={() => setSelectedTab('all')}
        >
          <Text style={[styles.tabText, selectedTab === 'all' && styles.tabTextActive]}>Tất cả</Text>
        </TouchableOpacity>
        {categories.length > 0 && categories.map((category, index) => (
          <TouchableOpacity
            key={category.id}
            style={[styles.tabBtn, selectedTab === category.id.toString() && styles.tabActive]}
            onPress={() => {
              console.log('Selected category:', category.name, 'ID:', category.id);
              setSelectedTab(category.id.toString());
            }}
          >
            <Text style={[styles.tabText, selectedTab === category.id.toString() && styles.tabTextActive]} numberOfLines={1}>
              {category.name}
            </Text>
          </TouchableOpacity>
        ))}
        {categories.length === 0 && !loading && (
          <TouchableOpacity
            style={[styles.tabBtn, selectedTab === 'main' && styles.tabActive]}
            onPress={() => setSelectedTab('main')}
          >
            <Text style={[styles.tabText, selectedTab === 'main' && styles.tabTextActive]}>Bữa chính</Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      {/* Menu list with filtered count */}
      <View style={styles.menuListContainer}>
        <Text style={styles.menuListTitle}>
          Tất cả món ăn ({filteredMenu.length})
          {loading && ' - Đang tải...'}
        </Text>
        
        <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
          {filteredMenu.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>
                {selectedTab === 'all' ? 'Chưa có món ăn nào' : 'Không có món ăn trong danh mục này'}
              </Text>
              <Text style={styles.emptySubText}>
                {selectedTab === 'all' ? 'Nhấn nút "Thêm món" để bắt đầu' : 'Thử chọn danh mục khác'}
              </Text>
            </View>
          ) : (
            filteredMenu.map(item => (
              <Swipeable
                key={item.id}
                renderRightActions={() => (
                  <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDeleteFood(item.id)}>
                    <Trash2 color="#fff" size={28} />
                  </TouchableOpacity>
                )}
              >
                <TouchableWithoutFeedback onPress={() => navigation.navigate('FoodDetailScreen', item)}>
                  <View style={styles.menuCard}>
                    <View style={styles.menuLeft}>
                      <Image 
                        source={getImageSource(item.image)} 
                        style={styles.menuImage} 
                      />
                    </View>
                    <View style={styles.menuCenter}>
                      <Text style={styles.menuName}>{item.title}</Text>
                      <Text style={styles.menuDesc}>{item.description}</Text>
                      <Text style={styles.menuPrice}>{parseInt(item.price).toLocaleString()} đ</Text>
                      <View style={styles.menuInfoRow}>
                        <Text style={styles.menuStar}>⭐ {item.average_rating?.toFixed(1) || '0.0'}</Text>
                        <Text style={styles.menuOrders}>{item.rating_count || 0} đánh giá</Text>
                        {item.category && (
                          <>
                            <Text style={styles.dot}>·</Text>
                            <Text style={styles.categoryText}>{item.category.name}</Text>
                          </>
                        )}
                      </View>
                    </View>
                    <View style={styles.menuRight}>
                      <Switch 
                        value={item.availability === 'Còn hàng'} 
                        onValueChange={() => handleToggle(item.id)} 
                        style={{ transform: [{ scaleX: 1.2 }, { scaleY: 1.2 }] }} 
                      />
                      <TouchableOpacity 
                        style={styles.editBtn} 
                        onPress={() => navigation.navigate('EditFoodScreen', { 
                          food: item, 
                          onEditFood: fetchMenu,
                          categories: categories,
                        })}
                      >
                        <Text style={styles.editIcon}>✏️</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </TouchableWithoutFeedback>
              </Swipeable>
            ))
          )}
        </ScrollView>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff7ed' },
  loaderContainer: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center', 
    backgroundColor: '#fff7ed' 
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#ea580c',
    fontWeight: '500'
  },
  headerRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    paddingHorizontal: 18, 
    paddingTop: 18, 
    paddingBottom: 8, 
    backgroundColor: '#fff7ed' 
  },
  headerTitle: { fontSize: 22, color: '#1e293b', fontWeight: 'bold' },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  iconBtn: { 
    width: 32, 
    height: 32, 
    borderRadius: 16, 
    backgroundColor: '#fff', 
    alignItems: 'center', 
    justifyContent: 'center', 
    borderWidth: 1, 
    borderColor: '#f3f4f6', 
    marginLeft: 6 
  },
  icon: { fontSize: 18 },
  badge: { 
    position: 'absolute', 
    top: -4, 
    right: -4, 
    backgroundColor: '#ea580c', 
    borderRadius: 10, 
    minWidth: 18, 
    height: 18, 
    alignItems: 'center', 
    justifyContent: 'center', 
    borderWidth: 2, 
    borderColor: '#fff' 
  },
  badgeText: { fontSize: 11, color: '#fff', fontWeight: 'bold' },
  avatar: { 
    width: 32, 
    height: 32, 
    borderRadius: 16, 
    backgroundColor: '#F4A460', 
    alignItems: 'center', 
    justifyContent: 'center', 
    marginLeft: 8 
  },
  avatarText: { color: '#fff', fontSize: 14, fontWeight: 'bold' },
  subtitle: { fontSize: 13, color: '#64748b', marginLeft: 18, marginBottom: 2 },
  sectionRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    marginHorizontal: 18, 
    marginTop: -10, 
    marginBottom: 20
  },
  sectionTitle: { fontSize: 22, fontWeight: 'bold', color: '#ea580c' },
  addBtn: { 
    backgroundColor: '#ea580c', 
    borderRadius: 20, 
    paddingHorizontal: 16, 
    paddingVertical: 6 
  },
  addBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
  // Tab styles (added from StoreDetailScreenV2)
  tabScrollView: {
    marginHorizontal: 18,
    marginBottom: 16,
    maxHeight: 50,
  },
  tabBox: {
    flexDirection: 'row',
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
    borderColor: '#ea580c',
  },
  tabText: { 
    textAlign: 'center', 
    color: '#6b7280', 
    fontWeight: 'bold', 
    fontSize: 14
  },
  tabTextActive: { 
    color: '#ea580c' 
  },
  // Menu list container
  menuListContainer: {
    flex: 1,
  },
  menuListTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginHorizontal: 18,
    marginBottom: 12,
    color: '#1f2937',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#64748b',
    marginBottom: 8,
  },
  emptySubText: {
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center',
  },
  menuCard: { 
    flexDirection: 'row', 
    backgroundColor: '#fff', 
    borderRadius: 16, 
    padding: 16, 
    marginHorizontal: 18, 
    marginBottom: 10, 
    shadowColor: '#000', 
    shadowOpacity: 0.03, 
    shadowRadius: 4, 
    elevation: 1 
  },
  menuLeft: { marginRight: 12 },
  menuImage: { 
    width: 54, 
    height: 54, 
    borderRadius: 12, 
    backgroundColor: '#fffde7' 
  },
  menuCenter: { flex: 1 },
  menuName: { fontWeight: 'bold', fontSize: 15, color: '#1e293b' },
  menuDesc: { fontSize: 13, color: '#6b7280', marginTop: 2 },
  menuPrice: { fontSize: 15, color: '#ea580c', fontWeight: 'bold', marginTop: 4 },
  menuInfoRow: { flexDirection: 'row', alignItems: 'center', marginTop: 6, gap: 12 },
  menuStar: { fontSize: 13, color: '#f59e0b' },
  menuOrders: { fontSize: 13, color: '#64748b' },
  dot: { 
    color: '#d1d5db', 
    fontSize: 16 
  },
  categoryText: { 
    fontSize: 12, 
    color: '#6366f1',
    fontWeight: '500'
  },
  menuRight: { 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    marginLeft: 12 
  },
  editBtn: { marginTop: 12 },
  editIcon: { fontSize: 20 },
  deleteBtn: { 
    backgroundColor: '#ea580c', 
    justifyContent: 'center', 
    alignItems: 'center', 
    width: 100, 
    height: '90%', 
    borderRadius: 16, 
    marginRight: 10 
  },
  deleteIcon: { fontSize: 24, color: '#fff', fontWeight: 'bold' },
});

export default ManageMenuScreen;