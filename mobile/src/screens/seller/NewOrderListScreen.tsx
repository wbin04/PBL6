import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Linking, Modal } from 'react-native';
import { Search, Bell } from 'lucide-react-native';

type Order = {
  id: string;
  customer: string;
  phone: string;
  time: string;
  items: { name: string; qty: number; price: number }[];
  total: number;
  status: string;
  payment: string;
  address?: string;
  timeline?: { status: string; time: string }[];
  totalDisplay?: string;
  notes?: string;
};

const orders: Order[] = [
  {
    id: 'ORD-001',
    customer: 'Nguyễn Văn A',
    phone: '0901234567',
    time: '10:30',
    address: '123 Đường ABC, Quận 1',
    items: [
      { name: 'Phở Bò Tái', qty: 2, price: 65000 },
      { name: 'Trà Sữa', qty: 1, price: 30000 },
    ],
    total: 160000,
    status: 'pending',
    payment: 'COD',
  },
  {
    id: 'ORD-002',
    customer: 'Trần Thị B',
    phone: '0912345678',
    time: '10:15',
    address: '456 Đường XYZ, Quận 2',
    items: [
      { name: 'Bún Bò Huế', qty: 1, price: 55000 },
      { name: 'Chả Cá', qty: 1, price: 45000 },
    ],
    total: 100000,
    status: 'preparing',
    payment: 'Online',
  },
  {
    id: 'ORD-003',
    customer: 'Lê Minh C',
    phone: '0923456789',
    time: '09:45',
    address: '789 Đường DEF, Quận 3',
    items: [
        { name: 'Cơm Gà Xối Mỡ', qty: 1, price: 60000 },
        { name: 'Nước Cam', qty: 1, price: 25000 },

    ],
    total: 85000,
    status: 'pending',
    payment: 'COD',
  },
  {
    id: 'ORD-004',
    customer: 'Phạm Văn D',
    phone: '0934567890',
    time: '09:30',
    address: '321 Đường LMN, Quận 4',
    items: [
        { name: 'Mì Quảng', qty: 2, price: 70000 },
        { name: 'Trà Đá', qty: 1, price: 5000 },
    ],
    total: 145000,
    status: 'preparing',
    payment: 'Online',
  }
];

const NewOrderListScreen = () => {
  const [activeTab, setActiveTab] = React.useState('all');
  const [orderList, setOrderList] = React.useState(orders);
  const [selectedOrder, setSelectedOrder] = React.useState<null | typeof orders[0]>(null);
  const [modalVisible, setModalVisible] = React.useState(false);

  // Helper: màu trạng thái
const getStatusColor = (status: string) => {
  switch (status) {
    case 'Chờ xác nhận': return '#f59e0b';
    case 'Đang chuẩn bị': return '#3b82f6';
    case 'Đang giao': return '#10b981';
    case 'Đã giao': return '#ea580c';
    case 'Đã hủy': return '#ef4444';
    default: return '#6b7280';
  }
};
// Helper: cập nhật trạng thái
const updateOrderStatus = (orderId: string, newStatus: string) => {
  setOrderList(prev =>
    prev.map(order =>
      order.id === orderId
        ? {
            ...order,
            status: newStatus,
            timeline: [
              ...(order.timeline || []),
              { status: newStatus, time: new Date().toLocaleTimeString() },
            ],
          }
        : order
    )
  );
  setSelectedOrder(selectedOrder && selectedOrder.id === orderId
    ? { ...selectedOrder, status: newStatus, timeline: [...(selectedOrder.timeline || []), { status: newStatus, time: new Date().toLocaleTimeString() }] }
    : selectedOrder
  );
};

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.headerRow}>

      </View>
      {/* Quản lý đơn hàng title + số lượng */}
      <View style={styles.sectionTitleRow}>
        <Text style={styles.sectionTitle}>Quản lý đơn hàng</Text>
        <Text style={styles.sectionCount}>{orders.length} đơn hàng</Text>
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
      <ScrollView contentContainerStyle={{ padding: 16 }}>
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
                <View key={i} style={styles.itemRow}>
                  <Text style={styles.itemName}>{item.name}</Text>
                  <Text style={styles.itemQty}>x{item.qty}</Text>
                  <Text style={styles.itemPrice}>{item.price.toLocaleString()} đ</Text>
                </View>
              ))}
              <View style={styles.totalRow}>
                <Text style={styles.totalText}>{order.total > 0 ? `Tổng cộng: ` : ''}<Text style={{ color: '#ea580c', fontWeight: 'bold' }}>{order.total > 0 ? `${order.total.toLocaleString()} đ` : ''}</Text></Text>
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
                      setOrderList(prev => prev.map(o => o.id === order.id ? { ...o, status: 'rejected' } : o));
                    }}>
                      <Text style={styles.rejectText}>Hủy</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.actionBtn, styles.confirmBtn]} onPress={() => {
                      setOrderList(prev => prev.map(o => o.id === order.id ? { ...o, status: 'preparing' } : o));
                    }}>
                      <Text style={styles.confirmText}>Xác nhận</Text>
                    </TouchableOpacity>
                  </>
                ) : order.status === 'preparing' ? (
                  <TouchableOpacity style={[styles.actionBtn, styles.readyBtn]} onPress={() => {
                    setOrderList(prev => prev.map(o => o.id === order.id ? { ...o, status: 'ready' } : o));
                  }}>
                    <Text style={styles.readyText}>Sẵn sàng</Text>
                  </TouchableOpacity>
                ) : order.status === 'ready' ? (
                  <TouchableOpacity style={[styles.actionBtn, styles.deliveringBtn]} onPress={() => {
                    setOrderList(prev => prev.map(o => o.id === order.id ? { ...o, status: 'delivering' } : o));
                  }}>
                    <Text style={styles.deliveringText}>Đang giao</Text>
                  </TouchableOpacity>
                ) : order.status === 'delivering' ? (
                  <TouchableOpacity style={[styles.actionBtn, styles.completedBtn]} onPress={() => {
                    setOrderList(prev => prev.map(o => o.id === order.id ? { ...o, status: 'completed' } : o));
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
                      <Text style={{ color: '#6b7280', fontSize: 13 }}>{item.price.toLocaleString() + ' đ'}</Text>
                    </View>
                    <Text style={{ fontWeight: 'bold', fontSize: 15, color: '#6b7280', marginHorizontal: 8 }}>{'x' + item.qty}</Text>
                    <Text style={{ fontWeight: 'bold', fontSize: 15, color: '#ea580c' }}>{(item.price * item.qty).toLocaleString() + ' đ'}</Text>
                  </View>
                ))}
                <View style={{ flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', marginTop: 8 }}>
                  <Text style={{ color: '#6b7280', fontSize: 15, marginRight: 8 }}>Tổng cộng:</Text>
                  <Text style={{ fontWeight: 'bold', fontSize: 18, color: '#ea580c' }}>{selectedOrder.total.toLocaleString() + ' đ'}</Text>
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
                  setOrderList(prev => prev.map(o => o.id === selectedOrder.id ? { ...o, status: 'rejected' } : o));
                  setModalVisible(false);
                }}>
                  <Text style={{ color: '#ef4444', fontWeight: 'bold', fontSize: 16 }}>Từ chối đơn</Text>
                </TouchableOpacity>
                <TouchableOpacity style={{ flex: 1, backgroundColor: '#ea580c', borderRadius: 10, paddingVertical: 14, alignItems: 'center' }} onPress={() => {
                  if (selectedOrder.status === 'pending') {
                    setOrderList(prev => prev.map(o => o.id === selectedOrder.id ? { ...o, status: 'preparing' } : o));
                  } else if (selectedOrder.status === 'preparing') {
                    setOrderList(prev => prev.map(o => o.id === selectedOrder.id ? { ...o, status: 'ready' } : o));
                  } else if (selectedOrder.status === 'ready') {
                    setOrderList(prev => prev.map(o => o.id === selectedOrder.id ? { ...o, status: 'delivering' } : o));
                  } else if (selectedOrder.status === 'delivering') {
                    setOrderList(prev => prev.map(o => o.id === selectedOrder.id ? { ...o, status: 'completed' } : o));
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
  headerRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18, paddingTop: 18, paddingBottom: 8, backgroundColor: '#fff7ed', borderBottomWidth: 0 },
  headerTitle: { fontSize: 20, color: '#1e293b', fontWeight: 'bold' },
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
