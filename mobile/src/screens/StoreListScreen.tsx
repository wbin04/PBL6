import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, ActivityIndicator, Alert, TextInput, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Star, Plus, UserCheck, UserX, ArrowLeft } from 'lucide-react-native'; // thêm ArrowLeft
import { useNavigation } from '@react-navigation/native';
import { apiClient, authApi } from '@/services/api';
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

const StoreListScreen = () => {
  const navigation = useNavigation<any>();
  const [activeTab, setActiveTab] = useState<'list' | 'applications'>('list');
  const [stores, setStores] = useState<Store[]>([]);
  const [applications, setApplications] = useState<StoreApplication[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searchText, setSearchText] = useState('');

  // Fetch store statistics (rating, review count, food count) from API
  const fetchStoreStatistics = async (storeId: number) => {
    try {
      console.log(`Fetching statistics for store ${storeId}...`);
      
      const url = '/menu/items/';
      const params = { 
        store: storeId,
        page_size: 1000
      };
      
      console.log(`Making API call: ${url} with params:`, params);
      console.log(`Full URL would be: ${API_CONFIG.BASE_URL}${url}?store=${storeId}&page_size=1000`);
      
      const response: any = await apiClient.get('/menu/items/', {
        params: params
      });
      
      console.log(`Store ${storeId} API response received:`, {
        status: 'success',
        dataType: typeof response,
        hasData: !!response?.data,
        hasResults: !!response?.data?.results,
        isArray: Array.isArray(response?.data),
        responseStructure: Object.keys(response || {}),
        dataStructure: response?.data ? Object.keys(response.data) : 'no data'
      });
      
      console.log(`Store ${storeId} FULL response:`, JSON.stringify(response, null, 2));
      
      let foodsData = [];
      if (response?.data?.results && Array.isArray(response.data.results)) {
        foodsData = response.data.results;
        console.log(`Store ${storeId}: Using response.data.results (${foodsData.length} items)`);
      } else if (Array.isArray(response?.data)) {
        foodsData = response.data;
        console.log(`Store ${storeId}: Using response.data directly (${foodsData.length} items)`);
      } else if (Array.isArray(response)) {
        foodsData = response;
        console.log(`Store ${storeId}: Using response directly (${foodsData.length} items)`);
      } else if (response?.results && Array.isArray(response.results)) {
        foodsData = response.results;
        console.log(`Store ${storeId}: Using response.results directly (${foodsData.length} items)`);
      } else {
        console.log(`Store ${storeId}: No valid data structure found. Response:`, response);
      }
      
      console.log(`Store ${storeId}: Found ${foodsData.length} foods`);
      if (foodsData.length > 0) {
        console.log(`Store ${storeId} foods sample:`, foodsData.slice(0, 2).map((f: any) => ({
          id: f.id, 
          title: f.title, 
          average_rating: f.average_rating, 
          rating_count: f.rating_count
        })));
      }
      
      // Calculate store statistics from foods data
      const stats = {
        foodCount: foodsData.length,
        averageRating: 0,
        totalReviews: 0
      };
      
      if (foodsData.length > 0) {
        // Calculate weighted average rating and total reviews
        let totalRatingPoints = 0;
        let totalReviews = 0;
        
        foodsData.forEach((food: any) => {
          const foodRating = parseFloat(food.average_rating) || 0;
          const foodReviewCount = parseInt(food.rating_count) || 0;
          
          if (foodRating > 0 || foodReviewCount > 0) {
            console.log(`Food ${food.title}: rating=${foodRating}, count=${foodReviewCount}`);
          }
          
          // Add to weighted calculation
          totalRatingPoints += foodRating * foodReviewCount;
          totalReviews += foodReviewCount;
        });
        
        // Calculate weighted average rating
        stats.averageRating = totalReviews > 0 ? 
          parseFloat((totalRatingPoints / totalReviews).toFixed(1)) : 0;
        stats.totalReviews = totalReviews;
        
        console.log(`Store ${storeId} calculation: totalRatingPoints=${totalRatingPoints}, totalReviews=${totalReviews}`);
      }
      
      console.log(`Store ${storeId} final stats:`, stats);
      return stats;
      
    } catch (error: any) {
      console.error(`Error fetching statistics for store ${storeId}:`, error);
      console.error('Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        config: {
          url: error.config?.url,
          params: error.config?.params,
          baseURL: error.config?.baseURL
        }
      });
      
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
        const storesWithStats = await Promise.all(
          data.map(async (store: any) => {
            const stats = await fetchStoreStatistics(store.id);
            
            return {
              ...store,
              name: store.store_name, // Map store_name to name for UI compatibility
              rating: stats.averageRating, // Real calculated rating
              address: store.description || 'Chưa cập nhật địa chỉ', // Use description as address
              foods: [], // Empty foods array, will be loaded separately if needed
              foodCount: stats.foodCount, // Real food count
              totalReviews: stats.totalReviews, // Real review count
            };
          })
        );
        
        console.log('Stores with statistics:', storesWithStats);
        setStores(storesWithStats);
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

    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.9}
        onPress={() => navigation.navigate('StoreDetailScreenV2', {
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
        })}
      >
        <View style={styles.cardContent}>
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
        </View>
      </TouchableOpacity>
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
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.headerWrap}>
        <View style={styles.headerTopRow}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.roundIconBtn}>
            <ArrowLeft size={18} color="#eb5523" />
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
