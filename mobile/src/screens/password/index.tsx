import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { ArrowLeft, Eye, EyeOff, Check, X, Shield, Lock } from "lucide-react-native";
import { Fonts } from "@/constants/Fonts";

const ORANGE = "#ea580c";
const ORANGE_DARK = "#dc2626";
const BORDER = "#e5e7eb";
const TEXT = "#111827";
const MUTED = "#6b7280";

const passwordRules = [
  { id: "length", label: "Ít nhất 8 ký tự", test: (pwd: string) => pwd.length >= 8 },
  { id: "uppercase", label: "Có chữ hoa", test: (pwd: string) => /[A-Z]/.test(pwd) },
  { id: "lowercase", label: "Có chữ thường", test: (pwd: string) => /[a-z]/.test(pwd) },
  { id: "number", label: "Có số", test: (pwd: string) => /\d/.test(pwd) },
  { id: "special", label: "Có ký tự đặc biệt", test: (pwd: string) => /[!@#$%^&*(),.?\":{}|<>]/.test(pwd) },
];

export default function PasswordSettingsScreen() {
  const navigation = useNavigation();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const isPasswordValid = useMemo(
    () => passwordRules.every((r) => r.test(newPassword)),
    [newPassword]
  );
  const isFormValid =
    !!currentPassword && !!newPassword && !!confirmPassword && newPassword === confirmPassword && isPasswordValid;

  const handleSubmit = () => {
    if (!isFormValid) return;
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      setShowSuccess(true);
    }, 2000);
  };

  if (showSuccess) {
    return (
      <SafeAreaView style={styles.safe}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconBtn}>
            <ArrowLeft size={22} color="#374151" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Password Setting</Text>
          <View style={{ width: 38 }} />
        </View>

        <ScrollView contentContainerStyle={styles.successWrap}>
          <View style={styles.successBadge}>
            <Check size={40} color="#16a34a" />
          </View>

          <Text style={styles.successTitle}>Đổi mật khẩu thành công!</Text>
          <Text style={styles.successDesc}>
            Mật khẩu tài khoản của bạn đã được cập nhật thành công. Vui lòng sử dụng mật khẩu mới để đăng nhập.
          </Text>

          <View style={styles.infoBox}>
            <View style={{ flexDirection: "row", gap: 12 }}>
              <Shield size={20} color="#2563eb" />
              <View style={{ flex: 1 }}>
                <Text style={styles.infoTitle}>Bảo mật tài khoản</Text>
                <Text style={styles.infoText}>
                  Để đảm bảo an toàn, bạn sẽ cần đăng nhập lại với mật khẩu mới.
                </Text>
              </View>
            </View>
          </View>

          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={[styles.primaryBtn, { backgroundColor: ORANGE }]}
          >
            <Text style={styles.primaryBtnText}>Quay về cài đặt</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconBtn}>
          <ArrowLeft size={22} color="#374151" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Password Setting</Text>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView contentContainerStyle={styles.body}>
        {/* Intro */}
        <View style={{ marginBottom: 16 }}>
          <Text style={styles.blockTitle}>Cập nhật mật khẩu tài khoản</Text>
          <Text style={styles.blockDesc}>
            Thay đổi mật khẩu đăng nhập để đảm bảo an toàn cho tài khoản của bạn
          </Text>
        </View>

        {/* Current Password */}
        <View style={styles.field}>
          <Text style={styles.label}>Mật khẩu hiện tại</Text>
          <View style={styles.inputWrap}>
            <Lock size={18} color={MUTED} />
            <TextInput
              style={styles.input}
              value={currentPassword}
              onChangeText={setCurrentPassword}
              placeholder="Nhập mật khẩu hiện tại"
              placeholderTextColor="#9CA3AF"
              secureTextEntry={!showCurrent}
            />
            <TouchableOpacity onPress={() => setShowCurrent((v) => !v)}>
              {showCurrent ? <EyeOff size={18} color={MUTED} /> : <Eye size={18} color={MUTED} />}
            </TouchableOpacity>
          </View>
        </View>

        {/* New Password */}
        <View style={styles.field}>
          <Text style={styles.label}>Mật khẩu mới</Text>
          <View style={styles.inputWrap}>
            <Shield size={18} color={MUTED} />
            <TextInput
              style={styles.input}
              value={newPassword}
              onChangeText={setNewPassword}
              placeholder="Nhập mật khẩu mới"
              placeholderTextColor="#9CA3AF"
              secureTextEntry={!showNew}
            />
            <TouchableOpacity onPress={() => setShowNew((v) => !v)}>
              {showNew ? <EyeOff size={18} color={MUTED} /> : <Eye size={18} color={MUTED} />}
            </TouchableOpacity>
          </View>

          {/* Password Requirements */}
          {!!newPassword && (
            <View style={{ marginTop: 10 }}>
              <Text style={styles.reqTitle}>Yêu cầu mật khẩu:</Text>
              <View style={{ gap: 6, marginTop: 6 }}>
                {passwordRules.map((rule) => {
                  const ok = rule.test(newPassword);
                  return (
                    <View key={rule.id} style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                      {ok ? <Check size={16} color="#16a34a" /> : <X size={16} color="#6b7280" />}
                      <Text style={[styles.reqItem, ok && { color: "#16a34a" }]}>{rule.label}</Text>
                    </View>
                  );
                })}
              </View>
            </View>
          )}
        </View>

        {/* Confirm Password */}
        <View style={styles.field}>
          <Text style={styles.label}>Xác nhận mật khẩu mới</Text>
          <View style={styles.inputWrap}>
            <Shield size={18} color={MUTED} />
            <TextInput
              style={styles.input}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="Nhập lại mật khẩu mới"
              placeholderTextColor="#9CA3AF"
              secureTextEntry={!showConfirm}
            />
            <TouchableOpacity onPress={() => setShowConfirm((v) => !v)}>
              {showConfirm ? <EyeOff size={18} color={MUTED} /> : <Eye size={18} color={MUTED} />}
            </TouchableOpacity>
          </View>

          {!!confirmPassword && newPassword !== confirmPassword && (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 6 }}>
              <X size={16} color={ORANGE_DARK} />
              <Text style={[styles.note, { color: ORANGE_DARK }]}>Mật khẩu xác nhận không khớp</Text>
            </View>
          )}

          {!!confirmPassword && newPassword === confirmPassword && (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 6 }}>
              <Check size={16} color="#16a34a" />
              <Text style={[styles.note, { color: "#16a34a" }]}>Mật khẩu xác nhận khớp</Text>
            </View>
          )}
        </View>

        {/* Security Notice */}
        <View style={styles.warnBox}>
          <View style={{ flexDirection: "row", gap: 12 }}>
            <Lock size={20} color="#ca8a04" />
            <View style={{ flex: 1 }}>
              <Text style={styles.warnTitle}>Lưu ý bảo mật</Text>
              <Text style={styles.warnText}>
                • Không chia sẻ mật khẩu với bất kỳ ai{"\n"}• Sử dụng mật khẩu mạnh và duy nhất{"\n"}• Thay đổi mật khẩu
                định kỳ để đảm bảo an toàn
              </Text>
            </View>
          </View>
        </View>

        {/* Submit */}
        <TouchableOpacity
          onPress={handleSubmit}
          disabled={!isFormValid || isLoading}
          style={[
            styles.primaryBtn,
            { backgroundColor: !isFormValid || isLoading ? "#d1d5db" : ORANGE },
          ]}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.primaryBtnText}>Cập nhật mật khẩu</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#f9fafb" },

  header: {
    backgroundColor: "#fff",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    flex: 1,
    textAlign: "left",
    fontSize: 18,
    color: "#111827",
    fontFamily: Fonts.LeagueSpartanBold, 
  },

  body: { padding: 24, gap: 18 },

  blockTitle: {
    fontSize: 18,
    color: TEXT,
    fontFamily: Fonts.LeagueSpartanSemiBold,
    marginBottom: 2,
  },
  blockDesc: {
    fontSize: 13,
    color: "#6b7280",
    fontFamily: Fonts.LeagueSpartanRegular,
  },

  field: { marginBottom: 8 },
  label: {
    fontSize: 14,
    color: "#374151",
    marginBottom: 8,
    fontFamily: Fonts.LeagueSpartanMedium,
  },
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 12,
    backgroundColor: "#fff",
    paddingHorizontal: 12,
  },
  input: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 15,
    color: TEXT,
    fontFamily: Fonts.LeagueSpartanRegular,
  },

  reqTitle: {
    fontSize: 13,
    color: "#374151",
    fontFamily: Fonts.LeagueSpartanMedium,
  },
  reqItem: {
    fontSize: 13,
    color: "#6b7280",
    fontFamily: Fonts.LeagueSpartanRegular,
  },

  note: {
    fontSize: 12.5,
    fontFamily: Fonts.LeagueSpartanRegular,
  },

  warnBox: {
    backgroundColor: "#fefce8",
    borderWidth: 1,
    borderColor: "#fef08a",
    borderRadius: 12,
    padding: 12,
    marginTop: 6,
  },
  warnTitle: {
    fontSize: 13,
    color: "#713f12",
    fontFamily: Fonts.LeagueSpartanMedium,
    marginBottom: 2,
  },
  warnText: {
    fontSize: 13,
    color: "#854d0e",
    fontFamily: Fonts.LeagueSpartanRegular,
    lineHeight: 18,
  },

  primaryBtn: {
    marginTop: 8,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryBtnText: {
    color: "#fff",
    fontSize: 16,
    fontFamily: Fonts.LeagueSpartanSemiBold,
  },

  // Success
  successWrap: { padding: 24, alignItems: "center", gap: 16 },
  successBadge: {
    width: 84,
    height: 84,
    borderRadius: 999,
    backgroundColor: "#dcfce7",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  successTitle: {
    fontSize: 18,
    color: TEXT,
    fontFamily: Fonts.LeagueSpartanSemiBold,
    textAlign: "center",
  },
  successDesc: {
    fontSize: 14,
    color: "#6b7280",
    fontFamily: Fonts.LeagueSpartanRegular,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 8,
  },
  infoBox: {
    width: "100%",
    backgroundColor: "#eff6ff",
    borderWidth: 1,
    borderColor: "#bfdbfe",
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  infoTitle: {
    fontSize: 13,
    color: "#1e3a8a",
    fontFamily: Fonts.LeagueSpartanMedium,
    marginBottom: 2,
  },
  infoText: {
    fontSize: 13,
    color: "#1d4ed8",
    fontFamily: Fonts.LeagueSpartanRegular,
    lineHeight: 18,
  },
});
