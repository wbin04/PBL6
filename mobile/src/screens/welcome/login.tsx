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

export default function LoginScreen() {
  const navigation = useNavigation<any>(); 
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Mock user data for testing
  const users = [
    {
      email: "customer@example.com",
      password: "123456",
      role_id: 1,
      name: "John Smith",
    },
    {
      email: "admin@example.com", 
      password: "123456",
      role_id: 2,
      name: "Samantha",
    },
  ];

  const goHome = () => {
    navigation.navigate("MainTabs", { screen: "Home" });
  };

  const goAdminHome = () => {
    navigation.navigate("AdminHome");
  };

  const handleLogin = () => {
    console.log("Đăng nhập:", { email, password });
    
    // Tìm user với email và password khớp
    const user = users.find(u => u.email === email && u.password === password);
    
    if (!user) {
      Alert.alert("Lỗi đăng nhập", "Email hoặc mật khẩu không đúng!");
      return;
    }

    // Kiểm tra role_id và điều hướng phù hợp
    if (user.role_id === 1) {
      // Customer - đi tới home của khách hàng
      console.log("Đăng nhập với role Customer");
      goHome();
    } else if (user.role_id === 2) {
      // Admin - đi tới home của admin
      console.log("Đăng nhập với role Admin");
      goAdminHome();
    } else {
      Alert.alert("Lỗi", "Role không hợp lệ!");
    }
  };

  const handleSocialLogin = (provider: string) => {
    console.log(`Đăng nhập với ${provider}`);
    Alert.alert("Đăng nhập MXH", `Đăng nhập bằng ${provider}`);
    goHome(); 
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <ArrowLeft size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Đăng nhập</Text>
        </View>

        {/* Content card */}
        <View style={styles.card}>
          <View style={{ marginBottom: 16 }}>
            <Text style={styles.welcome}>Chào mừng</Text>
            <Text style={styles.desc}>
              Đăng nhập để tiếp tục đặt món. Bạn có thể dùng email hoặc số điện thoại.
            </Text>
          </View>

          {/* Email / Mobile */}
          <Text style={styles.label}>Email hoặc Số điện thoại</Text>
          <View style={styles.inputWrap}>
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="example@example.com"
              placeholderTextColor="#8f8f8f"
              style={styles.input}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          {/* Password */}
          <Text style={styles.label}>Mật khẩu</Text>
          <View style={styles.inputWrap}>
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••••••"
              placeholderTextColor="#8f8f8f"
              secureTextEntry={!showPassword}
              style={styles.input}
            />
            <TouchableOpacity
              onPress={() => setShowPassword((s) => !s)}
              style={styles.eyeBtn}
            >
              {showPassword ? (
                <EyeOff size={18} color={ACCENT} />
              ) : (
                <Eye size={18} color={ACCENT} />
              )}
            </TouchableOpacity>
          </View>

          {/* Forget Password */}
          <View style={{ alignItems: "flex-end", marginTop: 6 }}>
            <TouchableOpacity onPress={() => navigation.navigate("ForgotPassword")}>
              <Text style={styles.linkAccent}>Quên mật khẩu</Text>
            </TouchableOpacity>
          </View>

          {/* Login button */}
          <TouchableOpacity style={styles.primaryBtn} onPress={handleLogin}>
            <Text style={styles.primaryText}>Đăng nhập</Text>
          </TouchableOpacity>

          {/* Social Login */}
          <Text style={styles.or}>hoặc đăng nhập với</Text>
          <View style={styles.socialRow}>
            <TouchableOpacity
              style={styles.socialBtn}
              onPress={() => handleSocialLogin("Google")}
            >
              <FontAwesome name="google" size={18} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.socialBtn}
              onPress={() => handleSocialLogin("Facebook")}
            >
              <FontAwesome name="facebook" size={18} />
            </TouchableOpacity>
          </View>

          {/* Sign Up link */}
          <View style={styles.signupRow}>
            <Text style={styles.muted}>Chưa có tài khoản? </Text>
            <TouchableOpacity onPress={() => navigation.navigate("Register")}>
              <Text style={styles.linkAccent}>Đăng ký</Text>
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
    paddingTop: 40,
    paddingBottom: 16,
    flexDirection: "row",
    alignItems: "center",
  },
  backBtn: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
    marginBottom: 16,
  },
  headerTitle: {
    color: "#fff",
    fontSize: 18,
    fontFamily: Fonts.LeagueSpartanBold,
    marginBottom: 16,
  },

  card: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    marginTop: -20,
    minHeight: 600,
    overflow: "hidden",
  },
  welcome: {
    marginTop: 16,
    color: "#391713",
    fontSize: 20,
    fontFamily: Fonts.LeagueSpartanBold,
    marginBottom: 6,
  },
  desc: {
    color: "#6b7280",
    fontFamily: Fonts.LeagueSpartanRegular,
    lineHeight: 20,
  },

  label: {
    color: "#391713",
    fontFamily: Fonts.LeagueSpartanSemiBold,
    marginTop: 12,
    marginBottom: 8,
  },
  inputWrap: {
    borderWidth: 0, 
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

  linkAccent: {
    color: ACCENT,
    fontFamily: Fonts.LeagueSpartanSemiBold,
  },

  primaryBtn: {
    backgroundColor: ACCENT,
    height: 52,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 14,
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
    borderColor: BORDER,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },

  signupRow: { flexDirection: "row", justifyContent: "center", alignItems: "center", marginTop: 16 },
  muted: { color: "#6b7280", fontFamily: Fonts.LeagueSpartanRegular },
});

