import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  Modal,
  TouchableOpacity,
  Switch,
  StyleSheet,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import {
  ArrowLeft,
  Wallet as WalletIcon,
  Plus,
  ArrowUpRight,
  ArrowDownLeft,
  Building2,
  Smartphone,
  Eye,
  EyeOff,
  TrendingUp,
  Clock,
  Filter,
  X,
} from "lucide-react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Fonts } from "@/constants/Fonts";
import { useDatabase } from "@/hooks/useDatabase";

const ORANGE = "#ea580c";
const ORANGE_2 = "#f97316";

type Tx = {
  id: number;
  type: "credit" | "debit";
  amount: number;
  description: string;
  date: string;
  time: string;
  status: "completed" | "pending";
};

type PaymentMethod = {
  id: number;
  type: "bank" | "ewallet";
  name: string;
  number: string;
  isDefault: boolean;
};

const formatCurrency = (amount: number) => {
  try {
    return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(amount);
  } catch {
    return amount.toLocaleString("vi-VN") + " ₫";
  }
};

const maskBankNumber = (raw?: string) => {
  if (!raw) return "";
  const last4 = raw.slice(-4);
  return `**** **** **** ${last4}`;
};


export default function WalletManagementScreen() {
  const navigation = useNavigation<any>();
  const {
    getDemoShippers,
    getDeliveriesByShipper,
    getShipperSimpleBanks,
    getOrders,
  } = useDatabase();

  
  const shipper = useMemo(() => {
    const demos = getDemoShippers();
    return demos[0] || null;
  }, [getDemoShippers]);

  // --- derive wallet data from DB ---
  const { transactions, balance, pendingBalance, paymentMethods } = useMemo(() => {
    if (!shipper) {
      return {
        transactions: [] as Tx[],
        balance: 0,
        pendingBalance: 0,
        paymentMethods: [] as PaymentMethod[],
      };
    }

    const myOrders = getDeliveriesByShipper(shipper.id);
    const allOrders = getOrders();

    const oidSet = new Set(myOrders.map((o) => o.id));

    const calcTotal = (o: any) => {
      if (o?.payment?.total != null) return Number(o.payment.total) || 0;
      const items = Array.isArray(o?.items) ? o.items : [];
      return items.reduce((sum: number, it: any) => sum + (Number(it.price) || 0) * (Number(it.qty) || 0), 0);
    };

    const txs: Tx[] = [];
    let doneSum = 0;
    let pendingSum = 0;

    (allOrders || [])
      .filter((o) => oidSet.has(o.id))
      .forEach((o, idx) => {
        const amt = calcTotal(o);
        const isCompleted = o.status === "completed" || o.status === "delivered";
        const isPending = o.status === "delivering" || o.status === "preparing" || o.status === "pending";

        const dateSrc = o.deliveredAt || o.createdAt;
        const d = new Date(dateSrc);
        const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
        const date = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
        const time = `${pad(d.getHours())}:${pad(d.getMinutes())}`;

        txs.push({
          id: idx + 1,
          type: "credit",
          amount: amt,
          description: isCompleted ? `Giao hàng thành công #${o.id}` : `Đơn hàng đang xử lý #${o.id}`,
          date,
          time,
          status: isCompleted ? "completed" : "pending",
        });

        if (isCompleted) doneSum += amt;
        if (isPending) pendingSum += amt;
      });

    const banks = getShipperSimpleBanks(shipper.id); 
    const methods: PaymentMethod[] = banks.map((b, i) => ({
      id: i + 1,
      type: "bank",
      name: b.bankName,
      number: maskBankNumber(b.accountNumber),
      isDefault: i === 0,
    }));

    return {
      transactions: txs,
      balance: doneSum,
      pendingBalance: pendingSum,
      paymentMethods: methods,
    };
  }, [shipper, getDeliveriesByShipper, getShipperSimpleBanks, getOrders]);

  const [showBalance, setShowBalance] = useState(true);
  const [selectedFilter, setSelectedFilter] = useState<"all" | "credit" | "debit">("all");
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [dateRange, setDateRange] = useState<"all" | "today" | "week" | "month">("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "completed" | "pending">("all");
  const [amountRange, setAmountRange] = useState<"all" | "low" | "medium" | "high">("all");

  const [bioAuthOn, setBioAuthOn] = useState<boolean>(true);
  const [pinOn, setPinOn] = useState<boolean>(false);

  const filteredTransactions = useMemo(() => {
    return transactions.filter((transaction) => {
      if (selectedFilter !== "all" && transaction.type !== selectedFilter) return false;
      if (statusFilter !== "all" && transaction.status !== statusFilter) return false;

      if (dateRange !== "all") {
        const transactionDate = new Date(transaction.date);
        const today = new Date();
        const MS = 1000 * 60 * 60 * 24;
        const daysDiff = Math.floor((+today - +transactionDate) / MS);

        if (dateRange === "today" && daysDiff !== 0) return false;
        if (dateRange === "week" && daysDiff > 7) return false;
        if (dateRange === "month" && daysDiff > 30) return false;
      }

      if (amountRange !== "all") {
        if (amountRange === "low" && transaction.amount >= 100_000) return false;
        if (amountRange === "medium" && (transaction.amount < 100_000 || transaction.amount >= 500_000)) return false;
        if (amountRange === "high" && transaction.amount < 500_000) return false;
      }
      return true;
    });
  }, [transactions, selectedFilter, statusFilter, dateRange, amountRange]);

  const resetFilters = () => {
    setSelectedFilter("all");
    setDateRange("all");
    setStatusFilter("all");
    setAmountRange("all");
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView bounces contentContainerStyle={styles.scrollContent}>
        <LinearGradient
          colors={[ORANGE, ORANGE_2]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.gradientContainer}
        >
          <View style={styles.topRow}>
            <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
              <ArrowLeft size={24} color="#fff" />
            </Pressable>

            <Text style={styles.headerTitle}>Ví điện tử</Text>
          </View>

          {/* Balance Card */}
          <View style={styles.balanceCard}>
            <View style={styles.rowBetween}>
              <View style={styles.rowLeft}>
                <WalletIcon size={20} color="#fff" />
                <Text style={styles.balanceLabel}>Số dư khả dụng</Text>
              </View>

              <Pressable onPress={() => setShowBalance((s) => !s)} style={styles.eyeButton}>
                {showBalance ? <EyeOff size={16} color="#fff" /> : <Eye size={16} color="#fff" />}
              </Pressable>
            </View>

            <View style={styles.balanceBlock}>
              <Text style={styles.balanceText}>
                {showBalance ? formatCurrency(balance) : "••••••••"}
              </Text>

              <View style={styles.pendingRow}>
                <Clock size={16} color="rgba(255,255,255,0.7)" />
                <Text style={styles.pendingText}>
                  Đang chờ: {showBalance ? formatCurrency(pendingBalance) : "••••••"}
                </Text>
              </View>
            </View>

            <View style={styles.actionRow}>
              <Pressable onPress={() => navigation.navigate("WithdrawMethods")} style={styles.withdrawBtn}>
                <ArrowUpRight size={16} color={ORANGE} />
                <Text style={styles.withdrawText}>Rút tiền</Text>
              </Pressable>

              <Pressable style={styles.statsBtn}>
                <TrendingUp size={16} color="#fff" />
                <Text style={styles.statsText}>Thống kê</Text>
              </Pressable>
            </View>
          </View>
        </LinearGradient>

        {/* White rounded top container */}
        <View style={styles.roundedTopContainer}>
          <View style={styles.contentWrap}>
            {/* Payment Methods */}
            <View style={styles.sectionWrap}>
              <View style={styles.sectionHeadRow}>
                <Text style={styles.sectionTitle}>Phương thức thanh toán</Text>

                <Pressable onPress={() => setShowPaymentModal(true)}>
                  <Text style={styles.manageText}>Quản lý</Text>
                </Pressable>
              </View>

              <View style={styles.paymentMethodList}>
                {paymentMethods.map((m) => (
                  <View key={m.id} style={styles.paymentMethodItem}>
                    <View style={styles.paymentIcon}>
                      {m.type === "bank" ? <Building2 size={20} color="#fff" /> : <Smartphone size={20} color="#fff" />}
                    </View>

                    <View style={styles.paymentTextCol}>
                      <Text style={styles.paymentName}>{m.name}</Text>
                      <Text style={styles.paymentNumber}>{m.number}</Text>
                    </View>

                    {m.isDefault && (
                      <View style={styles.defaultBadge}>
                        <Text style={styles.defaultBadgeText}>Mặc định</Text>
                      </View>
                    )}
                  </View>
                ))}

                <Pressable style={styles.addMethodButton}>
                  <Plus size={20} color="#6b7280" />
                  <Text style={styles.addMethodText}>Thêm phương thức thanh toán</Text>
                </Pressable>
              </View>
            </View>

            {/* Transaction History */}
            <View>
              <View style={styles.sectionHeadRow}>
                <Text style={styles.sectionTitle}>Lịch sử giao dịch</Text>

                <Pressable onPress={() => setShowFilterModal(true)} style={styles.filterBtnRow}>
                  <Filter size={16} color={ORANGE} />
                  <Text style={styles.manageText}>Lọc</Text>
                </Pressable>
              </View>

              {/* Filter Tabs */}
              <View style={styles.tabRow}>
                {([
                  { key: "all", label: "Tất cả" },
                  { key: "credit", label: "Thu nhập" },
                  { key: "debit", label: "Chi tiêu" },
                ] as const).map((f) => {
                  const active = selectedFilter === f.key;
                  return (
                    <Pressable
                      key={f.key}
                      onPress={() => setSelectedFilter(f.key)}
                      style={[styles.tab, { backgroundColor: active ? ORANGE : "#f3f4f6" }]}
                    >
                      <Text style={[styles.tabText, { color: active ? "#fff" : "#4b5563" }]}>
                        {f.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              {/* Transaction List */}
              <View style={styles.transactionList}>
                {filteredTransactions.map((t) => {
                  const isCredit = t.type === "credit";
                  return (
                    <View key={t.id} style={styles.transactionItem}>
                      <View
                        style={[
                          styles.transactionIcon,
                          { backgroundColor: isCredit ? "#dcfce7" : "#fee2e2" },
                        ]}
                      >
                        {isCredit ? (
                          <ArrowDownLeft size={20} color="#16a34a" />
                        ) : (
                          <ArrowUpRight size={20} color="#dc2626" />
                        )}
                      </View>

                      <View style={styles.transactionTextCol}>
                        <Text style={styles.transactionTitle}>{t.description}</Text>
                        <Text style={styles.transactionSubtitle}>
                          {t.date} • {t.time}
                        </Text>
                      </View>

                      <View style={styles.amountCol}>
                        <Text
                          style={[
                            styles.amountText,
                            { color: isCredit ? "#16a34a" : "#dc2626" },
                          ]}
                        >
                          {isCredit ? "+" : "-"}
                          {formatCurrency(t.amount)}
                        </Text>

                        <Text
                          style={[
                            styles.statusText,
                            { color: t.status === "completed" ? "#16a34a" : "#ca8a04" },
                          ]}
                        >
                          {t.status === "completed" ? "Hoàn thành" : "Đang xử lý"}
                        </Text>
                      </View>
                    </View>
                  );
                })}
              </View>

              <Pressable onPress={() => navigation.navigate("WalletTransactions")}>
                <Text style={styles.viewAllBtn}>Xem tất cả giao dịch</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Filter Modal */}
      <Modal
        visible={showFilterModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowFilterModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalHeaderTitle}>Bộ lọc giao dịch</Text>
              <Pressable onPress={() => setShowFilterModal(false)} style={styles.modalCloseBtn}>
                <X size={20} color="#6b7280" />
              </Pressable>
            </View>

            <View style={styles.modalBodyGap}>
              {/* Time */}
              <View>
                <Text style={styles.sectionSubTitle}>Thời gian</Text>
                <View style={styles.chipRow}>
                  {([
                    { key: "all", label: "Tất cả" },
                    { key: "today", label: "Hôm nay" },
                    { key: "week", label: "7 ngày" },
                    { key: "month", label: "30 ngày" },
                  ] as const).map((opt) => {
                    const active = dateRange === opt.key;
                    return (
                      <Pressable
                        key={opt.key}
                        onPress={() => setDateRange(opt.key)}
                        style={[styles.chip, { backgroundColor: active ? ORANGE : "#f3f4f6" }]}
                      >
                        <Text style={[styles.chipText, { color: active ? "#fff" : "#4b5563" }]}>
                          {opt.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              {/* Status */}
              <View>
                <Text style={styles.sectionSubTitle}>Trạng thái</Text>
                <View style={styles.chipRow}>
                  {([
                    { key: "all", label: "Tất cả" },
                    { key: "completed", label: "Hoàn thành" },
                    { key: "pending", label: "Đang xử lý" },
                  ] as const).map((opt) => {
                    const active = statusFilter === opt.key;
                    return (
                      <Pressable
                        key={opt.key}
                        onPress={() => setStatusFilter(opt.key)}
                        style={[styles.chip, { backgroundColor: active ? ORANGE : "#f3f4f6" }]}
                      >
                        <Text style={[styles.chipText, { color: active ? "#fff" : "#4b5563" }]}>
                          {opt.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              {/* Amount */}
              <View>
                <Text style={styles.sectionSubTitle}>Số tiền</Text>
                <View style={styles.chipRow}>
                  {([
                    { key: "all", label: "Tất cả" },
                    { key: "low", label: "< 100K" },
                    { key: "medium", label: "100K - 500K" },
                    { key: "high", label: "> 500K" },
                  ] as const).map((opt) => {
                    const active = amountRange === opt.key;
                    return (
                      <Pressable
                        key={opt.key}
                        onPress={() => setAmountRange(opt.key)}
                        style={[styles.chip, { backgroundColor: active ? ORANGE : "#f3f4f6" }]}
                      >
                        <Text style={[styles.chipText, { color: active ? "#fff" : "#4b5563" }]}>
                          {opt.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            </View>

            <View style={styles.modalBtnRow}>
              <Pressable onPress={() => {
                setSelectedFilter("all");
                setDateRange("all");
                setStatusFilter("all");
                setAmountRange("all");
              }} style={styles.resetBtn}>
                <Text style={styles.resetBtnText}>Đặt lại</Text>
              </Pressable>

              <Pressable onPress={() => setShowFilterModal(false)} style={styles.applyBtn}>
                <Text style={styles.applyBtnText}>Áp dụng</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Payment Modal */}
      <Modal
        visible={showPaymentModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowPaymentModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.paymentSheet}>
            {/* Header */}
            <View style={styles.paymentHeader}>
              <View style={styles.modalHeaderRow}>
                <Text style={styles.modalHeaderTitle}>Quản lý thanh toán</Text>
                <Pressable onPress={() => setShowPaymentModal(false)} style={styles.modalCloseBtn}>
                  <X size={20} color="#6b7280" />
                </Pressable>
              </View>
            </View>

            <ScrollView contentContainerStyle={styles.paymentScroll}>
              {/* Current methods */}
              <View style={styles.paymentSection}>
                <Text style={styles.sectionSubTitle}>Phương thức hiện tại</Text>

                <View style={styles.paymentMethodList}>
                  {paymentMethods.map((m) => (
                    <View key={m.id} style={styles.paymentMethodItem}>
                      <View style={styles.paymentIcon}>
                        {m.type === "bank" ? <Building2 size={20} color="#fff" /> : <Smartphone size={20} color="#fff" />}
                      </View>

                      <View style={styles.paymentTextCol}>
                        <Text style={styles.paymentName}>{m.name}</Text>
                        <Text style={styles.paymentNumber}>{m.number}</Text>
                      </View>

                      <View style={styles.methodActionRow}>
                        {m.isDefault && (
                          <View style={styles.defaultBadge}>
                            <Text style={styles.defaultBadgeText}>Mặc định</Text>
                          </View>
                        )}
                        <TouchableOpacity>
                          <Text style={styles.actionEdit}>Sửa</Text>
                        </TouchableOpacity>
                        {!m.isDefault && (
                          <TouchableOpacity>
                            <Text style={styles.actionDelete}>Xóa</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>
                  ))}
                </View>
              </View>

              {/* Add new method */}
              <View style={styles.paymentSection}>
                <Text style={styles.sectionSubTitle}>Thêm phương thức mới</Text>

                <View style={styles.addList}>
                  {/* Bank */}
                  <TouchableOpacity onPress={() => navigation.navigate("BankPayment")} activeOpacity={0.8} style={styles.addItem}>
                    <View style={styles.addIconBlue}>
                      <Building2 size={20} color="#2563eb" />
                    </View>

                    <View style={styles.addTextCol}>
                      <Text style={styles.addTitle}>Tài khoản ngân hàng</Text>
                      <Text style={styles.addSubtitle}>Liên kết tài khoản ngân hàng</Text>
                    </View>

                    <Plus size={20} color="#9ca3af" />
                  </TouchableOpacity>

                  {/* E-wallet */}
                  {/* <TouchableOpacity
                    onPress={() => navigation.navigate("AddEwallet")}
                    activeOpacity={0.8}
                    style={styles.addItem}
                  >
                    <View style={styles.addIconPurple}>
                      <Smartphone size={20} color="#7c3aed" />
                    </View>

                    <View style={styles.addTextCol}>
                      <Text style={styles.addTitle}>Ví điện tử</Text>
                      <Text style={styles.addSubtitle}>MoMo, ZaloPay, ViettelPay</Text>
                    </View>

                    <Plus size={20} color="#9ca3af" />
                  </TouchableOpacity> */}

                  {/* Card */}
                  <TouchableOpacity onPress={() => navigation.navigate("CardPayment")} activeOpacity={0.8} style={styles.addItem}>
                    <View style={styles.addIconGreen}>
                      <View style={styles.simpleCardGlyph} />
                    </View>

                    <View style={styles.addTextCol}>
                      <Text style={styles.addTitle}>Thẻ tín dụng/ghi nợ</Text>
                      <Text style={styles.addSubtitle}>Visa, Mastercard, JCB</Text>
                    </View>

                    <Plus size={20} color="#9ca3af" />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Security */}
              <View className="paymentSection">
                <Text style={styles.sectionSubTitle}>Cài đặt bảo mật</Text>

                <View style={styles.securityList}>
                  <View style={styles.securityItem}>
                    <View>
                      <Text style={styles.securityTitle}>Xác thực sinh trắc học</Text>
                      <Text style={styles.securitySubtitle}>Vân tay hoặc Face ID</Text>
                    </View>

                    <Switch
                      value={bioAuthOn}
                      onValueChange={setBioAuthOn}
                      trackColor={{ false: "#d1d5db", true: ORANGE }}
                      thumbColor="#fff"
                    />
                  </View>

                  <View style={styles.securityItem}>
                    <View>
                      <Text style={styles.securityTitle}>Mã PIN giao dịch</Text>
                      <Text style={styles.securitySubtitle}>Yêu cầu PIN cho giao dịch lớn</Text>
                    </View>

                    <Switch
                      value={pinOn}
                      onValueChange={setPinOn}
                      trackColor={{ false: "#d1d5db", true: ORANGE }}
                      thumbColor="#fff"
                    />
                  </View>

                  <TouchableOpacity
                    onPress={() => navigation.navigate("ChangeWalletPassword")}
                    activeOpacity={0.8}
                    style={styles.changePwdRow}
                  >
                    <View>
                      <Text style={styles.securityTitle}>Đổi mật khẩu ví</Text>
                      <Text style={styles.securitySubtitle}>Cập nhật mật khẩu bảo mật</Text>
                    </View>

                    <View style={styles.arrowIndicator} />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Limits */}
              <View>
                <Text style={styles.sectionSubTitle}>Hạn mức giao dịch</Text>

                <View style={styles.limitList}>
                  {/* Daily withdraw */}
                  <View style={styles.limitBlueCard}>
                    <View style={styles.limitRow}>
                      <Text style={styles.limitBlueTitle}>Hạn mức rút tiền hàng ngày</Text>
                      <Text style={styles.limitBlueAmount}>5,000,000₫</Text>
                    </View>

                    <View style={styles.limitBlueBarBg}>
                      <View style={styles.limitBlueBarFill} />
                    </View>

                    <Text style={styles.limitBlueUsed}>Đã sử dụng: 1,500,000₫</Text>
                  </View>

                  {/* Monthly */}
                  <View style={styles.limitGreenCard}>
                    <View style={styles.limitRow}>
                      <Text style={styles.limitGreenTitle}>Hạn mức giao dịch hàng tháng</Text>
                      <Text style={styles.limitGreenAmount}>50,000,000₫</Text>
                    </View>

                    <View style={styles.limitGreenBarBg}>
                      <View style={styles.limitGreenBarFill} />
                    </View>

                    <Text style={styles.limitGreenUsed}>Đã sử dụng: 22,500,000₫</Text>
                  </View>

                  <TouchableOpacity activeOpacity={0.8}>
                    <Text style={styles.requestLimitText}>Yêu cầu tăng hạn mức</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f9fafb",
  },

  scrollContent: {
    paddingBottom: 96,
  },

  gradientContainer: {
    paddingHorizontal: 24,
    paddingBottom: 32,
    paddingTop: 12,
  },

  topRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 24,
  },

  backButton: {
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 999,
    padding: 8,
  },

  headerTitle: {
    color: "#fff",
    fontFamily: Fonts.LeagueSpartanBold,
    fontSize: 20,
    flex: 1,
  },

  balanceCard: {
    backgroundColor: "rgba(255,255,255,0.10)",
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.20)",
  },

  rowBetween: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },

  rowLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  balanceLabel: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 13,
    fontFamily: Fonts.LeagueSpartanMedium,
  },

  eyeButton: {
    backgroundColor: "rgba(255,255,255,0.20)",
    borderRadius: 999,
    padding: 6,
  },

  balanceBlock: {
    marginBottom: 16,
  },

  balanceText: {
    color: "#fff",
    fontSize: 30,
    lineHeight: 36,
    fontFamily: Fonts.LeagueSpartanBold,
    marginBottom: 6,
  },

  pendingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  pendingText: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 13,
    fontFamily: Fonts.LeagueSpartanMedium,
  },

  actionRow: {
    flexDirection: "row",
    gap: 12,
  },

  withdrawBtn: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },

  withdrawText: {
    color: ORANGE,
    fontFamily: Fonts.LeagueSpartanSemiBold,
    fontSize: 14,
  },

  statsBtn: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.20)",
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },

  statsText: {
    color: "#fff",
    fontFamily: Fonts.LeagueSpartanSemiBold,
    fontSize: 14,
  },

  roundedTopContainer: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    marginTop: -16,
  },

  contentWrap: {
    paddingHorizontal: 24,
    paddingVertical: 24,
  },

  sectionWrap: {
    marginBottom: 24,
  },

  sectionHeadRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },

  sectionTitle: {
    fontSize: 18,
    color: "#111827",
    fontFamily: Fonts.LeagueSpartanSemiBold,
  },

  manageText: {
    color: ORANGE,
    fontSize: 14,
    fontFamily: Fonts.LeagueSpartanSemiBold,
  },

  paymentMethodList: {
    rowGap: 12 as any,
  },

  paymentMethodItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 16,
    backgroundColor: "#f9fafb",
    borderRadius: 12,
  },

  paymentIcon: {
    width: 40,
    height: 40,
    backgroundColor: ORANGE,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },

  paymentTextCol: {
    flex: 1,
  },

  paymentName: {
    color: "#111827",
    fontFamily: Fonts.LeagueSpartanSemiBold,
  },

  paymentNumber: {
    color: "#6b7280",
    fontSize: 13,
    fontFamily: Fonts.LeagueSpartanMedium,
  },

  defaultBadge: {
    backgroundColor: "#dcfce7",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },

  defaultBadgeText: {
    color: "#15803d",
    fontSize: 12,
    fontFamily: Fonts.LeagueSpartanSemiBold,
  },

  addMethodButton: {
    borderWidth: 2,
    borderStyle: "dashed" as any,
    borderColor: "#d1d5db",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },

  addMethodText: {
    color: "#6b7280",
    fontFamily: Fonts.LeagueSpartanSemiBold,
  },

  filterBtnRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },

  tabRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 16,
  },

  tab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
  },

  tabText: {
    fontSize: 14,
    fontFamily: Fonts.LeagueSpartanSemiBold,
  },

  transactionList: {
    rowGap: 12 as any,
  },

  transactionItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 16,
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#f3f4f6",
  },

  transactionIcon: {
    width: 40,
    height: 40,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },

  transactionTextCol: {
    flex: 1,
  },

  transactionTitle: {
    color: "#111827",
    fontSize: 14,
    fontFamily: Fonts.LeagueSpartanSemiBold,
  },

  transactionSubtitle: {
    color: "#6b7280",
    fontSize: 12,
    fontFamily: Fonts.LeagueSpartanMedium,
  },

  amountCol: {
    alignItems: "flex-end",
  },

  amountText: {
    fontFamily: Fonts.LeagueSpartanBold,
  },

  statusText: {
    fontSize: 12,
    fontFamily: Fonts.LeagueSpartanSemiBold,
  },

  viewAllBtn: {
    textAlign: "center",
    marginTop: 16,
    paddingVertical: 12,
    color: ORANGE,
    fontSize: 14,
    fontFamily: Fonts.LeagueSpartanSemiBold,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },

  modalSheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
  },

  modalHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },

  modalHeaderTitle: {
    fontSize: 18,
    color: "#111827",
    fontFamily: Fonts.LeagueSpartanSemiBold,
  },

  modalCloseBtn: {
    padding: 8,
  },

  modalBodyGap: {
    rowGap: 24 as any,
  },

  sectionSubTitle: {
    color: "#374151",
    fontSize: 14,
    marginBottom: 12,
    fontFamily: Fonts.LeagueSpartanSemiBold,
  },

  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },

  chip: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
  },

  chipText: {
    fontFamily: Fonts.LeagueSpartanSemiBold,
  },

  modalBtnRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 24,
  },

  resetBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#d1d5db",
    alignItems: "center",
    justifyContent: "center",
  },

  resetBtnText: {
    color: "#374151",
    fontFamily: Fonts.LeagueSpartanSemiBold,
  },

  applyBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: ORANGE,
    alignItems: "center",
    justifyContent: "center",
  },

  applyBtnText: {
    color: "#fff",
    fontFamily: Fonts.LeagueSpartanSemiBold,
  },

  paymentSheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "90%",
  },

  paymentHeader: {
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },

  paymentScroll: {
    padding: 24,
  },

  paymentSection: {
    marginBottom: 24,
  },

  methodActionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  actionEdit: {
    color: ORANGE,
    fontSize: 14,
    fontFamily: Fonts.LeagueSpartanSemiBold,
  },

  actionDelete: {
    color: "#ef4444",
    fontSize: 14,
    fontFamily: Fonts.LeagueSpartanSemiBold,
  },

  addList: {
    rowGap: 12 as any,
  },

  addItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    backgroundColor: "#fff",
  },

  addIconBlue: {
    width: 40,
    height: 40,
    borderRadius: 999,
    backgroundColor: "#dbeafe",
    alignItems: "center",
    justifyContent: "center",
  },

  addIconPurple: {
    width: 40,
    height: 40,
    borderRadius: 999,
    backgroundColor: "#f3e8ff",
    alignItems: "center",
    justifyContent: "center",
  },

  addIconGreen: {
    width: 40,
    height: 40,
    borderRadius: 999,
    backgroundColor: "#dcfce7",
    alignItems: "center",
    justifyContent: "center",
  },

  simpleCardGlyph: {
    width: 20,
    height: 14,
    borderRadius: 3,
    backgroundColor: "#16a34a",
  },

  addTextCol: {
    flex: 1,
  },

  addTitle: {
    color: "#111827",
    fontFamily: Fonts.LeagueSpartanSemiBold,
  },

  addSubtitle: {
    color: "#6b7280",
    fontSize: 13,
    fontFamily: Fonts.LeagueSpartanMedium,
  },

  securityList: {
    rowGap: 12 as any,
  },

  securityItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    backgroundColor: "#f9fafb",
    borderRadius: 12,
  },

  securityTitle: {
    color: "#111827",
    fontFamily: Fonts.LeagueSpartanSemiBold,
  },

  securitySubtitle: {
    color: "#6b7280",
    fontSize: 13,
    fontFamily: Fonts.LeagueSpartanMedium,
  },

  changePwdRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    backgroundColor: "#f9fafb",
    borderRadius: 12,
  },

  arrowIndicator: {
    width: 20,
    height: 20,
    borderRightWidth: 2,
    borderTopWidth: 2,
    transform: [{ rotate: "45deg" }],
    borderColor: "#9ca3af",
  },

  limitList: {
    rowGap: 12 as any,
  },

  limitBlueCard: {
    padding: 16,
    backgroundColor: "#eff6ff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#bfdbfe",
  },

  limitRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },

  limitBlueTitle: {
    color: "#1e3a8a",
    fontSize: 13,
    fontFamily: Fonts.LeagueSpartanSemiBold,
  },

  limitBlueAmount: {
    color: "#1e3a8a",
    fontFamily: Fonts.LeagueSpartanBold,
  },

  limitBlueBarBg: {
    width: "100%",
    height: 8,
    backgroundColor: "#bfdbfe",
    borderRadius: 999,
  },

  limitBlueBarFill: {
    width: "30%",
    height: 8,
    backgroundColor: "#1d4ed8",
    borderRadius: 999,
  },

  limitBlueUsed: {
    color: "#1d4ed8",
    fontSize: 12,
    marginTop: 4,
    fontFamily: Fonts.LeagueSpartanSemiBold,
  },

  limitGreenCard: {
    padding: 16,
    backgroundColor: "#ecfdf5",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#bbf7d0",
  },

  limitGreenTitle: {
    color: "#14532d",
    fontSize: 13,
    fontFamily: Fonts.LeagueSpartanSemiBold,
  },

  limitGreenAmount: {
    color: "#14532d",
    fontFamily: Fonts.LeagueSpartanBold,
  },

  limitGreenBarBg: {
    width: "100%",
    height: 8,
    backgroundColor: "#86efac",
    borderRadius: 999,
  },

  limitGreenBarFill: {
    width: "45%",
    height: 8,
    backgroundColor: "#16a34a",
    borderRadius: 999,
  },

  limitGreenUsed: {
    color: "#15803d",
    fontSize: 12,
    marginTop: 4,
    fontFamily: Fonts.LeagueSpartanSemiBold,
  },

  requestLimitText: {
    textAlign: "center",
    color: ORANGE,
    paddingVertical: 8,
    fontSize: 14,
    fontFamily: Fonts.LeagueSpartanSemiBold,
  },
});
