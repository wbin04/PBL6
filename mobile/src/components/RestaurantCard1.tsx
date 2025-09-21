import React, { useMemo, useRef } from "react";
import { View, Text, Image, Pressable, StyleSheet, Animated, Platform } from "react-native";
import { Heart, Star, Clock, MapPin, Truck } from "lucide-react-native";
import { Card } from "@/components/card";
import { Badge } from "@/components/badge";
import { Fonts } from "@/constants/Fonts";

export type Restaurant = {
  id: number;
  slug: string;
  name: string;
  categories: string[] | string;
  rating: number;
  reviewCount: number;
  priceRange: string;
  delivery: string;
  time: string;
  image: string;
  category: string;
  address: string;
  phone: string;
  openingHours: string;
  description: string;
  coords: { lat: number; lng: number };
  menuIds: number[];
  reviews: { user: string; rating: number; comment: string }[];
  badge?: "Nổi bật" | "Đã đóng cửa";
  isOpen?: boolean;
  distance?: string;
};

type Props = {
  item: Restaurant;
  isFavorite: boolean;
  onToggleFavorite: () => void;
  onPress: () => void;
  images: Record<string, any>;
};

const RADIUS = 18;

export default function RestaurantCard1({
  item,
  isFavorite,
  onToggleFavorite,
  onPress,
  images,
}: Props) {
  const catsText = useMemo(() => {
    if (Array.isArray(item.categories)) return item.categories.join(" • ");
    if (typeof item.categories === "string") return item.categories;
    return "—";
  }, [item.categories]);

  const closed = item.badge === "Đã đóng cửa" || item.isOpen === false;

  const press = useRef(new Animated.Value(0)).current;
  const scale = press.interpolate({ inputRange: [0, 1], outputRange: [1, 0.98] });
  const elev = press.interpolate({ inputRange: [0, 1], outputRange: [3, 1] });
  const shadowOpacity = press.interpolate({ inputRange: [0, 1], outputRange: [0.12, 0.06] });
  const onPressIn = () => Animated.timing(press, { toValue: 1, duration: 90, useNativeDriver: true }).start();
  const onPressOut = () => Animated.timing(press, { toValue: 0, duration: 120, useNativeDriver: true }).start();

  return (
    // <Animated.View
    //   style={[
    //     styles.animatedWrap,
    //     { transform: [{ scale }] },
    //     Platform.OS === "android" ? ({ elevation: elev as any } as any) : {},
    //     Platform.OS === "ios" ? ({ shadowOpacity: shadowOpacity as any } as any) : {},
    //   ]}
    // >
      <Card style={styles.card} className="overflow-hidden">
        <Pressable onPress={onPress} onPressIn={onPressIn} onPressOut={onPressOut}>
          <View style={styles.coverWrap}>
            <Image source={images[item.image]} style={styles.cover} />
            {item.badge === "Nổi bật" && !closed && (
              <View style={styles.featuredPill}>
                <Text style={styles.featuredText}>Nổi bật</Text>
              </View>
            )}
            <Pressable onPress={onToggleFavorite} style={styles.heartBtn}>
              <Heart size={18} color={isFavorite ? "#e11d48" : "#6b7280"} fill={isFavorite ? "#e11d48" : "transparent"} />
            </Pressable>
            {closed && (
              <View style={styles.closedOverlay}>
                <Text style={styles.closedOverlayText}>Đã đóng cửa</Text>
              </View>
            )}
          </View>

          <View style={styles.body}>
            <View style={styles.titleRow}>
              <Text numberOfLines={1} style={styles.title}>{item.name}</Text>
              <View style={styles.ratingWrap}>
                <Star size={18} color="#F59E0B" fill="#F59E0B" />
                <Text style={styles.ratingText}>{item.rating?.toFixed ? item.rating.toFixed(1) : String(item.rating)}</Text>
              </View>
            </View>

            <Text numberOfLines={1} style={styles.categories}>{catsText}</Text>

            <View style={styles.metaRow}>
              <View style={styles.metaItem}>
                <View style={styles.shipIcon}>
                  <Truck size={12} color="#fff" />
                </View>
                <Text style={styles.metaText}>{item.delivery}</Text>
              </View>

              <View style={styles.metaItem}>
                <Clock size={16} color="#6B7280" />
                <Text style={styles.metaText}>{item.time}</Text>
              </View>

              {item.distance ? (
                <View style={styles.metaItem}>
                  <MapPin size={16} color="#6B7280" />
                  <Text style={styles.metaText}>{item.distance}</Text>
                </View>
              ) : null}

              <View style={{ marginLeft: "auto" }}>
                {closed ? (
                  <Badge variant="secondary" style={styles.closedChip}>
                    <Text style={styles.closedChipText}>Đóng cửa</Text>
                  </Badge>
                ) : (
                  item.isOpen && (
                    <Badge style={styles.openChip}>
                      <Text style={styles.openChipText}>Mở cửa</Text>
                    </Badge>
                  )
                )}
              </View>
            </View>
          </View>
        </Pressable>
      </Card>
    // </Animated.View>
  );
}

const styles = StyleSheet.create({
  animatedWrap: {
    borderRadius: RADIUS,
  },
  card: {
    borderRadius: RADIUS,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#EEF0F2",
    shadowColor: "#000",
    shadowOffset: { width: 1, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 3,
    overflow: "hidden",
    marginVertical: 10,
  },
  coverWrap: {
    overflow: "hidden",
    borderTopLeftRadius: RADIUS,
    borderTopRightRadius: RADIUS,
  },
  cover: {
    width: "100%",
    height: 190,
    borderTopLeftRadius: RADIUS,
    borderTopRightRadius: RADIUS,
  },
  featuredPill: {
    position: "absolute",
    left: 12,
    top: 12,
    backgroundColor: "#EB552D",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  featuredText: {
    color: "#fff",
    fontFamily: Fonts.LeagueSpartanBold,
    fontSize: 13,
  },
  heartBtn: {
    position: "absolute",
    right: 12,
    top: 12,
    backgroundColor: "rgba(255,255,255,0.95)",
    padding: 9,
    borderRadius: 999,
  },
  closedOverlay: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.35)",
    alignItems: "center",
    justifyContent: "center",
  },
  closedOverlayText: {
    color: "#fff",
    fontFamily: Fonts.LeagueSpartanExtraBold,
    fontSize: 20,
  },
  body: {
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 18,
    gap: 8,
    backgroundColor: "#fff",
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  title: {
    flex: 1,
    marginRight: 8,
    fontSize: 20,
    color: "#3A1A12",
    fontFamily: Fonts.LeagueSpartanExtraBold,
  },
  ratingWrap: { flexDirection: "row", alignItems: "center", gap: 6 },
  ratingText: {
    fontFamily: Fonts.LeagueSpartanBold,
    fontSize: 16,
    color: "#3A1A12",
  },
  categories: {
    fontFamily: Fonts.LeagueSpartanMedium,
    fontSize: 14.5,
    color: "#6B7280",
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    flexWrap: "wrap",
    marginTop: 4,
  },
  metaItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  metaText: {
    fontFamily: Fonts.LeagueSpartanMedium,
    fontSize: 14.5,
    color: "#6B7280",
  },
  shipIcon: {
    width: 20,
    height: 20,
    borderRadius: 6,
    backgroundColor: "#e95322",
    alignItems: "center",
    justifyContent: "center",
  },
  openChip: {
    backgroundColor: "#DDF6E7",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  openChipText: {
    color: "#15803D",
    fontFamily: Fonts.LeagueSpartanBold,
    fontSize: 14,
  },
  closedChip: {
    backgroundColor: "#FBE7E8",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  closedChipText: {
    color: "#B91C1C",
    fontFamily: Fonts.LeagueSpartanBold,
    fontSize: 14,
  },
});

