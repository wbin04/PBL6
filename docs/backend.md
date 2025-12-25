```python
# Mở psql hoặc pgAdmin và chạy:
psql -U postgres
# Trong psql:
CREATE DATABASE fastfood_db;
# Import dữ liệu
psql -U postgres -f data.sql

# Di chuyển vào thư mục backend
cd backend
# Tạo Virtual Environment
python -m venv .venv
# Kích hoạt Virtual Environment
.venv\Scripts\activate
# Cài đặt các thư viện Python
pip install -r requirements.txt

# Tạo file .env từ template
copy .env.example .env
# Chỉnh sửa file .env
DB_NAME=fastfood_db
DB_USER=postgres
DB_PASSWORD=your_password_here
DB_HOST=localhost
DB_PORT=5432

# Tạo migrations cho các apps
python manage.py makemigrations
# Áp dụng migrations vào database
python manage.py migrate
# Tạo tài khoản superuser (admin)
python manage.py createsuperuser

# Chạy trên địa chỉ IP cụ thể (cho phép truy cập từ máy khác)
python manage.py runserver 0.0.0.0:8000
```