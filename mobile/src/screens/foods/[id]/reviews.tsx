import { LinearGradient } from "expo-linear-gradient";
import { useNavigation, useRoute } from "@react-navigation/native";
import { ArrowLeft, CheckCircle2, Flag, MoreHorizontal, Star, ThumbsUp } from "lucide-react-native";
import React, { useMemo, useState } from "react";
import { FlatList, Modal, Platform, Pressable, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { Colors } from "@/constants/Colors";
import { Fonts } from "@/constants/Fonts";
import { useDatabase } from "@/hooks/useDatabase";

type SortBy = "Mới nhất" | "Cũ nhất" | "Đánh giá cao" | "Đánh giá thấp" | "Hữu ích nhất";

export default function FoodReviewsScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { id } = (route?.params ?? {}) as { id?: string };
  const foodId = Number(id ?? NaN);

  const { getFoodById, getRestaurantById } = useDatabase();

  if (!Number.isFinite(foodId)) {
    return <View style={styles.center}><Text style={styles.msg}>Thiếu tham số id.</Text></View>;
  }

  const food = getFoodById(foodId);
  if (!food) {
    return <View style={styles.center}><Text style={styles.msg}>Không tìm thấy món ăn #{foodId}.</Text></View>;
  }

  const restaurant = food.restaurantId ? getRestaurantById(food.restaurantId) : null;
  const rawReviews = (food.reviews && food.reviews.length > 0)
    ? food.reviews
    : (restaurant?.reviews ?? []);

  const ratingSummary = Number.isFinite(food.rating) ? food.rating : 0;
  const totalReviews = rawReviews.length;

  const baseReviews = rawReviews.map((r, idx) => ({
    id: idx + 1,
    user: r.user,
    avatar: (r.user?.[0] ?? "?").toUpperCase(),
    rating: Math.max(1, Math.min(5, Math.round(Number(r.rating) || 0))),
    comment: r.comment,
    date: "gần đây",
    helpful: (idx * 7) % 23,
    verified: idx % 2 === 0,
  }));

  const [sortBy, setSortBy] = useState<SortBy>("Mới nhất");
  const [sortOpen, setSortOpen] = useState(false);

  const sorted = useMemo(() => {
    const arr = [...baseReviews];
    switch (sortBy) {
      case "Cũ nhất": return arr.reverse();
      case "Đánh giá cao": return arr.sort((a, b) => b.rating - a.rating);
      case "Đánh giá thấp": return arr.sort((a, b) => a.rating - b.rating);
      case "Hữu ích nhất": return arr.sort((a, b) => b.helpful - a.helpful);
      default: return arr;
    }
  }, [baseReviews, sortBy]);

  const dist = useMemo(() => {
    const d = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 } as Record<number, number>;
    baseReviews.forEach((r) => { d[r.rating] += 1; });
    return d;
  }, [baseReviews]);

  return (
    <View style={{ flex: 1, backgroundColor: Colors.light.background }}>
      <LinearGradient colors={["#f59e0b", "#e95322"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.header}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconBtn}><ArrowLeft size={20} color="#fff" /></TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>Đánh giá</Text>
            <Text style={styles.headerSubtitle}>{food.name}</Text>
          </View>
          <TouchableOpacity onPress={() => setSortOpen(true)} style={styles.iconBtn}><MoreHorizontal size={20} color="#fff" /></TouchableOpacity>
        </View>

        <View style={styles.summaryCard}>
          <View style={{ alignItems: "center", width: 88 }}>
            <Text style={styles.bigScore}>{ratingSummary.toFixed(1)}</Text>
            <View style={{ flexDirection: "row", marginBottom: 4 }}>
              {[...Array(5)].map((_, i) => (
                <Star key={i} size={16} color="#fff" fill={i < Math.floor(ratingSummary) ? "#fff" : "transparent"} style={{ marginHorizontal: 1 }} />
              ))}
            </View>
            <Text style={styles.summarySmall}>{totalReviews} đánh giá</Text>
          </View>

          <View style={{ flex: 1, marginLeft: 12 }}>
            {[5, 4, 3, 2, 1].map((n) => {
              const pct = totalReviews ? (dist[n] / totalReviews) * 100 : 0;
              return (
                <View key={n} style={styles.distRow}>
                  <Text style={styles.distNum}>{n}</Text>
                  <Star size={12} color="#fff" fill="#fff" />
                  <View style={styles.distBarBg}><View style={[styles.distBarFill, { width: `${pct}%` }]} /></View>
                  <Text style={styles.distCount}>{dist[n]}</Text>
                </View>
              );
            })}
          </View>
        </View>
      </LinearGradient>

      <View style={styles.sortRow}>
        <Text style={styles.sortLabel}>Sắp xếp:</Text>
        <TouchableOpacity onPress={() => setSortOpen(true)} style={styles.sortPill}>
          <Text style={styles.sortText}>{sortBy}</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={sorted}
        keyExtractor={(it) => String(it.id)}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}
        ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
        ListEmptyComponent={<View style={{ padding: 24 }}><Text style={{ color: Colors.light.mutedForeground, fontFamily: Fonts.LeagueSpartanRegular }}>Chưa có đánh giá cho món này.</Text></View>}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.userRow}>
              <View style={styles.avatar}><Text style={styles.avatarText}>{item.avatar}</Text></View>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <Text style={styles.userName}>{item.user}</Text>
                  {item.verified && (
                    <View style={styles.verifiedPill}>
                      <CheckCircle2 size={12} color="#16a34a" />
                      <Text style={styles.verifiedText}>Đã xác minh</Text>
                    </View>
                  )}
                </View>
                <View style={{ flexDirection: "row", alignItems: "center", marginTop: 2 }}>
                  <View style={{ flexDirection: "row", marginRight: 8 }}>
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} size={14} color={i < item.rating ? "#e95322" : "#d1d5db"} fill={i < item.rating ? "#e95322" : "transparent"} style={{ marginRight: 2 }} />
                    ))}
                  </View>
                  <Text style={styles.dateText}>{item.date}</Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => setSortOpen(true)}><MoreHorizontal size={18} color="#9ca3af" /></TouchableOpacity>
            </View>

            <Text style={styles.comment}>{item.comment}</Text>

            <View style={styles.actionsRow}>
              <TouchableOpacity style={styles.actionBtn}><ThumbsUp size={16} color={Colors.light.mutedForeground} /><Text style={styles.actionText}>Hữu ích ({item.helpful})</Text></TouchableOpacity>
              <TouchableOpacity style={styles.actionBtn}><Flag size={16} color={Colors.light.destructive} /><Text style={[styles.actionText, { color: Colors.light.destructive }]}>Báo cáo</Text></TouchableOpacity>
            </View>
          </View>
        )}
      />

      <Modal transparent animationType="fade" visible={sortOpen} onRequestClose={() => setSortOpen(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setSortOpen(false)}>
          <View style={styles.modalCard}>
            {(["Mới nhất", "Cũ nhất", "Đánh giá cao", "Đánh giá thấp", "Hữu ích nhất"] as SortBy[]).map((opt) => (
              <TouchableOpacity key={opt} style={styles.modalItem} onPress={() => { setSortBy(opt); setSortOpen(false); }}>
                <Text style={[styles.modalItemText, sortBy === opt && { fontFamily: Fonts.LeagueSpartanBold }]}>{opt}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#fff" },
  msg: { color: "#111", fontFamily: Fonts.LeagueSpartanMedium },

  header: { paddingHorizontal: 16, paddingTop: Platform.OS === "android" ? 28 : 16, paddingBottom: 16 },
  headerRow: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
  iconBtn: { padding: 8, backgroundColor: "rgba(255,255,255,0.2)", borderRadius: 9999, marginRight: 12 },
  headerTitle: { color: "#fff", fontSize: 18, fontFamily: Fonts.LeagueSpartanBold },
  headerSubtitle: { color: "rgba(255,255,255,0.85)", fontSize: 13, marginTop: 2, fontFamily: Fonts.LeagueSpartanRegular },

  summaryCard: { backgroundColor: "rgba(255,255,255,0.12)", borderRadius: 14, padding: 12, flexDirection: "row" },
  bigScore: { color: "#fff", fontSize: 32, fontFamily: Fonts.LeagueSpartanBold, textAlign: "center" },
  summarySmall: { color: "rgba(255,255,255,0.9)", fontSize: 12, textAlign: "center", fontFamily: Fonts.LeagueSpartanRegular },

  distRow: { flexDirection: "row", alignItems: "center", marginVertical: 4 },
  distNum: { color: "#fff", width: 12, fontSize: 12, fontFamily: Fonts.LeagueSpartanMedium },
  distBarBg: { flex: 1, height: 8, backgroundColor: "rgba(255,255,255,0.25)", borderRadius: 9999, marginHorizontal: 8 },
  distBarFill: { height: 8, backgroundColor: "#fff", borderRadius: 9999 },
  distCount: { color: "#fff", fontSize: 12, width: 22, textAlign: "right", fontFamily: Fonts.LeagueSpartanRegular },

  sortRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.light.border, backgroundColor: Colors.light.background },
  sortLabel: { color: "#391713", fontSize: 13, marginRight: 8, fontFamily: Fonts.LeagueSpartanMedium },
  sortPill: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, borderWidth: 1, borderColor: Colors.light.border, backgroundColor: "#f9fafb" },
  sortText: { color: "#391713", fontSize: 13, fontFamily: Fonts.LeagueSpartanMedium },

  card: { backgroundColor: "#f5f6f8", borderRadius: 14, padding: 12 },
  userRow: { flexDirection: "row", alignItems: "center", marginBottom: 8 },
  avatar: { width: 40, height: 40, borderRadius: 9999, backgroundColor: "#e95322", alignItems: "center", justifyContent: "center", marginRight: 10 },
  avatarText: { color: "#fff", fontSize: 13, fontFamily: Fonts.LeagueSpartanBold },
  userName: { color: "#391713", fontSize: 14, marginRight: 6, fontFamily: Fonts.LeagueSpartanMedium },
  verifiedPill: { flexDirection: "row", alignItems: "center", paddingHorizontal: 8, paddingVertical: 2, backgroundColor: "#dcfce7", borderRadius: 9999, marginLeft: 4 },
  verifiedText: { color: "#16a34a", fontSize: 11, marginLeft: 4, fontFamily: Fonts.LeagueSpartanMedium },

  dateText: { color: "#6b7280", fontSize: 12, fontFamily: Fonts.LeagueSpartanRegular },
  comment: { color: "#4b5563", fontSize: 13, lineHeight: 20, fontFamily: Fonts.LeagueSpartanRegular },

  actionsRow: { flexDirection: "row", alignItems: "center", gap: 16, paddingTop: 10, marginTop: 8, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: Colors.light.border },
  actionBtn: { flexDirection: "row", alignItems: "center", gap: 6 },
  actionText: { fontSize: 12, color: Colors.light.mutedForeground, fontFamily: Fonts.LeagueSpartanMedium },

  modalBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.25)", justifyContent: "flex-end" },
  modalCard: { backgroundColor: "#fff", borderTopLeftRadius: 16, borderTopRightRadius: 16, paddingBottom: 16 },
  modalItem: { paddingHorizontal: 20, paddingVertical: 14 },
  modalItemText: { fontSize: 16, color: Colors.light.foreground, fontFamily: Fonts.LeagueSpartanRegular },
});
