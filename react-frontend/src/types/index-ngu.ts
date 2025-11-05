export interface ApiResponse<T = unknown> {
    data?: T;
    message?: string;
    error?: {
        message: string;
    };
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
    is_store_registered?: boolean;
    is_shipper_registered?: boolean;
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