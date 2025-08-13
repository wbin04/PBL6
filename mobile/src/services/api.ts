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
        const token = await SecureStore.getItemAsync(STORAGE_KEYS.ACCESS_TOKEN);
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor to handle token refresh
    this.client.interceptors.response.use(
      (response) => response,
      async (error) => {
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
    if (error.response) {
      // Server responded with error status
      const status = error.response.status;
      const data = error.response.data;

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

      // Return server error message if available
      return {
        message: data?.error?.message || data?.message || data?.detail || ERROR_MESSAGES.VALIDATION_ERROR,
        ...data,
      };
    }

    if (error.request) {
      // Network error
      return { message: ERROR_MESSAGES.NETWORK_ERROR };
    }

    // Unknown error
    return { message: ERROR_MESSAGES.UNKNOWN_ERROR };
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
