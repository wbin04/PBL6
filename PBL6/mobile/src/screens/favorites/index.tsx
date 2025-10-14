import AsyncStorage from "@react-native-async-storage/async-storage";
import { ArrowLeft, Heart } from "lucide-react-native";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useNavigation } from "@react-navigation/native";

import BottomBar from "@/components/BottomBar";
import FoodCustomizationPopup from "@/components/FoodCustomizationPopup";
import { FoodTile } from "@/components/FoodTile";
import { Fonts } from "@/constants/Fonts";
import { useDatabase } from "@/hooks/useDatabase";

type Nav = any;

export default function FavoritesScreen() {
  const navigation = useNavigation<Nav>();
  const { requireImage } = useDatabase();

  const [favorites, setFavorites] = useState<any[]>([]);
  const [popupOpen, setPopupOpen] = useState(false);
  const [selectedFood, setSelectedFood] = useState<any>(null);

  const loadFav = useCallback(async () => {
    const raw = await AsyncStorage.getItem("favorites");
    setFavorites(raw ? JSON.parse(raw) : []);
  }, []);

  useEffect(() => { loadFav(); }, [loadFav]);

  const hasFav = useMemo(() => new Set(favorites.map((f) => f.id)), [favorites]);

  const removeFavorite = async (id: number) => {
    const next = favorites.filter((f) => f.id !== id);
    setFavorites(next);
    await AsyncStorage.setItem("favorites", JSON.stringify(next));
  };

  return (
    <View style={styles.screen}>
      <View style={styles.headerWrap}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ArrowLeft size={24} color="#391713" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Ưa thích</Text>
      </View>

      <View style={styles.body}>
        <Text style={styles.lead}>It&apos;s time to buy your favorite dish.</Text>

        {favorites.length === 0 ? (
          <View style={styles.empty}>
            <Heart size={64} color="#d1d5db" />
            <Text style={styles.emptyTitle}>No favorites yet</Text>
            <Text style={styles.emptySub}>Start adding items to your favorites!</Text>
          </View>
        ) : (
          <ScrollView contentContainerStyle={styles.gridWrap} showsVerticalScrollIndicator={false}>
            <View style={styles.grid}>
              {favorites.map((item) => (
                <FoodTile
                  key={item.id}
                  item={item}
                  requireImage={requireImage}
                  isFav={hasFav.has(item.id)}
                  onToggleFav={() => removeFavorite(item.id)}
                  onOpen={() => { setSelectedFood(item); setPopupOpen(true); }}
                  onPress={() => navigation.navigate("FoodDetail", { foodId: item.id })}
                />
              ))}
            </View>
          </ScrollView>
        )}
      </View>

      <FoodCustomizationPopup isOpen={popupOpen} onClose={() => setPopupOpen(false)} foodItem={selectedFood || {}} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#f5cb58" },

  headerWrap: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 40,
    paddingBottom: 12,
  },
  backBtn: { marginRight: 8, padding: 6, borderRadius: 999 },
  headerTitle: { color: "#fff", fontSize: 22, fontFamily: Fonts.LeagueSpartanBold },

  body: {
    flex: 1,
    backgroundColor: "#fff",
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    padding: 16,
  },
  lead: { color: "#e95322", fontSize: 16, fontFamily: Fonts.LeagueSpartanSemiBold, marginBottom: 12 },

  empty: { alignItems: "center", justifyContent: "center", paddingVertical: 64 },
  emptyTitle: { marginTop: 12, color: "#6b7280", fontSize: 16 },
  emptySub: { color: "#9ca3af", fontSize: 12 },

  gridWrap: { paddingBottom: 96 },
  grid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" },
});

