import { Fonts } from "@/constants/Fonts";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { Check, Minus, Plus, ShoppingCart, X, Zap } from "lucide-react-native";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  Image,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type FoodItem = {
  id: number;
  name: string;
  restaurant: string;
  price: number | string;
  originalPrice?: number;
  image: string;
  rating?: string;
};

type Props = {
  isOpen: boolean;
  onClose: () => void;
  foodItem: FoodItem;
};

const ORANGE = "#e95322";
const BROWN = "#391713";
const BORDER = "#e5e7eb";

const { height: SCREEN_H } = Dimensions.get("window");

export default function FoodCustomizationPopup({
  isOpen,
  onClose,
  foodItem,
}: Props) {
  const [quantity, setQuantity] = useState(1);
  const [selectedSize, setSelectedSize] = useState<"Nhỏ" | "Vừa" | "Lớn">("Vừa");
  const [selectedToppings, setSelectedToppings] = useState<string[]>([]);
  const [showCartNotification, setShowCartNotification] = useState(false);
  const router = useRouter();
  const insets = useSafeAreaInsets();


  const translateY = useRef(new Animated.Value(SCREEN_H)).current;
  useEffect(() => {
    Animated.timing(translateY, {
      toValue: isOpen ? 0 : SCREEN_H,
      duration: 240,
      useNativeDriver: true,
    }).start();
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      setQuantity(1);
      setSelectedSize("Vừa");
      setSelectedToppings([]);
    }
  }, [isOpen]);

  const sizes = useMemo(
    () => [
      { name: "Nhỏ", price: 0 },
      { name: "Vừa", price: 0 },
      { name: "Lớn", price: 10000 },
    ] as const,
    []
  );

  const toppings = useMemo(
    () => [
      { name: "Thêm phô mai", price: 8000 },
      { name: "Thêm trứng", price: 5000 },
      { name: "Thêm gà rán", price: 15000 },
      { name: "Thêm thịt bò", price: 20000 },
    ],
    []
  );

  const basePrice = useMemo(() => {
    if (typeof foodItem.price === "string") {
      const usd = Number.parseFloat(foodItem.price.replace("$", ""));
      return Math.round(usd * 25000);
    }
    return foodItem.price;
  }, [foodItem.price]);

  const calculateTotalPrice = useMemo(() => {
    const sizePrice = sizes.find((s) => s.name === selectedSize)?.price ?? 0;
    const toppingSum = selectedToppings.reduce((sum, t) => {
      const tp = toppings.find((x) => x.name === t)?.price ?? 0;
      return sum + tp;
    }, 0);
    const single = basePrice + sizePrice + toppingSum;
    return single * quantity;
  }, [basePrice, selectedSize, selectedToppings, toppings, sizes, quantity]);

  const toggleTopping = (name: string) => {
    setSelectedToppings((prev) =>
      prev.includes(name) ? prev.filter((x) => x !== name) : [...prev, name]
    );
  };

  const getImageSource = () => {
    if (/^https?:\/\//i.test(foodItem.image)) {
      return { uri: foodItem.image };
    }
    try {
      return { uri: foodItem.image }; 
    } catch {
      return { uri: "https://via.placeholder.com/128" };
    }
  };

  const handleAddToCart = async () => {
    const item = {
      id: foodItem.id,
      name: foodItem.name,
      restaurant: foodItem.restaurant,
      price: (calculateTotalPrice / quantity) as number,
      originalPrice: foodItem.originalPrice,
      image: foodItem.image,
      quantity,
      size: selectedSize,
      toppings: selectedToppings,
      totalPrice: calculateTotalPrice,
    };

    const saved = await AsyncStorage.getItem("cart");
    const cart = saved ? JSON.parse(saved) : [];

    const idx = cart.findIndex(
      (x: any) =>
        x.id === item.id &&
        x.size === item.size &&
        JSON.stringify([...x.toppings].sort()) ===
          JSON.stringify([...item.toppings].sort())
    );

    if (idx >= 0) {
      cart[idx].quantity += item.quantity;
      cart[idx].totalPrice += item.totalPrice;
    } else {
      cart.push(item);
    }

    await AsyncStorage.setItem("cart", JSON.stringify(cart));
    setShowCartNotification(true);
    setTimeout(() => {
      setShowCartNotification(false);
      onClose();
    }, 1500);
  };

  const handleBuyNow = async () => {
    const checkoutItem = {
      id: foodItem.id,
      name: foodItem.name,
      restaurant: foodItem.restaurant,
      price: basePrice,
      originalPrice: foodItem.originalPrice,
      image: foodItem.image,
      quantity,
      size: selectedSize,
      toppings: selectedToppings,
      totalPrice: calculateTotalPrice,
    };
    await AsyncStorage.setItem("checkoutItem", JSON.stringify(checkoutItem));
    onClose();
    router.push("/checkout");
  };

  if (!isOpen) return null;

  return (
    <Modal visible transparent animationType="none" onRequestClose={onClose}>
      {/* Backdrop */}
      <TouchableOpacity
        activeOpacity={1}
        onPress={onClose}
        style={styles.backdrop}
      />
      {/* Sheet */}
      <Animated.View
        style={[
          styles.sheet,
          {
            paddingBottom: insets.bottom > 12 ? insets.bottom : 12,
            transform: [{ translateY }],
          },
        ]}
      >
        {showCartNotification && (
          <View style={styles.toast}>
            <Check size={16} color="#fff" />
            <Text style={[styles.toastText, { fontFamily: Fonts.LeagueSpartanMedium }]}>
              Đã thêm vào giỏ hàng
            </Text>
          </View>
        )}

        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.headerTitle, { fontFamily: Fonts.LeagueSpartanBold }]}>
            Tùy chỉnh món ăn
          </Text>
          <TouchableOpacity onPress={onClose} style={styles.headerClose}>
            <X size={20} color={BROWN} />
          </TouchableOpacity>
        </View>

        <View style={{ flex: 1, overflow: "hidden" }}>
          <ScrollView contentContainerStyle={{ paddingBottom: 16 }}>
            {/* Food info */}
            <View style={styles.section}>
              <View style={{ flexDirection: "row", gap: 12 }}>
                <Image
                  source={getImageSource()}
                  style={styles.foodThumb}
                  resizeMode="cover"
                />
                <View style={{ flex: 1 }}>
                  <Text
                    style={[
                      styles.foodName,
                      { fontFamily: Fonts.LeagueSpartanBold },
                    ]}
                    numberOfLines={2}
                  >
                    {foodItem.name}
                  </Text>
                  <Text
                    style={[
                      styles.foodRestaurant,
                      { fontFamily: Fonts.LeagueSpartanRegular },
                    ]}
                    numberOfLines={1}
                  >
                    {foodItem.restaurant}
                  </Text>
                  <Text
                    style={[
                      styles.priceMain,
                      { fontFamily: Fonts.LeagueSpartanBold },
                    ]}
                  >
                    {basePrice.toLocaleString()}đ
                  </Text>
                </View>
              </View>
            </View>

            {/* Quantity */}
            <View style={styles.section}>
              <Text
                style={[styles.sectionTitle, { fontFamily: Fonts.LeagueSpartanBold }]}
              >
                Số lượng
              </Text>
              <View style={styles.qtyRow}>
                <TouchableOpacity
                  onPress={() => setQuantity((q) => Math.max(1, q - 1))}
                  style={styles.roundBtnGray}
                >
                  <Minus size={16} color={BROWN} />
                </TouchableOpacity>
                <Text
                  style={[
                    styles.qtyText,
                    { fontFamily: Fonts.LeagueSpartanBold },
                  ]}
                >
                  {quantity}
                </Text>
                <TouchableOpacity
                  onPress={() => setQuantity((q) => q + 1)}
                  style={styles.roundBtnOrange}
                >
                  <Plus size={16} color="#fff" />
                </TouchableOpacity>
              </View>
            </View>

            {/* Size */}
            <View style={styles.section}>
              <Text
                style={[styles.sectionTitle, { fontFamily: Fonts.LeagueSpartanBold }]}
              >
                Chọn size
              </Text>
              <View style={styles.sizeGrid}>
                {sizes.map((s) => {
                  const active = selectedSize === s.name;
                  return (
                    <TouchableOpacity
                      key={s.name}
                      onPress={() => setSelectedSize(s.name)}
                      style={[
                        styles.sizeBtn,
                        { borderColor: active ? ORANGE : BORDER, backgroundColor: active ? "rgba(233,83,34,0.1)" : "#fff" },
                      ]}
                    >
                      <Text
                        style={[
                          styles.sizeText,
                          { fontFamily: Fonts.LeagueSpartanMedium },
                        ]}
                      >
                        {s.name}
                      </Text>
                      {s.price > 0 && (
                        <Text style={styles.sizeSub}>+{s.price.toLocaleString()}đ</Text>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Toppings */}
            <View style={[styles.section, { borderBottomWidth: 0 }]}>
              <Text
                style={[styles.sectionTitle, { fontFamily: Fonts.LeagueSpartanBold }]}
              >
                Thêm topping
              </Text>
              <View style={{ gap: 8 }}>
                {toppings.map((t) => {
                  const active = selectedToppings.includes(t.name);
                  return (
                    <TouchableOpacity
                      key={t.name}
                      onPress={() => toggleTopping(t.name)}
                      style={[
                        styles.toppingRow,
                        { borderColor: active ? ORANGE : BORDER, backgroundColor: active ? "rgba(233,83,34,0.1)" : "#fff" },
                      ]}
                    >
                      <Text
                        style={[
                          styles.toppingName,
                          { fontFamily: Fonts.LeagueSpartanMedium },
                        ]}
                      >
                        {t.name}
                      </Text>
                      <Text style={styles.toppingPrice}>+{t.price.toLocaleString()}đ</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </ScrollView>
        </View>

        {/* Footer */}
        <View style={[styles.footer, { paddingBottom: Math.max(12, insets.bottom) }]}>
          <View style={styles.totalRow}>
            <Text
              style={[styles.totalLabel, { fontFamily: Fonts.LeagueSpartanBold }]}
            >
              Tổng tiền:
            </Text>
            <Text
              style={[styles.totalValue, { fontFamily: Fonts.LeagueSpartanBold }]}
            >
              {calculateTotalPrice.toLocaleString()}đ
            </Text>
          </View>
          <View style={styles.actionRow}>
            <TouchableOpacity style={styles.btnGray} onPress={handleAddToCart}>
              <ShoppingCart size={20} color={BROWN} />
              <Text
                style={[styles.btnGrayText, { fontFamily: Fonts.LeagueSpartanBold }]}
              >
                Thêm vào giỏ
              </Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.btnOrange} onPress={handleBuyNow}>
              <Zap size={20} color="#fff" />
              <Text
                style={[styles.btnOrangeText, { fontFamily: Fonts.LeagueSpartanBold }]}
              >
                Mua ngay
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Animated.View>
    </Modal>
  );
}

const SHEET_HEIGHT = Math.round(SCREEN_H * 0.75);

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  sheet: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: SHEET_HEIGHT,
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: "hidden",
    ...Platform.select({
      android: { elevation: 12 },
      ios: {
        shadowColor: "#000",
        shadowOpacity: 0.15,
        shadowOffset: { width: 0, height: -4 },
        shadowRadius: 12,
      },
    }),
  },
  toast: {
    position: "absolute",
    top: 12,
    left: "50%",
    transform: [{ translateX: -120 }],
    backgroundColor: ORANGE,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: "row",
    gap: 6,
    alignItems: "center",
    zIndex: 10,
  },
  toastText: { color: "#fff", fontSize: 12 },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerTitle: { color: BROWN, fontSize: 18 },
  headerClose: { backgroundColor: "#f3f4f6", padding: 8, borderRadius: 999 },
  section: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  foodThumb: { width: 64, height: 64, borderRadius: 12 },
  foodName: { color: BROWN, fontSize: 16, marginBottom: 4 },
  foodRestaurant: { color: "#6b7280", fontSize: 13, marginBottom: 4 },
  priceMain: { color: ORANGE, fontSize: 18 },
  sectionTitle: { color: BROWN, fontSize: 16, marginBottom: 12 },
  qtyRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 16,
  },
  roundBtnGray: { backgroundColor: "#f3f4f6", padding: 10, borderRadius: 999 },
  roundBtnOrange: { backgroundColor: ORANGE, padding: 10, borderRadius: 999 },
  qtyText: { color: BROWN, fontSize: 20, minWidth: 48, textAlign: "center" },
  sizeGrid: {
    flexDirection: "row",
    gap: 8,
    justifyContent: "space-between",
  },
  sizeBtn: {
    flex: 1,
    borderWidth: 2,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 8,
    alignItems: "center",
  },
  sizeText: { color: BROWN, fontSize: 14, marginBottom: 2 },
  sizeSub: { color: ORANGE, fontSize: 12 },
  toppingRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 2,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  toppingName: { color: BROWN, fontSize: 14 },
  toppingPrice: { color: ORANGE, fontSize: 14 },
  footer: {
    borderTopWidth: 1,
    borderTopColor: BORDER,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
    alignItems: "center",
  },
  totalLabel: { color: BROWN, fontSize: 18 },
  totalValue: { color: ORANGE, fontSize: 20 },
  actionRow: { flexDirection: "row", gap: 12 },
  btnGray: {
    flex: 1,
    backgroundColor: "#f3f4f6",
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
  },
  btnGrayText: { color: BROWN, fontSize: 15 },
  btnOrange: {
    flex: 1,
    backgroundColor: ORANGE,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
  },
  btnOrangeText: { color: "#fff", fontSize: 15 },
});

