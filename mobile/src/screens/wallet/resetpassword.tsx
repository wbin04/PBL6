import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import {
  ArrowLeft,
  Eye,
  EyeOff,
  Check,
  X,
  Shield,
  Lock,
} from "lucide-react-native";
import { Fonts } from "@/constants/Fonts";
import { useDatabase } from "@/hooks/useDatabase";

const ORANGE = "#ea580c";

type Rule = {
  id: string;
  label: string;
  test: (pwd: string) => boolean;
};

export default function ResetPasswordScreen() {
  const navigation = useNavigation<any>();
  const { getCouriers, getUserById } = useDatabase(); 

 
  const shipperUserId: number | undefined = useMemo(() => {
    return getCouriers()?.[0]?.userId ?? undefined;
  }, [getCouriers]);

  const expectedCurrentFromDb: string | undefined = useMemo(() => {
    if (!shipperUserId) return undefined;
    const user: any = getUserById(shipperUserId);
    return user?.password ?? undefined;
  }, [getUserById, shipperUserId]);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [currentError, setCurrentError] = useState<string | null>(null);

  const passwordRules: Rule[] = useMemo(
    () => [
      { id: "length", label: "Ít nhất 8 ký tự", test: (pwd) => pwd.length >= 8 },
      { id: "uppercase", label: "Có chữ hoa", test: (pwd) => /[A-Z]/.test(pwd) },
      { id: "lowercase", label: "Có chữ thường", test: (pwd) => /[a-z]/.test(pwd) },
      { id: "number", label: "Có số", test: (pwd) => /\d/.test(pwd) },
      { id: "special", label: "Có ký tự đặc biệt", test: (pwd) => /[!@#$%^&*(),.?\":{}|<>]/.test(pwd) },
    ],
    []
  );

  const isPasswordValid = passwordRules.every((r) => r.test(newPassword));
  const isFormValid =
    !!currentPassword &&
    !!newPassword &&
    !!confirmPassword &&
    newPassword === confirmPassword &&
    isPasswordValid;

  const handleSubmit = () => {
    if (!isFormValid || isLoading) return;

  
    if (!expectedCurrentFromDb || currentPassword !== expectedCurrentFromDb) {
      setCurrentError("Mật khẩu hiện tại không đúng");
      return;
    }
    setCurrentError(null);

    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      setShowSuccess(true);
    }, 800);
  };

  if (showSuccess) {
    return (
      <SafeAreaView style={styles.safe}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable
            onPress={() => navigation.goBack()}
            style={styles.iconBtn}
          >
            <ArrowLeft size={24} color="#374151" />
          </Pressable>
          <Text style={styles.headerTitle}>Đổi mật khẩu</Text>
        </View>

        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.successIconWrap}>
            <View style={styles.successIconBg}>
              <Check size={40} color="#16a34a" />
            </View>
          </View>

          <Text style={styles.successTitle}>Đổi mật khẩu thành công!</Text>

          <Text style={styles.successDesc}>
            Mật khẩu tài khoản của bạn đã được cập nhật (demo). Vui lòng dùng mật khẩu mới cho lần đăng nhập tiếp theo.
          </Text>

          <View style={styles.infoBox}>
            <Shield size={18} color="#2563eb" />
            <View style={styles.infoTextWrap}>
              <Text style={styles.infoTitle}>Bảo mật tài khoản</Text>
              <Text style={styles.infoDesc}>
                Vì lý do an toàn, bạn có thể sẽ cần đăng nhập lại bằng mật khẩu mới.
              </Text>
            </View>
          </View>

          <Pressable
            onPress={() => navigation.goBack()}
            style={styles.primaryBtn}
          >
            <Text style={styles.primaryBtnText}>Quay về cài đặt</Text>
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable
          onPress={() => navigation.goBack()}
          style={styles.iconBtn}
        >
          <ArrowLeft size={24} color="#374151" />
        </Pressable>

        <Text style={styles.headerTitle}>Đổi mật khẩu</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Intro */}
        <View style={styles.block}>
          <Text style={styles.blockTitle}>Cập nhật mật khẩu tài khoản</Text>
          <Text style={styles.blockSub}>
            Thay đổi mật khẩu đăng nhập để bảo vệ tài khoản của bạn
          </Text>
        </View>

        {/* Current Password */}
        <View style={styles.field}>
          <Text style={styles.label}>Mật khẩu hiện tại</Text>

          <View style={styles.inputWrap}>
            <TextInput
              value={currentPassword}
              onChangeText={setCurrentPassword}
              placeholder="Nhập mật khẩu hiện tại"
              placeholderTextColor="#9ca3af"
              secureTextEntry={!showCurrentPassword}
              autoCapitalize="none"
              style={styles.input}
            />
            <Pressable
              onPress={() => setShowCurrentPassword((s) => !s)}
              style={styles.eyeBtn}
            >
              {showCurrentPassword ? (
                <EyeOff size={20} color="#6b7280" />
              ) : (
                <Eye size={20} color="#6b7280" />
              )}
            </Pressable>
          </View>

          {!!currentError && (
            <View style={styles.inlineRow}>
              <X size={16} color="#dc2626" />
              <Text style={styles.errorText}>{currentError}</Text>
            </View>
          )}
        </View>

        {/* New Password */}
        <View style={styles.field}>
          <Text style={styles.label}>Mật khẩu mới</Text>

          <View style={styles.inputWrap}>
            <TextInput
              value={newPassword}
              onChangeText={setNewPassword}
              placeholder="Nhập mật khẩu mới"
              placeholderTextColor="#9ca3af"
              secureTextEntry={!showNewPassword}
              autoCapitalize="none"
              style={styles.input}
            />
            <Pressable
              onPress={() => setShowNewPassword((s) => !s)}
              style={styles.eyeBtn}
            >
              {showNewPassword ? (
                <EyeOff size={20} color="#6b7280" />
              ) : (
                <Eye size={20} color="#6b7280" />
              )}
            </Pressable>
          </View>

          {newPassword.length > 0 && (
            <View style={styles.rulesWrap}>
              <Text style={styles.rulesTitle}>Yêu cầu mật khẩu:</Text>

              {passwordRules.map((rule) => {
                const ok = rule.test(newPassword);
                return (
                  <View key={rule.id} style={styles.ruleRow}>
                    {ok ? (
                      <Check size={16} color="#16a34a" />
                    ) : (
                      <X size={16} color="#6b7280" />
                    )}
                    <Text
                      style={[
                        styles.ruleText,
                        { color: ok ? "#16a34a" : "#6b7280" },
                      ]}
                    >
                      {rule.label}
                    </Text>
                  </View>
                );
              })}
            </View>
          )}
        </View>

        {/* Confirm Password */}
        <View style={styles.field}>
          <Text style={styles.label}>Xác nhận mật khẩu mới</Text>

          <View style={styles.inputWrap}>
            <TextInput
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="Nhập lại mật khẩu mới"
              placeholderTextColor="#9ca3af"
              secureTextEntry={!showConfirmPassword}
              autoCapitalize="none"
              style={styles.input}
            />
            <Pressable
              onPress={() => setShowConfirmPassword((s) => !s)}
              style={styles.eyeBtn}
            >
              {showConfirmPassword ? (
                <EyeOff size={20} color="#6b7280" />
              ) : (
                <Eye size={20} color="#6b7280" />
              )}
            </Pressable>
          </View>

          {confirmPassword.length > 0 && newPassword !== confirmPassword && (
            <View style={styles.inlineRow}>
              <X size={16} color="#dc2626" />
              <Text style={styles.errorText}>Mật khẩu xác nhận không khớp</Text>
            </View>
          )}

          {confirmPassword.length > 0 && newPassword === confirmPassword && (
            <View style={styles.inlineRow}>
              <Check size={16} color="#16a34a" />
              <Text style={styles.okText}>Mật khẩu xác nhận khớp</Text>
            </View>
          )}
        </View>

        {/* Security Notice */}
        <View style={styles.notice}>
          <Lock size={18} color="#ca8a04" />
          <View style={styles.noticeTextWrap}>
            <Text style={styles.noticeTitle}>Lưu ý bảo mật</Text>
            <Text style={styles.noticeText}>
              • Không chia sẻ mật khẩu với bất kỳ ai{"\n"}• Sử dụng mật khẩu
              mạnh và duy nhất{"\n"}• Thay đổi mật khẩu định kỳ để đảm bảo an
              toàn
            </Text>
          </View>
        </View>

        {/* Submit */}
        <Pressable
          onPress={handleSubmit}
          disabled={!isFormValid || isLoading}
          style={[
            styles.primaryBtn,
            (!isFormValid || isLoading) && { backgroundColor: "#d1d5db" },
          ]}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.primaryBtnText}>Cập nhật mật khẩu</Text>
          )}
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}


const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#f3f4f6",
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },

  iconBtn: {
    padding: 8,
    borderRadius: 999,
  },

  headerTitle: {
    flex: 1,
    fontSize: 18,
    color: "#111827",
    fontFamily: Fonts.LeagueSpartanBold,
  },

  content: {
    padding: 16,
  },

  block: {
    marginBottom: 16,
  },

  blockTitle: {
    fontSize: 16,
    color: "#111827",
    fontFamily: Fonts.LeagueSpartanSemiBold,
    marginBottom: 6,
  },

  blockSub: {
    fontSize: 13,
    color: "#6b7280",
    fontFamily: Fonts.LeagueSpartanMedium,
  },

  field: {
    marginBottom: 16,
  },

  label: {
    fontSize: 13,
    color: "#374151",
    marginBottom: 8,
    fontFamily: Fonts.LeagueSpartanSemiBold,
  },

  inputWrap: {
    position: "relative",
    justifyContent: "center",
  },

  input: {
    width: "100%",
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 12,
    backgroundColor: "#fff",
    fontFamily: Fonts.LeagueSpartanMedium,
    color: "#111827",
  },

  eyeBtn: {
    position: "absolute",
    right: 10,
    top: 0,
    bottom: 0,
    justifyContent: "center",
    paddingHorizontal: 6,
  },

  rulesWrap: {
    marginTop: 10,
  },

  rulesTitle: {
    fontSize: 13,
    color: "#374151",
    marginBottom: 6,
    fontFamily: Fonts.LeagueSpartanSemiBold,
  },

  ruleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 6,
  },

  ruleText: {
    fontSize: 13,
    fontFamily: Fonts.LeagueSpartanMedium,
  },

  inlineRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 8,
  },

  errorText: {
    fontSize: 13,
    color: "#dc2626",
    fontFamily: Fonts.LeagueSpartanMedium,
  },

  okText: {
    fontSize: 13,
    color: "#16a34a",
    fontFamily: Fonts.LeagueSpartanMedium,
  },

  notice: {
    flexDirection: "row",
    gap: 10,
    alignItems: "flex-start",
    padding: 12,
    borderWidth: 1,
    borderColor: "#facc15",
    backgroundColor: "#fef3c7",
    borderRadius: 12,
    marginTop: 4,
    marginBottom: 12,
  },

  noticeTextWrap: {
    flex: 1,
  },

  noticeTitle: {
    fontSize: 13,
    color: "#854d0e",
    fontFamily: Fonts.LeagueSpartanSemiBold,
    marginBottom: 2,
  },

  noticeText: {
    fontSize: 13,
    color: "#a16207",
    fontFamily: Fonts.LeagueSpartanMedium,
  },

  primaryBtn: {
    width: "100%",
    paddingVertical: 14,
    backgroundColor: ORANGE,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },

  primaryBtnText: {
    color: "#fff",
    fontSize: 15,
    fontFamily: Fonts.LeagueSpartanSemiBold,
  },

  successIconWrap: {
    alignItems: "center",
    marginBottom: 14,
  },

  successIconBg: {
    width: 80,
    height: 80,
    borderRadius: 999,
    backgroundColor: "#dcfce7",
    alignItems: "center",
    justifyContent: "center",
  },

  successTitle: {
    fontSize: 18,
    color: "#111827",
    fontFamily: Fonts.LeagueSpartanBold,
    textAlign: "center",
    marginTop: 8,
  },

  successDesc: {
    fontSize: 13,
    color: "#6b7280",
    fontFamily: Fonts.LeagueSpartanMedium,
    textAlign: "center",
    marginTop: 6,
    marginBottom: 16,
  },

  infoBox: {
    flexDirection: "row",
    gap: 10,
    padding: 12,
    borderRadius: 12,
    backgroundColor: "#eff6ff",
    borderWidth: 1,
    borderColor: "#bfdbfe",
    marginBottom: 16,
  },

  infoTextWrap: {
    flex: 1,
  },

  infoTitle: {
    fontSize: 13,
    color: "#1e3a8a",
    fontFamily: Fonts.LeagueSpartanSemiBold,
    marginBottom: 2,
  },

  infoDesc: {
    fontSize: 13,
    color: "#1d4ed8",
    fontFamily: Fonts.LeagueSpartanMedium,
  },
});
