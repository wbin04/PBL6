import React, { useEffect, useMemo, useState } from "react";
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
import {
  ArrowLeft,
  Camera,
  Edit3,
  User,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Star,
  Award,
  Truck,
  Clock,
  Save,
  X,
} from "lucide-react-native";
import { useDatabase } from "@/hooks/useDatabase";
import { Fonts } from "@/constants/Fonts";

const ORANGE = "#e95322";

type ShipperProfileUI = {
  name: string;
  phone: string;
  email: string;
  address: string;
  birthDate: string;
  joinDate: string;            
  rating: number;              
  totalDeliveries: number;     
  completionRate: number;      
  avatar?: string | null;
};

const pickDefaultAddress = (list: any[] = []) =>
  list.find((a) => a.isDefault) || list[0] || null;

export default function ShipperProfileScreen() {
  const navigation = useNavigation<any>();
  const {
    db,
    getUsers,
    getUserById,
    getAddressesByUser,
    updateUser,      
    commit,          
  } = useDatabase();

  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<ShipperProfileUI | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<ShipperProfileUI | null>(null);

  const shipperUserId: number | undefined = useMemo(() => {
    const users = getUsers?.() ?? db.users ?? [];
    const ship = users.find(
      (u: any) =>
        u?.role === "shipper" ||
        (Array.isArray(u?.roles) && u.roles.includes("shipper"))
    );
    return ship?.id;
  }, [db.users, getUsers]);

  // Load dữ liệu từ database
  useEffect(() => {
    setLoading(true);
    try {
      if (!shipperUserId) {
        setProfile(null);
        return;
      }

      const user: any =
        getUserById?.(shipperUserId) ??
        (db.users || []).find((u: any) => u.id === shipperUserId);

      const addrList: any[] =
        getAddressesByUser?.(shipperUserId) ??
        (user?.addresses ?? []); 

      const defAddr = pickDefaultAddress(addrList);
      const prof = user?.profile ?? {};

      const p: ShipperProfileUI = {
        name: user?.fullName ?? user?.name ?? "-",
        phone: user?.phone ?? "-",
        email: user?.email ?? "-",
        address: defAddr?.line1 ??
          defAddr?.street ??
          defAddr?.address ??
          "-",
        birthDate: prof?.birthDate ?? "-",
        joinDate: prof?.joinDate ?? "-", 
        rating: typeof prof?.rating === "number" ? prof.rating : 0,
        totalDeliveries:
          typeof prof?.totalDeliveries === "number" ? prof.totalDeliveries : 0,
        completionRate:
          typeof prof?.completionRate === "number" ? prof.completionRate : 0,
        avatar: user?.avatar ?? null,
      };

      setProfile(p);
    } finally {
      setLoading(false);
    }
  }, [db, shipperUserId, getUserById, getAddressesByUser]);

  const startEdit = () => {
    if (!profile) return;
    setEditData({ ...profile });
    setIsEditing(true);
  };

  const cancelEdit = () => {
    setEditData(null);
    setIsEditing(false);
  };

  const saveEdit = () => {
    if (!editData || !profile || !shipperUserId) return;

    const applyWithRawMutation = () => {
      const users: any[] = Array.isArray(db.users) ? [...db.users] : [];
      const uIdx = users.findIndex((u: any) => u.id === shipperUserId);
      if (uIdx >= 0) {
        const u = users[uIdx] ?? {};
        users[uIdx] = {
          ...u,
          fullName: editData.name,
          phone: editData.phone,
          email: editData.email,
          avatar: u.avatar ?? null,
          profile: {
            ...(u.profile ?? {}),
            birthDate: editData.birthDate,
          },
          addresses: Array.isArray(u.addresses) ? [...u.addresses] : [],
        };

        const addrs = users[uIdx].addresses ?? [];
        let def = pickDefaultAddress(addrs);
        if (def) {
          def.line1 = editData.address ?? def.line1;
          def.fullName = editData.name ?? def.fullName;
          def.phone = editData.phone ?? def.phone;
        } else {
          const newAddrId =
            addrs.reduce((m: number, a: any) => Math.max(m, Number(a?.id) || 0), 1000) + 1;
          addrs.push({
            id: newAddrId,
            fullName: editData.name,
            phone: editData.phone,
            line1: editData.address,
            ward: "",
            district: "",
            province: "",
            isDefault: true,
          });
        }

        users[uIdx].addresses = addrs;
        db.users = users;
      }
    };

    if (typeof updateUser === "function") {
      updateUser(shipperUserId, (prev: any) => {
        const next = {
          ...prev,
          fullName: editData.name,
          phone: editData.phone,
          email: editData.email,
          profile: {
            ...(prev?.profile ?? {}),
            birthDate: editData.birthDate,
          },
        };

        const addrs: any[] = Array.isArray(prev?.addresses) ? [...prev.addresses] : [];
        let def = pickDefaultAddress(addrs);
        if (def) {
          def.line1 = editData.address ?? def.line1;
          def.fullName = editData.name ?? def.fullName;
          def.phone = editData.phone ?? def.phone;
        } else {
          const newAddrId =
            addrs.reduce((m: number, a: any) => Math.max(m, Number(a?.id) || 0), 1000) + 1;
          addrs.push({
            id: newAddrId,
            fullName: editData.name,
            phone: editData.phone,
            line1: editData.address,
            ward: "",
            district: "",
            province: "",
            isDefault: true,
          });
        }
        (next as any).addresses = addrs;

        return next;
      });
    } else {
      applyWithRawMutation();
    }

    if (typeof commit === "function") commit();
    setProfile(editData);
    setIsEditing(false);
  };

  const bind = (key: keyof ShipperProfileUI) => ({
    value: (editData?.[key] ?? "") as any,
    onChangeText: (t: string) =>
      setEditData((p) =>
        p
          ? {
              ...p,
              [key]: t,
            }
          : p
      ),
  });

  const stars = useMemo(() => {
    const full = Math.round(profile?.rating ?? 0);
    return "★".repeat(full) + "☆".repeat(5 - full);
  }, [profile?.rating]);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={ORANGE} />
          <Text style={styles.loadingText}>
            Đang tải hồ sơ…
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!profile) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingWrap}>
          <Text style={styles.loadingText}>
            Không tìm thấy shipper trong database.json
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconBtn}>
            <ArrowLeft size={22} color={ORANGE} />
          </TouchableOpacity>

          <Text style={styles.headerTitle}>
            Hồ sơ cá nhân
          </Text>

          {/* {!isEditing ? (
            <TouchableOpacity onPress={startEdit} style={styles.iconBtn}>
              <Edit3 size={20} color={ORANGE} />
            </TouchableOpacity>
          ) : (
            <View style={styles.headerActions}>
              <TouchableOpacity onPress={cancelEdit} style={styles.iconBtn}>
                <X size={20} color={"#ef4444"} />
              </TouchableOpacity>
              <TouchableOpacity onPress={saveEdit} style={styles.iconBtn}>
                <Save size={20} color={"#16a34a"} />
              </TouchableOpacity>
            </View>
          )} */}
        </View>
      </View>

      {/* Body */}
      <View style={styles.bodyTop} />
      <View style={styles.body}>
        <ScrollView contentContainerStyle={styles.scroll}>
          {/* Avatar */}
          <View style={styles.avatarWrap}>
            <View style={styles.avatar}>
              <User size={44} color={"#fff"} />
            </View>
            {isEditing && (
              <TouchableOpacity style={styles.cameraBtn}>
                <Camera size={14} color={"#fff"} />
              </TouchableOpacity>
            )}
          </View>

          {/* Thông tin cơ bản */}
          <Text style={styles.sectionTitle}>
            Thông tin cơ bản
          </Text>

          {/* Họ và tên */}
          <View style={styles.itemRow}>
            <User size={18} color={ORANGE} />
            <View style={styles.itemCol}>
              <Text style={styles.itemLabel}>
                Họ và tên
              </Text>
              {!isEditing ? (
                <Text style={styles.itemValue}>
                  {profile.name}
                </Text>
              ) : (
                <TextInput
                  style={styles.input}
                  {...bind("name")}
                  placeholder="Nhập họ và tên"
                  placeholderTextColor="#9ca3af"
                />
              )}
            </View>
          </View>

          {/* Số điện thoại */}
          <View style={styles.itemRow}>
            <Phone size={18} color={ORANGE} />
            <View style={styles.itemCol}>
              <Text style={styles.itemLabel}>
                Số điện thoại
              </Text>
              {!isEditing ? (
                <Text style={styles.itemValue}>
                  {profile.phone}
                </Text>
              ) : (
                <TextInput
                  style={styles.input}
                  {...bind("phone")}
                  keyboardType="phone-pad"
                  placeholder="VD: 09xxxxxxxx"
                  placeholderTextColor="#9ca3af"
                />
              )}
            </View>
          </View>

          {/* Email */}
          <View style={styles.itemRow}>
            <Mail size={18} color={ORANGE} />
            <View style={styles.itemCol}>
              <Text style={styles.itemLabel}>
                Email
              </Text>
              {!isEditing ? (
                <Text style={styles.itemValue}>
                  {profile.email}
                </Text>
              ) : (
                <TextInput
                  style={styles.input}
                  {...bind("email")}
                  keyboardType="email-address"
                  placeholder="email@domain.com"
                  placeholderTextColor="#9ca3af"
                  autoCapitalize="none"
                />
              )}
            </View>
          </View>

          {/* Địa chỉ */}
          <View style={styles.itemRowAlignTop}>
            <MapPin size={18} color={ORANGE} />
            <View style={styles.itemCol}>
              <Text style={styles.itemLabel}>
                Địa chỉ
              </Text>
              {!isEditing ? (
                <Text style={styles.itemValue}>
                  {profile.address}
                </Text>
              ) : (
                <TextInput
                  style={[styles.input, styles.inputMultiline]}
                  {...bind("address")}
                  multiline
                  placeholder="Số nhà, đường, quận/huyện, tỉnh/thành"
                  placeholderTextColor="#9ca3af"
                />
              )}
            </View>
          </View>

          {/* Ngày sinh */}
          <View style={styles.itemRow}>
            <Calendar size={18} color={ORANGE} />
            <View style={styles.itemCol}>
              <Text style={styles.itemLabel}>
                Ngày sinh
              </Text>
              {!isEditing ? (
                <Text style={styles.itemValue}>
                  {profile.birthDate}
                </Text>
              ) : (
                <TextInput
                  style={styles.input}
                  {...bind("birthDate")}
                  placeholder="DD/MM/YYYY"
                  placeholderTextColor="#9ca3af"
                />
              )}
            </View>
          </View>

          {/* Ngày tham gia */}
          <View style={styles.itemRow}>
            <Clock size={18} color={ORANGE} />
            <View style={styles.itemCol}>
              <Text style={styles.itemLabel}>
                Ngày tham gia
              </Text>
              <Text style={styles.itemValue}>
                {profile.joinDate}
              </Text>
            </View>
          </View>

          {/* Thống kê công việc */}
          <Text style={styles.sectionTitle}>
            Thống kê công việc
          </Text>

          <View style={styles.statsGrid}>
            <View style={[styles.card, styles.cardGreen]}>
              <View style={styles.cardRow}>
                <Star size={18} color={"#16a34a"} />
                <Text style={styles.cardTagGreen}>
                  Đánh giá
                </Text>
              </View>
              <Text style={styles.cardValueGreen}>
                {profile.rating}
              </Text>
              <Text style={styles.cardHintGreen}>
                {stars}
              </Text>
            </View>

            <View style={[styles.card, styles.cardBlue]}>
              <View style={styles.cardRow}>
                <Truck size={18} color={"#2563eb"} />
                <Text style={styles.cardTagBlue}>
                  Đơn hàng
                </Text>
              </View>
              <Text style={styles.cardValueBlue}>
                {profile.totalDeliveries}
              </Text>
              <Text style={styles.cardHintBlue}>
                Tổng giao hàng
              </Text>
            </View>

            <View style={[styles.card, styles.cardPurple]}>
              <View style={styles.cardRow}>
                <Award size={18} color={"#7c3aed"} />
                <Text style={styles.cardTagPurple}>
                  Tỷ lệ hoàn thành
                </Text>
              </View>
              <Text style={styles.cardValuePurple}>
                {profile.completionRate}%
              </Text>
              <Text style={styles.cardHintPurple}>
                Thành công
              </Text>
            </View>
          </View>

          {/* Thành tích */}
          <Text style={styles.sectionTitle}>
            Thành tích
          </Text>

          <View style={styles.achvCol}>
            <View style={[styles.achvRow, styles.achvYellow]}>
              <View style={[styles.achvIcon, { backgroundColor: "#eab308" }]}>
                <Award size={18} color={"#fff"} />
              </View>
              <View style={styles.achvTextCol}>
                <Text style={styles.achvTitle}>
                  Shipper xuất sắc
                </Text>
                <Text style={styles.achvSub}>
                  Đạt 1000+ đơn hàng thành công
                </Text>
              </View>
              <Text style={styles.achvEmoji}>
                🏆
              </Text>
            </View>

            <View style={[styles.achvRow, styles.achvGreen]}>
              <View style={[styles.achvIcon, { backgroundColor: "#22c55e" }]}>
                <Star size={18} color={"#fff"} />
              </View>
              <View style={styles.achvTextCol}>
                <Text style={styles.achvTitle}>
                  5 sao liên tiếp
                </Text>
                <Text style={styles.achvSub}>
                  Duy trì đánh giá 5 sao trong 30 ngày
                </Text>
              </View>
              <Text style={styles.achvEmoji}>
                ⭐
              </Text>
            </View>

            <View style={[styles.achvRow, styles.achvBlue]}>
              <View style={[styles.achvIcon, { backgroundColor: "#3b82f6" }]}>
                <Clock size={18} color={"#fff"} />
              </View>
              <View style={styles.achvTextCol}>
                <Text style={styles.achvTitle}>
                  Giao hàng nhanh
                </Text>
                <Text style={styles.achvSub}>
                  Giao trước thời gian dự kiến
                </Text>
              </View>
              <Text style={styles.achvEmoji}>
                ⚡
              </Text>
            </View>
          </View>

          <View style={{ height: 24 }} />
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}


const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f3f4f6",
  },

  header: {
    backgroundColor: "#f5cb58",
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 16,
  },

  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },

  headerTitle: {
    color: "#fff",
    fontSize: 18,
    fontFamily: Fonts.LeagueSpartanBold,
    flex: 1,
  },

  iconBtn: {
    backgroundColor: "#fff",
    padding: 8,
    borderRadius: 999,
  },

  headerActions: {
    flexDirection: "row",
    gap: 8,
  },

  bodyTop: {
    backgroundColor: "#f5cb58",
    height: 20,
  },

  body: {
    flex: 1,
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    marginTop: -20,
    overflow: "hidden",
  },

  scroll: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 32,
  },

  avatarWrap: {
    alignItems: "center",
    marginBottom: 16,
  },

  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: ORANGE,
    alignItems: "center",
    justifyContent: "center",
  },

  cameraBtn: {
    position: "absolute",
    right: -4,
    bottom: -4,
    padding: 8,
    backgroundColor: ORANGE,
    borderRadius: 999,
  },

  sectionTitle: {
    fontSize: 12,
    color: "#6b7280",
    marginTop: 8,
    marginBottom: 8,
    textTransform: "uppercase",
    fontFamily: Fonts.LeagueSpartanSemiBold,
    letterSpacing: 0.6,
  },

  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
    backgroundColor: "#f9fafb",
    borderRadius: 12,
    marginBottom: 10,
  },

  itemRowAlignTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    padding: 12,
    backgroundColor: "#f9fafb",
    borderRadius: 12,
    marginBottom: 10,
  },

  itemCol: {
    flex: 1,
  },

  itemLabel: {
    fontSize: 11,
    color: "#6b7280",
    textTransform: "uppercase",
    marginBottom: 2,
    fontFamily: Fonts.LeagueSpartanSemiBold,
  },

  itemValue: {
    fontSize: 15,
    color: "#111827",
    fontFamily: Fonts.LeagueSpartanSemiBold,
  },

  input: {
    fontSize: 15,
    color: "#111827",
    paddingVertical: 2,
    fontFamily: Fonts.LeagueSpartanMedium,
  },

  inputMultiline: {
    minHeight: 44,
  },

  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },

  card: {
    flexBasis: "48%",
    borderRadius: 12,
    padding: 12,
  },

  cardRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 6,
  },

  cardGreen: {
    backgroundColor: "#ecfdf5",
  },

  cardTagGreen: {
    fontSize: 11,
    color: "#16a34a",
    fontFamily: Fonts.LeagueSpartanSemiBold,
  },

  cardValueGreen: {
    fontSize: 22,
    color: "#065f46",
    fontFamily: Fonts.LeagueSpartanBold,
  },

  cardHintGreen: {
    fontSize: 11,
    color: "#16a34a",
    fontFamily: Fonts.LeagueSpartanSemiBold,
  },

  cardBlue: {
    backgroundColor: "#eff6ff",
  },

  cardTagBlue: {
    fontSize: 11,
    color: "#2563eb",
    fontFamily: Fonts.LeagueSpartanSemiBold,
  },

  cardValueBlue: {
    fontSize: 22,
    color: "#1e3a8a",
    fontFamily: Fonts.LeagueSpartanBold,
  },

  cardHintBlue: {
    fontSize: 11,
    color: "#2563eb",
    fontFamily: Fonts.LeagueSpartanSemiBold,
  },

  cardPurple: {
    backgroundColor: "#f5f3ff",
  },

  cardTagPurple: {
    fontSize: 11,
    color: "#7c3aed",
    fontFamily: Fonts.LeagueSpartanSemiBold,
  },

  cardValuePurple: {
    fontSize: 22,
    color: "#4c1d95",
    fontFamily: Fonts.LeagueSpartanBold,
  },

  cardHintPurple: {
    fontSize: 11,
    color: "#7c3aed",
    fontFamily: Fonts.LeagueSpartanSemiBold,
  },

  achvCol: {
    gap: 10,
  },

  achvRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },

  achvYellow: {
    backgroundColor: "#fffbeb",
    borderColor: "#fef08a",
  },

  achvGreen: {
    backgroundColor: "#f0fdf4",
    borderColor: "#bbf7d0",
  },

  achvBlue: {
    backgroundColor: "#eff6ff",
    borderColor: "#bfdbfe",
  },

  achvIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },

  achvTextCol: {
    flex: 1,
  },

  achvTitle: {
    color: "#111827",
    fontFamily: Fonts.LeagueSpartanBold,
  },

  achvSub: {
    color: "#4b5563",
    fontSize: 13,
    fontFamily: Fonts.LeagueSpartanMedium,
  },

  achvEmoji: {
    fontSize: 16,
  },

  loadingWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },

  loadingText: {
    color: "#6b7280",
    fontSize: 13,
    fontFamily: Fonts.LeagueSpartanMedium,
  },
});
