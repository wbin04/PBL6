# Tóm tắt cập nhật Backend và Frontend - PBL6

## 📋 Tổng quan thay đổi

### 🔧 Backend Changes

#### 1. Tạo app `stores` mới
- **📁 File structure:**
  ```
  backend/apps/stores/
  ├── __init__.py
  ├── apps.py
  ├── models.py
  ├── serializers.py
  ├── views.py
  ├── urls.py
  ├── admin.py
  └── migrations/
      ├── __init__.py
      └── 0001_initial.py
  ```

#### 2. Model Changes

**🏪 Store Model (`apps/stores/models.py`):**
```python
class Store(models.Model):
    store_name = models.CharField(max_length=100)
    image = models.TextField(blank=True)  # URL path (assets/store.png)
    description = models.TextField(blank=True)
    
    class Meta:
        db_table = 'stores'
```

**🍔 Food Model Update (`apps/menu/models.py`):**
- Thêm field: `store = models.ForeignKey('stores.Store', ...)`

**👤 Role Update:**
- Thêm role "Cửa hàng" vào bảng `roles`

#### 3. API Endpoints mới

**🌐 Menu endpoints (`/api/menu/`):**
- `GET /api/menu/stores/` - Lấy danh sách cửa hàng
- `GET /api/menu/items/?store=<id>` - Lọc món ăn theo cửa hàng

**🌐 Store endpoints (`/api/stores/`):**
- CRUD operations cho stores (Admin only)

#### 4. Database Changes

**🗄️ SQL Updates (`database_update.sql`):**
```sql
-- 1. Thêm role "Cửa hàng"
INSERT INTO roles (role_name) VALUES ('Cửa hàng');

-- 2. Tạo bảng stores
CREATE TABLE stores (
    id SERIAL PRIMARY KEY,
    store_name VARCHAR(100) NOT NULL,
    image TEXT DEFAULT '',
    description TEXT DEFAULT ''
);

-- 3. Thêm foreign key vào food
ALTER TABLE food ADD COLUMN store_id INTEGER;
ALTER TABLE food ADD CONSTRAINT fk_food_store 
FOREIGN KEY (store_id) REFERENCES stores(id);
```

### 🎨 Frontend Changes

#### 1. Categories Page (`menu/categories.html`)
- ➕ Thêm filter theo cửa hàng
- ➕ Thêm section "Cửa hàng" 
- ➕ Hiển thị danh sách stores với cards

#### 2. Items Page (`menu/items.html`)  
- ➕ Thêm dropdown filter cửa hàng
- ➕ Hiển thị tên cửa hàng trên food cards
- ➕ Function `filterByStore()`
- ➕ URL parameters hỗ trợ `?store=<id>`

#### 3. CSS Updates (`assets/css/style.css`)
- ➕ `.grid`, `.categories-grid`, `.foods-grid` layouts
- ➕ `.category-card`, `.food-card` styling
- ➕ `.store-name` styling với background highlight
- ➕ `.availability-status` styling
- ➕ Responsive design cho mobile

## 🚀 Features mới

### 🔍 Filter & Search Features
1. **Lọc theo cửa hàng:** Dropdown trong categories và items page
2. **Lọc kết hợp:** Category + Store + Search + Sort
3. **URL parameters:** Hỗ trợ deep linking với filters

### 🏪 Store Management
1. **Store listing:** Hiển thị danh sách cửa hàng
2. **Store info:** Tên, hình ảnh, mô tả
3. **Food-Store relationship:** Mỗi món ăn thuộc về 1 cửa hàng

### 🎯 User Experience  
1. **Visual indicators:** Hiển thị tên cửa hàng trên food cards
2. **Navigation:** Click store card → filter foods by store
3. **Breadcrumb logic:** Category + Store filters work together

## 📊 Database Sample Data

**🏪 Stores được tạo:**
- KFC Vietnam
- McDonald's Vietnam  
- Burger King
- Pizza Hut
- Domino's Pizza

**🍔 Food items:** Đã được gán ngẫu nhiên cho các stores

## 🛠️ Usage

### Frontend Usage:
1. **Xem tất cả:** `menu/categories.html`
2. **Lọc theo store:** `menu/items.html?store=1`
3. **Lọc kết hợp:** `menu/items.html?category=1&store=2`

### API Usage:
```javascript
// Lấy stores
const stores = await API.get('/menu/stores/');

// Lọc foods theo store
const foods = await API.get('/menu/items/?store=1');

// Lọc kết hợp
const foods = await API.get('/menu/items/?category=1&store=2&search=burger');
```

## ✅ Completed Tasks

- [x] Tạo bảng `stores` với đầy đủ fields
- [x] Thêm role "Cửa hàng" 
- [x] Thêm foreign key `store_id` vào bảng `food`
- [x] Tạo API endpoints cho stores
- [x] Cập nhật Food serializer include store info
- [x] Cập nhật frontend với store filters
- [x] Thêm CSS styling cho store elements
- [x] Migrate database và thêm sample data
- [x] Test functionality với sample data

## 🎉 Kết quả

Backend và frontend đã được cập nhật thành công để hỗ trợ:
- ✅ Quản lý cửa hàng
- ✅ Lọc món ăn theo cửa hàng  
- ✅ Hiển thị thông tin cửa hàng trong giao diện
- ✅ API endpoints đầy đủ cho stores
- ✅ Database schema đã được cập nhật

Hệ thống giờ đây hỗ trợ multi-store management với UI/UX thân thiện!
