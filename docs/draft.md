# Phác thảo dự án PBL6: Hệ thống thông tin

## Tên dự án: **Xây dựng hệ thống cửa hàng bán thức ăn nhanh**

> Nền tảng web & mobile app tìm kiếm, mua bán món ăn với hệ thống quản lý đa cấp độ người dùng.

### Ngôn ngữ & Công nghệ
- AI: Python – phục vụ AI/ML, dễ tích hợp API với backend.
- Web Frontend: ReactJS - TypeScript.
- Web Backend: Python - Django - FastAPI.
- Mobile App: React Native - TypeScript.
- Database: PostgreSQL – lưu trữ:
  - Dữ liệu người dùng, vai trò.
  - Dữ liệu món ăn, giỏ hàng.
  - Lịch sử mua hàng và đánh giá.

## Vai trò và chức năng

### User (Khách hàng)

#### Mô tả
- Khách hàng sử dụng hệ thống để đặt món ăn và theo dõi đơn hàng
- Tài khoản tự đăng ký qua web/mobile với email verification
- Được tự động gán role "Khách hàng" khi đăng ký thành công

#### Quyền hạn
- Chỉ được truy cập và chỉnh sửa dữ liệu cá nhân của mình
- Xem menu công khai và thông tin cửa hàng
- Tạo và quản lý đơn hàng của riêng mình
- Đánh giá món ăn chỉ sau khi hoàn thành đơn hàng
- Không thể truy cập dữ liệu của người dùng khác hoặc admin panel

#### Chức năng chi tiết

##### Tài khoản và bảo mật
- **Đăng ký tài khoản:** email, username, password, fullname, phone_number, address
- **Đăng nhập/Đăng xuất:** JWT authentication với access/refresh tokens
- **Quản lý profile:** Cập nhật thông tin cá nhân
- **Đổi mật khẩu:** Hỗ trợ đổi mật khẩu hoặc tạo mật khẩu mới
- **Bảo mật:** JWT tokens với thời hạn 60 phút (access) và 7 ngày (refresh)

##### Tìm kiếm và duyệt món ăn
- **Xem danh mục:** Danh sách các loại món ăn với hình ảnh minh hoạ
- **Xem món ăn:** Hỗ trợ tìm kiếm theo tên, lọc theo loại món ăn
- **Chi tiết món ăn:** Mô tả đầy đủ, giá, hình ảnh, đánh giá trung bình
- **Xem theo cửa hàng:** Tìm món ăn theo từng cửa hàng cụ thể

##### Quản lý giỏ hàng
- **Thêm vào giỏ:** Thêm món ăn với số lượng tùy chọn
- **Cập nhật giỏ hàng:** Thay đổi số lượng, xóa món khỏi giỏ
- **Xem giỏ hàng:** Tổng tiền tự động tính toán với thuế
- **Xóa giỏ hàng:** Xoá toàn bộ sản phẩm trong giỏ hàng

##### Đặt hàng và thanh toán
- **Tạo đơn hàng:** Từ giỏ hàng với thông tin nhận hàng đầy đủ
- **Áp dụng mã giảm giá:** Liệt kê các mã giảm giá phù hợp
- **Chọn phương thức thanh toán:** COD, VNPay
- **Theo dõi đơn hàng:** Cập nhật liên tục trạng thái mới nhất (Chờ xác nhận → Đã xác nhận → Sẵn sàng → Đang giao → Hoàn thành)

##### Đánh giá món ăn
- **Đánh giá món ăn:** Rating 1-5 sao với nội dung text sau khi hoàn thành đơn hàng
- **Xem đánh giá:** Xem đánh giá trong chi tiết món ăn

### Store Manager (Quản lý cửa hàng)

#### Mô tả
- Quản lý một cửa hàng cụ thể trong hệ thống
- Được admin tạo tài khoản và gán quyền quản lý cửa hàng
- Chịu trách nhiệm về thực đơn và đơn hàng của cửa hàng mình

#### Quyền hạn
- Quản lý thực đơn và món ăn của cửa hàng được gán
- Xử lý đơn hàng từ cửa hàng của mình
- Xem báo cáo doanh thu và thống kê cửa hàng
- Không thể truy cập dữ liệu của cửa hàng khác

#### Chức năng chi tiết

##### Quản lý món ăn
- **CRUD món ăn:** Tạo, sửa, xóa món ăn cho cửa hàng của mình
- **Quản lý tồn kho:** Cập nhật trạng thái của món ăn (Còn hàng/Hết hàng)
- **Upload hình ảnh:** Quản lý hình ảnh mô tả cho món ăn
- **Phân loại thực đơn:** Gán món ăn vào loại phù hợp

##### Quản lý đơn hàng
- **Xem đơn hàng:** Danh sách đơn hàng từ cửa hàng của mình
- **Cập nhật trạng thái:** Thay đổi trạng thái đơn hàng
- **Chi tiết đơn hàng:** Xem đầy đủ thông tin khách hàng và món đã đặt
- **Thống kê đơn hàng:** Báo cáo theo ngày/tháng

##### Quản lý khuyến mãi
- **CRUD mã giảm giá:** Thêm/sửa/xoá thông tin mã giảm giá áp dụng cho cửa hàng

##### Quản lý thống kê
- **Giao diện quản lý:** Biểu đồ trực quan doanh thu theo ngày/tuần/tháng
- **Thống kê doanh thu:** Phân tích doanh thu
- **Quản lý profile cửa hàng:** Cập nhật thông tin, hình ảnh cửa hàng
- **Xuất dữ liệu:** Xuất dữ liệu báo cáo doanh thu (Excel)

### Shipper (Người vận chuyển)

#### Mô tả
- Xem các đơn hàng vừa được tạo bởi khách hàng để xác nhận thực hiện giao hàng
- Được admin tạo tài khoản và gán quyền quản lý cửa hàng
- Chịu trách nhiệm về đơn hàng của mình

#### Quyền hạn
- Chỉ xem các đơn hàng mới của khác hàng và các đơn hàng đã giao của mình
- Không được quyền truy cập dữ liệu cửa hàng và shipper khác

#### Chức năng chi tiết

##### Quản lý đơn hàng
- **Xác nhận đơn hàng:** Thực hiện xác nhận đơn hàng sẽ giao từ bảng danh sách các đơn hàng vửa được tạo
- **Xem đơn hàng:** Xem các đơn hàng mình đã giao

### Admin (Quản lý hệ thống)

#### Mô tả
- Quản trị viên cấp cao nhất của hệ thống
- Có toàn quyền truy cập và quản lý tất cả dữ liệu
- Chịu trách nhiệm vận hành và bảo trì toàn bộ hệ thống

#### Quyền hạn
- Toàn quyền truy cập tất cả dữ liệu và chức năng
- Quản lý người dùng, cửa hàng, đơn hàng của toàn hệ thống

#### Chức năng chi tiết

##### Quản lý người dùng
- **Quản lý khách hàng:** Xem danh sách, chi tiết khách hàng
- **Phân quyền:** Gán quyền cho người dùng

##### Quản lý cửa hàng
- **Phân quyền cửa hàng:** Xem các thông tin của cửa hàng, có thể xoá quyền tạo cửa hàng

##### Quản lý đơn hàng toàn hệ thống
- **Xem tất cả đơn hàng:** Xem toàn bộ đơn hàng của tất cả đơn hàng
- **Can thiệp xử lý:** Có thể huỷ đơn hàng nếu có phát sinh lỗi

##### Quản lý khuyến mãi
- **CRUD mã giảm giá:** Thêm/sửa/xoá thông tin mã giảm giá áp dụng cho toàn hệ thống

##### Quản lý đánh giá
- **Xem đánh giá:** Xem đánh giá tổng quan về cửa hàng

##### Quản lý shipper
- **Phân quyền shippper:** Xem các thông tin của shipper, có thể xoá quyền shipper

##### Quản lý doanh thu - thống kê
- **Dashboard phân tích:** Biểu đồ doanh thu theo cửa hàng
- **Xuất dữ liệu:** Xuất dữ liệu báo cáo doanh thu (Excel)
