# FastFood Monorepo

Monorepo cho hệ thống FastFood gồm ba phần chính: backend Django REST API, web frontend React (Vite + TypeScript) và mobile app React Native/Expo. Tài liệu này hướng dẫn chạy từng phần trên máy local.

## Yêu cầu
- Python 3.10+ (đề xuất 3.11)
- Node.js 18+ (kèm npm)
- PostgreSQL 13+
- Git, OpenSSL
- Expo CLI qua npx (để chạy mobile)

## Cấu trúc nhanh
- backend/: Django REST API
- react-frontend/: React + Vite + Tailwind
- mobile/: React Native + Expo
- data/: Backup SQL mẫu
- docs/: Hướng dẫn thiết lập DB

## Backend (Django REST API)
1) Tạo database PostgreSQL
```bash
psql -U postgres -c "CREATE DATABASE fastfood_data;"
# Hoặc khôi phục dữ liệu mẫu (chạy từ thư mục gốc repo)
psql -U postgres -d fastfood_data -f data/backup.sql
```

2) Thiết lập môi trường và dependencies
```bash
cd backend
python -m venv .venv
.venv\Scripts\Activate.ps1  # Windows PowerShell
pip install -r requirements.txt
copy .env.example .env
```
Điền `.env` với thông tin DB (DB_NAME, DB_USER, DB_PASSWORD, DB_HOST, DB_PORT), `SECRET_KEY`, `PAYOS_*`, và `GOOGLE_MAPS_API_KEY` nếu dùng tính năng bản đồ.

3) Khởi tạo schema
```bash
python manage.py migrate
python manage.py createsuperuser  # tùy chọn
```

4) Chạy server
```bash
python manage.py runserver 0.0.0.0:8000
```
API base: http://localhost:8000. Admin: http://localhost:8000/admin. Media: http://localhost:8000/media/.

## Web Frontend (React + Vite)
1) Cài đặt
```bash
cd react-frontend
npm install
```

2) Cấu hình API
- Cập nhật `API_BASE_URL` trong `src/services/api.ts` nếu backend không ở `http://localhost:8000`.

3) Chạy dev server (nên dùng port đã mở CORS, ví dụ 3000)
```bash
npm run dev -- --host --port 3000
```
Truy cập http://localhost:3000.

4) Build/preview
```bash
npm run build
npm run preview
```

## Mobile App (React Native + Expo)
1) Cài đặt
```bash
cd mobile
npm install
```

2) Cấu hình API endpoint
- Sửa `BASE_URL` trong `src/constants/index.ts` thành URL backend của bạn (ví dụ `http://<ip-may-ban>:8000/api`).

3) Thiết lập Google Maps (nếu dùng chọn địa chỉ)
- Tạo file `.env` trong thư mục `mobile` với `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=your_key`.

4) Thêm assets Expo (nếu chưa có) trong `mobile/assets`: `icon.png`, `splash.png`, `adaptive-icon.png`, `favicon.png`.

5) Chạy ứng dụng
```bash
npm run start     # mở Expo Dev Tools và QR
npm run android   # mở emulator/thiết bị Android
npm run ios       # yêu cầu macOS + Xcode
npm run web       # chạy trên web
```

6) Build với EAS (cần đăng nhập Expo)
```bash
npm run build:android
npm run build:ios
```

## Ghi chú thêm
- CORS trong backend hiện cho phép localhost:3000 và 8080. Nếu chạy web ở port khác, cần mở rộng `CORS_ALLOWED_ORIGINS` trong backend/fastfood_api/settings.py.
- Dữ liệu mẫu: `data/backup.sql` (PostgreSQL dump). Bạn cũng có thể tham khảo `docs/fastfood_base.md` và `docs/init_project.md` để biết thêm chi tiết thiết lập DB.
- Backend dùng JWT (access 60 phút, refresh 7 ngày). Kiểm tra Authorization header dạng `Bearer <token>`.
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
