import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  ArrowLeft,
  Shield,
  Smartphone,
  Key,
  Copy,
  Check,
  AlertTriangle,
  QrCode,
} from "lucide-react-native";
import * as Clipboard from "expo-clipboard";
import { useNavigation } from "@react-navigation/native";
import { Fonts } from "@/constants/Fonts";

const ORANGE = "#ea580c";
const ORANGE_DARK = "#dc2626";
const GRAY_BG = "#f9fafb";
const GRAY_200 = "#e5e7eb";
const BLUE_50 = "#eff6ff";
const BLUE_200 = "#bfdbfe";
const GREEN_50 = "#ecfccb";
const GREEN_200 = "#bbf7d0";
const RED_50 = "#fef2f2";
const RED_200 = "#fecaca";
const YELLOW_50 = "#fefce8";
const YELLOW_600 = "#ca8a04";

export default function TwoFactorAuthScreen() {
  const navigation = useNavigation();
  const [is2FAEnabled, setIs2FAEnabled] = useState(false);
  const [showSetup, setShowSetup] = useState(false);
  const [setupStep, setSetupStep] = useState<1 | 2 | 3>(1);
  const [verificationCode, setVerificationCode] = useState("");
  const [copiedCode, setCopiedCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const backupCodes = useMemo(
    () => ["A1B2C3D4", "E5F6G7H8", "I9J0K1L2", "M3N4O5P6", "Q7R8S9T0", "U1V2W3X4"],
    []
  );

  const handleGoBack = () => {
    navigation.goBack();
  };

  const handleEnable2FA = () => {
    setShowSetup(true);
    setSetupStep(1);
  };

  const handleDisable2FA = () => {
    setIs2FAEnabled(false);
    setShowSetup(false);
    Alert.alert("Đã tắt 2FA", "Xác thực hai lớp đã được tắt cho tài khoản của bạn.");
  };

  const handleVerifyCode = () => {
    if (verificationCode.length !== 6) return;
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      setSetupStep(3);
    }, 1000);
  };

  const handleComplete2FA = () => {
    setIs2FAEnabled(true);
    setShowSetup(false);
    setSetupStep(1);
    setVerificationCode("");
    Alert.alert("Hoàn tất", "2FA đã được bật cho tài khoản của bạn.");
  };

  const copyToClipboard = async (code: string) => {
    await Clipboard.setStringAsync(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(""), 1500);
  };

  const renderStepIndicator = () => {
    return (
      <View style={styles.stepRow}>
        <View style={styles.stepWrap}>
          <View style={[styles.stepDot, setupStep >= 1 ? styles.stepDotActive : styles.stepDotInactive]}>
            <Text style={[styles.stepDotText, setupStep >= 1 ? styles.stepDotTextActive : styles.stepDotTextInactive]}>
              1
            </Text>
          </View>
          <View style={[styles.stepLine, setupStep >= 2 ? styles.stepLineActive : styles.stepLineInactive]} />
          <View style={[styles.stepDot, setupStep >= 2 ? styles.stepDotActive : styles.stepDotInactive]}>
            <Text style={[styles.stepDotText, setupStep >= 2 ? styles.stepDotTextActive : styles.stepDotTextInactive]}>
              2
            </Text>
          </View>
          <View style={[styles.stepLine, setupStep >= 3 ? styles.stepLineActive : styles.stepLineInactive]} />
          <View style={[styles.stepDot, setupStep >= 3 ? styles.stepDotActive : styles.stepDotInactive]}>
            <Text style={[styles.stepDotText, setupStep >= 3 ? styles.stepDotTextActive : styles.stepDotTextInactive]}>
              3
            </Text>
          </View>
        </View>
      </View>
    );
  };

  const SetupStep1 = () => (
    <View style={styles.centerBlock}>
      <View style={styles.iconCircleBlue}>
        <QrCode size={40} color={"#2563eb"} />
      </View>
      <Text style={styles.title}>Quét mã QR</Text>
      <Text style={styles.desc}>
        Sử dụng ứng dụng xác thực như Google Authenticator hoặc Authy để quét mã QR bên dưới
      </Text>
      <View style={styles.qrPlaceholder}>
        <View style={styles.qrInner}>
          <QrCode size={36} color={"#9ca3af"} />
          <Text style={styles.qrHint}>Mã QR sẽ hiển thị ở đây</Text>
        </View>
      </View>
      <View style={styles.manualBox}>
        <Text style={styles.manualLabel}>Hoặc nhập mã thủ công:</Text>
        <View style={styles.manualKeyBox}>
          <Text style={styles.manualKeyText}>JBSWY3DPEHPK3PXP</Text>
        </View>
      </View>
      <TouchableOpacity onPress={() => setSetupStep(2)} activeOpacity={0.8} style={styles.primaryBtn}>
        <Text style={styles.primaryBtnText}>Tiếp tục</Text>
      </TouchableOpacity>
    </View>
  );

  const SetupStep2 = () => (
    <View style={styles.centerBlock}>
      <View style={styles.iconCircleGreen}>
        <Key size={40} color={"#16a34a"} />
      </View>
      <Text style={styles.title}>Nhập mã xác thực</Text>
      <Text style={styles.desc}>Nhập mã 6 chữ số từ ứng dụng xác thực của bạn để hoàn tất thiết lập</Text>
      <View style={styles.codeInputWrap}>
        <TextInput
          value={verificationCode}
          onChangeText={(t) => setVerificationCode(t.replace(/\D/g, "").slice(0, 6))}
          placeholder={"000000"}
          keyboardType={"number-pad"}
          maxLength={6}
          style={styles.codeInput}
        />
      </View>
      <TouchableOpacity
        onPress={handleVerifyCode}
        disabled={verificationCode.length !== 6 || isLoading}
        activeOpacity={0.8}
        style={[styles.primaryBtn, verificationCode.length !== 6 || isLoading ? styles.primaryBtnDisabled : null]}
      >
        <Text style={styles.primaryBtnText}>{isLoading ? "Đang xác thực..." : "Xác thực"}</Text>
      </TouchableOpacity>
    </View>
  );

  const SetupStep3 = () => (
    <View style={styles.centerBlock}>
      <View style={styles.iconCircleYellow}>
        <Shield size={40} color={YELLOW_600} />
      </View>
      <Text style={styles.title}>Lưu mã khôi phục</Text>
      <Text style={styles.desc}>
        Lưu các mã khôi phục này ở nơi an toàn. Bạn có thể sử dụng chúng để truy cập tài khoản nếu mất thiết bị xác
        thực.
      </Text>
      <View style={styles.codesWrap}>
        {backupCodes.map((code) => (
          <View key={code} style={styles.codeRow}>
            <Text style={styles.codeText}>{code}</Text>
            <TouchableOpacity onPress={() => copyToClipboard(code)} style={styles.copyBtn}>
              {copiedCode === code ? <Check size={18} color={"#16a34a"} /> : <Copy size={18} color={"#6b7280"} />}
            </TouchableOpacity>
          </View>
        ))}
      </View>
      <View style={styles.alertBox}>
        <View style={styles.alertRow}>
          <AlertTriangle size={18} color={"#dc2626"} />
          <View style={styles.alertTextCol}>
            <Text style={styles.alertTitle}>Quan trọng</Text>
            <Text style={styles.alertDesc}>
              Mỗi mã chỉ có thể sử dụng một lần. Hãy lưu trữ chúng ở nơi an toàn và không chia sẻ với ai.
            </Text>
          </View>
        </View>
      </View>
      <TouchableOpacity onPress={handleComplete2FA} activeOpacity={0.8} style={styles.primaryBtn}>
        <Text style={styles.primaryBtnText}>Hoàn tất thiết lập</Text>
      </TouchableOpacity>
    </View>
  );

  if (showSetup) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => setShowSetup(false)} style={styles.headerBackBtn} activeOpacity={0.8}>
            <ArrowLeft size={24} color={"#374151"} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Thiết lập 2FA</Text>
          <View style={styles.headerRightSpace} />
        </View>
        <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
          {renderStepIndicator()}
          {setupStep === 1 && <SetupStep1 />}
          {setupStep === 2 && <SetupStep2 />}
          {setupStep === 3 && <SetupStep3 />}
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleGoBack} style={styles.headerBackBtn} activeOpacity={0.8}>
          <ArrowLeft size={24} color={"#374151"} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Xác thực 2 lớp</Text>
        <View style={styles.headerRightSpace} />
      </View>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.centerBlock}>
          <View style={[styles.stateCircle, is2FAEnabled ? styles.stateCircleEnabled : styles.stateCircleDisabled]}>
            <Shield size={40} color={is2FAEnabled ? "#16a34a" : "#9ca3af"} />
          </View>
          <Text style={styles.title}>{is2FAEnabled ? "2FA đã được bật" : "Bảo vệ tài khoản với 2FA"}</Text>
          <Text style={styles.desc}>
            {is2FAEnabled ? "Tài khoản của bạn được bảo vệ bởi xác thực hai yếu tố" : "Thêm một lớp bảo mật bổ sung cho tài khoản của bạn"}
          </Text>
        </View>

        {is2FAEnabled ? (
          <View style={styles.enabledSection}>
            <View style={styles.successBox}>
              <View style={styles.successRow}>
                <Check size={18} color={"#16a34a"} />
                <View style={styles.successTextCol}>
                  <Text style={styles.successTitle}>Xác thực 2 lớp đã được kích hoạt</Text>
                  <Text style={styles.successDesc}>Tài khoản của bạn hiện được bảo vệ bởi xác thực hai yếu tố</Text>
                </View>
              </View>
            </View>

            <View style={styles.cardList}>
              <View style={styles.cardRow}>
                <View style={styles.cardLeft}>
                  <Smartphone size={18} color={"#4b5563"} />
                  <Text style={styles.cardText}>Ứng dụng xác thực</Text>
                </View>
                <Text style={styles.cardRightGreen}>Đã kết nối</Text>
              </View>

              <View style={styles.cardRow}>
                <View style={styles.cardLeft}>
                  <Key size={18} color={"#4b5563"} />
                  <Text style={styles.cardText}>Mã khôi phục</Text>
                </View>
                <TouchableOpacity
                  onPress={() => {
                    setShowSetup(true);
                    setSetupStep(3);
                  }}
                >
                  <Text style={styles.linkOrange}>Xem mã</Text>
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity onPress={handleDisable2FA} activeOpacity={0.8} style={styles.dangerBtn}>
              <Text style={styles.dangerBtnText}>Tắt xác thực 2 lớp</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.disabledSection}>
            <View style={styles.infoBox}>
              <View style={styles.infoRow}>
                <Shield size={18} color={"#2563eb"} />
                <View style={styles.infoTextCol}>
                  <Text style={styles.infoTitle}>Tại sao nên sử dụng 2FA?</Text>
                  <Text style={styles.infoDesc}>
                    • Bảo vệ tài khoản khỏi truy cập trái phép{"\n"}• Thêm lớp bảo mật ngay cả khi mật khẩu bị lộ{"\n"}• Được
                    khuyến nghị cho tất cả tài khoản quan trọng
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.howtoWrap}>
              <Text style={styles.howtoTitle}>Cách thức hoạt động</Text>

              <View style={styles.howtoItem}>
                <View style={styles.howtoBadge}>
                  <Text style={styles.howtoBadgeText}>1</Text>
                </View>
                <View style={styles.howtoTextCol}>
                  <Text style={styles.howtoItemTitle}>Cài đặt ứng dụng xác thực</Text>
                  <Text style={styles.howtoItemDesc}>Google Authenticator, Authy, hoặc ứng dụng tương tự</Text>
                </View>
              </View>

              <View style={styles.howtoItem}>
                <View style={styles.howtoBadge}>
                  <Text style={styles.howtoBadgeText}>2</Text>
                </View>
                <View style={styles.howtoTextCol}>
                  <Text style={styles.howtoItemTitle}>Quét mã QR</Text>
                  <Text style={styles.howtoItemDesc}>Liên kết tài khoản với ứng dụng xác thực</Text>
                </View>
              </View>

              <View style={styles.howtoItem}>
                <View style={styles.howtoBadge}>
                  <Text style={styles.howtoBadgeText}>3</Text>
                </View>
                <View style={styles.howtoTextCol}>
                  <Text style={styles.howtoItemTitle}>Nhập mã xác thực</Text>
                  <Text style={styles.howtoItemDesc}>Sử dụng mã 6 chữ số khi đăng nhập</Text>
                </View>
              </View>
            </View>

            <TouchableOpacity onPress={handleEnable2FA} activeOpacity={0.8} style={styles.primaryBtn}>
              <Text style={styles.primaryBtnText}>Bật xác thực 2 lớp</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: GRAY_BG,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: GRAY_200,
  },
  headerBackBtn: {
    padding: 8,
    borderRadius: 999,
  },
  headerTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: 18,
    fontFamily: Fonts.LeagueSpartanBold,
    color: "#111827",
  },
  headerRightSpace: {
    width: 32,
  },
  container: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  centerBlock: {
    alignItems: "center",
    marginBottom: 24,
  },
  stateCircle: {
    width: 80,
    height: 80,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  stateCircleEnabled: {
    backgroundColor: GREEN_50,
    borderWidth: 1,
    borderColor: GREEN_200,
  },
  stateCircleDisabled: {
    backgroundColor: "#f3f4f6",
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  title: {
    fontSize: 18,
    fontFamily: Fonts.LeagueSpartanBold,
    color: "#111827",
    textAlign: "center",
    marginBottom: 8,
  },
  desc: {
    fontSize: 14,
    fontFamily: Fonts.LeagueSpartanRegular,
    color: "#4b5563",
    textAlign: "center",
    lineHeight: 20,
  },
  enabledSection: {
    gap: 16,
  },
  disabledSection: {
    gap: 16,
  },
  successBox: {
    backgroundColor: GREEN_50,
    borderWidth: 1,
    borderColor: GREEN_200,
    borderRadius: 12,
    padding: 12,
  },
  successRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },
  successTextCol: {
    flex: 1,
  },
  successTitle: {
    fontSize: 14,
    fontFamily: Fonts.LeagueSpartanSemiBold,
    color: "#065f46",
    marginBottom: 4,
  },
  successDesc: {
    fontSize: 13,
    fontFamily: Fonts.LeagueSpartanRegular,
    color: "#166534",
  },
  cardList: {
    gap: 12,
  },
  cardRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: GRAY_200,
    borderRadius: 12,
    padding: 12,
  },
  cardLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  cardText: {
    fontSize: 14,
    fontFamily: Fonts.LeagueSpartanSemiBold,
    color: "#111827",
  },
  cardRightGreen: {
    fontSize: 12,
    fontFamily: Fonts.LeagueSpartanBold,
    color: "#16a34a",
  },
  linkOrange: {
    fontSize: 12,
    fontFamily: Fonts.LeagueSpartanBold,
    color: ORANGE,
  },
  dangerBtn: {
    backgroundColor: "#ef4444",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  dangerBtnText: {
    color: "#ffffff",
    fontFamily: Fonts.LeagueSpartanBold,
    fontSize: 16,
  },
  infoBox: {
    backgroundColor: BLUE_50,
    borderWidth: 1,
    borderColor: BLUE_200,
    borderRadius: 12,
    padding: 12,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },
  infoTextCol: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 14,
    fontFamily: Fonts.LeagueSpartanSemiBold,
    color: "#1e3a8a",
    marginBottom: 4,
  },
  infoDesc: {
    fontSize: 13,
    fontFamily: Fonts.LeagueSpartanRegular,
    color: "#1d4ed8",
    lineHeight: 20,
  },
  howtoWrap: {
    gap: 10,
  },
  howtoTitle: {
    fontSize: 16,
    fontFamily: Fonts.LeagueSpartanBold,
    color: "#111827",
    marginBottom: 4,
  },
  howtoItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  howtoBadge: {
    width: 24,
    height: 24,
    borderRadius: 999,
    backgroundColor: ORANGE,
    alignItems: "center",
    justifyContent: "center",
  },
  howtoBadgeText: {
    color: "#ffffff",
    fontFamily: Fonts.LeagueSpartanBold,
    fontSize: 12,
  },
  howtoTextCol: {
    flex: 1,
    gap: 2,
  },
  howtoItemTitle: {
    fontSize: 14,
    fontFamily: Fonts.LeagueSpartanSemiBold,
    color: "#111827",
  },
  howtoItemDesc: {
    fontSize: 13,
    fontFamily: Fonts.LeagueSpartanRegular,
    color: "#4b5563",
  },
  primaryBtn: {
    backgroundColor: ORANGE,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  primaryBtnDisabled: {
    backgroundColor: "#d1d5db",
  },
  primaryBtnText: {
    color: "#ffffff",
    fontFamily: Fonts.LeagueSpartanBold,
    fontSize: 16,
  },
  stepRow: {
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  stepWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  stepDot: {
    width: 32,
    height: 32,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },
  stepDotActive: {
    backgroundColor: ORANGE,
  },
  stepDotInactive: {
    backgroundColor: "#e5e7eb",
  },
  stepDotText: {
    fontSize: 12,
    fontFamily: Fonts.LeagueSpartanBold,
  },
  stepDotTextActive: {
    color: "#ffffff",
  },
  stepDotTextInactive: {
    color: "#4b5563",
  },
  stepLine: {
    width: 48,
    height: 4,
    borderRadius: 999,
  },
  stepLineActive: {
    backgroundColor: ORANGE,
  },
  stepLineInactive: {
    backgroundColor: "#e5e7eb",
  },
  iconCircleBlue: {
    width: 80,
    height: 80,
    borderRadius: 999,
    backgroundColor: "#dbeafe",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  qrPlaceholder: {
    width: 192,
    height: 192,
    backgroundColor: "#f3f4f6",
    borderWidth: 2,
    borderStyle: "dashed",
    borderColor: "#d1d5db",
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
    marginBottom: 16,
  },
  qrInner: {
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  qrHint: {
    fontSize: 12,
    fontFamily: Fonts.LeagueSpartanRegular,
    color: "#6b7280",
  },
  manualBox: {
    width: "100%",
    backgroundColor: "#f9fafb",
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  manualLabel: {
    fontSize: 12,
    fontFamily: Fonts.LeagueSpartanSemiBold,
    color: "#374151",
    marginBottom: 6,
  },
  manualKeyBox: {
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  manualKeyText: {
    fontSize: 13,
    fontFamily: Fonts.LeagueSpartanMedium,
    color: "#111827",
  },
  iconCircleGreen: {
    width: 80,
    height: 80,
    borderRadius: 999,
    backgroundColor: "#dcfce7",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  codeInputWrap: {
    width: "100%",
    marginBottom: 16,
  },
  codeInput: {
    width: "100%",
    textAlign: "center",
    fontSize: 24,
    fontFamily: Fonts.LeagueSpartanMedium,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 12,
    paddingVertical: 12,
  },
  iconCircleYellow: {
    width: 80,
    height: 80,
    borderRadius: 999,
    backgroundColor: YELLOW_50,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  codesWrap: {
    width: "100%",
    backgroundColor: "#f9fafb",
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    gap: 8,
  },
  codeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  codeText: {
    fontFamily: Fonts.LeagueSpartanMedium,
    fontSize: 13,
    color: "#111827",
  },
  copyBtn: {
    padding: 6,
    borderRadius: 8,
  },
  alertBox: {
    backgroundColor: RED_50,
    borderWidth: 1,
    borderColor: RED_200,
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  alertRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },
  alertTextCol: {
    flex: 1,
    gap: 2,
  },
  alertTitle: {
    fontSize: 13,
    fontFamily: Fonts.LeagueSpartanBold,
    color: "#991b1b",
  },
  alertDesc: {
    fontSize: 13,
    fontFamily: Fonts.LeagueSpartanRegular,
    color: "#b91c1c",
    lineHeight: 20,
  },
});
