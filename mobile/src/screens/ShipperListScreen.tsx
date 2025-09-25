import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking, ScrollView, ActivityIndicator, RefreshControl, Alert } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Phone, Plus } from 'lucide-react-native';
import { shipperApi } from '../services/api';

interface Shipper {
  id: number;
  user_id: number;
  fullname: string;
  phone: string;
  email: string;
  address: string;
  user?: {
    id: number;
    fullname: string;
    phone: string;
    email: string;
    address: string;
  };
}

const ShipperListScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const [shippers, setShippers] = useState<Shipper[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statistics, setStatistics] = useState<any>(null);

  // Fetch shippers from API
  const fetchShippers = async (showLoading = true) => {
    try {
      if (showLoading) {
        setLoading(true);
      }
      setError(null);

      const response = await shipperApi.getShippers({
        page: 1,
        per_page: 50 // Get more shippers per page
      }) as any;

      console.log('Shippers API Response:', response);

      // Handle different response formats
      if (response?.results) {
        setShippers(response.results);
      } else if (response?.data?.results) {
        setShippers(response.data.results);
      } else if (response?.shippers) {
        setShippers(response.shippers);
      } else if (Array.isArray(response)) {
        setShippers(response);
      } else {
        console.warn('Unexpected response format:', response);
        setShippers([]);
      }

    } catch (error: any) {
      console.error('Error fetching shippers:', error);
      setError(error.message || 'Không thể tải danh sách shipper');
      setShippers([]);
    } finally {
      setLoading(false);
      if (refreshing) {
        setRefreshing(false);
      }
    }
  };

  // Fetch statistics
  const fetchStatistics = async () => {
    try {
      const response = await shipperApi.getStatistics() as any;
      console.log('Statistics API Response:', response);
      
      // Handle different response formats
      if (response?.data) {
        setStatistics(response.data);
      } else {
        setStatistics(response);
      }
    } catch (error: any) {
      console.error('Error fetching statistics:', error);
    }
  };

  // Load data when component mounts and when screen is focused
  useFocusEffect(
    React.useCallback(() => {
      fetchShippers();
      fetchStatistics();
    }, [])
  );

  // Refresh handler
  const onRefresh = () => {
    setRefreshing(true);
    fetchShippers(false);
    fetchStatistics();
  };

  // Create new shipper handler
  const createShipper = () => {
    navigation.navigate('CreateShipperScreen');
  };

  if (loading && !refreshing) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color="#ea580c" />
        <Text style={styles.loadingText}>Đang tải danh sách shipper...</Text>
      </View>
    );
  }

  if (error && !refreshing && shippers.length === 0) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => fetchShippers()}>
          <Text style={styles.retryButtonText}>Thử lại</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Danh sách shipper</Text>
          {statistics && (
            <Text style={styles.subtitle}>
              Tổng cộng: {statistics.total_shippers} shipper
            </Text>
          )}
        </View>
        <TouchableOpacity style={styles.addButton} onPress={createShipper}>
          <Plus size={20} color="#fff" />
          <Text style={styles.addButtonText}>Thêm</Text>
        </TouchableOpacity>
      </View>

      <ScrollView 
        style={styles.scrollView}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#ea580c']}
            tintColor="#ea580c"
          />
        }
      >
        {shippers.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>Chưa có shipper nào</Text>
            <TouchableOpacity style={styles.createFirstButton} onPress={createShipper}>
              <Text style={styles.createFirstButtonText}>Tạo shipper đầu tiên</Text>
            </TouchableOpacity>
          </View>
        ) : (
          shippers.map((item: Shipper) => (
            <TouchableOpacity 
              key={item.id} 
              style={styles.card} 
              onPress={() => navigation.navigate('ShipperDetailScreen', { shipper: item })}
            >
              <View style={styles.cardHeader}>
                <View style={styles.shipperInfo}>
                  <Text style={styles.name}>{item.fullname || item.user?.fullname || 'Chưa có tên'}</Text>
                  <View style={styles.phoneContainer}>
                    <Text style={styles.phone}>{item.phone || item.user?.phone || 'Chưa có SĐT'}</Text>
                    {(item.phone || item.user?.phone) && (
                      <TouchableOpacity
                        style={styles.callBtn}
                        onPress={() => Linking.openURL(`tel:${item.phone || item.user?.phone}`)}
                      >
                        <Phone size={16} color="#fff" />
                      </TouchableOpacity>
                    )}
                  </View>
                  <Text style={styles.email}>{item.email || item.user?.email || 'Chưa có email'}</Text>
                  <Text style={styles.address} numberOfLines={2}>
                    {item.address || item.user?.address || 'Chưa có địa chỉ'}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.editButton}
                  onPress={() => navigation.navigate('ShipperEditScreen', { shipper: item })}
                >
                  <Text style={styles.editButtonText}>Sửa</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.statsRow}>
                <View style={styles.statBox}>
                  <Text style={styles.statValue}>0</Text>
                  <Text style={styles.statLabel}>Đã giao</Text>
                </View>
                <View style={styles.statBox}>
                  <Text style={styles.statValue}>0</Text>
                  <Text style={styles.statLabel}>Đánh giá</Text>
                </View>
                <View style={styles.statBox}>
                  <Text style={[styles.status, styles.active]}>Sẵn sàng</Text>
                </View>
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#fff7ed', 
    padding: 16 
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  title: { 
    fontSize: 20, 
    fontWeight: 'bold', 
    color: '#1f2937'
  },
  subtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 4,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ea580c',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 8,
  },
  addButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  scrollView: { 
    flex: 1 
  },
  card: { 
    backgroundColor: '#fff', 
    borderRadius: 12, 
    padding: 16, 
    marginBottom: 16, 
    borderWidth: 1, 
    borderColor: '#e5e7eb', 
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  shipperInfo: {
    flex: 1,
    paddingRight: 12,
  },
  name: { 
    fontSize: 16, 
    fontWeight: 'bold', 
    color: '#ea580c',
    marginBottom: 4,
  },
  phoneContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  phone: { 
    fontSize: 13, 
    color: '#6b7280'
  },
  email: {
    fontSize: 13,
    color: '#6b7280',
    marginBottom: 4,
  },
  address: {
    fontSize: 13,
    color: '#6b7280',
    marginBottom: 8,
  },
  editButton: {
    backgroundColor: '#22c55e',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  editButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 12,
  },
  callBtn: { 
    marginLeft: 8, 
    backgroundColor: '#22c55e', 
    borderRadius: 6, 
    paddingHorizontal: 8, 
    paddingVertical: 4 
  },
  statsRow: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  statBox: { 
    alignItems: 'center', 
    flex: 1 
  },
  statValue: { 
    fontSize: 16, 
    fontWeight: 'bold', 
    color: '#1f2937' 
  },
  statLabel: { 
    fontSize: 12, 
    color: '#6b7280',
    marginTop: 2,
  },
  status: { 
    fontSize: 12, 
    fontWeight: 'bold', 
    paddingVertical: 4, 
    paddingHorizontal: 8, 
    borderRadius: 12,
    textAlign: 'center',
  },
  active: { 
    color: '#22c55e', 
    backgroundColor: '#dcfce7' 
  },
  busy: { 
    color: '#f59e0b', 
    backgroundColor: '#fef3c7' 
  },
  
  // Loading states
  loadingText: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 12,
  },
  
  // Error states
  errorText: {
    fontSize: 14,
    color: '#ef4444',
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: '#ea580c',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  
  // Empty states
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 16,
  },
  createFirstButton: {
    backgroundColor: '#ea580c',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  createFirstButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
});

export default ShipperListScreen;
