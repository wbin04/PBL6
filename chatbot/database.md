# 1. ROLES
```
Column	Type
id	INT PK
role_name	VARCHAR
```
# 2. USERS
```
Column	Type
id	INT PK
fullname	VARCHAR
username	VARCHAR
password	VARCHAR
email	VARCHAR
address	VARCHAR
phone_num	CHAR
created_date	TIMESTAMP
role_id	INT FK
```
# 3. STORE
```
Column	Type
id	INT PK
store_name	VARCHAR
image	TEXT
description	VARCHAR
user_id	INT FK
```
# 4. CATEGORY
```
Column	Type
id	INT PK
cate_name	VARCHAR
image	TEXT
```
# 5. FOOD
```
Column	Type
id	INT PK
title	VARCHAR
description	VARCHAR
price	DECIMAL
image	TEXT
availability	VARCHAR
is_topping	BOOLEAN
cate_id	INT FK
store_id	INT FK
```
# 6. FOOD_SIZE
```
Column	Type
id	INT PK
size_name	VARCHAR
price	DECIMAL
food_id	INT FK
food_option_id	INT
```
# 7. RATING_FOOD
```
Column	Type
id	INT PK
user_id	INT FK
food_id	INT FK
comment	VARCHAR
point	INT
order_id	INT FK
```
# 8. CART
```
Column	Type
id	INT PK
total_money	DECIMAL
user_id	INT FK
```
# 9. ITEM
```
Column	Type
id	INT PK
cart_id	INT FK
food_id	INT FK
food_option_id	INT
quantity	INT
item_note	VARCHAR
```
# 10. ORDERS
```
Column	Type
id	INT PK
created_date	TIMESTAMP
total_before_discount	DECIMAL
total_discount	DECIMAL
total_after_discount	DECIMAL
delivery_status	VARCHAR
payment_method	VARCHAR
receiver_name	VARCHAR
ship_address	VARCHAR
phone_num	CHAR
cancel_reason	VARCHAR
cancelled_by_user	VARCHAR
cancelled_by_role	VARCHAR
shipper_fee	DECIMAL
user_id	INT FK
store_id	INT FK
shipper_id	INT FK
```
# 11. ORDER_DETAIL
```
Column	Type
id	INT PK
order_id	INT FK
food_id	INT FK
food_option_id	INT
quantity	INT
food_price	DECIMAL
food_option_price	DECIMAL
```
# 12. SHIPPER
```
Column	Type
id	INT PK
user_id	INT FK
```
# 13. PROMO
```
Column	Type
id	INT PK
name	VARCHAR
scope	VARCHAR
discount_type	VARCHAR
discount_value	INT
start_date	TIMESTAMP
end_date	TIMESTAMP
minimum_pay	DECIMAL
max_discount_amount	DECIMAL
store_id	INT
```
# 14. ORDER_PROMO
```
Column	Type
id	INT PK
order_id	INT FK
promo_id	INT FK
applied_amount	DECIMAL
note	VARCHAR
created_at	TIMESTAMP