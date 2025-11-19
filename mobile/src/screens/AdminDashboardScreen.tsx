import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Modal, View, Text, TouchableOpacity, Dimensions, StyleSheet, StatusBar, SafeAreaView, ScrollView, RefreshControl } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { BarChart3, Package, Users, ShoppingBag, Star, TrendingUp, Settings, Menu, X, Bell, Search, DollarSign } from 'lucide-react-native';
import OrderListScreen from './OrderListScreen';
import CustomerListScreen from './CustomerListScreen';
import StoreListScreen from './StoreListScreen';
import ShipperListScreen from './ShipperListScreen';
import { LineChart } from 'react-native-chart-kit';
import { dashboardApi } from '@/services/api';
import { ApiError } from '@/types';

const screenWidth = Dimensions.get('window').width;

const menuItems = [
  { title: 'Trang chủ', icon: BarChart3, section: 'dashboard' },
  { title: 'Mua hàng', icon: ShoppingBag, section: 'buy' },
  { title: 'Quản lý tài khoản', icon: Users, section: 'customers' },
  { title: 'Quản lý cửa hàng', icon: ShoppingBag, section: 'stores' },
  { title: 'Quản lý đơn hàng', icon: Package, section: 'orders' },
  { title: 'Quản lý shipper', icon: Users, section: 'shippers' },
  { title: 'Khuyến mãi hệ thống', icon: Star, section: 'promotions' },
];

type Section = 'dashboard' | 'buy' | 'customers' | 'stores' | 'orders' | 'shippers' | 'promotions' | 'analytics' | 'settings';

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const createZeroSeries = () => Array.from({ length: 12 }, () => 0);
const storeEmojis = ['🍜', '🍕', '🥗', '🍛', '🍱', '🍔', '🥪'];

type DashboardStats = {
  total_customers: number;
  orders_today: number;
  system_revenue: number | string;
  active_stores: number;
};

type RevenueTrend = {
  labels: string[];
  current_year: Array<number | string>;
  previous_year: Array<number | string>;
};

type DashboardStore = {
  store_id: number;
  store_name: string;
  orders: number;
  revenue: number | string;
  avg_rating: number | null;
};

type DashboardResponse = {
  stats: DashboardStats;
  revenue_trend: RevenueTrend;
  top_stores: DashboardStore[];
  generated_at: string;
};

const emptyTrend: RevenueTrend = {
  labels: MONTH_LABELS,
  current_year: createZeroSeries(),
  previous_year: createZeroSeries(),
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

const buildChartData = (trend: RevenueTrend, currentLabel: string, previousLabel: string) => ({
  labels: trend?.labels?.length ? trend.labels : MONTH_LABELS,
  datasets: [
    {
      data: (trend?.current_year || createZeroSeries()).map((item) => normalizeNumber(item)),
      color: (opacity = 1) => `rgba(233, 83, 34, ${opacity})`,
      strokeWidth: 2,
    },
    {
      data: (trend?.previous_year || createZeroSeries()).map((item) => normalizeNumber(item)),
      color: (opacity = 1) => `rgba(60, 120, 216, ${opacity})`,
      strokeWidth: 2,
    },
  ],
  legend: [currentLabel, previousLabel],
});

function AdminDashboardScreen() {
  const navigation = useNavigation<any>();
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [activeSection, setActiveSection] = useState<Section>('dashboard');
  const [showChart, setShowChart] = useState(false);
  const currentYear = new Date().getFullYear();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [chartData, setChartData] = useState(() =>
    buildChartData(emptyTrend, currentYear.toString(), (currentYear - 1).toString())
  );
  const [topStores, setTopStores] = useState<DashboardStore[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fetchDashboard = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const data = (await dashboardApi.getAdminMetrics()) as DashboardResponse;
      setStats(data.stats);

      const generatedYear = data.generated_at ? new Date(data.generated_at).getFullYear() : new Date().getFullYear();
      setChartData(
        buildChartData(
          data.revenue_trend,
          generatedYear.toString(),
          (generatedYear - 1).toString()
        )
      );

      setTopStores(data.top_stores || []);
      setErrorMessage(null);
    } catch (error) {
      const apiError = error as ApiError;
      setErrorMessage(apiError?.message || 'Không thể tải dữ liệu dashboard');
    } finally {
      if (isRefresh) {
        setRefreshing(false);
      }
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchDashboard();
    }, [fetchDashboard])
  );

  const handleRefresh = useCallback(() => {
    fetchDashboard(true);
  }, [fetchDashboard]);

  const statCards = [
    { title: 'Tổng khách hàng', value: stats ? formatNumber(stats.total_customers) : '—', icon: Users, color: '#ea580c', bgColor: '#fed7aa', helper: 'Toàn hệ thống', helperColor: '#6b7280' },
    { title: 'Đơn hàng hôm nay', value: stats ? formatNumber(stats.orders_today) : '—', icon: Package, color: '#f59e0b', bgColor: '#fffbeb', helper: 'Trong 24h qua', helperColor: '#f59e0b' },
    { title: 'Doanh thu hệ thống', value: stats ? formatCurrency(stats.system_revenue) : '—', icon: DollarSign, color: '#ea580c', bgColor: '#fed7aa', helper: 'Tổng doanh thu', helperColor: '#ea580c' },
    { title: 'Cửa hàng hoạt động', value: stats ? formatNumber(stats.active_stores) : '—', icon: ShoppingBag, color: '#10b981', bgColor: '#f0fdf4', helper: 'Có quản lý', helperColor: '#10b981' },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor="#fff" barStyle="dark-content" />
      <View style={styles.wrapper}>
        {sidebarVisible && (
          <>
            <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setSidebarVisible(false)} />
            <View style={styles.sidebar}>
              <View style={styles.logoContainer}>
                <View style={styles.logoHeader}>
                  <TouchableOpacity onPress={() => {
                    setSidebarVisible(false);
                    navigation.reset({
                      index: 0,
                      routes: [{ name: 'MainTabs', params: { screen: 'Home' } }],
                    });
                  }}>
                    <Text style={{ fontSize: 18, color: '#1f2937', fontWeight: 'bold' }}>QUẢN LÝ VIÊN</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => setSidebarVisible(false)} style={styles.closeButton}>
                    <X size={20} color="#6b7280" />
                  </TouchableOpacity>
                </View>
              </View>
              <View style={styles.menuContainer}>
                {menuItems.map((item, index) => {
                  const IconComponent = item.icon;
                  return (
                    <TouchableOpacity
                      key={index}
                      style={[styles.menuItem, activeSection === item.section && styles.menuItemActive]}
                      onPress={() => {
                        setActiveSection(item.section as Section);
                        setSidebarVisible(false);
                        if (item.section === 'promotions') {
                          navigation.navigate('VoucherManagementScreen');
                        } else if (item.section === 'buy') {
                          navigation.reset({
                            index: 0,
                            routes: [{ name: 'MainTabs', params: { screen: 'Home' } }],
                          });
                        }
                      }}
                    >
                      <IconComponent size={16} color={activeSection === item.section ? '#ea580c' : '#6b7280'} />
                      <Text style={[styles.menuText, activeSection === item.section && styles.menuTextActive]}>{item.title}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </>
        )}

        <View style={styles.mainContent}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <TouchableOpacity onPress={() => setSidebarVisible(true)} style={styles.menuButton}>
                <Menu size={20} color="#1f2937" />
              </TouchableOpacity>
              <View style={styles.headerTitles}>
                <Text style={styles.headerTitle}>
                  {activeSection === 'dashboard' ? 'Dashboard' :
                   activeSection === 'buy' ? 'Mua hàng' :
                   activeSection === 'customers' ? 'Quản lý tài khoản' :
                   activeSection === 'stores' ? 'Quản lý cửa hàng' :
                   activeSection === 'orders' ? 'Quản lý đơn hàng' :
                   activeSection === 'promotions' ? 'Khuyến mãi hệ thống' :
                   activeSection === 'analytics' ? 'Báo cáo doanh thu' :
                   'Quản lý shipper'}
                </Text>
                <Text style={styles.headerSubtitle}>
                  {activeSection === 'dashboard' ? 'Tổng quan hệ thống quản lý' :
                   activeSection === 'buy' ? 'Chọn món và đặt hàng' :
                   'Quản lý và giám sát hoạt động hệ thống'}
                </Text>
              </View>
            </View>
            <View style={styles.headerActions}>
              <TouchableOpacity style={styles.headerButton}>
                <Search size={18} color="#6b7280" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.headerButton}>
                <Bell size={18} color="#6b7280" />
              </TouchableOpacity>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>S</Text>
              </View>
            </View>
          </View>

          {/* Content Section */}
          <View style={{ flex: 1 }}>
            {activeSection === 'dashboard' && (
              <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
                refreshControl={
                  <RefreshControl
                    refreshing={refreshing}
                    onRefresh={handleRefresh}
                    tintColor="#ea580c"
                  />
                }
              >
                {errorMessage && (
                  <View style={styles.errorBanner}>
                    <Text style={styles.errorText}>{errorMessage}</Text>
                    <TouchableOpacity style={styles.retryButton} onPress={() => fetchDashboard()}>
                      <Text style={styles.retryButtonText}>Thử lại</Text>
                    </TouchableOpacity>
                  </View>
                )}

                {loading && !refreshing && (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#ea580c" />
                    <Text style={styles.loadingText}>Đang tải dữ liệu...</Text>
                  </View>
                )}

                <View style={{ flexDirection: 'row', gap: 12, marginBottom: 16 }}>
                  {statCards.map((stat, index) => {
                    const IconComponent = stat.icon;
                    return (
                      <View key={index} style={{ flex: 1, backgroundColor: '#fff', borderRadius: 8, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: '#e5e7eb' }}>
                        <View style={{ width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginBottom: 8, backgroundColor: stat.bgColor }}>
                          <IconComponent size={20} color={stat.color} />
                        </View>
                        <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#1f2937', marginBottom: 2 }}>{stat.value}</Text>
                        <Text style={{ fontSize: 10, color: '#6b7280', textAlign: 'center', marginBottom: 2 }}>{stat.title}</Text>
                        {stat.helper && (
                          <Text style={{ fontSize: 10, fontWeight: '600', marginTop: 2, color: stat.helperColor }}>
                            {stat.helper}
                          </Text>
                        )}
                      </View>
                    );
                  })}
                </View>
                {/* Biểu đồ */}
                <View style={{ marginBottom: 20 }}>
                  <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#1f2937', marginBottom: 12 }}>Biểu đồ doanh thu</Text>
                  <View style={{ backgroundColor: '#fff', borderRadius: 8, padding: 10, borderWidth: 1, borderColor: '#e5e7eb', alignItems: 'center' }}>
                    <LineChart
                      data={chartData}
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

                {/* Các cửa hàng hàng đầu */}
                <View style={{ marginBottom: 20 }}>
                  <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#ea580c', marginBottom: 12 }}>Các cửa hàng hàng đầu</Text>
                  {topStores.length === 0 ? (
                    <View style={styles.emptyState}>
                      <Text style={styles.emptyStateText}>Chưa có dữ liệu xếp hạng</Text>
                    </View>
                  ) : (
                    topStores.map((store, idx) => {
                      const emoji = storeEmojis[idx % storeEmojis.length];
                      const ratingValue = store.avg_rating !== null && store.avg_rating !== undefined
                        ? store.avg_rating.toFixed(1)
                        : '—';
                      return (
                        <TouchableOpacity
                          key={store.store_id ?? idx}
                          activeOpacity={0.8}
                          style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 10, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: '#fed7aa', shadowColor: '#ea580c', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 6, elevation: 2 }}
                          onPress={() => navigation.navigate('StoreDetailScreenV2', {
                            storeId: store.store_id?.toString() || `${idx + 1}`,
                            name: store.store_name,
                          })}
                        >
                          <Text style={{ fontSize: 28, marginRight: 14 }}>{emoji}</Text>
                          <View style={{ flex: 1 }}>
                            <Text style={{ fontSize: 15, fontWeight: 'bold', color: '#1f2937' }}>{store.store_name}</Text>
                            <Text style={{ fontSize: 12, color: '#6b7280' }}>
                              Đơn hàng: <Text style={{ color: '#ea580c', fontWeight: 'bold' }}>{formatNumber(store.orders)}</Text> · Doanh thu: <Text style={{ color: '#10b981', fontWeight: 'bold' }}>{formatCurrency(store.revenue)}</Text>
                            </Text>
                          </View>
                          <View style={{ flexDirection: 'row', alignItems: 'center', marginLeft: 10 }}>
                            <Star size={16} color="#f59e0b" />
                            <Text style={{ fontWeight: 'bold', color: '#f59e0b', marginLeft: 4 }}>{ratingValue}</Text>
                          </View>
                        </TouchableOpacity>
                      );
                    })
                  )}
                </View>

                <TouchableOpacity
                  style={styles.reportItem}
                  onPress={() => setShowChart(true)}
                >
                  <Text style={styles.reportText}>Báo cáo doanh thu</Text>
                </TouchableOpacity>

                <Modal visible={showChart} animationType="slide" transparent>
                  <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                      <Text style={styles.modalTitle}>Biểu đồ doanh thu</Text>
                      <LineChart
                        data={chartData}
                        width={screenWidth * 0.85}
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
                        style={{ marginVertical: 8, borderRadius: 16, alignSelf: 'center' }}
                      />
                      <TouchableOpacity
                        style={styles.closeBtn}
                        onPress={() => setShowChart(false)}
                      >
                        <Text style={{ color: '#e95322', fontWeight: 'bold' }}>Đóng</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </Modal>
              </ScrollView>
            )}

            {activeSection === 'orders' && <OrderListScreen />}
            {activeSection === 'customers' && <CustomerListScreen />}
            {activeSection === 'stores' && <StoreListScreen />}
            {activeSection === 'shippers' && <ShipperListScreen />}

            {['promotions', 'analytics', 'settings'].includes(activeSection) && (
              <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 50 }}>
                <Text style={{ fontSize: 18, color: '#6b7280' }}>Chọn một mục để xem nội dung</Text>
              </View>
            )}
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f59e0b' },
  wrapper: { flex: 1, flexDirection: 'row' },
  overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1 },
  sidebar: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 280, backgroundColor: '#fff', borderRightWidth: 1, borderRightColor: '#e5e7eb', zIndex: 2, shadowColor: '#000', shadowOffset: { width: 2, height: 0 }, shadowOpacity: 0.25, shadowRadius: 10, elevation: 10 },
  logoContainer: { padding: 16, borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  logoHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 },
  closeButton: { padding: 4 },
  logo: { fontSize: 18, color: '#1f2937', fontWeight: 'bold', marginBottom: 2 },
  logoSubtitle: { fontSize: 10, color: '#6b7280', marginLeft: 2, marginBottom: 2 },
  menuContainer: { flex: 1, paddingVertical: 8 },
  menuItem: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 8, marginHorizontal: 8, borderRadius: 6 },
  menuItemActive: { backgroundColor: '#fed7aa', borderWidth: 1, borderColor: '#ea580c' },
  menuText: { marginLeft: 8, fontSize: 12, color: '#6b7280' },
  menuTextActive: { color: '#ea580c', fontWeight: 'bold' },
  mainContent: { flex: 1, backgroundColor: '#fff7ed' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingHorizontal: 20, paddingVertical: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  headerLeft: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  menuButton: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#fef3e2', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#e5e7eb', marginRight: 12 },
  headerTitles: { flex: 1 },
  headerTitle: { fontSize: 20, color: '#1f2937', fontWeight: 'bold', marginBottom: 2 },
  headerSubtitle: { fontSize: 12, color: '#6b7280', marginBottom: 2 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerButton: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#fef3e2', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#e5e7eb', marginRight: 8 },
  avatar: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#F4A460', alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontSize: 14, fontWeight: 'bold' },
  reportItem: {
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    margin: 16,
    alignItems: 'center',
    elevation: 2,
  },
  reportText: {
    fontSize: 18,
    color: '#e95322',
    fontWeight: 'bold',
  },
  errorBanner: {
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  errorText: {
    color: '#b91c1c',
    fontSize: 12,
    marginBottom: 8,
  },
  retryButton: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#b91c1c',
    borderRadius: 6,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  loadingContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  loadingText: {
    marginTop: 8,
    color: '#6b7280',
    fontSize: 12,
  },
  emptyState: {
    padding: 16,
    borderWidth: 1,
    borderColor: '#fed7aa',
    borderRadius: 8,
    backgroundColor: '#fff7ed',
    alignItems: 'center',
  },
  emptyStateText: {
    color: '#ea580c',
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    backgroundColor: '#fff',
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
    fontSize: 20,
    fontWeight: 'bold',
    color: '#e95322',
    marginBottom: 12,
  },
  closeBtn: {
    marginTop: 16,
    paddingVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: '#fef3e2',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default AdminDashboardScreen;
