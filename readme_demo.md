## Hướng dẫn nhanh cho bản demo (readme_demo.md)

Tài liệu này hướng dẫn cách cài đặt backend, cách chọn backend (local hoặc remote) cho app mobile, và cách cài đặt & chạy ứng dụng mobile (Expo).

## 1. Yêu cầu trước khi cài

- Python 3.8+
- PostgreSQL (nếu chạy backend local)
- Node.js 14+ và npm hoặc yarn (cho mobile)
- Expo CLI (tuỳ chọn, chúng ta dùng npx trong hướng dẫn)

## 2. Cài đặt backend (local) — Windows PowerShell

1) Mở PowerShell, chuyển vào thư mục backend:

```powershell
cd f:\PBL6\backend
```

2) Tạo virtual environment và kích hoạt (PowerShell):

```powershell
python -m venv .venv
.venv\Scripts\Activate.ps1
```

3) Cài dependencies và cấu hình môi trường:

```powershell
pip install -r requirements.txt
copy .env.example .env
# Sau đó mở file .env và sửa DB_NAME, DB_USER, DB_PASSWORD, DB_HOST, DB_PORT, SECRET_KEY, DEBUG
```

4) Tạo và áp dụng migrations, tạo superuser, chạy server:

```powershell
python manage.py makemigrations
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver 0.0.0.0:8000
```

Ghi chú:
- Nếu muốn chỉ nghe trên localhost (chỉ cho máy local), dùng `runserver` mặc định: `python manage.py runserver`.
- Nếu backend dùng PostgreSQL, đảm bảo service đang chạy và các thông tin trong `.env` chính xác.

## 3. Cách chọn backend cho mobile

Ứng dụng mobile dùng `mobile/src/constants/index.ts` để xác định `API_CONFIG.BASE_URL`.

- Cách mặc định (dynamic): file hiện có hàm dò host tự động (tốt cho phát triển với Expo). Trong một số trường hợp bạn muốn ép app dùng một backend cụ thể — làm như sau:

Option A — Dùng backend local (máy phát triển):

1. Nếu bạn chạy Expo trên **thiết bị thật** (điện thoại), bạn cần đặt BASE_URL thành địa chỉ IP máy phát triển (không dùng localhost). Ví dụ máy của bạn có IP 192.168.1.10:

```ts
// mobile/src/constants/index.ts
export const API_CONFIG = {
  BASE_URL: 'http://192.168.1.10:8000/api',
  TIMEOUT: 10000,
  RETRY_ATTEMPTS: 3,
};
```

2. Nếu bạn chạy Android emulator (Android Studio AVD) và server chạy trên máy host, dùng `10.0.2.2` (emulator → host):

```ts
BASE_URL: 'http://10.0.2.2:8000/api'
```

3. Nếu bạn chạy iOS Simulator (macOS), `localhost` thường hoạt động:

```ts
BASE_URL: 'http://localhost:8000/api'
```

Option B — Dùng backend remote (production / staging):

Thay BASE_URL thành URL production, ví dụ:

```ts
BASE_URL: 'https://api.yourdomain.com/api'
```

Option C — Dùng Expo tunnel / LAN (không chỉnh file):

- Khi chạy `npx expo start` bạn có thể chọn `Tunnel` hoặc `LAN` và mở app trên thiết bị qua QR code; Expo sẽ xử lý kết nối tới máy dev. Tuy nhiên đôi khi việc truy cập media (ví dụ `/media/...`) cần đường dẫn tuyệt đối — nếu gặp lỗi, chỉnh `BASE_URL` theo IP như Option A.

Tip: Sau thay đổi `mobile/src/constants/index.ts`, cần reload lại ứng dụng Expo để áp dụng.

## 4. Cài đặt & chạy app mobile (Expo)

1) Mở terminal, chuyển vào thư mục mobile:

```bash
cd f:/PBL6/mobile
```

2) Cài dependencies (npm):

```bash
npm install
# hoặc dùng yarn
yarn
```

3) Chạy Expo (dev):

```bash
npx expo start
# hoặc dùng các script trong package.json
npm run start
npm run android   # mở trực tiếp trên thiết bị/emulator android
npm run ios       # mở trực tiếp trên iOS simulator (macOS)
```

4) Chạy trên thiết bị thật:
- Quét QR code do Expo hiển thị, hoặc dùng ứng dụng Expo Go. Nếu thiết bị và máy dev cùng mạng LAN, app sẽ kết nối tới server dev (hoặc dùng tunnel nếu mạng có NAT/Firewall vấn đề).

5) Build production (tuỳ chọn, cần EAS):

```bash
npm run build:android
npm run build:ios
```

## 5. Kiểm tra nhanh và gỡ lỗi

- Kiểm tra API: mở trình duyệt hoặc Postman tới `http://<BACKEND_HOST>:8000/api/` để xác nhận server bật.
- Nếu app báo lỗi CORS, kiểm tra `CORS_ALLOWED_ORIGINS` trong `backend/fastfood_api/settings.py`.
- Nếu hình ảnh không hiển thị, kiểm tra đường dẫn media: app thường nối `BASE_URL.replace('/api', '') + '/media/...'` để lấy file media.
- Android emulator: nếu không truy cập được `localhost`, đổi thành `10.0.2.2`.

## 6. Ví dụ nhanh: chạy local full-stack

PowerShell (máy dev):

```powershell
# Backend
cd f:\PBL6\backend
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
copy .env.example .env  # chỉnh .env
python manage.py migrate
python manage.py runserver 0.0.0.0:8000

# Mobile (mở terminal khác)
cd f:\PBL6\mobile
npm install
npx expo start
```

Trên máy điện thoại: quét QR code Expo hoặc mở qua LAN/tunnel. Nếu dùng LAN, đảm bảo `mobile/src/constants/index.ts` có `BASE_URL` pointing tới `http://<IP_MAY>:8000/api`.

### Import file database (backup.sql) — chỉ dùng psql

Nếu bạn có file `backup.sql` (ví dụ `f:\PBL6\backup.sql`) và muốn import vào PostgreSQL local, chỉ cần dùng `psql` trên PowerShell như sau.

```powershell
# Ví dụ: file ở F:\PBL6\backup.sql, database tên fastfood_db, user postgres
$env:PGPASSWORD = 'your_db_password'
psql -U postgres -h localhost -p 5432 -d fastfood_db -f "backup.sql"
# Xoá biến môi trường nếu cần
Remove-Item Env:\PGPASSWORD
```

Hoặc chạy `psql` và nhập password khi được hỏi:

```powershell
psql -U postgres -h localhost -p 5432 -d fastfood_db -f "backup.sql"
```

Ghi chú quan trọng:
- Nếu file SQL chứa lệnh `CREATE DATABASE` (dump với `-C`), bạn có thể cần chạy với quyền superuser; nếu file không tạo database, hãy tạo database trước:

```powershell
createdb -U postgres -h localhost -p 5432 fastfood_db
```

- Kiểm tra user/role: đảm bảo `DB_USER` trong `.env` có quyền trên database.
- Nếu `psql` không có trong PATH, thêm đường dẫn tới `PostgreSQL\\<version>\\bin` hoặc dùng đường dẫn đầy đủ tới `psql.exe`.

## 7. Tóm tắt ngắn

- Để đổi backend cho mobile: chỉnh `mobile/src/constants/index.ts` (hoặc dùng Expo tunnel). Nếu kết nối thiết bị thật, dùng IP máy phát triển (không dùng localhost).
- Chạy backend theo hướng dẫn trong thư mục `backend`.
- Chạy mobile bằng `npx expo start` và chọn Android/iOS hoặc quét QR code.

Nếu bạn muốn, tôi có thể:
- Thêm script hoặc biến môi trường để đổi BASE_URL mà không cần sửa code (ví dụ dùng `react-native-dotenv` hoặc cấu hình Expo `extra`).
- Tạo một file `.env.mobile.example` và hướng dẫn rõ ràng cách sử dụng cho nhiều môi trường (dev/staging/prod).

---
File này được tạo để demo nhanh; nếu cần chỉnh ngôn ngữ hoặc bổ sung phần chi tiết (ví dụ bước cấu hình PostgreSQL, script seed data), nói tôi sẽ cập nhật.
