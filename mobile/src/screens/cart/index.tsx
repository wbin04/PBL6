import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation } from "@react-navigation/native";
import {
  Check,
  ChevronLeft,
  Minus,
  Plus,
  ShoppingCart,
  Trash2,
} from "lucide-react-native";
import React, { useEffect, useMemo, useState } from "react";
import {
  FlatList,
  Image,
  Platform,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { IMAGE_MAP } from "@/assets/imageMap";
import { Fonts } from "@/constants/Fonts";

export interface CartItem {
  id: number;
  name: string;
  restaurant: string;
  price: number;
  originalPrice?: number;
  image: string;
  quantity: number;
  size: string;
  toppings: string[];
  totalPrice: number;
}

const CART_KEY = "cart";
const SELECTED_KEY = "selectedItems";

function itemKeyOf(item: CartItem) {
  return `${item.id}-${item.size}-${item.toppings.join(",")}`;
}

function resolveImage(name: string) {
  if (/^https?:\/\//.test(name)) return { uri: name } as const;
  const mapped = (IMAGE_MAP as any)[name];
  if (mapped) return mapped;
  return { uri: name } as const;
}

type Nav = any;

export default function CartScreen() {
  const navigation = useNavigation<Nav>();
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem(CART_KEY);
        if (saved) {
          const parsed: CartItem[] = JSON.parse(saved);
          setCartItems(parsed);
          const allKeys = parsed.map(itemKeyOf);
          setSelectedItems(new Set(allKeys));
        }
      } catch (e) {
        console.warn("Failed to load cart", e);
      } finally {
        setIsLoaded(true);
      }
    })();
  }, []);

  const updateCart = async (newCart: CartItem[]) => {
    setCartItems(newCart);
    try {
      await AsyncStorage.setItem(CART_KEY, JSON.stringify(newCart));
    } catch (e) {
      console.warn("Failed to persist cart", e);
    }
  };

  const updateQuantity = (targetKey: string, newQuantity: number) => {
    const updated = cartItems.map((item) => {
      const key = itemKeyOf(item);
      if (key !== targetKey) return item;
      if (newQuantity <= 0) return item;
      return {
        ...item,
        quantity: newQuantity,
        totalPrice: item.price * newQuantity,
      };
    });
    updateCart(updated);
  };

  const removeByKey = (targetKey: string) => {
    const filtered = cartItems.filter((i) => itemKeyOf(i) !== targetKey);
    updateCart(filtered);
    const next = new Set(selectedItems);
    next.delete(targetKey);
    setSelectedItems(next);
  };

  const getTotalPrice = useMemo(
    () => () =>
      cartItems.reduce(
        (sum, item) =>
          selectedItems.has(itemKeyOf(item)) ? sum + item.totalPrice : sum,
        0
      ),
    [cartItems, selectedItems]
  );

  const getSelectedItemsCount = useMemo(
    () => () =>
      cartItems.reduce(
        (sum, item) =>
          selectedItems.has(itemKeyOf(item)) ? sum + item.quantity : sum,
        0
      ),
    [cartItems, selectedItems]
  );

  const getTotalItems = useMemo(
    () => () => cartItems.reduce((sum, item) => sum + item.quantity, 0),
    [cartItems]
  );

  const toggleSelect = (key: string) => {
    const next = new Set(selectedItems);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    setSelectedItems(next);
  };

  const selectAll = () => {
    if (selectedItems.size === cartItems.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(cartItems.map(itemKeyOf)));
    }
  };

  const handleCheckout = async () => {
    if (selectedItems.size === 0) return;
    const keys = Array.from(selectedItems);
    try {
      await AsyncStorage.setItem(SELECTED_KEY, JSON.stringify(keys));
    } catch (e) {
      console.warn("Failed to persist selected items", e);
    }
    navigation.navigate("Checkout");  
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.screen}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()} 
            style={styles.backBtn}
          >
            <ChevronLeft size={24} color="#391713" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Giỏ hàng</Text>
          {cartItems.length > 0 && (
            <Text style={styles.headerCount}>({getTotalItems()} món)</Text>
          )}
        </View>

        {/* Content */}
        <View style={styles.contentWrap}>
          {!isLoaded || cartItems.length === 0 ? (
            <View style={styles.emptyWrap}>
              <ShoppingCart
                size={64}
                color="#d1d5db"
                style={{ marginBottom: 12 }}
              />
              <Text style={styles.emptyTitle}>Giỏ hàng trống</Text>
              <Text style={styles.emptySubtitle}>
                Thêm món ăn yêu thích vào giỏ hàng!
              </Text>
              <TouchableOpacity
                onPress={() => navigation.navigate("Home")} 
                style={styles.exploreBtn}
              >
                <Text style={styles.exploreText}>Khám phá món ăn</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <FlatList
              data={cartItems}
              keyExtractor={(item) => itemKeyOf(item)}
              ItemSeparatorComponent={() => <View style={styles.separator} />}
              contentContainerStyle={{ paddingBottom: 140 }}
              renderItem={({ item }) => {
                const key = itemKeyOf(item);
                const isSelected = selectedItems.has(key);
                return (
                  <View style={styles.row}>
                    {/* Checkbox */}
                    <TouchableOpacity
                      onPress={() => toggleSelect(key)}
                      style={[
                        styles.checkbox,
                        isSelected && styles.checkboxChecked,
                      ]}
                    >
                      {isSelected && <Check size={14} color="#fff" />}
                    </TouchableOpacity>

                    {/* Image */}
                    <View style={{ marginRight: 12 }}>
                      <Image source={resolveImage(item.image)} style={styles.foodImg} />
                    </View>

                    {/* Info */}
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <View style={styles.titleRow}>
                        <Text numberOfLines={1} style={styles.foodName}>
                          {item.name}
                        </Text>
                        <TouchableOpacity
                          onPress={() => removeByKey(key)}
                          style={{ padding: 4, marginLeft: 8 }}
                        >
                          <Trash2 size={16} color="#ef4444" />
                        </TouchableOpacity>
                      </View>

                      <Text style={styles.restaurant}>{item.restaurant}</Text>

                      <View style={styles.metaBox}>
                        <Text style={styles.metaText}>Size: {item.size}</Text>
                        {item.toppings.length > 0 && (
                          <Text style={styles.metaText}>
                            Topping: {item.toppings.join(", ")}
                          </Text>
                        )}
                      </View>

                      <View style={styles.bottomRow}>
                        <View style={styles.priceRow}>
                          {!!item.originalPrice &&
                            item.originalPrice > item.price && (
                              <Text style={styles.strike}>
                                {item.originalPrice.toLocaleString()} VNĐ
                              </Text>
                            )}
                          <Text style={styles.price}>
                            {item.price.toLocaleString()} VNĐ
                          </Text>
                        </View>

                        <View style={styles.qtyRow}>
                          <TouchableOpacity
                            onPress={() =>
                              item.quantity - 1 <= 0
                                ? removeByKey(key)
                                : updateQuantity(key, item.quantity - 1)
                            }
                            style={styles.minusBtn}
                          >
                            <Minus size={16} color="#391713" />
                          </TouchableOpacity>
                          <Text style={styles.qty}>{item.quantity}</Text>
                          <TouchableOpacity
                            onPress={() =>
                              updateQuantity(key, item.quantity + 1)
                            }
                            style={styles.plusBtn}
                          >
                            <Plus size={16} color="#fff" />
                          </TouchableOpacity>
                        </View>
                      </View>
                    </View>
                  </View>
                );
              }}
            />
          )}
        </View>

        {/* Footer / Action Bar */}
        {cartItems.length > 0 && (
          <View style={styles.footer}>
            <View style={styles.footerTop}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                <TouchableOpacity
                  onPress={selectAll}
                  style={[
                    styles.checkbox,
                    selectedItems.size === cartItems.length &&
                      styles.checkboxChecked,
                  ]}
                >
                  {selectedItems.size === cartItems.length && (
                    <Check size={14} color="#fff" />
                  )}
                </TouchableOpacity>
                <Text style={styles.selectAll}>Chọn tất cả</Text>
              </View>
              <Text style={styles.counter}>
                {selectedItems.size}/{cartItems.length} món
              </Text>
            </View>

            <TouchableOpacity
              disabled={selectedItems.size === 0}
              onPress={handleCheckout}
              style={[
                styles.checkoutBtn,
                selectedItems.size === 0
                  ? styles.checkoutDisabled
                  : styles.checkoutEnabled,
              ]}
            >
              <Text
                style={[
                  styles.checkoutText,
                  selectedItems.size === 0
                    ? { color: "#6b7280" }
                    : { color: "#fff" },
                ]}
              >
                {selectedItems.size > 0
                  ? `Đặt hàng (${getSelectedItemsCount()} món) • ${getTotalPrice().toLocaleString()} VNĐ`
                  : "Chọn món để đặt hàng"}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#f5cb58" },
  screen: { flex: 1, alignSelf: "center", width: "100%", maxWidth: 480 },

  header: {
    backgroundColor: "#f5cb58",
    paddingHorizontal: 24,
    paddingBottom: 16,
    paddingTop: 40,
    flexDirection: "row",
    alignItems: "center",
  },
  backBtn: { marginRight: 12 },
  headerTitle: { color: "#fff", fontFamily: Fonts.LeagueSpartanBold, fontSize: 22 },
  headerCount: { marginLeft: "auto", color: "#391713", fontFamily: Fonts.LeagueSpartanSemiBold },

  contentWrap: {
    backgroundColor: "#fff",
    paddingHorizontal: 24,
    paddingTop: 24,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    flex: 1,
    marginTop: -12,
  },
  emptyWrap: { alignItems: "center", justifyContent: "center", paddingVertical: 64 },
  emptyTitle: { color: "#6b7280", fontSize: 18, marginBottom: 4, fontFamily: Fonts.LeagueSpartanMedium },
  emptySubtitle: { color: "#9ca3af", fontSize: 13, marginBottom: 20 },
  exploreBtn: { backgroundColor: "#e95322", borderRadius: 999, paddingHorizontal: 20, paddingVertical: 12 },
  exploreText: { color: "#fff", fontFamily: Fonts.LeagueSpartanSemiBold },

  separator: { height: 1, backgroundColor: "#e5e7eb" },
  row: { flexDirection: "row", alignItems: "center", paddingVertical: 16, gap: 12 },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: "#d1d5db",
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxChecked: { backgroundColor: "#e95322", borderColor: "#e95322" },
  foodImg: { width: 64, height: 64, borderRadius: 12, resizeMode: "cover" },

  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  foodName: {
    color: "#391713",
    fontFamily: Fonts.LeagueSpartanBold,
    fontSize: 16,
    flexShrink: 1,
  },
  restaurant: { color: "#6b7280", fontSize: 13, marginBottom: 4, fontFamily: Fonts.LeagueSpartanRegular },
  metaBox: { gap: 2, marginBottom: 8 },
  metaText: { color: "#4b5563", fontSize: 13, fontFamily: Fonts.LeagueSpartanRegular },
  bottomRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },

  priceRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  strike: { color: "#9ca3af", textDecorationLine: "line-through", fontSize: 12 },
  price: { color: "#e95322", fontFamily: Fonts.LeagueSpartanExtraBold, fontSize: 16 },

  qtyRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  minusBtn: { backgroundColor: "#f3f4f6", borderRadius: 999, padding: 6 },
  plusBtn: { backgroundColor: "#e95322", borderRadius: 999, padding: 6 },
  qty: {
    color: "#391713",
    fontFamily: Fonts.LeagueSpartanBold,
    fontSize: 16,
    minWidth: 24,
    textAlign: "center",
  },

  footer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
    backgroundColor: "#fff",
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: Platform.select({ ios: 24, android: 16, default: 16 }),
  },
  footerTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  selectAll: { color: "#391713", fontFamily: Fonts.LeagueSpartanSemiBold },
  counter: { color: "#6b7280", fontSize: 13 },
  checkoutBtn: { borderRadius: 18, paddingVertical: 14, alignItems: "center", marginBottom: 30 },
  checkoutEnabled: { backgroundColor: "#e95322" },
  checkoutDisabled: { backgroundColor: "#d1d5db" },
  checkoutText: { fontFamily: Fonts.LeagueSpartanExtraBold, fontSize: 16 },
});
