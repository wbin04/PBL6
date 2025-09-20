import AsyncStorage from "@react-native-async-storage/async-storage";
import { formatPriceWithCurrency } from "@/utils/priceUtils";
import { useNavigation } from "@react-navigation/native";
import { API_CONFIG } from "@/constants";
import { cartService } from "@/services";
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
  food_id: number;
  food_option_id?: number;
  quantity: number;
  item_note?: string;
  subtotal: number;
  food: {
    id: number;
    title: string;
    price: number;
    image: string;
    store: {
      id: number;
      store_name: string;
    };
  };
  size?: {
    id: number;
    size_name: string;
    price: number;
  };
}

export interface CartResponse {
  id: number;
  total_money: number;
  items_count: number;
  items: CartItem[];
}

type GroupedItems = {
  [storeName: string]: CartItem[];
};

const CART_KEY = "cart";
const SELECTED_KEY = "selectedItems";

function itemKeyOf(item: CartItem) {
  const sizeKey = item.size?.size_name || 'none';
  return `${item.food_id}-${sizeKey}-${item.item_note || ''}`;
}

function resolveImage(name: string) {
  console.log('Resolving image:', name);
  
  if (/^https?:\/\//.test(name)) return { uri: name } as const;
  
  // Remove 'assets/' prefix if present
  const cleanName = name.replace(/^assets\//, '');
  console.log('Clean name:', cleanName);
  
  const mapped = (IMAGE_MAP as any)[cleanName];
  if (mapped) {
    console.log('Found in IMAGE_MAP:', cleanName);
    return mapped;
  }
  
  // Fallback to full URL if not in IMAGE_MAP
  const fullUrl = `${API_CONFIG.BASE_URL.replace('/api', '')}/media/${name}`;
  console.log('Using full URL:', fullUrl);
  return { uri: fullUrl } as const;
}

type Nav = any;

export default function CartScreen() {
  const navigation = useNavigation<Nav>();
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const loadCartFromAPI = async () => {
      try {
        // Use cartService with proper authentication
        const cartData = await cartService.getCart();
        console.log('Cart API response:', cartData);
        console.log('Cart screen - Total items from API:', cartData.items?.length || 0);
        console.log('Cart screen - All item IDs from API:', cartData.items?.map(item => item.id) || []);
        
        // Transform service CartItem to local CartItem interface
        const transformedItems = cartData.items.map(item => ({
          ...item,
          food_id: item.food.id,
          subtotal: parseFloat(item.food.price) * item.quantity,
          food: {
            ...item.food,
            price: parseFloat(item.food.price)
          }
        })) as CartItem[];
        
        setCartItems(transformedItems);
        const allKeys = transformedItems.map(itemKeyOf);
        setSelectedItems(new Set(allKeys));
      } catch (error) {
        console.error('Error loading cart from API:', error);
        await loadCartFromStorage();
      } finally {
        setIsLoaded(true);
      }
    };

    const loadCartFromStorage = async () => {
      try {
        const saved = await AsyncStorage.getItem(CART_KEY);
        if (saved) {
          // Convert old format to new format if needed
          const parsed = JSON.parse(saved);
          console.log('Loaded cart from storage:', parsed);
          // This is fallback for old AsyncStorage data
          setCartItems([]);
        }
      } catch (e) {
        console.warn("Failed to load cart from storage", e);
      }
    };

    loadCartFromAPI();
  }, []);

  // Group items by store
  const groupedItems: GroupedItems = useMemo(() => {
    return cartItems.reduce((groups, item) => {
      const storeName = item.food.store.store_name;
      if (!groups[storeName]) {
        groups[storeName] = [];
      }
      groups[storeName].push(item);
      return groups;
    }, {} as GroupedItems);
  }, [cartItems]);

  const updateQuantity = async (targetKey: string, newQuantity: number) => {
    const itemToUpdate = cartItems.find(item => itemKeyOf(item) === targetKey);
    if (!itemToUpdate) return;

    console.log('updateQuantity called with:', { targetKey, newQuantity, itemId: itemToUpdate.id });

    try {
      // Use cartService to update quantity in backend
      await cartService.updateCartItem(itemToUpdate.food_id, { quantity: newQuantity });
      
      // Update local state if API succeeds
      const updated = cartItems.map((item) => {
        const key = itemKeyOf(item);
        if (key !== targetKey) return item;
        if (newQuantity <= 0) return item;
        return {
          ...item,
          quantity: newQuantity,
          subtotal: item.food.price * newQuantity,
        };
      });
      setCartItems(updated);
      
      console.log('Quantity updated successfully in backend and local state');
    } catch (error) {
      console.error('Error updating quantity via API:', error);
      // Optionally show an error message to user
    }
  };

  const removeByKey = async (targetKey: string) => {
    const itemToRemove = cartItems.find(item => itemKeyOf(item) === targetKey);
    if (!itemToRemove) return;

    try {
      // Use cartService with proper authentication
      await cartService.removeFromCart(itemToRemove.food_id);
      
      // Remove from local state if API succeeds
      const filtered = cartItems.filter((i) => itemKeyOf(i) !== targetKey);
      setCartItems(filtered);
      const next = new Set(selectedItems);
      next.delete(targetKey);
      setSelectedItems(next);
    } catch (error) {
      console.error('Error removing item from cart:', error);
    }
  };

  const getTotalPrice = useMemo(
    () => () =>
      cartItems.reduce(
        (sum, item) =>
          selectedItems.has(itemKeyOf(item)) ? sum + item.subtotal : sum,
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

  const toggleStoreSelect = (storeName: string) => {
    const storeItems = groupedItems[storeName];
    const storeKeys = storeItems.map(itemKeyOf);
    const allStoreItemsSelected = storeKeys.every(key => selectedItems.has(key));
    
    const next = new Set(selectedItems);
    if (allStoreItemsSelected) {
      // Deselect all store items
      storeKeys.forEach(key => next.delete(key));
    } else {
      // Select all store items
      storeKeys.forEach(key => next.add(key));
    }
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
    
    console.log('Cart screen - selectedItems keys:', Array.from(selectedItems));
    console.log('Cart screen - all cartItems:', cartItems.map(item => ({ id: item.id, title: item.food.title })));
    
    // Get selected items to pass to checkout
    const selectedCartItems = Array.from(selectedItems).map(key => {
      const item = cartItems.find(item => itemKeyOf(item) === key);
      console.log(`Cart screen - key ${key} -> item:`, item ? { id: item.id, title: item.food.title } : 'NOT FOUND');
      return item;
    }).filter(Boolean);
    
    console.log('Cart screen - selectedCartItems to pass:', selectedCartItems.length, 'items');
    
    navigation.navigate("Checkout", { 
      selectedIds: selectedCartItems.map(item => item!.id),
      selectedCartItems: selectedCartItems // Pass actual items too
    });  
  };

  const renderStoreGroup = (storeName: string, items: CartItem[]) => {
    const storeKeys = items.map(itemKeyOf);
    const allStoreItemsSelected = storeKeys.every(key => selectedItems.has(key));
    const someStoreItemsSelected = storeKeys.some(key => selectedItems.has(key));
    const storeTotal = items.reduce((sum, item) => 
      selectedItems.has(itemKeyOf(item)) ? sum + item.subtotal : sum, 0);

    return (
      <View key={storeName} style={styles.storeGroup}>
        {/* Store Header */}
        <View style={styles.storeHeader}>
          <TouchableOpacity
            onPress={() => toggleStoreSelect(storeName)}
            style={styles.storeHeaderLeft}
          >
            <View style={[
              styles.checkbox,
              allStoreItemsSelected ? styles.checkboxChecked : 
              someStoreItemsSelected ? styles.checkboxPartial : null
            ]}>
              {allStoreItemsSelected && <Check size={14} color="#fff" />}
              {someStoreItemsSelected && !allStoreItemsSelected && (
                <View style={styles.partialIndicator} />
              )}
            </View>
            <Text style={styles.storeName}>{storeName}</Text>
          </TouchableOpacity>
          
          {storeTotal > 0 && (
            <Text style={styles.storeTotal}>{formatPriceWithCurrency(storeTotal)}</Text>
          )}
        </View>

        {/* Store Items */}
        {items.map((item, index) => {
          const key = itemKeyOf(item);
          const isSelected = selectedItems.has(key);
          return (
            <View key={key} style={[
              styles.row,
              index < items.length - 1 && styles.rowWithBorder
            ]}>
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

              {/* Image & Food Info - Clickable */}
              <TouchableOpacity
                style={{ flexDirection: 'row', flex: 1, alignItems: 'center' }}
                onPress={() => navigation.navigate("FoodDetail", { foodId: item.food.id })}
                activeOpacity={0.7}
              >
                {/* Image */}
                <View style={{ marginRight: 12 }}>
                  <Image source={resolveImage(item.food.image)} style={styles.foodImg} />
                </View>

                {/* Info */}
                <View style={{ flex: 1, minWidth: 0 }}>
                  <View style={styles.titleRow}>
                    <Text numberOfLines={1} style={styles.foodName}>
                      {item.food.title}
                    </Text>
                    <TouchableOpacity
                      onPress={() => removeByKey(key)}
                      style={{ padding: 4, marginLeft: 8 }}
                    >
                      <Trash2 size={16} color="#ef4444" />
                    </TouchableOpacity>
                  </View>

                  <View style={styles.metaBox}>
                    <Text style={styles.metaText}>
                      Size: {item.size?.size_name || 'Mặc định'}
                    </Text>
                    {item.item_note && (
                      <Text style={styles.metaText}>
                        Ghi chú: {item.item_note}
                      </Text>
                    )}
                  </View>

                  <View style={styles.bottomRow}>
                    <View style={styles.priceRow}>
                      <Text style={styles.price}>
                        {formatPriceWithCurrency(item.subtotal)}
                      </Text>
                    </View>

                    <View style={styles.qtyRow}>
                      <TouchableOpacity
                        onPress={async () => {
                          console.log('Minus button pressed for item:', item.id);
                          if (item.quantity - 1 <= 0) {
                            await removeByKey(key);
                          } else {
                            await updateQuantity(key, item.quantity - 1);
                          }
                        }}
                        style={styles.minusBtn}
                      >
                        <Minus size={16} color="#391713" />
                      </TouchableOpacity>
                      <Text style={styles.qty}>{item.quantity}</Text>
                      <TouchableOpacity
                        onPress={async () => {
                          console.log('Plus button pressed for item:', item.id);
                          await updateQuantity(key, item.quantity + 1);
                        }}
                        style={styles.plusBtn}
                      >
                        <Plus size={16} color="#fff" />
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            </View>
          );
        })}
      </View>
    );
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
            <View style={{ flex: 1 }}>
              <FlatList
                data={Object.entries(groupedItems)}
                keyExtractor={([storeName]) => storeName}
                contentContainerStyle={{ paddingBottom: 140 }}
                renderItem={({ item: [storeName, items] }) => 
                  renderStoreGroup(storeName, items)
                }
              />
            </View>
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
                  ? `Đặt hàng (${getSelectedItemsCount()} món) • ${formatPriceWithCurrency(getTotalPrice())}`
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

  // Store grouping styles
  storeGroup: {
    backgroundColor: "#f8f9fa",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#e9ecef",
  },
  storeHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#dee2e6",
  },
  storeHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  storeName: {
    color: "#391713",
    fontFamily: Fonts.LeagueSpartanBold,
    fontSize: 16,
  },
  storeTotal: {
    color: "#e95322",
    fontFamily: Fonts.LeagueSpartanExtraBold,
    fontSize: 16,
  },

  row: { flexDirection: "row", alignItems: "center", paddingVertical: 12, gap: 12 },
  rowWithBorder: {
    borderBottomWidth: 1,
    borderBottomColor: "#f1f3f5",
    marginBottom: 8,
    paddingBottom: 16,
  },
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
  checkboxPartial: { backgroundColor: "#fef3c7", borderColor: "#f59e0b" },
  partialIndicator: {
    width: 8,
    height: 8,
    backgroundColor: "#f59e0b",
    borderRadius: 2,
  },
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
  metaBox: { gap: 2, marginBottom: 8 },
  metaText: { color: "#4b5563", fontSize: 13, fontFamily: Fonts.LeagueSpartanRegular },
  bottomRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },

  priceRow: { flexDirection: "row", alignItems: "center", gap: 8 },
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