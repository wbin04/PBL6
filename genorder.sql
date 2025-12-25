-- Bật chế độ chèn nhiều bản ghi (tắt trigger/foreign key tạm thời)
SET session_replication_role = replica;

-- Tạo 600 đơn hàng mẫu
WITH users AS (
    SELECT unnest(ARRAY[3,4,5,6,7,1,10,9,8,11,12,13,14]) AS user_id
),
shippers AS (
    SELECT unnest(ARRAY[2,1,4]) AS shipper_id
),
stores AS (
    SELECT unnest(ARRAY[1,2,3,4,5,0,6,7,48,49,50,51,52]) AS store_id
),
promos AS (
    SELECT unnest(ARRAY[1,2,4,11,13,12,3,5,14,19,20]) AS promo_id
),
foods AS (
    SELECT unnest(ARRAY[
        1,2,3,4,5,6,7,8,9,10,
        11,12,13,14,15,16,17,18,19,20,
        21,22,23,24,25,26,27,28,29,30,
        31,32,33,34,35,36,37,38,39,40,
        41,42,43,44,45,46,47,48,49,50,
        51,52,53,54,55,56,57,58,59,60,
        61,62,63,64,65,66,67,68,69,70,
        71,72,73,74,75,76,77,78,79,80,
        81,82,83,84,85,86,87,88,89,90,
        91,92,93,94,95,96,97,98,99,100,
        101,102,103,104,105,106,107,108,109,110,
        111,112,113,114,115,116,117,118,119,120,
        121,122,123,124,125,126,127,128,129,130,
        131,132,133,134,135,136,137,138,139,140,
        141,142,143,144,145,146,147,148,149,150,
        151,152,153,154,155,156,157,158,159,160,
        161,162,163,164,165,166,167,168,169,170,
        171,172,173,174,175,176,177,178,179,180,
        181,182,183,184,185,186,187,188,189,190,
        191,192,193,194,195,196,197,198,199,200,
        201,202,203,204,205,206,207,208,209,210,
        211,212,213,214,215,216,217,218,219,220,
        221,222,223,224,225,226,227,228,229,230,
        231,232,233,234,235,236,237,238,239,240,
        241,242,243,244,245,246,247,248,249,250,
        251,252,253,254,255,256,257,258,259,260,
        261,262,263,264,265,266,267,268,269,270,
        271,272,273,274,275,276,277,278,279,280,
        281,282,283,284,285,286
    ]) AS food_id
),
food_options AS (
    SELECT unnest(ARRAY[11,12,13,14,15,16,17,18,19]) AS food_option_id
),
order_stats AS (
    SELECT 'Hoàn thành'::varchar AS status UNION ALL
    SELECT 'Đang giao' UNION ALL
    SELECT 'Đã xác nhận' UNION ALL
    SELECT 'Chờ xác nhận' UNION ALL
    SELECT 'Đã hủy'
),
delivery_stats AS (
    SELECT 'Chờ xác nhận'::varchar AS status UNION ALL
    SELECT 'Đã lấy hàng' UNION ALL
    SELECT 'Đang giao' UNION ALL
    SELECT 'Đã giao' UNION ALL
    SELECT 'Giao thất bại'
),
payment_methods AS (
    SELECT 'Tiền mặt'::varchar AS method UNION ALL
    SELECT 'Chuyển khoản' UNION ALL
    SELECT 'Ví điện tử'
),
receiver_names AS (
    SELECT 'Nguyễn Văn A'::varchar AS name UNION ALL SELECT 'Trần Thị B' UNION ALL SELECT 'Lê Văn C' UNION ALL
    SELECT 'Phạm Thị D' UNION ALL SELECT 'Hoàng Văn E' UNION ALL SELECT 'Vũ Thị F'
),
addresses AS (
    SELECT '123 Đường Láng, Hà Nội'::varchar AS addr UNION ALL SELECT '45 Nguyễn Trãi, TP.HCM' UNION ALL
    SELECT '78 Lê Lợi, Đà Nẵng' UNION ALL SELECT '56 Trần Phú, Nha Trang' UNION ALL SELECT '90 Hùng Vương, Cần Thơ'
),
phones AS (
    SELECT '0901234567'::varchar AS phone UNION ALL SELECT '0912345678' UNION ALL SELECT '0923456789' UNION ALL
    SELECT '0934567890' UNION ALL SELECT '0945678901'
),

-- 1️⃣ Tạo 600 đơn hàng
inserted_orders AS (
    INSERT INTO orders (
        created_date, user_id, promo_id, shipper_id, shipping_fee, store_id,
        total_before_discount, total_discount, total_after_discount, total_money,
        order_status, delivery_status, payment_method, receiver_name, ship_address, phone_number,
        note, cancelled_date, cancelled_by_role, cancel_reason, group_id
    )
    SELECT 
        CURRENT_TIMESTAMP 
        - INTERVAL '1 day' * (random() * 30)::int 
        - INTERVAL '1 hour' * (random() * 24)::int,
        u.user_id,
        CASE WHEN random() < 0.3 THEN p.promo_id ELSE NULL END,
        s.shipper_id,
        (15000 + (random() * 10000)::int),
        st.store_id,
        0, 0, 0, 0,
        os.status,
        ds.status,
        pm.method,
        rn.name,
        addr.addr,
        ph.phone,
        CASE WHEN random() < 0.2 THEN 'Giao nhanh, để trước cửa' ELSE NULL END,
        CASE WHEN os.status = 'Đã hủy' AND random() < 0.7 
             THEN CURRENT_TIMESTAMP - INTERVAL '1 hour' * (random() * 12)::int 
             ELSE NULL END,
        CASE WHEN os.status = 'Đã hủy' THEN 'customer' ELSE NULL END,
        CASE WHEN os.status = 'Đã hủy' 
             THEN (ARRAY['Không liên lạc được', 'Thay đổi ý kiến', 'Giao chậm'])[(random()*3)::int + 1]
             ELSE NULL END,
        NULL::integer
    FROM 
        generate_series(1, 600) AS g(n)
        CROSS JOIN LATERAL (SELECT user_id FROM users ORDER BY random() LIMIT 1) u
        CROSS JOIN LATERAL (SELECT shipper_id FROM shippers ORDER BY random() LIMIT 1) s
        CROSS JOIN LATERAL (SELECT store_id FROM stores ORDER BY random() LIMIT 1) st
        CROSS JOIN LATERAL (SELECT promo_id FROM promos ORDER BY random() LIMIT 1) p
        CROSS JOIN LATERAL (SELECT status FROM order_stats ORDER BY random() LIMIT 1) os
        CROSS JOIN LATERAL (SELECT status FROM delivery_stats ORDER BY random() LIMIT 1) ds
        CROSS JOIN LATERAL (SELECT method FROM payment_methods ORDER BY random() LIMIT 1) pm
        CROSS JOIN LATERAL (SELECT name FROM receiver_names ORDER BY random() LIMIT 1) rn
        CROSS JOIN LATERAL (SELECT addr FROM addresses ORDER BY random() LIMIT 1) addr
        CROSS JOIN LATERAL (SELECT phone FROM phones ORDER BY random() LIMIT 1) ph
    RETURNING id, created_date
),

-- 2️⃣ Tạo chi tiết đơn hàng (1–5 món, luôn có ít nhất 1 món)
order_details_insert AS (
    INSERT INTO order_detail (
        order_id, food_id, food_option_id, quantity, food_price, food_option_price, food_note
    )
    SELECT 
        o.id AS order_id,
        f.food_id,
        CASE WHEN random() < 0.6 THEN fo.food_option_id ELSE NULL END,
        (1 + (random() * 4)::int) AS quantity,
        (20000 + (random() * 80000)::int) AS food_price,
        CASE WHEN random() < 0.6 THEN (5000 + (random() * 15000)::int) ELSE NULL END,
        CASE WHEN random() < 0.15 THEN 'Ít cay' ELSE NULL END
    FROM inserted_orders o
    JOIN LATERAL (
        SELECT generate_series(1, floor(1 + random() * 4)) AS item_num
    ) g ON TRUE
    CROSS JOIN LATERAL (SELECT food_id FROM foods ORDER BY random() LIMIT 1) f
    CROSS JOIN LATERAL (SELECT food_option_id FROM food_options ORDER BY random() LIMIT 1) fo
),

-- 3️⃣ Cập nhật tổng tiền chính xác
updated_orders AS (
    UPDATE orders o
    SET 
        total_before_discount = agg.subtotal,
        total_discount = agg.discount,
        total_after_discount = agg.subtotal - agg.discount,
        total_money = agg.subtotal - agg.discount + o.shipping_fee
    FROM (
        SELECT 
            od.order_id,
            SUM(od.quantity * (od.food_price + COALESCE(od.food_option_price, 0))) AS subtotal,
            CASE 
                WHEN ord.promo_id IS NOT NULL AND random() < 0.7 
                THEN LEAST(SUM(od.quantity * (od.food_price + COALESCE(od.food_option_price, 0))) * 0.2, 50000)
                ELSE 0 
            END AS discount
        FROM order_detail od
        JOIN orders ord ON od.order_id = ord.id
        GROUP BY od.order_id, ord.promo_id
    ) agg
    WHERE o.id = agg.order_id
)

-- 4️⃣ Kết quả
SELECT '✅ Đã tạo 600 đơn hàng và chi tiết đơn hàng thành công, không còn lỗi giá bằng 0!' AS result;

-- Khôi phục lại chế độ gốc
SET session_replication_role = origin;



WITH agg AS (
  SELECT
    od.order_id,
    SUM(od.quantity * (od.food_price + COALESCE(od.food_option_price,0))) AS subtotal
  FROM order_detail od
  GROUP BY od.order_id
)
UPDATE orders o
SET
  total_before_discount = COALESCE(a.subtotal,0),
  total_discount = CASE
                     WHEN o.promo_id IS NOT NULL THEN LEAST(COALESCE(a.subtotal,0) * 0.2, 50000)
                     ELSE 0
                   END,
  total_after_discount = COALESCE(a.subtotal,0)
                         - CASE WHEN o.promo_id IS NOT NULL THEN LEAST(COALESCE(a.subtotal,0) * 0.2, 50000)
                                ELSE 0 END,
  total_money = (COALESCE(a.subtotal,0)
                 - CASE WHEN o.promo_id IS NOT NULL THEN LEAST(COALESCE(a.subtotal,0) * 0.2, 50000)
                        ELSE 0 END)
                + COALESCE(o.shipping_fee,0)
FROM agg a
WHERE o.id = a.order_id;
