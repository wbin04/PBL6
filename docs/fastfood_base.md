-- PostgreSQL dump for fastfood database
-- Converted from MySQL to PostgreSQL

-- Create database (uncomment if needed)
-- CREATE DATABASE fastfood;
-- \c fastfood;

-- Drop tables if they exist (in correct order due to foreign keys)
DROP TABLE IF EXISTS rating_food CASCADE;
DROP TABLE IF EXISTS item CASCADE;
DROP TABLE IF EXISTS order_detail CASCADE;
DROP TABLE IF EXISTS cart CASCADE;
DROP TABLE IF EXISTS orders CASCADE;
DROP TABLE IF EXISTS food CASCADE;
DROP TABLE IF EXISTS category CASCADE;
DROP TABLE IF EXISTS promo CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS roles CASCADE;

-- Table structure for table roles
CREATE TABLE roles (
    id SERIAL PRIMARY KEY,
    role_name VARCHAR(20)
);

-- Dumping data for table roles
INSERT INTO roles (id, role_name) VALUES 
(1, 'Khách hàng'),
(2, 'Quản lý');

-- Reset sequence for roles
SELECT setval('roles_id_seq', (SELECT MAX(id) FROM roles));

-- Table structure for table users
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    fullname VARCHAR(50),
    username VARCHAR(30),
    password VARCHAR(30),
    email VARCHAR(50),
    address VARCHAR(100),
    phone_number CHAR(10),
    created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    role_id INTEGER,
    CONSTRAINT fk_users_roles_id FOREIGN KEY (role_id) REFERENCES roles(id)
);

-- Dumping data for table users
INSERT INTO users (id, fullname, username, password, email, address, phone_number, created_date, role_id) VALUES 
(1, 'Võ Đình Hải', 'vodinhhai3', 'R3Y53aVSE3e1g3L/7Cl9FlNEIK8=', 'vodinhhai3@gmail.com', '34 Nam Cao, Quận Liên Chiểu, Đà Nẵng', '0365096495', '2024-05-31 13:44:04', 1),
(2, 'Lưu Văn Xuân', 'luuvanxuan', 'R3Y53aVSE3e1g3L/7Cl9FlNEIK8=', 'vodinhhai9@gmail.com', '34 Lý Thái Tổ, quận Hải Châu, Đà Nẵng', '0365096495', '2024-05-31 13:50:38', 2),
(3, 'Võ Đình Sơn', 'vodinhson', 'R3Y53aVSE3e1g3L/7Cl9FlNEIK8=', 'vodinhhai2504@gmail.com', '34 Phạm Như Xương, quận Liên Chiểu, Đà Nẵng', '0913413122', '2024-05-31 13:53:14', 1),
(4, 'Võ Đình Hải', 'vodinhhai4', 'R3Y53aVSE3e1g3L/7Cl9FlNEIK8=', 'vodinhhai25042004@gmail.com', '34 Hùng Vương, quận Thanh Khê, Đà Nẵng', '0365096494', '2024-05-31 14:02:27', 1);

-- Reset sequence for users
SELECT setval('users_id_seq', (SELECT MAX(id) FROM users));

-- Table structure for table category
CREATE TABLE category (
    id SERIAL PRIMARY KEY,
    cate_name VARCHAR(50),
    image TEXT
);

-- Dumping data for table category
INSERT INTO category (id, cate_name, image) VALUES 
(1, 'Gà giòn', 'assets/fast food icons free-fried chicken.png'),
(2, 'Burger', 'assets/fast food icons free-burger.png'),
(3, 'Mỳ ý', 'assets/fast food icons free-pizza.png'),
(4, 'Khoai tây chiên', 'assets/fast food icons free-potato.png'),
(5, 'Món phụ', 'assets/fast food icons free-taco.png'),
(6, 'Tráng miệng', 'assets/fast food icons free-hot dog.png'),
(7, 'Nước giải khát', 'assets/fast food icons free-milkshake.png');

-- Reset sequence for category
SELECT setval('category_id_seq', (SELECT MAX(id) FROM category));

-- Table structure for table promo
CREATE TABLE promo (
    id VARCHAR(20) PRIMARY KEY,
    percent INTEGER,
    start_date TIMESTAMP,
    end_date TIMESTAMP,
    minimum_pay DOUBLE PRECISION
);

-- Dumping data for table promo
INSERT INTO promo (id, percent, start_date, end_date, minimum_pay) VALUES 
('GIAM10K', 10000, '2024-12-14 00:00:00', '2024-12-20 00:00:00', 100000),
('GIAM12K', 12000, '2024-12-14 00:00:00', '2024-12-20 00:00:00', 120000),
('GIAM15K', 15000, '2024-12-14 00:00:00', '2024-12-20 00:00:00', 150000),
('GIAM16K', 16000, '2024-12-19 00:00:00', '2024-12-20 00:00:00', 160000),
('GIAM18K', 18000, '2024-12-18 00:00:00', '2024-12-20 00:00:00', 180000),
('GIAM20K', 20000, '2024-12-18 00:00:00', '2024-12-20 00:00:00', 200000),
('GIAM22K', 22000, '2024-12-19 00:00:00', '2024-12-20 00:00:00', 220000);

-- Table structure for table food
CREATE TABLE food (
    id SERIAL PRIMARY KEY,
    title VARCHAR(50),
    description VARCHAR(100),
    price DECIMAL(10,0),
    image TEXT,
    cate_id INTEGER,
    availability VARCHAR(30),
    CONSTRAINT fk_food_category_id FOREIGN KEY (cate_id) REFERENCES category(id)
);

-- Dumping data for table food
INSERT INTO food (id, title, description, price, image, cate_id, availability) VALUES 
(1, 'Gà vui vẻ', 'Happy chicken', 35000, 'http://localhost:8080/FastFood/assets/chicken.png', 1, 'Tạm hết hàng'),
(2, 'Tôm burger', '1 burger', 40000, 'assets/burger.png', 2, 'Còn hàng'),
(3, 'Mỳ ý', '1 mỳ ý', 45000, 'assets/spaghetti.png', 3, 'Tạm hết hàng'),
(4, 'Khoai tây chiên', '1 khoai nhỏ', 25000, 'assets/french-fries.png', 4, 'Còn hàng'),
(5, 'Súp bí đỏ', '1 chén súp', 20000, 'assets/soup.png', 5, 'Còn hàng'),
(6, 'Kem chocolate', '1 kem ly', 10000, 'assets/chocolate-cream.png', 6, 'Còn hàng'),
(7, 'Bánh xoài đào', '1 bánh', 10000, 'assets/peach-mango-pie.png', 6, 'Còn hàng'),
(8, 'Pepsi', '1 ly (vừa)', 10000, 'assets/pepsi.png', 7, 'Còn hàng'),
(9, 'Bánh xoài cam', '1 cái', 10000, 'assets/peach-mango-pie.png', 6, 'Còn hàng'),
(10, 'Bánh xoài dâu', '1 cái', 10000, 'assets/peach-mango-pie.png', 6, 'Còn hàng');

-- Reset sequence for food
SELECT setval('food_id_seq', (SELECT MAX(id) FROM food));

-- Table structure for table cart
CREATE TABLE cart (
    id SERIAL PRIMARY KEY,
    total_money DECIMAL(10,0),
    user_id INTEGER,
    CONSTRAINT fk_cart_users_id FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Dumping data for table cart
INSERT INTO cart (id, total_money, user_id) VALUES 
(1, 105000, 1),
(2, 0, 2),
(3, 65000, 3),
(4, 110000, 4);

-- Reset sequence for cart
SELECT setval('cart_id_seq', (SELECT MAX(id) FROM cart));

-- Table structure for table orders
CREATE TABLE orders (
    id SERIAL PRIMARY KEY,
    created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    total_money DECIMAL(10,0),
    user_id INTEGER,
    order_status VARCHAR(30),
    note VARCHAR(50),
    payment_method VARCHAR(20),
    receiver_name VARCHAR(50),
    ship_address VARCHAR(100),
    phone_number CHAR(10),
    promo_id VARCHAR(20),
    CONSTRAINT fk_orders_users_id FOREIGN KEY (user_id) REFERENCES users(id),
    CONSTRAINT fk_orders_promo_id FOREIGN KEY (promo_id) REFERENCES promo(id)
);

-- Dumping data for table orders
INSERT INTO orders (id, created_date, total_money, user_id, order_status, note, payment_method, receiver_name, ship_address, phone_number, promo_id) VALUES 
(1, '2024-05-28 13:46:34', 235000, 1, 'Đã hoàn thành', '', 'COD', 'Võ Đình Hải', '34 Nam Cao, Quận Liên Chiểu, Đà Nẵng', '0365096495', 'GIAM20K'),
(2, '2024-05-29 13:47:48', 110000, 1, 'Đã hoàn thành', '', 'VNPAY', 'Võ Đình Hải', '34 Nam Cao, Quận Liên Chiểu, Đà Nẵng', '0365096495', 'GIAM10K'),
(3, '2024-05-30 13:48:22', 80000, 1, 'Đã hoàn thành', 'Cho tôi thêm 1 cái khăn giấy', 'COD', 'Võ Đình Hải', '34 Nam Cao, Quận Liên Chiểu, Đà Nẵng', '0365096495', NULL),
(4, '2024-05-31 13:50:04', 125000, 1, 'Đã hoàn thành', '', 'COD', 'Võ Đình Hải', '34 Nam Cao, Quận Liên Chiểu, Đà Nẵng', '0365096495', NULL),
(5, '2024-05-27 13:53:38', 143000, 3, 'Đã hoàn thành', 'Cho tôi 2 gói sốt', 'COD', 'Võ Đình Sơn', '34 Trần Kế Xương, quận Hải Châu, Đà Nẵng', '0913413122', 'GIAM12K'),
(6, '2024-05-26 13:54:06', 150000, 3, 'Đã hoàn thành', '', 'VNPAY', 'Võ Đình Sơn', '34 Trần Kế Xương, quận Hải Châu, Đà Nẵng', '0913413122', 'GIAM15K'),
(7, '2024-05-19 13:54:32', 195000, 3, 'Đã hoàn thành', '', 'COD', 'Võ Đình Sơn', '34 Phạm Như Xương, quận Liên Chiểu, Đà Nẵng', '0913413122', NULL),
(8, '2024-05-20 13:54:53', 135000, 3, 'Đã hoàn thành', '', 'COD', 'Võ Đình Sơn', '34 Phạm Như Xương, quận Liên Chiểu, Đà Nẵng', '0913413122', 'GIAM10K'),
(9, '2024-05-21 13:55:25', 75000, 3, 'Đã hoàn thành', 'Cho 2 khăn giấy ạ', 'COD', 'Võ Đình Sơn', '34 Phạm Như Xương, quận Liên Chiểu, Đà Nẵng', '0913413122', NULL),
(10, '2024-05-22 13:55:39', 80000, 3, 'Đã hoàn thành', '', 'COD', 'Võ Đình Sơn', '34 Phạm Như Xương, quận Liên Chiểu, Đà Nẵng', '0913413122', NULL),
(11, '2024-06-01 13:58:57', 123000, 2, 'Đã hoàn thành', 'Cho tôi 2 cây nĩa', 'VNPAY', 'Lưu Văn Xuân', '34 Lý Thái Tổ, quận Hải Châu, Đà Nẵng', '0365096495', 'GIAM12K'),
(12, '2024-05-24 13:59:16', 85000, 2, 'Đã hoàn thành', 'Cho thêm 2 cây đũa', 'COD', 'Lưu Văn Xuân', '34 Lý Thái Tổ, quận Hải Châu, Đà Nẵng', '0365096495', NULL),
(13, '2024-05-23 13:59:34', 90000, 2, 'Đã hoàn thành', 'X2 tương cà', 'COD', 'Lưu Văn Xuân', '34 Lý Thái Tổ, quận Hải Châu, Đà Nẵng', '0365096495', NULL),
(14, '2024-05-25 13:59:55', 60000, 2, 'Đã hoàn thành', '', 'COD', 'Lưu Văn Xuân', '34 Lý Thái Tổ, quận Hải Châu, Đà Nẵng', '0365096495', NULL),
(15, '2023-05-31 14:03:05', 105000, 4, 'Đã hoàn thành', 'Cho tôi 2 ly trà', 'COD', 'Võ Đình Hải', '34 Hùng Vương, quận Thanh Khê, Đà Nẵng', '0365096494', 'GIAM10K'),
(16, '2023-04-28 14:03:17', 60000, 4, 'Đã hoàn thành', '', 'COD', 'Võ Đình Hải', '34 Hùng Vương, quận Thanh Khê, Đà Nẵng', '0365096494', NULL),
(17, '2024-04-25 14:03:26', 60000, 4, 'Đã hoàn thành', '', 'COD', 'Võ Đình Hải', '34 Hùng Vương, quận Thanh Khê, Đà Nẵng', '0365096494', NULL),
(18, '2023-03-23 14:03:32', 75000, 4, 'Đã hoàn thành', '', 'COD', 'Võ Đình Hải', '34 Hùng Vương, quận Thanh Khê, Đà Nẵng', '0365096494', NULL),
(19, '2024-03-21 14:03:39', 80000, 4, 'Đã hoàn thành', '', 'COD', 'Võ Đình Hải', '34 Hùng Vương, quận Thanh Khê, Đà Nẵng', '0365096494', NULL),
(20, '2024-02-27 14:04:19', 80000, 4, 'Đã hoàn thành', '', 'COD', 'Võ Đình Hải', '34 Hùng Vương, quận Thanh Khê, Đà Nẵng', '0365096494', NULL),
(21, '2023-02-20 14:04:27', 80000, 4, 'Đã hoàn thành', '', 'COD', 'Võ Đình Hải', '34 Hùng Vương, quận Thanh Khê, Đà Nẵng', '0365096494', NULL),
(22, '2023-01-19 14:04:54', 65000, 4, 'Đã hoàn thành', '', 'COD', 'Võ Đình Hải', '34 Hùng Vương, quận Thanh Khê, Đà Nẵng', '0365096494', NULL),
(23, '2024-01-15 14:05:02', 85000, 4, 'Đã hoàn thành', '', 'COD', 'Võ Đình Hải', '34 Hùng Vương, quận Thanh Khê, Đà Nẵng', '0365096494', NULL),
(24, '2023-06-20 14:05:17', 133000, 4, 'Đã hoàn thành', '', 'COD', 'Võ Đình Hải', '34 Hùng Vương, quận Thanh Khê, Đà Nẵng', '0365096494', 'GIAM12K'),
(25, '2023-07-15 14:05:29', 133000, 4, 'Đã hoàn thành', '', 'COD', 'Võ Đình Hải', '34 Hùng Vương, quận Thanh Khê, Đà Nẵng', '0365096494', 'GIAM12K'),
(26, '2023-08-14 14:05:39', 115000, 4, 'Đã hoàn thành', '', 'COD', 'Võ Đình Hải', '34 Hùng Vương, quận Thanh Khê, Đà Nẵng', '0365096494', 'GIAM10K'),
(27, '2024-06-10 14:57:42', 55000, 1, 'Chờ xác nhận', '', 'COD', 'Võ Đình Hải', '34 Nam Cao, Quận Liên Chiểu, Đà Nẵng', '0365096495', NULL),
(28, '2024-06-10 15:12:50', 150000, 1, 'Đang vận chuyển', '', 'VNPAY', 'Võ Đình Hải', '34 Nam Cao, Quận Liên Chiểu, Đà Nẵng', '0365096495', NULL),
(29, '2024-06-10 15:37:16', 140000, 1, 'Đang vận chuyển', '', 'VNPAY', 'Võ Đình Hải', '34 Nam Cao, Quận Liên Chiểu, Đà Nẵng', '0365096495', NULL),
(30, '2024-06-10 15:41:59', 175000, 1, 'Đang vận chuyển', '', 'VNPAY', 'Võ Đình Hải', '34 Nam Cao, Quận Liên Chiểu, Đà Nẵng', '0365096495', NULL),
(31, '2024-06-10 15:45:16', 175000, 1, 'Đang vận chuyển', '', 'VNPAY', 'Võ Đình Hải', '34 Nam Cao, Quận Liên Chiểu, Đà Nẵng', '0365096495', NULL),
(32, '2024-06-10 15:47:38', 155000, 1, 'Đang vận chuyển', '', 'VNPAY', 'Võ Đình Hải', '34 Nam Cao, Quận Liên Chiểu, Đà Nẵng', '0365096495', NULL),
(33, '2024-06-10 15:49:04', 65000, 1, 'Đang vận chuyển', '', 'VNPAY', 'Võ Đình Hải', '34 Nam Cao, Quận Liên Chiểu, Đà Nẵng', '0365096495', NULL),
(34, '2024-06-10 15:52:23', 85000, 1, 'Đang vận chuyển', '', 'VNPAY', 'Võ Đình Hải', '34 Nam Cao, Quận Liên Chiểu, Đà Nẵng', '0365096495', NULL),
(35, '2024-06-10 16:01:55', 55000, 1, 'Đang vận chuyển', '', 'VNPAY', 'Võ Đình Hải', '34 Nam Cao, Quận Liên Chiểu, Đà Nẵng', '0365096495', NULL),
(36, '2024-06-10 16:06:22', 235000, 1, 'Đang vận chuyển', '', 'VNPAY', 'Võ Đình Hải', '34 Nam Cao, Quận Liên Chiểu, Đà Nẵng', '0365096495', NULL),
(37, '2024-06-11 13:35:21', 40000, 2, 'Chờ xác nhận', '', 'COD', 'Lưu Văn Xuân', '34 Lý Thái Tổ, quận Hải Châu, Đà Nẵng', '0365096495', NULL),
(38, '2024-06-12 23:57:20', 55000, 1, 'Chờ xác nhận', '', 'COD', 'Võ Đình Hải', '34 Nam Cao, Quận Liên Chiểu, Đà Nẵng', '0365096495', NULL),
(39, '2024-06-13 00:00:12', 55000, 1, 'Đang vận chuyển', '', 'VNPAY', 'Võ Đình Hải', '34 Nam Cao, Quận Liên Chiểu, Đà Nẵng', '0365096495', NULL),
(40, '2024-06-13 00:00:37', 65000, 1, 'Chờ xác nhận', '', 'COD', 'Võ Đình Hải', '34 Nam Cao, Quận Liên Chiểu, Đà Nẵng', '0365096495', NULL),
(41, '2024-06-13 00:00:48', 55000, 1, 'Chờ xác nhận', '', 'COD', 'Võ Đình Hải', '34 Nam Cao, Quận Liên Chiểu, Đà Nẵng', '0365096495', NULL),
(42, '2024-12-15 15:10:45', 150000, 2, 'Chờ xác nhận', 'Xin 1 cốc nhựa', 'COD', 'Lưu Văn Xuân', '34 Lý Thái Tổ, quận Hải Châu, Đà Nẵng', '0365096495', 'GIAM10K'),
(43, '2024-12-15 15:32:30', 120000, 2, 'Chờ xác nhận', '', 'COD', 'Lưu Văn Xuân', '34 Lý Thái Tổ, quận Hải Châu, Đà Nẵng', '0365096495', 'GIAM10K'),
(44, '2024-12-15 15:33:55', 95000, 1, 'Chờ xác nhận', '', 'COD', 'Võ Đình Hải', '34 Nam Cao, Quận Liên Chiểu, Đà Nẵng', '0365096495', NULL);

-- Reset sequence for orders
SELECT setval('orders_id_seq', (SELECT MAX(id) FROM orders));

-- Table structure for table rating_food
CREATE TABLE rating_food (
    id SERIAL PRIMARY KEY,
    user_id INTEGER,
    food_id INTEGER,
    content VARCHAR(100),
    point DOUBLE PRECISION,
    order_id INTEGER,
    CONSTRAINT fk_ratingfood_users_id FOREIGN KEY (user_id) REFERENCES users(id),
    CONSTRAINT fk_ratingfood_food_id FOREIGN KEY (food_id) REFERENCES food(id),
    CONSTRAINT fk_ratingfood_order_id FOREIGN KEY (order_id) REFERENCES orders(id)
);

-- Sample data for rating_food (you can add more as needed)
INSERT INTO rating_food (id, user_id, food_id, content, point, order_id) VALUES 
(1, 1, 1, 'Ngon tuyệt vời', 4, 1);

-- Reset sequence for rating_food
SELECT setval('rating_food_id_seq', (SELECT MAX(id) FROM rating_food));

-- Table structure for table item
CREATE TABLE item (
    cart_id INTEGER NOT NULL,
    food_id INTEGER NOT NULL,
    quantity INTEGER,
    PRIMARY KEY (cart_id, food_id),
    CONSTRAINT fk_item_cart_id FOREIGN KEY (cart_id) REFERENCES cart(id),
    CONSTRAINT fk_item_food_id FOREIGN KEY (food_id) REFERENCES food(id)
);

-- Dumping data for table item
INSERT INTO item (cart_id, food_id, quantity) VALUES 
(1, 2, 2),
(1, 4, 1);

-- Table structure for table order_detail
CREATE TABLE order_detail (
    order_id INTEGER NOT NULL,
    food_id INTEGER NOT NULL,
    quantity INTEGER,
    PRIMARY KEY (order_id, food_id),
    CONSTRAINT fk_orderdetail_orders_id FOREIGN KEY (order_id) REFERENCES orders(id),
    CONSTRAINT fk_orderdetail_food_id FOREIGN KEY (food_id) REFERENCES food(id)
);

-- Dumping data for table order_detail
INSERT INTO order_detail (order_id, food_id, quantity) VALUES 
(1, 2, 2), (1, 3, 2), (1, 4, 2), (1, 5, 1),
(2, 2, 2), (2, 4, 1),
(3, 1, 1), (3, 6, 1), (3, 7, 1), (3, 8, 1),
(4, 2, 1), (4, 3, 1), (4, 4, 1),
(5, 3, 2), (5, 4, 2),
(6, 2, 2), (6, 3, 1), (6, 4, 1),
(7, 2, 1), (7, 3, 2), (7, 4, 2),
(8, 2, 1), (8, 3, 2),
(9, 1, 1), (9, 4, 1),
(10, 2, 1), (10, 4, 1),
(11, 1, 1), (11, 2, 1), (11, 3, 1),
(12, 3, 1), (12, 4, 1),
(13, 1, 1), (13, 2, 1),
(14, 3, 1),
(15, 1, 1), (15, 2, 1), (15, 4, 1),
(16, 3, 1),
(17, 3, 1),
(18, 1, 1), (18, 4, 1),
(19, 2, 1), (19, 4, 1),
(20, 2, 1), (20, 4, 1),
(21, 2, 1), (21, 4, 1),
(22, 8, 2), (22, 9, 2), (22, 10, 1),
(23, 3, 1), (23, 4, 1),
(24, 3, 2), (24, 5, 1), (24, 7, 1), (24, 8, 1),
(25, 2, 2), (25, 4, 2),
(26, 2, 1), (26, 3, 1), (26, 4, 1),
(27, 2, 1),
(28, 2, 2), (28, 4, 1), (28, 5, 1), (28, 6, 1),
(29, 4, 5),
(30, 2, 4),
(31, 2, 4),
(32, 2, 1), (32, 4, 4),
(33, 4, 2),
(34, 2, 1), (34, 5, 1), (34, 8, 1),
(35, 2, 1),
(36, 2, 3), (36, 4, 4),
(37, 4, 1),
(38, 2, 1),
(39, 2, 1),
(40, 4, 2),
(41, 2, 1),
(42, 2, 2), (42, 4, 1), (42, 5, 2),
(43, 2, 1), (43, 4, 3),
(44, 2, 2);

-- Create indexes for better performance
CREATE INDEX idx_users_role_id ON users(role_id);
CREATE INDEX idx_cart_user_id ON cart(user_id);
CREATE INDEX idx_food_cate_id ON food(cate_id);
CREATE INDEX idx_orders_user_id ON orders(user_id);
CREATE INDEX idx_orders_promo_id ON orders(promo_id);
CREATE INDEX idx_item_food_id ON item(food_id);
CREATE INDEX idx_order_detail_food_id ON order_detail(food_id);
CREATE INDEX idx_rating_food_user_id ON rating_food(user_id);
CREATE INDEX idx_rating_food_food_id ON rating_food(food_id);
CREATE INDEX idx_rating_food_order_id ON rating_food(order_id);

-- Comments for tables
COMMENT ON TABLE roles IS 'User roles table';
COMMENT ON TABLE users IS 'Users information table';
COMMENT ON TABLE category IS 'Food categories table';
COMMENT ON TABLE promo IS 'Promotion codes table';
COMMENT ON TABLE food IS 'Food items table';
COMMENT ON TABLE cart IS 'Shopping cart table';
COMMENT ON TABLE orders IS 'Orders table';
COMMENT ON TABLE item IS 'Cart items junction table';
COMMENT ON TABLE order_detail IS 'Order details junction table';
COMMENT ON TABLE rating_food IS 'Food ratings and reviews table';