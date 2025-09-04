import AsyncStorage from "@react-native-async-storage/async-storage";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ArrowLeft, Heart, Plus, Star } from "lucide-react-native";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { FlatList, Image, Pressable, StyleSheet, Text, View } from "react-native";

import FoodCustomizationPopup from "@/components/FoodCustomizationPopup";
import { Button } from "@/components/Button1";
import { Card } from "@/components/card";
import { Sheet, SheetContent } from "@/components/sheet";
import { useToast } from "@/components/use-toast";

import db from "@/assets/database.json";
import { IMAGE_MAP } from "@/assets/imageMap";

type FoodRow = {
  id: number;
  name: string;
  restaurant: string;
  rating: number;
  price: string;
  image: string;
  category: string;
};

const FAV_KEY = "favorites_v1";
const PLACEHOLDER = IMAGE_MAP["fresh-salad-bowl.png"]; 

export default function CategoryScreen() {
  const { name } = useLocalSearchParams<{ name: string }>();
  const categoryName = decodeURIComponent(String(name ?? ""));
  const router = useRouter();
  const { toast } = useToast();

  const items: FoodRow[] = useMemo(() => {
    const foods: FoodRow[] = (db?.foods as FoodRow[]) ?? [];
    return foods.filter((f) => f.category === categoryName);
  }, [categoryName]);

  const [favorites, setFavorites] = useState<number[]>([]);
  const [openSheet, setOpenSheet] = useState(false);
  const [selected, setSelected] = useState<FoodRow | null>(null);

  useEffect(() => {
    (async () => {
      const raw = await AsyncStorage.getItem(FAV_KEY);
      setFavorites(raw ? JSON.parse(raw) : []);
    })();
  }, []);

  const isFav = useCallback((id: number) => favorites.includes(id), [favorites]);

  const toggleFav = useCallback(async (id: number) => {
    setFavorites((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
      AsyncStorage.setItem(FAV_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const openCustomize = (item: FoodRow) => {
    setSelected(item);
    setOpenSheet(true);
  };

  const renderItem = ({ item }: { item: FoodRow }) => (
    <Card className="flex-1 rounded-2xl overflow-hidden border border-gray-200">
      <Pressable
        onPress={() =>
          router.push({ pathname: "/foods/[id]", params: { id: String(item.id) } })
        }
      >
        <View style={{ position: "relative" }}>
          <Image source={IMAGE_MAP[item.image] ?? PLACEHOLDER} style={styles.image} />

          <Pressable onPress={() => toggleFav(item.id)} style={styles.heartBtn} hitSlop={8}>
            <Heart
              size={14}
              color={isFav(item.id) ? "#e95322" : "#9CA3AF"}
              fill={isFav(item.id) ? "#e95322" : "transparent"}
            />
          </Pressable>

          <View style={styles.ratingBadge}>
            <Text style={styles.ratingText}>{item.rating.toFixed(1)}</Text>
            <Star size={12} color="#FACC15" fill="#FACC15" />
          </View>
        </View>
      </Pressable>

      <View style={{ padding: 12, gap: 6 }}>
        <Text numberOfLines={1} style={styles.title}>
          {item.name}
        </Text>
        <Text numberOfLines={1} style={styles.subtitle}>
          {item.restaurant}
        </Text>

        <View style={styles.rowBetween}>
          <Text style={styles.price}>{item.price}</Text>
          <Button size="sm" className="h-8 px-2 rounded-lg" onPress={() => openCustomize(item)}>
            <Plus size={16} color="#fff" />
          </Button>
        </View>
      </View>
    </Card>
  );

  return (
    <View style={styles.screen}>
      <View style={styles.headerWrap}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <ArrowLeft size={20} color="#fff" />
        </Pressable>
        <Text style={styles.headerTitle}>{categoryName || "Danh mục"}</Text>
        <View style={{ width: 36 }} />
      </View>

      <FlatList
        contentContainerStyle={{ padding: 24, paddingBottom: 120, gap: 12 }}
        data={items}
        renderItem={renderItem}
        keyExtractor={(i) => String(i.id)}
        numColumns={2}
        columnWrapperStyle={{ gap: 12 }}
      />

      <Sheet open={openSheet} onOpenChange={setOpenSheet}>
        <SheetContent side="bottom" className="pb-6">
          {selected && (
            <FoodCustomizationPopup
              isOpen={openSheet}
              onClose={() => {
                setOpenSheet(false);
                toast({
                  open: true,
                  onOpenChange: () => {},
                  title: "Đã thêm vào giỏ",
                  description: selected.name,
                });
              }}
              foodItem={{ ...selected, rating: String(selected.rating) }}
            />
          )}
        </SheetContent>
      </Sheet>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#fff" },

  headerWrap: {
    backgroundColor: "#f5cb58",
    paddingHorizontal: 24,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.2)",
  },
  headerTitle: { color: "#fff", fontSize: 20, fontWeight: "800", flex: 1 },

  image: { width: "100%", height: 96, backgroundColor: "#E5E7EB" },
  heartBtn: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: "#fff",
    borderRadius: 999,
    padding: 6,
    elevation: 1,
  },
  ratingBadge: {
    position: "absolute",
    top: 8,
    left: 8,
    backgroundColor: "rgba(0,0,0,0.7)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  ratingText: { color: "#fff", fontSize: 12, marginRight: 2 },

  title: { color: "#391713", fontWeight: "700", fontSize: 14 },
  subtitle: { color: "#6B7280", fontSize: 12 },
  price: { color: "#391713", fontWeight: "800", fontSize: 16 },
  rowBetween: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
});

