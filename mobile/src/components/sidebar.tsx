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
import { X, Truck, ShoppingBag, User, LogOut } from "lucide-react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Fonts } from "@/constants/Fonts";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation } from "@react-navigation/native";
import { useSelector, useDispatch } from "react-redux";
import { RootState, AppDispatch } from "@/store";
import { logout } from "@/store/slices/authSlice";

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
  const dispatch = useDispatch<AppDispatch>();
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
    console.log('Sidebar - switching to role:', next);
    setRoleState(next);
    onSwitchRole?.(next);
    await AsyncStorage.setItem("activeRole", next);
    onClose();
    
    // Add a small delay to ensure AsyncStorage is updated before navigation
    setTimeout(() => {
      navigation.reset({ index: 0, routes: [{ name: "MainTabs" }] });
    }, 100);
  };

  const handleLogout = async () => {
    try {
      // Clear AsyncStorage
      await AsyncStorage.removeItem("activeRole");
      await AsyncStorage.removeItem("token");
      
      // Dispatch logout action to Redux
      dispatch(logout());
      
      // Close sidebar and navigate to login
      onClose();
      
      // Reset navigation stack to login screen
      setTimeout(() => {
        navigation.reset({
          index: 0,
          routes: [{ name: "Login" }],
        });
      }, 100);
    } catch (error) {
      console.error('Logout error:', error);
    }
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

            {/* Admin Dashboard Option - Only show if user is admin */}
            {user?.role === 'Quản lý' && (
              <TouchableOpacity
                style={[styles.card, styles.cardInactive]}
                activeOpacity={0.9}
                onPress={() => {
                  onClose();
                  setTimeout(() => {
                    navigation.reset({ 
                      index: 0, 
                      routes: [{ name: "AdminDashboard" }] 
                    });
                  }, 100);
                }}
              >
                <View style={styles.cardIconWrap}>
                  <User size={20} color={APP_ORANGE} />
                </View>
                <View style={styles.cardTextWrap}>
                  <Text style={styles.cardTitle}>Quản lý</Text>
                  <Text style={styles.cardDesc}>Chuyển về trang quản lý</Text>
                </View>
              </TouchableOpacity>
            )}

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
              
              {/* Logout Button */}
              <TouchableOpacity
                style={[styles.card, styles.logoutCard]}
                activeOpacity={0.9}
                onPress={handleLogout}
              >
                <View style={styles.cardIconWrap}>
                  <LogOut size={20} color="#ff4444" />
                </View>
                <View style={styles.cardTextWrap}>
                  <Text style={[styles.cardTitle, styles.logoutText]}>Đăng xuất</Text>
                  <Text style={[styles.cardDesc, styles.logoutDesc]}>Thoát khỏi tài khoản</Text>
                </View>
              </TouchableOpacity>
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
    marginTop: "auto",
    paddingTop: 20,
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
    marginBottom: 16,
  },
  logoutCard: {
    marginTop: 0,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
    backgroundColor: "rgba(255,255,255,0.1)",
  },
  logoutText: {
    color: "rgba(255,255,255,0.7)",
  },
  logoutDesc: {
    color: "rgba(255,255,255,0.7)",
  },
});
