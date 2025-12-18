// User & Authentication Types
export interface User {
  id: number;
  username: string;
  email: string;
  fullname: string;
  role: 'Quản lý' | 'Khách hàng' | 'Chủ cửa hàng' | 'Người vận chuyển';
  role_id?: number; // Role ID from backend (1=Khách hàng, 2=Quản lý, 3=Chủ cửa hàng, 4=Người vận chuyển)
  phone_number?: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  created_date: string;
  is_active?: boolean;
  is_shipper_registered?: boolean;
  is_store_registered?: boolean;
}

export interface AuthTokens {
  access: string;
  refresh: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  password_confirm: string;
  fullname: string;
  username: string;
  phone_number?: string;
  address?: string;
  latitude?: number;
  longitude?: number;
}

export interface LoginResponse {
  access: string;
  refresh: string;
  user: User;
}

// Menu Types
export interface Category {
  id: number;
  cate_name: string;
  image: string;
  image_url?: string;
  foods_count?: number;
}

export interface Store {
  id: number;
  store_name: string;
  image: string;
  description: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  manager?: User;
  // Store stats
  average_rating?: number;
  total_ratings?: number;
  total_foods?: number;
  total_orders?: number;
}

export interface FoodSize {
  id: number;
  size_name: string;
  price: string;
}

export interface Food {
  id: number;
  title: string;
  description: string;
  price: string;
  image: string;
  image_url?: string;
  category_name?: string;
  availability: string;
  average_rating?: number;
  rating_count?: number;
  category?: Category;
  store?: Store;
  sizes?: FoodSize[];
}

export interface FoodDetail extends Food {
  category: Category;
}

// Cart Types
export interface CartItem {
  id: number;
  food: Food;
  quantity: number;
  subtotal: number;
}

export interface Cart {
  id: number;
  total_money: string;
  items: CartItem[];
  items_count: number;
}

export interface AddToCartRequest {
  food_id: number;
  quantity: number;
}

// Order Types
export interface OrderItem {
  id: string;
  food: Food;
  food_option?: any;
  quantity: number;
  food_price: number;
  food_option_price?: number;
  food_note?: string;
  subtotal: number;
  size_display?: string;
  price_breakdown?: Array<{
    type: 'food' | 'size';
    name: string;
    display: string;
    price: number;
    quantity: number;
    total: number;
  }>;
}

export interface Order {
  id: number;
  user?: User;
  order_status: 'Chờ xác nhận' | 'Đã xác nhận' | 'Đang chuẩn bị' | 'Đang giao' | 'Đã giao' | 'Đã huỷ';
  total_money: string; // Food items total only (no shipping, no discount)
  payment_method: 'cash' | 'vnpay' | 'momo';
  receiver_name: string;
  phone_number: string;
  ship_address: string;
  note?: string;
  promo?: string;
  items: OrderItem[];
  is_rated: boolean;
  created_date: string; // Already in Vietnam timezone from backend
  cancel_reason?: string;
  cancelled_date?: string;
  cancelled_by_role?: 'Khách hàng' | 'Cửa hàng' | 'Quản lý';
  promo_discount?: number; // Total discount from all promos
  applied_promos?: OrderPromo[]; // List of applied promos with details
  // New financial fields
  total_before_discount?: string; // Food total + shipping
  total_discount?: string; // Total discount applied
  total_after_discount?: string; // Final amount to pay (after discount)
  shipping_fee?: string; // Shipping fee
}

export interface OrderPromo {
  id: number;
  order: number;
  promo: number;
  promo_name: string;
  applied_amount: string;
  note?: string;
  created_at: string;
}

export interface CreateOrderRequest {
  payment_method: 'cash' | 'vnpay' | 'momo';
  receiver_name: string;
  phone_number: string;
  ship_address: string;
  note?: string;
  promo?: string;
  total_money?: number;
}

// Promotion Types
export interface Promotion {
  id: number;
  name: string;
  category: 'PERCENT' | 'AMOUNT';
  discount_value: number;
  minimum_pay: number;
  max_discount_amount?: number;
  start_date: string;
  end_date: string;
  store: number;
  store_id?: number;
  store_name?: string;
  is_active: boolean;
  // Backward compatibility fields
  percent?: number;
  description?: string;
}

export interface ValidatePromoResponse {
  valid: boolean;
  discount_amount?: string;
  final_amount?: string;
  error?: string;
  promo?: Promotion;
}

export interface AppliedPromo {
  promo: Promotion;
  discount: number;
  storeAmount?: number;
}

// Rating Types
export interface Rating {
  id: number;
  user: User;
  order: Order;
  rating: number;
  comment?: string;
  created_date: string;
}

export interface FoodRating {
  username: string;
  rating: number;
  content: string;
}

export interface CreateRatingRequest {
  food: number;
  order: number;
  rating: number;
  content?: string;
}

// API Response Types
export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface ApiError {
  error?: {
    message: string;
  };
  message?: string;
  detail?: string;
  [key: string]: any;
}

// Navigation Types
export type RootStackParamList = {
  Home: undefined;
  Login: undefined;
  Register: undefined;
  ForgotPassword: undefined;
  MainTabs: undefined;
  FoodDetail: { foodId: number };
  StoreDetail: { storeId: number };
  RatingScreen: { foodId: number };
  FoodReviews: { id: string };
  Cart: undefined;
  Checkout: { selectedIds: number[] };
  OrderDetail: { orderId: number };
  EditOrder: { orderId: number };
  RatingOrder: { orderId: number };
  Review: { orderId: number };
  Orders: { selectedTab?: 'Chờ xác nhận' | 'Đang giao' | 'Đã giao' | 'Đã hủy' } | undefined;
  CancelDetail: {
    orderId: string;
    shopName?: string;
    productName?: string;
    productPrice?: string;
    productImage?: any;
  };
  Profile: undefined;
  EditProfile: undefined;
  AdminHome: undefined;
  SearchResults: { keyword?: string; categoryId?: number; categoryName?: string };
};

export type MainTabParamList = {
  Home: undefined;
  // Accept optional categoryId to filter menu, showAllFoods to show all food items, or showAllCategories to show all categories
  Menu: {
    categoryId?: number;
    showAllFoods?: boolean;
    showAllCategories?: boolean;
    focusSearch?: boolean;
    showCategoryModal?: boolean;
  } | undefined;
  Cart: undefined;
  Orders: undefined;
  Profile: undefined;
};

// Store Types
export interface AppState {
  auth: AuthState;
  menu: MenuState;
  cart: CartState;
  orders: OrderState;
  stores: StoresState;
}

export interface AuthState {
  user: User | null;
  tokens: AuthTokens | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
}

export interface MenuState {
  categories: Category[];
  foods: Food[];
  currentCategory: Category | null;
  loading: boolean;
  error: string | null;
}

export interface CartState {
  cart: Cart | null;
  loading: boolean;
  error: string | null;
}

export interface OrderState {
  orders: Order[];
  currentOrder: Order | null;
  loading: boolean;
  error: string | null;
}

export interface StoresState {
  stores: Store[];
  currentStore: Store | null;
  loading: boolean;
  error: string | null;
}

