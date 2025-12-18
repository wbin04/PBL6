import React from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
} from "react-native";
import { SlidersHorizontal } from "lucide-react-native";
import { Fonts } from "@/constants/Fonts";

interface SearchFiltersProps {
  visible: boolean;
  selectedCategories: string[];
  priceRange: string;
  sortBy: string;
  onToggleCategory: (category: string) => void;
  onChangePrice: (value: string) => void;
  onChangeSort: (value: string) => void;
  onClearAll: () => void;
  activeFiltersCount: number;
}

// Đồng bộ với category thực tế trong database
const CATEGORIES = [
  "Gà giòn",
  "Burger",
  "Mỳ ý",
  "Khoai tây chiên",
  "Món phụ",
  "Tráng miệng",
  "Nước giải khát",
  "Món thêm",
];

export default function SearchFilters({
  visible,
  selectedCategories,
  priceRange,
  sortBy,
  onToggleCategory,
  onChangePrice,
  onChangeSort,
  onClearAll,
  activeFiltersCount,
}: SearchFiltersProps) {
  if (!visible) return null;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <SlidersHorizontal size={16} color="#391713" />
          <Text style={styles.title}>Bộ lọc</Text>
        </View>

        {activeFiltersCount > 0 && (
          <Pressable onPress={onClearAll}>
            <Text style={styles.clearText}>Xóa tất cả</Text>
          </Pressable>
        )}
      </View>

      {/* Category */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Danh mục</Text>
        <View style={styles.wrap}>
          {CATEGORIES.map((category) => {
            const active = selectedCategories.includes(category);
            return (
              <Pressable
                key={category}
                onPress={() => onToggleCategory(category)}
                style={[
                  styles.chip,
                  active && styles.chipActive,
                ]}
              >
                <Text
                  style={[
                    styles.chipText,
                    active && styles.chipTextActive,
                  ]}
                >
                  {category}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* Price */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Giá</Text>
        <View style={styles.row}>
          {[
            { label: "Tất cả", value: "all" },
            { label: "< 50K", value: "low" },
            { label: "50K - 100K", value: "medium" },
            { label: "> 100K", value: "high" },
          ].map((item) => {
            const active = priceRange === item.value;
            return (
              <Pressable
                key={item.value}
                onPress={() => onChangePrice(item.value)}
                style={[
                  styles.option,
                  active && styles.optionActive,
                ]}
              >
                <Text
                  style={[
                    styles.optionText,
                    active && styles.optionTextActive,
                  ]}
                >
                  {item.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* Sort */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Sắp xếp</Text>
        <View style={styles.row}>
          {[
            { label: "Liên quan", value: "relevance" },
            { label: "Giá thấp", value: "price-low" },
            { label: "Giá cao", value: "price-high" },
            { label: "Đánh giá", value: "rating" },
          ].map((item) => {
            const active = sortBy === item.value;
            return (
              <Pressable
                key={item.value}
                onPress={() => onChangeSort(item.value)}
                style={[
                  styles.option,
                  active && styles.optionActive,
                ]}
              >
                <Text
                  style={[
                    styles.optionText,
                    active && styles.optionTextActive,
                  ]}
                >
                  {item.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#f3e9b5",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderColor: "#e5d9a6",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  title: {
    fontSize: 14,
    fontWeight: "700",
    color: "#391713",
    fontFamily: Fonts.LeagueSpartanBold,
  },
  clearText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#e95322",
    fontFamily: Fonts.LeagueSpartanMedium,
  },
  section: {
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "600",
    color: "#391713",
    marginBottom: 6,
    fontFamily: Fonts.LeagueSpartanMedium,
  },
  wrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  row: {
    flexDirection: "row",
    gap: 8,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#ddd",
  },
  chipActive: {
    backgroundColor: "#e95322",
    borderColor: "#e95322",
  },
  chipText: {
    fontSize: 12,
    color: "#391713",
    fontWeight: "600",
    fontFamily: Fonts.LeagueSpartanMedium,
  },
  chipTextActive: {
    color: "#fff",
    fontFamily: Fonts.LeagueSpartanBold,
  },
  option: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#ddd",
    alignItems: "center",
  },
  optionActive: {
    backgroundColor: "#e95322",
    borderColor: "#e95322",
  },
  optionText: {
    fontSize: 12,
    color: "#391713",
    fontWeight: "600",
    fontFamily: Fonts.LeagueSpartanMedium,
  },
  optionTextActive: {
    color: "#fff",
    fontFamily: Fonts.LeagueSpartanBold,
  },
});
