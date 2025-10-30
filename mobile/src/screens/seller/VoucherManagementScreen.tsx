import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, RefreshControl, Alert, ActivityIndicator, ScrollView } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Tag, Menu, X, ShoppingBag } from 'lucide-react-native';
import { promotionsService, Promotion } from '../../services/promotionsService';
import { useSelector } from 'react-redux';
import { RootState } from '../../store/index';

const VoucherManagementScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { user } = useSelector((state: RootState) => state.auth);
  
  // State management
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sidebarVisible, setSidebarVisible] = useState(false);

  // Load promotions
  const loadPromotions = async (showRefreshing = false) => {
    try {
      if (showRefreshing) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      
      const data = await promotionsService.getStorePromotions();
      setPromotions(data);
    } catch (error: any) {
      console.error('Error loading promotions:', error);
      Alert.alert('Lỗi', error.message || 'Không thể tải danh sách khuyến mãi');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Load on mount and when screen focuses
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
    loadPromotions(true);
  };

  const handleAdd = () => {
    navigation.navigate('SellerVoucherEditScreen', { promotion: null });
  };

  const handleEdit = (promotion: Promotion) => {
    navigation.navigate('SellerVoucherEditScreen', { promotion });
  };

  const handleDelete = async (id: number) => {
    Alert.alert(
      'Xác nhận xóa',
      'Bạn có chắc chắn muốn xóa khuyến mãi này?',
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xóa',
          style: 'destructive',
          onPress: async () => {
            try {
              await promotionsService.deletePromotion(id);
              Alert.alert('Thành công', 'Đã xóa khuyến mãi');
              loadPromotions();
            } catch (error: any) {
              Alert.alert('Lỗi', error.message || 'Không thể xóa khuyến mãi');
            }
          }
        }
      ]
    );
  };

  // Filter promotions based on search query
  const filteredPromotions = promotions.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (p.id && p.id.toString().includes(searchQuery))
  );

  // Calculate stats
  const total = promotions.length;
  const active = promotions.filter(p => p.is_active).length;
  const used = 0; // Backend doesn't track usage yet
  const conversion = '0.0'; // Backend doesn't track usage yet

  // Format date for display
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return promotionsService.formatDateForDisplay(date);
    } catch {
      return dateString;
    }
  };

  // Format discount value
  const formatDiscount = (promotion: Promotion) => {
    if (promotion.discount_type === 'PERCENT') {
      const value = typeof promotion.discount_value === 'string' 
        ? parseFloat(promotion.discount_value) 
        : promotion.discount_value;
      return `${value}% (tối đa ${promotion.max_discount_amount ? parseFloat(promotion.max_discount_amount.toString()).toLocaleString() + 'đ' : 'không giới hạn'})`;
    } else {
      const value = typeof promotion.discount_value === 'string' 
        ? parseFloat(promotion.discount_value) 
        : promotion.discount_value;
      return `${value.toLocaleString()}đ cố định`;
    }
  };

  // Get status display
  const getStatusDisplay = (promotion: Promotion) => {
    const now = new Date();
    const startDate = new Date(promotion.start_date);
    const endDate = new Date(promotion.end_date);

    if (!promotion.is_active) {
      return { icon: '🔴', text: 'Đã tắt' };
    } else if (now < startDate) {
      return { icon: '⚪', text: 'Chưa kích hoạt' };
    } else if (now > endDate) {
      return { icon: '🔴', text: 'Đã hết hạn' };
    } else {
      return { icon: '🟢', text: 'Đang hoạt động' };
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.headerRow}>
        <TouchableOpacity 
          style={styles.menuButton}
          onPress={() => setSidebarVisible(true)}
        >
          <Menu color="#ea580c" size={24} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Quản lý khuyến mãi</Text>
          <Text style={styles.headerSubtitle}>Cửa hàng của tôi</Text>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity style={styles.iconBtn}>
            <Text style={styles.icon}>🔔</Text>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>3</Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity style={styles.avatar}>
            <Text style={styles.avatarText}>{(user as any)?.name?.charAt(0).toUpperCase() || 'A'}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Section title + button */}
      <View style={styles.sectionTitleRow}>
        <Text style={styles.menuSectionTitle}>Danh sách khuyến mãi</Text>
        <TouchableOpacity style={styles.addBtn} onPress={handleAdd}>
          <Text style={styles.addBtnText}>+ Thêm</Text>
        </TouchableOpacity>
      </View>

      {/* Stats */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.statsScrollView}
        contentContainerStyle={styles.statsRow}
      >
        {[
          { label: 'Tổng khuyến mãi', value: total },
          { label: 'Đang hoạt động', value: active, color: '#10b981' },
          { label: 'Lượt sử dụng', value: used, color: '#3b82f6' },
          { label: 'Tỷ lệ chuyển đổi', value: conversion + '%', color: '#8b5cf6' }
        ].map((s, i) => (
          <View style={styles.statCard} key={i}>
            <Text style={styles.statLabel}>{s.label}</Text>
            <Text style={[styles.statValue, { color: s.color || '#1e293b' }]}>{s.value}</Text>
          </View>
        ))}
      </ScrollView>

      {/* Search */}
      <View style={styles.searchBox}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput 
          style={styles.searchInput} 
          placeholder="Tìm kiếm theo tên hoặc mã..." 
          placeholderTextColor="#9ca3af"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* List */}
      <View style={styles.listContainer}>
        <Text style={styles.listTitle}>
          Tất cả khuyến mãi ({filteredPromotions.length})
        </Text>
        
        {loading && !refreshing ? (
          <View style={styles.loaderContainer}>
            <ActivityIndicator size="large" color="#ea580c" />
            <Text style={styles.loadingText}>Đang tải...</Text>
          </View>
        ) : filteredPromotions.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
              {searchQuery ? 'Không tìm thấy kết quả' : 'Chưa có khuyến mãi nào'}
            </Text>
            <Text style={styles.emptySubText}>
              {searchQuery ? 'Thử từ khóa khác' : 'Nhấn "Thêm" để tạo khuyến mãi mới'}
            </Text>
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
              />
            }
            renderItem={({ item }) => {
              const status = getStatusDisplay(item);
              return (
                <View style={styles.voucherCard}>
                  <View style={styles.voucherHeader}>
                    <Text style={styles.voucherName}>{item.name}</Text>
                    <View style={styles.statusBadge}>
                      <Text style={styles.statusIcon}>{status.icon}</Text>
                      <Text style={styles.statusText}>{status.text}</Text>
                    </View>
                  </View>
                  
                  <View style={styles.voucherInfoRow}>
                    <Text style={styles.voucherCode}>#{item.id}</Text>
                    <Text style={styles.voucherType}>
                      {item.discount_type === 'PERCENT' ? '📊 PERCENT' : '💵 AMOUNT'}
                    </Text>
                  </View>

                  <Text style={styles.voucherDesc}>
                    Giảm {formatDiscount(item)} cho đơn từ {parseFloat(item.minimum_pay.toString()).toLocaleString()}đ
                  </Text>
                  
                  <Text style={styles.voucherDate}>
                    � {formatDate(item.start_date)} → {formatDate(item.end_date)}
                  </Text>

                  <View style={styles.voucherActions}>
                    <TouchableOpacity style={styles.editButton} onPress={() => handleEdit(item)}>
                      <Text style={styles.editButtonText}>✏️ Sửa</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.deleteButton} onPress={() => handleDelete(item.id)}>
                      <Text style={styles.deleteButtonText}>🗑️ Xóa</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            }}
          />
        )}
      </View>

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
              <TouchableOpacity
                style={[styles.menuItem, { backgroundColor: '#ea580c' }]}
                onPress={() => {
                  setSidebarVisible(false);
                  navigation.navigate('DashboardScreen');
                }}
              >
                <Menu width={16} height={16} stroke="#fff7ed" />
                <Text style={styles.menuText}>Trang chủ</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.menuItem, { backgroundColor: '#ea580c' }]}
                onPress={() => {
                  setSidebarVisible(false);
                  navigation.reset({
                    index: 0,
                    routes: [{ name: 'MainTabs', params: { screen: 'Home' } }],
                  });
                }}
              >
                <ShoppingBag width={16} height={16} stroke="#fff7ed" />
                <Text style={styles.menuText}>Mua hàng</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.menuItem, { backgroundColor: '#ea580c' }]}
                onPress={() => {
                  setSidebarVisible(false);
                  navigation.navigate('ManageMenuScreen');
                }}
              >
                <ShoppingBag width={16} height={16} stroke="#fff7ed" />
                <Text style={styles.menuText}>Quản lí món ăn</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.menuItem, { backgroundColor: '#ea580c' }]}
                onPress={() => {
                  setSidebarVisible(false);
                  navigation.navigate('NewOrderListScreen');
                }}
              >
                <ShoppingBag width={16} height={16} stroke="#fff7ed" />
                <Text style={styles.menuText}>Quản lí đơn hàng</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.menuItem, styles.menuItemActive]}
                onPress={() => setSidebarVisible(false)}
              >
                <Tag width={16} height={16} stroke="#fff" />
                <Text style={[styles.menuText, styles.menuTextActive]}>Quản lí khuyến mãi</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.menuItem, { backgroundColor: '#ea580c' }]}
                onPress={() => {
                  setSidebarVisible(false);
                }}
              >
                <Menu width={16} height={16} stroke="#fff7ed" />
                <Text style={styles.menuText}>Thống kê</Text>
              </TouchableOpacity>
            </View>
          </View>
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff7ed' },
  loaderContainer: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center', 
    backgroundColor: '#fff7ed' 
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#ea580c',
    fontWeight: '500'
  },
  headerRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingHorizontal: 18, 
    paddingTop: 50, 
    paddingBottom: 8, 
    backgroundColor: '#fff7ed',
    borderBottomWidth: 0 
  },
  menuButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#f3f4f6',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center'
  },
  headerTitle: { fontSize: 20, color: '#1e293b', fontWeight: 'bold' },
  headerSubtitle: { fontSize: 13, color: '#64748b', marginTop: 2 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  iconBtn: { 
    width: 32, 
    height: 32, 
    borderRadius: 16, 
    backgroundColor: '#fff', 
    alignItems: 'center', 
    justifyContent: 'center', 
    borderWidth: 1, 
    borderColor: '#f3f4f6', 
    marginLeft: 6 
  },
  icon: { fontSize: 18 },
  badge: { 
    position: 'absolute', 
    top: -4, 
    right: -4, 
    backgroundColor: '#ea580c', 
    borderRadius: 10, 
    minWidth: 18, 
    height: 18, 
    alignItems: 'center', 
    justifyContent: 'center', 
    borderWidth: 2, 
    borderColor: '#fff' 
  },
  badgeText: { fontSize: 11, color: '#fff', fontWeight: 'bold' },
  avatar: { 
    width: 32, 
    height: 32, 
    borderRadius: 16, 
    backgroundColor: '#F4A460', 
    alignItems: 'center', 
    justifyContent: 'center', 
    marginLeft: 8 
  },
  avatarText: { color: '#fff', fontSize: 14, fontWeight: 'bold' },
  sectionTitleRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    marginHorizontal: 18, 
    marginTop: 0, 
    marginBottom: 16
  },
  menuSectionTitle: { 
    fontSize: 20, 
    fontWeight: 'bold', 
    color: '#ea580c' 
  },
  addBtn: { 
    backgroundColor: '#ea580c', 
    borderRadius: 20, 
    paddingHorizontal: 16, 
    paddingVertical: 6 
  },
  addBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
  statsScrollView: {
    marginHorizontal: 18,
    marginBottom: 12,
    maxHeight: 80,
  },
  statsRow: { 
    flexDirection: 'row', 
    gap: 8,
    paddingRight: 18
  },
  statCard: { 
    width: 140,
    backgroundColor: '#fff', 
    borderRadius: 12, 
    padding: 12, 
    alignItems: 'center', 
    elevation: 2, 
    borderWidth: 1, 
    borderColor: '#f3f4f6',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4
  },
  statLabel: { fontSize: 12, color: '#64748b', marginBottom: 4, textAlign: 'center' },
  statValue: { fontSize: 20, fontWeight: 'bold' },
  searchBox: { 
    marginHorizontal: 18, 
    marginBottom: 12, 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#fff', 
    borderRadius: 12, 
    borderWidth: 1, 
    borderColor: '#f3f4f6', 
    paddingHorizontal: 12, 
    height: 44,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1
  },
  searchIcon: { fontSize: 18, marginRight: 8 },
  searchInput: { flex: 1, fontSize: 15, color: '#1e293b' },
  listContainer: {
    flex: 1,
  },
  listTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginHorizontal: 18,
    marginBottom: 12,
    color: '#1f2937',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#64748b',
    marginBottom: 8,
  },
  emptySubText: {
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center',
  },
  voucherCard: { 
    backgroundColor: '#fff', 
    borderRadius: 16, 
    padding: 16, 
    marginHorizontal: 18, 
    marginBottom: 10, 
    shadowColor: '#000', 
    shadowOpacity: 0.03, 
    shadowRadius: 4, 
    elevation: 1,
    borderWidth: 1,
    borderColor: '#f3f4f6'
  },
  voucherHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8
  },
  voucherName: { 
    flex: 1,
    fontSize: 17, 
    fontWeight: 'bold', 
    color: '#1e293b',
    marginRight: 8
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4
  },
  statusIcon: { fontSize: 12 },
  statusText: { fontSize: 12, color: '#64748b', fontWeight: '600' },
  voucherInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8
  },
  voucherCode: { 
    fontSize: 13, 
    color: '#ea580c', 
    fontWeight: 'bold',
    backgroundColor: '#fff7ed',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6
  },
  voucherType: { 
    fontSize: 12, 
    color: '#6366f1',
    fontWeight: '600'
  },
  voucherDesc: { 
    fontSize: 14, 
    color: '#475569', 
    marginBottom: 6,
    lineHeight: 20
  },
  voucherDate: { 
    fontSize: 12, 
    color: '#64748b',
    marginBottom: 12
  },
  voucherActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8
  },
  editButton: {
    flex: 1,
    backgroundColor: '#f59e0b',
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center'
  },
  editButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14
  },
  deleteButton: {
    flex: 1,
    backgroundColor: '#ef4444',
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center'
  },
  deleteButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14
  },
  overlay: { 
    position: 'absolute', 
    top: 0, 
    left: 0, 
    right: 0, 
    bottom: 0, 
    backgroundColor: 'rgba(0,0,0,0.5)', 
    zIndex: 1 
  },
  sidebar: { 
    position: 'absolute', 
    left: 0, 
    top: 0, 
    bottom: 0, 
    width: 260, 
    backgroundColor: '#f5f2f0ff', 
    borderRightWidth: 0, 
    zIndex: 2, 
    shadowColor: '#000', 
    shadowOffset: { width: 2, height: 0 }, 
    shadowOpacity: 0.18, 
    shadowRadius: 10, 
    elevation: 10 
  },
  logoContainer: { 
    paddingTop: 24, 
    paddingBottom: 16, 
    borderBottomWidth: 0, 
    alignItems: 'center', 
    backgroundColor: '#ea580c', 
    height: 160
  },
  logoHeader: { 
    flexDirection: 'row', 
    justifyContent: 'flex-end', 
    width: '100%', 
    paddingRight: 16 
  },
  closeButton: { 
    padding: 6, 
    backgroundColor: '#ea580c', 
    borderRadius: 16, 
    marginTop: 20
  },
  logoBox: { 
    alignItems: 'center', 
    marginTop: -30 
  },
  logoCircle: { 
    width: 56, 
    height: 56, 
    borderRadius: 28, 
    backgroundColor: '#fff', 
    alignItems: 'center', 
    justifyContent: 'center', 
    marginBottom: 8, 
    shadowColor: '#ea580c', 
    shadowOpacity: 0.15, 
    shadowRadius: 8, 
    elevation: 4 
  },
  logoEmoji: { 
    fontSize: 32 
  },
  logoText: { 
    fontSize: 18, 
    color: '#fff', 
    fontWeight: 'bold', 
    letterSpacing: 1 
  },
  menuContainer: { 
    flex: 1, 
    paddingVertical: 16 
  },
  menuItem: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingHorizontal: 20, 
    paddingVertical: 14, 
    marginHorizontal: 12, 
    borderRadius: 10, 
    marginBottom: 8 
  },
  menuItemActive: { 
    backgroundColor: '#fff', 
    borderWidth: 0 
  },
  menuText: { 
    marginLeft: 14, 
    fontSize: 15, 
    color: '#fff', 
    fontWeight: '500' 
  },
  menuTextActive: { 
    color: '#ea580c', 
    fontWeight: 'bold' 
  },
});

export default VoucherManagementScreen;
