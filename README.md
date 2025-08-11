# FastFood API - REST API Documentation & Setup Guide

## 🚀 Tổng quan

FastFood API là một REST API được xây dựng bằng Django REST Framework, cung cấp đầy đủ chức năng cho một ứng dụng đặt món ăn nhanh. API sử dụng JWT Authentication và PostgreSQL database.

## 📋 Yêu cầu hệ thống

- **Python:** 3.8 trở lên
- **PostgreSQL:** 12 trở lên
- **Node.js:** 14 trở lên (cho frontend)

## 🛠️ Cài đặt và chạy dự án

### 1. Chuẩn bị database PostgreSQL

```bash
# Khởi động PostgreSQL service (nếu chưa chạy)
net start postgresql-x64-14

# Export database ra file SQL (nếu cần xuất dữ liệu)
pg_dump -h localhost -p 5432 -U postgres -d fastfood_db --no-owner --no-acl -C -b -f fastfood_db.sql

# Import database schema từ file SQL
cd docs
psql -U postgres -f fastfood_db.sql
```

### 2. Cài đặt Backend

```bash
# Clone và di chuyển vào thư mục backend
cd backend

# Tạo và kích hoạt virtual environment
python -m venv .venv

# Kích hoạt environment
# Windows PowerShell:
.venv\Scripts\Activate.ps1
# Windows CMD:
.venv\Scripts\activate.bat

# Cài đặt dependencies
pip install -r requirements.txt
```

### 3. Cấu hình môi trường

```bash
# Copy file cấu hình
copy .env.example .env

# Chỉnh sửa file .env với thông tin của bạn
DB_NAME=fastfood_db
DB_USER=postgres
DB_PASSWORD=your_password
DB_HOST=localhost
DB_PORT=5432
SECRET_KEY=your-django-secret-key-here
DEBUG=True
```

### 4. Khởi tạo database

```bash
# Tạo migrations cho tất cả apps
python manage.py makemigrations authentication
python manage.py makemigrations menu
python manage.py makemigrations cart
python manage.py makemigrations orders
python manage.py makemigrations payments
python manage.py makemigrations promotions
python manage.py makemigrations ratings

# Áp dụng migrations
python manage.py migrate

# Tạo superuser để truy cập admin
python manage.py createsuperuser
```

### 5. Chạy API Server

```bash
# Chạy development server
python manage.py runserver

# API sẽ chạy tại: http://localhost:8000
```

### 6. Cài đặt và chạy Frontend

```bash
# Di chuyển vào thư mục frontend
cd frontend
python -m http.server 8080

# Frontend sẽ chạy tại: http://localhost:8080
```

## 🌐 API Endpoints Documentation

### 🔐 Authentication API (`/api/auth/`)

| Method | Endpoint | Description | Authentication |
|--------|----------|-------------|----------------|
| `POST` | `/api/auth/login/` | Đăng nhập | None |
| `POST` | `/api/auth/register/` | Đăng ký tài khoản | None |
| `POST` | `/api/auth/refresh/` | Refresh JWT token | None |
| `GET` | `/api/auth/profile/` | Lấy thông tin profile | JWT Required |
| `PUT` | `/api/auth/profile/update/` | Cập nhật profile | JWT Required |
| `POST` | `/api/auth/reset-password/` | Reset mật khẩu | JWT Required |

**Admin endpoints:**
- `GET` `/api/auth/admin/customers/` - Danh sách khách hàng
- `GET` `/api/auth/admin/customers/{id}/` - Chi tiết khách hàng

### 🍔 Menu API (`/api/menu/`)

| Method | Endpoint | Description | Authentication |
|--------|----------|-------------|----------------|
| `GET` | `/api/menu/categories/` | Danh sách danh mục | None |
| `GET` | `/api/menu/items/` | Danh sách món ăn | None |
| `GET` | `/api/menu/items/{id}/` | Chi tiết món ăn | None |
| `GET` | `/api/menu/categories/{id}/foods/` | Món ăn theo danh mục | None |

**Admin endpoints:**
- `GET` `/api/menu/admin/foods/` - Quản lý món ăn
- `GET/PUT/DELETE` `/api/menu/admin/foods/{id}/` - Chi tiết món ăn

### 🛒 Cart API (`/api/cart/`)

| Method | Endpoint | Description | Authentication |
|--------|----------|-------------|----------------|
| `GET` | `/api/cart/` | Xem giỏ hàng | JWT Required |
| `POST` | `/api/cart/add/` | Thêm vào giỏ hàng | JWT Required |
| `PUT` | `/api/cart/items/{food_id}/` | Cập nhật số lượng | JWT Required |
| `DELETE` | `/api/cart/items/{food_id}/remove/` | Xóa khỏi giỏ hàng | JWT Required |
| `DELETE` | `/api/cart/clear/` | Xóa toàn bộ giỏ hàng | JWT Required |

### 📦 Orders API (`/api/orders/`)

| Method | Endpoint | Description | Authentication |
|--------|----------|-------------|----------------|
| `GET` | `/api/orders/` | Danh sách đơn hàng | JWT Required |
| `POST` | `/api/orders/` | Tạo đơn hàng mới | JWT Required |
| `GET` | `/api/orders/{id}/` | Chi tiết đơn hàng | JWT Required |
| `PUT` | `/api/orders/{id}/status/` | Cập nhật trạng thái | Staff/Admin |

**Admin endpoints:**
- `GET` `/api/orders/admin/` - Tất cả đơn hàng
- `GET` `/api/orders/admin/{id}/` - Chi tiết đơn hàng admin

### 💳 Payments API (`/api/payments/`)

| Method | Endpoint | Description | Authentication |
|--------|----------|-------------|----------------|
| `POST` | `/api/payments/create/` | Tạo thanh toán | JWT Required |
| `POST` | `/api/payments/webhook/` | Webhook xử lý thanh toán | None |

### 🎯 Promotions API (`/api/promotions/`)

| Method | Endpoint | Description | Authentication |
|--------|----------|-------------|----------------|
| `GET` | `/api/promotions/` | Danh sách khuyến mãi | None |
| `POST` | `/api/promotions/validate/` | Validate mã giảm giá | JWT Required |

### ⭐ Ratings API (`/api/ratings/`)

| Method | Endpoint | Description | Authentication |
|--------|----------|-------------|----------------|
| `GET` | `/api/ratings/` | Danh sách đánh giá | None |
| `POST` | `/api/ratings/` | Tạo đánh giá | JWT Required |
| `GET/PUT/DELETE` | `/api/ratings/{id}/` | Chi tiết đánh giá | JWT Required |

## 📊 Request/Response Examples

### Authentication

**Login Request:**
```bash
curl -X POST http://localhost:8000/api/auth/login/ \
  -H "Content-Type: application/json" \
  -d '{
    "username": "user@example.com",
    "password": "password123"
  }'
```

**Response:**
```json
{
  "access": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
  "refresh": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
  "user": {
    "id": 1,
    "email": "user@example.com",
    "full_name": "John Doe",
    "role": "customer"
  }
}
```

### Menu Items

**Get Menu Items:**
```bash
curl -X GET http://localhost:8000/api/menu/items/ \
  -H "Content-Type: application/json"
```

**Response:**
```json
{
  "count": 16,
  "next": null,
  "previous": null,
  "results": [
    {
      "id": 1,
      "name": "Classic Burger",
      "description": "Burger cổ điển với thịt bò, rau củ tươi",
      "price": "89000.00",
      "image": "/media/assets/burger.png",
      "category": {
        "id": 1,
        "name": "Burger"
      },
      "is_available": true
    }
  ]
}
```

### Add to Cart

**Request:**
```bash
curl -X POST http://localhost:8000/api/cart/add/ \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "food_id": 1,
    "quantity": 2
  }'
```

## 🔧 Cấu hình và tính năng

### JWT Configuration
- **Access Token Lifetime:** 60 phút
- **Refresh Token Lifetime:** 7 ngày
- **Token Rotation:** Enabled
- **Header Format:** `Authorization: Bearer <token>`

### CORS Configuration
- **Allowed Origins:** `localhost:3000`, `localhost:8080`
- **Allowed Headers:** Standard headers + Authorization
- **Credentials:** Allowed

### Pagination
- **Default Page Size:** 12 items
- **Pagination Class:** PageNumberPagination

## 📱 Truy cập ứng dụng

| Service | URL | Description |
|---------|-----|-------------|
| **API Root** | http://localhost:8000 | API information page |
| **API Documentation** | http://localhost:8000/api/ | All API endpoints |
| **Admin Panel** | http://localhost:8000/admin/ | Django admin interface |
| **Frontend** | http://localhost:8080 | User interface |
| **Media Files** | http://localhost:8000/media/ | Static images |

## 🗂️ Cấu trúc dự án

```
fastfood-app/                # Project root directory
├── README.md                # Project documentation
├── backend/                 # Django REST API server
│   ├── manage.py            # Django management script
│   ├── requirements.txt     # Python dependencies
│   ├── .env.example         # Environment variables template
│   ├── apps/                # Django applications
│   │   ├── authentication/  # User & auth modules
│   │   ├── menu/            # Menu, categories, items
│   │   ├── cart/            # Shopping cart
│   │   ├── orders/          # Order management
│   │   ├── payments/        # Payment processing
│   │   ├── promotions/      # Promotions & coupons
│   │   └── ratings/         # Reviews & ratings
│   ├── fastfood_api/        # Project settings & URLs
│   └── media/               # Uploaded media files
├── frontend/                # Static HTML/CSS/JS frontend
│   ├── index.html           # Entry point
│   ├── admin/               # Admin frontend
│   ├── assets/              # Images, styles, scripts
│   ├── auth/                # Auth pages (login/register)
│   ├── cart/                # Cart pages & scripts
│   ├── checkout/            # Checkout pages & scripts
│   ├── menu/                # Menu pages & scripts
│   └── orders/              # Order pages & scripts
├── docs/                    # Project documentation & guides
│   ├── init_project.md      # Project initialization guide
│   ├── fastfood_base.md     # PostgreSQL setup guide
│   └── fastfood_db.sql      # Database schema dump (SQL file)
└── mobile/                  # Mobile-specific code or assets
```

## ✅ Tính năng đã hoàn thành

- ✅ **Authentication System** - JWT-based auth với roles
- ✅ **Menu Management** - Categories, items với pagination
- ✅ **Shopping Cart** - Add, update, remove items
- ✅ **Order System** - Create, track orders
- ✅ **Admin Panel** - Django admin với custom views
- ✅ **Media Handling** - Image upload và serving
- ✅ **CORS Configuration** - Frontend integration ready
- ✅ **API Documentation** - Comprehensive endpoints
- ✅ **Error Handling** - Proper HTTP status codes
- ✅ **Data Validation** - DRF serializers

## 🔄 Tính năng đang phát triển

- ⏳ **Payment Integration** - VNPay, Momo integration
- ⏳ **Real-time Orders** - WebSocket cho order tracking
- ⏳ **Advanced Search** - Full-text search, filters
- ⏳ **Rating System** - Complete review functionality
- ⏳ **Push Notifications** - Order status updates
- ⏳ **Analytics Dashboard** - Sales và user analytics

## 🛠️ Testing API

### Sử dụng cURL
```bash
# Test API root
curl http://localhost:8000/

# Test menu without auth
curl http://localhost:8000/api/menu/items/

# Test protected endpoint
curl -H "Authorization: Bearer YOUR_TOKEN" \
     http://localhost:8000/api/cart/
```

### Sử dụng Postman
1. Import collection từ `/docs/postman_collection.json`
2. Set environment variable `base_url` = `http://localhost:8000`
3. Login để lấy token và set variable `jwt_token`

### Sử dụng Browser
- Truy cập http://localhost:8000 để xem API overview
- Truy cập http://localhost:8000/admin/ để quản lý data

## ❗ Troubleshooting

### Database Connection Issues
```bash
# Kiểm tra PostgreSQL service
net start postgresql-x64-14

# Test connection
psql -U postgres -d fastfood_db -h localhost

# Reset database nếu cần
dropdb fastfood_db && createdb fastfood_db
```

### Migration Issues
```bash
# Reset migrations
find . -path "*/migrations/*.py" -not -name "__init__.py" -delete
find . -path "*/migrations/*.pyc" -delete

# Recreate migrations
python manage.py makemigrations
python manage.py migrate
```

### CORS Issues
- Kiểm tra `CORS_ALLOWED_ORIGINS` trong settings.py
- Đảm bảo frontend chạy đúng port (8080)
- Check browser console cho CORS errors

### JWT Token Issues
- Token hết hạn: Sử dụng refresh token
- Invalid token: Check format `Bearer <token>`
- Missing token: Include Authorization header

### Port Already in Use
```bash
# Kill process on port 8000
netstat -ano | findstr :8000
taskkill /PID <PID> /F

# Use different port
python manage.py runserver 8001
```

## 📚 Tài liệu tham khảo

- [Django REST Framework](https://www.django-rest-framework.org/)
- [Django Simple JWT](https://django-rest-framework-simplejwt.readthedocs.io/)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)

---

**Happy Coding! 🚀**

Nếu bạn gặp vấn đề gì, hãy check logs trong terminal hoặc tạo issue mới.
