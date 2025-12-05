import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation } from "@react-navigation/native";
import {
  Bell,
  ChevronRight,
  Heart,
  Search,
  ShoppingCart,
  User,
  Menu,
} from "lucide-react-native";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Dimensions,
  FlatList,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '@/store';
import { fetchCategories, fetchFoods, setCurrentCategory } from '@/store/slices/menuSlice';
import { fetchStoresWithStats } from '@/store/slices/storesSlice';

import FoodCustomizationPopup from "@/components/FoodCustomizationPopup";
import { FoodTile } from "@/components/FoodTile";
import ProfileDrawer from "@/components/ProfileDrawer";
import { RestaurantCard } from "@/components/RestaurantCard";
import NotificationModal from "@/components/NotificationModal";
import { Fonts } from "@/constants/Fonts";
import { API_CONFIG } from "@/constants";
import { formatPriceWithCurrency } from "@/utils/priceUtils";
import Sidebar from "@/components/sidebar";
import db from "@/assets/database.json";
const copilotIcon = require('../../assets/images/copilot-logo.png');

const { width } = Dimensions.get("window");
const SESSION_KEY = "auth.session";

type Nav = any;

// Helper function to build image URLs
const getImageUrl = (imagePath: string) => {
  if (!imagePath) return null;
  if (imagePath.startsWith('http')) return imagePath;
  return `${API_CONFIG.BASE_URL.replace('/api', '')}/media/${imagePath}`;
};

// Mock banners data for now
const mockBanners = [
  {
    id: 1,
    title: "Giảm giá hôm nay",
    discount: "20% OFF",
    image: require('../../assets/images/assorted-sushi.png') // fallback image
  },
  {
    id: 2,
    title: "Ưu đãi đặc biệt",
    discount: "30% OFF",
    image: require('../../assets/images/burger-palace.png') // fallback image
  }
];

export default function HomeScreen() {
  const navigation = useNavigation<Nav>();
  const dispatch = useDispatch<AppDispatch>();
  
  // Redux selectors
  const { categories, foods, loading: menuLoading, currentCategory } = useSelector((state: RootState) => state.menu);
  const { stores, loading: storesLoading } = useSelector((state: RootState) => state.stores);
  const { user } = useSelector((state: RootState) => state.auth);

  const [activeDiscountIndex, setActiveDiscountIndex] = useState(0);
  const [favorites, setFavorites] = useState<any[]>([]);
  const [popupOpen, setPopupOpen] = useState(false);
  const [selectedFood, setSelectedFood] = useState<any>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(0); // Start with "Tất cả" selected
  const [profileDrawerOpen, setProfileDrawerOpen] = useState(false);
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  
  // Scroll states for arrows
  const [categoriesCanScrollLeft, setCategoriesCanScrollLeft] = useState(false);
  const [categoriesCanScrollRight, setCategoriesCanScrollRight] = useState(true);
  const [storesCanScrollLeft, setStoresCanScrollLeft] = useState(false);
  const [storesCanScrollRight, setStoresCanScrollRight] = useState(true);
  
  // Refs for scroll control
  const categoriesFlatListRef = useRef<FlatList>(null);
  const storesFlatListRef = useRef<FlatList>(null);

  // Role and sidebar states
  const [roles, setRoles] = useState<string[]>(["customer"]);
  const [currentRole, setCurrentRole] = useState<string>("customer");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Load data on mount
  useEffect(() => {
    console.log('HomeScreen: Loading initial data...');
    dispatch(fetchCategories());
    dispatch(fetchStoresWithStats());
    dispatch(fetchFoods({ page: 1 }));
  }, [dispatch]);

  // Load foods when category changes
  useEffect(() => {
    if (selectedCategoryId && selectedCategoryId !== 0) {
      // Load foods for specific category (not "Tất cả")
      console.log('HomeScreen: Loading foods for category:', selectedCategoryId);
      dispatch(fetchFoods({ page: 1, category: selectedCategoryId }));
    } else {
      // Load all foods (when selectedCategoryId is null or 0 for "Tất cả")
      console.log('HomeScreen: Loading all foods');
      dispatch(fetchFoods({ page: 1 }));
    }
  }, [selectedCategoryId, dispatch]);

  const filteredFoods = useMemo(() => {
    // When "Tất cả" is selected (selectedCategoryId === 0), show all foods
    if (selectedCategoryId === 0) {
      return foods.slice(0, 16); // Show more foods when "Tất cả" is selected
    }
    // For specific categories, show first 8 foods
    return foods.slice(0, 8);
  }, [foods, selectedCategoryId]);

  const filteredStores = useMemo(() => {
    return stores.slice(0, 4); // Show first 4 stores
  }, [stores]);

  const bestSellerFoods = useMemo(() => {
    return foods.slice(0, 4); // Show first 4 foods as best sellers
  }, [foods]);

  // Create categories array with "Tất cả" at the beginning
  const categoriesWithAll = useMemo(() => {
    const allCategory = {
      id: 0,
      cate_name: "Tất cả",
      image: null,
      image_url: null,
      foods_count: foods.length
    };
    return [allCategory, ...categories];
  }, [categories, foods.length]);

  // Handle scroll events for arrow indicators
  const handleCategoriesScroll = (event: any) => {
    const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
    const isAtLeft = contentOffset.x <= 10;
    const isAtRight = contentOffset.x >= contentSize.width - layoutMeasurement.width - 10;
    
    setCategoriesCanScrollLeft(!isAtLeft);
    setCategoriesCanScrollRight(!isAtRight);
  };

  const handleStoresScroll = (event: any) => {
    const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
    const isAtLeft = contentOffset.x <= 10;
    const isAtRight = contentOffset.x >= contentSize.width - layoutMeasurement.width - 10;
    
    setStoresCanScrollLeft(!isAtLeft);
    setStoresCanScrollRight(!isAtRight);
  };

  // Scroll functions
  const scrollCategoriesLeft = () => {
    categoriesFlatListRef.current?.scrollToOffset({ offset: 0, animated: true });
  };

  const scrollCategoriesRight = () => {
    categoriesFlatListRef.current?.scrollToEnd({ animated: true });
  };

  const scrollStoresLeft = () => {
    storesFlatListRef.current?.scrollToOffset({ offset: 0, animated: true });
  };

  const scrollStoresRight = () => {
    storesFlatListRef.current?.scrollToEnd({ animated: true });
  };

  // ===== Load favorites
  useEffect(() => {
    (async () => {
      const saved = await AsyncStorage.getItem("favorites");
      if (saved) setFavorites(JSON.parse(saved));
    })();
  }, []);

  // ===== Load roles & activeRole từ SESSION (fallback dev khi chưa có)
  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(SESSION_KEY);
        if (raw) {
          const s = JSON.parse(raw);
          const validRoles = (Array.isArray(s.roles) ? s.roles : []).filter((r: string) =>
            ["customer", "seller", "shipper", "admin"].includes(r)
          );
          const roleSet = validRoles.length ? validRoles : ["customer"];
          const nextActive =
            roleSet.includes(s.activeRole) && s.activeRole ? s.activeRole : roleSet[0];
          setRoles(roleSet);
          setCurrentRole(nextActive);
          return;
        }

        // Fallback: lấy user mock
        const activeUserId = (db as any)?.auth?.sessions?.[0]?.userId ?? 1;
        const activeUser = (db as any)?.users?.find((u: any) => u.id === activeUserId);
        const nextRoles = Array.from(
          new Set(
            ([...(activeUser?.roles || []), "customer"] as string[]).filter((r) =>
              ["customer", "seller", "shipper", "admin"].includes(r)
            )
          )
        );
        setRoles(nextRoles.length ? nextRoles : ["customer"]);
        setCurrentRole(nextRoles.includes("customer") ? "customer" : nextRoles[0] || "customer");
      } catch {
        setRoles(["customer"]);
        setCurrentRole("customer");
      }
    })();
  }, []);

  // ===== Helpers
  const saveFav = async (next: any[]) => {
    setFavorites(next);
    await AsyncStorage.setItem("favorites", JSON.stringify(next));
  };

  const toggleFavorite = (id: number) => {
    const exists = favorites.find((f) => f.id === id);
    if (exists) return void saveFav(favorites.filter((f) => f.id !== id));
    const found = foods.find((f) => f.id === id);
    if (found) saveFav([...favorites, found]);
  };

  const handleCategorySelect = (category: any) => {
    const isActive = selectedCategoryId === category.id;
    
    // Handle "Tất cả" category (id = 0) - load all foods
    if (category.id === 0) {
      setSelectedCategoryId(isActive ? null : 0);
      dispatch(setCurrentCategory(null)); // Clear current category to show all
    } else {
      setSelectedCategoryId(isActive ? null : category.id);
      dispatch(setCurrentCategory(isActive ? null : category));
    }
  };

  const handleNotificationPress = () => {
    console.log('Notification pressed!');
    setShowNotificationModal(true);
  };

  const scrollRef = useRef<ScrollView>(null);
  const onScrollBanner = (e: any) => {
    const idx = Math.round(e.nativeEvent.contentOffset.x / (width - 48));
    setActiveDiscountIndex(idx);
  };

  // Show loading state
  if (menuLoading || storesLoading) {
    return (
      <View style={[styles.screen, { justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={styles.sectionTitle}>Đang tải...</Text>
      </View>
    );
  }

  // Đổi role: kiểm tra hợp lệ và ghi SESSION (fire-and-forget để trả về void)
  const handleChangeRole = (r: string) => {
    const allow = ["customer", "seller", "shipper", "admin"];
    const switchable = ["customer", "shipper", "seller"];

    if (!allow.includes(r)) return;
    if (!roles.includes(r)) {
      Alert.alert("Không thể chuyển", "Tài khoản của bạn không có vai trò này.");
      return;
    }
    if (!switchable.includes(r) && r !== "customer") {
      Alert.alert("Không thể chuyển", "Vai trò này không được phép chuyển trực tiếp.");
      return;
    }

    setCurrentRole(r);
    setSidebarOpen(false);

    AsyncStorage.getItem(SESSION_KEY)
      .then((raw) => {
        const prev = raw ? JSON.parse(raw) : {};
        const next = {
          ...prev,
          roles,
          activeRole: r,
          lastSwitchedAt: new Date().toISOString(),
        };
        return AsyncStorage.setItem(SESSION_KEY, JSON.stringify(next));
      })
      .catch(() => {});
  };

  // Điều hướng dùng chung cho Sidebar
  const go = (screen: string) => navigation.navigate(screen as never);

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 96 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.headerWrap}>
          <View style={styles.headerRow}>
            <TouchableOpacity
              onPress={() => setSidebarOpen(true)}
              style={styles.menuButton}
            >
              <Menu size={22} color="#e95322" />
            </TouchableOpacity>

            {/* Search */}
            <View style={{ flex: 1, position: "relative" }}>
              <TextInput
                placeholder="Tìm kiếm"
                placeholderTextColor="#676767"
                style={styles.searchInput}
              />
              <View style={styles.searchIcon}>
                <Search size={16} color="#fff" />
              </View>
            </View>

            {/* Cart */}
            <TouchableOpacity
              onPress={() => navigation.navigate("Cart")}
              style={styles.headerIcon}
            >
              <ShoppingCart size={24} color="#e95322" />
            </TouchableOpacity>

            {/* Notification */}
            <TouchableOpacity 
              onPress={handleNotificationPress}
              style={styles.headerIcon}
            >
              <Bell size={24} color="#e95322" />
            </TouchableOpacity>
            
            {/* Profile */}
            <TouchableOpacity 
              onPress={() => setProfileDrawerOpen(true)}
              style={styles.headerIcon}
            >
              <User size={24} color="#e95322" />
            </TouchableOpacity>
          </View>

          {/* Hàng dưới: greeting */}
          <View>
            <Text style={styles.hello}>Xin chào!</Text>
            <Text style={styles.ask}>Hôm nay bạn muốn ăn gì?</Text>
          </View>
        </View>

        {/* Categories */}
        <View style={styles.catWrap}>
          <View style={{ position: 'relative' }}>
            <FlatList
              ref={categoriesFlatListRef}
              data={categoriesWithAll}
              horizontal
              keyExtractor={(item) => String(item.id)}
              showsHorizontalScrollIndicator={false}
              ItemSeparatorComponent={() => <View style={{ width: 12 }} />}
              contentContainerStyle={{ paddingHorizontal: 24 }}
              onScroll={handleCategoriesScroll}
              scrollEventThrottle={16}
              renderItem={({ item: c }) => {
                const active = selectedCategoryId === c.id;
                // Special handling for "Tất cả" category
                const isAllCategory = c.id === 0;
                // Defensive: always return a valid React element
                let iconElement: React.ReactNode;
                if (isAllCategory) {
                  iconElement = (
                    <Text style={{ fontSize: 20, fontFamily: Fonts.LeagueSpartanBold }}>📋</Text>
                  );
                } else if (typeof c.image === 'string' && !!getImageUrl(c.image)) {
                  iconElement = (
                    <Image
                      source={{ uri: getImageUrl(c.image) || '' }}
                      style={{ width: 30, height: 30, borderRadius: 15 }}
                      resizeMode="cover"
                      onError={() => console.log('Failed to load category image:', getImageUrl(c.image))}
                    />
                  );
                } else if (c.image && typeof c.image === 'object') {
                  iconElement = (
                    <Image
                      source={c.image}
                      style={{ width: 30, height: 30, borderRadius: 15 }}
                      resizeMode="cover"
                    />
                  );
                } else {
                  // fallback: always return a <Text>
                  iconElement = (
                    <Text style={{ fontSize: 20, fontFamily: Fonts.LeagueSpartanBold }}>🍔</Text>
                  );
                }
                return (
                  <TouchableOpacity
                    onPress={() =>
                    handleCategorySelect(c)
                  }
                    style={styles.catItem}
                  >
                    <View
                    style={[
                      styles.catIcon,
                      {
                        backgroundColor: active ? "#e95322" : "#f3e9b5",
                      },
                    ]}
                  >
                      {isAllCategory ? (
                        <Text
                      style={{
                        fontSize: 20,
                        fontFamily: Fonts.LeagueSpartanBold,
                      }}
                    >
                      📋</Text>
                      ) : c.image && getImageUrl(c.image) ? (
                        <Image 
                          source={{ uri: getImageUrl(c.image) || '' }} 
                          style={{ width: 30, height: 30, borderRadius: 15 }}
                          resizeMode="cover"
                          onError={() => console.log('Failed to load category image:', getImageUrl(c.image))}
                        />
                      ) : (
                        <Text style={{ fontSize: 20, fontFamily: Fonts.LeagueSpartanBold }}>🍔
                    </Text>
                      )}
                    </View>
                    <Text
                    style={[
                      styles.catLabel,
                      { color: active ? "#e95322" : "#391713" },
                    ]}
                  >
                    {c.cate_name}
                  </Text>
                  </TouchableOpacity>
                );
              }}
            />
            
            {/* Left Arrow */}
            {categoriesCanScrollLeft && (
              <TouchableOpacity
                onPress={scrollCategoriesLeft}
                style={{
                  position: 'absolute',
                  left: 0,
                  top: '50%',
                  transform: [{ translateY: -20 }],
                  backgroundColor: 'rgba(255, 255, 255, 0.9)',
                  borderRadius: 20,
                  width: 40,
                  height: 40,
                  justifyContent: 'center',
                  alignItems: 'center',
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.1,
                  shadowRadius: 4,
                  elevation: 3,
                }}
              >
                <ChevronRight size={20} color="#e95322" style={{ transform: [{ rotate: '180deg' }] }} />
              </TouchableOpacity>
            )}
            
            {/* Right Arrow */}
            {categoriesCanScrollRight && (
              <TouchableOpacity
                onPress={scrollCategoriesRight}
                style={{
                  position: 'absolute',
                  right: 0,
                  top: '50%',
                  transform: [{ translateY: -20 }],
                  backgroundColor: 'rgba(255, 255, 255, 0.9)',
                  borderRadius: 20,
                  width: 40,
                  height: 40,
                  justifyContent: 'center',
                  alignItems: 'center',
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.1,
                  shadowRadius: 4,
                  elevation: 3,
                }}
              >
                <ChevronRight size={20} color="#e95322" />
              </TouchableOpacity>
            )}
          </View>
          <View style={styles.separator} />
        </View>

        {/* Restaurants/Stores */}
        <View
          style={{
            backgroundColor: "#fff",
            paddingHorizontal: 24,
            paddingBottom: 20,
          }}
        >
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Đang mở cửa</Text>

            <TouchableOpacity
              onPress={() => navigation.navigate("Restaurants")}
              style={styles.linkRow}
            >
              <Text style={styles.linkText}>Xem tất cả</Text>
              <ChevronRight size={16} color="#e95322" />
            </TouchableOpacity>
          </View>

          <View style={{ position: 'relative' }}>
            <FlatList
              ref={storesFlatListRef}
              data={filteredStores}
              horizontal
              keyExtractor={(item) => String(item.id)}
              showsHorizontalScrollIndicator={false}
              ItemSeparatorComponent={() => <View style={{ width: 16 }} />}
              onScroll={handleStoresScroll}
              scrollEventThrottle={16}
              renderItem={({ item }) => (
                <TouchableOpacity 
                  onPress={() => navigation.navigate("StoreDetail", { storeId: item.id })}
                  activeOpacity={0.92}
                  style={styles.storeCard}
                >
                  <Image 
                    source={{ uri: getImageUrl(item.image) || 'https://via.placeholder.com/160x96' }} 
                    style={styles.storeImage}
                  />
                  <View style={styles.storeInfo}>
                    <Text style={styles.storeName} numberOfLines={1}>
                      {item.store_name}
                    </Text>
                    <Text style={styles.storeDesc} numberOfLines={2}>
                      {item.description || 'Cửa hàng thực phẩm chất lượng'}
                    </Text>
                  </View>
                </TouchableOpacity>
              )}
            />

            {/* Left Arrow giữ nguyên */}
            {storesCanScrollLeft && (
              <TouchableOpacity
                onPress={scrollStoresLeft}
                style={{
                  position: 'absolute',
                  left: -12,
                  top: '50%',
                  transform: [{ translateY: -20 }],
                  backgroundColor: 'rgba(255, 255, 255, 0.9)',
                  borderRadius: 20,
                  width: 40,
                  height: 40,
                  justifyContent: 'center',
                  alignItems: 'center',
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.1,
                  shadowRadius: 4,
                  elevation: 3,
                }}
              >
                <ChevronRight size={20} color="#e95322" style={{ transform: [{ rotate: '180deg' }] }} />
              </TouchableOpacity>
            )}

            {/* Right Arrow giữ nguyên */}
            {storesCanScrollRight && (
              <TouchableOpacity
                onPress={scrollStoresRight}
                style={{
                  position: 'absolute',
                  right: -12,
                  top: '50%',
                  transform: [{ translateY: -20 }],
                  backgroundColor: 'rgba(255, 255, 255, 0.9)',
                  borderRadius: 20,
                  width: 40,
                  height: 40,
                  justifyContent: 'center',
                  alignItems: 'center',
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.1,
                  shadowRadius: 4,
                  elevation: 3,
                }}
              >
                <ChevronRight size={20} color="#e95322" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Best Seller */}
        <View style={{ backgroundColor: "#fff", paddingHorizontal: 24 }}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Bán chạy</Text>
            <TouchableOpacity
              onPress={() => navigation.navigate("Restaurants")}
              style={styles.linkRow}
            >
              <Text style={styles.linkText}>Xem tất cả</Text>
              <ChevronRight size={16} color="#e95322" />
            </TouchableOpacity>
          </View>

          <FlatList
            data={bestSellerFoods}
            horizontal
            keyExtractor={(i) => String(i.id)}
            ItemSeparatorComponent={() => <View style={{ width: 16 }} />}
            showsHorizontalScrollIndicator={false}
            renderItem={({ item }) => (
              <View style={{ width: 128 }}>
                <TouchableOpacity
                  style={{ position: "relative" }}
                  onPress={() => navigation.navigate("FoodDetail", { foodId: item.id })}
                >
                  <Image 
                    source={{ uri: getImageUrl(item.image) || 'https://via.placeholder.com/128x96' }} 
                    style={{ width: "100%", height: 96, borderRadius: 16 }} 
                  />
                  <TouchableOpacity onPress={() => toggleFavorite(item.id)} style={styles.heartBtn}>
                    <Heart
                      size={12}
                      color={
                        favorites.some((f) => f.id === item.id)
                          ? "#e95322"
                          : "#9ca3af"
                      }
                      fill={
                        favorites.some((f) => f.id === item.id)
                          ? "#e95322"
                          : "transparent"
                      }
                    />
                  </TouchableOpacity>
                  <View style={styles.pricePill}>
                    <Text style={styles.pricePillText}>{formatPriceWithCurrency(item.price)}</Text>
                  </View>
                </TouchableOpacity>
              </View>
            )}
          />
        </View>

        {/* Discount banners */}
        <View style={{ backgroundColor: "#fff", paddingTop: 20, paddingBottom: 20 }}>
          <View style={{ paddingHorizontal: 24 }}>
            <ScrollView
              ref={scrollRef}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onScroll={onScrollBanner}
              scrollEventThrottle={16}
              contentContainerStyle={{ gap: 16 }}
            >
              {mockBanners.map((b) => (
                <View key={b.id} style={{ width: width - 48 }}>
                  <View style={styles.banner}>
                    <View
                      style={{
                        flex: 1,
                        padding: 16,
                        justifyContent: "center",
                      }}
                    >
                      <Text
                        style={{
                          color: "#fff",
                          fontSize: 14,
                          marginBottom: 6,
                          fontFamily: Fonts.LeagueSpartanRegular,
                        }}
                      >
                        {b.title}
                      </Text>
                      <Text
                        style={{
                          color: "#fff",
                          fontSize: 24,
                          fontFamily: Fonts.LeagueSpartanBold,
                        }}
                      >
                        {b.discount}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Image 
                        source={b.image} 
                        style={{ width: "100%", height: "100%" }} 
                        resizeMode="cover" 
                      />
                    </View>
                  </View>
                </View>
              ))}
            </ScrollView>

            <View style={styles.dots}>
              {mockBanners.map((b, i) => (
                <View
                  key={b.id}
                  style={[
                    styles.dotBar,
                    { opacity: i === activeDiscountIndex ? 1 : 0.3 },
                  ]}
                />
              ))}
            </View>
          </View>
        </View>

        {/* Recommend */}
        <View style={styles.recommendWrap}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              {currentCategory ? currentCategory.cate_name : "Đề xuất"}
            </Text>
            {selectedCategoryId && selectedCategoryId !== 0 && (
              <Text style={styles.recommendCount}>
                {filteredFoods.length} món ăn
              </Text>
            )}
          </View>

          <View style={styles.grid}>
            {filteredFoods.map((item) => (
              <View key={item.id} style={styles.recommendCard}>
                <TouchableOpacity
                  onPress={() =>
                    navigation.navigate("FoodDetail", { foodId: item.id })
                  }
                  activeOpacity={0.9}
                  style={{ flex: 1 }}
                >
                  <Image
                    source={{ uri: getImageUrl(item.image) || 'https://via.placeholder.com/150x120' }}
                    style={styles.recommendImage}
                  />
                  <Text
                    style={styles.recommendTitle}
                    numberOfLines={1}
                  >
                    {item.title}
                  </Text>
                  <Text
                    style={styles.recommendDesc}
                    numberOfLines={2}
                  >
                    {item.description || "Món ăn ngon, phù hợp cho mọi bữa ăn"}
                  </Text>
                  <Text style={styles.recommendPrice}>
                    {formatPriceWithCurrency(item.price)}
                  </Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>

      {/* Popup tùy chỉnh món */}
      <FoodCustomizationPopup
        isOpen={popupOpen}
        onClose={() => setPopupOpen(false)}
        foodItem={selectedFood || {}}
      />
      {/* Sidebar */}
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />
      
      <ProfileDrawer 
        isVisible={profileDrawerOpen}
        onClose={() => setProfileDrawerOpen(false)}
        onNavigate={(screen) => {
          if (screen === 'ManageOrders') {
            navigation.navigate('ManageOrders');
          } else if (screen === 'Profile') {
            navigation.navigate('Profile');
          }
          // Add more navigation cases as needed
        }}
      />

      <NotificationModal 
        isVisible={showNotificationModal}
        onClose={() => setShowNotificationModal(false)}
        onNavigate={(screen: string, params?: any) => {
          console.log('Navigate to:', screen, params);
          // Navigation logic for each screen
          if (screen === 'Restaurants') {
            navigation.navigate('Restaurants');
          } else if (screen === 'Favorites') {
            navigation.navigate('Favorites');
          } else if (screen === 'Orders') {
            navigation.navigate('Orders', params);
          } else if (screen === 'OrderHistory') {
            navigation.navigate('OrderHistory', params);
          } else if (screen === 'Tracking') {
            navigation.navigate('Tracking', params);
          }
        }}
      />
      {/* Floating Copilot button - positioned above bottom nav */}
      <TouchableOpacity
         accessibilityLabel="Copilot"
         onPress={() => navigation.navigate('Chatbot' as never)}
         activeOpacity={0.85}
         style={styles.copilotButton}
       >
        <Image source={copilotIcon} style={{ width: 28, height: 28, tintColor: '#ffffff' }} />
       </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#fff" },

  headerWrap: {
    backgroundColor: "#f5cb58",
    paddingHorizontal: 24,
    paddingBottom: 40,
    paddingTop: 40,
  },

  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 16,
  },

  menuButton: {
    backgroundColor: "#fff",
    borderRadius: 999,
    padding: 8,
  },

  searchInput: {
    width: "100%",
    backgroundColor: "#fff",
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 10,
    color: "#676767",
    fontFamily: Fonts.LeagueSpartanRegular,
    fontSize: 14,
  },
  searchIcon: {
    position: "absolute",
    right: 4,
    top: 4,
    bottom: 4,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#e95322",
    borderRadius: 999,
    paddingHorizontal: 10,
  },

  headerIcon: {
    backgroundColor: "#fff",
    borderRadius: 999,
    padding: 8,
  },

  hello: {
    color: "#fff",
    marginBottom: 4,
    fontSize: 32,
    fontFamily: Fonts.LeagueSpartanBlack,
  },
  ask: {
    color: "#e95322",
    fontSize: 16,
    fontFamily: Fonts.LeagueSpartanSemiBold,
  },

  catWrap: {
    backgroundColor: "#fff",
    paddingHorizontal: 32,
    paddingVertical: 20,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    marginTop: -24,
  },
  catRow: { flexDirection: "row", justifyContent: "space-between" },
  catItem: { alignItems: "center" },
  catIcon: {
    width: 48,
    height: 64,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  catLabel: { fontSize: 12, fontFamily: Fonts.LeagueSpartanSemiBold },
  separator: {
    width: "100%",
    height: 1,
    backgroundColor: "#f3e9b5",
    marginTop: 20,
  },

  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionTitle: { color: "#391713", fontSize: 18, fontFamily: Fonts.LeagueSpartanBold },
  linkRow: { flexDirection: "row", alignItems: "center" },
  linkText: { color: "#e95322", fontFamily: Fonts.LeagueSpartanSemiBold },

  banner: {
    backgroundColor: "#e95322",
    borderRadius: 24,
    overflow: "hidden",
    flexDirection: "row",
    height: 128,
  },
  dots: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 12,
    gap: 8,
  },
  dotBar: {
    width: 24,
    height: 4,
    borderRadius: 4,
    backgroundColor: "#e95322",
  },

  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },

  // === Đề xuất / Recommend ===
  recommendWrap: {
    backgroundColor: "#fff",
    paddingHorizontal: 24,
    paddingBottom: 20,
    marginBottom: 16,
  },
  recommendCount: {
    color: "#e95322",
    fontSize: 13,
    fontFamily: Fonts.LeagueSpartanSemiBold,
  },
  recommendCard: {
    width: "48%",
    marginBottom: 16,
    backgroundColor: "#ffffff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#f3f4f6",
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  recommendImage: {
    width: "100%",
    height: 120,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    backgroundColor: "#f3f4f6",
  },
  recommendTitle: {
    fontSize: 14,
    color: "#391713",
    marginTop: 8,
    marginHorizontal: 8,
    fontFamily: Fonts.LeagueSpartanSemiBold,
  },
  recommendDesc: {
    fontSize: 12,
    color: "#6b7280",
    marginTop: 2,
    marginHorizontal: 8,
    marginBottom: 4,
    fontFamily: Fonts.LeagueSpartanRegular,
  },
  recommendPrice: {
    fontSize: 14,
    color: "#e95322",
    marginHorizontal: 8,
    marginBottom: 8,
    fontFamily: Fonts.LeagueSpartanBold,
  },

  heartBtn: {
    position: "absolute",
    right: 8,
    top: 8,
    backgroundColor: "#fff",
    borderRadius: 999,
    padding: 6,
    elevation: 1,
  },
  pricePill: {
    position: "absolute",
    left: 8,
    bottom: 8,
    backgroundColor: "#e95322",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  pricePillText: {
    color: "#fff",
    fontSize: 12,
    fontFamily: Fonts.LeagueSpartanBold,
  },
  copilotButton: {
    position: 'absolute',
    right: 16,
    bottom: 72, // sits above typical bottom nav (adjust if your nav is taller)
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#e95322',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    zIndex: 1000,
  },
  storeCard: {
    width: 180,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 8,
    borderWidth: 1,
    borderColor: '#f3f4f6',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  storeImage: {
    width: '100%',
    height: 96,
    borderRadius: 12,
    marginBottom: 8,
    backgroundColor: '#f3f4f6',
  },
  storeInfo: {
    paddingHorizontal: 2,
  },
  storeName: {
    fontSize: 14,
    color: '#391713',
    fontFamily: Fonts.LeagueSpartanSemiBold,
    marginBottom: 4,
  },
  storeDesc: {
    fontSize: 12,
    color: '#6b7280',
    fontFamily: Fonts.LeagueSpartanRegular,
  },
});
