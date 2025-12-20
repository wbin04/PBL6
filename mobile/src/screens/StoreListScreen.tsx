import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, ActivityIndicator, Alert, TextInput, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Star, Plus, UserCheck, UserX, Menu, BarChart3, ShoppingBag, Package, Users } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { apiClient, authApi } from '@/services/api';
import { useAdmin } from '@/contexts/AdminContext';
import Sidebar from '@/components/sidebar';
import { API_CONFIG } from "@/constants";
import { getImageSource } from '@/utils/imageUtils';
import { Ionicons } from '@expo/vector-icons';
import { Fonts } from '../constants/Fonts';

type Store = {
  id: number;
  store_name: string;
  image: string;
  description: string;
  manager: string;
  name?: string;
  rating?: number;
  address?: string;
  foods?: any[];
  foodCount?: number;
  totalReviews?: number;
  manager_id?: number; // backend may expose the manager user id
  is_active?: boolean; // manager account status
};

interface StoreApplication {
  id: number;
  fullname: string;
  username: string;
  email: string;
  phone_number: string;
  address: string;
  created_date: string;
  is_store_registered: boolean;
}

const menuItems = [
  { title: 'Trang chủ', icon: BarChart3, section: 'dashboard' },
  // { title: 'Mua hàng', icon: ShoppingBag, section: 'buy' },
  { title: 'Quản lý tài khoản', icon: Users, section: 'customers' },
  { title: 'Quản lý cửa hàng', icon: ShoppingBag, section: 'stores' },
  { title: 'Quản lý đơn hàng', icon: Package, section: 'orders' },
  { title: 'Quản lý shipper', icon: Users, section: 'shippers' },
  { title: 'Khuyến mãi hệ thống', icon: Star, section: 'promotions' },
];

type StoreListScreenProps = {
  onMenuPress?: () => void;
};

const StoreListScreen = ({ onMenuPress }: StoreListScreenProps = {}) => {
  const navigation = useNavigation<any>();
  const [activeTab, setActiveTab] = useState<'list' | 'applications'>('list');
  const [stores, setStores] = useState<Store[]>([]);
  const [applications, setApplications] = useState<StoreApplication[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [togglingStoreId, setTogglingStoreId] = useState<number | null>(null);

  // Try to use admin context if available
  let adminContext: ReturnType<typeof useAdmin> | undefined;
  try {
    adminContext = useAdmin();
  } catch (e) {
    // Not in admin context
    adminContext = undefined;
  }

  const handleMenuPress = () => {
    if (onMenuPress) {
      onMenuPress();
    } else if (adminContext) {
      adminContext.openSidebar();
    } else if (navigation.canGoBack()) {
      navigation.goBack();
    }
  };

  // Fetch store statistics (rating, review count, food count) from API
  // NOTE: Currently disabled to prevent spam requests on initial load
  // Can be re-enabled for lazy loading when user clicks on a specific store
  const fetchStoreStatistics = async (storeId: number) => {
    try {
      console.log(`Fetching statistics for store ${storeId}...`);
      
      const url = '/menu/items/';
      const params = { 
        store: storeId,
        page_size: 50  // Reduced from 1000 to avoid huge payloads
      };
      
      const response: any = await apiClient.get('/menu/items/', {
        params: params
      });
      
      let foodsData = [];
      if (response?.data?.results && Array.isArray(response.data.results)) {
        foodsData = response.data.results;
      } else if (Array.isArray(response?.data)) {
        foodsData = response.data;
      } else if (Array.isArray(response)) {
        foodsData = response;
      } else if (response?.results && Array.isArray(response.results)) {
        foodsData = response.results;
      }
      
      // Calculate store statistics from foods data
      const stats = {
        foodCount: response?.data?.count || foodsData.length,  // Use API count if available
        averageRating: 0,
        totalReviews: 0
      };
      
      if (foodsData.length > 0) {
        let totalRatingPoints = 0;
        let totalReviews = 0;
        
        foodsData.forEach((food: any) => {
          const foodRating = parseFloat(food.average_rating) || 0;
          const foodReviewCount = parseInt(food.rating_count) || 0;
          
          totalRatingPoints += foodRating * foodReviewCount;
          totalReviews += foodReviewCount;
        });
        
        stats.averageRating = totalReviews > 0 ? 
          parseFloat((totalRatingPoints / totalReviews).toFixed(1)) : 0;
        stats.totalReviews = totalReviews;
      }
      
      return stats;
      
    } catch (error: any) {
      console.error(`Error fetching statistics for store ${storeId}:`, error);
      
      // Return default stats on error
      return {
        foodCount: 0,
        averageRating: 0,
        totalReviews: 0
      };
    }
  };

  // Fetch stores from API
  const fetchStores = async (showLoading = true) => {
    try {
      if (showLoading) {
        setLoading(true);
      }
      console.log('Fetching stores...');
      
      const response: any = await apiClient.get('/stores/public/');
      
      console.log('Store API Response:', response);
      console.log('Store data:', response.data);
      
      // Process the response data
      let data = response.data || response;
      
      if (Array.isArray(data)) {
        // Map API data and fetch statistics for each store
        const storesDataPromises = data.map(async (store: any) => {
          // Fetch statistics for this store
          const stats = await fetchStoreStatistics(store.id);
          
          const managerActive =
            store.manager_is_active !== undefined
              ? store.manager_is_active
              : (store.manager?.is_active ?? store.is_active ?? true);

          const managerId =
            store.manager_id ??
            store.managerId ??
            store.manager_user_id ??
            store.managerUserId ??
            store.manager_userId ??
            store.manager?.id;

          return {
            ...store,
            name: store.store_name, // Map store_name to name for UI compatibility
            rating: stats.averageRating, // Use fetched rating
            address: store.description || 'Chưa cập nhật địa chỉ', // Use description as address
            foods: [], // Empty foods array, will be loaded separately if needed
            foodCount: stats.foodCount, // Use fetched food count
            totalReviews: stats.totalReviews, // Use fetched total reviews
            is_active: managerActive,
            manager_id: managerId,
          };
        });
        
        const storesData = await Promise.all(storesDataPromises);
        
        console.log('Stores loaded with statistics:', storesData);
        setStores(storesData);
      } else {
        console.error('Unexpected API response structure:', data);
        setStores([]);
        Alert.alert('Lưu ý', 'Dữ liệu có cấu trúc không như mong đợi');
      }
    } catch (error: any) {
      console.error('Error fetching stores:', error);
      console.error('Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        statusText: error.response?.statusText
      });
      
      let errorMessage = 'Không thể tải danh sách cửa hàng';
      if (error.response?.status === 401) {
        errorMessage = 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.';
      } else if (error.response?.status === 403) {
        errorMessage = 'Không có quyền truy cập.';
      } else if (error.message) {
        errorMessage += ': ' + error.message;
      }
      
      Alert.alert('Lỗi', errorMessage);
      
      // Set empty array on error to avoid crashes
      setStores([]);
    } finally {
      setLoading(false);
      if (refreshing) {
        setRefreshing(false);
      }
    }
  };

  // Fetch store applications
  const fetchApplications = async (showLoading = true) => {
    try {
      if (showLoading) {
        setLoading(true);
      }
      console.log('Fetching store applications...');

      const response = await authApi.getStoreApplications({
        page: 1,
      }) as any;

      console.log('Store Applications API Response:', response);

      // Handle different response formats
      if (response?.applications) {
        setApplications(response.applications);
      } else if (response?.data?.applications) {
        setApplications(response.data.applications);
      } else if (Array.isArray(response)) {
        setApplications(response);
      } else {
        console.warn('Unexpected store applications response format:', response);
        setApplications([]);
      }

    } catch (error: any) {
      console.error('Error fetching store applications:', error);
      Alert.alert('Lỗi', error?.response?.data?.message || 'Không thể tải danh sách đơn đăng ký cửa hàng');
      setApplications([]);
    } finally {
      if (showLoading) {
        setLoading(false);
      }
      if (refreshing) {
        setRefreshing(false);
      }
    }
  };

  useEffect(() => {
    if (activeTab === 'list') {
      fetchStores();
    } else {
      fetchApplications();
    }
  }, [activeTab]);

  // Refresh handler
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    if (activeTab === 'list') {
      fetchStores(false);
    } else {
      fetchApplications(false);
    }
  }, [activeTab]);

  // Handle approve store application
  const handleApproveApplication = async (userId: number, userName: string) => {
    Alert.alert(
      "Chấp nhận đơn đăng ký cửa hàng",
      `Bạn có chắc muốn chấp nhận đơn đăng ký cửa hàng của ${userName}?`,
      [
        { text: "Hủy", style: "cancel" },
        {
          text: "Chấp nhận",
          onPress: async () => {
            try {
              setLoading(true);
              await authApi.approveStoreApplication(userId);
              Alert.alert("Thành công", "Đã chấp nhận đơn đăng ký cửa hàng");
              fetchApplications(); // Refresh applications list
            } catch (error: any) {
              console.error('Error approving store application:', error);
              Alert.alert("Lỗi", error?.response?.data?.message || "Không thể chấp nhận đơn đăng ký");
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  // Handle reject store application
  const handleRejectApplication = async (userId: number, userName: string) => {
    Alert.alert(
      "Từ chối đơn đăng ký cửa hàng",
      `Bạn có chắc muốn từ chối đơn đăng ký cửa hàng của ${userName}?`,
      [
        { text: "Hủy", style: "cancel" },
        {
          text: "Từ chối",
          style: "destructive",
          onPress: async () => {
            try {
              setLoading(true);
              await authApi.rejectStoreApplication(userId);
              Alert.alert("Thành công", "Đã từ chối đơn đăng ký cửa hàng");
              fetchApplications(); // Refresh applications list
            } catch (error: any) {
              console.error('Error rejecting store application:', error);
              Alert.alert("Lỗi", error?.response?.data?.message || "Không thể từ chối đơn đăng ký");
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  const handleToggleStoreStatus = async (store: Store) => {
    // try to resolve the manager's user id from multiple possible keys
    const managerId =
      (store as any).manager_id ||
      (store as any).managerId ||
      (store as any).manager_user_id ||
      (store as any).managerUserId ||
      (store as any).manager_userId;

    if (!managerId) {
      Alert.alert('Lỗi', 'Không tìm thấy ID quản lý cửa hàng để khoá/mở tài khoản');
      return;
    }

    try {
      setTogglingStoreId(store.id);
      const response: any = await apiClient.post(
        `/auth/admin/customers/${managerId}/toggle-status/`,
      );

      // Determine next is_active flag from response or fallback to toggling current
      const updatedCustomer = response?.data?.customer || response?.data;
      const nextActive =
        updatedCustomer?.is_active !== undefined
          ? updatedCustomer.is_active
          : !(store as any).is_active;

      setStores((prev) =>
        prev.map((s) => (s.id === store.id ? { ...s, is_active: nextActive } : s)),
      );

      Alert.alert(
        'Thành công',
        response?.data?.message || 'Đã thay đổi trạng thái tài khoản cửa hàng',
      );
    } catch (error: any) {
      console.error('Error toggling store status:', error);

      let errorMessage = 'Không thể thay đổi trạng thái tài khoản cửa hàng';
      if (error?.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error?.message) {
        errorMessage += ': ' + error.message;
      }

      Alert.alert('Lỗi', errorMessage);
    } finally {
      setTogglingStoreId(null);
    }
  };

  // Search functionality
  const filteredStores = stores.filter(store => 
    store.name?.toLowerCase().includes(searchText.toLowerCase()) ||
    store.store_name?.toLowerCase().includes(searchText.toLowerCase()) ||
    store.description?.toLowerCase().includes(searchText.toLowerCase())
  );

  const filteredApplications = applications.filter(app =>
    app.fullname?.toLowerCase().includes(searchText.toLowerCase()) ||
    app.email?.toLowerCase().includes(searchText.toLowerCase()) ||
    app.phone_number?.toLowerCase().includes(searchText.toLowerCase())
  );

  const renderStoreItem = ({ item }: any) => {
    const getImage = () => {
      if (!item.image) return require('../assets/images/placeholder.png');
      return getImageSource(item.image as any);
    };

    const isActive = (item as any).is_active !== undefined ? (item as any).is_active : true;
    const isToggling = togglingStoreId === item.id;

    return (
      <View style={styles.card}>
        <View style={styles.cardContent}>
          <TouchableOpacity
            style={styles.cardMain}
            activeOpacity={0.9}
            onPress={() =>
              navigation.navigate('StoreDetailScreenV2', {
                storeId: item.id,
                name: item.name || item.store_name,
                address: item.address,
                image: item.image,
                foods: item.foods,
                rating: item.rating || 0,
                delivery: 'Miễn phí',
                time: '20 phút',
                vouchers: [
                  {
                    id: 'v1',
                    percent: 20,
                    minOrder: '200.000 VND',
                    code: 'SAVE20',
                    desc: 'Giảm 20% cho đơn hàng từ 200.000 VND',
                  },
                ],
              })
            }
          >
            <Image
              source={getImage()}
              style={styles.storeImage}
              onError={() => console.log('Image load error for store:', item.store_name)}
            />
            <View style={styles.storeInfo}>
              <Text style={styles.storeName} numberOfLines={1}>
                {item.name || item.store_name}
              </Text>
              <View style={styles.ratingRow}>
                <Star size={14} color="#f59e0b" fill="#f59e0b" />
                <Text style={styles.rating}>
                  {item.rating && item.rating > 0 ? item.rating.toFixed(1) : 'N/A'}
                </Text>
                <Text style={styles.reviewCount}>
                  ({item.totalReviews || 0})
                </Text>
                <Text style={styles.foodCount}>• {item.foodCount || 0} món</Text>
              </View>
              <Text style={styles.address} numberOfLines={1}>
                📍 {item.address}
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.toggleButton,
              isActive ? styles.toggleActive : styles.toggleLocked,
              isToggling && styles.toggleDisabled,
            ]}
            onPress={() => handleToggleStoreStatus(item)}
            disabled={isToggling}
            activeOpacity={0.8}
          >
            <Text
              style={[
                styles.toggleText,
                isActive ? styles.toggleTextActive : styles.toggleTextLocked,
              ]}
            >
              {isToggling ? 'Đang xử lý...' : isActive ? 'Đang mở' : 'Đã khoá'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderApplicationItem = ({ item }: { item: StoreApplication }) => (
    <View style={styles.applicationCard}>
      <View style={styles.applicationHeader}>
        <View style={styles.applicationIcon}>
          <Text style={styles.applicationIconText}>
            {item.fullname.charAt(0).toUpperCase()}
          </Text>
        </View>
        <View style={styles.applicationInfo}>
          <Text style={styles.applicationName}>{item.fullname}</Text>
          <Text style={styles.applicationEmail}>✉️ {item.email}</Text>
          <Text style={styles.applicationPhone}>📞 {item.phone_number || 'Chưa có SĐT'}</Text>
          <Text style={styles.applicationAddress} numberOfLines={1}>
            📍 {item.address || 'Chưa có địa chỉ'}
          </Text>
          <Text style={styles.applicationDate}>
            🕒 Đăng ký: {new Date(item.created_date).toLocaleDateString('vi-VN')}
          </Text>
        </View>
      </View>

      <View style={styles.actionRow}>
        <TouchableOpacity
          style={styles.approveButton}
          onPress={() => handleApproveApplication(item.id, item.fullname)}
          disabled={loading}
          activeOpacity={0.8}
        >
          <UserCheck size={16} color="#fff" />
          <Text style={styles.approveButtonText}>Chấp nhận</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.rejectButton}
          onPress={() => handleRejectApplication(item.id, item.fullname)}
          disabled={loading}
          activeOpacity={0.8}
        >
          <UserX size={24} color="#fff" />
          <Text style={styles.rejectButtonText}>Từ chối</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderEmpty = () => {
    if (loading) return null;

    return (
      <View style={styles.emptyContainer}>
        <Ionicons 
          name={activeTab === 'list' ? "storefront-outline" : "document-text-outline"} 
          size={64} 
          color="#d1d5db" 
        />
        <Text style={styles.emptyText}>
          {searchText 
            ? `Không tìm thấy ${activeTab === 'list' ? 'cửa hàng' : 'đơn đăng ký'} nào` 
            : `Chưa có ${activeTab === 'list' ? 'cửa hàng' : 'đơn đăng ký'} nào`
          }
        </Text>
      </View>
    );
  };

  return (
    <>
      <Sidebar
        isOpen={adminContext?.isSidebarOpen || false}
        onClose={() => adminContext?.closeSidebar()}
        menuItems={menuItems}
        hitSlop={{ top: 50, bottom: 10, left: 10, right: 10 }}
        onMenuItemPress={(section) => {
          adminContext?.closeSidebar();
          
          if (section === 'buy') {
            navigation.reset({ index: 0, routes: [{ name: 'MainTabs' }] });
          } else if (section === 'dashboard') {
            navigation.navigate('AdminDashboard');
          } else if (section === 'customers') {
            navigation.navigate('CustomerListScreen');
          } else if (section === 'stores') {
            // Stay on current screen
          } else if (section === 'orders') {
            navigation.navigate('OrderListScreen');
          } else if (section === 'shippers') {
            navigation.navigate('ShipperListScreen');
          } else if (section === 'promotions') {
            navigation.navigate('VoucherManagementScreen');
          }
        }}
      />
      <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.headerWrap}>
        <View style={styles.headerTopRow}>
          <TouchableOpacity onPress={handleMenuPress} style={styles.roundIconBtn}>
            <Menu size={24} color="#eb552d" />
          </TouchableOpacity>

          <Text style={styles.headerTitle}>Quản lý cửa hàng</Text>

          <View style={{ width: 40 }} />
        </View>

        <View style={styles.searchRow}>
          <View style={styles.searchBox}>
            <TextInput
              placeholder={
                activeTab === 'list'
                  ? 'Tìm theo tên cửa hàng, địa chỉ...'
                  : 'Tìm theo tên, email, SĐT...'
              }
              placeholderTextColor="#9CA3AF"
              value={searchText}
              onChangeText={setSearchText}
              style={styles.searchInput}
              returnKeyType="search"
            />
            <TouchableOpacity style={styles.searchBtn}>
              <Ionicons name="search" size={16} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'list' && styles.tabActive]}
          onPress={() => {
            setActiveTab('list');
            setSearchText('');
          }}
          activeOpacity={0.7}
        >
          <Text style={[styles.tabText, activeTab === 'list' && styles.tabTextActive]}>
            Danh sách
          </Text>
          <View style={[styles.countBadge, activeTab === 'list' && styles.countBadgeActive]}>
            <Text style={[styles.countText, activeTab === 'list' && styles.countTextActive]}>
              {stores.length}
            </Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'applications' && styles.tabActive]}
          onPress={() => {
            setActiveTab('applications');
            setSearchText('');
          }}
          activeOpacity={0.7}
        >
          <Text style={[styles.tabText, activeTab === 'applications' && styles.tabTextActive]}>
            Đơn đăng ký
          </Text>
          <View
            style={[
              styles.countBadge,
              activeTab === 'applications' && styles.countBadgeActive,
            ]}
          >
            <Text
              style={[
                styles.countText,
                activeTab === 'applications' && styles.countTextActive,
              ]}
            >
              {applications.length}
            </Text>
          </View>
        </TouchableOpacity>
      </View>

      <View style={styles.foundWrap}>
        <Text style={styles.foundText}>
          Tìm thấy{' '}
          <Text style={styles.foundNum}>
            {activeTab === 'list' ? filteredStores.length : filteredApplications.length}
          </Text>{' '}
          {activeTab === 'list' ? 'cửa hàng' : 'đơn đăng ký'}
        </Text>
      </View>

      {loading && (activeTab === 'list' ? filteredStores : filteredApplications).length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#ea580c" />
          <Text style={styles.loadingText}>
            {activeTab === 'list' ? 'Đang tải cửa hàng...' : 'Đang tải đơn đăng ký...'}
          </Text>
        </View>
      ) : (
        <FlatList<any>
          data={activeTab === 'list' ? filteredStores : filteredApplications}
          keyExtractor={(item) => item.id.toString()}
          renderItem={activeTab === 'list' ? renderStoreItem : renderApplicationItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={renderEmpty}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={['#ea580c']}
              tintColor="#ea580c"
            />
          }
          initialNumToRender={10}
          maxToRenderPerBatch={10}
          windowSize={5}
          removeClippedSubviews={true}
        />
      )}
    </SafeAreaView>
    </>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#ffffff',
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
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 12,
    backgroundColor: '#fff',
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

  // FOUND BAR
  foundWrap: {
    marginTop: 12,
    backgroundColor: '#F6F7F8',
    paddingVertical: 14,
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

  // LIST CONTENT (giữ như cũ hoặc tương tự)
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 16,
  },

  // Store Card
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
  },
  storeImage: {
    width: 64,
    height: 64,
    borderRadius: 16,
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  storeInfo: {
    flex: 1,
  },
  storeName: {
    fontSize: 16,
    fontFamily: Fonts.LeagueSpartanBold,
    color: '#1f2937',
    marginBottom: 4,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  rating: {
    marginLeft: 4,
    fontSize: 14,
    color: '#f59e0b',
    fontFamily: Fonts.LeagueSpartanBold,
  },
  reviewCount: {
    marginLeft: 4,
    fontSize: 12,
    color: '#6b7280',
    fontFamily: Fonts.LeagueSpartanRegular,
  },
  foodCount: {
    marginLeft: 8,
    fontSize: 12,
    color: '#6b7280',
    fontFamily: Fonts.LeagueSpartanMedium,
  },
  address: {
    fontSize: 13,
    color: '#6b7280',
    fontFamily: Fonts.LeagueSpartanRegular,
  },

  toggleButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    minWidth: 90,
    alignItems: 'center',
  },
  toggleActive: {
    backgroundColor: 'rgba(16,185,129,0.08)',
    borderColor: '#10b981',
  },
  toggleLocked: {
    backgroundColor: 'rgba(239,68,68,0.08)',
    borderColor: '#ef4444',
  },
  toggleDisabled: {
    opacity: 0.6,
  },
  toggleText: {
    fontSize: 13,
    fontFamily: Fonts.LeagueSpartanSemiBold,
  },
  toggleTextActive: {
    color: '#047857',
  },
  toggleTextLocked: {
    color: '#b91c1c',
  },

  // Application Card
  applicationCard: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  applicationHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  applicationIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#ea580c',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  applicationIconText: {
    color: '#fff',
    fontSize: 20,
    fontFamily: Fonts.LeagueSpartanBold,
  },
  applicationInfo: {
    flex: 1,
  },
  applicationName: {
    fontSize: 16,
    fontFamily: Fonts.LeagueSpartanBold,
    color: '#1f2937',
    marginBottom: 4,
  },
  applicationEmail: {
    fontSize: 13,
    color: '#6b7280',
    fontFamily: Fonts.LeagueSpartanRegular,
    marginBottom: 2,
  },
  applicationPhone: {
    fontSize: 13,
    color: '#6b7280',
    fontFamily: Fonts.LeagueSpartanRegular,
    marginBottom: 2,
  },
  applicationAddress: {
    fontSize: 13,
    color: '#6b7280',
    fontFamily: Fonts.LeagueSpartanRegular,
    marginBottom: 4,
  },
  applicationDate: {
    fontSize: 12,
    color: '#9ca3af',
    fontFamily: Fonts.LeagueSpartanRegular,
    fontStyle: 'italic',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
  },
  approveButton: {
    flex: 1,
    backgroundColor: '#10b981',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 12,
    gap: 6,
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  approveButtonText: {
    color: '#fff',
    fontSize: 14,
    fontFamily: Fonts.LeagueSpartanSemiBold,
  },
  rejectButton: {
    flex: 1,
    backgroundColor: '#ef4444',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 12,
    gap: 6,
    shadowColor: '#ef4444',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  rejectButtonText: {
    color: '#fff',
    fontSize: 14,
    fontFamily: Fonts.LeagueSpartanSemiBold,
  },

  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 12,
    fontFamily: Fonts.LeagueSpartanRegular,
  },

  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6b7280',
    fontFamily: Fonts.LeagueSpartanRegular,
    textAlign: 'center',
  },
});

export default StoreListScreen;
