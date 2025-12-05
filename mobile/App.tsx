import 'react-native-get-random-values';
import "react-native-gesture-handler";
import "react-native-reanimated";
import React, { useEffect, useState, useCallback, useMemo } from "react";
import { StatusBar } from "expo-status-bar";
import { NavigationContainer, useFocusEffect } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import * as SplashScreen from "expo-splash-screen";
import { useFonts } from "expo-font";
import { SafeAreaProvider, useSafeAreaInsets } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { VoucherProvider } from "./src/contexts/VoucherContext";
import { ShipperProvider } from "./src/context/ShipperContext";
import { AdminProvider } from "./src/contexts/AdminContext";
import { fontAssets } from "@/constants/Fonts";

// ICONS
import {
  Home as HomeIcon,
  Heart,
  FileText,
  Headphones,
  UtensilsCrossed,
  Package,
  MapPin,
  BarChart3,
  User,
} from "lucide-react-native";

// Screens
import HomeScreen from "@/screens/home";
import RestaurantsScreen from "@/screens/restaurants";
import FavoritesScreen from "@/screens/favorites";
import CartScreen from "@/screens/cart";
import CheckoutScreen from "@/screens/CheckoutScreen";
import RestaurantDetail from "@/screens/restaurants/[id]";
import FoodDetailScreen from "@/screens/foods/[id]";
import { StoreDetailScreen } from "@/screens/StoreDetailScreen";
import FoodReviewsScreen from "@/screens/foods/[id]/reviews";
import CardPaymentScreen from "@/screens/payment/card";
import BankPaymentScreen from "@/screens/payment/bank";
import AddressListScreen from "@/screens/address";
import AddAddressScreen from "@/screens/address/AddAddressScreen";
import LoginScreen from "@/screens/welcome/login";
import RegisterScreen from "@/screens/welcome/signup";
import ManageOrdersScreen from "@/screens/ManageOrdersScreen";
import CancelScreen from "@/screens/CancelScreen";
import TrackingScreen from "@/screens/TrackingScreen";
import MapTrackingScreen from "@/screens/MapTrackingScreen";
import AddressSelectionScreen from "@/screens/address/AddressSelectionScreen";
import ReviewScreen from "@/screens/ReviewScreen";
import CancelDetailScreen from "@/screens/CancelDetailScreen";
import AddressPickerScreen from "@/screens/address/AddressPickerScreen";
import { ProfileScreen } from "@/screens/ProfileScreen";
import RatingScreen from "@/screens/RatingScreen";
import ChatbotScreen from "@/screens/ChatbotScreen";

// Redux
import { Provider, useSelector, useDispatch } from "react-redux";
import { store, RootState, AppDispatch } from "@/store";
import { loadUserFromStorage } from '@/store/slices/authSlice';
import ShipperTaskScreen from "@/screens/task";
import MapScreen from "@/screens/map";
import ShipperSupportScreen from "@/screens/support";
import ShipperAccountScreen from "@/screens/account/shipper";
import PasswordSettingScreen from "@/screens/password";
import WalletScreen from "@/screens/wallet";
import ChangeWalletPasswordScreen from "@/screens/wallet/resetpassword";
import ShipperProfileScreen from "@/screens/profile";
import WalletTransactionsScreen from "@/screens/wallet/transactions";
import NotificationSettingsScreen from "@/screens/notification";
import ShipperStatsScreen from "@/screens/statistics";
import TwoFactorAuthScreen from "@/screens/withdrawalMethod";
import WithdrawalMethodsScreen from "@/screens/withdrawalMethod";
import Sidebar from "@/components/sidebar";

SplashScreen.preventAutoHideAsync().catch(() => {});

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function MainTabs() {
  const insets = useSafeAreaInsets();
  const { user } = useSelector((state: RootState) => state.auth);
  const TAB_BASE_HEIGHT = 42;

  const [mode, setMode] = useState<"customer" | "shipper" | null>(null);

  const readMode = useCallback(async () => {
    const activeRole = await AsyncStorage.getItem("activeRole");
    console.log('MainTabs - activeRole from storage:', activeRole);
    console.log('MainTabs - user role:', user?.role, 'role_id:', user?.role_id);
    
    // Check both role name and role_id (4 = Người vận chuyển)
    const isShipper = user?.role === 'Người vận chuyển' || user?.role_id === 4;
    const isSeller = user?.role === 'Chủ cửa hàng' || user?.role_id === 3;
    
    if (isShipper) {
      // If no activeRole is set, default to shipper for "Người vận chuyển"
      if (!activeRole) {
        console.log('MainTabs - Setting default activeRole to shipper');
        await AsyncStorage.setItem("activeRole", "shipper");
        setMode("shipper");
        return;
      }
      // Use the stored activeRole
      const newMode = activeRole === "shipper" ? "shipper" : "customer";
      console.log('MainTabs - Setting mode to:', newMode);
      setMode(newMode);
    } else if (isSeller) {
      // Seller can only be customer when shopping
      console.log('MainTabs - Seller role, setting mode to customer');
      setMode("customer");
    } else {
      // Regular customer
      console.log('MainTabs - Regular customer, setting mode to customer');
      setMode("customer");
    }
  }, [user?.role, user?.role_id]);

  useEffect(() => {
    readMode();
  }, [readMode]);

  // Re-read mode when sidebar might have changed activeRole
  useFocusEffect(useCallback(() => {
    readMode();
  }, [readMode]));

  if (!mode || !user) {
    return null; // Show loading or placeholder
  }

  const commonTabOptions = {
    headerShown: false,
    tabBarShowLabel: false,
    tabBarHideOnKeyboard: true,
    tabBarActiveTintColor: "#fff",
    tabBarInactiveTintColor: "rgba(255,255,255,0.7)",
    tabBarStyle: {
      backgroundColor: "#e95322",
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      height: TAB_BASE_HEIGHT + insets.bottom,
      paddingBottom: insets.bottom,
      paddingTop: 6,
      position: "absolute" as const,
      left: 0, right: 0, bottom: 0,
      elevation: 20,
    },
  };

  if (mode === "shipper") {
    return (
      <Tab.Navigator initialRouteName="ShipperOrders" screenOptions={commonTabOptions}>
        <Tab.Screen
          name="ShipperOrders"
          component={ShipperTaskScreen}
          options={{ tabBarIcon: ({ color }) => <Package color={color} size={24} /> }}
        />
        <Tab.Screen
          name="ShipperMap"
          component={MapScreen}
          options={{ tabBarIcon: ({ color }) => <MapPin color={color} size={24} /> }}
        />
        <Tab.Screen
          name="ShipperStats"
          component={ShipperStatsScreen }
          options={{ tabBarIcon: ({ color }) => <BarChart3 color={color} size={24} /> }}
        />
        <Tab.Screen
          name="ShipperSupport"
          component={ShipperSupportScreen}
          options={{ tabBarIcon: ({ color }) => <Headphones color={color} size={24} /> }}
        />
        <Tab.Screen
          name="ShipperAccount"
          component={ShipperAccountScreen}
          options={{ tabBarIcon: ({ color }) => <User color={color} size={24} /> }}
        />
      </Tab.Navigator>
    );
  }

  // Customer
  return (
    <Tab.Navigator initialRouteName="Home" screenOptions={commonTabOptions}>
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{ tabBarIcon: ({ color }) => <HomeIcon color={color} size={24} /> }}
      />
      <Tab.Screen
        name="Restaurants"
        component={RestaurantsScreen}
        options={{ tabBarIcon: ({ color }) => <UtensilsCrossed color={color} size={24} /> }}
      />
      <Tab.Screen
        name="Favorites"
        component={FavoritesScreen}
        options={{ tabBarIcon: ({ color }) => <Heart color={color} size={24} /> }}
      />
      <Tab.Screen
        name="Orders"
        component={ManageOrdersScreen}
        options={{
          tabBarIcon: ({ color, size }) => <FileText color={color} size={24} />,
        }}
      />
      <Tab.Screen
        name="Support"
        component={CheckoutScreen}
        options={{ tabBarIcon: ({ color }) => <Headphones color={color} size={24} /> }}
      />
    </Tab.Navigator>
  );
}

function AppNavigator() {
  const dispatch = useDispatch<AppDispatch>();
  const { isAuthenticated, loading, user } = useSelector((state: RootState) => state.auth);

  useEffect(() => {
    // Load user from storage on app start
    dispatch(loadUserFromStorage());
  }, [dispatch]);

  console.log('App Navigator - Auth state:', { isAuthenticated, loading, userRole: user?.role });

  // Show loading screen while checking authentication
  if (loading) {
    return null; // You can add a loading screen component here
  }

  // Determine initial route based on auth state and user role
  let initialRouteName = "Login";
  // Ensure role is loaded before determining initial route
  if (!isAuthenticated || (!user?.role && !user?.role_id)) {
    initialRouteName = "Login";
  } else {
    // Check both role name and role_id for better compatibility
    if (user.role === 'Chủ cửa hàng' || user.role_id === 3) {
      initialRouteName = "SellerDashboard";
    } else if (user.role === 'Quản lý' || user.role_id === 2) {
      initialRouteName = "AdminDashboard";
    } else {
      // Default to MainTabs for customers and shippers
      initialRouteName = "MainTabs";
    }
  }

  return (
    <VoucherProvider>
      <ShipperProvider>
        <AdminProvider>
          <NavigationContainer>
            <StatusBar style="auto" />
            <Stack.Navigator 
              screenOptions={{ headerShown: false }} 
              initialRouteName={initialRouteName}
            >
            {!isAuthenticated ? (
              // Auth screens - show when not authenticated
              <>
                <Stack.Screen 
                  name="Login" 
                  component={LoginScreen}
                  options={{ gestureEnabled: false }}
                />
                <Stack.Screen name="Register" component={RegisterScreen} />
              </>
            ) : (
              // Main app screens - show when authenticated
              <>
                {/* Admin Dashboard */}
                {(user?.role === 'Quản lý' || user?.role_id === 2) && (
                  <Stack.Screen 
                    name="AdminDashboard" 
                    component={require('./src/screens/AdminDashboardScreen').default}
                    options={{ gestureEnabled: false }}
                  />
                )}
                
                {/* Admin screens */}
                <Stack.Screen name="CustomerListScreen" component={require('./src/screens/CustomerListScreen').default} />
                <Stack.Screen name="StoreListScreen" component={require('./src/screens/StoreListScreen').default} />
                <Stack.Screen name="OrderListScreen" component={require('./src/screens/OrderListScreen').default} />
                <Stack.Screen name="ShipperListScreen" component={require('./src/screens/ShipperListScreen').default} />
                
                {/* Seller Dashboard */}
                {(user?.role === 'Chủ cửa hàng' || user?.role_id === 3) && (
                  <Stack.Screen 
                    name="SellerDashboard" 
                    component={require('./src/screens/seller/DashboardScreen').default}
                    options={{ gestureEnabled: false }}
                  />
                )}
                
                {/* MainTabs - Always available for all authenticated users */}
                <Stack.Screen 
                  name="MainTabs" 
                  component={MainTabs}
                  options={{ gestureEnabled: false }}
                />
                
                {/* Seller screens */}
                <Stack.Screen name="SellerProfileScreen" component={require('./src/screens/seller/SellerProfileScreen').default} />
                <Stack.Screen name="SellerManageMenuScreen" component={require('./src/screens/seller/ManageMenuScreen').default} />
                <Stack.Screen name="AddFoodScreen" component={require('./src/screens/seller/AddFoodScreen').default} />
                <Stack.Screen name="EditFoodScreen" component={require('./src/screens/seller/EditFoodScreen').default} />
                <Stack.Screen name="FoodDetailScreen" component={require('./src/screens/seller/FoodDetailScreen').default} />
                <Stack.Screen name="SellerProfileEditScreen" component={require('./src/screens/seller/SellerProfileEditScreen').default} />
                <Stack.Screen name="SellerVoucherEditScreen" component={require('./src/screens/seller/VoucherEditScreen').default} />
                <Stack.Screen name="SellerVoucherManagementScreen" component={require('./src/screens/seller/VoucherManagementScreen').default} />
                <Stack.Screen name="NewOrderListScreen" component={require('./src/screens/seller/NewOrderListScreen').default} />
                
                {/* Common screens available to all authenticated users */}
                <Stack.Screen name="UpdateCustomerScreen" component={require('./src/screens/UpdateCustomerScreen').default} />
                <Stack.Screen name="StoreDetailScreen" component={require('./src/screens/StoreDetailScreen').StoreDetailScreen} />
                <Stack.Screen name="StoreDetailScreenV2" component={require('./src/screens/StoreDetailScreenV2').StoreDetailScreenV2} />
                <Stack.Screen name="Checkout" component={CheckoutScreen} />
                <Stack.Screen name="Cart" component={CartScreen} />
                <Stack.Screen name="RestaurantDetail" component={RestaurantDetail} />
                <Stack.Screen name="StoreDetail" component={StoreDetailScreen} />
                <Stack.Screen name="FoodDetail" component={FoodDetailScreen} />
                <Stack.Screen name="FoodReviews" component={FoodReviewsScreen} />
                <Stack.Screen name="CardPayment" component={CardPaymentScreen} />
                <Stack.Screen name="BankPayment" component={BankPaymentScreen} />
                <Stack.Screen name="AddressList" component={AddressListScreen} />
                <Stack.Screen name="AddAddress" component={AddAddressScreen} />
                <Stack.Screen name="Cancel" component={CancelScreen} />
                <Stack.Screen name="Tracking" component={TrackingScreen} />
                <Stack.Screen name="MapTracking" component={MapTrackingScreen} />
                <Stack.Screen name="AddressSelection" component={AddressSelectionScreen} />
                <Stack.Screen name="AddressPicker" component={AddressPickerScreen} />
                <Stack.Screen name="Review" component={ReviewScreen} />
                <Stack.Screen name="CancelDetail" component={CancelDetailScreen} />
                <Stack.Screen name="Profile" component={ProfileScreen} />
                <Stack.Screen name="Chatbot" component={ChatbotScreen} />
                <Stack.Screen name="FoodDetailPopup" component={require('./src/screens/FoodDetailPopup').default} />
                <Stack.Screen name="VoucherManagementScreen" component={require('./src/screens/VoucherManagementScreen').default} />
                <Stack.Screen name="VoucherEditScreen" component={require('./src/screens/VoucherEditScreen').default} />
                <Stack.Screen name="ShipperEditScreen" component={require('./src/screens/ShipperEditScreen').default} />
                <Stack.Screen name="ShipperDetailScreen" component={require('./src/screens/ShipperDetailScreen').default} />
              </>
            )}
          </Stack.Navigator>
        </NavigationContainer>
      </AdminProvider>
      </ShipperProvider>
    </VoucherProvider>
  );
}

export default function App() {
  const [loaded] = useFonts(fontAssets);

  useEffect(() => {
    if (loaded) SplashScreen.hideAsync().catch(() => {});
  }, [loaded]);

  if (!loaded) return null;

  return (
    <Provider store={store}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider>
          <AppNavigator />
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </Provider>
  );
}
