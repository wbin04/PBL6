import { Platform } from 'react-native';
import Constants from 'expo-constants';

// API Configuration
// Determine API host: Android emulator, Expo Go on device via debuggerHost, or localhost
const getApiHost = () => {
  // Android emulator uses 10.0.2.2
  if (Platform.OS === 'android') {
    return '10.0.2.2';
  }
  // Web uses localhost
  if (Platform.OS === 'web') {
    return 'localhost';
  }
  // Expo Go on iOS or device: derive host from debuggerHost in manifest or expoConfig
  const manifestHost = Constants.manifest?.debuggerHost;
  const configHost = (Constants.expoConfig as any)?.debuggerHost;
  const hostStr = manifestHost || configHost;
  if (hostStr) {
    return hostStr.split(':')[0];
  }
  // Fallback to localhost
  return 'localhost';
};

// Use dynamic API host instead of static IP
export const API_CONFIG = {
  BASE_URL: `http://192.168.1.5:8000/api`, // Dynamic host resolution
  TIMEOUT: 10000,
  RETRY_ATTEMPTS: 3,
};

// Log the API URL for debugging
console.log('API_CONFIG.BASE_URL:', API_CONFIG.BASE_URL);
console.log('Platform OS:', Platform.OS);
console.log('Constants.manifest?.debuggerHost:', Constants.manifest?.debuggerHost);
console.log('Constants.expoConfig?.debuggerHost:', (Constants.expoConfig as any)?.debuggerHost);

// App Colors
export const COLORS = {
  primary: '#FF6B35',
  primaryDark: '#E55A2B',
  secondary: '#FFA726',
  success: '#4CAF50',
  warning: '#FF9800',
  error: '#F44336',
  info: '#2196F3',
  
  // Neutral colors
  white: '#FFFFFF',
  black: '#000000',
  gray100: '#F5F5F5',
  gray200: '#EEEEEE',
  gray300: '#E0E0E0',
  gray400: '#BDBDBD',
  gray500: '#9E9E9E',
  gray600: '#757575',
  gray700: '#616161',
  gray800: '#424242',
  gray900: '#212121',
  
  // Background colors
  background: '#FAFAFA',
  surface: '#FFFFFF',
  card: '#FFFFFF',
  
  // Text colors
  text: '#212121',
  textSecondary: '#757575',
  textDisabled: '#BDBDBD',
  
  // Border colors
  border: '#E0E0E0',
  divider: '#E0E0E0',
};

// Typography
export const FONTS = {
  regular: 'System',
  medium: 'System',
  bold: 'System',
  light: 'System',
};

export const FONT_SIZES = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 18,
  xl: 20,
  xxl: 24,
  xxxl: 28,
  display: 32,
};

// Spacing
export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 40,
  xxxl: 48,
};

// Border radius
export const BORDER_RADIUS = {
  none: 0,
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  xxl: 20,
  full: 9999,
};

// Shadows
export const SHADOWS = {
  sm: {
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.18,
    shadowRadius: 1.0,
    elevation: 1,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.23,
    shadowRadius: 2.62,
    elevation: 4,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.30,
    shadowRadius: 4.65,
    elevation: 8,
  },
};

// Screen dimensions
export const SCREEN = {
  width: 375, // Default width
  height: 812, // Default height
};

// API Endpoints
export const ENDPOINTS = {
  // Auth
  LOGIN: '/auth/login/',
  REGISTER: '/auth/register/',
  REFRESH: '/auth/refresh/',
  PROFILE: '/auth/profile/',
  RESET_PASSWORD: '/auth/reset-password/',
  
  // Menu
  CATEGORIES: '/menu/categories/',
  FOODS: '/menu/items/',
  FOOD_DETAIL: (id: number) => `/menu/items/${id}/`,
  CATEGORY_FOODS: (id: number) => `/menu/categories/${id}/foods/`,
  
  // Cart
  CART: '/cart/',
  ADD_TO_CART: '/cart/add/',
  UPDATE_CART_ITEM: (foodId: number) => `/cart/items/${foodId}/`,
  REMOVE_FROM_CART: (foodId: number) => `/cart/items/${foodId}/remove/`,
  CLEAR_CART: '/cart/clear/',
  
  // Orders
  ORDERS: '/orders/',
  ORDER_DETAIL: (id: number) => `/orders/${id}/`,
  UPDATE_ORDER_STATUS: (id: number) => `/orders/${id}/status/`,
  
  // Payments
  CREATE_PAYMENT: '/payments/create/',
  PAYMENT_WEBHOOK: '/payments/webhook/',
  
  // Promotions
  PROMOTIONS: '/promotions/',
  VALIDATE_PROMO: '/promotions/validate/',
  
  // Ratings
  RATINGS: '/ratings/',
  RATING_DETAIL: (id: number) => `/ratings/${id}/`,
};

// Storage Keys
export const STORAGE_KEYS = {
  ACCESS_TOKEN: 'access_token',
  REFRESH_TOKEN: 'refresh_token',
  USER: 'user',
  CART_COUNT: 'cart_count',
  LAST_VIEWED_CATEGORIES: 'last_viewed_categories',
};

// Order Status
export const ORDER_STATUS = {
  PENDING: 'pending',
  CONFIRMED: 'confirmed',
  PREPARING: 'preparing',
  READY: 'ready',
  DELIVERED: 'delivered',
  CANCELLED: 'cancelled',
} as const;

export const ORDER_STATUS_LABELS = {
  [ORDER_STATUS.PENDING]: 'Chờ xác nhận',
  [ORDER_STATUS.CONFIRMED]: 'Đã xác nhận',
  [ORDER_STATUS.PREPARING]: 'Đang chuẩn bị',
  [ORDER_STATUS.READY]: 'Sẵn sàng',
  [ORDER_STATUS.DELIVERED]: 'Đã giao',
  [ORDER_STATUS.CANCELLED]: 'Đã hủy',
};

export const ORDER_STATUS_COLORS = {
  [ORDER_STATUS.PENDING]: COLORS.warning,
  [ORDER_STATUS.CONFIRMED]: COLORS.info,
  [ORDER_STATUS.PREPARING]: COLORS.secondary,
  [ORDER_STATUS.READY]: COLORS.success,
  [ORDER_STATUS.DELIVERED]: COLORS.success,
  [ORDER_STATUS.CANCELLED]: COLORS.error,
};

// Payment Methods
export const PAYMENT_METHODS = {
  CASH: 'cash',
  VNPAY: 'vnpay',
  MOMO: 'momo',
} as const;

export const PAYMENT_METHOD_LABELS = {
  [PAYMENT_METHODS.CASH]: 'Tiền mặt',
  [PAYMENT_METHODS.VNPAY]: 'VNPay',
  [PAYMENT_METHODS.MOMO]: 'MoMo',
};

// Validation rules
export const VALIDATION = {
  EMAIL_REGEX: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  PHONE_REGEX: /^[0-9]{10,11}$/,
  PASSWORD_MIN_LENGTH: 3,
  NAME_MIN_LENGTH: 2,
  NAME_MAX_LENGTH: 50,
  COMMENT_MAX_LENGTH: 500,
};

// App configuration
export const APP_CONFIG = {
  DEFAULT_PAGE_SIZE: 12,
  MAX_CART_ITEMS: 99,
  MIN_ORDER_AMOUNT: 50000, // 50k VND
  DELIVERY_FEE: 20000, // 20k VND
  FREE_DELIVERY_THRESHOLD: 200000, // 200k VND
  RATING_MAX: 5,
  RATING_MIN: 1,
};

// Error messages
export const ERROR_MESSAGES = {
  NETWORK_ERROR: 'Lỗi kết nối mạng. Vui lòng thử lại.',
  UNKNOWN_ERROR: 'Đã xảy ra lỗi. Vui lòng thử lại.',
  VALIDATION_ERROR: 'Dữ liệu không hợp lệ.',
  AUTH_ERROR: 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.',
  PERMISSION_ERROR: 'Bạn không có quyền thực hiện thao tác này.',
  NOT_FOUND_ERROR: 'Không tìm thấy dữ liệu.',
  SERVER_ERROR: 'Lỗi máy chủ. Vui lòng thử lại sau.',
};

// Success messages
export const SUCCESS_MESSAGES = {
  LOGIN_SUCCESS: 'Đăng nhập thành công!',
  REGISTER_SUCCESS: 'Đăng ký thành công!',
  LOGOUT_SUCCESS: 'Đăng xuất thành công!',
  ADD_TO_CART_SUCCESS: 'Đã thêm vào giỏ hàng!',
  UPDATE_CART_SUCCESS: 'Cập nhật giỏ hàng thành công!',
  REMOVE_FROM_CART_SUCCESS: 'Đã xóa khỏi giỏ hàng!',
  ORDER_SUCCESS: 'Đặt hàng thành công!',
  RATING_SUCCESS: 'Đánh giá thành công!',
  PROFILE_UPDATE_SUCCESS: 'Cập nhật thông tin thành công!',
};