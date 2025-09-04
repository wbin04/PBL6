import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation, useRoute } from "@react-navigation/native";
import {
  ArrowLeft, Clock, Heart, Minus, MoreHorizontal, Plus,
  ShoppingCart, Star, Truck, Zap,
} from "lucide-react-native";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Dimensions, FlatList, Image, ScrollView, StatusBar,
  StyleSheet, Text, TouchableOpacity, View,
} from "react-native";

import { Fonts } from "@/constants/Fonts";
import { useDatabase } from "@/hooks/useDatabase";

const { width } = Dimensions.get("window");
const ORANGE = "#e95322";
const BROWN = "#391713";

// Parse "85.000 VNĐ" -> 85000
const parsePrice = (priceStr?: string) => {
  if (!priceStr) return 0;
  const digits = priceStr.replace(/[^\d]/g, "");
  return Number.parseInt(digits || "0", 10);
};

export default function FoodDetailScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { id } = (route?.params ?? {}) as { id: string | number };

  const {
    getFoodById, getRestaurantById,
    getFoodsByRestaurantId, getFoodsByCategory, requireImage
  } = useDatabase();

  const food = useMemo(() => getFoodById(Number(id)), [id]);
  const restaurant = useMemo(
    () => (food?.restaurantId ? getRestaurantById(food.restaurantId) : null),
    [food?.restaurantId]
  );

  useEffect(() => {
    if (!food) navigation.goBack();
  }, [food]);

  const gallery = useMemo(() => {
    if (!food) return [];
    const arr = [requireImage(food.image)];
    if (restaurant?.image) arr.push(requireImage(restaurant.image));
    return arr;
  }, [food, restaurant]);

  const similarItems = useMemo(() => {
    if (!food) return [];
    const list = food.restaurantId
      ? getFoodsByRestaurantId(food.restaurantId).filter((f) => f.id !== food.id)
      : getFoodsByCategory(food.category).filter((f) => f.id !== food.id);
    return list.slice(0, 10);
  }, [food]);

  const [quantity, setQuantity] = useState(1);
  const [selectedSize, setSelectedSize] = useState<"Nhỏ" | "Vừa" | "Lớn">("Vừa");
  const [selectedToppings, setSelectedToppings] = useState<string[]>([]);
  const [isFavorite, setIsFavorite] = useState(false);
  const [showAdded, setShowAdded] = useState(false);
  const [currentImage, setCurrentImage] = useState(0);

  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    (async () => {
      const saved = await AsyncStorage.getItem("favorites");
      if (saved && food) {
        const arr = JSON.parse(saved) as any[];
        setIsFavorite(arr.some((x) => x.id === food.id));
      }
    })();
  }, [food]);

  const toggleFavorite = async () => {
    if (!food) return;
    const saved = await AsyncStorage.getItem("favorites");
    const arr = saved ? (JSON.parse(saved) as any[]) : [];
    const exists = arr.find((x) => x.id === food.id);
    let next: any[];
    if (exists) {
      next = arr.filter((x) => x.id !== food.id);
      setIsFavorite(false);
    } else {
      next = [...arr, {
        id: food.id, name: food.name, restaurant: food.restaurant,
        rating: food.rating, price: food.price, image: food.image,
      }];
      setIsFavorite(true);
    }
    await AsyncStorage.setItem("favorites", JSON.stringify(next));
  };

  const sizes = [
    { name: "Nhỏ", price: 0 },
    { name: "Vừa", price: 0 },
    { name: "Lớn", price: 10000 },
  ] as const;

  const toppings = [
    { name: "Thêm phô mai", price: 8000 },
    { name: "Thêm trứng", price: 5000 },
    { name: "Thêm gà rán", price: 15000 },
    { name: "Thêm thịt bò", price: 20000 },
  ];

  const toggleTopping = (t: string) => {
    setSelectedToppings((prev) => prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]);
  };

  const basePrice = useMemo(() => parsePrice(food?.price), [food?.price]);

  const totalPrice = useMemo(() => {
    let total = basePrice;
    const sizePlus = sizes.find((s) => s.name === selectedSize)?.price ?? 0;
    total += sizePlus;
    selectedToppings.forEach((t) => {
      total += toppings.find((x) => x.name === t)?.price ?? 0;
    });
    return total * quantity;
  }, [basePrice, selectedSize, selectedToppings, quantity]);

  const handleAddToCart = async () => {
    if (!food) return;
    const cartItem = {
      id: food.id,
      name: food.name,
      restaurant: food.restaurant,
      price: basePrice +
        (sizes.find((s) => s.name === selectedSize)?.price ?? 0) +
        selectedToppings.reduce((s, t) => s + (toppings.find((x) => x.name === t)?.price ?? 0), 0),
      originalPrice: basePrice,
      image: food.image,
      quantity,
      size: selectedSize,
      toppings: selectedToppings,
      totalPrice,
    };
    const saved = await AsyncStorage.getItem("cart");
    const cart = saved ? JSON.parse(saved) : [];
    const idx = cart.findIndex(
      (it: any) =>
        it.id === cartItem.id &&
        it.size === cartItem.size &&
        JSON.stringify([...it.toppings].sort()) === JSON.stringify([...cartItem.toppings].sort())
    );
    if (idx >= 0) {
      cart[idx].quantity += cartItem.quantity;
      cart[idx].totalPrice += cartItem.totalPrice;
    } else {
      cart.push(cartItem);
    }
    await AsyncStorage.setItem("cart", JSON.stringify(cart));
    setShowAdded(true);
    setTimeout(() => setShowAdded(false), 1800);
  };

  if (!food) return null;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      {showAdded && (
        <View style={styles.toast}>
          <Text style={styles.toastText}>Đã thêm vào giỏ hàng</Text>
        </View>
      )}

      <ScrollView
        ref={scrollRef}
        style={styles.content}
        contentContainerStyle={{ paddingBottom: 140 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.heroWrap}>
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onScroll={(e) => {
              const i = Math.round(e.nativeEvent.contentOffset.x / width);
              if (i !== currentImage) setCurrentImage(i);
            }}
            scrollEventThrottle={16}
          >
            {gallery.map((src, idx) => (
              <Image key={idx} source={src} style={styles.heroImg} resizeMode="cover" />
            ))}
          </ScrollView>

          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.navBtnLeft}
            activeOpacity={0.8}
          >
            <ArrowLeft size={20} color="#391713" />
          </TouchableOpacity>

          <View style={styles.navRight}>
            <TouchableOpacity onPress={toggleFavorite} style={styles.circleBtn} activeOpacity={0.8}>
              <Heart
                size={20}
                color={isFavorite ? ORANGE : "#9ca3af"}
                fill={isFavorite ? ORANGE : "transparent"}
              />
            </TouchableOpacity>
            <TouchableOpacity style={styles.circleBtn} activeOpacity={0.8}>
              <MoreHorizontal size={20} color="#391713" />
            </TouchableOpacity>
          </View>

          <View style={styles.dots}>
            {gallery.map((_, i) => (
              <View key={i} style={[styles.dot, { opacity: i === currentImage ? 1 : 0.5 }]} />
            ))}
          </View>
        </View>

        <View style={{ paddingHorizontal: 24, paddingTop: 16 }}>
          <View style={{ marginBottom: 16 }}>
            <Text style={styles.title}>{food.name}</Text>
            {restaurant ? (
              <TouchableOpacity
                onPress={() => navigation.navigate("RestaurantDetailScreen", { id: String(restaurant.id) })}
                activeOpacity={0.8}
              >
                <Text style={styles.restaurant}>{restaurant.name} →</Text>
              </TouchableOpacity>
            ) : (
              <Text style={[styles.restaurant, { color: "#6b7280" }]}>{food.restaurant}</Text>
            )}
          </View>

          {/* rating */}
          <View style={styles.ratingRow}>
            <Star size={16} color={ORANGE} fill={ORANGE} />
            <Text style={styles.ratingText}>{food.rating.toFixed(1)}</Text>
            {restaurant?.reviewCount ? (
              <Text style={styles.ratingSub}>({restaurant.reviewCount}+ đánh giá)</Text>
            ) : null}
          </View>

          {/* price + qty */}
          <View style={styles.priceRow}>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <Text style={styles.price}>{basePrice.toLocaleString()} VNĐ</Text>
            </View>

            <View style={styles.qtyWrap}>
              <TouchableOpacity onPress={() => setQuantity((q) => Math.max(1, q - 1))} style={styles.qtyBtnGray} activeOpacity={0.85}>
                <Minus size={16} color={BROWN} />
              </TouchableOpacity>
              <Text style={styles.qtyText}>{quantity}</Text>
              <TouchableOpacity onPress={() => setQuantity((q) => q + 1)} style={styles.qtyBtnOrange} activeOpacity={0.85}>
                <Plus size={16} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>

          {/* description */}
          {restaurant?.description ? (
            <View style={{ marginBottom: 18 }}>
              <Text style={styles.sectionTitle}>Mô tả</Text>
              <Text style={styles.desc}>{restaurant.description}</Text>
            </View>
          ) : null}

          {/* size */}
          <View style={{ marginBottom: 18 }}>
            <Text style={styles.sectionTitle}>Chọn size</Text>
            <View style={styles.sizeGrid}>
              {sizes.map((s) => {
                const active = selectedSize === s.name;
                return (
                  <TouchableOpacity
                    key={s.name}
                    onPress={() => setSelectedSize(s.name)}
                    style={[styles.sizeItem, active && styles.sizeItemActive]}
                    activeOpacity={0.85}
                  >
                    <Text style={[styles.sizeName, active && { color: BROWN }]}>{s.name}</Text>
                    {s.price > 0 && <Text style={styles.sizePlus}>+{s.price.toLocaleString()} VNĐ</Text>}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* toppings */}
          <View style={{ marginBottom: 18 }}>
            <Text style={styles.sectionTitle}>Thêm topping</Text>
            <View>
              {toppings.map((t) => {
                const active = selectedToppings.includes(t.name);
                return (
                  <TouchableOpacity
                    key={t.name}
                    onPress={() => toggleTopping(t.name)}
                    style={[styles.topItem, active && styles.topItemActive]}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.topName}>{t.name}</Text>
                    <Text style={styles.topPrice}>+{t.price.toLocaleString()} VNĐ</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Delivery */}
          <View style={styles.deliveryBox}>
            <View style={styles.deliveryRow}>
              <Clock size={20} color={ORANGE} />
              <Text style={styles.deliveryMain}>Giao trong {restaurant?.time ?? "20 phút"}</Text>
            </View>
            <View style={styles.deliveryRow}>
              <Truck size={20} color={ORANGE} />
              <Text style={styles.deliverySub}>
                {restaurant?.delivery ?? "Miễn phí vận chuyển cho đơn từ 100.000 VNĐ"}
              </Text>
            </View>
          </View>

          {!!restaurant?.reviews?.length && (
            <View style={{ marginBottom: 18 }}>
              <Text style={styles.sectionTitle}>Đánh giá ({restaurant.reviews.length})</Text>
              {restaurant.reviews.slice(0, 2).map((r, idx) => (
                <View key={idx} style={styles.reviewCard}>
                  <View style={styles.reviewHead}>
                    <View style={styles.avatar}>
                      <Text style={styles.avatarText}>{r.user}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: "row", alignItems: "center" }}>
                        <Text style={styles.reviewName}>{r.user}</Text>
                        <View style={{ flexDirection: "row", marginLeft: 8 }}>
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star
                              key={i}
                              size={12}
                              color={i < Math.round(r.rating) ? ORANGE : "#d1d5db"}
                              fill={i < Math.round(r.rating) ? ORANGE : "transparent"}
                            />
                          ))}
                        </View>
                      </View>
                    </View>
                  </View>
                  <Text style={styles.reviewText}>{r.comment}</Text>
                </View>
              ))}
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => navigation.push("FoodReviews", { id: String(food.id) })}
              >
                <Text style={styles.moreReviews}>Xem tất cả đánh giá →</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Similar */}
          <View>
            <Text style={styles.sectionTitle}>Món tương tự</Text>
            <FlatList
              data={similarItems}
              keyExtractor={(i) => String(i.id)}
              horizontal
              showsHorizontalScrollIndicator={false}
              ItemSeparatorComponent={() => <View style={{ width: 12 }} />}
              contentContainerStyle={{ paddingRight: 6 }}
              renderItem={({ item }) => (
                <TouchableOpacity
                  onPress={() => navigation.navigate("FoodDetail", { id: String(item.id) })}
                  activeOpacity={0.9}
                  style={styles.similarCard}
                >
                  <Image source={requireImage(item.image)} style={styles.similarImg} />
                  <View style={{ padding: 10 }}>
                    <Text numberOfLines={2} style={styles.similarName}>{item.name}</Text>
                    <View style={styles.similarRating}>
                      <Star size={12} color={ORANGE} fill={ORANGE} />
                      <Text style={styles.similarRatingText}>{item.rating.toFixed(1)}</Text>
                    </View>
                    <Text style={styles.similarPrice}>{parsePrice(item.price).toLocaleString()} VNĐ</Text>
                  </View>
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </ScrollView>

      {/* Bottom action (giữ absolute) */}
      <View style={styles.bottomWrap}>
        <View style={styles.summary}>
          <View style={styles.sumRow}>
            <Text style={styles.sumLabel}>Số lượng:</Text>
            <Text style={styles.sumValue}>{quantity}</Text>
          </View>
          <View style={styles.sumRow}>
            <Text style={styles.sumLabel}>Size:</Text>
            <Text style={styles.sumValue}>{selectedSize}</Text>
          </View>
          {!!selectedToppings.length && (
            <View style={styles.sumRow}>
              <Text style={styles.sumLabel}>Topping:</Text>
              <Text style={styles.sumValue}>{selectedToppings.join(", ")}</Text>
            </View>
          )}
          <View style={[styles.sumRow, styles.sumTotalRow]}>
            <Text style={styles.sumTotalLabel}>Tổng tiền:</Text>
            <Text style={styles.sumTotalValue}>{totalPrice.toLocaleString()} VNĐ</Text>
          </View>
        </View>

        <View style={styles.actions}>
          <TouchableOpacity onPress={handleAddToCart} activeOpacity={0.9} style={styles.btnGray}>
            <ShoppingCart size={20} color={BROWN} />
            <Text style={styles.btnGrayText}>Thêm vào giỏ</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={async () => {
              const checkoutItem = {
                id: food.id, name: food.name, restaurant: food.restaurant,
                price: basePrice, originalPrice: basePrice, image: food.image,
                quantity, size: selectedSize, toppings: selectedToppings, totalPrice,
              };
              await AsyncStorage.setItem("checkoutItem", JSON.stringify(checkoutItem));
              navigation.navigate("CheckoutScreen");
            }}
            activeOpacity={0.9}
            style={styles.btnOrange}
          >
            <Zap size={20} color="#fff" />
            <Text style={styles.btnOrangeText}>Mua ngay</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },

  toast: {
    position: "absolute",
    top: 16,
    left: "50%",
    transform: [{ translateX: -(width * 0.5) + 16 }],
    zIndex: 50,
    backgroundColor: ORANGE,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 999,
  },
  toastText: { color: "#fff", fontSize: 13, fontFamily: Fonts.LeagueSpartanSemiBold },

  heroWrap: { position: "relative" },
  heroImg: {
    width,
    height: 260,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  navBtnLeft: {
    position: "absolute",
    top: 16,
    left: 16,
    backgroundColor: "#fff",
    padding: 10,
    borderRadius: 999,
    elevation: 2,
  },
  navRight: { position: "absolute", top: 16, right: 16, flexDirection: "row", gap: 8 },
  circleBtn: { backgroundColor: "#fff", padding: 10, borderRadius: 999, elevation: 2 },
  dots: {
    position: "absolute",
    bottom: 12,
    left: 0, right: 0,
    flexDirection: "row",
    justifyContent: "center",
    gap: 6,
  },
  dot: { width: 8, height: 8, borderRadius: 999, backgroundColor: "#fff" },

  content: { flex: 1 },

  title: { color: BROWN, fontSize: 22, marginBottom: 6, fontFamily: Fonts.LeagueSpartanExtraBold },
  restaurant: { color: ORANGE, fontSize: 13, fontFamily: Fonts.LeagueSpartanSemiBold },

  ratingRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 12 },
  ratingText: { color: BROWN, fontSize: 13, fontFamily: Fonts.LeagueSpartanExtraBold },
  ratingSub: { color: "#6b7280", fontSize: 13, fontFamily: Fonts.LeagueSpartanRegular },

  priceRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  price: { color: ORANGE, fontSize: 20, fontFamily: Fonts.LeagueSpartanExtraBold },

  qtyWrap: { flexDirection: "row", alignItems: "center", gap: 10 },
  qtyBtnGray: { backgroundColor: "#f3f4f6", padding: 10, borderRadius: 999 },
  qtyBtnOrange: { backgroundColor: ORANGE, padding: 10, borderRadius: 999 },
  qtyText: { minWidth: 28, textAlign: "center", color: BROWN, fontSize: 18, fontFamily: Fonts.LeagueSpartanBold },

  sectionTitle: { color: BROWN, fontSize: 18, marginBottom: 10, fontFamily: Fonts.LeagueSpartanBold },
  desc: { color: "#6b7280", lineHeight: 20, fontSize: 14, fontFamily: Fonts.LeagueSpartanRegular },

  sizeGrid: { flexDirection: "row", gap: 8 },
  sizeItem: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: "#e5e7eb",
    alignItems: "center",
  },
  sizeItemActive: { borderColor: ORANGE, backgroundColor: "rgba(233,83,34,0.1)" },
  sizeName: { color: "#6b7280", fontSize: 14, fontFamily: Fonts.LeagueSpartanSemiBold },
  sizePlus: { color: ORANGE, fontSize: 12, marginTop: 2, fontFamily: Fonts.LeagueSpartanRegular },

  topItem: {
    borderWidth: 2,
    borderColor: "#e5e7eb",
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  topItemActive: { borderColor: ORANGE, backgroundColor: "rgba(233,83,34,0.1)" },
  topName: { color: BROWN, fontSize: 14, fontFamily: Fonts.LeagueSpartanSemiBold },
  topPrice: { color: ORANGE, fontSize: 14, fontFamily: Fonts.LeagueSpartanSemiBold },

  deliveryBox: {
    backgroundColor: "rgba(233,83,34,0.1)",
    borderRadius: 14,
    padding: 14,
    marginBottom: 18,
  },
  deliveryRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 6 },
  deliveryMain: { color: BROWN, fontFamily: Fonts.LeagueSpartanSemiBold },
  deliverySub: { color: BROWN, fontSize: 13, fontFamily: Fonts.LeagueSpartanRegular },

  reviewCard: { backgroundColor: "#f9fafb", borderRadius: 14, padding: 14, marginBottom: 10 },
  reviewHead: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 6 },
  avatar: { width: 32, height: 32, borderRadius: 999, backgroundColor: ORANGE, alignItems: "center", justifyContent: "center" },
  avatarText: { color: "#fff", fontSize: 12, fontFamily: Fonts.LeagueSpartanExtraBold },
  reviewName: { color: BROWN, fontSize: 14, fontFamily: Fonts.LeagueSpartanBold },
  reviewText: { color: "#6b7280", fontSize: 14, marginTop: 4, marginBottom: 2, fontFamily: Fonts.LeagueSpartanRegular },
  moreReviews: { color: ORANGE, fontSize: 13, fontFamily: Fonts.LeagueSpartanSemiBold },

  similarCard: {
    width: 160,
    backgroundColor: "#fff",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#f3f4f6",
    overflow: "hidden",
    elevation: 1,
  },
  similarImg: { width: 160, height: 96 },
  similarName: { color: BROWN, fontSize: 14, fontFamily: Fonts.LeagueSpartanSemiBold },
  similarRating: { flexDirection: "row", alignItems: "center", marginTop: 4, marginBottom: 6, gap: 4 },
  similarRatingText: { color: "#6b7280", fontSize: 12, fontFamily: Fonts.LeagueSpartanRegular },
  similarPrice: { color: ORANGE, fontSize: 14, fontFamily: Fonts.LeagueSpartanExtraBold },

  bottomWrap: {
    position: "absolute",
    left: 0, right: 0, bottom: 20,
    paddingHorizontal: 24,
  },
  summary: {
    backgroundColor: "#fff",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#f3f4f6",
    padding: 14,
    marginBottom: 10,
    elevation: 2,
  },
  sumRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 4 },
  sumLabel: { color: "#6b7280", fontSize: 12, fontFamily: Fonts.LeagueSpartanRegular },
  sumValue: { color: BROWN, fontSize: 12, maxWidth: width * 0.6, textAlign: "right", fontFamily: Fonts.LeagueSpartanSemiBold },
  sumTotalRow: { paddingTop: 6, borderTopWidth: 1, borderTopColor: "#f3f4f6" },
  sumTotalLabel: { color: BROWN, fontFamily: Fonts.LeagueSpartanExtraBold },
  sumTotalValue: { color: ORANGE, fontFamily: Fonts.LeagueSpartanExtraBold },

  actions: { flexDirection: "row", gap: 10 },
  btnGray: {
    flex: 1, backgroundColor: "#f3f4f6", borderRadius: 14,
    paddingVertical: 12, alignItems: "center", justifyContent: "center",
    flexDirection: "row", gap: 8,
  },
  btnGrayText: { color: BROWN, fontFamily: Fonts.LeagueSpartanExtraBold },
  btnOrange: {
    flex: 1, backgroundColor: ORANGE, borderRadius: 14,
    paddingVertical: 12, alignItems: "center", justifyContent: "center",
    flexDirection: "row", gap: 8,
  },
  btnOrangeText: { color: "#fff", fontFamily: Fonts.LeagueSpartanExtraBold },
});
