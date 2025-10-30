import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, Alert, ActivityIndicator, RefreshControl, Modal, SafeAreaView, StatusBar, ScrollView } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Tag, ArrowLeft, Menu, X, Bell, Search, BarChart3, Package, Users, ShoppingBag, Star } from 'lucide-react-native';
import { promotionsService, Promotion } from '../services/promotionsService';
import { useSelector } from 'react-redux';
import { RootState } from '../store';

const menuItems = [
  { title: 'Trang chủ', icon: BarChart3, section: 'dashboard' },
  { title: 'Mua hàng', icon: ShoppingBag, section: 'buy' },
  { title: 'Quản lý tài khoản', icon: Users, section: 'customers' },
  { title: 'Quản lý cửa hàng', icon: ShoppingBag, section: 'stores' },
  { title: 'Quản lý đơn hàng', icon: Package, section: 'orders' },
  { title: 'Quản lý shipper', icon: Users, section: 'shippers' },
  { title: 'Khuyến mãi hệ thống', icon: Star, section: 'promotions' },
];

const VoucherManagementScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const user = useSelector((state: RootState) => state.auth.user);
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [activeSection, setActiveSection] = useState<string>('promotions');

  // Check if user is admin (role_id = 2 / role = "Quản lý")
  const isAdmin = user?.role === 'Quản lý' || user?.role_id === 2;

  // Load promotions
  const loadPromotions = async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      
      // Debug logging
      console.log('=== VoucherManagement Debug ===');
      console.log('User:', user);
      console.log('User role:', user?.role);
      console.log('User role_id:', user?.role_id);
      console.log('isAdmin:', isAdmin);
      
      // Use admin API if user is admin
      const data = isAdmin 
        ? await promotionsService.getAdminPromotions()
        : await promotionsService.getStorePromotions();
      
      console.log('API returned promotions:', data.length);
      console.log('Promotions:', data.map(p => ({ id: p.id, name: p.name, store_id: p.store_id })));
      
      setPromotions(data);
    } catch (error: any) {
      console.error('Error loading promotions:', error);
      Alert.alert('Lỗi', error.message || 'Không thể tải danh sách khuyến mãi');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Load on mount and when screen focused
  useEffect(() => {
    loadPromotions();
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadPromotions();
    }, [])
  );

  // Refresh handler
  const onRefresh = () => {
    setRefreshing(true);
    loadPromotions(false);
  };

  const handleAdd = () => {
    navigation.navigate('VoucherEditScreen', { promotion: null, isAdmin });
  };

  const handleEdit = (promotion: Promotion) => {
    navigation.navigate('VoucherEditScreen', { promotion, isAdmin });
  };

  const handleDelete = async (promotion: Promotion) => {
    Alert.alert(
      'Xác nhận xóa',
      `Bạn có chắc muốn xóa khuyến mãi "${promotion.name}"?`,
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xóa',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              
              // Use admin API if user is admin
              const result = isAdmin
                ? await promotionsService.deleteAdminPromotion(promotion.id)
                : await promotionsService.deletePromotion(promotion.id);
              
              if (result.success) {
                Alert.alert('Thành công', result.message);
                loadPromotions();
              }
            } catch (error: any) {
              console.error('Error deleting promotion:', error);
              Alert.alert('Lỗi', error.message || 'Không thể xóa khuyến mãi');
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  // Format discount display
  const formatDiscount = (promotion: Promotion) => {
    if (promotion.discount_type === 'PERCENT') {
      const maxDiscount = promotion.max_discount_amount 
        ? ` (tối đa ${parseInt(promotion.max_discount_amount.toString()).toLocaleString('vi-VN')}đ)`
        : '';
      return `${promotion.discount_value}%${maxDiscount}`;
    } else {
      return `${parseInt(promotion.discount_value.toString()).toLocaleString('vi-VN')}đ cố định`;
    }
  };

  // Format date display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear()}`;
  };

  // Get status emoji and text
  const getStatusDisplay = (promotion: Promotion) => {
    const now = new Date();
    const startDate = new Date(promotion.start_date);
    const endDate = new Date(promotion.end_date);

    if (!promotion.is_active) {
      return { emoji: '🔴', text: 'Không hoạt động' };
    } else if (now < startDate) {
      return { emoji: '⚪', text: 'Chưa bắt đầu' };
    } else if (now > endDate) {
      return { emoji: '🔴', text: 'Đã hết hạn' };
    } else {
      return { emoji: '🟢', text: 'Đang hoạt động' };
    }
  };

  // Filter promotions by search query
  const filteredPromotions = promotions.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.id.toString().includes(searchQuery)
  );

  // Calculate stats
  const total = promotions.length;
  const active = promotions.filter(p => {
    const now = new Date();
    const startDate = new Date(p.start_date);
    const endDate = new Date(p.end_date);
    return p.is_active && now >= startDate && now <= endDate;
  }).length;
  // For admin, all promotions are system-wide (store_id=0), so total = systemWide
  const systemWide = isAdmin ? total : 0;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.headerBox}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <TouchableOpacity
            onPress={() => {
              // Reset stack to AdminDashboard regardless of history
              navigation.reset({
                index: 0,
                routes: [{ name: 'AdminDashboard' }],
              });
            }}
            style={{ padding: 4, marginRight: 2 }}
          >
            <ArrowLeft color="#ea580c" size={28} />
          </TouchableOpacity>
          <Tag color="#ea580c" size={28} />
          <Text style={styles.headerTitle}>Quản lý khuyến mãi</Text>
        </View>
      </View>

      {/* Stats */}
      <View style={styles.statsRow}>
        {[
          { label: 'Tổng khuyến mãi', value: total },
          { label: 'Đang hoạt động', value: active, color: '#ea580c' },
          ...(isAdmin ? [{ label: 'Toàn hệ thống', value: systemWide, color: '#ea580c' }] : []),
          { label: 'Lượt sử dụng', value: 0, color: '#ea580c' }
        ].map((s, i) => (
          <View style={styles.statCard} key={i}>
            <Text style={styles.statLabel}>{s.label}</Text>
            <Text style={[styles.statValue, { color: s.color || '#222' }]}>{s.value}</Text>
          </View>
        ))}
      </View>

      {/* Search */}
      <View style={styles.searchBox}>
        <TextInput 
          style={styles.searchInput} 
          placeholder="Tìm kiếm theo tên hoặc mã..." 
          placeholderTextColor="#bdbdbd"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* List */}
      <View style={styles.listBox}>
        <View style={styles.listHeader}>
          <Text style={styles.listTitle}>
            {isAdmin ? 'Danh sách khuyến mãi' : 'Danh sách khuyến mãi'}
          </Text>
          <TouchableOpacity style={styles.addButtonTable} onPress={handleAdd}>
            <Text style={styles.addButtonTextTable}>+ Thêm</Text>
          </TouchableOpacity>
        </View>

        {loading && !refreshing ? (
          <View style={{ padding: 20, alignItems: 'center' }}>
            <ActivityIndicator size="large" color="#ea580c" />
            <Text style={{ marginTop: 10, color: '#6b7280' }}>Đang tải...</Text>
          </View>
        ) : (
          <FlatList
            data={filteredPromotions}
            keyExtractor={item => item.id.toString()}
            contentContainerStyle={{ paddingBottom: 12 }}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                colors={['#ea580c']}
                tintColor="#ea580c"
              />
            }
            ListEmptyComponent={
              <View style={{ padding: 20, alignItems: 'center' }}>
                <Text style={{ color: '#6b7280' }}>
                  {searchQuery ? 'Không tìm thấy khuyến mãi phù hợp' : 'Chưa có khuyến mãi nào'}
                </Text>
              </View>
            }
            renderItem={({ item }) => {
              const status = getStatusDisplay(item);
              
              return (
                <View style={styles.voucherItemCard}>
                  <Text style={styles.voucherItemName}>{item.name}</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4, gap: 10 }}>
                    <Text style={styles.voucherItemCode}>#{item.id}</Text>
                    <Text style={styles.voucherItemStatus}>
                      {status.emoji} {status.text}
                    </Text>
                    {isAdmin && (
                      <Text style={{ fontSize: 11, color: '#10b981', fontWeight: 'bold' }}>🌍 Toàn HT</Text>
                    )}
                  </View>
                  <Text style={styles.voucherItemDesc}>
                    Giảm: {formatDiscount(item)}
                  </Text>
                  <Text style={styles.voucherExtraText}>
                    Đơn tối thiểu: {parseInt(item.minimum_pay.toString()).toLocaleString('vi-VN')}đ
                  </Text>
                  <Text style={styles.voucherExtraText}>
                    Thời gian: {formatDate(item.start_date)} → {formatDate(item.end_date)}
                  </Text>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 }}>
                    <TouchableOpacity style={styles.voucherItemEdit} onPress={() => handleEdit(item)}>
                      <Text style={styles.voucherItemEditText}>Sửa</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.voucherItemDelete} onPress={() => handleDelete(item)}>
                      <Text style={styles.voucherItemDeleteText}>Xóa</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            }}
          />
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff7ed', paddingHorizontal: 10, paddingTop: 30 },
  headerBox: { marginBottom: 10, paddingBottom: 10, borderBottomWidth: 1, marginTop:20,  borderColor: '#f59e0b' },
  headerTitle: { fontSize: 22, fontWeight: 'bold', color: '#ea580c', marginLeft: 4 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10, gap: 8 },
  statCard: { flex: 1, backgroundColor: '#fff', borderRadius: 10, padding: 10, alignItems: 'center', elevation: 2, borderWidth: 1, borderColor: '#f59e0b' },
  statLabel: { fontSize: 13, color: '#ea580c', marginBottom: 2 },
  statValue: { fontSize: 18, fontWeight: 'bold' },
  searchBox: { marginBottom: 10, flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 10, borderWidth: 1, borderColor: '#f59e0b', paddingHorizontal: 10, height: 40 },
  searchInput: { flex: 1, fontSize: 15, color: '#222' },
  listBox: { flex: 1, backgroundColor: '#fff7ed', borderRadius: 10, padding: 8, borderWidth: 1, borderColor: '#f59e0b' },
  listHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  listTitle: { fontSize: 18, fontWeight: 'bold', color: '#ea580c' },
  addButtonTable: { backgroundColor: '#f59e0b', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10 },
  addButtonTextTable: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
  voucherItemCard: { backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 14, borderWidth: 2, borderColor: '#f59e0b' },
  voucherItemName: { fontSize: 17, fontWeight: 'bold', color: '#ea580c', marginBottom: 2 },
  voucherItemCode: { fontSize: 14, color: '#f59e0b', fontWeight: 'bold' },
  voucherItemStatus: { fontSize: 13, color: '#ea580c', fontWeight: 'bold' },
  voucherItemDesc: { fontSize: 14, color: '#444', marginBottom: 2 },
  voucherExtraText: { fontSize: 13, color: '#ea580c' },
  voucherItemEdit: { backgroundColor: '#f59e0b', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10, left:100 },
  voucherItemEditText: { color: '#fff', fontWeight: 'bold' },
  voucherItemDelete: { backgroundColor: '#ea580c', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10, right:100 },
  voucherItemDeleteText: { color: '#fff', fontWeight: 'bold' },
});

export default VoucherManagementScreen;
