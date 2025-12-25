import { apiClient } from './api';

export interface Promotion {
  id: number;
  name: string;
  scope: 'STORE' | 'GLOBAL';
  discount_type: 'PERCENT' | 'AMOUNT';
  discount_value: string | number;
  start_date: string;
  end_date: string;
  minimum_pay: string | number;
  max_discount_amount?: string | number | null;
  store?: number;
  store_id?: number;
  is_active: boolean;
  category?: string; // Legacy field
}

export interface CreatePromotionRequest {
  name: string;
  discount_type: 'PERCENT' | 'AMOUNT';
  discount_value: number;
  start_date: string;
  end_date: string;
  minimum_pay: number;
  max_discount_amount?: number | null;
  is_active?: boolean;
}

export interface PromotionStats {
  total: number;
  active: number;
  used: number;
  conversion: string;
}

class PromotionsService {
  /**
   * Get all promotions for store manager
   */
  async getStorePromotions(): Promise<Promotion[]> {
    try {
      const response: any = await apiClient.get('/promotions/');
      return response as Promotion[];
    } catch (error: any) {
      console.error('Error fetching store promotions:', error);
      throw new Error(error.message || 'Không thể tải danh sách khuyến mãi');
    }
  }

  /**
   * Get promotion detail
   */
  async getPromotionDetail(promoId: number): Promise<Promotion> {
    try {
      const response: any = await apiClient.get(`/promotions/${promoId}/`);
      return response as Promotion;
    } catch (error: any) {
      console.error('Error fetching promotion detail:', error);
      throw new Error(error.message || 'Không thể tải thông tin khuyến mãi');
    }
  }

  /**
   * Create new promotion
   */
  async createPromotion(data: CreatePromotionRequest): Promise<Promotion> {
    try {
      const response: any = await apiClient.post('/promotions/create/', data);
      return response as Promotion;
    } catch (error: any) {
      console.error('Error creating promotion:', error);
      throw new Error(error.message || 'Không thể tạo khuyến mãi');
    }
  }

  /**
   * Update promotion
   */
  async updatePromotion(promoId: number, data: Partial<CreatePromotionRequest>): Promise<Promotion> {
    try {
      const response: any = await apiClient.put(`/promotions/${promoId}/update/`, data);
      return response as Promotion;
    } catch (error: any) {
      console.error('Error updating promotion:', error);
      throw new Error(error.message || 'Không thể cập nhật khuyến mãi');
    }
  }

  /**
   * Delete promotion
   */
  async deletePromotion(promoId: number): Promise<{ success: boolean; message: string }> {
    try {
      const response: any = await apiClient.delete(`/promotions/${promoId}/delete/`);
      return response as { success: boolean; message: string };
    } catch (error: any) {
      console.error('Error deleting promotion:', error);
      throw new Error(error.message || 'Không thể xóa khuyến mãi');
    }
  }

  /**
   * Validate promotion
   */
  async validatePromotion(promoId: number, totalAmount: number): Promise<{
    valid: boolean;
    discount_amount?: string;
    final_amount?: string;
    error?: string;
    promo?: Promotion;
  }> {
    try {
      const response: any = await apiClient.post('/promotions/validate/', {
        promo_id: promoId,
        total_amount: totalAmount
      });
      return response;
    } catch (error: any) {
      console.error('Error validating promotion:', error);
      throw new Error(error.message || 'Không thể xác thực khuyến mãi');
    }
  }

  /**
   * Get promotion statistics (calculated from list)
   */
  async getPromotionStats(): Promise<PromotionStats> {
    try {
      const promotions = await this.getStorePromotions();
      
      const total = promotions.length;
      const active = promotions.filter(p => p.is_active).length;
      
      // Since we don't have usage data from backend, return placeholder
      const used = 0;
      const conversion = '0.0';
      
      return {
        total,
        active,
        used,
        conversion
      };
    } catch (error: any) {
      console.error('Error calculating promotion stats:', error);
      throw error;
    }
  }

  /**
   * Format date for API (ISO format)
   */
  formatDateForAPI(date: Date): string {
    return date.toISOString();
  }

  /**
   * Parse date from API
   */
  parseDateFromAPI(dateString: string): Date {
    return new Date(dateString);
  }

  /**
   * Format date for display (dd/MM/yyyy)
   */
  formatDateForDisplay(date: Date): string {
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  }

  /**
   * Parse display date (dd/MM/yyyy) to Date object
   */
  parseDisplayDate(dateString: string): Date | null {
    const parts = dateString.split('/');
    if (parts.length !== 3) return null;
    return new Date(
      parseInt(parts[2], 10),
      parseInt(parts[1], 10) - 1,
      parseInt(parts[0], 10)
    );
  }

  // ============ ADMIN ENDPOINTS (system-wide promotions) ============

  /**
   * Get all promotions for admin (includes system-wide and store-specific)
   */
  async getAdminPromotions(): Promise<Promotion[]> {
    try {
      const response: any = await apiClient.get('/promotions/admin/');
      return response as Promotion[];
    } catch (error: any) {
      console.error('Error fetching admin promotions:', error);
      throw new Error(error.message || 'Không thể tải danh sách khuyến mãi');
    }
  }

  /**
   * Get promotion detail (admin)
   */
  async getAdminPromotionDetail(promoId: number): Promise<Promotion> {
    try {
      const response: any = await apiClient.get(`/promotions/admin/${promoId}/`);
      return response as Promotion;
    } catch (error: any) {
      console.error('Error fetching admin promotion detail:', error);
      throw new Error(error.message || 'Không thể tải thông tin khuyến mãi');
    }
  }

  /**
   * Create system-wide promotion (admin only) - store_id will be 0
   */
  async createAdminPromotion(data: CreatePromotionRequest): Promise<Promotion> {
    try {
      const response: any = await apiClient.post('/promotions/admin/create/', data);
      return response as Promotion;
    } catch (error: any) {
      console.error('Error creating admin promotion:', error);
      throw new Error(error.message || 'Không thể tạo khuyến mãi');
    }
  }

  /**
   * Update promotion (admin)
   */
  async updateAdminPromotion(promoId: number, data: Partial<CreatePromotionRequest>): Promise<Promotion> {
    try {
      const response: any = await apiClient.put(`/promotions/admin/${promoId}/update/`, data);
      return response as Promotion;
    } catch (error: any) {
      console.error('Error updating admin promotion:', error);
      throw new Error(error.message || 'Không thể cập nhật khuyến mãi');
    }
  }

  /**
   * Delete promotion (admin)
   */
  async deleteAdminPromotion(promoId: number): Promise<{ success: boolean; message: string }> {
    try {
      const response: any = await apiClient.delete(`/promotions/admin/${promoId}/delete/`);
      return response as { success: boolean; message: string };
    } catch (error: any) {
      console.error('Error deleting admin promotion:', error);
      throw new Error(error.message || 'Không thể xóa khuyến mãi');
    }
  }

  /**
   * Get promotion statistics for admin
   */
  async getAdminPromotionStats(): Promise<PromotionStats> {
    try {
      const promotions = await this.getAdminPromotions();
      
      const total = promotions.length;
      const active = promotions.filter(p => p.is_active).length;
      
      // All promotions returned are system-wide (store_id=0)
      // Since we don't have usage data from backend, return placeholder
      const used = 0;
      const conversion = '0.0';
      
      return {
        total,
        active,
        used,
        conversion
      };
    } catch (error: any) {
      console.error('Error calculating admin promotion stats:', error);
      throw error;
    }
  }
}

export const promotionsService = new PromotionsService();
