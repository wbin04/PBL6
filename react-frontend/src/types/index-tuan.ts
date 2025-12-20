export interface ApiResponse<T = any> {
    data?: T;
    message?: string;
    error?: {
      message: string;
    };
  }
  
  export interface ShipperApplication {
    id: number;       // User ID
    username: string;
    fullname: string;
    email?: string;
    phone_number?: string;
    is_shipper_registered: boolean;
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
  
  export interface Customer {
    id: number;
    username: string;
    fullname: string;
    email: string;
    phone_number?: string;
    address?: string;
    role: string;
    role_id: number;
    created_date: string;
  }
  
  export interface AdminOrder {
    id: number;
    user: { fullname: string; email: string; phone_number?: string };
    total_money: number;
    order_status: string;
    payment_method: string;
    created_date: string;
    receiver_name: string;
    phone_number: string;
    ship_address: string;
    note?: string;
    items?: Array<{
      food: { id: number; title: string; price: number };
      quantity: number;
    }>;
  }
  
  export interface Store {
    id: number;
    store_name: string;
    image: string;
    description: string;
    manager: number;
  }
  
  export interface User {
    id: number;
    username: string;
    email: string;
    role: string;
  }
  
  export interface Category {
    id: number;
    cate_name: string;
    image: string;
  }
  
  export interface Food {
    id: number;
    title: string;
    description: string;
    price: number;  
    image: string;
    image_url: string;
    availability: string;
  
    category?: {
      id: number;
      cate_name: string;
    };
  
    store?: {
      id: number;
      store_name: string;
    };
  
    sizes?: any[];
    average_rating?: number;
    rating_count?: number;
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
    status: 'PENDING' | 'PAID' | 'PREPARING' | 'READY' | 'COMPLETED' | 'CANCELLED';
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
  
  export interface FoodSize {
    id: number;
    size_name: string;
    price: string;
    food: number;
  }
  
  export interface StoreOrder {
    id: number;
    user: { fullname: string };
    total_money: string;
    order_status: string;
    payment_method: string;
    created_date: string;
    receiver_name: string;
    phone_number: string;
    ship_address: string;
    note?: string;
    items?: any[];
  }
  
  export interface MyStore {
    id: number;
    store_name: string;
    image: string; // Tên file ảnh gốc
    image_url: string; // URL đầy đủ để hiển thị
    description: string;
    manager: {
      id: number;
      fullname: string;
      email: string;
    };
  }