import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, TouchableOpacity, FlatList, ScrollView, Modal, KeyboardAvoidingView, Platform, StyleSheet, Image, ActivityIndicator, RefreshControl, Alert, Animated, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { IMAGE_MAP } from '../assets/imageMap';
import { X, ArrowLeft } from 'lucide-react-native';
import { Fonts } from '../constants/Fonts';
import { ordersApi, apiClient } from '@/services/api';
import { API_CONFIG } from "@/constants";
import * as SecureStore from 'expo-secure-store';
import { STORAGE_KEYS } from '@/constants';
import { Ionicons } from '@expo/vector-icons';

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

  if (typeof imageValue === 'string' && imageValue.startsWith('http')) {
    return { uri: imageValue };
  }

  if (typeof imageValue === 'string') {
    if (IMAGE_MAP[imageValue]) {
      return IMAGE_MAP[imageValue];
    }

    const baseUrl = API_CONFIG.BASE_URL.replace("/api", "");
    const fullUrl = `${baseUrl}/media/${imageValue}`;
    return { uri: fullUrl };
  }

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
  const [allOrders, setAllOrders] = useState<any[]>([]);
  const [orderFilter, setOrderFilter] = useState('all');
  const [orderDetailModalVisible, setOrderDetailModalVisible] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [statusCounts, setStatusCounts] = useState<Record<string, number>>({});
  const [localSearchText, setLocalSearchText] = useState('');

  const ITEMS_PER_LOAD = 10;
  const [displayCount, setDisplayCount] = useState(ITEMS_PER_LOAD);

  const getCurrentUser = useCallback(async () => {
    try {
      const userStr = await SecureStore.getItemAsync(STORAGE_KEYS.USER);
      if (userStr) {
        const user = JSON.parse(userStr);
        setCurrentUser(user);
      }
    } catch (error) {
      console.error('Error getting current user:', error);
    }
  }, []);

  const isManager = currentUser?.role === 'Quản lý';

  const fetchOrders = useCallback(async (showLoading = true) => {
    try {
      if (showLoading) {
        setLoading(true);
      }
      setError(null);

      let allOrdersData: any[] = [];
      let currentPage = 1;
      let totalPages = 1;

      do {
        const params: any = {
          page: currentPage,
          per_page: 20
        };

        if (localSearchText) {
          params.search = localSearchText;
        }

        const response = await ordersApi.admin.getOrders(params) as any;

        if (response.orders && Array.isArray(response.orders)) {
          allOrdersData = [...allOrdersData, ...response.orders];
          totalPages = response.total_pages || 1;
        } else if (Array.isArray(response)) {
          allOrdersData = [...allOrdersData, ...response];
          break;
        } else {
          break;
        }

        currentPage++;
      } while (currentPage <= totalPages);

      setAllOrders(allOrdersData);

      const counts: Record<string, number> = { all: allOrdersData.length };
      allOrdersData.forEach((order: any) => {
        const status = order.order_status;
        counts[status] = (counts[status] || 0) + 1;
      });
      setStatusCounts(counts);

    } catch (error: any) {
      console.error('Error fetching orders:', error);
      setError(error.message || 'Không thể tải danh sách đơn hàng');
      setAllOrders([]);
    } finally {
      setLoading(false);
      if (refreshing) {
        setRefreshing(false);
      }
    }
  }, [refreshing, localSearchText]);

  const getFilteredOrders = () => {
    if (orderFilter === 'all') {
      return allOrders;
    }

    return allOrders.filter(order => order.order_status === orderFilter);
  };

  const filteredOrdersForDisplay = getFilteredOrders();
  const displayedOrders = filteredOrdersForDisplay.slice(0, displayCount);

  useEffect(() => {
    const filtered = getFilteredOrders();
    setOrders(filtered);
  }, [allOrders, orderFilter]);

  useEffect(() => {
    getCurrentUser();
  }, [getCurrentUser]);

  useEffect(() => {
    if (currentUser) {
      fetchOrders();
    }
  }, [currentUser, fetchOrders]);

  useEffect(() => {
    setDisplayCount(ITEMS_PER_LOAD);
  }, [orderFilter]);

  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      if (currentUser) {
        fetchOrders();
      }
    }, 500);

    return () => clearTimeout(debounceTimer);
  }, [localSearchText, currentUser, fetchOrders]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setDisplayCount(ITEMS_PER_LOAD);
    fetchOrders(false);
  }, [fetchOrders]);

  const loadMore = useCallback(() => {
    if (loadingMore) return;

    const hasMore = displayCount < filteredOrdersForDisplay.length;
    if (hasMore) {
      setLoadingMore(true);

      setTimeout(() => {
        setDisplayCount(prev => prev + ITEMS_PER_LOAD);
        setLoadingMore(false);
      }, 300);
    }
  }, [displayCount, filteredOrdersForDisplay.length, loadingMore]);

  const openOrderDetailModal = async (order: any) => {
    try {
      setLoading(true);
      const detailedOrder = await ordersApi.admin.getOrder(order.id) as any;
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

      const updatedOrder = await ordersApi.admin.updateOrderStatus(orderId, data) as any;

      setOrders(prevOrders =>
        prevOrders.map(order =>
          order.id === orderId ? { ...order, order_status: newStatus, cancel_reason: cancelReason } : order
        )
      );

      setAllOrders(prevOrders =>
        prevOrders.map(order =>
          order.id === orderId ? { ...order, order_status: newStatus, cancel_reason: cancelReason } : order
        )
      );

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

  const renderOrderItem = ({ item: order }: { item: any }) => (
    <TouchableOpacity
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
        <Text style={styles.orderCardTotal}>{formatPrice(order.total_money)}</Text>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(order.order_status) }]}>
          <Text style={styles.statusText}>{order.order_status}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderFooter = () => {
    if (!loadingMore) return null;

    return (
      <View style={styles.loadingMoreContainer}>
        <ActivityIndicator size="small" color="#ea580c" />
        <Text style={styles.loadingMoreText}>Đang tải thêm...</Text>
      </View>
    );
  };

  const renderEmpty = () => {
    if (loading) return null;

    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="receipt-outline" size={64} color="#d1d5db" />
        <Text style={styles.emptyText}>
          {orderFilter === 'all' 
            ? (localSearchText ? 'Không tìm thấy đơn hàng' : 'Chưa có đơn hàng nào')
            : `Không có đơn hàng ${statusTabs.find(t => t.key === orderFilter)?.label}`
          }
        </Text>
      </View>
    );
  };

  const totalFound = filteredOrdersForDisplay.length;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.headerWrap}>
        <View style={styles.headerTopRow}>
          <TouchableOpacity
            style={styles.roundIconBtn}
          >
            <ArrowLeft size={18} color="#eb5523" />
          </TouchableOpacity>

          <Text style={styles.headerTitle}>Đơn hàng</Text>

          <View style={{ width: 40 }} />
        </View>

        <View style={styles.searchRow}>
          <View style={styles.searchBox}>
            <TextInput
              style={styles.searchInput}
              placeholder="Tìm theo mã đơn, khách hàng, SĐT..."
              placeholderTextColor="#9ca3af"
              value={localSearchText}
              onChangeText={setLocalSearchText}
              returnKeyType="search"
            />
            {localSearchText.length > 0 && (
              <TouchableOpacity
                onPress={() => setLocalSearchText('')}
                style={styles.clearBtn}
              >
                <Ionicons name="close-circle" size={16} color="#9ca3af" />
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={styles.searchBtn}
              activeOpacity={0.8}
            >
              <Ionicons name="search" size={16} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <View style={styles.tabs}>
        {statusTabs.map((tab) => {
          const isActive = orderFilter === tab.key;

          return (
            <TouchableOpacity
              key={tab.key}
              onPress={() => setOrderFilter(tab.key)}
              style={[styles.tab, isActive && styles.tabActive]}
            >
              <Text style={[styles.tabText, isActive && styles.tabTextActive]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={styles.foundWrap}>
        <Text style={styles.foundText}>
          Tìm thấy <Text style={styles.foundNum}>{totalFound}</Text> đơn hàng
        </Text>
      </View>

      {loading && displayedOrders.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#ea580c" />
          <Text style={styles.loadingText}>Đang tải đơn hàng...</Text>
        </View>
      ) : error ? (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={64} color="#ef4444" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => fetchOrders()}>
            <Ionicons name="refresh-outline" size={18} color="#fff" />
            <Text style={styles.retryButtonText}>Thử lại</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={displayedOrders}
          renderItem={renderOrderItem}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          onEndReached={loadMore}
          onEndReachedThreshold={0.3}
          ListFooterComponent={renderFooter}
          ListEmptyComponent={renderEmpty}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={['#ea580c']}
              tintColor="#ea580c"
            />
          }
          initialNumToRender={5}
          maxToRenderPerBatch={5}
          windowSize={5}
          removeClippedSubviews={true}
        />
      )}

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
  safeArea: {
    flex: 1,
    backgroundColor: '#ffffff',
  },

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
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
    paddingHorizontal: 16,
    paddingTop: 12,
    backgroundColor: '#fff',
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
  foundNum: {
    color: '#111827',
    fontFamily: Fonts.LeagueSpartanBold,
  },

  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },

  loadingMoreContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  loadingMoreText: {
    fontSize: 13,
    color: '#6b7280',
    fontFamily: Fonts.LeagueSpartanRegular,
  },

  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6b7280',
    fontFamily: Fonts.LeagueSpartanRegular,
    textAlign: 'center',
  },

  // Order Card
  orderCard: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
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
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  statusText: {
    fontSize: 11,
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
    paddingHorizontal: 32,
  },
  errorText: {
    fontSize: 14,
    color: '#ef4444',
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 20,
    fontFamily: Fonts.LeagueSpartanRegular,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#ea580c',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 999,
    shadowColor: '#ea580c',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  retryButtonText: {
    fontSize: 14,
    color: '#fff',
    fontFamily: Fonts.LeagueSpartanSemiBold
  },

});