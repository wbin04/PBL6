// components/Sidebar.tsx
"use client";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Modal,
  View,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Dimensions,
  Text,
  Pressable,
} from "react-native";
import { X, Truck, ShoppingBag } from "lucide-react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Fonts } from "@/constants/Fonts";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation } from "@react-navigation/native";
import { useSelector } from "react-redux";
import { RootState } from "@/store";

type Role = "customer" | "shipper";

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  currentRole?: Role;
  onSwitchRole?: (next: Role) => void;
}

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const PANEL_WIDTH = Math.min(320, Math.round(SCREEN_WIDTH * 0.82));
const APP_ORANGE = "#e95322";

export default function Sidebar({ isOpen, onClose, currentRole, onSwitchRole }: SidebarProps) {
  const translateX = useRef(new Animated.Value(-PANEL_WIDTH)).current;
  const navigation = useNavigation<any>();
  const [roleState, setRoleState] = useState<Role>("customer");
  
  // Get user from Redux store
  const { user } = useSelector((state: RootState) => state.auth);

  // Determine if user can access shipper features
  const canAccessShipper = useMemo(() => {
    if (!user) return false;
    // Only "Người vận chuyển" can access both customer and shipper features
    return user.role === 'Người vận chuyển';
  }, [user]);

  useEffect(() => {
    const load = async () => {
      if (currentRole) {
        setRoleState(currentRole);
        return;
      }
      const v = await AsyncStorage.getItem("activeRole");
      setRoleState(v === "shipper" ? "shipper" : "customer");
    };
    if (isOpen) load();
  }, [isOpen, currentRole]);

  useEffect(() => {
    Animated.timing(translateX, {
      toValue: isOpen ? 0 : -PANEL_WIDTH,
      duration: 240,
      useNativeDriver: true,
    }).start();
  }, [isOpen, translateX]);

  const setRoleAndGo = async (next: Role, to: string) => {
    setRoleState(next);
    onSwitchRole?.(next);
    await AsyncStorage.setItem("activeRole", next);
    onClose();
    navigation.reset({ index: 0, routes: [{ name: "MainTabs" }] });
  };

  const isShipper = useMemo(() => roleState === "shipper", [roleState]);
  const isCustomer = useMemo(() => roleState === "customer", [roleState]);

  if (!isOpen) return null;

  return (
    <Modal visible={isOpen} transparent animationType="none" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <Animated.View style={[styles.panel, { transform: [{ translateX }] }]}>
          <SafeAreaView style={{ flex: 1 }}>
            <View style={styles.header}>
              <Text style={styles.title}>Menu</Text>
              <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <X size={22} color="#fff" />
              </TouchableOpacity>
            </View>

            {/* Shipper Option - Only show if user role is "Người vận chuyển" */}
            {canAccessShipper && (
              <TouchableOpacity
                style={[styles.card, isShipper ? styles.cardActive : styles.cardInactive]}
                activeOpacity={0.9}
                onPress={() => setRoleAndGo("shipper", "/shipper")}
              >
                <View style={styles.cardIconWrap}>
                  <Truck size={20} color={APP_ORANGE} />
                </View>
                <View style={styles.cardTextWrap}>
                  <Text style={styles.cardTitle}>Giao hàng</Text>
                  <Text style={styles.cardDesc}>{isShipper ? "Đang sử dụng" : "Chuyển sang giao hàng"}</Text>
                </View>
              </TouchableOpacity>
            )}

            {/* Customer Option - Always show */}
            <TouchableOpacity
              style={[styles.card, isCustomer ? styles.cardActive : styles.cardInactive]}
              activeOpacity={0.9}
              onPress={() => setRoleAndGo("customer", "/")}
            >
              <View style={styles.cardIconWrap}>
                <ShoppingBag size={20} color={APP_ORANGE} />
              </View>
              <View style={styles.cardTextWrap}>
                <Text style={styles.cardTitle}>Mua hàng</Text>
                <Text style={styles.cardDesc}>{isCustomer ? "Đang sử dụng" : "Chuyển sang mua hàng"}</Text>
              </View>
            </TouchableOpacity>

            <View style={styles.footerWrap}>
              <View style={styles.footerLine} />
              <Text style={styles.footerText}>
                {user?.role === 'Người vận chuyển' 
                  ? (isCustomer ? "Khách hàng" : "Shipper") + " - Chọn chế độ phù hợp"
                  : "Khách hàng"
                }
              </Text>
            </View>
          </SafeAreaView>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    flexDirection: "row",
    justifyContent: "flex-start",
  },
  panel: {
    width: PANEL_WIDTH,
    height: "100%",
    backgroundColor: APP_ORANGE,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 32,
    borderTopRightRadius: 24,
    borderBottomRightRadius: 24,
    overflow: "hidden",
    elevation: 12,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  title: {
    fontSize: 22,
    fontFamily: Fonts.LeagueSpartanBold,
    color: "#fff",
  },
  card: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 14,
    marginBottom: 12,
  },
  cardActive: {
    backgroundColor: "rgba(255,255,255,0.2)",
  },
  cardInactive: {
    backgroundColor: "rgba(255,255,255,0.1)",
  },
  cardIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  cardTextWrap: { flex: 1 },
  cardTitle: {
    fontSize: 16,
    color: "#fff",
    fontFamily: Fonts.LeagueSpartanSemiBold,
    marginBottom: 4,
  },
  cardDesc: {
    fontSize: 13,
    color: "rgba(255,255,255,0.9)",
    fontFamily: Fonts.LeagueSpartanRegular,
    lineHeight: 18,
  },
  footerWrap: {
    position: "absolute",
    left: 16,
    right: 16,
    bottom: 28,
  },
  footerLine: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.25)",
    marginBottom: 12,
  },
  footerText: {
    textAlign: "center",
    fontSize: 13,
    color: "rgba(255,255,255,0.7)",
    fontFamily: Fonts.LeagueSpartanRegular,
  },
});
