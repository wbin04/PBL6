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
    // Request interceptor: Bỏ qua kiểm tra access token để cho phép gọi API không cần đăng nhập
    this.client.interceptors.request.use(
      async (config) => {
        // Không thêm Authorization header, không kiểm tra token
        // Có thể thêm log nếu muốn
        // console.log('API Request:', { method: config.method?.toUpperCase(), url: config.url, data: config.data });
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

