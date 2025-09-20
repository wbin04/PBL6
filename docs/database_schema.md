
# Database Schema Documentation

## ROLES
| Field      | Type     | Key | Notes |
|------------|----------|-----|-------|
| id         | INT      | PK  | Role ID |
| role_name  | VARCHAR  |     | Role name |

---

## USERS
| Field       | Type      | Key | Notes |
|-------------|-----------|-----|-------|
| id          | INT       | PK  | User ID |
| fullname    | VARCHAR   |     | Full name |
| username    | VARCHAR   |     | Username |
| password    | VARCHAR   |     | Password (hashed) |
| email       | VARCHAR   |     | Email |
| address     | VARCHAR   |     | Address |
| phone_num   | CHAR      |     | Phone number |
| created_date| TIMESTAMP |     | Account creation date |
| role_id     | INT       | FK  | References ROLES(id) |

---

## SHIPPER
| Field   | Type | Key | Notes |
|---------|------|-----|-------|
| id      | INT  | PK  | Shipper ID |
| user_id | INT  | FK  | References USERS(id) |

---

## STORE
| Field      | Type     | Key | Notes |
|------------|----------|-----|-------|
| id         | INT      | PK  | Store ID |
| store_name | VARCHAR  |     | Store name |
| image      | TEXT     |     | Store image |
| description| VARCHAR  |     | Store description |
| user_id    | INT      | FK  | References USERS(id) |

---

## CATEGORY
| Field       | Type     | Key | Notes |
|-------------|----------|-----|-------|
| id          | INT      | PK  | Category ID |
| category_name | VARCHAR|     | Category name |

---

## FOOD
| Field      | Type     | Key | Notes |
|------------|----------|-----|-------|
| id         | INT      | PK  | Food ID |
| title      | VARCHAR  |     | Food title |
| description| VARCHAR  |     | Description |
| price      | INT      |     | Price |
| image      | VARCHAR  |     | Food image |
| cateId     | INT      | FK  | References CATEGORY(id) |
| store_id   | INT      | FK  | References STORE(id) |

---

## RATING_FOOD
| Field   | Type | Key | Notes |
|---------|------|-----|-------|
| id      | INT  | PK  | Rating ID |
| rating  | INT  |     | Rating value |
| comment | TEXT |     | Review comment |
| user_id | INT  | FK  | References USERS(id) |
| food_id | INT  | FK  | References FOOD(id) |

---

## CART
| Field   | Type | Key | Notes |
|---------|------|-----|-------|
| id      | INT  | PK  | Cart ID |
| user_id | INT  | FK  | References USERS(id) |

---

## ITEM
| Field    | Type | Key | Notes |
|----------|------|-----|-------|
| id       | INT  | PK  | Item ID |
| cartId   | INT  | FK  | References CART(id) |
| foodId   | INT  | FK  | References FOOD(id) |
| quantity | INT  |     | Quantity |

---

## ORDERS
| Field        | Type      | Key | Notes |
|--------------|-----------|-----|-------|
| id           | INT       | PK  | Order ID |
| created_date | TIMESTAMP |     | Date created |
| total_money  | DECIMAL   |     | Total money |
| user_id      | INT       | FK  | References USERS(id) |
| order_status | VARCHAR   |     | Order status |
| note         | VARCHAR   |     | Note |
| payment_method | VARCHAR |     | Payment method |
| receiver_name | VARCHAR  |     | Receiver name |
| ship_address  | VARCHAR  |     | Shipping address |
| phone_num     | CHAR     |     | Phone number |
| promo_id      | INT      | FK  | References PROMO(id) |
| shipper_id    | INT      | FK  | References SHIPPER(id) |

---

## ORDER_DETAIL
| Field    | Type | Key | Notes |
|----------|------|-----|-------|
| id       | INT  | PK  | Order detail ID |
| order_id | INT  | FK  | References ORDERS(id) |
| food_id  | INT  | FK  | References FOOD(id) |
| quantity | INT  |     | Quantity |

---

## PROMO
| Field        | Type     | Key | Notes |
|--------------|----------|-----|-------|
| id           | INT      | PK  | Promo ID |
| promo_code   | VARCHAR  |     | Promo code |
| discount     | DECIMAL  |     | Discount value |
| valid_from   | DATE     |     | Start date |
| valid_to     | DATE     |     | End date |
