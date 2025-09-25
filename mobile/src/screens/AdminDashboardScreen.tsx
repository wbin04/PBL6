import React, { useState } from 'react';
import { Modal, View, Text, TouchableOpacity, Dimensions, StyleSheet, StatusBar, SafeAreaView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { BarChart3, Package, Users, ShoppingBag, Star, TrendingUp, Settings, Menu, X, Bell, Search, DollarSign } from 'lucide-react-native';
import OrderListScreen from './OrderListScreen';
import CustomerListScreen from './CustomerListScreen';
import StoreListScreen from './StoreListScreen';
import ShipperListScreen from './ShipperListScreen';
import { LineChart } from 'react-native-chart-kit';

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

const revenueData = {
  labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
  datasets: [
    {
      data: [12000, 15000, 18000, 22000, 26000, 30000, 28000, 32000, 35000, 37000, 40000, 42000],
      color: (opacity = 1) => `rgba(233, 83, 34, ${opacity})`, // màu cam
      strokeWidth: 2,
    },
    {
      data: [10000, 13000, 16000, 20000, 24000, 27000, 25000, 29000, 31000, 33000, 36000, 38000],
      color: (opacity = 1) => `rgba(60, 120, 216, ${opacity})`, // màu xanh
      strokeWidth: 2,
    },
  ],
  legend: ['2025', '2024'],
};

function AdminDashboardScreen() {
  const navigation = useNavigation<any>();
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [activeSection, setActiveSection] = useState<Section>('dashboard');
  const [showChart, setShowChart] = useState(false);

  const stats = [
    { title: 'Tổng khách hàng', value: '1,245', icon: Users, color: '#ea580c', bgColor: '#fed7aa', change: '+15%' },
    { title: 'Đơn hàng hôm nay', value: '357', icon: Package, color: '#f59e0b', bgColor: '#fffbeb', change: '+12%' },
    { title: 'Doanh thu hệ thống', value: '2.8B ₫', icon: DollarSign, color: '#ea580c', bgColor: '#fed7aa', change: '+23%' },
    { title: 'Cửa hàng hoạt động', value: '89', icon: ShoppingBag, color: '#10b981', bgColor: '#f0fdf4', change: '+5%' },
  ];

  const topStores = [
    { name: 'Quán Phở Hà Nội', orders: 245, rating: 4.8, revenue: '125,000,000 ₫', emoji: '🍜' },
    { name: 'Pizza Palace', orders: 189, rating: 4.6, revenue: '89,000,000 ₫', emoji: '🍕' },
    { name: 'Bánh Mì Sài Gòn', orders: 156, rating: 4.5, revenue: '67,000,000 ₫', emoji: '🥖' },
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
                   'Cài đặt'}
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
              <View style={{ flex: 1, padding: 16 }}>
                <View style={{ flexDirection: 'row', gap: 12, marginBottom: 16 }}>
                  {stats.map((stat, index) => {
                    const IconComponent = stat.icon;
                    return (
                      <View key={index} style={{ flex: 1, backgroundColor: '#fff', borderRadius: 8, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: '#e5e7eb' }}>
                        <View style={{ width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginBottom: 8, backgroundColor: stat.bgColor }}>
                          <IconComponent size={20} color={stat.color} />
                        </View>
                        <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#1f2937', marginBottom: 2 }}>{stat.value}</Text>
                        <Text style={{ fontSize: 10, color: '#6b7280', textAlign: 'center', marginBottom: 2 }}>{stat.title}</Text>
                        <Text style={{ fontSize: 10, fontWeight: '600', marginTop: 2, color: stat.color }}>{stat.change}</Text>
                      </View>
                    );
                  })}
                </View>
                {/* Biểu đồ */}
                <View style={{ marginBottom: 20 }}>
                  <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#1f2937', marginBottom: 12 }}>Biểu đồ doanh thu</Text>
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

                {/* Các cửa hàng hàng đầu */}
                <View style={{ marginBottom: 20 }}>
                  <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#ea580c', marginBottom: 12 }}>Các cửa hàng hàng đầu</Text>
                  {topStores.map((store, idx) => (
                    <TouchableOpacity
                      key={idx}
                      activeOpacity={0.8}
                      style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 10, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: '#fed7aa', shadowColor: '#ea580c', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 6, elevation: 2 }}
                      onPress={() => {
                        // Chuyển tới StoreDetailScreen, truyền thông tin cửa hàng
                        const images = [
                          require('../assets/images/assorted-sushi.png'),
                          require('../assets/images/burger-palace.png'),
                          require('../assets/images/fresh-bowl-salad.png'),
                        ];
                        const foods = [
                          { id: 'f1', name: 'Phở bò', price: '50,000 ₫', rating: 4.9, image: images[0] },
                          { id: 'f2', name: 'Pizza hải sản', price: '120,000 ₫', rating: 4.8, image: images[1] },
                          { id: 'f3', name: 'Bánh mì đặc biệt', price: '35,000 ₫', rating: 4.7, image: images[2] },
                        ];
                        navigation.navigate('StoreDetailScreenV2', {
                          storeId: (idx+1).toString(),
                          name: store.name,
                          address: 'Địa chỉ mẫu',
                          image: images[idx % images.length],
                          foods: [foods[idx]],
                          rating: store.rating,
                          delivery: 'Miễn phí',
                          time: '20 phút',
                          vouchers: [
                            { id: 'v1', percent: 20, minOrder: '200.000 VND', code: 'SAVE20', desc: 'Giảm 20% cho đơn hàng từ 200.000 VND' },
                          ],
                        });
                      }}
                    >
                      <Text style={{ fontSize: 28, marginRight: 14 }}>{store.emoji}</Text>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 15, fontWeight: 'bold', color: '#1f2937' }}>{store.name}</Text>
                        <Text style={{ fontSize: 12, color: '#6b7280' }}>Đơn hàng: <Text style={{ color: '#ea580c', fontWeight: 'bold' }}>{store.orders}</Text> · Doanh thu: <Text style={{ color: '#10b981', fontWeight: 'bold' }}>{store.revenue}</Text></Text>
                      </View>
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginLeft: 10 }}>
                        <Star size={16} color="#f59e0b" />
                        <Text style={{ fontWeight: 'bold', color: '#f59e0b', marginLeft: 4 }}>{store.rating}</Text>
                      </View>
                    </TouchableOpacity>
                  ))}
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
                        data={revenueData}
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
              </View>
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
