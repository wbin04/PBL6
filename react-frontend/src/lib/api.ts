const API_BASE_URL = 'http://localhost:8000/api';

interface ApiRequestOptions extends Omit<RequestInit, "body"> {
  skipAuth?: boolean;
  body?: unknown;
}

class APIClient {
  private baseURL: string;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
  }

  private async request<T = any>(
    endpoint: string,
    options: ApiRequestOptions = {}
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    const token = localStorage.getItem("access_token");

    const { body, skipAuth, ...requestOptions } = options;

    // Tạo headers cơ bản
    const headers: Record<string, string> = {
      Accept: "application/json",
      ...(requestOptions.headers as Record<string, string>),
    };

    // Chỉ set Content-Type nếu body không phải là FormData
    if (!(body instanceof FormData)) {
      headers["Content-Type"] = "application/json";
    }

    const config: RequestInit = {
      headers,
      ...requestOptions,
    };

    // Gắn body
    if (body && typeof body === "object" && !(body instanceof FormData)) {
      config.body = JSON.stringify(body);
    } else if (body) {
      config.body = body as BodyInit;
    }

    // Gắn Authorization
    if (token && !skipAuth) {
      (config.headers as Record<string, string>)["Authorization"] = `Bearer ${token}`;
    }

    try {
      const response = await fetch(url, config);

      // Nếu token hết hạn
      if (response.status === 401 && !skipAuth) {
        await this.refreshToken();
        (config.headers as Record<string, string>)["Authorization"] = `Bearer ${localStorage.getItem(
          "access_token"
        )}`;
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
    if (response.status === 204) {
      // Không có nội dung trả về (DELETE thành công, v.v.)
      return {} as T;
    }

    const text = await response.text();
    let data: unknown;
    try {
      data = text ? JSON.parse(text) : null;
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
      const response = await this.request<{ access: string }>("/auth/refresh/", {
        method: "POST",
        body: { refresh: refreshToken },
        skipAuth: true,
      });

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
  async get<T = any>(
    endpoint: string,
    options: Omit<RequestInit, "method"> & { skipAuth?: boolean } = {}
  ): Promise<T> {
    return this.request<T>(endpoint, { method: "GET", ...options });
  }

  async post<T = any>(
    endpoint: string,
    body?: unknown,
    options: Omit<RequestInit, "method" | "body"> & { skipAuth?: boolean } = {}
  ): Promise<T> {
    return this.request<T>(endpoint, { method: "POST", body, ...options });
  }

  async put<T = any>(
    endpoint: string,
    body?: unknown,
    options: Omit<RequestInit, "method" | "body"> & { skipAuth?: boolean } = {}
  ): Promise<T> {
    return this.request<T>(endpoint, { method: "PUT", body, ...options });
  }

  async patch<T = any>(
    endpoint: string,
    body?: unknown,
    options: Omit<RequestInit, "method" | "body"> & { skipAuth?: boolean } = {}
  ): Promise<T> {
    return this.request<T>(endpoint, { method: "PATCH", body, ...options });
  }

  async delete<T = any>(
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

  // Encode URI để tránh lỗi khi có ký tự đặc biệt và cache cũ
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

export function getStatusText(status: string): string {
  const statusMap = {
    PENDING: "Chờ thanh toán",
    PAID: "Đã thanh toán",
    PREPARING: "Đang chuẩn bị",
    READY: "Sẵn sàng",
    COMPLETED: "Hoàn thành",
    CANCELLED: "Đã huỷ",
  };
  return statusMap[status as keyof typeof statusMap] || status;
}

export function getStatusClass(status: string): string {
  const classMap = {
    PENDING: "text-yellow-600",
    PAID: "text-green-600",
    PREPARING: "text-blue-600",
    READY: "text-green-600",
    COMPLETED: "text-gray-600",
    CANCELLED: "text-red-600",
  };
  return classMap[status as keyof typeof classMap] || "text-gray-600";
}

export function isAuthenticated(): boolean {
  return !!localStorage.getItem("access_token");
}

export function getUser(): any | null {
  const userStr = localStorage.getItem("user");
  if (!userStr) return null;
  try {
    return JSON.parse(userStr);
  } catch {
    return null;
  }
}