import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Dimensions,
  FlatList,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation, useRoute } from "@react-navigation/native";
import { ArrowLeft, Clock, MoreHorizontal, Star, Truck } from "lucide-react-native";

import { IMAGE_MAP } from "@/assets/imageMap";
import FoodCustomizationPopup from "@/components/FoodCustomizationPopup";
import { FoodTile } from "@/components/FoodTile";
import { useToast } from "@/components/use-toast";
import VoucherCard from "@/components/VoucherCard";
import { Fonts } from "@/constants/Fonts";
import db from "@/assets/database.json";

type Restaurant = {
  id: number;
  name: string;
  image: string;
  rating: number;
  delivery?: string;
  fee?: string;
  time: string;
  description?: string;
};

type Food = {
  id: number;
  name: string;
  restaurantId: number | null;
  price: string;
  rating: number;
  image: string;
  category: string;
};

const FALLBACK_IMG =
  IMAGE_MAP["fresh-salad-bowl.png"] ?? require("@/assets/images/fresh-salad-bowl.png");
const FOOD_IMG = IMAGE_MAP;
const { width } = Dimensions.get("window");

export default function RestaurantDetail() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { id } = route.params ?? {};
  const listRef = useRef<FlatList>(null);
  const { toast } = useToast();

  // --- Data ---
  const restaurant = useMemo(() => {
    const list = (db as any).restaurants as Restaurant[];
    return list.find((r) => String(r.id) === String(id));
  }, [id]);

  const allFoods = useMemo(() => {
    const foods = (db as any).foods as Food[];
    return foods.filter((f) => f.restaurantId === Number(id));
  }, [id]);

  const allCats = useMemo(() => {
    const set = new Set<string>(["Tất cả"]);
    allFoods.forEach((f) => set.add(f.category));
    return Array.from(set);
  }, [allFoods]);

  const [tab, setTab] = useState("Tất cả");
  const foods = useMemo(
    () => allFoods.filter((f) => tab === "Tất cả" || f.category === tab),
    [allFoods, tab]
  );

  // --- Favorites ---
  const [favFoods, setFavFoods] = useState<number[]>([]);
  useEffect(() => {
    AsyncStorage.getItem("fav_foods").then((r) => setFavFoods(r ? JSON.parse(r) : []));
  }, []);
  const toggleFavFood = (fid: number) => {
    setFavFoods((prev) => {
      const next = prev.includes(fid) ? prev.filter((x) => x !== fid) : [...prev, fid];
      AsyncStorage.setItem("fav_foods", JSON.stringify(next));
      return next;
    });
  };

  if (!restaurant) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <Text style={styles.textBase}>Không tìm thấy nhà hàng</Text>
      </View>
    );
  }

  // --- Gallery ---
  const gallery: string[] = useMemo(
    () => [
      restaurant.image,
      "delicious-toppings-pizza.png",
      "restaurant-meat-vegetables.png",
      "fresh-salad-bowl.png",
    ],
    [restaurant.image]
  );

  const [active, setActive] = useState(0);
  const onScroll = (e: any) => {
    const idx = Math.round(e.nativeEvent.contentOffset.x / width);
    if (idx !== active) setActive(idx);
  };

  // --- Popup state (thuần RN) ---
  const [popupOpen, setPopupOpen] = useState(false);
  const [selectedFood, setSelectedFood] = useState<Food | null>(null);

  const openCustomize = (f: Food) => {
    setSelectedFood(f);
    setPopupOpen(true);
  };

  // Scroll to top khi màn này được focus
  useEffect(() => {
    const unsub = navigation.addListener("focus", () => {
      listRef.current?.scrollToOffset({ offset: 0, animated: false });
    });
    return unsub;
  }, [navigation]);

  // Scroll to top khi đổi tab
  useEffect(() => {
    listRef.current?.scrollToOffset({ offset: 0, animated: true });
  }, [tab]);

  return (
    <View style={{ flex: 1, backgroundColor: "#fff" }}>
      <FlatList
        ref={listRef}
        data={foods}
        keyExtractor={(i) => String(i.id)}
        numColumns={2}
        columnWrapperStyle={{ gap: 12, paddingHorizontal: 16 }}
        contentContainerStyle={{ paddingBottom: 160, gap: 12 }}
        ListHeaderComponent={
          <>
            <View style={styles.coverWrap}>
              <ScrollView
                horizontal
                pagingEnabled
                snapToInterval={width}
                decelerationRate="fast"
                showsHorizontalScrollIndicator={false}
                onScroll={onScroll}
                scrollEventThrottle={16}
              >
                {gallery.map((img, idx) => {
                  const src = FOOD_IMG[img] ?? FALLBACK_IMG;
                  return <Image key={idx} source={src} style={styles.cover} resizeMode="cover" />;
                })}
              </ScrollView>

              <View style={styles.topBar}>
                <Pressable onPress={() => navigation.goBack()} style={styles.topBtn}>
                  <ArrowLeft size={18} color="#111827" />
                </Pressable>
                <Pressable style={styles.topBtn}>
                  <MoreHorizontal size={18} color="#111827" />
                </Pressable>
              </View>

              <View style={styles.dots}>
                {gallery.map((_, i) => (
                  <View key={i} style={[styles.dot, i === active && styles.dotActive]} />
                ))}
              </View>
            </View>

            <View style={{ paddingHorizontal: 16, paddingTop: 16, gap: 10 }}>
              <View style={styles.inlineMeta}>
                <View style={styles.metaItem}>
                  <Star size={16} color="#F59E0B" fill="#F59E0B" />
                  <Text style={styles.bold}>{Number(restaurant.rating).toFixed(1)}</Text>
                </View>

                <View style={styles.metaItem}>
                  <View style={styles.shipIcon}>
                    <Truck size={12} color="#fff" />
                  </View>
                  <Text style={styles.gray}>
                    {restaurant.delivery || restaurant.fee || "Miễn phí"}
                  </Text>
                </View>

                <View style={styles.metaItem}>
                  <Clock size={16} color="#6B7280" />
                  <Text style={styles.gray}>{restaurant.time}</Text>
                </View>
              </View>

              <Text style={styles.restName}>{restaurant.name}</Text>
              <Text style={styles.desc}>{restaurant.description ?? "Không có mô tả"}</Text>

              <View style={{ gap: 12 }}>
                <Text style={styles.sectionTitle}>Voucher khuyến mãi</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ gap: 12 }}
                >
                  <VoucherCard
                    percent="Giảm 20%"
                    subtitle="Cho đơn hàng từ 200.000 VND"
                    code="SAVE20"
                  />
                  <VoucherCard
                    percent="Giảm 15%"
                    subtitle="Áp dụng đơn từ 120.000 VND"
                    code="HAPPY15"
                  />
                </ScrollView>
              </View>

              <View style={styles.tabs}>
                {allCats.map((t) => (
                  <Pressable
                    key={t}
                    onPress={() => setTab(t)}
                    style={[styles.tab, tab === t && styles.tabActive]}
                  >
                    <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>{t}</Text>
                  </Pressable>
                ))}
              </View>

              <Text style={styles.sectionTitle}>Tất cả món ăn ({foods.length})</Text>
            </View>
          </>
        }
        renderItem={({ item }) => (
          <FoodTile
            item={item as any}
            requireImage={(n: string) => FOOD_IMG[n] ?? FALLBACK_IMG}
            isFav={favFoods.includes(item.id)}
            onToggleFav={() => toggleFavFood(item.id)}
            onOpen={() => openCustomize(item)} 
            onPress={() => navigation.navigate("FoodDetail", { foodId: item.id })}
          />
        )}
      />

      {selectedFood && (
  <FoodCustomizationPopup
    isOpen={popupOpen}
    onClose={() => {
      setPopupOpen(false);
      setSelectedFood(null);

      toast({
        title: "Đã thêm vào giỏ",
        description: selectedFood.name,
        open: true,
        onOpenChange: () => {},
      });
    }}
    foodItem={{
      id: selectedFood.id,
      name: selectedFood.name,
      restaurant: restaurant.name,
      rating: Number(selectedFood.rating).toFixed(1),
      price: selectedFood.price,
      image: FOOD_IMG[selectedFood.image] ?? FALLBACK_IMG,
    }}
  />
)}

    </View>
  );
}

const R = 24;

const styles = StyleSheet.create({
  textBase: { fontFamily: Fonts.LeagueSpartanRegular, fontSize: 14, color: "#111827" },

  coverWrap: {
    width: "100%",
    height: 280,
    borderBottomLeftRadius: R,
    borderBottomRightRadius: R,
    overflow: "hidden",
  },
  cover: { width, height: 280 },

  topBar: {
    position: "absolute",
    top: 40,
    left: 12,
    right: 12,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  topBtn: { backgroundColor: "#fff", padding: 8, borderRadius: 999 },

  dots: {
    position: "absolute",
    bottom: 12,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "center",
    gap: 6,
  },
  dot: { width: 6, height: 6, borderRadius: 999, backgroundColor: "rgba(255,255,255,0.5)" },
  dotActive: { width: 22, backgroundColor: "#fff" },

  inlineMeta: { flexDirection: "row", alignItems: "center", gap: 16 },
  metaItem: { flexDirection: "row", alignItems: "center", gap: 6 },

  shipIcon: {
    width: 20,
    height: 20,
    borderRadius: 6,
    backgroundColor: "#e95322",
    alignItems: "center",
    justifyContent: "center",
  },

  restName: { fontSize: 24, color: "#3a1a12", fontFamily: Fonts.LeagueSpartanExtraBold },
  desc: { color: "#4b5563", lineHeight: 20, marginTop: 4, fontFamily: Fonts.LeagueSpartanRegular },

  sectionTitle: { fontSize: 16, color: "#3a1a12", fontFamily: Fonts.LeagueSpartanBold },

  tabs: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 10 },
  tab: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, backgroundColor: "#f3f4f6" },
  tabActive: { backgroundColor: "#f97316" },
  tabText: { color: "#374151", fontFamily: Fonts.LeagueSpartanSemiBold },
  tabTextActive: { color: "#fff", fontFamily: Fonts.LeagueSpartanSemiBold },

  gray: { color: "#6B7280", fontFamily: Fonts.LeagueSpartanRegular },
  bold: { color: "#3a1a12", fontFamily: Fonts.LeagueSpartanBold },
});
