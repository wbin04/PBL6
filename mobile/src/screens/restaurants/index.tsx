import { useNavigation } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { useEffect, useMemo, useState } from "react";
import {
  FlatList,
  LayoutChangeEvent,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ActivityIndicator,
  RefreshControl,
  Image,
} from "react-native";
import { ArrowLeft, Search, ShoppingCart, User } from "lucide-react-native";
import { useDispatch, useSelector } from 'react-redux';

// Import StoreCard component thay vì RestaurantCard1
import { StoreCard } from "@/components";
import { Fonts } from "@/constants/Fonts";
import { RootState, AppDispatch } from '@/store';
import { fetchStoresWithStats } from '@/store/slices/storesSlice';
import { Store } from '@/types';
const CopilotIcon = require('@/assets/images/CopilotIcon.png');
const TABS = ["Tất cả", "Burger", "Pizza", "Lành mạnh"] as const;

const CONTENT_PADDING = 16;
const ITEM_PADDING = 22;

export default function RestaurantsIndex() {
  const navigation = useNavigation<any>(); 
  const dispatch = useDispatch<AppDispatch>();
  const { stores, loading } = useSelector((state: RootState) => state.stores);

  const [q, setQ] = useState("");
  const [tab, setTab] = useState<(typeof TABS)[number]>("Tất cả");
  const [favorites, setFavorites] = useState<number[]>([]);
  const [headerH, setHeaderH] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    // Load stores from API
    dispatch(fetchStoresWithStats());
    
    // Load favorites from storage
    AsyncStorage.getItem("fav_restaurants").then((r) =>
      setFavorites(r ? JSON.parse(r) : [])
    );
  }, [dispatch]);

  const filtered = useMemo<Store[]>(() => {
    const qnorm = q.trim().toLowerCase();
    return stores.filter((store) => {
      const nameHit = store.store_name.toLowerCase().includes(qnorm);
      const descHit = store.description?.toLowerCase().includes(qnorm) || false;
      // TODO: Implement category filtering based on store food categories
      const tabHit = tab === "Tất cả" ? true : true; // For now, show all for non-"Tất cả" tabs
      return (nameHit || descHit) && tabHit;
    });
  }, [q, tab, stores]);

  const toggleFav = (id: number) => {
    setFavorites((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
      AsyncStorage.setItem("fav_restaurants", JSON.stringify(next));
      return next;
    });
  };

  const onHeaderLayout = (e: LayoutChangeEvent) => {
    const h = e.nativeEvent.layout.height;
    if (h !== headerH) setHeaderH(h);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await dispatch(fetchStoresWithStats()).unwrap();
    } catch (error) {
      console.error('Error refreshing stores:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const renderStoreItem = ({ item }: { item: Store }) => (
    <View style={{ paddingHorizontal: ITEM_PADDING, marginBottom: 16 }}>
      <StoreCard 
        store={item}
        onPress={() => navigation.navigate("StoreDetail", { storeId: item.id })}
      />
    </View>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }}>
      <View style={styles.fixedHeader} onLayout={onHeaderLayout}>
        <View style={styles.headerWrap}>
          <View style={styles.headerTopRow}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.roundIconBtn}>
              <ArrowLeft size={24} color="#eb552d" />
            </TouchableOpacity>

            <Text style={styles.headerTitle}>Cửa hàng</Text>

            <View style={{ flexDirection: "row", gap: 10 }}>
              <TouchableOpacity
                style={styles.roundIconBtn}
                onPress={() => navigation.navigate("Cart")}
              >
                <ShoppingCart size={24} color="#eb552d" />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.roundIconBtn}
                onPress={() => navigation.navigate("Support" as any)} 
              >
                <User size={24} color="#eb552d" />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.searchRow}>
            <View style={styles.searchBox}>
              <TextInput
                placeholder="Tìm kiếm cửa hàng..."
                placeholderTextColor="#9CA3AF"
                value={q}
                onChangeText={setQ}
                style={styles.searchInput}
                returnKeyType="search"
              />
              <TouchableOpacity style={styles.searchBtn} onPress={() => {}}>
                <Search size={16} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Tabs */}
        <View style={styles.tabs}>
          {TABS.map((t) => {
            const active = t === tab;
            return (
              <TouchableOpacity
                key={t}
                onPress={() => setTab(t)}
                style={[styles.tab, active && styles.tabActive]}
              >
                <Text style={[styles.tabText, active && styles.tabTextActive]}>{t}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.foundWrap}>
          <Text style={styles.foundText}>
            Tìm thấy <Text style={styles.foundNum}>{filtered.length}</Text> cửa hàng
          </Text>
        </View>
      </View>

      {/* Loading indicator */}
      {loading && !refreshing && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#EB552D" />
          <Text style={styles.loadingText}>Đang tải danh sách cửa hàng...</Text>
        </View>
      )}

      {/* Danh sách */}
      <FlatList
        contentContainerStyle={{ 
          paddingBottom: 110, 
          paddingTop: headerH + 16,
          flexGrow: 1 
        }}
        data={filtered}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderStoreItem}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={["#EB552D"]}
            tintColor="#EB552D"
          />
        }
        ListEmptyComponent={
          !loading ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>
                {q.trim() ? "Không tìm thấy cửa hàng nào" : "Chưa có cửa hàng nào"}
              </Text>
            </View>
          ) : null
        }
      />
      {/* Floating Copilot button - positioned above bottom nav */}
      <TouchableOpacity
        accessibilityLabel="Copilot"
        onPress={() => navigation.navigate('Chatbot' as never)}
        activeOpacity={0.85}
        style={styles.copilotButton}
      >
        <Image
          source={CopilotIcon}
          style={{ width: 28, height: 28, tintColor: '#ffffff' }}
          resizeMode="contain"
        />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  fixedHeader: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    zIndex: 10,
    backgroundColor: "#fff",
  },
  headerWrap: {
    backgroundColor: "#f5cb58",
    paddingTop: 0,
    paddingBottom: 12,
  },
  headerTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 45,
    marginBottom: 12,
    paddingHorizontal: CONTENT_PADDING,
  },
  roundIconBtn: {
    backgroundColor: "#FFFFFF",
    padding: 10,
    borderRadius: 999,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
    elevation: 1,
  },
  headerTitle: {
    fontSize: 20,
    color: "#ffffff",
    fontFamily: Fonts.LeagueSpartanExtraBold,
  },
  searchRow: {
    paddingBottom: 15,
    paddingHorizontal: CONTENT_PADDING,
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 999,
    paddingLeft: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  searchInput: {
    flex: 1,
    height: 42,
    fontSize: 14,
    color: "#111827",
    fontFamily: Fonts.LeagueSpartanRegular,
  },
  searchBtn: {
    height: 42,
    width: 42,
    borderRadius: 999,
    backgroundColor: "#EB552D",
    alignItems: "center",
    justifyContent: "center",
    margin: 4,
  },
  tabs: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 14,
    paddingHorizontal: 16,
    paddingTop: 12,
    backgroundColor: "#fff",
  },
  tab: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: "#F2F3F5",
  },
  tabActive: {
    backgroundColor: "#EB552D",
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  tabText: {
    color: "#6B7280",
    fontFamily: Fonts.LeagueSpartanMedium,
    fontSize: 14,
  },
  tabTextActive: {
    color: "#FFFFFF",
    fontFamily: Fonts.LeagueSpartanSemiBold,
    fontSize: 14,
  },
  foundWrap: {
    marginTop: 12,
    backgroundColor: "#F6F7F8",
    paddingVertical: 14,
    paddingHorizontal: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  foundText: {
    color: "#6B7280",
    marginLeft: 6,
    fontSize: 15,
    fontFamily: Fonts.LeagueSpartanRegular,
  },
  foundNum: {
    color: "#111827",
    fontFamily: Fonts.LeagueSpartanBold,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 100,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: "#6B7280",
    fontFamily: Fonts.LeagueSpartanRegular,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 100,
  },
  emptyText: {
    fontSize: 16,
    color: "#6B7280",
    fontFamily: Fonts.LeagueSpartanRegular,
    textAlign: "center",
  },
  copilotButton: {
    position: 'absolute',
    right: 16,
    bottom: 72,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#EB552D',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    zIndex: 1000,
  },
});
