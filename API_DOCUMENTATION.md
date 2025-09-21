# FastFood API Documentation

## Tổng quan
FastFood API cung cấp các endpoints để quản lý hệ thống đặt đồ ăn nhanh, bao gồm xác thực người dùng, quản lý menu, giỏ hàng, đơn hàng, thanh toán, khuyến mãi, đánh giá và giao hàng.

**Base URL:** `http://localhost:8000`

---

## 1. Authentication API (`/api/auth/`)

### 1.1 Đăng nhập
- **POST** `/api/auth/login/`
- **Mô tả:** Đăng nhập bằng email, username hoặc số điện thoại
- **Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```
- **Response:**
```json
{
  "access": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
  "refresh": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
  "user": {
    "id": 1,
    "username": "john_doe",
    "email": "user@example.com",
    "fullname": "John Doe",
    "phone_number": "0123456789",
    "address": "123 Main St",
    "role": "Khách hàng",
    "role_id": 1,
    "created_date": "2025-01-01T10:00:00Z"
  }
}
```

### 1.2 Đăng ký
- **POST** `/api/auth/register/`
- **Request Body:**
```json
{
  "email": "newuser@example.com",
  "username": "new_user",
  "fullname": "New User",
  "phone_number": "0987654321",
  "address": "456 Oak St",
  "password": "newpassword123",
  "password_confirm": "newpassword123"
}
```
- **Response:**
```json
{
  "id": 2,
  "username": "new_user",
  "email": "newuser@example.com",
  "fullname": "New User",
  "phone_number": "0987654321",
  "address": "456 Oak St",
  "role": "Khách hàng",
  "role_id": 1,
  "created_date": "2025-01-01T11:00:00Z"
}
```

### 1.3 Làm mới token
- **POST** `/api/auth/refresh/`
- **Request Body:**
```json
{
  "refresh": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9..."
}
```
- **Response:**
```json
{
  "access": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9..."
}
```

### 1.4 Thông tin người dùng
- **GET** `/api/auth/profile/`
- **Headers:** `Authorization: Bearer {access_token}`
- **Response:**
```json
{
  "id": 1,
  "username": "john_doe",
  "email": "user@example.com",
  "fullname": "John Doe",
  "phone_number": "0123456789",
  "address": "123 Main St",
  "role": "Khách hàng",
  "role_id": 1,
  "created_date": "2025-01-01T10:00:00Z"
}
```

### 1.5 Cập nhật thông tin người dùng
- **PUT** `/api/auth/profile/update/`
- **Headers:** `Authorization: Bearer {access_token}`
- **Request Body:**
```json
{
  "fullname": "John Smith",
  "phone_number": "0123456789",
  "address": "789 Pine St"
}
```
- **Response:** Tương tự response của profile

### 1.6 Đặt lại mật khẩu
- **POST** `/api/auth/reset-password/`
- **Request Body:**
```json
{
  "identifier": "user@example.com",
  "new_password": "newpassword456"
}
```
- **Response:**
```json
{
  "message": "Mật khẩu đã được đặt lại thành công"
}
```

### 1.7 Admin - Danh sách khách hàng
- **GET** `/api/auth/admin/customers/`
- **Headers:** `Authorization: Bearer {admin_token}`
- **Query Parameters:**
  - `search`: Tìm kiếm theo tên, email hoặc số điện thoại
  - `page`: Trang hiện tại (mặc định: 1)
- **Response:**
```json
{
  "customers": [
    {
      "id": 1,
      "username": "john_doe",
      "email": "user@example.com",
      "fullname": "John Doe",
      "phone_number": "0123456789",
      "address": "123 Main St",
      "role": "Khách hàng",
      "role_id": 1,
      "created_date": "2025-01-01T10:00:00Z"
    }
  ],
  "total_pages": 5,
  "current_page": 1,
  "total_customers": 45
}
```

### 1.8 Admin - Chi tiết khách hàng
- **GET** `/api/auth/admin/customers/{customer_id}/`
- **PUT** `/api/auth/admin/customers/{customer_id}/`
- **Headers:** `Authorization: Bearer {admin_token}`
- **Request Body (PUT):**
```json
{
  "fullname": "John Smith Updated",
  "phone_number": "0987654321",
  "address": "456 New Address"
}
```
- **Response:** Tương tự thông tin người dùng

---

## 2. Menu API (`/api/menu/`)

### 2.1 Danh sách danh mục
- **GET** `/api/menu/categories/`
- **Response:**
```json
[
  {
    "id": 1,
    "cate_name": "Burger",
    "image": "burger.png",
    "image_url": "http://localhost:8000/media/assets/burger.png",
    "foods_count": 15
  },
  {
    "id": 2,
    "cate_name": "Pizza",
    "image": "pizza.png",
    "image_url": "http://localhost:8000/media/assets/pizza.png",
    "foods_count": 8
  }
]
```

### 2.2 Danh sách cửa hàng
- **GET** `/api/menu/stores/`
- **Response:**
```json
[
  {
    "id": 1,
    "store_name": "KFC Trần Phú",
    "address": "123 Trần Phú, Hà Nội",
    "phone_number": "0123456789",
    "image": "kfc-store.png",
    "image_url": "http://localhost:8000/media/assets/kfc-store.png",
    "open_time": "08:00:00",
    "close_time": "22:00:00",
    "is_active": true
  }
]
```

### 2.3 Danh sách món ăn
- **GET** `/api/menu/items/`
- **Query Parameters:**
  - `category`: ID danh mục
  - `store`: ID cửa hàng
  - `search`: Tìm kiếm theo tên
- **Response:**
```json
[
  {
    "id": 1,
    "title": "Big Mac",
    "description": "Bánh burger với 2 lớp thịt bò, rau xanh và sốt đặc biệt",
    "price": "89000.00",
    "image": "bigmac.jpg",
    "image_url": "http://localhost:8000/media/assets/bigmac.jpg",
    "category_name": "Burger",
    "store": {
      "id": 1,
      "store_name": "McDonald's Nguyễn Huệ",
      "address": "456 Nguyễn Huệ, TP.HCM"
    },
    "store_name": "McDonald's Nguyễn Huệ",
    "availability": "Còn hàng",
    "sizes": [
      {
        "id": 1,
        "size_name": "Medium",
        "price": "10000.00"
      },
      {
        "id": 2,
        "size_name": "Large",
        "price": "20000.00"
      }
    ],
    "average_rating": 4.5,
    "rating_count": 120
  }
]
```

### 2.4 Chi tiết món ăn
- **GET** `/api/menu/items/{id}/`
- **Response:**
```json
{
  "id": 1,
  "title": "Big Mac",
  "description": "Bánh burger với 2 lớp thịt bò, rau xanh và sốt đặc biệt",
  "price": "89000.00",
  "image": "bigmac.jpg",
  "image_url": "http://localhost:8000/media/assets/bigmac.jpg",
  "category": {
    "id": 1,
    "cate_name": "Burger",
    "image": "burger.png",
    "image_url": "http://localhost:8000/media/assets/burger.png",
    "foods_count": 15
  },
  "store": {
    "id": 1,
    "store_name": "McDonald's Nguyễn Huệ",
    "address": "456 Nguyễn Huệ, TP.HCM"
  },
  "availability": "Còn hàng",
  "sizes": [
    {
      "id": 1,
      "size_name": "Medium",
      "price": "10000.00"
    }
  ],
  "average_rating": 4.5,
  "rating_count": 120
}
```

### 2.6 Admin - Quản lý món ăn
- **GET** `/api/menu/admin/foods/`
- **POST** `/api/menu/admin/foods/`
- **Headers:** `Authorization: Bearer {admin_or_store_manager_token}`
- **Query Parameters (GET):**
  - `search`: Tìm kiếm theo tên hoặc mô tả
  - `category`: Lọc theo danh mục
  - `store`: Lọc theo cửa hàng (chỉ admin)
  - `page`: Trang hiện tại
- **Request Body (POST):**
```json
{
  "title": "Món ăn mới",
  "description": "Mô tả món ăn",
  "price": "75000.00",
  "category_id": 1,
  "store_id": 1,
  "availability": "Còn hàng"
}
```
- **Response (GET):**
```json
{
  "foods": [
    {
      "id": 1,
      "title": "Big Mac",
      "description": "Bánh burger với 2 lớp thịt bò",
      "price": "89000.00",
      "image": "bigmac.jpg",
      "image_url": "http://localhost:8000/media/assets/bigmac.jpg",
      "category": {
        "id": 1,
        "cate_name": "Burger"
      },
      "store": {
        "id": 1,
        "store_name": "McDonald's Nguyễn Huệ"
      },
      "availability": "Còn hàng",
      "sizes": [],
      "average_rating": 4.5,
      "rating_count": 120
    }
  ],
  "total_pages": 3,
  "current_page": 1,
  "total_foods": 25
}
```

### 2.7 Admin - Chi tiết món ăn
- **GET** `/api/menu/admin/foods/{food_id}/`
- **PUT** `/api/menu/admin/foods/{food_id}/`
- **DELETE** `/api/menu/admin/foods/{food_id}/`
- **Headers:** `Authorization: Bearer {admin_or_store_manager_token}`
- **Request Body (PUT):**
```json
{
  "title": "Big Mac Updated",
  "description": "Mô tả cập nhật",
  "price": "95000.00",
  "category_id": 1,
  "availability": "Hết hàng"
}
```
- **Response:** Tương tự chi tiết món ăn

---

## 3. Cart API (`/api/cart/`)

### 3.1 Xem giỏ hàng
- **GET** `/api/cart/`
- **Headers:** `Authorization: Bearer {access_token}`
- **Response:**
```json
{
  "id": 1,
  "total_money": "156000.00",
  "items": [
    {
      "id": 1,
      "food": {
        "id": 1,
        "title": "Big Mac",
        "price": "89000.00",
        "image_url": "http://localhost:8000/media/assets/bigmac.jpg",
        "store_name": "McDonald's Nguyễn Huệ"
      },
      "food_option": {
        "id": 1,
        "size_name": "Large",
        "price": "20000.00"
      },
      "quantity": 2,
      "item_note": "Không cà chua",
      "subtotal": "218000.00"
    }
  ],
  "items_count": 2
}
```

### 3.2 Thêm vào giỏ hàng
- **POST** `/api/cart/add/`
- **Headers:** `Authorization: Bearer {access_token}`
- **Request Body:**
```json
{
  "food_id": 1,
  "food_option_id": 1,
  "quantity": 2,
  "item_note": "Không cà chua",
  "toppings": {
    "5": 1,
    "7": 2
  }
}
```
- **Response:**
```json
{
  "message": "Added Big Mac to cart",
  "item": {
    "food": {
      "id": 1,
      "title": "Big Mac",
      "price": "89000.00"
    },
    "food_option": {
      "id": 1,
      "size_name": "Large",
      "price": "20000.00"
    },
    "quantity": 2,
    "item_note": "Không cà chua",
    "toppings_added": [
      {
        "food_id": 5,
        "title": "Cheese Extra",
        "quantity": 1
      },
      {
        "food_id": 7,
        "title": "Bacon",
        "quantity": 2
      }
    ]
  }
}
```

### 3.3 Cập nhật số lượng
- **PUT** `/api/cart/items/{food_id}/`
- **Headers:** `Authorization: Bearer {access_token}`
- **Request Body:**
```json
{
  "quantity": 3,
  "food_option_id": 1
}
```
- **Response:** Tương tự thêm vào giỏ hàng

### 3.4 Xóa khỏi giỏ hàng
- **DELETE** `/api/cart/items/{food_id}/remove/`
- **Headers:** `Authorization: Bearer {access_token}`
- **Query Parameters:** `food_option_id` (optional)
- **Response:**
```json
{
  "message": "Đã xóa khỏi giỏ hàng"
}
```

### 3.5 Xóa toàn bộ giỏ hàng
- **DELETE** `/api/cart/clear/`
- **Headers:** `Authorization: Bearer {access_token}`
- **Response:**
```json
{
  "message": "Đã xóa toàn bộ giỏ hàng"
}
```

---

## 4. Orders API (`/api/orders/`)

### 4.1 Danh sách đơn hàng
- **GET** `/api/orders/`
- **Headers:** `Authorization: Bearer {access_token}`
- **Query Parameters:**
  - `status`: Lọc theo trạng thái
  - `page`: Trang hiện tại
- **Response:**
```json
{
  "count": 25,
  "next": "http://localhost:8000/api/orders/?page=2",
  "previous": null,
  "results": [
    {
      "id": 1,
      "order_status": "Đã xác nhận",
      "delivery_status": "Đang giao",
      "total_money": "156000.00",
      "payment_method": "COD",
      "receiver_name": "John Doe",
      "shipper": {
        "id": 1,
        "full_name": "Nguyễn Văn A",
        "phone_number": "0123456789"
      },
      "items_count": 2,
      "created_date": "2025-01-01T10:00:00Z",
      "created_date_display": "2025-01-01 17:00:00",
      "cancel_reason": null,
      "cancelled_date": null,
      "cancelled_by_role": null
    }
  ]
}
```

### 4.2 Tạo đơn hàng
- **POST** `/api/orders/`
- **Headers:** `Authorization: Bearer {access_token}`
- **Request Body:**
```json
{
  "receiver_name": "John Doe",
  "ship_address": "123 Main St, Hà Nội",
  "phone_number": "0123456789",
  "payment_method": "COD",
  "note": "Giao hàng nhanh",
  "promo_ids": [1, 2],
  "discount_amount": "25000.00",
  "shipping_fee": "15000.00"
}
```
- **Response:**
```json
{
  "message": "Đã tạo 2 đơn hàng cho 2 cửa hàng",
  "group_id": 1,
  "orders": [
    {
      "id": 1,
      "user": {
        "id": 1,
        "fullname": "John Doe",
        "email": "user@example.com"
      },
      "order_status": "Chờ xác nhận",
      "delivery_status": "Chờ xác nhận",
      "total_money": "156000.00",
      "payment_method": "COD",
      "receiver_name": "John Doe",
      "phone_number": "0123456789",
      "ship_address": "123 Main St, Hà Nội",
      "note": "Giao hàng nhanh",
      "shipping_fee": "15000.00",
      "group_id": 1,
      "store_name": "McDonald's Nguyễn Huệ",
      "store_info_id": 1,
      "items": [
        {
          "id": "1_1_1",
          "food": {
            "id": 1,
            "title": "Big Mac",
            "price": "89000.00",
            "image_url": "http://localhost:8000/media/assets/bigmac.jpg"
          },
          "food_option": {
            "id": 1,
            "size_name": "Large",
            "price": "20000.00"
          },
          "quantity": 2,
          "food_price": "89000.00",
          "food_option_price": "20000.00",
          "food_note": "Không cà chua",
          "subtotal": 218000.0,
          "size_display": "Size Large: +20,000đ",
          "price_breakdown": [
            {
              "type": "food",
              "name": "Big Mac",
              "display": "Big Mac 89,000đ",
              "price": 89000.0,
              "quantity": 2,
              "total": 178000.0
            },
            {
              "type": "size",
              "name": "Size Large",
              "display": "Size Large: +20,000đ",
              "price": 20000.0,
              "quantity": 2,
              "total": 40000.0
            }
          ]
        }
      ],
      "is_rated": false,
      "created_date": "2025-01-01T10:00:00Z",
      "created_date_display": "2025-01-01 17:00:00"
    }
  ]
}
```

### 4.3 Chi tiết đơn hàng
- **GET** `/api/orders/{id}/`
- **Headers:** `Authorization: Bearer {access_token}`
- **Response:** Tương tự response tạo đơn hàng

### 4.4 Cập nhật trạng thái đơn hàng
- **PATCH** `/api/orders/{id}/status/`
- **Headers:** `Authorization: Bearer {access_token}`
- **Request Body:**
```json
{
  "order_status": "Đã xác nhận"
}
```
- **Response:**
```json
{
  "message": "Cập nhật trạng thái thành công",
  "order_status": "Đã xác nhận"
}
```

### 4.5 Hủy nhóm đơn hàng
- **POST** `/api/orders/{id}/cancel-group/`
- **Headers:** `Authorization: Bearer {access_token}`
- **Request Body:**
```json
{
  "cancel_reason": "Khách hàng thay đổi ý định"
}
```
- **Response:**
```json
{
  "message": "Đã hủy 3 đơn hàng trong nhóm",
  "cancelled_orders": [1, 2, 3]
}
```

---

## 5. Payments API (`/api/payments/`)

### 5.1 Tạo thanh toán
- **POST** `/api/payments/create/`
- **Headers:** `Authorization: Bearer {access_token}`
- **Request Body:**
```json
{
  "order_id": 1,
  "payment_method": "MOMO",
  "return_url": "http://localhost:3000/payment-success"
}
```
- **Response:**
```json
{
  "payment_url": "https://payment.momo.vn/pay?token=abc123",
  "payment_id": "MOMO_20250101_001",
  "order_id": 1,
  "amount": "156000.00"
}
```

### 5.2 Webhook thanh toán
- **POST** `/api/payments/webhook/`
- **Request Body:**
```json
{
  "payment_id": "MOMO_20250101_001",
  "status": "SUCCESS",
  "amount": "156000.00",
  "transaction_id": "TXN123456789"
}
```
- **Response:**
```json
{
  "status": "OK"
}
```

---

## 6. Promotions API (`/api/promotions/`)

### 6.1 Danh sách khuyến mãi
- **GET** `/api/promotions/`
- **Query Parameters:**
  - `store_id`: Lọc theo cửa hàng
  - `active_only`: Chỉ lấy khuyến mãi đang hoạt động
- **Response:**
```json
[
  {
    "id": 1,
    "name": "Giảm 10% cho đơn hàng từ 100k",
    "category": "PERCENT",
    "discount_value": 10.0,
    "minimum_pay": "100000.00",
    "max_discount_amount": "50000.00",
    "start_date": "2025-01-01",
    "end_date": "2025-01-31",
    "store_id": 1,
    "store_name": "McDonald's Nguyễn Huệ",
    "is_active": true,
    "percent": 10.0,
    "description": "Giảm 10% cho đơn hàng từ 100k - 10% off (max 50,000đ)"
  },
  {
    "id": 2,
    "name": "Giảm 20k cho đơn hàng từ 200k",
    "category": "AMOUNT",
    "discount_value": 20000.0,
    "minimum_pay": "200000.00",
    "max_discount_amount": null,
    "start_date": "2025-01-01",
    "end_date": "2025-01-31",
    "store_id": 1,
    "store_name": "McDonald's Nguyễn Huệ",
    "is_active": true,
    "percent": 0,
    "description": "Giảm 20k cho đơn hàng từ 200k - 20,000đ off"
  }
]
```

### 6.2 Xác thực mã khuyến mãi
- **POST** `/api/promotions/validate/`
- **Headers:** `Authorization: Bearer {access_token}`
- **Request Body:**
```json
{
  "promo_code": "DISCOUNT10",
  "total_amount": "150000.00",
  "store_id": 1
}
```
- **Response:**
```json
{
  "valid": true,
  "promo": {
    "id": 1,
    "name": "Giảm 10% cho đơn hàng từ 100k",
    "category": "PERCENT",
    "discount_value": 10.0,
    "max_discount_amount": "50000.00",
    "applied_amount": "15000.00"
  },
  "message": "Mã khuyến mãi hợp lệ"
}
```

### 6.3 Tạo khuyến mãi (Store Manager)
- **POST** `/api/promotions/create/`
- **Headers:** `Authorization: Bearer {store_manager_token}`
- **Request Body:**
```json
{
  "name": "Khuyến mãi mới",
  "category": "PERCENT",
  "discount_value": 15.0,
  "minimum_pay": "80000.00",
  "max_discount_amount": "30000.00",
  "start_date": "2025-02-01",
  "end_date": "2025-02-28",
  "store": 1
}
```
- **Response:** Tương tự danh sách khuyến mãi

### 6.4 Validate nhiều khuyến mãi
- **POST** `/api/promotions/validate-multiple/`
- **Headers:** `Authorization: Bearer {access_token}`
- **Mô tả:** Validate nhiều mã khuyến mãi cùng lúc
- **Request Body:**
```json
{
  "promo_ids": [1, 2],
  "total_amount": "200000.00",
  "store_id": 1
}
```
- **Response:**
```json
{
  "valid": true,
  "total_discount": "35000.00",
  "final_amount": "165000.00",
  "applied_promos": [
    {
      "id": 1,
      "name": "Giảm 10% cho đơn hàng từ 100k",
      "applied_amount": "20000.00"
    },
    {
      "id": 2,
      "name": "Giảm 15k cho đơn hàng từ 200k",
      "applied_amount": "15000.00"
    }
  ]
}
```

### 6.5 Chi tiết khuyến mãi
- **GET** `/api/promotions/{promo_id}/`
- **Headers:** `Authorization: Bearer {access_token}`
- **Response:** Tương tự item trong danh sách khuyến mãi

### 6.6 Cập nhật khuyến mãi (Store Manager)
- **PUT** `/api/promotions/{promo_id}/update/`
- **Headers:** `Authorization: Bearer {store_manager_token}`
- **Request Body:** Tương tự tạo khuyến mãi
- **Response:** Tương tự danh sách khuyến mãi

### 6.7 Xóa khuyến mãi (Store Manager)
- **DELETE** `/api/promotions/{promo_id}/delete/`
- **Headers:** `Authorization: Bearer {store_manager_token}`
- **Response:**
```json
{
  "success": true,
  "message": "Promotion \"Khuyến mãi mới\" deleted successfully"
}
```

---

## 7. Ratings API (`/api/ratings/`)

### 7.1 Danh sách đánh giá
- **GET** `/api/ratings/`
- **Query Parameters:**
  - `food_id`: Lọc theo món ăn
  - `order_id`: Lọc theo đơn hàng
- **Response:**
```json
[
  {
    "id": 1,
    "user": {
      "id": 1,
      "fullname": "John Doe"
    },
    "food": {
      "id": 1,
      "title": "Big Mac"
    },
    "order_id": 1,
    "rating": 5,
    "comment": "Rất ngon, giao hàng nhanh!",
    "created_date": "2025-01-01T12:00:00Z"
  }
]
```

### 7.2 Tạo đánh giá
- **POST** `/api/ratings/`
- **Headers:** `Authorization: Bearer {access_token}`
- **Request Body:**
```json
{
  "food_id": 1,
  "order_id": 1,
  "rating": 5,
  "comment": "Rất ngon, giao hàng nhanh!"
}
```
- **Response:** Tương tự danh sách đánh giá

### 7.3 Chi tiết đánh giá
- **GET** `/api/ratings/{id}/`
- **Response:** Tương tự item trong danh sách đánh giá

---

## 8. Stores API (`/api/stores/`)

### 8.1 Danh sách cửa hàng công khai
- **GET** `/api/stores/public/`
- **Response:**
```json
[
  {
    "id": 1,
    "store_name": "McDonald's Nguyễn Huệ",
    "image": "mcdonalds-nguyen-hue.jpg",
    "image_url": "http://localhost:8000/media/assets/mcdonalds-nguyen-hue.jpg",
    "description": "Cửa hàng McDonald's tại trung tâm thành phố",
    "manager": {
      "id": 5,
      "fullname": "Nguyễn Quản Lý",
      "email": "manager@mcdonalds.com"
    }
  }
]
```

### 8.2 CRUD cửa hàng (Admin/Store Manager)
- **GET** `/api/stores/` - Danh sách cửa hàng
- **POST** `/api/stores/` - Tạo cửa hàng mới
- **GET** `/api/stores/{id}/` - Chi tiết cửa hàng
- **PUT** `/api/stores/{id}/` - Cập nhật cửa hàng
- **DELETE** `/api/stores/{id}/` - Xóa cửa hàng

**Request Body cho tạo/cập nhật:**
```json
{
  "store_name": "KFC Trần Phú",
  "image": "kfc-tran-phu.jpg",
  "description": "Cửa hàng KFC tại Trần Phú",
  "manager": 6
}
```

### 8.3 Cửa hàng của tôi (Store Manager)
- **GET** `/api/stores/my_store/`
- **Headers:** `Authorization: Bearer {store_manager_token}`
- **Response:**
```json
{
  "id": 1,
  "store_name": "McDonald's Nguyễn Huệ",
  "image": "mcdonalds-nguyen-hue.jpg",
  "image_url": "http://localhost:8000/media/assets/mcdonalds-nguyen-hue.jpg",
  "description": "Cửa hàng McDonald's tại trung tâm thành phố",
  "manager": {
    "id": 5,
    "fullname": "Nguyễn Quản Lý",
    "email": "manager@mcdonalds.com"
  }
}
```

### 8.4 Món ăn của cửa hàng
- **GET** `/api/stores/{id}/foods/`
- **Headers:** `Authorization: Bearer {access_token}`
- **Query Parameters:**
  - `page`: Trang hiện tại
- **Response:**
```json
{
  "count": 25,
  "next": 2,
  "previous": null,
  "results": [
    {
      "id": 1,
      "title": "Big Mac",
      "description": "Bánh burger với 2 lớp thịt bò",
      "price": "89000.00",
      "image_url": "http://localhost:8000/media/assets/bigmac.jpg",
      "category": {
        "id": 1,
        "cate_name": "Burger"
      },
      "availability": "Còn hàng",
      "sizes": [],
      "average_rating": 4.5,
      "rating_count": 120
    }
  ]
}
```

### 8.5 Đơn hàng của cửa hàng
- **GET** `/api/stores/{id}/orders/`
- **Headers:** `Authorization: Bearer {store_manager_token}`
- **Response:** Tương tự danh sách đơn hàng

### 8.6 Thống kê cửa hàng
- **GET** `/api/stores/{id}/stats/`
- **Headers:** `Authorization: Bearer {store_manager_token}`
- **Response:**
```json
{
  "total_foods": 25,
  "total_orders": 150,
  "total_revenue": 15000000.0,
  "average_rating": 4.3,
  "total_ratings": 89
}
```

---

## 9. Shipper API (`/api/shipper/`)

### 9.1 Danh sách shipper
- **GET** `/api/shipper/shippers/`
- **Headers:** `Authorization: Bearer {admin_token}`
- **Response:**
```json
[
  {
    "id": 1,
    "user": {
      "id": 10,
      "username": "shipper1",
      "email": "shipper1@example.com",
      "fullname": "Nguyễn Văn A",
      "phone_number": "0123456789"
    },
    "user_id": 10
  }
]
```

### 9.2 Tạo shipper mới
- **POST** `/api/shipper/shippers/`
- **Headers:** `Authorization: Bearer {admin_token}`
- **Request Body:**
```json
{
  "user_id": 10
}
```
- **Response:**
```json
{
  "id": 1,
  "user": {
    "id": 10,
    "username": "shipper1",
    "email": "shipper1@example.com",
    "fullname": "Nguyễn Văn A",
    "phone_number": "0123456789"
  },
  "user_id": 10
}
```

### 9.3 Tìm shipper theo user ID
- **GET** `/api/shipper/shippers/by_user/?user_id={user_id}`
- **Headers:** `Authorization: Bearer {admin_token}`
- **Response:** Tương tự thông tin shipper

### 9.4 Xóa shipper
- **DELETE** `/api/shipper/shippers/{id}/remove_shipper/`
- **Headers:** `Authorization: Bearer {admin_token}`
- **Response:**
```json
{
  "message": "Đã xóa shipper thành công"
}
```

### 9.5 Đơn hàng của shipper
- **GET** `/api/orders/shipper/`
- **Headers:** `Authorization: Bearer {shipper_token}`
- **Query Parameters:**
  - `status`: Lọc theo trạng thái
  - `page`: Trang hiện tại
- **Response:**
```json
{
  "count": 5,
  "num_pages": 1,
  "current_page": 1,
  "has_next": false,
  "has_previous": false,
  "results": [
    {
      "id": 1,
      "order_status": "Sẵn sàng",
      "delivery_status": "Đã lấy hàng",
      "total_money": "156000.00",
      "receiver_name": "John Doe",
      "ship_address": "123 Main St, Hà Nội",
      "phone_number": "0123456789",
      "created_date": "2025-01-01T10:00:00Z",
      "created_date_display": "2025-01-01 17:00:00"
    }
  ]
}
```

### 9.6 Shipper nhận đơn hàng
- **POST** `/api/orders/shipper/{order_id}/accept/`
- **Headers:** `Authorization: Bearer {shipper_token}`
- **Mô tả:** Shipper có thể tự nhận những đơn hàng chưa có shipper phụ trách
- **Response:**
```json
{
  "message": "Order accepted successfully",
  "order": {
    "id": 1,
    "order_status": "Đã xác nhận",
    "delivery_status": "Đã xác nhận",
    "total_money": "156000.00",
    "shipper": {
      "id": 1,
      "user": {
        "fullname": "Nguyễn Văn A"
      }
    },
    "receiver_name": "John Doe",
    "ship_address": "123 Main St, Hà Nội"
  }
}
```

### 9.7 Cập nhật trạng thái giao hàng
- **PUT** `/api/orders/shipper/{order_id}/status/`
- **Headers:** `Authorization: Bearer {shipper_token}`
- **Request Body:**
```json
{
  "order_status": "Đã giao"
}
```
- **Response:**
```json
{
  "message": "Delivery status updated successfully",
  "order": {
    "id": 1,
    "order_status": "Đã giao",
    "delivery_status": "Đã giao",
    "total_money": "156000.00",
    "receiver_name": "John Doe"
  }
}
```

---

## 10. Admin API

### 10.1 Quản lý đơn hàng
- **GET** `/api/orders/admin/` - Danh sách tất cả đơn hàng
- **GET** `/api/orders/admin/{order_id}/` - Chi tiết đơn hàng
- **POST** `/api/orders/admin/{order_id}/assign-shipper/` - Phân công shipper
- **PATCH** `/api/orders/admin/{order_id}/status/` - Cập nhật trạng thái

**Danh sách đơn hàng (GET /api/orders/admin/):**
- **Query Parameters:**
  - `status`: Lọc theo trạng thái
  - `search`: Tìm kiếm theo thông tin khách hàng, ID đơn hàng
  - `page`: Trang hiện tại
- **Response:**
```json
{
  "orders": [
    {
      "id": 1,
      "user": {
        "id": 1,
        "fullname": "John Doe",
        "email": "user@example.com"
      },
      "order_status": "Đã xác nhận",
      "delivery_status": "Đang giao",
      "total_money": "156000.00",
      "receiver_name": "John Doe",
      "created_date_display": "2025-01-01 17:00:00"
    }
  ],
  "total_pages": 5,
  "current_page": 1,
  "total_orders": 45
}
```

**Phân công shipper (POST /api/orders/admin/{order_id}/assign-shipper/):**
- **Request Body:**
```json
{
  "shipper_id": 1
}
```
- **Response:**
```json
{
  "message": "Shipper assignment updated successfully",
  "order": {
    "id": 1,
    "shipper": {
      "id": 1,
      "user": {
        "fullname": "Nguyễn Văn A"
      }
    },
    "order_status": "Đang giao"
  }
}
```

**Cập nhật trạng thái (PATCH /api/orders/admin/{order_id}/status/):**
- **Request Body:**
```json
{
  "order_status": "Đã giao",
  "cancel_reason": "Lý do hủy (nếu có)"
}
```

### 10.2 Quản lý món ăn
- **GET** `/api/menu/admin/foods/` - Danh sách tất cả món ăn (đã có ở mục 2.6)
- **GET** `/api/menu/admin/foods/{food_id}/` - Chi tiết món ăn (đã có ở mục 2.7)
- **POST** `/api/menu/admin/foods/` - Tạo món ăn mới (đã có ở mục 2.6)
- **PUT** `/api/menu/admin/foods/{food_id}/` - Cập nhật món ăn (đã có ở mục 2.7)
- **DELETE** `/api/menu/admin/foods/{food_id}/` - Xóa món ăn (đã có ở mục 2.7)

---

## 11. API Bổ sung

### 11.1 Tạo đơn hàng với nhiều khuyến mãi
- **POST** `/api/orders/create-with-multiple-promos/`
- **Headers:** `Authorization: Bearer {access_token}`
- **Mô tả:** API mới hỗ trợ áp dụng nhiều khuyến mãi cùng lúc
- **Request Body:**
```json
{
  "receiver_name": "John Doe",
  "ship_address": "123 Main St, Hà Nội",
  "phone_number": "0123456789",
  "payment_method": "COD",
  "note": "Giao hàng nhanh",
  "promo_ids": [1, 2, 3]
}
```
- **Response:** Tương tự tạo đơn hàng thông thường

### 11.2 Validate nhiều khuyến mãi
- **POST** `/api/promotions/validate-multiple/`
- **Headers:** `Authorization: Bearer {access_token}`
- **Request Body:**
```json
{
  "promo_ids": [1, 2],
  "total_amount": "200000.00",
  "store_id": 1
}
```
- **Response:**
```json
{
  "valid": true,
  "total_discount": "35000.00",
  "final_amount": "165000.00",
  "applied_promos": [
    {
      "id": 1,
      "name": "Giảm 10%",
      "applied_amount": "20000.00"
    },
    {
      "id": 2,
      "name": "Giảm 15k",
      "applied_amount": "15000.00"
    }
  ]
}
```

---

## 12. API Quản lý Order-Promotion (OrderPromo)

### 12.1 Lấy danh sách khuyến mãi đã áp dụng cho đơn hàng
- **GET** `/api/orders/{order_id}/promotions/`
- **Headers:** `Authorization: Bearer {access_token}`
- **Response:**
```json
[
  {
    "id": 1,
    "promo": {
      "id": 1,
      "name": "Giảm 10% cho đơn hàng từ 100k",
      "discount_value": 10.0,
      "category": "PERCENT"
    },
    "applied_amount": "15000.00",
    "note": "",
    "created_at": "2025-01-01T10:00:00Z"
  }
]
```

### 12.2 Thêm khuyến mãi vào đơn hàng
- **POST** `/api/orders/{order_id}/promotions/`
- **Headers:** `Authorization: Bearer {admin_token}`
- **Request Body:**
```json
{
  "promo_id": 1,
  "applied_amount": "15000.00",
  "note": "Áp dụng thủ công bởi admin"
}
```
- **Response:**
```json
{
  "id": 1,
  "message": "Promotion applied successfully",
  "applied_amount": "15000.00",
  "order_total_updated": "141000.00"
}
```

### 12.3 Xóa khuyến mãi khỏi đơn hàng
- **DELETE** `/api/orders/{order_id}/promotions/{promo_id}/`
- **Headers:** `Authorization: Bearer {admin_token}`
- **Response:**
```json
{
  "message": "Promotion removed successfully",
  "refunded_amount": "15000.00",
  "order_total_updated": "156000.00"
}
```

---

## 13. API Thống kê và Báo cáo

### 13.1 Thống kê tổng quan hệ thống (Admin)
- **GET** `/api/admin/dashboard/stats/`
- **Headers:** `Authorization: Bearer {admin_token}`
- **Response:**
```json
{
  "total_users": 150,
  "total_orders": 1250,
  "total_revenue": "125000000.00",
  "total_stores": 12,
  "active_shippers": 8,
  "orders_today": 45,
  "revenue_today": "2500000.00",
  "top_selling_foods": [
    {
      "id": 1,
      "title": "Big Mac",
      "total_sold": 250,
      "revenue": "22250000.00"
    }
  ]
}
```

### 13.2 Thống kê cửa hàng (Store Manager)  
- **GET** `/api/stores/{store_id}/stats/` (đã có ở mục 8.2)

### 13.3 Thống kê shipper
- **GET** `/api/shipper/stats/`
- **Headers:** `Authorization: Bearer {shipper_token}`
- **Response:**
```json
{
  "total_delivered": 85,
  "total_earnings": "850000.00",
  "delivery_rate": 95.5,
  "average_delivery_time": "25 minutes",
  "orders_this_month": 35,
  "earnings_this_month": "350000.00"
}
```

---

## Mã lỗi HTTP thường gặp

- **200 OK** - Thành công
- **201 Created** - Tạo mới thành công  
- **400 Bad Request** - Dữ liệu đầu vào không hợp lệ
- **401 Unauthorized** - Chưa đăng nhập hoặc token không hợp lệ
- **403 Forbidden** - Không có quyền truy cập
- **404 Not Found** - Không tìm thấy tài nguyên
- **500 Internal Server Error** - Lỗi server

## Response lỗi mẫu

```json
{
  "error": "Validation failed",
  "details": {
    "email": ["This field is required."],
    "password": ["This field may not be blank."]
  }
}
```

```json
{
  "detail": "Authentication credentials were not provided."
}
```

```json
{
  "detail": "Not found."
}
```

---

## Ghi chú

1. Tất cả endpoints yêu cầu authentication đều cần header `Authorization: Bearer {access_token}`
2. Thời gian trả về theo múi giờ UTC, frontend cần convert sang múi giờ địa phương
3. Giá tiền được trả về dưới dạng string để tránh mất độ chính xác
4. Hình ảnh được trả về dưới dạng URL đầy đủ để dễ dàng hiển thị
5. Pagination được áp dụng cho các danh sách lớn với format chuẩn Django REST Framework
6. Tất cả endpoint đều hỗ trợ CORS cho frontend development
