-- SQL script to set up store managers and assignments
-- Run this script after the main database is set up

-- Create store_managers table
CREATE TABLE IF NOT EXISTS store_managers (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    store_id INTEGER NOT NULL,
    created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, store_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE
);

-- Insert Store role if it doesn't exist
INSERT INTO roles (id, role_name) VALUES (3, 'Cửa hàng') ON CONFLICT (id) DO NOTHING;

-- Insert sample stores if they don't exist
INSERT INTO stores (id, store_name, description, image) VALUES 
    (1, 'FastFood Chi nhánh 1', 'Chi nhánh đầu tiên của FastFood', 'assets/store1.png'),
    (2, 'FastFood Chi nhánh 2', 'Chi nhánh thứ hai của FastFood', 'assets/store2.png')
ON CONFLICT (id) DO NOTHING;

-- Insert store manager users
INSERT INTO users (username, email, fullname, password, role_id, phone_number, address, created_date, is_active, is_staff, is_superuser) VALUES 
    ('store1_manager', 'store1@fastfood.com', 'Quản lý Chi nhánh 1', '123', 3, '0123456789', '123 Nguyễn Trãi, Hà Nội', CURRENT_TIMESTAMP, true, false, false),
    ('store2_manager', 'store2@fastfood.com', 'Quản lý Chi nhánh 2', '123', 3, '0987654321', '456 Lê Lợi, TP.HCM', CURRENT_TIMESTAMP, true, false, false)
ON CONFLICT (username) DO NOTHING;

-- Create store manager assignments
INSERT INTO store_managers (user_id, store_id) 
SELECT u.id, s.id 
FROM users u, stores s 
WHERE u.username = 'store1_manager' AND s.id = 1
ON CONFLICT (user_id, store_id) DO NOTHING;

INSERT INTO store_managers (user_id, store_id) 
SELECT u.id, s.id 
FROM users u, stores s 
WHERE u.username = 'store2_manager' AND s.id = 2
ON CONFLICT (user_id, store_id) DO NOTHING;

-- Update existing foods to assign them to stores (optional)
-- This assigns foods to store 1 by default, can be customized
UPDATE food SET store_id = 1 WHERE store_id IS NULL;

COMMIT;