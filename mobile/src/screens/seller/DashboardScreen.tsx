import React, { useState } from 'react';
import { View, ScrollView, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { BarChart } from 'react-native-chart-kit';
import { Dimensions } from 'react-native';
import { MapPin, Star, Menu, X, ShoppingBag } from 'react-native-feather';
import AddFoodScreen from './AddFoodScreen';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

// Dummy data for demonstration
const storeInfo = {
  image: '🍔',
  name: 'Burger Palace',
  address: '123 Main St',
  rating: 4.8,
};

const stats = [
  { title: 'Đơn hàng hôm nay', value: 32 },
  { title: 'Đang xử lý', value: 5 },
  { title: 'Đã giao', value: 27 },
];

const orders = [
  { id: '1', customer: 'Nguyen Van A', status: 'delivered', total: '120,000₫' },
  { id: '2', customer: 'Tran Thi B', status: 'processing', total: '80,000₫' },
  { id: '3', customer: 'Le Minh C', status: 'delivered', total: '75,000₫' },
  { id: '4', customer: 'Pham Thu D', status: 'processing', total: '135,000₫' },
  { id: '5', customer: 'Hoang Van E', status: 'delivered', total: '210,000₫' },
  { id: '6', customer: 'Nguyen Thi F', status: 'processing', total: '60,000₫' },
];

const getOrderStatusColor = (status: string) => {
  switch (status) {
    case 'delivered': return '#10b981';
    case 'processing': return '#f59e0b';
    default: return '#6b7280';
  }
};
const getOrderStatusText = (status: string) => {
  switch (status) {
    case 'delivered': return 'Đã giao';
    case 'processing': return 'Đang xử lý';
    default: return 'Khác';
  }
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
  // Dummy bar chart data
  const barData = {
    labels: ['Pizza', 'Burger', 'Sushi', 'Salad', 'Phở'],
    datasets: [
      {
        data: [40, 25, 20, 15, 30],
      },
    ],
  };
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [activeSection, setActiveSection] = useState('dashboard');
  const [isOpen, setIsOpen] = useState(true);

  // Dummy revenue data for chart
  const revenueData = {
    labels: ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'],
    datasets: [
      {
        data: [1200000, 1500000, 1800000, 1700000, 2000000, 2200000, 2500000],
        color: (opacity = 1) => `rgba(233, 83, 34, ${opacity})`,
        strokeWidth: 2,
      },
    ],
  };

  // Import NewOrderListScreen
  const NewOrderListScreen = require('./NewOrderListScreen').default;
  // Import ManageMenuScreen
  const ManageMenuScreen = require('./ManageMenuScreen').default;
  // Import VoucherManagementScreen
  const VoucherManagementScreen = require('./VoucherManagementScreen').default;

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

      {/* Section switch logic */}
      {activeSection === 'orders' ? (
        <NewOrderListScreen />
      ) : activeSection === 'analytics' ? (
        <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
          {/* Biểu đồ doanh thu */}
          <View style={{ marginBottom: 20, marginTop: 20 }}>
            <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#1f2937', marginBottom: 12, alignSelf: 'center' }}>Biểu đồ doanh thu</Text>
            <View style={{ backgroundColor: '#fff', borderRadius: 8, padding: 10, borderWidth: 1, borderColor: '#e5e7eb', alignItems: 'center' }}>
              <LineChart
                data={revenueData}
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
          {/* Biểu đồ cột */}
          <View style={{ marginBottom: 20, marginTop: 20 }}>
            <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#1f2937', marginBottom: 12, alignSelf: 'center' }}>Biểu đồ số lượng món bán</Text>
            <View style={{ backgroundColor: '#fff', borderRadius: 8, padding: 10, borderWidth: 1, borderColor: '#e5e7eb', alignItems: 'center' }}>
              <BarChart
                data={barData}
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
            </View>
          </View>
        </ScrollView>
      ) : (
        <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
          {/* Store Card */}
          <View style={styles.storeCardNew}>
            <View style={styles.storeHeaderNew}>
              <Text style={styles.storeEmojiNew}>{storeInfo.image}</Text>
              <View style={styles.storeInfoNew}>
                <Text style={styles.storeNameNew}>{storeInfo.name}</Text>
                <View style={styles.storeDetailsNew}><MapPin width={13} height={13} color="#6b7280" /><Text style={styles.storeAddressNew}>{storeInfo.address}</Text></View>
                <View style={styles.storeDetailsNew}><Star width={13} height={13} color="#f59e0b" fill="#f59e0b" /><Text style={styles.storeRatingNew}>{storeInfo.rating}</Text></View>
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
          {/* Stats Cards - 2 per row */}
          <View style={{ flexDirection: 'row', marginHorizontal: 18, marginTop: 18 }}>
            <View style={[styles.statCardNew, { flex: 1, marginRight: 8 }]}><View style={styles.statIconNew}><Text style={styles.statIconTextNew}>💲</Text></View><Text style={styles.statValueNew}>2.5M ₫</Text><Text style={styles.statTitleNew}>Doanh thu hôm nay</Text><Text style={styles.statChangeNew}>+12%</Text></View>
            <View style={[styles.statCardNew, { flex: 1, marginLeft: 8 }]}><View style={styles.statIconNew}><Text style={styles.statIconTextNew}>🛒</Text></View><Text style={styles.statValueNew}>23</Text><Text style={styles.statTitleNew}>Đơn hàng mới</Text><Text style={styles.statChangeNew}>+8%</Text></View>
          </View>
          <View style={{ flexDirection: 'row', marginHorizontal: 18, marginTop: 8 }}>
            <View style={[styles.statCardNew, { flex: 1, marginRight: 8 }]}><View style={styles.statIconNew}><Text style={styles.statIconTextNew}>👥</Text></View><Text style={styles.statValueNew}>156</Text><Text style={styles.statTitleNew}>Khách hàng</Text><Text style={styles.statChangeNew}>+15%</Text></View>
            <View style={[styles.statCardNew, { flex: 1, marginLeft: 8 }]}><View style={styles.statIconNew}><Text style={styles.statIconTextNew}>⭐</Text></View><Text style={styles.statValueNew}>4.5</Text><Text style={styles.statTitleNew}>Đánh giá TB</Text><Text style={styles.statChangeNew}>+0.2</Text></View>
          </View>
          {/* Recent Orders */}
          <View style={styles.sectionNew}>
            <Text style={styles.sectionTitleNew}>Đơn hàng gần đây</Text>
            <View style={styles.orderCardNew}><View style={styles.orderHeaderNew}><Text style={styles.orderIdNew}>ORD-001</Text><Text style={styles.orderTimeNew}>10:30</Text></View><Text style={styles.orderCustomerNew}>Nguyễn Văn A</Text><Text style={styles.orderItemsNew}>Phở Bò Tái x2, Trà Sữa x1</Text><View style={styles.orderFooterNew}><Text style={styles.orderTotalNew}>160.000 ₫</Text><View style={styles.orderStatusNew}><Text style={styles.orderStatusTextNew}>Chờ xác nhận</Text></View></View></View>
            <View style={styles.orderCardNew}><View style={styles.orderHeaderNew}><Text style={styles.orderIdNew}>ORD-002</Text><Text style={styles.orderTimeNew}>10:15</Text></View><Text style={styles.orderCustomerNew}>Trần Thị B</Text><Text style={styles.orderItemsNew}>Bún Bò Huế x1, Chả Cá x1</Text><View style={styles.orderFooterNew}><Text style={styles.orderTotalNew}>100.000 ₫</Text><View style={[styles.orderStatusNew, { backgroundColor: '#3b82f6' }]}><Text style={styles.orderStatusTextNew}>Đang chuẩn bị</Text></View></View></View>
          </View>
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

  statsRowNew: { flexDirection: 'row', justifyContent: 'space-between', marginHorizontal: 18, marginTop: 18, marginBottom: 8 },
  statCardNew: { flex: 1, backgroundColor: '#fff', borderRadius: 12, padding: 12, alignItems: 'center', marginHorizontal: 4, borderWidth: 1, borderColor: '#f3f4f6' },
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
});

export default SellerDashboardScreen;
