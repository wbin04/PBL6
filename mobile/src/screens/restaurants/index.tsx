import { useNavigation } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { useEffect, useMemo, useState } from "react";
import {
  FlatList,
  LayoutChangeEvent,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { ArrowLeft, Search, ShoppingCart, User } from "lucide-react-native";

import RestaurantCard1, { Restaurant } from "@/components/RestaurantCard1";
import { Fonts } from "@/constants/Fonts";
import db from "@/assets/database.json";
import { IMAGE_MAP } from "@/assets/imageMap";

// import BottomBar from "@/components/BottomBar";

const TABS = ["Tất cả", "Burger", "Pizza", "Lành mạnh"] as const;

const CONTENT_PADDING = 16;
const ITEM_PADDING = 22;

export default function RestaurantsIndex() {
  const navigation = useNavigation<any>(); 

  const [q, setQ] = useState("");
  const [tab, setTab] = useState<(typeof TABS)[number]>("Tất cả");
  const [favorites, setFavorites] = useState<number[]>([]);
  const [headerH, setHeaderH] = useState(0);

  useEffect(() => {
    AsyncStorage.getItem("fav_restaurants").then((r) =>
      setFavorites(r ? JSON.parse(r) : [])
    );
  }, []);

  const allRestaurants = (db as any).restaurants as Restaurant[];

  const filtered = useMemo<Restaurant[]>(() => {
    const qnorm = q.trim().toLowerCase();
    return allRestaurants.filter((r) => {
      const nameHit = r.name.toLowerCase().includes(qnorm);
      const cats = Array.isArray(r.categories)
        ? r.categories
        : r.categories
        ? String(r.categories).split("•").map((s) => s.trim())
        : [];
      const tabHit = tab === "Tất cả" ? true : cats.includes(tab);
      return nameHit && tabHit;
    });
  }, [q, tab, allRestaurants]);

  const toggleFav = (id: number) => {
    setFavorites((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
      AsyncStorage.setItem("fav_restaurants", JSON.stringify(next));
      return next;
    });
  };

  const onHeaderLayout = (e: LayoutChangeEvent) => {
    const h = e.nativeEvent.layout.height;
    if (h !== headerH) setHeaderH(h);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }}>
      <View style={styles.fixedHeader} onLayout={onHeaderLayout}>
        <View style={styles.headerWrap}>
          <View style={styles.headerTopRow}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.roundIconBtn}>
              <ArrowLeft size={18} color="#3a1a12" />
            </TouchableOpacity>

            <Text style={styles.headerTitle}>Nhà hàng</Text>

            <View style={{ flexDirection: "row", gap: 10 }}>
              <TouchableOpacity
                style={styles.roundIconBtn}
                onPress={() => navigation.navigate("Cart")}
              >
                <ShoppingCart size={18} color="#3a1a12" />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.roundIconBtn}
                onPress={() => navigation.navigate("Support" as any)} 
              >
                <User size={18} color="#3a1a12" />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.searchRow}>
            <View style={styles.searchBox}>
              <TextInput
                placeholder="Tìm kiếm nhà hàng..."
                placeholderTextColor="#9CA3AF"
                value={q}
                onChangeText={setQ}
                style={styles.searchInput}
                returnKeyType="search"
              />
              <TouchableOpacity style={styles.searchBtn} onPress={() => {}}>
                <Search size={16} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Tabs */}
        <View style={styles.tabs}>
          {TABS.map((t) => {
            const active = t === tab;
            return (
              <TouchableOpacity
                key={t}
                onPress={() => setTab(t)}
                style={[styles.tab, active && styles.tabActive]}
              >
                <Text style={[styles.tabText, active && styles.tabTextActive]}>{t}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.foundWrap}>
          <Text style={styles.foundText}>
            Tìm thấy <Text style={styles.foundNum}>{filtered.length}</Text> nhà hàng
          </Text>
        </View>
      </View>

      {/* Danh sách */}
      <FlatList
        contentContainerStyle={{ paddingBottom: 110, paddingTop: headerH }}
        data={filtered}
        keyExtractor={(i) => String(i.id)}
        renderItem={({ item }) => (
          <View style={{ paddingHorizontal: ITEM_PADDING }}>
            <RestaurantCard1
              item={item}
              images={IMAGE_MAP}
              isFavorite={favorites.includes(item.id)}
              onToggleFavorite={() => toggleFav(item.id)}
              onPress={() => navigation.navigate("RestaurantDetail", { id: item.id })}
            />
          </View>
        )}
      />

      {/* <BottomBar /> */}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  fixedHeader: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    zIndex: 10,
    backgroundColor: "#fff",
  },
  headerWrap: {
    backgroundColor: "#f5cb58",
    paddingTop: 0,
    paddingBottom: 12,
  },
  headerTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 45,
    marginBottom: 12,
    paddingHorizontal: CONTENT_PADDING,
  },
  roundIconBtn: {
    backgroundColor: "#FFFFFF",
    padding: 10,
    borderRadius: 999,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
    elevation: 1,
  },
  headerTitle: {
    fontSize: 20,
    color: "#3a1a12",
    fontFamily: Fonts.LeagueSpartanExtraBold,
  },
  searchRow: {
    paddingBottom: 15,
    paddingHorizontal: CONTENT_PADDING,
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 999,
    paddingLeft: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  searchInput: {
    flex: 1,
    height: 42,
    fontSize: 14,
    color: "#111827",
    fontFamily: Fonts.LeagueSpartanRegular,
  },
  searchBtn: {
    height: 42,
    width: 42,
    borderRadius: 999,
    backgroundColor: "#EB552D",
    alignItems: "center",
    justifyContent: "center",
    margin: 4,
  },
  tabs: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 14,
    paddingHorizontal: 16,
    paddingTop: 12,
    backgroundColor: "#fff",
  },
  tab: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: "#F2F3F5",
  },
  tabActive: {
    backgroundColor: "#EB552D",
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  tabText: {
    color: "#6B7280",
    fontFamily: Fonts.LeagueSpartanMedium,
    fontSize: 14,
  },
  tabTextActive: {
    color: "#FFFFFF",
    fontFamily: Fonts.LeagueSpartanSemiBold,
    fontSize: 14,
  },
  foundWrap: {
    marginTop: 12,
    backgroundColor: "#F6F7F8",
    paddingVertical: 14,
    paddingHorizontal: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  foundText: {
    color: "#6B7280",
    marginLeft: 6,
    fontSize: 15,
    fontFamily: Fonts.LeagueSpartanRegular,
  },
  foundNum: {
    color: "#111827",
    fontFamily: Fonts.LeagueSpartanBold,
  },
});
