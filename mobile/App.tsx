// @ts-nocheck
/* eslint-disable @typescript-eslint/ban-ts-comment */
import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text } from 'react-native';
import { Provider } from 'react-redux';
import { StatusBar } from 'expo-status-bar';

import { store } from './src/store';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from './src/store';
import { loadUserFromStorage } from './src/store/slices/authSlice';
import { fetchCart } from './src/store/slices/cartSlice';

import { HomeScreen, LoginScreen, RegisterScreen, ForgotPasswordScreen, MenuScreen, FoodDetailScreen, RatingScreen, CartScreen, OrderScreen, CheckoutScreen, OrderDetailScreen, EditOrderScreen, RatingOrderScreen, ProfileScreen } from './src/screens';
import { MainTabParamList, RootStackParamList } from '@/types';
import { COLORS, SPACING } from './src/constants';

// Define navigation types
export type RootStackParamList = {
  Home: undefined;
  Login: undefined;
  Register: undefined;
  ForgotPassword: undefined;
  MainTabs: undefined;
  FoodDetail: { foodId: number };
  RatingScreen: { foodId: number };
  Cart: undefined;
  Checkout: undefined;
  OrderDetail: { orderId: number };
  Profile: undefined;
  EditProfile: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

// Tab Navigator
const MainTabNavigator = () => {
  return (
      <Tab.Navigator
      screenOptions={({ navigation }) => ({
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.gray500,
        // increase bottom padding and height for better spacing
        tabBarStyle: {
          backgroundColor: COLORS.white,
          borderTopWidth: 1,
          borderTopColor: COLORS.border,
          paddingTop: SPACING.xs,
          paddingBottom: SPACING.lg,  // larger bottom padding
          height: 80,                  // increased height
        },
        headerShown: false,
      })}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarLabel: ({ color, size }) => (
            <Text style={{ fontSize: size, color }}>Trang chủ</Text>
          ),
          tabBarIcon: ({ color, size }) => (
            <Text style={{ fontSize: size, color }}>🏠</Text>
          ),
        }}
      />
      <Tab.Screen
        name="Menu"
        component={MenuScreen}
        options={{
          tabBarLabel: ({ color, size }) => (
            <Text style={{ fontSize: size, color }}>Thực đơn</Text>
          ),
          tabBarIcon: ({ color, size }) => (
            <Text style={{ fontSize: size, color }}>🍔</Text>
          ),
        }}
      />
      <Tab.Screen
        name="Cart"
        component={CartScreen}
        options={{
          tabBarLabel: ({ color, size }) => (
            <Text style={{ fontSize: size, color }}>Giỏ hàng</Text>
          ),
          tabBarIcon: ({ color, size }) => (
            <Text style={{ fontSize: size, color }}>🛒</Text>
          ),
        }}
      />
      <Tab.Screen
        name="Orders"
        component={OrderScreen}
        options={{
          tabBarLabel: ({ color, size }) => (
            <Text style={{ fontSize: size, color }}>Đơn hàng</Text>
          ),
          tabBarIcon: ({ color, size }) => (
            <Text style={{ fontSize: size, color }}>📋</Text>
          ),
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarLabel: ({ color, size }) => (
            <Text style={{ fontSize: size, color }}>Tài khoản</Text>
          ),
          tabBarIcon: ({ color, size }) => (
            <Text style={{ fontSize: size, color }}>👤</Text>
          ),
        }}
      />
    </Tab.Navigator>
  );
};

// App Navigator
const AppNavigator = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { isAuthenticated, loading } = useSelector((state: RootState) => state.auth);

  useEffect(() => {
    dispatch(loadUserFromStorage());
  }, [dispatch]);

  useEffect(() => {
    if (isAuthenticated) {
      dispatch(fetchCart());
    }
  }, [dispatch, isAuthenticated]);


  return (
    <NavigationContainer>
      {isAuthenticated ? (
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="MainTabs" component={MainTabNavigator} />
          <Stack.Screen name="FoodDetail" component={FoodDetailScreen} />
          <Stack.Screen name="RatingScreen" component={RatingScreen} />
          <Stack.Screen name="Checkout" component={CheckoutScreen} />
          <Stack.Screen name="OrderDetail" component={OrderDetailScreen} />
          <Stack.Screen name="EditOrder" component={EditOrderScreen} />
          <Stack.Screen name="RatingOrder" component={RatingOrderScreen} />
        </Stack.Navigator>
      ) : (
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Register" component={RegisterScreen} />
          <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
        </Stack.Navigator>
      )}
    </NavigationContainer>
  );
};

// Main App Component
export default function App() {
  return (
    <Provider store={store}>
      <StatusBar style="auto" />
      <AppNavigator />
    </Provider>
  );
}
