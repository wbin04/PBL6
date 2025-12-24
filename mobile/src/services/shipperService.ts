import { apiClient } from './api';
import { STORAGE_KEYS } from '@/constants';
import * as SecureStore from 'expo-secure-store';

export interface ShipperOrder {
  id: number;
  created_date: string;
  total_before_discount?: number | string;
  total_after_discount?: number | string;
  total_money?: number | string; // Backend uses this field (food only)
  total_discount?: number | string; // Total discount applied
  shipping_fee: number | string;
  promo_discount?: number; // Total promo discount from database
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
  ship_latitude?: number | string | null;
  ship_longitude?: number | string | null;
  phone_number: string;
  shipper?: {
    id: number;
    name: string;
  };
  route_polyline?: string | null;
  store?: {
    id: number;
    store_name: string;
    address?: string | null;
    latitude?: number | string | null;
    longitude?: number | string | null;
  };
  store_name?: string; // Backend uses this field directly
  store_info_id?: number;
  store_address?: string | null;
  store_latitude?: number | string | null;
  store_longitude?: number | string | null;
  details?: Array<{
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
  items?: Array<{ // Backend uses this field
    id: string;
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

  // Get orders available for pickup (no shipper assigned yet)
  async getAvailableOrders(): Promise<ShipperOrder[]> {
    try {
      // Exclude cancelled orders by filtering out order_status="Đã hủy" and delivery_status="Đã hủy"
      const data = await apiClient.get<any>('/orders/?delivery_status=Chờ xác nhận&shipper__isnull=true&ordering=-created_date');

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
      
      // Filter out any cancelled orders on client side as additional safety
      // Handle both spellings: "Đã hủy" and "Đã huỷ"
      orders = orders.filter((order: any) => 
        order.order_status !== 'Đã hủy' && order.order_status !== 'Đã huỷ' &&
        order.delivery_status !== 'Đã hủy' && order.delivery_status !== 'Đã huỷ'
      );
      
      console.log('Processed available orders (after filtering cancelled):', orders);
      return orders;
    } catch (error) {
      console.error('Error fetching available orders:', error);
      return []; // Return empty array instead of throwing
    }
  }

  // Get orders accepted by current shipper
  async getShipperOrders(delivery_status?: string): Promise<ShipperOrder[]> {
    try {
      const shipperId = await this.getCurrentShipperId();

      let url = '/orders/shipper/?ordering=-created_date';
      if (delivery_status) {
        url += `&delivery_status=${encodeURIComponent(delivery_status)}`;
      }
      
      console.log('getShipperOrders URL:', url);

      const data = await apiClient.get<any>(url);
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
      const data = await apiClient.post<any>(`/orders/shipper/${orderId}/accept/`, {});
      return data.order || data;
    } catch (error) {
      console.error('Error accepting order:', error);
      throw error;
    }
  }

  // Update delivery status (e.g., "Đã lấy hàng", "Đang giao", "Đã giao")
  async updateDeliveryStatus(orderId: number, delivery_status: string): Promise<ShipperOrder> {
    try {
      console.log(`=== UPDATE DELIVERY STATUS DEBUG ===`);
      console.log(`Order ID: ${orderId}`);
      console.log(`New Status: ${delivery_status}`);
      console.log(`Request body:`, { delivery_status });

      const data = await apiClient.put<any>(`/orders/shipper/${orderId}/status/`, {
        delivery_status: delivery_status // Send delivery_status field
      });

      console.log(`Success response:`, data);
      console.log(`=== END UPDATE DELIVERY STATUS DEBUG ===`);

      return data.order || data;
    } catch (error) {
      console.error('Error updating delivery status:', error);
      throw error;
    }
  }

  // Mark order as delivered with proof image
  async markDeliveredWithProof(orderId: number, proofImageUri: string): Promise<ShipperOrder> {
    try {
      console.log(`=== MARK DELIVERED WITH PROOF DEBUG ===`);
      console.log(`Order ID: ${orderId}`);
      console.log(`Proof Image URI: ${proofImageUri}`);

      const formData = new FormData();
      formData.append('delivery_status', 'Đã giao');
      
      // Get file extension and create filename
      const uriParts = proofImageUri.split('.');
      const fileExtension = uriParts[uriParts.length - 1];
      
      formData.append('proof_image', {
        uri: proofImageUri,
        name: `delivery_proof_${orderId}.${fileExtension}`,
        type: `image/${fileExtension === 'jpg' ? 'jpeg' : fileExtension}`,
      } as any);

      const data = await apiClient.putMultipart<any>(`/orders/shipper/${orderId}/status/`, formData);

      console.log(`Success response:`, data);
      console.log(`=== END MARK DELIVERED WITH PROOF DEBUG ===`);

      return data.order || data;
    } catch (error) {
      console.error('Error marking as delivered with proof:', error);
      throw error;
    }
  }

  // Cancel order (update delivery_status to "Đã huỷ")
  async cancelOrder(orderId: number, reason?: string): Promise<ShipperOrder> {
    try {
      const data = await apiClient.patch<any>(`/orders/${orderId}/`, {
        delivery_status: 'Đã huỷ',
        cancel_reason: reason || 'Shipper cancelled',
        cancelled_date: new Date().toISOString(),
        cancelled_by_role: 'Người vận chuyển'
      });

      return data;
    } catch (error) {
      console.error('Error cancelling order:', error);
      throw error;
    }
  }
}

export const shipperService = new ShipperService();