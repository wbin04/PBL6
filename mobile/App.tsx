// // @ts-nocheck
// /* eslint-disable @typescript-eslint/ban-ts-comment */
// import React, { useEffect } from 'react';
// import { NavigationContainer } from '@react-navigation/native';
// import { createNativeStackNavigator } from '@react-navigation/native-stack';
// import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
// import { Text } from 'react-native';
// import { Provider } from 'react-redux';
// import { StatusBar } from 'expo-status-bar';

// import { store } from './src/store';
// import { useDispatch, useSelector } from 'react-redux';
// import { RootState, AppDispatch } from './src/store';
// import { loadUserFromStorage } from './src/store/slices/authSlice';
// import { fetchCart } from './src/store/slices/cartSlice';

// import { HomeScreen, LoginScreen, RegisterScreen, ForgotPasswordScreen, MenuScreen, FoodDetailScreen, RatingScreen, CartScreen, OrderScreen, CheckoutScreen, OrderDetailScreen, EditOrderScreen, RatingOrderScreen, ProfileScreen } from './src/screens';
// import { MainTabParamList, RootStackParamList } from '@/types';
// import { COLORS, SPACING } from './src/constants';

// // Define navigation types
// export type RootStackParamList = {
//   Home: undefined;
//   Login: undefined;
//   Register: undefined;
//   ForgotPassword: undefined;
//   MainTabs: undefined;
//   FoodDetail: { foodId: number };
//   RatingScreen: { foodId: number };
//   Cart: undefined;
//   Checkout: undefined;
//   OrderDetail: { orderId: number };
//   Profile: undefined;
//   EditProfile: undefined;
// };

// const Stack = createNativeStackNavigator<RootStackParamList>();
// const Tab = createBottomTabNavigator<MainTabParamList>();

// // Tab Navigator
// const MainTabNavigator = () => {
//   return (
//       <Tab.Navigator
//       screenOptions={({ navigation }) => ({
//         tabBarActiveTintColor: COLORS.primary,
//         tabBarInactiveTintColor: COLORS.gray500,
//         // increase bottom padding and height for better spacing
//         tabBarStyle: {
//           backgroundColor: COLORS.white,
//           borderTopWidth: 1,
//           borderTopColor: COLORS.border,
//           paddingTop: SPACING.xs,
//           paddingBottom: SPACING.lg,  // larger bottom padding
//           height: 80,                  // increased height
//         },
//         headerShown: false,
//       })}
//     >
//       <Tab.Screen
//         name="Home"
//         component={HomeScreen}
//         options={{
//           tabBarLabel: ({ color, size }) => (
//             <Text style={{ fontSize: size, color }}>Trang chủ</Text>
//           ),
//           tabBarIcon: ({ color, size }) => (
//             <Text style={{ fontSize: size, color }}>🏠</Text>
//           ),
//         }}
//       />
//       <Tab.Screen
//         name="Menu"
//         component={MenuScreen}
//         options={{
//           tabBarLabel: ({ color, size }) => (
//             <Text style={{ fontSize: size, color }}>Thực đơn</Text>
//           ),
//           tabBarIcon: ({ color, size }) => (
//             <Text style={{ fontSize: size, color }}>🍔</Text>
//           ),
//         }}
//       />
//       <Tab.Screen
//         name="Cart"
//         component={CartScreen}
//         options={{
//           tabBarLabel: ({ color, size }) => (
//             <Text style={{ fontSize: size, color }}>Giỏ hàng</Text>
//           ),
//           tabBarIcon: ({ color, size }) => (
//             <Text style={{ fontSize: size, color }}>🛒</Text>
//           ),
//         }}
//       />
//       <Tab.Screen
//         name="Orders"
//         component={OrderScreen}
//         options={{
//           tabBarLabel: ({ color, size }) => (
//             <Text style={{ fontSize: size, color }}>Đơn hàng</Text>
//           ),
//           tabBarIcon: ({ color, size }) => (
//             <Text style={{ fontSize: size, color }}>📋</Text>
//           ),
//         }}
//       />
//       <Tab.Screen
//         name="Profile"
//         component={ProfileScreen}
//         options={{
//           tabBarLabel: ({ color, size }) => (
//             <Text style={{ fontSize: size, color }}>Tài khoản</Text>
//           ),
//           tabBarIcon: ({ color, size }) => (
//             <Text style={{ fontSize: size, color }}>👤</Text>
//           ),
//         }}
//       />
//     </Tab.Navigator>
//   );
// };

// // App Navigator
// const AppNavigator = () => {
//   const dispatch = useDispatch<AppDispatch>();
//   const { isAuthenticated, loading } = useSelector((state: RootState) => state.auth);

//   useEffect(() => {
//     dispatch(loadUserFromStorage());
//   }, [dispatch]);

//   useEffect(() => {
//     if (isAuthenticated) {
//       dispatch(fetchCart());
//     }
//   }, [dispatch, isAuthenticated]);


//   return (
//     <NavigationContainer>
//       {isAuthenticated ? (
//         <Stack.Navigator screenOptions={{ headerShown: false }}>
//           <Stack.Screen name="MainTabs" component={MainTabNavigator} />
//           <Stack.Screen name="FoodDetail" component={FoodDetailScreen} />
//           <Stack.Screen name="RatingScreen" component={RatingScreen} />
//           <Stack.Screen name="Checkout" component={CheckoutScreen} />
//           <Stack.Screen name="OrderDetail" component={OrderDetailScreen} />
//           <Stack.Screen name="EditOrder" component={EditOrderScreen} />
//           <Stack.Screen name="RatingOrder" component={RatingOrderScreen} />
//         </Stack.Navigator>
//       ) : (
//         <Stack.Navigator screenOptions={{ headerShown: false }}>
//           <Stack.Screen name="Login" component={LoginScreen} />
//           <Stack.Screen name="Register" component={RegisterScreen} />
//           <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
//         </Stack.Navigator>
//       )}
//     </NavigationContainer>
//   );
// };

// // Main App Component
// export default function App() {
//   return (
//     <Provider store={store}>
//       <StatusBar style="auto" />
//       <AppNavigator />
//     </Provider>
//   );
// }


import "react-native-gesture-handler";
import "react-native-reanimated";
import React, { useEffect, useState, useCallback } from "react";
import { StatusBar } from "expo-status-bar";
import { NavigationContainer, useFocusEffect } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import * as SplashScreen from "expo-splash-screen";
import { useFonts } from "expo-font";
import { SafeAreaProvider, useSafeAreaInsets } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
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
import CheckoutScreen from "@/screens/checkout";
import RestaurantDetail from "@/screens/restaurants/[id]";
import FoodDetailScreen from "@/screens/foods/[id]";
import FoodReviewsScreen from "@/screens/foods/[id]/reviews";
import CardPaymentScreen from "@/screens/payment/card";
import BankPaymentScreen from "@/screens/payment/bank";
import AddressListScreen from "@/screens/address";
import AddAddressScreen from "@/screens/address/add";
import LoginScreen from "@/screens/welcome/login";
import RegisterScreen from "@/screens/welcome/signup";
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
import TwoFactorAuthScreen from "@/screens/TwoFactorAuth";
import WithdrawalMethodsScreen from "@/screens/withdrawalMethod";
import Sidebar from "@/components/sidebar";

SplashScreen.preventAutoHideAsync().catch(() => {});

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function MainTabs() {
  const insets = useSafeAreaInsets();
  const TAB_BASE_HEIGHT = 42;

  const [mode, setMode] = useState<"customer" | "shipper" | null>(null);

  const readMode = useCallback(async () => {
    const v = await AsyncStorage.getItem("activeRole");
    setMode(v === "shipper" ? "shipper" : "customer");
  }, []);

  useEffect(() => { readMode(); }, [readMode]);
  useFocusEffect(useCallback(() => { readMode(); }, [readMode]));

  if (!mode) return null;

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
        component={CartScreen}
        options={{ tabBarIcon: ({ color }) => <FileText color={color} size={24} /> }}
      />
      <Tab.Screen
        name="Support"
        component={CheckoutScreen}
        options={{ tabBarIcon: ({ color }) => <Headphones color={color} size={24} /> }}
      />
      {/* <Tab.Screen name="RestaurantDetail" component={RestaurantDetail} options={{ tabBarButton: () => null }} /> */}
    </Tab.Navigator>
  );
}

export default function App() {
  const [loaded] = useFonts(fontAssets);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (loaded) SplashScreen.hideAsync().catch(() => {});
  }, [loaded]);

  if (!loaded) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <NavigationContainer>
          <StatusBar style="auto" />
          <Stack.Navigator screenOptions={{ headerShown: false }} initialRouteName="Login">
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Register" component={RegisterScreen} />
            <Stack.Screen name="MainTabs" component={MainTabs} />
            {/* Các màn detail ngoài tab (ẩn tabbar khi push) */}
            <Stack.Screen name="Checkout" component={CheckoutScreen} />
            <Stack.Screen name="Cart" component={CartScreen} />
            <Stack.Screen name="RestaurantDetail" component={RestaurantDetail} />
            <Stack.Screen name="FoodDetail" component={FoodDetailScreen} />
            <Stack.Screen name="FoodReviews" component={FoodReviewsScreen} />
            <Stack.Screen name="CardPayment" component={CardPaymentScreen} />
            <Stack.Screen name="BankPayment" component={BankPaymentScreen} />
            <Stack.Screen name="AddressList" component={AddressListScreen} />
            <Stack.Screen name="AddAddress" component={AddAddressScreen} />
            {/* <Stack.Screen name="Map" component={MapScreen} /> */}
            <Stack.Screen name="PasswordSetting" component={PasswordSettingScreen} />
            <Stack.Screen name="ShipperWallet" component={WalletScreen} />
            <Stack.Screen name="ChangeWalletPassword" component={ChangeWalletPasswordScreen} />
            <Stack.Screen name="ShipperProfile" component={ShipperProfileScreen} />
            <Stack.Screen name="WalletTransactions" component={WalletTransactionsScreen} />
            <Stack.Screen name="NotificationSetting" component={NotificationSettingsScreen} />
            <Stack.Screen name="TwoFASetting" component={TwoFactorAuthScreen} />
            <Stack.Screen name="WithdrawMethods" component={WithdrawalMethodsScreen} />
          </Stack.Navigator>

          <Sidebar
            isOpen={sidebarOpen}
            onClose={() => setSidebarOpen(false)}
          />
        </NavigationContainer>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
