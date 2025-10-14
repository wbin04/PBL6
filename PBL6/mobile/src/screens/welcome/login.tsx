import AsyncStorage from "@react-native-async-storage/async-storage";
import { FontAwesome } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { ArrowLeft, Eye, EyeOff } from "lucide-react-native";
import React, { useState } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '@/store';
import { login } from '@/store/slices/authSlice';
import { SafeAreaView } from "react-native-safe-area-context";

import BottomBar from "@/components/BottomBar";
import { Colors } from "@/constants/Colors";
import { Fonts } from "@/constants/Fonts";
import { VALIDATION } from '@/constants';

// ====== Types ======
type Role = "customer" | "store" | "shipper" | "admin";

type RolePolicy = {
  implicitRoles: Record<Role, Role[]>;
  switchableRoles: Role[];
};

type DbUser = {
  id: number | string;
  email?: string;
  phone?: string;
  password?: string; 
  roles?: Role[];
};

type Database = {
  auth?: {
    rolePolicy?: RolePolicy;
  };
  users?: DbUser[];
};

import rawDb from "@/assets/database.json";
const db = rawDb as unknown as Database;

const SESSION_KEY = "auth.session";

// "seller" | "shipper" | "admin" | null
const FORCE_ROLE: Role | null = "shipper";

const DEFAULT_POLICY: RolePolicy = {
  implicitRoles: {
    customer: [],
    shipper: ["customer"],
    store: ["customer"],
    admin: ["customer"],
  },
  switchableRoles: ["customer", "shipper", "store"],
};

const rolePolicy: RolePolicy = db.auth?.rolePolicy ?? DEFAULT_POLICY;

function expandImplicitRoles(roles: Role[], policy: RolePolicy = rolePolicy): Role[] {
  const set = new Set<Role>();
  const stack = [...roles];
  while (stack.length) {
    const r = stack.pop() as Role;
    if (set.has(r)) continue;
    set.add(r);
    const children = policy.implicitRoles[r] ?? [];
    for (const c of children) stack.push(c as Role);
  }
  return [...set];
}

// Chuẩn hóa SĐT
function normalizePhone(input: string) {
  const digits = String(input || "").replace(/[^\d+]/g, "");
  if (digits.startsWith("+84")) return digits;
  if (digits.startsWith("0")) return "+84" + digits.slice(1);
  return digits;
}

export default function LoginScreen() {
  const navigation = useNavigation<any>();
  const dispatch = useDispatch<AppDispatch>();
  const { loading, error } = useSelector((state: RootState) => state.auth);
  
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("bin@gmail.com"); // Test data
  const [password, setPassword] = useState("123"); // Test data

  const validateForm = () => {
    if (!email.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập email');
      return false;
    }
    
    if (!VALIDATION.EMAIL_REGEX.test(email)) {
      Alert.alert('Lỗi', 'Email không hợp lệ');
      return false;
    }
    
    if (!password.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập mật khẩu');
      return false;
    }
    
    if (password.length < VALIDATION.PASSWORD_MIN_LENGTH) {
      Alert.alert('Lỗi', `Mật khẩu phải có ít nhất ${VALIDATION.PASSWORD_MIN_LENGTH} ký tự`);
      return false;
    }
    
    return true;
  };

  const goHome = () => {
    navigation.reset({
      index: 0,
      routes: [{ name: 'MainTabs' }],
    });
  };

  const handleLogin = async () => {
    if (!validateForm()) return;
    
    try {
      console.log('Attempting login with:', { email, password });
      await dispatch(login({ email: email.trim(), password })).unwrap();
      console.log('Login successful, navigation will happen automatically');
      // Navigation sẽ tự động xảy ra thông qua AppNavigator khi isAuthenticated = true
    } catch (err: any) {
      console.error('Login error caught in handleLogin:', err);
      const message = typeof err === 'string' ? err : (err.message ?? 'Đã xảy ra lỗi không xác định');
      Alert.alert('Lỗi đăng nhập', message);
    }
  };

  const handleSocialLogin = async (provider: string) => {
    const users: DbUser[] = Array.isArray(db?.users) ? (db.users as DbUser[]) : [];
    const user = users[0];

    if (!user) {
      Alert.alert("Lỗi", "Không tìm thấy user.");
      return;
    }

    const baseRoles = (user.roles ?? []) as Role[];
    const effective = expandImplicitRoles(baseRoles);
    const forced = FORCE_ROLE && effective.includes(FORCE_ROLE) ? FORCE_ROLE : null;

    const activeRole: Role =
      forced ?? (effective.includes("customer") ? "customer" : (effective[0] as Role));

    const session = {
      userId: user.id,
      roles: effective,
      activeRole,
      createdAt: new Date().toISOString(),
      lastSwitchedAt: null as string | null,
      provider,
    };

    await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(session));
    Alert.alert("Đăng nhập MXH", `Đăng nhập bằng ${provider} (demo)`);
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
          <TouchableOpacity 
            style={[styles.primaryBtn, loading && { opacity: 0.7 }]} 
            onPress={handleLogin}
            disabled={loading}
          >
            <Text style={styles.primaryText}>
              {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
            </Text>
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
          <View className="signupRow" style={styles.signupRow}>
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

  signupRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 16,
  },
  muted: { color: "#6b7280", fontFamily: Fonts.LeagueSpartanRegular },
});
