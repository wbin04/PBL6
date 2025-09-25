import React, { useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  TouchableOpacity,
  TextInput,
  Animated,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import {
  ArrowLeft,
  Bell,
  BellRing,
  Volume2,
  VolumeX,
  Smartphone,
  Mail,
  MessageSquare,
  Truck,
  Package,
  DollarSign,
  AlertTriangle,
  Clock,
  CheckCircle,
  Settings,
} from "lucide-react-native";
import { Fonts } from "@/constants/Fonts";

const ORANGE = "#e95322";
const YELLOW = "#f5cb58";
const GREEN = "#22c55e";
const GRAY_BG = "#f9fafb";
const GRAY_BORDER = "#e5e7eb";
const TEXT_DARK = "#111827";
const TEXT_MUTED = "#6b7280";
const WHITE = "#ffffff";

export default function NotificationSettingsScreen() {
  const navigation = useNavigation();

  const [orderNotifications, setOrderNotifications] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [vibrationEnabled, setVibrationEnabled] = useState(true);

  const [emailNotifications, setEmailNotifications] = useState(false);
  const [smsNotifications, setSmsNotifications] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(true);

  const [newOrderAlerts, setNewOrderAlerts] = useState(true);
  const [orderStatusUpdates, setOrderStatusUpdates] = useState(true);
  const [paymentNotifications, setPaymentNotifications] = useState(true);
  const [promotionAlerts, setPromotionAlerts] = useState(false);
  const [systemUpdates, setSystemUpdates] = useState(true);
  const [emergencyAlerts, setEmergencyAlerts] = useState(true);

  const [quietFrom, setQuietFrom] = useState("22:00");
  const [quietTo, setQuietTo] = useState("06:00");

  const [showSuccess, setShowSuccess] = useState(false);
  const toastOpacity = useRef(new Animated.Value(0)).current;

  const toggleThumbColor = WHITE;
  const trackTrue = GREEN;
  const trackFalse = "#d1d5db";

  const Row = useMemo(
    () =>
      function Row({
        icon,
        iconBg,
        title,
        subtitle,
        value,
        onValueChange,
        danger,
      }: {
        icon: React.ReactNode;
        iconBg: string;
        title: string;
        subtitle?: string;
        value: boolean;
        onValueChange: (v: boolean) => void;
        danger?: boolean;
      }) {
        return (
          <View
            style={[
              styles.row,
              { borderColor: danger ? "#fecaca" : GRAY_BORDER, backgroundColor: WHITE },
            ]}
          >
            <View style={styles.rowLeft}>
              <View style={[styles.iconWrap, { backgroundColor: iconBg }]}>{icon}</View>
              <View>
                <Text style={styles.rowTitle}>{title}</Text>
                {!!subtitle && <Text style={styles.rowSub}>{subtitle}</Text>}
              </View>
            </View>
            <Switch
              value={value}
              onValueChange={onValueChange}
              thumbColor={toggleThumbColor}
              trackColor={{ true: trackTrue, false: trackFalse }}
            />
          </View>
        );
      },
    []
  );

  const handleSaveSettings = () => {
    setShowSuccess(true);
    Animated.sequence([
      Animated.timing(toastOpacity, { toValue: 1, duration: 180, useNativeDriver: true }),
      Animated.delay(1800),
      Animated.timing(toastOpacity, { toValue: 0, duration: 220, useNativeDriver: true }),
    ]).start(({ finished }) => {
      if (finished) setShowSuccess(false);
    });
  };

  return (
    <SafeAreaView style={styles.safe}>
      {showSuccess && (
        <Animated.View style={[styles.toast, { opacity: toastOpacity }]}>
          <Text style={styles.toastText}>Cài đặt thông báo đã được lưu</Text>
        </Animated.View>
      )}

      <View style={[styles.header, { backgroundColor: YELLOW }]}>
        <View style={styles.headerTop}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.headerIconBtn}
            activeOpacity={0.8}
          >
            <ArrowLeft size={24} color={ORANGE} />
          </TouchableOpacity>

          <View style={{ flex: 1 }} />

          <View style={styles.headerIconBtn}>
            <Bell size={24} color={ORANGE} />
          </View>
        </View>

        <View>
          <Text style={styles.headerTitle}>Cài Đặt Thông Báo</Text>
          <Text style={[styles.headerSub, { color: ORANGE }]}>
            Tùy chỉnh thông báo theo ý muốn
          </Text>
        </View>
      </View>

      <View style={styles.bodyWrap}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={{ paddingBottom: 28 }}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.sectionTitle}>Cài đặt chung</Text>
          <View style={{ gap: 12 }}>
            <Row
              icon={<Bell size={20} color={WHITE} />}
              iconBg={ORANGE}
              title="Thông báo đơn hàng"
              subtitle="Nhận thông báo về đơn hàng mới"
              value={orderNotifications}
              onValueChange={setOrderNotifications}
            />
            <Row
              icon={
                soundEnabled ? <Volume2 size={20} color={WHITE} /> : <VolumeX size={20} color={WHITE} />
              }
              iconBg="#3b82f6"
              title="Âm thanh thông báo"
              subtitle="Phát âm thanh khi có thông báo"
              value={soundEnabled}
              onValueChange={setSoundEnabled}
            />
            <Row
              icon={<Smartphone size={20} color={WHITE} />}
              iconBg="#8b5cf6"
              title="Rung khi có thông báo"
              subtitle="Rung điện thoại khi có thông báo"
              value={vibrationEnabled}
              onValueChange={setVibrationEnabled}
            />
          </View>

          <Text style={styles.sectionTitle}>Kênh thông báo</Text>
          <View style={{ gap: 12 }}>
            <Row
              icon={<BellRing size={20} color={WHITE} />}
              iconBg="#ef4444"
              title="Push Notifications"
              subtitle="Thông báo đẩy trên ứng dụng"
              value={pushNotifications}
              onValueChange={setPushNotifications}
            />
            <Row
              icon={<MessageSquare size={20} color={WHITE} />}
              iconBg="#16a34a"
              title="SMS"
              subtitle="Tin nhắn SMS đến số điện thoại"
              value={smsNotifications}
              onValueChange={setSmsNotifications}
            />
            <Row
              icon={<Mail size={20} color={WHITE} />}
              iconBg="#6366f1"
              title="Email"
              subtitle="Thông báo qua email"
              value={emailNotifications}
              onValueChange={setEmailNotifications}
            />
          </View>

          <Text style={styles.sectionTitle}>Loại thông báo</Text>
          <View style={{ gap: 12 }}>
            <Row
              icon={<Package size={20} color={WHITE} />}
              iconBg="#f97316"
              title="Đơn hàng mới"
              subtitle="Thông báo khi có đơn hàng mới"
              value={newOrderAlerts}
              onValueChange={setNewOrderAlerts}
            />
            <Row
              icon={<Truck size={20} color={WHITE} />}
              iconBg="#2563eb"
              title="Cập nhật trạng thái"
              subtitle="Thông báo thay đổi trạng thái đơn"
              value={orderStatusUpdates}
              onValueChange={setOrderStatusUpdates}
            />
            <Row
              icon={<DollarSign size={20} color={WHITE} />}
              iconBg="#16a34a"
              title="Thanh toán"
              subtitle="Thông báo về thanh toán và thu nhập"
              value={paymentNotifications}
              onValueChange={setPaymentNotifications}
            />
            <Row
              icon={<CheckCircle size={20} color={WHITE} />}
              iconBg="#ec4899"
              title="Khuyến mãi"
              subtitle="Thông báo về ưu đãi và khuyến mãi"
              value={promotionAlerts}
              onValueChange={setPromotionAlerts}
            />
            <Row
              icon={<Settings size={20} color={WHITE} />}
              iconBg="#4b5563"
              title="Cập nhật hệ thống"
              subtitle="Thông báo về cập nhật ứng dụng"
              value={systemUpdates}
              onValueChange={setSystemUpdates}
            />
            <Row
              icon={<AlertTriangle size={20} color={WHITE} />}
              iconBg="#ef4444"
              title="Cảnh báo khẩn cấp"
              subtitle="Thông báo quan trọng và khẩn cấp"
              value={emergencyAlerts}
              onValueChange={setEmergencyAlerts}
              danger
            />
          </View>

          <Text style={styles.sectionTitle}>Giờ im lặng</Text>
          <View style={styles.card}>
            <View style={[styles.rowLeft, { marginBottom: 12 }]}>
              <View style={[styles.iconWrap, { backgroundColor: "#6366f1" }]}>
                <Clock size={20} color={WHITE} />
              </View>
              <View>
                <Text style={styles.rowTitle}>Tắt thông báo vào ban đêm</Text>
                <Text style={styles.rowSub}>Từ {quietFrom} đến {quietTo} hàng ngày</Text>
              </View>
            </View>

            <View style={styles.grid2}>
              <View>
                <Text style={styles.inputLabel}>Từ</Text>
                <TextInput
                  value={quietFrom}
                  onChangeText={setQuietFrom}
                  placeholder="22:00"
                  style={styles.input}
                />
              </View>
              <View>
                <Text style={styles.inputLabel}>Đến</Text>
                <TextInput
                  value={quietTo}
                  onChangeText={setQuietTo}
                  placeholder="06:00"
                  style={styles.input}
                />
              </View>
            </View>
          </View>

          <TouchableOpacity style={styles.saveBtn} activeOpacity={0.9} onPress={handleSaveSettings}>
            <Text style={styles.saveText}>Lưu cài đặt</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: GRAY_BG },
  toast: {
    position: "absolute",
    top: 12,
    left: "5%",
    right: "5%",
    zIndex: 50,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: "#22c55e",
    alignSelf: "center",
  },
  toastText: { color: WHITE, fontFamily: Fonts.LeagueSpartanSemiBold, textAlign: "center" },
  header: {
    paddingHorizontal: 16,
    paddingBottom: 24,
    paddingTop: 12,
  },
  headerTop: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  headerIconBtn: {
    backgroundColor: WHITE,
    borderRadius: 999,
    padding: 8,
  },
  headerTitle: {
    color: WHITE,
    fontSize: 22,
    fontFamily: Fonts.LeagueSpartanBlack,
    marginBottom: 2,
  },
  headerSub: {
    fontSize: 13,
    fontFamily: Fonts.LeagueSpartanSemiBold,
  },
  bodyWrap: {
    backgroundColor: WHITE,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    marginTop: -12,
    flex: 1,
  },
  scroll: { paddingHorizontal: 16, paddingTop: 16 },
  sectionTitle: {
    fontSize: 12,
    color: TEXT_MUTED,
    fontFamily: Fonts.LeagueSpartanBold,
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginTop: 16,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  rowLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },
  rowTitle: { color: TEXT_DARK, fontFamily: Fonts.LeagueSpartanBold },
  rowSub: { color: TEXT_MUTED, fontSize: 12, marginTop: 2, fontFamily: Fonts.LeagueSpartanRegular },
  card: {
    borderWidth: 1,
    borderColor: GRAY_BORDER,
    borderRadius: 14,
    padding: 14,
    backgroundColor: WHITE,
  },
  grid2: { flexDirection: "row", gap: 12 },
  inputLabel: { fontSize: 12, color: TEXT_MUTED, marginBottom: 6, fontFamily: Fonts.LeagueSpartanRegular },
  input: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: TEXT_DARK,
    fontFamily: Fonts.LeagueSpartanRegular,
  },
  saveBtn: {
    marginTop: 16,
    backgroundColor: ORANGE,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  saveText: { color: WHITE, fontFamily: Fonts.LeagueSpartanBold, fontSize: 16 },
});
