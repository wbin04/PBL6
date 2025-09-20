import { Fonts } from "@/constants/Fonts";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";
import { Check, ChevronLeft, CreditCard, Eye, EyeOff, Plus } from "lucide-react-native";
import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
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

type ViewMode = "select" | "add";

type SavedCard = {
  id: string;
  maskedNumber: string;
  brand: string;
  holderName: string;
  expiryDate: string;
  isDefault: boolean;
};

const YELLOW = "#f5cb58";
const BROWN = "#391713";
const ORANGE = "#e95322";

export default function CardPaymentScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();

  const [viewMode, setViewMode] = useState<ViewMode>("select");
  const [selectedExistingCard, setSelectedExistingCard] = useState<string>("");
  const [savedCards] = useState<SavedCard[]>([
    { id: "1", maskedNumber: "****1234", brand: "Visa",       holderName: "NGUYEN VAN A", expiryDate: "12/25", isDefault: true },
    { id: "2", maskedNumber: "****5678", brand: "Mastercard", holderName: "NGUYEN VAN A", expiryDate: "08/26", isDefault: false },
  ]);

  const [cardNumber, setCardNumber] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [cvv, setCvv] = useState("");
  const [cardholderName, setCardholderName] = useState("");
  const [showCvv, setShowCvv] = useState(false);
  const [isDefault, setIsDefault] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [verifyingBin, setVerifyingBin] = useState(false);

  // --- Brand detection -------------------------------------------------------
  const getCardBrand = (value: string) => {
    const digits = value.replace(/\D/g, "");
    if (/^3[47]/.test(digits)) return "Amex";
    if (/^4/.test(digits)) return "Visa";
    if (/^(5|2(2[2-9]\d|2\d{2}|[3-6]\d{2}|7[01]\d|720))/.test(digits)) return "Mastercard";
    if (/^(62|9704)/.test(digits)) return "NAPAS";
    if (/^35/.test(digits)) return "JCB";
    return "Unknown";
  };

  const brand = useMemo(() => getCardBrand(cardNumber), [cardNumber]);

  // --- Formatting & placeholders --------------------------------------------
  const placeholderForBrand = (b: string) =>
    b === "Amex" ? "•••• •••••• •••••" : "•••• •••• •••• ••••";

  const formatCardNumberByBrand = (value: string) => {
    const digits = value.replace(/\D/g, "");
    const b = getCardBrand(digits);
    if (b === "Amex") {
      const trimmed = digits.slice(0, 15);
      // 4-6-5
      return trimmed
        .replace(/^(\d{0,4})(\d{0,6})?(\d{0,5})?.*$/, (_, a = "", b = "", c = "") =>
          [a, b, c].filter(Boolean).join(" ")
        )
        .trim();
    }
    // default: groups of 4, up to 19
    const trimmed = digits.slice(0, 19);
    return trimmed.replace(/(\d{4})(?=\d)/g, "$1 ").trim();
  };

  const formatExpiryDate = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 4);
    return digits.length >= 2 ? `${digits.slice(0, 2)}/${digits.slice(2)}` : digits;
  };

  // --- Validators ------------------------------------------------------------
  const luhnValid = (pan: string) => {
    const digits = pan.replace(/\D/g, "");
    let sum = 0;
    let alt = false;
    for (let i = digits.length - 1; i >= 0; i--) {
      let n = Number.parseInt(digits[i]!, 10);
      if (alt) {
        n *= 2;
        if (n > 9) n -= 9;
      }
      sum += n;
      alt = !alt;
    }
    return digits.length >= 12 && digits.length <= 19 && sum % 10 === 0;
  };

  const isExpiryValid = (mmyy: string) => {
    const parts = mmyy.split("/");
    if (parts.length !== 2) return false;
    const mm = Number.parseInt(parts[0]!, 10);
    const yy = Number.parseInt(parts[1]!, 10);
    if (mm < 1 || mm > 12) return false;
    const now = new Date();
    const currentYear = now.getFullYear() % 100;
    const currentMonth = now.getMonth() + 1;
    if (yy < currentYear || (yy === currentYear && mm < currentMonth)) return false;
    return true;
  };

  // --- Handlers --------------------------------------------------------------
  const onChangeCardNumber = (val: string) => {
    const formatted = formatCardNumberByBrand(val);
    setCardNumber(formatted);
    const digits = formatted.replace(/\D/g, "");
    if (digits.length >= 6) {
      setVerifyingBin(true);
      setTimeout(() => setVerifyingBin(false), 500);
    }
  };

  const validateForm = () => {
    const e: Record<string, string> = {};
    const digits = cardNumber.replace(/\D/g, "");
    const b = brand;

    if (!digits) e.cardNumber = "Vui lòng nhập số thẻ";
    else if (b === "Amex" && digits.length !== 15) e.cardNumber = "Amex phải 15 số (định dạng 4-6-5)";
    else if (b !== "Amex" && (digits.length < 12 || digits.length > 19)) e.cardNumber = "Số thẻ không hợp lệ";
    else if (!luhnValid(cardNumber)) e.cardNumber = "Số thẻ không hợp lệ";

    if (!expiryDate.trim()) e.expiryDate = "Vui lòng nhập ngày hết hạn";
    else if (!isExpiryValid(expiryDate)) e.expiryDate = "Ngày hết hạn không hợp lệ";

    const expectedCvv = b === "Amex" ? 4 : 3;
    if (!cvv.trim()) e.cvv = "Vui lòng nhập mã CVV";
    else if (cvv.length !== expectedCvv) e.cvv = b === "Amex" ? "CVV Amex phải 4 số" : "CVV phải 3 số";

    if (!cardholderName.trim()) e.cardholderName = "Vui lòng nhập tên chủ thẻ";

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSelectExistingCard = async () => {
    if (!selectedExistingCard) return;
    setLoading(true);
    try {
      await new Promise<void>((r) => setTimeout(r, 1000));
      const selected = savedCards.find((c) => c.id === selectedExistingCard);
      if (selected) await AsyncStorage.setItem("selectedCard", selected.maskedNumber);
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
      await new Promise<void>((r) => setTimeout(r, 1500));
      const masked = `****${cardNumber.replace(/\D/g, "").slice(-4)}`;
      await AsyncStorage.setItem("selectedCard", masked);
      navigation.goBack();
    } catch {
      setErrors({ general: "Có lỗi xảy ra, vui lòng thử lại" });
    } finally {
      setLoading(false);
    }
  };

  const cvvMax = brand === "Amex" ? 4 : 3;

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.7}>
          <ChevronLeft size={24} color={BROWN} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{viewMode === "select" ? "Chọn thẻ thanh toán" : "Thêm thẻ ngân hàng"}</Text>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.select({ ios: "padding", android: undefined })} keyboardVerticalOffset={Platform.select({ ios: 8, android: 0 })}>
        <View style={styles.bodyWrapper}>
          <View style={styles.toggleWrap}>
            <TouchableOpacity onPress={() => setViewMode("select")} style={[styles.toggleBtn, viewMode === "select" && styles.toggleBtnActive]} activeOpacity={0.8}>
              <Text style={[styles.toggleText, viewMode === "select" ? styles.toggleTextActive : styles.toggleTextMuted]}>Thẻ hiện có</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setViewMode("add")} style={[styles.toggleBtn, viewMode === "add" && styles.toggleBtnActive]} activeOpacity={0.8}>
              <Text style={[styles.toggleText, viewMode === "add" ? styles.toggleTextActive : styles.toggleTextMuted]}>Thêm thẻ mới</Text>
            </TouchableOpacity>
          </View>

          {viewMode === "select" ? (
            <>
              <FlatList
                data={savedCards}
                keyExtractor={(item) => item.id}
                contentContainerStyle={{ paddingBottom: 16 }}
                ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
                renderItem={({ item }) => {
                  const selected = selectedExistingCard === item.id;
                  return (
                    <TouchableOpacity onPress={() => setSelectedExistingCard(item.id)} activeOpacity={0.85} style={[styles.card, selected ? styles.cardSelected : styles.cardDefault]}>
                      <View style={styles.cardRow}>
                        <View style={styles.bankIconWrap}><CreditCard size={24} color={ORANGE} /></View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.bankName}>{item.brand} {item.maskedNumber}</Text>
                          <Text style={styles.bankSub}>{item.holderName}</Text>
                          <Text style={styles.bankSub}>Hết hạn: {item.expiryDate}</Text>
                        </View>
                        <View style={styles.rightCol}>
                          {item.isDefault && <View style={styles.badge}><Text style={styles.badgeText}>Mặc định</Text></View>}
                          <View style={[styles.radio, selected ? styles.radioActive : styles.radioIdle]}>{selected && <Check size={14} color="#fff" />}</View>
                        </View>
                      </View>
                    </TouchableOpacity>
                  );
                }}
                ListFooterComponent={
                  <TouchableOpacity onPress={() => setViewMode("add")} activeOpacity={0.85} style={styles.addDashed}>
                    <Plus size={24} color="#9ca3af" />
                    <Text style={styles.addDashedText}>Thêm thẻ mới</Text>
                  </TouchableOpacity>
                }
              />

              <View style={styles.actionsRow}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.btnGhost} activeOpacity={0.8}>
                  <Text style={styles.btnGhostText}>Hủy</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={handleSelectExistingCard} disabled={!selectedExistingCard || loading} style={[styles.btnPrimary, (!selectedExistingCard || loading) && styles.btnDisabled]} activeOpacity={0.85}>
                  <Text style={styles.btnPrimaryText}>{loading ? "Đang chọn..." : "Chọn thẻ này"}</Text>
                </TouchableOpacity>
              </View>
            </>
          ) : (
            <ScrollView contentContainerStyle={{ paddingBottom: 24 }} keyboardShouldPersistTaps="handled">
              <LinearGradient colors={["#e95322", "#f5cb58"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.previewCard}>
                <View style={styles.previewHeader}>
                  <CreditCard size={28} color="#fff" />
                  <View style={{ flex: 1 }} />
                  <Text style={styles.previewBrand}>{brand}</Text>
                </View>
                <View style={{ marginBottom: 12 }}>
                  <Text style={styles.previewNumber}>
                    {cardNumber || placeholderForBrand(brand)}
                  </Text>
                </View>
                <View style={styles.previewBottomRow}>
                  <View>
                    <Text style={styles.previewLabel}>Tên chủ thẻ</Text>
                    <Text style={styles.previewHolder}>{cardholderName.toUpperCase() || "TÊN CHỦ THẺ"}</Text>
                  </View>
                  <View style={{ alignItems: "flex-end" }}>
                    <Text style={styles.previewLabel}>Hết hạn</Text>
                    <Text style={styles.previewHolder}>{expiryDate || "MM/YY"}</Text>
                  </View>
                </View>
              </LinearGradient>

              {/* Form */}
              <View style={{ marginTop: 16 }}>
                <Text style={styles.label}>Số thẻ</Text>
                <View style={{ position: "relative" }}>
                  <TextInput
                    value={cardNumber}
                    onChangeText={onChangeCardNumber}
                    placeholder={placeholderForBrand(brand)}
                    keyboardType="number-pad"
                    style={styles.input}
                  />
                  {verifyingBin && <View style={styles.spinnerWrap}><ActivityIndicator size="small" /></View>}
                </View>
                {!!errors.cardNumber && <Text style={styles.errorText}>{errors.cardNumber}</Text>}
              </View>

              <View style={{ marginTop: 12, flexDirection: "row", gap: 12 }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>Ngày hết hạn</Text>
                  <TextInput
                    value={expiryDate}
                    onChangeText={(v) => setExpiryDate(formatExpiryDate(v))}
                    placeholder="MM/YY"
                    keyboardType="number-pad"
                    style={styles.input}
                    maxLength={5}
                  />
                  {!!errors.expiryDate && <Text style={styles.errorText}>{errors.expiryDate}</Text>}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>CVV</Text>
                  <View style={{ position: "relative" }}>
                    <TextInput
                      value={cvv}
                      onChangeText={(v) => setCvv(v.replace(/\D/g, "").slice(0, cvvMax))}
                      placeholder={brand === "Amex" ? "1234" : "123"}
                      keyboardType="number-pad"
                      secureTextEntry={!showCvv}
                      style={[styles.input, { paddingRight: 44 }]}
                      maxLength={cvvMax}
                    />
                    <TouchableOpacity onPress={() => setShowCvv((s) => !s)} style={styles.eyeBtn} activeOpacity={0.8}>
                      {showCvv ? <EyeOff size={20} color="#9ca3af" /> : <Eye size={20} color="#9ca3af" />}
                    </TouchableOpacity>
                  </View>
                  {!!errors.cvv && <Text style={styles.errorText}>{errors.cvv}</Text>}
                </View>
              </View>

              <View style={{ marginTop: 12 }}>
                <Text style={styles.label}>Tên chủ thẻ</Text>
                <TextInput
                  value={cardholderName}
                  onChangeText={(t) => setCardholderName(t.replace(/[^a-zA-Z\s]/g, "").toUpperCase())}
                  placeholder="NGUYEN VAN A"
                  style={styles.input}
                  autoCapitalize="characters"
                />
                {!!errors.cardholderName && <Text style={styles.errorText}>{errors.cardholderName}</Text>}
              </View>

              <View style={styles.rowBetweenCenter}>
                <Text style={styles.toggleTitle}>Đặt làm thẻ mặc định</Text>
                <TouchableOpacity onPress={() => setIsDefault((v) => !v)} activeOpacity={0.8} style={[styles.switch, isDefault ? styles.switchOn : styles.switchOff]}>
                  <View style={[styles.switchDot, isDefault ? { transform: [{ translateX: 24 }] } : null]} />
                </TouchableOpacity>
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
                <TouchableOpacity onPress={handleSave} disabled={loading} style={[styles.btnPrimary, loading && styles.btnDisabled]} activeOpacity={0.85}>
                  <Text style={styles.btnPrimaryText}>{loading ? "Đang lưu..." : "Lưu"}</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          )}
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: YELLOW },
  header: { backgroundColor: YELLOW, flexDirection: "row", alignItems: "center", paddingHorizontal: 24, paddingBottom: 12, paddingTop: 40 },
  backBtn: { marginRight: 12, padding: 4 },
  headerTitle: { color: "#fff", fontSize: 22, fontFamily: Fonts.LeagueSpartanSemiBold },

  bodyWrapper: { flex: 1, backgroundColor: "#fff", borderTopLeftRadius: 30, borderTopRightRadius: 30, paddingHorizontal: 24, paddingTop: 24 },

  toggleWrap: { flexDirection: "row", backgroundColor: "#f3f4f6", padding: 4, borderRadius: 12, marginBottom: 16 },
  toggleBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: "center" },
  toggleBtnActive: { backgroundColor: "#fff", shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  toggleText: { fontSize: 14, fontFamily: Fonts.LeagueSpartanMedium },
  toggleTextActive: { color: BROWN },
  toggleTextMuted: { color: "#6b7280" },

  card: { borderRadius: 12, padding: 16, borderWidth: 2 },
  cardDefault: { borderColor: "#e5e7eb", backgroundColor: "#fff" },
  cardSelected: { borderColor: ORANGE, backgroundColor: "rgba(233,83,34,0.05)" },
  cardRow: { flexDirection: "row", alignItems: "center" },
  bankIconWrap: { marginRight: 12 },
  bankName: { color: BROWN, fontSize: 16, fontFamily: Fonts.LeagueSpartanMedium },
  bankSub: { color: "#6b7280", fontSize: 13, marginTop: 2 },
  rightCol: { alignItems: "flex-end", gap: 8 },
  badge: { backgroundColor: ORANGE, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999 },
  badgeText: { color: "#fff", fontSize: 12 },

  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, alignItems: "center", justifyContent: "center" },
  radioIdle: { borderColor: "#d1d5db" },
  radioActive: { borderColor: ORANGE, backgroundColor: ORANGE },

  addDashed: { borderWidth: 2, borderStyle: "dashed", borderColor: "#d1d5db", backgroundColor: "#f9fafb", borderRadius: 12, paddingVertical: 16, paddingHorizontal: 12, alignItems: "center", justifyContent: "center", marginTop: 16 },
  addDashedText: { fontFamily: Fonts.LeagueSpartanMedium, fontSize: 15, color: "#6b7280", marginTop: 6 },

  previewCard: { borderRadius: 16, padding: 16, overflow: "hidden" },
  previewHeader: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
  previewBrand: { color: "#fff", fontFamily: Fonts.LeagueSpartanMedium, fontSize: 14 },
  previewNumber: { color: "#fff", fontSize: 20, letterSpacing: 1, fontFamily: Fonts.LeagueSpartanBold },
  previewLabel: { color: "#fff", opacity: 0.9, fontSize: 12, fontFamily: Fonts.LeagueSpartanRegular },
  previewHolder: { color: "#fff", fontSize: 16, fontFamily: Fonts.LeagueSpartanSemiBold, marginTop: 16 },
  previewBottomRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end" },

  label: { color: BROWN, fontSize: 14, marginBottom: 8, fontFamily: Fonts.LeagueSpartanMedium },
  input: { borderWidth: 1, borderColor: "#d1d5db", borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16, color: BROWN, fontFamily: Fonts.LeagueSpartanRegular },

  spinnerWrap: { position: "absolute", right: 10, top: 0, bottom: 0, justifyContent: "center" },
  eyeBtn: { position: "absolute", right: 10, top: 0, bottom: 0, justifyContent: "center" },

  rowBetweenCenter: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 10, marginTop: 8 },
  toggleTitle: { color: BROWN, fontFamily: Fonts.LeagueSpartanMedium, fontSize: 15 },
  switch: { width: 48, height: 24, borderRadius: 999, padding: 2, justifyContent: "center" },
  switchOn: { backgroundColor: ORANGE },
  switchOff: { backgroundColor: "#d1d5db" },
  switchDot: { width: 20, height: 20, borderRadius: 10, backgroundColor: "#fff" },

  errBox: { backgroundColor: "#fef2f2", borderRadius: 12, padding: 12, marginTop: 12 },
  errText: { color: "#b91c1c", fontSize: 13, fontFamily: Fonts.LeagueSpartanRegular },
  errorText: { color: "#ef4444", marginTop: 6, fontSize: 12, fontFamily: Fonts.LeagueSpartanRegular },

  actionsRow: { flexDirection: "row", gap: 12, marginTop: 16, marginBottom: 16 },
  btnGhost: { flex: 1, paddingVertical: 12, alignItems: "center" },
  btnGhostText: { color: BROWN, fontSize: 16, fontFamily: Fonts.LeagueSpartanMedium },
  btnPrimary: { flex: 1, backgroundColor: ORANGE, paddingVertical: 12, borderRadius: 12, alignItems: "center" },
  btnPrimaryText: { color: "#fff", fontSize: 16, fontFamily: Fonts.LeagueSpartanMedium },
  btnDisabled: { opacity: 0.5 },
});
