import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation } from "@react-navigation/native";
import {
  Bell,
  ChevronRight,
  Heart,
  Search,
  ShoppingCart,
  User,
  Menu,
} from "lucide-react-native";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Dimensions,
  FlatList,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import FoodCustomizationPopup from "@/components/FoodCustomizationPopup";
import { FoodTile } from "@/components/FoodTile";
import { RestaurantCard } from "@/components/RestaurantCard";
import { Fonts } from "@/constants/Fonts";
import { useDatabase } from "@/hooks/useDatabase";
import Sidebar from "@/components/sidebar";
import db from "@/assets/database.json";

const { width } = Dimensions.get("window");
const SESSION_KEY = "auth.session";

type Nav = any;

export default function HomeScreen() {
  const navigation = useNavigation<Nav>();

  const {
    getCategories,
    getRestaurants,
    getFoods,
    getFoodsByCategory,
    getRestaurantsByCategory,
    getBanners,
    requireImage,
  } = useDatabase();

  const [roles, setRoles] = useState<string[]>(["customer"]);
  const [currentRole, setCurrentRole] = useState<string>("customer");

  const [activeDiscountIndex, setActiveDiscountIndex] = useState(0);
  const [favorites, setFavorites] = useState<any[]>([]);
  const [popupOpen, setPopupOpen] = useState(false);
  const [selectedFood, setSelectedFood] = useState<any>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const categories = getCategories();
  const allRestaurants = getRestaurants();
  const allFoods = getFoods();
  const banners = useMemo(() => getBanners(), []);

  const filteredFoods = useMemo(
    () => (selectedCategory ? getFoodsByCategory(selectedCategory) : allFoods.slice(0, 8)),
    [selectedCategory, allFoods]
  );
  const filteredRestaurants = useMemo(
    () => (selectedCategory ? getRestaurantsByCategory(selectedCategory) : []),
    [selectedCategory, allRestaurants]
  );

  // ===== Load favorites
  useEffect(() => {
    (async () => {
      const saved = await AsyncStorage.getItem("favorites");
      if (saved) setFavorites(JSON.parse(saved));
    })();
  }, []);

  // ===== Load roles & activeRole từ SESSION (fallback dev khi chưa có)
  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(SESSION_KEY);
        if (raw) {
          const s = JSON.parse(raw);
          const validRoles = (Array.isArray(s.roles) ? s.roles : []).filter((r: string) =>
            ["customer", "seller", "shipper", "admin"].includes(r)
          );
          const roleSet = validRoles.length ? validRoles : ["customer"];
          const nextActive =
            roleSet.includes(s.activeRole) && s.activeRole ? s.activeRole : roleSet[0];
          setRoles(roleSet);
          setCurrentRole(nextActive);
          return;
        }

        // Fallback: lấy user mock
        const activeUserId = db?.dev?.activeUserId ?? db?.auth?.sessions?.[0]?.userId ?? 1;
        const activeUser = (db?.users || []).find((u: any) => u.id === activeUserId);
        const nextRoles = Array.from(
          new Set(
            ([...(activeUser?.roles || []), "customer"] as string[]).filter((r) =>
              ["customer", "seller", "shipper", "admin"].includes(r)
            )
          )
        );
        setRoles(nextRoles.length ? nextRoles : ["customer"]);
        setCurrentRole(nextRoles.includes("customer") ? "customer" : nextRoles[0] || "customer");
      } catch {
        setRoles(["customer"]);
        setCurrentRole("customer");
      }
    })();
  }, []);

  // ===== Helpers
  const saveFav = async (next: any[]) => {
    setFavorites(next);
    await AsyncStorage.setItem("favorites", JSON.stringify(next));
  };

  const toggleFavorite = (id: number) => {
    const exists = favorites.find((f) => f.id === id);
    if (exists) return void saveFav(favorites.filter((f) => f.id !== id));
    const found = allFoods.find((f) => f.id === id);
    if (found) saveFav([...favorites, found]);
  };

  const scrollRef = useRef<ScrollView>(null);
  const onScrollBanner = (e: any) => {
    const idx = Math.round(e.nativeEvent.contentOffset.x / (width - 48));
    setActiveDiscountIndex(idx);
  };

  // Đổi role: kiểm tra hợp lệ và ghi SESSION (fire-and-forget để trả về void)
  const handleChangeRole = (r: string) => {
    const allow = ["customer", "seller", "shipper", "admin"];
    const switchable =
      (db?.auth?.rolePolicy?.switchableRoles as string[]) ||
      ["customer", "shipper", "seller"];

    if (!allow.includes(r)) return;
    if (!roles.includes(r)) {
      Alert.alert("Không thể chuyển", "Tài khoản của bạn không có vai trò này.");
      return;
    }
    if (!switchable.includes(r) && r !== "customer") {
      Alert.alert("Không thể chuyển", "Vai trò này không được phép chuyển trực tiếp.");
      return;
    }

    setCurrentRole(r);
    setSidebarOpen(false);

    AsyncStorage.getItem(SESSION_KEY)
      .then((raw) => {
        const prev = raw ? JSON.parse(raw) : {};
        const next = {
          ...prev,
          roles,
          activeRole: r,
          lastSwitchedAt: new Date().toISOString(),
        };
        return AsyncStorage.setItem(SESSION_KEY, JSON.stringify(next));
      })
      .catch(() => {});
  };

  // Điều hướng dùng chung cho Sidebar
  const go = (screen: string) => navigation.navigate(screen as never);

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 96 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.headerWrap}>
          <View style={styles.headerRow}>
            <TouchableOpacity
              onPress={() => setSidebarOpen(true)}
              style={styles.menuButton}
            >
              <Menu size={22} color="#e95322" />
            </TouchableOpacity>

            {/* Search */}
            <View style={{ flex: 1, position: "relative" }}>
              <TextInput
                placeholder="Tìm kiếm"
                placeholderTextColor="#676767"
                style={styles.searchInput}
              />
              <View style={styles.searchIcon}>
                <Search size={16} color="#fff" />
              </View>
            </View>

            {/* Cart */}
            <TouchableOpacity
              onPress={() => navigation.navigate("Cart")}
              style={styles.headerIcon}
            >
              <ShoppingCart size={24} color="#e95322" />
            </TouchableOpacity>

            {/* Bell */}
            <TouchableOpacity style={styles.headerIcon}>
              <Bell size={24} color="#e95322" />
            </TouchableOpacity>

            {/* User */}
            <TouchableOpacity style={styles.headerIcon}>
              <User size={24} color="#e95322" />
            </TouchableOpacity>
          </View>

          {/* Hàng dưới: greeting */}
          <View>
            <Text style={styles.hello}>Xin chào!</Text>
            <Text style={styles.ask}>Hôm nay bạn muốn ăn gì?</Text>
          </View>
        </View>

        {/* Categories */}
        <View style={styles.catWrap}>
          <View style={styles.catRow}>
            {categories.map((c) => {
              const active = selectedCategory === c.name;
              return (
                <TouchableOpacity
                  key={c.id}
                  onPress={() =>
                    setSelectedCategory(active ? null : c.name)
                  }
                  style={styles.catItem}
                >
                  <View
                    style={[
                      styles.catIcon,
                      {
                        backgroundColor: active ? "#e95322" : "#f3e9b5",
                      },
                    ]}
                  >
                    <Text
                      style={{
                        fontSize: 20,
                        fontFamily: Fonts.LeagueSpartanBold,
                      }}
                    >
                      {c.icon}
                    </Text>
                  </View>
                  <Text
                    style={[
                      styles.catLabel,
                      { color: active ? "#e95322" : "#391713" },
                    ]}
                  >
                    {c.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <View style={styles.separator} />
        </View>

        {/* Restaurants */}
        <View
          style={{
            backgroundColor: "#fff",
            paddingHorizontal: 24,
            paddingBottom: 20,
          }}
        >
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Đang mở cửa</Text>

            <TouchableOpacity
              onPress={() => navigation.navigate("Restaurants")}
              style={styles.linkRow}
            >
              <Text style={styles.linkText}>Xem tất cả</Text>
              <ChevronRight size={16} color="#e95322" />
            </TouchableOpacity>
          </View>

          <FlatList
            data={
              selectedCategory
                ? filteredRestaurants
                : allRestaurants.slice(0, 4)
            }
            horizontal
            keyExtractor={(item) => String(item.id)}
            showsHorizontalScrollIndicator={false}
            ItemSeparatorComponent={() => <View style={{ width: 16 }} />}
            renderItem={({ item }) => (
              <RestaurantCard
                item={item}
                requireImage={requireImage}
                onPress={() =>
                  navigation.navigate("RestaurantDetail", { id: item.id })
                }
              />
            )}
          />
        </View>

        {/* Best Seller */}
        <View style={{ backgroundColor: "#fff", paddingHorizontal: 24 }}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Bán chạy</Text>
            <TouchableOpacity
              onPress={() => navigation.navigate("Restaurants")}
              style={styles.linkRow}
            >
              <Text style={styles.linkText}>Xem tất cả</Text>
              <ChevronRight size={16} color="#e95322" />
            </TouchableOpacity>
          </View>

          <FlatList
            data={
              [7, 8, 9, 10]
                .map((id) => allFoods.find((f) => f.id === id))
                .filter(Boolean) as any[]
            }
            horizontal
            keyExtractor={(i) => String(i.id)}
            ItemSeparatorComponent={() => <View style={{ width: 16 }} />}
            showsHorizontalScrollIndicator={false}
            renderItem={({ item }) => (
              <View style={{ width: 128 }}>
                <TouchableOpacity
                  style={{ position: "relative" }}
                  onPress={() =>
                    navigation.navigate("FoodDetail", { id: item.id })
                  }
                >
                  <Image
                    source={requireImage(item.image)}
                    style={{
                      width: "100%",
                      height: 96,
                      borderRadius: 16,
                    }}
                  />
                  <TouchableOpacity
                    onPress={() => toggleFavorite(item.id)}
                    style={styles.heartBtn}
                  >
                    <Heart
                      size={12}
                      color={
                        favorites.some((f) => f.id === item.id)
                          ? "#e95322"
                          : "#9ca3af"
                      }
                      fill={
                        favorites.some((f) => f.id === item.id)
                          ? "#e95322"
                          : "transparent"
                      }
                    />
                  </TouchableOpacity>
                  <View style={styles.pricePill}>
                    <Text style={styles.pricePillText}>{item.price}</Text>
                  </View>
                </TouchableOpacity>
              </View>
            )}
          />
        </View>

        {/* Discount banners */}
        <View style={{ backgroundColor: "#fff", paddingTop: 20, paddingBottom: 20 }}>
          <View style={{ paddingHorizontal: 24 }}>
            <ScrollView
              ref={scrollRef}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onScroll={onScrollBanner}
              scrollEventThrottle={16}
              contentContainerStyle={{ gap: 16 }}
            >
              {banners.map((b) => (
                <View key={b.id} style={{ width: width - 48 }}>
                  <View style={styles.banner}>
                    <View
                      style={{
                        flex: 1,
                        padding: 16,
                        justifyContent: "center",
                      }}
                    >
                      <Text
                        style={{
                          color: "#fff",
                          fontSize: 14,
                          marginBottom: 6,
                          fontFamily: Fonts.LeagueSpartanRegular,
                        }}
                      >
                        {b.title}
                      </Text>
                      <Text
                        style={{
                          color: "#fff",
                          fontSize: 24,
                          fontFamily: Fonts.LeagueSpartanBold,
                        }}
                      >
                        {b.discount}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Image
                        source={requireImage(b.image)}
                        style={{ width: "100%", height: "100%" }}
                        resizeMode="cover"
                      />
                    </View>
                  </View>
                </View>
              ))}
            </ScrollView>

            <View style={styles.dots}>
              {banners.map((b, i) => (
                <View
                  key={b.id}
                  style={[
                    styles.dotBar,
                    { opacity: i === activeDiscountIndex ? 1 : 0.3 },
                  ]}
                />
              ))}
            </View>
          </View>
        </View>

        {/* Recommend */}
        <View
          style={{
            backgroundColor: "#fff",
            paddingHorizontal: 24,
            marginBottom: 16,
          }}
        >
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              {selectedCategory ? selectedCategory : "Đề xuất"}
            </Text>
            {selectedCategory && (
              <Text
                style={{
                  color: "#e95322",
                  fontSize: 13,
                  fontFamily: Fonts.LeagueSpartanSemiBold,
                }}
              >
                {filteredFoods.length} món ăn
              </Text>
            )}
          </View>

          <View style={styles.grid}>
            {filteredFoods.map((item) => (
              <FoodTile
                key={item.id}
                item={item}
                requireImage={requireImage}
                isFav={!!favorites.find((x) => x.id === item.id)}
                onToggleFav={() => toggleFavorite(item.id)}
                onOpen={() => {
                  setSelectedFood(item);
                  setPopupOpen(true);
                }}
                onPress={() =>
                  navigation.navigate("FoodDetail", { id: item.id })
                }
              />
            ))}
          </View>
        </View>
      </ScrollView>

      {/* Popup tùy chỉnh món */}
      <FoodCustomizationPopup
        isOpen={popupOpen}
        onClose={() => setPopupOpen(false)}
        foodItem={selectedFood || {}}
      />
      {/* Sidebar */}
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#fff" },

  headerWrap: {
    backgroundColor: "#f5cb58",
    paddingHorizontal: 24,
    paddingBottom: 40,
    paddingTop: 40,
  },

  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 16,
  },

  menuButton: {
    backgroundColor: "#fff",
    borderRadius: 999,
    padding: 8,
  },

  searchInput: {
    width: "100%",
    backgroundColor: "#fff",
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 10,
    color: "#676767",
    fontFamily: Fonts.LeagueSpartanRegular,
    fontSize: 14,
  },
  searchIcon: {
    position: "absolute",
    right: 4,
    top: 4,
    bottom: 4,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#e95322",
    borderRadius: 999,
    paddingHorizontal: 10,
  },

  headerIcon: {
    backgroundColor: "#fff",
    borderRadius: 999,
    padding: 8,
  },

  hello: {
    color: "#fff",
    marginBottom: 4,
    fontSize: 32,
    fontFamily: Fonts.LeagueSpartanBlack,
  },
  ask: {
    color: "#e95322",
    fontSize: 16,
    fontFamily: Fonts.LeagueSpartanSemiBold,
  },

  catWrap: {
    backgroundColor: "#fff",
    paddingHorizontal: 32,
    paddingVertical: 20,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    marginTop: -24,
  },
  catRow: { flexDirection: "row", justifyContent: "space-between" },
  catItem: { alignItems: "center" },
  catIcon: {
    width: 48,
    height: 64,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  catLabel: { fontSize: 12, fontFamily: Fonts.LeagueSpartanSemiBold },
  separator: {
    width: "100%",
    height: 1,
    backgroundColor: "#f3e9b5",
    marginTop: 20,
  },

  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionTitle: { color: "#391713", fontSize: 18, fontFamily: Fonts.LeagueSpartanBold },
  linkRow: { flexDirection: "row", alignItems: "center" },
  linkText: { color: "#e95322", fontFamily: Fonts.LeagueSpartanSemiBold },

  banner: {
    backgroundColor: "#e95322",
    borderRadius: 24,
    overflow: "hidden",
    flexDirection: "row",
    height: 128,
  },
  dots: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 12,
    gap: 8,
  },
  dotBar: {
    width: 24,
    height: 4,
    borderRadius: 4,
    backgroundColor: "#e95322",
  },

  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },

  heartBtn: {
    position: "absolute",
    right: 8,
    top: 8,
    backgroundColor: "#fff",
    borderRadius: 999,
    padding: 6,
    elevation: 1,
  },
  pricePill: {
    position: "absolute",
    left: 8,
    bottom: 8,
    backgroundColor: "#e95322",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  pricePillText: {
    color: "#fff",
    fontSize: 12,
    fontFamily: Fonts.LeagueSpartanBold,
  },
});
