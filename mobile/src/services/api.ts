import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import * as SecureStore from 'expo-secure-store';
import { API_CONFIG, STORAGE_KEYS, ERROR_MESSAGES } from '@/constants';
import { ApiError } from '@/types';

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
    // Request interceptor to add auth token
    this.client.interceptors.request.use(
      async (config) => {
        try {
          const token = await SecureStore.getItemAsync(STORAGE_KEYS.ACCESS_TOKEN);
          const refreshToken = await SecureStore.getItemAsync(STORAGE_KEYS.REFRESH_TOKEN);
          const user = await SecureStore.getItemAsync(STORAGE_KEYS.USER);
          
          console.log('=== AUTH DEBUG ===');
          console.log('Access token exists:', !!token);
          console.log('Refresh token exists:', !!refreshToken);
          console.log('User data exists:', !!user);
          
          if (token) {
            console.log('Token preview:', `${token.substring(0, 20)}...`);
            config.headers.Authorization = `Bearer ${token}`;
          } else {
            console.log('❌ NO ACCESS TOKEN FOUND!');
          }
          
          // Log requests for debugging
          console.log('API Request:', {
            method: config.method?.toUpperCase(),
            url: config.url,
            data: config.data,
            hasAuth: !!config.headers.Authorization
          });
          console.log('=== END AUTH DEBUG ===');
          
        } catch (error) {
          console.error('Error accessing SecureStore:', error);
        }
        
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor to handle token refresh
    this.client.interceptors.response.use(
      (response) => {
        // Log successful responses
        // console.log('API Response:', {
        //   status: response.status,
        //   url: response.config.url,
        //   data: response.data
        // });
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
            await this.clearTokens();
            // You might want to dispatch a logout action here
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

