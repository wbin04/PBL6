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

### 1.9 Admin - Bật/tắt trạng thái khách hàng
- **POST** `/api/auth/admin/customers/{customer_id}/toggle-status/`
- **Headers:** `Authorization: Bearer {admin_token}`
- **Mô tả:** Bật/tắt trạng thái hoạt động của khách hàng
- **Response:**
```json
{
  "message": "Customer activated successfully",
  "customer": {
    "id": 1,
    "username": "john_doe",
    "email": "user@example.com",
    "fullname": "John Doe",
    "is_active": true
  }
}
```

### 1.10 Cập nhật đăng ký làm Shipper
- **POST** `/api/auth/registration/shipper/`
- **Headers:** `Authorization: Bearer {access_token}`
- **Mô tả:** Người dùng đăng ký làm shipper
- **Request Body:**
```json
{
  "is_registered": true
}
```
- **Response:**
```json
{
  "message": "Shipper registration status updated successfully",
  "is_shipper_registered": true
}
```

### 1.11 Cập nhật đăng ký làm Store Manager
- **POST** `/api/auth/registration/store/`
- **Headers:** `Authorization: Bearer {access_token}`
- **Mô tả:** Người dùng đăng ký làm quản lý cửa hàng
- **Request Body:**
```json
{
  "is_registered": true
}
```
- **Response:**
```json
{
  "message": "Store registration status updated successfully",
  "is_store_registered": true
}
```

### 1.12 Kiểm tra trạng thái đăng ký
- **GET** `/api/auth/registration/status/`
- **Headers:** `Authorization: Bearer {access_token}`
- **Mô tả:** Xem trạng thái đăng ký làm shipper/store manager
- **Response:**
```json
{
  "is_shipper_registered": false,
  "is_store_registered": true
}
```

### 1.13 Admin - Danh sách đăng ký Shipper
- **GET** `/api/auth/shipper/applications/`
- **Headers:** `Authorization: Bearer {admin_token}`
- **Query Parameters:**
  - `search`: Tìm kiếm theo tên, email hoặc số điện thoại
  - `page`: Trang hiện tại (mặc định: 1)
- **Response:**
```json
{
  "applications": [
    {
      "id": 10,
      "username": "shipper_candidate",
      "email": "shipper@example.com",
      "fullname": "Nguyễn Văn A",
      "phone_number": "0123456789",
      "address": "123 Main St",
      "is_shipper_registered": true,
      "created_date": "2025-01-01T10:00:00Z"
    }
  ],
  "total_pages": 2,
  "current_page": 1,
  "total_applications": 15
}
```

### 1.14 Admin - Duyệt đăng ký Shipper
- **POST** `/api/auth/shipper/applications/{user_id}/approve/`
- **Headers:** `Authorization: Bearer {admin_token}`
- **Mô tả:** Duyệt đăng ký làm shipper và tự động tạo Shipper record
- **Response:**
```json
{
  "message": "Shipper application approved successfully",
  "user": {
    "id": 10,
    "username": "shipper_candidate",
    "email": "shipper@example.com",
    "fullname": "Nguyễn Văn A",
    "role": "Người vận chuyển",
    "role_id": 4
  },
  "shipper_id": 1
}
```

### 1.15 Admin - Từ chối đăng ký Shipper
- **POST** `/api/auth/shipper/applications/{user_id}/reject/`
- **Headers:** `Authorization: Bearer {admin_token}`
- **Response:**
```json
{
  "message": "Shipper application rejected",
  "user": {
    "id": 10,
    "username": "shipper_candidate",
    "is_shipper_registered": false
  }
}
```

### 1.16 Admin - Danh sách đăng ký Store Manager
- **GET** `/api/auth/store/applications/`
- **Headers:** `Authorization: Bearer {admin_token}`
- **Query Parameters:** Tương tự danh sách đăng ký Shipper
- **Response:** Tương tự danh sách đăng ký Shipper

### 1.17 Admin - Duyệt đăng ký Store Manager
- **POST** `/api/auth/store/applications/{user_id}/approve/`
- **Headers:** `Authorization: Bearer {admin_token}`
- **Mô tả:** Duyệt đăng ký làm store manager và tự động tạo Store record
- **Response:**
```json
{
  "message": "Store application approved successfully",
  "user": {
    "id": 11,
    "username": "store_candidate",
    "email": "store@example.com",
    "fullname": "Trần Thị B",
    "role": "Cửa hàng",
    "role_id": 3
  },
  "store_id": 5,
  "store_name": "Cửa hàng Trần Thị B"
}
```

### 1.18 Admin - Từ chối đăng ký Store Manager
- **POST** `/api/auth/store/applications/{user_id}/reject/`
- **Headers:** `Authorization: Bearer {admin_token}`
- **Response:**
```json
{
  "message": "Store application rejected",
  "user": {
    "id": 11,
    "username": "store_candidate",
    "is_store_registered": false
  }
}
```

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

### 2.5 Món ăn theo danh mục
- **GET** `/api/menu/categories/{category_id}/foods/`
- **Query Parameters:**
  - `page`: Trang hiện tại (mặc định: 1)
  - `page_size`: Số items/trang (mặc định: 12)
- **Response:**
```json
{
  "category": {
    "id": 1,
    "name": "Burger",
    "cate_name": "Burger",
    "image": "burger.png",
    "image_url": "http://localhost:8000/media/assets/burger.png",
    "foods_count": 15
  },
  "count": 15,
  "num_pages": 2,
  "current_page": 1,
  "has_next": true,
  "has_previous": false,
  "results": [
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
  ]
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

### 2.8 Admin - Quản lý Food Size
#### 2.8.1 Danh sách sizes của món ăn
- **GET** `/api/menu/admin/foods/{food_id}/sizes/`
- **Headers:** `Authorization: Bearer {admin_or_store_manager_token}`
- **Mô tả:** Lấy danh sách tất cả sizes của một món ăn
- **Response:**
```json
[
  {
    "id": 1,
    "size_name": "Size L",
    "price": "10000.00",
    "food": 1
  },
  {
    "id": 2,
    "size_name": "Size M",
    "price": "5000.00",
    "food": 1
  }
]
```

#### 2.8.2 Thêm size mới cho món ăn
- **POST** `/api/menu/admin/foods/{food_id}/sizes/`
- **Headers:** `Authorization: Bearer {admin_or_store_manager_token}`
- **Request Body:**
```json
{
  "size_name": "Size XL",
  "price": "15000.00"
}
```
- **Response:**
```json
{
  "id": 3,
  "size_name": "Size XL",
  "price": "15000.00",
  "food": 1
}
```
- **Error Response (400):**
```json
{
  "error": "Size with this name already exists for this food"
}
```

#### 2.8.3 Chi tiết một size
- **GET** `/api/menu/admin/foods/{food_id}/sizes/{size_id}/`
- **Headers:** `Authorization: Bearer {admin_or_store_manager_token}`
- **Response:**
```json
{
  "id": 1,
  "size_name": "Size L",
  "price": "10000.00",
  "food": 1
}
```

#### 2.8.4 Cập nhật size
- **PUT** `/api/menu/admin/foods/{food_id}/sizes/{size_id}/`
- **Headers:** `Authorization: Bearer {admin_or_store_manager_token}`
- **Request Body:**
```json
{
  "size_name": "Size Large",
  "price": "12000.00"
}
```
- **Response:**
```json
{
  "id": 1,
  "size_name": "Size Large",
  "price": "12000.00",
  "food": 1
}
```
- **Error Response (400):**
```json
{
  "error": "Size with this name already exists for this food"
}
```

#### 2.8.5 Xóa size
- **DELETE** `/api/menu/admin/foods/{food_id}/sizes/{size_id}/`
- **Headers:** `Authorization: Bearer {admin_or_store_manager_token}`
- **Response:**
```json
{
  "message": "Food size deleted successfully"
}
```

### 2.9 Store Manager - Quản lý món ăn
**Lưu ý:** Store Manager sử dụng endpoint `/api/menu/store/foods/` thay vì `/api/menu/admin/foods/`

#### 2.9.1 Danh sách món ăn của cửa hàng
- **GET** `/api/menu/store/foods/`
- **Headers:** `Authorization: Bearer {store_manager_token}`
- **Query Parameters:**
  - `search`: Tìm kiếm theo tên hoặc mô tả
  - `category`: Lọc theo danh mục
  - `page`: Trang hiện tại (mặc định: 1)
  - `page_size`: Số lượng items/trang (mặc định: 12)
- **Response:**
```json
{
  "count": 25,
  "num_pages": 3,
  "current_page": 1,
  "has_next": true,
  "has_previous": false,
  "next": "?page=2&page_size=12",
  "previous": null,
  "results": [
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
      "sizes": [
        {
          "id": 1,
          "size_name": "Size L",
          "price": "10000.00"
        }
      ],
      "average_rating": 4.5,
      "rating_count": 120
    }
  ],
  "store": {
    "id": 1,
    "name": "McDonald's Nguyễn Huệ"
  }
}
```

#### 2.9.2 Chi tiết món ăn (Store Manager)
- **GET** `/api/menu/store/foods/{food_id}/`
- **Headers:** `Authorization: Bearer {store_manager_token}`
- **Response:** Tương tự chi tiết món ăn công khai

#### 2.9.3 Cập nhật món ăn (Store Manager)
- **PUT** `/api/menu/store/foods/{food_id}/`
- **Headers:** `Authorization: Bearer {store_manager_token}`
- **Content-Type:** `multipart/form-data`
- **Request Body (FormData):**
```
title: "Big Mac Updated"
description: "Mô tả cập nhật"
price: "95000.00"
category_id: 1
availability: "Còn hàng"
image_file: [File] (optional - chỉ gửi khi thay đổi ảnh)
```
- **Response:**
```json
{
  "id": 1,
  "title": "Big Mac Updated",
  "description": "Mô tả cập nhật",
  "price": "95000.00",
  "image": "assets/new_image_123.jpg",
  "image_url": "http://localhost:8000/media/assets/new_image_123.jpg",
  "category": {
    "id": 1,
    "cate_name": "Burger"
  },
  "store": {
    "id": 1,
    "store_name": "McDonald's Nguyễn Huệ"
  },
  "availability": "Còn hàng",
  "sizes": []
}
```

#### 2.9.4 Xóa món ăn (Store Manager)
- **DELETE** `/api/menu/store/foods/{food_id}/`
- **Headers:** `Authorization: Bearer {store_manager_token}`
- **Response:**
```json
{
  "message": "Food deleted successfully"
}
```

#### 2.9.5 Quản lý sizes của món ăn (Store Manager)
**Danh sách sizes:**
- **GET** `/api/menu/store/foods/{food_id}/sizes/`
- **Headers:** `Authorization: Bearer {store_manager_token}`
- **Response:** Tương tự 2.8.1

**Thêm size mới:**
- **POST** `/api/menu/store/foods/{food_id}/sizes/`
- **Headers:** `Authorization: Bearer {store_manager_token}`
- **Request Body:**
```json
{
  "size_name": "Size XL",
  "price": "15000.00"
}
```
- **Response:** Tương tự 2.8.2

**Chi tiết size:**
- **GET** `/api/menu/store/foods/{food_id}/sizes/{size_id}/`
- **Headers:** `Authorization: Bearer {store_manager_token}`
- **Response:** Tương tự 2.8.3

**Cập nhật size:**
- **PUT** `/api/menu/store/foods/{food_id}/sizes/{size_id}/`
- **Headers:** `Authorization: Bearer {store_manager_token}`
- **Request Body:** Tương tự 2.8.4
- **Response:** Tương tự 2.8.4

**Xóa size:**
- **DELETE** `/api/menu/store/foods/{food_id}/sizes/{size_id}/`
- **Headers:** `Authorization: Bearer {store_manager_token}`
- **Response:** Tương tự 2.8.5

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

### 4.6 Tạo đơn hàng với nhiều khuyến mãi (Phiên bản mới)
- **POST** `/api/orders/create-with-multiple-promos/`
- **Headers:** `Authorization: Bearer {access_token}`
- **Mô tả:** API mới hỗ trợ tạo đơn hàng với nhiều khuyến mãi được áp dụng tự động
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
        "fullname": "John Doe"
      },
      "store": {
        "id": 1,
        "store_name": "McDonald's Nguyễn Huệ"
      },
      "receiver_name": "John Doe",
      "phone_number": "0123456789",
      "ship_address": "123 Main St, Hà Nội",
      "order_status": "Chờ xác nhận",
      "payment_method": "COD",
      "total_before_discount": "171000.00",
      "total_discount": "30000.00",
      "total_after_discount": "141000.00",
      "shipping_fee": "15000.00",
      "note": "Giao hàng nhanh",
      "group_id": 1,
      "applied_promotions": [
        {
          "promo_id": 1,
          "promo_name": "Giảm 10% cho đơn hàng từ 100k",
          "applied_amount": "15000.00"
        },
        {
          "promo_id": 2,
          "promo_name": "Giảm 15k cho đơn hàng từ 150k",
          "applied_amount": "15000.00"
        }
      ],
      "order_details": [
        {
          "food": {
            "id": 1,
            "title": "Big Mac",
            "price": "89000.00"
          },
          "quantity": 2,
          "price": "89000.00",
          "subtotal": "178000.00"
        }
      ],
      "created_date": "2025-01-01T17:00:00Z",
      "created_date_display": "2025-01-01 17:00:00"
    }
  ]
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

### 7.4 Cập nhật đánh giá
- **PUT** `/api/ratings/{id}/`
- **Headers:** `Authorization: Bearer {access_token}`
- **Mô tả:** Người dùng chỉ có thể cập nhật đánh giá của chính mình
- **Request Body:**
```json
{
  "rating": 4,
  "comment": "Cập nhật đánh giá: Ngon nhưng hơi mặn"
}
```
- **Response:**
```json
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
  "rating": 4,
  "comment": "Cập nhật đánh giá: Ngon nhưng hơi mặn",
  "created_date": "2025-01-01T12:00:00Z"
}
```

### 7.5 Xóa đánh giá
- **DELETE** `/api/ratings/{id}/`
- **Headers:** `Authorization: Bearer {access_token}`
- **Mô tả:** Người dùng chỉ có thể xóa đánh giá của chính mình
- **Response:**
```json
{
  "message": "Rating deleted successfully"
}
```

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
  "delivery_status": "Đã giao"
}
```
- **Các trạng thái hợp lệ:**
  - `Chờ xác nhận` → `Đã xác nhận` (khi shipper nhận đơn)
  - `Đã xác nhận` → `Đã lấy hàng` (khi lấy hàng)
  - `Đã lấy hàng` → `Đang giao` (khi bắt đầu giao)
  - `Đang giao` → `Đã giao` (khi giao thành công)
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

## 10. Admin & Store Manager API

### 10.1 Admin - Quản lý đơn hàng

#### 10.1.1 Danh sách đơn hàng
- **GET** `/api/orders/admin/`
- **Headers:** `Authorization: Bearer {admin_token}`
- **Mô tả:** Lấy danh sách tất cả đơn hàng (Admin) hoặc đơn hàng của cửa hàng (Store Manager)
- **Query Parameters:**
  - `status`: Lọc theo trạng thái đơn hàng
  - `search`: Tìm kiếm theo tên khách hàng, email, số điện thoại, ID đơn hàng, tên người nhận
  - `page`: Trang hiện tại (mặc định: 1)
  - `per_page`: Số items mỗi trang (mặc định: 10, tối đa: 100)
- **Response:**
```json
{
  "orders": [
    {
      "id": 1,
      "user": {
        "id": 1,
        "fullname": "John Doe",
        "email": "user@example.com",
        "phone_number": "0123456789"
      },
      "order_status": "Đã xác nhận",
      "delivery_status": "Đang giao",
      "total_money": "156000.00",
      "receiver_name": "John Doe",
      "phone_number": "0123456789",
      "ship_address": "123 Main St, Hà Nội",
      "payment_method": "COD",
      "note": "Giao hàng nhanh",
      "shipping_fee": "15000.00",
      "group_id": 1,
      "store_name": "KFC Trần Phú",
      "shipper": {
        "id": 1,
        "user": {
          "fullname": "Nguyễn Văn A",
          "phone_number": "0987654321"
        }
      },
      "created_date": "2025-01-01T10:00:00Z",
      "created_date_display": "2025-01-01 17:00:00",
      "cancel_reason": null,
      "cancelled_date": null,
      "cancelled_by_role": null,
      "items": [
        {
          "id": "1_1_1",
          "food_id": 1,
          "food_title": "Big Mac",
          "food_image_url": "http://localhost:8000/media/assets/bigmac.jpg",
          "food_price": "89000.00",
          "food_option_id": 1,
          "food_option_name": "Size L",
          "food_option_price": "10000.00",
          "quantity": 2,
          "food_note": "Không hành"
        }
      ],
      "items_count": 2
    }
  ],
  "total_pages": 5,
  "current_page": 1,
  "total_orders": 45
}
```

#### 10.1.2 Chi tiết đơn hàng
- **GET** `/api/orders/admin/{order_id}/`
- **Headers:** `Authorization: Bearer {admin_token}`
- **Mô tả:** Lấy chi tiết một đơn hàng cụ thể
- **Response:**
```json
{
  "id": 1,
  "user": {
    "id": 1,
    "fullname": "John Doe",
    "email": "user@example.com",
    "phone_number": "0123456789"
  },
  "order_status": "Đã xác nhận",
  "delivery_status": "Đang giao",
  "total_money": "156000.00",
  "receiver_name": "John Doe",
  "phone_number": "0123456789",
  "ship_address": "123 Main St, Hà Nội",
  "payment_method": "COD",
  "note": "Giao hàng nhanh",
  "shipping_fee": "15000.00",
  "group_id": 1,
  "store_name": "KFC Trần Phú",
  "store_info_id": 1,
  "shipper": {
    "id": 1,
    "user": {
      "fullname": "Nguyễn Văn A",
      "phone_number": "0987654321"
    }
  },
  "promo": {
    "id": 1,
    "name": "Giảm giá 10%",
    "promo_code": "DISCOUNT10"
  },
  "created_date": "2025-01-01T10:00:00Z",
  "created_date_display": "2025-01-01 17:00:00",
  "cancel_reason": null,
  "cancelled_date": null,
  "cancelled_by_role": null,
  "items": [
    {
      "id": "1_1_1",
      "food_id": 1,
      "food_title": "Big Mac",
      "food_image_url": "http://localhost:8000/media/assets/bigmac.jpg",
      "food_price": "89000.00",
      "food_option_id": 1,
      "food_option_name": "Size L",
      "food_option_price": "10000.00",
      "quantity": 2,
      "food_note": "Không hành"
    }
  ],
  "items_count": 2
}
```

#### 10.1.3 Cập nhật đơn hàng
- **PUT** `/api/orders/admin/{order_id}/`
- **Headers:** `Authorization: Bearer {admin_token}`
- **Mô tả:** Admin cập nhật trạng thái đơn hàng
- **Request Body:**
```json
{
  "order_status": "Đã xác nhận"
}
```
- **Các trạng thái hợp lệ:**
  - `Chờ xác nhận`
  - `Đã xác nhận`
  - `Đang chuẩn bị`
  - `Đang giao`
  - `Đã giao`
  - `Đã hủy`
- **Response:**
```json
{
  "id": 1,
  "order_status": "Đã xác nhận",
  "delivery_status": "Chờ xác nhận",
  "total_money": "156000.00"
}
```

#### 10.1.4 Phân công shipper
- **PUT** `/api/orders/admin/{order_id}/assign-shipper/`
- **Headers:** `Authorization: Bearer {admin_token}`
- **Mô tả:** Admin phân công shipper cho đơn hàng
- **Request Body:**
```json
{
  "shipper_id": 1
}
```
- **Lưu ý:** Gửi `shipper_id: null` để hủy phân công shipper
- **Response:**
```json
{
  "message": "Shipper assignment updated successfully",
  "order": {
    "id": 1,
    "shipper": {
      "id": 1,
      "user": {
        "id": 10,
        "fullname": "Nguyễn Văn A",
        "phone_number": "0987654321"
      }
    },
    "order_status": "Đang giao",
    "delivery_status": "Đã xác nhận"
  }
}
```

#### 10.1.5 Cập nhật trạng thái đơn hàng (Admin/Store Manager)
- **PATCH** `/api/orders/admin/{order_id}/status/`
- **Headers:** `Authorization: Bearer {admin_or_store_manager_token}`
- **Mô tả:** Admin hoặc Store Manager cập nhật trạng thái đơn hàng
- **Request Body:**
```json
{
  "order_status": "Đã huỷ",
  "cancel_reason": "Hết hàng"
}
```
- **Response:**
```json
{
  "id": 1,
  "order_status": "Đã huỷ",
  "delivery_status": "Đã huỷ",
  "cancel_reason": "Hết hàng",
  "cancelled_date": "2025-01-01T11:00:00Z",
  "cancelled_by_role": "Quản lý"
}
```

### 10.2 Store Manager - Quản lý đơn hàng cửa hàng

#### 10.2.1 Danh sách đơn hàng của cửa hàng
- **GET** `/api/stores/{store_id}/orders/`
- **Headers:** `Authorization: Bearer {store_manager_token}`
- **Mô tả:** Lấy tất cả đơn hàng có món ăn từ cửa hàng của Store Manager
- **Response:**
```json
[
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
    "phone_number": "0123456789",
    "ship_address": "123 Main St, Hà Nội",
    "created_date": "2025-01-01T10:00:00Z",
    "items": [
      {
        "id": "1_1_1",
        "food_id": 1,
        "food_title": "Big Mac",
        "food_price": "89000.00",
        "quantity": 2
      }
    ]
  }
]
```

#### 10.2.2 Cập nhật trạng thái đơn hàng (Store Manager)
- **PATCH** `/api/stores/{store_id}/orders/{order_id}/status/`
- **Headers:** `Authorization: Bearer {store_manager_token}`
- **Mô tả:** Store Manager cập nhật trạng thái đơn hàng cho các món của cửa hàng mình
- **Request Body:**
```json
{
  "order_status": "Đang chuẩn bị",
  "cancel_reason": "Hết hàng (nếu hủy)"
}
```
- **Các trạng thái hợp lệ cho Store Manager:**
  - `Chờ xác nhận` → `Đã xác nhận` (xác nhận đơn)
  - `Đã xác nhận` → `Đang chuẩn bị` (bắt đầu chuẩn bị)
  - `Đang chuẩn bị` → `Sẵn sàng` (sẵn sàng giao)
  - `Chờ xác nhận` → `Đã huỷ` (từ chối đơn)
- **Response:**
```json
{
  "id": 1,
  "order_status": "Đang chuẩn bị",
  "delivery_status": "Chờ xác nhận",
  "total_money": "156000.00",
  "receiver_name": "John Doe",
  "store_name": "KFC Trần Phú"
}
```

### 10.3 Admin - Quản lý món ăn
- **GET** `/api/menu/admin/foods/` - Danh sách tất cả món ăn (xem mục 2.6)
- **GET** `/api/menu/admin/foods/{food_id}/` - Chi tiết món ăn (xem mục 2.7)
- **POST** `/api/menu/admin/foods/` - Tạo món ăn mới (xem mục 2.6)
- **PUT** `/api/menu/admin/foods/{food_id}/` - Cập nhật món ăn (xem mục 2.7)
- **DELETE** `/api/menu/admin/foods/{food_id}/` - Xóa món ăn (xem mục 2.7)

### 10.4 Store Manager - Thêm món ăn mới
- **POST** `/api/menu/admin/foods/`
- **Headers:** `Authorization: Bearer {store_manager_token}`
- **Content-Type:** `multipart/form-data`
- **Mô tả:** Store Manager thêm món ăn mới cho cửa hàng của mình (store_id tự động được gán)
- **Request Body (FormData):**
```
title: "Burger Gà Giòn"
description: "Burger gà giòn rụm với xà lách tươi"
price: "59000.00"
category_id: 1
availability: "Còn hàng"
image_file: [File - JPG/PNG]
```
- **Response:**
```json
{
  "id": 15,
  "title": "Burger Gà Giòn",
  "description": "Burger gà giòn rụm với xà lách tươi",
  "price": "59000.00",
  "category": {
    "id": 1,
    "cate_name": "Burger"
  },
  "category_id": 1,
  "store": {
    "id": 1,
    "store_name": "KFC Trần Phú"
  },
  "store_id": 1,
  "image": "assets/abc123def456.jpg",
  "image_url": "http://localhost:8000/media/assets/abc123def456.jpg",
  "availability": "Còn hàng",
  "average_rating": 0.0,
  "rating_count": 0,
  "sizes": []
}
```
- **Lưu ý:** 
  - File ảnh sẽ được lưu với tên unique để tránh xung đột
  - Store Manager không cần truyền `store_id`, hệ thống tự động gán cửa hàng của họ
  - Admin có thể truyền `store_id` để tạo món cho bất kỳ cửa hàng nào

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

## 14. API Quản lý Order-Promotion (OrderPromo)

### 14.1 Lấy danh sách khuyến mãi đã áp dụng cho đơn hàng
- **GET** `/api/orders/{order_id}/promotions/`
- **Headers:** `Authorization: Bearer {access_token}`
- **Mô tả:** Xem tất cả khuyến mãi đã được áp dụng cho một đơn hàng cụ thể
- **Response:**
```json
[
  {
    "id": 1,
    "order_id": 1,
    "promo": {
      "id": 1,
      "name": "Giảm 10% cho đơn hàng từ 100k",
      "category": "PERCENT",
      "discount_value": 10.0,
      "minimum_pay": "100000.00",
      "max_discount_amount": "50000.00"
    },
    "applied_amount": "15000.00",
    "note": "Tự động áp dụng",
    "created_at": "2025-01-01T10:00:00Z"
  }
]
```

### 14.2 Thêm khuyến mãi vào đơn hàng (Admin)
- **POST** `/api/orders/{order_id}/promotions/`
- **Headers:** `Authorization: Bearer {admin_token}`
- **Mô tả:** Admin có thể thủ công thêm khuyến mãi vào đơn hàng
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

### 14.3 Xóa khuyến mãi khỏi đơn hàng (Admin)
- **DELETE** `/api/orders/{order_id}/promotions/{promo_id}/`
- **Headers:** `Authorization: Bearer {admin_token}`
- **Mô tả:** Admin có thể gỡ bỏ khuyến mãi khỏi đơn hàng
- **Response:**
```json
{
  "message": "Promotion removed successfully",
  "refunded_amount": "15000.00",
  "order_total_updated": "156000.00"
}
```

### 14.4 Cập nhật thông tin khuyến mãi trong đơn hàng (Admin)
- **PUT** `/api/orders/{order_id}/promotions/{promo_id}/`
- **Headers:** `Authorization: Bearer {admin_token}`
- **Request Body:**
```json
{
  "applied_amount": "20000.00",
  "note": "Cập nhật số tiền giảm giá"
}
```
- **Response:**
```json
{
  "id": 1,
  "message": "Order promotion updated successfully",
  "applied_amount": "20000.00",
  "order_total_updated": "136000.00"
}
```

---

## 15. API Thống kê và Báo cáo (Mở rộng)

### 15.1 Thống kê tổng quan hệ thống (Admin) - Phiên bản mở rộng
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
  "pending_shipper_applications": 5,
  "pending_store_applications": 3,
  "orders_today": 45,
  "revenue_today": "2500000.00",
  "orders_this_month": 320,
  "revenue_this_month": "32000000.00",
  "top_selling_foods": [
    {
      "food_id": 1,
      "food_name": "Big Mac",
      "total_quantity": 150,
      "total_revenue": "13350000.00"
    }
  ],
  "store_performance": [
    {
      "store_id": 1,
      "store_name": "McDonald's Nguyễn Huệ",
      "total_orders": 85,
      "total_revenue": "8500000.00",
      "average_rating": 4.2
    }
  ],
  "shipper_performance": [
    {
      "shipper_id": 1,
      "shipper_name": "Nguyễn Văn A",
      "total_deliveries": 85,
      "completion_rate": 95.5,
      "average_rating": 4.6
    }
  ]
}
```

### 15.2 Báo cáo doanh thu theo thời gian (Admin)
- **GET** `/api/admin/reports/revenue/`
- **Headers:** `Authorization: Bearer {admin_token}`
- **Query Parameters:**
  - `start_date`: Ngày bắt đầu (YYYY-MM-DD)
  - `end_date`: Ngày kết thúc (YYYY-MM-DD)
  - `period`: `daily`, `weekly`, `monthly`
  - `store_id`: Lọc theo cửa hàng (optional)
- **Response:**
```json
{
  "period": "daily",
  "start_date": "2025-01-01",
  "end_date": "2025-01-31",
  "total_revenue": "15000000.00",
  "total_orders": 450,
  "data": [
    {
      "date": "2025-01-01",
      "revenue": "500000.00",
      "orders": 15
    },
    {
      "date": "2025-01-02", 
      "revenue": "750000.00",
      "orders": 22
    }
  ]
}
```

### 15.3 Báo cáo món ăn bán chạy (Admin/Store Manager)
- **GET** `/api/admin/reports/popular-foods/`
- **GET** `/api/stores/{store_id}/reports/popular-foods/`
- **Headers:** `Authorization: Bearer {admin_or_store_manager_token}`
- **Query Parameters:**
  - `start_date`, `end_date`: Khoảng thời gian
  - `limit`: Số lượng kết quả (mặc định: 10)
- **Response:**
```json
{
  "period": "2025-01-01 to 2025-01-31",
  "foods": [
    {
      "food_id": 1,
      "food_name": "Big Mac",
      "category": "Burger",
      "store_name": "McDonald's Nguyễn Huệ",
      "total_quantity": 150,
      "total_revenue": "13350000.00",
      "order_count": 85
    }
  ]
}
```

### 15.4 Thống kê shipper (Mở rộng)
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
  "earnings_this_month": "350000.00",
  "orders_today": 8,
  "earnings_today": "80000.00",
  "rating_summary": {
    "average_rating": 4.6,
    "total_ratings": 78
  },
  "delivery_zones": [
    {
      "zone": "Quận 1",
      "delivery_count": 45,
      "success_rate": 98.5
    }
  ]
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

## Cập nhật mới (2025-01-01)

### Authentication API
- **Mới:** Hệ thống đăng ký làm Shipper/Store Manager với workflow duyệt/từ chối
- **Mới:** Admin có thể quản lý danh sách đăng ký và bật/tắt trạng thái khách hàng
- **Mới:** API kiểm tra trạng thái đăng ký cho người dùng

### Orders API  
- **Mới:** API tạo đơn hàng với nhiều khuyến mãi `/api/orders/create-with-multiple-promos/`
- **Mới:** Hệ thống OrderPromo để quản lý khuyến mãi trong đơn hàng
- **Cải tiến:** Tự động tính toán và áp dụng khuyến mãi khi tạo đơn hàng

### Management API
- **Mới:** Quản lý quan hệ Order-Promotion với đầy đủ CRUD operations
- **Mới:** API thống kê mở rộng với báo cáo doanh thu theo thời gian
- **Mới:** Báo cáo món ăn bán chạy và hiệu suất cửa hàng/shipper

### Technical Improvements
- **Database:** Bảng `order_promo` với trigger tự động tính toán discount
- **Pagination:** Hỗ trợ tham số `per_page` để tuỳ chỉnh số items mỗi trang
- **Performance:** Tối ưu query với `select_related` và `prefetch_related`
- **Image Upload:** Hỗ trợ upload file với unique filename để tránh xung đột

---

## 12. API Bổ sung chi tiết

### 12.1 Shipper - Lấy đơn hàng theo shipper_id
- **GET** `/api/orders/shipper/{shipper_id}/orders/`
- **Mô tả:** Lấy tất cả đơn hàng được phân công cho một shipper cụ thể
- **Query Parameters:**
  - `delivery_status`: Lọc theo trạng thái giao hàng
  - `page`: Trang hiện tại (mặc định: 1)
  - `per_page`: Số items mỗi trang (mặc định: 20)
- **Response:**
```json
{
  "shipper": {
    "id": 1,
    "user_id": 10,
    "fullname": "Nguyễn Văn A",
    "phone": "0123456789",
    "email": "shipper@example.com",
    "address": "123 Main St"
  },
  "status_counts": {
    "Chờ xác nhận": 5,
    "Đã xác nhận": 3,
    "Đang giao": 2,
    "Đã giao": 10,
    "Đã hủy": 1,
    "Đã huỷ": 0
  },
  "total_orders": 21,
  "orders": {
    "count": 5,
    "num_pages": 1,
    "current_page": 1,
    "has_next": false,
    "has_previous": false,
    "results": [
      {
        "id": 1,
        "order_status": "Đang giao",
        "delivery_status": "Đang giao",
        "total_money": "156000.00",
        "receiver_name": "John Doe",
        "ship_address": "123 Main St, Hà Nội",
        "phone_number": "0123456789",
        "created_date": "2025-01-01T10:00:00Z"
      }
    ]
  }
}
```

### 12.2 Store Manager - Cập nhật trạng thái đơn hàng
- **PATCH** `/api/stores/{store_id}/orders/{order_id}/status/`
- **Headers:** `Authorization: Bearer {store_manager_token}`
- **Mô tả:** Store Manager có thể cập nhật trạng thái đơn hàng cho các món ăn của cửa hàng mình
- **Request Body:**
```json
{
  "order_status": "Đã xác nhận",
  "cancel_reason": "Hết hàng" 
}
```
- **Các trạng thái hợp lệ:**
  - `Chờ xác nhận` (Pending)
  - `Đã xác nhận` (Confirmed)
  - `Đang chuẩn bị` (Preparing)
  - `Sẵn sàng` (Ready for pickup)
  - `Đã huỷ` (Cancelled - chỉ khi Chờ xác nhận)
- **Response:**
```json
{
  "id": 1,
  "order_status": "Đã xác nhận",
  "delivery_status": "Chờ xác nhận",
  "total_money": "156000.00",
  "receiver_name": "John Doe",
  "store_name": "KFC Trần Phú"
}
```

### 12.3 Shipper - Danh sách đơn hàng available
- **GET** `/api/orders/?shipper__isnull=true&delivery_status=Chờ xác nhận`
- **Headers:** `Authorization: Bearer {shipper_token}`
- **Mô tả:** Lấy danh sách các đơn hàng chưa có shipper nhận (để shipper tự chọn)
- **Response:**
```json
{
  "count": 10,
  "num_pages": 1,
  "current_page": 1,
  "has_next": false,
  "has_previous": false,
  "results": [
    {
      "id": 5,
      "order_status": "Sẵn sàng",
      "delivery_status": "Chờ xác nhận",
      "total_money": "156000.00",
      "receiver_name": "John Doe",
      "ship_address": "123 Main St, Hà Nội",
      "phone_number": "0123456789",
      "store_name": "KFC Trần Phú",
      "created_date": "2025-01-01T10:00:00Z",
      "shipper": null
    }
  ]
}
```

### 12.4 Admin - Danh sách Users có role Shipper chưa có profile
- **GET** `/api/shipper/shippers/available_users/`
- **Headers:** `Authorization: Bearer {admin_token}`
- **Mô tả:** Lấy danh sách các user đã có role Shipper nhưng chưa được tạo profile Shipper
- **Response:**
```json
{
  "available_users": [
    {
      "id": 15,
      "fullname": "Trần Văn B",
      "email": "shipper2@example.com",
      "phone_number": "0987654321",
      "address": "456 Elm St"
    }
  ]
}
```

### 12.5 Admin - Thống kê Shipper
- **GET** `/api/shipper/shippers/statistics/`
- **Headers:** `Authorization: Bearer {admin_token}`
- **Response:**
```json
{
  "total_shippers": 10,
  "total_users_with_shipper_role": 15,
  "available_users": 5
}
```

### 12.6 Tạo Shipper profile từ User ID
- **POST** `/api/shipper/shippers/`
- **Headers:** `Authorization: Bearer {admin_token}`
- **Request Body:**
```json
{
  "user_id": 15
}
```
- **Response:**
```json
{
  "id": 5,
  "user": {
    "id": 15,
    "fullname": "Trần Văn B",
    "email": "shipper2@example.com",
    "phone_number": "0987654321"
  },
  "user_id": 15
}
```

### 12.7 Cập nhật thông tin Shipper
- **PUT** `/api/shipper/shippers/{shipper_id}/`
- **Headers:** `Authorization: Bearer {admin_token}`
- **Request Body:**
```json
{
  "fullname": "Trần Văn B Updated",
  "phone": "0987654322",
  "email": "shipper2_new@example.com",
  "address": "New Address 789"
}
```
- **Response:**
```json
{
  "id": 5,
  "user": {
    "id": 15,
    "fullname": "Trần Văn B Updated",
    "email": "shipper2_new@example.com",
    "phone_number": "0987654322",
    "address": "New Address 789"
  },
  "user_id": 15
}
```

### 12.8 Store Manager - Thống kê cửa hàng
- **GET** `/api/stores/{store_id}/stats/`
- **Headers:** `Authorization: Bearer {store_manager_token}`
- **Mô tả:** Lấy thống kê tổng quan về cửa hàng
- **Response:**
```json
{
  "total_foods": 25,
  "total_orders": 150,
  "total_revenue": "45000000.00",
  "average_rating": 4.5,
  "total_ratings": 89
}
```

### 12.9 Store Manager - Danh sách đơn hàng của cửa hàng
- **GET** `/api/stores/{store_id}/orders/`
- **Headers:** `Authorization: Bearer {store_manager_token}`
- **Mô tả:** Lấy danh sách tất cả đơn hàng có món ăn của cửa hàng
- **Response:**
```json
[
  {
    "id": 1,
    "order_status": "Đã xác nhận",
    "delivery_status": "Đang giao",
    "total_money": "156000.00",
    "receiver_name": "John Doe",
    "phone_number": "0123456789",
    "ship_address": "123 Main St, Hà Nội",
    "created_date": "2025-01-01T10:00:00Z",
    "items": [
      {
        "food_id": 1,
        "food_title": "Big Mac",
        "quantity": 2,
        "food_price": "89000.00"
      }
    ]
  }
]
```

### 12.10 Menu - Thêm món ăn mới (Store Manager)
- **POST** `/api/menu/admin/foods/`
- **Headers:** `Authorization: Bearer {store_manager_token}`
- **Content-Type:** `multipart/form-data`
- **Request Body (FormData):**
```
title: "Burger Gà"
description: "Burger gà giòn rụm"
price: "59000.00"
category_id: 1
availability: "Còn hàng"
image_file: [File]
```
- **Response:**
```json
{
  "id": 10,
  "title": "Burger Gà",
  "description": "Burger gà giòn rụm",
  "price": "59000.00",
  "category": {
    "id": 1,
    "cate_name": "Burger"
  },
  "store": {
    "id": 1,
    "store_name": "KFC Trần Phú"
  },
  "image": "assets/abc123def456.jpg",
  "image_url": "http://localhost:8000/media/assets/abc123def456.jpg",
  "availability": "Còn hàng",
  "sizes": []
}
```

### 12.11 Hủy nhóm đơn hàng
- **POST** `/api/orders/{order_id}/cancel-group/`
- **Headers:** `Authorization: Bearer {access_token}`
- **Mô tả:** Hủy tất cả đơn hàng trong cùng nhóm (group_id)
- **Request Body (Step 1 - Check):**
```json
{
  "check_only": true
}
```
- **Response (Step 1):**
```json
{
  "can_cancel": true,
  "group_orders": [
    {
      "id": 1,
      "store_name": "KFC Trần Phú",
      "total_money": 156000.0,
      "order_status": "Chờ xác nhận"
    },
    {
      "id": 2,
      "store_name": "McDonald's Nguyễn Huệ",
      "total_money": 120000.0,
      "order_status": "Chờ xác nhận"
    }
  ],
  "total_orders": 2
}
```
- **Request Body (Step 2 - Confirm):**
```json
{
  "confirmed": true,
  "cancel_reason": "Thay đổi địa chỉ giao hàng"
}
```
- **Response (Step 2):**
```json
{
  "message": "Đã hủy thành công 2 đơn hàng trong nhóm",
  "cancelled_orders": [1, 2]
}
```

---

## 13. Lưu ý về Workflow

### 13.1 Workflow tạo đơn hàng
1. Khách hàng thêm món ăn vào giỏ hàng
2. Chọn khuyến mãi (nếu có) và xác nhận
3. Hệ thống tự động chia đơn hàng theo cửa hàng
4. Mỗi cửa hàng sẽ có một đơn hàng riêng với `group_id` giống nhau
5. Khuyến mãi được phân bổ tỷ lệ theo giá trị từng cửa hàng

### 13.2 Workflow xử lý đơn hàng
**Trạng thái đơn hàng (order_status):**
1. `Chờ xác nhận` - Đơn hàng mới tạo
2. `Đã xác nhận` - Cửa hàng xác nhận
3. `Đang chuẩn bị` - Cửa hàng đang chuẩn bị
4. `Sẵn sàng` - Sẵn sàng để shipper lấy
5. `Đã lấy hàng` - Shipper đã lấy hàng
6. `Đang giao` - Đang giao hàng
7. `Đã giao` - Giao thành công
8. `Đã huỷ` - Đơn hàng bị hủy

**Trạng thái giao hàng (delivery_status):**
- Theo dõi chi tiết quá trình giao hàng của shipper
- Có thể khác với `order_status` trong một số trường hợp

### 13.3 Workflow Shipper nhận đơn
1. Shipper xem danh sách đơn hàng available (`shipper__isnull=true`)
2. Shipper chọn và nhận đơn: `POST /api/orders/shipper/{order_id}/accept/`
3. Hệ thống gán shipper và chuyển trạng thái sang "Đã xác nhận"
4. Shipper cập nhật trạng thái: Đã lấy hàng → Đang giao → Đã giao

### 13.4 Quyền hạn
- **Admin**: Toàn quyền quản lý tất cả
- **Store Manager**: Quản lý món ăn và đơn hàng của cửa hàng mình
- **Shipper**: Nhận và cập nhật trạng thái đơn hàng được gán
- **Customer**: Xem và tạo đơn hàng, hủy đơn khi còn "Chờ xác nhận"
- **Business Logic:** Hỗ trợ áp dụng nhiều khuyến mãi cùng lúc cho một đơn hàng
- **User Experience:** Workflow đăng ký Shipper/Store Manager có thông báo realtime

### 13.5 Tổng hợp API Store Manager (Tham khảo nhanh)

#### Quản lý Món ăn:
- `GET /api/menu/store/foods/` - Danh sách món ăn (mục 2.9.1)
- `GET /api/menu/store/foods/{food_id}/` - Chi tiết món ăn (mục 2.9.2)
- `POST /api/menu/admin/foods/` - Thêm món ăn mới (mục 10.4)
- `PUT /api/menu/store/foods/{food_id}/` - Cập nhật món ăn (mục 2.9.3)
- `DELETE /api/menu/store/foods/{food_id}/` - Xóa món ăn (mục 2.9.4)

#### Quản lý Sizes:
- `GET /api/menu/store/foods/{food_id}/sizes/` - Danh sách sizes (mục 2.9.5)
- `POST /api/menu/store/foods/{food_id}/sizes/` - Thêm size mới (mục 2.9.5)
- `GET /api/menu/store/foods/{food_id}/sizes/{size_id}/` - Chi tiết size (mục 2.9.5)
- `PUT /api/menu/store/foods/{food_id}/sizes/{size_id}/` - Cập nhật size (mục 2.9.5)
- `DELETE /api/menu/store/foods/{food_id}/sizes/{size_id}/` - Xóa size (mục 2.9.5)

#### Quản lý Đơn hàng:
- `GET /api/orders/admin/` - Danh sách đơn hàng (tự động lọc theo cửa hàng) (mục 10.1.1)
- `GET /api/stores/{store_id}/orders/` - Danh sách đơn hàng của cửa hàng (mục 10.2.1)
- `PATCH /api/stores/{store_id}/orders/{order_id}/status/` - Cập nhật trạng thái (mục 10.2.2)
- `PATCH /api/orders/admin/{order_id}/status/` - Cập nhật trạng thái (mục 10.1.5)

#### Thông tin Cửa hàng:
- `GET /api/stores/my_store/` - Thông tin cửa hàng của tôi (mục 8.3)
- `GET /api/stores/{store_id}/stats/` - Thống kê cửa hàng (mục 8.6)
- `GET /api/stores/{store_id}/foods/` - Món ăn của cửa hàng (mục 8.4)

#### Quản lý Khuyến mãi:
- `GET /api/promotions/` - Danh sách khuyến mãi (mục 6.1)
- `POST /api/promotions/create/` - Tạo khuyến mãi (mục 6.3)
- `GET /api/promotions/{promo_id}/` - Chi tiết khuyến mãi (mục 6.5)
- `PUT /api/promotions/{promo_id}/update/` - Cập nhật khuyến mãi (mục 6.6)
- `DELETE /api/promotions/{promo_id}/delete/` - Xóa khuyến mãi (mục 6.7)

**Lưu ý quan trọng:**
- Store Manager tự động chỉ thấy/quản lý dữ liệu của cửa hàng mình
- Khi tạo món ăn mới, không cần truyền `store_id`, hệ thống tự động gán
- Endpoint `/api/menu/admin/foods/` cũng được Store Manager sử dụng để thêm món ăn
- Endpoint `/api/orders/admin/` tự động lọc đơn hàng theo cửa hàng của Store Manager

---
