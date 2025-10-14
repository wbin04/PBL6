// src/screens/ShipperStatsScreen.tsx
import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from "react-native";
import {
  Menu,
  Bell,
  TrendingUp,
  DollarSign,
  Package,
  Clock,
  Calendar,
  Target,
  Award,
  ChevronRight,
} from "lucide-react-native";
import { useNavigation } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Fonts } from "@/constants/Fonts";

const YELLOW = "#f5cb58";
const ORANGE = "#e95322";
const GRAY_BORDER = "#e5e7eb";
const GRAY_BG = "#f9fafb";
const GREEN = "#22c55e";
const BLUE = "#2563eb";
const PURPLE = "#7c3aed";

function StatTile({
  icon,
  badgeBg,
  value,
  label,
}: {
  icon: React.ReactNode;
  badgeBg: string;
  value: string;
  label: string;
}) {
  return (
    <View style={styles.tile}>
      <View style={styles.tileHeader}>
        <View style={[styles.tileBadge, { backgroundColor: badgeBg }]}>{icon}</View>
        <ChevronRight size={16} color="#9ca3af" />
      </View>
      <Text style={styles.tileValue}>{value}</Text>
      <Text style={styles.tileLabel}>{label}</Text>
    </View>
  );
}

function RowItem({
  icon,
  label,
  value,
  sub,
  valueColor,
  badgeBg,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
  valueColor?: string;
  badgeBg: string;
}) {
  return (
    <View style={styles.row}>
      <View style={styles.rowLeft}>
        <View style={[styles.rowBadge, { backgroundColor: badgeBg }]}>{icon}</View>
        <Text style={styles.rowLabel}>{label}</Text>
      </View>
      <View style={styles.rowRight}>
        <Text style={[styles.rowValue, valueColor ? { color: valueColor } : null]}>{value}</Text>
        {!!sub && <Text style={styles.rowSub}>{sub}</Text>}
      </View>
    </View>
  );
}

export default function ShipperStatsScreen() {
  const navigation = useNavigation<any>();

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      <View style={styles.header}>
        <View style={styles.headerBar}>
          <TouchableOpacity
            onPress={() => (navigation.openDrawer ? navigation.openDrawer() : null)}
            style={styles.headerIconBtn}
            activeOpacity={0.8}
          >
            <Menu size={22} color="#e95322" />
          </TouchableOpacity>
          <View style={{ flex: 1 }} />
          <View style={styles.headerIconBtn}>
            <Bell size={22} color="#e95322" />
          </View>
        </View>

        <View style={styles.headerTitleWrap}>
          <Text style={styles.headerTitle}>Thống kê</Text>
          <Text style={styles.headerSubtitle}>Theo dõi hiệu suất làm việc</Text>
        </View>
      </View>

      <SafeAreaView style={styles.body} edges={["bottom"]}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Khối hiệu suất hôm nay */}
          <View style={styles.contentCard}>
            <View style={styles.performanceTop}>
              <View>
                <Text style={styles.sectionTitle}>Hiệu suất hôm nay</Text>
                <Text style={styles.muted}>Cập nhật lúc 14:30</Text>
              </View>
              <View style={styles.performanceBadge}>
                <TrendingUp size={22} color={GREEN} />
              </View>
            </View>

            <View style={styles.performanceRow}>
              <Text style={styles.performanceValue}>96%</Text>
              <View style={styles.deltaPill}>
                <Text style={styles.deltaText}>+8%</Text>
              </View>
            </View>
            <Text style={styles.muted}>Tỷ lệ hoàn thành đơn hàng</Text>
          </View>

          {/* Khối hôm nay */}
          <View style={styles.block}>
            <View style={styles.blockHeader}>
              <Text style={styles.sectionTitle}>Hôm nay</Text>
              <View style={styles.inlineRow}>
                <Calendar size={16} color="#6b7280" style={{ marginRight: 4 }} />
                <Text style={styles.smallMuted}>11/09/2025</Text>
              </View>
            </View>

            <View style={styles.grid2x2}>
              <StatTile icon={<Package size={20} color={BLUE} />} badgeBg="#dbeafe" value="12" label="Đơn hàng" />
              <StatTile icon={<DollarSign size={20} color={GREEN} />} badgeBg="#dcfce7" value="480K" label="Thu nhập" />
              <StatTile icon={<Clock size={20} color={PURPLE} />} badgeBg="#ede9fe" value="8.5h" label="Giờ làm" />
              <StatTile icon={<Award size={20} color={ORANGE} />} badgeBg="#ffedd5" value="4.8★" label="Đánh giá" />
            </View>
          </View>

          {/* Tuần này */}
          <View style={styles.block}>
            <View style={styles.blockHeader}>
              <Text style={styles.sectionTitle}>Tuần này</Text>
              <View style={styles.inlineRow}>
                <Target size={16} color="#6b7280" style={{ marginRight: 4 }} />
                <Text style={styles.smallMuted}>Mục tiêu: 100 đơn</Text>
              </View>
            </View>

            <View style={styles.card}>
              <View style={{ gap: 20 }}>
                <RowItem icon={<Package size={16} color={BLUE} />} label="Tổng đơn hàng" value="84" sub="của 100" badgeBg="#dbeafe" />
                <RowItem icon={<DollarSign size={16} color={GREEN} />} label="Tổng thu nhập" value="3.360K" sub="VNĐ" valueColor={GREEN} badgeBg="#dcfce7" />
                <RowItem icon={<TrendingUp size={16} color={PURPLE} />} label="Tỷ lệ hoàn thành" value="96%" sub="xuất sắc" valueColor={PURPLE} badgeBg="#ede9fe" />
              </View>

              <View style={styles.progressWrap}>
                <View style={styles.progressHeader}>
                  <Text style={styles.smallMuted}>Tiến độ tuần</Text>
                  <Text style={styles.progressPct}>84%</Text>
                </View>
                <View style={styles.progressBar}>
                  <View style={[styles.progressFill, { width: "84%" }]} />
                </View>
              </View>
            </View>
          </View>

          {/* Biểu đồ */}
          <View style={styles.block}>
            <View style={styles.blockHeader}>
              <Text style={styles.sectionTitle}>Biểu đồ hiệu suất</Text>
              <TouchableOpacity activeOpacity={0.7}>
                <Text style={styles.link}>Xem chi tiết</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.chartPlaceholder}>
              <View style={styles.chartIconWrap}>
                <TrendingUp size={30} color="#9ca3af" />
              </View>
              <Text style={styles.chartTitle}>Biểu đồ hiệu suất</Text>
              <Text style={styles.chartNote}>Dữ liệu chi tiết sẽ hiển thị tại đây</Text>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: YELLOW },
  header: { backgroundColor: YELLOW, paddingHorizontal: 20, paddingBottom: 12 },
  headerBar: { flexDirection: "row", alignItems: "center", marginBottom: 10 },
  headerIconBtn: { backgroundColor: "#fff", borderRadius: 999, padding: 8 },
  headerTitleWrap: { alignItems: "flex-start" },
  headerTitle: {
    color: "#fff",
    marginBottom: 4,
    fontSize: 32,
    fontFamily: Fonts.LeagueSpartanBlack,
  },
  headerSubtitle: {
    color: "#e95322",
    fontSize: 16,
    fontFamily: Fonts.LeagueSpartanSemiBold,
  },
  body: { flex: 1, backgroundColor: "#fff", borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 24 },

  contentCard: { backgroundColor: "#eef2ff", borderWidth: 1, borderColor: "#c7d2fe", borderRadius: 16, padding: 16, marginBottom: 24 },
  performanceTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  performanceBadge: { backgroundColor: "#dcfce7", borderRadius: 999, padding: 10 },
  performanceRow: { flexDirection: "row", alignItems: "center", columnGap: 8 },
  performanceValue: { fontFamily: Fonts.LeagueSpartanBold, fontSize: 26, color: "#111827" },
  deltaPill: { backgroundColor: "#dcfce7", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999 },
  deltaText: { fontFamily: Fonts.LeagueSpartanMedium, fontSize: 12, color: "#15803d" },
  muted: { fontFamily: Fonts.LeagueSpartanRegular, color: "#6b7280" },

  sectionTitle: { fontFamily: Fonts.LeagueSpartanBold, fontSize: 18, color: "#111827" },
  smallMuted: { fontFamily: Fonts.LeagueSpartanRegular, color: "#6b7280", fontSize: 12 },
  inlineRow: { flexDirection: "row", alignItems: "center" },
  block: { marginBottom: 24 },
  blockHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },

  grid2x2: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", rowGap: 16 },
  tile: { backgroundColor: "#fff", borderRadius: 16, padding: 16, borderWidth: 1, borderColor: GRAY_BORDER, width: "48%" },
  tileHeader: { flexDirection: "row", justifyContent: "space-between", marginBottom: 8 },
  tileBadge: { borderRadius: 12, padding: 8 },
  tileValue: { fontFamily: Fonts.LeagueSpartanBold, fontSize: 20, color: "#111827", marginBottom: 2 },
  tileLabel: { fontFamily: Fonts.LeagueSpartanRegular, fontSize: 13, color: "#6b7280" },

  card: { backgroundColor: "#fff", borderRadius: 16, borderWidth: 1, borderColor: GRAY_BORDER, padding: 16 },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  rowLeft: { flexDirection: "row", alignItems: "center", columnGap: 12 },
  rowBadge: { borderRadius: 8, padding: 8 },
  rowLabel: { fontFamily: Fonts.LeagueSpartanMedium, color: "#374151", fontSize: 15 },
  rowRight: { alignItems: "flex-end" },
  rowValue: { fontFamily: Fonts.LeagueSpartanBold, color: "#111827", fontSize: 18 },
  rowSub: { fontFamily: Fonts.LeagueSpartanRegular, color: "#6b7280", fontSize: 12 },

  progressWrap: { marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: GRAY_BORDER },
  progressHeader: { flexDirection: "row", justifyContent: "space-between", marginBottom: 6 },
  progressPct: { fontFamily: Fonts.LeagueSpartanMedium, color: "#111827", fontSize: 13 },
  progressBar: { height: 8, borderRadius: 999, backgroundColor: GRAY_BG, overflow: "hidden" },
  progressFill: { height: 8, borderRadius: 999, backgroundColor: "#6366f1" },

  link: { color: ORANGE, fontFamily: Fonts.LeagueSpartanMedium, fontSize: 14 },
  chartPlaceholder: { backgroundColor: "#f8fafc", borderRadius: 16, borderWidth: 1, borderColor: GRAY_BORDER, alignItems: "center", paddingVertical: 26 },
  chartIconWrap: { backgroundColor: "#fff", width: 64, height: 64, borderRadius: 999, alignItems: "center", justifyContent: "center", marginBottom: 12 },
  chartTitle: { fontFamily: Fonts.LeagueSpartanMedium, color: "#374151", marginBottom: 4 },
  chartNote: { fontFamily: Fonts.LeagueSpartanRegular, color: "#6b7280", fontSize: 12 },
});
