import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SectionList,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import {
  ArrowLeft,
  ArrowUpRight,
  ArrowDownLeft,
  Search,
  Calendar,
  Download,
} from "lucide-react-native";
import { Fonts } from "@/constants/Fonts";

const ORANGE = "#ea580c";

type Txn = {
  id: number;
  type: "credit" | "debit";
  amount: number;
  description: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  status: "completed" | "pending";
  orderId: string | null;
};

export default function AllTransactionsScreen() {
  const navigation = useNavigation<any>();

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFilter, setSelectedFilter] = useState<"all" | "credit" | "debit">("all");

  // Demo data
  const allTransactions: Txn[] = [
    { id: 1, type: "credit", amount: 85000, description: "Giao hàng thành công #DH001", date: "2024-01-15", time: "14:30", status: "completed", orderId: "DH001" },
    { id: 2, type: "debit", amount: 50000, description: "Rút tiền về tài khoản", date: "2024-01-15", time: "10:15", status: "completed", orderId: null },
    { id: 3, type: "credit", amount: 120000, description: "Giao hàng thành công #DH002", date: "2024-01-14", time: "18:45", status: "completed", orderId: "DH002" },
    { id: 4, type: "credit", amount: 95000, description: "Giao hàng thành công #DH003", date: "2024-01-14", time: "16:20", status: "pending", orderId: "DH003" },
    { id: 5, type: "debit", amount: 100000, description: "Rút tiền về tài khoản", date: "2024-01-13", time: "09:30", status: "completed", orderId: null },
    { id: 6, type: "credit", amount: 75000, description: "Giao hàng thành công #DH004", date: "2024-01-13", time: "15:45", status: "completed", orderId: "DH004" },
    { id: 7, type: "credit", amount: 110000, description: "Giao hàng thành công #DH005", date: "2024-01-12", time: "12:20", status: "completed", orderId: "DH005" },
    { id: 8, type: "debit", amount: 200000, description: "Rút tiền về tài khoản", date: "2024-01-12", time: "08:15", status: "completed", orderId: null },
    { id: 9, type: "credit", amount: 65000, description: "Giao hàng thành công #DH006", date: "2024-01-11", time: "19:30", status: "completed", orderId: "DH006" },
    { id: 10, type: "credit", amount: 90000, description: "Giao hàng thành công #DH007", date: "2024-01-11", time: "16:10", status: "pending", orderId: "DH007" },
  ];

  const formatCurrency = (amount: number) => {
    try {
      return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(amount);
    } catch {
      return amount.toLocaleString("vi-VN") + " ₫";
    }
  };

  const formatDateLabel = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yest = new Date();
    yest.setDate(today.getDate() - 1);

    if (date.toDateString() === today.toDateString()) return "Hôm nay";
    if (date.toDateString() === yest.toDateString()) return "Hôm qua";

    return date.toLocaleDateString("vi-VN", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const filtered = useMemo(() => {
    return allTransactions.filter((t) => {
      const q = searchQuery.trim().toLowerCase();
      const matchesSearch =
        t.description.toLowerCase().includes(q) ||
        (!!t.orderId && t.orderId.toLowerCase().includes(q));
      const matchesFilter = selectedFilter === "all" || t.type === selectedFilter;
      return matchesSearch && matchesFilter;
    });
  }, [allTransactions, searchQuery, selectedFilter]);

  const sections = useMemo(() => {
    const map: Record<string, Txn[]> = {};
    for (const t of filtered) {
      if (!map[t.date]) map[t.date] = [];
      map[t.date].push(t);
    }
    const entries = Object.entries(map).sort((a, b) => (a[0] < b[0] ? 1 : -1));
    return entries.map(([date, data]) => ({
      title: date,
      data: data.sort((a, b) => (a.time < b.time ? 1 : -1)),
    }));
  }, [filtered]);

  return (
    <SafeAreaView style={styles.safe} edges={["top", "right", "bottom", "left"]}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerRow}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconBtn}>
              <ArrowLeft size={24} color="#374151" />
            </TouchableOpacity>

            <Text style={styles.headerTitle}>Tất cả giao dịch</Text>

            <TouchableOpacity onPress={() => { }} style={styles.iconBtn}>
              <Download size={20} color="#4b5563" />
            </TouchableOpacity>
          </View>

          {/* Search */}
          <View style={styles.searchWrap}>
            <Search size={20} color="#9ca3af" style={styles.searchIcon} />
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Tìm kiếm giao dịch..."
              placeholderTextColor="#9ca3af"
              style={styles.searchInput}
            />
          </View>

          {/* Filters */}
          <View style={styles.filtersRow}>
            {[
              { key: "all", label: "Tất cả" },
              { key: "credit", label: "Thu nhập" },
              { key: "debit", label: "Chi tiêu" },
            ].map((f) => {
              const active = selectedFilter === (f.key as any);
              return (
                <TouchableOpacity
                  key={f.key}
                  onPress={() => setSelectedFilter(f.key as any)}
                  style={[styles.filterChip, active && styles.filterChipActive]}
                >
                  <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>
                    {f.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* List */}
        <SectionList
          style={styles.list}              
          sections={sections}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.listContent}
          stickySectionHeadersEnabled={false}
          renderSectionHeader={({ section }) => (
            <View style={styles.sectionHeader}>
              <View style={styles.sectionHeaderRow}>
                <Calendar size={16} color="#6b7280" />
                <Text style={styles.sectionHeaderTitle}>
                  {formatDateLabel(section.title)}
                </Text>
                <Text style={styles.sectionHeaderCount}>
                  ({section.data.length} giao dịch)
                </Text>
              </View>
            </View>
          )}
          renderItem={({ item, index, section }) => {
            const isLast = index === section.data.length - 1;
            const isCredit = item.type === "credit";
            return (
              <View style={[styles.itemRow, !isLast && styles.itemDivider]}>
                <View
                  style={[
                    styles.itemIconWrap,
                    { backgroundColor: isCredit ? "#dcfce7" : "#fee2e2" },
                  ]}
                >
                  {isCredit ? (
                    <ArrowDownLeft size={24} color="#16a34a" />
                  ) : (
                    <ArrowUpRight size={24} color="#dc2626" />
                  )}
                </View>

                <View style={styles.itemBody}>
                  <Text style={styles.itemTitle}>{item.description}</Text>

                  <View style={styles.itemSubRow}>
                    <Text style={styles.itemTime}>{item.time}</Text>

                    {!!item.orderId && (
                      <View style={styles.orderTag}>
                        <Text style={styles.orderTagText}>{item.orderId}</Text>
                      </View>
                    )}
                  </View>
                </View>

                <View style={styles.itemRight}>
                  <Text
                    style={[
                      styles.amount,
                      isCredit ? styles.amountCredit : styles.amountDebit,
                    ]}
                  >
                    {isCredit ? "+" : "-"}
                    {formatCurrency(item.amount)}
                  </Text>

                  <Text
                    style={[
                      styles.status,
                      item.status === "completed" ? styles.statusDone : styles.statusPending,
                    ]}
                  >
                    {item.status === "completed" ? "Hoàn thành" : "Đang xử lý"}
                  </Text>
                </View>
              </View>
            );
          }}
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <Text style={styles.emptyTitle}>Không tìm thấy giao dịch</Text>
              <Text style={styles.emptySub}>
                Thử thay đổi từ khóa tìm kiếm hoặc bộ lọc
              </Text>
            </View>
          }
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#f9fafb",
  },

  container: {
    flex: 1,
    width: "100%",            // <-- NEW: full width
    backgroundColor: "transparent",
  },

  header: {
    backgroundColor: "#fff",
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },

  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },

  iconBtn: {
    padding: 8,
    borderRadius: 999,
  },

  headerTitle: {
    flex: 1,
    textAlign: "left",
    fontSize: 18,
    color: "#111827",
    fontFamily: Fonts.LeagueSpartanSemiBold,
  },

  searchWrap: {
    position: "relative",
    marginBottom: 8,
  },

  searchIcon: {
    position: "absolute",
    left: 12,
    top: 14,
  },

  searchInput: {
    paddingVertical: 12,
    paddingHorizontal: 44,
    backgroundColor: "#f3f4f6",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 12,
    fontSize: 14,
    color: "#111827",
    fontFamily: Fonts.LeagueSpartanMedium,
  },

  filtersRow: {
    flexDirection: "row",
    gap: 8,
  },

  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "#f3f4f6",
  },

  filterChipActive: {
    backgroundColor: ORANGE,
  },

  filterChipText: {
    fontSize: 13,
    color: "#4b5563",
    fontFamily: Fonts.LeagueSpartanMedium,
  },

  filterChipTextActive: {
    color: "#fff",
  },

  list: {
    flex: 1,                 // <-- NEW: list chiếm phần còn lại
    width: "100%",
  },

  listContent: {
    paddingBottom: 24,
  },

  sectionHeader: {
    backgroundColor: "#f3f4f6",
    paddingHorizontal: 16,
    paddingVertical: 10,
  },

  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },

  sectionHeaderTitle: {
    fontSize: 13,
    color: "#374151",
    marginLeft: 2,
    fontFamily: Fonts.LeagueSpartanMedium,
  },

  sectionHeaderCount: {
    fontSize: 11,
    color: "#6b7280",
    marginLeft: 6,
    fontFamily: Fonts.LeagueSpartanRegular,
  },

  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#fff",
  },

  itemDivider: {
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },

  itemIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },

  itemBody: {
    flex: 1,
    marginHorizontal: 12,
  },

  itemTitle: {
    fontSize: 14,
    color: "#111827",
    marginBottom: 2,
    fontFamily: Fonts.LeagueSpartanMedium,
  },

  itemSubRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  itemTime: {
    fontSize: 12,
    color: "#6b7280",
    fontFamily: Fonts.LeagueSpartanRegular,
  },

  orderTag: {
    marginLeft: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: "#f3f4f6",
  },

  orderTagText: {
    fontSize: 11,
    color: "#374151",
    fontFamily: Fonts.LeagueSpartanMedium,
  },

  itemRight: {
    alignItems: "flex-end",
  },

  amount: {
    fontSize: 16,
    fontFamily: Fonts.LeagueSpartanSemiBold,
  },

  amountCredit: {
    color: "#16a34a",
  },

  amountDebit: {
    color: "#dc2626",
  },

  status: {
    fontSize: 12,
    marginTop: 2,
    fontFamily: Fonts.LeagueSpartanMedium,
  },

  statusDone: {
    color: "#16a34a",
  },

  statusPending: {
    color: "#ca8a04",
  },

  emptyWrap: {
    alignItems: "center",
    paddingVertical: 48,
    paddingHorizontal: 24,
  },

  emptyTitle: {
    fontSize: 16,
    color: "#9ca3af",
    marginBottom: 6,
    fontFamily: Fonts.LeagueSpartanMedium,
  },

  emptySub: {
    fontSize: 13,
    color: "#6b7280",
    textAlign: "center",
    fontFamily: Fonts.LeagueSpartanRegular,
  },
});

