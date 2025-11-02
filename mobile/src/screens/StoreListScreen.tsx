import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, ActivityIndicator, Alert, TextInput } from 'react-native';
import { IMAGE_MAP } from '../assets/imageMap';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Star, Plus, UserCheck, UserX } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { apiClient, authApi } from '@/services/api';
import { API_CONFIG } from "@/constants";
import { getImageSource } from '@/utils/imageUtils';

type Store = {
  id: number;
  store_name: string;
  image: string;
  description: string;
  manager: string;
  // Additional fields for UI compatibility
  name?: string;
  rating?: number;
  address?: string;
  foods?: any[];
  // New statistics fields
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
  const [searchText, setSearchText] = useState('');

  // Fetch store statistics (rating, review count, food count) from API
  const fetchStoreStatistics = async (storeId: number) => {
    try {
      console.log(`Fetching statistics for store ${storeId}...`);
      
      const url = '/menu/items/';
      const params = { 
        store: storeId,
        page_size: 1000 // Set large page size to get all foods
      };
      
      console.log(`Making API call: ${url} with params:`, params);
      console.log(`Full URL would be: ${API_CONFIG.BASE_URL}${url}?store=${storeId}&page_size=1000`);
      
      // Fetch foods for this store to calculate statistics
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
      
      // Log the actual response to see the exact structure
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
  const fetchStores = async () => {
    try {
      setLoading(true);
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
    }
  };

  useEffect(() => {
    if (activeTab === 'list') {
      fetchStores();
    } else {
      fetchApplications();
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

  const renderItem = ({ item }: any) => {
    // Use centralized image helper to resolve image source safely
    const getImage = () => {
      if (!item.image) return require('../assets/images/placeholder.png');
      return getImageSource(item.image as any);
    };

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => navigation.navigate('StoreDetailScreenV2', {
          storeId: item.id,
          name: item.name || item.store_name,
          address: item.address,
          image: item.image,
          foods: item.foods,
          rating: item.rating || 0, // Real calculated rating
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
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <View style={{ marginRight: 12 }}>
            <Image
              source={getImage()}
              style={{ width: 54, height: 54, borderRadius: 12 }}
              onError={() => console.log('Image load error for store:', item.store_name)}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.name}>{item.name || item.store_name}</Text>
            <View style={styles.row}>
              <Star size={16} color="#f59e0b" />
              <Text style={styles.rating}>
                {item.rating && item.rating > 0 ? item.rating.toFixed(1) : 'Chưa có'}
              </Text>
              <Text style={styles.reviewCount}>
                ({item.totalReviews || 0} đánh giá)
              </Text>
              <Text style={styles.foodCount}>• {item.foodCount || 0} món</Text>
            </View>
            <Text style={styles.address}>{item.address}</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderApplicationItem = ({ item }: { item: StoreApplication }) => (
    <View style={styles.applicationCard}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <View style={{ marginRight: 12 }}>
          <View style={styles.applicationIcon}>
            <Text style={styles.applicationIconText}>{item.fullname.charAt(0).toUpperCase()}</Text>
          </View>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.name}>{item.fullname}</Text>
          <View style={styles.row}>
            <Text style={styles.email}>{item.email}</Text>
          </View>
          <Text style={styles.phone}>📞 {item.phone_number || 'Chưa có SĐT'}</Text>
          <Text style={styles.address}>{item.address || 'Chưa có địa chỉ'}</Text>
          <Text style={styles.applicationDate}>
            Đăng ký: {new Date(item.created_date).toLocaleDateString('vi-VN')}
          </Text>
        </View>
      </View>

      <View style={styles.actionRow}>
        <TouchableOpacity
          style={styles.approveButton}
          onPress={() => handleApproveApplication(item.id, item.fullname)}
          disabled={loading}
        >
          <UserCheck size={16} color="#fff" />
          <Text style={styles.approveButtonText}>Chấp nhận</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.rejectButton}
          onPress={() => handleRejectApplication(item.id, item.fullname)}
          disabled={loading}
        >
          <UserX size={16} color="#fff" />
          <Text style={styles.rejectButtonText}>Từ chối</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Search Box */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Tìm kiếm cửa hàng..."
          value={searchText}
          onChangeText={setSearchText}
          returnKeyType="search"
        />
        <TouchableOpacity onPress={fetchStores} style={styles.searchButton} disabled={loading}>
          <Text style={styles.buttonText}>Làm mới</Text>
        </TouchableOpacity>
      </View>

      {/* Tab Container */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'list' && styles.activeTab]}
          onPress={() => setActiveTab('list')}
        >
          <Text style={[styles.tabText, activeTab === 'list' && styles.activeTabText]}>
            Danh sách
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'applications' && styles.activeTab]}
          onPress={() => setActiveTab('applications')}
        >
          <Text style={[styles.tabText, activeTab === 'applications' && styles.activeTabText]}>
            Đơn đăng ký ({applications.length})
          </Text>
        </TouchableOpacity>
      </View>

      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#ea580c" />
          <Text>Đang tải cửa hàng...</Text>
        </View>
      )}

      {activeTab === 'list' ? (
        <FlatList
          data={filteredStores}
          keyExtractor={item => item.id.toString()}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 16, paddingBottom: 20 }}
          ListHeaderComponent={<Text style={styles.header}>Danh sách cửa hàng</Text>}
          ListEmptyComponent={
            !loading ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>
                  {searchText ? 'Không tìm thấy cửa hàng nào' : 'Không có cửa hàng nào'}
                </Text>
              </View>
            ) : null
          }
        />
      ) : (
        <FlatList
          data={filteredApplications}
          keyExtractor={item => item.id.toString()}
          renderItem={renderApplicationItem}
          contentContainerStyle={{ padding: 16, paddingBottom: 20 }}
          ListHeaderComponent={<Text style={styles.header}>Đơn đăng ký cửa hàng</Text>}
          ListEmptyComponent={
            !loading ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>
                  {searchText ? 'Không tìm thấy đơn đăng ký nào' : 'Không có đơn đăng ký nào'}
                </Text>
              </View>
            ) : null
          }
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff7ed' },
  header: { fontSize: 20, fontWeight: 'bold', color: '#ea580c', marginBottom: 16, marginTop: -20 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#fed7aa',
  },
  name: { fontSize: 16, fontWeight: 'bold', color: '#1f2937', marginBottom: 4 },
  row: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  rating: { marginLeft: 4, fontSize: 14, color: '#f59e0b', fontWeight: 'bold' },
  reviewCount: { marginLeft: 4, fontSize: 12, color: '#6b7280', fontWeight: '500' },
  foodCount: { marginLeft: 8, fontSize: 12, color: '#6b7280', fontWeight: 'bold' },
  address: { fontSize: 12, color: '#6b7280' },
  searchContainer: { 
    flexDirection: 'row', 
    gap: 8, 
    marginBottom: 16,
    paddingHorizontal: 16,
    paddingTop: 16 
  },
  searchInput: { 
    flex: 1, 
    borderWidth: 1, 
    borderColor: '#e5e7eb', 
    borderRadius: 6, 
    padding: 10,
    backgroundColor: '#fff',
    fontSize: 14
  },
  searchButton: { 
    backgroundColor: '#ea580c', 
    padding: 10, 
    borderRadius: 6, 
    justifyContent: 'center',
    paddingHorizontal: 16
  },
  buttonText: { 
    color: '#fff',
    fontWeight: '600',
    fontSize: 14
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
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#f3f4f6',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 8,
    padding: 4,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 6,
    alignItems: 'center',
  },
  activeTab: {
    backgroundColor: '#ea580c',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6b7280',
  },
  activeTabText: {
    color: '#fff',
    fontWeight: '600',
  },
  applicationCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  applicationIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#ea580c',
    alignItems: 'center',
    justifyContent: 'center',
  },
  applicationIconText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  email: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 4,
  },
  phone: {
    fontSize: 14,
    color: '#4b5563',
    marginBottom: 4,
  },
  applicationDate: {
    fontSize: 12,
    color: '#9ca3af',
    fontStyle: 'italic',
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
    gap: 12,
  },
  approveButton: {
    flex: 1,
    backgroundColor: '#10b981',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  approveButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  rejectButton: {
    flex: 1,
    backgroundColor: '#ef4444',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  rejectButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default StoreListScreen;
