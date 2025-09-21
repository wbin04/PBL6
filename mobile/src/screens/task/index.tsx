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
  switch (delivery_status) {
    case "Chờ xác nhận":
      return "new";
    case "Đã xác nhận":
      return "accepted";
    case "Đã lấy hàng":
    case "Đang giao":
      return "delivering";
    case "Đã giao":
      return "delivered";
    case "Đã huỷ":
      return "cancelled";
    default:
      return "new";
  }
};

const vnd = (n: number) =>
  n.toLocaleString("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 });

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
          cancelled: "Đã huỷ",
        };

        if (activeOrderTab === "delivering") {
          // Fetch both "Đã lấy hàng" and "Đang giao"
          console.log('Fetching delivering orders...');
          const pickupOrders = await shipperService.getShipperOrders("Đã lấy hàng");
          const deliveringOrders = await shipperService.getShipperOrders("Đang giao");
          console.log('Pickup orders:', pickupOrders);
          console.log('Delivering orders:', deliveringOrders);
          fetchedOrders = [...(pickupOrders || []), ...(deliveringOrders || [])];
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
      
      const total = (order.total_after_discount || 0) + (order.shipping_fee || 0);
      
      const t = new Date(order.created_date);
      const hh = String(t.getHours()).padStart(2, "0");
      const mm = String(t.getMinutes()).padStart(2, "0");

      const itemDescs = (order.details || []).map((detail) => 
        `${detail?.food?.title || 'Unknown'} x${detail?.quantity || 0}`
      );

      const local = localState[order.id] || {};
      const status = mapDeliveryStatusToTab(order.delivery_status || '', order.order_status || '');

      return {
        id: order.id,
        restaurant: order.store?.store_name || 'Unknown',
        customer: order.user?.fullname || 'Unknown',
        address: order.ship_address || '',
        phone: order.phone_number || '',
        items: itemDescs,
        total: vnd(total),
        time: `${hh}:${mm}`,
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
      await fetchOrders();
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
            filteredOrders.map((order) => {
              const arrived = !!order.arrived;
              const showCancel = shouldShowCancel(order);

              return (
                <View key={order.id} style={styles.card}>
                  {/* Header đơn */}
                  <View style={styles.cardTopRow}>
                    <View>
                      <Text style={styles.orderId}>#{order.id}</Text>
                      <Text style={styles.graySm}>{order.time} • {order.distance}</Text>
                    </View>

                    <View style={{ alignItems: "flex-end" }}>
                      <Text style={styles.total}>{order.total}</Text>
                      {order.callCount ? (
                        <Text style={styles.graySm}>Đã gọi: {order.callCount} lần</Text>
                      ) : null}
                    </View>
                  </View>

                  {/* Thông tin */}
                  <View style={{ gap: 10, marginBottom: 12 }}>
                    <View style={styles.row}>
                      <View style={[styles.dot, { backgroundColor: "#e95322" }]} />
                      <View>
                        <Text style={styles.medium}>{order.restaurant}</Text>
                        <Text style={styles.graySm}>Nhà hàng</Text>
                      </View>
                    </View>

                    <View style={styles.row}>
                      <View style={[styles.dot, { backgroundColor: "#22c55e" }]} />
                      <View>
                        <Text style={styles.medium}>{order.customer}</Text>
                        <Text style={styles.graySm}>{order.address}</Text>
                      </View>
                    </View>
                  </View>

                  {/* Actions */}
                  <View style={{ flexDirection: "row", gap: 8 }}>
                    {activeOrderTab === "new" && (
                      <PrimaryBtn title="Nhận đơn" onPress={() => handleAccept(order.id)} />
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
                </View>
              );
            })
          )}
        </ScrollView>
      </SafeAreaView>

      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
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
});
