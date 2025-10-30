import React, { useMemo, useState, useCallback, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Linking,
  Alert,
  RefreshControl,
  Modal,
  Pressable,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import {
  Search,
  Menu as MenuIcon,
  Bell,
  CheckCircle,
  Shield,
  AlertTriangle,
  Clock,
  MapPin,
  Phone,
  Eye,
  Navigation,
  X,
} from "lucide-react-native";

import Sidebar from "@/components/sidebar";
import { Fonts } from "@/constants/Fonts";
import { shipperService, type ShipperOrder } from "@/services/shipperService";

type UITabStatus = "new" | "accepted" | "delivering" | "delivered" | "cancelled";

type UIOrder = {
  id: number;
  restaurant: string;
  customer: string;
  address: string;
  phone: string;
  items: string[];
  total: string;
  time: string;
  distance: string;
  status: UITabStatus;
  callCount?: number;
  arrived?: boolean;
  order_status: string;
  delivery_status: string;
  raw: ShipperOrder;
};

// Backend delivery_status -> Tab UI mapping
const mapDeliveryStatusToTab = (delivery_status: string, order_status: string): UITabStatus => {
  console.log(`Mapping status: delivery_status=${delivery_status}, order_status=${order_status}`);
  
  // Special case: If order_status is cancelled, always show in cancelled tab regardless of delivery_status
  // This handles cases where customer cancels after shipper has accepted (delivery_status="Đã xác nhận", order_status="Đã huỷ")
  // Handle both spellings: "Đã hủy" and "Đã huỷ"
  if (order_status === "Đã hủy" || order_status === "Đã huỷ" || 
      delivery_status === "Đã hủy" || delivery_status === "Đã huỷ") {
    return "cancelled";
  }
  
  switch (delivery_status) {
    case "Chờ xác nhận":
      return "new";
    case "Đã xác nhận":
      return "accepted";
    case "Đã lấy hàng":
      return "delivering";
    case "Đang giao":
      return "delivering";
    case "Đã giao":
      return "delivered";
    default:
      console.warn(`Unknown delivery_status: ${delivery_status}, defaulting to 'new'`);
      return "new";
  }
};

const vnd = (n: number) =>
  n.toLocaleString("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 });

// Get status badge colors
const getStatusBadgeStyle = (status: string) => {
  switch (status) {
    case "Chờ xác nhận":
      return { backgroundColor: "#fef3c7", borderColor: "#f59e0b", color: "#92400e" };
    case "Đã xác nhận":
      return { backgroundColor: "#dbeafe", borderColor: "#3b82f6", color: "#1e40af" };
    case "Sẵn sàng":
      return { backgroundColor: "#dcfce7", borderColor: "#22c55e", color: "#166534" };
    case "Đang giao":
      return { backgroundColor: "#e0e7ff", borderColor: "#6366f1", color: "#4338ca" };
    case "Đã giao":
      return { backgroundColor: "#f0fdf4", borderColor: "#16a34a", color: "#14532d" };
    case "Đã huỷ":
      return { backgroundColor: "#fef2f2", borderColor: "#ef4444", color: "#dc2626" };
    default:
      return { backgroundColor: "#f3f4f6", borderColor: "#d1d5db", color: "#374151" };
  }
};

type LocalState = Record<
  number,
  {
    callCount?: number;
    arrived?: boolean;
  }
>;

export default function ShipperOrdersScreen() {
  const insets = useSafeAreaInsets();

  const [activeOrderTab, setActiveOrderTab] = useState<UITabStatus>("new");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [localState, setLocalState] = useState<LocalState>({});
  const [orders, setOrders] = useState<ShipperOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<UIOrder | null>(null);
  const [showOrderDetails, setShowOrderDetails] = useState(false);

  // Fetch orders based on current tab
  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true);
      let fetchedOrders: ShipperOrder[] = [];

      console.log('=== FETCH ORDERS DEBUG ===');
      console.log('Active tab:', activeOrderTab);

      if (activeOrderTab === "new") {
        // Fetch available orders (no shipper assigned, delivery_status = "Chờ xác nhận")
        console.log('Fetching available orders...');
        fetchedOrders = await shipperService.getAvailableOrders();
        console.log('Available orders response:', fetchedOrders);
      } else {
        // Fetch orders for current shipper based on delivery_status
        const statusMap: Record<UITabStatus, string> = {
          new: "Chờ xác nhận",
          accepted: "Đã xác nhận",
          delivering: "Đã lấy hàng,Đang giao", // Multiple statuses
          delivered: "Đã giao",
          cancelled: "Đã huỷ",  // Use the spelling that's in the database
        };

        if (activeOrderTab === "delivering") {
          // Fetch both "Đã lấy hàng" and "Đang giao"
          console.log('Fetching delivering orders...');
          const pickupOrders = await shipperService.getShipperOrders("Đã lấy hàng");
          const deliveringOrders = await shipperService.getShipperOrders("Đang giao");
          console.log('Pickup orders:', pickupOrders);
          console.log('Delivering orders:', deliveringOrders);
          
          // Use Map to avoid duplicates by order ID
          const orderMap = new Map();
          [...(pickupOrders || []), ...(deliveringOrders || [])].forEach(order => {
            orderMap.set(order.id, order);
          });
          fetchedOrders = Array.from(orderMap.values());
          
          console.log('Merged delivering orders (duplicates removed):', fetchedOrders);
        } else if (activeOrderTab === "cancelled") {
          // For cancelled orders, fetch all cancelled orders (including customer-cancelled)
          console.log('Fetching cancelled orders...');
          fetchedOrders = await shipperService.getShipperOrders("Đã hủy");
          console.log('Cancelled orders response:', fetchedOrders);
        } else {
          console.log('Fetching shipper orders for status:', statusMap[activeOrderTab]);
          fetchedOrders = await shipperService.getShipperOrders(statusMap[activeOrderTab]);
          console.log('Shipper orders response:', fetchedOrders);
        }
      }

      console.log('Final fetched orders:', fetchedOrders);
      console.log('Is array?', Array.isArray(fetchedOrders));
      console.log('=== END FETCH ORDERS DEBUG ===');

      // Ensure we always have an array
      setOrders(Array.isArray(fetchedOrders) ? fetchedOrders : []);
    } catch (error) {
      console.error('Error fetching orders:', error);
      Alert.alert('Lỗi', 'Không thể tải danh sách đơn hàng');
      // Set empty array on error to prevent undefined
      setOrders([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeOrderTab]);

  // Fetch orders when component mounts or tab changes
  useEffect(() => {
    // Clear orders immediately when tab changes to prevent showing wrong data
    setOrders([]);
    fetchOrders();
  }, [fetchOrders]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchOrders();
  }, [fetchOrders]);

  // Convert ShipperOrder to UIOrder
  const uiOrders: UIOrder[] = useMemo(() => {
    console.log('=== UI ORDERS DEBUG ===');
    console.log('orders state:', orders);
    console.log('orders type:', typeof orders);
    console.log('orders is array:', Array.isArray(orders));
    
    if (!orders || !Array.isArray(orders)) {
      console.log('Orders is not valid array, returning empty array');
      console.log('=== END UI ORDERS DEBUG ===');
      return [];
    }
    
    console.log('Processing', orders.length, 'orders');
    const result = orders.map((order, index) => {
      console.log(`Processing order ${index}:`, order);
      
      if (!order || typeof order !== 'object') {
        console.warn(`Order ${index} is not a valid object:`, order);
        return null;
      }
      
      // For shipper screen, show FINAL total (after discount)
      // Priority: total_after_discount > calculated from total_money + shipping - discount
      let total = 0;
      
      if (order.total_after_discount) {
        // Use total_after_discount directly (already includes shipping and discount)
        total = typeof order.total_after_discount === 'string' 
          ? parseFloat(order.total_after_discount) || 0
          : order.total_after_discount || 0;
      } else {
        // Fallback: Calculate manually
        const foodTotal = typeof order.total_money === 'string' 
          ? parseFloat(order.total_money) || 0
          : order.total_money || 0;
        
        const shippingFee = typeof order.shipping_fee === 'string'
          ? parseFloat(order.shipping_fee) || 0  
          : order.shipping_fee || 0;
        
        const discount = order.promo_discount || 0;
        
        total = foodTotal + shippingFee - discount;
      }
      
      console.log(`Order ${order.id} total calculation:`, {
        total_before_discount: order.total_before_discount,
        total_after_discount: order.total_after_discount,
        total_money: order.total_money,
        shipping_fee: order.shipping_fee,
        promo_discount: order.promo_discount,
        calculated_total: total,
        formatted_total: vnd(total)
      });
      
      const t = new Date(order.created_date);
      const day = String(t.getDate()).padStart(2, "0");
      const month = String(t.getMonth() + 1).padStart(2, "0");
      const hh = String(t.getHours()).padStart(2, "0");
      const mm = String(t.getMinutes()).padStart(2, "0");

      // Handle both 'items' and 'details' arrays from backend
      const orderItems = order.items || order.details || [];
      const itemDescs = orderItems.map((item) => 
        `${item?.food?.title || 'Unknown'} x${item?.quantity || 0}`
      );

      const local = localState[order.id] || {};
      const status = mapDeliveryStatusToTab(order.delivery_status || '', order.order_status || '');

      console.log(`Order ${order.id} store info:`, {
        store: order.store,
        store_name: order.store_name,
        final_restaurant_name: order.store_name || order.store?.store_name || 'Chưa có tên cửa hàng'
      });

      return {
        id: order.id,
        restaurant: order.store_name || order.store?.store_name || 'Chưa có tên cửa hàng',
        customer: order.user?.fullname || 'Unknown',
        address: order.ship_address || '',
        phone: order.phone_number || '',
        items: itemDescs,
        total: vnd(total),
        time: `${day}/${month} ${hh}:${mm}`,
        distance: "--",
        status,
        callCount: local.callCount || 0,
        arrived: !!local.arrived,
        order_status: order.order_status || '',
        delivery_status: order.delivery_status || '',
        raw: order,
      };
    }).filter(Boolean) as UIOrder[]; // Filter out null values and cast type
    
    console.log('Final UI orders:', result);
    console.log('=== END UI ORDERS DEBUG ===');
    return result;
  }, [orders, localState]);

  // filter theo Tab + Search
  const filteredOrders = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return uiOrders.filter((o) => {
      if (o.status !== activeOrderTab) return false;
      if (!q) return true;
      const haystack = [
        o.id,
        o.restaurant,
        o.customer,
        o.address,
        o.phone,
        o.items.join(" "),
        o.total,
        o.time,
        o.distance,
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [uiOrders, activeOrderTab, searchQuery]);

  // cập nhật state cục bộ
  const patchLocal = useCallback((id: number, patch: Partial<LocalState[number]>) => {
    setLocalState((prev) => ({
      ...prev,
      [id]: { ...prev[id], ...patch },
    }));
  }, []);

  // --- Flow nút ---
  // Nhận đơn -> sang tab "Đã nhận"
  const handleAccept = async (orderId: number) => {
    try {
      setLoading(true);
      await shipperService.acceptOrder(orderId);
      patchLocal(orderId, { callCount: 0, arrived: false });
      
      // Refresh orders and switch to accepted tab
      await fetchOrders();
      setActiveOrderTab("accepted");
      
      Alert.alert('Thành công', 'Đã nhận đơn hàng thành công');
    } catch (error) {
      console.error('Error accepting order:', error);
      Alert.alert('Lỗi', 'Không thể nhận đơn hàng');
    } finally {
      setLoading(false);
    }
  };

  // Đã đến quán -> bật cờ arrived
  const handleArrivedAtRestaurant = (id: number) => patchLocal(id, { arrived: true });

  // Đã lấy hàng -> cập nhật delivery_status
  const handlePickedUp = async (orderId: number) => {
    try {
      setLoading(true);
      await shipperService.updateDeliveryStatus(orderId, 'Đã lấy hàng');
      
      // After pickup, order should move to delivering tab
      await fetchOrders();
      setActiveOrderTab("delivering");
      
      Alert.alert('Thành công', 'Đã xác nhận lấy hàng');
    } catch (error) {
      console.error('Error updating pickup status:', error);
      Alert.alert('Lỗi', 'Không thể cập nhật trạng thái');
    } finally {
      setLoading(false);
    }
  };

  // Đang giao -> cập nhật delivery_status  
  const handleStartDelivery = async (orderId: number) => {
    try {
      setLoading(true);
      await shipperService.updateDeliveryStatus(orderId, 'Đang giao');
      
      // Stay in delivering tab and refresh
      await fetchOrders();
      
      Alert.alert('Thành công', 'Đã bắt đầu giao hàng');
    } catch (error) {
      console.error('Error starting delivery:', error);
      Alert.alert('Lỗi', 'Không thể cập nhật trạng thái');
    } finally {
      setLoading(false);
    }
  };

  // Giao thành công -> sang tab "Đã giao"
  const handleMarkDelivered = async (orderId: number) => {
    try {
      setLoading(true);
      await shipperService.updateDeliveryStatus(orderId, 'Đã giao');
      await fetchOrders();
      setActiveOrderTab("delivered");
      Alert.alert('Thành công', 'Đã giao hàng thành công');
    } catch (error) {
      console.error('Error marking as delivered:', error);
      Alert.alert('Lỗi', 'Không thể cập nhật trạng thái');
    } finally {
      setLoading(false);
    }
  };

  // Huỷ đơn (khi gọi >= 3 lần)
  const handleCancel = async (orderId: number) => {
    try {
      setLoading(true);
      await shipperService.cancelOrder(orderId, 'Không liên lạc được với khách hàng');
      await fetchOrders();
      setActiveOrderTab("cancelled");
      Alert.alert('Thành công', 'Đã hủy đơn hàng');
    } catch (error) {
      console.error('Error cancelling order:', error);
      Alert.alert('Lỗi', 'Không thể hủy đơn hàng');
    } finally {
      setLoading(false);
    }
  };

  // Gọi khách, tăng đếm gọi
  const handleCall = async (order: UIOrder) => {
    const next = (order.callCount || 0) + 1;
    patchLocal(order.id, { callCount: next });
    try {
      const url = `tel:${order.phone}`;
      const can = await Linking.canOpenURL(url);
      if (can) await Linking.openURL(url);
    } catch {
      Alert.alert("Không thể gọi điện");
    }
  };

  const shouldShowCancel = (o: UIOrder) => (o.callCount || 0) >= 3;

  // Handle tapping on an order to show details
  const handleOrderTap = (order: UIOrder) => {
    setSelectedOrder(order);
    setShowOrderDetails(true);
  };

  // Close order details modal
  const closeOrderDetails = () => {
    setShowOrderDetails(false);
    setSelectedOrder(null);
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#fff" }}>
      {/* Header */}
      <SafeAreaView edges={["top"]} style={styles.headerWrap}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => setSidebarOpen(true)} style={styles.menuButton}>
            <MenuIcon size={24} color={"#e95322"} />
          </TouchableOpacity>

          <View style={{ flex: 1, position: "relative" }}>
            <TextInput
              placeholder="Tìm kiếm đơn hàng..."
              placeholderTextColor="#808080"
              value={searchQuery}
              onChangeText={setSearchQuery}
              style={styles.searchInput}
            />
            <View style={styles.searchIcon}>
              <Search size={18} color="#fff" />
            </View>
          </View>

          <View style={styles.headerIcon}>
            <Bell size={24} color={"#e95322"} />
          </View>
        </View>

        <Text style={styles.hello}>Quản lý đơn hàng</Text>
        <Text style={styles.ask}>Theo dõi và xử lý đơn hàng của bạn</Text>
      </SafeAreaView>

      {/* Tabs */}
      <View
        style={{
          backgroundColor: "#fff",
          paddingHorizontal: 16,
          paddingVertical: 12,
          marginTop: -16,
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
        }}
      >
        <View style={styles.tabRow}>
          <TabBtn
            active={activeOrderTab === "new"}
            onPress={() => setActiveOrderTab("new")}
            label="Đơn mới"
            Icon={<Clock size={20} color={activeOrderTab === "new" ? "#fff" : "#4b5563"} />}
          />
          <TabBtn
            active={activeOrderTab === "accepted"}
            onPress={() => setActiveOrderTab("accepted")}
            label="Đã nhận"
            Icon={<CheckCircle size={20} color={activeOrderTab === "accepted" ? "#fff" : "#4b5563"} />}
          />
          <TabBtn
            active={activeOrderTab === "delivering"}
            onPress={() => setActiveOrderTab("delivering")}
            label="Đang giao"
            Icon={<Navigation size={20} color={activeOrderTab === "delivering" ? "#fff" : "#4b5563"} />}
          />
          <TabBtn
            active={activeOrderTab === "delivered"}
            onPress={() => setActiveOrderTab("delivered")}
            label="Đã giao"
            Icon={<Shield size={20} color={activeOrderTab === "delivered" ? "#fff" : "#4b5563"} />}
          />
          <TabBtn
            active={activeOrderTab === "cancelled"}
            onPress={() => setActiveOrderTab("cancelled")}
            label="Đã hủy"
            Icon={<AlertTriangle size={20} color={activeOrderTab === "cancelled" ? "#fff" : "#4b5563"} />}
          />
        </View>
      </View>

      {/* Orders List */}
      <SafeAreaView edges={["bottom"]} style={{ flex: 1, backgroundColor: "#fff" }}>
        <ScrollView
          contentContainerStyle={{
            paddingHorizontal: 16,
            paddingTop: 8,
            paddingBottom: 16 + insets.bottom,
          }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={["#e95322"]}
            />
          }
        >
          {loading && orders.length === 0 ? (
            <View style={{ alignItems: "center", paddingVertical: 48 }}>
              <Text style={styles.emptyTitle}>Đang tải...</Text>
              <Text style={styles.emptySub}>Vui lòng chờ trong giây lát</Text>
            </View>
          ) : filteredOrders.length === 0 ? (
            <View style={{ alignItems: "center", paddingVertical: 48 }}>
              <Text style={styles.emptyTitle}>Không có đơn hàng</Text>
              <Text style={styles.emptySub}>Chưa có đơn hàng nào trong mục này</Text>
            </View>
          ) : (
            filteredOrders.map((order, index) => {
              const arrived = !!order.arrived;
              const showCancel = shouldShowCancel(order);

              return (
                <TouchableOpacity 
                  key={`${activeOrderTab}-${order.id}-${order.delivery_status}-${index}`} 
                  style={styles.card}
                  onPress={() => handleOrderTap(order)}
                  activeOpacity={0.7}
                >
                  {/* Header đơn */}
                  <View style={styles.cardTopRow}>
                    <View>
                      <Text style={styles.orderId}>#{order.id}</Text>
                      <Text style={styles.graySm}>{order.time}</Text>
                      {order.order_status && (
                        <View style={[
                          styles.statusBadge, 
                          { 
                            backgroundColor: getStatusBadgeStyle(order.order_status).backgroundColor,
                            borderColor: getStatusBadgeStyle(order.order_status).borderColor 
                          }
                        ]}>
                          <Text style={[
                            styles.statusText, 
                            { color: getStatusBadgeStyle(order.order_status).color }
                          ]}>
                            {order.order_status}
                          </Text>
                        </View>
                      )}
                    </View>

                    <View style={{ alignItems: "flex-end" }}>
                      <Text style={styles.total}>{order.total}</Text>
                      {order.callCount ? (
                        <Text style={styles.graySm}>Đã gọi: {order.callCount} lần</Text>
                      ) : null}
                      <View style={styles.tapHint}>
                        <Eye size={12} color="#6b7280" />
                        <Text style={styles.tapHintText}>Xem chi tiết</Text>
                      </View>
                    </View>
                  </View>

                  {/* Thông tin */}
                  <View style={{ gap: 10, marginBottom: 12 }}>
                    <View style={styles.row}>
                      <View style={[styles.dot, { backgroundColor: "#e95322" }]} />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.medium}>{order.restaurant}</Text>
                        <Text style={styles.graySm}>Nhà hàng</Text>
                      </View>
                    </View>

                    <View style={styles.row}>
                      <View style={[styles.dot, { backgroundColor: "#22c55e" }]} />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.medium}>{order.customer}</Text>
                        <Text style={styles.graySm}>{order.address}</Text>
                        {order.phone && (
                          <Text style={[styles.graySm, { color: "#3b82f6", marginTop: 2 }]}>📞 {order.phone}</Text>
                        )}
                      </View>
                    </View>
                    
                    {order.items.length > 0 && (
                      <View style={styles.row}>
                        <View style={[styles.dot, { backgroundColor: "#f59e0b" }]} />
                        <View style={{ flex: 1 }}>
                          <Text style={styles.medium}>Món ăn ({order.items.length})</Text>
                          <Text style={styles.graySm}>{order.items.slice(0, 2).join(", ")}{order.items.length > 2 ? `... (+${order.items.length - 2} món)` : ""}</Text>
                        </View>
                      </View>
                    )}
                  </View>

                  {/* Actions */}
                  <View style={{ flexDirection: "row", gap: 8 }}>
                    {activeOrderTab === "new" && (
                      <>
                        <PrimaryBtn title="Nhận đơn" onPress={() => handleAccept(order.id)} />
                        
                        <TouchableOpacity style={styles.iconBtnOutline} onPress={() => handleCall(order)}>
                          <Phone size={20} color="#4b5563" />
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={styles.iconBtnOutline}
                          // onPress={() => {Navigation.navigate("MapScreen", { address: order.address })}}
                        >
                          <MapPin size={20} color="#4b5563" />
                        </TouchableOpacity>
                      </>
                    )}

                    {activeOrderTab === "accepted" && (
                      <>
                        {order.order_status === "Sẵn sàng" ? (
                          <PrimaryBtn title="Đã lấy hàng" onPress={() => handlePickedUp(order.id)} />
                        ) : (
                          <PrimaryBtn title="Chờ quán chuẩn bị" onPress={() => {}} />
                        )}

                        <TouchableOpacity style={styles.iconBtnOutline} onPress={() => handleCall(order)}>
                          <Phone size={20} color="#4b5563" />
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={styles.iconBtnOutline}
                          // onPress={() => {Navigation.navigate("MapScreen", { address: order.address })}}
                        >
                          <MapPin size={20} color="#4b5563" />
                        </TouchableOpacity>
                      </>
                    )}

                    {activeOrderTab === "delivering" && (
                      <>
                        {order.delivery_status === "Đã lấy hàng" ? (
                          <PrimaryBtn title="Bắt đầu giao" onPress={() => handleStartDelivery(order.id)} />
                        ) : (
                          <PrimaryBtn title="Giao thành công" onPress={() => handleMarkDelivered(order.id)} />
                        )}

                        <TouchableOpacity style={styles.iconBtnOutline} onPress={() => handleCall(order)}>
                          <Phone size={20} color="#4b5563" />
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={styles.iconBtnOutline}
                          // onPress={() => {Navigation.navigate("MapScreen", { address: order.address })}}
                        >
                          <MapPin size={20} color="#4b5563" />
                        </TouchableOpacity>
                      </>
                    )}
                  </View>

                  {/* Huỷ đơn khi gọi ≥ 3 lần */}
                  {activeOrderTab === "accepted" && showCancel && (
                    <TouchableOpacity onPress={() => handleCancel(order.id)} style={styles.cancelBtn}>
                      <Text style={styles.cancelBtnText}>Huỷ đơn</Text>
                    </TouchableOpacity>
                  )}
                </TouchableOpacity>
              );
            })
          )}
        </ScrollView>
      </SafeAreaView>

      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Order Details Modal */}
      <Modal
        visible={showOrderDetails}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={closeOrderDetails}
      >
        <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }}>
          {/* Modal Header */}
          <View style={styles.modalHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.modalTitle}>Chi tiết đơn hàng</Text>
              {selectedOrder && (
                <Text style={styles.modalSubtitle}>#{selectedOrder.id}</Text>
              )}
            </View>
            <TouchableOpacity onPress={closeOrderDetails} style={styles.closeButton}>
              <X size={24} color="#6b7280" />
            </TouchableOpacity>
          </View>

          {selectedOrder && (
            <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16 }}>
              {/* Order Info */}
              <View style={styles.detailSection}>
                <Text style={styles.sectionTitle}>Thông tin đơn hàng</Text>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Mã đơn:</Text>
                  <Text style={styles.detailValue}>#{selectedOrder.id}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Thời gian:</Text>
                  <Text style={styles.detailValue}>{selectedOrder.time}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Trạng thái:</Text>
                  <View style={[
                    styles.statusBadge,
                    {
                      backgroundColor: getStatusBadgeStyle(selectedOrder.order_status).backgroundColor,
                      borderColor: getStatusBadgeStyle(selectedOrder.order_status).borderColor
                    }
                  ]}>
                    <Text style={[
                      styles.statusText,
                      { color: getStatusBadgeStyle(selectedOrder.order_status).color }
                    ]}>
                      {selectedOrder.order_status}
                    </Text>
                  </View>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Tổng tiền:</Text>
                  <Text style={[styles.detailValue, { color: "#e95322", fontWeight: "bold" }]}>
                    {selectedOrder.total}
                  </Text>
                </View>
              </View>

              {/* Restaurant Info */}
              <View style={styles.detailSection}>
                <Text style={styles.sectionTitle}>Nhà hàng</Text>
                <View style={styles.locationCard}>
                  <View style={[styles.dot, { backgroundColor: "#e95322" }]} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.locationName}>{selectedOrder.restaurant}</Text>
                    <Text style={styles.locationLabel}>Nhà hàng</Text>
                  </View>
                </View>
              </View>

              {/* Customer Info */}
              <View style={styles.detailSection}>
                <Text style={styles.sectionTitle}>Khách hàng</Text>
                <View style={styles.locationCard}>
                  <View style={[styles.dot, { backgroundColor: "#22c55e" }]} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.locationName}>{selectedOrder.customer}</Text>
                    <Text style={styles.locationAddress}>{selectedOrder.address}</Text>
                    {selectedOrder.phone && (
                      <Text style={styles.locationPhone}>📞 {selectedOrder.phone}</Text>
                    )}
                  </View>
                </View>
              </View>

              {/* Food Items */}
              <View style={styles.detailSection}>
                <Text style={styles.sectionTitle}>Danh sách món ăn ({selectedOrder.items.length})</Text>
                {selectedOrder.raw.items || selectedOrder.raw.details ? (
                  (selectedOrder.raw.items || selectedOrder.raw.details || []).map((item: any, index: number) => (
                    <View key={index} style={styles.foodItem}>
                      <View style={styles.foodItemHeader}>
                        <Text style={styles.foodName}>{item?.food?.title || 'Unknown'}</Text>
                        <Text style={styles.foodQuantity}>x{item?.quantity || 0}</Text>
                      </View>
                      <View style={styles.foodItemFooter}>
                        <Text style={styles.foodPrice}>
                          {vnd(item?.food_price || item?.food?.price || 0)} x {item?.quantity || 0}
                        </Text>
                        <Text style={styles.foodSubtotal}>
                          = {vnd((item?.food_price || item?.food?.price || 0) * (item?.quantity || 0))}
                        </Text>
                      </View>
                      {item?.food_note && (
                        <Text style={styles.foodNote}>Ghi chú: {item.food_note}</Text>
                      )}
                    </View>
                  ))
                ) : (
                  <View style={styles.emptyFood}>
                    <Text style={styles.emptyFoodText}>Không có thông tin món ăn chi tiết</Text>
                    <Text style={styles.emptyFoodSubtext}>
                      Tóm tắt: {selectedOrder.items.join(", ")}
                    </Text>
                  </View>
                )}
              </View>

              {/* Actions */}
              <View style={styles.modalActions}>
                <TouchableOpacity 
                  style={styles.modalActionBtn}
                  onPress={() => {
                    closeOrderDetails();
                    handleCall(selectedOrder);
                  }}
                >
                  <Phone size={20} color="#e95322" />
                  <Text style={styles.modalActionText}>Gọi khách hàng</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          )}
        </SafeAreaView>
      </Modal>
    </View>
  );
}

function TabBtn({
  active,
  onPress,
  label,
  Icon,
}: {
  active: boolean;
  onPress: () => void;
  label: string;
  Icon: React.ReactNode;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.tabBtn, { backgroundColor: active ? "#e95322" : "transparent" }]}
    >
      <View style={{ alignItems: "center" }}>
        <View>{Icon}</View>
        <Text style={[styles.tabLabel, { color: active ? "#fff" : "#4b5563" }]}>{label}</Text>
      </View>
    </TouchableOpacity>
  );
}

function PrimaryBtn({ title, onPress }: { title: string; onPress: () => void }) {
  return (
    <TouchableOpacity onPress={onPress} style={styles.primaryBtn}>
      <Text style={styles.primaryBtnText}>{title}</Text>
    </TouchableOpacity>
  );
}

function IconBtn({ children }: { children: React.ReactNode }) {
  return <View style={styles.iconBtnOutline}>{children}</View>;
}

const styles = StyleSheet.create({
  headerWrap: {
    backgroundColor: "#f5cb58",
    paddingHorizontal: 24,
    paddingBottom: 40,
    paddingTop: 16,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 16,
  },
  menuButton: {
    backgroundColor: "#fff",
    borderRadius: 999,
    padding: 8,
  },
  searchInput: {
    width: "100%",
    backgroundColor: "#fff",
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 10,
    color: "#676767",
    fontFamily: Fonts.LeagueSpartanRegular,
    fontSize: 14,
  },
  searchIcon: {
    position: "absolute",
    right: 4,
    top: 4,
    bottom: 4,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#e95322",
    borderRadius: 999,
    paddingHorizontal: 10,
  },
  headerIcon: {
    backgroundColor: "#fff",
    borderRadius: 999,
    padding: 8,
  },
  hello: {
    color: "#fff",
    marginBottom: 4,
    fontSize: 32,
    fontFamily: Fonts.LeagueSpartanBlack,
  },
  ask: {
    color: "#e95322",
    fontSize: 16,
    fontFamily: Fonts.LeagueSpartanSemiBold,
  },

  tabRow: {
    flexDirection: "row",
    gap: 8,
    justifyContent: "space-between",
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  tabLabel: {
    fontFamily: Fonts.LeagueSpartanSemiBold,
    fontSize: 12,
    marginTop: 6,
  },

  card: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 16,
    padding: 14,
    marginTop: 8,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  cardTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  orderId: {
    fontFamily: Fonts.LeagueSpartanBold,
    fontSize: 16,
    color: "#111827",
  },
  graySm: {
    color: "#6b7280",
    fontFamily: Fonts.LeagueSpartanRegular,
    fontSize: 12,
  },
  medium: {
    fontFamily: Fonts.LeagueSpartanSemiBold,
    color: "#111827",
    fontSize: 14,
  },
  total: {
    color: "#e95322",
    fontFamily: Fonts.LeagueSpartanBold,
    fontSize: 15,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 999,
    marginTop: 1,
  },

  primaryBtn: {
    flex: 1,
    backgroundColor: "#e95322",
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryBtnText: {
    color: "#fff",
    fontFamily: Fonts.LeagueSpartanBold,
    fontSize: 14,
  },
  iconBtnOutline: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
  },
  cancelBtn: {
    marginTop: 10,
    borderWidth: 1.5,
    borderColor: "#ef4444",
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelBtnText: {
    color: "#ef4444",
    fontFamily: Fonts.LeagueSpartanBold,
    fontSize: 14,
  },

  emptyTitle: {
    color: "#9ca3af",
    fontFamily: Fonts.LeagueSpartanMedium,
    fontSize: 16,
    marginBottom: 6,
  },
  emptySub: {
    color: "#6b7280",
    fontFamily: Fonts.LeagueSpartanRegular,
    fontSize: 14,
  },

  statusBadge: {
    backgroundColor: "#f3f4f6",
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginTop: 4,
    alignSelf: "flex-start",
  },
  statusText: {
    color: "#374151",
    fontFamily: Fonts.LeagueSpartanSemiBold,
    fontSize: 11,
  },
  tapHint: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 4,
  },
  tapHintText: {
    fontSize: 10,
    fontFamily: Fonts.LeagueSpartanRegular,
    color: "#6b7280",
  },

  // Modal styles
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  modalTitle: {
    fontSize: 20,
    fontFamily: Fonts.LeagueSpartanBold,
    color: "#111827",
  },
  modalSubtitle: {
    fontSize: 14,
    fontFamily: Fonts.LeagueSpartanRegular,
    color: "#6b7280",
    marginTop: 2,
  },
  closeButton: {
    padding: 8,
    borderRadius: 999,
    backgroundColor: "#f3f4f6",
  },
  detailSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: Fonts.LeagueSpartanBold,
    color: "#111827",
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  detailLabel: {
    fontSize: 14,
    fontFamily: Fonts.LeagueSpartanMedium,
    color: "#6b7280",
  },
  detailValue: {
    fontSize: 14,
    fontFamily: Fonts.LeagueSpartanSemiBold,
    color: "#111827",
  },
  locationCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    padding: 16,
    backgroundColor: "#f9fafb",
    borderRadius: 12,
    marginBottom: 8,
  },
  locationName: {
    fontSize: 16,
    fontFamily: Fonts.LeagueSpartanBold,
    color: "#111827",
    marginBottom: 4,
  },
  locationLabel: {
    fontSize: 12,
    fontFamily: Fonts.LeagueSpartanRegular,
    color: "#6b7280",
  },
  locationAddress: {
    fontSize: 14,
    fontFamily: Fonts.LeagueSpartanRegular,
    color: "#374151",
    marginBottom: 4,
  },
  locationPhone: {
    fontSize: 14,
    fontFamily: Fonts.LeagueSpartanMedium,
    color: "#3b82f6",
  },
  foodItem: {
    backgroundColor: "#f9fafb",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  foodItemHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  foodName: {
    fontSize: 16,
    fontFamily: Fonts.LeagueSpartanBold,
    color: "#111827",
    flex: 1,
  },
  foodQuantity: {
    fontSize: 14,
    fontFamily: Fonts.LeagueSpartanBold,
    color: "#e95322",
  },
  foodItemFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  foodPrice: {
    fontSize: 12,
    fontFamily: Fonts.LeagueSpartanRegular,
    color: "#6b7280",
  },
  foodSubtotal: {
    fontSize: 14,
    fontFamily: Fonts.LeagueSpartanBold,
    color: "#e95322",
  },
  foodNote: {
    fontSize: 12,
    fontFamily: Fonts.LeagueSpartanRegular,
    color: "#6b7280",
    marginTop: 8,
    fontStyle: "italic",
  },
  emptyFood: {
    alignItems: "center",
    padding: 24,
    backgroundColor: "#f9fafb",
    borderRadius: 12,
  },
  emptyFoodText: {
    fontSize: 14,
    fontFamily: Fonts.LeagueSpartanMedium,
    color: "#6b7280",
    marginBottom: 8,
  },
  emptyFoodSubtext: {
    fontSize: 12,
    fontFamily: Fonts.LeagueSpartanRegular,
    color: "#9ca3af",
    textAlign: "center",
  },
  modalActions: {
    paddingTop: 16,
    marginTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
  },
  modalActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#fef3f2",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#fed7d6",
  },
  modalActionText: {
    fontSize: 14,
    fontFamily: Fonts.LeagueSpartanBold,
    color: "#e95322",
  },
});
