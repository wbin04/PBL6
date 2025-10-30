import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Modal, KeyboardAvoidingView, Platform, StyleSheet, Image, ActivityIndicator, RefreshControl, Alert, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { IMAGE_MAP } from '../assets/imageMap';
import { X } from 'lucide-react-native';
import { Fonts } from '../constants/Fonts';
import { ordersApi, apiClient } from '@/services/api';
import { API_CONFIG } from "@/constants";
import * as SecureStore from 'expo-secure-store';
import { STORAGE_KEYS } from '@/constants';

const getStatusColor = (status: string) => {
  switch (status) {
    case 'Đang giao': return '#f59e0b';
    case 'Đã giao': return '#10b981';
    case 'Chờ xác nhận': return '#3b82f6';
    case 'Đã xác nhận': return '#8b5cf6';
    case 'Đang chuẩn bị': return '#f97316';
    case 'Sẵn sàng': return '#06b6d4';
    case 'Đã lấy hàng': return '#84cc16';
    case 'Đã huỷ': return '#ef4444';
    case 'Đã huỷ': return '#ef4444';
    default: return '#6b7280';
  }
};

// Format price display
const formatPrice = (price: any) => {
  if (typeof price === 'number') {
    return `${price.toLocaleString('vi-VN')}₫`;
  }
  if (typeof price === 'string') {
    const numPrice = parseFloat(price);
    if (!isNaN(numPrice)) {
      return `${numPrice.toLocaleString('vi-VN')}₫`;
    }
  }
  return price || '0₫';
};

// Function to create image source URL
const getImageSource = (imageValue: any) => {
  if (!imageValue) {
    return require('../assets/images/placeholder.png');
  }

  // If image is already a full URL
  if (typeof imageValue === 'string' && imageValue.startsWith('http')) {
    return { uri: imageValue };
  }

  // If it's a string path from API
  if (typeof imageValue === 'string') {
    // Check if it's an IMAGE_MAP key first (for backward compatibility)
    if (IMAGE_MAP[imageValue]) {
      return IMAGE_MAP[imageValue];
    }

    // Otherwise, construct full URL from media path
    const baseUrl = API_CONFIG.BASE_URL.replace("/api", ""); // Remove /api from base URL
    const fullUrl = `${baseUrl}/media/${imageValue}`;
    return { uri: fullUrl };
  }

  // If it's already an object (local require) or number
  return imageValue;
};


const statusTabs = [
  { key: 'all', label: 'Tất cả' },
  { key: 'Chờ xác nhận', label: 'Chờ xác nhận' },
  { key: 'Đã xác nhận', label: 'Đã xác nhận' },
  { key: 'Đang chuẩn bị', label: 'Đang chuẩn bị' },
  { key: 'Sẵn sàng', label: 'Sẵn sàng' },
  { key: 'Đã lấy hàng', label: 'Đã lấy hàng' },
  { key: 'Đang giao', label: 'Đang giao' },
  { key: 'Đã giao', label: 'Đã giao' },
  { key: 'Đã huỷ', label: 'Đã huỷ' },
];



export default function OrderListScreen() {
  const [orders, setOrders] = useState<any[]>([]);
  const [orderFilter, setOrderFilter] = useState('Tất cả');
  const [orderDetailModalVisible, setOrderDetailModalVisible] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [statusCounts, setStatusCounts] = useState<Record<string, number>>({});
  const scrollViewRef = useRef<ScrollView>(null);
  const fadeAnim = useRef(new Animated.Value(1)).current;

  // Get current user info
  const getCurrentUser = useCallback(async () => {
    try {
      const userStr = await SecureStore.getItemAsync(STORAGE_KEYS.USER);
      if (userStr) {
        const user = JSON.parse(userStr);
        setCurrentUser(user);
        console.log('Current user:', user);
        console.log('User role:', user.role);
      }
    } catch (error) {
      console.error('Error getting current user:', error);
    }
  }, []);

  // Check if current user is manager (role = "Quản lý")
  const isManager = currentUser?.role === 'Quản lý';

  console.log('=== Role Check ===');
  console.log('Current user role:', currentUser?.role);
  console.log('Is manager:', isManager);
  console.log('==================');

  // Fetch orders from API with pagination
  const fetchOrders = useCallback(async (showLoading = true) => {
    try {
      if (showLoading) {
        setLoading(true);
      }
      setError(null);

      console.log('=== Fetching Orders ===');
      console.log('Current filter:', orderFilter);

      // Fetch all orders from all pages
      let allOrders: any[] = [];
      let currentPage = 1;
      let totalPages = 1;

      do {
        const params: any = {
          page: currentPage,
          per_page: 20 // Increase per_page to reduce API calls
        };

        console.log(`Fetching page ${currentPage}...`);
        const response = await ordersApi.admin.getOrders(params) as any;
        console.log(`Page ${currentPage} response:`, response);
        console.log(`Page ${currentPage} orders array:`, response.orders);
        console.log(`Page ${currentPage} total_pages:`, response.total_pages);

        if (response.orders && Array.isArray(response.orders)) {
          allOrders = [...allOrders, ...response.orders];
          totalPages = response.total_pages || 1;
          console.log(`Page ${currentPage}: got ${response.orders.length} orders, total pages: ${totalPages}`);
        } else if (Array.isArray(response)) {
          allOrders = [...allOrders, ...response];
          break; // No pagination info, assume single page
        } else {
          console.log(`No orders in page ${currentPage}`);
          break;
        }

        currentPage++;
      } while (currentPage <= totalPages);

      console.log('=== Final Results ===');
      console.log('Total orders loaded:', allOrders.length);

      // Store ALL orders
      setOrders(allOrders);

      // Calculate status counts from ALL orders
      const counts: Record<string, number> = { all: allOrders.length };
      allOrders.forEach((order: any) => {
        const status = order.order_status;
        counts[status] = (counts[status] || 0) + 1;
      });
      setStatusCounts(counts);
      console.log('Status counts calculated:', counts);

    } catch (error: any) {
      console.error('Error fetching orders:', error);
      setError(error.message || 'Không thể tải danh sách đơn hàng');
      setOrders([]);
    } finally {
      setLoading(false);
      if (refreshing) {
        setRefreshing(false);
      }
    }
  }, [refreshing]); // Remove orderFilter dependency

  // Filter orders for display based on selected tab
  const getStatusKeyForFilter = (filter: string): string => {
    switch (filter) {
      case 'Đang chờ': return 'Chờ xác nhận';
      case 'Đã xác nhận': return 'confirmed';
      case 'Đang chuẩn bị': return 'preparing';
      case 'Sẵn sàng': return 'ready';
      case 'Đang giao': return 'delivering';
      case 'Đã hoàn thành': return 'Đã giao';
      case 'Đã huỷ': return 'Đã huỷ';
      default: return '';
    }
  };

  const getFilteredOrders = () => {
    console.log('=== Filtering Orders ===');
    console.log('Current filter:', orderFilter);
    console.log('Total orders available:', orders.length);

    if (orderFilter === 'Tất cả') {
      console.log('Showing all orders:', orders.length);
      return orders;
    }

    const statusKey = getStatusKeyForFilter(orderFilter);
    console.log('Status key for filter:', statusKey);

    const filtered = orders.filter(order => {
      console.log(`Order ${order.id}: status="${order.order_status}" vs filter="${statusKey}"`);
      return order.order_status === statusKey;
    });

    console.log('Filtered orders count:', filtered.length);
    console.log('======================');
    return filtered;
  };

  // Get filtered orders for display
  const filteredOrdersForDisplay = getFilteredOrders();

  // Load user and orders when component mounts or filter changes
  useEffect(() => {
    getCurrentUser();
  }, [getCurrentUser]);

  useEffect(() => {
    if (currentUser) {
      fetchOrders();
    }
  }, [fetchOrders, currentUser]);

  // Refresh handler
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchOrders(false);
  }, [fetchOrders]);

  const openOrderDetailModal = async (order: any) => {
    try {
      setLoading(true);
      console.log('Fetching order detail for ID:', order.id);

      // Fetch detailed order data
      const detailedOrder = await ordersApi.admin.getOrder(order.id) as any;
      console.log('Detailed order:', detailedOrder);

      setSelectedOrder(detailedOrder);
      setOrderDetailModalVisible(true);
    } catch (error: any) {
      console.error('Error fetching order detail:', error);
      Alert.alert('Lỗi', 'Không thể tải chi tiết đơn hàng');
    } finally {
      setLoading(false);
    }
  };

  const closeOrderDetailModal = () => {
    setOrderDetailModalVisible(false);
    setSelectedOrder(null);
  };

  const updateOrderStatus = async (orderId: number, newStatus: string, cancelReason?: string) => {
    try {
      setLoading(true);
      console.log('Updating order status:', { orderId, newStatus, cancelReason, isManager });

      // For managers, only allow cancellation
      if (isManager && newStatus !== 'Đã huỷ') {
        Alert.alert(
          'Hạn chế quyền hạn',
          'Quản lý chỉ có thể hủy đơn hàng. Việc thay đổi trạng thái đơn hàng khác thuộc về cửa hàng.',
          [{ text: 'OK' }]
        );
        return;
      }

      const data: any = { order_status: newStatus };
      if (cancelReason) {
        data.cancel_reason = cancelReason;
      }

      // For managers cancelling orders, the backend will automatically set cancelled_by_role to "Quản lý"
      const updatedOrder = await ordersApi.admin.updateOrderStatus(orderId, data) as any;
      console.log('Order status updated:', updatedOrder);

      // Update orders list
      setOrders(prevOrders =>
        prevOrders.map(order =>
          order.id === orderId ? { ...order, order_status: newStatus, cancel_reason: cancelReason } : order
        )
      );

      // Update selected order if it's the same
      if (selectedOrder && selectedOrder.id === orderId) {
        setSelectedOrder({ ...selectedOrder, order_status: newStatus, cancel_reason: cancelReason });
      }

      const message = newStatus === 'Đã huỷ' ? 'Đã hủy đơn hàng' : 'Đã cập nhật trạng thái đơn hàng';
      Alert.alert('Thành công', message);

    } catch (error: any) {
      console.error('Error updating order status:', error);
      Alert.alert('Lỗi', 'Không thể cập nhật trạng thái đơn hàng');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filterTabsContainer}
          contentContainerStyle={styles.filterTabs}
        >
          {statusTabs.map((tab, index) => {
            const count = statusCounts[tab.key] || 0;
            const isActive = orderFilter === tab.key;

            return (
              <TouchableOpacity
                key={tab.key}
                style={[
                  styles.filterTab,
                  isActive && styles.filterTabActive,
                  { transform: [{ scale: isActive ? 1.05 : 1 }] }
                ]}
                onPress={() => {
                  // Animate content fade out and in
                  Animated.sequence([
                    Animated.timing(fadeAnim, {
                      toValue: 0.7,
                      duration: 150,
                      useNativeDriver: true,
                    }),
                    Animated.timing(fadeAnim, {
                      toValue: 1,
                      duration: 200,
                      useNativeDriver: true,
                    }),
                  ]).start();

                  setOrderFilter(tab.key);
                }}
                activeOpacity={0.7}
              >
                <Text style={[styles.filterTabText, isActive && styles.filterTabTextActive]}>
                  {tab.label}{count > 0 && ` (${count})`}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
        <ScrollView
          style={styles.scrollView}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={['#ea580c']}
              tintColor="#ea580c"
            />
          }
        >
          {loading && !refreshing ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#ea580c" />
              <Text style={styles.loadingText}>Đang tải đơn hàng...</Text>
            </View>
          ) : error ? (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
              <TouchableOpacity style={styles.retryButton} onPress={() => fetchOrders()}>
                <Text style={styles.retryButtonText}>Thử lại</Text>
              </TouchableOpacity>
            </View>
          ) : filteredOrdersForDisplay.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>
                {orderFilter === 'Tất cả' ? 'Chưa có đơn hàng nào' : `Không có đơn hàng ${orderFilter}`}
              </Text>
            </View>
          ) : (
            <Animated.View style={{ opacity: fadeAnim }}>
              {filteredOrdersForDisplay.map((order, idx) => (
                <TouchableOpacity
                  key={order.id}
                  style={styles.orderCard}
                  activeOpacity={0.9}
                  onPress={() => openOrderDetailModal(order)}
                  disabled={loading}
                >
                  <View style={styles.orderCardHeader}>
                    <Image
                      source={getImageSource(order.store_image)}
                      style={styles.orderImage}
                      onError={() => console.log('Order image load error:', order.id)}
                    />
                    <View style={styles.orderCardInfo}>
                      <Text style={styles.orderCardId}>#{order.id}</Text>
                      <Text style={styles.orderCardCustomer}>{order.user?.fullname || 'Khách hàng'}</Text>
                      <Text style={styles.orderCardPhone}>📞 {order.phone_number || 'Chưa có SĐT'}</Text>
                      <Text style={styles.orderCardAddress} numberOfLines={2}>
                        📍 {order.ship_address || 'Chưa có địa chỉ'}
                      </Text>
                      <Text style={styles.orderCardStore} numberOfLines={1}>
                        🏪 {order.store_name || 'Chưa xác định cửa hàng'}
                      </Text>
                      <Text style={styles.orderCardItems} numberOfLines={1}>
                        {order.items?.map((item: any) =>
                          `${item.food?.title}${item.food_option ? ` (${item.food_option.size_name})` : ''} x${item.quantity}`
                        ).join(', ') || 'Đang tải món ăn...'}
                      </Text>
                    </View>
                    <View style={styles.orderActions}>
                      {order.order_status !== 'Đã giao' && order.order_status !== 'Đã huỷ' && (
                        <TouchableOpacity
                          style={styles.cancelOrderButton}
                          onPress={(e) => {
                            e.stopPropagation();
                            updateOrderStatus(order.id, 'Đã huỷ', isManager ? 'Hủy bởi quản lý' : 'Hủy bởi cửa hàng');
                          }}
                          disabled={loading}
                        >
                          <X size={16} color="#ef4444" />
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                  <View style={styles.orderCardFooter}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.orderCardPriceLabel}>Tạm tính:</Text>
                      <Text style={styles.orderCardPrice}>{formatPrice(order.total_money || 0)}</Text>
                      {(order.shipping_fee || order.ship_fee) && (
                        <>
                          <Text style={styles.orderCardPriceLabel}>Phí vận chuyển:</Text>
                          <Text style={styles.orderCardPrice}>{formatPrice(order.shipping_fee || order.ship_fee || 0)}</Text>
                        </>
                      )}
                      {(order.promo_discount || order.total_discount) && (
                        <>
                          <Text style={styles.orderCardPriceLabel}>Giảm giá:</Text>
                          <Text style={[styles.orderCardPrice, { color: '#10b981' }]}>-{formatPrice(order.promo_discount || order.total_discount || 0)}</Text>
                        </>
                      )}
                      <View style={styles.orderCardTotalRow}>
                        <Text style={styles.orderCardTotalLabel}>Tổng cộng:</Text>
                        <Text style={styles.orderCardTotal}>
                          {formatPrice(
                            order.total_after_discount || 
                            (parseFloat(order.total_money || 0) + 
                             parseFloat(order.shipping_fee || order.ship_fee || 0) - 
                             parseFloat(order.promo_discount || order.total_discount || 0))
                          )}
                        </Text>
                      </View>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: getStatusColor(order.order_status) }]}>
                      <Text style={styles.statusText}>{order.order_status}</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </Animated.View>
          )}
        </ScrollView>
      </View>

      <Modal
        animationType="slide"
        transparent={true}
        visible={orderDetailModalVisible}
        onRequestClose={closeOrderDetailModal}
      >
        <View style={styles.overlay}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.keyboardAvoidingView}>
            <View style={styles.orderDetailModal}>
              <View style={styles.orderDetailHeader}>
                <Text style={styles.orderDetailTitle}>Chi tiết đơn hàng</Text>
                <TouchableOpacity style={styles.closeButton} onPress={closeOrderDetailModal}>
                  <X size={24} color="#6b7280" />
                </TouchableOpacity>
              </View>
              <ScrollView style={styles.orderDetailContent}>
                {selectedOrder && (
                  <>
                    <View style={styles.orderDetailSection}>
                      <Text style={styles.orderDetailSectionTitle}>Thông tin đơn hàng</Text>
                      <View style={styles.orderDetailItem}>
                        <Text style={styles.orderDetailLabel}>Mã đơn hàng:</Text>
                        <Text style={styles.orderDetailValue}>#{selectedOrder.id}</Text>
                      </View>
                      <View style={styles.orderDetailItem}>
                        <Text style={styles.orderDetailLabel}>Khách hàng:</Text>
                        <Text style={styles.orderDetailValue}>{selectedOrder.user?.fullname || 'Khách hàng'}</Text>
                      </View>
                      <View style={styles.orderDetailItem}>
                        <Text style={styles.orderDetailLabel}>Số điện thoại:</Text>
                        <Text style={styles.orderDetailValue}>{selectedOrder.phone_number}</Text>
                      </View>
                      <View style={styles.orderDetailItem}>
                        <Text style={styles.orderDetailLabel}>Cửa hàng:</Text>
                        <Text style={styles.orderDetailValue}>{selectedOrder.store_name || 'Chưa xác định'}</Text>
                      </View>
                      <View style={styles.orderDetailItem}>
                        <Text style={styles.orderDetailLabel}>Địa chỉ giao:</Text>
                        <Text style={styles.orderDetailValue}>{selectedOrder.ship_address}</Text>
                      </View>
                      <View style={styles.orderDetailItem}>
                        <Text style={styles.orderDetailLabel}>Thời gian đặt:</Text>
                        <Text style={styles.orderDetailValue}>{selectedOrder.created_date || 'Chưa xác định'}</Text>
                      </View>
                      <View style={styles.orderDetailItem}>
                        <Text style={styles.orderDetailLabel}>Trạng thái:</Text>
                        <View style={[styles.orderDetailStatusBadge, { backgroundColor: getStatusColor(selectedOrder.order_status) }]}>
                          <Text style={styles.orderDetailStatusText}>{selectedOrder.order_status}</Text>
                        </View>
                      </View>
                      {selectedOrder.note && (
                        <View style={styles.orderDetailItem}>
                          <Text style={styles.orderDetailLabel}>Ghi chú:</Text>
                          <Text style={styles.orderDetailValue}>{selectedOrder.note}</Text>
                        </View>
                      )}
                    </View>

                    <View style={styles.orderDetailSection}>
                      <Text style={styles.orderDetailSectionTitle}>Món ăn đã đặt</Text>
                      {selectedOrder.items?.map((item: any, idx: number) => (
                        <View key={idx} style={styles.orderDetailFoodItem}>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.orderDetailFoodName}>{item.food?.title || 'Món ăn'}</Text>
                            {item.food_option && (
                              <Text style={styles.orderDetailFoodSize}>Size: {item.food_option.size_name}</Text>
                            )}
                            {item.food_note && (
                              <Text style={styles.orderDetailFoodSize}>Ghi chú: {item.food_note}</Text>
                            )}
                          </View>
                          <Text style={styles.orderDetailFoodQuantity}>x{item.quantity}</Text>
                          <Text style={styles.orderDetailFoodPrice}>{formatPrice(item.subtotal)}</Text>
                        </View>
                      ))}
                      
                      <View style={styles.orderDetailPriceBreakdown}>
                        <View style={styles.orderDetailPriceRow}>
                          <Text style={styles.orderDetailPriceLabel}>Tạm tính:</Text>
                          <Text style={styles.orderDetailPriceValue}>{formatPrice(selectedOrder.total_money || 0)}</Text>
                        </View>
                        
                        {(selectedOrder.shipping_fee || selectedOrder.ship_fee) && (
                          <View style={styles.orderDetailPriceRow}>
                            <Text style={styles.orderDetailPriceLabel}>Phí vận chuyển:</Text>
                            <Text style={styles.orderDetailPriceValue}>{formatPrice(selectedOrder.shipping_fee || selectedOrder.ship_fee || 0)}</Text>
                          </View>
                        )}
                        
                        {(selectedOrder.promo_discount || selectedOrder.total_discount) && (
                          <View style={styles.orderDetailPriceRow}>
                            <Text style={styles.orderDetailPriceLabel}>Giảm giá:</Text>
                            <Text style={[styles.orderDetailPriceValue, { color: '#10b981' }]}>-{formatPrice(selectedOrder.promo_discount || selectedOrder.total_discount || 0)}</Text>
                          </View>
                        )}
                        
                        <View style={styles.orderDetailTotal}>
                          <Text style={styles.orderDetailTotalLabel}>Tổng cộng:</Text>
                          <Text style={styles.orderDetailTotalValue}>
                            {formatPrice(
                              selectedOrder.total_after_discount || 
                              (parseFloat(selectedOrder.total_money || 0) + 
                               parseFloat(selectedOrder.shipping_fee || selectedOrder.ship_fee || 0) - 
                               parseFloat(selectedOrder.promo_discount || selectedOrder.total_discount || 0))
                            )}
                          </Text>
                        </View>
                      </View>
                    </View>

                    {selectedOrder.cancel_reason && (
                      <View style={styles.orderDetailSection}>
                        <Text style={styles.orderDetailSectionTitle}>Lý do hủy</Text>
                        <Text style={styles.orderDetailValue}>{selectedOrder.cancel_reason}</Text>
                      </View>
                    )}

                    {selectedOrder.order_status !== 'Đã giao' && selectedOrder.order_status !== 'Đã huỷ' && (
                      <View style={styles.orderDetailActions}>
                        {/* Only show status transition buttons for store managers, not for general managers */}
                        {!isManager && (
                          <>
                            {selectedOrder.order_status === 'Chờ xác nhận' && (
                              <TouchableOpacity
                                style={styles.confirmOrderButton}
                                onPress={() => updateOrderStatus(selectedOrder.id, 'Đã xác nhận')}
                                disabled={loading}
                              >
                                <Text style={styles.confirmOrderButtonText}>Xác nhận</Text>
                              </TouchableOpacity>
                            )}
                            {selectedOrder.order_status === 'Đã xác nhận' && (
                              <TouchableOpacity
                                style={styles.confirmOrderButton}
                                onPress={() => updateOrderStatus(selectedOrder.id, 'Đang chuẩn bị')}
                                disabled={loading}
                              >
                                <Text style={styles.confirmOrderButtonText}>Chuẩn bị</Text>
                              </TouchableOpacity>
                            )}
                            {selectedOrder.order_status === 'Đang chuẩn bị' && (
                              <TouchableOpacity
                                style={styles.confirmOrderButton}
                                onPress={() => updateOrderStatus(selectedOrder.id, 'Sẵn sàng')}
                                disabled={loading}
                              >
                                <Text style={styles.confirmOrderButtonText}>Sẵn sàng</Text>
                              </TouchableOpacity>
                            )}
                            {(selectedOrder.order_status === 'Sẵn sàng' || selectedOrder.order_status === 'Đã lấy hàng') && (
                              <TouchableOpacity
                                style={styles.confirmOrderButton}
                                onPress={() => updateOrderStatus(selectedOrder.id, 'Đang giao')}
                                disabled={loading}
                              >
                                <Text style={styles.confirmOrderButtonText}>Giao hàng</Text>
                              </TouchableOpacity>
                            )}
                            {selectedOrder.order_status === 'Đang giao' && (
                              <TouchableOpacity
                                style={styles.confirmOrderButton}
                                onPress={() => updateOrderStatus(selectedOrder.id, 'Đã giao')}
                                disabled={loading}
                              >
                                <Text style={styles.confirmOrderButtonText}>Đã giao</Text>
                              </TouchableOpacity>
                            )}
                          </>
                        )}
                        {/* Cancel button - available for both managers and store managers */}
                        <TouchableOpacity
                          style={styles.cancelOrderDetailButton}
                          onPress={() => updateOrderStatus(selectedOrder.id, 'Đã huỷ', isManager ? 'Hủy bởi quản lý' : 'Hủy bởi cửa hàng')}
                          disabled={loading}
                        >
                          <Text style={styles.cancelOrderDetailButtonText}>Hủy</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </>
                )}
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#fff7ed', paddingTop: 12 },
  container: { flex: 1, backgroundColor: '#fff7ed' },

  // Filter Tabs
  // Filter Tabs
  filterTabsContainer: {
    marginVertical: 8,
    backgroundColor: '#fff', // Đổi từ '#ccc' thành màu nền chính
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    maxHeight: 60, // Giới hạn chiều cao
  },
  filterTabs: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    paddingVertical: 8,
    flexWrap: 'nowrap', // Không cho wrap xuống dòng
  },
  filterTab: {
    paddingHorizontal: 10, // Giảm từ 12 xuống 10
    paddingVertical: 6,
    backgroundColor: '#f8fafc',
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
    flexShrink: 1, // Đổi từ 0 thành 1 để cho phép co lại
    minWidth: 70, // Giảm minWidth
    height: 36, // Cố định chiều cao cho tất cả tabs
  },
  filterTabActive: {
    backgroundColor: '#ea580c',
    borderColor: '#c2410c',
    shadowColor: '#ea580c',
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 4,
    transform: [{ scale: 1.02 }],
  },
  filterTabText: {
    fontSize: 13,
    color: '#64748b',
    fontFamily: Fonts.LeagueSpartanMedium,
    textAlign: 'center',
    lineHeight: 16,
    fontWeight: '600',
  },
  filterTabTextActive: {
    fontSize: 13,
    color: '#fff',
    fontFamily: Fonts.LeagueSpartanBold,
    fontWeight: '700',
  },

  scrollView: { flex: 1, paddingHorizontal: 16, backgroundColor: '#fff7ed' },

  // Order Card
  orderCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  orderCardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12
  },
  orderImage: {
    width: 60,
    height: 60,
    borderRadius: 10,
    marginRight: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  orderCardInfo: { flex: 1, paddingRight: 8 },
  orderCardId: {
    fontSize: 16,
    fontFamily: Fonts.LeagueSpartanBold,
    color: '#ea580c',
    marginBottom: 4,
  },
  orderCardCustomer: {
    fontSize: 16,
    fontFamily: Fonts.LeagueSpartanSemiBold,
    color: '#1f2937',
    marginBottom: 6,
  },
  orderCardPhone: {
    fontSize: 14,
    color: '#059669',
    fontFamily: Fonts.LeagueSpartanMedium,
    marginBottom: 4,
  },
  orderCardAddress: {
    fontSize: 13,
    color: '#6b7280',
    fontFamily: Fonts.LeagueSpartanRegular,
    lineHeight: 18,
    marginBottom: 6,
  },
  orderCardItems: {
    fontSize: 12,
    color: '#9ca3af',
    fontFamily: Fonts.LeagueSpartanRegular,
    fontStyle: 'italic',
  },
  orderCardStore: {
    fontSize: 12,
    color: '#059669',
    fontFamily: Fonts.LeagueSpartanMedium,
    marginBottom: 4
  },
  orderCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  orderCardPriceLabel: {
    fontSize: 13,
    fontFamily: Fonts.LeagueSpartanMedium,
    color: '#6b7280',
    marginBottom: 4,
  },
  orderCardPrice: {
    fontSize: 14,
    fontFamily: Fonts.LeagueSpartanSemiBold,
    color: '#1f2937',
    marginBottom: 8,
  },
  orderCardTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  orderCardTotalLabel: {
    fontSize: 15,
    fontFamily: Fonts.LeagueSpartanBold,
    color: '#1f2937',
  },
  orderCardTotal: {
    fontSize: 18,
    fontFamily: Fonts.LeagueSpartanBold,
    color: '#dc2626',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  statusText: {
    fontSize: 12,
    color: '#fff',
    fontFamily: Fonts.LeagueSpartanBold,
    fontWeight: '600',
  },
  orderActions: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'flex-start',
    marginLeft: 8,
  },
  cancelOrderButton: {
    padding: 8,
    backgroundColor: '#fef2f2',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#fecaca',
    shadowColor: '#ef4444',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },

  // Modal
  overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1, justifyContent: 'center', alignItems: 'center' },
  keyboardAvoidingView: { flex: 1, justifyContent: 'center', alignItems: 'center', width: '100%' },
  orderDetailModal: { backgroundColor: 'white', borderRadius: 16, height: '95%', width: '98%', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 8, elevation: 8 },

  // Modal Header
  orderDetailHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  orderDetailTitle: { fontSize: 20, fontFamily: Fonts.LeagueSpartanBold, color: '#1f2937' },
  closeButton: { padding: 4, backgroundColor: '#f3f4f6', borderRadius: 8 },

  // Modal Content
  orderDetailContent: { padding: 20 },
  orderDetailSection: { marginBottom: 24 },
  orderDetailSectionTitle: { fontSize: 16, fontFamily: Fonts.LeagueSpartanBold, color: '#1f2937', marginBottom: 12 },
  orderDetailItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#f9fafb' },
  orderDetailLabel: { fontSize: 14, fontFamily: Fonts.LeagueSpartanMedium, color: '#6b7280' },
  orderDetailValue: { fontSize: 14, fontFamily: Fonts.LeagueSpartanMedium, color: '#1f2937', flex: 1, textAlign: 'right' },
  orderDetailStatusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  orderDetailStatusText: { fontSize: 12, fontFamily: Fonts.LeagueSpartanBold, color: 'white' },

  // Food items
  orderDetailFoodItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f9fafb' },
  orderDetailFoodName: { fontSize: 14, fontFamily: Fonts.LeagueSpartanMedium, color: '#1f2937', flex: 1 },
  orderDetailFoodSize: { fontSize: 12, color: '#6b7280', fontFamily: Fonts.LeagueSpartanRegular, marginLeft: 8 },
  orderDetailFoodQuantity: { fontSize: 14, fontFamily: Fonts.LeagueSpartanMedium, color: '#6b7280', marginHorizontal: 12 },
  orderDetailFoodPrice: { fontSize: 14, fontFamily: Fonts.LeagueSpartanBold, color: '#1f2937' },
  
  // Price breakdown
  orderDetailPriceBreakdown: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 2,
    borderTopColor: '#f3f4f6',
  },
  orderDetailPriceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  orderDetailPriceLabel: {
    fontSize: 14,
    fontFamily: Fonts.LeagueSpartanMedium,
    color: '#6b7280',
  },
  orderDetailPriceValue: {
    fontSize: 14,
    fontFamily: Fonts.LeagueSpartanSemiBold,
    color: '#1f2937',
  },
  
  orderDetailTotal: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, marginTop: 8, borderTopWidth: 2, borderTopColor: '#e5e7eb' },
  orderDetailTotalLabel: { fontSize: 16, fontFamily: Fonts.LeagueSpartanBold, color: '#1f2937' },
  orderDetailTotalValue: { fontSize: 16, fontFamily: Fonts.LeagueSpartanBold, color: '#dc2626' },

  // Timeline
  timelineItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  timelineDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#10b981', marginRight: 12 },
  timelineContent: { flex: 1 },
  timelineTitle: { fontSize: 14, fontFamily: Fonts.LeagueSpartanBold, color: '#1f2937' },
  timelineTime: { fontSize: 12, fontFamily: Fonts.LeagueSpartanRegular, color: '#6b7280', marginTop: 2 },

  // Modal Actions
  orderDetailActions: { padding: 20, borderTopWidth: 1, borderTopColor: '#f3f4f6', gap: 12 },
  confirmOrderButton: { backgroundColor: '#10b981', paddingVertical: 12, borderRadius: 8, width: 100, alignSelf: 'center', alignItems: 'center' },
  confirmOrderButtonText: { fontSize: 16, fontFamily: Fonts.LeagueSpartanBold, color: 'white' },
  cancelOrderDetailButton: { backgroundColor: '#dc2626', paddingVertical: 12, borderRadius: 8, width: 100, alignSelf: 'center', alignItems: 'center' },
  cancelOrderDetailButtonText: { fontSize: 16, fontFamily: Fonts.LeagueSpartanBold, color: 'white' },

  // Loading states
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40
  },
  loadingText: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 12,
    fontFamily: Fonts.LeagueSpartanRegular
  },

  // Error states
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40
  },
  errorText: {
    fontSize: 14,
    color: '#ef4444',
    textAlign: 'center',
    marginBottom: 16,
    fontFamily: Fonts.LeagueSpartanRegular
  },
  retryButton: {
    backgroundColor: '#ea580c',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 8
  },
  retryButtonText: {
    fontSize: 14,
    color: '#fff',
    fontFamily: Fonts.LeagueSpartanMedium
  },

  // Empty states  
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40
  },
  emptyText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    fontFamily: Fonts.LeagueSpartanRegular
  },
});
