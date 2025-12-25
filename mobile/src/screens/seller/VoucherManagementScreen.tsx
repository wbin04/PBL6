import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  Alert,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Tag, Menu, User } from 'lucide-react-native';
import { promotionsService, Promotion } from '../../services/promotionsService';
import { useSelector } from 'react-redux';
import { RootState } from '../../store/index';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Fonts } from '@/constants/Fonts';
import Sidebar from '@/components/sidebar';
import { ShoppingBag } from 'lucide-react-native';

const menuItems = [
  { title: 'Trang chủ', icon: Menu, section: 'dashboard' },
  { title: 'Mua hàng', icon: ShoppingBag, section: 'buy' },
  { title: 'Quản lí món ăn', icon: ShoppingBag, section: 'foods' },
  { title: 'Quản lí đơn hàng', icon: ShoppingBag, section: 'orders' },
  { title: 'Quản lí khuyến mãi', icon: ShoppingBag, section: 'promotions' },
  { title: 'Thống kê', icon: Menu, section: 'analytics' },
];

const VoucherManagementScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { user } = useSelector((state: RootState) => state.auth);
  
  // State management
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [activeTab, setActiveTab] = useState('all');

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
      return { icon: '🔴', text: 'Đã tắt', color: '#ef4444' };
    } else if (now < startDate) {
      return { icon: '⚪', text: 'Chưa kích hoạt', color: '#9ca3af' };
    } else if (now > endDate) {
      return { icon: '🔴', text: 'Đã hết hạn', color: '#ef4444' };
    } else {
      return { icon: '🟢', text: 'Đang hoạt động', color: '#10b981' };
    }
  };

  // Filter promotions
  const filteredPromotions = promotions.filter(p => {
    const matchSearch =
      searchQuery.trim() === '' ||
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.id && p.id.toString().includes(searchQuery));

    if (activeTab === 'all') return matchSearch;

    const status = getStatusDisplay(p);
    if (activeTab === 'active') {
      return matchSearch && status.text === 'Đang hoạt động';
    } else if (activeTab === 'inactive') {
      return matchSearch && (status.text === 'Đã tắt' || status.text === 'Đã hết hạn');
    }
    return matchSearch;
  });

  // Calculate stats
  const total = promotions.length;
  const active = promotions.filter(p => {
    const status = getStatusDisplay(p);
    return status.text === 'Đang hoạt động';
  }).length;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Sidebar CHUNG – dùng được cho seller (user.role = "Chủ cửa hàng") */}
      <Sidebar
        isOpen={sidebarVisible}
        onClose={() => setSidebarVisible(false)}
        menuItems={menuItems}
        onMenuItemPress={(section) => {
          setSidebarVisible(false);
          
          if (section === 'dashboard') {
            navigation.navigate('SellerDashboard');
          } else if (section === 'foods') {
            navigation.navigate('SellerManageMenuScreen');
          } else if (section === 'promotions') {
            // Already on this screen
          } else if (section === 'orders') {
            navigation.navigate('NewOrderListScreen');
          } else if (section === 'analytics') {
            navigation.navigate('SellerDashboard', { section: 'analytics' });
          } else if (section === 'buy') {
            navigation.reset({ index: 0, routes: [{ name: 'MainTabs' }] });
          }
        }}
      />

      {/* Header giống NewOrderListScreen */}
      <View style={styles.headerWrap}>
        <View style={styles.headerTopRow}>
          <TouchableOpacity
            onPress={() => setSidebarVisible(true)}
            style={styles.roundIconBtn}
          >
            <Menu size={24} color="#eb5523" />
          </TouchableOpacity>

          <Text style={styles.headerTitle}>Quản lý khuyến mãi</Text>

          <TouchableOpacity 
            style={styles.roundIconBtn}
            onPress={() => navigation.navigate('SellerProfileScreen')}
          >
            <User size={24} color="#eb5523" />
          </TouchableOpacity>
        </View>

        {/* Search Box */}
        <View style={styles.searchRow}>
          <View style={styles.searchBox}>
            <TextInput
              style={styles.searchInput}
              placeholder="Tìm theo tên, mã khuyến mãi..."
              placeholderTextColor="#9ca3af"
              value={searchQuery}
              onChangeText={setSearchQuery}
              returnKeyType="search"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity
                onPress={() => setSearchQuery('')}
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

      {/* Tabs horizontal scroll */}
      <View style={styles.tabs}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabsContent}
        >
          <TouchableOpacity
            style={[styles.tab, activeTab === 'all' && styles.tabActive]}
            onPress={() => setActiveTab('all')}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === 'all' && styles.tabTextActive,
              ]}
            >
              Tất cả
            </Text>
            <View
              style={[
                styles.countBadge,
                activeTab === 'all' && styles.countBadgeActive,
              ]}
            >
              <Text
                style={[
                  styles.countText,
                  activeTab === 'all' && styles.countTextActive,
                ]}
              >
                {total}
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tab, activeTab === 'active' && styles.tabActive]}
            onPress={() => setActiveTab('active')}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === 'active' && styles.tabTextActive,
              ]}
            >
              Đang hoạt động
            </Text>
            <View
              style={[
                styles.countBadge,
                activeTab === 'active' && styles.countBadgeActive,
              ]}
            >
              <Text
                style={[
                  styles.countText,
                  activeTab === 'active' && styles.countTextActive,
                ]}
              >
                {active}
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tab, activeTab === 'inactive' && styles.tabActive]}
            onPress={() => setActiveTab('inactive')}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === 'inactive' && styles.tabTextActive,
              ]}
            >
              Không hoạt động
            </Text>
            <View
              style={[
                styles.countBadge,
                activeTab === 'inactive' && styles.countBadgeActive,
              ]}
            >
              <Text
                style={[
                  styles.countText,
                  activeTab === 'inactive' && styles.countTextActive,
                ]}
              >
                {total - active}
              </Text>
            </View>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* Found Bar */}
      <View style={styles.foundWrap}>
        <Text style={styles.foundText}>
          Tìm thấy <Text style={styles.foundNum}>{filteredPromotions.length}</Text> khuyến mãi
        </Text>
        <TouchableOpacity style={styles.addBtn} onPress={handleAdd}>
          <Ionicons name="add" size={18} color="#fff" />
          <Text style={styles.addBtnText}>Thêm</Text>
        </TouchableOpacity>
      </View>

      {/* List */}
      {loading && !refreshing ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color="#ea580c" />
          <Text style={styles.loadingText}>Đang tải...</Text>
        </View>
      ) : filteredPromotions.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Tag size={64} color="#d1d5db" style={{ marginBottom: 16 }} />
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
          contentContainerStyle={styles.scrollContent}
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
              <View style={styles.card}>
                {/* Header */}
                <View style={styles.cardHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.voucherName}>{item.name}</Text>
                    <Text style={styles.voucherCode}>#{item.id}</Text>
                  </View>
                  <View style={[styles.statusPill, { backgroundColor: status.color + '20' }]}>
                    <Text style={[styles.statusText, { color: status.color }]}>
                      {status.icon} {status.text}
                    </Text>
                  </View>
                </View>

                {/* Info */}
                <View style={styles.infoRow}>
                  <View style={styles.typeBadge}>
                    <Text style={styles.typeText}>
                      {item.discount_type === 'PERCENT' ? '📊 PERCENT' : '💵 AMOUNT'}
                    </Text>
                  </View>
                </View>

                <Text style={styles.voucherDesc}>
                  Giảm {formatDiscount(item)} cho đơn từ{' '}
                  {parseFloat(item.minimum_pay.toString()).toLocaleString()}đ
                </Text>

                <Text style={styles.voucherDate}>
                  📅 {formatDate(item.start_date)} → {formatDate(item.end_date)}
                </Text>

                {/* Actions */}
                <View style={styles.actionRow}>
                  <TouchableOpacity
                    style={[styles.actionBtn, styles.editBtn]}
                    onPress={() => handleEdit(item)}
                  >
                    <Ionicons name="create-outline" size={16} color="#fff" />
                    <Text style={styles.editText}>Sửa</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionBtn, styles.deleteBtn]}
                    onPress={() => handleDelete(item.id)}
                  >
                    <Ionicons name="trash-outline" size={16} color="#fff" />
                    <Text style={styles.deleteText}>Xóa</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          }}
        />
      )}   
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },

  // Header giống NewOrderListScreen
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

  tabs: {
    backgroundColor: '#fff',
    paddingTop: 12,
    paddingBottom: 12,
  },
  tabsContent: {
    paddingHorizontal: 16,
    paddingRight: 24,
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: 10,
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

  foundWrap: {
    marginTop: 4,
    backgroundColor: '#F6F7F8',
    paddingVertical: 8,
    paddingHorizontal: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  foundText: {
    color: '#6B7280',
    fontSize: 15,
    fontFamily: Fonts.LeagueSpartanRegular,
  },
  foundNum: {
    color: '#111827',
    fontFamily: Fonts.LeagueSpartanBold,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ea580c',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
  },
  addBtnText: {
    color: '#fff',
    fontFamily: Fonts.LeagueSpartanBold,
    fontSize: 14,
  },

  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#ea580c',
    fontFamily: Fonts.LeagueSpartanMedium,
  },
  emptyContainer: {
    flex: 1,
    paddingVertical: 80,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 18,
    color: '#9ca3af',
    marginBottom: 6,
    fontFamily: Fonts.LeagueSpartanSemiBold,
  },
  emptySubText: {
    fontSize: 14,
    color: '#d1d5db',
    textAlign: 'center',
    fontFamily: Fonts.LeagueSpartanRegular,
  },

  // Card
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#f3f4f6',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  voucherName: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#1e293b',
    fontFamily: Fonts.LeagueSpartanBold,
    marginBottom: 4,
  },
  voucherCode: {
    fontSize: 13,
    color: '#ea580c',
    fontFamily: Fonts.LeagueSpartanSemiBold,
  },
  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  statusText: {
    fontSize: 12,
    fontFamily: Fonts.LeagueSpartanBold,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  typeBadge: {
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  typeText: {
    fontSize: 12,
    color: '#6366f1',
    fontFamily: Fonts.LeagueSpartanSemiBold,
  },
  voucherDesc: {
    fontSize: 14,
    color: '#475569',
    marginBottom: 8,
    lineHeight: 20,
    fontFamily: Fonts.LeagueSpartanRegular,
  },
  voucherDate: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 12,
    fontFamily: Fonts.LeagueSpartanRegular,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    borderRadius: 10,
    paddingVertical: 10,
  },
  editBtn: {
    backgroundColor: '#f59e0b',
  },
  editText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
    fontFamily: Fonts.LeagueSpartanBold,
  },
  deleteBtn: {
    backgroundColor: '#ef4444',
  },
  deleteText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
    fontFamily: Fonts.LeagueSpartanBold,
  },
});

export default VoucherManagementScreen;
