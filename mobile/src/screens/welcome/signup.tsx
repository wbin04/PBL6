import { FontAwesome } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native"; 
import { ArrowLeft, Eye, EyeOff } from "lucide-react-native";
import React, { useState } from "react";
import {
  Alert,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import BottomBar from "@/components/BottomBar";
import { Colors } from "@/constants/Colors";
import { Fonts } from "@/constants/Fonts";
import { authApi } from "@/services/api";

export default function RegisterScreen() {
  const navigation = useNavigation<any>(); 

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    fullName: "Test",
    username: "test2",
    email: "test2@gmail.com",
    phone: "0987654322",
    password: "123456",
    confirm: "123456",
  });

  const onChange = (k: keyof typeof form, v: string) =>
    setForm((s) => ({ ...s, [k]: v }));

  const goToLogin = () => {
    navigation.navigate("Login" as never);
  };

  const onSubmit = async () => {
    console.log('=== ĐĂNG KÝ BẮT ĐẦU ===');
    console.log('Form data:', form);
    
    // Validation cơ bản
    if (!form.fullName.trim()) {
      Alert.alert("Lỗi", "Vui lòng nhập họ và tên");
      return;
    }
    if (!form.email.trim()) {
      Alert.alert("Lỗi", "Vui lòng nhập email");
      return;
    }
    if (!form.phone.trim()) {
      Alert.alert("Lỗi", "Vui lòng nhập số điện thoại");
      return;
    }
    if (!form.password) {
      Alert.alert("Lỗi", "Vui lòng nhập mật khẩu");
      return;
    }
    if (form.password !== form.confirm) {
      Alert.alert("Lỗi", "Mật khẩu xác nhận không khớp");
      return;
    }

    try {
      setLoading(true);
      console.log('Calling backend register API...');
      
      const result = await authApi.register({
        fullname: form.fullName.trim(),
        username: form.username.trim(), // Sử dụng email làm username
        email: form.email.trim().toLowerCase(),
        phone_number: form.phone.replace(/\s+/g, ""), // Sửa từ phone thành phone_number
        password: form.password,
        password_confirm: form.confirm, // Thêm password_confirm
        role: "Khách hàng", // Mặc định là khách hàng
      });
      
      console.log('Register result:', result);
      console.log('Registration successful');
      
      Alert.alert("Thành công", "Đăng ký tài khoản thành công!", [
        { text: "OK", onPress: goToLogin }
      ]);
    } catch (e: any) {
      console.error('Register error:', e);
      const errorMessage = e?.response?.data?.message || e?.message || "Có lỗi xảy ra";
      Alert.alert("Đăng ký thất bại", errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <ArrowLeft size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Đăng ký</Text>
        </View>

        {/* Card */}
        <View style={styles.card}>
          <Text style={styles.title}>Tạo tài khoản</Text>
          <Text style={styles.desc}>Vui lòng điền thông tin để tiếp tục.</Text>

          {/* Họ và tên */}
          <Text style={styles.label}>Họ và tên</Text>
          <View style={styles.inputWrap}>
            <TextInput
              value={form.fullName}
              onChangeText={(v) => onChange("fullName", v)}
              placeholder="Nguyễn Văn A"
              placeholderTextColor="#8f8f8f"
              style={styles.input}
              editable={!loading}
            />
          </View>

          <Text style={styles.label}>Username</Text>
          <View style={styles.inputWrap}>
            <TextInput
              value={form.username}
              onChangeText={(v) => onChange("username", v)}
              placeholder="username"
              placeholderTextColor="#8f8f8f"
              style={styles.input}
              editable={!loading}
            />
          </View>

          {/* Email */}
          <Text style={styles.label}>Email</Text>
          <View style={styles.inputWrap}>
            <TextInput
              value={form.email}
              onChangeText={(v) => onChange("email", v)}
              placeholder="example@example.com"
              placeholderTextColor="#8f8f8f"
              style={styles.input}
              autoCapitalize="none"
              keyboardType="email-address"
              editable={!loading}
            />
          </View>

          {/* Số điện thoại */}
          <Text style={styles.label}>Số điện thoại</Text>
          <View style={styles.inputWrap}>
            <TextInput
              value={form.phone}
              onChangeText={(v) => onChange("phone", v)}
              placeholder="+84 912 345 678"
              placeholderTextColor="#8f8f8f"
              style={styles.input}
              keyboardType="phone-pad"
              editable={!loading}
            />
          </View>

          {/* Mật khẩu */}
          <Text style={styles.label}>Mật khẩu</Text>
          <View style={styles.inputWrap}>
            <TextInput
              value={form.password}
              onChangeText={(v) => onChange("password", v)}
              placeholder="••••••••••••"
              placeholderTextColor="#8f8f8f"
              secureTextEntry={!showPassword}
              style={styles.input}
              editable={!loading}
            />
            <TouchableOpacity
              onPress={() => setShowPassword((s) => !s)}
              style={styles.eyeBtn}
              disabled={loading}
            >
              {showPassword ? (
                <EyeOff size={18} color={ACCENT} />
              ) : (
                <Eye size={18} color={ACCENT} />
              )}
            </TouchableOpacity>
          </View>

          {/* Xác nhận mật khẩu */}
          <Text style={styles.label}>Xác nhận mật khẩu</Text>
          <View style={styles.inputWrap}>
            <TextInput
              value={form.confirm}
              onChangeText={(v) => onChange("confirm", v)}
              placeholder="••••••••••••"
              placeholderTextColor="#8f8f8f"
              secureTextEntry={!showConfirmPassword}
              style={styles.input}
              editable={!loading}
            />
            <TouchableOpacity
              onPress={() => setShowConfirmPassword((s) => !s)}
              style={styles.eyeBtn}
              disabled={loading}
            >
              {showConfirmPassword ? (
                <EyeOff size={18} color={ACCENT} />
              ) : (
                <Eye size={18} color={ACCENT} />
              )}
            </TouchableOpacity>
          </View>

          {/* Đăng ký */}
          <TouchableOpacity
            style={[styles.primaryBtn, loading && { opacity: 0.7 }]}
            onPress={() => {
              console.log('=== NÚT ĐĂNG KÝ ĐƯỢC NHẤN ===');
              onSubmit();
            }} 
            disabled={loading}
          >
            <Text style={styles.primaryText}>{loading ? "Đang tạo..." : "Đăng ký"}</Text>
          </TouchableOpacity>

          {/* MXH */}
          <Text style={styles.or}>hoặc đăng ký với</Text>
          <View style={styles.socialRow}>
            <TouchableOpacity
              style={styles.socialBtn}
              onPress={() => {
                Alert.alert("Đăng ký MXH", "Đăng ký bằng Google");
                goToLogin(); 
              }}
              disabled={loading}
            >
              <FontAwesome name="google" size={18} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.socialBtn}
              onPress={() => {
                Alert.alert("Đăng ký MXH", "Đăng ký bằng Facebook");
                goToLogin(); 
              }}
              disabled={loading}
            >
              <FontAwesome name="facebook" size={18} />
            </TouchableOpacity>
          </View>

          {/* Link đăng nhập */}
          <View style={styles.loginRow}>
            <Text style={styles.muted}>Đã có tài khoản? </Text>
            <TouchableOpacity onPress={() => navigation.navigate("Login")}>
              <Text style={styles.loginLink}>Đăng nhập</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      <BottomBar />
    </SafeAreaView>
  );
}

const YELLOW = "#f5cb58";
const ACCENT = "#e95322";
const BORDER = Colors?.light?.input ?? "#eee";


const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#fff" },

  header: {
    backgroundColor: YELLOW,
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 24,
    flexDirection: "row",
    alignItems: "center",
  },
  backBtn: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },
  headerTitle: {
    color: "#fff",
    fontSize: 18,
    fontFamily: Fonts.LeagueSpartanBold,
  },

  card: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 100,
    minHeight: 600,
  },
  title: {
    color: "#391713",
    fontSize: 20,
    fontFamily: Fonts.LeagueSpartanBold,
    marginBottom: 6,
  },
  desc: {
    color: "#6b7280",
    fontFamily: Fonts.LeagueSpartanRegular,
    marginBottom: 8,
  },

  label: {
    color: "#391713",
    fontFamily: Fonts.LeagueSpartanSemiBold,
    marginTop: 10,
    marginBottom: 8,
  },

  inputWrap: {
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 16,
    backgroundColor: "rgba(245,203,88,0.3)",
    paddingHorizontal: 14,
    height: 48,
    justifyContent: "center",
  },
  input: {
    fontSize: 15,
    color: "#391713",
    paddingRight: 40,
    fontFamily: Fonts.LeagueSpartanRegular,
  },
  eyeBtn: { position: "absolute", right: 12, height: 48, justifyContent: "center" },

  primaryBtn: {
    backgroundColor: ACCENT,
    height: 52,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 12,
  },
  primaryText: {
    color: "#fff",
    fontSize: 16,
    fontFamily: Fonts.LeagueSpartanBold,
  },

  or: {
    textAlign: "center",
    marginTop: 16,
    color: "#6b7280",
    fontFamily: Fonts.LeagueSpartanRegular,
  },
  socialRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 12,
    marginTop: 10,
  },
  socialBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },

  loginRow: { flexDirection: "row", justifyContent: "center", alignItems: "center", marginTop: 16 },
  muted: { color: "#6b7280", fontFamily: Fonts.LeagueSpartanRegular },
  loginLink: { color: ACCENT, fontFamily: Fonts.LeagueSpartanSemiBold },
});

