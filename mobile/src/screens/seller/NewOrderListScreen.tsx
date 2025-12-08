import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Linking, Modal, Alert, RefreshControl, TextInput } from 'react-native';
import { Menu, X, ShoppingBag, Phone, User } from 'lucide-react-native';
import { ordersApi, apiClient } from '@/services/api';
import { Order, PaginatedResponse, ApiError } from '@/types';
import { ORDER_STATUS } from '@/constants';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Fonts } from '@/constants/Fonts';
import { useSelector } from 'react-redux';
import { RootState } from '@/store';
import Sidebar from '@/components/sidebar';

const menuItems = [
  { title: 'Trang chủ', icon: Menu, section: 'dashboard' },
  { title: 'Mua hàng', icon: ShoppingBag, section: 'buy' },
  { title: 'Quản lí món ăn', icon: ShoppingBag, section: 'foods' },
  { title: 'Quản lí đơn hàng', icon: ShoppingBag, section: 'orders' },
  { title: 'Quản lí khuyến mãi', icon: ShoppingBag, section: 'promotions' },
  { title: 'Thống kê', icon: Menu, section: 'analytics' },
];

type DisplayOrderItem = {
  name: string;
  qty: number;
  price: number;
  food_note?: string;
  size_display?: string;
  food_option_price?: number;
};

type OrderWithDisplayData = {
  id: number;
  customer: string;
  phone: string;
  time: string;
  address: string;
  items: DisplayOrderItem[];
  total: number;
  status: string;
  payment: string;
  totalDisplay?: string;
  notes?: string;
  order_status: string;
  receiver_name: string;
  phone_number: string;
  ship_address: string;
  created_date: string;
  user?: any;
  // Financial fields
  subtotal: number;           // Food items only
  shipping_fee: number;        // Shipping fee
  promo_discount: number;      // Promo discount
  total_after_discount: number; // Final total
};

const NewOrderListScreen = ({ navigation }: any) => {
  const [activeTab, setActiveTab] = useState('all');
  const [orderList, setOrderList] = useState<OrderWithDisplayData[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<null | OrderWithDisplayData>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [storeId, setStoreId] = useState<number | null>(null);
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [searchText, setSearchText] = useState('');
  const { user } = useSelector((state: RootState) => state.auth);

  // Helper function to convert API order to display format
  const convertOrderToDisplay = (order: Order): OrderWithDisplayData => {
    const items: DisplayOrderItem[] = order.items?.map(item => ({
      name: item.food.title,
      qty: item.quantity,
      price: parseFloat(item.food.price),
      food_note: item.food_note, // Include food_note from OrderItem
      size_display: item.size_display, // Include size display
      food_option_price: item.food_option_price // Include option price
    })) || [];

    // Parse financial fields
    const subtotal = parseFloat(order.total_money || '0');
    const shippingFee = parseFloat(order.shipping_fee || '15000');
    const promoDiscount = order.promo_discount || 0;
    const totalAfterDiscount = order.total_after_discount 
      ? parseFloat(order.total_after_discount.toString())
      : subtotal + shippingFee - promoDiscount;
    
    return {
      ...order,
      customer: order.user?.fullname || order.receiver_name,
      phone: order.user?.phone_number || order.phone_number,
      time: new Date(order.created_date).toLocaleTimeString('vi-VN', { 
        hour: '2-digit', 
        minute: '2-digit' 
      }),
      address: order.ship_address,
      items,
      total: totalAfterDiscount, // Use final total
      subtotal,
      shipping_fee: shippingFee,
      promo_discount: promoDiscount,
      total_after_discount: totalAfterDiscount,
      status: mapOrderStatus(order.order_status),
      payment: order.payment_method === 'cash' ? 'COD' : 'Online',
      notes: order.note
    };
  };

  // Map API order status to component status
  const mapOrderStatus = (apiStatus: string): string => {
    const statusMap: Record<string, string> = {
      'Chờ xác nhận': 'pending',
      'Đã xác nhận': 'confirmed', 
      'Đang chuẩn bị': 'preparing',
      'Sẵn sàng': 'ready',
      'Đã lấy hàng': 'delivering',
      'Đã giao': 'completed',
      'Đã huỷ': 'rejected'
    };
    return statusMap[apiStatus] || 'pending';
  };

  // Map component status back to API status
  const mapToApiStatus = (componentStatus: string): string => {
    const statusMap: Record<string, string> = {
      'pending': 'Chờ xác nhận',
      'confirmed': 'Đã xác nhận',
      'preparing': 'Đang chuẩn bị', 
      'ready': 'Sẵn sàng',
      'delivering': 'Đã lấy hàng',
      'completed': 'Đã giao',
      'rejected': 'Đã huỷ'
    };
    return statusMap[componentStatus] || 'Chờ xác nhận';
  };

  // Get store ID for current user
  const getStoreId = async () => {
    try {
      const response: any = await apiClient.get('/stores/my_store/');
      return response.id;
    } catch (err: any) {
      console.error('Error getting store ID:', err);
      throw err;
    }
  };

  // Fetch orders from API
  const fetchOrders = async (showRefresh = false) => {
    try {
      if (showRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      // Get store ID if not already cached
      let currentStoreId = storeId;
      if (!currentStoreId) {
        currentStoreId = await getStoreId();
        setStoreId(currentStoreId);
      }

      // Use store-specific endpoint: /stores/{id}/orders/
      const response: any = await apiClient.get(`/stores/${currentStoreId}/orders/`);

      const convertedOrders = response?.map(convertOrderToDisplay) || [];
      
      // Filter by status if needed (since backend doesn't support status filtering on this endpoint)
      const filteredOrders = activeTab === 'all' 
        ? convertedOrders 
        : convertedOrders.filter((order: OrderWithDisplayData) => order.status === activeTab);
      
      setOrderList(filteredOrders);
    } catch (err: any) {
      console.error('Error fetching orders:', err);
      const errorMessage = err.message || 'Không thể tải danh sách đơn hàng';
      setError(errorMessage);
      Alert.alert('Lỗi', errorMessage);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Update order status using store-specific endpoint
  const updateOrderStatusAsync = async (orderId: string | number, newStatus: string) => {
    try {
      // Get store ID if not already cached
      let currentStoreId = storeId;
      if (!currentStoreId) {
        currentStoreId = await getStoreId();
        setStoreId(currentStoreId);
      }

      const apiStatus = mapToApiStatus(newStatus);
      
      // Use store-specific endpoint: /stores/{store_id}/orders/{order_id}/status/
      await apiClient.patch(`/stores/${currentStoreId}/orders/${orderId}/status/`, {
        order_status: apiStatus
      });

      // Update local state
      setOrderList(prev =>
        prev.map(order =>
          order.id.toString() === orderId.toString()
            ? { ...order, status: newStatus }
            : order
        )
      );

      // Update selected order if it's the same
      if (selectedOrder && selectedOrder.id.toString() === orderId.toString()) {
        setSelectedOrder({ ...selectedOrder, status: newStatus });
      }
    } catch (err: any) {
      console.error('Error updating order status:', err);
      Alert.alert('Lỗi', err.message || 'Không thể cập nhật trạng thái đơn hàng');
    }
  };

  // Load orders when component mounts or tab changes
  useEffect(() => {
    fetchOrders();
  }, [activeTab]);

  // Refresh function
  const onRefresh = () => {
    fetchOrders(true);
  };

  const filteredOrders = orderList.filter(order => {
    const matchSearch = searchText.trim() === '' || 
      order.customer?.toLowerCase().includes(searchText.toLowerCase()) ||
      order.id.toString().includes(searchText) ||
      order.phone?.includes(searchText);
    
    if (activeTab === 'all') return matchSearch;
    return matchSearch && order.status === activeTab;
  });

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Sidebar chung */}
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
            navigation.navigate('SellerVoucherManagementScreen');
          } else if (section === 'orders') {
            // Already on this screen
          } else if (section === 'analytics') {
            navigation.navigate('SellerDashboard', { section: 'analytics' });
          } else if (section === 'buy') {
            navigation.reset({ index: 0, routes: [{ name: 'MainTabs' }] });
          }
        }}
      />

      {/* Header giống ManageMenuScreen */}
      <View style={styles.headerWrap}>
        <View style={styles.headerTopRow}>
          <TouchableOpacity
            onPress={() => setSidebarVisible(true)}
            style={styles.roundIconBtn}
          >
            <Menu size={24} color="#eb5523" />
          </TouchableOpacity>

          <Text style={styles.headerTitle}>Quản lý đơn hàng</Text>

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
              placeholder="Tìm theo tên, SĐT, mã đơn..."
              placeholderTextColor="#9ca3af"
              value={searchText}
              onChangeText={setSearchText}
              returnKeyType="search"
            />
            {searchText.length > 0 ? (
              <TouchableOpacity
                onPress={() => setSearchText('')}
                style={styles.clearBtn}
              >
                <Ionicons name="close-circle" size={16} color="#9ca3af" />
              </TouchableOpacity>
            ) : null}
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
            <Text style={[styles.tabText, activeTab === 'all' && styles.tabTextActive]}>
              Tất cả
            </Text>
            <View style={[styles.countBadge, activeTab === 'all' && styles.countBadgeActive]}>
              <Text style={[styles.countText, activeTab === 'all' && styles.countTextActive]}>
                {orderList.length}
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tab, activeTab === 'pending' && styles.tabActive]}
            onPress={() => setActiveTab('pending')}
            activeOpacity={0.7}
          >
            <Text style={[styles.tabText, activeTab === 'pending' && styles.tabTextActive]}>
              Chờ xác nhận
            </Text>
            <View style={[styles.countBadge, activeTab === 'pending' && styles.countBadgeActive]}>
              <Text style={[styles.countText, activeTab === 'pending' && styles.countTextActive]}>
                {orderList.filter(o => o.status === 'pending').length}
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tab, activeTab === 'preparing' && styles.tabActive]}
            onPress={() => setActiveTab('preparing')}
            activeOpacity={0.7}
          >
            <Text style={[styles.tabText, activeTab === 'preparing' && styles.tabTextActive]}>
              Đang chuẩn bị
            </Text>
            <View style={[styles.countBadge, activeTab === 'preparing' && styles.countBadgeActive]}>
              <Text style={[styles.countText, activeTab === 'preparing' && styles.countTextActive]}>
                {orderList.filter(o => o.status === 'preparing').length}
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tab, activeTab === 'ready' && styles.tabActive]}
            onPress={() => setActiveTab('ready')}
            activeOpacity={0.7}
          >
            <Text style={[styles.tabText, activeTab === 'ready' && styles.tabTextActive]}>
              Sẵn sàng
            </Text>
            <View style={[styles.countBadge, activeTab === 'ready' && styles.countBadgeActive]}>
              <Text style={[styles.countText, activeTab === 'ready' && styles.countTextActive]}>
                {orderList.filter(o => o.status === 'ready').length}
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tab, activeTab === 'delivering' && styles.tabActive]}
            onPress={() => setActiveTab('delivering')}
            activeOpacity={0.7}
          >
            <Text style={[styles.tabText, activeTab === 'delivering' && styles.tabTextActive]}>
              Đang giao
            </Text>
            <View style={[styles.countBadge, activeTab === 'delivering' && styles.countBadgeActive]}>
              <Text style={[styles.countText, activeTab === 'delivering' && styles.countTextActive]}>
                {orderList.filter(o => o.status === 'delivering').length}
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tab, activeTab === 'completed' && styles.tabActive]}
            onPress={() => setActiveTab('completed')}
            activeOpacity={0.7}
          >
            <Text style={[styles.tabText, activeTab === 'completed' && styles.tabTextActive]}>
              Hoàn thành
            </Text>
            <View style={[styles.countBadge, activeTab === 'completed' && styles.countBadgeActive]}>
              <Text style={[styles.countText, activeTab === 'completed' && styles.countTextActive]}>
                {orderList.filter(o => o.status === 'completed').length}
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tab, activeTab === 'rejected' && styles.tabActive]}
            onPress={() => setActiveTab('rejected')}
            activeOpacity={0.7}
          >
            <Text style={[styles.tabText, activeTab === 'rejected' && styles.tabTextActive]}>
              Đã hủy
            </Text>
            <View style={[styles.countBadge, activeTab === 'rejected' && styles.countBadgeActive]}>
              <Text style={[styles.countText, activeTab === 'rejected' && styles.countTextActive]}>
                {orderList.filter(o => o.status === 'rejected').length}
              </Text>
            </View>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* Found Bar */}
      <View style={styles.foundWrap}>
        <Text style={styles.foundText}>
          Tìm thấy <Text style={styles.foundNum}>{filteredOrders.length}</Text> đơn hàng
        </Text>
      </View>

      {/* Order list */}
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {loading && !refreshing && (
          <View style={styles.loadingWrap}>
            <Text style={styles.loadingText}>Đang tải...</Text>
          </View>
        )}
        
        {error && (
          <View style={styles.errorWrap}>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity 
              style={styles.retryBtn}
              onPress={() => fetchOrders()}
            >
              <Text style={styles.retryText}>Thử lại</Text>
            </TouchableOpacity>
          </View>
        )}

        {filteredOrders.length === 0 && !loading ? (
          <View style={styles.emptyContainer}>
            <ShoppingBag size={64} color="#d1d5db" style={{ marginBottom: 16 }} />
            <Text style={styles.emptyText}>
              {searchText
                ? 'Không tìm thấy đơn hàng nào'
                : activeTab === 'all'
                  ? 'Chưa có đơn hàng nào'
                  : 'Không có đơn trong trạng thái này'}
            </Text>
            <Text style={styles.emptySubText}>
              {searchText ? 'Thử từ khóa khác' : 'Đợi khách hàng đặt hàng'}
            </Text>
          </View>
        ) : (
          filteredOrders.length > 0 && (
            filteredOrders.map((order, idx) => (
              <TouchableOpacity
                key={order.id}
                activeOpacity={0.9}
                onPress={() => {
                  setSelectedOrder(order);
                  setModalVisible(true);
                }}
              >
                <View style={styles.card}>
                  <View style={styles.cardHeader}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <View style={styles.cardAvatar}>
                        <Text style={{ fontSize: 22 }}>{idx === 0 ? '🧑‍🦱' : idx === 1 ? '👩' : '🧑'}</Text>
                      </View>
                      <View>
                        <Text style={styles.customer}>{order.customer || 'Khách vãng lai'}</Text>
                        <Text style={styles.phone}>{order.phone || 'N/A'}</Text>
                      </View>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={styles.orderId}>#{order.id}</Text>
                      <Text style={styles.orderTime}>{order.time}</Text>
                    </View>
                  </View>

                  <Text style={styles.orderLabel}>Món đã order:</Text>
                  {order.items.map((item, i) => (
                    <View key={i}>
                      <View style={styles.itemRow}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.itemName}>{item.name || 'N/A'}</Text>
                          {item.size_display ? (
                            <Text style={{ color: '#6b7280', fontSize: 11, marginTop: 1 }}>
                              Size: {item.size_display}
                            </Text>
                          ) : null}
                        </View>
                        <Text style={styles.itemQty}>x{typeof item.qty === 'number' ? item.qty : 0}</Text>
                        <View style={{ alignItems: 'flex-end' }}>
                          <Text style={styles.itemPrice}>{(typeof item.price === 'number' ? item.price : 0).toLocaleString()} đ</Text>
                          {item.food_option_price && item.food_option_price > 0 ? (
                            <Text style={{ color: '#6b7280', fontSize: 10, marginTop: 1 }}>
                              +{(typeof item.food_option_price === 'number' ? item.food_option_price : 0).toLocaleString()} đ
                            </Text>
                          ) : null}
                        </View>
                      </View>
                      {item.food_note && item.food_note.trim() !== '' ? (
                        <View style={{ marginLeft: 8, marginBottom: 2 }}>
                          <Text style={{ color: '#6b7280', fontSize: 11, fontStyle: 'italic' }}>
                            • {item.food_note}
                          </Text>
                        </View>
                      ) : null}
                    </View>
                  ))}

                  {/* Fix: Wrap tất cả inline calculations trong <Text> */}
                  <View style={styles.totalRow}>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 2 }}>
                        <Text style={{ color: '#6b7280', fontSize: 13 }}>Tạm tính:</Text>
                        <Text style={{ color: '#1e293b', fontSize: 13 }}>
                          {(typeof order.subtotal === 'number' ? order.subtotal : 0).toLocaleString()} đ
                        </Text>
                      </View>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 2 }}>
                        <Text style={{ color: '#6b7280', fontSize: 13 }}>Phí vận chuyển:</Text>
                        <Text style={{ color: '#1e293b', fontSize: 13 }}>
                          {(typeof order.shipping_fee === 'number' ? order.shipping_fee : 0).toLocaleString()} đ
                        </Text>
                      </View>
                      {typeof order.promo_discount === 'number' && order.promo_discount > 0 ? (
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 2 }}>
                          <Text style={{ color: '#10b981', fontSize: 13 }}>Giảm giá:</Text>
                          <Text style={{ color: '#10b981', fontSize: 13, fontWeight: 'bold' }}>
                            -{order.promo_discount.toLocaleString()} đ
                          </Text>
                        </View>
                      ) : null}
                      <View style={{ height: 1, backgroundColor: '#e5e7eb', marginVertical: 4 }} />
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                        <Text style={{ fontWeight: 'bold', fontSize: 15, color: '#1e293b' }}>Tổng cộng:</Text>
                        <Text style={{ color: '#ea580c', fontWeight: 'bold', fontSize: 16 }}>
                          {(typeof order.total === 'number' ? order.total : 0).toLocaleString()} đ
                        </Text>
                      </View>
                    </View>
                  </View>

                  <View style={[styles.totalRow, { marginTop: 8 }]}>
                    <Text style={styles.payment}>{order.payment === 'COD' ? '💰 COD' : order.payment ? '💳 Online' : 'N/A'}</Text>
                    {order.status === 'pending' ? (
                      <View style={[styles.statusBadge, { backgroundColor: '#f59e0b' }]}><Text style={styles.statusBadgeText}>Chờ xác nhận</Text></View>
                    ) : order.status === 'preparing' ? (
                      <View style={[styles.statusBadge, { backgroundColor: '#3b82f6' }]}><Text style={styles.statusBadgeText}>Đang chuẩn bị</Text></View>
                    ) : order.status === 'ready' ? (
                      <View style={[styles.statusBadge, { backgroundColor: '#10b981' }]}><Text style={styles.statusBadgeText}>Sẵn sàng</Text></View>
                    ) : order.status === 'rejected' ? (
                      <View style={[styles.statusBadge, { backgroundColor: '#ef4444' }]}><Text style={styles.statusBadgeText}>Đã hủy</Text></View>
                    ) : null}
                  </View>

                  <View style={styles.actionRow}>
                    {order.status === 'pending' ? (
                      <>
                        <TouchableOpacity style={[styles.actionBtn, styles.rejectBtn]} onPress={() => {
                          updateOrderStatusAsync(order.id, 'rejected');
                        }}>
                          <Text style={styles.rejectText}>Hủy</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.actionBtn, styles.confirmBtn]} onPress={() => {
                          updateOrderStatusAsync(order.id, 'preparing');
                        }}>
                          <Text style={styles.confirmText}>Xác nhận</Text>
                        </TouchableOpacity>
                      </>
                    ) : order.status === 'preparing' ? (
                      <TouchableOpacity style={[styles.actionBtn, styles.readyBtn]} onPress={() => {
                        updateOrderStatusAsync(order.id, 'ready');
                      }}>
                        <Text style={styles.readyText}>Sẵn sàng</Text>
                      </TouchableOpacity>
                    ) : order.status === 'ready' ? (
                      <TouchableOpacity style={[styles.actionBtn, styles.deliveringBtn]} onPress={() => {
                        updateOrderStatusAsync(order.id, 'delivering');
                      }}>
                        <Text style={styles.deliveringText}>Đang giao</Text>
                      </TouchableOpacity>
                    ) : order.status === 'delivering' ? (
                      <TouchableOpacity style={[styles.actionBtn, styles.completedBtn]} onPress={() => {
                        updateOrderStatusAsync(order.id, 'completed');
                      }}>
                        <Text style={styles.completedText}>Hoàn thành</Text>
                      </TouchableOpacity>
                    ) : null}
                    <TouchableOpacity style={[styles.actionBtn, styles.callBtn]} onPress={() => {
                      if (order.phone) {
                        Linking.openURL(`tel:${order.phone}`);
                      }
                    }}>
                      <Phone size={16} color="#ea580c" />
                      <Text style={styles.callText}>Gọi</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </TouchableOpacity>
            ))
          )
        )}
      </ScrollView>

      {/* Modal chi tiết đơn hàng - Redesigned */}
      {selectedOrder && (
        <Modal
          visible={modalVisible}
          animationType="slide"
          transparent
          onRequestClose={() => setModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              {/* Header */}
              <View style={styles.modalHeader}>
                <Text style={styles.modalHeaderTitle}>Chi tiết đơn hàng</Text>
                <TouchableOpacity 
                  onPress={() => setModalVisible(false)}
                  style={styles.modalCloseBtn}
                >
                  <X size={24} color="#6b7280" />
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false}>
                {/* Thông tin khách hàng */}
                <View style={styles.modalSection}>
                  <View style={styles.customerInfoCard}>
                    <View style={styles.customerAvatar}>
                      <Text style={styles.customerAvatarText}>
                        {selectedOrder.customer?.[0]?.toUpperCase() || '👤'}
                      </Text>
                    </View>
                    <View style={styles.customerDetails}>
                      <Text style={styles.customerName}>{selectedOrder.customer || 'Khách vãng lai'}</Text>
                      <TouchableOpacity 
                        onPress={() => Linking.openURL(`tel:${selectedOrder.phone || ''}`)}
                        style={styles.phoneRow}
                      >
                        <Phone size={14} color="#ea580c" />
                        <Text style={styles.customerPhone}>{selectedOrder.phone || 'N/A'}</Text>
                      </TouchableOpacity>
                      <Text style={styles.customerAddress} numberOfLines={2}>
                        📍 {selectedOrder.address || 'Chưa có địa chỉ'}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Thông tin đơn hàng */}
                <View style={styles.modalSection}>
                  <Text style={styles.sectionTitle}>Thông tin đơn hàng</Text>
                  <View style={styles.infoCard}>
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>Mã đơn hàng</Text>
                      <Text style={styles.infoValue}>#{selectedOrder.id}</Text>
                    </View>
                    <View style={styles.infoDivider} />
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>Thời gian đặt</Text>
                      <Text style={styles.infoValue}>{selectedOrder.time || 'N/A'}</Text>
                    </View>
                    <View style={styles.infoDivider} />
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>Thanh toán</Text>
                      <View style={styles.paymentBadge}>
                        <Text style={styles.paymentBadgeText}>
                          {selectedOrder.payment === 'COD' ? '💰 Tiền mặt' : selectedOrder.payment ? '💳 Online' : 'N/A'}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.infoDivider} />
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>Trạng thái</Text>
                      <View style={[
                        styles.statusPill,
                        selectedOrder.status === 'pending' && { backgroundColor: '#fef3c7' },
                        selectedOrder.status === 'preparing' && { backgroundColor: '#dbeafe' },
                        selectedOrder.status === 'ready' && { backgroundColor: '#d1fae5' },
                        selectedOrder.status === 'delivering' && { backgroundColor: '#e0e7ff' },
                        selectedOrder.status === 'completed' && { backgroundColor: '#d1fae5' },
                        selectedOrder.status === 'rejected' && { backgroundColor: '#fee2e2' },
                      ]}>
                        <Text style={[
                          styles.statusPillText,
                          selectedOrder.status === 'pending' && { color: '#92400e' },
                          selectedOrder.status === 'preparing' && { color: '#1e40af' },
                          selectedOrder.status === 'ready' && { color: '#065f46' },
                          selectedOrder.status === 'delivering' && { color: '#3730a3' },
                          selectedOrder.status === 'completed' && { color: '#065f46' },
                          selectedOrder.status === 'rejected' && { color: '#991b1b' },
                        ]}>
                          {selectedOrder.status === 'pending' ? '⏳ Chờ xác nhận' 
                            : selectedOrder.status === 'preparing' ? '👨‍🍳 Đang chuẩn bị' 
                            : selectedOrder.status === 'ready' ? '✅ Sẵn sàng' 
                            : selectedOrder.status === 'delivering' ? '🚚 Đang giao' 
                            : selectedOrder.status === 'completed' ? '✅ Đã hoàn thành' 
                            : selectedOrder.status === 'rejected' ? '❌ Đã hủy' 
                            : selectedOrder.status}
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>

                {/* Món đã order */}
                <View style={styles.modalSection}>
                  <Text style={styles.sectionTitle}>Món đã order</Text>
                  <View style={styles.itemsCard}>
                    {selectedOrder.items.map((item, idx) => (
                      <View key={idx}>
                        <View style={styles.foodItemRow}>
                          <View style={styles.foodItemLeft}>
                            <Text style={styles.foodItemName}>{item.name || 'N/A'}</Text>
                            {item.size_display ? (
                              <Text style={styles.foodItemSize}>Size: {String(item.size_display)}</Text>
                            ) : null}
                            <Text style={styles.foodItemPrice}>
                              {(typeof item.price === 'number' ? item.price : 0).toLocaleString()}đ
                              {item.food_option_price && item.food_option_price > 0 ? (
                                <Text style={styles.foodItemExtra}> +{(typeof item.food_option_price === 'number' ? item.food_option_price : 0).toLocaleString()}đ</Text>
                              ) : null}
                            </Text>
                            {item.food_note && item.food_note.trim() !== '' ? (
                              <View style={styles.foodNoteBox}>
                                <Text style={styles.foodNoteText}>💬 {item.food_note}</Text>
                              </View>
                            ) : null}
                          </View>
                          <View style={styles.foodItemRight}>
                            <Text style={styles.foodItemQty}>x{typeof item.qty === 'number' ? item.qty : 0}</Text>
                            <Text style={styles.foodItemTotal}>
                              {(((typeof item.price === 'number' ? item.price : 0) + (typeof item.food_option_price === 'number' ? item.food_option_price : 0)) * (typeof item.qty === 'number' ? item.qty : 0)).toLocaleString()}đ
                            </Text>
                          </View>
                        </View>
                        {idx < selectedOrder.items.length - 1 && <View style={styles.itemDivider} />}
                      </View>
                    ))}
                  </View>
                </View>

                {/* Tổng tiền */}
                <View style={styles.modalSection}>
                  <View style={styles.summaryCard}>
                    <View style={styles.summaryRow}>
                      <Text style={styles.summaryLabel}>Tạm tính</Text>
                      <Text style={styles.summaryValue}>
                        {(typeof selectedOrder.subtotal === 'number' ? selectedOrder.subtotal : 0).toLocaleString()}đ
                      </Text>
                    </View>
                    <View style={styles.summaryRow}>
                      <Text style={styles.summaryLabel}>Phí vận chuyển</Text>
                      <Text style={styles.summaryValue}>
                        +{(typeof selectedOrder.shipping_fee === 'number' ? selectedOrder.shipping_fee : 0).toLocaleString()}đ
                      </Text>
                    </View>
                    {typeof selectedOrder.promo_discount === 'number' && selectedOrder.promo_discount > 0 ? (
                      <View style={styles.summaryRow}>
                        <Text style={[styles.summaryLabel, { color: '#10b981' }]}>
                          🎁 Giảm giá
                        </Text>
                        <Text style={[styles.summaryValue, { color: '#10b981' }]}>
                          -{selectedOrder.promo_discount.toLocaleString()}đ
                        </Text>
                      </View>
                    ) : null}
                    <View style={styles.summaryDivider} />
                    <View style={styles.summaryTotalRow}>
                      <Text style={styles.summaryTotalLabel}>Tổng thanh toán</Text>
                      <Text style={styles.summaryTotalValue}>
                        {(typeof selectedOrder.total === 'number' ? selectedOrder.total : 0).toLocaleString()}đ
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Ghi chú */}
                {selectedOrder.notes ? (
                  <View style={styles.modalSection}>
                    <Text style={styles.sectionTitle}>Ghi chú</Text>
                    <View style={styles.notesCard}>
                      <Text style={styles.notesText}>
                        {selectedOrder.notes || 'Không có ghi chú'}
                      </Text>
                    </View>
                  </View>
                ) : null}
              </ScrollView>

              {/* Nút hành động */}
              <View style={styles.modalActions}>
                <TouchableOpacity 
                  style={styles.modalRejectBtn} 
                  onPress={() => {
                    Alert.alert(
                      'Xác nhận',
                      'Bạn có chắc muốn từ chối đơn hàng này?',
                      [
                        { text: 'Hủy', style: 'cancel' },
                        { 
                          text: 'Từ chối', 
                          style: 'destructive',
                          onPress: () => {
                            updateOrderStatusAsync(selectedOrder.id, 'rejected');
                            setModalVisible(false);
                          }
                        }
                      ]
                    );
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={styles.modalRejectText}>Từ chối</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={styles.modalConfirmBtn} 
                  onPress={() => {
                    if (selectedOrder.status === 'pending') {
                      updateOrderStatusAsync(selectedOrder.id, 'preparing');
                    } else if (selectedOrder.status === 'preparing') {
                      updateOrderStatusAsync(selectedOrder.id, 'ready');
                    } else if (selectedOrder.status === 'ready') {
                      updateOrderStatusAsync(selectedOrder.id, 'delivering');
                    } else if (selectedOrder.status === 'delivering') {
                      updateOrderStatusAsync(selectedOrder.id, 'completed');
                    }
                    setModalVisible(false);
                  }}
                  activeOpacity={0.9}
                >
                  <Text style={styles.modalConfirmText}>
                    {selectedOrder.status === 'pending' ? 'Xác nhận' 
                      : selectedOrder.status === 'preparing' ? 'Sẵn sàng' 
                      : selectedOrder.status === 'ready' ? 'Đang giao' 
                      : selectedOrder.status === 'delivering' ? 'Hoàn thành' 
                      : 'Xác nhận'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#ffffff',
  },

  // Header giống ManageMenu
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

  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
  loadingWrap: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  loadingText: {
    color: '#6b7280',
    fontFamily: Fonts.LeagueSpartanRegular,
  },
  errorWrap: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  errorText: {
    color: '#ef4444',
    textAlign: 'center',
    fontFamily: Fonts.LeagueSpartanRegular,
  },
  retryBtn: {
    marginTop: 10,
    padding: 10,
    backgroundColor: '#ea580c',
    borderRadius: 8,
  },
  retryText: {
    color: '#fff',
    fontWeight: 'bold',
    fontFamily: Fonts.LeagueSpartanBold,
  },
  emptyContainer: {
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
    alignItems: 'center', 
    marginBottom: 8,
  },
  cardAvatar: { 
    width: 40, 
    height: 40, 
    borderRadius: 20, 
    backgroundColor: '#fffde7', 
    alignItems: 'center', 
    justifyContent: 'center', 
    marginRight: 10,
  },
  customer: { 
    fontWeight: 'bold', 
    fontSize: 15, 
    color: '#1e293b',
    fontFamily: Fonts.LeagueSpartanBold,
  },
  phone: { 
    fontSize: 13, 
    color: '#64748b',
    fontFamily: Fonts.LeagueSpartanRegular,
  },
  orderId: { 
    fontWeight: 'bold', 
    color: '#64748b', 
    fontSize: 13,
    fontFamily: Fonts.LeagueSpartanBold,
  },
  orderTime: { 
    fontSize: 13, 
    color: '#64748b',
    fontFamily: Fonts.LeagueSpartanRegular,
  },
  orderLabel: { 
    fontSize: 13, 
    color: '#6b7280', 
    marginTop: 8, 
    marginBottom: 6,
    fontFamily: Fonts.LeagueSpartanMedium,
  },
  itemRow: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    marginBottom: 4,
  },
  itemName: { 
    fontSize: 14, 
    color: '#1e293b',
    fontFamily: Fonts.LeagueSpartanMedium,
  },
  itemQty: { 
    fontSize: 14, 
    color: '#1e293b', 
    marginHorizontal: 8,
    fontFamily: Fonts.LeagueSpartanRegular,
  },
  itemPrice: { 
    fontSize: 14, 
    color: '#1e293b',
    fontFamily: Fonts.LeagueSpartanMedium,
  },
  totalRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    marginTop: 8,
  },
  payment: { 
    fontSize: 13, 
    marginRight: 8,
    fontFamily: Fonts.LeagueSpartanMedium,
  },
  statusBadge: { 
    borderRadius: 8, 
    paddingHorizontal: 10, 
    paddingVertical: 3,
  },
  statusBadgeText: { 
    fontSize: 12, 
    color: '#fff', 
    fontWeight: 'bold',
    fontFamily: Fonts.LeagueSpartanBold,
  },
  actionRow: { 
    flexDirection: 'row', 
    marginTop: 12, 
    gap: 8,
  },
  actionBtn: { 
    flex: 1,
    borderRadius: 10, 
    paddingVertical: 10, 
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 4,
  },
  rejectBtn: { 
    backgroundColor: '#fff', 
    borderWidth: 1, 
    borderColor: '#ef4444',
  },
  confirmBtn: { 
    backgroundColor: '#ea580c',
  },
  readyBtn: { 
    backgroundColor: '#10b981',
  },
  deliveringBtn: { 
    backgroundColor: '#3b82f6',
  },
  completedBtn: { 
    backgroundColor: '#ea580c',
  },
  callBtn: { 
    backgroundColor: '#fff', 
    borderWidth: 1, 
    borderColor: '#e5e7eb',
    maxWidth: 90,
  },
  rejectText: { 
    color: '#ef4444', 
    fontWeight: 'bold',
    fontFamily: Fonts.LeagueSpartanBold,
  },
  confirmText: { 
    color: '#fff', 
    fontWeight: 'bold',
    fontFamily: Fonts.LeagueSpartanBold,
  },
  readyText: { 
    color: '#fff', 
    fontWeight: 'bold',
    fontFamily: Fonts.LeagueSpartanBold,
  },
  deliveringText: { 
    color: '#fff', 
    fontWeight: 'bold',
    fontFamily: Fonts.LeagueSpartanBold,
  },
  completedText: { 
    color: '#fff', 
    fontWeight: 'bold',
    fontFamily: Fonts.LeagueSpartanBold,
  },
  callText: { 
    color: '#ea580c', 
    fontWeight: 'bold',
    fontFamily: Fonts.LeagueSpartanBold,
  },

  // Modal styles - Redesigned
  modalOverlay: { 
    flex: 1, 
    backgroundColor: 'rgba(15, 23, 42, 0.6)', 
    justifyContent: 'flex-end',
  },
  modalContent: { 
    backgroundColor: '#fff', 
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  modalHeaderTitle: {
    fontSize: 20,
    color: '#111827',
    fontFamily: Fonts.LeagueSpartanBold,
  },
  modalCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
  },

  modalSection: {
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  sectionTitle: {
    fontSize: 15,
    color: '#ea580c',
    marginBottom: 10,
    fontFamily: Fonts.LeagueSpartanBold,
  },

  // Customer info
  customerInfoCard: {
    flexDirection: 'row',
    backgroundColor: '#fffbeb',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#fef3c7',
  },
  customerAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#fbbf24',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  customerAvatarText: {
    fontSize: 28,
    color: '#fff',
    fontFamily: Fonts.LeagueSpartanBold,
  },
  customerDetails: {
    flex: 1,
    justifyContent: 'center',
  },
  customerName: {
    fontSize: 16,
    color: '#111827',
    marginBottom: 4,
    fontFamily: Fonts.LeagueSpartanBold,
  },
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  customerPhone: {
    fontSize: 14,
    color: '#ea580c',
    fontFamily: Fonts.LeagueSpartanSemiBold,
  },
  customerAddress: {
    fontSize: 13,
    color: '#6b7280',
    fontFamily: Fonts.LeagueSpartanRegular,
  },

  // Info card
  infoCard: {
    backgroundColor: '#f9fafb',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  infoLabel: {
    fontSize: 14,
    color: '#6b7280',
    fontFamily: Fonts.LeagueSpartanMedium,
  },
  infoValue: {
    fontSize: 14,
    color: '#111827',
    fontFamily: Fonts.LeagueSpartanSemiBold,
  },
  infoDivider: {
    height: 1,
    backgroundColor: '#e5e7eb',
    marginVertical: 4,
  },
  paymentBadge: {
    backgroundColor: '#fff',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  paymentBadgeText: {
    fontSize: 13,
    color: '#374151',
    fontFamily: Fonts.LeagueSpartanSemiBold,
  },
  statusPill: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 999,
  },
  statusPillText: {
    fontSize: 13,
    fontFamily: Fonts.LeagueSpartanBold,
  },

  // Items card
  itemsCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  foodItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  foodItemLeft: {
    flex: 1,
    paddingRight: 12,
  },
  foodItemName: {
    fontSize: 15,
    color: '#111827',
    marginBottom: 4,
    fontFamily: Fonts.LeagueSpartanBold,
  },
  foodItemSize: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 2,
    fontFamily: Fonts.LeagueSpartanRegular,
  },
  foodItemPrice: {
    fontSize: 13,
    color: '#4b5563',
    fontFamily: Fonts.LeagueSpartanMedium,
  },
  foodItemExtra: {
    fontSize: 12,
    color: '#9ca3af',
    fontFamily: Fonts.LeagueSpartanRegular,
  },
  foodNoteBox: {
    marginTop: 6,
    backgroundColor: '#fef3c7',
    borderRadius: 8,
    padding: 8,
    borderWidth: 1,
    borderColor: '#fde68a',
  },
  foodNoteText: {
    fontSize: 12,
    color: '#92400e',
    fontStyle: 'italic',
    fontFamily: Fonts.LeagueSpartanRegular,
  },
  foodItemRight: {
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  foodItemQty: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 4,
    fontFamily: Fonts.LeagueSpartanBold,
  },
  foodItemTotal: {
    fontSize: 15,
    color: '#ea580c',
    fontFamily: Fonts.LeagueSpartanBold,
  },
  itemDivider: {
    height: 1,
    backgroundColor: '#f3f4f6',
    marginVertical: 8,
  },

  // Summary
  summaryCard: {
    backgroundColor: '#fff7ed',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#fed7aa',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#6b7280',
    fontFamily: Fonts.LeagueSpartanMedium,
  },
  summaryValue: {
    fontSize: 14,
    color: '#374151',
    fontFamily: Fonts.LeagueSpartanSemiBold,
  },
  summaryDivider: {
    height: 1,
    backgroundColor: '#fdba74',
    marginVertical: 8,
  },
  summaryTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 4,
  },
  summaryTotalLabel: {
    fontSize: 16,
    color: '#ea580c',
    fontFamily: Fonts.LeagueSpartanBold,
  },
  summaryTotalValue: {
    fontSize: 20,
    color: '#ea580c',
    fontFamily: Fonts.LeagueSpartanExtraBold,
  },

  // Notes
  notesCard: {
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  notesText: {
    fontSize: 14,
    color: '#4b5563',
    lineHeight: 20,
    fontFamily: Fonts.LeagueSpartanRegular,
  },

  // Actions
  modalActions: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 24,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  modalRejectBtn: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#ef4444',
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalRejectText: {
    fontSize: 15,
    color: '#ef4444',
    fontFamily: Fonts.LeagueSpartanBold,
  },
  modalConfirmBtn: {
    flex: 1,
    backgroundColor: '#ea580c',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#ea580c',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  modalConfirmText: {
    fontSize: 15,
    color: '#fff',
    fontFamily: Fonts.LeagueSpartanBold,
  },
});

export default NewOrderListScreen;
