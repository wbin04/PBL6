import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Modal,
  Pressable,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  Menu,
  Bell,
  User,
  ToggleLeft,
  ToggleRight,
  Lock,
  Shield,
  Wallet,
  DollarSign,
  LogOut,
  Trash2,
  ChevronRight,
  CheckCircle2,
  X,
} from "lucide-react-native";
import { useNavigation } from "@react-navigation/native";
import { useDispatch } from 'react-redux';
import { AppDispatch } from '@/store';
import { logout } from '@/store/slices/authSlice';
import Sidebar from "@/components/sidebar";
import { Fonts } from "@/constants/Fonts";

function FaceScanModal({
  visible,
  onClose,
  onComplete,
}: {
  visible: boolean;
  onClose: () => void;
  onComplete: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const startScan = () => {
    setLoading(true);
    setDone(false);
    setTimeout(() => {
      setLoading(false);
      setDone(true);
    }, 1200);
  };

  const finish = () => {
    onComplete();
    setDone(false);
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <View style={styles.modalCard}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Xác thực khuôn mặt</Text>
            <Pressable onPress={onClose} hitSlop={12}>
              <X size={20} />
            </Pressable>
          </View>

          <View style={{ height: 24 }} />

          {!loading && !done && (
            <>
              <Text style={styles.modalText}>
                Đưa khuôn mặt vào khung hình để bắt đầu xác thực.
              </Text>
              <View style={{ height: 16 }} />
              <TouchableOpacity style={styles.primaryBtn} onPress={startScan}>
                <Text style={styles.primaryBtnText}>Bắt đầu quét</Text>
              </TouchableOpacity>
            </>
          )}

          {loading && (
            <View style={{ alignItems: "center", gap: 12 }}>
              <ActivityIndicator size="large" />
              <Text style={styles.modalText}>Đang xác thực…</Text>
            </View>
          )}

          {done && (
            <View style={{ alignItems: "center", gap: 8 }}>
              <CheckCircle2 size={42} color="#16a34a" />
              <Text style={styles.modalTitle}>Thành công!</Text>
              <Text style={styles.modalText}>
                Đã xác thực khuôn mặt, bạn có thể bật trạng thái hoạt động.
              </Text>
              <View style={{ height: 12 }} />
              <TouchableOpacity style={styles.primaryBtn} onPress={finish}>
                <Text style={styles.primaryBtnText}>Hoàn tất</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

export default function ShipperAccountScreen() {
  const navigation: any = useNavigation();
  const dispatch = useDispatch<AppDispatch>();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [isActive, setIsActive] = useState(false);
  const [showFaceScan, setShowFaceScan] = useState(false);

  const handleToggleActive = () => {
    if (!isActive) setShowFaceScan(true);
    else setIsActive(false);
  };

  const handleFaceScanComplete = () => {
    setIsActive(true);
    setShowFaceScan(false);
  };

  const handleLogout = async () => {
    try {
      await dispatch(logout()).unwrap();
      console.log('Logout successful, user will be redirected to login');
      // App.tsx will handle navigation to login screen
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const go = (screenName: string) => {
    navigation.navigate(screenName);
  };

  const goWallet = () => {
    // Không truyền dữ liệu. Màn ví tự đọc từ database.json.
    navigation.navigate("ShipperWallet");
  };

  return (
    <SafeAreaView style={styles.root} edges={["top", "left", "right"]}>
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <FaceScanModal
        visible={showFaceScan}
        onClose={() => setShowFaceScan(false)}
        onComplete={handleFaceScanComplete}
      />

      <SafeAreaView style={styles.header} edges={["top"]}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => setSidebarOpen(true)} style={styles.iconBtn}>
            <Menu size={22} color="#e95322" />
          </TouchableOpacity>

          <View style={{ flex: 1 }} />

          <View style={styles.iconBtn}>
            <Bell size={22} color="#e95322" />
          </View>
        </View>

        <Text style={styles.headerTitle}>Cài đặt</Text>
      </SafeAreaView>

      {/* Body */}
      <View style={styles.bodyWrap}>
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 28 }} showsVerticalScrollIndicator={false}>
          {/* Thông tin tài khoản */}
          <Text style={styles.sectionLabel}>Thông tin tài khoản</Text>

          <SettingItem
            icon={<User size={18} color="#fff" />}
            iconBg="#e95322"
            label="Hồ sơ cá nhân"
            onPress={() => go("ShipperProfile")}
          />

          <SettingItem
            icon={isActive ? <ToggleRight size={18} color="#fff" /> : <ToggleLeft size={18} color="#fff" />}
            iconBg={isActive ? "#22c55e" : "#9ca3af"}
            label="Trạng thái hoạt động"
            subLabel={isActive ? "Đang hoạt động" : "Không hoạt động"}
            rightBadge={{
              text: isActive ? "BẬT" : "TẮT",
              bg: isActive ? "#dcfce7" : "#f3f4f6",
              color: isActive ? "#15803d" : "#4b5563",
            }}
            onPress={handleToggleActive}
          />

          {/* Bảo mật & Quyền riêng tư */}
          <Text style={styles.sectionLabel}>Bảo mật & Quyền riêng tư</Text>

          <SettingItem
            icon={<Lock size={18} color="#fff" />}
            iconBg="#e95322"
            label="Password Setting"
            onPress={() => go("PasswordSetting")}
          />

          <SettingItem
            icon={<Shield size={18} color="#fff" />}
            iconBg="#a855f7"
            label="Xác thực 2 lớp"
            onPress={() => go("TwoFASetting")}
          />

          {/* Thanh toán */}
          <Text style={styles.sectionLabel}>Thanh toán</Text>

          <SettingItem
            icon={<Wallet size={18} color="#fff" />}
            iconBg="#6366f1"
            label="Quản lý ví điện tử"
            onPress={goWallet}
          />

          <SettingItem
            icon={<DollarSign size={18} color="#fff" />}
            iconBg="#f97316"
            label="Thiết lập phương thức rút tiền"
            onPress={() => go("WithdrawMethods")}
          />

          {/* Hành động hệ thống */}
          <Text style={styles.sectionLabel}>Hành động hệ thống</Text>

          <SettingItem
            icon={<Bell size={18} color="#fff" />}
            iconBg="#e95322"
            label="Notification Setting"
            onPress={() => go("NotificationSetting")}
          />

          <SettingItem
            icon={<LogOut size={18} color="#fff" />}
            iconBg="#2563eb"
            label="Đăng xuất"
            onPress={handleLogout}
          />

          <SettingItem
            icon={<Trash2 size={18} color="#fff" />}
            iconBg="#ef4444"
            label="Delete Account"
            destructive
            onPress={() => go("DeleteAccount")}
          />
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}


function SettingItem({
  icon,
  iconBg,
  label,
  subLabel,
  rightBadge,
  onPress,
  destructive,
}: {
  icon: React.ReactNode;
  iconBg: string;
  label: string;
  subLabel?: string;
  rightBadge?: { text: string; bg: string; color: string };
  onPress?: () => void;
  destructive?: boolean;
}) {
  return (
    <TouchableOpacity
      style={[styles.item, destructive && styles.itemDanger]}
      onPress={onPress}
    >
      <View style={styles.itemLeft}>
        <View style={[styles.itemIcon, { backgroundColor: iconBg }]}>{icon}</View>

        <View>
          <Text style={[styles.itemLabel, destructive && { color: "#dc2626" }]}>{label}</Text>

          {!!subLabel && <Text style={styles.itemSubLabel}>{subLabel}</Text>}
        </View>
      </View>

      <View style={styles.itemRight}>
        {rightBadge ? (
          <View style={[styles.badge, { backgroundColor: rightBadge.bg }]}>
            <Text style={[styles.badgeText, { color: rightBadge.color }]}>{rightBadge.text}</Text>
          </View>
        ) : null}

        <ChevronRight size={18} color={destructive ? "#f87171" : "#9ca3af"} />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#f5cb58",
  },

  header: {
    backgroundColor: "#f5cb58",
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  iconBtn: {
    backgroundColor: "#fff",
    borderRadius: 999,
    padding: 8,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  headerTitle: {
    color: "#fff",
    marginBottom: 4,
    fontSize: 32,
    fontFamily: Fonts.LeagueSpartanBlack,
  },
  headerSubtitle: {
    color: "#e95322",
    fontSize: 16,
    fontFamily: Fonts.LeagueSpartanSemiBold,
  },

  bodyWrap: {
    flex: 1,
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    marginTop: -16,
    marginBottom: 20,
  },

  sectionLabel: {
    marginTop: 6,
    marginBottom: 10,
    fontSize: 12,
    fontFamily: Fonts.LeagueSpartanSemiBold,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    color: "#6b7280",
  },

  item: {
    backgroundColor: "#fff",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#f3f4f6",
    paddingVertical: 14,
    paddingHorizontal: 12,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  itemDanger: {
    borderColor: "#fecaca",
  },
  itemLeft: {
    flexDirection: "row",
    alignItems: "center",
    columnGap: 12,
  },
  itemIcon: {
    width: 40,
    height: 40,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },
  itemLabel: {
    fontSize: 15,
    fontFamily: Fonts.LeagueSpartanMedium,
    color: "#111827",
  },
  itemSubLabel: {
    fontSize: 12,
    fontFamily: Fonts.LeagueSpartanRegular,
    color: "#6b7280",
    marginTop: 2,
  },
  itemRight: {
    flexDirection: "row",
    alignItems: "center",
    columnGap: 8,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  badgeText: {
    fontSize: 11,
    fontFamily: Fonts.LeagueSpartanSemiBold,
  },

  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  modalCard: {
    width: "100%",
    maxWidth: 420,
    borderRadius: 16,
    backgroundColor: "#fff",
    padding: 16,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  modalTitle: {
    fontSize: 16,
    fontFamily: Fonts.LeagueSpartanBold,
  },
  modalText: {
    fontSize: 14,
    fontFamily: Fonts.LeagueSpartanRegular,
    color: "#555",
    textAlign: "center",
  },

  primaryBtn: {
    backgroundColor: "#e95322",
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 16,
  },
  primaryBtnText: {
    color: "#fff",
    fontFamily: Fonts.LeagueSpartanBold,
    fontSize: 15,
  },
});
