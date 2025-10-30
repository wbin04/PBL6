import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Linking, Modal, Alert, RefreshControl } from 'react-native';
import { Search, Bell } from 'lucide-react-native';
import { ordersApi, apiClient } from '@/services/api';
import { Order, PaginatedResponse, ApiError } from '@/types';
import { ORDER_STATUS } from '@/constants';

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

const NewOrderListScreen = () => {
  const [activeTab, setActiveTab] = React.useState('all');
  const [orderList, setOrderList] = React.useState<OrderWithDisplayData[]>([]);
  const [selectedOrder, setSelectedOrder] = React.useState<null | OrderWithDisplayData>(null);
  const [modalVisible, setModalVisible] = React.useState(false);
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [storeId, setStoreId] = React.useState<number | null>(null);

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

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.headerRow}>

      </View>
      {/* Quản lý đơn hàng title + số lượng */}
      <View style={styles.sectionTitleRow}>
        <Text style={styles.sectionTitle}>Quản lý đơn hàng</Text>
        <Text style={styles.sectionCount}>{orderList.length} đơn hàng</Text>
      </View>
      {/* Tab bar */}
      <View style={{ height: 60 }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabBar}>
          <TouchableOpacity style={[styles.tab, activeTab === 'all' && styles.tabActive]} onPress={() => setActiveTab('all')}>
            <Text style={activeTab === 'all' ? styles.tabTextActive : styles.tabText}>Tất cả</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.tab, activeTab === 'pending' && styles.tabActive]} onPress={() => setActiveTab('pending')}>
            <Text style={activeTab === 'pending' ? styles.tabTextActive : styles.tabText}>Chờ xác nhận</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.tab, activeTab === 'preparing' && styles.tabActive]} onPress={() => setActiveTab('preparing')}>
            <Text style={activeTab === 'preparing' ? styles.tabTextActive : styles.tabText}>Đang chuẩn bị</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.tab, activeTab === 'ready' && styles.tabActive]} onPress={() => setActiveTab('ready')}>
            <Text style={activeTab === 'ready' ? styles.tabTextActive : styles.tabText}>Sẵn sàng</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.tab, activeTab === 'delivering' && styles.tabActive]} onPress={() => setActiveTab('delivering')}>
            <Text style={activeTab === 'delivering' ? styles.tabTextActive : styles.tabText}>Đang giao</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.tab, activeTab === 'completed' && styles.tabActive]} onPress={() => setActiveTab('completed')}>
            <Text style={activeTab === 'completed' ? styles.tabTextActive : styles.tabText}>Đã hoàn thành</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.tab, activeTab === 'rejected' && styles.tabActive]} onPress={() => setActiveTab('rejected')}>
            <Text style={activeTab === 'rejected' ? styles.tabTextActive : styles.tabText}>Đã hủy</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
      <ScrollView 
        contentContainerStyle={{ padding: 16 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {loading && !refreshing && (
          <View style={{ padding: 20, alignItems: 'center' }}>
            <Text style={{ color: '#6b7280' }}>Đang tải...</Text>
          </View>
        )}
        
        {error && (
          <View style={{ padding: 20, alignItems: 'center' }}>
            <Text style={{ color: '#ef4444', textAlign: 'center' }}>{error}</Text>
            <TouchableOpacity 
              style={{ marginTop: 10, padding: 10, backgroundColor: '#ea580c', borderRadius: 8 }}
              onPress={() => fetchOrders()}
            >
              <Text style={{ color: '#fff', fontWeight: 'bold' }}>Thử lại</Text>
            </TouchableOpacity>
          </View>
        )}
        {/* Hiển thị đơn hàng theo tab */}
        {orderList.filter(order => {
          if (activeTab === 'all') return true;
          if (activeTab === 'pending') return order.status === 'pending';
          if (activeTab === 'preparing') return order.status === 'preparing';
          if (activeTab === 'ready') return order.status === 'ready';
          if (activeTab === 'delivering') return order.status === 'delivering';
          if (activeTab === 'completed') return order.status === 'completed';
          if (activeTab === 'rejected') return order.status === 'rejected';
          return true;
        }).map((order, idx) => (
          <TouchableOpacity activeOpacity={0.9} onPress={() => {
            setSelectedOrder(order);
            setModalVisible(true);
          }} key={order.id}>
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <View style={styles.avatar}><Text style={{ fontSize: 22 }}>{idx === 0 ? '🧑‍🦱' : idx === 1 ? '👩' : '🧑'}</Text></View>
                  <View>
                    <Text style={styles.customer}>{order.customer}</Text>
                    <Text style={styles.phone}>{order.phone}</Text>
                  </View>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={styles.orderId}>{order.id}</Text>
                  <Text style={styles.orderTime}>{order.time}</Text>
                </View>
              </View>
              <Text style={styles.orderLabel}>Món đã order:</Text>
              {order.items.map((item, i) => (
                <View key={i}>
                  <View style={styles.itemRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.itemName}>{item.name}</Text>
                      {item.size_display && (
                        <Text style={{ color: '#6b7280', fontSize: 11, marginTop: 1 }}>
                          Size: {item.size_display}
                        </Text>
                      )}
                    </View>
                    <Text style={styles.itemQty}>x{item.qty}</Text>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={styles.itemPrice}>{item.price.toLocaleString()} đ</Text>
                      {item.food_option_price && item.food_option_price > 0 && (
                        <Text style={{ color: '#6b7280', fontSize: 10, marginTop: 1 }}>
                          +{item.food_option_price.toLocaleString()} đ
                        </Text>
                      )}
                    </View>
                  </View>
                  {item.food_note && item.food_note.trim() !== '' && (
                    <View style={{ marginLeft: 8, marginBottom: 2 }}>
                      <Text style={{ color: '#6b7280', fontSize: 11, fontStyle: 'italic' }}>
                        • {item.food_note}
                      </Text>
                    </View>
                  )}
                </View>
              ))}
              <View style={styles.totalRow}>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 2 }}>
                    <Text style={{ color: '#6b7280', fontSize: 13 }}>Tạm tính:</Text>
                    <Text style={{ color: '#1e293b', fontSize: 13 }}>{order.subtotal.toLocaleString()} đ</Text>
                  </View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 2 }}>
                    <Text style={{ color: '#6b7280', fontSize: 13 }}>Phí vận chuyển:</Text>
                    <Text style={{ color: '#1e293b', fontSize: 13 }}>{order.shipping_fee.toLocaleString()} đ</Text>
                  </View>
                  {order.promo_discount > 0 && (
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 2 }}>
                      <Text style={{ color: '#10b981', fontSize: 13 }}>Giảm giá:</Text>
                      <Text style={{ color: '#10b981', fontSize: 13, fontWeight: 'bold' }}>-{order.promo_discount.toLocaleString()} đ</Text>
                    </View>
                  )}
                  <View style={{ height: 1, backgroundColor: '#e5e7eb', marginVertical: 4 }} />
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={{ fontWeight: 'bold', fontSize: 15, color: '#1e293b' }}>Tổng cộng:</Text>
                    <Text style={{ color: '#ea580c', fontWeight: 'bold', fontSize: 16 }}>{order.total.toLocaleString()} đ</Text>
                  </View>
                </View>
              </View>
              <View style={[styles.totalRow, { marginTop: 8 }]}>
                <Text style={styles.payment}>{order.payment === 'COD' ? '💰 COD' : 'Online'}</Text>
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
                  <Text style={styles.callText}>Gọi</Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
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
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#f3f4f6', backgroundColor: '#fff7ed' }}>
                <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#1e293b' }}>Chi tiết đơn hàng</Text>
                <TouchableOpacity onPress={() => setModalVisible(false)}><Text style={{ fontSize: 22, color: '#ea580c' }}>×</Text></TouchableOpacity>
              </View>
              {/* Thông tin khách hàng */}
              <View style={{ flexDirection: 'row', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#f3f4f6', backgroundColor: '#fff' }}>
                <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: '#fffde7', alignItems: 'center', justifyContent: 'center', marginRight: 14 }}>
                  <Text style={{ fontSize: 32 }}>🧑</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontWeight: 'bold', fontSize: 16, color: '#1e293b' }}>{selectedOrder.customer}</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
                    <Text style={{ color: '#ea580c', fontWeight: 'bold', fontSize: 15 }}>{selectedOrder.phone}</Text>
                  </View>
                  <Text style={{ color: '#6b7280', fontSize: 13 }}>{selectedOrder.address}</Text>
                </View>
              </View>
              {/* Thông tin đơn hàng */}
              <View style={{ padding: 20, borderBottomWidth: 1, borderBottomColor: '#f3f4f6', backgroundColor: '#fff7ed' }}>
                <Text style={{ fontWeight: 'bold', fontSize: 15, color: '#ea580c', marginBottom: 8 }}>Thông tin đơn hàng</Text>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 2 }}>
                  <Text style={{ color: '#6b7280', fontSize: 14 }}>Mã đơn hàng:</Text>
                  <Text style={{ fontWeight: 'bold', color: '#1e293b' }}>{selectedOrder.id}</Text>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 2 }}>
                  <Text style={{ color: '#6b7280', fontSize: 14 }}>Thời gian đặt:</Text>
                  <Text style={{ color: '#1e293b' }}>{selectedOrder.time + ' - 16/09/2025'}</Text>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 2 }}>
                  <Text style={{ color: '#6b7280', fontSize: 14 }}>Thời gian dự kiến:</Text>
                  <Text style={{ color: '#1e293b' }}>25-30 phút</Text>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 2 }}>
                  <Text style={{ color: '#6b7280', fontSize: 14 }}>Thanh toán:</Text>
                  <Text style={{ color: '#1e293b' }}>{selectedOrder.payment === 'COD' ? '💰 Tiền mặt' : '💳 Online'}</Text>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
                  <Text style={{ color: '#6b7280', fontSize: 14 }}>Trạng thái:</Text>
                  <View style={{ backgroundColor: '#fee2e2', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 2 }}>
                    <Text style={{ color: '#ea580c', fontWeight: 'bold', fontSize: 13 }}>
                      {selectedOrder.status === 'pending' ? 'Chờ xác nhận' : selectedOrder.status === 'preparing' ? 'Đang chuẩn bị' : selectedOrder.status === 'ready' ? 'Sẵn sàng' : selectedOrder.status === 'delivering' ? 'Đang giao' : selectedOrder.status === 'completed' ? 'Đã hoàn thành' : selectedOrder.status === 'rejected' ? 'Đã hủy' : selectedOrder.status}
                    </Text>
                  </View>
                </View>
              </View>
              {/* Món đã order */}
              <View style={{ padding: 20, backgroundColor: '#fff' }}>
                <Text style={{ fontWeight: 'bold', fontSize: 15, color: '#ea580c', marginBottom: 8 }}>Món đã order</Text>
                {selectedOrder.items.map((item, idx) => (
                  <View key={idx} style={{ backgroundColor: '#f9fafb', borderRadius: 12, flexDirection: 'row', alignItems: 'center', padding: 12, marginBottom: 8 }}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontWeight: 'bold', fontSize: 15, color: '#1e293b' }}>{item.name}</Text>
                      {item.size_display && (
                        <Text style={{ color: '#6b7280', fontSize: 12, marginTop: 1 }}>
                          Size: {item.size_display}
                        </Text>
                      )}
                      <Text style={{ color: '#6b7280', fontSize: 13 }}>{item.price.toLocaleString() + ' đ'}</Text>
                      {item.food_option_price && item.food_option_price > 0 && (
                        <Text style={{ color: '#6b7280', fontSize: 12 }}>
                          +{item.food_option_price.toLocaleString()} đ (size)
                        </Text>
                      )}
                      {item.food_note && item.food_note.trim() !== '' && (
                        <View style={{ backgroundColor: '#fff3cd', borderRadius: 6, padding: 6, marginTop: 4 }}>
                          <Text style={{ color: '#856404', fontSize: 12, fontStyle: 'italic' }}>
                            Ghi chú: {item.food_note}
                          </Text>
                        </View>
                      )}
                    </View>
                    <Text style={{ fontWeight: 'bold', fontSize: 15, color: '#6b7280', marginHorizontal: 8 }}>{'x' + item.qty}</Text>
                    <Text style={{ fontWeight: 'bold', fontSize: 15, color: '#ea580c' }}>{((item.price + (item.food_option_price || 0)) * item.qty).toLocaleString() + ' đ'}</Text>
                  </View>
                ))}
                <View style={{ height: 1, backgroundColor: '#e5e7eb', marginVertical: 12 }} />
                <View style={{ gap: 6 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={{ color: '#6b7280', fontSize: 14 }}>Tạm tính (món ăn):</Text>
                    <Text style={{ color: '#1e293b', fontSize: 14, fontWeight: '600' }}>{selectedOrder.subtotal.toLocaleString()} đ</Text>
                  </View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={{ color: '#6b7280', fontSize: 14 }}>Phí vận chuyển:</Text>
                    <Text style={{ color: '#1e293b', fontSize: 14, fontWeight: '600' }}>+{selectedOrder.shipping_fee.toLocaleString()} đ</Text>
                  </View>
                  {selectedOrder.promo_discount > 0 && (
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text style={{ color: '#10b981', fontSize: 14, fontWeight: 'bold' }}>🎁 Giảm giá khuyến mãi:</Text>
                      <Text style={{ color: '#10b981', fontSize: 14, fontWeight: 'bold' }}>-{selectedOrder.promo_discount.toLocaleString()} đ</Text>
                    </View>
                  )}
                  <View style={{ height: 1, backgroundColor: '#ea580c', marginVertical: 4, opacity: 0.3 }} />
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff7ed', padding: 10, borderRadius: 8 }}>
                    <Text style={{ color: '#ea580c', fontSize: 16, fontWeight: 'bold' }}>Tổng thanh toán:</Text>
                    <Text style={{ fontWeight: 'bold', fontSize: 20, color: '#ea580c' }}>{selectedOrder.total.toLocaleString()} đ</Text>
                  </View>
                </View>
              </View>
              {/* Ghi chú */}
              <View style={{ padding: 20, backgroundColor: '#fff7ed' }}>
                <Text style={{ fontWeight: 'bold', fontSize: 15, color: '#ea580c', marginBottom: 8 }}>Ghi chú</Text>
                <View style={{ backgroundColor: '#fff', borderRadius: 8, padding: 12 }}>
                  <Text style={{ color: '#6b7280', fontSize: 14 }}>{selectedOrder.notes ? selectedOrder.notes : 'Không có ghi chú'}</Text>
                </View>
              </View>
              {/* Nút hành động */}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', padding: 20, backgroundColor: '#fff' }}>
                <TouchableOpacity style={{ flex: 1, backgroundColor: '#fff', borderRadius: 10, borderWidth: 1, borderColor: '#ef4444', paddingVertical: 14, alignItems: 'center', marginRight: 12 }} onPress={() => {
                  updateOrderStatusAsync(selectedOrder.id, 'rejected');
                  setModalVisible(false);
                }}>
                  <Text style={{ color: '#ef4444', fontWeight: 'bold', fontSize: 16 }}>Từ chối đơn</Text>
                </TouchableOpacity>
                <TouchableOpacity style={{ flex: 1, backgroundColor: '#ea580c', borderRadius: 10, paddingVertical: 14, alignItems: 'center' }} onPress={() => {
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
                }}>
                  <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }}>
                    {selectedOrder.status === 'pending' ? 'Xác nhận đơn' : selectedOrder.status === 'preparing' ? 'Sẵn sàng' : selectedOrder.status === 'ready' ? 'Đang giao' : selectedOrder.status === 'delivering' ? 'Hoàn thành' : 'Xác nhận đơn'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff7ed' },

  headerRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingHorizontal: 18, 
    paddingTop: 50, 
    paddingBottom: 8, 
    backgroundColor: '#fff7ed',
    borderBottomWidth: 0 
  },  headerTitle: { fontSize: 20, color: '#1e293b', fontWeight: 'bold' },
  headerSubtitle: { fontSize: 13, color: '#64748b', marginTop: 2 },
  headerIcons: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerIconBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#f3f4f6', marginLeft: 6 },
  headerBadge: { position: 'absolute', top: -4, right: -4, backgroundColor: '#ea580c', borderRadius: 10, minWidth: 18, height: 18, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#fff' },
  headerBadgeText: { fontSize: 11, color: '#fff', fontWeight: 'bold' },
  headerAvatar: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#F4A460', alignItems: 'center', justifyContent: 'center', marginLeft: 8 },
  headerAvatarText: { color: '#fff', fontSize: 14, fontWeight: 'bold' },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginHorizontal: 18, marginTop: -10, marginBottom: 4 },
  sectionTitle: { fontSize: 20, fontWeight: 'bold', color: '#ea580c' },
  sectionCount: { fontSize: 13, color: '#64748b' },
  tabBar: { flexDirection: 'row', marginHorizontal: 16, marginBottom: 12, marginTop: 15 },
  tab: { backgroundColor: '#fff', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 6, marginRight: 8, flexDirection: 'row', alignItems: 'center' },
  tabActive: { backgroundColor: '#fee2e2' },
  tabText: { color: '#ea580c', fontSize: 14 },
  tabTextActive: { color: '#ea580c', fontWeight: 'bold' , fontSize: 15},
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 7, shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 4, elevation: 1 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 },
  avatar: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#fffde7', alignItems: 'center', justifyContent: 'center', marginRight: 8 },
  customer: { fontWeight: 'bold', fontSize: 15, color: '#1e293b' },
  phone: { fontSize: 13, color: '#64748b' },
  orderId: { fontWeight: 'bold', color: '#64748b', fontSize: 13 },
  orderTime: { fontSize: 13, color: '#64748b' },
  orderLabel: { fontSize: 13, color: '#6b7280', marginTop: 8, marginBottom: 2 },
  itemRow: { flexDirection: 'row', justifyContent: 'space-between' },
  itemName: { fontSize: 13, color: '#1e293b' },
  itemQty: { fontSize: 13, color: '#1e293b' },
  itemPrice: { fontSize: 13, color: '#1e293b' },
  totalRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  totalText: { fontWeight: 'bold', color: '#ea580c', fontSize: 15 },
  payment: { marginLeft: 8, fontSize: 13 },
  statusBadge: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 2, marginLeft: 8 },
  statusBadgeText: { fontSize: 13, color: '#fff', fontWeight: 'bold' },
  actionRow: { flexDirection: 'row', marginTop: 12, justifyContent: 'center', width: '100%' },
  actionBtn: { width: 110, borderRadius: 8, paddingVertical: 10, alignItems: 'center', marginHorizontal: 8 },
  rejectBtn: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#ef4444' },
  confirmBtn: { backgroundColor: '#ea580c' },
  readyBtn: { backgroundColor: '#10b981' },
  deliveringBtn: { backgroundColor: '#3b82f6' },
  completedBtn: { backgroundColor: '#ea580c' },
  callBtn: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#e5e7eb', marginRight: 0 },
  rejectText: { color: '#ef4444', fontWeight: 'bold' },
  confirmText: { color: '#fff', fontWeight: 'bold' },
  readyText: { color: '#fff', fontWeight: 'bold' },
  deliveringText: { color: '#fff', fontWeight: 'bold' },
  completedText: { color: '#fff', fontWeight: 'bold' },
  callText: { color: '#ea580c', fontWeight: 'bold' },
  detailOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.2)', justifyContent: 'center', alignItems: 'center', zIndex: 99 },
  detailModal: { backgroundColor: '#fff', borderRadius: 40, padding: 24, width: '100%', elevation: 5 },
  orderDetailSectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#ea580c', marginBottom: 8, marginTop: 12 },
  orderDetailItem: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  orderDetailLabel: { fontSize: 14, color: '#6b7280' },
  orderDetailValue: { color: '#1e293b', fontWeight: 'bold' },
  orderDetailStatusBadge: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 2, marginLeft: 8 },
  orderDetailStatusText: { fontSize: 13, color: '#fff', fontWeight: 'bold' },
  orderDetailFoodItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 },
  orderDetailFoodName: { fontSize: 13, color: '#1e293b', flex: 2 },
  orderDetailFoodSize: { fontSize: 13, color: '#6b7280', flex: 1 },
  orderDetailFoodQuantity: { fontSize: 13, color: '#1e293b', flex: 1 },
  orderDetailFoodPrice: { fontSize: 13, color: '#ea580c', flex: 1, textAlign: 'right' },
  orderDetailTotal: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 8 },
  orderDetailTotalLabel: { fontSize: 14, color: '#6b7280', marginRight: 8 },
  orderDetailTotalValue: { color: '#ea580c', fontWeight: 'bold', fontSize: 15 },
  timelineItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  timelineDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#ea580c', marginRight: 8 },
  timelineContent: { flexDirection: 'column' },
  timelineTitle: { fontSize: 13, color: '#1e293b', fontWeight: 'bold' },
  timelineTime: { fontSize: 12, color: '#6b7280' },
  orderDetailActions: { flexDirection: 'row', justifyContent: 'center', marginTop: 16 },
  confirmOrderButton: { backgroundColor: '#ea580c', borderRadius: 8, paddingVertical: 10, paddingHorizontal: 20, marginHorizontal: 8 },
  confirmOrderButtonText: { color: '#fff', fontWeight: 'bold' },
  cancelOrderDetailButton: { backgroundColor: '#fff', borderRadius: 8, paddingVertical: 10, paddingHorizontal: 20, borderWidth: 1, borderColor: '#ef4444', marginHorizontal: 8 },
  cancelOrderDetailButtonText: { color: '#ef4444', fontWeight: 'bold' },
  detailCloseBtn: { marginTop: 18, paddingVertical: 10, paddingHorizontal: 20, backgroundColor: '#fff7ed', borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.7)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: '#fff', borderRadius: 16, padding: 24, width: '90%', maxWidth: 500, elevation: 5 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#1e293b', marginBottom: 16 },
  closeBtn: { marginTop: 16, paddingVertical: 10, paddingHorizontal: 20, backgroundColor: '#fff7ed', borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  closeText: { color: '#ea580c', fontWeight: 'bold' },
});

export default NewOrderListScreen;
