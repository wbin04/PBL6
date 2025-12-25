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
import { X, Truck, ShoppingBag, User, LogOut, UserPlus, Store } from "lucide-react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Fonts } from "@/constants/Fonts";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation } from "@react-navigation/native";
import { useSelector, useDispatch } from "react-redux";
import { RootState, AppDispatch } from "@/store";
import { logout } from "@/store/slices/authSlice";
import { authApi } from "@/services/api";
import { Alert } from "react-native";

type Role = "customer" | "shipper" | "seller" | "admin";

type MenuItem = {
  title: string;
  icon: any;
  section: string;
};

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  currentRole?: Role;
  onSwitchRole?: (next: Role) => void;
  menuItems?: MenuItem[];
  onMenuItemPress?: (section: string) => void;
  hitSlop?: { top?: number; bottom?: number; left?: number; right?: number };
}

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const PANEL_WIDTH = Math.min(320, Math.round(SCREEN_WIDTH * 0.82));
const APP_ORANGE = "#e95322";

export default function Sidebar({ isOpen, onClose, currentRole, onSwitchRole, menuItems, onMenuItemPress, hitSlop }: SidebarProps) {
  const translateX = useRef(new Animated.Value(-PANEL_WIDTH)).current;
  const navigation = useNavigation<any>();
  const dispatch = useDispatch<AppDispatch>();
  const [roleState, setRoleState] = useState<Role>("customer");
  const [registrationStatus, setRegistrationStatus] = useState<{
    is_shipper_registered: boolean | null;
    is_store_registered: boolean | null;
  }>({
    is_shipper_registered: null,
    is_store_registered: null
  });
  const [loading, setLoading] = useState(false);
  
  // Get user from Redux store
  const { user } = useSelector((state: RootState) => state.auth);

  // Determine if user can access shipper features
  const canAccessShipper = useMemo(() => {
    if (!user) return false;
    // Check both role name and role_id (4 = Người vận chuyển)
    return user.role === 'Người vận chuyển' || user.role_id === 4;
  }, [user]);

  const canAccessSeller = useMemo(() => {
    if (!user) return false;
    // Check both role name and role_id (3 = Chủ cửa hàng)
    return user.role === 'Chủ cửa hàng' || user.role_id === 3;
  }, [user]);

  useEffect(() => {
    const load = async () => {
      if (currentRole) {
        setRoleState(currentRole);
        return;
      }
      const v = await AsyncStorage.getItem("activeRole");
      if (v === "shipper" || v === "seller" || v === "customer" || v === "admin") {
        setRoleState(v as Role);
        return;
      }
      
      // Check both role name and role_id
      if (user?.role === 'Chủ cửa hàng' || user?.role_id === 3) {
        setRoleState("seller");
        return;
      }
      if (user?.role === 'Người vận chuyển' || user?.role_id === 4) {
        setRoleState("shipper");
        return;
      }
      if (user?.role === 'Quản lý' || user?.role_id === 2) {
        setRoleState("admin");
        return;
      }
      setRoleState("customer");
    };
    
    const loadRegistrationStatus = async () => {
      if (!user) return;
      try {
        const response: any = await authApi.getRegistrationStatus();
        setRegistrationStatus(response.data);
      } catch (error) {
        console.error('Failed to load registration status:', error);
      }
    };
    
    if (isOpen) {
      load();
      loadRegistrationStatus();
    }
  }, [isOpen, currentRole, user]);

  useEffect(() => {
    Animated.timing(translateX, {
      toValue: isOpen ? 0 : -PANEL_WIDTH,
      duration: 240,
      useNativeDriver: true,
    }).start();
  }, [isOpen, translateX]);

  const setRoleAndGo = async (next: Role) => {
    console.log('Sidebar - switching to role:', next);
    setRoleState(next);
    onSwitchRole?.(next);
    await AsyncStorage.setItem("activeRole", next);
    onClose();
    
    // Navigate to MainTabs for all roles
    // MainTabs will handle showing the correct bottom bar based on activeRole
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
      // App.tsx will automatically handle navigation to Login screen
      dispatch(logout());
      
      // Close sidebar
      onClose();
      
      console.log('Logout successful, App.tsx will handle navigation');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const handleShipperRegistration = async () => {
    if (loading) return;
    
    const isCurrentlyRegistered = registrationStatus?.is_shipper_registered || false;
    const action = isCurrentlyRegistered ? "hủy đăng ký" : "đăng ký";
    
    Alert.alert(
      `${action} Shipper`,
      `Bạn có chắc muốn ${action} làm shipper không?`,
      [
        { text: "Hủy", style: "cancel" },
        {
          text: "Xác nhận",
          onPress: async () => {
            try {
              setLoading(true);
              const newStatus = !isCurrentlyRegistered;
              await authApi.updateShipperRegistration(newStatus);
              
              setRegistrationStatus(prev => ({
                ...prev,
                is_shipper_registered: newStatus
              }));
              
              Alert.alert(
                "Thành công",
                `${newStatus ? "Đăng ký" : "Hủy đăng ký"} shipper thành công!`
              );
            } catch (error: any) {
              console.error('Shipper registration error:', error);
              Alert.alert(
                "Lỗi", 
                error?.response?.data?.message || `${action} shipper thất bại`
              );
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  const handleStoreRegistration = async () => {
    if (loading) return;
    
    const isCurrentlyRegistered = registrationStatus?.is_store_registered || false;
    const action = isCurrentlyRegistered ? "hủy đăng ký" : "đăng ký";
    
    Alert.alert(
      `${action} Cửa hàng`,
      `Bạn có chắc muốn ${action} cửa hàng không?`,
      [
        { text: "Hủy", style: "cancel" },
        {
          text: "Xác nhận",
          onPress: async () => {
            try {
              setLoading(true);
              const newStatus = !isCurrentlyRegistered;
              await authApi.updateStoreRegistration(newStatus);
              
              setRegistrationStatus(prev => ({
                ...prev,
                is_store_registered: newStatus
              }));
              
              Alert.alert(
                "Thành công",
                `${newStatus ? "Đăng ký" : "Hủy đăng ký"} cửa hàng thành công!`
              );
            } catch (error: any) {
              console.error('Store registration error:', error);
              Alert.alert(
                "Lỗi", 
                error?.response?.data?.message || `${action} cửa hàng thất bại`
              );
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  const isShipper = useMemo(() => roleState === "shipper", [roleState]);
  const isCustomer = useMemo(() => roleState === "customer", [roleState]);
  const isSeller = useMemo(() => roleState === "seller", [roleState]);
  const isAdmin = useMemo(() => roleState === "admin", [roleState]);

  if (!isOpen) return null;

  return (
    <Modal visible={isOpen} transparent animationType="none" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <Animated.View style={[styles.panel, { transform: [{ translateX }] }]}>
          <SafeAreaView style={{ flex: 1 }}>
            <View style={styles.header}>
              <Text style={styles.title}>Menu</Text>
              <TouchableOpacity onPress={onClose} hitSlop={hitSlop || { top: 50, bottom: 10, left: 10, right: 10 }}>
                <X size={22} color="#fff" />
              </TouchableOpacity>
            </View>

            {/* Admin */}
            {(user?.role === 'Quản lý' || user?.role_id === 2) && (
              <TouchableOpacity
                style={[styles.card, isAdmin ? styles.cardActive : styles.cardInactive]}
                activeOpacity={0.9}
                onPress={() => setRoleAndGo("admin")}
              >
                <View style={styles.cardIconWrap}>
                  <User size={20} color={APP_ORANGE} />
                </View>
                <View style={styles.cardTextWrap}>
                  <Text style={styles.cardTitle}>Quản lý</Text>
                  <Text style={styles.cardDesc}>{isAdmin ? "Đang sử dụng" : "Chuyển về trang quản lý"}</Text>
                </View>
              </TouchableOpacity>
            )}

            {/* Seller */}
            {canAccessSeller && (
              <TouchableOpacity
                style={[styles.card, isSeller ? styles.cardActive : styles.cardInactive]}
                activeOpacity={0.9}
                onPress={() => setRoleAndGo("seller")}
              >
                <View style={styles.cardIconWrap}>
                  <Store size={20} color={APP_ORANGE} />
                </View>
                <View style={styles.cardTextWrap}>
                  <Text style={styles.cardTitle}>Quản lý cửa hàng</Text>
                  <Text style={styles.cardDesc}>{isSeller ? "Đang sử dụng" : "Chuyển về trang quản lý cửa hàng"}</Text>
                </View>
              </TouchableOpacity>
            )}

            {/* Registration Options - Only show if user is customer */}
            {(user?.role === 'Khách hàng' || user?.role_id === 1) && (
              <>
                {/* Shipper Registration */}
                <TouchableOpacity
                  style={[styles.card, 
                    registrationStatus?.is_shipper_registered 
                      ? styles.cardRegistered 
                      : styles.cardInactive
                  ]}
                  activeOpacity={0.9}
                  onPress={handleShipperRegistration}
                  disabled={loading}
                >
                  <View style={styles.cardIconWrap}>
                    <UserPlus size={20} color={
                      registrationStatus?.is_shipper_registered 
                        ? "#4CAF50" 
                        : APP_ORANGE
                    } />
                  </View>
                  <View style={styles.cardTextWrap}>
                    <Text style={styles.cardTitle}>
                      {registrationStatus?.is_shipper_registered 
                        ? "Hủy đăng ký Shipper" 
                        : "Đăng ký Shipper"
                      }
                    </Text>
                    <Text style={styles.cardDesc}>
                      {registrationStatus?.is_shipper_registered 
                        ? "Đã đăng ký làm shipper" 
                        : "Đăng ký để giao hàng"
                      }
                    </Text>
                  </View>
                </TouchableOpacity>

                {/* Store Registration */}
                <TouchableOpacity
                  style={[styles.card, 
                    registrationStatus?.is_store_registered 
                      ? styles.cardRegistered 
                      : styles.cardInactive
                  ]}
                  activeOpacity={0.9}
                  onPress={handleStoreRegistration}
                  disabled={loading}
                >
                  <View style={styles.cardIconWrap}>
                    <Store size={20} color={
                      registrationStatus?.is_store_registered 
                        ? "#4CAF50" 
                        : APP_ORANGE
                    } />
                  </View>
                  <View style={styles.cardTextWrap}>
                    <Text style={styles.cardTitle}>
                      {registrationStatus?.is_store_registered 
                        ? "Hủy đăng ký Cửa hàng" 
                        : "Đăng ký Cửa hàng"
                      }
                    </Text>
                    <Text style={styles.cardDesc}>
                      {registrationStatus?.is_store_registered 
                        ? "Đã đăng ký cửa hàng" 
                        : "Đăng ký bán hàng"
                      }
                    </Text>
                  </View>
                </TouchableOpacity>
              </>
            )}

            {/* Shipper */}
            {canAccessShipper && (
              <TouchableOpacity
                style={[styles.card, isShipper ? styles.cardActive : styles.cardInactive]}
                activeOpacity={0.9}
                onPress={() => setRoleAndGo("shipper")}
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

            {/* Customer - Always show */}
            <TouchableOpacity
              style={[styles.card, isCustomer ? styles.cardActive : styles.cardInactive]}
              activeOpacity={0.9}
              onPress={() => setRoleAndGo("customer")}
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
                {(user?.role === 'Quản lý' || user?.role_id === 2)
                  ? 'Bạn đang ở chế độ Quản lý'
                  : (user?.role === 'Chủ cửa hàng' || user?.role_id === 3)
                  ? (isCustomer ? 'Đang mua hàng như khách' : 'Đang quản lý cửa hàng')
                  : (user?.role === 'Người vận chuyển' || user?.role_id === 4)
                  ? (isCustomer ? 'Đang mua hàng như khách' : 'Đang giao hàng')
                  : 'Bạn đang ở chế độ Khách hàng'}
              </Text>
              
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
  cardRegistered: {
    backgroundColor: "rgba(76,175,80,0.2)",
    borderWidth: 1,
    borderColor: "rgba(76,175,80,0.4)",
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
  menuSection: {
    marginBottom: 8,
  },
  menuSectionTitle: {
    fontSize: 14,
    color: "rgba(255,255,255,0.8)",
    fontFamily: Fonts.LeagueSpartanBold,
    marginBottom: 8,
    marginLeft: 4,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
    marginBottom: 6,
    backgroundColor: "rgba(255,255,255,0.1)",
  },
  menuItemIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.95)",
    alignItems: "center",
    justifyContent: "center",
  },
  menuItemText: {
    fontSize: 15,
    color: "#fff",
    fontFamily: Fonts.LeagueSpartanSemiBold,
  },
  divider: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.2)",
    marginVertical: 12,
  },
});
