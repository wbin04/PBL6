- Chạy lại lệnh backend để cập nhật mới
```
python manage.py makemigrations
python manage.py migrate
```
- nếu lệnh migrate bị lỗi already exists thì thêm --fake ở cuối
- Có thể drop toàn bộ database hiện tại rồi import từ file backup.sql
- chạy backend trước rồi import sau
- Cập nhật giao diện: bổ sung / tối ưu những trang đang còn lỗi hiển thị/ hiển thị không hợp lý
- Test hết toàn bộ chức năng để check lỗi
- Tìm thử thêm các dạng dashboard cho admin/store để được trực quan hơn: dữ liệu cho dashboard được lấy từ backend: backend/app/dashboard/, thông qua api: dashboard/admin và dashboard/store/<store_id>, có thể sửa backend để lấy các dữ liệu khác
- chatbot chưa hoàn thiện logic xử lý - chưa cần sửa

# PayOS Configuration
```
abe250b9-a7e3-43d8-a74b-b8af91886d87 // client id
922376ae-03c4-4397-899f-2ecb5b5ca184 // api key
d49a54bbb6b1eb6c40277b85521acc6fc7fefd2049bbcbffcac0418c0db86bd5 // checksum key

AIzaSyBHgtsGMcGV_1bu4oIgr6Tjs_q66s6O82c // ggmap
```
- sửa lần lượt các key vào trong file backend/.env như backend/.env.example
- trong thư mục mobile tạo 1 file mobile/.env như mobile/.env.example rồi dùng api ggmap như trên
- thử tạo 1 order hoàn thiện từ đầu để test đường đi rồi vào trang shipper xem đường đi
- nếu báo lỗi vị trí thì dữ liệu Địa chỉ của User hoặc store đã đặt đó chưa có dữ liệu đúng, cần vô trang thông tin để chọn lại địa chỉ để cập nhật