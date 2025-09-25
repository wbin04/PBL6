import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Modal, KeyboardAvoidingView, Platform, StyleSheet, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { IMAGE_MAP } from '../assets/imageMap';
import { X } from 'lucide-react-native';
import { Fonts } from '../constants/Fonts';

const getStatusColor = (status: string) => {
  switch (status) {
    case 'Đang giao': return '#f59e0b';
    case 'Đã giao': return '#10b981';
    case 'Chờ xác nhận': return '#3b82f6';
    case 'Đã hủy': return '#ef4444';
    default: return '#6b7280';
  }
};

const initialOrders = [
  {
    id: 'ORD-001',
    customer: 'Nguyễn Văn A',
    storeName: 'Quán Phở Hà Nội',
    image: require('../assets/images/burger-palace.png'),
    items: [
      { name: 'Phở Bò', size: 'Lớn', quantity: 1, price: 65000 },
      { name: 'Trà Sữa', size: 'Vừa', quantity: 2, price: 30000 },
    ],
    totalDisplay: '130,000 ₫',
    status: 'Đang giao',
    address: '123 Lê Lợi, Quận 1, TP.HCM',
    timeDisplay: '10:30',
    timeline: [
      { status: 'Đặt hàng', time: '10:30', completed: true },
      { status: 'Xác nhận', time: '10:32', completed: true },
      { status: 'Chuẩn bị', time: '10:35', completed: true },
      { status: 'Giao hàng', time: '10:50', completed: true },
      { status: 'Hoàn thành', time: '', completed: false },
    ],
  },
  {
    id: 'ORD-002',
    customer: 'Trần Thị B',
    storeName: 'Bánh Mì Sài Gòn',
    image: require('../assets/images/gourmet-burger.png'),
    items: [
      { name: 'Bánh Mì Thịt', size: 'Đặc biệt', quantity: 2, price: 25000 },
      { name: 'Cà Phê Sữa', size: 'Vừa', quantity: 1, price: 15000 },
    ],
    totalDisplay: '70,000 ₫',
    status: 'Chờ xác nhận',
    address: '456 Nguyễn Trãi, Quận 5, TP.HCM',
    timeDisplay: '10:25',
    timeline: [
      { status: 'Đặt hàng', time: '10:25', completed: true },
      { status: 'Xác nhận', time: '', completed: false },
      { status: 'Chuẩn bị', time: '', completed: false },
      { status: 'Giao hàng', time: '', completed: false },
      { status: 'Hoàn thành', time: '', completed: false },
    ],
  },
  {
    id: 'ORD-003',
    customer: 'Lê Minh C',
    storeName: 'Pizza Palace',
    image: require('../assets/images/delicious-toppings-pizza.png'),
    items: [
      { name: 'Pizza Hải sản', size: 'Lớn', quantity: 1, price: 150000 },
      { name: 'Coca Cola', size: 'Lon', quantity: 2, price: 15000 },
    ],
    totalDisplay: '200,000 ₫',
    status: 'Đã giao',
    address: '789 Điện Biên Phủ, Quận 3, TP.HCM',
    timeDisplay: '09:20',
    timeline: [
      { status: 'Đặt hàng', time: '09:20', completed: true },
      { status: 'Xác nhận', time: '09:22', completed: true },
      { status: 'Chuẩn bị', time: '09:25', completed: true },
      { status: 'Giao hàng', time: '09:45', completed: true },
      { status: 'Hoàn thành', time: '10:15', completed: true },
    ],
  },
  {
    id: 'ORD-004',
    customer: 'Phan Thị D',
    storeName: 'Quán Cơm Tấm',
    image: require('../assets/images/vegetable-rice-bowl.png'),
    items: [
      { name: 'Cơm Tấm Sườn', size: 'Thường', quantity: 1, price: 45000 },
      { name: 'Chả Cá', size: 'Thường', quantity: 1, price: 25000 },
    ],
    totalDisplay: '75,000 ₫',
    status: 'Đã hủy',
    address: '321 Lý Tự Trọng, Quận 1, TP.HCM',
    timeDisplay: '09:00',
    timeline: [
      { status: 'Đặt hàng', time: '09:00', completed: true },
      { status: 'Xác nhận', time: '09:02', completed: true },
      { status: 'Hủy đơn', time: '09:15', completed: true },
    ],
    cancelReason: 'Khách hàng hủy do thay đổi kế hoạch',
  },
];

const statusTabs = [
  { key: 'all', label: 'Tất cả' },
  { key: 'pending', label: 'Chờ xác nhận' },
  { key: 'delivering', label: 'Đang giao' },
  { key: 'delivered', label: 'Đã giao' },
  { key: 'cancelled', label: 'Đã hủy' },
];

const statusMapping = {
  pending: 'Chờ xác nhận',
  delivering: 'Đang giao',
  delivered: 'Đã giao',
  cancelled: 'Đã hủy',
};

export default function OrderListScreen() {
  const [orders, setOrders] = useState(initialOrders);
  const [orderFilter, setOrderFilter] = useState('all');
  const [orderDetailModalVisible, setOrderDetailModalVisible] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);

  const openOrderDetailModal = (order: any) => {
    setSelectedOrder(order);
    setOrderDetailModalVisible(true);
  };
  const closeOrderDetailModal = () => {
    setOrderDetailModalVisible(false);
    setSelectedOrder(null);
  };

  const filterOrders = () => {
    if (orderFilter === 'all') return orders;
    const mappedStatus = statusMapping[orderFilter as keyof typeof statusMapping];
    return orders.filter(order => order.status === mappedStatus);
  };

  const updateOrderStatus = (orderId: string, newStatus: string) => {
    setOrders(prevOrders =>
      prevOrders.map(order =>
        order.id === orderId ? { ...order, status: newStatus } : order
      )
    );
    if (selectedOrder && selectedOrder.id === orderId) {
      setSelectedOrder({ ...selectedOrder, status: newStatus });
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.filterTabs}>
          {statusTabs.map(tab => (
            <TouchableOpacity
              key={tab.key}
              style={[styles.filterTab, orderFilter === tab.key && styles.filterTabActive]}
              onPress={() => setOrderFilter(tab.key)}
            >
              <Text style={[styles.filterTabText, orderFilter === tab.key && styles.filterTabTextActive]}>{tab.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <ScrollView style={styles.scrollView}>
          {filterOrders().map((order, idx) => (
            <TouchableOpacity key={idx} style={styles.orderCard} activeOpacity={0.9} onPress={() => openOrderDetailModal(order)}>
              <View style={styles.orderCardHeader}>
                <Image
                  source={typeof order.image === 'string'
                    ? IMAGE_MAP[order.image] || require('../assets/images/placeholder.png')
                    : order.image}
                  style={styles.orderImage}
                />
                <View style={styles.orderCardInfo}>
                  <Text style={styles.orderCardId}>{order.id}</Text>
                  <Text style={styles.orderCardCustomer}>{order.customer}</Text>
                  <Text style={styles.orderCardItems}>
                    {order.items.map((item: any) => `${item.name} (${item.size})`).join(', ')}
                  </Text>
                  <Text style={styles.orderCardAddress}>{order.address}</Text>
                  <Text style={styles.orderCardStore}>Cửa hàng: {order.storeName}</Text>
                </View>
                <View style={styles.orderActions}>
                  {order.status !== 'Đã giao' && order.status !== 'Đã hủy' && (
                    <TouchableOpacity style={styles.cancelOrderButton} onPress={() => updateOrderStatus(order.id, 'Đã hủy')}>
                      <X size={16} color="#ef4444" />
                    </TouchableOpacity>
                  )}
                </View>
              </View>
              <View style={styles.orderCardFooter}>
                <Text style={styles.orderCardTotal}>{order.totalDisplay}</Text>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(order.status) }]}>
                  <Text style={styles.statusText}>{order.status}</Text>
                </View>
              </View>
            </TouchableOpacity>
          ))}
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
                      <View style={styles.orderDetailItem}><Text style={styles.orderDetailLabel}>Mã đơn hàng:</Text><Text style={styles.orderDetailValue}>{selectedOrder.id}</Text></View>
                      <View style={styles.orderDetailItem}><Text style={styles.orderDetailLabel}>Khách hàng:</Text><Text style={styles.orderDetailValue}>{selectedOrder.customer}</Text></View>
                      <View style={styles.orderDetailItem}><Text style={styles.orderDetailLabel}>Cửa hàng:</Text><Text style={styles.orderDetailValue}>{selectedOrder.storeName}</Text></View>
                      <View style={styles.orderDetailItem}><Text style={styles.orderDetailLabel}>Địa chỉ giao:</Text><Text style={styles.orderDetailValue}>{selectedOrder.address}</Text></View>
                      <View style={styles.orderDetailItem}><Text style={styles.orderDetailLabel}>Trạng thái:</Text><View style={[styles.orderDetailStatusBadge, { backgroundColor: getStatusColor(selectedOrder.status) }]}><Text style={styles.orderDetailStatusText}>{selectedOrder.status}</Text></View></View>
                    </View>

                    <View style={styles.orderDetailSection}>
                      <Text style={styles.orderDetailSectionTitle}>Món ăn đã đặt</Text>
                      {selectedOrder.items.map((item: any, idx: number) => (
                        <View key={idx} style={styles.orderDetailFoodItem}>
                          <Text style={styles.orderDetailFoodName}>{item.name}</Text>
                          <Text style={styles.orderDetailFoodSize}>Size: {item.size}</Text>
                          <Text style={styles.orderDetailFoodQuantity}>x{item.quantity}</Text>
                          <Text style={styles.orderDetailFoodPrice}>{item.price.toLocaleString()}đ</Text>
                        </View>
                      ))}
                      <View style={styles.orderDetailTotal}><Text style={styles.orderDetailTotalLabel}>Tổng cộng:</Text><Text style={styles.orderDetailTotalValue}>{selectedOrder.totalDisplay}</Text></View>
                    </View>

                    <View style={styles.orderDetailSection}>
                      <Text style={styles.orderDetailSectionTitle}>Lịch sử đơn hàng</Text>
                      {selectedOrder.timeline.map((event: any, idx: number) => (
                        <View key={idx} style={styles.timelineItem}>
                          <View style={styles.timelineDot} />
                          <View style={styles.timelineContent}>
                            <Text style={styles.timelineTitle}>{event.status}</Text>
                            <Text style={styles.timelineTime}>{event.time}</Text>
                          </View>
                        </View>
                      ))}
                    </View>

                    {selectedOrder.status !== 'Đã giao' && selectedOrder.status !== 'Đã hủy' && (
                      <View style={styles.orderDetailActions}>
                        {selectedOrder.status === 'Chờ xác nhận' && (
                          <TouchableOpacity style={styles.confirmOrderButton} onPress={() => updateOrderStatus(selectedOrder.id, 'Đang chuẩn bị')}>
                            <Text style={styles.confirmOrderButtonText}>Xác nhận</Text>
                          </TouchableOpacity>
                        )}
                        {selectedOrder.status === 'Đang chuẩn bị' && (
                          <TouchableOpacity style={styles.confirmOrderButton} onPress={() => updateOrderStatus(selectedOrder.id, 'Đang giao')}>
                            <Text style={styles.confirmOrderButtonText}>Chuẩn bị</Text>
                          </TouchableOpacity>
                        )}
                        {selectedOrder.status === 'Đang giao' && (
                          <TouchableOpacity style={styles.confirmOrderButton} onPress={() => updateOrderStatus(selectedOrder.id, 'Đã giao')}>
                            <Text style={styles.confirmOrderButtonText}>Đã giao</Text>
                          </TouchableOpacity>
                        )}
                        <TouchableOpacity style={styles.cancelOrderDetailButton} onPress={() => updateOrderStatus(selectedOrder.id, 'Đã hủy')}>
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
  filterTabs: { flexDirection: 'row', marginVertical: 12, gap: 8, justifyContent: 'center' },
  filterTab: { paddingHorizontal: 12, paddingVertical: 6, backgroundColor: '#f3f4f6', borderRadius: 6 },
  filterTabActive: { backgroundColor: '#f59e0b' },
  filterTabText: { fontSize: 12, color: '#6b7280', fontFamily: Fonts.LeagueSpartanRegular },
  filterTabTextActive: { fontSize: 12, color: '#fff', fontFamily: Fonts.LeagueSpartanSemiBold },

  scrollView: { flex: 1, paddingHorizontal: 12 },

  // Order Card
  orderCard: { backgroundColor: '#f8f9fa', borderRadius: 8, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: '#e5e7eb' },
  orderCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  orderImage: { width: 48, height: 48, borderRadius: 8, marginRight: 12 },
  orderCardInfo: { flex: 1 },
  orderCardId: { fontSize: 12, fontFamily: Fonts.LeagueSpartanBold, color: '#1f2937' },
  orderCardCustomer: { fontSize: 14, fontFamily: Fonts.LeagueSpartanSemiBold, color: '#1f2937', marginTop: 2 },
  orderCardItems: { fontSize: 12, color: '#6b7280', fontFamily: Fonts.LeagueSpartanRegular, marginBottom: 8 },
  orderCardAddress: { fontSize: 12, color: '#6b7280', fontFamily: Fonts.LeagueSpartanRegular, marginTop: 4 },
  orderCardStore: { fontSize: 12, color: '#059669', fontFamily: Fonts.LeagueSpartanMedium, marginBottom: 4 },
  orderCardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  orderCardTotal: { fontSize: 14, fontFamily: Fonts.LeagueSpartanBold, color: '#1f2937' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  statusText: { fontSize: 10, color: '#fff', fontFamily: Fonts.LeagueSpartanSemiBold },
  orderActions: { flexDirection: 'row', gap: 8 },
  cancelOrderButton: { padding: 6, backgroundColor: '#fef2f2', borderRadius: 4, borderWidth: 1, borderColor: '#fecaca' },

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
  confirmOrderButtonText: { fontSize: 16, fontFamily: Fonts.LeagueSpartanBold,  color: 'white' },
  cancelOrderDetailButton: { backgroundColor: '#dc2626', paddingVertical: 12, borderRadius: 8, width: 100, alignSelf: 'center',alignItems: 'center' },
  cancelOrderDetailButtonText: { fontSize: 16, fontFamily: Fonts.LeagueSpartanBold, color: 'white' },
});
