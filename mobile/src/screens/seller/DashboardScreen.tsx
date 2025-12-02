import React, { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, RefreshControl, View, ScrollView, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { LineChart, BarChart } from 'react-native-chart-kit';
import { Dimensions } from 'react-native';
import { MapPin, Star, Menu, X, ShoppingBag, LogOut } from 'react-native-feather';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { dashboardApi } from '@/services/api';
import { storesService } from '@/services';
import { ApiError } from '@/types';
import { useDispatch } from 'react-redux';
import { AppDispatch } from '@/store';
import { logout } from '@/store/slices/authSlice';

type StoreCardInfo = {
  id: number;
  name: string;
  address?: string | null;
  image?: string | null;
  average_rating: number;
  total_ratings: number;
  is_open: boolean;
};

type StoreDashboardStats = {
  revenue_today: number | string;
  orders_today: number;
  processing_orders: number;
  delivered_orders: number;
  customers_30_days: number;
  average_rating: number;
};

type RevenueTrend = {
  labels: string[];
  data: number[];
};

type TopFood = {
  food_id: number;
  food_name: string;
  quantity: number;
};

type RecentOrder = {
  order_id: number;
  code: string;
  customer: string;
  status: string;
  total: number;
  created_at: string;
  items: string;
};

type StoreDashboardResponse = {
  store: StoreCardInfo;
  stats: StoreDashboardStats;
  revenue_trend: RevenueTrend;
  top_foods: TopFood[];
  recent_orders: RecentOrder[];
  generated_at: string;
};

const FALLBACK_STORE_EMOJI = '🍔';

const ORDER_STATUS_META: Record<string, { label: string; color: string }> = {
  'Chờ xác nhận': { label: 'Chờ xác nhận', color: '#f59e0b' },
  'Đã xác nhận': { label: 'Đã xác nhận', color: '#0ea5e9' },
  'Đang chuẩn bị': { label: 'Đang chuẩn bị', color: '#3b82f6' },
  'Sẵn sàng': { label: 'Sẵn sàng', color: '#6366f1' },
  'Đang giao': { label: 'Đang giao', color: '#a855f7' },
  'Đã giao': { label: 'Đã giao', color: '#10b981' },
  'Đã hủy': { label: 'Đã hủy', color: '#ef4444' },
  'Đã huỷ': { label: 'Đã huỷ', color: '#ef4444' },
};

const normalizeNumber = (value: number | string | null | undefined): number => {
  if (value === null || value === undefined) {
    return 0;
  }
  const parsed = typeof value === 'string' ? parseFloat(value) : value;
  return Number.isFinite(parsed) ? parsed : 0;
};

const formatNumber = (value: number | string | null | undefined): string => {
  return normalizeNumber(value).toLocaleString('vi-VN');
};

const formatCurrency = (value: number | string | null | undefined): string => {
  return `${formatNumber(value)} ₫`;
};

const resolveStoreIcon = (image?: string | null) => {
  if (!image) {
    return FALLBACK_STORE_EMOJI;
  }
  const trimmed = image.trim();
  if (!trimmed || trimmed.startsWith('http') || trimmed.includes('/') || trimmed.length > 4) {
    return FALLBACK_STORE_EMOJI;
  }
  return trimmed;
};

const getOrderStatusMeta = (status?: string) => {
  if (!status) {
    return { label: 'Khác', color: '#6b7280' };
  }
  return ORDER_STATUS_META[status] || { label: status, color: '#6b7280' };
};

const formatOrderTime = (timestamp?: string) => {
  if (!timestamp) {
    return '';
  }
  const parsed = new Date(timestamp);
  if (Number.isNaN(parsed.getTime())) {
    return '';
  }
  return parsed.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
};

const screenWidth = Dimensions.get('window').width;

const menuItems = [
  { title: 'Trang chủ', icon: Menu, section: 'dashboard' },
  { title: 'Mua hàng', icon: ShoppingBag, section: 'buy' },
  { title: 'Quản lí món ăn', icon: ShoppingBag, section: 'foods' },
  { title: 'Quản lí đơn hàng', icon: ShoppingBag, section: 'orders' },
  { title: 'Quản lí khuyến mãi', icon: ShoppingBag, section: 'promotions' },
  { title: 'Thống kê', icon: Menu, section: 'analytics' },
];

type SellerDashboardScreenProps = {
  navigation: NativeStackNavigationProp<any>;
};

const SellerDashboardScreen: React.FC<SellerDashboardScreenProps> = ({ navigation }) => {
  const dispatch = useDispatch<AppDispatch>();
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [activeSection, setActiveSection] = useState('dashboard');
  const [storeId, setStoreId] = useState<number | null>(null);
  const [storeInfo, setStoreInfo] = useState<StoreCardInfo | null>(null);
  const [stats, setStats] = useState<StoreDashboardStats | null>(null);
  const [revenueTrend, setRevenueTrend] = useState<RevenueTrend>({ labels: ['—'], data: [0] });
  const [topFoods, setTopFoods] = useState<TopFood[]>([]);
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(true);

  const handleLogout = async () => {
    try {
      await dispatch(logout()).unwrap();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const fetchDashboardData = useCallback(async (targetStoreId?: number, isRefresh = false) => {
    const idToUse = targetStoreId ?? storeId;
    if (!idToUse) {
      return;
    }

    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const data = (await dashboardApi.getStoreMetrics(idToUse)) as StoreDashboardResponse;
      setStoreInfo(data.store);
      setStats(data.stats);
      setRevenueTrend(data.revenue_trend || { labels: ['—'], data: [0] });
      setTopFoods(data.top_foods || []);
      setRecentOrders(data.recent_orders || []);
      setIsOpen(data.store?.is_open ?? true);
      setLastUpdated(data.generated_at || null);
      setErrorMessage(null);
    } catch (error) {
      const apiError = error as ApiError;
      setErrorMessage(apiError?.message || 'Không thể tải dữ liệu cửa hàng');
    } finally {
      if (isRefresh) {
        setRefreshing(false);
      } else {
        setLoading(false);
      }
    }
  }, [storeId]);

  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      const loadStore = async () => {
        try {
          setLoading(true);
          const myStore = await storesService.getMyStore();
          if (!isActive) {
            return;
          }
          setStoreId(myStore.id);
          setStoreInfo({
            id: myStore.id,
            name: myStore.store_name,
            address: myStore.address,
            image: myStore.image,
            average_rating: myStore.average_rating || 0,
            total_ratings: myStore.total_ratings || 0,
            is_open: true,
          });
          await fetchDashboardData(myStore.id);
        } catch (error) {
          if (!isActive) {
            return;
          }
          const apiError = error as ApiError;
          setErrorMessage(apiError?.message || 'Không thể tải thông tin cửa hàng');
          setLoading(false);
        }
      };

      loadStore();

      return () => {
        isActive = false;
      };
    }, [fetchDashboardData])
  );

  const handleRefresh = useCallback(() => {
    fetchDashboardData(undefined, true);
  }, [fetchDashboardData]);

  const revenueChartData = useMemo(() => ({
    labels: revenueTrend?.labels?.length ? revenueTrend.labels : ['—'],
    datasets: [
      {
        data: revenueTrend?.data?.length ? revenueTrend.data : [0],
        color: (opacity = 1) => `rgba(233, 83, 34, ${opacity})`,
        strokeWidth: 2,
      },
    ],
  }), [revenueTrend]);

  const barChartData = useMemo(() => {
    if (!topFoods.length) {
      return {
        labels: ['—'],
        datasets: [{ data: [0] }],
      };
    }
    return {
      labels: topFoods.map((item) => item.food_name),
      datasets: [
        {
          data: topFoods.map((item) => item.quantity || 0),
        },
      ],
    };
  }, [topFoods]);

  const isInitialLoading = loading && !refreshing;

  const statCards = [
    {
      icon: '💲',
      title: 'Doanh thu hôm nay',
      value: stats ? formatCurrency(stats.revenue_today) : '—',
      helper: lastUpdated
        ? `Cập nhật ${new Date(lastUpdated).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}`
        : 'Trong ngày',
      helperColor: '#10b981',
    },
    {
      icon: '🛒',
      title: 'Đơn hàng mới',
      value: stats ? formatNumber(stats.orders_today) : '—',
      helper: stats ? `${formatNumber(stats.processing_orders)} đang xử lý` : '—',
      helperColor: '#f97316',
    },
    {
      icon: '👥',
      title: 'Khách (30 ngày)',
      value: stats ? formatNumber(stats.customers_30_days) : '—',
      helper: 'Khách duy nhất',
      helperColor: '#0ea5e9',
    },
    {
      icon: '⭐',
      title: 'Đánh giá TB',
      value: stats ? Number(stats.average_rating || 0).toFixed(1) : '—',
      helper: `${storeInfo?.total_ratings ?? 0} lượt`,
      helperColor: '#facc15',
    },
  ];

  const storeAddress = storeInfo?.address || 'Chưa cập nhật địa chỉ';
  const storeRatingText = storeInfo
    ? `${Number(storeInfo.average_rating || 0).toFixed(1)} (${storeInfo.total_ratings} đánh giá)`
    : 'Chưa có đánh giá';
  const storeEmoji = resolveStoreIcon(storeInfo?.image);

  // Import NewOrderListScreen
  const NewOrderListScreen = require('./NewOrderListScreen').default;
  return (
    <View style={{ flex: 1, backgroundColor: '#fff7ed' }}>
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
              {menuItems.map((item, index) => {
                const IconComponent = item.icon;
                return (
                  <TouchableOpacity
                    key={index}
                    style={[styles.menuItem, { backgroundColor: '#ea580c' }, activeSection === item.section && styles.menuItemActive]}
                    onPress={() => {
                      setSidebarVisible(false);
                      setActiveSection(item.section);
                      if (item.section === 'foods') {
                        navigation.navigate('SellerManageMenuScreen');
                      } else if (item.section === 'promotions') {
                        navigation.navigate('SellerVoucherManagementScreen');
                      } else if (item.section === 'buy') {
                        // Navigate to main home screen like a customer
                        navigation.reset({
                          index: 0,
                          routes: [{ name: 'MainTabs', params: { screen: 'Home' } }],
                        });
                      }
                    }}
                  >
                    <IconComponent width={16} height={16} stroke={activeSection === item.section ? '#fff' : '#fff7ed'} />
                    <Text style={[styles.menuText, activeSection === item.section && styles.menuTextActive]}>{item.title}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <View style={styles.logoutContainer}>
              <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
                <LogOut width={16} height={16} stroke="#dc2626" />
                <Text style={styles.logoutLabel}>Đăng xuất</Text>
              </TouchableOpacity>
            </View>
          </View>
        </>
      )}

      {/* Header */}
      <View style={styles.headerNew}>
        <TouchableOpacity onPress={() => setSidebarVisible(true)} style={styles.menuButtonNew}>
          <Menu width={22} height={22} stroke="#ea580c" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitleNew}>Tổng quan</Text>
          <Text style={styles.headerSubtitleNew}>Quản lý cửa hàng của bạn</Text>
        </View>
        <View style={styles.headerActionsNew}>
          <TouchableOpacity style={styles.headerIconButtonNew}><Text style={styles.headerIconTextNew}>🔍</Text></TouchableOpacity>
          <TouchableOpacity style={styles.headerIconButtonNew}><Text style={styles.headerIconTextNew}>🔔</Text><View style={styles.headerBadgeNew}><Text style={styles.headerBadgeTextNew}>2</Text></View></TouchableOpacity>
          <TouchableOpacity style={styles.headerAvatarNew} onPress={() => navigation.navigate('SellerProfileScreen')}><Text style={styles.headerAvatarTextNew}>S</Text></TouchableOpacity>
        </View>
      </View>

      {errorMessage && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorBannerText}>{errorMessage}</Text>
          <TouchableOpacity onPress={() => fetchDashboardData()}>
            <Text style={styles.errorBannerAction}>Thử lại</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Section switch logic */}
      {activeSection === 'orders' ? (
        <NewOrderListScreen />
      ) : activeSection === 'analytics' ? (
        <ScrollView
          contentContainerStyle={{ paddingBottom: 24 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#ea580c" />}
        >
          {isInitialLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#ea580c" />
              <Text style={styles.loadingText}>Đang tải dữ liệu...</Text>
            </View>
          ) : (
            <>
              <View style={{ marginBottom: 20, marginTop: 20 }}>
                <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#1f2937', marginBottom: 12, alignSelf: 'center' }}>Biểu đồ doanh thu</Text>
                <View style={{ backgroundColor: '#fff', borderRadius: 8, padding: 10, borderWidth: 1, borderColor: '#e5e7eb', alignItems: 'center' }}>
                  <LineChart
                    data={revenueChartData}
                    width={screenWidth * 0.9}
                    height={220}
                    chartConfig={{
                      backgroundColor: '#fff',
                      backgroundGradientFrom: '#fff',
                      backgroundGradientTo: '#fff',
                      decimalPlaces: 0,
                      color: (opacity = 1) => `rgba(233, 83, 34, ${opacity})`,
                      labelColor: (opacity = 1) => `rgba(57, 23, 19, ${opacity})`,
                      style: { borderRadius: 16 },
                      propsForDots: { r: '4', strokeWidth: '2', stroke: '#e95322' },
                    }}
                    bezier
                    style={{ borderRadius: 16 }}
                  />
                </View>
              </View>
              <View style={{ marginBottom: 20, marginTop: 20 }}>
                <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#1f2937', marginBottom: 12, alignSelf: 'center' }}>Biểu đồ số lượng món bán</Text>
                <View style={{ backgroundColor: '#fff', borderRadius: 8, padding: 10, borderWidth: 1, borderColor: '#e5e7eb', alignItems: 'center' }}>
                  {topFoods.length === 0 ? (
                    <View style={styles.emptyState}>
                      <Text style={styles.emptyStateText}>Chưa có dữ liệu món bán</Text>
                    </View>
                  ) : (
                    <BarChart
                      data={barChartData}
                      width={screenWidth * 0.9}
                      height={220}
                      yAxisLabel={''}
                      yAxisSuffix={' món'}
                      chartConfig={{
                        backgroundColor: '#fff',
                        backgroundGradientFrom: '#fff',
                        backgroundGradientTo: '#fff',
                        decimalPlaces: 0,
                        color: (opacity = 1) => `rgba(233, 83, 34, ${opacity})`,
                        labelColor: (opacity = 1) => `rgba(57, 23, 19, ${opacity})`,
                        style: { borderRadius: 16 },
                      }}
                      style={{ borderRadius: 16 }}
                    />
                  )}
                </View>
              </View>
            </>
          )}
        </ScrollView>
      ) : (
        <ScrollView
          contentContainerStyle={{ paddingBottom: 24 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#ea580c" />}
        >
          {/* Store Card */}
          <View style={styles.storeCardNew}>
            <View style={styles.storeHeaderNew}>
              <Text style={styles.storeEmojiNew}>{storeEmoji}</Text>
              <View style={styles.storeInfoNew}>
                <Text style={styles.storeNameNew}>{storeInfo?.name || 'Đang tải cửa hàng...'}</Text>
                <View style={styles.storeDetailsNew}>
                  <MapPin width={13} height={13} color="#6b7280" />
                  <Text style={styles.storeAddressNew}>{storeAddress}</Text>
                </View>
                <View style={styles.storeDetailsNew}>
                  <Star width={13} height={13} color="#f59e0b" fill="#f59e0b" />
                  <Text style={styles.storeRatingNew}>{storeRatingText}</Text>
                </View>
              </View>
              <View style={{ alignItems: 'center' }}>
                <TouchableOpacity
                  style={[styles.storeStatusNew, { backgroundColor: isOpen ? '#e0fbe0' : '#fee2e2', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 }]}
                  onPress={() => setIsOpen(!isOpen)}
                >
                  <View style={[styles.statusCircleNew, { backgroundColor: isOpen ? '#10b981' : '#ef4444' }]} />
                </TouchableOpacity>
                <Text style={[styles.statusTextNew, { color: isOpen ? '#10b981' : '#ef4444', marginTop: 4 }]}> {isOpen ? 'Mở cửa' : 'Đóng cửa'} </Text>
              </View>
            </View>
          </View>
          {isInitialLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#ea580c" />
              <Text style={styles.loadingText}>Đang tải dữ liệu...</Text>
            </View>
          ) : (
            <>
              <View style={styles.statsGridNew}>
                {statCards.map((stat, index) => (
                  <View key={`${stat.title}-${index}`} style={[styles.statCardNew, { width: '48%', marginBottom: 12 }]}>
                    <View style={styles.statIconNew}>
                      <Text style={styles.statIconTextNew}>{stat.icon}</Text>
                    </View>
                    <Text style={styles.statValueNew}>{stat.value}</Text>
                    <Text style={styles.statTitleNew}>{stat.title}</Text>
                    <Text style={[styles.statChangeNew, { color: stat.helperColor }]}>{stat.helper}</Text>
                  </View>
                ))}
              </View>

              <View style={styles.sectionNew}>
                <Text style={styles.sectionTitleNew}>Đơn hàng gần đây</Text>
                {recentOrders.length === 0 ? (
                  <View style={styles.emptyState}>
                    <Text style={styles.emptyStateText}>Chưa có đơn hàng gần đây</Text>
                  </View>
                ) : (
                  recentOrders.map((order) => {
                    const statusMeta = getOrderStatusMeta(order.status);
                    return (
                      <View key={order.order_id} style={styles.orderCardNew}>
                        <View style={styles.orderHeaderNew}>
                          <Text style={styles.orderIdNew}>{order.code}</Text>
                          <Text style={styles.orderTimeNew}>{formatOrderTime(order.created_at)}</Text>
                        </View>
                        <Text style={styles.orderCustomerNew}>{order.customer || 'Khách vãng lai'}</Text>
                        <Text style={styles.orderItemsNew}>{order.items || '—'}</Text>
                        <View style={styles.orderFooterNew}>
                          <Text style={styles.orderTotalNew}>{formatCurrency(order.total)}</Text>
                          <View style={[styles.orderStatusNew, { backgroundColor: statusMeta.color }]}>
                            <Text style={styles.orderStatusTextNew}>{statusMeta.label}</Text>
                          </View>
                        </View>
                      </View>
                    );
                  })
                )}
              </View>
            </>
          )}
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  // New styles for updated UI
  headerNew: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18, paddingTop: 18, paddingBottom: 8, backgroundColor: '#fff7ed', borderBottomWidth: 0, marginTop: 25 },
  menuButtonNew: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#f3f4f6', marginRight: 12 },
  headerTitleNew: { fontSize: 20, color: '#1e293b', fontWeight: 'bold' },
  headerSubtitleNew: { fontSize: 13, color: '#64748b', marginTop: 2 },
  headerActionsNew: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerIconButtonNew: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#f3f4f6', marginLeft: 6 },
  headerIconTextNew: { fontSize: 16 },
  headerBadgeNew: { position: 'absolute', top: -4, right: -4, backgroundColor: '#ea580c', borderRadius: 10, minWidth: 18, height: 18, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#fff' },
  headerBadgeTextNew: { fontSize: 11, color: '#fff', fontWeight: 'bold' },
  headerAvatarNew: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#ea580c', alignItems: 'center', justifyContent: 'center', marginLeft: 8 },
  headerAvatarTextNew: { fontSize: 14, color: '#fff', fontWeight: 'bold' },
  errorBanner: { marginHorizontal: 18, marginTop: 12, padding: 12, backgroundColor: '#fee2e2', borderRadius: 12, borderWidth: 1, borderColor: '#fecaca', flexDirection: 'row', alignItems: 'center' },
  errorBannerText: { color: '#991b1b', flex: 1, marginRight: 12, fontSize: 13 },
  errorBannerAction: { color: '#b91c1c', fontWeight: 'bold' },
  loadingContainer: { paddingVertical: 32, alignItems: 'center', justifyContent: 'center' },
  loadingText: { marginTop: 8, color: '#6b7280' },
  emptyState: { padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#f3f4f6', alignItems: 'center' },
  emptyStateText: { color: '#6b7280', fontSize: 13 },

  storeCardNew: { backgroundColor: '#fff', borderRadius: 16, marginHorizontal: 18, marginTop: 18, padding: 18, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, elevation: 2 },
  storeHeaderNew: { flexDirection: 'row', alignItems: 'center' },
  storeEmojiNew: { fontSize: 38, marginRight: 16 },
  storeInfoNew: { flex: 1 },
  storeNameNew: { fontSize: 18, fontWeight: 'bold', color: '#1e293b' },
  storeDetailsNew: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
  storeAddressNew: { fontSize: 13, color: '#6b7280', marginLeft: 4 },
  storeRatingNew: { fontSize: 13, color: '#f59e0b', marginLeft: 4 },
  storeStatusNew: { alignItems: 'center', marginLeft: 8 },
  statusCircleNew: { width: 18, height: 18, borderRadius: 9, backgroundColor: '#ea580c', marginBottom: 2 },
  statusTextNew: { fontSize: 13, color: '#10b981', fontWeight: 'bold' },

  statsGridNew: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginHorizontal: 18, marginTop: 18 },
  statCardNew: { backgroundColor: '#fff', borderRadius: 12, padding: 12, alignItems: 'center', marginHorizontal: 4, borderWidth: 1, borderColor: '#f3f4f6' },
  statIconNew: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#fff7ed', alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  statIconTextNew: { fontSize: 18, color: '#ea580c' },
  statValueNew: { fontSize: 16, fontWeight: 'bold', color: '#ea580c' },
  statTitleNew: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  statChangeNew: { fontSize: 12, color: '#10b981', marginTop: 2 },

  sectionNew: { backgroundColor: '#fff', borderRadius: 16, marginHorizontal: 18, marginTop: 18, padding: 18 },
  sectionTitleNew: { fontSize: 16, fontWeight: 'bold', color: '#ea580c', marginBottom: 8 },
  orderCardNew: { backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 12, shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 4, elevation: 1 },
  orderHeaderNew: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 },
  orderIdNew: { fontSize: 13, color: '#64748b', fontWeight: 'bold' },
  orderTimeNew: { fontSize: 13, color: '#64748b' },
  orderCustomerNew: { fontSize: 15, color: '#1e293b', fontWeight: 'bold', marginBottom: 2 },
  orderItemsNew: { fontSize: 13, color: '#6b7280', marginBottom: 2 },
  orderFooterNew: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 },
  orderTotalNew: { fontSize: 15, color: '#ea580c', fontWeight: 'bold' },
  orderStatusNew: { backgroundColor: '#f59e0b', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 2 },
  orderStatusTextNew: { fontSize: 13, color: '#fff', fontWeight: 'bold' },
  container: { flex: 1, backgroundColor: '#fff7ed' },
  header: { flexDirection: 'row', alignItems: 'center', padding: 16, backgroundColor: '#f59e0b', borderBottomWidth: 1, borderBottomColor: '#e5e7eb' , marginTop: 50},
  menuButton: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#fef3e2', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#e5e7eb', marginRight: 12 },
  headerTitle: { fontSize: 20, color: '#ea580c', fontWeight: 'bold' },
  overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1 },
  sidebar: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 260, backgroundColor: '#f5f2f0ff', borderRightWidth: 0, zIndex: 2, shadowColor: '#000', shadowOffset: { width: 2, height: 0 }, shadowOpacity: 0.18, shadowRadius: 10, elevation: 10 },
  logoContainer: { paddingTop: 24, paddingBottom: 16, borderBottomWidth: 0, alignItems: 'center', backgroundColor: '#ea580c' , height: 160},
  logoHeader: { flexDirection: 'row', justifyContent: 'flex-end', width: '100%', paddingRight: 16 },
  closeButton: { padding: 6, backgroundColor: '#ea580c', borderRadius: 16, marginTop: 20},
  logoBox: { alignItems: 'center', marginTop: -30 },
  logoCircle: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', marginBottom: 8, shadowColor: '#ea580c', shadowOpacity: 0.15, shadowRadius: 8, elevation: 4 },
  logoEmoji: { fontSize: 32 },
  logoText: { fontSize: 18, color: '#fff', fontWeight: 'bold', letterSpacing: 1 },
  menuContainer: { flex: 1, paddingVertical: 16 },
  menuItem: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14, marginHorizontal: 12, borderRadius: 10, marginBottom: 8 },
  menuItemActive: { backgroundColor: '#fff', borderWidth: 0 },
  menuText: { marginLeft: 14, fontSize: 15, color: '#fff', fontWeight: '500' },
  menuTextActive: { color: '#ea580c', fontWeight: 'bold' },
  storeCard: { backgroundColor: '#fff', borderRadius: 12, margin: 16, padding: 16, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, elevation: 2 },
  storeHeader: { flexDirection: 'row', alignItems: 'center' },
  storeEmoji: { fontSize: 36, marginRight: 16 },
  storeInfo: { flex: 1 },
  storeName: { fontSize: 18, fontWeight: 'bold', color: '#1f2937' },
  storeDetails: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
  storeAddress: { fontSize: 12, color: '#6b7280', marginLeft: 4 },
  storeRating: { fontSize: 12, color: '#f59e0b', marginLeft: 4 },
  storeStatus: { marginLeft: 8 },
  statsContainer: { flexDirection: 'row', justifyContent: 'space-between', marginHorizontal: 16, marginBottom: 16 },
  statCard: { flex: 1, backgroundColor: '#fff', borderRadius: 8, padding: 12, alignItems: 'center', marginHorizontal: 4, borderWidth: 1, borderColor: '#e5e7eb' },
  statValue: { fontSize: 16, fontWeight: 'bold', color: '#ea580c' },
  statTitle: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  section: { backgroundColor: '#fff', borderRadius: 12, margin: 16, padding: 16, marginTop: 0 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#ea580c', marginBottom: 8 },
  orderItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  orderCustomer: { fontSize: 14, color: '#1f2937' },
  orderTotal: { fontSize: 14, color: '#10b981' },
  orderStatus: { fontSize: 12, fontWeight: 'bold' },
  addButton: { backgroundColor: '#ea580c', borderRadius: 8, paddingVertical: 12, paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center', margin: 16 },
  logoutContainer: { paddingHorizontal: 18, paddingBottom: 24 },
  logoutButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderRadius: 12, borderWidth: 1, borderColor: '#fecaca', paddingVertical: 12, backgroundColor: '#fff' },
  logoutLabel: { marginLeft: 8, color: '#dc2626', fontWeight: 'bold', fontSize: 14 },
});

export default SellerDashboardScreen;
