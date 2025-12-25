from __future__ import annotations

import random
from collections import defaultdict
from dataclasses import dataclass
from datetime import date, datetime, timedelta
from decimal import Decimal, ROUND_HALF_UP
from pathlib import Path
from typing import Dict, Iterable, List, Tuple

BASE_DIR = Path(__file__).resolve().parent.parent
SQL_PATH = BASE_DIR / "backup.sql"
OUTPUT_DIR = BASE_DIR / "data"
OUTPUT_PATH = OUTPUT_DIR / "orders_oct2025.sql"

TIMEZONE_SUFFIX = "+07"
RNG = random.Random(20251119)


@dataclass(frozen=True)
class Food:
    id: int
    store_id: int
    title: str
    price: Decimal


@dataclass(frozen=True)
class FoodSize:
    id: int
    size_name: str
    price_delta: Decimal


@dataclass(frozen=True)
class Store:
    id: int
    name: str
    address: str | None
    latitude: Decimal | None
    longitude: Decimal | None


@dataclass(frozen=True)
class User:
    id: int
    fullname: str
    address: str | None
    phone: str | None
    latitude: Decimal | None
    longitude: Decimal | None


@dataclass(frozen=True)
class Shipper:
    id: int


def read_sql_dump() -> str:
    if not SQL_PATH.exists():
        raise FileNotFoundError(f"Cannot find backup file at {SQL_PATH}")
    return SQL_PATH.read_text(encoding="utf-8")


def extract_copy_block(sql_text: str, table: str) -> Tuple[List[str], List[List[str | None]]]:
    marker = f"COPY public.{table} "
    start_idx = sql_text.find(marker)
    if start_idx == -1:
        raise ValueError(f"COPY block for table '{table}' not found")

    header_end = sql_text.find('\n', start_idx)
    if header_end == -1:
        raise ValueError(f"Unexpected EOF while parsing header for table '{table}'")
    header_line = sql_text[start_idx:header_end].strip()
    open_paren = header_line.find('(')
    close_paren = header_line.find(')')
    if open_paren == -1 or close_paren == -1 or close_paren < open_paren:
        raise ValueError(f"Unable to parse column list for table '{table}'")
    columns = [col.strip() for col in header_line[open_paren + 1:close_paren].split(',')]

    data_start = header_end + 1
    terminator = sql_text.find('\n\\.\n', data_start)
    if terminator == -1:
        terminator = sql_text.find('\n\\.\r\n', data_start)
    if terminator == -1:
        raise ValueError(f"Terminator for table '{table}' not found")

    block = sql_text[data_start:terminator].strip('\n')
    rows: List[List[str | None]] = []
    if block:
        for line in block.splitlines():
            if not line.strip():
                continue
            parsed = [None if value == "\\N" else value for value in line.split('\t')]
            rows.append(parsed)
    return columns, rows


def as_dicts(columns: Iterable[str], rows: Iterable[List[str | None]]) -> List[Dict[str, str | None]]:
    cols = list(columns)
    return [dict(zip(cols, row)) for row in rows]


def load_foods(sql_text: str) -> Dict[int, List[Food]]:
    columns, rows = extract_copy_block(sql_text, "food")
    foods_by_store: Dict[int, List[Food]] = defaultdict(list)
    for record in as_dicts(columns, rows):
        if record["store_id"] in (None, "\\N"):
            continue
        try:
            store_id = int(record["store_id"])
            food_id = int(record["id"])
        except (TypeError, ValueError):
            continue
        price_value = record.get("price") or "0"
        try:
            price = Decimal(price_value)
        except Exception:
            price = Decimal("0")
        foods_by_store[store_id].append(
            Food(
                id=food_id,
                store_id=store_id,
                title=record.get("title") or f"Food {food_id}",
                price=price,
            )
        )
    return foods_by_store


def load_food_sizes(sql_text: str) -> Dict[int, FoodSize]:
    columns, rows = extract_copy_block(sql_text, "food_size")
    sizes: Dict[int, FoodSize] = {}
    for record in as_dicts(columns, rows):
        try:
            size_id = int(record["id"])
        except (TypeError, ValueError):
            continue
        price_delta = Decimal(record.get("price") or "0")
        sizes[size_id] = FoodSize(
            id=size_id,
            size_name=record.get("size_name") or "Default",
            price_delta=price_delta,
        )
    if not sizes:
        raise ValueError("food_size table must contain at least one row")
    return sizes


def load_stores(sql_text: str) -> Dict[int, Store]:
    columns, rows = extract_copy_block(sql_text, "stores")
    stores: Dict[int, Store] = {}
    for record in as_dicts(columns, rows):
        try:
            store_id = int(record["id"])
        except (TypeError, ValueError):
            continue
        stores[store_id] = Store(
            id=store_id,
            name=record.get("store_name") or f"Store {store_id}",
            address=record.get("address"),
            latitude=Decimal(record["latitude"]) if record.get("latitude") else None,
            longitude=Decimal(record["longitude"]) if record.get("longitude") else None,
        )
    return stores


def load_users(sql_text: str) -> List[User]:
    columns, rows = extract_copy_block(sql_text, "users")
    users: List[User] = []
    for record in as_dicts(columns, rows):
        try:
            user_id = int(record["id"])
        except (TypeError, ValueError):
            continue
        fullname = (record.get("fullname") or record.get("username") or f"User {user_id}").strip() or f"User {user_id}"
        users.append(
            User(
                id=user_id,
                fullname=fullname,
                address=record.get("address"),
                phone=record.get("phone_number"),
                latitude=Decimal(record["latitude"]) if record.get("latitude") else None,
                longitude=Decimal(record["longitude"]) if record.get("longitude") else None,
            )
        )
    if not users:
        raise ValueError("users table must contain at least one row")
    return users


def load_shippers(sql_text: str) -> List[Shipper]:
    columns, rows = extract_copy_block(sql_text, "shipper")
    shippers: List[Shipper] = []
    for record in as_dicts(columns, rows):
        try:
            shipper_id = int(record["id"])
        except (TypeError, ValueError):
            continue
        shippers.append(Shipper(id=shipper_id))
    if not shippers:
        raise ValueError("shipper table must contain at least one row")
    return shippers


def load_promos(sql_text: str) -> List[int]:
    columns, rows = extract_copy_block(sql_text, "promo")
    promo_ids: List[int] = []
    for record in as_dicts(columns, rows):
        try:
            promo_ids.append(int(record["id"]))
        except (TypeError, ValueError):
            continue
    return promo_ids


def load_existing_ids(sql_text: str) -> Tuple[int, int, List[str], List[str]]:
    order_columns, order_rows = extract_copy_block(sql_text, "orders")
    detail_columns, detail_rows = extract_copy_block(sql_text, "order_detail")
    max_order_id = max((int(row[0]) for row in order_rows if row and row[0] is not None), default=0)
    max_detail_id = max((int(row[4]) for row in detail_rows if row and len(row) > 4 and row[4] is not None), default=0)
    return max_order_id, max_detail_id, order_columns, detail_columns


def quantize(value: Decimal, pattern: str) -> Decimal:
    return value.quantize(Decimal(pattern), rounding=ROUND_HALF_UP)


def format_decimal(value: Decimal, pattern: str) -> str:
    return f"{quantize(value, pattern):f}"


def random_timestamp(target_date: date) -> str:
    hour = RNG.randint(7, 21)
    minute = RNG.randint(0, 59)
    second = RNG.randint(0, 59)
    micro = RNG.randint(0, 999999)
    dt = datetime.combine(target_date, datetime.min.time()).replace(hour=hour, minute=minute, second=second, microsecond=micro)
    return dt.strftime("%Y-%m-%d %H:%M:%S.%f") + TIMEZONE_SUFFIX


def choose_status() -> str:
    weighted = [
        ("Đã giao", 0.55),
        ("Đang giao", 0.15),
        ("Đã xác nhận", 0.1),
        ("Chờ xác nhận", 0.1),
        ("Đã huỷ", 0.1),
    ]
    roll = RNG.random()
    cumulative = 0.0
    for status, weight in weighted:
        cumulative += weight
        if roll <= cumulative:
            return status
    return weighted[-1][0]


def delivery_status_for(order_status: str) -> str:
    mapping = {
        "Đã giao": "Đã giao",
        "Đang giao": "Đang giao",
        "Đã xác nhận": "Đã lấy hàng",
        "Chờ xác nhận": "Chờ xác nhận",
        "Đã huỷ": "Chờ xác nhận",
    }
    return mapping.get(order_status, "Chờ xác nhận")


def choose_note() -> str | None:
    notes = [
        "Ít cay",
        "Không bỏ đá",
        "Gọi trước khi giao",
        "Thêm sốt phô mai",
        "Đóng gói riêng từng món",
    ]
    return RNG.choice(notes) if RNG.random() < 0.25 else None


def choose_food_note() -> str | None:
    notes = ["Ít cay", "Không hành", "Thêm phô mai", "Không nước sốt"]
    return RNG.choice(notes) if RNG.random() < 0.2 else None


def choose_cancel_reason() -> str:
    reasons = [
        "Khách thay đổi địa chỉ",
        "Không liên lạc được khách",
        "Thiếu nguyên liệu",
        "Khách đặt nhầm",
    ]
    return RNG.choice(reasons)


def generate_orders() -> None:
    sql_text = read_sql_dump()
    foods_by_store = load_foods(sql_text)
    food_sizes = load_food_sizes(sql_text)
    stores = load_stores(sql_text)
    users = load_users(sql_text)
    shippers = load_shippers(sql_text)
    promos = load_promos(sql_text)
    max_order_id, max_detail_id, order_columns, detail_columns = load_existing_ids(sql_text)

    candidate_stores = {sid: foods for sid, foods in foods_by_store.items() if foods}
    if not candidate_stores:
        raise ValueError("No stores with menu items were found")

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    start_date = date(2025, 10, 1)
    end_date = date(2025, 10, 31)
    day_count = (end_date - start_date).days + 1

    shipping_fee_choices = [Decimal("10000"), Decimal("12000"), Decimal("15000"), Decimal("20000"), Decimal("25000")]
    payment_methods = ["cash", "COD"]

    order_rows: List[str] = []
    detail_rows: List[str] = []

    current_order_id = max_order_id + 1
    current_detail_id = max_detail_id + 1

    orders_per_day_summary: Dict[str, int] = {}

    for offset in range(day_count):
        current_date = start_date + timedelta(days=offset)
        order_count = RNG.randint(50, 100)
        orders_per_day_summary[current_date.isoformat()] = order_count

        for _ in range(order_count):
            store_id = RNG.choice(list(candidate_stores.keys()))
            menu = candidate_stores[store_id]
            selected_user = RNG.choice(users)
            order_status = choose_status()
            delivery_status = delivery_status_for(order_status)
            shipping_fee = RNG.choice(shipping_fee_choices)
            payment_method = RNG.choice(payment_methods)
            promo_id = RNG.choice(promos) if promos and RNG.random() < 0.25 else None
            shipper_id = RNG.choice(shippers).id if order_status in {"Đã giao", "Đang giao", "Đã xác nhận"} else None

            item_count = RNG.randint(2, 7)
            chosen_foods = []
            if len(menu) >= item_count:
                chosen_foods = RNG.sample(menu, item_count)
            else:
                chosen_foods = menu.copy()
                while len(chosen_foods) < item_count:
                    chosen_foods.append(RNG.choice(menu))

            subtotal = Decimal("0")
            order_detail_ids_for_order: List[int] = []

            for food in chosen_foods:
                quantity = RNG.randint(1, 3)
                size = RNG.choice(list(food_sizes.values()))
                option_price = size.price_delta
                line_price = (food.price + option_price) * quantity
                subtotal += line_price
                food_note = choose_food_note()
                detail_row = [
                    str(current_order_id),
                    str(food.id),
                    str(quantity),
                    food_note or "\\N",
                    str(current_detail_id),
                    str(size.id),
                    format_decimal(food.price, "0.00"),
                    format_decimal(option_price, "0.00"),
                ]
                detail_rows.append('\t'.join(detail_row))
                order_detail_ids_for_order.append(current_detail_id)
                current_detail_id += 1

            subtotal = quantize(subtotal, "0.00")
            discount = Decimal("0")
            if promo_id and subtotal > 0:
                percentage = Decimal(RNG.uniform(0.05, 0.2)).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
                discount = min(subtotal * percentage, Decimal("50000"))
                discount = quantize(discount, "0.00")
            total_after_discount = subtotal - discount
            total_money = total_after_discount + shipping_fee

            cancel_reason = cancelled_by = cancelled_date = None
            if order_status == "Đã huỷ":
                cancelled_by = RNG.choice(["Khách hàng", "Cửa hàng", "Hỗ trợ"])
                cancelled_date = random_timestamp(current_date)
                cancel_reason = choose_cancel_reason()

            receiver_name = selected_user.fullname or f"User {selected_user.id}"
            ship_address = selected_user.address or stores.get(store_id, Store(store_id, "", None, None, None)).address or "Liên Chiểu, Đà Nẵng"
            phone_number = selected_user.phone or "0900000000"
            ship_latitude = selected_user.latitude or stores.get(store_id).latitude if store_id in stores else None
            ship_longitude = selected_user.longitude or stores.get(store_id).longitude if store_id in stores else None

            note = choose_note()

            order_row = [
                str(current_order_id),
                random_timestamp(current_date),
                format_decimal(quantize(total_money, "0.000"), "0.000"),
                str(selected_user.id),
                order_status,
                note or "\\N",
                payment_method,
                receiver_name,
                ship_address,
                phone_number,
                str(promo_id) if promo_id else "\\N",
                str(shipper_id) if shipper_id else "\\N",
                cancel_reason or "\\N",
                str(int(shipping_fee)),
                str(current_order_id),
                str(store_id),
                delivery_status,
                format_decimal(subtotal, "0.00"),
                format_decimal(discount, "0.00"),
                format_decimal(total_after_discount, "0.00"),
                cancelled_by or "\\N",
                cancelled_date or "\\N",
                f"{ship_latitude:f}" if ship_latitude is not None else "\\N",
                f"{ship_longitude:f}" if ship_longitude is not None else "\\N",
                "\\N",
            ]
            order_rows.append('\t'.join(order_row))
            current_order_id += 1

    header_orders = f"COPY public.orders ({', '.join(order_columns)}) FROM stdin;"
    header_details = f"COPY public.order_detail ({', '.join(detail_columns)}) FROM stdin;"

    with OUTPUT_PATH.open("w", encoding="utf-8", newline="\n") as fp:
        fp.write("\\encoding UTF8\n\n")
        fp.write(header_orders + "\n")
        fp.write("\n".join(order_rows))
        fp.write("\n\\.\n\n")
        fp.write(header_details + "\n")
        fp.write("\n".join(detail_rows))
        fp.write("\n\\.\n")

    summary_lines = [
        f"Generated {len(order_rows)} orders covering {day_count} days.",
        f"Generated {len(detail_rows)} order_detail rows.",
        f"Output file: {OUTPUT_PATH}",
    ]
    print("\n".join(summary_lines))


if __name__ == "__main__":
    generate_orders()
