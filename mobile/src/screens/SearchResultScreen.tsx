import React, { useMemo, useState } from "react";
import SearchFilters from "@/components/SearchFilters";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  FlatList,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { ArrowLeft, SlidersHorizontal, X } from "lucide-react-native";
import { FoodCard } from "@/components/FoodCard";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons"; 
import { Fonts } from "@/constants/Fonts";



export default function SearchResultsScreen() {
  const navigation = useNavigation<any>();
  const [searchQuery, setSearchQuery] = useState("");
  // Đã loại bỏ tab, chỉ tìm kiếm món ăn
  const [showFilter, setShowFilter] = useState(false);
  // State cho filter
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [priceRange, setPriceRange] = useState("all");
  const [sortBy, setSortBy] = useState("relevance");

  const allFoods = [
    {
      id: 1,
      title: "Gà rán giòn cay",
      price: "45000",
      category: { id: 1, cate_name: "Gà giòn", image: require("@/assets/images/assorted-sushi.png") },
      image: require("@/assets/images/assorted-sushi.png"),
      image_url: "",
      average_rating: 4.8,
      rating_count: 98,
      availability: "true",
      description: "Gà rán giòn cay hấp dẫn, chuẩn vị.",
      store: {
        id: 1,
        store_name: "Chicken Express",
        image: require("@/assets/images/assorted-sushi.png"),
        description: "Nhà hàng gà rán nổi tiếng.",
      },
    },
    {
      id: 2,
      title: "Burger bò phô mai",
      price: "55000",
      category: { id: 2, cate_name: "Burger", image: require("@/assets/images/assorted-sushi.png") },
      image: require("@/assets/images/assorted-sushi.png"),
      image_url: "",
      average_rating: 4.7,
      rating_count: 120,
      availability: "true",
      description: "Burger bò phô mai thơm ngon, béo ngậy.",
      store: {
        id: 2,
        store_name: "Burger House",
        image: require("@/assets/images/assorted-sushi.png"),
        description: "Nhà hàng chuyên burger bò.",
      },
    },
    {
      id: 3,
      title: "Mỳ Ý sốt bò bằm",
      price: "65000",
      category: { id: 3, cate_name: "Mỳ ý", image: require("@/assets/images/assorted-sushi.png") },
      image: require("@/assets/images/assorted-sushi.png"),
      image_url: "",
      average_rating: 4.5,
      rating_count: 80,
      availability: "true",
      description: "Mỳ Ý sốt bò bằm đậm đà, chuẩn vị Ý.",
      store: {
        id: 3,
        store_name: "Pasta Corner",
        image: require("@/assets/images/assorted-sushi.png"),
        description: "Mỳ Ý và pasta các loại.",
      },
    },
    {
      id: 4,
      title: "Khoai tây chiên",
      price: "30000",
      category: { id: 4, cate_name: "Khoai tây chiên", image: require("@/assets/images/assorted-sushi.png") },
      image: require("@/assets/images/assorted-sushi.png"),
      average_rating: 4.3,
      rating_count: 60,
      availability: "true",
      description: "Khoai tây chiên giòn rụm, vàng ươm.",
      store: {
        id: 4,
        store_name: "Snack Bar",
        image: require("@/assets/images/assorted-sushi.png"),
        description: "Đồ ăn vặt và món phụ.",
      },
    },
    {
      id: 5,
      title: "Taco bò phô mai",
      price: "40000",
      category: { id: 5, cate_name: "Món phụ", image: require("@/assets/images/assorted-sushi.png") },
      image: require("@/assets/images/assorted-sushi.png"),
      image_url: "",
      average_rating: 4.2,
      rating_count: 45,
      availability: "true",
      description: "Taco bò phô mai béo ngậy, thơm ngon.",
      store: {
        id: 5,
        store_name: "Taco Town",
        image: require("@/assets/images/assorted-sushi.png"),
        description: "Taco và món phụ đa dạng.",
      },
    },
    {
      id: 6,
      title: "Bánh hot dog",
      price: "35000",
      category: { id: 6, cate_name: "Tráng miệng", image: require("@/assets/images/assorted-sushi.png") },
      image: require("@/assets/images/assorted-sushi.png"),
      image_url: "",
      average_rating: 4.1,
      rating_count: 30,
      availability: "true",
      description: "Bánh hot dog mềm, nhân xúc xích thơm ngon.",
      store: {
        id: 6,
        store_name: "Dessert House",
        image: require("@/assets/images/assorted-sushi.png"),
        description: "Đồ ngọt và tráng miệng.",
      },
    },
    {
      id: 7,
      title: "Sữa lắc dâu",
      price: "25000",
      category: { id: 7, cate_name: "Nước giải khát", image: require("@/assets/images/assorted-sushi.png") },
      image: require("@/assets/images/assorted-sushi.png"),
      image_url: "",
      average_rating: 4.6,
      rating_count: 55,
      availability: "true",
      description: "Sữa lắc dâu tươi mát, ngọt dịu.",
      store: {
        id: 7,
        store_name: "Drink Station",
        image: require("@/assets/images/assorted-sushi.png"),
        description: "Nước giải khát các loại.",
      },
    },
    {
      id: 8,
      title: "Gà viên chiên",
      price: "35000",
      category: { id: 8, cate_name: "Món thêm", image: require("@/assets/images/assorted-sushi.png") },
      image: require("@/assets/images/assorted-sushi.png"),
      image_url: "",
      average_rating: 4.0,
      rating_count: 25,
      availability: "true",
      description: "Gà viên chiên giòn, ăn kèm sốt đặc biệt.",
      store: {
        id: 8,
        store_name: "Snack Bar",
        image: require("@/assets/images/assorted-sushi.png"),
        description: "Đồ ăn vặt và món thêm.",
      },
    },
  ];


  const filteredFoods = useMemo(() => {
    let foods = allFoods;
    // Search
    if (searchQuery.trim()) {
      foods = foods.filter(
        (food) =>
          food.title.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    if (selectedCategories.length > 0) {
      foods = foods.filter((f) => selectedCategories.includes(f.category?.cate_name || ""));
    }
    // Price
    if (priceRange !== "all") {
      foods = foods.filter((f) => {
        const price = parseInt(f.price, 10);
        if (priceRange === "low") return price < 50000;
        if (priceRange === "medium") return price >= 50000 && price <= 100000;
        if (priceRange === "high") return price > 100000;
        return true;
      });
    }
    // Sort
    if (sortBy === "price-low") foods = [...foods].sort((a, b) => parseInt(a.price,10) - parseInt(b.price,10));
    if (sortBy === "price-high") foods = [...foods].sort((a, b) => parseInt(b.price,10) - parseInt(a.price,10));
    if (sortBy === "rating") foods = [...foods].sort((a, b) => b.average_rating - a.average_rating);
    return foods;
  }, [allFoods, searchQuery, selectedCategories, priceRange, sortBy]);

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
            />
            {searchQuery.length > 0 && (
              <Pressable onPress={() => setSearchQuery('')} style={styles.clearBtn}>
                <Ionicons name="close-circle" size={16} color="#9ca3af" />
              </Pressable>
            )}
            <View style={styles.searchBtn}>
              <Ionicons name="search" size={16} color="#fff" />
            </View>
          </View>
        </View>
      </View>

      {/* ===== RESULT BAR (giống shipper) ===== */}
      <View style={styles.foundWrap}>
        <Text style={styles.foundText}>
          Tìm thấy <Text style={styles.foundNum}>{resultCount}</Text> kết quả
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
        renderItem={({ item }) => (
          <FoodCard
            food={item}
            onPress={() =>
              navigation.navigate("FoodDetail", { foodId: item.id })
            }
          />
        )}
        ListEmptyComponent={
          <Text style={styles.emptyText}>
            Không tìm thấy kết quả phù hợp.
          </Text>
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

  emptyText: {
    textAlign: "center",
    marginTop: 32,
    color: "#888",
    fontFamily: Fonts.LeagueSpartanRegular, 
  },
});
