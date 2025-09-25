import React, { useEffect } from 'react';
import { useNavigation } from '@react-navigation/native';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '@/store';
import { loadUserFromStorage } from '@/store/slices/authSlice';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface AuthNavigatorProps {
  children: React.ReactNode;
}

export const AuthNavigator: React.FC<AuthNavigatorProps> = ({ children }) => {
  const navigation = useNavigation();
  const dispatch = useDispatch<AppDispatch>();
  const { isAuthenticated, user, loading } = useSelector((state: RootState) => state.auth);

  useEffect(() => {
    // Load user from storage when app starts
    dispatch(loadUserFromStorage());
  }, [dispatch]);

  useEffect(() => {
    if (!loading) {
      handleNavigation();
    }
  }, [isAuthenticated, user, loading]);

  const handleNavigation = async () => {
    if (!isAuthenticated) {
      // Not authenticated - show login screen
      navigation.reset({
        index: 0,
        routes: [{ name: 'Login' as never }],
      });
      return;
    }

    if (user) {
      // Authenticated - navigate based on role
      await navigateByRole(user.role);
    }
  };

  const navigateByRole = async (role: string) => {
    console.log('Navigating by role:', role);

    switch (role) {
      case 'Khách hàng':
        // Set customer mode and navigate to customer tabs
        await AsyncStorage.setItem('activeRole', 'customer');
        navigation.reset({
          index: 0,
          routes: [{ name: 'MainTabs' as never }],
        });
        break;

      case 'Người vận chuyển':
        // Set shipper mode and navigate to shipper tabs
        await AsyncStorage.setItem('activeRole', 'shipper');
        navigation.reset({
          index: 0,
          routes: [{ name: 'MainTabs' as never }],
        });
        break;

      case 'Quản lý':
        // Navigate to admin dashboard
        await AsyncStorage.setItem('activeRole', 'admin');
        navigation.reset({
          index: 0,
          routes: [{ name: 'AdminDashboard' as never }],
        });
        break;

      case 'Chủ cửa hàng':
        // Navigate to store management
        await AsyncStorage.setItem('activeRole', 'store_manager');
        // Add store manager navigation here if needed
        navigation.reset({
          index: 0,
          routes: [{ name: 'StoreDetailScreen' as never }],
        });
        break;

      default:
        console.warn('Unknown role:', role);
        // Default to customer
        await AsyncStorage.setItem('activeRole', 'customer');
        navigation.reset({
          index: 0,
          routes: [{ name: 'MainTabs' as never }],
        });
        break;
    }
  };

  return <>{children}</>;
};