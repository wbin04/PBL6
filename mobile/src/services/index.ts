import { apiClient } from './api';
import { ENDPOINTS } from '@/constants';
import {
  LoginRequest,
  RegisterRequest,
  LoginResponse,
  User,
  PaginatedResponse,
  Category,
  Food,
  FoodDetail,
  Store,
  Cart,
  AddToCartRequest,
  Order,
  CreateOrderRequest,
  Promotion,
  Rating,
  CreateRatingRequest,
} from '@/types';

export { ratingService } from './ratingService';

// Authentication Service
export const authService = {
  async login(credentials: LoginRequest): Promise<LoginResponse> {
    return apiClient.post(ENDPOINTS.LOGIN, credentials);
  },

  async register(userData: RegisterRequest): Promise<LoginResponse> {
    return apiClient.post(ENDPOINTS.REGISTER, userData);
  },

  async refreshToken(refreshToken: string): Promise<{ access: string }> {
    return apiClient.post(ENDPOINTS.REFRESH, { refresh: refreshToken });
  },

  async getProfile(): Promise<User> {
    return apiClient.get(ENDPOINTS.PROFILE);
  },

  async updateProfile(userData: Partial<User>): Promise<User> {
    // Use profile/update endpoint for updating user info
    return apiClient.put(ENDPOINTS.PROFILE_UPDATE, userData);
  },

  async resetPassword(data: { identifier: string; new_password: string; new_password_confirm: string }): Promise<{ message: string }> {
    return apiClient.post(ENDPOINTS.RESET_PASSWORD, data);
  },
};

// Menu Service
export const menuService = {
  async getCategories(): Promise<Category[]> {
    const response: PaginatedResponse<Category> = await apiClient.get(ENDPOINTS.CATEGORIES);
    return response.results;
  },

  async getFoods(page = 1, category?: number, store?: number): Promise<PaginatedResponse<Food>> {
    const params = new URLSearchParams();
    params.append('page', page.toString());
    if (category) {
      params.append('category', category.toString());
    }
    if (store) {
      params.append('store', store.toString());
    }
    
    return apiClient.get(`${ENDPOINTS.FOODS}?${params.toString()}`);
  },

  async getFoodDetail(id: number): Promise<FoodDetail> {
    return apiClient.get(ENDPOINTS.FOOD_DETAIL(id));
  },

  async getFoodsByCategory(categoryId: number, page = 1): Promise<PaginatedResponse<Food>> {
    const params = new URLSearchParams();
    params.append('page', page.toString());
    
    return apiClient.get(`${ENDPOINTS.CATEGORY_FOODS(categoryId)}?${params.toString()}`);
  },
};

// Stores Service
export const storesService = {
  async getStores(): Promise<Store[]> {
    return apiClient.get(ENDPOINTS.STORES_PUBLIC);
  },

  async getStoreDetail(id: number): Promise<Store> {
    return apiClient.get(ENDPOINTS.STORE_DETAIL(id));
  },

  async getStoreFoods(storeId: number, page = 1): Promise<PaginatedResponse<Food>> {
    const params = new URLSearchParams();
    params.append('page', page.toString());
    
    const endpoint = `${ENDPOINTS.STORE_FOODS(storeId)}?${params.toString()}`;
    console.log('storesService.getStoreFoods - API endpoint:', endpoint);
    
    try {
      const result = await apiClient.get<PaginatedResponse<Food>>(endpoint);
      console.log('storesService.getStoreFoods - API response:', result);
      return result;
    } catch (error) {
      console.error('storesService.getStoreFoods - API error:', error);
      throw error;
    }
  },

  async getStoreStats(storeId: number): Promise<{
    total_foods: number;
    total_orders: number;
    total_revenue: number;
    average_rating: number;
    total_ratings: number;
  }> {
    const endpoint = ENDPOINTS.STORE_STATS(storeId);
    console.log('storesService.getStoreStats - API endpoint:', endpoint);
    
    try {
      const result = await apiClient.get<{
        total_foods: number;
        total_orders: number;
        total_revenue: number;
        average_rating: number;
        total_ratings: number;
      }>(endpoint);
      console.log('storesService.getStoreStats - API response:', result);
      return result;
    } catch (error) {
      console.error('storesService.getStoreStats - API error:', error);
      throw error;
    }
  },
};

// Cart Service
export const cartService = {
  async getCart(): Promise<Cart> {
    const response = await apiClient.get<Cart>(ENDPOINTS.CART);
    // Cart items should use their actual id from database
    return response;
  },

  async addToCart(item: AddToCartRequest): Promise<Cart> {
    return apiClient.post(ENDPOINTS.ADD_TO_CART, item);
  },

  async updateCartItem(foodId: number, data: { quantity?: number; item_note?: string }): Promise<any> {
    console.log('updateCartItem service called:', { foodId, data });
    const result = await apiClient.put(ENDPOINTS.UPDATE_CART_ITEM(foodId), data);
    console.log('updateCartItem service result:', result);
    return result;
  },

  async removeFromCart(foodId: number): Promise<void> {
    return apiClient.delete(ENDPOINTS.REMOVE_FROM_CART(foodId));
  },

  async clearCart(): Promise<void> {
    return apiClient.delete(ENDPOINTS.CLEAR_CART);
  },
};

// Orders Service
export const ordersService = {
  async getOrders(page = 1): Promise<PaginatedResponse<Order>> {
    const params = new URLSearchParams();
    params.append('page', page.toString());
    
    return apiClient.get(`${ENDPOINTS.ORDERS}?${params.toString()}`);
  },

  async createOrder(orderData: CreateOrderRequest): Promise<Order> {
    return apiClient.post(ENDPOINTS.ORDERS, orderData);
  },

  async getOrderDetail(id: number): Promise<Order> {
    return apiClient.get(ENDPOINTS.ORDER_DETAIL(id));
  },

  async updateOrderStatus(id: number, status: string, cancelReason?: string): Promise<Order> {
    const data: any = { order_status: status };
    if (cancelReason) {
      data.cancel_reason = cancelReason;
    }
    return apiClient.put(ENDPOINTS.UPDATE_ORDER_STATUS(id), data);
  },

  async adminUpdateOrderStatus(id: number, status: string, cancelReason?: string): Promise<Order> {
    const data: any = { order_status: status };
    if (cancelReason) {
      data.cancel_reason = cancelReason;
    }
    return apiClient.put(ENDPOINTS.ADMIN_UPDATE_ORDER_STATUS(id), data);
  },
};

// Promotions Service
export const promotionsService = {
  async getPromotions(): Promise<Promotion[]> {
    const response: PaginatedResponse<Promotion> = await apiClient.get(ENDPOINTS.PROMOTIONS);
    return response.results;
  },

  async validatePromoCode(promoCode: string): Promise<{ valid: boolean; discount: number }> {
    return apiClient.post(ENDPOINTS.VALIDATE_PROMO, { promo_code: promoCode });
  },
};

// Ratings Service
export const ratingsService = {
  async getRatings(page = 1): Promise<PaginatedResponse<Rating>> {
    const params = new URLSearchParams();
    params.append('page', page.toString());
    
    return apiClient.get(`${ENDPOINTS.RATINGS}?${params.toString()}`);
  },

  async createRating(ratingData: CreateRatingRequest): Promise<Rating> {
    return apiClient.post(ENDPOINTS.RATINGS, ratingData);
  },

  async updateRating(id: number, ratingData: Partial<CreateRatingRequest>): Promise<Rating> {
    return apiClient.put(ENDPOINTS.RATING_DETAIL(id), ratingData);
  },

  async deleteRating(id: number): Promise<void> {
    return apiClient.delete(ENDPOINTS.RATING_DETAIL(id));
  },
};

// Payments Service
export const paymentsService = {
  async createPayment(orderId: number, paymentMethod: string): Promise<{ payment_url?: string }> {
    return apiClient.post(ENDPOINTS.CREATE_PAYMENT, {
      order_id: orderId,
      payment_method: paymentMethod,
    });
  },
};

