-- Script cập nhật cơ sở dữ liệu PBL6
-- Thêm role "Cửa hàng" vào bảng roles
-- Tạo bảng stores (cửa hàng)
-- Thêm cột store_id vào bảng food

-- 1. Thêm role "Cửa hàng" vào bảng roles
INSERT INTO roles (role_name) VALUES ('Cửa hàng') 
ON CONFLICT (role_name) DO NOTHING;

-- 2. Tạo bảng stores (cửa hàng)
CREATE TABLE IF NOT EXISTS stores (
    id SERIAL PRIMARY KEY,
    store_name VARCHAR(100) NOT NULL,
    image TEXT DEFAULT '',
    description TEXT DEFAULT ''
);

-- 3. Thêm cột store_id vào bảng food (nếu chưa có)
ALTER TABLE food ADD COLUMN IF NOT EXISTS store_id INTEGER;

-- 4. Tạo foreign key constraint từ food.store_id đến stores.id
ALTER TABLE food ADD CONSTRAINT fk_food_store 
FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE;

-- 5. Thêm một số dữ liệu mẫu cho stores
INSERT INTO stores (store_name, image, description) VALUES 
('KFC Vietnam', 'assets/kfc-logo.png', 'Nhà hàng gà rán nổi tiếng thế giới'),
('McDonald''s Vietnam', 'assets/mcdonalds-logo.png', 'Chuỗi thức ăn nhanh hàng đầu'),
('Burger King', 'assets/burger-king-logo.png', 'Chuyên về burger và thức ăn nhanh'),
('Pizza Hut', 'assets/pizza-hut-logo.png', 'Chuyên pizza và đồ ăn Ý'),
('Domino''s Pizza', 'assets/dominos-logo.png', 'Giao pizza nhanh chóng')
ON CONFLICT DO NOTHING;

-- 6. Cập nhật một số food items với store_id (tùy chọn)
-- Bạn có thể cập nhật các món ăn hiện có để gán cho các cửa hàng
-- UPDATE food SET store_id = 1 WHERE title LIKE '%gà%' OR title LIKE '%chicken%';
-- UPDATE food SET store_id = 2 WHERE title LIKE '%burger%';
-- UPDATE food SET store_id = 4 WHERE title LIKE '%pizza%';

COMMENT ON TABLE stores IS 'Bảng lưu thông tin các cửa hàng';
COMMENT ON COLUMN stores.store_name IS 'Tên cửa hàng';
COMMENT ON COLUMN stores.image IS 'Đường dẫn hình ảnh cửa hàng (assets/tên.png)';
COMMENT ON COLUMN stores.description IS 'Mô tả về cửa hàng';
COMMENT ON COLUMN food.store_id IS 'ID cửa hàng (foreign key đến bảng stores)';
