
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Modal, ScrollView, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { useRoute, useNavigation, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { shipperApi, ordersApi } from '../services/api';

interface Shipper {
  id: number;
  user_id: number;
  fullname: string;
  phone: string;
  email: string;
  address: string;
}

interface Order {
  id: number;
  total_money: string; // Changed from total_amount
  order_status: string;
  delivery_status: string;
  receiver_name: string;
  phone_number: string; // Changed from receiver_phone
  ship_address: string;
  created_date: string;
  store_name?: string;
}

interface OrdersData {
  shipper: Shipper;
  status_counts: {
    [key: string]: number;
  };
  total_orders: number;
  orders: {
    count: number;
    results: Order[];
  };
}


const ShipperDetailScreen: React.FC = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const { shipper } = route.params as { shipper: Shipper };
  
  const [ordersData, setOrdersData] = useState<OrdersData | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [error, setError] = useState<string | null>(null);
  
  // Modal states
  const [orderDetailModalVisible, setOrderDetailModalVisible] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);

  // Status mapping for display
  const statusDisplayNames: { [key: string]: string } = {
    'all': 'Tất cả',
    'Chờ xác nhận': 'Chờ xác nhận',
    'Đã xác nhận': 'Đã xác nhận',
    'Đang giao': 'Đang giao',
    'Đã giao': 'Đã giao',
    'Đã hủy': 'Đã hủy',
  };

  // Fetch orders data
  const fetchOrdersData = async (status?: string) => {
    try {
      setLoading(true);
      setError(null);

      const params: any = { per_page: 100 };
      if (status && status !== 'all') {
        params.delivery_status = status;
      }

      const response = await shipperApi.getOrdersByShipper(shipper.id, params) as any;
      console.log('Orders API Response:', response);

      setOrdersData(response);
    } catch (error: any) {
      console.error('Error fetching orders:', error);
      setError(error.message || 'Không thể tải dữ liệu đơn hàng');
    } finally {
      setLoading(false);
    }
  };

  // Load data when component mounts
  useFocusEffect(
    React.useCallback(() => {
      fetchOrdersData(selectedStatus === 'all' ? undefined : selectedStatus);
    }, [shipper.id, selectedStatus])
  );

  // Handle status filter change
  const handleStatusChange = (status: string) => {
    setSelectedStatus(status);
  };

  // Format date display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('vi-VN') + ' ' + date.toLocaleTimeString('vi-VN', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  // Format currency
  const formatCurrency = (amount: string) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(parseFloat(amount));
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

  // Get status color
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

  // Handle order press - show modal
  const handleOrderPress = async (order: Order) => {
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

  // Close modal
  const closeOrderDetailModal = () => {
    setOrderDetailModalVisible(false);
    setSelectedOrder(null);
  };

  // Update order status
  const updateOrderStatus = async (orderId: number, newStatus: string, cancelReason?: string) => {
    try {
      setLoading(true);
      console.log('Updating order status:', { orderId, newStatus, cancelReason });

      const data: any = { order_status: newStatus };
      if (cancelReason) {
        data.cancel_reason = cancelReason;
      }

      const updatedOrder = await ordersApi.admin.updateOrderStatus(orderId, data) as any;
      console.log('Order status updated:', updatedOrder);

      // Refresh orders data
      fetchOrdersData(selectedStatus === 'all' ? undefined : selectedStatus);

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

  if (!ordersData && loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#ea580c" />
        <Text style={{ marginTop: 10, color: '#6b7280' }}>Đang tải dữ liệu...</Text>
      </View>
    );
  }

  // Header component
  const renderHeader = () => (
    <>
      <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
        <Text style={styles.backIcon}>{'←'}</Text>
      </TouchableOpacity>
      
      {/* Shipper Info Card */}
      <View style={styles.card}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {shipper.fullname?.[0]?.toUpperCase() || 'S'}
          </Text>
        </View>
        <Text style={styles.shipperName}>{shipper.fullname}</Text>
        <Text style={styles.shipperPhone}>SĐT: {shipper.phone}</Text>
        <Text style={styles.shipperEmail}>Email: {shipper.email}</Text>
        <Text style={styles.shipperAddress}>Địa chỉ: {shipper.address}</Text>
      </View>

      {/* Orders Summary */}
      {ordersData && (
        <View style={styles.summarySection}>
          <Text style={styles.sectionTitle}>Tổng quan đơn hàng</Text>
          <View style={styles.summaryGrid}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryNumber}>{ordersData.total_orders}</Text>
              <Text style={styles.summaryLabel}>Tổng đơn</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryNumber}>
                {ordersData.status_counts['Đã giao'] || 0}
              </Text>
              <Text style={styles.summaryLabel}>Đã giao</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryNumber}>
                {ordersData.status_counts['Đang giao'] || 0}
              </Text>
              <Text style={styles.summaryLabel}>Đang giao</Text>
            </View>
          </View>
        </View>
      )}

      {/* Status Filter */}
      <View style={styles.filterSection}>
        <Text style={styles.sectionTitle}>Lọc theo trạng thái</Text>
        <View style={styles.filterButtons}>
          {Object.entries(statusDisplayNames).map(([status, displayName]) => (
            <TouchableOpacity
              key={status}
              style={[
                styles.filterButton,
                selectedStatus === status && styles.filterButtonActive
              ]}
              onPress={() => handleStatusChange(status)}
            >
              <Text style={[
                styles.filterButtonText,
                selectedStatus === status && styles.filterButtonTextActive
              ]}>
                {displayName}
                {ordersData && status !== 'all' && (
                  <Text style={styles.filterCount}>
                    {' '}({ordersData.status_counts[status] || 0})
                  </Text>
                )}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </>
  );

  return (
    <View style={styles.safeArea}>
      {error ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity 
            style={styles.retryButton}
            onPress={() => fetchOrdersData(selectedStatus === 'all' ? undefined : selectedStatus)}
          >
            <Text style={styles.retryButtonText}>Thử lại</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={ordersData?.orders.results || []}
          keyExtractor={item => item.id.toString()}
          ListHeaderComponent={renderHeader}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.orderItem}
              onPress={() => handleOrderPress(item)}
              activeOpacity={0.7}
            >
              <View style={styles.orderHeader}>
                <Text style={styles.orderTitle}>
                  Đơn hàng #{item.id}
                </Text>
                <View style={[
                  styles.statusBadge,
                  { backgroundColor: getStatusColor(item.delivery_status) }
                ]}>
                  <Text style={styles.statusText}>{item.delivery_status}</Text>
                </View>
              </View>
              
              <Text style={styles.orderInfo}>
                Khách hàng: {item.receiver_name}
              </Text>
              <Text style={styles.orderInfo}>
                SĐT: {item.phone_number}
              </Text>
              <Text style={styles.orderInfo}>
                Địa chỉ: {item.ship_address}
              </Text>
              <Text style={styles.orderInfo}>
                Tổng tiền: {formatCurrency(item.total_money)}
              </Text>
              <Text style={styles.orderDate}>
                Ngày tạo: {formatDate(item.created_date)}
              </Text>
              
              {/* Visual indicator */}
              <View style={styles.tapIndicator}>
                <Text style={styles.tapIndicatorText}>Nhấn để xem chi tiết</Text>
                <Ionicons name="chevron-forward" size={16} color="#6b7280" />
              </View>
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator color="#ea580c" />
                <Text style={styles.loadingText}>Đang tải...</Text>
              </View>
            ) : (
              <Text style={styles.emptyText}>
                {selectedStatus === 'all' 
                  ? 'Shipper này chưa có đơn hàng nào' 
                  : `Không có đơn hàng nào ở trạng thái "${statusDisplayNames[selectedStatus]}"`
                }
              </Text>
            )
          }
          contentContainerStyle={{ padding: 18, paddingBottom: 0 }}
          refreshing={loading}
          onRefresh={() => fetchOrdersData(selectedStatus === 'all' ? undefined : selectedStatus)}
        />
      )}

      {/* Order Detail Modal */}
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
                  <Ionicons name="close" size={24} color="#6b7280" />
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
                        <Text style={styles.orderDetailValue}>{selectedOrder.user?.fullname || selectedOrder.receiver_name || 'Khách hàng'}</Text>
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
                        <Text style={styles.orderDetailValue}>{formatDate(selectedOrder.created_date || selectedOrder.created_date_display)}</Text>
                      </View>
                      <View style={styles.orderDetailItem}>
                        <Text style={styles.orderDetailLabel}>Trạng thái:</Text>
                        <View style={[styles.orderDetailStatusBadge, { backgroundColor: getStatusColor(selectedOrder.order_status || selectedOrder.delivery_status) }]}>
                          <Text style={styles.orderDetailStatusText}>{selectedOrder.order_status || selectedOrder.delivery_status}</Text>
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
                      {selectedOrder.items && selectedOrder.items.length > 0 ? (
                        <>
                          {selectedOrder.items.map((item: any, idx: number) => (
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
                        </>
                      ) : (
                        <Text style={styles.orderDetailValue}>Không có thông tin món ăn</Text>
                      )}
                      <View style={styles.orderDetailTotal}>
                        <Text style={styles.orderDetailTotalLabel}>Tổng cộng:</Text>
                        <Text style={styles.orderDetailTotalValue}>{formatPrice(selectedOrder.total_money)}</Text>
                      </View>
                    </View>

                    {selectedOrder.cancel_reason && (
                      <View style={styles.orderDetailSection}>
                        <Text style={styles.orderDetailSectionTitle}>Lý do hủy</Text>
                        <Text style={styles.orderDetailValue}>{selectedOrder.cancel_reason}</Text>
                      </View>
                    )}

                    {(selectedOrder.order_status !== 'Đã giao' && selectedOrder.order_status !== 'Đã huỷ' && 
                      selectedOrder.delivery_status !== 'Đã giao' && selectedOrder.delivery_status !== 'Đã huỷ') && (
                      <View style={styles.orderDetailActions}>
                        {/* Status transition buttons */}
                        {(selectedOrder.order_status === 'Chờ xác nhận' || selectedOrder.delivery_status === 'Chờ xác nhận') && (
                          <TouchableOpacity
                            style={styles.confirmOrderButton}
                            onPress={() => updateOrderStatus(selectedOrder.id, 'Đã xác nhận')}
                            disabled={loading}
                          >
                            <Text style={styles.confirmOrderButtonText}>Xác nhận</Text>
                          </TouchableOpacity>
                        )}
                        {(selectedOrder.order_status === 'Đã xác nhận' || selectedOrder.delivery_status === 'Đã xác nhận') && (
                          <TouchableOpacity
                            style={styles.confirmOrderButton}
                            onPress={() => updateOrderStatus(selectedOrder.id, 'Đang chuẩn bị')}
                            disabled={loading}
                          >
                            <Text style={styles.confirmOrderButtonText}>Chuẩn bị</Text>
                          </TouchableOpacity>
                        )}
                        {(selectedOrder.order_status === 'Đang chuẩn bị' || selectedOrder.delivery_status === 'Đang chuẩn bị') && (
                          <TouchableOpacity
                            style={styles.confirmOrderButton}
                            onPress={() => updateOrderStatus(selectedOrder.id, 'Sẵn sàng')}
                            disabled={loading}
                          >
                            <Text style={styles.confirmOrderButtonText}>Sẵn sàng</Text>
                          </TouchableOpacity>
                        )}
                        {((selectedOrder.order_status === 'Sẵn sàng' || selectedOrder.order_status === 'Đã lấy hàng') ||
                          (selectedOrder.delivery_status === 'Sẵn sàng' || selectedOrder.delivery_status === 'Đã lấy hàng')) && (
                          <TouchableOpacity
                            style={styles.confirmOrderButton}
                            onPress={() => updateOrderStatus(selectedOrder.id, 'Đang giao')}
                            disabled={loading}
                          >
                            <Text style={styles.confirmOrderButtonText}>Giao hàng</Text>
                          </TouchableOpacity>
                        )}
                        {(selectedOrder.order_status === 'Đang giao' || selectedOrder.delivery_status === 'Đang giao') && (
                          <TouchableOpacity
                            style={styles.confirmOrderButton}
                            onPress={() => updateOrderStatus(selectedOrder.id, 'Đã giao')}
                            disabled={loading}
                          >
                            <Text style={styles.confirmOrderButtonText}>Đã giao</Text>
                          </TouchableOpacity>
                        )}
                        
                        {/* Cancel button */}
                        <TouchableOpacity
                          style={styles.cancelOrderDetailButton}
                          onPress={() => updateOrderStatus(selectedOrder.id, 'Đã huỷ', 'Hủy từ quản lý shipper')}
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
    </View>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f8fafc' },
  backBtn: {
    position: 'absolute',
    top: 38,
    left: 16,
    zIndex: 10,
    backgroundColor: 'rgba(255,255,255,0.85)',
    borderRadius: 20,
    padding: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 2,
  },
  backIcon: {
    fontSize: 22,
    color: '#ea580c',
    fontWeight: 'bold',
  },
  container: { flex: 1, padding: 18 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 18,
    alignItems: 'center',
    marginBottom: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  avatar: { 
    width: 80, 
    height: 80, 
    borderRadius: 40, 
    backgroundColor: '#ea580c', 
    alignItems: 'center', 
    justifyContent: 'center', 
    marginBottom: 10 
  },
  avatarText: { color: '#fff', fontWeight: 'bold', fontSize: 24 },
  shipperName: { fontSize: 22, fontWeight: 'bold', color: '#1f2937', marginBottom: 4 },
  shipperPhone: { fontSize: 15, color: '#6b7280', marginBottom: 2 },
  shipperEmail: { fontSize: 15, color: '#6b7280', marginBottom: 2 },
  shipperAddress: { fontSize: 15, color: '#6b7280', marginBottom: 2, textAlign: 'center' },
  
  // Summary section
  summarySection: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.07,
    shadowRadius: 6,
    elevation: 2,
  },
  summaryGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  summaryItem: {
    alignItems: 'center',
  },
  summaryNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ea580c',
    marginBottom: 4,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#6b7280',
  },
  
  // Filter section
  filterSection: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.07,
    shadowRadius: 6,
    elevation: 2,
  },
  filterButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterButton: {
    backgroundColor: '#f3f4f6',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginBottom: 8,
  },
  filterButtonActive: {
    backgroundColor: '#ea580c',
  },
  filterButtonText: {
    fontSize: 13,
    color: '#6b7280',
    fontWeight: '500',
  },
  filterButtonTextActive: {
    color: '#fff',
  },
  filterCount: {
    fontSize: 12,
    opacity: 0.8,
  },
  
  sectionTitle: {
    fontWeight: 'bold',
    fontSize: 16,
    color: '#1f2937',
    marginBottom: 12,
  },
  
  // Order items
  orderItem: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  orderTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    color: '#fff',
    fontWeight: 'bold',
  },
  orderInfo: {
    fontSize: 14,
    color: '#374151',
    marginBottom: 4,
  },
  orderDate: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 8,
  },
  
  // Tap indicator
  tapIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  tapIndicatorText: {
    fontSize: 12,
    color: '#6b7280',
    marginRight: 4,
  },
  
  // States
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  loadingText: {
    marginTop: 8,
    color: '#6b7280',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    color: '#ef4444',
    textAlign: 'center',
    marginBottom: 16,
    fontSize: 16,
  },
  retryButton: {
    backgroundColor: '#ea580c',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  emptyText: {
    color: '#6b7280',
    fontStyle: 'italic',
    textAlign: 'center',
    marginVertical: 20,
    fontSize: 16,
  },

  // Modal styles
  overlay: { 
    position: 'absolute', 
    top: 0, 
    left: 0, 
    right: 0, 
    bottom: 0, 
    backgroundColor: 'rgba(0,0,0,0.5)', 
    zIndex: 1, 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  keyboardAvoidingView: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center', 
    width: '100%' 
  },
  orderDetailModal: { 
    backgroundColor: 'white', 
    borderRadius: 16, 
    height: '95%', 
    width: '98%', 
    shadowColor: '#000', 
    shadowOffset: { width: 0, height: 4 }, 
    shadowOpacity: 0.25, 
    shadowRadius: 8, 
    elevation: 8 
  },
  
  // Modal Header
  orderDetailHeader: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    padding: 20, 
    borderBottomWidth: 1, 
    borderBottomColor: '#f3f4f6' 
  },
  orderDetailTitle: { 
    fontSize: 20, 
    fontWeight: 'bold', 
    color: '#1f2937' 
  },
  closeButton: { 
    padding: 4, 
    backgroundColor: '#f3f4f6', 
    borderRadius: 8 
  },
  
  // Modal Content
  orderDetailContent: { 
    padding: 20 
  },
  orderDetailSection: { 
    marginBottom: 24 
  },
  orderDetailSectionTitle: { 
    fontSize: 16, 
    fontWeight: 'bold', 
    color: '#1f2937', 
    marginBottom: 12 
  },
  orderDetailItem: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    paddingVertical: 8, 
    borderBottomWidth: 1, 
    borderBottomColor: '#f9fafb' 
  },
  orderDetailLabel: { 
    fontSize: 14, 
    fontWeight: '500', 
    color: '#6b7280' 
  },
  orderDetailValue: { 
    fontSize: 14, 
    fontWeight: '500', 
    color: '#1f2937', 
    flex: 1, 
    textAlign: 'right' 
  },
  orderDetailStatusBadge: { 
    paddingHorizontal: 8, 
    paddingVertical: 4, 
    borderRadius: 12 
  },
  orderDetailStatusText: { 
    fontSize: 12, 
    fontWeight: 'bold', 
    color: 'white' 
  },
  
  // Food items
  orderDetailFoodItem: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    paddingVertical: 12, 
    borderBottomWidth: 1, 
    borderBottomColor: '#f9fafb' 
  },
  orderDetailFoodName: { 
    fontSize: 14, 
    fontWeight: '500', 
    color: '#1f2937', 
    flex: 1 
  },
  orderDetailFoodSize: { 
    fontSize: 12, 
    color: '#6b7280', 
    marginLeft: 8 
  },
  orderDetailFoodQuantity: { 
    fontSize: 14, 
    fontWeight: '500', 
    color: '#6b7280', 
    marginHorizontal: 12 
  },
  orderDetailFoodPrice: { 
    fontSize: 14, 
    fontWeight: 'bold', 
    color: '#1f2937' 
  },
  orderDetailTotal: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    paddingVertical: 12, 
    marginTop: 8, 
    borderTopWidth: 2, 
    borderTopColor: '#e5e7eb' 
  },
  orderDetailTotalLabel: { 
    fontSize: 16, 
    fontWeight: 'bold', 
    color: '#1f2937' 
  },
  orderDetailTotalValue: { 
    fontSize: 16, 
    fontWeight: 'bold', 
    color: '#dc2626' 
  },
  
  // Modal Actions
  orderDetailActions: { 
    padding: 20, 
    borderTopWidth: 1, 
    borderTopColor: '#f3f4f6', 
    gap: 12 
  },
  confirmOrderButton: { 
    backgroundColor: '#10b981', 
    paddingVertical: 12, 
    borderRadius: 8, 
    width: 100, 
    alignSelf: 'center', 
    alignItems: 'center' 
  },
  confirmOrderButtonText: { 
    fontSize: 16, 
    fontWeight: 'bold', 
    color: 'white' 
  },
  cancelOrderDetailButton: { 
    backgroundColor: '#dc2626', 
    paddingVertical: 12, 
    borderRadius: 8, 
    width: 100, 
    alignSelf: 'center', 
    alignItems: 'center' 
  },
  cancelOrderDetailButtonText: { 
    fontSize: 16, 
    fontWeight: 'bold', 
    color: 'white' 
  },
});

export default ShipperDetailScreen;
