# 🍔 FastFood App - Release v2.0

## 🚀 Tổng quan

Bản v2 nâng cấp toàn bộ trải nghiệm đa nền tảng: backend thêm luồng quản lý cửa hàng/shipper, thanh toán PayOS, menu theo cửa hàng; web frontend chuyển sang React + Vite + Tailwind; mobile dùng Expo 54 với API đồng bộ.

## 🛠️ Công nghệ cập nhật

### Backend API
- **Framework:** Django 4.2.x + Django REST Framework 3.14.x
- **Auth:** JWT (Simple JWT) với refresh token rotation
- **Database:** PostgreSQL 13+; schema hỗ trợ food size, multi-store orders
- **Integrations:** PayOS create-link/check-status, Google Maps key cho phí ship
- **Media:** Django Media/Pillow; CORS mở cho localhost 3000/8080

### Frontend Web
- **Framework:** React 19 + Vite + TypeScript
- **UI:** Tailwind CSS + shadcn/ui, React Router 7
- **Charts/Maps:** Recharts, @react-google-maps/api
- **Auth:** JWT lưu localStorage, fetch client tại `src/services/api.ts`

### Mobile App
- **Framework:** React Native (Expo 54, React 19)
- **Navigation:** Expo Router + React Navigation
- **State:** Redux Toolkit 2.8 + React Redux 9.2
- **UI:** NativeWind, React Native Paper, lucide-react-native
- **Services:** Axios client, SecureStore cho token, Maps/location hỗ trợ Google API key

## ✨ Tính năng mới & thay đổi chính
- **Store Manager & Shipper:** Đăng ký, duyệt hồ sơ; shipper nhận đơn và cập nhật trạng thái giao hàng.
- **Menu theo cửa hàng:** Endpoint store/foods, food sizes; phân quyền admin/store manager.
- **Đơn hàng nhiều cửa hàng:** Tạo đơn tách theo từng store, phí ship tính theo khoảng cách (config trong settings).
- **Thanh toán PayOS:** Tạo link thanh toán, check status, webhook; COD vẫn hỗ trợ.
- **Khuyến mãi:** CRUD cho store manager và admin global; validate nhiều điều kiện đơn hàng.
- **Đánh giá:** CRUD rating món ăn; gắn với user/food.
- **Dashboard/Chatbot:** Route sẵn cho admin dashboard và chatbot service.
- **Web UI mới:** Chuyển sang SPA React + Vite, Tailwind, component hóa.
- **Mobile đồng bộ API:** Luồng auth, menu, cart, orders kết nối backend; hỗ trợ Maps key qua `.env`.

## ⚠️ Breaking/Chú ý nâng cấp
- Cần cập nhật `.env` backend (PAYOS_* và GOOGLE_MAPS_API_KEY). DB name mặc định `fastfood_data`.
- CORS chỉ mở sẵn cho `localhost:3000` và `localhost:8080`; nếu chạy web cổng khác, thêm vào settings.
- Mobile phải chỉnh `BASE_URL` trong `mobile/src/constants/index.ts` để trỏ đúng server và thêm assets Expo (`icon.png`, `splash.png`, ...).

## 🧭 Hướng dẫn nâng cấp
1) **Backend**: tạo venv, cài `requirements.txt`, copy `.env.example` → `.env`, migrate, chạy `python manage.py runserver 0.0.0.0:8000`.
2) **Web**: `cd react-frontend && npm install && npm run dev -- --host --port 3000` (hoặc mở CORS nếu đổi port).
3) **Mobile**: `cd mobile && npm install && npm run start`; thiết lập `BASE_URL` và `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY` nếu dùng Maps.

## 🏁 Trạng thái
v2.0 tập trung hoàn thiện luồng đa vai trò (customer/admin/store/shipper), tích hợp PayOS, và đồng bộ giao diện React/Expo. Hạ tầng sẵn sàng mở rộng thêm realtime (WebSocket) và analytics ở các phiên bản kế tiếp.