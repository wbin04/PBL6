import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  View,
  Text,
  TouchableOpacity,
  Dimensions,
  StyleSheet,
  StatusBar,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import {
  BarChart3,
  Package,
  Users,
  ShoppingBag,
  Star,
  TrendingUp,
  Menu,
  X,
  Bell,
  DollarSign,
  LogOut,
  RefreshCw,
} from 'lucide-react-native';
import { LineChart } from 'react-native-chart-kit';
import { useDispatch } from 'react-redux';

import OrderListScreen from './OrderListScreen';
import CustomerListScreen from './CustomerListScreen';
import StoreListScreen from './StoreListScreen';
import ShipperListScreen from './ShipperListScreen';

import { dashboardApi } from '@/services/api';
import { ApiError } from '@/types';
import { AppDispatch } from '@/store';
import { logout } from '@/store/slices/authSlice';
import { Fonts } from '@/constants/Fonts';
import Sidebar from '@/components/sidebar'; 

const screenWidth = Dimensions.get('window').width;
const CONTENT_PADDING = 16;

const menuItems = [
  { title: 'Trang chủ', icon: BarChart3, section: 'dashboard' },
  { title: 'Mua hàng', icon: ShoppingBag, section: 'buy' },
  { title: 'Quản lý tài khoản', icon: Users, section: 'customers' },
  { title: 'Quản lý cửa hàng', icon: ShoppingBag, section: 'stores' },
  { title: 'Quản lý đơn hàng', icon: Package, section: 'orders' },
  { title: 'Quản lý shipper', icon: Users, section: 'shippers' },
  { title: 'Khuyến mãi hệ thống', icon: Star, section: 'promotions' },
];

type Section =
  | 'dashboard'
  | 'buy'
  | 'customers'
  | 'stores'
  | 'orders'
  | 'shippers'
  | 'promotions'
  | 'analytics'
  | 'settings';

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const createZeroSeries = () => Array.from({ length: 12 }, () => 0);
const storeEmojis = ['🍜', '🍕', '🥗', '🍛', '🍱', '🍔', '🥪'];

const categoryTabs = ['Tổng quan', 'Cửa hàng', 'Đơn hàng', 'Khách hàng', 'Shipper'];

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
      color: (opacity = 1) => `rgba(245, 203, 88, ${opacity})`,
      strokeWidth: 2,
    },
  ],
  legend: [currentLabel, previousLabel],
});

function AdminDashboardScreen() {
  const navigation = useNavigation<any>();
  const dispatch = useDispatch<AppDispatch>();

  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [activeSection, setActiveSection] = useState<Section>('dashboard');
  const [showChart, setShowChart] = useState(false);

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const currentYear = new Date().getFullYear();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [chartData, setChartData] = useState(() =>
    buildChartData(emptyTrend, currentYear.toString(), (currentYear - 1).toString())
  );
  const [topStores, setTopStores] = useState<DashboardStore[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fetchDashboard = useCallback(
    async (isRefresh = false) => {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      try {
        const data = (await dashboardApi.getAdminMetrics()) as DashboardResponse;
        setStats(data.stats);

        const generatedYear = data.generated_at ? new Date(data.generated_at).getFullYear() : new Date().getFullYear();
        setChartData(buildChartData(data.revenue_trend, generatedYear.toString(), (generatedYear - 1).toString()));

        setTopStores(data.top_stores || []);
        setErrorMessage(null);
      } catch (error) {
        const apiError = error as ApiError;
        setErrorMessage(apiError?.message || 'Không thể tải dữ liệu dashboard');
      } finally {
        if (isRefresh) setRefreshing(false);
        setLoading(false);
      }
    },
    []
  );

  useFocusEffect(
    useCallback(() => {
      fetchDashboard();
    }, [fetchDashboard])
  );

  const handleRefresh = useCallback(() => {
    fetchDashboard(true);
  }, [fetchDashboard]);

  const handleLogout = async () => {
    try {
      await dispatch(logout()).unwrap();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const statCards = [
    {
      title: 'Tổng khách hàng',
      value: stats ? formatNumber(stats.total_customers) : '—',
      icon: Users,
      helper: 'Toàn hệ thống',
    },
    {
      title: 'Đơn hàng hôm nay',
      value: stats ? formatNumber(stats.orders_today) : '—',
      icon: Package,
      helper: 'Trong 24h qua',
    },
    {
      title: 'Doanh thu hệ thống',
      value: stats ? formatCurrency(stats.system_revenue) : '—',
      icon: DollarSign,
      helper: 'Tổng doanh thu',
    },
    {
      title: 'Cửa hàng hoạt động',
      value: stats ? formatNumber(stats.active_stores) : '—',
      icon: ShoppingBag,
      helper: 'Có quản lý',
    },
  ];



  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <StatusBar backgroundColor="#f5cb58" barStyle="dark-content" />
      <View style={styles.wrapper}>
        <Sidebar
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
          currentRole={'admin' as any}
        />

        {/* MAIN CONTENT */}
        <View style={styles.mainContent}>
          <View style={styles.headerWrap}>
            <View style={styles.headerTopRow}>
              <TouchableOpacity onPress={() => setIsSidebarOpen(true)} style={styles.roundIconBtn}>
                <Menu size={24} color="#eb552d" />
              </TouchableOpacity>

              <Text style={styles.headerTitle}>Admin Dashboard</Text>

              <View style={{ flexDirection: 'row', gap: 10 }}>
                <TouchableOpacity style={styles.roundIconBtn}>
                  <Bell size={24} color="#eb552d" />
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

          {/* SECTION CONTENT */}
          <View style={{ flex: 1 }}>
            {activeSection === 'dashboard' && (
              <ScrollView
                style={{ flex: 1 }}
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
                {errorMessage && (
                  <View style={styles.errorBanner}>
                    <Text style={styles.errorText}>{errorMessage}</Text>
                    <TouchableOpacity
                      style={styles.retryButton}
                      onPress={() => fetchDashboard()}
                    >
                      <Text style={styles.retryButtonText}>Thử lại</Text>
                    </TouchableOpacity>
                  </View>
                )}

                {loading && !refreshing && (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#EB552D" />
                    <Text style={styles.loadingText}>Đang tải dữ liệu dashboard...</Text>
                  </View>
                )}

                {/* Stat cards */}
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

                {/* Revenue chart */}
                <View style={styles.sectionCardContainer}>
                  <View style={styles.sectionHeaderRow}>
                    <Text style={styles.sectionTitle}>Biểu đồ doanh thu</Text>
                    <TouchableOpacity onPress={() => setShowChart(true)}>
                      <Text style={styles.sectionLink}>Xem chi tiết</Text>
                    </TouchableOpacity>
                  </View>

                  <View style={styles.chartCard}>
                    <View style={styles.chartLegendRow}>
                      <View style={styles.chartLegendItem}>
                        <View style={[styles.chartLegendDot, { backgroundColor: '#EB552D' }]} />
                        <Text style={styles.chartLegendText}>{currentYear}</Text>
                      </View>
                      <View style={styles.chartLegendItem}>
                        <View style={[styles.chartLegendDot, { backgroundColor: '#f5cb58' }]} />
                        <Text style={styles.chartLegendText}>{currentYear - 1}</Text>
                      </View>
                    </View>

                    <LineChart
                      data={chartData}
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

                {/* Top stores */}
                <View style={styles.sectionCardContainer}>
                  <View style={styles.sectionHeaderRow}>
                    <Text style={styles.sectionTitle}>Cửa hàng hàng đầu</Text>
                    <TouchableOpacity
                      onPress={() =>
                        navigation.navigate('StoreListScreen')
                      }
                    >
                      <Text style={styles.sectionLink}>Xem tất cả</Text>
                    </TouchableOpacity>
                  </View>

                  {topStores.length === 0 ? (
                    <View style={styles.emptyState}>
                      <Text style={styles.emptyStateText}>Chưa có dữ liệu xếp hạng</Text>
                    </View>
                  ) : (
                    topStores.map((store, idx) => {
                      const emoji = storeEmojis[idx % storeEmojis.length];
                      const ratingValue =
                        store.avg_rating !== null && store.avg_rating !== undefined
                          ? store.avg_rating.toFixed(1)
                          : '—';
                      return (
                        <TouchableOpacity
                          key={store.store_id ?? idx}
                          activeOpacity={0.8}
                          style={styles.storeCard}
                          onPress={() =>
                            navigation.navigate('StoreDetailScreenV2', {
                              storeId: store.store_id?.toString() || `${idx + 1}`,
                              name: store.store_name,
                            })
                          }
                        >
                          <View style={styles.storeEmojiWrapper}>
                            <Text style={styles.storeEmoji}>{emoji}</Text>
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.storeName}>{store.store_name}</Text>
                            <Text style={styles.storeInfoText}>
                              Đơn hàng:{' '}
                              <Text style={styles.storeOrderHighlight}>
                                {formatNumber(store.orders)}
                              </Text>{' '}
                              · Doanh thu:{' '}
                              <Text style={styles.storeRevenueHighlight}>
                                {formatCurrency(store.revenue)}
                              </Text>
                            </Text>
                          </View>
                          <View style={styles.storeRatingRow}>
                            <Star size={16} color="#f5cb58" />
                            <Text style={styles.storeRatingText}>{ratingValue}</Text>
                          </View>
                        </TouchableOpacity>
                      );
                    })
                  )}
                </View>

                {/* Report card */}
                <TouchableOpacity
                  style={styles.reportCard}
                  onPress={() => setShowChart(true)}
                  activeOpacity={0.8}
                >
                  <View style={styles.reportLeft}>
                    <View style={styles.reportIconWrapper}>
                      <TrendingUp size={20} color="#EB552D" />
                    </View>
                  <Text style={styles.reportText}>Báo cáo doanh thu</Text>
                  </View>
                  <BarChart3 size={18} color="#9ca3af" />
                </TouchableOpacity>

                {/* Modal chart */}
                <Modal visible={showChart} animationType="slide" transparent>
                  <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                      <Text style={styles.modalTitle}>Biểu đồ doanh thu</Text>
                      <LineChart
                        data={chartData}
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
                        style={{ marginVertical: 8, borderRadius: 16, alignSelf: 'center' }}
                      />
                      <TouchableOpacity style={styles.closeBtn} onPress={() => setShowChart(false)}>
                        <Text style={styles.closeBtnText}>Đóng</Text>
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
              <View style={styles.emptySection}>
                <Text style={styles.emptySectionText}>Chọn một mục để xem nội dung</Text>
              </View>
            )}
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

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

  // HEADER
  headerWrap: {
    backgroundColor: '#f5cb58',
    paddingTop: 0,
    paddingBottom: 12,
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
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
    fontSize: 20,
    color: '#ffffff',
    fontFamily: Fonts.LeagueSpartanExtraBold,
  },


  tabs: {
    backgroundColor: '#fff',
    paddingTop: 8,
    paddingBottom: 0,
  },
  tabsScroll: {
    flexDirection: 'row',
    gap: 14,
    paddingHorizontal: 16,
  },
  tab: {
    paddingHorizontal: 18,
    paddingVertical: 10,
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

  // RESULT BAR
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

  // Scroll content
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 32,
    paddingTop: 16,
  },

  // Error & loading
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
  loadingContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 14,
    color: '#6B7280',
    fontFamily: Fonts.LeagueSpartanRegular,
  },

  // Stat cards
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
  chartLegendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    gap: 16,
  },
  chartLegendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  chartLegendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 6,
  },
  chartLegendText: {
    fontSize: 11,
    color: '#4b5563',
    fontFamily: Fonts.LeagueSpartanRegular,
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

  storeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 1,
  },
  storeEmojiWrapper: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#fef3e2',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  storeEmoji: {
    fontSize: 22,
  },
  storeName: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 2,
    fontFamily: Fonts.LeagueSpartanBold,
  },
  storeInfoText: {
    fontSize: 12,
    color: '#6b7280',
    fontFamily: Fonts.LeagueSpartanRegular,
  },
  storeOrderHighlight: {
    color: '#EB552D',
    fontWeight: 'bold',
  },
  storeRevenueHighlight: {
    color: '#10b981',
    fontWeight: 'bold',
  },
  storeRatingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 10,
  },
  storeRatingText: {
    fontWeight: 'bold',
    color: '#f59e0b',
    marginLeft: 4,
    fontFamily: Fonts.LeagueSpartanBold,
  },

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

  emptySection: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 50,
  },
  emptySectionText: {
    fontSize: 16,
    color: '#6b7280',
    fontFamily: Fonts.LeagueSpartanRegular,
  },
});

export default AdminDashboardScreen;