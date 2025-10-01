import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image, Switch, TouchableWithoutFeedback, ActivityIndicator, Alert, Dimensions, Modal } from 'react-native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Swipeable } from 'react-native-gesture-handler';
import { Trash2, Menu, X, ShoppingBag } from 'lucide-react-native';
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
  const { user, tokens } = useSelector((state: RootState) => state.auth);

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
    }
  }, []);

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

  useFocusEffect(
    useCallback(() => {
      fetchMenu();
    }, [fetchMenu])
  );

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const filteredMenu = menu.filter(item => {
    if (selectedTab === 'all') return true;
    if (selectedTab === 'main') {
      return item.category?.name?.toLowerCase().includes('chính') || 
             item.category?.name?.toLowerCase().includes('main');
    }
    const categoryMatch = item.category?.id.toString() === selectedTab;
    console.log(`Food: ${item.title}, Category: ${item.category?.name} (ID: ${item.category?.id}), Selected tab: ${selectedTab}, Match: ${categoryMatch}`);
    return categoryMatch;
  });

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
        <TouchableOpacity 
          style={styles.menuButton}
          onPress={() => setSidebarVisible(true)}
        >
          <Menu color="#ea580c" size={24} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Quản lý thực đơn</Text>
          <Text style={styles.headerSubtitle}>Cửa hàng của tôi</Text>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity style={styles.iconBtn}>
            <Text style={styles.icon}>🔔</Text>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>3</Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity style={styles.avatar}>
            <Text style={styles.avatarText}>A</Text>
          </TouchableOpacity>
        </View>
      </View>
      
      {/* Section title + button */}
      <View style={styles.sectionTitleRow}>
        <Text style={styles.menuSectionTitle}>Thực đơn của tôi</Text>
        <TouchableOpacity 
          style={styles.addBtn} 
          onPress={() => navigation.navigate('AddFoodScreen', { 
            onRefresh: fetchMenu,
            categories: categories
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

      {/* Sidebar */}
      {sidebarVisible && (
        <>
          <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setSidebarVisible(false)} />
          <View style={styles.sidebar}>
            <View style={styles.logoContainer}>
              <View style={styles.logoHeader}>
                <TouchableOpacity onPress={() => setSidebarVisible(false)} style={styles.closeButton}>
                  <X width={24} height={24} stroke="#fff" />
                </TouchableOpacity>
              </View>
              <View style={styles.logoBox}>
                <View style={styles.logoCircle}>
                  <Text style={styles.logoEmoji}>🍔</Text>
                </View>
                <Text style={styles.logoText}>BÁN HÀNG</Text>
              </View>
            </View>
            <View style={styles.menuContainer}>
              <TouchableOpacity
                style={[styles.menuItem, { backgroundColor: '#ea580c' }]}
                onPress={() => {
                  setSidebarVisible(false);
                  navigation.navigate('DashboardScreen');
                }}
              >
                <Menu width={16} height={16} stroke="#fff7ed" />
                <Text style={styles.menuText}>Trang chủ</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.menuItem, { backgroundColor: '#ea580c' }]}
                onPress={() => {
                  setSidebarVisible(false);
                  navigation.reset({
                    index: 0,
                    routes: [{ name: 'MainTabs', params: { screen: 'Home' } }],
                  });
                }}
              >
                <ShoppingBag width={16} height={16} stroke="#fff7ed" />
                <Text style={styles.menuText}>Mua hàng</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.menuItem, styles.menuItemActive]}
                onPress={() => setSidebarVisible(false)}
              >
                <ShoppingBag width={16} height={16} stroke="#fff" />
                <Text style={[styles.menuText, styles.menuTextActive]}>Quản lí món ăn</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.menuItem, { backgroundColor: '#ea580c' }]}
                onPress={() => {
                  setSidebarVisible(false);
                  navigation.navigate('NewOrderListScreen');
                }}
              >
                <ShoppingBag width={16} height={16} stroke="#fff7ed" />
                <Text style={styles.menuText}>Quản lí đơn hàng</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.menuItem, { backgroundColor: '#ea580c' }]}
                onPress={() => {
                  setSidebarVisible(false);
                  // navigation.navigate('SellerVoucherManagementScreen');
                }}
              >
                <ShoppingBag width={16} height={16} stroke="#fff7ed" />
                <Text style={styles.menuText}>Quản lí khuyến mãi</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.menuItem, { backgroundColor: '#ea580c' }]}
                onPress={() => {
                  setSidebarVisible(false);
                  // Analytics section - could navigate to analytics screen
                }}
              >
                <Menu width={16} height={16} stroke="#fff7ed" />
                <Text style={styles.menuText}>Thống kê</Text>
              </TouchableOpacity>
            </View>
          </View>
        </>
      )}
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
    paddingHorizontal: 18, 
    paddingTop: 50, 
    paddingBottom: 8, 
    backgroundColor: '#fff7ed',
    borderBottomWidth: 0 
  },
  menuButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#f3f4f6',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center'
  },
  headerTitle: { fontSize: 20, color: '#1e293b', fontWeight: 'bold' },
  headerSubtitle: { fontSize: 13, color: '#64748b', marginTop: 2 },
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
  sectionTitleRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    marginHorizontal: 18, 
    marginTop: 0, 
    marginBottom: 16
  },
  menuSectionTitle: { 
    fontSize: 20, 
    fontWeight: 'bold', 
    color: '#ea580c' 
  },
  addBtn: { 
    backgroundColor: '#ea580c', 
    borderRadius: 20, 
    paddingHorizontal: 16, 
    paddingVertical: 6 
  },
  addBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
  tabScrollView: {
    marginHorizontal: 18,
    marginBottom: 12,
    marginTop: 0,
    maxHeight: 50,
  },
  tabBox: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center'
  },
  tabBtn: {
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: '#fff',
    minWidth: 80,
    maxWidth: screenWidth * 0.35,
    marginRight: 8,
  },
  tabActive: {
    backgroundColor: '#fee2e2',
  },
  tabText: { 
    textAlign: 'center', 
    color: '#ea580c', 
    fontWeight: 'normal', 
    fontSize: 14
  },
  tabTextActive: { 
    color: '#ea580c',
    fontWeight: 'bold',
    fontSize: 15
  },
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
  overlay: { 
    position: 'absolute', 
    top: 0, 
    left: 0, 
    right: 0, 
    bottom: 0, 
    backgroundColor: 'rgba(0,0,0,0.5)', 
    zIndex: 1 
  },
  sidebar: { 
    position: 'absolute', 
    left: 0, 
    top: 0, 
    bottom: 0, 
    width: 260, 
    backgroundColor: '#f5f2f0ff', 
    borderRightWidth: 0, 
    zIndex: 2, 
    shadowColor: '#000', 
    shadowOffset: { width: 2, height: 0 }, 
    shadowOpacity: 0.18, 
    shadowRadius: 10, 
    elevation: 10 
  },
  logoContainer: { 
    paddingTop: 24, 
    paddingBottom: 16, 
    borderBottomWidth: 0, 
    alignItems: 'center', 
    backgroundColor: '#ea580c', 
    height: 160
  },
  logoHeader: { 
    flexDirection: 'row', 
    justifyContent: 'flex-end', 
    width: '100%', 
    paddingRight: 16 
  },
  closeButton: { 
    padding: 6, 
    backgroundColor: '#ea580c', 
    borderRadius: 16, 
    marginTop: 20
  },
  logoBox: { 
    alignItems: 'center', 
    marginTop: -30 
  },
  logoCircle: { 
    width: 56, 
    height: 56, 
    borderRadius: 28, 
    backgroundColor: '#fff', 
    alignItems: 'center', 
    justifyContent: 'center', 
    marginBottom: 8, 
    shadowColor: '#ea580c', 
    shadowOpacity: 0.15, 
    shadowRadius: 8, 
    elevation: 4 
  },
  logoEmoji: { 
    fontSize: 32 
  },
  logoText: { 
    fontSize: 18, 
    color: '#fff', 
    fontWeight: 'bold', 
    letterSpacing: 1 
  },
  menuContainer: { 
    flex: 1, 
    paddingVertical: 16 
  },
  menuItem: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingHorizontal: 20, 
    paddingVertical: 14, 
    marginHorizontal: 12, 
    borderRadius: 10, 
    marginBottom: 8 
  },
  menuItemActive: { 
    backgroundColor: '#fff', 
    borderWidth: 0 
  },
  menuText: { 
    marginLeft: 14, 
    fontSize: 15, 
    color: '#fff', 
    fontWeight: '500' 
  },
  menuTextActive: { 
    color: '#ea580c', 
    fontWeight: 'bold' 
  },
});

export default ManageMenuScreen;