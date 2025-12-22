const API_BASE_URL = "http://localhost:8000/api";

interface ApiRequestOptions extends Omit<RequestInit, "body"> {
  skipAuth?: boolean;
  body?: unknown;
}

// Utility function để parse error message đẹp hơn
export const parseErrorMessage = (error: unknown): string => {
  if (!error) return "Đã xảy ra lỗi. Vui lòng thử lại!";

  // Nếu error là string
  if (typeof error === "string") {
    try {
      const parsed = JSON.parse(error);
      return parseErrorMessage(parsed);
    } catch {
      return error;
    }
  }

  // Nếu error có message property
  if (error instanceof Error) {
    // Thử parse message nếu nó là JSON
    try {
      const parsed = JSON.parse(error.message);
      return parseErrorMessage(parsed);
    } catch {
      return error.message;
    }
  }

  // Nếu error là object với các field lỗi từ backend
  if (typeof error === "object") {
    const err = error as Record<string, any>;

    // Ưu tiên xử lý các trường thông dụng
    if (err.detail) {
      return typeof err.detail === "string"
        ? err.detail
        : parseErrorMessage(err.detail);
    }

    if (err.message) {
      return typeof err.message === "string"
        ? err.message
        : parseErrorMessage(err.message);
    }

    if (err.error) {
      return typeof err.error === "string"
        ? err.error
        : parseErrorMessage(err.error);
    }

    if (
      err.non_field_errors &&
      Array.isArray(err.non_field_errors) &&
      err.non_field_errors.length > 0
    ) {
      return err.non_field_errors[0];
    }

    // Xử lý format Django Rest Framework: {"field": ["error message"]}
    const keys = Object.keys(err);
    if (keys.length > 0) {
      const firstKey = keys[0];
      const firstValue = err[firstKey];

      // Nếu value là array
      if (Array.isArray(firstValue) && firstValue.length > 0) {
        const errorMsg = firstValue[0];
        // Format: "field: message" (trừ một số field đặc biệt)
        const skipFieldName = ["non_field_errors", "detail", "_error"];
        if (!skipFieldName.includes(firstKey)) {
          // Dịch một số field name thông dụng sang tiếng Việt
          const fieldNames: Record<string, string> = {
            email: "Email",
            username: "Tên đăng nhập",
            password: "Mật khẩu",
            phone_number: "Số điện thoại",
            fullname: "Họ tên",
            address: "Địa chỉ",
          };
          const fieldDisplay = fieldNames[firstKey] || firstKey;
          return `${fieldDisplay}: ${errorMsg}`;
        }
        return errorMsg;
      }

      // Nếu value là string
      if (typeof firstValue === "string") {
        const skipFieldName = ["non_field_errors", "detail", "_error"];
        if (!skipFieldName.includes(firstKey)) {
          const fieldNames: Record<string, string> = {
            email: "Email",
            username: "Tên đăng nhập",
            password: "Mật khẩu",
            phone_number: "Số điện thoại",
            fullname: "Họ tên",
            address: "Địa chỉ",
          };
          const fieldDisplay = fieldNames[firstKey] || firstKey;
          return `${fieldDisplay}: ${firstValue}`;
        }
        return firstValue;
      }
    }
  }

  return "Đã xảy ra lỗi. Vui lòng thử lại!";
};

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
      (config.headers as Record<string, string>)[
        "Authorization"
      ] = `Bearer ${token}`;
    }

    let response: Response;

    try {
      response = await fetch(url, config);
    } catch (error) {
      // Lỗi network thực sự (server không chạy, không có mạng)
      console.error("Network error:", error);
      throw new Error(
        "Lỗi kết nối: Không thể kết nối đến máy chủ. Vui lòng kiểm tra kết nối mạng!"
      );
    }

    // Nếu token hết hạn
    if (response.status === 401 && !skipAuth) {
      try {
        await this.refreshToken();
        (config.headers as Record<string, string>)[
          "Authorization"
        ] = `Bearer ${localStorage.getItem("access_token")}`;
        const retryResponse = await fetch(url, config);
        return await this.handleResponse<T>(retryResponse);
      } catch (error) {
        // Nếu refresh token thất bại, throw lỗi từ handleResponse
        throw error;
      }
    }

    // handleResponse sẽ throw lỗi từ backend nếu response.ok = false
    return await this.handleResponse<T>(response);
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
      console.error("API Error response data:", data);
      const errorMessage = parseErrorMessage(data);
      throw new Error(errorMessage);
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
