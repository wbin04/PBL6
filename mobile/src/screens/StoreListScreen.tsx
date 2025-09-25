import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, ActivityIndicator, Alert, TextInput } from 'react-native';
import { IMAGE_MAP } from '../assets/imageMap';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Star } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { apiClient } from '@/services/api';
import { API_CONFIG } from "@/constants";

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

const StoreListScreen = () => {
  const navigation = useNavigation<any>();
  const [stores, setStores] = useState<Store[]>([]);
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

  useEffect(() => {
    fetchStores();
  }, []);

  // Search functionality (for now just filter locally)
  const filteredStores = stores.filter(store => 
    store.name?.toLowerCase().includes(searchText.toLowerCase()) ||
    store.store_name?.toLowerCase().includes(searchText.toLowerCase()) ||
    store.description?.toLowerCase().includes(searchText.toLowerCase())
  );

  const renderItem = ({ item }: any) => {
    // Create full image URL from API
    const getImageSource = () => {
      if (!item.image) {
        return require('../assets/images/placeholder.png');
      }
      
      // If image is already a full URL
      if (item.image.startsWith('http')) {
        return { uri: item.image };
      }
      
      // Construct full URL from media path
      const baseUrl = API_CONFIG.BASE_URL.replace("/api", ""); // Remove /api from base URL
      const fullUrl = `${baseUrl}/media/${item.image}`;
      console.log('Store image URL:', fullUrl);
      return { uri: fullUrl };
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
              source={getImageSource()}
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

      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#ea580c" />
          <Text>Đang tải cửa hàng...</Text>
        </View>
      )}

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
  }
});

export default StoreListScreen;
