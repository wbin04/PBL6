import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Modal, ScrollView, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, useNavigation, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { shipperApi, ordersApi } from '../services/api';
import { Fonts } from '../constants/Fonts';

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
  total_money: string;
  order_status: string;
  delivery_status: string;
  receiver_name: string;
  phone_number: string;
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

      fetchOrdersData(selectedStatus === 'all' ? undefined : selectedStatus);

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
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.loadingFullScreen}>
          <ActivityIndicator size="large" color="#ea580c" />
          <Text style={styles.loadingFullScreenText}>Đang tải dữ liệu...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Header component
  const renderHeader = () => (
    <View style={styles.headerContainer}>
      {/* Shipper Info Card */}
      <View style={styles.card}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {shipper.fullname?.[0]?.toUpperCase() || 'S'}
          </Text>
        </View>
        <Text style={styles.shipperName}>{shipper.fullname}</Text>
        <View style={styles.infoRow}>
          <Ionicons name="call-outline" size={14} color="#6b7280" />
          <Text style={styles.shipperPhone}>{shipper.phone}</Text>
        </View>
        <View style={styles.infoRow}>
          <Ionicons name="mail-outline" size={14} color="#6b7280" />
          <Text style={styles.shipperEmail}>{shipper.email}</Text>
        </View>
        <View style={styles.infoRow}>
          <Ionicons name="location-outline" size={14} color="#6b7280" />
          <Text style={styles.shipperAddress} numberOfLines={2}>{shipper.address}</Text>
        </View>
      </View>

      {/* Orders Summary */}
      {ordersData && (
        <View style={styles.summaryCard}>
          <Text style={styles.sectionTitle}>Tổng quan đơn hàng</Text>
          <View style={styles.summaryGrid}>
            <View style={styles.summaryItem}>
              <View style={[styles.summaryIconContainer, { backgroundColor: '#dbeafe' }]}>
                <Ionicons name="document-text-outline" size={24} color="#3b82f6" />
              </View>
              <Text style={styles.summaryNumber}>{ordersData.total_orders}</Text>
              <Text style={styles.summaryLabel}>Tổng đơn</Text>
            </View>
            <View style={styles.summaryItem}>
              <View style={[styles.summaryIconContainer, { backgroundColor: '#d1fae5' }]}>
                <Ionicons name="checkmark-circle-outline" size={24} color="#10b981" />
              </View>
              <Text style={styles.summaryNumber}>
                {ordersData.status_counts['Đã giao'] || 0}
              </Text>
              <Text style={styles.summaryLabel}>Đã giao</Text>
            </View>
            <View style={styles.summaryItem}>
              <View style={[styles.summaryIconContainer, { backgroundColor: '#fef3c7' }]}>
                <Ionicons name="bicycle-outline" size={24} color="#f59e0b" />
              </View>
              <Text style={styles.summaryNumber}>
                {ordersData.status_counts['Đang giao'] || 0}
              </Text>
              <Text style={styles.summaryLabel}>Đang giao</Text>
            </View>
          </View>
        </View>
      )}

      {/* Status Filter */}
      <View style={styles.filterCard}>
        <Text style={styles.sectionTitle}>Lọc theo trạng thái</Text>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterScrollContent}
        >
          {Object.entries(statusDisplayNames).map(([status, displayName]) => (
            <TouchableOpacity
              key={status}
              style={[
                styles.filterPill,
                selectedStatus === status && styles.filterPillActive
              ]}
              onPress={() => handleStatusChange(status)}
              activeOpacity={0.7}
            >
              <Text style={[
                styles.filterPillText,
                selectedStatus === status && styles.filterPillTextActive
              ]}>
                {displayName}
              </Text>
              {ordersData && status !== 'all' && (
                <View style={[
                  styles.filterBadge,
                  selectedStatus === status && styles.filterBadgeActive
                ]}>
                  <Text style={[
                    styles.filterBadgeText,
                    selectedStatus === status && styles.filterBadgeTextActive
                  ]}>
                    {ordersData.status_counts[status] || 0}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <Text style={styles.ordersTitle}>Danh sách đơn hàng</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={24} color="#1f2937" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Chi tiết Shipper</Text>
          <View style={styles.placeholder} />
        </View>

        {error ? (
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle-outline" size={64} color="#ef4444" />
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity 
              style={styles.retryButton}
              onPress={() => fetchOrdersData(selectedStatus === 'all' ? undefined : selectedStatus)}
              activeOpacity={0.8}
            >
              <Ionicons name="refresh-outline" size={18} color="#fff" />
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
                style={styles.orderCard}
                onPress={() => handleOrderPress(item)}
                activeOpacity={0.9}
              >
                <View style={styles.orderHeader}>
                  <View style={styles.orderIdContainer}>
                    <Ionicons name="receipt-outline" size={18} color="#ea580c" />
                    <Text style={styles.orderTitle}>#{item.id}</Text>
                  </View>
                  <View style={[
                    styles.statusBadge,
                    { backgroundColor: getStatusColor(item.delivery_status) }
                  ]}>
                    <Text style={styles.statusText}>{item.delivery_status}</Text>
                  </View>
                </View>
                
                <View style={styles.orderInfoRow}>
                  <Ionicons name="person-outline" size={16} color="#6b7280" />
                  <Text style={styles.orderInfo}>{item.receiver_name}</Text>
                </View>
                <View style={styles.orderInfoRow}>
                  <Ionicons name="call-outline" size={16} color="#6b7280" />
                  <Text style={styles.orderInfo}>{item.phone_number}</Text>
                </View>
                <View style={styles.orderInfoRow}>
                  <Ionicons name="location-outline" size={16} color="#6b7280" />
                  <Text style={styles.orderInfo} numberOfLines={2}>{item.ship_address}</Text>
                </View>
                <View style={styles.orderFooter}>
                  <View style={styles.orderInfoRow}>
                    <Ionicons name="cash-outline" size={16} color="#10b981" />
                    <Text style={styles.orderPrice}>{formatCurrency(item.total_money)}</Text>
                  </View>
                  <Text style={styles.orderDate}>{formatDate(item.created_date)}</Text>
                </View>
                
                <View style={styles.tapIndicator}>
                  <Text style={styles.tapIndicatorText}>Xem chi tiết</Text>
                  <Ionicons name="chevron-forward" size={16} color="#9ca3af" />
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
                <View style={styles.emptyContainer}>
                  <Ionicons name="document-outline" size={64} color="#d1d5db" />
                  <Text style={styles.emptyText}>
                    {selectedStatus === 'all' 
                      ? 'Shipper này chưa có đơn hàng nào' 
                      : `Không có đơn hàng "${statusDisplayNames[selectedStatus]}"`
                    }
                  </Text>
                </View>
              )
            }
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            refreshing={loading}
            onRefresh={() => fetchOrdersData(selectedStatus === 'all' ? undefined : selectedStatus)}
          />
        )}
      </View>

      {/* Order Detail Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={orderDetailModalVisible}
        onRequestClose={closeOrderDetailModal}
      >
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView 
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
            style={styles.modalKeyboardView}
          >
            <View style={styles.modalContainer}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Chi tiết đơn hàng</Text>
                <TouchableOpacity 
                  style={styles.modalCloseButton} 
                  onPress={closeOrderDetailModal}
                  activeOpacity={0.7}
                >
                  <Ionicons name="close" size={24} color="#6b7280" />
                </TouchableOpacity>
              </View>
              
              <ScrollView 
                style={styles.modalContent}
                showsVerticalScrollIndicator={false}
              >
                {selectedOrder && (
                  <>
                    {/* Order Info Section */}
                    <View style={styles.modalSection}>
                      <Text style={styles.modalSectionTitle}>Thông tin đơn hàng</Text>
                      <View style={styles.modalInfoCard}>
                        <View style={styles.modalInfoRow}>
                          <Text style={styles.modalLabel}>Mã đơn:</Text>
                          <Text style={styles.modalValue}>#{selectedOrder.id}</Text>
                        </View>
                        <View style={styles.modalInfoRow}>
                          <Text style={styles.modalLabel}>Khách hàng:</Text>
                          <Text style={styles.modalValue}>{selectedOrder.user?.fullname || selectedOrder.receiver_name || 'N/A'}</Text>
                        </View>
                        <View style={styles.modalInfoRow}>
                          <Text style={styles.modalLabel}>Số điện thoại:</Text>
                          <Text style={styles.modalValue}>{selectedOrder.phone_number}</Text>
                        </View>
                        <View style={styles.modalInfoRow}>
                          <Text style={styles.modalLabel}>Cửa hàng:</Text>
                          <Text style={styles.modalValue}>{selectedOrder.store_name || 'N/A'}</Text>
                        </View>
                        <View style={styles.modalInfoRow}>
                          <Text style={styles.modalLabel}>Địa chỉ:</Text>
                          <Text style={[styles.modalValue, styles.modalValueMultiline]}>{selectedOrder.ship_address}</Text>
                        </View>
                        <View style={styles.modalInfoRow}>
                          <Text style={styles.modalLabel}>Thời gian:</Text>
                          <Text style={styles.modalValue}>{formatDate(selectedOrder.created_date)}</Text>
                        </View>
                        <View style={styles.modalInfoRow}>
                          <Text style={styles.modalLabel}>Trạng thái:</Text>
                          <View style={[
                            styles.modalStatusBadge,
                            { backgroundColor: getStatusColor(selectedOrder.order_status || selectedOrder.delivery_status) }
                          ]}>
                            <Text style={styles.modalStatusText}>
                              {selectedOrder.order_status || selectedOrder.delivery_status}
                            </Text>
                          </View>
                        </View>
                        {selectedOrder.note && (
                          <View style={styles.modalInfoRow}>
                            <Text style={styles.modalLabel}>Ghi chú:</Text>
                            <Text style={[styles.modalValue, styles.modalValueMultiline]}>{selectedOrder.note}</Text>
                          </View>
                        )}
                      </View>
                    </View>

                    {/* Food Items Section */}
                    <View style={styles.modalSection}>
                      <Text style={styles.modalSectionTitle}>Món ăn đã đặt</Text>
                      <View style={styles.modalFoodCard}>
                        {selectedOrder.items && selectedOrder.items.length > 0 ? (
                          <>
                            {selectedOrder.items.map((item: any, idx: number) => (
                              <View key={idx} style={styles.modalFoodItem}>
                                <View style={styles.modalFoodInfo}>
                                  <Text style={styles.modalFoodName}>{item.food?.title || 'Món ăn'}</Text>
                                  {item.food_option && (
                                    <Text style={styles.modalFoodSize}>Size: {item.food_option.size_name}</Text>
                                  )}
                                  {item.food_note && (
                                    <Text style={styles.modalFoodNote}>Ghi chú: {item.food_note}</Text>
                                  )}
                                </View>
                                <Text style={styles.modalFoodQuantity}>x{item.quantity}</Text>
                                <Text style={styles.modalFoodPrice}>{formatPrice(item.subtotal)}</Text>
                              </View>
                            ))}
                            <View style={styles.modalTotal}>
                              <Text style={styles.modalTotalLabel}>Tổng cộng:</Text>
                              <Text style={styles.modalTotalValue}>{formatPrice(selectedOrder.total_money)}</Text>
                            </View>
                          </>
                        ) : (
                          <Text style={styles.modalNoData}>Không có thông tin món ăn</Text>
                        )}
                      </View>
                    </View>

                    {/* Cancel Reason Section */}
                    {selectedOrder.cancel_reason && (
                      <View style={styles.modalSection}>
                        <Text style={styles.modalSectionTitle}>Lý do hủy</Text>
                        <View style={styles.modalCancelCard}>
                          <Text style={styles.modalCancelReason}>{selectedOrder.cancel_reason}</Text>
                        </View>
                      </View>
                    )}

                    {/* Action Buttons */}
                    {(selectedOrder.order_status !== 'Đã giao' && selectedOrder.order_status !== 'Đã huỷ' && 
                      selectedOrder.delivery_status !== 'Đã giao' && selectedOrder.delivery_status !== 'Đã huỷ') && (
                      <View style={styles.modalActions}>
                        {(selectedOrder.order_status === 'Chờ xác nhận' || selectedOrder.delivery_status === 'Chờ xác nhận') && (
                          <TouchableOpacity
                            style={styles.modalActionButton}
                            onPress={() => updateOrderStatus(selectedOrder.id, 'Đã xác nhận')}
                            disabled={loading}
                            activeOpacity={0.8}
                          >
                            <Ionicons name="checkmark-circle-outline" size={18} color="#fff" />
                            <Text style={styles.modalActionButtonText}>Xác nhận</Text>
                          </TouchableOpacity>
                        )}
                        {(selectedOrder.order_status === 'Đã xác nhận' || selectedOrder.delivery_status === 'Đã xác nhận') && (
                          <TouchableOpacity
                            style={styles.modalActionButton}
                            onPress={() => updateOrderStatus(selectedOrder.id, 'Đang chuẩn bị')}
                            disabled={loading}
                            activeOpacity={0.8}
                          >
                            <Ionicons name="restaurant-outline" size={18} color="#fff" />
                            <Text style={styles.modalActionButtonText}>Chuẩn bị</Text>
                          </TouchableOpacity>
                        )}
                        {(selectedOrder.order_status === 'Đang chuẩn bị' || selectedOrder.delivery_status === 'Đang chuẩn bị') && (
                          <TouchableOpacity
                            style={styles.modalActionButton}
                            onPress={() => updateOrderStatus(selectedOrder.id, 'Sẵn sàng')}
                            disabled={loading}
                            activeOpacity={0.8}
                          >
                            <Ionicons name="cube-outline" size={18} color="#fff" />
                            <Text style={styles.modalActionButtonText}>Sẵn sàng</Text>
                          </TouchableOpacity>
                        )}
                        {((selectedOrder.order_status === 'Sẵn sàng' || selectedOrder.order_status === 'Đã lấy hàng') ||
                          (selectedOrder.delivery_status === 'Sẵn sàng' || selectedOrder.delivery_status === 'Đã lấy hàng')) && (
                          <TouchableOpacity
                            style={styles.modalActionButton}
                            onPress={() => updateOrderStatus(selectedOrder.id, 'Đang giao')}
                            disabled={loading}
                            activeOpacity={0.8}
                          >
                            <Ionicons name="bicycle-outline" size={18} color="#fff" />
                            <Text style={styles.modalActionButtonText}>Giao hàng</Text>
                          </TouchableOpacity>
                        )}
                        {(selectedOrder.order_status === 'Đang giao' || selectedOrder.delivery_status === 'Đang giao') && (
                          <TouchableOpacity
                            style={styles.modalActionButton}
                            onPress={() => updateOrderStatus(selectedOrder.id, 'Đã giao')}
                            disabled={loading}
                            activeOpacity={0.8}
                          >
                            <Ionicons name="checkmark-done-outline" size={18} color="#fff" />
                            <Text style={styles.modalActionButtonText}>Đã giao</Text>
                          </TouchableOpacity>
                        )}
                        
                        <TouchableOpacity
                          style={styles.modalCancelButton}
                          onPress={() => updateOrderStatus(selectedOrder.id, 'Đã huỷ', 'Hủy từ quản lý shipper')}
                          disabled={loading}
                          activeOpacity={0.8}
                        >
                          <Ionicons name="close-circle-outline" size={18} color="#fff" />
                          <Text style={styles.modalCancelButtonText}>Hủy đơn</Text>
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
};

const styles = StyleSheet.create({
  safeArea: { 
    flex: 1, 
    backgroundColor: '#ffffff',
  },
  container: { 
    flex: 1, 
    backgroundColor: '#ffffff',
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    backgroundColor: '#ffffff',
  },
  backButton: {
    padding: 8,
    borderRadius: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: Fonts.LeagueSpartanBold,
    color: '#1f2937',
  },
  placeholder: {
    width: 40,
  },

  // Header Container
  headerContainer: {
    paddingBottom: 0,
  },

  // Shipper Card
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 20,
    marginHorizontal: 0,
    marginTop: 0,
    marginBottom: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  avatar: { 
    width: 80, 
    height: 80, 
    borderRadius: 40, 
    backgroundColor: '#ea580c', 
    alignItems: 'center', 
    justifyContent: 'center', 
    marginBottom: 12,
    borderWidth: 4,
    borderColor: '#fff',
    shadowColor: '#ea580c',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  avatarText: { 
    color: '#fff', 
    fontFamily: Fonts.LeagueSpartanBold, 
    fontSize: 32,
  },
  shipperName: { 
    fontSize: 20, 
    fontFamily: Fonts.LeagueSpartanBold, 
    color: '#1f2937', 
    marginBottom: 8,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  shipperPhone: { 
    fontSize: 14, 
    color: '#6b7280', 
    fontFamily: Fonts.LeagueSpartanRegular,
  },
  shipperEmail: { 
    fontSize: 14, 
    color: '#6b7280', 
    fontFamily: Fonts.LeagueSpartanRegular,
  },
  shipperAddress: { 
    fontSize: 14, 
    color: '#6b7280', 
    fontFamily: Fonts.LeagueSpartanRegular,
    textAlign: 'center',
    flex: 1,
  },
  
  // Summary Card
  summaryCard: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 20,
    marginHorizontal: 0,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  summaryGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  summaryItem: {
    alignItems: 'center',
  },
  summaryIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  summaryNumber: {
    fontSize: 20,
    fontFamily: Fonts.LeagueSpartanBold,
    color: '#1f2937',
    marginBottom: 4,
  },
  summaryLabel: {
    fontSize: 13,
    color: '#6b7280',
    fontFamily: Fonts.LeagueSpartanRegular,
  },
  
  // Filter Card
  filterCard: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 16,
    marginHorizontal: 0,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  filterScrollContent: {
    gap: 8,
  },
  filterPill: {
    backgroundColor: '#f3f4f6',
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  filterPillActive: {
    backgroundColor: '#ea580c',
    borderColor: '#ea580c',
  },
  filterPillText: {
    fontSize: 13,
    color: '#6b7280',
    fontFamily: Fonts.LeagueSpartanMedium,
  },
  filterPillTextActive: {
    color: '#fff',
    fontFamily: Fonts.LeagueSpartanSemiBold,
  },
  filterBadge: {
    backgroundColor: '#e5e7eb',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    minWidth: 20,
    alignItems: 'center',
  },
  filterBadgeActive: {
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  filterBadgeText: {
    fontSize: 11,
    color: '#6b7280',
    fontFamily: Fonts.LeagueSpartanBold,
  },
  filterBadgeTextActive: {
    color: '#fff',
  },
  
  sectionTitle: {
    fontFamily: Fonts.LeagueSpartanBold,
    fontSize: 16,
    color: '#1f2937',
    marginBottom: 12,
  },

  ordersTitle: {
    fontFamily: Fonts.LeagueSpartanBold,
    fontSize: 16,
    color: '#1f2937',
    marginHorizontal: 0,
    marginTop: 8,
    marginBottom: 12,
  },

  // List Content
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 16,
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
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  orderIdContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  orderTitle: {
    fontSize: 16,
    fontFamily: Fonts.LeagueSpartanBold,
    color: '#1f2937',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 11,
    color: '#fff',
    fontFamily: Fonts.LeagueSpartanBold,
  },
  orderInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  orderInfo: {
    fontSize: 14,
    color: '#374151',
    fontFamily: Fonts.LeagueSpartanRegular,
    flex: 1,
  },
  orderFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  orderPrice: {
    fontSize: 15,
    fontFamily: Fonts.LeagueSpartanBold,
    color: '#10b981',
  },
  orderDate: {
    fontSize: 12,
    color: '#9ca3af',
    fontFamily: Fonts.LeagueSpartanRegular,
  },
  
  // Tap Indicator
  tapIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  tapIndicatorText: {
    fontSize: 12,
    color: '#9ca3af',
    marginRight: 4,
    fontFamily: Fonts.LeagueSpartanRegular,
  },
  
  // States
  loadingFullScreen: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingFullScreenText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6b7280',
    fontFamily: Fonts.LeagueSpartanRegular,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6b7280',
    fontFamily: Fonts.LeagueSpartanRegular,
  },
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
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 2,
  },
  retryButtonText: {
    fontSize: 14,
    color: '#fff',
    fontFamily: Fonts.LeagueSpartanSemiBold,
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

  // Modal Styles
  modalOverlay: { 
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)', 
    justifyContent: 'flex-end',
  },
  modalKeyboardView: { 
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalContainer: { 
    backgroundColor: '#ffffff', 
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    shadowColor: '#000', 
    shadowOffset: { width: 0, height: -2 }, 
    shadowOpacity: 0.1, 
    shadowRadius: 8, 
    elevation: 5,
  },
  
  // Modal Header
  modalHeader: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1, 
    borderBottomColor: '#f3f4f6',
  },
  modalTitle: { 
    fontSize: 18, 
    fontFamily: Fonts.LeagueSpartanBold, 
    color: '#1f2937',
  },
  modalCloseButton: { 
    padding: 4, 
    backgroundColor: '#f3f4f6', 
    borderRadius: 8,
  },
  
  // Modal Content
  modalContent: { 
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  modalSection: { 
    marginTop: 20,
  },
  modalSectionTitle: { 
    fontSize: 15, 
    fontFamily: Fonts.LeagueSpartanBold, 
    color: '#1f2937', 
    marginBottom: 12,
  },
  modalInfoCard: {
    backgroundColor: '#f9fafb',
    borderRadius: 16,
    padding: 16,
  },
  modalInfoRow: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    paddingVertical: 8,
    borderBottomWidth: 1, 
    borderBottomColor: '#f3f4f6',
  },
  modalLabel: { 
    fontSize: 14, 
    fontFamily: Fonts.LeagueSpartanMedium, 
    color: '#6b7280',
  },
  modalValue: { 
    fontSize: 14, 
    fontFamily: Fonts.LeagueSpartanRegular, 
    color: '#1f2937', 
    textAlign: 'right',
    flex: 1,
    marginLeft: 12,
  },
  modalValueMultiline: {
    textAlign: 'left',
  },
  modalStatusBadge: { 
    paddingHorizontal: 10, 
    paddingVertical: 4, 
    borderRadius: 12,
  },
  modalStatusText: { 
    fontSize: 12, 
    fontFamily: Fonts.LeagueSpartanBold, 
    color: '#fff',
  },
  
  // Food Items
  modalFoodCard: {
    backgroundColor: '#f9fafb',
    borderRadius: 16,
    padding: 16,
  },
  modalFoodItem: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    paddingVertical: 12,
    borderBottomWidth: 1, 
    borderBottomColor: '#f3f4f6',
  },
  modalFoodInfo: {
    flex: 1,
  },
  modalFoodName: { 
    fontSize: 14, 
    fontFamily: Fonts.LeagueSpartanMedium, 
    color: '#1f2937',
  },
  modalFoodSize: { 
    fontSize: 12, 
    color: '#6b7280', 
    fontFamily: Fonts.LeagueSpartanRegular,
    marginTop: 2,
  },
  modalFoodNote: {
    fontSize: 12,
    color: '#6b7280',
    fontFamily: Fonts.LeagueSpartanRegular,
    fontStyle: 'italic',
    marginTop: 2,
  },
  modalFoodQuantity: { 
    fontSize: 14, 
    fontFamily: Fonts.LeagueSpartanMedium, 
    color: '#6b7280', 
    marginHorizontal: 12,
  },
  modalFoodPrice: { 
    fontSize: 14, 
    fontFamily: Fonts.LeagueSpartanBold, 
    color: '#1f2937',
  },
  modalTotal: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    paddingTop: 16,
    marginTop: 8,
    borderTopWidth: 2, 
    borderTopColor: '#e5e7eb',
  },
  modalTotalLabel: { 
    fontSize: 16, 
    fontFamily: Fonts.LeagueSpartanBold, 
    color: '#1f2937',
  },
  modalTotalValue: { 
    fontSize: 18, 
    fontFamily: Fonts.LeagueSpartanBold, 
    color: '#ea580c',
  },
  modalNoData: {
    fontSize: 14,
    color: '#9ca3af',
    fontFamily: Fonts.LeagueSpartanRegular,
    textAlign: 'center',
    paddingVertical: 20,
  },

  // Cancel Reason
  modalCancelCard: {
    backgroundColor: '#fef2f2',
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#ef4444',
  },
  modalCancelReason: {
    fontSize: 14,
    color: '#991b1b',
    fontFamily: Fonts.LeagueSpartanRegular,
  },
  
  // Modal Actions
  modalActions: { 
    paddingVertical: 20,
    gap: 12,
  },
  modalActionButton: { 
    backgroundColor: '#10b981', 
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 2,
  },
  modalActionButtonText: { 
    fontSize: 15, 
    fontFamily: Fonts.LeagueSpartanSemiBold, 
    color: '#fff',
  },
  modalCancelButton: { 
    backgroundColor: '#ef4444', 
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
    shadowColor: '#ef4444',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 2,
  },
  modalCancelButtonText: { 
    fontSize: 15, 
    fontFamily: Fonts.LeagueSpartanSemiBold, 
    color: '#fff',
  },
});

export default ShipperDetailScreen;
