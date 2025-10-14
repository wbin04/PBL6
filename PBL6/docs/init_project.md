# FastFood App – Monorepo

Monorepo cho hệ thống bán hàng fastfood, bao gồm API (Django/DRF), Frontend (HTML/CSS/JS thuần) đơn giản.

## Cấu trúc thư mục

```
fastfood-app/
├─ backend/                    # Django project (API)
│  ├─ fastfood_api/           # Django project settings
│  ├─ apps/
│  │  ├─ authentication/      # User auth, JWT, roles
│  │  ├─ menu/               # Categories, Food items
│  │  ├─ cart/               # Shopping cart
│  │  ├─ orders/             # Orders, OrderDetails
│  │  ├─ payments/           # Payment processing
│  │  ├─ promotions/         # Promo codes
│  │  └─ ratings/            # Food ratings & reviews
│  ├─ requirements.txt
│  └─ manage.py
├─ frontend/                  # HTML/CSS/JS thuần
│  ├─ index.html             # Trang chủ
│  ├─ auth/
│  │  ├─ login.html          # Đăng nhập
│  │  └─ register.html       # Đăng ký
│  ├─ menu/
│  │  ├─ categories.html     # Danh mục món ăn
│  │  └─ items.html          # Danh sách món ăn
│  ├─ cart/
│  │  └─ cart.html           # Giỏ hàng
│  ├─ orders/
│  │  ├─ checkout.html       # Thanh toán
│  │  ├─ history.html        # Lịch sử đơn hàng
│  │  └─ detail.html         # Chi tiết đơn hàng
│  ├─ assets/
│  │  ├─ css/
│  │  │  └─ style.css        # CSS styling
│  │  └─ js/
│  │     ├─ api.js           # API client
│  │     ├─ auth.js          # Authentication
│  │     ├─ cart.js          # Shopping cart logic
│  │     └─ app.js           # Main app logic
│  └─ images/                # Static images
├─ docs/                     # Documentation
├─ .env.example
└─ README.md
```

## Database Schema (Updated)

### Authentication & Users
```sql
-- Roles table
roles: id, role_name

-- Users table  
users: id, fullname, username, password, email, address, phone_number, created_date, role_id
```

### Menu System
```sql
-- Categories table
category: id, cate_name, image

-- Food items table
food: id, title, description, price, image, cate_id, availability
```

### Shopping Cart
```sql
-- Cart table
cart: id, total_money, user_id

-- Cart items table
item: cart_id, food_id, quantity
```

### Orders & Payments
```sql
-- Orders table
orders: id, created_date, total_money, user_id, order_status, note, payment_method, receiver_name, ship_address, phone_number, promo_id

-- Order details table
order_detail: order_id, food_id, quantity
```

### Promotions & Reviews
```sql
-- Promotions table
promo: id, percent, start_date, end_date, minimum_pay

-- Food ratings table
rating_food: id, user_id, food_id, content
```

## Tech Stack

### Backend (Django DRF)
- **Framework:** Django 4.2+ với Django REST Framework
- **Database:** PostgreSQL 14+
- **Authentication:** JWT (djangorestframework-simplejwt)
- **CORS:** django-cors-headers

#### Backend Dependencies
```txt
Django>=4.2,<5.0
djangorestframework>=3.14
djangorestframework-simplejwt>=5.2
django-cors-headers>=4.0
psycopg2-binary>=2.9
python-decouple>=3.8
Pillow>=9.5
```

### Frontend (Vanilla HTML/CSS/JS)
- **Markup:** HTML5 semantic elements
- **Styling:** CSS3 (Flexbox, Grid, CSS Variables)
- **JavaScript:** ES6+ (fetch API, async/await)
- **Icons:** Lucide Icons (CDN)
- **No frameworks:** Vanilla JavaScript only

## Environment Variables

### Backend (.env)
```bash
# Database
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=fastfood_db
POSTGRES_USER=postgres
POSTGRES_PASSWORD=your_password

# Django
DJANGO_SECRET_KEY=your-secret-key-here
DJANGO_DEBUG=True
DJANGO_ALLOWED_HOSTS=localhost,127.0.0.1,0.0.0.0

# JWT
JWT_ACCESS_TTL_MIN=60
JWT_REFRESH_TTL_DAYS=7

# CORS
CORS_ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
```

## Setup & Installation

### 1. Database Setup
```bash
# Tạo PostgreSQL database
createdb fastfood_db

# Hoặc qua psql
psql -U postgres -c "CREATE DATABASE fastfood_db;"
```

### 2. Backend Setup
```bash
cd backend

# Tạo virtual environment
python -m venv .venv
source .venv/bin/activate  # Linux/Mac
# .venv\Scripts\activate   # Windows

# Cài đặt dependencies
pip install -r requirements.txt

# Copy environment variables
cp ../.env.example .env
# Chỉnh sửa .env với thông tin database

# Chạy migrations
python manage.py makemigrations
python manage.py migrate

# Tạo superuser
python manage.py createsuperuser

# Load sample data (optional)
python manage.py loaddata sample_data.json

# Chạy development server
python manage.py runserver 0.0.0.0:8000
```

### 3. Frontend Setup
```bash
cd frontend

# Chỉ cần mở file HTML trong browser
# Hoặc dùng simple HTTP server
python -m http.server 3000
# Hoặc
npx serve . -p 3000
```

## API Documentation (v1)

**Base URL:** `http://localhost:8000/api`
**Content-Type:** `application/json`
**Authentication:** Bearer JWT (`Authorization: Bearer <access_token>`)

### Authentication Endpoints

| METHOD | PATH                 | BODY                                      | RESPONSE              |
| :----: | -------------------- | ----------------------------------------- | --------------------- |
|  POST  | `/api/auth/login`    | `{ "email": "user@example.com", "password": "..." }` | `{ "access": "...", "refresh": "..." }` |
|  POST  | `/api/auth/register` | `{ "email": "...", "password": "...", "fullname": "...", "phone_number": "..." }` | `{ "id": 1, "email": "...", "fullname": "..." }` |
|  POST  | `/api/auth/refresh`  | `{ "refresh": "..." }`                    | `{ "access": "..." }` |

### Menu Endpoints

| METHOD | PATH                   | QUERY PARAMS          | RESPONSE                                      |
| :----: | ---------------------- | --------------------- | --------------------------------------------- |
|   GET  | `/api/menu/categories` | —                     | `[{ "id": 1, "cate_name": "Burger", "image": "..." }]` |
|   GET  | `/api/menu/items`      | `?category=1&q=burger&page=1` | `{ "count": 50, "results": [{ "id": 1, "title": "...", "price": "25000.00", "availability": "available" }] }` |
|   GET  | `/api/menu/items/{id}` | —                     | `{ "id": 1, "title": "...", "description": "...", "price": "25000.00", "image": "...", "category": {...} }` |

### Cart Endpoints

| METHOD | PATH                | BODY                           | RESPONSE                      |
| :----: | ------------------- | ------------------------------ | ----------------------------- |
|  POST  | `/api/cart/add`     | `{ "food_id": 1, "quantity": 2 }` | `{ "cart_id": 1, "items": [], "total_money": "50000.00" }` |
|   GET  | `/api/cart`         | —                              | `{ "id": 1, "items": [{ "food": {...}, "quantity": 2 }], "total_money": "50000.00" }` |
|   PUT  | `/api/cart/items/{food_id}` | `{ "quantity": 3 }`    | `{ "message": "Updated successfully" }` |
| DELETE | `/api/cart/items/{food_id}` | —                      | `{ "message": "Item removed" }` |

### Order Endpoints

| METHOD | PATH               | BODY                                          | RESPONSE                                    |
| :----: | ------------------ | --------------------------------------------- | ------------------------------------------- |
|  POST  | `/api/orders`      | `{ "items": [{"food_id": 1, "quantity": 2}], "note": "...", "receiver_name": "...", "ship_address": "...", "phone_number": "...", "promo_id": "DISCOUNT10" }` | `{ "id": 1, "order_status": "PENDING", "total_money": "45000.00" }` |
|   GET  | `/api/orders`      | `?status=PENDING&page=1`                     | `{ "count": 10, "results": [{ "id": 1, "order_status": "PENDING", "total_money": "45000.00" }] }` |
|   GET  | `/api/orders/{id}` | —                                             | `{ "id": 1, "order_status": "PREPARING", "items": [], "total_money": "45000.00", "receiver_name": "..." }` |

### Payment Endpoints

| METHOD | PATH                    | BODY                             | RESPONSE                      |
| :----: | ----------------------- | -------------------------------- | ----------------------------- |
|  POST  | `/api/payments/create`  | `{ "order_id": 1, "method": "momo" }` | `{ "payment_url": "https://...", "qr_code": "..." }` |
|  POST  | `/api/payments/webhook` | Payload từ cổng thanh toán       | `{ "success": true }`         |

### Promotion Endpoints

| METHOD | PATH                    | BODY                             | RESPONSE                      |
| :----: | ----------------------- | -------------------------------- | ----------------------------- |
|  POST  | `/api/promotions/validate` | `{ "promo_code": "DISCOUNT10", "total_amount": "50000" }` | `{ "valid": true, "discount_amount": "5000.00", "final_amount": "45000.00" }` |
|   GET  | `/api/promotions`       | —                                | `[{ "id": "DISCOUNT10", "percent": 10, "minimum_pay": 30000.0 }]` |

### Rating Endpoints

| METHOD | PATH                    | BODY                                  | RESPONSE                      |
| :----: | ----------------------- | ------------------------------------- | ----------------------------- |
|  POST  | `/api/ratings`          | `{ "food_id": 1, "content": "Ngon!" }` | `{ "id": 1, "content": "...", "user": {...} }` |
|   GET  | `/api/ratings`          | `?food_id=1&page=1`                  | `{ "count": 5, "results": [{ "id": 1, "content": "...", "user": {...} }] }` |

## Backend Implementation (Django DRF)

### Django Models

```python
# apps/authentication/models.py
from django.contrib.auth.models import AbstractUser
from django.db import models

class Role(models.Model):
    role_name = models.CharField(max_length=50)  # admin, staff, customer
    
    def __str__(self):
        return self.role_name

class User(AbstractUser):
    username = models.CharField(max_length=150, unique=True)
    fullname = models.CharField(max_length=255)
    email = models.EmailField(unique=True)
    address = models.TextField(blank=True)
    phone_number = models.CharField(max_length=15)
    role = models.ForeignKey(Role, on_delete=models.CASCADE)
    created_date = models.DateTimeField(auto_now_add=True)

# apps/menu/models.py
class Category(models.Model):
    cate_name = models.CharField(max_length=100)
    image = models.TextField(blank=True)  # URL or base64

class Food(models.Model):
    AVAILABILITY_CHOICES = [
        ('available', 'Có sẵn'),
        ('out_of_stock', 'Hết hàng'),
        ('discontinued', 'Ngừng bán'),
    ]
    
    title = models.CharField(max_length=200)
    description = models.TextField()
    price = models.DecimalField(max_digits=10, decimal_places=2)
    image = models.TextField(blank=True)
    category = models.ForeignKey(Category, on_delete=models.CASCADE)
    availability = models.CharField(max_length=20, choices=AVAILABILITY_CHOICES, default='available')

# apps/cart/models.py
class Cart(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    total_money = models.DecimalField(max_digits=10, decimal_places=2, default=0)

class Item(models.Model):
    cart = models.ForeignKey(Cart, on_delete=models.CASCADE, related_name='items')
    food = models.ForeignKey(Food, on_delete=models.CASCADE)
    quantity = models.IntegerField(default=1)

# apps/orders/models.py
class Order(models.Model):
    STATUS_CHOICES = [
        ('PENDING', 'Chờ thanh toán'),
        ('PAID', 'Đã thanh toán'),
        ('PREPARING', 'Đang chuẩn bị'),
        ('READY', 'Sẵn sàng'),
        ('COMPLETED', 'Hoàn thành'),
        ('CANCELLED', 'Đã huỷ'),
    ]
    
    PAYMENT_METHODS = [
        ('cash', 'Tiền mặt'),
        ('momo', 'MoMo'),
        ('zalopay', 'ZaloPay'),
        ('banking', 'Chuyển khoản'),
    ]
    
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    created_date = models.DateTimeField(auto_now_add=True)
    total_money = models.DecimalField(max_digits=10, decimal_places=2)
    order_status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PENDING')
    note = models.TextField(blank=True)
    payment_method = models.CharField(max_length=20, choices=PAYMENT_METHODS)
    receiver_name = models.CharField(max_length=255)
    ship_address = models.TextField()
    phone_number = models.CharField(max_length=15)
    promo = models.ForeignKey('promotions.Promo', on_delete=models.SET_NULL, null=True, blank=True)

class OrderDetail(models.Model):
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name='items')
    food = models.ForeignKey(Food, on_delete=models.CASCADE)
    quantity = models.IntegerField()

# apps/promotions/models.py
class Promo(models.Model):
    id = models.CharField(max_length=50, primary_key=True)  # DISCOUNT10, NEWUSER
    percent = models.IntegerField()  # Giảm giá %
    start_date = models.DateTimeField()
    end_date = models.DateTimeField()
    minimum_pay = models.FloatField()  # Số tiền tối thiểu

# apps/ratings/models.py
class RatingFood(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    food = models.ForeignKey(Food, on_delete=models.CASCADE)
    content = models.TextField()
    created_date = models.DateTimeField(auto_now_add=True)
```

### Django Views & Serializers

```python
# apps/authentication/serializers.py
from rest_framework import serializers
from rest_framework_simplejwt.tokens import RefreshToken

class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField()

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'email', 'fullname', 'phone_number', 'address']

# apps/authentication/views.py
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from django.contrib.auth import authenticate

@api_view(['POST'])
@permission_classes([AllowAny])
def login_view(request):
    serializer = LoginSerializer(data=request.data)
    if serializer.is_valid():
        email = serializer.validated_data['email']
        password = serializer.validated_data['password']
        
        user = authenticate(email=email, password=password)
        if user:
            refresh = RefreshToken.for_user(user)
            return Response({
                'access': str(refresh.access_token),
                'refresh': str(refresh),
                'user': UserSerializer(user).data
            })
    return Response({'error': 'Invalid credentials'}, status=400)

# apps/menu/views.py
@api_view(['GET'])
@permission_classes([AllowAny])
def category_list(request):
    categories = Category.objects.all()
    data = [{'id': c.id, 'cate_name': c.cate_name, 'image': c.image} for c in categories]
    return Response(data)

@api_view(['GET'])
@permission_classes([AllowAny])
def food_list(request):
    foods = Food.objects.filter(availability='available')
    
    # Filter by category
    category_id = request.GET.get('category')
    if category_id:
        foods = foods.filter(category_id=category_id)
    
    # Search
    search_query = request.GET.get('q')
    if search_query:
        foods = foods.filter(title__icontains=search_query)
    
    # Pagination
    page = int(request.GET.get('page', 1))
    limit = int(request.GET.get('limit', 12))
    
    start = (page - 1) * limit
    end = start + limit
    
    data = []
    for food in foods[start:end]:
        data.append({
            'id': food.id,
            'title': food.title,
            'description': food.description,
            'price': str(food.price),
            'image': food.image,
            'category': food.category.cate_name
        })
    
    return Response({
        'count': foods.count(),
        'results': data
    })

# apps/cart/views.py
@api_view(['POST'])
def add_to_cart(request):
    user = request.user
    food_id = request.data.get('food_id')
    quantity = request.data.get('quantity', 1)
    
    cart, created = Cart.objects.get_or_create(user=user)
    
    item, created = Item.objects.get_or_create(
        cart=cart,
        food_id=food_id,
        defaults={'quantity': quantity}
    )
    
    if not created:
        item.quantity += quantity
        item.save()
    
    # Update cart total
    cart_total = sum(item.food.price * item.quantity for item in cart.items.all())
    cart.total_money = cart_total
    cart.save()
    
    return Response({
        'cart_id': cart.id,
        'total_money': str(cart.total_money),
        'message': 'Item added to cart'
    })
```

## Frontend Implementation (Vanilla JS)

### HTML Templates

#### 1. Main Layout (`index.html`)
```html
<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>FastFood App</title>
    <link rel="stylesheet" href="assets/css/style.css">
    <script src="https://unpkg.com/lucide@latest/dist/umd/lucide.js"></script>
</head>
<body>
    <!-- Header -->
    <header class="header">
        <div class="container">
            <div class="logo">
                <h1>🍔 FastFood</h1>
            </div>
            <nav class="nav">
                <a href="index.html">Trang chủ</a>
                <a href="menu/categories.html">Thực đơn</a>
                <a href="cart/cart.html">Giỏ hàng (<span id="cart-count">0</span>)</a>
                <div class="auth-menu">
                    <div id="user-menu" class="hidden">
                        <span id="user-name"></span>
                        <a href="orders/history.html">Đơn hàng</a>
                        <button onclick="logout()">Đăng xuất</button>
                    </div>
                    <div id="guest-menu">
                        <a href="auth/login.html">Đăng nhập</a>
                        <a href="auth/register.html">Đăng ký</a>
                    </div>
                </div>
            </nav>
        </div>
    </header>

    <!-- Main Content -->
    <main class="main">
        <section class="hero">
            <div class="container">
                <h2>Đặt món ngon, giao nhanh!</h2>
                <p>Thưởng thức những món ăn ngon nhất với dịch vụ giao hàng tận nơi</p>
                <a href="menu/categories.html" class="btn btn-primary">Đặt hàng ngay</a>
            </div>
        </section>

        <section class="featured-categories">
            <div class="container">
                <h3>Danh mục món ăn</h3>
                <div id="categories-grid" class="grid"></div>
            </div>
        </section>
    </main>

    <!-- Scripts -->
    <script src="assets/js/api.js"></script>
    <script src="assets/js/auth.js"></script>
    <script src="assets/js/app.js"></script>
</body>
</html>
```

#### 2. Login Page (`auth/login.html`)
```html
<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Đăng nhập - FastFood App</title>
    <link rel="stylesheet" href="../assets/css/style.css">
</head>
<body>
    <div class="auth-container">
        <div class="auth-card">
            <h2>Đăng nhập</h2>
            <form id="login-form">
                <div class="form-group">
                    <label for="email">Email:</label>
                    <input type="email" id="email" name="email" required>
                </div>
                <div class="form-group">
                    <label for="password">Mật khẩu:</label>
                    <input type="password" id="password" name="password" required>
                </div>
                <button type="submit" class="btn btn-primary">Đăng nhập</button>
            </form>
            <p>Chưa có tài khoản? <a href="register.html">Đăng ký ngay</a></p>
        </div>
    </div>

    <script src="../assets/js/api.js"></script>
    <script src="../assets/js/auth.js"></script>
    <script>
        document.getElementById('login-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const formData = new FormData(e.target);
            const email = formData.get('email');
            const password = formData.get('password');
            
            try {
                const response = await API.post('/auth/login', { email, password });
                
                if (response.access) {
                    localStorage.setItem('access_token', response.access);
                    localStorage.setItem('refresh_token', response.refresh);
                    localStorage.setItem('user', JSON.stringify(response.user));
                    
                    alert('Đăng nhập thành công!');
                    window.location.href = '../index.html';
                } else {
                    alert('Đăng nhập thất bại!');
                }
            } catch (error) {
                alert('Lỗi: ' + (error.message || 'Không thể đăng nhập'));
            }
        });
    </script>
</body>
</html>
```

#### 3. Menu Categories (`menu/categories.html`)
```html
<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Danh mục - FastFood App</title>
    <link rel="stylesheet" href="../assets/css/style.css">
</head>
<body>
    <header class="header">
        <div class="container">
            <a href="../index.html" class="logo">🍔 FastFood</a>
            <nav class="nav">
                <a href="../index.html">Trang chủ</a>
                <a href="categories.html" class="active">Thực đơn</a>
                <a href="../cart/cart.html">Giỏ hàng (<span id="cart-count">0</span>)</a>
            </nav>
        </div>
    </header>

    <main class="main">
        <div class="container">
            <h2>Danh mục món ăn</h2>
            <div id="categories-container" class="categories-grid">
                <!-- Categories will be loaded here -->
            </div>
        </div>
    </main>

    <script src="../assets/js/api.js"></script>
    <script src="../assets/js/auth.js"></script>
    <script>
        async function loadCategories() {
            try {
                const categories = await API.get('/menu/categories');
                const container = document.getElementById('categories-container');
                
                container.innerHTML = categories.map(category => `
                    <div class="category-card" onclick="viewCategoryItems(${category.id})">
                        <img src="${category.image || 'https://via.placeholder.com/200'}" alt="${category.cate_name}">
                        <h3>${category.cate_name}</h3>
                    </div>
                `).join('');
            } catch (error) {
                console.error('Error loading categories:', error);
            }
        }

        function viewCategoryItems(categoryId) {
            window.location.href = `items.html?category=${categoryId}`;
        }

        // Load categories when page loads
        document.addEventListener('DOMContentLoaded', loadCategories);
        updateCartCount();
    </script>
</body>
</html>
```

#### 4. Food Items (`menu/items.html`)
```html
<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Món ăn - FastFood App</title>
    <link rel="stylesheet" href="../assets/css/style.css">
</head>
<body>
    <header class="header">
        <div class="container">
            <a href="../index.html" class="logo">🍔 FastFood</a>
            <nav class="nav">
                <a href="../index.html">Trang chủ</a>
                <a href="categories.html">Thực đơn</a>
                <a href="../cart/cart.html">Giỏ hàng (<span id="cart-count">0</span>)</a>
            </nav>
        </div>
    </header>

    <main class="main">
        <div class="container">
            <!-- Search & Filter -->
            <div class="search-section">
                <input type="text" id="search-input" placeholder="Tìm kiếm món ăn...">
                <select id="category-filter">
                    <option value="">Tất cả danh mục</option>
                </select>
                <button onclick="searchFoods()">Tìm kiếm</button>
            </div>

            <!-- Food Items Grid -->
            <div id="foods-container" class="foods-grid">
                <!-- Food items will be loaded here -->
            </div>

            <!-- Pagination -->
            <div id="pagination" class="pagination">
                <!-- Pagination buttons will be loaded here -->
            </div>
        </div>
    </main>

    <script src="../assets/js/api.js"></script>
    <script src="../assets/js/auth.js"></script>
    <script src="../assets/js/cart.js"></script>
    <script>
        let currentPage = 1;
        let currentCategory = '';
        let currentSearch = '';

        async function loadCategories() {
            try {
                const categories = await API.get('/menu/categories');
                const select = document.getElementById('category-filter');
                
                categories.forEach(category => {
                    const option = document.createElement('option');
                    option.value = category.id;
                    option.textContent = category.cate_name;
                    select.appendChild(option);
                });

                // Set selected category from URL params
                const urlParams = new URLSearchParams(window.location.search);
                const categoryParam = urlParams.get('category');
                if (categoryParam) {
                    select.value = categoryParam;
                    currentCategory = categoryParam;
                }
            } catch (error) {
                console.error('Error loading categories:', error);
            }
        }

        async function loadFoods(page = 1) {
            try {
                const params = new URLSearchParams();
                if (currentCategory) params.append('category', currentCategory);
                if (currentSearch) params.append('q', currentSearch);
                params.append('page', page.toString());

                const response = await API.get(`/menu/items?${params.toString()}`);
                const container = document.getElementById('foods-container');
                
                container.innerHTML = response.results.map(food => `
                    <div class="food-card">
                        <img src="${food.image || 'https://via.placeholder.com/300x200'}" alt="${food.title}">
                        <div class="food-info">
                            <h3>${food.title}</h3>
                            <p class="description">${food.description}</p>
                            <div class="price">${formatPrice(food.price)}</div>
                            <button class="btn btn-primary" onclick="addToCart(${food.id}, '${food.title}', ${food.price})">
                                Thêm vào giỏ
                            </button>
                        </div>
                    </div>
                `).join('');

                // Update pagination
                updatePagination(response.count, page);
            } catch (error) {
                console.error('Error loading foods:', error);
            }
        }

        function searchFoods() {
            currentSearch = document.getElementById('search-input').value;
            currentCategory = document.getElementById('category-filter').value;
            currentPage = 1;
            loadFoods(currentPage);
        }

        function updatePagination(totalCount, currentPageNum) {
            const itemsPerPage = 12;
            const totalPages = Math.ceil(totalCount / itemsPerPage);
            const pagination = document.getElementById('pagination');
            
            if (totalPages <= 1) {
                pagination.innerHTML = '';
                return;
            }

            let paginationHTML = '';
            
            // Previous button
            if (currentPageNum > 1) {
                paginationHTML += `<button onclick="loadFoods(${currentPageNum - 1})">Trước</button>`;
            }
            
            // Page numbers
            for (let i = 1; i <= totalPages; i++) {
                if (i === currentPageNum) {
                    paginationHTML += `<button class="active">${i}</button>`;
                } else {
                    paginationHTML += `<button onclick="loadFoods(${i})">${i}</button>`;
                }
            }
            
            // Next button
            if (currentPageNum < totalPages) {
                paginationHTML += `<button onclick="loadFoods(${currentPageNum + 1})">Sau</button>`;
            }
            
            pagination.innerHTML = paginationHTML;
        }

        function formatPrice(price) {
            return new Intl.NumberFormat('vi-VN', {
                style: 'currency',
                currency: 'VND'
            }).format(price);
        }

        // Load data when page loads
        document.addEventListener('DOMContentLoaded', () => {
            loadCategories();
            loadFoods();
            updateCartCount();
        });
    </script>
</body>
</html>
```

#### 5. Shopping Cart (`cart/cart.html`)
```html
<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Giỏ hàng - FastFood App</title>
    <link rel="stylesheet" href="../assets/css/style.css">
</head>
<body>
    <header class="header">
        <div class="container">
            <a href="../index.html" class="logo">🍔 FastFood</a>
            <nav class="nav">
                <a href="../index.html">Trang chủ</a>
                <a href="../menu/categories.html">Thực đơn</a>
                <a href="cart.html" class="active">Giỏ hàng</a>
            </nav>
        </div>
    </header>

    <main class="main">
        <div class="container">
            <h2>Giỏ hàng của bạn</h2>
            
            <div id="cart-container">
                <div id="cart-items">
                    <!-- Cart items will be loaded here -->
                </div>
                
                <div class="cart-summary">
                    <div class="total-section">
                        <h3>Tổng cộng: <span id="cart-total">0₫</span></h3>
                    </div>
                    
                    <div class="promo-section">
                        <input type="text" id="promo-code" placeholder="Mã giảm giá">
                        <button onclick="applyPromo()">Áp dụng</button>
                        <div id="promo-message"></div>
                    </div>
                    
                    <button id="checkout-btn" class="btn btn-primary btn-large" onclick="proceedToCheckout()">
                        Thanh toán
                    </button>
                </div>
            </div>
            
            <div id="empty-cart" class="empty-state hidden">
                <h3>Giỏ hàng trống</h3>
                <p>Bạn chưa thêm món nào vào giỏ hàng</p>
                <a href="../menu/categories.html" class="btn btn-primary">Xem thực đơn</a>
            </div>
        </div>
    </main>

    <script src="../assets/js/api.js"></script>
    <script src="../assets/js/auth.js"></script>
    <script src="../assets/js/cart.js"></script>
    <script>
        let cartData = null;

        async function loadCart() {
            try {
                cartData = await API.get('/cart');
                
                if (!cartData || !cartData.items || cartData.items.length === 0) {
                    showEmptyCart();
                    return;
                }

                displayCartItems(cartData);
                updateCartTotal();
            } catch (error) {
                console.error('Error loading cart:', error);
                showEmptyCart();
            }
        }

        function displayCartItems(cart) {
            const container = document.getElementById('cart-items');
            
            container.innerHTML = cart.items.map(item => `
                <div class="cart-item" data-food-id="${item.food.id}">
                    <img src="${item.food.image || 'https://via.placeholder.com/80'}" alt="${item.food.title}">
                    <div class="item-info">
                        <h4>${item.food.title}</h4>
                        <p class="price">${formatPrice(item.food.price)}</p>
                    </div>
                    <div class="quantity-controls">
                        <button onclick="updateQuantity(${item.food.id}, ${item.quantity - 1})">-</button>
                        <span class="quantity">${item.quantity}</span>
                        <button onclick="updateQuantity(${item.food.id}, ${item.quantity + 1})">+</button>
                    </div>
                    <div class="item-total">
                        ${formatPrice(item.food.price * item.quantity)}
                    </div>
                    <button class="remove-btn" onclick="removeFromCart(${item.food.id})">
                        <i data-lucide="trash-2"></i>
                    </button>
                </div>
            `).join('');

            // Initialize Lucide icons
            lucide.createIcons();

            document.getElementById('cart-container').classList.remove('hidden');
            document.getElementById('empty-cart').classList.add('hidden');
        }

        function showEmptyCart() {
            document.getElementById('cart-container').classList.add('hidden');
            document.getElementById('empty-cart').classList.remove('hidden');
        }

        async function updateQuantity(foodId, newQuantity) {
            if (newQuantity <= 0) {
                removeFromCart(foodId);
                return;
            }

            try {
                await API.put(`/cart/items/${foodId}`, { quantity: newQuantity });
                loadCart(); // Reload cart
            } catch (error) {
                alert('Lỗi cập nhật số lượng: ' + error.message);
            }
        }

        async function removeFromCart(foodId) {
            try {
                await API.delete(`/cart/items/${foodId}`);
                loadCart(); // Reload cart
            } catch (error) {
                alert('Lỗi xóa món: ' + error.message);
            }
        }

        async function applyPromo() {
            const promoCode = document.getElementById('promo-code').value;
            const totalAmount = cartData.total_money;

            try {
                const response = await API.post('/promotions/validate', {
                    promo_code: promoCode,
                    total_amount: totalAmount
                });

                if (response.valid) {
                    document.getElementById('promo-message').innerHTML = `
                        <div class="promo-success">
                            Giảm ${formatPrice(response.discount_amount)}! 
                            Tổng: ${formatPrice(response.final_amount)}
                        </div>
                    `;
                    
                    // Update cart total display
                    document.getElementById('cart-total').textContent = formatPrice(response.final_amount);
                } else {
                    document.getElementById('promo-message').innerHTML = `
                        <div class="promo-error">Mã giảm giá không hợp lệ</div>
                    `;
                }
            } catch (error) {
                document.getElementById('promo-message').innerHTML = `
                    <div class="promo-error">Lỗi: ${error.message}</div>
                `;
            }
        }

        function updateCartTotal() {
            if (cartData) {
                document.getElementById('cart-total').textContent = formatPrice(cartData.total_money);
            }
        }

        function proceedToCheckout() {
            if (!isAuthenticated()) {
                alert('Vui lòng đăng nhập để thanh toán');
                window.location.href = '../auth/login.html';
                return;
            }
            
            window.location.href = '../orders/checkout.html';
        }

        function formatPrice(price) {
            return new Intl.NumberFormat('vi-VN', {
                style: 'currency',
                currency: 'VND'
            }).format(price);
        }

        // Load cart when page loads
        document.addEventListener('DOMContentLoaded', () => {
            if (isAuthenticated()) {
                loadCart();
            } else {
                showEmptyCart();
            }
            updateCartCount();
        });
    </script>
</body>
</html>
```

### JavaScript API Client

#### 1. API Client (`assets/js/api.js`)
```javascript
// Simple API client
const API_BASE_URL = 'http://localhost:8000/api';

class APIClient {
    constructor(baseURL) {
        this.baseURL = baseURL;
    }

    async request(endpoint, options = {}) {
        const url = `${this.baseURL}${endpoint}`;
        const token = localStorage.getItem('access_token');
        
        const config = {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers,
            },
            ...options,
        };

        if (token && !options.skipAuth) {
            config.headers['Authorization'] = `Bearer ${token}`;
        }

        if (config.body && typeof config.body === 'object') {
            config.body = JSON.stringify(config.body);
        }

        try {
            const response = await fetch(url, config);
            
            // Handle 401 - token expired
            if (response.status === 401 && !options.skipAuth) {
                await this.refreshToken();
                // Retry with new token
                const newToken = localStorage.getItem('access_token');
                if (newToken) {
                    config.headers['Authorization'] = `Bearer ${newToken}`;
                    const retryResponse = await fetch(url, config);
                    return await this.handleResponse(retryResponse);
                }
            }
            
            return await this.handleResponse(response);
        } catch (error) {
            console.error('API Request failed:', error);
            throw new Error('Network error: ' + error.message);
        }
    }

    async handleResponse(response) {
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error?.message || data.message || 'API Error');
        }
        
        return data;
    }

    async refreshToken() {
        const refreshToken = localStorage.getItem('refresh_token');
        if (!refreshToken) {
            this.logout();
            return;
        }

        try {
            const response = await this.request('/auth/refresh', {
                method: 'POST',
                body: { refresh: refreshToken },
                skipAuth: true
            });
            
            localStorage.setItem('access_token', response.access);
        } catch (error) {
            console.error('Token refresh failed:', error);
            this.logout();
        }
    }

    logout() {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('user');
        window.location.href = '/auth/login.html';
    }

    // HTTP methods
    async get(endpoint, options = {}) {
        return this.request(endpoint, { method: 'GET', ...options });
    }

    async post(endpoint, body, options = {}) {
        return this.request(endpoint, { method: 'POST', body, ...options });
    }

    async put(endpoint, body, options = {}) {
        return this.request(endpoint, { method: 'PUT', body, ...options });
    }

    async delete(endpoint, options = {}) {
        return this.request(endpoint, { method: 'DELETE', ...options });
    }
}

// Global API instance
const API = new APIClient(API_BASE_URL);
```

#### 2. Authentication Helper (`assets/js/auth.js`)
```javascript
// Authentication utilities
function isAuthenticated() {
    return !!localStorage.getItem('access_token');
}

function getCurrentUser() {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
}

function getUserRole() {
    const user = getCurrentUser();
    return user?.role?.role_name || null;
}

function logout() {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
    window.location.href = '/auth/login.html';
}

function requireAuth() {
    if (!isAuthenticated()) {
        alert('Vui lòng đăng nhập để tiếp tục');
        window.location.href = '/auth/login.html';
        return false;
    }
    return true;
}

function requireRole(requiredRole) {
    const userRole = getUserRole();
    if (userRole !== requiredRole) {
        alert('Bạn không có quyền truy cập trang này');
        window.location.href = '/index.html';
        return false;
    }
    return true;
}

// Update UI based on auth status
function updateAuthUI() {
    const userMenu = document.getElementById('user-menu');
    const guestMenu = document.getElementById('guest-menu');
    const userNameSpan = document.getElementById('user-name');
    
    if (isAuthenticated()) {
        const user = getCurrentUser();
        if (userMenu) userMenu.classList.remove('hidden');
        if (guestMenu) guestMenu.classList.add('hidden');
        if (userNameSpan) userNameSpan.textContent = user.fullname;
    } else {
        if (userMenu) userMenu.classList.add('hidden');
        if (guestMenu) guestMenu.classList.remove('hidden');
    }
}

// Initialize auth UI when DOM is loaded
document.addEventListener('DOMContentLoaded', updateAuthUI);
```

#### 3. Cart Helper (`assets/js/cart.js`)
```javascript
// Shopping cart utilities
async function addToCart(foodId, foodTitle, foodPrice) {
    if (!isAuthenticated()) {
        alert('Vui lòng đăng nhập để thêm vào giỏ hàng');
        window.location.href = '/auth/login.html';
        return;
    }

    try {
        await API.post('/cart/add', {
            food_id: foodId,
            quantity: 1
        });
        
        alert(`Đã thêm "${foodTitle}" vào giỏ hàng!`);
        updateCartCount();
    } catch (error) {
        alert('Lỗi thêm vào giỏ hàng: ' + error.message);
    }
}

async function updateCartCount() {
    if (!isAuthenticated()) {
        document.getElementById('cart-count').textContent = '0';
        return;
    }

    try {
        const cart = await API.get('/cart');
        const totalItems = cart.items?.reduce((sum, item) => sum + item.quantity, 0) || 0;
        document.getElementById('cart-count').textContent = totalItems.toString();
    } catch (error) {
        console.error('Error updating cart count:', error);
        document.getElementById('cart-count').textContent = '0';
    }
}

// Initialize cart count when DOM is loaded
document.addEventListener('DOMContentLoaded', updateCartCount);
```

#### 4. Main App Logic (`assets/js/app.js`)
```javascript
// Main application logic
document.addEventListener('DOMContentLoaded', function() {
    // Initialize app
    updateAuthUI();
    updateCartCount();
    
    // Load featured categories on home page
    if (window.location.pathname.endsWith('index.html') || window.location.pathname === '/') {
        loadFeaturedCategories();
    }
});

async function loadFeaturedCategories() {
    try {
        const categories = await API.get('/menu/categories');
        const container = document.getElementById('categories-grid');
        
        if (container) {
            container.innerHTML = categories.slice(0, 6).map(category => `
                <div class="category-card" onclick="viewCategory(${category.id})">
                    <img src="${category.image || 'https://via.placeholder.com/200'}" alt="${category.cate_name}">
                    <h3>${category.cate_name}</h3>
                </div>
            `).join('');
        }
    } catch (error) {
        console.error('Error loading featured categories:', error);
    }
}

function viewCategory(categoryId) {
    window.location.href = `/menu/items.html?category=${categoryId}`;
}

// Utility functions
function formatPrice(price) {
    return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND'
    }).format(price);
}

function formatDate(dateString) {
    return new Date(dateString).toLocaleDateString('vi-VN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function showLoading(elementId) {
    const element = document.getElementById(elementId);
    if (element) {
        element.innerHTML = '<div class="loading">Đang tải...</div>';
    }
}

function hideLoading(elementId) {
    const element = document.getElementById(elementId);
    if (element) {
        const loading = element.querySelector('.loading');
        if (loading) loading.remove();
    }
}

// Order status helpers
function getStatusText(status) {
    const statusMap = {
        'PENDING': 'Chờ thanh toán',
        'PAID': 'Đã thanh toán',
        'PREPARING': 'Đang chuẩn bị',
        'READY': 'Sẵn sàng',
        'COMPLETED': 'Hoàn thành',
        'CANCELLED': 'Đã huỷ'
    };
    return statusMap[status] || status;
}

function getStatusClass(status) {
    const classMap = {
        'PENDING': 'status-pending',
        'PAID': 'status-paid',
        'PREPARING': 'status-preparing',
        'READY': 'status-ready',
        'COMPLETED': 'status-completed',
        'CANCELLED': 'status-cancelled'
    };
    return classMap[status] || 'status-default';
}
```

### CSS Styling (`assets/css/style.css`)

```css
/* CSS Variables */
:root {
    --primary-color: #ef4444;
    --primary-hover: #dc2626;
    --secondary-color: #6b7280;
    --success-color: #10b981;
    --warning-color: #f59e0b;
    --danger-color: #ef4444;
    --background-color: #f9fafb;
    --card-background: #ffffff;
    --text-color: #1f2937;
    --text-muted: #6b7280;
    --border-color: #e5e7eb;
    --border-radius: 8px;
    --shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
    --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
}

/* Reset & Base */
* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}

body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    line-height: 1.6;
    color: var(--text-color);
    background-color: var(--background-color);
}

.container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 0 20px;
}

/* Header */
.header {
    background: var(--card-background);
    box-shadow: var(--shadow);
    position: sticky;
    top: 0;
    z-index: 100;
}

.header .container {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem 20px;
}

.logo {
    font-size: 1.5rem;
    font-weight: bold;
    color: var(--primary-color);
    text-decoration: none;
}

.nav {
    display: flex;
    gap: 2rem;
    align-items: center;
}

.nav a {
    text-decoration: none;
    color: var(--text-color);
    font-weight: 500;
    transition: color 0.2s;
}

.nav a:hover,
.nav a.active {
    color: var(--primary-color);
}

/* Buttons */
.btn {
    display: inline-block;
    padding: 0.75rem 1.5rem;
    border: none;
    border-radius: var(--border-radius);
    font-weight: 500;
    text-decoration: none;
    text-align: center;
    cursor: pointer;
    transition: all 0.2s;
}

.btn-primary {
    background-color: var(--primary-color);
    color: white;
}

.btn-primary:hover {
    background-color: var(--primary-hover);
}

.btn-secondary {
    background-color: var(--secondary-color);
    color: white;
}

.btn-large {
    padding: 1rem 2rem;
    font-size: 1.1rem;
}

/* Cards */
.card {
    background: var(--card-background);
    border-radius: var(--border-radius);
    box-shadow: var(--shadow);
    padding: 1.5rem;
    margin-bottom: 1rem;
}

/* Grid Layouts */
.grid {
    display: grid;
    gap: 1.5rem;
}

.categories-grid {
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
}

.foods-grid {
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
}

/* Category Cards */
.category-card {
    background: var(--card-background);
    border-radius: var(--border-radius);
    box-shadow: var(--shadow);
    padding: 1rem;
    text-align: center;
    cursor: pointer;
    transition: transform 0.2s;
}

.category-card:hover {
    transform: translateY(-4px);
    box-shadow: var(--shadow-lg);
}

.category-card img {
    width: 100%;
    height: 120px;
    object-fit: cover;
    border-radius: var(--border-radius);
    margin-bottom: 0.5rem;
}

/* Food Cards */
.food-card {
    background: var(--card-background);
    border-radius: var(--border-radius);
    box-shadow: var(--shadow);
    overflow: hidden;
    transition: transform 0.2s;
}

.food-card:hover {
    transform: translateY(-2px);
    box-shadow: var(--shadow-lg);
}

.food-card img {
    width: 100%;
    height: 200px;
    object-fit: cover;
}

.food-info {
    padding: 1rem;
}

.food-info h3 {
    margin-bottom: 0.5rem;
    font-size: 1.2rem;
}

.food-info .description {
    color: var(--text-muted);
    margin-bottom: 1rem;
    font-size: 0.9rem;
}

.food-info .price {
    font-size: 1.3rem;
    font-weight: bold;
    color: var(--primary-color);
    margin-bottom: 1rem;
}

/* Cart Items */
.cart-item {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 1rem;
    background: var(--card-background);
    border-radius: var(--border-radius);
    box-shadow: var(--shadow);
    margin-bottom: 1rem;
}

.cart-item img {
    width: 80px;
    height: 80px;
    object-fit: cover;
    border-radius: var(--border-radius);
}

.item-info {
    flex: 1;
}

.item-info h4 {
    margin-bottom: 0.25rem;
}

.item-info .price {
    color: var(--text-muted);
    font-size: 0.9rem;
}

.quantity-controls {
    display: flex;
    align-items: center;
    gap: 0.5rem;
}

.quantity-controls button {
    width: 32px;
    height: 32px;
    border: 1px solid var(--border-color);
    background: white;
    border-radius: 4px;
    cursor: pointer;
}

.quantity-controls .quantity {
    min-width: 40px;
    text-align: center;
    font-weight: 500;
}

.item-total {
    font-weight: bold;
    color: var(--primary-color);
}

.remove-btn {
    background: var(--danger-color);
    color: white;
    border: none;
    padding: 0.5rem;
    border-radius: 4px;
    cursor: pointer;
}

/* Forms */
.form-group {
    margin-bottom: 1rem;
}

.form-group label {
    display: block;
    margin-bottom: 0.25rem;
    font-weight: 500;
}

.form-group input,
.form-group select,
.form-group textarea {
    width: 100%;
    padding: 0.75rem;
    border: 1px solid var(--border-color);
    border-radius: var(--border-radius);
    font-size: 1rem;
}

.form-group input:focus,
.form-group select:focus,
.form-group textarea:focus {
    outline: none;
    border-color: var(--primary-color);
}

/* Auth Pages */
.auth-container {
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.auth-card {
    background: var(--card-background);
    padding: 2rem;
    border-radius: var(--border-radius);
    box-shadow: var(--shadow-lg);
    width: 100%;
    max-width: 400px;
}

/* Order Status */
.status-pending { color: var(--warning-color); }
.status-paid { color: var(--success-color); }
.status-preparing { color: #3b82f6; }
.status-ready { color: var(--success-color); }
.status-completed { color: var(--secondary-color); }
.status-cancelled { color: var(--danger-color); }

/* Pagination */
.pagination {
    display: flex;
    justify-content: center;
    gap: 0.5rem;
    margin: 2rem 0;
}

.pagination button {
    padding: 0.5rem 1rem;
    border: 1px solid var(--border-color);
    background: white;
    cursor: pointer;
    border-radius: 4px;
}

.pagination button.active {
    background: var(--primary-color);
    color: white;
    border-color: var(--primary-color);
}

/* Utility Classes */
.hidden { display: none; }
.text-center { text-align: center; }
.text-muted { color: var(--text-muted); }
.mt-1 { margin-top: 0.25rem; }
.mt-2 { margin-top: 0.5rem; }
.mb-1 { margin-bottom: 0.25rem; }
.mb-2 { margin-bottom: 0.5rem; }

/* Loading */
.loading {
    text-align: center;
    padding: 2rem;
    color: var(--text-muted);
}

/* Empty States */
.empty-state {
    text-align: center;
    padding: 3rem;
    color: var(--text-muted);
}

.empty-state h3 {
    margin-bottom: 1rem;
}

/* Responsive Design */
@media (max-width: 768px) {
    .header .container {
        flex-direction: column;
        gap: 1rem;
    }
    
    .nav {
        gap: 1rem;
    }
    
    .cart-item {
        flex-direction: column;
        text-align: center;
    }
    
    .grid {
        grid-template-columns: 1fr;
    }
    
    .foods-grid {
        grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    }
}
```

### Complete HTML Templates

#### 6. Checkout Page (`orders/checkout.html`)
```html
<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Thanh toán - FastFood App</title>
    <link rel="stylesheet" href="../assets/css/style.css">
</head>
<body>
    <header class="header">
        <div class="container">
            <a href="../index.html" class="logo">🍔 FastFood</a>
            <nav class="nav">
                <a href="../index.html">Trang chủ</a>
                <a href="../menu/categories.html">Thực đơn</a>
                <a href="../cart/cart.html">Giỏ hàng</a>
            </nav>
        </div>
    </header>

    <main class="main">
        <div class="container">
            <h2>Thanh toán đơn hàng</h2>
            
            <div class="checkout-container">
                <div class="checkout-form">
                    <form id="checkout-form">
                        <h3>Thông tin giao hàng</h3>
                        
                        <div class="form-group">
                            <label for="receiver_name">Tên người nhận:</label>
                            <input type="text" id="receiver_name" name="receiver_name" required>
                        </div>
                        
                        <div class="form-group">
                            <label for="phone_number">Số điện thoại:</label>
                            <input type="tel" id="phone_number" name="phone_number" required>
                        </div>
                        
                        <div class="form-group">
                            <label for="ship_address">Địa chỉ giao hàng:</label>
                            <textarea id="ship_address" name="ship_address" rows="3" required></textarea>
                        </div>
                        
                        <div class="form-group">
                            <label for="note">Ghi chú (tùy chọn):</label>
                            <textarea id="note" name="note" rows="2" placeholder="Yêu cầu đặc biệt..."></textarea>
                        </div>
                        
                        <div class="form-group">
                            <label for="promo_id">Mã giảm giá:</label>
                            <div class="promo-input">
                                <input type="text" id="promo_id" name="promo_id" placeholder="Nhập mã giảm giá">
                                <button type="button" onclick="validatePromo()">Áp dụng</button>
                            </div>
                            <div id="promo-result"></div>
                        </div>
                        
                        <h3>Phương thức thanh toán</h3>
                        <div class="payment-methods">
                            <label class="payment-option">
                                <input type="radio" name="payment_method" value="cash" checked>
                                <span>💵 Tiền mặt</span>
                            </label>
                            <label class="payment-option">
                                <input type="radio" name="payment_method" value="momo">
                                <span>📱 MoMo</span>
                            </label>
                            <label class="payment-option">
                                <input type="radio" name="payment_method" value="zalopay">
                                <span>💳 ZaloPay</span>
                            </label>
                            <label class="payment-option">
                                <input type="radio" name="payment_method" value="banking">
                                <span>🏦 Chuyển khoản</span>
                            </label>
                        </div>
                        
                        <button type="submit" class="btn btn-primary btn-large">
                            Đặt hàng
                        </button>
                    </form>
                </div>
                
                <div class="order-summary">
                    <h3>Tóm tắt đơn hàng</h3>
                    <div id="order-items">
                        <!-- Order items will be loaded here -->
                    </div>
                    <div class="summary-row">
                        <span>Tạm tính:</span>
                        <span id="subtotal">0₫</span>
                    </div>
                    <div class="summary-row discount" id="discount-row" style="display: none;">
                        <span>Giảm giá:</span>
                        <span id="discount">0₫</span>
                    </div>
                    <div class="summary-row total">
                        <span>Tổng cộng:</span>
                        <span id="total">0₫</span>
                    </div>
                </div>
            </div>
        </div>
    </main>

    <script src="../assets/js/api.js"></script>
    <script src="../assets/js/auth.js"></script>
    <script>
        let cartData = null;
        let discountAmount = 0;

        async function loadOrderSummary() {
            try {
                cartData = await API.get('/cart');
                
                if (!cartData || !cartData.items || cartData.items.length === 0) {
                    alert('Giỏ hàng trống');
                    window.location.href = '../cart/cart.html';
                    return;
                }

                displayOrderItems(cartData);
                updateTotals();
                
                // Pre-fill user info
                const user = getCurrentUser();
                if (user) {
                    document.getElementById('receiver_name').value = user.fullname;
                    document.getElementById('phone_number').value = user.phone_number || '';
                    document.getElementById('ship_address').value = user.address || '';
                }
            } catch (error) {
                console.error('Error loading order summary:', error);
                alert('Lỗi tải thông tin đơn hàng');
            }
        }

        function displayOrderItems(cart) {
            const container = document.getElementById('order-items');
            
            container.innerHTML = cart.items.map(item => `
                <div class="order-item">
                    <span class="item-name">${item.food.title}</span>
                    <span class="item-quantity">x${item.quantity}</span>
                    <span class="item-price">${formatPrice(item.food.price * item.quantity)}</span>
                </div>
            `).join('');
        }

        async function validatePromo() {
            const promoCode = document.getElementById('promo_id').value;
            const resultDiv = document.getElementById('promo-result');
            
            if (!promoCode) {
                resultDiv.innerHTML = '';
                discountAmount = 0;
                updateTotals();
                return;
            }

            try {
                const response = await API.post('/promotions/validate', {
                    promo_code: promoCode,
                    total_amount: cartData.total_money
                });

                if (response.valid) {
                    discountAmount = parseFloat(response.discount_amount);
                    resultDiv.innerHTML = `
                        <div class="promo-success">
                            ✅ Giảm ${formatPrice(discountAmount)}
                        </div>
                    `;
                } else {
                    discountAmount = 0;
                    resultDiv.innerHTML = `
                        <div class="promo-error">❌ Mã giảm giá không hợp lệ</div>
                    `;
                }
                
                updateTotals();
            } catch (error) {
                discountAmount = 0;
                resultDiv.innerHTML = `
                    <div class="promo-error">❌ ${error.message}</div>
                `;
                updateTotals();
            }
        }

        function updateTotals() {
            if (!cartData) return;
            
            const subtotal = parseFloat(cartData.total_money);
            const total = subtotal - discountAmount;
            
            document.getElementById('subtotal').textContent = formatPrice(subtotal);
            document.getElementById('total').textContent = formatPrice(total);
            
            const discountRow = document.getElementById('discount-row');
            if (discountAmount > 0) {
                document.getElementById('discount').textContent = '-' + formatPrice(discountAmount);
                discountRow.style.display = 'flex';
            } else {
                discountRow.style.display = 'none';
            }
        }

        document.getElementById('checkout-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const formData = new FormData(e.target);
            const orderData = {
                items: cartData.items.map(item => ({
                    food_id: item.food.id,
                    quantity: item.quantity
                })),
                receiver_name: formData.get('receiver_name'),
                phone_number: formData.get('phone_number'),
                ship_address: formData.get('ship_address'),
                note: formData.get('note'),
                payment_method: formData.get('payment_method'),
                promo_id: formData.get('promo_id') || null
            };

            try {
                const order = await API.post('/orders', orderData);
                alert('Đặt hàng thành công!');
                window.location.href = `detail.html?id=${order.id}`;
            } catch (error) {
                alert('Lỗi đặt hàng: ' + error.message);
            }
        });

        function formatPrice(price) {
            return new Intl.NumberFormat('vi-VN', {
                style: 'currency',
                currency: 'VND'
            }).format(price);
        }

        // Check auth and load data
        document.addEventListener('DOMContentLoaded', () => {
            if (!isAuthenticated()) {
                alert('Vui lòng đăng nhập để thanh toán');
                window.location.href = '../auth/login.html';
                return;
            }
            
            loadOrderSummary();
        });
    </script>
</body>
</html>
```

#### 7. Order History (`orders/history.html`)
```html
<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Lịch sử đơn hàng - FastFood App</title>
    <link rel="stylesheet" href="../assets/css/style.css">
</head>
<body>
    <header class="header">
        <div class="container">
            <a href="../index.html" class="logo">🍔 FastFood</a>
            <nav class="nav">
                <a href="../index.html">Trang chủ</a>
                <a href="../menu/categories.html">Thực đơn</a>
                <a href="../cart/cart.html">Giỏ hàng</a>
                <a href="history.html" class="active">Đơn hàng</a>
            </nav>
        </div>
    </header>

    <main class="main">
        <div class="container">
            <h2>Lịch sử đơn hàng</h2>
            
            <div class="filters">
                <select id="status-filter" onchange="filterOrders()">
                    <option value="">Tất cả trạng thái</option>
                    <option value="PENDING">Chờ thanh toán</option>
                    <option value="PAID">Đã thanh toán</option>
                    <option value="PREPARING">Đang chuẩn bị</option>
                    <option value="READY">Sẵn sàng</option>
                    <option value="COMPLETED">Hoàn thành</option>
                    <option value="CANCELLED">Đã huỷ</option>
                </select>
            </div>
            
            <div id="orders-container">
                <!-- Orders will be loaded here -->
            </div>
            
            <div id="pagination" class="pagination">
                <!-- Pagination will be loaded here -->
            </div>
        </div>
    </main>

    <script src="../assets/js/api.js"></script>
    <script src="../assets/js/auth.js"></script>
    <script src="../assets/js/app.js"></script>
    <script>
        let currentPage = 1;
        let currentStatus = '';

        async function loadOrders(page = 1) {
            try {
                showLoading('orders-container');
                
                const params = new URLSearchParams();
                if (currentStatus) params.append('status', currentStatus);
                params.append('page', page.toString());

                const response = await API.get(`/orders?${params.toString()}`);
                
                hideLoading('orders-container');
                displayOrders(response.results);
                updatePagination(response.count, page);
            } catch (error) {
                console.error('Error loading orders:', error);
                document.getElementById('orders-container').innerHTML = `
                    <div class="empty-state">
                        <h3>Không thể tải đơn hàng</h3>
                        <p>Vui lòng thử lại sau</p>
                    </div>
                `;
            }
        }

        function displayOrders(orders) {
            const container = document.getElementById('orders-container');
            
            if (!orders || orders.length === 0) {
                container.innerHTML = `
                    <div class="empty-state">
                        <h3>Không có đơn hàng nào</h3>
                        <p>Bạn chưa có đơn hàng nào</p>
                        <a href="../menu/categories.html" class="btn btn-primary">Đặt hàng ngay</a>
                    </div>
                `;
                return;
            }

            container.innerHTML = orders.map(order => `
                <div class="order-card">
                    <div class="order-header">
                        <div class="order-id">Đơn hàng #${order.id}</div>
                        <div class="order-status ${getStatusClass(order.order_status)}">
                            ${getStatusText(order.order_status)}
                        </div>
                    </div>
                    <div class="order-info">
                        <div class="order-date">${formatDate(order.created_date)}</div>
                        <div class="order-total">${formatPrice(order.total_money)}</div>
                        <div class="order-payment">Thanh toán: ${getPaymentMethodText(order.payment_method)}</div>
                    </div>
                    <div class="order-actions">
                        <button class="btn btn-secondary" onclick="viewOrderDetail(${order.id})">
                            Xem chi tiết
                        </button>
                        ${order.order_status === 'PENDING' ? `
                            <button class="btn btn-danger" onclick="cancelOrder(${order.id})">
                                Huỷ đơn
                            </button>
                        ` : ''}
                    </div>
                </div>
            `).join('');
        }

        function filterOrders() {
            currentStatus = document.getElementById('status-filter').value;
            currentPage = 1;
            loadOrders(currentPage);
        }

        function viewOrderDetail(orderId) {
            window.location.href = `detail.html?id=${orderId}`;
        }

        async function cancelOrder(orderId) {
            if (!confirm('Bạn có chắc muốn huỷ đơn hàng này?')) {
                return;
            }

            try {
                await API.put(`/orders/${orderId}/status`, { order_status: 'CANCELLED' });
                alert('Đã huỷ đơn hàng');
                loadOrders(currentPage);
            } catch (error) {
                alert('Lỗi huỷ đơn hàng: ' + error.message);
            }
        }

        function getPaymentMethodText(method) {
            const methodMap = {
                'cash': 'Tiền mặt',
                'momo': 'MoMo',
                'zalopay': 'ZaloPay',
                'banking': 'Chuyển khoản'
            };
            return methodMap[method] || method;
        }

        function updatePagination(totalCount, currentPageNum) {
            const itemsPerPage = 10;
            const totalPages = Math.ceil(totalCount / itemsPerPage);
            const pagination = document.getElementById('pagination');
            
            if (totalPages <= 1) {
                pagination.innerHTML = '';
                return;
            }

            let paginationHTML = '';
            
            if (currentPageNum > 1) {
                paginationHTML += `<button onclick="loadOrders(${currentPageNum - 1})">Trước</button>`;
            }
            
            for (let i = 1; i <= totalPages; i++) {
                if (i === currentPageNum) {
                    paginationHTML += `<button class="active">${i}</button>`;
                } else {
                    paginationHTML += `<button onclick="loadOrders(${i})">${i}</button>`;
                }
            }
            
            if (currentPageNum < totalPages) {
                paginationHTML += `<button onclick="loadOrders(${currentPageNum + 1})">Sau</button>`;
            }
            
            pagination.innerHTML = paginationHTML;
        }

        // Check auth and load data
        document.addEventListener('DOMContentLoaded', () => {
            if (!requireAuth()) return;
            loadOrders();
        });
    </script>
</body>
</html>
```

#### 8. Order Detail (`orders/detail.html`)
```html
<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Chi tiết đơn hàng - FastFood App</title>
    <link rel="stylesheet" href="../assets/css/style.css">
</head>
<body>
    <header class="header">
        <div class="container">
            <a href="../index.html" class="logo">🍔 FastFood</a>
            <nav class="nav">
                <a href="../index.html">Trang chủ</a>
                <a href="../menu/categories.html">Thực đơn</a>
                <a href="../cart/cart.html">Giỏ hàng</a>
                <a href="history.html">Đơn hàng</a>
            </nav>
        </div>
    </header>

    <main class="main">
        <div class="container">
            <div class="order-detail-container">
                <div class="order-header">
                    <h2>Chi tiết đơn hàng #<span id="order-id"></span></h2>
                    <div class="order-status-badge" id="status-badge"></div>
                </div>
                
                <div class="order-content">
                    <div class="order-info-section">
                        <h3>Thông tin đơn hàng</h3>
                        <div class="info-grid">
                            <div class="info-item">
                                <label>Ngày đặt:</label>
                                <span id="order-date"></span>
                            </div>
                            <div class="info-item">
                                <label>Tổng tiền:</label>
                                <span id="order-total"></span>
                            </div>
                            <div class="info-item">
                                <label>Phương thức thanh toán:</label>
                                <span id="payment-method"></span>
                            </div>
                            <div class="info-item">
                                <label>Ghi chú:</label>
                                <span id="order-note"></span>
                            </div>
                        </div>
                    </div>
                    
                    <div class="delivery-info-section">
                        <h3>Thông tin giao hàng</h3>
                        <div class="delivery-info">
                            <div class="info-item">
                                <label>Người nhận:</label>
                                <span id="receiver-name"></span>
                            </div>
                            <div class="info-item">
                                <label>Số điện thoại:</label>
                                <span id="receiver-phone"></span>
                            </div>
                            <div class="info-item">
                                <label>Địa chỉ:</label>
                                <span id="ship-address"></span>
                            </div>
                        </div>
                    </div>
                    
                    <div class="order-items-section">
                        <h3>Món ăn đã đặt</h3>
                        <div id="order-items">
                            <!-- Order items will be loaded here -->
                        </div>
                    </div>
                </div>
                
                <div class="order-actions">
                    <a href="history.html" class="btn btn-secondary">Quay lại</a>
                    <div id="order-status-actions">
                        <!-- Dynamic actions based on order status -->
                    </div>
                </div>
            </div>
        </div>
    </main>

    <script src="../assets/js/api.js"></script>
    <script src="../assets/js/auth.js"></script>
    <script src="../assets/js/app.js"></script>
    <script>
        let orderId = null;
        let orderData = null;

        async function loadOrderDetail() {
            const urlParams = new URLSearchParams(window.location.search);
            orderId = urlParams.get('id');
            
            if (!orderId) {
                alert('Không tìm thấy đơn hàng');
                window.location.href = 'history.html';
                return;
            }

            try {
                orderData = await API.get(`/orders/${orderId}`);
                displayOrderDetail(orderData);
            } catch (error) {
                console.error('Error loading order:', error);
                alert('Không thể tải thông tin đơn hàng');
                window.location.href = 'history.html';
            }
        }

        function displayOrderDetail(order) {
            // Order header
            document.getElementById('order-id').textContent = order.id;
            
            const statusBadge = document.getElementById('status-badge');
            statusBadge.textContent = getStatusText(order.order_status);
            statusBadge.className = `order-status-badge ${getStatusClass(order.order_status)}`;

            // Order info
            document.getElementById('order-date').textContent = formatDate(order.created_date);
            document.getElementById('order-total').textContent = formatPrice(order.total_money);
            document.getElementById('payment-method').textContent = getPaymentMethodText(order.payment_method);
            document.getElementById('order-note').textContent = order.note || 'Không có ghi chú';

            // Delivery info
            document.getElementById('receiver-name').textContent = order.receiver_name;
            document.getElementById('receiver-phone').textContent = order.phone_number;
            document.getElementById('ship-address').textContent = order.ship_address;

            // Order items
            const itemsContainer = document.getElementById('order-items');
            itemsContainer.innerHTML = order.items.map(item => `
                <div class="order-detail-item">
                    <img src="${item.food.image || 'https://via.placeholder.com/60'}" alt="${item.food.title}">
                    <div class="item-info">
                        <h4>${item.food.title}</h4>
                        <p>Số lượng: ${item.quantity}</p>
                    </div>
                    <div class="item-price">
                        ${formatPrice(item.food.price * item.quantity)}
                    </div>
                </div>
            `).join('');

            // Status-specific actions
            updateOrderActions(order);
        }

        function updateOrderActions(order) {
            const actionsContainer = document.getElementById('order-status-actions');
            
            if (order.order_status === 'PENDING') {
                actionsContainer.innerHTML = `
                    <button class="btn btn-primary" onclick="proceedToPayment(${order.id})">
                        Thanh toán
                    </button>
                    <button class="btn btn-danger" onclick="cancelOrder(${order.id})">
                        Huỷ đơn
                    </button>
                `;
            } else if (order.order_status === 'COMPLETED') {
                actionsContainer.innerHTML = `
                    <button class="btn btn-primary" onclick="reorder(${order.id})">
                        Đặt lại
                    </button>
                `;
            }
        }

        async function proceedToPayment(orderId) {
            try {
                const response = await API.post('/payments/create', {
                    order_id: orderId,
                    method: orderData.payment_method
                });

                if (response.payment_url) {
                    window.open(response.payment_url, '_blank');
                } else {
                    alert('Không thể tạo link thanh toán');
                }
            } catch (error) {
                alert('Lỗi tạo thanh toán: ' + error.message);
            }
        }

        async function cancelOrder(orderId) {
            if (!confirm('Bạn có chắc muốn huỷ đơn hàng này?')) {
                return;
            }

            try {
                await API.put(`/orders/${orderId}/status`, { order_status: 'CANCELLED' });
                alert('Đã huỷ đơn hàng');
                loadOrderDetail(); // Reload to update status
            } catch (error) {
                alert('Lỗi huỷ đơn hàng: ' + error.message);
            }
        }

        async function reorder(orderId) {
            try {
                // Add all items from this order to cart
                for (const item of orderData.items) {
                    await API.post('/cart/add', {
                        food_id: item.food.id,
                        quantity: item.quantity
                    });
                }
                
                alert('Đã thêm lại các món vào giỏ hàng!');
                window.location.href = '../cart/cart.html';
            } catch (error) {
                alert('Lỗi đặt lại: ' + error.message);
            }
        }

        function getPaymentMethodText(method) {
            const methodMap = {
                'cash': 'Tiền mặt',
                'momo': 'MoMo',
                'zalopay': 'ZaloPay',
                'banking': 'Chuyển khoản'
            };
            return methodMap[method] || method;
        }

        // Check auth and load data
        document.addEventListener('DOMContentLoaded', () => {
            if (!requireAuth()) return;
            loadOrderDetail();
        });
    </script>
</body>
</html>
```

## Django URL Configuration

### Main URLs (`fastfood_api/urls.py`)
```python
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/auth/', include('apps.authentication.urls')),
    path('api/menu/', include('apps.menu.urls')),
    path('api/cart/', include('apps.cart.urls')),
    path('api/orders/', include('apps.orders.urls')),
    path('api/payments/', include('apps.payments.urls')),
    path('api/promotions/', include('apps.promotions.urls')),
    path('api/ratings/', include('apps.ratings.urls')),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
```

### App-specific URLs
```python
# apps/authentication/urls.py
from django.urls import path
from . import views

urlpatterns = [
    path('login/', views.login_view, name='login'),
    path('register/', views.register_view, name='register'),
    path('refresh/', views.refresh_view, name='refresh'),
]

# apps/menu/urls.py
from django.urls import path
from . import views

urlpatterns = [
    path('categories/', views.category_list, name='categories'),
    path('items/', views.food_list, name='food_list'),
    path('items/<int:pk>/', views.food_detail, name='food_detail'),
]

# apps/cart/urls.py
from django.urls import path
from . import views

urlpatterns = [
    path('', views.get_cart, name='get_cart'),
    path('add/', views.add_to_cart, name='add_to_cart'),
    path('items/<int:food_id>/', views.update_cart_item, name='update_cart_item'),
]

# apps/orders/urls.py
from django.urls import path
from . import views

urlpatterns = [
    path('', views.order_list_create, name='orders'),
    path('<int:pk>/', views.order_detail, name='order_detail'),
    path('<int:pk>/status/', views.update_order_status, name='update_status'),
]
```

## Quick Start Guide

### 1. Cài đặt môi trường
```bash
# Clone repository
git clone https://github.com/yourusername/fastfood-app.git
cd fastfood-app

# Setup database
createdb fastfood_db
```

### 2. Chạy Backend
```bash
cd backend

# Virtual environment
python -m venv .venv
source .venv/bin/activate

# Install packages
pip install -r requirements.txt

# Environment setup
cp ../.env.example .env
# Edit .env with your database credentials

# Database migrations
python manage.py makemigrations
python manage.py migrate

# Create superuser
python manage.py createsuperuser

# Run server
python manage.py runserver
```

### 3. Chạy Frontend
```bash
# Open in browser hoặc sử dụng live server
# Mở file frontend/index.html
```

### 4. Cấu trúc dự án hoàn chỉnh
```
fastfood-app/
├── backend/
│   ├── fastfood_api/
│   │   ├── __init__.py
│   │   ├── settings.py
│   │   ├── urls.py
│   │   └── wsgi.py
│   ├── apps/
│   │   ├── authentication/
│   │   ├── menu/
│   │   ├── cart/
│   │   ├── orders/
│   │   ├── payments/
│   │   ├── promotions/
│   │   └── ratings/
│   ├── manage.py
│   └── requirements.txt
├── frontend/
│   ├── index.html
│   ├── auth/
│   ├── menu/
│   ├── cart/
│   ├── orders/
│   └── assets/
└── .env.example