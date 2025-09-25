import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import * as SecureStore from 'expo-secure-store';
import { API_CONFIG, STORAGE_KEYS, ERROR_MESSAGES } from '@/constants';
import { ApiError } from '@/types';
import { authEvents, AUTH_EVENTS } from './authEvents';

class ApiClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: API_CONFIG.BASE_URL,
      timeout: API_CONFIG.TIMEOUT,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors() {
    // Request interceptor: Add authentication header when available
    this.client.interceptors.request.use(
      async (config) => {
        try {
          const accessToken = await SecureStore.getItemAsync(STORAGE_KEYS.ACCESS_TOKEN);
          if (accessToken) {
            config.headers.Authorization = `Bearer ${accessToken}`;
          }
        } catch (error) {
          console.log('Error getting access token:', error);
        }
        // console.log('API Request:', { method: config.method?.toUpperCase(), url: config.url, headers: config.headers });
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor to handle token refresh
    this.client.interceptors.response.use(
      (response) => {
        return response;
      },
      async (error) => {
        // Log error responses
        console.log('API Error:', {
          status: error.response?.status,
          url: error.config?.url,
          data: error.response?.data,
          message: error.message
        });
        
        const originalRequest = error.config;

        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;

          try {
            const refreshToken = await SecureStore.getItemAsync(STORAGE_KEYS.REFRESH_TOKEN);
            if (refreshToken) {
              const response = await this.refreshToken(refreshToken);
              await SecureStore.setItemAsync(STORAGE_KEYS.ACCESS_TOKEN, response.access);
              
              // Retry original request with new token
              originalRequest.headers.Authorization = `Bearer ${response.access}`;
              return this.client(originalRequest);
            }
          } catch (refreshError) {
            // Refresh failed, logout user
            console.log('Refresh token failed, clearing tokens and navigating to login');
            await this.clearTokens();
            
            // Force app to show login screen by dispatching logout action
            // Note: This requires access to the Redux store, which we'll handle differently
            this.handleSessionExpiry();
          }
        }

        return Promise.reject(this.handleError(error));
      }
    );
  }

  private async refreshToken(refreshToken: string) {
    const response = await axios.post(`${API_CONFIG.BASE_URL}/auth/refresh/`, {
      refresh: refreshToken,
    });
    return response.data;
  }

  private async clearTokens() {
    await SecureStore.deleteItemAsync(STORAGE_KEYS.ACCESS_TOKEN);
    await SecureStore.deleteItemAsync(STORAGE_KEYS.REFRESH_TOKEN);
    await SecureStore.deleteItemAsync(STORAGE_KEYS.USER);
  }

  private handleSessionExpiry() {
    // Emit session expired event
    authEvents.emit(AUTH_EVENTS.SESSION_EXPIRED);
    console.log('Session expired - event emitted');
  }

  private handleError(error: any): ApiError {
    console.log('API Client Error:', error);
    
    if (error.response) {
      // Server responded with error status
      const status = error.response.status;
      const data = error.response.data;
      
      console.log('API Error Response Status:', status);
      console.log('API Error Response Data:', data);

      if (status >= 500) {
        return { message: ERROR_MESSAGES.SERVER_ERROR };
      }

      if (status === 404) {
        return { message: ERROR_MESSAGES.NOT_FOUND_ERROR };
      }

      if (status === 403) {
        return { message: ERROR_MESSAGES.PERMISSION_ERROR };
      }

      if (status === 401) {
        return { message: ERROR_MESSAGES.AUTH_ERROR };
      }

      // Handle Django error format: {'error': 'message'} or direct message
      const errorMessage = data?.error || data?.message || data?.detail || ERROR_MESSAGES.VALIDATION_ERROR;
      
      return {
        message: errorMessage,
        status,
        ...data,
      };
    }

    if (error.request) {
      // Network error
      console.log('Network Error:', error.request);
      return { message: ERROR_MESSAGES.NETWORK_ERROR };
    }

    // Unknown error
    console.log('Unknown Error:', error.message);
    return { message: error.message || ERROR_MESSAGES.UNKNOWN_ERROR };
  }

  // HTTP Methods
  async get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response: AxiosResponse<T> = await this.client.get(url, config);
    return response.data;
  }

  async post<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response: AxiosResponse<T> = await this.client.post(url, data, config);
    return response.data;
  }

  async put<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response: AxiosResponse<T> = await this.client.put(url, data, config);
    return response.data;
  }

  async patch<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response: AxiosResponse<T> = await this.client.patch(url, data, config);
    return response.data;
  }

  async delete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response: AxiosResponse<T> = await this.client.delete(url, config);
    return response.data;
  }

  // Upload method for files
  async upload<T>(url: string, formData: FormData, config?: AxiosRequestConfig): Promise<T> {
    const response: AxiosResponse<T> = await this.client.post(url, formData, {
      ...config,
      headers: {
        'Content-Type': 'multipart/form-data',
        ...config?.headers,
      },
    });
    return response.data;
  }
}

export const apiClient = new ApiClient();

// Orders API functions
export const ordersApi = {
  // Get all orders with pagination and filters
  getOrders: async (params?: {
    page?: number;
    status?: string;
    delivery_status?: string;
  }) => {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.status) queryParams.append('status', params.status);
    if (params?.delivery_status) queryParams.append('delivery_status', params.delivery_status);
    
    const url = `/orders/${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    return apiClient.get(url);
  },

  // Get single order details
  getOrder: async (orderId: number) => {
    return apiClient.get(`/orders/${orderId}/`);
  },

  // Update order status (customer cancel)
  updateOrderStatus: async (orderId: number, data: {
    order_status: string;
    cancel_reason?: string;
  }) => {
    return apiClient.put(`/orders/${orderId}/status/`, data);
  },

  // Cancel order group
  cancelOrderGroup: async (orderId: number, data?: {
    check_only?: boolean;
    confirmed?: boolean;
  }) => {
    return apiClient.post(`/orders/${orderId}/cancel-group/`, data);
  },

  // Admin endpoints
  admin: {
    // Get all orders (admin/store manager)
    getOrders: async (params?: {
      page?: number;
      status?: string;
      search?: string;
    }) => {
      const queryParams = new URLSearchParams();
      if (params?.page) queryParams.append('page', params.page.toString());
      if (params?.status) queryParams.append('status', params.status);
      if (params?.search) queryParams.append('search', params.search);
      
      const url = `/orders/admin/${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
      return apiClient.get(url);
    },

    // Get single order detail (admin)
    getOrder: async (orderId: number) => {
      return apiClient.get(`/orders/admin/${orderId}/`);
    },

    // Update order status (admin/store manager)
    updateOrderStatus: async (orderId: number, data: {
      order_status: string;
      cancel_reason?: string;
    }) => {
      return apiClient.patch(`/orders/admin/${orderId}/status/`, data);
    },

    // Assign shipper to order
    assignShipper: async (orderId: number, data: {
      shipper_id: number | null;
    }) => {
      return apiClient.put(`/orders/admin/${orderId}/assign-shipper/`, data);
    },
  },
};

// Shipper API
export const shipperApi = {
  // Get all shippers with pagination and search
  getShippers: async (params?: {
    page?: number;
    per_page?: number;
    search?: string;
    role?: string;
  }) => {
    return apiClient.get('/shipper/shippers/', { params });
  },

  // Get shipper by ID
  getShipper: async (shipperId: number) => {
    return apiClient.get(`/shipper/shippers/${shipperId}/`);
  },

  // Get shipper by user_id
  getShipperByUser: async (userId: number) => {
    return apiClient.get('/shipper/shippers/by_user/', {
      params: { user_id: userId }
    });
  },

  // Create shipper from existing user
  createShipper: async (data: { user_id: number }) => {
    return apiClient.post('/shipper/shippers/', data);
  },

  // Create user and shipper together
  createShipperWithUser: async (data: {
    fullname: string;
    username: string;
    phone: string;
    email: string;
    address?: string;
    password: string;
  }) => {
    return apiClient.post('/shipper/shippers/create_with_user/', data);
  },

  // Update shipper information
  updateShipper: async (shipperId: number, data: {
    fullname?: string;
    phone?: string;
    email?: string;
    address?: string;
  }) => {
    return apiClient.patch(`/shipper/shippers/${shipperId}/`, data);
  },

  // Delete shipper
  deleteShipper: async (shipperId: number) => {
    return apiClient.delete(`/shipper/shippers/${shipperId}/`);
  },

  // Get available users (users with Shipper role but no shipper profile)
  getAvailableUsers: async () => {
    return apiClient.get('/shipper/shippers/available_users/');
  },

  // Get shipper statistics
  getStatistics: async () => {
    return apiClient.get('/shipper/shippers/statistics/');
  },

  // Get orders by shipper ID
  getOrdersByShipper: async (shipperId: number, params?: { 
    delivery_status?: string; 
    page?: number; 
    per_page?: number; 
  }) => {
    const queryParams = new URLSearchParams();
    if (params?.delivery_status) queryParams.append('delivery_status', params.delivery_status);
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.per_page) queryParams.append('per_page', params.per_page.toString());
    
    const queryString = queryParams.toString() ? `?${queryParams.toString()}` : '';
    return apiClient.get(`/orders/shipper/${shipperId}/orders/${queryString}`);
  },
};

