// Payment API configuration
const API_BASE_URL = "http://localhost:8000/api";

export interface PaymentLinkRequest {
  order_id: number;
  amount: number;
  message: string;
  user_id?: number;
}

export interface PaymentLinkResponse {
  checkoutUrl: string;
  orderCode: number;
  status: string;
  error?: string;
}

export interface PaymentStatusResponse {
  orderCode: number;
  status: string;
  paid: boolean;
  error?: string;
}

class PaymentService {
  private getAuthHeaders(): HeadersInit {
    const token = localStorage.getItem("access_token");
    return {
      "Content-Type": "application/json",
      ...(token && { Authorization: `Bearer ${token}` }),
    };
  }

  /**
   * Tạo payment link với PayOS
   */
  async createPaymentLink(
    data: PaymentLinkRequest
  ): Promise<PaymentLinkResponse> {
    try {
      const url = `${API_BASE_URL}/payments/payos/create-link/`;
      console.log("Calling payment API:", url);
      console.log("Payment data:", data);

      const response = await fetch(url, {
        method: "POST",
        headers: this.getAuthHeaders(),
        body: JSON.stringify({
          user_id: data.user_id,
          order_id: data.order_id,
          amount: data.amount,
          message: data.message || `Thanh toán đơn hàng #${data.order_id}`,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        const errorMessage =
          errorData.error ||
          errorData.message ||
          errorData.detail ||
          `HTTP error! status: ${response.status}`;

        // Thông báo lỗi rõ ràng cho người dùng về PayOS
        if (
          errorMessage.includes("Cổng thanh toán") ||
          errorMessage.includes("đã tạm dừng") ||
          errorMessage.includes("không tồn tại")
        ) {
          throw new Error(
            'Tính năng thanh toán online hiện chưa khả dụng. Vui lòng chọn "Thanh toán khi nhận hàng (COD)".'
          );
        }

        throw new Error(errorMessage);
      }

      const result = await response.json();

      if (result.error) {
        const errorMessage = result.error;
        // Thông báo lỗi rõ ràng cho người dùng về PayOS
        if (
          errorMessage.includes("Cổng thanh toán") ||
          errorMessage.includes("đã tạm dừng") ||
          errorMessage.includes("không tồn tại")
        ) {
          throw new Error(
            'Tính năng thanh toán online hiện chưa khả dụng. Vui lòng chọn "Thanh toán khi nhận hàng (COD)".'
          );
        }
        throw new Error(errorMessage);
      }

      return result as PaymentLinkResponse;
    } catch (error) {
      console.error("Error creating payment link:", error);
      throw error;
    }
  }

  /**
   * Kiểm tra trạng thái thanh toán
   */
  async checkPaymentStatus(orderCode: number): Promise<PaymentStatusResponse> {
    try {
      const response = await fetch(
        `${API_BASE_URL}/payments/payos/check-status/`,
        {
          method: "POST",
          headers: this.getAuthHeaders(),
          body: JSON.stringify({ orderCode }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.error || `HTTP error! status: ${response.status}`
        );
      }

      const result = await response.json();

      if (result.error) {
        throw new Error(result.error);
      }

      return result as PaymentStatusResponse;
    } catch (error) {
      console.error("Error checking payment status:", error);
      throw error;
    }
  }

  /**
   * Poll payment status with timeout
   * Kiểm tra trạng thái thanh toán định kỳ cho đến khi hoàn thành hoặc timeout
   */
  async pollPaymentStatus(
    orderCode: number,
    onStatusUpdate?: (status: PaymentStatusResponse) => void,
    options: {
      interval?: number; // milliseconds
      maxAttempts?: number;
    } = {}
  ): Promise<PaymentStatusResponse> {
    const interval = options.interval || 3000; // 3 seconds default
    const maxAttempts = options.maxAttempts || 20; // 60 seconds total

    let attempts = 0;

    return new Promise((resolve, reject) => {
      const checkStatus = async () => {
        try {
          attempts++;
          const status = await this.checkPaymentStatus(orderCode);

          if (onStatusUpdate) {
            onStatusUpdate(status);
          }

          // Nếu đã thanh toán thành công hoặc bị hủy
          if (status.status === "PAID" || status.status === "CANCELLED") {
            resolve(status);
            return;
          }

          // Nếu vượt quá số lần thử
          if (attempts >= maxAttempts) {
            reject(new Error("Payment status check timeout"));
            return;
          }

          // Tiếp tục kiểm tra
          setTimeout(checkStatus, interval);
        } catch (error) {
          reject(error);
        }
      };

      checkStatus();
    });
  }
}

export const paymentService = new PaymentService();
