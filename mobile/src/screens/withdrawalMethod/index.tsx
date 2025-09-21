import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import {
  ArrowLeft,
  Building2,
  CreditCard,
  Check,
  AlertCircle,
  Shield,
  Clock,
  Plus,
  Wallet,
} from "lucide-react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Fonts } from "@/constants/Fonts";

type SavedAccount =
  | {
      id: string;
      type: "bank";
      name: string;
      bankName: string;
      accountNumber: string;
      accountHolder: string;
      isDefault?: boolean;
      color: string;
      icon: "bank";
    }
  | {
      id: string;
      type: "card";
      name: string;
      cardNumber: string;
      cardHolder: string;
      bankName: string;
      isDefault?: boolean;
      color: string;
      icon: "card";
    };

const ORANGE = "#ea580c";
const ORANGE_DARK = "#dc2626";
const GRAY_BG = "#f3f4f6";
const GRAY_BORDER = "#e5e7eb";
const BLUE_50 = "#eff6ff";
const BLUE_200 = "#bfdbfe";
const GREEN_100 = "#dcfce7";
const GREEN_600 = "#16a34a";
const YELLOW_50 = "#fffbeb";
const YELLOW_200 = "#fde68a";

export default function WithdrawalMethodsScreen() {
  const navigation = useNavigation();
  const [selectedMethod, setSelectedMethod] = useState<"" | "bank" | "card">("");
  const [bankAccount, setBankAccount] = useState("");
  const [bankName, setBankName] = useState("");
  const [accountHolder, setAccountHolder] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [cardHolder, setCardHolder] = useState("");
  const [selectedSavedAccount, setSelectedSavedAccount] = useState("");
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [step, setStep] = useState<0 | 1 | 2 | 3 | 4 | 5>(0);
  const [isLoading, setIsLoading] = useState(false);
  const [bankModalOpen, setBankModalOpen] = useState(false);

  const walletBalance = 2_500_000;

  const savedAccounts: SavedAccount[] = useMemo(
    () => [
      {
        id: "bank_1",
        type: "bank",
        name: "Tài khoản chính",
        bankName: "Vietcombank",
        accountNumber: "1234567890",
        accountHolder: "NGUYEN VAN A",
        isDefault: true,
        icon: "bank",
        color: "#dbeafe",
      },
      {
        id: "bank_2",
        type: "bank",
        name: "Tài khoản phụ",
        bankName: "Techcombank",
        accountNumber: "0987654321",
        accountHolder: "NGUYEN VAN A",
        isDefault: false,
        icon: "bank",
        color: "#dcfce7",
      },
      {
        id: "card_1",
        type: "card",
        name: "Thẻ Visa",
        cardNumber: "4111111111111111",
        cardHolder: "NGUYEN VAN A",
        bankName: "Vietcombank",
        isDefault: false,
        icon: "card",
        color: "#ede9fe",
      },
    ],
    []
  );

  const withdrawalMethods = useMemo(
    () => [
      {
        id: "bank" as const,
        name: "Chuyển khoản ngân hàng",
        description: "Rút tiền về tài khoản ngân hàng",
        fee: "Miễn phí",
        time: "1-2 ngày làm việc",
        icon: "bank" as const,
        color: "#dbeafe",
      },
      {
        id: "card" as const,
        name: "Thẻ ngân hàng",
        description: "Rút tiền về thẻ ATM/Visa/Mastercard",
        fee: "5,000₫",
        time: "30 phút - 2 giờ",
        icon: "card" as const,
        color: "#ede9fe",
      },
    ],
    []
  );

  const banks = useMemo(
    () => [
      "Vietcombank",
      "Techcombank",
      "BIDV",
      "VietinBank",
      "Agribank",
      "MB Bank",
      "ACB",
      "VPBank",
      "Sacombank",
      "TPBank",
    ],
    []
  );

  const selectedMethodInfo = useMemo(
    () => withdrawalMethods.find((m) => m.id === selectedMethod),
    [selectedMethod, withdrawalMethods]
  );
  const selectedSavedAccountInfo = useMemo(
    () => savedAccounts.find((a) => a.id === selectedSavedAccount),
    [selectedSavedAccount, savedAccounts]
  );

  const formatAmount = (value: string) => {
    const number = value.replace(/\D/g, "");
    return number.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  };

  const formatCardNumber = (value: string) => {
    const number = value.replace(/\D/g, "");
    return number.replace(/(\d{4})(?=\d)/g, "$1 ").slice(0, 19);
  };

  const handleSavedAccountSelect = (accountId: string) => {
    setSelectedSavedAccount(accountId);
  };

  const handleMethodSelect = (methodId: "bank" | "card") => {
    setSelectedMethod(methodId);
  };

  const handleContinue = () => {
    if (step === 0 && selectedSavedAccount) {
      setStep(1);
      return;
    }
    if (step === 0 && !selectedSavedAccount) {
      setStep(2);
      return;
    }
    if (step === 1) {
      const amount = parseInt(withdrawAmount.replace(/,/g, ""), 10);
      if (amount >= 50000 && amount <= walletBalance) setStep(4);
      return;
    }
    if (step === 2 && selectedMethod) {
      setStep(3);
      return;
    }
    if (step === 3) {
      if (selectedMethod === "bank" && bankAccount && bankName && accountHolder) {
        setIsLoading(true);
        setTimeout(() => {
          setIsLoading(false);
          setStep(4);
        }, 800);
      } else if (selectedMethod === "card" && cardNumber && cardHolder && bankName) {
        setIsLoading(true);
        setTimeout(() => {
          setIsLoading(false);
          setStep(4);
        }, 800);
      }
      return;
    }
    if (step === 4) {
      setIsLoading(true);
      setTimeout(() => {
        setIsLoading(false);
        setStep(5);
      }, 800);
    }
  };

  const amountNum = useMemo(
    () => (withdrawAmount ? parseInt(withdrawAmount.replace(/,/g, ""), 10) : 0),
    [withdrawAmount]
  );

  const feeText = useMemo(() => {
    if (selectedSavedAccountInfo?.type === "bank") return "Miễn phí";
    if (selectedSavedAccountInfo?.type === "card") return "5,000₫";
    return selectedMethodInfo?.fee ?? "—";
  }, [selectedSavedAccountInfo, selectedMethodInfo]);

  const timeText = useMemo(() => {
    if (selectedSavedAccountInfo?.type === "bank") return "1-2 ngày làm việc";
    if (selectedSavedAccountInfo?.type === "card") return "30 phút - 2 giờ";
    return selectedMethodInfo?.time ?? "—";
  }, [selectedSavedAccountInfo, selectedMethodInfo]);

  const totalReceive = useMemo(() => {
    const fee = selectedSavedAccountInfo?.type === "card" ? 5000 : 0;
    const v = Math.max(0, amountNum - fee);
    return `${formatAmount(v.toString())}₫`;
  }, [amountNum, selectedSavedAccountInfo]);

  const renderIcon = (name: "bank" | "card", size = 24, color = "#111827") => {
    if (name === "bank") return <Building2 size={size} color={color} />;
    return <CreditCard size={size} color={color} />;
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerBtn} onPress={() => navigation.goBack()}>
          <ArrowLeft size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { fontFamily: Fonts.LeagueSpartanBold }]}>
          Thiết lập phương thức rút tiền
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 28 }}>
        {step === 0 && (
          <View>
            <View style={{ marginBottom: 16 }}>
              <Text style={[styles.title, { fontFamily: Fonts.LeagueSpartanSemiBold }]}>Chọn tài khoản</Text>
              <Text style={[styles.muted, { fontFamily: Fonts.LeagueSpartanRegular }]}>
                Chọn tài khoản có sẵn hoặc thêm tài khoản mới
              </Text>
            </View>

            <View style={styles.walletCard}>
              <View style={styles.walletRow}>
                <View style={styles.walletIcon}>
                  <Wallet size={20} color="#fff" />
                </View>
                <View>
                  <Text style={[styles.walletCaption, { fontFamily: Fonts.LeagueSpartanRegular }]}>
                    Số dư ví hiện tại
                  </Text>
                  <Text style={[styles.walletAmount, { fontFamily: Fonts.LeagueSpartanBold }]}>
                    {formatAmount(walletBalance.toString())}₫
                  </Text>
                </View>
              </View>
            </View>

            {!!savedAccounts.length && (
              <View style={{ marginBottom: 16 }}>
                <Text
                  style={[
                    styles.sectionLabel,
                    { fontFamily: Fonts.LeagueSpartanMedium, marginBottom: 8 },
                  ]}
                >
                  Tài khoản đã lưu
                </Text>

                {savedAccounts.map((acc) => {
                  const picked = selectedSavedAccount === acc.id;
                  const right = picked ? (
                    <View style={styles.pickDot}>
                      <Check size={14} color="#fff" />
                    </View>
                  ) : null;

                  const sub =
                    acc.type === "bank"
                      ? `${acc.bankName} - ****${acc.accountNumber.slice(-4)}`
                      : `${acc.bankName} - ****${acc.cardNumber.slice(-4)}`;

                  const holder = acc.type === "bank" ? acc.accountHolder : acc.cardHolder;

                  return (
                    <TouchableOpacity
                      key={acc.id}
                      onPress={() => handleSavedAccountSelect(acc.id)}
                      style={[
                        styles.cardRow,
                        picked ? { borderColor: ORANGE, backgroundColor: "#fff7ed", shadowOpacity: 0.05 } : {},
                      ]}
                      activeOpacity={0.9}
                    >
                      <View style={[styles.avatar, { backgroundColor: acc.color }]}>
                        {renderIcon(acc.icon === "bank" ? "bank" : "card", 24, "#374151")}
                      </View>
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                          <Text style={[styles.cardTitle, { fontFamily: Fonts.LeagueSpartanMedium }]}>
                            {acc.name}
                          </Text>
                          {acc.isDefault ? <Text style={styles.defaultPill}>Mặc định</Text> : null}
                        </View>
                        <Text style={[styles.cardSub, { fontFamily: Fonts.LeagueSpartanRegular }]}>{sub}</Text>
                        <Text style={[styles.cardHint, { fontFamily: Fonts.LeagueSpartanLight }]}>{holder}</Text>
                      </View>
                      {right}
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}


            <TouchableOpacity
              onPress={handleContinue}
              disabled={!selectedSavedAccount}
              style={[styles.primaryBtn, !selectedSavedAccount && styles.disabledBtn]}
            >
              <Text style={[styles.primaryBtnText, { fontFamily: Fonts.LeagueSpartanSemiBold }]}>
                {selectedSavedAccount ? "Sử dụng tài khoản này" : "Chọn tài khoản"}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {step === 1 && (
          <View>
            <View style={{ marginBottom: 16 }}>
              <Text style={[styles.title, { fontFamily: Fonts.LeagueSpartanSemiBold }]}>Nhập số tiền rút</Text>
              <Text style={[styles.muted, { fontFamily: Fonts.LeagueSpartanRegular }]}>
                Nhập số tiền bạn muốn rút về tài khoản đã chọn
              </Text>
            </View>

            <View style={styles.walletCard}>
              <View style={styles.walletRow}>
                <View style={styles.walletIcon}>
                  <Wallet size={20} color="#fff" />
                </View>
                <View>
                  <Text style={[styles.walletCaption, { fontFamily: Fonts.LeagueSpartanRegular }]}>
                    Số dư ví hiện tại
                  </Text>
                  <Text style={[styles.walletAmount, { fontFamily: Fonts.LeagueSpartanBold }]}>
                    {formatAmount(walletBalance.toString())}₫
                  </Text>
                </View>
              </View>
            </View>

            {selectedSavedAccountInfo && (
              <View style={styles.infoCard}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                  <View style={[styles.avatar, { backgroundColor: selectedSavedAccountInfo.color, width: 40, height: 40 }]}>
                    {renderIcon(
                      selectedSavedAccountInfo.type === "bank" ? "bank" : "card",
                      20,
                      "#374151"
                    )}
                  </View>
                  <View>
                    <Text style={[styles.infoTitle, { fontFamily: Fonts.LeagueSpartanMedium }]}>
                      {selectedSavedAccountInfo.name}
                    </Text>
                    <Text style={[styles.cardSub, { fontFamily: Fonts.LeagueSpartanRegular }]}>
                      {selectedSavedAccountInfo.type === "bank"
                        ? `${selectedSavedAccountInfo.bankName} - ****${selectedSavedAccountInfo.accountNumber.slice(
                            -4
                          )}`
                        : `${selectedSavedAccountInfo.bankName} - ****${selectedSavedAccountInfo.cardNumber.slice(-4)}`}
                    </Text>
                  </View>
                </View>
              </View>
            )}

            <View style={{ marginBottom: 16 }}>
              <Text style={[styles.inputLabel, { fontFamily: Fonts.LeagueSpartanMedium }]}>Số tiền rút</Text>
              <View style={styles.amountWrap}>
                <TextInput
                  value={withdrawAmount}
                  onChangeText={(t) => setWithdrawAmount(formatAmount(t))}
                  placeholder="0"
                  keyboardType="numeric"
                  style={[styles.amountInput, { fontFamily: Fonts.LeagueSpartanBold }]}
                />
                <Text style={[styles.amountSuffix, { fontFamily: Fonts.LeagueSpartanBold }]}>₫</Text>
              </View>

              {!!withdrawAmount ? (
                <View style={{ marginTop: 6 }}>
                  {amountNum < 50000 ? (
                    <View style={styles.inlineRow}>
                      <AlertCircle size={16} color="#ef4444" />
                      <Text style={[styles.errText, { fontFamily: Fonts.LeagueSpartanRegular }]}>
                        Số tiền tối thiểu là 50,000₫
                      </Text>
                    </View>
                  ) : null}
                  {amountNum > walletBalance ? (
                    <View style={styles.inlineRow}>
                      <AlertCircle size={16} color="#ef4444" />
                      <Text style={[styles.errText, { fontFamily: Fonts.LeagueSpartanRegular }]}>
                        Số tiền vượt quá số dư ví của bạn
                      </Text>
                    </View>
                  ) : null}
                  {amountNum >= 50000 && amountNum <= walletBalance ? (
                    <View style={styles.inlineRow}>
                      <Check size={16} color={GREEN_600} />
                      <Text style={[styles.okText, { fontFamily: Fonts.LeagueSpartanRegular }]}>Số tiền hợp lệ</Text>
                    </View>
                  ) : null}
                </View>
              ) : null}
            </View>

            <View style={{ marginBottom: 16 }}>
              <Text style={[styles.sectionLabel, { fontFamily: Fonts.LeagueSpartanMedium, marginBottom: 8 }]}>
                Chọn nhanh
              </Text>
              <View style={styles.quickGrid}>
                {[100000, 500000, 1000000].map((amt) => {
                  const disabled = amt > walletBalance;
                  return (
                    <TouchableOpacity
                      key={amt}
                      onPress={() => setWithdrawAmount(formatAmount(String(amt)))}
                      disabled={disabled}
                      style={[styles.quickBtn, disabled && { opacity: 0.5 }]}
                    >
                      <Text style={[styles.quickText, { fontFamily: Fonts.LeagueSpartanMedium }]}>
                        {formatAmount(String(amt))}₫
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              <TouchableOpacity
                onPress={() => setWithdrawAmount(formatAmount(String(walletBalance)))}
                style={[styles.quickBtn, { marginTop: 8 }]}
              >
                <Text style={[styles.quickText, { fontFamily: Fonts.LeagueSpartanMedium }]}>
                  Rút toàn bộ ({formatAmount(String(walletBalance))}₫)
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.noteCardBlue}>
              <View style={{ flexDirection: "row", gap: 8 }}>
                <AlertCircle size={20} color="#2563eb" />
                <View>
                  <Text style={[styles.noteTitleBlue, { fontFamily: Fonts.LeagueSpartanMedium }]}>
                    Hạn mức rút tiền
                  </Text>
                  <Text style={[styles.noteTextBlue, { fontFamily: Fonts.LeagueSpartanRegular }]}>
                    • Tối thiểu: 50,000₫ mỗi lần{"\n"}• Tối đa: 5,000,000₫ mỗi ngày{"\n"}• Tối đa: 50,000,000₫ mỗi
                    tháng
                  </Text>
                </View>
              </View>
            </View>

            <TouchableOpacity
              onPress={handleContinue}
              disabled={!withdrawAmount || amountNum < 50000 || amountNum > walletBalance}
              style={[
                styles.primaryBtn,
                (!withdrawAmount || amountNum < 50000 || amountNum > walletBalance) && styles.disabledBtn,
              ]}
            >
              <Text style={[styles.primaryBtnText, { fontFamily: Fonts.LeagueSpartanSemiBold }]}>
                Tiếp tục rút tiền
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {step === 2 && (
          <View>
            <View style={{ marginBottom: 16 }}>
              <Text style={[styles.title, { fontFamily: Fonts.LeagueSpartanSemiBold }]}>
                Chọn phương thức rút tiền
              </Text>
              <Text style={[styles.muted, { fontFamily: Fonts.LeagueSpartanRegular }]}>
                Chọn cách bạn muốn nhận tiền từ ví điện tử
              </Text>
            </View>

            <View style={{ gap: 12, marginBottom: 20 }}>
              {withdrawalMethods.map((m) => {
                const picked = selectedMethod === m.id;
                return (
                  <TouchableOpacity
                    key={m.id}
                    onPress={() => handleMethodSelect(m.id)}
                    style={[styles.cardRow, picked && { borderColor: ORANGE, backgroundColor: "#fff7ed" }]}
                    activeOpacity={0.9}
                  >
                    <View style={[styles.avatar, { backgroundColor: m.color }]}>
                      {renderIcon(m.icon, 24, "#374151")}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.cardTitle, { fontFamily: Fonts.LeagueSpartanMedium }]}>{m.name}</Text>
                      <Text style={[styles.cardSub, { fontFamily: Fonts.LeagueSpartanRegular }]}>{m.description}</Text>
                      <View style={{ flexDirection: "row", gap: 16, marginTop: 2, alignItems: "center" }}>
                        <Text style={[styles.metaText, { fontFamily: Fonts.LeagueSpartanRegular }]}>
                          Phí: <Text style={{ color: "#16a34a", fontFamily: Fonts.LeagueSpartanMedium }}>{m.fee}</Text>
                        </Text>
                        <View style={{ flexDirection: "row", gap: 6, alignItems: "center" }}>
                          <Clock size={12} color="#6b7280" />
                          <Text style={[styles.metaText, { fontFamily: Fonts.LeagueSpartanRegular }]}>{m.time}</Text>
                        </View>
                      </View>
                    </View>
                    {picked ? (
                      <View style={styles.pickDot}>
                        <Check size={14} color="#fff" />
                      </View>
                    ) : null}
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={styles.noteCardBlue}>
              <View style={{ flexDirection: "row", gap: 8 }}>
                <AlertCircle size={20} color="#2563eb" />
                <View>
                  <Text style={[styles.noteTitleBlue, { fontFamily: Fonts.LeagueSpartanMedium }]}>
                    Hạn mức rút tiền
                  </Text>
                  <Text style={[styles.noteTextBlue, { fontFamily: Fonts.LeagueSpartanRegular }]}>
                    • Tối thiểu: 50,000₫ mỗi lần{"\n"}• Tối đa: 5,000,000₫ mỗi ngày{"\n"}• Tối đa: 50,000,000₫ mỗi
                    tháng
                  </Text>
                </View>
              </View>
            </View>

            <TouchableOpacity
              onPress={handleContinue}
              disabled={!selectedMethod}
              style={[styles.primaryBtn, !selectedMethod && styles.disabledBtn]}
            >
              <Text style={[styles.primaryBtnText, { fontFamily: Fonts.LeagueSpartanSemiBold }]}>Tiếp tục</Text>
            </TouchableOpacity>
          </View>
        )}

        {step === 3 && (
          <View>
            <View style={{ marginBottom: 16 }}>
              <Text style={[styles.title, { fontFamily: Fonts.LeagueSpartanSemiBold }]}>Nhập thông tin</Text>
              <Text style={[styles.muted, { fontFamily: Fonts.LeagueSpartanRegular }]}>
                Nhập thông tin {selectedMethodInfo?.name.toLowerCase()}
              </Text>
            </View>

            {selectedMethodInfo && (
              <View style={styles.infoBar}>
                <View style={[styles.avatar, { backgroundColor: selectedMethodInfo.color, width: 40, height: 40 }]}>
                  {renderIcon(selectedMethodInfo.icon, 20, "#374151")}
                </View>
                <View>
                  <Text style={[styles.infoTitle, { fontFamily: Fonts.LeagueSpartanMedium }]}>
                    {selectedMethodInfo.name}
                  </Text>
                  <Text style={[styles.cardSub, { fontFamily: Fonts.LeagueSpartanRegular }]}>
                    {selectedMethodInfo.description}
                  </Text>
                </View>
              </View>
            )}

            {selectedMethod === "bank" && (
              <View style={{ gap: 12, marginBottom: 16 }}>
                <Text style={[styles.inputLabel, { fontFamily: Fonts.LeagueSpartanMedium }]}>Ngân hàng</Text>
                <TouchableOpacity
                  onPress={() => setBankModalOpen(true)}
                  style={styles.inputLike}
                  activeOpacity={0.9}
                >
                  <Text
                    style={[
                      styles.inputText,
                      { fontFamily: Fonts.LeagueSpartanRegular, color: bankName ? "#111827" : "#9ca3af" },
                    ]}
                  >
                    {bankName || "Chọn ngân hàng"}
                  </Text>
                </TouchableOpacity>

                <Text style={[styles.inputLabel, { fontFamily: Fonts.LeagueSpartanMedium }]}>Số tài khoản</Text>
                <TextInput
                  value={bankAccount}
                  onChangeText={(t) => setBankAccount(t.replace(/\D/g, ""))}
                  placeholder="Nhập số tài khoản"
                  keyboardType="number-pad"
                  style={[styles.input, { fontFamily: Fonts.LeagueSpartanRegular }]}
                />

                <Text style={[styles.inputLabel, { fontFamily: Fonts.LeagueSpartanMedium }]}>Tên chủ tài khoản</Text>
                <TextInput
                  value={accountHolder}
                  onChangeText={(t) => setAccountHolder(t.toUpperCase())}
                  placeholder="NGUYEN VAN A"
                  autoCapitalize="characters"
                  style={[styles.input, { fontFamily: Fonts.LeagueSpartanRegular }]}
                />
              </View>
            )}

            {selectedMethod === "card" && (
              <View style={{ gap: 12, marginBottom: 16 }}>
                <Text style={[styles.inputLabel, { fontFamily: Fonts.LeagueSpartanMedium }]}>Số thẻ</Text>
                <TextInput
                  value={cardNumber}
                  onChangeText={(t) => setCardNumber(formatCardNumber(t))}
                  placeholder="1234 5678 9012 3456"
                  keyboardType="number-pad"
                  style={[styles.input, { fontFamily: Fonts.LeagueSpartanRegular }]}
                />

                <Text style={[styles.inputLabel, { fontFamily: Fonts.LeagueSpartanMedium }]}>Tên chủ thẻ</Text>
                <TextInput
                  value={cardHolder}
                  onChangeText={(t) => setCardHolder(t.toUpperCase())}
                  placeholder="NGUYEN VAN A"
                  autoCapitalize="characters"
                  style={[styles.input, { fontFamily: Fonts.LeagueSpartanRegular }]}
                />

                <Text style={[styles.inputLabel, { fontFamily: Fonts.LeagueSpartanMedium }]}>
                  Ngân hàng phát hành
                </Text>
                <TouchableOpacity
                  onPress={() => setBankModalOpen(true)}
                  style={styles.inputLike}
                  activeOpacity={0.9}
                >
                  <Text
                    style={[
                      styles.inputText,
                      { fontFamily: Fonts.LeagueSpartanRegular, color: bankName ? "#111827" : "#9ca3af" },
                    ]}
                  >
                    {bankName || "Chọn ngân hàng"}
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            <View style={styles.noteCardYellow}>
              <View style={{ flexDirection: "row", gap: 8 }}>
                <Shield size={20} color="#ca8a04" />
                <View>
                  <Text style={[styles.noteTitleYellow, { fontFamily: Fonts.LeagueSpartanMedium }]}>Lưu ý bảo mật</Text>
                  <Text style={[styles.noteTextYellow, { fontFamily: Fonts.LeagueSpartanRegular }]}>
                    Thông tin này sẽ được mã hóa và bảo mật. Chỉ bạn mới có thể thay đổi hoặc xóa phương thức rút tiền.
                  </Text>
                </View>
              </View>
            </View>

            <TouchableOpacity
              onPress={handleContinue}
              disabled={
                (selectedMethod === "bank" && (!bankAccount || !bankName || !accountHolder)) ||
                (selectedMethod === "card" && (!cardNumber || !cardHolder || !bankName)) ||
                isLoading
              }
              style={[
                styles.primaryBtn,
                (((selectedMethod === "bank" && (!bankAccount || !bankName || !accountHolder)) ||
                  (selectedMethod === "card" && (!cardNumber || !cardHolder || !bankName)) ||
                  isLoading) &&
                  styles.disabledBtn) ||
                  {},
              ]}
            >
              <Text style={[styles.primaryBtnText, { fontFamily: Fonts.LeagueSpartanSemiBold }]}>
                {isLoading ? "Đang xử lý..." : "Xác nhận thông tin"}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {step === 4 && (
          <View>
            <View style={{ marginBottom: 16 }}>
              <Text style={[styles.title, { fontFamily: Fonts.LeagueSpartanSemiBold }]}>Xác thực giao dịch</Text>
              <Text style={[styles.muted, { fontFamily: Fonts.LeagueSpartanRegular }]}>
                Kiểm tra lại thông tin trước khi hoàn tất rút tiền
              </Text>
            </View>

            <View style={styles.amountCard}>
              <Text style={[styles.amountCaption, { fontFamily: Fonts.LeagueSpartanRegular }]}>Số tiền rút</Text>
              <Text style={[styles.amountBig, { fontFamily: Fonts.LeagueSpartanBold }]}>{withdrawAmount}₫</Text>
            </View>

            <View style={styles.infoCard}>
              {selectedSavedAccountInfo ? (
                <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 8 }}>
                  <View style={[styles.avatar, { backgroundColor: selectedSavedAccountInfo.color, width: 40, height: 40 }]}>
                    {renderIcon(
                      selectedSavedAccountInfo.type === "bank" ? "bank" : "card",
                      20,
                      "#374151"
                    )}
                  </View>
                  <View>
                    <Text style={[styles.infoTitle, { fontFamily: Fonts.LeagueSpartanMedium }]}>
                      {selectedSavedAccountInfo.name}
                    </Text>
                    <Text style={[styles.cardSub, { fontFamily: Fonts.LeagueSpartanRegular }]}>
                      {selectedSavedAccountInfo.type === "bank" ? "Chuyển khoản ngân hàng" : "Thẻ ngân hàng"}
                    </Text>
                  </View>
                </View>
              ) : (
                <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 8 }}>
                  <View style={[styles.avatar, { backgroundColor: selectedMethodInfo?.color, width: 40, height: 40 }]}>
                    {selectedMethodInfo?.icon && renderIcon(selectedMethodInfo.icon, 20, "#374151")}
                  </View>
                  <View>
                    <Text style={[styles.infoTitle, { fontFamily: Fonts.LeagueSpartanMedium }]}>
                      {selectedMethodInfo?.name}
                    </Text>
                    <Text style={[styles.cardSub, { fontFamily: Fonts.LeagueSpartanRegular }]}>
                      {selectedMethodInfo?.description}
                    </Text>
                  </View>
                </View>
              )}

              <View style={{ gap: 8 }}>
                {selectedSavedAccountInfo ? (
                  selectedSavedAccountInfo.type === "bank" ? (
                    <>
                      <Row label="Ngân hàng:" value={selectedSavedAccountInfo.bankName} />
                      <Row label="Số tài khoản:" value={selectedSavedAccountInfo.accountNumber} />
                      <Row label="Chủ tài khoản:" value={selectedSavedAccountInfo.accountHolder} />
                    </>
                  ) : (
                    <>
                      <Row label="Ngân hàng phát hành:" value={selectedSavedAccountInfo.bankName} />
                      <Row label="Số thẻ:" value={`**** ${selectedSavedAccountInfo.cardNumber.slice(-4)}`} />
                      <Row label="Chủ thẻ:" value={selectedSavedAccountInfo.cardHolder} />
                    </>
                  )
                ) : selectedMethod === "bank" ? (
                  <>
                    <Row label="Ngân hàng:" value={bankName} />
                    <Row label="Số tài khoản:" value={bankAccount} />
                    <Row label="Chủ tài khoản:" value={accountHolder} />
                  </>
                ) : (
                  <>
                    <Row label="Ngân hàng phát hành:" value={bankName} />
                    <Row label="Số thẻ:" value={`**** ${cardNumber.slice(-4)}`} />
                    <Row label="Chủ thẻ:" value={cardHolder} />
                  </>
                )}

                <View style={{ height: 1, backgroundColor: GRAY_BORDER, marginTop: 8 }} />

                <Row label="Số tiền rút:" value={`${withdrawAmount}₫`} bold />
                <Row label="Phí giao dịch:" value={feeText} />
                <Row label="Thời gian xử lý:" value={timeText} />

                <View style={{ height: 1, backgroundColor: GRAY_BORDER, marginTop: 8 }} />
                <Row label="Tổng nhận:" value={totalReceive} bold color={ORANGE} />
              </View>
            </View>

            <View style={styles.noteCardBlue}>
              <View style={{ flexDirection: "row", gap: 8 }}>
                <AlertCircle size={20} color="#2563eb" />
                <View>
                  <Text style={[styles.noteTitleBlue, { fontFamily: Fonts.LeagueSpartanMedium }]}>
                    Xác nhận thiết lập
                  </Text>
                  <Text style={[styles.noteTextBlue, { fontFamily: Fonts.LeagueSpartanRegular }]}>
                    Sau khi xác nhận, phương thức này sẽ được thêm vào danh sách rút tiền của bạn. Bạn có thể chỉnh sửa
                    hoặc xóa bất cứ lúc nào.
                  </Text>
                </View>
              </View>
            </View>

            <TouchableOpacity onPress={handleContinue} disabled={isLoading} style={[styles.primaryBtn, isLoading && styles.disabledBtn]}>
              <Text style={[styles.primaryBtnText, { fontFamily: Fonts.LeagueSpartanSemiBold }]}>
                {isLoading ? "Đang thiết lập..." : "Xác nhận thiết lập"}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {step === 5 && (
          <View style={{ alignItems: "center" }}>
            <View style={styles.successIcon}>
              <Check size={40} color={GREEN_600} />
            </View>
            <Text style={[styles.successTitle, { fontFamily: Fonts.LeagueSpartanSemiBold }]}>Rút tiền thành công!</Text>
            <Text style={[styles.muted, { textAlign: "center", marginBottom: 16, fontFamily: Fonts.LeagueSpartanRegular }]}>
              Yêu cầu rút tiền đã được xử lý. Tiền sẽ được chuyển vào tài khoản của bạn theo thời gian đã thông báo.
            </Text>

            <View style={styles.successAmountCard}>
              <Text style={[styles.successAmountCaption, { fontFamily: Fonts.LeagueSpartanRegular }]}>Số tiền đã rút</Text>
              <Text style={[styles.successAmount, { fontFamily: Fonts.LeagueSpartanBold }]}>{withdrawAmount}₫</Text>
            </View>

            <View style={{ gap: 10, width: "100%" }}>
              <TouchableOpacity
                onPress={() => navigation.goBack()}
                style={[styles.primaryBtn]}
              >
                <Text style={[styles.primaryBtnText, { fontFamily: Fonts.LeagueSpartanSemiBold }]}>
                  Quay về ví điện tử
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => {
                  setStep(0);
                  setSelectedMethod("");
                  setSelectedSavedAccount("");
                  setWithdrawAmount("");
                  setBankAccount("");
                  setBankName("");
                  setAccountHolder("");
                  setCardNumber("");
                  setCardHolder("");
                }}
                style={styles.textBtn}
              >
                <Text style={[styles.textBtnLabel, { fontFamily: Fonts.LeagueSpartanMedium, color: ORANGE }]}>
                  Rút tiền lần khác
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>

      <Modal visible={bankModalOpen} transparent animationType="fade" onRequestClose={() => setBankModalOpen(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalSheet}>
            <Text style={[styles.modalTitle, { fontFamily: Fonts.LeagueSpartanSemiBold }]}>Chọn ngân hàng</Text>
            <ScrollView style={{ maxHeight: 360 }}>
              {banks.map((b) => (
                <TouchableOpacity
                  key={b}
                  onPress={() => {
                    setBankName(b);
                    setBankModalOpen(false);
                  }}
                  style={styles.modalItem}
                >
                  <Text style={[styles.modalItemText, { fontFamily: Fonts.LeagueSpartanRegular }]}>{b}</Text>
                  {bankName === b ? <Check size={18} color={ORANGE} /> : null}
                </TouchableOpacity>
              ))}
            </ScrollView>

            <TouchableOpacity onPress={() => setBankModalOpen(false)} style={[styles.modalCloseBtn]}>
              <Text style={[styles.modalCloseText, { fontFamily: Fonts.LeagueSpartanSemiBold }]}>Đóng</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function Row({
  label,
  value,
  bold,
  color,
}: {
  label: string;
  value: string;
  bold?: boolean;
  color?: string;
}) {
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
      <Text style={{ color: "#6b7280", fontSize: 14, fontFamily: Fonts.LeagueSpartanRegular }}>{label}</Text>
      <Text
        style={{
          color: color || "#111827",
          fontSize: bold ? 16 : 14,
          fontFamily: bold ? Fonts.LeagueSpartanSemiBold : Fonts.LeagueSpartanMedium,
        }}
      >
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#fff" },
  container: { flex: 1, paddingHorizontal: 16 },
  metaText: { fontSize: 12, color: "#6b7280" },
  header: {
    height: 56,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#fff",
  },
  inlineRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  headerBtn: {
    width: 40,
    height: 40,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: { fontSize: 18, color: "#111827" },

  title: { fontSize: 18, color: "#111827", marginBottom: 4 },
  muted: { fontSize: 13, color: "#6b7280" },

  walletCard: {
    backgroundColor: ORANGE,
    borderRadius: 16,
    padding: 14,
    marginBottom: 16,
  },
  walletRow: { flexDirection: "row", gap: 12, alignItems: "center" },
  walletIcon: {
    width: 40,
    height: 40,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.25)",
    alignItems: "center",
    justifyContent: "center",
  },
  walletCaption: { color: "rgba(255,255,255,0.9)", fontSize: 12 },
  walletAmount: { color: "#fff", fontSize: 20 },

  sectionLabel: { fontSize: 13, color: "#374151" },

  cardRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: GRAY_BORDER,
    backgroundColor: "#fff",
    marginBottom: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },
  pickDot: {
    width: 24,
    height: 24,
    borderRadius: 999,
    backgroundColor: ORANGE,
    alignItems: "center",
    justifyContent: "center",
  },
  cardTitle: { fontSize: 15, color: "#111827" },
  cardSub: { fontSize: 13, color: "#6b7280" },
  cardHint: { fontSize: 11, color: "#9ca3af" },
  defaultPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    fontSize: 11,
    color: "#fff",
    backgroundColor: ORANGE,
    overflow: "hidden",
  },

  addCardRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: "#d1d5db",
    borderStyle: "dashed",
    backgroundColor: "#fff",
  },
  addIcon: {
    width: 48,
    height: 48,
    borderRadius: 999,
    backgroundColor: "#f3f4f6",
    alignItems: "center",
    justifyContent: "center",
  },

  primaryBtn: {
    backgroundColor: ORANGE,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  disabledBtn: { opacity: 0.5 },
  primaryBtnText: { color: "#fff", fontSize: 16 },

  infoCard: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: GRAY_BORDER,
    borderRadius: 16,
    padding: 14,
    marginBottom: 16,
  },
  infoBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
    backgroundColor: GRAY_BG,
    borderRadius: 12,
    marginBottom: 14,
  },
  infoTitle: { fontSize: 15, color: "#111827" },

  inputLabel: { fontSize: 13, color: "#374151" },
  input: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: "#111827",
    backgroundColor: "#fff",
  },
  inputLike: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    backgroundColor: "#fff",
  },
  inputText: { fontSize: 14 },

  noteCardBlue: {
    backgroundColor: BLUE_50,
    borderWidth: 1,
    borderColor: BLUE_200,
    borderRadius: 16,
    padding: 14,
    marginBottom: 16,
  },
  noteTitleBlue: { fontSize: 14, color: "#1e40af" },
  noteTextBlue: { fontSize: 13, color: "#1d4ed8" },

  noteCardYellow: {
    backgroundColor: YELLOW_50,
    borderWidth: 1,
    borderColor: YELLOW_200,
    borderRadius: 16,
    padding: 14,
    marginBottom: 16,
  },
  noteTitleYellow: { fontSize: 14, color: "#854d0e" },
  noteTextYellow: { fontSize: 13, color: "#a16207" },

  amountWrap: {
    position: "relative",
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 12,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
  amountInput: { fontSize: 28, paddingVertical: 10, textAlign: "center", color: "#111827" },
  amountSuffix: {
    position: "absolute",
    right: 14,
    top: 0,
    bottom: 0,
    textAlignVertical: "center",
    fontSize: 22,
    color: "#9ca3af",
  },

  quickGrid: { flexDirection: "row", gap: 12 },
  quickBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#d1d5db",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
  },
  quickText: { fontSize: 14, color: "#111827" },

  amountCard: {
    backgroundColor: ORANGE,
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 12,
    marginBottom: 16,
    alignItems: "center",
  },
  amountCaption: { color: "rgba(255,255,255,0.9)", fontSize: 12 },
  amountBig: { color: "#fff", fontSize: 24 },

  successIcon: {
    width: 80,
    height: 80,
    borderRadius: 999,
    backgroundColor: GREEN_100,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  successTitle: { fontSize: 18, color: "#111827", marginBottom: 8 },
  successAmountCard: {
    backgroundColor: "#ecfdf5",
    borderWidth: 1,
    borderColor: "#bbf7d0",
    borderRadius: 16,
    padding: 14,
    marginBottom: 16,
    width: "100%",
    alignItems: "center",
  },
  successAmountCaption: { fontSize: 12, color: "#047857" },
  successAmount: { fontSize: 22, color: "#065f46" },

  textBtn: { paddingVertical: 10, alignItems: "center", justifyContent: "center" },
  textBtnLabel: { fontSize: 15 },

  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
  },
  modalSheet: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 14,
  },
  modalTitle: { fontSize: 16, color: "#111827", marginBottom: 8 },
  modalItem: {
    paddingVertical: 12,
    paddingHorizontal: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  modalItemText: { fontSize: 14, color: "#111827" },
  modalCloseBtn: {
    marginTop: 10,
    backgroundColor: ORANGE,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
  },
  modalCloseText: { color: "#fff", fontSize: 15 },

  errText: {
    color: "#ef4444",
    fontSize: 13,
  },
  okText: {
    color: "#16a34a",
    fontSize: 13,
  },
});
