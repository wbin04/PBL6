const API_BASE_URL = "http://localhost:8000/api";

export interface ApiResponse<T = unknown> {
  data?: T;
  message?: string;
  error?: {
    message: string;
  };
}

interface ApiRequestOptions extends Omit<RequestInit, "body"> {
  skipAuth?: boolean;
  body?: unknown;
}

export interface LoginResponse {
  access: string;
  refresh: string;
  user: {
    id: number;
    username: string;
    email: string;
    role: string;
  };
}

export interface User {
  id: number;
  username: string;
  email: string;
  fullname: string;
  phone_number: string;
  address: string;
  role: string;
  role_id: number;
  created_date: string;
}

export interface Category {
  id: number;
  cate_name: string;
  image: string;
}

export interface Food {
  id: number;
  title: string;
  image: string;
  price: number;
  description: string;
  average_rating?: number;
  rating_count?: number;
  availability: string;
  category: number;
  created_date?: string;
}

export interface CartItem {
  id: number;
  food: Food;
  quantity: number;
  price: number;
}

export interface Cart {
  items: CartItem[];
  total_price: number;
}

export interface Order {
  id: number;
  status:
    | "PENDING"
    | "PAID"
    | "PREPARING"
    | "READY"
    | "COMPLETED"
    | "CANCELLED";
  items: CartItem[];
  total_amount: number;
  created_at: string;
  updated_at: string;
}

export interface Rating {
  id: number;
  rating: number;
  content: string;
  username: string;
  rating_value?: number;
  stars?: number;
}

class APIClient {
  private baseURL: string;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
  }

  private async request<T = unknown>(
    endpoint: string,
    options: ApiRequestOptions = {}
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    const token = localStorage.getItem("access_token");

    // Extract body and skipAuth from options
    const { body, skipAuth, ...requestOptions } = options;

    const config: RequestInit = {
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        ...requestOptions.headers,
      },
      ...requestOptions,
    };

    // Handle body conversion
    if (body && typeof body === "object" && !(body instanceof FormData)) {
      config.body = JSON.stringify(body);
    } else if (body) {
      config.body = body as BodyInit;
    }

    if (token && !skipAuth) {
      (config.headers as Record<string, string>)[
        "Authorization"
      ] = `Bearer ${token}`;
    }

    try {
      const response = await fetch(url, config);

      // Handle 401 - token expired
      if (response.status === 401 && !options.skipAuth) {
        await this.refreshToken();
        // Retry with new token
        (config.headers as Record<string, string>)[
          "Authorization"
        ] = `Bearer ${localStorage.getItem("access_token")}`;
        const retryResponse = await fetch(url, config);
        return await this.handleResponse<T>(retryResponse);
      }

      return await this.handleResponse<T>(response);
    } catch (error) {
      console.error("API Request failed:", error);
      throw new Error(
        "Network error: " +
          (error instanceof Error ? error.message : String(error))
      );
    }
  }

  private async handleResponse<T>(response: Response): Promise<T> {
    const text = await response.text();
    let data: unknown;
    try {
      data = JSON.parse(text);
    } catch {
      console.error("Invalid JSON response:", text);
      throw new Error("Invalid JSON: " + text);
    }
    if (!response.ok) {
      const errorData = data as {
        error?: { message: string };
        message?: string;
      };
      const errPayload =
        errorData.error?.message || errorData.message || JSON.stringify(data);
      console.error("API Error response data:", data);
      throw new Error(errPayload);
    }
    return data as T;
  }

  private async refreshToken(): Promise<void> {
    const refreshToken = localStorage.getItem("refresh_token");
    if (!refreshToken) {
      this.logout();
      return;
    }

    try {
      const response = await this.request<{ access: string }>(
        "/auth/refresh/",
        {
          method: "POST",
          body: { refresh: refreshToken },
          skipAuth: true,
        }
      );

      localStorage.setItem("access_token", response.access);
    } catch (error) {
      console.error("Token refresh failed:", error);
      this.logout();
    }
  }

  private logout(): void {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("user");
    window.location.href = "/login";
  }

  // HTTP methods
  async get<T = unknown>(
    endpoint: string,
    options: Omit<RequestInit, "method"> & { skipAuth?: boolean } = {}
  ): Promise<T> {
    return this.request<T>(endpoint, { method: "GET", ...options });
  }

  async post<T = unknown>(
    endpoint: string,
    body?: unknown,
    options: Omit<RequestInit, "method" | "body"> & { skipAuth?: boolean } = {}
  ): Promise<T> {
    return this.request<T>(endpoint, {
      method: "POST",
      body,
      ...options,
    });
  }

  async put<T = unknown>(
    endpoint: string,
    body?: unknown,
    options: Omit<RequestInit, "method" | "body"> & { skipAuth?: boolean } = {}
  ): Promise<T> {
    return this.request<T>(endpoint, {
      method: "PUT",
      body,
      ...options,
    });
  }

  async delete<T = unknown>(
    endpoint: string,
    options: Omit<RequestInit, "method"> & { skipAuth?: boolean } = {}
  ): Promise<T> {
    return this.request<T>(endpoint, { method: "DELETE", ...options });
  }
}

// Global API instance
export const API = new APIClient(API_BASE_URL);

// Utility functions
export function getImageUrl(imagePath: string | null | undefined): string {
  if (!imagePath) return "https://via.placeholder.com/200";
  if (imagePath.startsWith("http")) return imagePath;

  let fullUrl: string;
  if (imagePath.startsWith("/media/")) {
    fullUrl = `http://localhost:8000${imagePath}`;
  } else {
    fullUrl = `http://localhost:8000/media/${imagePath}`;
  }

  // Encode URI to handle spaces and special characters
  // Append timestamp to avoid browser caching old images
  return encodeURI(fullUrl) + `?v=${new Date().getTime()}`;
}

export function formatPrice(price: number): string {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(price);
}

export function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("vi-VN", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function getStatusText(status: Order["status"]): string {
  const statusMap = {
    PENDING: "Chờ thanh toán",
    PAID: "Đã thanh toán",
    PREPARING: "Đang chuẩn bị",
    READY: "Sẵn sàng",
    COMPLETED: "Hoàn thành",
    CANCELLED: "Đã huỷ",
  };
  return statusMap[status] || status;
}

export function getStatusClass(status: Order["status"]): string {
  const classMap = {
    PENDING: "text-yellow-600",
    PAID: "text-green-600",
    PREPARING: "text-blue-600",
    READY: "text-green-600",
    COMPLETED: "text-gray-600",
    CANCELLED: "text-red-600",
  };
  return classMap[status] || "text-gray-600";
}

export function isAuthenticated(): boolean {
  return !!localStorage.getItem("access_token");
}

export function getUser(): User | null {
  const userStr = localStorage.getItem("user");
  if (!userStr) return null;
  try {
    return JSON.parse(userStr);
  } catch {
    return null;
  }
}
