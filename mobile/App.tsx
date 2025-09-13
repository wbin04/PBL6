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


// App.tsx
import "react-native-gesture-handler";
import "react-native-reanimated";
import React, { useEffect } from "react";
import { StatusBar } from "expo-status-bar";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { GestureHandlerRootView } from "react-native-gesture-handler";

import * as SplashScreen from "expo-splash-screen";
import { useFonts } from "expo-font";
import { SafeAreaProvider, useSafeAreaInsets } from "react-native-safe-area-context";
import { fontAssets } from "@/constants/Fonts";

// ICONS
import {
  Home as HomeIcon,
  Heart,
  FileText,
  Headphones,
  UtensilsCrossed,
} from "lucide-react-native";

// Screens
import HomeScreen from "@/screens/home";
import RestaurantsScreen from "@/screens/restaurants";
import FavoritesScreen from "@/screens/favorites";
import CartScreen from "@/screens/cart";
import CheckoutScreen from "@/screens/CheckoutScreen";
import RestaurantDetail from "@/screens/restaurants/[id]";
import FoodDetailScreen from "@/screens/foods/[id]";
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

// Redux
import { Provider } from "react-redux";
import { store } from "@/store";

SplashScreen.preventAutoHideAsync().catch(() => {});

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function MainTabs() {
  const insets = useSafeAreaInsets();
  const TAB_BASE_HEIGHT = 42; 

  return (
    <Tab.Navigator
      initialRouteName="Home"
      screenOptions={{
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
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          elevation: 20,
        },
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarIcon: ({ color, size }) => <HomeIcon color={color} size={24} />,
        }}
      />
      <Tab.Screen
        name="Restaurants"
        component={RestaurantsScreen}
        options={{
          tabBarIcon: ({ color, size }) => <UtensilsCrossed color={color} size={24} />,
        }}
      />
      <Tab.Screen
        name="Favorites"
        component={FavoritesScreen}
        options={{
          tabBarIcon: ({ color, size }) => <Heart color={color} size={24} />,
        }}
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
        component={FavoritesScreen}
        options={{
          tabBarIcon: ({ color, size }) => <Headphones color={color} size={24} />,
        }}
      />
    </Tab.Navigator>
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
          <NavigationContainer>
            <StatusBar style="auto" />
            <Stack.Navigator screenOptions={{ headerShown: false }} initialRouteName="MainTabs">
              <Stack.Screen name="Login" component={LoginScreen} />
              <Stack.Screen name="Register" component={RegisterScreen} />

              <Stack.Screen name="MainTabs" component={MainTabs} />

              <Stack.Screen name="Checkout" component={CheckoutScreen} />
              <Stack.Screen name="Cart" component={CartScreen} />
              <Stack.Screen name="RestaurantDetail" component={RestaurantDetail} />
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
            </Stack.Navigator>
          </NavigationContainer>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </Provider>
  );
}
