import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Linking,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  Alert,
  TextInput,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Phone, UserCheck, UserX, Menu, BarChart3, ShoppingBag, Package, Users, Star } from 'lucide-react-native';
import { Ionicons } from '@expo/vector-icons';
import { shipperApi, authApi } from '../services/api';
import { Fonts } from '../constants/Fonts';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAdmin } from '@/contexts/AdminContext';
import Sidebar from '@/components/sidebar';

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

const menuItems = [
  { title: 'Trang chủ', icon: BarChart3, section: 'dashboard' },
  // { title: 'Mua hàng', icon: ShoppingBag, section: 'buy' },
  { title: 'Quản lý tài khoản', icon: Users, section: 'customers' },
  { title: 'Quản lý cửa hàng', icon: ShoppingBag, section: 'stores' },
  { title: 'Quản lý đơn hàng', icon: Package, section: 'orders' },
  { title: 'Quản lý shipper', icon: Users, section: 'shippers' },
  { title: 'Khuyến mãi hệ thống', icon: Star, section: 'promotions' },
];

interface ShipperListScreenProps {
  onMenuPress?: () => void;
}

const ShipperListScreen: React.FC<ShipperListScreenProps> = ({ onMenuPress }) => {
  const navigation = useNavigation<any>();
  const [activeTab, setActiveTab] = useState<'list' | 'applications'>('list');
  const [shippers, setShippers] = useState<Shipper[]>([]);
  const [applications, setApplications] = useState<ShipperApplication[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statistics, setStatistics] = useState<any>(null);
  const [searchText, setSearchText] = useState('');

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

  // Fetch shippers from API
  const fetchShippers = async (showLoading = true) => {
    try {
      if (showLoading) {
        setLoading(true);
      }
      setError(null);

      const response = (await shipperApi.getShippers({
        page: 1,
        per_page: 50,
      })) as any;

      console.log('Shippers API Response:', response);

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
      const response = (await shipperApi.getStatistics()) as any;
      console.log('Statistics API Response:', response);

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

      const response = (await authApi.getShipperApplications({
        page: 1,
      })) as any;

      console.log('Applications API Response:', response);

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
    }, [activeTab]),
  );

  // Refresh handler
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    if (activeTab === 'list') {
      fetchShippers(false);
    } else {
      fetchApplications(false);
    }
    fetchStatistics();
  }, [activeTab]);

  // Handle approve shipper application
  const handleApproveApplication = async (userId: number, userName: string) => {
    Alert.alert(
      'Chấp nhận đơn đăng ký',
      `Bạn có chắc muốn chấp nhận đơn đăng ký của ${userName}?`,
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Chấp nhận',
          onPress: async () => {
            try {
              setLoading(true);
              await authApi.approveShipperApplication(userId);
              Alert.alert('Thành công', 'Đã chấp nhận đơn đăng ký shipper');
              fetchApplications();
            } catch (error: any) {
              console.error('Error approving application:', error);
              Alert.alert(
                'Lỗi',
                error?.response?.data?.message || 'Không thể chấp nhận đơn đăng ký',
              );
            } finally {
              setLoading(false);
            }
          },
        },
      ],
    );
  };

  // Handle reject shipper application
  const handleRejectApplication = async (userId: number, userName: string) => {
    Alert.alert(
      'Từ chối đơn đăng ký',
      `Bạn có chắc muốn từ chối đơn đăng ký của ${userName}?`,
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Từ chối',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              await authApi.rejectShipperApplication(userId);
              Alert.alert('Thành công', 'Đã từ chối đơn đăng ký shipper');
              fetchApplications();
            } catch (error: any) {
              console.error('Error rejecting application:', error);
              Alert.alert(
                'Lỗi',
                error?.response?.data?.message || 'Không thể từ chối đơn đăng ký',
              );
            } finally {
              setLoading(false);
            }
          },
        },
      ],
    );
  };

  // Search functionality
  const filteredShippers = shippers.filter(
    (shipper) =>
      shipper.fullname?.toLowerCase().includes(searchText.toLowerCase()) ||
      shipper.user?.fullname?.toLowerCase().includes(searchText.toLowerCase()) ||
      shipper.phone?.toLowerCase().includes(searchText.toLowerCase()) ||
      shipper.user?.phone?.toLowerCase().includes(searchText.toLowerCase()) ||
      shipper.email?.toLowerCase().includes(searchText.toLowerCase()) ||
      shipper.user?.email?.toLowerCase().includes(searchText.toLowerCase()),
  );

  const filteredApplications = applications.filter(
    (app) =>
      app.fullname?.toLowerCase().includes(searchText.toLowerCase()) ||
      app.email?.toLowerCase().includes(searchText.toLowerCase()) ||
      app.phone_number?.toLowerCase().includes(searchText.toLowerCase()),
  );

  const renderShipperItem = ({ item }: { item: Shipper }) => (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.9}
      onPress={() => navigation.navigate('ShipperDetailScreen', { shipper: item })}
    >
      <View style={styles.cardHeader}>
        <View style={styles.shipperIcon}>
          <Text style={styles.shipperIconText}>
            {(item.fullname || item.user?.fullname || 'S').charAt(0).toUpperCase()}
          </Text>
        </View>
        <View style={styles.shipperInfo}>
          <Text style={styles.shipperName}>
            {item.fullname || item.user?.fullname || 'Chưa có tên'}
          </Text>
          <View style={styles.phoneRow}>
            <Text style={styles.shipperPhone}>
              📞 {item.phone || item.user?.phone || 'Chưa có SĐT'}
            </Text>
            {(item.phone || item.user?.phone) && (
              <TouchableOpacity
                style={styles.callButton}
                onPress={(e) => {
                  e.stopPropagation();
                  Linking.openURL(`tel:${item.phone || item.user?.phone}`);
                }}
              >
                <Phone size={14} color="#fff" />
              </TouchableOpacity>
            )}
          </View>
          <Text style={styles.shipperEmail}>
            ✉️ {item.email || item.user?.email || 'Chưa có email'}
          </Text>
          <Text style={styles.shipperAddress} numberOfLines={2}>
            📍 {item.address || item.user?.address || 'Chưa có địa chỉ'}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.editButton}
          onPress={(e) => {
            e.stopPropagation();
            navigation.navigate('ShipperEditScreen', { shipper: item });
          }}
        >
          <Ionicons name="create-outline" size={18} color="#fff" />
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
          <View style={styles.statusBadge}>
            <Text style={styles.statusText}>Sẵn sàng</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderApplicationItem = ({ item }: { item: ShipperApplication }) => (
    <View style={styles.applicationCard}>
      <View style={styles.cardHeader}>
        <View style={styles.applicationIcon}>
          <Text style={styles.applicationIconText}>
            {item.fullname.charAt(0).toUpperCase()}
          </Text>
        </View>
        <View style={styles.applicationInfo}>
          <Text style={styles.applicationName}>{item.fullname}</Text>
          <View style={styles.phoneRow}>
            <Text style={styles.applicationPhone}>
              📞 {item.phone_number || 'Chưa có SĐT'}
            </Text>
            {item.phone_number && (
              <TouchableOpacity
                style={styles.callButton}
                onPress={() => Linking.openURL(`tel:${item.phone_number}`)}
              >
                <Phone size={14} color="#fff" />
              </TouchableOpacity>
            )}
          </View>
          <Text style={styles.applicationEmail}>
            ✉️ {item.email || 'Chưa có email'}
          </Text>
          <Text style={styles.applicationAddress} numberOfLines={2}>
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
          <UserX size={16} color="#fff" />
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
          name={activeTab === 'list' ? 'bicycle-outline' : 'document-text-outline'}
          size={64}
          color="#d1d5db"
        />
        <Text style={styles.emptyText}>
          {searchText
            ? `Không tìm thấy ${activeTab === 'list' ? 'shipper' : 'đơn đăng ký'} nào`
            : `Chưa có ${activeTab === 'list' ? 'shipper' : 'đơn đăng ký'} nào`}
        </Text>
      </View>
    );
  };

  // ✅ thêm tính tổng cho result bar (chỉ dùng để hiển thị)
  const totalFound =
    activeTab === 'list' ? filteredShippers.length : filteredApplications.length;

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
            navigation.navigate('StoreListScreen');
          } else if (section === 'orders') {
            navigation.navigate('OrderListScreen');
          } else if (section === 'shippers') {
            // Stay on current screen
          } else if (section === 'promotions') {
            navigation.navigate('VoucherManagementScreen');
          }
        }}
      />
      <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.headerWrap}>
        <View style={styles.headerTopRow}>
          <TouchableOpacity
            onPress={handleMenuPress}
            style={styles.roundIconBtn}
          >
            <Menu size={24} color="#eb552d" />
          </TouchableOpacity>

          <Text style={styles.headerTitle}>Shipper</Text>

          <View style={{ width: 40 }} />
        </View>

        {/* Thanh tìm kiếm trong header - đổi UI như StoreListScreen */}
        <View style={styles.searchRow}>
          <View style={styles.searchBox}>
            <TextInput
              style={styles.searchInput}
              placeholder={
                activeTab === 'list'
                  ? 'Tìm theo tên, SĐT, email...'
                  : 'Tìm theo tên, SĐT, email...'
              }
              placeholderTextColor="#9ca3af"
              value={searchText}
              onChangeText={setSearchText}
              returnKeyType="search"
            />
            {searchText.length > 0 && (
              <TouchableOpacity
                onPress={() => setSearchText('')}
                style={styles.clearBtn}
              >
                <Ionicons name="close-circle" size={16} color="#9ca3af" />
              </TouchableOpacity>
            )}
            <TouchableOpacity style={styles.searchBtn} activeOpacity={0.8}>
              <Ionicons name="search" size={16} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* FILTER TABS giống restaurants/index.tsx */}
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
          <View
            style={[styles.countBadge, activeTab === 'list' && styles.countBadgeActive]}
          >
            <Text
              style={[styles.countText, activeTab === 'list' && styles.countTextActive]}
            >
              {shippers.length}
            </Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.tab,
            activeTab === 'applications' && styles.tabActive,
          ]}
          onPress={() => {
            setActiveTab('applications');
            setSearchText('');
          }}
          activeOpacity={0.7}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === 'applications' && styles.tabTextActive,
            ]}
          >
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
          Tìm thấy <Text style={styles.foundNum}>{totalFound}</Text>{' '}
          {activeTab === 'list' ? 'shipper' : 'đơn đăng ký'}
        </Text>
      </View>

      {/* LIST + REFRESH giữ nguyên logic */}
      {loading &&
      (activeTab === 'list' ? filteredShippers : filteredApplications).length ===
        0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#ea580c" />
          <Text style={styles.loadingText}>
            {activeTab === 'list'
              ? 'Đang tải shipper...'
              : 'Đang tải đơn đăng ký...'}
          </Text>
        </View>
      ) : error &&
        !refreshing &&
        (activeTab === 'list'
          ? filteredShippers
          : filteredApplications
        ).length === 0 ? (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={64} color="#ef4444" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() =>
              activeTab === 'list' ? fetchShippers() : fetchApplications()
            }
          >
            <Ionicons name="refresh-outline" size={18} color="#fff" />
            <Text style={styles.retryButtonText}>Thử lại</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList<any>
          data={activeTab === 'list' ? filteredShippers : filteredApplications}
          keyExtractor={(item) => item.id.toString()}
          renderItem={
            activeTab === 'list'
              ? (info) => renderShipperItem(info as any)
              : (info) => renderApplicationItem(info as any)
          }
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
  // chỉnh lại giống StoreListScreen
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

  // FILTER / TABS giống restaurants/index.tsx
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

  // LIST CONTENT
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 16,
  },

  // Shipper Card
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
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  shipperIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#ea580c',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  shipperIconText: {
    color: '#fff',
    fontSize: 20,
    fontFamily: Fonts.LeagueSpartanBold,
  },
  shipperInfo: {
    flex: 1,
  },
  shipperName: {
    fontSize: 16,
    fontFamily: Fonts.LeagueSpartanBold,
    color: '#1f2937',
    marginBottom: 4,
  },
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  shipperPhone: {
    fontSize: 13,
    color: '#6b7280',
    fontFamily: Fonts.LeagueSpartanRegular,
    marginRight: 8,
  },
  callButton: {
    backgroundColor: '#10b981',
    padding: 4,
    borderRadius: 6,
  },
  shipperEmail: {
    fontSize: 13,
    color: '#6b7280',
    fontFamily: Fonts.LeagueSpartanRegular,
    marginBottom: 4,
  },
  shipperAddress: {
    fontSize: 13,
    color: '#6b7280',
    fontFamily: Fonts.LeagueSpartanRegular,
  },
  editButton: {
    backgroundColor: '#22c55e',
    padding: 8,
    borderRadius: 8,
    marginLeft: 8,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  statBox: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: 16,
    fontFamily: Fonts.LeagueSpartanBold,
    color: '#1f2937',
  },
  statLabel: {
    fontSize: 12,
    color: '#6b7280',
    fontFamily: Fonts.LeagueSpartanRegular,
    marginTop: 2,
  },
  statusBadge: {
    backgroundColor: '#dcfce7',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  statusText: {
    fontSize: 11,
    color: '#22c55e',
    fontFamily: Fonts.LeagueSpartanBold,
  },

  // Application Card
  applicationCard: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderLeftWidth: 4,
    borderLeftColor: '#f59e0b',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  applicationIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#f59e0b',
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
  applicationPhone: {
    fontSize: 13,
    color: '#6b7280',
    fontFamily: Fonts.LeagueSpartanRegular,
    marginRight: 8,
  },
  applicationEmail: {
    fontSize: 13,
    color: '#6b7280',
    fontFamily: Fonts.LeagueSpartanRegular,
    marginBottom: 4,
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
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
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

  // Loading / Error / Empty
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  errorText: {
    fontSize: 14,
    color: '#ef4444',
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 20,
    fontFamily: Fonts.LeagueSpartanRegular,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#ea580c',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 999,
    shadowColor: '#ea580c',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  retryButtonText: {
    fontSize: 14,
    color: '#fff',
    fontFamily: Fonts.LeagueSpartanSemiBold,
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
});

export default ShipperListScreen;
