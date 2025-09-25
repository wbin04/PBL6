import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking, ScrollView, ActivityIndicator, RefreshControl, Alert } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Phone, Plus, UserCheck, UserX } from 'lucide-react-native';
import { shipperApi, authApi } from '../services/api';

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

interface ShipperApplication {
  id: number;
  fullname: string;
  username: string;
  email: string;
  phone_number: string;
  address: string;
  created_date: string;
  is_shipper_registered: boolean;
}

const ShipperListScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const [activeTab, setActiveTab] = useState<'list' | 'applications'>('list');
  const [shippers, setShippers] = useState<Shipper[]>([]);
  const [applications, setApplications] = useState<ShipperApplication[]>([]);
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

  // Fetch shipper applications
  const fetchApplications = async (showLoading = true) => {
    try {
      if (showLoading) {
        setLoading(true);
      }
      setError(null);

      const response = await authApi.getShipperApplications({
        page: 1,
      }) as any;

      console.log('Applications API Response:', response);

      // Handle different response formats
      if (response?.applications) {
        setApplications(response.applications);
      } else if (response?.data?.applications) {
        setApplications(response.data.applications);
      } else if (Array.isArray(response)) {
        setApplications(response);
      } else {
        console.warn('Unexpected applications response format:', response);
        setApplications([]);
      }

    } catch (error: any) {
      console.error('Error fetching applications:', error);
      setError(error.message || 'Không thể tải danh sách đơn đăng ký');
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

  // Load data when component mounts and when screen is focused
  useFocusEffect(
    React.useCallback(() => {
      if (activeTab === 'list') {
        fetchShippers();
      } else {
        fetchApplications();
      }
      fetchStatistics();
    }, [activeTab])
  );

  // Refresh handler
  const onRefresh = () => {
    setRefreshing(true);
    if (activeTab === 'list') {
      fetchShippers(false);
    } else {
      fetchApplications(false);
    }
    fetchStatistics();
  };

  // Handle approve shipper application
  const handleApproveApplication = async (userId: number, userName: string) => {
    Alert.alert(
      "Chấp nhận đơn đăng ký",
      `Bạn có chắc muốn chấp nhận đơn đăng ký của ${userName}?`,
      [
        { text: "Hủy", style: "cancel" },
        {
          text: "Chấp nhận",
          onPress: async () => {
            try {
              setLoading(true);
              await authApi.approveShipperApplication(userId);
              Alert.alert("Thành công", "Đã chấp nhận đơn đăng ký shipper");
              fetchApplications(); // Refresh applications list
            } catch (error: any) {
              console.error('Error approving application:', error);
              Alert.alert("Lỗi", error?.response?.data?.message || "Không thể chấp nhận đơn đăng ký");
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  // Handle reject shipper application
  const handleRejectApplication = async (userId: number, userName: string) => {
    Alert.alert(
      "Từ chối đơn đăng ký",
      `Bạn có chắc muốn từ chối đơn đăng ký của ${userName}?`,
      [
        { text: "Hủy", style: "cancel" },
        {
          text: "Từ chối",
          style: "destructive",
          onPress: async () => {
            try {
              setLoading(true);
              await authApi.rejectShipperApplication(userId);
              Alert.alert("Thành công", "Đã từ chối đơn đăng ký shipper");
              fetchApplications(); // Refresh applications list
            } catch (error: any) {
              console.error('Error rejecting application:', error);
              Alert.alert("Lỗi", error?.response?.data?.message || "Không thể từ chối đơn đăng ký");
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  if (loading && !refreshing) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color="#ea580c" />
        <Text style={styles.loadingText}>
          {activeTab === 'list' ? 'Đang tải danh sách shipper...' : 'Đang tải đơn đăng ký...'}
        </Text>
      </View>
    );
  }

  if (error && !refreshing && (activeTab === 'list' ? shippers.length === 0 : applications.length === 0)) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity 
          style={styles.retryButton} 
          onPress={() => activeTab === 'list' ? fetchShippers() : fetchApplications()}
        >
          <Text style={styles.retryButtonText}>Thử lại</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Quản lý shipper</Text>
          {statistics && (
            <Text style={styles.subtitle}>
              Tổng cộng: {statistics.total_shippers} shipper
            </Text>
          )}
        </View>
      </View>

      {/* Tab Toggle */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'list' && styles.activeTab]}
          onPress={() => setActiveTab('list')}
        >
          <Text style={[styles.tabText, activeTab === 'list' && styles.activeTabText]}>
            Danh sách
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'applications' && styles.activeTab]}
          onPress={() => setActiveTab('applications')}
        >
          <Text style={[styles.tabText, activeTab === 'applications' && styles.activeTabText]}>
            Đơn đăng ký
          </Text>
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
        {activeTab === 'list' ? (
          // Shipper List
          shippers.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>Chưa có shipper nào</Text>
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
          )
        ) : (
          // Applications List
          applications.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>Chưa có đơn đăng ký nào</Text>
            </View>
          ) : (
            applications.map((item: ShipperApplication) => (
              <View key={item.id} style={styles.applicationCard}>
                <View style={styles.cardHeader}>
                  <View style={styles.shipperInfo}>
                    <Text style={styles.name}>{item.fullname || 'Chưa có tên'}</Text>
                    <View style={styles.phoneContainer}>
                      <Text style={styles.phone}>{item.phone_number || 'Chưa có SĐT'}</Text>
                      {item.phone_number && (
                        <TouchableOpacity
                          style={styles.callBtn}
                          onPress={() => Linking.openURL(`tel:${item.phone_number}`)}
                        >
                          <Phone size={16} color="#fff" />
                        </TouchableOpacity>
                      )}
                    </View>
                    <Text style={styles.email}>{item.email || 'Chưa có email'}</Text>
                    <Text style={styles.address} numberOfLines={2}>
                      {item.address || 'Chưa có địa chỉ'}
                    </Text>
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
            ))
          )
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
  
  // Tab styles
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    marginBottom: 16,
    padding: 4,
  },
  tab: {
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
    fontWeight: '600',
    color: '#6b7280',
  },
  activeTabText: {
    color: '#fff',
  },
  
  // Application styles
  applicationCard: {
    backgroundColor: '#fff', 
    borderRadius: 12, 
    padding: 16, 
    marginBottom: 16, 
    borderWidth: 1, 
    borderColor: '#fbbf24',
    borderLeftWidth: 4,
    borderLeftColor: '#f59e0b',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  applicationDate: {
    fontSize: 12,
    color: '#f59e0b',
    fontWeight: '500',
    marginTop: 4,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  approveButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#22c55e',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 6,
  },
  approveButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  rejectButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ef4444',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 6,
  },
  rejectButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
});

export default ShipperListScreen;
