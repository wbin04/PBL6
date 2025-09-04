import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";
import { Building2, Check, ChevronDown, ChevronLeft, Plus } from "lucide-react-native";
import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";

import { Fonts } from "@/constants/Fonts";

type ViewMode = "select" | "add";

type Bank = { id: string; name: string; fullName: string };

const vietnameseBanks: Bank[] = [
  { id: "vcb", name: "Vietcombank", fullName: "Ngân hàng TMCP Ngoại thương Việt Nam" },
  { id: "bidv", name: "BIDV", fullName: "Ngân hàng TMCP Đầu tư và Phát triển Việt Nam" },
  { id: "tcb", name: "Techcombank", fullName: "Ngân hàng TMCP Kỹ thương Việt Nam" },
  { id: "mb", name: "MB Bank", fullName: "Ngân hàng TMCP Quân đội" },
  { id: "acb", name: "ACB", fullName: "Ngân hàng TMCP Á Châu" },
  { id: "vpb", name: "VPBank", fullName: "Ngân hàng TMCP Việt Nam Thịnh vượng" },
  { id: "tpb", name: "TPBank", fullName: "Ngân hàng TMCP Tiên Phong" },
  { id: "stb", name: "Sacombank", fullName: "Ngân hàng TMCP Sài Gòn Thương tín" },
];

type SavedBankAccount = {
  id: string;
  bankName: string;
  bankFullName: string;
  maskedAccountNumber: string;
  accountHolderName: string;
  isDefault: boolean;
};

const YELLOW = "#f5cb58";
const BROWN = "#391713";
const ORANGE = "#e95322";

export default function BankAccountScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();

  const [viewMode, setViewMode] = useState<ViewMode>("select");

  const [savedAccounts] = useState<SavedBankAccount[]>([
    {
      id: "1",
      bankName: "Vietcombank",
      bankFullName: "Ngân hàng TMCP Ngoại thương Việt Nam",
      maskedAccountNumber: "****5678",
      accountHolderName: "NGUYEN VAN A",
      isDefault: true,
    },
    {
      id: "2",
      bankName: "Techcombank",
      bankFullName: "Ngân hàng TMCP Kỹ thương Việt Nam",
      maskedAccountNumber: "****9012",
      accountHolderName: "NGUYEN VAN A",
      isDefault: false,
    },
  ]);
  const [selectedExistingAccount, setSelectedExistingAccount] = useState<string>("");

  const [selectedBank, setSelectedBank] = useState<string>("");
  const [accountNumber, setAccountNumber] = useState<string>("");
  const [accountHolderName, setAccountHolderName] = useState<string>("");
  const [branch, setBranch] = useState<string>("");
  const [isDefault, setIsDefault] = useState<boolean>(false);

  const [showBankList, setShowBankList] = useState<boolean>(false);
  const [searchBank, setSearchBank] = useState<string>("");
  const [verifyingAccount, setVerifyingAccount] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const filteredBanks = useMemo(() => {
    const q = searchBank.trim().toLowerCase();
    if (!q) return vietnameseBanks;
    return vietnameseBanks.filter(
      (b) => b.name.toLowerCase().includes(q) || b.fullName.toLowerCase().includes(q)
    );
  }, [searchBank]);

  const selectedBankInfo = useMemo(
    () => vietnameseBanks.find((b) => b.id === selectedBank),
    [selectedBank]
  );

  const validateAccountNumber = (bankId: string, accountNum: string) => {
    const digits = accountNum.replace(/\D/g, "");
    switch (bankId) {
      case "vcb":
        return digits.length >= 9 && digits.length <= 14;
      case "bidv":
        return digits.length >= 9 && digits.length <= 13;
      case "tcb":
        return digits.length >= 9 && digits.length <= 12;
      default:
        return digits.length >= 9 && digits.length <= 14;
    }
  };

  const handleAccountNumberChange = async (value: string) => {
    const digits = value.replace(/\D/g, "");
    setAccountNumber(digits);
    if (selectedBank && digits.length >= 9) {
      setVerifyingAccount(true);
      try {
        await new Promise<void>((r) => setTimeout(r, 1500));
        setAccountHolderName("NGUYEN VAN A");
      } finally {
        setVerifyingAccount(false);
      }
    }
  };

  const validateForm = () => {
    const e: Record<string, string> = {};
    if (!selectedBank) e.bank = "Vui lòng chọn ngân hàng";
    if (!accountNumber.trim()) {
      e.accountNumber = "Vui lòng nhập số tài khoản";
    } else if (!validateAccountNumber(selectedBank, accountNumber)) {
      e.accountNumber = `Số tài khoản không đúng định dạng của ${selectedBankInfo?.name ?? ""}`;
    }
    if (!accountHolderName.trim()) e.accountHolderName = "Vui lòng nhập tên chủ tài khoản";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSelectExistingAccount = async () => {
    if (!selectedExistingAccount) return;
    setLoading(true);
    try {
      await new Promise<void>((r) => setTimeout(r, 1000));
      const picked = savedAccounts.find((a) => a.id === selectedExistingAccount);
      if (picked) {
        await AsyncStorage.setItem("selectedBankAccount", picked.maskedAccountNumber);
      }
      navigation.goBack();
    } catch {
      setErrors({ general: "Có lỗi xảy ra, vui lòng thử lại" });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!validateForm()) return;
    setLoading(true);
    try {
      await new Promise<void>((r) => setTimeout(r, 2000));
      const masked = `****${accountNumber.slice(-4)}`;
      await AsyncStorage.setItem("selectedBankAccount", masked);
      navigation.goBack();
    } catch {
      setErrors({ general: "Có lỗi xảy ra, vui lòng thử lại" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.7}>
          <ChevronLeft size={24} color={BROWN} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {viewMode === "select" ? "Chọn tài khoản ngân hàng" : "Thêm tài khoản ngân hàng"}
        </Text>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.select({ ios: "padding", android: undefined })}
        keyboardVerticalOffset={Platform.select({ ios: 8, android: 0 })}
      >
        <View style={styles.bodyWrapper}>
          <View style={styles.toggleWrap}>
            <TouchableOpacity
              onPress={() => setViewMode("select")}
              style={[styles.toggleBtn, viewMode === "select" && styles.toggleBtnActive]}
              activeOpacity={0.8}
            >
              <Text
                style={[styles.toggleText, viewMode === "select" ? styles.toggleTextActive : styles.toggleTextMuted]}
              >
                Tài khoản hiện có
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setViewMode("add")}
              style={[styles.toggleBtn, viewMode === "add" && styles.toggleBtnActive]}
              activeOpacity={0.8}
            >
              <Text
                style={[styles.toggleText, viewMode === "add" ? styles.toggleTextActive : styles.toggleTextMuted]}
              >
                Thêm tài khoản mới
              </Text>
            </TouchableOpacity>
          </View>

          {viewMode === "select" ? (
            <>
              <FlatList
                data={savedAccounts}
                keyExtractor={(item) => item.id}
                contentContainerStyle={{ paddingBottom: 16 }}
                ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
                renderItem={({ item }) => {
                  const selected = selectedExistingAccount === item.id;
                  return (
                    <TouchableOpacity
                      onPress={() => setSelectedExistingAccount(item.id)}
                      activeOpacity={0.85}
                      style={[styles.card, selected ? styles.cardSelected : styles.cardDefault]}
                    >
                      <View style={styles.cardRow}>
                        <View style={styles.bankIconWrap}>
                          <Building2 size={24} color={ORANGE} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.bankName}>{item.bankName}</Text>
                          <Text style={styles.bankSub}>{item.maskedAccountNumber}</Text>
                          <Text style={styles.bankSub}>{item.accountHolderName}</Text>
                        </View>

                        <View style={styles.rightCol}>
                          {item.isDefault && (
                            <View style={styles.badge}>
                              <Text style={styles.badgeText}>Mặc định</Text>
                            </View>
                          )}
                          <View style={[styles.radio, selected ? styles.radioActive : styles.radioIdle]}>
                            {selected && <Check size={14} color="#fff" />}
                          </View>
                        </View>
                      </View>
                    </TouchableOpacity>
                  );
                }}
                ListFooterComponent={
                  <TouchableOpacity
                    onPress={() => setViewMode("add")}
                    activeOpacity={0.85}
                    style={styles.addDashed}
                  >
                    <Plus size={24} color="#9ca3af" />
                    <Text style={styles.addDashedText}>Thêm tài khoản mới</Text>
                  </TouchableOpacity>
                }
              />

              {/* Actions */}
              <View style={styles.actionsRow}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.btnGhost} activeOpacity={0.8}>
                  <Text style={styles.btnGhostText}>Hủy</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleSelectExistingAccount}
                  disabled={!selectedExistingAccount || loading}
                  style={[styles.btnPrimary, (!selectedExistingAccount || loading) && styles.btnDisabled]}
                  activeOpacity={0.85}
                >
                  <Text style={styles.btnPrimaryText}>{loading ? "Đang chọn..." : "Chọn tài khoản này"}</Text>
                </TouchableOpacity>
              </View>
            </>
          ) : (
            <ScrollView contentContainerStyle={{ paddingBottom: 24 }} keyboardShouldPersistTaps="handled">
              {/* Account Preview */}
              <LinearGradient
                colors={["#e95322", "#f5cb58"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.preview}
              >
                <View style={styles.previewHeader}>
                  <Building2 size={28} color="#fff" />
                  <View style={{ marginLeft: 12, flex: 1 }}>
                    <Text style={styles.previewBankName}>{selectedBankInfo?.name || "Chọn ngân hàng"}</Text>
                    <Text style={styles.previewBankFull}>{selectedBankInfo?.fullName || ""}</Text>
                  </View>
                </View>

                <View style={{ marginBottom: 8 }}>
                  <Text style={styles.previewLabel}>Số tài khoản</Text>
                  <Text style={styles.previewAccount}>{accountNumber ? accountNumber : "••••••••••"}</Text>
                </View>
                <View>
                  <Text style={styles.previewLabel}>Tên chủ tài khoản</Text>
                  <Text style={styles.previewHolder}>{accountHolderName ? accountHolderName : "TÊN CHỦ TÀI KHOẢN"}</Text>
                </View>
              </LinearGradient>

              {/* Form */}
              <View style={{ marginTop: 16 }}>
                <Text style={styles.label}>Ngân hàng</Text>
                <TouchableOpacity
                  onPress={() => setShowBankList(true)}
                  activeOpacity={0.85}
                  style={[styles.inputLike, styles.rowBetween]}
                >
                  <Text style={[styles.inputText, selectedBankInfo ? styles.textPrimary : styles.textMuted]}>
                    {selectedBankInfo ? selectedBankInfo.name : "Chọn ngân hàng"}
                  </Text>
                  <ChevronDown size={20} color="#9ca3af" />
                </TouchableOpacity>
                {!!errors.bank && <Text style={styles.errorText}>{errors.bank}</Text>}
              </View>

              <View style={{ marginTop: 12 }}>
                <Text style={styles.label}>Số tài khoản</Text>
                <TextInput
                  value={accountNumber}
                  onChangeText={handleAccountNumberChange}
                  placeholder="1234567890"
                  keyboardType="number-pad"
                  style={styles.input}
                />
                {!!errors.accountNumber && <Text style={styles.errorText}>{errors.accountNumber}</Text>}
              </View>

              <View style={{ marginTop: 12 }}>
                <Text style={styles.label}>Tên chủ tài khoản</Text>
                <View style={{ position: "relative" }}>
                  <TextInput
                    value={accountHolderName}
                    onChangeText={(t) => setAccountHolderName(t.toUpperCase())}
                    placeholder="NGUYEN VAN A"
                    style={[styles.input, verifyingAccount && { paddingRight: 36 }]}
                    editable={!verifyingAccount}
                  />
                  {verifyingAccount && (
                    <View style={styles.spinnerWrap}>
                      <ActivityIndicator size="small" />
                    </View>
                  )}
                </View>
                {!!errors.accountHolderName && <Text style={styles.errorText}>{errors.accountHolderName}</Text>}
              </View>

              <View style={{ marginTop: 12 }}>
                <Text style={styles.label}>Chi nhánh (tùy chọn)</Text>
                <TextInput
                  value={branch}
                  onChangeText={setBranch}
                  placeholder="Chi nhánh Hồ Chí Minh"
                  style={styles.input}
                />
              </View>

              <View style={styles.rowBetweenCenter}>
                <Text style={styles.toggleTitle}>Đặt làm tài khoản mặc định</Text>
                <TouchableOpacity
                  onPress={() => setIsDefault((v) => !v)}
                  activeOpacity={0.8}
                  style={[styles.switch, isDefault ? styles.switchOn : styles.switchOff]}
                >
                  <View style={[styles.switchDot, isDefault ? { transform: [{ translateX: 24 }] } : null]} />
                </TouchableOpacity>
              </View>

              <View style={styles.infoBox}>
                <Text style={styles.infoText}>
                  🔒 Thông tin tài khoản của bạn được mã hóa và bảo mật. Chúng tôi không lưu trữ thông tin nhạy cảm.
                </Text>
              </View>

              {!!errors.general && (
                <View style={styles.errBox}>
                  <Text style={styles.errText}>{errors.general}</Text>
                </View>
              )}

              <View style={[styles.actionsRow, { marginTop: 16 }]}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.btnGhost} activeOpacity={0.8}>
                  <Text style={styles.btnGhostText}>Hủy</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleSave}
                  disabled={loading}
                  style={[styles.btnPrimary, loading && styles.btnDisabled]}
                  activeOpacity={0.85}
                >
                  <Text style={styles.btnPrimaryText}>{loading ? "Đang lưu..." : "Lưu"}</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          )}
        </View>
      </KeyboardAvoidingView>

      {/* Bank picker */}
      <Modal
        animationType="slide"
        transparent
        visible={showBankList}
        onRequestClose={() => setShowBankList(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>Chọn ngân hàng</Text>
            <TextInput
              placeholder="Tìm kiếm ngân hàng..."
              value={searchBank}
              onChangeText={setSearchBank}
              style={styles.searchInput}
            />
            <FlatList
              data={filteredBanks}
              keyExtractor={(item) => item.id}
              ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
              renderItem={({ item }) => (
                <TouchableOpacity
                  onPress={() => {
                    setSelectedBank(item.id);
                    setShowBankList(false);
                    setSearchBank("");
                  }}
                  style={styles.bankRow}
                  activeOpacity={0.85}
                >
                  <Text style={styles.bankRowName}>{item.name}</Text>
                  <Text style={styles.bankRowFull}>{item.fullName}</Text>
                </TouchableOpacity>
              )}
              contentContainerStyle={{ paddingBottom: 8 }}
              style={{ maxHeight: 360 }}
            />

            <TouchableOpacity
              onPress={() => setShowBankList(false)}
              style={[styles.btnGhost, { marginTop: 12 }]}
              activeOpacity={0.85}
            >
              <Text style={styles.btnGhostText}>Đóng</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: YELLOW,
  },
  header: {
    backgroundColor: YELLOW,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingBottom: 12,
    paddingTop: 40,
  },
  backBtn: { marginRight: 12, padding: 4 },
  headerTitle: {
    color: "#fff",
    fontSize: 22,
    fontFamily: Fonts.LeagueSpartanSemiBold,
    fontWeight: "700",
  },

  bodyWrapper: {
    flex: 1,
    backgroundColor: "#fff",
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingHorizontal: 24,
    paddingTop: 24,
  },

  // Toggle
  toggleWrap: {
    flexDirection: "row",
    backgroundColor: "#f3f4f6",
    padding: 4,
    borderRadius: 12,
    marginBottom: 16,
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: "center",
  },
  toggleBtnActive: {
    backgroundColor: "#fff",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  toggleText: {
    fontSize: 14,
    fontFamily: Fonts.LeagueSpartanMedium,
    fontWeight: "500",
  },
  toggleTextActive: { color: BROWN },
  toggleTextMuted: { color: "#6b7280" },

  // Cards
  card: {
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
  },
  cardDefault: {
    borderColor: "#e5e7eb",
    backgroundColor: "#fff",
  },
  cardSelected: {
    borderColor: ORANGE,
    backgroundColor: "rgba(233,83,34,0.05)",
  },
  cardRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  bankIconWrap: { marginRight: 12 },
  bankName: {
    color: BROWN,
    fontSize: 16,
    fontFamily: Fonts.LeagueSpartanMedium ?? undefined,
    fontWeight: Fonts.LeagueSpartanMedium ? "normal" : "600",
  },
  bankSub: { color: "#6b7280", fontSize: 13, marginTop: 2 },

  rightCol: { alignItems: "flex-end", gap: 8 },
  badge: {
    backgroundColor: ORANGE,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  badgeText: { color: "#fff", fontSize: 12 },

  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  radioIdle: { borderColor: "#d1d5db" },
  radioActive: { borderColor: ORANGE, backgroundColor: ORANGE },

  // Preview
  preview: {
    borderRadius: 16,
    padding: 16,
    backgroundColor: ORANGE,
  },
  previewHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  previewBankName: { color: "#fff", fontSize: 16, fontWeight: "600" },
  previewBankFull: { color: "#fff", opacity: 0.8, fontSize: 12 },
  previewLabel: { color: "#fff", opacity: 0.8, fontSize: 12 },
  previewAccount: { color: "#fff", fontSize: 18, letterSpacing: 1, fontFamily: "monospace" },
  previewHolder: { color: "#fff", fontSize: 16, fontWeight: "600" },

  // Inputs
  label: {
    color: BROWN,
    fontSize: 14,
    marginBottom: 8,
    fontFamily: Fonts.LeagueSpartanMedium ?? undefined,
  },
  input: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: BROWN,
  },
  inputLike: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  inputText: { fontSize: 16 },
  textMuted: { color: "#9ca3af" },
  textPrimary: { color: BROWN },

  spinnerWrap: {
    position: "absolute",
    right: 10,
    top: 0,
    bottom: 0,
    justifyContent: "center",
  },

  // Switch
  rowBetween: { flexDirection: "row", justifyContent: "space-between" },
  rowBetweenCenter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    marginTop: 8,
  },
  toggleTitle: {
    color: BROWN,
    fontFamily: Fonts.LeagueSpartanMedium ?? undefined,
    fontSize: 15,
  },
  switch: {
    width: 48,
    height: 24,
    borderRadius: 999,
    padding: 2,
    justifyContent: "center",
  },
  switchOn: { backgroundColor: ORANGE },
  switchOff: { backgroundColor: "#d1d5db" },
  switchDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#fff",
  },

  // Info & errors
  infoBox: {
    backgroundColor: "#eff6ff",
    borderRadius: 12,
    padding: 12,
    marginTop: 12,
  },
  infoText: { color: "#1d4ed8", fontSize: 12 },
  errBox: {
    backgroundColor: "#fef2f2",
    borderRadius: 12,
    padding: 12,
    marginTop: 12,
  },
  errText: { color: "#b91c1c", fontSize: 13 },
  errorText: { color: "#ef4444", marginTop: 6, fontSize: 12 },

  // Actions
  actionsRow: { flexDirection: "row", gap: 12, marginTop: 16, marginBottom: 16 },
  btnGhost: { flex: 1, paddingVertical: 12, alignItems: "center" },
  btnGhostText: { color: BROWN, fontSize: 16, fontFamily: Fonts.LeagueSpartanMedium ?? undefined },
  btnPrimary: {
    flex: 1,
    backgroundColor: ORANGE,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
  },
  btnPrimaryText: { color: "#fff", fontSize: 16, fontFamily: Fonts.LeagueSpartanMedium ?? undefined },
  btnDisabled: { opacity: 0.5 },

  // Modal
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.3)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    backgroundColor: "#fff",
    padding: 16,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  modalTitle: {
    fontSize: 16,
    color: BROWN,
    fontFamily: Fonts.LeagueSpartanSemiBold ?? undefined,
    marginBottom: 8,
  },
  searchInput: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
  },
  bankRow: {
    borderWidth: 1,
    borderColor: "#f3f4f6",
    borderRadius: 12,
    padding: 12,
  },

  addDashed: {
    borderWidth: 2,
    borderStyle: "dashed",
    borderColor: "#d1d5db",
    backgroundColor: "#f9fafb",
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 12,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 16,
  },

  addDashedText: {
    fontFamily: Fonts.LeagueSpartanMedium,
    fontSize: 15,
    color: "#6b7280",
    marginTop: 6,
  },

  bankRowName: { color: BROWN, fontWeight: "600" },
  bankRowFull: { color: "#6b7280", fontSize: 12, marginTop: 2 },

  rowBetweenJustify: { flexDirection: "row", justifyContent: "space-between" },
  rowBetweenAlignCenter: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  rowBetweenEnd: { flexDirection: "row", justifyContent: "flex-end" },
  rowBetweenSpaceEvenly: { flexDirection: "row", justifyContent: "space-evenly" },
});
