import React, { useEffect, useMemo, useState } from "react";
import SearchFilters from "@/components/SearchFilters";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  FlatList,
  ActivityIndicator,
} from "react-native";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { ArrowLeft, SlidersHorizontal } from "lucide-react-native";
import { FoodCard } from "@/components/FoodCard";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Fonts } from "@/constants/Fonts";
import { API_CONFIG } from "@/constants";
import { menuService } from "@/services";
import { Food, RootStackParamList } from "@/types";

interface FoodResult {
  id: number;
  title: string;
  price: number | string;
  image?: string | null;
  category_id?: number | null;
  category_name?: string | null;
  average_rating?: number;
  rating_count?: number;
  availability?: string | boolean;
}

interface StoreResult {
  store_id: number;
  store_name: string;
  store_image?: string | null;
  foods: FoodResult[];
}



type SearchRoute = RouteProp<RootStackParamList, "SearchResults">;

export default function SearchResultsScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<SearchRoute>();

  const initialKeyword = route.params?.keyword || "";

  const [searchQuery, setSearchQuery] = useState(initialKeyword);
  const [submittedQuery, setSubmittedQuery] = useState(initialKeyword);
  const [rawFoods, setRawFoods] = useState<Food[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showFilter, setShowFilter] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [priceRange, setPriceRange] = useState("all");
  const [sortBy, setSortBy] = useState("relevance");

  useEffect(() => {
    setSearchQuery(initialKeyword);
    if (initialKeyword) {
      fetchResults(initialKeyword);
      setSubmittedQuery(initialKeyword);
    }
  }, [initialKeyword]);

  const resolveImageUrl = (img?: string | null) => {
    if (!img) return undefined;
    if (img.startsWith("http")) return img;

    const base = API_CONFIG.BASE_URL.replace("/api", "");
    let path = img.replace(/\\/g, "/");
    if (path.startsWith("/")) path = path.slice(1);
    if (!path.startsWith("media/")) path = `media/${path}`;

    try {
      // Encode only once to avoid %25 double-encoding
      const decoded = decodeURI(path);
      return `${base}/${encodeURI(decoded)}`;
    } catch {
      return `${base}/${path}`;
    }
  };

  const normalizeFood = (food: FoodResult, store: StoreResult): Food => {
    const priceStr = typeof food.price === "number" ? food.price.toString() : (food.price || "0");
    const imageUrl = resolveImageUrl(food.image);
    const storeImageUrl = resolveImageUrl(store.store_image);

    return {
      id: food.id,
      title: food.title,
      description: "",
      price: priceStr,
      image: food.image || "",
      image_url: imageUrl,
      category_name: food.category_name || undefined,
      availability: food.availability ?? "true",
      average_rating: food.average_rating ?? 0,
      rating_count: food.rating_count ?? 0,
      store: {
        id: store.store_id,
        store_name: store.store_name,
        image: store.store_image || "",
        image_url: storeImageUrl,
      },
    };
  };

  const fetchResults = async (queryValue: string) => {
    const trimmed = queryValue.trim();
    if (!trimmed) {
      setRawFoods([]);
      setError("Vui lòng nhập từ khóa tìm kiếm");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const data = await menuService.searchFoodsGrouped(trimmed);
      const mapped = (data.results || []).flatMap((store) =>
        (store.foods || []).map((food) => normalizeFood(food, store))
      );
      setRawFoods(mapped);
      setSubmittedQuery(trimmed);
      if (mapped.length === 0) {
        setError("Không tìm thấy kết quả phù hợp.");
      }
    } catch (err: any) {
      setError(err?.message || "Không thể tìm kiếm. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  };

  const filteredFoods = useMemo(() => {
    let foods = [...rawFoods];

    if (selectedCategories.length > 0) {
      foods = foods.filter((f) => {
        const cateName = f.category_name || f.category?.cate_name || "";
        return selectedCategories.includes(cateName);
      });
    }

    if (priceRange !== "all") {
      foods = foods.filter((f) => {
        const price = parseInt(f.price, 10);
        if (Number.isNaN(price)) return false;
        if (priceRange === "low") return price < 50000;
        if (priceRange === "medium") return price >= 50000 && price <= 100000;
        if (priceRange === "high") return price > 100000;
        return true;
      });
    }

    if (sortBy === "price-low") foods = [...foods].sort((a, b) => parseInt(a.price, 10) - parseInt(b.price, 10));
    if (sortBy === "price-high") foods = [...foods].sort((a, b) => parseInt(b.price, 10) - parseInt(a.price, 10));
    if (sortBy === "rating") foods = [...foods].sort((a, b) => (b.average_rating || 0) - (a.average_rating || 0));

    return foods;
  }, [rawFoods, selectedCategories, priceRange, sortBy]);

  const resultCount = filteredFoods.length;

  // Xử lý toggle category
  const handleToggleCategory = (category: string) => {
    setSelectedCategories((prev) =>
      prev.includes(category)
        ? prev.filter((c) => c !== category)
        : [...prev, category]
    );
  };

  // Xử lý clear all
  const handleClearAll = () => {
    setSelectedCategories([]);
    setPriceRange("all");
    setSortBy("relevance");
  };

  // Đếm số filter đang bật
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (selectedCategories.length > 0) count++;
    if (priceRange !== "all") count++;
    if (sortBy !== "relevance") count++;
    return count;
  }, [selectedCategories, priceRange, sortBy]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerWrap}>
        <View style={styles.headerTopRow}>
          <Pressable onPress={() => navigation.goBack()} style={styles.roundIconBtn}>
            <ArrowLeft size={22} color="#e95322" />
          </Pressable>
          <Text style={styles.headerTitle}>Tìm kiếm</Text>
          <Pressable
            style={styles.roundIconBtn}
            onPress={() => setShowFilter((v) => !v)}
            hitSlop={8}
          >
            <SlidersHorizontal size={22} color={showFilter ? "#e95322" : "#e95322"} />
            {activeFiltersCount > 0 && (
              <View style={styles.filterBadgeHeader}>
                <Text style={styles.filterBadgeText}>{activeFiltersCount}</Text>
              </View>
            )}
          </Pressable>
        </View>
        <View style={styles.searchRow}>
          <View style={styles.searchBoxWithFilter}>
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Tìm kiếm món ăn, nhà hàng..."
              placeholderTextColor="#9ca3af"
              style={styles.searchInput}
              returnKeyType="search"
              onSubmitEditing={() => fetchResults(searchQuery)}
            />
            {searchQuery.length > 0 && (
              <Pressable onPress={() => setSearchQuery('')} style={styles.clearBtn}>
                <Ionicons name="close-circle" size={16} color="#9ca3af" />
              </Pressable>
            )}
            <Pressable style={styles.searchBtn} onPress={() => fetchResults(searchQuery)}>
              <Ionicons name="search" size={16} color="#fff" />
            </Pressable>
          </View>
        </View>
      </View>

      {/* ===== RESULT BAR (giống shipper) ===== */}
      <View style={styles.foundWrap}>
        <Text style={styles.foundText}>
          {loading
            ? "Đang tìm kiếm..."
            : error
              ? error
              : (
                <>
                  Tìm thấy <Text style={styles.foundNum}>{resultCount}</Text> kết quả
                  {submittedQuery ? ` cho "${submittedQuery}"` : ''}
                </>
              )}
        </Text>
      </View>

      {/* ===== TABS ===== */}



      <SearchFilters
        visible={showFilter}
        selectedCategories={selectedCategories}
        priceRange={priceRange}
        sortBy={sortBy}
        onToggleCategory={handleToggleCategory}
        onChangePrice={setPriceRange}
        onChangeSort={setSortBy}
        onClearAll={handleClearAll}
        activeFiltersCount={activeFiltersCount}
      />

      {/* ===== RESULT LIST ===== */}
      <FlatList
        data={filteredFoods}
        keyExtractor={(item) => item.id.toString()}
        numColumns={2}
        contentContainerStyle={styles.listContent}
        columnWrapperStyle={{ justifyContent: "space-between" }}
        ListHeaderComponent={
          loading ? (
            <View style={styles.loadingWrap}>
              <ActivityIndicator color="#e95322" />
              <Text style={styles.loadingText}>Đang tải kết quả...</Text>
            </View>
          ) : null
        }
        renderItem={({ item }) => (
          <FoodCard
            food={item}
            onPress={() =>
              navigation.navigate("FoodDetail", { foodId: item.id })
            }
          />
        )}
        ListEmptyComponent={
          !loading ? (
            <Text style={styles.emptyText}>
              {error || "Không tìm thấy kết quả phù hợp."}
            </Text>
          ) : null
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },

  headerWrap: {
    backgroundColor: '#f5cb58',
    paddingTop: 0,
    paddingBottom: 12,
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 20,
    marginBottom: 20,
    paddingHorizontal: 16,
  },
  roundIconBtn: {
    backgroundColor: '#FFFFFF',
    padding: 10,
    borderRadius: 999,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
    elevation: 1,
  },
  headerTitle: {
    fontSize: 20,
    color: '#ffffff',
    fontFamily: Fonts.LeagueSpartanBold,
  },
  searchRow: {
    paddingBottom: 8,
    paddingHorizontal: 16,
  },
  searchBoxWithFilter: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingLeft: 8,
    paddingRight: 4,
  },
  filterBadgeHeader: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: '#e95322',
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
    zIndex: 2,
  },
  filterBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontFamily: Fonts.LeagueSpartanBold,
  },
  searchInput: {
    flex: 1,
    height: 42,
    fontSize: 14,
    color: '#111827',
    fontFamily: Fonts.LeagueSpartanRegular, 
  },
  clearBtn: {
    paddingHorizontal: 4,
  },
  searchBtn: {
    height: 42,
    width: 42,
    borderRadius: 999,
    backgroundColor: '#EB552D',
    alignItems: 'center',
    justifyContent: 'center',
    margin: 4,
  },

  foundWrap: {
    marginTop: 8,
    backgroundColor: '#F6F7F8',
    paddingVertical: 14,
    paddingHorizontal: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  foundText: {
    color: '#6B7280',
    marginLeft: 6,
    fontSize: 15,
    fontFamily: Fonts.LeagueSpartanMedium, 
  },
  foundNum: {
    color: '#111827',
    fontFamily: Fonts.LeagueSpartanBold, 
  },

  /* Tabs */
  tabs: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderColor: "#eee",
  },

  tabItem: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 12,
  },

  tabItemActive: {
    borderBottomWidth: 2,
    borderColor: "#e95322",
  },

  tabText: {
    color: "#999",
    fontWeight: "600",
    fontFamily: Fonts.LeagueSpartanMedium, // Font medium cho tab
  },

  tabTextActive: {
    color: "#e95322",
    fontFamily: Fonts.LeagueSpartanBold, // Font đậm cho tab active
  },

  /* Filter */
  filterBox: {
    backgroundColor: "#fff6d8",
    borderBottomWidth: 1,
    borderColor: "#f1e2a0",
  },

  filterTitle: {
    fontWeight: "700",
    color: "#391713",
    marginBottom: 4,
    fontFamily: Fonts.LeagueSpartanBold, // Font đậm cho tiêu đề filter
  },

  filterHint: {
    fontSize: 12,
    color: "#666",
    fontFamily: Fonts.LeagueSpartanRegular, // Font thường cho hint
  },

  /* List */
  listContent: {
    padding: 16,
  },

  loadingWrap: {
    alignItems: 'center',
    paddingVertical: 16,
  },

  loadingText: {
    marginTop: 6,
    color: '#6B7280',
    fontFamily: Fonts.LeagueSpartanRegular,
  },

  emptyText: {
    textAlign: "center",
    marginTop: 32,
    color: "#888",
    fontFamily: Fonts.LeagueSpartanRegular, 
  },
});
