import React, { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, RefreshControl, View, ScrollView, Text, StyleSheet, TouchableOpacity, Modal, Dimensions } from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { MapPin, Star, Menu, ShoppingBag, LogOut, Bell, RefreshCw, TrendingUp, DollarSign, Package, Users, UserX, User } from 'lucide-react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { dashboardApi } from '@/services/api';
import { storesService } from '@/services';
import { ApiError } from '@/types';
import { useDispatch } from 'react-redux';
import { AppDispatch } from '@/store';
import { logout } from '@/store/slices/authSlice';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Fonts } from '@/constants/Fonts';
import Sidebar from '@/components/sidebar';

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
const screenWidth = Dimensions.get('window').width;
const CONTENT_PADDING = 16;

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
  if (value === null || value === undefined) return 0;
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
  if (!image) return FALLBACK_STORE_EMOJI;
  const trimmed = image.trim();
  if (!trimmed || trimmed.startsWith('http') || trimmed.includes('/') || trimmed.length > 4) {
    return FALLBACK_STORE_EMOJI;
  }
  return trimmed;
};

const getOrderStatusMeta = (status?: string) => {
  if (!status) return { label: 'Khác', color: '#6b7280' };
  return ORDER_STATUS_META[status] || { label: status, color: '#6b7280' };
};

const formatOrderTime = (timestamp?: string) => {
  if (!timestamp) return '';
  const parsed = new Date(timestamp);
  if (Number.isNaN(parsed.getTime())) return '';
  return parsed.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
};

const menuItems = [
  { title: 'Trang chủ', icon: Menu, section: 'dashboard' },
  // { title: 'Mua hàng', icon: ShoppingBag, section: 'buy' },
  { title: 'Quản lí món ăn', icon: ShoppingBag, section: 'foods' },
  { title: 'Quản lí đơn hàng', icon: ShoppingBag, section: 'orders' },
  { title: 'Quản lí khuyến mãi', icon: ShoppingBag, section: 'promotions' },
  { title: 'Thống kê', icon: Menu, section: 'analytics' },
];

type SellerDashboardScreenProps = {
  navigation: NativeStackNavigationProp<any>;
  route?: { params?: { section?: string } };
};

const SellerDashboardScreen: React.FC<SellerDashboardScreenProps> = ({ navigation, route }) => {
  const dispatch = useDispatch<AppDispatch>();
  
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [activeSection, setActiveSection] = useState(route?.params?.section ?? 'dashboard');
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
  const [showChart, setShowChart] = useState(false);

  const handleLogout = async () => {
    try {
      await dispatch(logout()).unwrap();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const fetchDashboardData = useCallback(async (targetStoreId?: number, isRefresh = false) => {
    const idToUse = targetStoreId ?? storeId;
    if (!idToUse) return;

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
      if (route?.params?.section) {
        setActiveSection(route.params.section);
      }

      let isActive = true;

      const loadStore = async () => {
        try {
          setLoading(true);
          const myStore = await storesService.getMyStore();
          if (!isActive) return;
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
          if (!isActive) return;
          const apiError = error as ApiError;
          setErrorMessage(apiError?.message || 'Không thể tải thông tin cửa hàng');
          setLoading(false);
        }
      };

      loadStore();

      return () => {
        isActive = false;
      };
    }, [route?.params?.section, fetchDashboardData])
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

  const isInitialLoading = loading && !refreshing;

  const statCards = [
    {
      icon: DollarSign,
      title: 'Doanh thu hôm nay',
      value: stats ? formatCurrency(stats.revenue_today) : '—',
      helper: lastUpdated
        ? `Cập nhật ${new Date(lastUpdated).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}`
        : 'Trong ngày',
    },
    {
      icon: Package,
      title: 'Đơn hàng mới',
      value: stats ? formatNumber(stats.orders_today) : '—',
      helper: stats ? `${formatNumber(stats.processing_orders)} đang xử lý` : '—',
    },
    {
      icon: Users,
      title: 'Khách (30 ngày)',
      value: stats ? formatNumber(stats.customers_30_days) : '—',
      helper: 'Khách duy nhất',
    },
    {
      icon: Star,
      title: 'Đánh giá TB',
      value: stats ? Number(stats.average_rating || 0).toFixed(1) : '—',
      helper: `${storeInfo?.total_ratings ?? 0} lượt`,
    },
  ];

  const storeEmoji = resolveStoreIcon(storeInfo?.image);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <Sidebar
        isOpen={sidebarVisible}
        onClose={() => setSidebarVisible(false)}
        menuItems={menuItems}
        onMenuItemPress={(section) => {
          setSidebarVisible(false);
          
          // Handle navigation based on section
          if (section === 'foods') {
            navigation.navigate('SellerManageMenuScreen');
          } else if (section === 'promotions') {
            navigation.navigate('SellerVoucherManagementScreen');
          } else if (section === 'orders') {
            navigation.navigate('NewOrderListScreen');
          } else if (section === 'analytics') {
            setActiveSection('analytics');
          } else if (section === 'buy') {
            // Navigate to customer shopping mode
            navigation.reset({ index: 0, routes: [{ name: 'MainTabs' }] });
          } else {
            setActiveSection(section);
          }
        }}
      />

      <View style={styles.wrapper}>
        <View style={styles.mainContent}>
          {/* Header */}
          <View style={styles.headerWrap}>
            <View style={styles.headerTopRow}>
              <TouchableOpacity
                onPress={() => setSidebarVisible(true)}
                style={styles.roundIconBtn}
              >
                <Menu size={24} color="#eb552d" />
              </TouchableOpacity>

              <Text style={styles.headerTitle}>Tổng quan cửa hàng</Text>

              <View style={{ flexDirection: 'row', gap: 10 }}>
                <TouchableOpacity 
                  style={styles.roundIconBtn}
                  onPress={() => navigation.navigate('SellerProfileScreen')}
                >
                  <User size={24} color="#eb552d" />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.roundIconBtn}
                  onPress={handleRefresh}
                >
                  <RefreshCw size={24} color="#eb552d" />
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Error banner */}
          {errorMessage && (
            <View style={styles.errorBanner}>
              <Text style={styles.errorText}>{errorMessage}</Text>
              <TouchableOpacity
                style={styles.retryButton}
                onPress={() => fetchDashboardData()}
              >
                <Text style={styles.retryButtonText}>Thử lại</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Section Content */}
          {activeSection === 'analytics' ? (
            <ScrollView
              contentContainerStyle={styles.scrollContent}
              refreshControl={
                <RefreshControl 
                  refreshing={refreshing} 
                  onRefresh={handleRefresh}
                  colors={['#EB552D']}
                  tintColor="#EB552D"
                />
              }
            >
              {isInitialLoading ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color="#EB552D" />
                  <Text style={styles.loadingText}>Đang tải dữ liệu...</Text>
                </View>
              ) : (
                <>
                  {/* Chart Section */}
                  <View style={styles.sectionCardContainer}>
                    <View style={styles.sectionHeaderRow}>
                      <Text style={styles.sectionTitle}>Biểu đồ doanh thu</Text>
                      <TouchableOpacity onPress={() => setShowChart(true)}>
                        <Text style={styles.sectionLink}>Xem chi tiết</Text>
                      </TouchableOpacity>
                    </View>

                    <View style={styles.chartCard}>
                      <LineChart
                        data={revenueChartData}
                        width={screenWidth * 0.9}
                        height={220}
                        chartConfig={{
                          backgroundColor: '#ffffff',
                          backgroundGradientFrom: '#ffffff',
                          backgroundGradientTo: '#ffffff',
                          decimalPlaces: 0,
                          color: (opacity = 1) => `rgba(233, 83, 34, ${opacity})`,
                          labelColor: (opacity = 1) => `rgba(57, 23, 19, ${opacity})`,
                          style: { borderRadius: 16 },
                          propsForDots: { r: '4', strokeWidth: '2', stroke: '#EB552D' },
                        }}
                        bezier
                        style={{ borderRadius: 16 }}
                      />
                    </View>
                  </View>

                  {/* Top Foods */}
                  <View style={styles.sectionCardContainer}>
                    <Text style={styles.sectionTitle}>Món bán chạy</Text>
                    {topFoods.length === 0 ? (
                      <View style={styles.emptyState}>
                        <Text style={styles.emptyStateText}>Chưa có dữ liệu món bán</Text>
                      </View>
                    ) : (
                      topFoods.map((food, idx) => (
                        <View key={food.food_id} style={styles.foodCard}>
                          <View style={styles.foodRank}>
                            <Text style={styles.foodRankText}>#{idx + 1}</Text>
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.foodName}>{food.food_name}</Text>
                            <Text style={styles.foodQuantity}>
                              Đã bán: <Text style={styles.foodQuantityValue}>{food.quantity}</Text> món
                            </Text>
                          </View>
                        </View>
                      ))
                    )}
                  </View>
                </>
              )}
            </ScrollView>
          ) : (
            <ScrollView
              contentContainerStyle={styles.scrollContent}
              refreshControl={
                <RefreshControl 
                  refreshing={refreshing} 
                  onRefresh={handleRefresh}
                  colors={['#EB552D']}
                  tintColor="#EB552D"
                />
              }
            >
              {/* Store Card */}
              <View style={styles.storeCard}>
                <View style={styles.storeHeader}>
                  <Text style={styles.storeEmoji}>{storeEmoji}</Text>
                  <View style={styles.storeInfo}>
                    <Text style={styles.storeName}>
                      {storeInfo?.name || 'Đang tải cửa hàng...'}
                    </Text>
                    <View style={styles.storeDetails}>
                      <MapPin size={13} color="#6b7280" />
                      <Text style={styles.storeAddress}>
                        {storeInfo?.address ? String(storeInfo.address) : 'Chưa cập nhật địa chỉ'}
                      </Text>
                    </View>
                    <View style={styles.storeDetails}>
                      <Star size={13} color="#f59e0b" fill="#f59e0b" />
                      <Text style={styles.storeRating}>
                        {storeInfo
                          ? `${Number(storeInfo.average_rating || 0).toFixed(1)} (${storeInfo.total_ratings || 0} đánh giá)`
                          : 'Chưa có đánh giá'}
                      </Text>
                    </View>
                  </View>
                  <View style={{ alignItems: 'center' }}>
                    <TouchableOpacity
                      style={[
                        styles.storeStatus,
                        { backgroundColor: isOpen ? '#e0fbe0' : '#fee2e2' }
                      ]}
                      onPress={() => setIsOpen(!isOpen)}
                    >
                      <View 
                        style={[
                          styles.statusCircle,
                          { backgroundColor: isOpen ? '#10b981' : '#ef4444' }
                        ]}
                      />
                    </TouchableOpacity>
                    <Text 
                      style={[
                        styles.statusText,
                        { color: isOpen ? '#10b981' : '#ef4444' }
                      ]}
                    >
                      {isOpen ? 'Mở cửa' : 'Đóng cửa'}
                    </Text>
                  </View>
                </View>
              </View>

              {isInitialLoading ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color="#EB552D" />
                  <Text style={styles.loadingText}>Đang tải dữ liệu...</Text>
                </View>
              ) : (
                <>
                  {/* Stat Cards giống AdminDashboard */}
                  <View style={styles.statGrid}>
                    {statCards.map((stat, index) => {
                      const IconComponent = stat.icon;
                      return (
                        <View key={index} style={styles.statCard}>
                          <View style={styles.statIconWrapper}>
                            <IconComponent size={20} color="#EB552D" />
                          </View>
                          <Text style={styles.statValue}>{stat.value}</Text>
                          <Text style={styles.statTitle}>{stat.title}</Text>
                          <View style={styles.statHelperBadge}>
                            <Text style={styles.statHelperText}>{stat.helper}</Text>
                          </View>
                        </View>
                      );
                    })}
                  </View>

                  {/* Recent Orders */}
                  <View style={styles.sectionCardContainer}>
                    <View style={styles.sectionHeaderRow}>
                      <Text style={styles.sectionTitle}>Đơn hàng gần đây</Text>
                      <TouchableOpacity 
                        onPress={() => navigation.navigate('NewOrderListScreen')}
                      >
                        <Text style={styles.sectionLink}>Xem tất cả</Text>
                      </TouchableOpacity>
                    </View>

                    {recentOrders.length === 0 ? (
                      <View style={styles.emptyState}>
                        <Text style={styles.emptyStateText}>Chưa có đơn hàng gần đây</Text>
                      </View>
                    ) : (
                      recentOrders.map((order) => {
                        const statusMeta = getOrderStatusMeta(order.status);
                        return (
                          <View key={order.order_id} style={styles.orderCard}>
                            <View style={styles.orderHeader}>
                              <Text style={styles.orderId}>{order.code}</Text>
                              <Text style={styles.orderTime}>
                                {formatOrderTime(order.created_at)}
                              </Text>
                            </View>
                            <Text style={styles.orderCustomer}>
                              {order.customer || 'Khách vãng lai'}
                            </Text>
                            <Text style={styles.orderItems}>
                              {typeof order.items === 'string' ? order.items : '—'}
                            </Text>
                            <View style={styles.orderFooter}>
                              <Text style={styles.orderTotal}>
                                {formatCurrency(order.total)}
                              </Text>
                              <View 
                                style={[
                                  styles.orderStatus,
                                  { backgroundColor: statusMeta.color }
                                ]}
                              >
                                <Text style={styles.orderStatusText}>
                                  {statusMeta.label}
                                </Text>
                              </View>
                            </View>
                          </View>
                        );
                      })
                    )}
                  </View>

                  {/* Report Card */}
                  <TouchableOpacity
                    style={styles.reportCard}
                    onPress={() => setActiveSection('analytics')}
                    activeOpacity={0.8}
                  >
                    <View style={styles.reportLeft}>
                      <View style={styles.reportIconWrapper}>
                        <TrendingUp size={20} color="#EB552D" />
                      </View>
                      <Text style={styles.reportText}>Xem thống kê chi tiết</Text>
                    </View>
                    <Text style={{ fontSize: 18, color: '#9ca3af' }}>→</Text>
                  </TouchableOpacity>
                </>
              )}
            </ScrollView>
          )}
        </View>

        {/* Modal Chart */}
        <Modal visible={showChart} animationType="slide" transparent>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Biểu đồ doanh thu</Text>
              <LineChart
                data={revenueChartData}
                width={screenWidth * 0.85}
                height={220}
                chartConfig={{
                  backgroundColor: '#ffffff',
                  backgroundGradientFrom: '#ffffff',
                  backgroundGradientTo: '#ffffff',
                  decimalPlaces: 0,
                  color: (opacity = 1) => `rgba(233, 83, 34, ${opacity})`,
                  labelColor: (opacity = 1) => `rgba(57, 23, 19, ${opacity})`,
                  style: { borderRadius: 16 },
                  propsForDots: { r: '4', strokeWidth: '2', stroke: '#EB552D' },
                }}
                bezier
                style={{ marginVertical: 8, borderRadius: 16 }}
              />
              <TouchableOpacity 
                style={styles.closeBtn} 
                onPress={() => setShowChart(false)}
              >
                <Text style={styles.closeBtnText}>Đóng</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#fff' },
  wrapper: {
    flex: 1,
    flexDirection: 'row',
    alignSelf: 'center',
    width: '100%',
    maxWidth: 480,
  },
  mainContent: { flex: 1, backgroundColor: '#ffffff' },

  // Header giống AdminDashboard
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
    marginBottom: 12,
    paddingHorizontal: CONTENT_PADDING,
  },
  roundIconBtn: {
    backgroundColor: '#ffffff',
    padding: 10,
    borderRadius: 999,
    shadowColor: '#000',
    shadowOffset: { width: 1, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 5,
    elevation: 1,
  },
  headerTitle: {
    fontSize: 18,
    color: '#ffffff',
    fontFamily: Fonts.LeagueSpartanExtraBold,
  },

  // Error banner
  errorBanner: {
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    padding: 12,
    borderRadius: 8,
    margin: 16,
    marginBottom: 0,
  },
  errorText: {
    color: '#b91c1c',
    fontSize: 12,
    marginBottom: 8,
    fontFamily: Fonts.LeagueSpartanRegular,
  },
  retryButton: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#b91c1c',
    borderRadius: 6,
  },
  retryButtonText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
    fontFamily: Fonts.LeagueSpartanBold,
  },

  // Scroll content
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 32,
    paddingTop: 16,
  },
  loadingContainer: {
    alignItems: 'center',
    marginBottom: 16,
    paddingVertical: 32,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 14,
    color: '#6B7280',
    fontFamily: Fonts.LeagueSpartanRegular,
  },

  // Store card
  storeCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  storeHeader: { flexDirection: 'row', alignItems: 'center' },
  storeEmoji: { fontSize: 38, marginRight: 16 },
  storeInfo: { flex: 1 },
  storeName: { 
    fontSize: 18, 
    fontWeight: 'bold', 
    color: '#1e293b',
    fontFamily: Fonts.LeagueSpartanBold,
  },
  storeDetails: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    marginTop: 2,
  },
  storeAddress: { 
    fontSize: 13, 
    color: '#6b7280', 
    marginLeft: 4,
    fontFamily: Fonts.LeagueSpartanRegular,
  },
  storeRating: { 
    fontSize: 13, 
    color: '#f59e0b', 
    marginLeft: 4,
    fontFamily: Fonts.LeagueSpartanRegular,
  },
  storeStatus: {
    alignItems: 'center',
    marginLeft: 8,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  statusCircle: { 
    width: 18, 
    height: 18, 
    borderRadius: 9,
    marginBottom: 2,
  },
  statusText: { 
    fontSize: 13, 
    fontWeight: 'bold',
    marginTop: 4,
    fontFamily: Fonts.LeagueSpartanBold,
  },

  // Stat cards giống AdminDashboard
  statGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  statCard: {
    width: '48%',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  statIconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#fde7dd',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 2,
    fontFamily: Fonts.LeagueSpartanBold,
  },
  statTitle: {
    fontSize: 11,
    color: '#6b7280',
    marginBottom: 4,
    fontFamily: Fonts.LeagueSpartanRegular,
  },
  statHelperBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    backgroundColor: 'rgba(233,83,34,0.08)',
  },
  statHelperText: {
    fontSize: 10,
    color: '#EB552D',
    fontWeight: '600',
    fontFamily: Fonts.LeagueSpartanSemiBold,
  },

  // Sections
  sectionCardContainer: {
    marginBottom: 20,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#111827',
    fontFamily: Fonts.LeagueSpartanBold,
  },
  sectionLink: {
    fontSize: 13,
    color: '#EB552D',
    fontWeight: '500',
    fontFamily: Fonts.LeagueSpartanMedium,
  },
  chartCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },

  emptyState: {
    padding: 16,
    borderWidth: 1,
    borderColor: '#fed7aa',
    borderRadius: 12,
    backgroundColor: '#fff7ed',
    alignItems: 'center',
  },
  emptyStateText: {
    color: '#ea580c',
    fontWeight: '600',
    fontSize: 13,
    fontFamily: Fonts.LeagueSpartanSemiBold,
  },

  // Food cards
  foodCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  foodRank: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#fef3e2',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  foodRankText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#ea580c',
    fontFamily: Fonts.LeagueSpartanBold,
  },
  foodName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 2,
    fontFamily: Fonts.LeagueSpartanBold,
  },
  foodQuantity: {
    fontSize: 12,
    color: '#6b7280',
    fontFamily: Fonts.LeagueSpartanRegular,
  },
  foodQuantityValue: {
    color: '#EB552D',
    fontWeight: 'bold',
  },

  // Order cards
  orderCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  orderId: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: 'bold',
    fontFamily: Fonts.LeagueSpartanBold,
  },
  orderTime: {
    fontSize: 13,
    color: '#64748b',
    fontFamily: Fonts.LeagueSpartanRegular,
  },
  orderCustomer: {
    fontSize: 15,
    color: '#1e293b',
    fontWeight: 'bold',
    marginBottom: 2,
    fontFamily: Fonts.LeagueSpartanBold,
  },
  orderItems: {
    fontSize: 13,
    color: '#6b7280',
    marginBottom: 2,
    fontFamily: Fonts.LeagueSpartanRegular,
  },
  orderFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  orderTotal: {
    fontSize: 15,
    color: '#ea580c',
    fontWeight: 'bold',
    fontFamily: Fonts.LeagueSpartanBold,
  },
  orderStatus: {
    backgroundColor: '#f59e0b',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 2,
  },
  orderStatusText: {
    fontSize: 13,
    color: '#fff',
    fontWeight: 'bold',
    fontFamily: Fonts.LeagueSpartanBold,
  },

  // Report card
  reportCard: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  reportLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  reportIconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(233,83,34,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  reportText: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#111827',
    fontFamily: Fonts.LeagueSpartanBold,
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#EB552D',
    marginBottom: 12,
    fontFamily: Fonts.LeagueSpartanBold,
  },
  closeBtn: {
    marginTop: 16,
    paddingVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: '#fef3e2',
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnText: {
    color: '#EB552D',
    fontWeight: 'bold',
    fontFamily: Fonts.LeagueSpartanBold,
  },
});

export default SellerDashboardScreen;
