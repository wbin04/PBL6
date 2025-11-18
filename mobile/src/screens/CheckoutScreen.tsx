import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from 'expo-secure-store';
import * as WebBrowser from 'expo-web-browser';
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
  Check,
} from "lucide-react-native";
import React, { useEffect, useMemo, useState, useCallback, useRef } from "react";
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
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { IMAGE_MAP, type ImageName } from "@/assets/imageMap";
import { Fonts } from "@/constants/Fonts";
import { API_CONFIG, ENDPOINTS, STORAGE_KEYS } from "@/constants";
import { CartItem as APICartItem, Promotion, AppliedPromo } from "@/types";
import { authService, cartService, ordersService, promotionsService, locationService } from "@/services";

// User profile interface
interface UserProfile {
  id: number;
  username: string;
  email: string;
  fullname?: string;
  phone_number?: string;
  address?: string;
  latitude?: number | string | null;
  longitude?: number | string | null;
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
      address?: string | null;
      latitude?: number | string | null;
      longitude?: number | string | null;
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
  storeId?: number;
  storeAddress?: string | null;
  storeLatitude?: number | null;
  storeLongitude?: number | null;
};

type StoreDeliveryInfo = {
  id: number;
  name: string;
  address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
};

type StoreDeliveryMetrics = {
  distanceKm: number | null;
  fee: number;
  store: StoreDeliveryInfo;
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

const SHIPPING_BASE_FEE = 15000;
const SHIPPING_FEE_PER_KM = 4000;
const EARTH_RADIUS_KM = 6371;

const parseCoordinate = (value: unknown): number | null => {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const numericValue = typeof value === 'string' ? parseFloat(value) : Number(value);
  return Number.isFinite(numericValue) ? numericValue : null;
};

const haversineDistanceKm = (
  originLat: number,
  originLng: number,
  destLat: number,
  destLng: number,
): number => {
  const dLat = ((destLat - originLat) * Math.PI) / 180;
  const dLon = ((destLng - originLng) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((originLat * Math.PI) / 180) *
      Math.cos((destLat * Math.PI) / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return EARTH_RADIUS_KM * c;
};

const formatDistanceLabel = (distanceKm: number | null) => {
  console.log("distance: ", distanceKm);
  if (distanceKm == null || Number.isNaN(distanceKm)) {
    return "Chưa xác định";
  }
  return `${distanceKm.toFixed(2)} km`;
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
  const [storeInfoMap, setStoreInfoMap] = useState<{[storeName: string]: StoreDeliveryInfo}>({});
  const [customerCoordinates, setCustomerCoordinates] = useState<{ latitude: number | null; longitude: number | null }>({
    latitude: null,
    longitude: null,
  });
  const [storeDeliveryDetails, setStoreDeliveryDetails] = useState<{ [storeName: string]: StoreDeliveryMetrics }>({});
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const geocodeCacheRef = useRef<{ [address: string]: { latitude: number; longitude: number } }>({});

  const [tax] = useState<number>(0);
  
  // Promo state
  const [availablePromos, setAvailablePromos] = useState<Promotion[]>([]);
  const [selectedPromos, setSelectedPromos] = useState<Promotion[]>([]);
  const [appliedPromos, setAppliedPromos] = useState<AppliedPromo[]>([]);
  const [showPromoModal, setShowPromoModal] = useState(false);
  const [isLoadingPromos, setIsLoadingPromos] = useState(false);
  
  const [selectedPayment, setSelectedPayment] = useState<"cod" | "card" | "bank">("cod");
  const [showPaymentMethods, setShowPaymentMethods] = useState(false);
  const [selectedCard, setSelectedCard] = useState("****1234");
  const [selectedBankAccount, setSelectedBankAccount] = useState("****5678");
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

      setCustomerCoordinates({
        latitude: parseCoordinate(userData.latitude),
        longitude: parseCoordinate(userData.longitude),
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

      // Build store info map from cart items
      const storeMap: {[storeName: string]: StoreDeliveryInfo} = {};
      paramSelectedCartItems.forEach((item: APICartItemWithSize) => {
        const storeName = item.food.store?.store_name || 'Unknown Restaurant';
        const storeLatitude = parseCoordinate(item.food.store?.latitude ?? null);
        const storeLongitude = parseCoordinate(item.food.store?.longitude ?? null);

        if (!storeMap[storeName]) {
          storeMap[storeName] = {
            id: item.food.store?.id || 0,
            name: storeName,
            address: item.food.store?.address || null,
            latitude: storeLatitude,
            longitude: storeLongitude,
          };
        }
      });
      setStoreInfoMap(storeMap);
      console.log('CheckoutScreen - Store map:', storeMap);

      const checkoutItems: CartItem[] = paramSelectedCartItems.map((item: APICartItemWithSize) => {
        console.log('CheckoutScreen - Processing item image:', item.food.image);
        const storeLatitude = parseCoordinate(item.food.store?.latitude ?? null);
        const storeLongitude = parseCoordinate(item.food.store?.longitude ?? null);
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
          storeId: item.food.store?.id ?? undefined,
          storeAddress: item.food.store?.address || null,
          storeLatitude,
          storeLongitude,
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
    
    // Don't load promos on mount - load when modal opens instead
  }, []);

  // Reload user profile when screen comes into focus (after returning from Profile screen)
  useFocusEffect(
    useCallback(() => {
      fetchUserProfile();
    }, [])
  );

  // Group items by store and calculate store subtotals
  const storeSubtotals = useMemo(() => {
    const subtotals: { [storeId: string]: number } = {};
    Object.entries(groupedItems).forEach(([storeName, items]) => {
      const storeId = items[0]?.restaurant || storeName; // Use first item's store info
      subtotals[storeId] = items.reduce((sum, item) => sum + item.totalPrice, 0);
    });
    return subtotals;
  }, [groupedItems]);

  const getSubtotal = useMemo(
    () => () => parseFloat((selectedItems.reduce((sum, it) => sum + it.totalPrice, 0)).toFixed(3)),
    [selectedItems]
  );

  // Calculate discount for each store
  const getStoreDiscount = useCallback((storeName: string) => {
    if (!appliedPromos || appliedPromos.length === 0) return 0;
    
    const storeItems = groupedItems[storeName];
    if (!storeItems || storeItems.length === 0) return 0;
    
    const storeSubtotal = storeItems.reduce((sum, item) => sum + item.totalPrice, 0);
    const totalCartAmount = getSubtotal();
    let storeDiscount = 0;

    appliedPromos.forEach(ap => {
      const promoStoreId = ap.promo?.store;
      
      // For store-specific promo, check if it matches this store
      // Note: We need to match by store name since we don't have store_id in CartItem
      if (promoStoreId && promoStoreId !== 0) {
        // Apply full discount to this store if it matches
        // In a real scenario, you'd match by store ID
        storeDiscount += ap.discount;
      } else if (promoStoreId === 0 && totalCartAmount > 0) {
        // System-wide promo - distribute proportionally
        const storeRatio = storeSubtotal / totalCartAmount;
        const systemDiscountForThisStore = ap.discount * storeRatio;
        storeDiscount += systemDiscountForThisStore;
      }
    });

    return storeDiscount;
  }, [appliedPromos, groupedItems, getSubtotal]);

  const getTotalDiscount = useMemo(
    () => () => {
      return appliedPromos.reduce((sum, ap) => sum + ap.discount, 0);
    },
    [appliedPromos]
  );

  const calculateDeliveryFee = useCallback((distanceKm: number | null) => {
    if (distanceKm == null || Number.isNaN(distanceKm)) {
      return SHIPPING_BASE_FEE;
    }
    const fee = SHIPPING_BASE_FEE + distanceKm * SHIPPING_FEE_PER_KM;
    return Math.max(SHIPPING_BASE_FEE, Math.round(fee));
  }, []);

  useEffect(() => {
    let isCancelled = false;

    const loadDrivingDistances = async () => {
      if (Object.keys(groupedItems).length === 0) {
        if (!isCancelled) {
          setStoreDeliveryDetails({});
        }
        return;
      }

      const customerLat = customerCoordinates.latitude;
      const customerLon = customerCoordinates.longitude;

      const storeEntries = await Promise.all(
        Object.entries(groupedItems).map(async ([storeName, items]) => {
          if (!items || items.length === 0) {
            return null;
          }

          const storeInfo = storeInfoMap[storeName];
          let storeLatitude = parseCoordinate(storeInfo?.latitude ?? items[0]?.storeLatitude ?? null);
          let storeLongitude = parseCoordinate(storeInfo?.longitude ?? items[0]?.storeLongitude ?? null);

          if (storeLatitude == null || storeLongitude == null) {
            const lookupCandidates = [
              storeInfo?.address,
              items[0]?.storeAddress,
              storeInfo?.name ? `${storeInfo.name}, Việt Nam` : null,
            ]
              .map((candidate) => (candidate ? candidate.trim() : ''))
              .filter((candidate) => candidate.length > 0);

            for (const candidate of lookupCandidates) {
              const cached = geocodeCacheRef.current[candidate];
              if (cached) {
                storeLatitude = cached.latitude;
                storeLongitude = cached.longitude;
                break;
              }

              try {
                const geocoded = await locationService.geocodeAddress(candidate);
                storeLatitude = geocoded.latitude;
                storeLongitude = geocoded.longitude;
                geocodeCacheRef.current[candidate] = {
                  latitude: storeLatitude,
                  longitude: storeLongitude,
                };
                break;
              } catch (error) {
                console.warn('Không thể tìm toạ độ cho cửa hàng', storeInfo?.id ?? storeName, 'với chuỗi', candidate, error);
              }
            }
          }

          let distanceKm: number | null = null;
          const hasAllCoordinates =
            storeLatitude != null &&
            storeLongitude != null &&
            customerLat != null &&
            customerLon != null;

          if (hasAllCoordinates) {
            const fallbackDistance = parseFloat(
              haversineDistanceKm(storeLatitude!, storeLongitude!, customerLat!, customerLon!).toFixed(2)
            );
            distanceKm = fallbackDistance;

            try {
              const drivingDistance = await locationService.getDrivingDistanceKm(
                { latitude: storeLatitude!, longitude: storeLongitude! },
                { latitude: customerLat!, longitude: customerLon! }
              );
              if (typeof drivingDistance === 'number' && !Number.isNaN(drivingDistance)) {
                distanceKm = parseFloat(drivingDistance.toFixed(2));
              }
            } catch (error) {
              console.warn('Không thể lấy khoảng cách di chuyển thực tế cho cửa hàng', storeInfo?.id ?? storeName, error);
            }
          }

          const normalizedStoreInfo: StoreDeliveryInfo = {
            id: storeInfo?.id ?? items[0]?.storeId ?? 0,
            name: storeInfo?.name ?? storeName,
            address: storeInfo?.address ?? items[0]?.storeAddress ?? null,
            latitude: storeLatitude,
            longitude: storeLongitude,
          };

          const metrics: StoreDeliveryMetrics = {
            distanceKm,
            fee: calculateDeliveryFee(distanceKm),
            store: normalizedStoreInfo,
          };

          return [storeName, metrics] as const;
        })
      );

      if (isCancelled) {
        return;
      }

      const nextDetails: { [storeName: string]: StoreDeliveryMetrics } = {};
      storeEntries.forEach((entry) => {
        if (!entry) {
          return;
        }
        const [storeName, metrics] = entry;
        nextDetails[storeName] = metrics;
      });

      setStoreDeliveryDetails(nextDetails);
    };

    loadDrivingDistances();

    return () => {
      isCancelled = true;
    };
  }, [
    groupedItems,
    storeInfoMap,
    customerCoordinates.latitude,
    customerCoordinates.longitude,
    calculateDeliveryFee,
  ]);

  // Calculate total delivery fee based on number of stores
  const getTotalDeliveryFee = useMemo(
    () => () => {
      const storeNames = Object.keys(groupedItems);
      if (storeNames.length === 0) {
        return 0;
      }

      const totalFee = storeNames.reduce((sum, storeName) => {
        const storeFee = storeDeliveryDetails[storeName]?.fee ?? SHIPPING_BASE_FEE;
        return sum + storeFee;
      }, 0);

      return parseFloat(totalFee.toFixed(3));
    },
    [groupedItems, storeDeliveryDetails]
  );

  const getFinalTotal = useMemo(
    () => () => parseFloat((getSubtotal() + getTotalDeliveryFee() + tax - getTotalDiscount()).toFixed(3)),
    [getSubtotal, getTotalDeliveryFee, tax, getTotalDiscount]
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

  // Load available promotions
  const loadAvailablePromos = async () => {
    try {
      setIsLoadingPromos(true);
      
      // Get unique store IDs from cart
      const storeIds = Object.values(storeInfoMap).map(store => store.id);
      
      console.log('Current storeInfoMap:', storeInfoMap);
      console.log('Extracted store IDs:', storeIds);
      
      if (storeIds.length === 0) {
        console.log('No stores in cart');
        setAvailablePromos([]);
        return;
      }
      
      console.log('Loading promos for stores:', storeIds);
      
      // Load promotions for stores in cart + system-wide (store = 0)
      const allStoreIds = [0, ...storeIds];
      
      console.log('Fetching promos for store IDs (including system):', allStoreIds);
      
      const promoPromises = allStoreIds.map(storeId => 
        promotionsService.getPromotions(storeId)
      );
      
      const results = await Promise.all(promoPromises);
      
      // Combine and deduplicate
      const allPromos = results.flat();
      const uniquePromos = allPromos.filter((promo, index, self) => 
        index === self.findIndex(p => p.id === promo.id)
      );
      
      console.log('Loaded unique promos:', uniquePromos.length);
      console.log('Promo details:', uniquePromos.map(p => ({ id: p.id, name: p.name, store: p.store })));
      
      setAvailablePromos(uniquePromos);
    } catch (error) {
      console.error('Error loading promotions:', error);
      setAvailablePromos([]);
    } finally {
      setIsLoadingPromos(false);
    }
  };

  // Toggle promo selection with store-level restriction
  const togglePromoSelection = (promo: Promotion) => {
    setSelectedPromos(prev => {
      const currentPromos = prev || [];
      const isSelected = currentPromos.some(p => p.id === promo.id);
      const promoStoreId = promo.store;
      
      if (isSelected) {
        // Deselect this promo
        return currentPromos.filter(p => p.id !== promo.id);
      } else {
        // Remove any existing promo from the same store (except system-wide)
        const filteredPromos = currentPromos.filter(p => p.store !== promoStoreId);
        
        // Add new promo
        return [...filteredPromos, promo];
      }
    });
  };

  // Apply selected promos
  const applySelectedPromos = async () => {
    if (!selectedPromos || selectedPromos.length === 0) {
      Alert.alert('Thông báo', 'Vui lòng chọn ít nhất một mã giảm giá');
      return;
    }

    try {
      const totalAmount = getSubtotal();
      
      // Calculate subtotal for each store by store ID (not store name)
      const storeSubtotalsByStoreId: { [storeId: number]: number } = {};
      
      Object.entries(groupedItems).forEach(([storeName, items]) => {
        const storeInfo = storeInfoMap[storeName];
        if (storeInfo) {
          const storeId = storeInfo.id;
          const storeSubtotal = items.reduce((sum, item) => sum + item.totalPrice, 0);
          storeSubtotalsByStoreId[storeId] = storeSubtotal;
        }
      });
      
      console.log('Store subtotals by ID:', storeSubtotalsByStoreId);
      
      // Prepare promo data with correct store amounts
      const promosWithAmounts = selectedPromos.map(promo => {
        // For system-wide promos (store = 0), use total cart amount
        // For store-specific promos, use that store's subtotal
        let storeAmount = totalAmount;
        
        if (promo.store !== 0) {
          // Find the correct store amount by matching promo.store with storeId
          const promoStoreId = promo.store;
          storeAmount = storeSubtotalsByStoreId[promoStoreId] || 0;
          
          console.log(`Promo ${promo.id} (${promo.name}) for store ${promoStoreId}: ${storeAmount}`);
          
          if (storeAmount === 0) {
            console.warn(`Store ${promoStoreId} not found in cart, promo may not apply`);
          }
        }
        
        return { promo, storeAmount };
      });

      const result = await promotionsService.validateMultiplePromos(promosWithAmounts, totalAmount);
      
      if (result.appliedPromos.length > 0) {
        setAppliedPromos(result.appliedPromos);
        setShowPromoModal(false);
        Alert.alert(
          'Thành công',
          `Đã áp dụng ${result.appliedPromos.length} mã giảm giá\nTổng giảm: ${formatPriceWithCurrency(result.totalDiscount)}`
        );
      } else {
        Alert.alert('Thông báo', 'Không có mã nào hợp lệ cho đơn hàng này');
      }
    } catch (error) {
      console.error('Error applying promos:', error);
      Alert.alert('Lỗi', 'Không thể áp dụng mã giảm giá');
    }
  };

  // Remove applied promo
  const removeAppliedPromo = (promoId: number) => {
    setAppliedPromos(prev => prev.filter(ap => ap.promo.id !== promoId));
    setSelectedPromos(prev => prev.filter(p => p.id !== promoId));
  };

  const getPromoIcon = (category: string) => {
    if (category === "PERCENT") return <Percent size={16} color="#10b981" />;
    if (category === "AMOUNT") return <Tag size={16} color="#f59e0b" />;
    return <Gift size={16} color="#6b7280" />;
  };

  const getPromoPillStyle = (category: string) => {
    if (category === "PERCENT") return styles.pillGreen;
    if (category === "AMOUNT") return styles.pillOrange;
    return styles.pillGray;
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
      }

      // If payment method is bank, create payment link first WITHOUT creating order
      if (selectedPayment === 'bank') {
        await handleBankPayment();
        return; // Exit here - order will be created after successful payment
      }

      // For COD and card payment methods, create order immediately
      setShowOrderNotification(true);

      // Map frontend payment method to backend values
      const paymentMethodMap: Record<string, 'cash' | 'vnpay' | 'momo'> = {
        'cod': 'cash',
        'card': 'vnpay',
        'bank': 'momo'
      };

      // Send order data in format expected by backend API
      const orderData: any = {
        receiver_name: customerInfo.name,
        phone_number: customerInfo.phone,
        ship_address: customerInfo.address,
        ship_latitude: customerCoordinates.latitude,
        ship_longitude: customerCoordinates.longitude,
        note: customerInfo.note || '',
        payment_method: paymentMethodMap[selectedPayment],
        total_money: getFinalTotal(),
        shipping_fee: getTotalDeliveryFee()
      };

      // Add promo data if promos are applied
      if (appliedPromos && appliedPromos.length > 0) {
        orderData.promo_ids = appliedPromos.map(ap => ap.promo.id);
        orderData.discount_amount = getTotalDiscount();
        
        // Include detailed promo info for backend to save correctly
        orderData.promo_details = appliedPromos.map(ap => ({
          promo_id: ap.promo.id,
          store_id: ap.promo.store,
          discount: ap.discount
        }));
        
        console.log('Including promos in order:', {
          promo_ids: orderData.promo_ids,
          discount_amount: orderData.discount_amount,
          promo_details: orderData.promo_details
        });
      }

      console.log('Sending order data:', orderData);

      const order = await ordersService.createOrder(orderData);
      console.log('Order created successfully:', order);
      
      // For COD and card, proceed as normal
      setTimeout(async () => {
        setShowOrderNotification(false);
        if (!notesUpdated) {
          // Show error toast about notes not being saved
          Alert.alert(
            'Thông báo',
            'Đặt hàng thành công, nhưng ghi chú cho một số món không được lưu.',
            [{ text: 'OK', onPress: () => navigation.navigate("MainTabs", { screen: "Orders" }) }]
          );
        } else {
          navigation.navigate("MainTabs", { screen: "Orders" });
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

  const handleBankPayment = async () => {
    try {
      setShowOrderNotification(true);

      // Get user_id from stored user data
      const userDataStr = await SecureStore.getItemAsync(STORAGE_KEYS.USER);
      if (!userDataStr) {
        throw new Error('User data not found');
      }
      const userData = JSON.parse(userDataStr);
      const user_id = userData.id;

      // Use a temporary order_id (timestamp) for PayOS
      const temp_order_id = Date.now();
      
      // Get amount (final total)
      const amount = Math.round(getFinalTotal());
      
      // Create message
      const message = `${user_id} TTDH ${temp_order_id}`;

      console.log('Creating PayOS payment link with:', {
        user_id,
        order_id: temp_order_id,
        amount,
        message
      });

      // Import payosService
      const { payosService } = require('@/services');
      
      setShowOrderNotification(false);
      
      // Create payment link via Django backend (NO order created yet)
      const paymentResponse = await payosService.createPaymentLink({
        user_id,
        order_id: temp_order_id,
        amount,
        message
      });

      console.log('PayOS payment link created:', paymentResponse);

      // Open payment link in WebBrowser
      const result = await WebBrowser.openBrowserAsync(paymentResponse.checkoutUrl, {
        presentationStyle: WebBrowser.WebBrowserPresentationStyle.PAGE_SHEET,
        controlsColor: '#e95322',
        toolbarColor: '#ffffff',
      });

      console.log('WebBrowser result:', result);

      // After browser closes, check payment status
      if (result.type === 'cancel' || result.type === 'dismiss') {
        // User closed browser - check payment status
        try {
          const statusResponse = await payosService.checkPaymentStatus(paymentResponse.orderCode);
          
          if (statusResponse.paid) {
            // Payment successful - NOW create the order
            console.log('Payment successful! Creating order...');
            
            setShowOrderNotification(true);
            
            // Map frontend payment method to backend values
            const paymentMethodMap: Record<string, 'cash' | 'vnpay' | 'momo'> = {
              'cod': 'cash',
              'card': 'vnpay',
              'bank': 'momo'
            };

            // Send order data
            const orderData: any = {
              receiver_name: customerInfo.name,
              phone_number: customerInfo.phone,
              ship_address: customerInfo.address,
              ship_latitude: customerCoordinates.latitude,
              ship_longitude: customerCoordinates.longitude,
              note: customerInfo.note || '',
              payment_method: paymentMethodMap['bank'],
              total_money: getFinalTotal(),
              shipping_fee: getTotalDeliveryFee()
            };

            // Add promo data if promos are applied
            if (appliedPromos && appliedPromos.length > 0) {
              orderData.promo_ids = appliedPromos.map(ap => ap.promo.id);
              orderData.discount_amount = getTotalDiscount();
              
              orderData.promo_details = appliedPromos.map(ap => ({
                promo_id: ap.promo.id,
                store_id: ap.promo.store,
                discount: ap.discount
              }));
            }

            console.log('Creating order after successful payment:', orderData);

            const order = await ordersService.createOrder(orderData);
            console.log('Order created successfully:', order);
            
            setShowOrderNotification(false);
            
            // Payment successful - show success and navigate
            Alert.alert(
              'Thanh toán thành công!',
              'Đơn hàng của bạn đã được thanh toán và đang được xử lý.',
              [
                {
                  text: 'Xem đơn hàng',
                  onPress: () => navigation.navigate("MainTabs", { screen: "Orders" })
                }
              ]
            );
          } else {
            // Payment not completed or cancelled - DO NOT create order
            setShowOrderNotification(false);
            Alert.alert(
              'Thanh toán chưa hoàn tất',
              'Bạn chưa hoàn tất thanh toán. Đơn hàng chưa được tạo. Vui lòng thử lại nếu muốn đặt hàng.',
              [
                {
                  text: 'Thử lại',
                  onPress: () => {
                    // Stay on checkout screen
                  }
                },
                {
                  text: 'Hủy',
                  style: 'cancel'
                }
              ]
            );
          }
        } catch (statusError) {
          console.error('Error checking payment status:', statusError);
          setShowOrderNotification(false);
          // Fallback message - DON'T create order if can't verify payment
          Alert.alert(
            'Không thể xác minh thanh toán',
            'Không thể kiểm tra trạng thái thanh toán. Vui lòng kiểm tra lại sau hoặc liên hệ hỗ trợ.',
            [
              {
                text: 'Đóng',
                style: 'cancel'
              }
            ]
          );
        }
      }
    } catch (error) {
      console.error('Error processing bank payment:', error);
      setShowOrderNotification(false);
      Alert.alert(
        'Lỗi thanh toán',
        'Không thể tạo liên kết thanh toán. Vui lòng thử lại hoặc chọn phương thức thanh toán khác.',
        [{ text: 'OK' }]
      );
    }
  };

  const renderStoreGroup = (storeName: string, items: CartItem[]) => {
    const storeSubtotal = parseFloat((items.reduce((sum, item) => sum + item.totalPrice, 0)).toFixed(3));
    const deliveryInfo = storeDeliveryDetails[storeName];
    const storeFee = deliveryInfo?.fee ?? SHIPPING_BASE_FEE;
    const distanceLabel = formatDistanceLabel(deliveryInfo?.distanceKm ?? null);

    // Calculate discount for this store
    let storeDiscount = 0;
    const totalCartAmount = getSubtotal();
    
    if (appliedPromos && appliedPromos.length > 0) {
      // Get store ID from storeInfoMap
      const storeInfo = storeInfoMap[storeName];
      const storeId = storeInfo?.id;
      
      appliedPromos.forEach(ap => {
        const promoStoreId = ap.promo?.store;
        
        if (promoStoreId === storeId) {
          // Store-specific promo - use full discount for this store
          storeDiscount += ap.discount;
        } else if (promoStoreId === 0 && totalCartAmount > 0) {
          // System-wide promo - distribute proportionally based on store subtotal
          const storeRatio = storeSubtotal / totalCartAmount;
          const systemDiscountForThisStore = ap.discount * storeRatio;
          storeDiscount += systemDiscountForThisStore;
        }
      });
    }
    const storeTotal = storeSubtotal - storeDiscount + storeFee;

    return (
      <View key={storeName} style={styles.storeGroup}>
        <View style={styles.storeHeader}>
          <Text style={styles.storeName}>{storeName}</Text>
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
        
        {/* Store Summary */}
        <View style={styles.storeSummary}>
          <View style={styles.storeSummaryRow}>
            <Text style={styles.storeSummaryLabel}>Tạm tính cửa hàng:</Text>
            <Text style={styles.storeSummaryValue}>{formatPriceWithCurrency(storeSubtotal)}</Text>
          </View>
          
          {storeDiscount > 0 && (
            <View style={styles.storeSummaryRow}>
              <Text style={[styles.storeSummaryLabel, { color: '#16a34a' }]}>Giảm giá:</Text>
              <Text style={[styles.storeSummaryValue, { color: '#16a34a' }]}>-{formatPriceWithCurrency(storeDiscount)}</Text>
            </View>
          )}

          <View style={styles.storeSummaryRow}>
            <Text style={styles.storeSummaryLabel}>Khoảng cách:</Text>
            <Text style={styles.storeSummaryValue}>{distanceLabel}</Text>
          </View>
          {deliveryInfo && deliveryInfo.distanceKm == null && (
            <Text style={styles.storeSummaryHint}>Chưa có vị trí chính xác, áp dụng phí mặc định.</Text>
          )}
          
          <View style={styles.storeSummaryRow}>
            <Text style={styles.storeSummaryLabel}>Phí vận chuyển:</Text>
            <Text style={styles.storeSummaryValue}>{formatPriceWithCurrency(storeFee)}</Text>
          </View>
          
          <View style={[styles.storeSummaryRow, styles.storeSummaryTotal]}>
            <Text style={styles.storeSummaryTotalLabel}>Tổng cửa hàng:</Text>
            <Text style={styles.storeSummaryTotalValue}>{formatPriceWithCurrency(storeTotal)}</Text>
          </View>
        </View>
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
              <Row label="Tạm tính" value={formatPriceWithCurrency(getSubtotal())} />
              <Row label="Phí giao hàng" value={formatPriceWithCurrency(getTotalDeliveryFee())} />
              {tax > 0 && <Row label="Thuế" value={formatPriceWithCurrency(tax)} />}

              {Object.keys(storeDeliveryDetails).length > 0 && (
                <View style={styles.deliveryBreakdown}>
                  {Object.entries(storeDeliveryDetails).map(([storeName, detail]) => (
                    <View key={storeName} style={styles.deliveryBreakdownRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.deliveryStoreName}>{storeName}</Text>
                        {detail.store.address && (
                          <Text style={styles.deliveryStoreAddress}>{detail.store.address}</Text>
                        )}
                        <Text style={styles.deliveryDistance}>Khoảng cách: {formatDistanceLabel(detail.distanceKm)}</Text>
                      </View>
                      <View style={styles.deliveryFeeColumn}>
                        <Text style={styles.deliveryFeeValue}>{formatPriceWithCurrency(detail.fee)}</Text>
                        {detail.distanceKm == null && (
                          <Text style={styles.deliveryFeeNote}>Tạm tính</Text>
                        )}
                      </View>
                    </View>
                  ))}

                  {(customerCoordinates.latitude == null || customerCoordinates.longitude == null) && (
                    <Text style={styles.deliverySummaryNote}>
                      Cập nhật vị trí chính xác trong Profile để tính phí dựa trên khoảng cách thực tế.
                    </Text>
                  )}
                </View>
              )}

              <View style={styles.divider} />
              
              <TouchableOpacity
                onPress={() => {
                  setShowPromoModal(true);
                  // Load promos every time modal opens
                  loadAvailablePromos();
                }}
                style={styles.promoRow}
              >
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <Tag size={16} color="#e95322" />
                  <Text style={styles.promoText}>
                    {appliedPromos && appliedPromos.length > 0 
                      ? `Đã áp dụng ${appliedPromos.length} mã` 
                      : 'Chọn mã giảm giá'}
                  </Text>
                </View>
                <ChevronRight size={16} color="#9ca3af" />
              </TouchableOpacity>
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

      {/* Promo Modal */}
      <Modal
        visible={showPromoModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowPromoModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { paddingBottom: Math.max(insets.bottom, 20) }]}>
            <View style={styles.modalHead}>
              <Text style={styles.modalTitle}>Chọn mã giảm giá</Text>
              <TouchableOpacity onPress={() => setShowPromoModal(false)} hitSlop={8}>
                <X size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>

            {isLoadingPromos ? (
              <View style={{ paddingVertical: 40, alignItems: 'center' }}>
                <ActivityIndicator size="large" color="#e95322" />
              </View>
            ) : (
              <ScrollView style={{ maxHeight: 400 }}>
                {!availablePromos || availablePromos.length === 0 ? (
                  <View style={{ paddingVertical: 40, alignItems: 'center' }}>
                    <Text style={{ color: '#6b7280', fontFamily: Fonts.LeagueSpartanRegular }}>
                      Không có mã giảm giá khả dụng
                    </Text>
                  </View>
                ) : (
                  (() => {
                    // Group promos by store
                    const promosByStore: { [key: string]: { name: string; promos: Promotion[] } } = {};
                    const subtotal = getSubtotal();
                    
                    // Create reverse lookup: store id -> store name from storeInfoMap
                    const storeIdToName: { [storeId: number]: string } = {};
                    Object.values(storeInfoMap).forEach(store => {
                      storeIdToName[store.id] = store.name;
                    });
                    
                    availablePromos.forEach(promo => {
                      const storeKey = promo.store === 0 ? 'system' : `store_${promo.store}`;
                      let storeName: string;
                      
                      if (promo.store === 0) {
                        storeName = 'Toàn hệ thống';
                      } else {
                        // Try to get name from storeInfoMap first, then from promo data
                        storeName = storeIdToName[promo.store] || 
                                   promo.store_name || 
                                   `Cửa hàng ${promo.store}`;
                      }
                      
                      if (!promosByStore[storeKey]) {
                        promosByStore[storeKey] = { name: storeName, promos: [] };
                      }
                      promosByStore[storeKey].promos.push(promo);
                    });

                    // Sort: system first, then others
                    const sortedStores = Object.entries(promosByStore).sort(([keyA], [keyB]) => {
                      if (keyA === 'system') return -1;
                      if (keyB === 'system') return 1;
                      return 0;
                    });

                    return sortedStores.map(([storeKey, storeGroup]) => (
                      <View key={storeKey} style={{ marginBottom: 20 }}>
                        <Text style={styles.promoStoreTitle}>{storeGroup.name}</Text>
                        {storeGroup.promos.map(promo => {
                          const isSelected = selectedPromos && selectedPromos.some(p => p.id === promo.id);
                          const isEligible = subtotal >= promo.minimum_pay;
                          const discountText = promo.category === 'PERCENT'
                            ? `Giảm ${promo.discount_value}%${promo.max_discount_amount ? ` (tối đa ${formatPriceWithCurrency(promo.max_discount_amount)})` : ''}`
                            : `Giảm ${formatPriceWithCurrency(promo.discount_value)}`;
                          const minPayText = promo.minimum_pay > 0 ? `Đơn tối thiểu ${formatPriceWithCurrency(promo.minimum_pay)}` : '';

                          return (
                            <TouchableOpacity
                              key={promo.id}
                              style={[
                                styles.promoItem,
                                isSelected && styles.promoItemSelected,
                                !isEligible && styles.promoItemDisabled
                              ]}
                              onPress={() => isEligible && togglePromoSelection(promo)}
                              disabled={!isEligible}
                            >
                              <View style={{ flex: 1 }}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                                  <View style={[styles.voucherPill, getPromoPillStyle(promo.category)]}>
                                    {getPromoIcon(promo.category)}
                                  </View>
                                  <Text style={styles.promoItemName}>{promo.name}</Text>
                                </View>
                                <Text style={styles.promoItemDiscount}>{discountText}</Text>
                                {minPayText && (
                                  <Text style={styles.promoItemCondition}>{minPayText}</Text>
                                )}
                                {!isEligible && (
                                  <Text style={styles.promoItemRequirement}>
                                    Cần thêm {formatPriceWithCurrency(promo.minimum_pay - subtotal)} để đạt điều kiện
                                  </Text>
                                )}
                              </View>
                              {isSelected && (
                                <View style={styles.promoCheck}>
                                  <Check size={16} color="#fff" />
                                </View>
                              )}
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    ));
                  })()
                )}
              </ScrollView>
            )}

            <View style={{ marginTop: 16, gap: 12 }}>
              <TouchableOpacity
                onPress={applySelectedPromos}
                style={[styles.primaryBtn, (!selectedPromos || selectedPromos.length === 0) && { opacity: 0.5 }]}
                disabled={!selectedPromos || selectedPromos.length === 0}
              >
                <Text style={styles.primaryBtnText}>
                  Áp dụng ({selectedPromos ? selectedPromos.length : 0})
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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

function AppliedPromoRow({
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
  
  // Store summary styles
  storeSummary: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#dee2e6",
  },
  storeSummaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  storeSummaryHint: {
    color: "#9ca3af",
    fontFamily: Fonts.LeagueSpartanRegular,
    fontSize: 12,
    marginBottom: 6,
  },
  storeSummaryLabel: {
    color: "#6b7280",
    fontFamily: Fonts.LeagueSpartanRegular,
    fontSize: 13,
  },
  storeSummaryValue: {
    color: BROWN,
    fontFamily: Fonts.LeagueSpartanSemiBold,
    fontSize: 13,
  },
  storeSummaryTotal: {
    marginTop: 6,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#dee2e6",
  },
  storeSummaryTotalLabel: {
    color: BROWN,
    fontFamily: Fonts.LeagueSpartanBold,
    fontSize: 14,
  },
  storeSummaryTotalValue: {
    color: ACCENT,
    fontFamily: Fonts.LeagueSpartanExtraBold,
    fontSize: 14,
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

  deliveryBreakdown: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 12,
    padding: 12,
    gap: 12,
    backgroundColor: "#f9fafb",
  },
  deliveryBreakdownRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  deliveryStoreName: {
    color: BROWN,
    fontFamily: Fonts.LeagueSpartanSemiBold,
    fontSize: 13,
  },
  deliveryStoreAddress: {
    color: "#6b7280",
    fontFamily: Fonts.LeagueSpartanRegular,
    fontSize: 12,
    marginTop: 2,
  },
  deliveryDistance: {
    color: "#6b7280",
    fontFamily: Fonts.LeagueSpartanRegular,
    fontSize: 12,
    marginTop: 2,
  },
  deliveryFeeColumn: {
    alignItems: "flex-end",
  },
  deliveryFeeValue: {
    color: ACCENT,
    fontFamily: Fonts.LeagueSpartanBold,
    fontSize: 13,
  },
  deliveryFeeNote: {
    color: "#9ca3af",
    fontFamily: Fonts.LeagueSpartanRegular,
    fontSize: 11,
  },
  deliverySummaryNote: {
    color: "#9ca3af",
    fontFamily: Fonts.LeagueSpartanRegular,
    fontSize: 12,
  },

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

  // Promo modal styles
  promoStoreTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    backgroundColor: ACCENT,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    marginBottom: 12,
    textAlign: 'center',
  },
  promoItem: {
    padding: 14,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderLeftWidth: 3,
    borderLeftColor: ACCENT,
  },
  promoItemSelected: {
    borderColor: ACCENT,
    backgroundColor: 'rgba(233, 83, 34, 0.05)',
  },
  promoItemDisabled: {
    opacity: 0.5,
    backgroundColor: '#f8f9fa',
    borderLeftColor: '#ddd',
  },
  promoItemName: {
    color: BROWN,
    fontFamily: Fonts.LeagueSpartanBold,
    fontSize: 14,
  },
  promoItemDiscount: {
    color: ACCENT,
    fontFamily: Fonts.LeagueSpartanBold,
    fontSize: 13,
    marginBottom: 2,
  },
  promoItemCondition: {
    color: '#6b7280',
    fontFamily: Fonts.LeagueSpartanRegular,
    fontSize: 12,
  },
  promoItemStore: {
    color: '#10b981',
    fontFamily: Fonts.LeagueSpartanSemiBold,
    fontSize: 12,
    marginTop: 2,
  },
  promoItemRequirement: {
    color: '#dc3545',
    fontFamily: Fonts.LeagueSpartanRegular,
    fontSize: 11,
    fontStyle: 'italic',
    marginTop: 4,
  },
  promoCheck: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: ACCENT,
    alignItems: 'center',
    justifyContent: 'center',
  },
});