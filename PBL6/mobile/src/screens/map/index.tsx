import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Linking,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import MapView, { Marker, Region } from "react-native-maps";
import * as Location from "expo-location";
import BottomSheet, { BottomSheetView } from "@gorhom/bottom-sheet";

import {
  Menu as MenuIcon,
  Bell,
  Navigation,
  Phone,
  Clock,
} from "lucide-react-native";

import Sidebar from "@/components/sidebar";
import { Fonts } from "@/constants/Fonts";

type OrderStatus = "going_to_merchant" | "at_merchant" | "picked_up";

type Order = {
  id: string;
  eta: string;
  restaurant: string;
  restaurantAddress: string;
  customer: string;
  customerAddress: string;
  total: string;
  distance: string;
  status: OrderStatus;
  restaurantLocation: { latitude: number; longitude: number };
  customerLocation: { latitude: number; longitude: number };
};

const INITIAL_ORDERS: Order[] = [
  {
    id: "DH001",
    eta: "12'",
    restaurant: "Nhà Hàng Rose Garden",
    restaurantAddress: "123 Đường ABC, Quận 1",
    customer: "Nguyễn Văn A",
    customerAddress: "456 Đường XYZ, Quận 3",
    total: "170.000 VNĐ",
    distance: "2.5km",
    status: "going_to_merchant",
    restaurantLocation: { latitude: 10.776889, longitude: 106.700806 },
    customerLocation: { latitude: 10.7655, longitude: 106.681 },
  },
  {
    id: "DH002",
    eta: "18'",
    restaurant: "Bếp Tokyo",
    restaurantAddress: "789 Đường DEF, TP Thủ Đức",
    customer: "Trần Thị B",
    customerAddress: "321 Đường GHI, Quận 4",
    total: "180.000 VNĐ",
    distance: "3.1km",
    status: "picked_up",
    restaurantLocation: { latitude: 10.787, longitude: 106.7496 },
    customerLocation: { latitude: 10.7632, longitude: 106.7066 },
  },
];

export default function ShipperMapScreen() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [orders, setOrders] = useState<Order[]>(INITIAL_ORDERS);
  const [selectedOrder, setSelectedOrder] = useState(0);
  const [locGranted, setLocGranted] = useState(false);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);

  const mapRef = useRef<MapView>(null);

  const snapPoints = useMemo(() => ["18%", "44%", "88%"], []);

  useEffect(() => {
    (async () => {
      try {
        const { status, canAskAgain } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
          setLocGranted(false);
          if (canAskAgain === false) {
            Alert.alert("Quyền vị trí bị tắt", "Hãy bật Location permission trong Cài đặt hệ thống.");
          }
          return;
        }
        setLocGranted(true);

        const last = await Location.getLastKnownPositionAsync();
        if (last?.coords) {
          const { latitude, longitude } = last.coords;
          setUserLocation({ latitude, longitude });
          mapRef.current?.animateToRegion(
            { latitude, longitude, latitudeDelta: 0.01, longitudeDelta: 0.01 },
            400
          );
        }

        const current = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
        const { latitude, longitude } = current.coords;
        setUserLocation({ latitude, longitude });
        mapRef.current?.animateToRegion(
          { latitude, longitude, latitudeDelta: 0.01, longitudeDelta: 0.01 },
          400
        );
      } catch (err) {
        console.warn("Không lấy được vị trí:", err);
        setLocGranted(false);
      }
    })();
  }, []);

  const activeOrder = orders[selectedOrder];

  // Region khởi tạo: ưu tiên vị trí của user; nếu chưa có thì dùng vị trí order; cuối cùng fallback Q1
  const initialRegion: Region = useMemo(() => {
    const fallback = { latitude: 10.776889, longitude: 106.700806 };
    const src =
      userLocation ??
      activeOrder?.restaurantLocation ??
      activeOrder?.customerLocation ??
      fallback;
    return {
      latitude: src.latitude,
      longitude: src.longitude,
      latitudeDelta: 0.05,
      longitudeDelta: 0.05,
    };
  }, [userLocation, activeOrder]);

  const onPressPrimary = () => {
    setOrders((prev) => {
      const next = [...prev];
      const o = next[selectedOrder];
      if (!o) return prev;
      if (o.status === "going_to_merchant") {
        next[selectedOrder] = { ...o, status: "at_merchant" };
      } else if (o.status === "at_merchant") {
        next[selectedOrder] = { ...o, status: "picked_up" };
      } else if (o.status === "picked_up") {
        Alert.alert("Hoàn tất", "Bạn đã giao hàng xong đơn này!");
      }
      return next;
    });
  };

  const handleCall = () => {
    const phone = "0901234567";
    Linking.openURL(`tel:${phone}`).catch(() =>
      Alert.alert("Không thể gọi điện")
    );
  };

  // Recenter về vị trí người dùng (nếu có), nếu không thì về điểm đích phù hợp với trạng thái đơn
  const recenter = () => {
    if (userLocation) {
      mapRef.current?.animateToRegion(
        {
          latitude: userLocation.latitude,
          longitude: userLocation.longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        },
        400
      );
      return;
    }

    if (!activeOrder) return;
    const target =
      activeOrder.status === "going_to_merchant" || activeOrder.status === "at_merchant"
        ? activeOrder.restaurantLocation
        : activeOrder.customerLocation;

    if (!target) return;
    mapRef.current?.animateToRegion(
      {
        latitude: target.latitude,
        longitude: target.longitude,
        latitudeDelta: 0.03,
        longitudeDelta: 0.03,
      },
      400
    );
  };

  return (
    <View style={styles.screen}>
      {/* Sidebar */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Map */}
      <View style={{ flex: 1 }}>
        <MapView
          ref={mapRef}
          style={{ flex: 1 }}
          initialRegion={initialRegion}
          showsUserLocation={locGranted}
          showsMyLocationButton={false}
        >
          {activeOrder && (
            <>
              <Marker
                coordinate={activeOrder.restaurantLocation}
                title={activeOrder.restaurant}
                description={activeOrder.restaurantAddress}
                pinColor="#e95322"
              />
              <Marker
                coordinate={activeOrder.customerLocation}
                title={activeOrder.customer}
                description={activeOrder.customerAddress}
              />
            </>
          )}
        </MapView>

        <SafeAreaView edges={["top"]} style={styles.headerOverlay}>
          <View style={styles.headerRow}>
            <TouchableOpacity
              onPress={() => setSidebarOpen(true)}
              style={styles.circleWhite}
            >
              <MenuIcon size={24} color={"#e95322"} />
            </TouchableOpacity>

            <TouchableOpacity style={styles.circleWhite}>
              <Bell size={24} color={"#e95322"} />
            </TouchableOpacity>
          </View>
        </SafeAreaView>

        {orders.length > 1 && (
          <View style={styles.chipsWrap}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={{ flexDirection: "row" }}>
                {orders.map((order, index) => {
                  const active = index === selectedOrder;
                  return (
                    <TouchableOpacity
                      key={order.id}
                      onPress={() => setSelectedOrder(index)}
                      style={[
                        styles.chip,
                        {
                          backgroundColor: active ? "#e95322" : "rgba(255,255,255,0.9)",
                          marginRight: 8,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.chipText,
                          { color: active ? "#fff" : "#374151" },
                        ]}
                      >
                        #{order.id} • {order.eta}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>
          </View>
        )}

        {/* ETA Pill */}
        {activeOrder && (
          <View style={styles.etaPill}>
            <View style={styles.etaPillInner}>
              <Clock size={14} color="#fff" />
              <Text style={styles.etaText}>
                ~{activeOrder.eta} • {activeOrder.distance}
              </Text>
            </View>
          </View>
        )}

        {/* Re-center FAB */}
        <View style={styles.recenterFab}>
          <TouchableOpacity onPress={recenter} style={styles.circleWhite}>
            <Navigation size={20} color="#4b5563" />
          </TouchableOpacity>
        </View>

        {/* Bottom Sheet*/}
        {activeOrder && (
          <BottomSheet
            index={0}
            snapPoints={snapPoints}
            enablePanDownToClose={false}
            handleIndicatorStyle={{ backgroundColor: "#e5e7eb" }}
            backgroundStyle={{
              backgroundColor: "#fff",
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
            }}
          >
            <BottomSheetView style={{ paddingHorizontal: 16, paddingBottom: 20, paddingTop: 8 }}>
              {/* From/To */}
              <View style={{ marginBottom: 12 }}>
                <View style={styles.row}>
                  <View style={[styles.dot, { backgroundColor: "#e95322" }]} />
                  <View>
                    <Text style={styles.titleMd}>{activeOrder.restaurant}</Text>
                    <Text style={styles.mutedSm}>{activeOrder.restaurantAddress}</Text>
                  </View>
                </View>

                <View style={[styles.row, { marginTop: 10 }]}>
                  <View style={[styles.dot, { backgroundColor: "#22c55e" }]} />
                  <View>
                    <Text style={styles.titleMd}>{activeOrder.customer}</Text>
                    <Text style={styles.mutedSm}>{activeOrder.customerAddress}</Text>
                  </View>
                </View>
              </View>

              {/* Summary */}
              <View style={styles.summaryBox}>
                <View style={styles.summaryRow}>
                  <View>
                    <Text style={styles.mutedSm}>Tổng tiền</Text>
                    <Text style={styles.totalText}>{activeOrder.total}</Text>
                  </View>
                  <View style={{ alignItems: "flex-end" }}>
                    <Text style={styles.mutedSm}>Thanh toán</Text>
                    <Text style={styles.payMethod}>Tiền mặt</Text>
                  </View>
                </View>
              </View>

              {/* Actions */}
              <View style={{ flexDirection: "row" }}>
                <TouchableOpacity
                  style={[styles.primaryBtn, { marginRight: 10 }]}
                  onPress={onPressPrimary}
                >
                  <Text style={styles.primaryBtnText}>
                    {activeOrder.status === "going_to_merchant" && "Đã đến quán"}
                    {activeOrder.status === "at_merchant" && "Đã lấy hàng"}
                    {activeOrder.status === "picked_up" && "Đã giao hàng"}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.iconBtn} onPress={handleCall}>
                  <Phone size={20} color="#4b5563" />
                </TouchableOpacity>
              </View>
            </BottomSheetView>
          </BottomSheet>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#fff",
  },

  headerOverlay: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
    backgroundColor: "rgba(0,0,0,0.25)",
  },

  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between", 
  },

  circleWhite: {
    backgroundColor: "#fff",
    borderRadius: 999,
    padding: 8,
  },

  chipsWrap: {
    position: "absolute",
    top: 86,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
  },

  chip: {
    marginTop: 12,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
  },

  chipText: {
    fontFamily: Fonts.LeagueSpartanSemiBold,
    fontSize: 13,
  },

  etaPill: {
    position: "absolute",
    top: 130,
    right: 16,
  },

  etaPillInner: {
    backgroundColor: "#e95322",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    flexDirection: "row",
    alignItems: "center",
    elevation: 3,
  },

  etaText: {
    color: "#fff",
    fontFamily: Fonts.LeagueSpartanSemiBold,
    fontSize: 13,
    marginLeft: 6,
  },

  recenterFab: {
    position: "absolute",
    top: 180,
    right: 16,
  },

  row: {
    flexDirection: "row",
    alignItems: "center",
  },

  dot: {
    width: 10,
    height: 10,
    borderRadius: 999,
    marginRight: 10,
  },

  titleMd: {
    fontFamily: Fonts.LeagueSpartanSemiBold,
    fontSize: 14,
    color: "#111827",
  },

  mutedSm: {
    fontFamily: Fonts.LeagueSpartanRegular,
    fontSize: 12,
    color: "#6b7280",
  },

  summaryBox: {
    backgroundColor: "#f9fafb",
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },

  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  totalText: {
    fontFamily: Fonts.LeagueSpartanBold,
    fontSize: 18,
    color: "#111827",
  },

  payMethod: {
    fontFamily: Fonts.LeagueSpartanSemiBold,
    fontSize: 14,
    color: "#111827",
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

  iconBtn: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#d1d5db",
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
});
