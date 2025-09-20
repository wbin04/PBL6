import React, { useMemo, useState, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Linking,
  Alert,
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
import { useDatabase } from "@/hooks/useDatabase";

type UITabStatus = "new" | "accepted" | "delivered" | "cancelled";

type UIOrder = {
  id: string;
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
};

// DB -> Tab UI
const mapDbStatusToTab = (dbStatus: string): UITabStatus => {
  switch (dbStatus) {
    case "pending":
    case "preparing":
      return "new";
    case "delivering":
      return "accepted";
    case "delivered":
    case "completed":
      return "delivered";
    case "cancelled":
    case "failed":
    case "refunded":
    default:
      return "cancelled";
  }
};

const vnd = (n: number) =>
  n.toLocaleString("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 });

type LocalState = Record<
  string,
  {
    callCount?: number;
    arrived?: boolean;
    uiStatus?: UITabStatus; // trạng thái UI override
  }
>;

export default function ShipperOrdersScreen() {
  const insets = useSafeAreaInsets();
  const { getOrders, getRestaurants, getUsers, getAddressesByUser } = useDatabase();

  const [activeOrderTab, setActiveOrderTab] = useState<UITabStatus>("new");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [localState, setLocalState] = useState<LocalState>({});

  // DB -> UIOrder (có override status từ localState)
  const uiOrders: UIOrder[] = useMemo(() => {
    const orders = getOrders();
    const restaurants = getRestaurants();
    const users = getUsers();

    return orders.map((o) => {
      const subTotal = o.items.reduce((sum, it) => sum + (it.price || 0) * (it.qty || 0), 0);

      const firstItem = o.items[0];
      let restaurantName = "Nhà hàng";
      if (firstItem && firstItem.restaurantId != null) {
        const r = restaurants.find((x) => x.id === firstItem.restaurantId);
        if (r) restaurantName = r.name;
      }

      const u = users.find((x) => x.id === o.userId);
      const customerName = (u as any)?.fullName || (u as any)?.name || "Khách hàng";
      const customerPhone = (u as any)?.phone || "";

      const addrs = getAddressesByUser(o.userId);
      const defaultAddr = addrs.find((a) => a.isDefault) || addrs[0];
      const addressLine = defaultAddr
        ? [defaultAddr.line1, defaultAddr.ward, defaultAddr.district, defaultAddr.city]
            .filter(Boolean)
            .join(", ")
        : "Chưa có địa chỉ";

      const t = new Date(o.createdAt);
      const hh = String(t.getHours()).padStart(2, "0");
      const mm = String(t.getMinutes()).padStart(2, "0");

      const itemDescs = o.items.map((it) => `Món #${it.foodId} x${it.qty}`);

      const local = localState[o.id] || {};
      const status = local.uiStatus ?? mapDbStatusToTab(o.status);

      return {
        id: o.id,
        restaurant: restaurantName,
        customer: customerName,
        address: addressLine,
        phone: customerPhone,
        items: itemDescs,
        total: vnd(subTotal),
        time: `${hh}:${mm}`,
        distance: "--",
        status,
        callCount: local.callCount || 0,
        arrived: !!local.arrived,
      };
    });
  }, [getOrders, getRestaurants, getUsers, getAddressesByUser, localState]);

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
  const patchLocal = useCallback((id: string, patch: Partial<LocalState[string]>) => {
    setLocalState((prev) => ({
      ...prev,
      [id]: { ...prev[id], ...patch },
    }));
  }, []);

  // --- Flow nút ---
  // Nhận đơn -> sang tab "Đã nhận"
  const handleAccept = (id: string) => {
    patchLocal(id, { callCount: 0, arrived: false, uiStatus: "accepted" });
    setActiveOrderTab("accepted");
  };

  // Đã đến quán -> bật cờ arrived
  const handleArrivedAtRestaurant = (id: string) => patchLocal(id, { arrived: true });

  // Giao thành công -> sang tab "Đã giao"
  const handleMarkDelivered = (id: string) => {
    patchLocal(id, { uiStatus: "delivered" });
    setActiveOrderTab("delivered");
  };

  // Huỷ đơn (khi gọi >= 3 lần)
  const handleCancel = (id: string) => {
    patchLocal(id, { uiStatus: "cancelled" });
    setActiveOrderTab("cancelled");
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
        >
          {filteredOrders.length === 0 ? (
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
                      <>
                        <PrimaryBtn title="Nhận đơn" onPress={() => handleAccept(order.id)} />
                        {/*   */}
                      </>
                    )}

                    {activeOrderTab === "accepted" && (
                      <>
                        {!arrived ? (
                          <PrimaryBtn title="Đã đến quán" onPress={() => handleArrivedAtRestaurant(order.id)} />
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
