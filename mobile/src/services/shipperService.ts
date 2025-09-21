import { API_CONFIG, STORAGE_KEYS } from '@/constants';
import * as SecureStore from 'expo-secure-store';

export interface ShipperOrder {
  id: number;
  created_date: string;
  total_before_discount: number;
  total_after_discount: number;
  shipping_fee: number;
  user: {
    id: number;
    fullname: string;
    phone_number?: string;
  };
  order_status: string;
  delivery_status: string;
  note?: string;
  payment_method: string;
  receiver_name: string;
  ship_address: string;
  phone_number: string;
  shipper?: {
    id: number;
    name: string;
  };
  store: {
    id: number;
    store_name: string;
  };
  details: Array<{
    id: number;
    food: {
      id: number;
      title: string;
      price: number;
    };
    quantity: number;
    food_price: number;
    subtotal: number;
    food_note?: string;
  }>;
}

export interface UpdateDeliveryStatusRequest {
  delivery_status: string;
}

export interface AcceptOrderRequest {
  shipper_id: number;
}

class ShipperService {
  // Get current shipper ID based on user
  private async getCurrentShipperId(): Promise<number> {
    const userStr = await SecureStore.getItemAsync(STORAGE_KEYS.USER);
    const user = userStr ? JSON.parse(userStr) : null;
    
    if (!user) {
      throw new Error('User not found');
    }

    // For now, assume shipper_id = user_id
    // In a real implementation, you might need to call an API to get shipper details
    // GET /api/shipper/profile/ to get shipper info for current user
    return user.id;
  }

  private async getAuthHeaders() {
    const token = await SecureStore.getItemAsync(STORAGE_KEYS.ACCESS_TOKEN);
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    };
  }

  // Get orders available for pickup (no shipper assigned yet)
  async getAvailableOrders(): Promise<ShipperOrder[]> {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`${API_CONFIG.BASE_URL}/orders/?delivery_status=Chờ xác nhận&shipper__isnull=true&ordering=-created_date`, {
        method: 'GET',
        headers,
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch available orders: ${response.status}`);
      }

      const data = await response.json();
      console.log('getAvailableOrders API response:', data);
      
      // Safely handle response structure
      let orders = [];
      if (Array.isArray(data)) {
        orders = data;
      } else if (data && Array.isArray(data.results)) {
        orders = data.results;
      } else if (data && data.data && Array.isArray(data.data)) {
        orders = data.data;
      }
      
      console.log('Processed available orders:', orders);
      return orders;
    } catch (error) {
      console.error('Error fetching available orders:', error);
      return []; // Return empty array instead of throwing
    }
  }

  // Get orders accepted by current shipper
  async getShipperOrders(delivery_status?: string): Promise<ShipperOrder[]> {
    try {
      const headers = await this.getAuthHeaders();
      const shipperId = await this.getCurrentShipperId();

      let url = `${API_CONFIG.BASE_URL}/orders/?shipper=${shipperId}&ordering=-created_date`;
      if (delivery_status) {
        url += `&delivery_status=${encodeURIComponent(delivery_status)}`;
      }

      const response = await fetch(url, {
        method: 'GET',
        headers,
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch shipper orders: ${response.status}`);
      }

      const data = await response.json();
      console.log('getShipperOrders API response:', data);
      
      // Safely handle response structure
      let orders = [];
      if (Array.isArray(data)) {
        orders = data;
      } else if (data && Array.isArray(data.results)) {
        orders = data.results;
      } else if (data && data.data && Array.isArray(data.data)) {
        orders = data.data;
      }
      
      console.log('Processed shipper orders:', orders);
      return orders;
    } catch (error) {
      console.error('Error fetching shipper orders:', error);
      return []; // Return empty array instead of throwing
    }
  }

  // Accept an order (assign current shipper and update delivery_status)
  async acceptOrder(orderId: number): Promise<ShipperOrder> {
    try {
      const headers = await this.getAuthHeaders();
      const shipperId = await this.getCurrentShipperId();

      const response = await fetch(`${API_CONFIG.BASE_URL}/orders/${orderId}/`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({
          delivery_status: 'Đã xác nhận',
          shipper: shipperId
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Failed to accept order: ${response.status} - ${JSON.stringify(errorData)}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error accepting order:', error);
      throw error;
    }
  }

  // Update delivery status (e.g., "Đã lấy hàng", "Đang giao", "Đã giao")
  async updateDeliveryStatus(orderId: number, delivery_status: string): Promise<ShipperOrder> {
    try {
      const headers = await this.getAuthHeaders();

      const response = await fetch(`${API_CONFIG.BASE_URL}/orders/${orderId}/`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({
          delivery_status
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Failed to update delivery status: ${response.status} - ${JSON.stringify(errorData)}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error updating delivery status:', error);
      throw error;
    }
  }

  // Cancel order (update delivery_status to "Đã huỷ")
  async cancelOrder(orderId: number, reason?: string): Promise<ShipperOrder> {
    try {
      const headers = await this.getAuthHeaders();

      const response = await fetch(`${API_CONFIG.BASE_URL}/orders/${orderId}/`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({
          delivery_status: 'Đã huỷ',
          cancel_reason: reason || 'Shipper cancelled',
          cancelled_date: new Date().toISOString(),
          cancelled_by_role: 'Người vận chuyển'
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Failed to cancel order: ${response.status} - ${JSON.stringify(errorData)}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error cancelling order:', error);
      throw error;
    }
  }
}

export const shipperService = new ShipperService();