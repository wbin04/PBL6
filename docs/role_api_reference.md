# Tài liệu API Theo Vai Trò

Tài liệu này liệt kê toàn bộ endpoint backend hiện có, được nhóm theo vai trò sử dụng (Khách hàng, Chủ cửa hàng, Người vận chuyển, Quản lý). Mỗi dòng ghi rõ phương thức HTTP, đường dẫn, mô tả bằng tiếng Việt, đồng thời nêu cấu trúc response JSON dựa trên code trong `backend/apps/**/views.py`.

## 1. API dùng chung / Xác thực

| Phương thức | Endpoint | Mục đích | Response (JSON) |
|---|---|---|---|
| POST | `/api/auth/login/` | Đăng nhập, trả về JWT. | Xem “Response mẫu – Đăng nhập”. |
| POST | `/api/auth/register/` | Tạo tài khoản khách hàng mới. | Xem “Response mẫu – Đăng ký”. |
| POST | `/api/auth/refresh/` | Đổi refresh token lấy access token mới. | Xem “Response mẫu – Refresh token”. |
| GET | `/api/auth/profile/` | Lấy thông tin người dùng hiện tại. | Xem “Response mẫu – Thông tin hồ sơ”. |
| PUT | `/api/auth/profile/update/` | Cập nhật hồ sơ (partial update). | Xem “Response mẫu – Thông tin hồ sơ”. |
| POST | `/api/auth/change-password/` | Đổi mật khẩu (yêu cầu đăng nhập, kiểm tra mật khẩu cũ). | Xem “Response mẫu – Đổi mật khẩu”. |
| POST | `/api/auth/reset-password/` | Đặt lại mật khẩu bằng email/tên đăng nhập/số điện thoại. | Xem “Response mẫu – Đặt lại mật khẩu”. |
| POST | `/api/auth/registration/shipper/` | Gửi/ngừng đăng ký làm shipper. | Xem “Response mẫu – Cờ đăng ký shipper”. |
| POST | `/api/auth/registration/store/` | Gửi/ngừng đăng ký mở cửa hàng. | Xem “Response mẫu – Cờ đăng ký cửa hàng”. |
| GET | `/api/auth/registration/status/` | Kiểm tra trạng thái đăng ký shipper/store. | Xem “Response mẫu – Trạng thái đăng ký”. |

> **Lưu ý tọa độ:** Các endpoint đăng ký (`/register/`) và cập nhật hồ sơ (`/profile/update/`) chấp nhận `latitude` và `longitude` dạng số/thập phân và tự động làm tròn 6 chữ số thập phân. Nếu người dùng không gửi tọa độ khi tạo đơn hàng, hệ thống sẽ dùng giá trị đã lưu trong hồ sơ.

#### Response mẫu – Authentication

- Đăng nhập/đăng ký thành công (`POST /api/auth/login/`, `POST /api/auth/register/`):
```json
{
	"refresh": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
	"access": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
	"user": {
		"id": 7,
		"username": "khachhang01",
		"email": "customer@example.com",
		"fullname": "Nguyễn Văn A",
		"phone_number": "0900000000",
		"address": "123 Lê Lợi, Quận 1, TP.HCM",
		"latitude": 10.776523,
		"longitude": 106.700981,
		"created_date": "2025-09-25T14:20:00+07:00",
		"role": "Khách hàng",
		"role_id": 1,
		"is_active": true,
		"is_shipper_registered": false,
		"is_store_registered": false
	}
}
```

- Sai thông tin đăng nhập (`400 Bad Request`):
```json
{
	"error": "Invalid credentials"
}
```

- Refresh token: `POST /api/auth/refresh/`
```json
{
	"access": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9..."
}
```

- Refresh token không hợp lệ:
```json
{
	"error": "Invalid refresh token"
}
```

- Thông tin hồ sơ (`GET/PUT /api/auth/profile/`):
```json
{
	"id": 7,
	"username": "khachhang01",
	"email": "customer@example.com",
	"fullname": "Nguyễn Văn A",
	"phone_number": "0900000000",
	"address": "123 Lê Lợi, Quận 1, TP.HCM",
	"latitude": 10.776523,
	"longitude": 106.700981,
	"created_date": "2025-09-25T14:20:00+07:00",
	"role": "Khách hàng",
	"role_id": 1,
	"is_active": true,
	"is_shipper_registered": false,
	"is_store_registered": true
}
```

- Đặt lại mật khẩu (`POST /api/auth/reset-password/`):
```json
{
	"message": "Đặt lại mật khẩu thành công"
}
```

- Đổi mật khẩu (`POST /api/auth/change-password/`):
```json
{
	"message": "Đổi mật khẩu thành công"
}
```

- Lỗi đổi mật khẩu (ví dụ sai mật khẩu cũ):
```json
{
	"error": "Mật khẩu cũ không đúng"
}
```

- Đặt lại mật khẩu thất bại:
```json
{
	"error": "Không tìm thấy người dùng"
}
```

- Cập nhật cờ đăng ký shipper/cửa hàng (`POST /api/auth/registration/shipper/`, `/store/`):
```json
{
	"message": "Shipper registration status updated successfully",
	"is_shipper_registered": true
}
```

- Trạng thái đăng ký (`GET /api/auth/registration/status/`):
```json
{
	"is_shipper_registered": false,
	"is_store_registered": true
}
```

## 2. API dành cho Khách hàng

### Giỏ hàng (`apps/cart/views.py`)
| Phương thức | Endpoint | Mục đích | Response |
|---|---|---|---|
| GET | `/api/cart/` | Lấy giỏ hàng với chi tiết món, cửa hàng, size. | Xem “Response mẫu – GET /api/cart/”. |
| POST | `/api/cart/add/` | Thêm/cộng dồn món ăn, hỗ trợ topping và ghi chú. | Xem “Response mẫu – POST /api/cart/add/”. |
| PUT / DELETE | `/api/cart/items/<food_id>/` | Cập nhật số lượng/ghi chú hoặc xóa item. | Xem “Response mẫu – PUT/DELETE /api/cart/items/<food_id>/”. |
| DELETE | `/api/cart/items/<food_id>/remove/` | Xóa item theo food_id (alias). | Xem “Response mẫu – DELETE giỏ hàng”. |
| DELETE | `/api/cart/clear/` | Xóa toàn bộ giỏ hàng. | Xem “Response mẫu – DELETE giỏ hàng”. |

#### Response mẫu – Giỏ hàng

- `GET /api/cart/`
```json
{
	"id": 8,
	"total_money": 185000.0,
	"items_count": 2,
	"items": [
		{
			"id": 31,
			"food": {
				"id": 11,
				"title": "Burger Bò Gấp Đôi",
				"description": "Burger bò phô mai",
				"price": 75000.0,
				"image": "assets/foods/burger.png",
				"availability": true,
				"store": {
					"id": 3,
					"store_name": "FastFood ABC",
					"description": "Chuỗi đồ ăn nhanh",
					"image": "assets/store-icon.png"
				}
			},
			"food_id": 11,
			"food_option_id": null,
			"size": null,
			"quantity": 2,
			"item_note": "ít sốt",
			"subtotal": 150000.0
		},
		{
			"id": 32,
			"food": {
				"id": 18,
				"title": "Khoai tây lắc",
				"description": "Khoai giòn",
				"price": 35000.0,
				"image": "assets/foods/fries.png",
				"availability": true,
				"store": {
					"id": 3,
					"store_name": "FastFood ABC",
					"description": "Chuỗi đồ ăn nhanh",
					"image": "assets/store-icon.png"
				}
			},
			"food_id": 18,
			"food_option_id": 5,
			"size": {
				"id": 5,
				"size_name": "L",
				"price": 5000.0
			},
			"quantity": 1,
			"item_note": null,
			"subtotal": 40000.0
		}
	]
}

> Các store trả về đầy đủ `address`, `latitude`, `longitude` để phía client hiển thị vị trí chính xác hoặc dùng cho phép đo quãng đường.
```

- `POST /api/cart/add/`
```json
{
	"message": "Added Burger Bò Gấp Đôi to cart",
	"item": {
		"food": {
			"id": 11,
			"title": "Burger Bò Gấp Đôi",
			"price": 75000.0,
			"image": "assets/foods/burger.png"
		},
		"food_id": 11,
		"food_option_id": null,
		"quantity": 2,
		"item_note": "ít sốt",
		"toppings_added": [
			{
				"food_id": 25,
				"title": "Phô mai",
				"quantity": 1
			}
		]
	}
}
```

- `PUT /api/cart/items/<food_id>/`
```json
{
	"message": "Cart item updated",
	"item": {
		"food": {
			"id": 11,
			"title": "Burger Bò Gấp Đôi",
			"price": 75000.0,
			"image": "assets/foods/burger.png"
		},
		"food_id": 11,
		"quantity": 1,
		"item_note": "không hành",
		"subtotal": 75000.0
	}
}
```

- Các thao tác xóa (`DELETE /api/cart/items/<food_id>/`, `/remove/`, `/api/cart/clear/`)
```json
{
	"message": "Item removed from cart"
}
```

- `DELETE /api/cart/clear/`
```json
{
	"message": "Cart cleared"
}
```

### Menu / Thực đơn (`apps/menu/views.py`)
| Phương thức | Endpoint | Mục đích | Response |
|---|---|---|---|
| GET | `/api/menu/categories/` | Danh sách danh mục. | Xem “Response mẫu – Danh mục”. |
| GET | `/api/menu/stores/` | Danh sách cửa hàng public. | Xem “Response mẫu – Danh sách cửa hàng”. |
| GET | `/api/menu/items/` | Danh sách món + bộ lọc (category, store, search, price, sort). | Xem “Response mẫu – Danh sách món”. |
| GET | `/api/menu/search/?q=` | Tìm kiếm món và nhóm theo cửa hàng (trả về danh sách cửa hàng + các món khớp). | Xem “Response mẫu – Tìm kiếm món theo cửa hàng”. |
| GET | `/api/menu/items/<id>/` | Chi tiết món ăn. | Xem “Response mẫu – Chi tiết món”. |
| GET | `/api/menu/categories/<category_id>/foods/` | Món theo danh mục, có phân trang. | Xem “Response mẫu – Món theo danh mục”. |

#### Response mẫu – Menu

- `GET /api/menu/categories/`
```json
{
	"count": 4,
	"next": null,
	"previous": null,
	"results": [
		{
			"id": 2,
			"name": "Burger",
			"cate_name": "Burger",
			"image": "assets/categories/burger.png",
			"image_url": "http://localhost:8000/media/assets/categories/burger.png",
			"foods_count": 12
		}
	]
}
```

- `GET /api/menu/stores/`
```json
{
	"count": 2,
	"next": null,
	"previous": null,
	"results": [
		{
			"id": 3,
			"store_name": "FastFood ABC",
			"image": "assets/store-icon.png",
			"description": "Chuỗi đồ ăn nhanh",
			"address": "12 Nguyễn Huệ, Quận 1",

- `GET /api/menu/search/?q=burger`
```json
{
	"query": "burger",
	"total_stores": 2,
	"total_foods": 3,
	"results": [
		{
			"store_id": 3,
			"store_name": "FastFood ABC",
			"store_image": "http://localhost:8000/media/assets/stores/logo.png",
			"foods": [
				{ "id": 11, "title": "Burger Bò Gấp Đôi", "price": 75000.0, "image": "http://localhost:8000/media/assets/foods/burger.png" }
			]
		},
		{
			"store_id": 4,
			"store_name": "Burger King",
			"store_image": null,
			"foods": [
				{ "id": 21, "title": "Burger Gà", "price": 65000.0, "image": null },
				{ "id": 22, "title": "Burger Phô Mai", "price": 70000.0, "image": null }
			]
		}
	]
}
```
			"latitude": 10.773281,
			"longitude": 106.704147,
			"manager": "storemanager01"
		}
	]
}
```

- `GET /api/menu/items/`
```json
{
	"count": 25,
	"num_pages": 3,
	"current_page": 1,
	"has_next": true,
	"has_previous": false,
	"results": [
		{
			"id": 11,
			"title": "Burger Bò Gấp Đôi",
			"description": "Burger bò phô mai",
			"price": 75000.0,
			"image": "assets/foods/burger.png",
			"image_url": "http://localhost:8000/media/assets/foods/burger.png",
			"category": {
				"id": 2,
				"name": "Burger",
				"cate_name": "Burger",
				"image": "assets/categories/burger.png",
				"image_url": "http://localhost:8000/media/assets/categories/burger.png",
				"foods_count": 12
			},
			"category_name": "Burger",
			"store": {
				"id": 3,
				"store_name": "FastFood ABC",
				"image": "assets/store-icon.png",
				"description": "Chuỗi đồ ăn nhanh",
				"manager": "storemanager01"
			},
			"store_name": "FastFood ABC",
			"availability": true,
			"sizes": [
				{
					"id": 5,
					"size_name": "L",
					"price": 15000.0,
					"food": 11
				}
			],
			"average_rating": 4.6,
			"rating_count": 24
		}
	]
}
```

- `GET /api/menu/items/<id>/`
```json
{
	"id": 11,
	"title": "Burger Bò Gấp Đôi",
	"description": "Burger bò phô mai",
	"price": 75000.0,
	"image": "assets/foods/burger.png",
	"image_url": "http://localhost:8000/media/assets/foods/burger.png",
	"category": {
		"id": 2,
		"name": "Burger",
		"cate_name": "Burger",
		"image": "assets/categories/burger.png",
		"image_url": "http://localhost:8000/media/assets/categories/burger.png",
		"foods_count": 12
	},
	"category_id": 2,
	"store": {
		"id": 3,
		"store_name": "FastFood ABC",
		"image": "assets/store-icon.png",
		"description": "Chuỗi đồ ăn nhanh",
		"manager": "storemanager01"
	},
	"store_id": 3,
	"availability": true,
	"sizes": [
		{
			"id": 4,
			"size_name": "M",
			"price": 0.0,
			"food": 11
		},
		{
			"id": 5,
			"size_name": "L",
			"price": 15000.0,
			"food": 11
		}
	],
	"average_rating": 4.6,
	"rating_count": 24
}
```

- `GET /api/menu/categories/<category_id>/foods/`
```json
{
	"category": {
		"id": 2,
		"name": "Burger",
		"cate_name": "Burger",
		"image": "assets/categories/burger.png",
		"image_url": "http://localhost:8000/media/assets/categories/burger.png",
		"foods_count": 12
	},
	"count": 12,
	"num_pages": 2,
	"current_page": 1,
	"has_next": true,
	"has_previous": false,
	"results": [
		{ "id": 11, "title": "Burger Bò Gấp Đôi", "price": 75000.0, "store_name": "FastFood ABC" }
	]
}
```

### Đơn hàng (`apps/orders/views.py`)
| Phương thức | Endpoint | Mục đích | Response |
|---|---|---|---|
| GET | `/api/orders/` | Lịch sử đơn của khách (lọc theo `status`). | Xem “Response mẫu – GET /api/orders/”. |
| POST | `/api/orders/` | Tạo đơn mới từ giỏ (tách theo cửa hàng, hỗ trợ nhiều voucher). | Xem “Response mẫu – POST /api/orders/”. |
| GET | `/api/orders/<id>/` | Chi tiết đơn cụ thể (của chính khách). | Xem “Response mẫu – Order chi tiết”. |
| PUT | `/api/orders/<id>/` | Cập nhật thông tin nhận hàng khi trạng thái còn `Chờ xác nhận`. | Xem “Response mẫu – Order chi tiết”. |
| PUT | `/api/orders/<id>/status/` | Khách tự hủy đơn (`{"order_status":"Đã huỷ","cancel_reason":"..."}`). | Xem “Response mẫu – Hủy đơn”. |
| POST | `/api/orders/<id>/cancel-group/` | Hủy nhóm đơn (group_id). | Xem “Response mẫu – Hủy nhóm đơn”. |

> **Yêu cầu tọa độ & phí ship:** Payload `POST /api/orders/` bắt buộc truyền `ship_latitude` và `ship_longitude` (float hoặc chuỗi số). Nếu không gửi, backend sẽ dùng tọa độ đã lưu trong hồ sơ khách hàng. Mỗi cửa hàng được tạo thành một order riêng, hệ thống gọi Google Directions (fallback Haversine) để tính `distance_km`, lưu `route_polyline` và tính `shipping_fee = SHIPPING_BASE_FEE + SHIPPING_FEE_PER_KM * distance_km` (giá trị cấu hình trong `settings.py`, mặc định 15,000đ + 4,000đ/km).

#### Payload mẫu – `POST /api/orders/`
```json
{
	"receiver_name": "Nguyễn Văn A",
	"phone_number": "0900000000",
	"ship_address": "123 Lê Lợi, Quận 1",
	"ship_latitude": 10.777102,
	"ship_longitude": 106.698542,
	"note": "Giao giờ trưa",
	"payment_method": "COD",
	"promo_ids": [3, 12],
	"promo_details": [
		{ "promo_id": 3, "store_id": 0, "discount": 15000 },
		{ "promo_id": 12, "store_id": 3, "discount": 5000 }
	],
	"discount_amount": 20000
}
```

#### Response mẫu – Đơn hàng

- `GET /api/orders/`
```json
{
	"count": 4,
	"num_pages": 1,
	"current_page": 1,
	"has_next": false,
	"has_previous": false,
	"results": [
		{
			"id": 102,
			"order_status": "Chờ xác nhận",
			"delivery_status": "Chờ xác nhận",
			"total_money": 150000.0,
			"payment_method": "COD",
			"receiver_name": "Nguyễn Văn A",
			"shipper": null,
			"items_count": 2,
			"created_date": "2025-11-18T10:30:00+07:00",
			"cancel_reason": null,
			"cancelled_date": null,
			"cancelled_by_role": null
		}
	]
}
```

- `POST /api/orders/`
```json
{
	"message": "Đã tạo 2 đơn hàng cho 2 cửa hàng",
	"group_id": 150,
	"orders": [
		{
			"id": 150,
			"user": {
				"id": 7,
				"username": "khachhang01",
				"fullname": "Nguyễn Văn A",
				"phone_number": "0900000000",
				"email": "customer@example.com",
				"address": "123 Lê Lợi, Quận 1, TP.HCM",
				"latitude": 10.776523,
				"longitude": 106.700981,
				"created_date": "2025-09-25T14:20:00+07:00",
				"role": "Khách hàng",
				"role_id": 1,
				"is_active": true,
				"is_shipper_registered": false,
				"is_store_registered": false
			},
			"order_status": "Chờ xác nhận",
			"delivery_status": "Chờ xác nhận",
			"total_money": 150000.0,
			"payment_method": "COD",
			"receiver_name": "Nguyễn Văn A",
			"phone_number": "0900000000",
			"ship_address": "123 Lê Lợi, Quận 1",
			"ship_latitude": 10.777102,
			"ship_longitude": 106.698542,
			"note": "Giao giờ trưa",
			"promo": 3,
			"shipper": null,
			"shipper_id": null,
			"shipping_fee": 15000.0,
			"route_polyline": "mfp_IvnthS_@d@qA|@qDnBkF",
			"group_id": 150,
			"cancel_reason": null,
			"cancelled_date": null,
			"cancelled_by_role": null,
			"store_id": 3,
			"store_name": "FastFood ABC",
			"store_info_id": 3,
			"store_image": "assets/store-icon.png",
			"store_address": "12 Nguyễn Huệ, Quận 1",
			"store_latitude": 10.773281,
			"store_longitude": 106.704147,
			"items": [
				{
					"id": "150_11_0",
					"food": {
						"id": 11,
						"title": "Burger Bò Gấp Đôi",
						"price": 75000.0,
						"store_name": "FastFood ABC"
					},
					"food_option": null,
					"quantity": 2,
					"food_price": 75000.0,
					"food_option_price": null,
					"food_note": "ít sốt",
					"subtotal": 150000.0,
					"size_display": "",
					"price_breakdown": [
						{
							"type": "food",
							"name": "Burger Bò Gấp Đôi",
							"display": "Burger Bò Gấp Đôi 75,000đ",
							"price": 75000.0,
							"quantity": 2,
							"total": 150000.0
						}
					]
				}
			],
			"is_rated": false,
			"created_date": "2025-11-18T10:30:00+07:00",
			"promo_discount": 20000.0,
			"applied_promos": [
				{
					"id": 12,
					"order": 150,
					"promo": 3,
					"promo_name": "Giảm 20k",
					"applied_amount": "20000.00",
					"note": "Store 3",
					"created_at": "2025-11-18T10:30:00+07:00"
				}
			],
			"total_before_discount": 165000.0,
			"total_discount": 20000.0,
			"total_after_discount": 145000.0
		}
	]
}
```

- `GET/PUT /api/orders/<id>/`
```json
{
	"id": 150,
	"user": {
		"id": 7,
		"username": "khachhang01",
		"fullname": "Nguyễn Văn A",
		"phone_number": "0900000000",
		"email": "customer@example.com",
		"address": "123 Lê Lợi, Quận 1, TP.HCM",
		"latitude": 10.776523,
		"longitude": 106.700981,
		"created_date": "2025-09-25T14:20:00+07:00",
		"role": "Khách hàng",
		"role_id": 1,
		"is_active": true,
		"is_shipper_registered": false,
		"is_store_registered": false
	},
	"order_status": "Chờ xác nhận",
	"delivery_status": "Chờ xác nhận",
	"total_money": 150000.0,
	"payment_method": "COD",
	"receiver_name": "Nguyễn Văn A",
	"phone_number": "0900000000",
	"ship_address": "123 Lê Lợi, Quận 1",
	"ship_latitude": 10.777102,
	"ship_longitude": 106.698542,
	"note": "Giao giờ trưa",
	"promo": 3,
	"shipper": null,
	"shipper_id": null,
	"shipping_fee": 15000.0,
	"route_polyline": "mfp_IvnthS_@d@qA|@qDnBkF",
	"group_id": 150,
	"cancel_reason": null,
	"cancelled_date": null,
	"cancelled_by_role": null,
	"store_id": 3,
	"store_name": "FastFood ABC",
	"store_info_id": 3,
	"store_image": "assets/store-icon.png",
	"store_address": "12 Nguyễn Huệ, Quận 1",
	"store_latitude": 10.773281,
	"store_longitude": 106.704147,
	"items": [
		{
			"id": "150_11_0",
			"food": {
				"id": 11,
				"title": "Burger Bò Gấp Đôi",
				"price": 75000.0,
				"store_name": "FastFood ABC"
			},
			"food_option": null,
			"quantity": 2,
			"food_price": 75000.0,
			"food_option_price": null,
			"food_note": "ít sốt",
			"subtotal": 150000.0,
			"size_display": "",
			"price_breakdown": [
				{
					"type": "food",
					"name": "Burger Bò Gấp Đôi",
					"display": "Burger Bò Gấp Đôi 75,000đ",
					"price": 75000.0,
					"quantity": 2,
					"total": 150000.0
				}
			]
		}
	],
	"is_rated": false,
	"created_date": "2025-11-18T10:30:00+07:00",
	"promo_discount": 20000.0,
	"applied_promos": [],
	"total_before_discount": 165000.0,
	"total_discount": 20000.0,
	"total_after_discount": 145000.0
}
```

- Hủy một đơn (`PUT /api/orders/<id>/status/`)
```json
{
	"id": 150,
	"order_status": "Đã huỷ",
	"delivery_status": "Chờ xác nhận",
	"cancel_reason": "Đổi ý",
	"cancelled_date": "2025-11-18T10:45:00+07:00",
	"cancelled_by_role": "Khách hàng",
	"total_money": 150000.0,
	"shipping_fee": 15000.0,
	"total_before_discount": 165000.0,
	"total_discount": 20000.0,
	"total_after_discount": 145000.0
}
```

- Hủy nhóm đơn (`POST /api/orders/<id>/cancel-group/`)
	- Bước xác nhận:
```json
{
	"requires_confirmation": true,
	"group_orders": [
		{
			"id": 150,
			"store_name": "FastFood ABC",
			"total_money": 150000.0,
			"order_status": "Chờ xác nhận"
		},
		{
			"id": 151,
			"store_name": "Trà Sữa XYZ",
			"total_money": 90000.0,
			"order_status": "Chờ xác nhận"
		}
	],
	"total_orders": 2,
	"message": "Bạn sắp hủy 2 đơn hàng. Xác nhận để tiếp tục."
}
```
	- Sau khi xác nhận:
```json
{
	"message": "Đã hủy thành công 2 đơn hàng trong nhóm",
	"cancelled_orders": [150, 151]
}
```

> **Thông tin vận chuyển trong response:**
> - `ship_latitude`/`ship_longitude`: Tọa độ giao hàng cuối cùng mà backend đã dùng để tính phí ship.
> - `store_latitude`/`store_longitude`: Tọa độ cửa hàng lấy hàng, phục vụ hiển thị bản đồ và tính quãng đường thực tế.
> - `route_polyline`: Chuỗi polyline Google Directions (khi có API key) để FE/ứng dụng shipper vẽ đường đi giống thực tế; tự động rỗng khi chỉ có khoảng cách Haversine.
> - `total_before_discount`, `total_discount`, `total_after_discount`: Cho biết tổng tiền từng đơn đã cộng phí ship và mức giảm theo từng store; chi tiết từng voucher nằm trong `applied_promos`.

### Đánh giá món (`apps/ratings/views.py`)
| Phương thức | Endpoint | Mục đích | Response |
|---|---|---|---|
| GET | `/api/ratings/` | Lấy danh sách đánh giá theo `food` hoặc `order`. | Xem “Response mẫu – Đánh giá món”. |
| POST | `/api/ratings/` | Khách đã mua tạo đánh giá. | Xem “Response mẫu – Đánh giá món”. |
| GET/PUT/DELETE | `/api/ratings/<id>/` | Xem/chỉnh/sửa/xóa đánh giá của chính mình. | Xem “Response mẫu – Đánh giá món”. |

#### Response mẫu – Đánh giá món

- `GET /api/ratings/?food=11`
```json
[
	{
		"username": "khachhang01",
		"rating": 5,
		"content": "Burger ngon, giao nhanh"
	},
	{
		"username": "thienan",
		"rating": 4,
		"content": "Ổn nhưng hơi ít sốt"
	}
]
```

- `POST /api/ratings/`
```json
{
	"id": 25,
	"food": 11,
	"order": 150,
	"user": 7,
	"rating": 5,
	"content": "Quá ngon"
}
```

- Lỗi xác thực khi chưa đăng nhập
```json
{
	"detail": "Authentication required"
}
```

- `GET/PUT /api/ratings/25/`
```json
{
	"id": 25,
	"food": 11,
	"order": 150,
	"user": 7,
	"rating": 4,
	"content": "Đổi ý, món hơi nguội"
}
```

- `DELETE /api/ratings/25/`
	- Trả về `204 No Content` không có body.

### Khuyến mãi cho khách (`apps/promotions/views.py`)
| Phương thức | Endpoint | Mục đích | Response |
|---|---|---|---|
| GET | `/api/promotions/` | Khách xem các mã còn hạn (Store Manager xem toàn bộ mã thuộc cửa hàng mình). | Xem “Response mẫu – Khuyến mãi khách”. |
| POST | `/api/promotions/validate/` | Kiểm tra voucher với tổng tiền. | Xem “Response mẫu – Khuyến mãi khách”. |

#### Response mẫu – Khuyến mãi khách

- `GET /api/promotions/?store=3`
```json
[
	{
		"id": 3,
		"name": "Giảm 20k",
		"scope": "STORE",
		"discount_type": "PERCENT",
		"category": "PERCENT",
		"discount_value": "20.00",
		"minimum_pay": "150000.00",
		"max_discount_amount": "20000.00",
		"start_date": "2025-11-01T00:00:00+07:00",
		"end_date": "2025-12-01T23:59:59+07:00",
		"store": 3,
		"store_id": 3,
		"store_name": "FastFood ABC",
		"is_active": true,
		"percent": "20.00",
		"description": "Giảm 20% tối đa 20k"
	}
]
```

- `POST /api/promotions/validate/`
```json
{
	"valid": true,
	"discount_amount": "20000.00",
	"final_amount": "145000.00",
	"promo": {
		"id": 3,
		"name": "Giảm 20k",
		"scope": "STORE",
		"discount_type": "PERCENT",
		"discount_value": "20.00",
		"minimum_pay": "150000.00",
		"max_discount_amount": "20000.00",
		"store_id": 3,
		"store_name": "FastFood ABC"
	}
}
```

- Không đủ điều kiện tối thiểu
```json
{
	"valid": false,
	"error": "Minimum order amount is 150,000 VND"
}
```

- Mã hết hạn/không tồn tại
```json
{
	"valid": false,
	"error": "Invalid or expired promo code"
}
```

### Thanh toán (`apps/payments/views.py`)
| Phương thức | Endpoint | Mục đích | Response |
|---|---|---|---|
| POST | `/api/payments/create/` | API mô phỏng xác nhận thanh toán COD. | Xem “Response mẫu – Thanh toán”. |
| POST | `/api/payments/payos/create-link/` | Tạo link PayOS (yêu cầu đăng nhập). | Xem “Response mẫu – Thanh toán”. |
| POST | `/api/payments/payos/check-status/` | Kiểm tra trạng thái link PayOS. | Xem “Response mẫu – Thanh toán”. |
| GET | `/api/payments/payos-return` | Trang HTML thông báo khi PayOS redirect. | Xem “Response mẫu – Thanh toán”. |
| POST | `/api/payments/webhook/` | Webhook giả lập cho PayOS. | Xem “Response mẫu – Thanh toán”. |

#### Response mẫu – Thanh toán

- `POST /api/payments/create/`
```json
{
	"message": "Payment method COD for order 150 processed",
	"method": "COD",
	"status": "success"
}
```

- `POST /api/payments/payos/create-link/`
```json
{
	"checkoutUrl": "https://payos.vn/link/abcdef",
	"status": "CREATED",
	"orderCode": 150230789
}
```

- Yêu cầu lại khi link cũ còn hiệu lực
```json
{
	"checkoutUrl": "https://payos.vn/link/abcdef",
	"status": "PENDING",
	"orderCode": 150
}
```

- `POST /api/payments/payos/check-status/`
```json
{
	"orderCode": 150230789,
	"status": "PENDING",
	"paid": false
}
```

- `GET /api/payments/payos-return`
```html
<!DOCTYPE html>
<html>
	<body>
		<h1 class="success">✓ Thanh toán thành công!</h1>
		<p>Mã đơn hàng: 150230789</p>
	</body>
</html>
```

- `POST /api/payments/webhook/`
```json
{
	"success": true
}
```

### Chatbot (`apps/chatbot/views.py`)
| Phương thức | Endpoint | Mục đích | Response |
|---|---|---|---|
| POST | `/api/chatbot/chat/` | Nhắn tin với chatbot (FAQ, gợi ý). | Xem “Response mẫu – Chatbot”. |
| GET | `/api/chatbot/cart/` | Chatbot đọc giỏ hàng. | Xem “Response mẫu – Chatbot”. |
| DELETE | `/api/chatbot/cart/clear/` | Chatbot xóa giỏ hàng giúp người dùng. | Xem “Response mẫu – Chatbot”. |
| GET | `/api/chatbot/menu/` | Trả về danh sách món gọn nhẹ. | Xem “Response mẫu – Chatbot”. |

#### Response mẫu – Chatbot

- `POST /api/chatbot/chat/`
```json
{
	"reply": "🔥 Top món bán chạy: 1. Burger Bò Gấp Đôi ...\nBạn muốn đặt món nào?",
	"intent": "popular_items",
	"data": {
		"foods": [
			{
				"id": 11,
				"title": "Burger Bò Gấp Đôi",
				"price": "75000",
				"store_id": 3,
				"store_name": "FastFood ABC",
				"sizes": []
			}
		],
		"query_type": "popular"
	}
}
```

- `GET /api/chatbot/cart/?session_id=abc123`
```json
{
	"cart": [
		{
			"id": 41,
			"food": 11,
			"food_name": "Burger Bò Gấp Đôi",
			"food_price": "75000.00",
			"food_size": null,
			"size_name": null,
			"size_price": null,
			"quantity": 2,
			"store_name": "FastFood ABC",
			"total_price": "150000.00"
		}
	],
	"total": 150000,
	"count": 1
}
```

- `DELETE /api/chatbot/cart/clear/`
```json
{
	"message": "Cart cleared successfully"
}
```

- `GET /api/chatbot/menu/`
```json
{
	"menu": [
		{
			"id": 11,
			"name": "Burger Bò Gấp Đôi",
			"price": 75000.0,
			"description": "Burger bò phô mai",
			"store_id": 3,
			"store_name": "FastFood ABC",
			"category": "Burger",
			"sizes": [
				{ "name": "M", "price": 0.0 },
				{ "name": "L", "price": 15000.0 }
			]
		}
	]
}
```

## 3. API cho Chủ cửa hàng

### Quản lý cửa hàng (`apps/stores/views.py`)
| Phương thức | Endpoint | Mục đích | Response |
|---|---|---|---|
| GET | `/api/stores/` | DRF ModelViewSet: Admin xem tất cả, chủ cửa hàng chỉ thấy cửa hàng của mình. | Xem “Response mẫu – Quản lý cửa hàng”. |
| POST | `/api/stores/` | Admin tạo cửa hàng mới (gán manager). | Xem “Response mẫu – Quản lý cửa hàng”. |
| GET | `/api/stores/<id>/` | Lấy thông tin cửa hàng. | Xem “Response mẫu – Quản lý cửa hàng”. |
| PUT/PATCH/DELETE | `/api/stores/<id>/` | Cập nhật hoặc xóa cửa hàng. | Xem “Response mẫu – Quản lý cửa hàng”. |
| GET | `/api/stores/my_store/` | Chủ cửa hàng xem cửa hàng mình quản lý. | Xem “Response mẫu – Quản lý cửa hàng”. |
| GET | `/api/stores/<id>/foods/` | Danh sách món thuộc cửa hàng, có phân trang. | Xem “Response mẫu – Menu cửa hàng”. |
| GET | `/api/stores/<id>/orders/` | Toàn bộ đơn có món thuộc cửa hàng này. | Xem “Response mẫu – Đơn hàng”. |
| PATCH | `/api/stores/<id>/orders/<order_id>/status/` | Cập nhật trạng thái đơn ở riêng cửa hàng đó. | Xem “Response mẫu – Đơn hàng”. |
| GET | `/api/stores/<id>/stats/` | Thống kê: số món, số đơn, doanh thu, điểm trung bình. | Xem “Response mẫu – Quản lý cửa hàng”. |

#### Response mẫu – Quản lý cửa hàng

- `GET /api/stores/`
```json
{
	"count": 2,
	"next": null,
	"previous": null,
	"results": [
		{
			"id": 3,
			"store_name": "FastFood ABC",
			"image": "assets/store-icon.png",
			"description": "Chuỗi đồ ăn nhanh",
			"manager": "storemanager01"
		}
	]
}
```

- `POST /api/stores/`
```json
{
	"id": 5,
	"store_name": "Trà Sữa XYZ",
	"image": null,
	"description": "Chi nhánh mới",
	"manager": "storemanager02"
}
```

- `GET /api/stores/3/`
```json
{
	"id": 3,
	"store_name": "FastFood ABC",
	"image": "assets/store-icon.png",
	"description": "Chuỗi đồ ăn nhanh",
	"manager": "storemanager01"
}
```

- `DELETE /api/stores/5/` → `204 No Content`

- `GET /api/stores/3/stats/`
```json
{
	"total_foods": 25,
	"total_orders": 180,
	"total_revenue": 125000000.0,
	"average_rating": 4.5,
	"total_ratings": 94
}
```

### Quản lý món dành cho cửa hàng (`apps/menu/views.py`)
| Phương thức | Endpoint | Mục đích | Response |
|---|---|---|---|
| GET | `/api/menu/store/foods/` | Chủ cửa hàng xem danh sách món (lọc search, category). | Xem “Response mẫu – Menu cửa hàng”. |
| GET/PUT/DELETE | `/api/menu/store/foods/<food_id>/` | Lấy/cập nhật/xóa món của cửa hàng mình, hỗ trợ upload ảnh. | Xem “Response mẫu – Menu cửa hàng”. |
| GET | `/api/menu/store/foods/<food_id>/sizes/` | Danh sách size của món (áp dụng cho topping/option). | Xem “Response mẫu – Menu cửa hàng”. |
| GET | `/api/menu/store/foods/<food_id>/sizes/<size_id>/` | Chi tiết size cụ thể. | Xem “Response mẫu – Menu cửa hàng”. |

#### Response mẫu – Menu cửa hàng

- `GET /api/menu/store/foods/?page=1`
```json
{
	"count": 15,
	"num_pages": 2,
	"current_page": 1,
	"has_next": true,
	"has_previous": false,
	"next": "?page=2",
	"previous": null,
	"results": [
		{
			"id": 11,
			"title": "Burger Bò Gấp Đôi",
			"description": "Burger bò phô mai",
			"price": 75000.0,
			"image": "assets/foods/burger.png",
			"image_url": "http://localhost:8000/media/assets/foods/burger.png",
			"category": {
				"id": 2,
				"name": "Burger",
				"cate_name": "Burger"
			},
			"category_name": "Burger",
			"store": {
				"id": 3,
				"store_name": "FastFood ABC",
				"image": "assets/store-icon.png",
				"description": "Chuỗi đồ ăn nhanh",
				"manager": "storemanager01"
			},
			"store_name": "FastFood ABC",
			"availability": true,
			"sizes": []
		}
	],
	"foods": [
		{
			"id": 11,
			"title": "Burger Bò Gấp Đôi",
			"price": 75000.0,
			"store_name": "FastFood ABC"
		}
	],
	"total_pages": 2,
	"total_foods": 15
}
```

- `GET /api/menu/store/foods/11/`
```json
{
	"id": 11,
	"title": "Burger Bò Gấp Đôi",
	"description": "Burger bò phô mai",
	"price": 75000.0,
	"image": "assets/foods/burger.png",
	"category": {
		"id": 2,
		"name": "Burger",
		"cate_name": "Burger"
	},
	"store": {
		"id": 3,
		"store_name": "FastFood ABC",
		"image": "assets/store-icon.png",
		"description": "Chuỗi đồ ăn nhanh",
		"manager": "storemanager01"
	},
	"availability": true,
	"sizes": [
		{
			"id": 4,
			"size_name": "M",
			"price": 0.0,
			"food": 11
		},
		{
			"id": 5,
			"size_name": "L",
			"price": 15000.0,
			"food": 11
		}
	]
}
```

- `PUT /api/menu/store/foods/11/`
```json
{
	"id": 11,
	"title": "Burger Bò Gấp Đôi",
	"price": 79000.0,
	"availability": true,
	"store": 3
}
```

- `GET /api/menu/store/foods/11/sizes/`
```json
[
	{
		"id": 4,
		"size_name": "M",
		"price": 0.0,
		"food": 11
	},
	{
		"id": 5,
		"size_name": "L",
		"price": 15000.0,
		"food": 11
	}
]
```

- `GET /api/menu/store/foods/11/sizes/5/`
```json
{
	"id": 5,
	"size_name": "L",
	"price": 15000.0,
	"food": 11
}
```

### Khuyến mãi cửa hàng (`apps/promotions/views.py`)
| Phương thức | Endpoint | Mục đích | Response |
|---|---|---|---|
| POST | `/api/promotions/create/` | Chủ cửa hàng tạo mã giảm giá cho riêng cửa hàng. | Xem “Response mẫu – Khuyến mãi cửa hàng”. |
| GET | `/api/promotions/<id>/` | Xem chi tiết mã (chỉ truy cập khi thuộc cửa hàng mình). | Xem “Response mẫu – Khuyến mãi cửa hàng”. |
| PUT | `/api/promotions/<id>/update/` | Cập nhật thông tin mã. | Xem “Response mẫu – Khuyến mãi cửa hàng”. |
| DELETE | `/api/promotions/<id>/delete/` | Xóa mã. | Xem “Response mẫu – Khuyến mãi cửa hàng”. |

#### Response mẫu – Khuyến mãi cửa hàng

- `POST /api/promotions/create/`
```json
{
	"id": 6,
	"name": "Giảm 30k",
	"scope": "STORE",
	"discount_type": "AMOUNT",
	"discount_value": "30000.00",
	"minimum_pay": "200000.00",
	"max_discount_amount": null,
	"start_date": "2025-11-20T00:00:00+07:00",
	"end_date": "2025-12-31T23:59:59+07:00",
	"store": 3,
	"store_id": 3,
	"store_name": "FastFood ABC",
	"is_active": true,
	"description": "Giảm trực tiếp 30k"
}
```

- `GET /api/promotions/6/`
```json
{
	"id": 6,
	"name": "Giảm 30k",
	"scope": "STORE",
	"discount_type": "AMOUNT",
	"discount_value": "30000.00",
	"minimum_pay": "200000.00",
	"store_id": 3,
	"store_name": "FastFood ABC",
	"is_active": true
}
```

- `PUT /api/promotions/6/update/`
```json
{
	"id": 6,
	"name": "Giảm 35k",
	"discount_value": "35000.00",
	"minimum_pay": "200000.00",
	"store_id": 3,
	"store_name": "FastFood ABC"
}
```

- `DELETE /api/promotions/6/delete/`
```json
{
	"success": true,
	"message": "Promotion \"Giảm 35k\" deleted successfully"
}
```

### Quyền truy cập trang quản lý đơn (`apps/orders/views.py`)
- `GET /api/orders/admin/`: khi người dùng có vai trò Cửa hàng, hệ thống tự lọc chỉ còn các đơn chứa món thuộc cửa hàng đó. Response: Xem “Response mẫu – Đơn hàng”.
- `PATCH /api/orders/admin/<pk>/status/`: body `{"order_status": "...", "cancel_reason": "..."}` → trả về `OrderSerializer` (Xem “Response mẫu – Đơn hàng”) với `cancelled_by_role = "Cửa hàng"` khi hủy.

## 4. API cho Người vận chuyển (Shipper)

### Quy trình nhận và giao đơn (`apps/orders/views.py`)
| Phương thức | Endpoint | Mục đích | Response |
|---|---|---|---|
| GET | `/api/orders/?shipper__isnull=true&delivery_status=Chờ xác nhận` | Xem danh sách đơn chưa có shipper. | Xem “Response mẫu – Đơn Shipper”. |
| POST | `/api/orders/shipper/<order_id>/accept/` | Nhận đơn; set `delivery_status = "Đã xác nhận"`. | Xem “Response mẫu – Đơn Shipper”. |
| GET | `/api/orders/shipper/` | Danh sách đơn đã phân cho shipper hiện tại (lọc theo `delivery_status` hoặc `status`). | Xem “Response mẫu – Đơn Shipper”. |
| PUT | `/api/orders/shipper/<order_id>/status/` | Cập nhật từng bước giao hàng (`Chờ xác nhận` → `Đã xác nhận` → `Đã lấy hàng` → `Đang giao` → `Đã giao`). | Xem “Response mẫu – Đơn Shipper”. |
| GET | `/api/orders/shipper/<shipper_id>/orders/` | Dashboard cho 1 shipper cụ thể. | Xem “Response mẫu – Đơn Shipper”. |

#### Response mẫu – Đơn Shipper

- `GET /api/orders/?shipper__isnull=true&delivery_status=Chờ xác nhận`
```json
{
	"count": 2,
	"num_pages": 1,
	"current_page": 1,
	"results": [
		{
			"id": 150,
			"order_status": "Chờ xác nhận",
			"delivery_status": "Chờ xác nhận",
			"total_money": 150000.0,
			"payment_method": "COD",
			"store_name": "FastFood ABC",
			"shipper": null
		}
	]
}
```

- `POST /api/orders/shipper/150/accept/`
```json
{
	"message": "Order accepted successfully",
	"order": {
		"id": 150,
		"delivery_status": "Đã xác nhận",
		"shipper_id": 4
	}
}
```

- `PUT /api/orders/shipper/150/status/`
```json
{
	"message": "Delivery status updated successfully",
	"order": {
		"id": 150,
		"delivery_status": "Đang giao",
		"order_status": "Đang giao",
		"shipper_id": 4
	}
}
```

- `GET /api/orders/shipper/`
```json
{
	"count": 3,
	"num_pages": 1,
	"current_page": 1,
	"results": [
		{
			"id": 150,
			"order_status": "Đang giao",
			"delivery_status": "Đang giao",
			"total_money": 150000.0,
			"store_name": "FastFood ABC"
		}
	]
}
```

- `GET /api/orders/shipper/4/orders/`
```json
{
	"shipper": {
		"id": 4,
		"user_id": 9,
		"fullname": "Nguyễn Văn B",
		"phone": "0988000000",
		"email": "shipper@example.com",
		"address": "Quận 3"
	},
	"status_counts": {
		"Chờ xác nhận": 1,
		"Đang giao": 2,
		"Đã giao": 5,
		"Đã hủy": 0,
		"Đã huỷ": 0
	},
	"total_orders": 8,
	"orders": {
		"count": 3,
		"results": [
			{
				"id": 150,
				"order_status": "Đang giao",
				"delivery_status": "Đang giao",
				"total_money": 150000.0
			}
		],
		"num_pages": 1,
		"current_page": 1,
		"has_next": false,
		"has_previous": false
	}
}
```

### Quản lý hồ sơ shipper (`apps/shipper/views.py`)
| Phương thức | Endpoint | Mục đích | Response |
|---|---|---|---|
| GET | `/api/shipper/shippers/` | Danh sách shipper (có search, phân trang). | Xem “Response mẫu – Hồ sơ Shipper”. |
| POST | `/api/shipper/shippers/` | Tạo hồ sơ shipper dựa trên user có sẵn. | Xem “Response mẫu – Hồ sơ Shipper”. |
| GET | `/api/shipper/shippers/<id>/` | Chi tiết 1 shipper. | Xem “Response mẫu – Hồ sơ Shipper”. |
| PUT/PATCH | `/api/shipper/shippers/<id>/` | Cập nhật thông tin shipper + thông tin User (tên, phone, email, address). | Xem “Response mẫu – Hồ sơ Shipper”. |
| DELETE | `/api/shipper/shippers/<id>/` | Xóa shipper. | Xem “Response mẫu – Hồ sơ Shipper”. |
| POST | `/api/shipper/shippers/create_with_user/` | Tạo mới cả User lẫn Shipper. | Xem “Response mẫu – Hồ sơ Shipper”. |
| GET | `/api/shipper/shippers/by_user/?user_id=` | Lấy shipper theo user_id. | Xem “Response mẫu – Hồ sơ Shipper”. |
| GET | `/api/shipper/shippers/available_users/` | Liệt kê User có role shipper nhưng chưa tạo hồ sơ. | Xem “Response mẫu – Hồ sơ Shipper”. |
| GET | `/api/shipper/shippers/statistics/` | Thống kê số lượng shipper. | Xem “Response mẫu – Hồ sơ Shipper”. |

#### Response mẫu – Hồ sơ Shipper

- `GET /api/shipper/shippers/?page=1`
```json
{
	"count": 12,
	"next": "http://localhost:8000/api/shipper/shippers/?page=2",
	"previous": null,
	"results": [
		{
			"id": 4,
			"user_id": 9,
			"fullname": "Nguyễn Văn B",
			"phone": "0988000000",
			"email": "shipper@example.com",
			"address": "Quận 3",
			"role": "Shipper",
			"user": {
				"id": 9,
				"username": "shipper01",
				"fullname": "Nguyễn Văn B",
				"phone_number": "0988000000",
				"email": "shipper@example.com",
				"address": "Quận 3"
			}
		}
	]
}
```

- `POST /api/shipper/shippers/`
```json
{
	"id": 5,
	"user_id": 12,
	"fullname": "Lê Hữu C",
	"phone": "0912000000",
	"email": "shipper02@example.com",
	"address": "Thủ Đức",
	"role": "Shipper"
}
```

- `GET /api/shipper/shippers/5/`
```json
{
	"id": 5,
	"user_id": 12,
	"fullname": "Lê Hữu C",
	"phone": "0912000000",
	"email": "shipper02@example.com",
	"address": "Thủ Đức",
	"role": "Shipper"
}
```

- `PUT /api/shipper/shippers/5/`
```json
{
	"id": 5,
	"user_id": 12,
	"fullname": "Lê Hữu C",
	"phone": "0912333444",
	"email": "shipper02@example.com",
	"address": "TP.Thủ Đức",
	"role": "Shipper"
}
```

- `DELETE /api/shipper/shippers/5/`
```json
{
	"message": "Đã xóa shipper thành công"
}
```

- `POST /api/shipper/shippers/create_with_user/`
```json
{
	"id": 6,
	"user_id": 15,
	"fullname": "Đỗ Hạnh",
	"phone": "0977000000",
	"email": "shipper03@example.com",
	"address": "Quận 7",
	"role": "Shipper"
}
```

- `GET /api/shipper/shippers/by_user/?user_id=15`
```json
{
	"id": 6,
	"user_id": 15,
	"fullname": "Đỗ Hạnh",
	"phone": "0977000000",
	"email": "shipper03@example.com",
	"address": "Quận 7",
	"role": "Shipper"
}
```

- `GET /api/shipper/shippers/available_users/`
```json
{
	"available_users": [
		{
			"id": 18,
			"fullname": "Trần Minh",
			"email": "minh@example.com",
			"phone_number": "0909000000",
			"address": "Quận 1"
		}
	]
}
```

- `GET /api/shipper/shippers/statistics/`
```json
{
	"total_shippers": 6,
	"total_users_with_shipper_role": 9,
	"available_users": 3
}
```

## 5. API cho Quản lý (Admin)

### Quản lý khách hàng & hồ sơ đăng ký (`apps/authentication/views.py`)
| Phương thức | Endpoint | Mục đích | Response |
|---|---|---|---|
| GET | `/api/auth/admin/customers/` | Danh sách khách hàng (role id = 1) có phân trang và search. | Xem “Response mẫu – Admin khách hàng & đăng ký”. |
| GET/PUT | `/api/auth/admin/customers/<id>/` | Xem hoặc cập nhật thông tin cơ bản khách hàng. | Xem “Response mẫu – Admin khách hàng & đăng ký”. |
| POST | `/api/auth/admin/customers/<id>/toggle-status/` | Khóa/mở khóa tài khoản. | Xem “Response mẫu – Admin khách hàng & đăng ký”. |
| GET | `/api/auth/shipper/applications/` | Danh sách user đã bật `is_shipper_registered`. | Xem “Response mẫu – Admin khách hàng & đăng ký”. |
| POST | `/api/auth/shipper/applications/<user_id>/approve/` | Duyệt shipper: set role, tạo bản ghi `Shipper`. | Xem “Response mẫu – Admin khách hàng & đăng ký”. |
| POST | `/api/auth/shipper/applications/<user_id>/reject/` | Từ chối, reset cờ đăng ký. | Xem “Response mẫu – Admin khách hàng & đăng ký”. |
| GET | `/api/auth/store/applications/` | Danh sách user đăng ký mở cửa hàng. | Xem “Response mẫu – Admin khách hàng & đăng ký”. |
| POST | `/api/auth/store/applications/<user_id>/approve/` | Duyệt + chuyển role Cửa hàng + tạo `Store`. | Xem “Response mẫu – Admin khách hàng & đăng ký”. |
| POST | `/api/auth/store/applications/<user_id>/reject/` | Từ chối đăng ký cửa hàng. | Xem “Response mẫu – Admin khách hàng & đăng ký”. |

#### Response mẫu – Admin khách hàng & đăng ký

- `GET /api/auth/admin/customers/?page=1`
```json
{
	"customers": [
		{
			"id": 7,
			"username": "khachhang01",
			"fullname": "Nguyễn Văn A",
			"email": "customer@example.com",
			"phone_number": "0900000000",
			"address": "Quận 1",
			"role": "Khách hàng",
			"is_active": true,
			"created_date": "2025-09-25T14:20:00+07:00"
		}
	],
	"total_pages": 3,
	"current_page": 1,
	"total_customers": 24
}
```

- `GET /api/auth/admin/customers/7/`
```json
{
	"id": 7,
	"username": "khachhang01",
	"fullname": "Nguyễn Văn A",
	"email": "customer@example.com",
	"phone_number": "0900000000",
	"address": "Quận 1",
	"role": "Khách hàng",
	"is_active": true
}
```

- `POST /api/auth/admin/customers/7/toggle-status/`
```json
{
	"message": "Customer deactivated successfully",
	"customer": {
		"id": 7,
		"username": "khachhang01",
		"is_active": false
	}
}
```

- `GET /api/auth/shipper/applications/`
```json
{
	"applications": [
		{
			"id": 12,
			"username": "user_shipper",
			"fullname": "Lê Hữu C",
			"is_shipper_registered": true
		}
	],
	"total_pages": 1,
	"current_page": 1,
	"total_applications": 1
}
```

- `POST /api/auth/shipper/applications/12/approve/`
```json
{
	"message": "Shipper application approved successfully",
	"user": {
		"id": 12,
		"username": "user_shipper",
		"role": "Người vận chuyển",
		"is_shipper_registered": false
	},
	"shipper_id": 5
}
```

- `POST /api/auth/shipper/applications/12/reject/`
```json
{
	"message": "Shipper application rejected",
	"user": {
		"id": 12,
		"username": "user_shipper",
		"is_shipper_registered": false
	}
}
```

- `GET /api/auth/store/applications/`
```json
{
	"applications": [
		{
			"id": 20,
			"username": "user_store",
			"fullname": "Cửa Hàng An",
			"is_store_registered": true
		}
	],
	"total_pages": 1,
	"current_page": 1,
	"total_applications": 1
}
```

- `POST /api/auth/store/applications/20/approve/`
```json
{
	"message": "Store application approved successfully",
	"user": {
		"id": 20,
		"username": "user_store",
		"role": "Cửa hàng",
		"is_store_registered": false
	},
	"store_id": 6,
	"store_name": "Cửa hàng An"
}
```

- `POST /api/auth/store/applications/20/reject/`
```json
{
	"message": "Store application rejected",
	"user": {
		"id": 20,
		"username": "user_store",
		"is_store_registered": false
	}
}
```

### Quản trị đơn hàng (`apps/orders/views.py`)
| Phương thức | Endpoint | Mục đích | Response |
|---|---|---|---|
| GET | `/api/orders/admin/` | Quản trị xem tất cả đơn (Store Manager xem phần của mình). | Xem “Response mẫu – Đơn hàng”. |
| GET/PUT | `/api/orders/admin/<order_id>/` | Xem hoặc cập nhật trạng thái đơn (Admin-only). | Xem “Response mẫu – Đơn hàng”. |
| PUT | `/api/orders/admin/<order_id>/assign-shipper/` | Gán hoặc bỏ gán shipper. | Xem “Response mẫu – Đơn hàng”. |
| PATCH | `/api/orders/admin/<pk>/status/` | Đổi trạng thái/hủy đơn, ghi nhận `cancelled_by_role`. | Xem “Response mẫu – Đơn hàng”. |

### Quản lý khuyến mãi toàn hệ thống (`apps/promotions/views.py`)
| Phương thức | Endpoint | Mục đích | Response |
|---|---|---|---|
| GET | `/api/promotions/admin/` | Liệt kê các mã scope toàn hệ thống (store_id = 0). | Xem “Response mẫu – Khuyến mãi Admin”. |
| POST | `/api/promotions/admin/create/` | Tạo promo toàn hệ thống (gắn vào store ảo id=0). | Xem “Response mẫu – Khuyến mãi Admin”. |
| GET | `/api/promotions/admin/<id>/` | Chi tiết promo global. | Xem “Response mẫu – Khuyến mãi Admin”. |
| PUT/PATCH | `/api/promotions/admin/<id>/update/` | Cập nhật promo global. | Xem “Response mẫu – Khuyến mãi Admin”. |
| DELETE | `/api/promotions/admin/<id>/delete/` | Xóa promo global. | Xem “Response mẫu – Khuyến mãi Admin”. |

#### Response mẫu – Khuyến mãi Admin

- `GET /api/promotions/admin/`
```json
[
	{
		"id": 1,
		"name": "Toàn hệ thống 15%",
		"scope": "SYSTEM",
		"discount_type": "PERCENT",
		"discount_value": "15.00",
		"minimum_pay": "100000.00",
		"max_discount_amount": "30000.00",
		"start_date": "2025-11-01T00:00:00+07:00",
		"end_date": "2025-12-31T23:59:59+07:00",
		"store_id": 0,
		"store_name": "System-Wide Promotions",
		"is_active": true,
		"description": "Giảm 15% tối đa 30k"
	}
]
```

- `POST /api/promotions/admin/create/`
```json
{
	"id": 2,
	"name": "Global 50k",
	"scope": "SYSTEM",
	"discount_type": "AMOUNT",
	"discount_value": "50000.00",
	"minimum_pay": "250000.00",
	"store_id": 0,
	"store_name": "System-Wide Promotions",
	"is_active": true
}
```

- `GET /api/promotions/admin/2/`
```json
{
	"id": 2,
	"name": "Global 50k",
	"scope": "SYSTEM",
	"discount_type": "AMOUNT",
	"discount_value": "50000.00",
	"minimum_pay": "250000.00",
	"store_id": 0,
	"store_name": "System-Wide Promotions"
}
```

- `PATCH /api/promotions/admin/2/update/`
```json
{
	"id": 2,
	"name": "Global 60k",
	"discount_value": "60000.00",
	"minimum_pay": "250000.00",
	"store_id": 0,
	"store_name": "System-Wide Promotions"
}
```

- `DELETE /api/promotions/admin/2/delete/`
```json
{
	"success": true,
	"message": "Promotion \"Global 60k\" deleted successfully"
}
```

### Quyền CRUD cửa hàng
Admin có toàn quyền dùng các endpoint trong mục Quản lý cửa hàng (tạo, chỉnh sửa, xóa, xem thống kê) để quản lý toàn bộ hệ thống.

---
**Ghi chú Serializer**
- `UserSerializer` chứa: `id`, `username`, `fullname`, `email`, `phone_number`, `address`, `is_active`, thông tin `role`, cờ `is_shipper_registered`, `is_store_registered`, `created_date`.
- `OrderSerializer` bao gồm: `id`, `group_id`, `store`, `user`, `shipper`, `order_status`, `delivery_status`, `payment_method`, `shipping_fee`, `total_money`, `total_before_discount`, `total_discount`, `total_after_discount`, `order_details` (danh sách `OrderDetailSerializer` với `food`, `food_option`, `quantity`, `food_price`, `food_option_price`, `food_note`), `promo`, `created_date`, `is_rated`, `cancelled_by_role`, `cancelled_date`.
- `FoodSerializer`/`FoodListSerializer`: thông tin `category`, `store`, `title`, `description`, `price`, `availability`, `image/url`, `avg_rating`, `rating_count`, danh sách `sizes`.
- `PromoSerializer`: `id`, `name`, `code`, `discount_type`, `discount_value`, `maximum_discount`, `minimum_pay`, `start_date`, `end_date`, `scope`, `store_id`, `description`.

Để biết rõ logic kiểm tra quyền hạn, trạng thái hoặc xử lý lỗi chi tiết, tham khảo trực tiếp các view tương ứng trong thư mục `backend/apps/`.
