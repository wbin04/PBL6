import { API_CONFIG } from '@/constants';
import AsyncStorage from '@react-native-async-storage/async-storage';

const CHATBOT_API_URL = `${API_CONFIG.BASE_URL}/chatbot`;

export interface ChatMessage {
  message: string;
  session_id: string;
}

// Food recommendation with statistics (for best seller, top rated, trending)
export interface FoodRecommendation {
  id: number;
  title: string;
  price: string | number;
  image?: string;
  image_url?: string;
  average_rating: number;
  total_sold: number;
  store_id: number;
  store_name: string;
  badge?: string;
  badge_type: 'best_seller' | 'top_rated' | 'trending' | 'cheap_eats' | '';
  badge_text?: string;
  sizes?: Array<{
    id: number;
    size_name: string;
    price: string;
  }>;
}

// Regular food item from search
export interface FoodItem {
  id: number;
  title: string;
  description?: string;
  price: string | number;
  image: string;
  image_url?: string;
  store_id: number;
  store_name: string;
  avg_rating?: number;
  average_rating?: number;
  total_sold?: number;
  badge?: string;
  badge_type?: string;
  sizes?: Array<{
    id: number;
    size_name: string;
    price: string;
  }>;
}

export interface ChatResponse {
  reply: string;
  intent?: string;
  type?: 'text' | 'recommendation' | 'error';
  data?: {
    foods?: FoodItem[];
    recommendations?: FoodRecommendation[];
    statistics_type?: 'best_seller' | 'top_rated' | 'trending' | 'cheap_eats';
    filters?: any;
    stores?: any[];
  };
}

export interface CartItem {
  id: number;
  food: number;
  food_name: string;
  food_price: string;
  food_size?: number;
  size_name?: string;
  size_price?: string;
  quantity: number;
  store_name: string;
  total_price: string;
  created_at: string;
}

export interface CartResponse {
  cart: CartItem[];
  total: number;
  count: number;
}

class ChatbotService {
  private sessionId: string | null = null;

  async getSessionId(): Promise<string> {
    if (this.sessionId) {
      return this.sessionId;
    }

    try {
      let sid = await AsyncStorage.getItem('chatbot_session_id');
      if (!sid) {
        sid = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        await AsyncStorage.setItem('chatbot_session_id', sid);
      }
      this.sessionId = sid;
      return sid;
    } catch (error) {
      console.error('Error getting session ID:', error);
      this.sessionId = `session_${Date.now()}`;
      return this.sessionId;
    }
  }

  async sendMessage(message: string): Promise<ChatResponse> {
    try {
      const sessionId = await this.getSessionId();

      // Create abort controller for timeout (30 seconds)
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);

      console.log('[Chatbot] Sending to:', `${CHATBOT_API_URL}/chat/`);
      console.log('[Chatbot] Full URL would be:', CHATBOT_API_URL);
      console.log('[Chatbot] Message:', message);
      console.log('[Chatbot] Session:', sessionId);

      const response = await fetch(`${CHATBOT_API_URL}/chat/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          message,
          session_id: sessionId,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      console.log('[Chatbot] Response status:', response.status);
      console.log('[Chatbot] Response headers:', JSON.stringify(Object.fromEntries(response.headers)));

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[Chatbot] Error response body:', errorText);
        throw new Error(`HTTP ${response.status}: ${errorText || response.statusText}`);
      }

      const data = await response.json();
      console.log('[Chatbot] Success! Reply:', data.reply?.substring(0, 50) + '...');
      return data;
    } catch (error: any) {
      console.error('[Chatbot] Full error:', error);
      
      // Provide helpful error messages
      if (error.name === 'AbortError') {
        throw new Error('⏱️ Request timeout\n\n' +
          '❌ Backend không phản hồi sau 30 giây.\n\n' +
          '✅ Kiểm tra:\n' +
          '1. Backend đang chạy? (python manage.py runserver)\n' +
          '2. URL đúng? (' + CHATBOT_API_URL + '/chat/)\n' +
          '3. Firewall chặn kết nối?'
        );
      } else if (error.message?.includes('Network request failed')) {
        throw new Error('🌐 Network Error\n\n' +
          '❌ Không thể kết nối tới server.\n\n' +
          '✅ Kiểm tra:\n' +
          '1. Backend đang chạy trên port 8000?\n' +
          '2. Đúng IP/hostname?\n' +
          '3. CORS được cấu hình?\n' +
          '4. Emulator dùng 10.0.2.2 thay vì localhost'
        );
      }
      
      throw error;
    }
  }

  async getCart(): Promise<CartResponse> {
    try {
      const sessionId = await this.getSessionId();

      const response = await fetch(`${CHATBOT_API_URL}/cart/?session_id=${sessionId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error getting cart:', error);
      throw error;
    }
  }

  async clearCart(): Promise<void> {
    try {
      const sessionId = await this.getSessionId();

      const response = await fetch(`${CHATBOT_API_URL}/cart/clear/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          session_id: sessionId,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
    } catch (error) {
      console.error('Error clearing cart:', error);
      throw error;
    }
  }

  async getMenu(): Promise<any> {
    try {
      const response = await fetch(`${CHATBOT_API_URL}/menu/`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error getting menu:', error);
      throw error;
    }
  }

  clearSession(): void {
    this.sessionId = null;
    AsyncStorage.removeItem('chatbot_session_id');
  }
}

export default new ChatbotService();
