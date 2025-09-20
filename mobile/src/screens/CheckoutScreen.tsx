import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from 'expo-secure-store';
import { formatPriceWithCurrency } from "@/utils/priceUtils";
import { useNavigation, useRoute, useFocusEffect } from "@react-navigation/native";
import {
  Banknote,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  Gift,
  MapPin,
  Percent,
  Plus,
  Smartphone,
  Tag,
  Truck,
  X,
} from "lucide-react-native";
import React, { useEffect, useMemo, useState, useCallback } from "react";
import {
  FlatList,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { IMAGE_MAP, type ImageName } from "@/assets/imageMap";
import { Fonts } from "@/constants/Fonts";
import { API_CONFIG, ENDPOINTS, STORAGE_KEYS } from "@/constants";
import { CartItem as APICartItem } from "@/types";
import { authService, cartService, ordersService } from "@/services";

// User profile interface
interface UserProfile {
  id: number;
  username: string;
  email: string;
  fullname?: string;
  phone_number?: string;
  address?: string;
}

// Enhanced API CartItem interface to match actual API response
interface APICartItemWithSize {
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

type CartItem = {
  id: number;
  food_id: number; // Add food_id for API calls
  name: string;
  restaurant: string;
  price: number;
  originalPrice?: number;
  image: ImageName | string;
  quantity: number;
  size: string;
  toppings: string[];
  totalPrice: number;
  note: string;
};

type GroupedItems = {
  [storeName: string]: CartItem[];
};

type PaymentMethod = {
  id: "cod" | "card" | "bank";
  name: string;
  icon: "cod" | "card" | "bank";
  type: "cod" | "ewallet" | "card";
};

type Voucher = {
  id: string;
  code?: string;
  title: string;
  type: "PERCENT" | "AMOUNT" | "FREESHIP";
  value: number;
  maxDiscount?: number;
  minOrder: number;
  scope: "GLOBAL" | "RESTAURANT" | "CATEGORY" | "AREA";
  scopeRefIds?: string[];
  requirePayment?: "COD" | "MOMO" | "ZALO" | "CARD";
  startAt: number;
  endAt: number;
  maxUsagePerUser?: number;
  usedCount?: number;
  combinableWith?: string[];
  restaurantName?: string;
  estimatedSaving?: number;
  eligible?: boolean;
  isExpiringSoon?: boolean;
  category: "FREESHIP" | "RESTAURANT" | "APP";
};

type SelectedVouchers = {
  freeship?: Voucher;
  restaurant?: Voucher;
  app?: Voucher;
};

function getImageSource(img?: ImageName | string) {
  console.log('getImageSource - Input:', img);
  
  if (!img) {
    console.log('getImageSource - No image provided, using default');
    return require("@/assets/images/gourmet-burger.png");
  }
  
  // First, check if it's a local image name in IMAGE_MAP
  if (typeof img === "string" && (IMAGE_MAP as any)[img]) {
    console.log('getImageSource - Found in IMAGE_MAP:', img);
    return (IMAGE_MAP as any)[img];
  }
  
  // If it's a full URL (http/https), use it directly
  if (typeof img === "string" && /^https?:\/\//i.test(img)) {
    console.log('getImageSource - Full URL detected:', img);
    return { uri: img };
  }
  
  // If it's a relative path from backend API starting with /media/, use it directly
  if (typeof img === "string" && img.startsWith("/media/")) {
    const baseUrl = API_CONFIG.BASE_URL.replace("/api", ""); // Remove /api from base URL
    const fullUrl = `${baseUrl}${img}`;
    console.log('getImageSource - Media path detected, constructed URL:', fullUrl);
    return { uri: fullUrl };
  }
  
  // If it's a path starting with "assets/", prepend with /media/
  if (typeof img === "string" && img.startsWith("assets/")) {
    const baseUrl = API_CONFIG.BASE_URL.replace("/api", ""); // Remove /api from base URL
    const fullUrl = `${baseUrl}/media/${img}`;
    console.log('getImageSource - Assets path detected, constructed URL:', fullUrl);
    return { uri: fullUrl };
  }
  
  // If it's a relative path with leading slash, construct full URL
  if (typeof img === "string" && img.startsWith("/")) {
    const baseUrl = API_CONFIG.BASE_URL.replace("/api", ""); // Remove /api from base URL
    const fullUrl = `${baseUrl}${img}`;
    console.log('getImageSource - Relative path with slash, constructed URL:', fullUrl);
    return { uri: fullUrl };
  }
  
  // If it's a relative path without leading slash, add it with /media/ prefix
  if (typeof img === "string" && !img.startsWith("/") && !img.includes("://")) {
    const baseUrl = API_CONFIG.BASE_URL.replace("/api", ""); // Remove /api from base URL
    const fullUrl = `${baseUrl}/media/${img}`;
    console.log('getImageSource - Relative path without slash, constructed URL:', fullUrl);
    return { uri: fullUrl };
  }
  
  // Fallback to default image if nothing else works
  console.log('getImageSource - Using fallback default image for:', img);
  return require("@/assets/images/gourmet-burger.png");
}

type Nav = any;

export default function CheckoutScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<any>();
  const { selectedIds, selectedCartItems } = (route?.params ?? {}) as { 
    selectedIds: number[]; 
    selectedCartItems?: any[];
  };
  const insets = useSafeAreaInsets();

  console.log('CheckoutScreen - DIRECT route params check:', route?.params?.selectedCartItems?.length || 0);
  
  const [selectedItems, setSelectedItems] = useState<CartItem[]>([]);
  const [itemNotes, setItemNotes] = useState<{[key: string]: string}>({});
  const [foodIdMap, setFoodIdMap] = useState<{[key: string]: number}>({});
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);

  const [deliveryFee] = useState<number>(20000);
  const [tax] = useState<number>(0);
  const [selectedVouchers, setSelectedVouchers] = useState<SelectedVouchers>({});
  const [selectedPayment, setSelectedPayment] = useState<"cod" | "card" | "bank">("cod");
  const [showPaymentMethods, setShowPaymentMethods] = useState(false);
  const [selectedCard, setSelectedCard] = useState("****1234");
  const [selectedBankAccount, setSelectedBankAccount] = useState("****5678");
  const [promoCode, setPromoCode] = useState("");
  const [showPromoInput, setShowPromoInput] = useState(false);
  const [showOrderNotification, setShowOrderNotification] = useState(false);

  const [customerInfo, setCustomerInfo] = useState({
    name: "",
    phone: "",
    address: "",
    note: "",
  });

  const paymentMethods: PaymentMethod[] = [
    { id: "cod", name: "Tiền mặt khi nhận hàng", icon: "cod", type: "cod" },
    { id: "card", name: "Thẻ ngân hàng", icon: "card", type: "card" },
    { id: "bank", name: "Tài khoản ngân hàng", icon: "bank", type: "ewallet" },
  ];

  // Function to fetch user profile
  const fetchUserProfile = async () => {
    try {
      setIsLoadingProfile(true);
      console.log('Fetching user profile...');
      
      const userData: UserProfile = await authService.getProfile();
      console.log('User profile loaded:', userData);
      
      setCustomerInfo({
        name: userData.fullname || userData.username || '',
        phone: userData.phone_number || '',
        address: userData.address || '',
        note: '',
      });
    } catch (error) {
      console.error('Error fetching user profile:', error);
    } finally {
      setIsLoadingProfile(false);
    }
  };

  // Set selectedItems from route params
  useEffect(() => {
    console.log('CheckoutScreen - Setting items from route params');

    const routeParams = route?.params || {};
    const { selectedCartItems: paramSelectedCartItems } = routeParams;

    console.log('CheckoutScreen - Route params selectedCartItems:', paramSelectedCartItems?.length || 0);

    if (paramSelectedCartItems && Array.isArray(paramSelectedCartItems) && paramSelectedCartItems.length > 0) {
      console.log('CheckoutScreen - Converting', paramSelectedCartItems.length, 'items to checkout format');

      const checkoutItems: CartItem[] = paramSelectedCartItems.map((item: APICartItemWithSize) => {
        console.log('CheckoutScreen - Processing item image:', item.food.image);
        return {
          id: item.id,
          food_id: item.food_id, // Store food_id for API calls
          name: item.food.title,
          restaurant: item.food.store?.store_name || 'Unknown Restaurant',
          price: item.subtotal / item.quantity,
          image: item.food.image,
          quantity: item.quantity,
          size: item.size?.size_name || 'Regular',
          toppings: [],
          totalPrice: item.subtotal,
          note: item.item_note || '',
        };
      });

      console.log('CheckoutScreen - Converted checkout items:', checkoutItems.length, 'items');
      setSelectedItems(checkoutItems);

      // Initialize item notes from existing data - Map both item.id -> note and food_id -> item.id for later use
      const initialNotes: {[key: string]: string} = {};
      const foodIdMap: {[key: string]: number} = {}; // Map to store food_id for each item.id
      
      checkoutItems.forEach(item => {
        initialNotes[`${item.id}`] = item.note;
        foodIdMap[`${item.id}`] = item.food_id;
      });
      
      setItemNotes(initialNotes);
      
      // Store the mapping in state for later API calls
      setFoodIdMap(foodIdMap);
    } else {
      console.log('CheckoutScreen - No valid selectedCartItems in route params');
      setSelectedItems([]);
    }
  }, [route.params?.selectedCartItems]);

  // Group items by store
  const groupedItems: GroupedItems = useMemo(() => {
    return selectedItems.reduce((groups, item) => {
      const storeName = item.restaurant;
      if (!groups[storeName]) {
        groups[storeName] = [];
      }
      groups[storeName].push(item);
      return groups;
    }, {} as GroupedItems);
  }, [selectedItems]);

  useEffect(() => {
    // Load user profile when component mounts
    fetchUserProfile();
    
    // Load saved vouchers
    (async () => {
      try {
        const savedVouchers = await AsyncStorage.getItem("selectedVouchers");
        if (savedVouchers) setSelectedVouchers(JSON.parse(savedVouchers));
      } catch {}
    })();
  }, []);

  // Reload user profile when screen comes into focus (after returning from Profile screen)
  useFocusEffect(
    useCallback(() => {
      fetchUserProfile();
    }, [])
  );

  const getSubtotal = useMemo(
    () => () => parseFloat((selectedItems.reduce((sum, it) => sum + it.totalPrice, 0)).toFixed(3)),
    [selectedItems]
  );

  const getTotalDiscount = useMemo(
    () => () => {
      const subtotal = getSubtotal();
      let total = 0;
      if (selectedVouchers.freeship) {
        total += Math.min(selectedVouchers.freeship.value, deliveryFee);
      }
      if (selectedVouchers.restaurant) {
        const v = selectedVouchers.restaurant;
        if (v.type === "PERCENT") {
          total += Math.min(Math.floor(subtotal * v.value), v.maxDiscount ?? Number.POSITIVE_INFINITY);
        } else if (v.type === "AMOUNT") {
          total += Math.min(v.value, subtotal);
        }
      }
      if (selectedVouchers.app) {
        const v = selectedVouchers.app;
        if (v.type === "PERCENT") {
          total += Math.min(Math.floor(subtotal * v.value), v.maxDiscount ?? Number.POSITIVE_INFINITY);
        } else if (v.type === "AMOUNT") {
          total += Math.min(v.value, subtotal);
        }
      }
      return parseFloat(total.toFixed(3));
    },
    [selectedVouchers, deliveryFee, getSubtotal]
  );

  const getFinalTotal = useMemo(
    () => () => parseFloat((getSubtotal() + deliveryFee + tax - getTotalDiscount()).toFixed(3)),
    [getSubtotal, deliveryFee, tax, getTotalDiscount]
  );

  const getVoucherIcon = (category: Voucher["category"]) => {
    if (category === "FREESHIP") return <Truck size={16} color="#2563eb" />;
    if (category === "RESTAURANT") return <Gift size={16} color="#16a34a" />;
    if (category === "APP") return <Percent size={16} color="#ea580c" />;
    return <Tag size={16} color="#6b7280" />;
  };

  const getVoucherPillStyle = (category: Voucher["category"]) => {
    if (category === "FREESHIP") return styles.pillBlue;
    if (category === "RESTAURANT") return styles.pillGreen;
    if (category === "APP") return styles.pillOrange;
    return styles.pillGray;
  };

  const removeVoucher = async (key: keyof SelectedVouchers) => {
    const next = { ...selectedVouchers };
    delete (next as any)[key];
    setSelectedVouchers(next);
    await AsyncStorage.setItem("selectedVouchers", JSON.stringify(next));
  };

  const applyPromoCode = () => {
    if (promoCode.trim().length > 0) {
      setShowPromoInput(false);
    }
  };

  const getPaymentDisplayText = () => {
    switch (selectedPayment) {
      case "cod":
        return "Tiền mặt khi nhận hàng";
      case "card":
        return `Thẻ ngân hàng ${selectedCard}`;
      case "bank":
        return `Tài khoản ngân hàng ${selectedBankAccount}`;
    }
  };

  const handlePaymentChange = (type: "card" | "bank") => {
    if (type === "card") navigation.navigate("CardPayment");
    if (type === "bank") navigation.navigate("BankPayment");
  };

  const updateItemNote = (itemId: number, note: string) => {
    setItemNotes(prev => ({
      ...prev,
      [itemId]: note
    }));
  };

  // Function to update item notes in cart before placing order
  const updateItemNotesInCart = async () => {
    try {
      const updatePromises = Object.entries(itemNotes).map(async ([itemId, note]) => {
        if (note && note.trim()) {
          try {
            // Use the food_id instead of cart item id
            const food_id = foodIdMap[itemId];
            if (!food_id) {
              console.error(`No food_id found for item ${itemId}`);
              return false;
            }
            
            console.log(`Updating note for item ${itemId} with food_id ${food_id}: "${note.trim()}"`);
            await cartService.updateCartItem(food_id, { item_note: note.trim() });
            return true;
          } catch (error) {
            console.error(`Failed to update note for item ${itemId}:`, error);
            return false;
          }
        }
        return true;
      });

      const results = await Promise.all(updatePromises);
      if (!results.every(result => result === true)) {
        console.error('Failed to update some item notes');
      }
      return results.every(result => result === true);
    } catch (error) {
      console.error('Error updating item notes:', error);
      return false;
    }
  };

  const handlePlaceOrder = async () => {
    try {
      // First, update item notes in cart
      console.log('Updating item notes in cart...');
      const notesUpdated = await updateItemNotesInCart();
      if (!notesUpdated) {
        console.error('Failed to update some item notes, but continuing with order creation');
        // Continue anyway - we'll display a toast later
      }

      setShowOrderNotification(true);

      // Map frontend payment method to backend values
      const paymentMethodMap: Record<string, 'cash' | 'vnpay' | 'momo'> = {
        'cod': 'cash',
        'card': 'vnpay',
        'bank': 'momo'
      };

      // Send order data in format expected by backend API
      const orderData = {
        receiver_name: customerInfo.name,
        phone_number: customerInfo.phone,
        ship_address: customerInfo.address,
        note: customerInfo.note || '',
        payment_method: paymentMethodMap[selectedPayment],
        total_money: getFinalTotal()
      };

      console.log('Sending order data:', orderData);

      const order = await ordersService.createOrder(orderData);
      console.log('Order created successfully:', order);
      
      setTimeout(async () => {
        setShowOrderNotification(false);
        if (!notesUpdated) {
          // Show error toast about notes not being saved
          Alert.alert(
            'Thông báo',
            'Đặt hàng thành công, nhưng ghi chú cho một số món không được lưu.',
            [{ text: 'OK', onPress: () => navigation.navigate("Home") }]
          );
        } else {
          navigation.navigate("Home");
        }
      }, 1500);
    } catch (error) {
      console.error('Error creating order:', error);
      setShowOrderNotification(false);
      Alert.alert(
        'Lỗi',
        'Đã xảy ra lỗi khi đặt hàng. Vui lòng thử lại.',
        [{ text: 'OK' }]
      );
    }
  };

  const renderStoreGroup = (storeName: string, items: CartItem[]) => {
    const storeTotal = parseFloat((items.reduce((sum, item) => sum + item.totalPrice, 0)).toFixed(3));

    return (
      <View key={storeName} style={styles.storeGroup}>
        <View style={styles.storeHeader}>
          <Text style={styles.storeName}>{storeName}</Text>
          <Text style={styles.storeTotal}>{formatPriceWithCurrency(storeTotal)}</Text>
        </View>
        
        {items.map((item) => (
          <View key={item.id} style={styles.cartItemRow}>
            <Image 
              source={getImageSource(item.image)} 
              style={styles.cartItemImg}
              defaultSource={require("@/assets/images/gourmet-burger.png")}
              onError={(error) => {
                console.log('Image load error for item:', item.id, error.nativeEvent);
              }}
            />
            <View style={{ flex: 1 }}>
              <Text style={styles.cartItemName}>{item.name}</Text>
              <Text style={styles.cartItemMeta}>Size: {item.size}</Text>
              {item.toppings.length > 0 && (
                <Text style={styles.cartItemMeta}>Topping: {item.toppings.join(", ")}</Text>
              )}
              
              {/* Note input for each item */}
              <View style={styles.noteContainer}>
                <TextInput
                  style={styles.noteInput}
                  placeholder="Ghi chú cho món này..."
                  placeholderTextColor="#9ca3af"
                  value={itemNotes[item.id] || ''}
                  onChangeText={(text) => updateItemNote(item.id, text)}
                  multiline={true}
                  numberOfLines={2}
                />
              </View>
            </View>
            <View style={{ alignItems: "flex-end" }}>
              <Text style={styles.cartItemQty}>x{item.quantity}</Text>
              <Text style={styles.cartItemPrice}>{formatPriceWithCurrency(item.totalPrice)}</Text>
            </View>
          </View>
        ))}
      </View>
    );
  };

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBackBtn}>
          <ChevronLeft size={24} color="#391713" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Thanh toán</Text>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === "ios" ? 12 : 0}
      >
        <ScrollView
          style={styles.contentWrap}
          contentContainerStyle={{ paddingBottom: 160 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Giao hàng đến */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Giao hàng đến</Text>

            <View style={styles.addressCard}>
              <View style={styles.addressRow}>
                <View style={styles.addrIconWrap}>
                  <MapPin size={16} color="#fff" />
                </View>

                <View style={{ flex: 1 }}>
                  {isLoadingProfile ? (
                    <>
                      <Text style={styles.addrNamePhone}>Đang tải thông tin...</Text>
                      <Text style={styles.addrDetail}>Vui lòng đợi</Text>
                    </>
                  ) : (
                    <>
                      <Text style={styles.addrNamePhone}>
                        {customerInfo.name || 'Chưa có tên'} - {customerInfo.phone || 'Chưa có SĐT'}
                      </Text>
                      <Text style={styles.addrDetail}>
                        {customerInfo.address || 'Chưa có địa chỉ - Vui lòng cập nhật trong Profile'}
                      </Text>
                    </>
                  )}
                </View>

                <TouchableOpacity onPress={() => navigation.navigate("Profile")} hitSlop={10}>
                  <ChevronRight size={18} color="#9ca3af" />
                </TouchableOpacity>
              </View>

              <View style={styles.addrNoteWrap}>
                <TextInput
                  placeholder="Ghi chú cho shipper (ví dụ: gọi trước khi đến)"
                  placeholderTextColor="#9ca3af"
                  value={customerInfo.note}
                  onChangeText={(t) => setCustomerInfo((old) => ({ ...old, note: t }))}
                  style={styles.addrNoteInput}
                />
              </View>
            </View>
          </View>

          {/* Món ăn đã chọn - Grouped by Store */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Món ăn đã chọn ({selectedItems.length} items)</Text>

            <View>
              {Object.entries(groupedItems).map(([storeName, items]) => 
                renderStoreGroup(storeName, items)
              )}
            </View>
          </View>

          {/* Chi phí & khuyến mãi */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Chi phí & khuyến mãi</Text>

            <View style={{ gap: 12 }}>
              <Row label="Tạm tính" value={`${getSubtotal().toLocaleString()}đ`} />
              <Row label="Phí giao hàng" value={`${deliveryFee.toLocaleString()}đ`} />
              {tax > 0 && <Row label="Thuế" value={`${tax.toLocaleString()}đ`} />}

              <View style={styles.divider} />
              {!showPromoInput ? (
                <TouchableOpacity
                  onPress={() => navigation.navigate("Discount")}
                  style={styles.promoRow}
                >
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <Tag size={16} color="#e95322" />
                    <Text style={styles.promoText}>Mã giảm giá</Text>
                  </View>
                  <ChevronRight size={16} color="#9ca3af" />
                </TouchableOpacity>
              ) : (
                <View style={styles.promoInputRow}>
                  <TextInput
                    value={promoCode}
                    onChangeText={setPromoCode}
                    placeholder="Nhập mã giảm giá"
                    placeholderTextColor="#9ca3af"
                    style={styles.promoInput}
                  />
                  <TouchableOpacity onPress={applyPromoCode} style={styles.applyBtn}>
                    <Text style={styles.applyBtnText}>Áp dụng</Text>
                  </TouchableOpacity>
                </View>
              )}

              {(selectedVouchers.freeship || selectedVouchers.restaurant || selectedVouchers.app) && (
                <View style={{ marginTop: 8 }}>
                  <Text style={styles.appliedTitle}>Mã giảm giá đã áp dụng:</Text>

                  {selectedVouchers.freeship && (
                    <AppliedVoucherRow
                      pillStyle={getVoucherPillStyle(selectedVouchers.freeship.category)}
                      icon={getVoucherIcon(selectedVouchers.freeship.category)}
                      title={selectedVouchers.freeship.title}
                      saving={`-${Math.min(selectedVouchers.freeship.value, deliveryFee).toLocaleString()}đ`}
                      onRemove={() => removeVoucher("freeship")}
                    />
                  )}

                  {selectedVouchers.restaurant && (
                    <AppliedVoucherRow
                      pillStyle={getVoucherPillStyle(selectedVouchers.restaurant.category)}
                      icon={getVoucherIcon(selectedVouchers.restaurant.category)}
                      title={selectedVouchers.restaurant.title}
                      saving={`-${(selectedVouchers.restaurant.estimatedSaving ?? 0).toLocaleString()}đ`}
                      onRemove={() => removeVoucher("restaurant")}
                    />
                  )}

                  {selectedVouchers.app && (
                    <AppliedVoucherRow
                      pillStyle={getVoucherPillStyle(selectedVouchers.app.category)}
                      icon={getVoucherIcon(selectedVouchers.app.category)}
                      title={selectedVouchers.app.title}
                      saving={`-${(selectedVouchers.app.estimatedSaving ?? 0).toLocaleString()}đ`}
                      onRemove={() => removeVoucher("app")}
                    />
                  )}

                  <View style={styles.totalSavingRow}>
                    <Text style={styles.totalSavingLabel}>Tổng tiết kiệm</Text>
                    <Text style={styles.totalSavingValue}>-{getTotalDiscount().toLocaleString()}đ</Text>
                  </View>
                </View>
              )}
            </View>
          </View>

          {/* Phương thức thanh toán */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Phương thức thanh toán</Text>

            <View style={styles.paymentCard}>
              <TouchableOpacity
                onPress={() => setShowPaymentMethods((s) => !s)}
                style={styles.paymentHead}
                activeOpacity={0.8}
              >
                <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                  {selectedPayment === "cod" && <Banknote size={20} color="#e95322" />}
                  {selectedPayment === "card" && <CreditCard size={20} color="#e95322" />}
                  {selectedPayment === "bank" && <Smartphone size={20} color="#e95322" />}
                  <Text style={styles.paymentHeadText}>{getPaymentDisplayText()}</Text>
                </View>
                <ChevronRight
                  size={20}
                  color="#9ca3af"
                  style={{ transform: [{ rotate: showPaymentMethods ? "90deg" : "0deg" }] }}
                />
              </TouchableOpacity>

              {showPaymentMethods && (
                <View style={styles.paymentList}>
                  {paymentMethods.map((m) => {
                    const active = selectedPayment === m.id;
                    return (
                      <TouchableOpacity
                        key={m.id}
                        onPress={() => {
                          setSelectedPayment(m.id);
                          setShowPaymentMethods(false);
                        }}
                        style={[styles.payItem, active ? styles.payItemActive : styles.payItemInactive]}
                        activeOpacity={0.9}
                      >
                        <View style={{ width: 22 }}>
                          {m.icon === "cod" && <Banknote size={20} color={active ? "#e95322" : "#6b7280"} />}
                          {m.icon === "card" && <CreditCard size={20} color={active ? "#e95322" : "#6b7280"} />}
                          {m.icon === "bank" && <Smartphone size={20} color={active ? "#e95322" : "#6b7280"} />}
                        </View>
                        <Text style={[styles.payItemText, active && { color: "#e95322" }]}>{m.name}</Text>
                        <View style={[styles.radio, active ? styles.radioActive : styles.radioInactive]}>
                          {active && <View style={styles.radioDot} />}
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}

              {(selectedPayment === "card" || selectedPayment === "bank") && (
                <TouchableOpacity
                  onPress={() => handlePaymentChange(selectedPayment)}
                  style={styles.changeLine}
                  activeOpacity={0.8}
                >
                  <Text style={styles.changeLineText}>
                    {selectedPayment === "card" ? `Số thẻ: ${selectedCard}` : `Số tài khoản: ${selectedBankAccount}`}
                  </Text>
                  <Text style={styles.changeLineAction}>Thay đổi</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Tổng cộng */}
          <View style={styles.section}>
            <View style={styles.summaryBox}>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Tổng cộng</Text>
                <Text style={styles.summaryValue}>{getFinalTotal().toLocaleString()}đ</Text>
              </View>
              <Text style={styles.summaryNote}>
                Bằng việc đặt hàng, bạn đồng ý với <Text style={styles.link}>Điều khoản sử dụng</Text> và{" "}
                <Text style={styles.link}>Chính sách hủy đơn</Text>
              </Text>
            </View>
          </View>
        </ScrollView>

        <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 12) }]}>
          <TouchableOpacity onPress={handlePlaceOrder} style={styles.primaryBtn} activeOpacity={0.9}>
            <Text style={styles.primaryBtnText}>Đặt hàng • {getFinalTotal().toLocaleString()}đ</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {showOrderNotification ? (
        <View pointerEvents="none" style={styles.toast}>
          <Text style={styles.toastText}>Đặt hàng thành công!</Text>
        </View>
      ) : null}
    </View>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

function AppliedVoucherRow({
  pillStyle,
  icon,
  title,
  saving,
  onRemove,
}: {
  pillStyle: any;
  icon: React.ReactNode;
  title: string;
  saving: string;
  onRemove: () => void;
}) {
  return (
    <View style={styles.voucherRow}>
      <View style={styles.voucherLeft}>
        <View style={[styles.voucherPill, pillStyle]}>{icon}</View>
        <Text style={styles.voucherTitle}>{title}</Text>
      </View>
      <View style={styles.voucherRight}>
        <Text style={styles.voucherSaving}>{saving}</Text>
        <TouchableOpacity onPress={onRemove} hitSlop={8}>
          <X size={16} color="#ef4444" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const BG_YELLOW = "#f5cb58";
const BROWN = "#391713";
const ACCENT = "#e95322";

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG_YELLOW },

  header: {
    backgroundColor: BG_YELLOW,
    paddingHorizontal: 24,
    paddingTop: 40,
    paddingBottom: 20,
    flexDirection: "row",
    alignItems: "center",
  },
  headerBackBtn: { marginRight: 12, padding: 4 },
  headerTitle: { color: "#fff", fontSize: 20, fontFamily: Fonts.LeagueSpartanBold },

  contentWrap: {
    flex: 1,
    backgroundColor: "#fff",
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingHorizontal: 24,
    paddingTop: 24,
    marginTop: -12,
  },

  section: { marginBottom: 24 },
  sectionTitle: { color: BROWN, fontFamily: Fonts.LeagueSpartanExtraBold, fontSize: 16, marginBottom: 12 },

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
  storeName: {
    color: BROWN,
    fontFamily: Fonts.LeagueSpartanBold,
    fontSize: 16,
  },
  storeTotal: {
    color: ACCENT,
    fontFamily: Fonts.LeagueSpartanExtraBold,
    fontSize: 16,
  },

  addressCard: { backgroundColor: "#fff", borderRadius: 16, padding: 16, borderWidth: 1, borderColor: "#f3f4f6" },
  addressRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  addrIconWrap: { width: 32, height: 32, borderRadius: 16, backgroundColor: ACCENT, alignItems: "center", justifyContent: "center" },
  addrNamePhone: { color: BROWN, fontFamily: Fonts.LeagueSpartanSemiBold, fontSize: 14.5 },
  addrDetail: { color: "#4b5563", fontFamily: Fonts.LeagueSpartanRegular, fontSize: 13 },
  addrNoteWrap: { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: "#f3f4f6" },
  addrNoteInput: { fontSize: 13, color: "#4b5563", paddingHorizontal: 12, paddingVertical: 10, borderRadius: 10, backgroundColor: "#f9fafb", fontFamily: Fonts.LeagueSpartanRegular },

  cartItemRow: { 
    flexDirection: "row", 
    gap: 12, 
    paddingVertical: 12, 
    alignItems: "flex-start",
    borderBottomWidth: 1,
    borderBottomColor: "#f1f3f5",
  },
  cartItemImg: { width: 64, height: 64, borderRadius: 12, backgroundColor: "#eee" },
  cartItemName: { color: BROWN, fontFamily: Fonts.LeagueSpartanBold, fontSize: 14.5, marginBottom: 2 },
  cartItemMeta: { color: "#4b5563", fontFamily: Fonts.LeagueSpartanRegular, fontSize: 13 },
  cartItemQty: { color: BROWN, fontFamily: Fonts.LeagueSpartanRegular, fontSize: 13, marginBottom: 4 },
  cartItemPrice: { color: ACCENT, fontFamily: Fonts.LeagueSpartanExtraBold, fontSize: 14.5 },

  // Note input styles
  noteContainer: {
    marginTop: 8,
  },
  noteInput: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 13,
    color: "#4b5563",
    backgroundColor: "#f9fafb",
    fontFamily: Fonts.LeagueSpartanRegular,
    minHeight: 32,
  },

  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  rowLabel: { color: "#6b7280", fontFamily: Fonts.LeagueSpartanRegular },
  rowValue: { color: BROWN, fontFamily: Fonts.LeagueSpartanSemiBold },

  divider: { height: 1, backgroundColor: "#e5e7eb", marginTop: 8, marginBottom: 8 },

  promoRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  promoText: { color: ACCENT, fontFamily: Fonts.LeagueSpartanSemiBold },

  promoInputRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  promoInput: {
    flex: 1,
    borderWidth: 1, borderColor: "#d1d5db",
    borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 10,
    fontSize: 13,
    color: "#111827",
    fontFamily: Fonts.LeagueSpartanRegular,
  },
  applyBtn: { backgroundColor: ACCENT, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10 },
  applyBtnText: { color: "#fff", fontFamily: Fonts.LeagueSpartanBold, fontSize: 13 },

  appliedTitle: { color: BROWN, fontFamily: Fonts.LeagueSpartanSemiBold, fontSize: 13, marginBottom: 6 },
  voucherRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: "#f9fafb", borderRadius: 10, padding: 10, marginBottom: 6 },
  voucherLeft: { flexDirection: "row", alignItems: "center", gap: 8, flexShrink: 1 },
  voucherPill: { width: 24, height: 24, borderRadius: 6, alignItems: "center", justifyContent: "center" },
  voucherTitle: { color: "#111827", fontSize: 13, fontFamily: Fonts.LeagueSpartanSemiBold },
  voucherRight: { flexDirection: "row", alignItems: "center", gap: 10 },
  voucherSaving: { color: "#16a34a", fontFamily: Fonts.LeagueSpartanBold, fontSize: 13 },
  pillBlue: { backgroundColor: "#dbeafe" },
  pillGreen: { backgroundColor: "#dcfce7" },
  pillOrange: { backgroundColor: "#ffedd5" },
  pillGray: { backgroundColor: "#f3f4f6" },

  totalSavingRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingTop: 8, borderTopWidth: 1, borderTopColor: "#e5e7eb" },
  totalSavingLabel: { color: "#16a34a", fontFamily: Fonts.LeagueSpartanSemiBold },
  totalSavingValue: { color: "#16a34a", fontFamily: Fonts.LeagueSpartanBold },

  paymentCard: { backgroundColor: "#fff", borderRadius: 16, borderWidth: 1, borderColor: "#f3f4f6" },
  paymentHead: { paddingHorizontal: 16, paddingVertical: 14, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  paymentHeadText: { color: BROWN, fontFamily: Fonts.LeagueSpartanSemiBold },
  paymentList: { borderTopWidth: 1, borderTopColor: "#f3f4f6", padding: 12, gap: 8 },

  payItem: { borderRadius: 12, padding: 12, flexDirection: "row", alignItems: "center", gap: 12 },
  payItemActive: { backgroundColor: "rgba(233,83,34,0.05)", borderWidth: 1, borderColor: ACCENT },
  payItemInactive: { backgroundColor: "#f9fafb" },
  payItemText: { color: BROWN, fontFamily: Fonts.LeagueSpartanSemiBold, flex: 1 },
  radio: { width: 16, height: 16, borderRadius: 8, borderWidth: 2, alignItems: "center", justifyContent: "center" },
  radioActive: { borderColor: ACCENT, backgroundColor: ACCENT },
  radioInactive: { borderColor: "#d1d5db" },
  radioDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#fff" },

  changeLine: { borderTopWidth: 1, borderTopColor: "#f3f4f6", paddingVertical: 12, paddingHorizontal: 16, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  changeLineText: { color: "#6b7280", fontSize: 13, fontFamily: Fonts.LeagueSpartanRegular },
  changeLineAction: { color: ACCENT, fontSize: 13, fontFamily: Fonts.LeagueSpartanBold },

  summaryBox: { backgroundColor: "#f9fafb", borderRadius: 16, padding: 16 },
  summaryRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 },
  summaryLabel: { color: BROWN, fontFamily: Fonts.LeagueSpartanExtraBold, fontSize: 16 },
  summaryValue: { color: ACCENT, fontFamily: Fonts.LeagueSpartanExtraBold, fontSize: 18 },
  summaryNote: { color: "#6b7280", fontSize: 12, lineHeight: 18, fontFamily: Fonts.LeagueSpartanRegular },
  link: { color: ACCENT, textDecorationLine: "underline", fontFamily: Fonts.LeagueSpartanBold },

  bottomBar: { position: "absolute", left: 0, right: 0, bottom: -48, borderTopWidth: 1, borderTopColor: "#e5e7eb", backgroundColor: "#fff", paddingHorizontal: 24, paddingTop: 12 },
  primaryBtn: { backgroundColor: ACCENT, borderRadius: 16, paddingVertical: 16, alignItems: "center", justifyContent: "center" },
  primaryBtnText: { color: "#fff", fontFamily: Fonts.LeagueSpartanExtraBold, fontSize: 16 },

  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  modalSheet: { backgroundColor: "#fff", borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 20, paddingTop: 16, maxHeight: "80%" },
  modalHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  modalTitle: { color: BROWN, fontSize: 18, fontFamily: Fonts.LeagueSpartanExtraBold },
  addrItem: { padding: 14, borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 16 },
  addrItemName: { color: BROWN, fontFamily: Fonts.LeagueSpartanBold },
  addrBadge: { backgroundColor: ACCENT, color: "#fff", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999, fontSize: 11, fontFamily: Fonts.LeagueSpartanBold },
  addrItemText: { color: "#4b5563", fontSize: 13, fontFamily: Fonts.LeagueSpartanRegular },
  addAddrBtn: { borderWidth: 2, borderStyle: "dashed", borderColor: "#d1d5db", borderRadius: 16, paddingVertical: 14, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 8, marginBottom: 8 },
  addAddrText: { color: "#6b7280", fontFamily: Fonts.LeagueSpartanSemiBold },

  toast: { position: "absolute", left: 24, right: 24, bottom: 100, backgroundColor: "#111827", borderRadius: 14, paddingVertical: 12, alignItems: "center" },
  toastText: { color: "#fff", fontFamily: Fonts.LeagueSpartanBold },
});