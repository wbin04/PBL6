"""Generate synthetic rating_food data based on existing users, foods, and orders."""

from __future__ import annotations

import random
from dataclasses import dataclass
from pathlib import Path
from typing import Dict, Iterable, List, Tuple

BASE_DIR = Path(__file__).resolve().parent.parent
SQL_PATH = BASE_DIR / "backup.sql"
ORDERS_SQL_PATH = BASE_DIR / "data" / "orders_oct2025.sql"
OUTPUT_PATH = BASE_DIR / "data" / "rating_food_oct2025.sql"

RNG = random.Random(20251119)


@dataclass(frozen=True)
class Food:
    id: int


@dataclass(frozen=True)
class User:
    id: int


@dataclass(frozen=True)
class Order:
    id: int
    user_id: int


@dataclass(frozen=True)
class Rating:
    id: int
    user_id: int
    food_id: int
    content: str
    point: float
    order_id: int


def read_sql(path: Path) -> str:
    if not path.exists():
        raise FileNotFoundError(path)

    cache_key = path.resolve()
    if not hasattr(read_sql, "_cache"):
        read_sql._cache = {}
    cache = read_sql._cache  # type: ignore[attr-defined]

    if cache_key not in cache:
        text = path.read_text(encoding="utf-8")
        if path == ORDERS_SQL_PATH:
            lines = [line for line in text.splitlines() if not line.startswith("\\encoding")]
            text = "\n".join(lines)
        cache[cache_key] = text
    return cache[cache_key]


def extract_copy_block(sql_text: str, table: str) -> Tuple[List[str], List[List[str | None]]]:
    marker = f"COPY public.{table} "
    start_idx = sql_text.find(marker)
    if start_idx == -1:
        raise ValueError(f"COPY block for table '{table}' not found")
    header_end = sql_text.find("\n", start_idx)
    if header_end == -1:
        raise ValueError(f"Unexpected EOF parsing table '{table}' header")
    header_line = sql_text[start_idx:header_end].strip()
    open_paren = header_line.find("(")
    close_paren = header_line.find(")")
    if open_paren == -1 or close_paren == -1 or close_paren < open_paren:
        raise ValueError(f"Invalid header format for table '{table}'")
    columns = [col.strip() for col in header_line[open_paren + 1 : close_paren].split(",")]
    data_start = header_end + 1
    terminator = sql_text.find("\n\\.\n", data_start)
    if terminator == -1:
        terminator = sql_text.find("\n\\.\r\n", data_start)
    if terminator == -1:
        raise ValueError(f"Terminator for table '{table}' not found")
    block = sql_text[data_start:terminator].strip("\n")
    rows: List[List[str | None]] = []
    if block:
        for line in block.splitlines():
            if not line.strip():
                continue
            parsed = [None if value == "\\N" else value for value in line.split("\t")]
            rows.append(parsed)
    return columns, rows


def as_dicts(columns: Iterable[str], rows: Iterable[List[str | None]]) -> List[Dict[str, str | None]]:
    cols = list(columns)
    return [dict(zip(cols, row)) for row in rows]


def maybe_load(table: str, sql_text: str) -> Tuple[List[str], List[List[str | None]]]:
    try:
        return extract_copy_block(sql_text, table)
    except ValueError:
        return [], []


def merged_rows(table: str) -> Tuple[List[str], List[List[str | None]]]:
    base_cols, base_rows = extract_copy_block(read_sql(SQL_PATH), table)
    if ORDERS_SQL_PATH.exists():
        extra_cols, extra_rows = maybe_load(table, read_sql(ORDERS_SQL_PATH))
        if extra_rows and extra_cols != base_cols:
            raise ValueError(f"Column mismatch for table '{table}' between dumps")
        base_rows.extend(extra_rows)
    return base_cols, base_rows


def load_foods() -> List[Food]:
    columns, rows = extract_copy_block(read_sql(SQL_PATH), "food")
    foods = []
    for record in as_dicts(columns, rows):
        try:
            foods.append(Food(id=int(record["id"])) )
        except (TypeError, ValueError):
            continue
    return foods


def load_users() -> List[User]:
    columns, rows = extract_copy_block(read_sql(SQL_PATH), "users")
    users = []
    for record in as_dicts(columns, rows):
        try:
            users.append(User(id=int(record["id"])) )
        except (TypeError, ValueError):
            continue
    if not users:
        raise ValueError("users table must not be empty")
    return users


def load_orders_and_details() -> Tuple[Dict[int, Order], Dict[int, List[int]]]:
    order_columns, order_rows = merged_rows("orders")
    orders: Dict[int, Order] = {}
    for record in as_dicts(order_columns, order_rows):
        try:
            order_id = int(record["id"])
            user_id = int(record["user_id"])
        except (TypeError, ValueError):
            continue
        orders[order_id] = Order(id=order_id, user_id=user_id)

    detail_columns, detail_rows = merged_rows("order_detail")
    food_to_orders: Dict[int, List[int]] = {}
    for record in as_dicts(detail_columns, detail_rows):
        try:
            order_id = int(record["order_id"])
            food_id = int(record["food_id"])
        except (TypeError, ValueError):
            continue
        food_to_orders.setdefault(food_id, []).append(order_id)

    return orders, food_to_orders


def load_existing_ratings() -> Tuple[int, Dict[int, int]]:
    cols, rows = maybe_load("rating_food", read_sql(SQL_PATH))
    max_id = 0
    per_food: Dict[int, int] = {}
    for record in as_dicts(cols, rows):
        try:
            rating_id = int(record["id"])
            food_id = int(record["food_id"])
        except (TypeError, ValueError):
            continue
        max_id = max(max_id, rating_id)
        per_food[food_id] = per_food.get(food_id, 0) + 1
    return max_id, per_food


def allocate_counts(total: int) -> List[int]:
    weights = [(i + 1) * RNG.uniform(0.7, 1.3) for i in range(5)]
    weight_sum = sum(weights)
    counts = [max(0, int(round(total * w / weight_sum))) for w in weights]
    diff = total - sum(counts)
    while diff != 0:
        idx = 4 if diff > 0 else RNG.randrange(5)
        if diff < 0 and counts[idx] == 0:
            continue
        counts[idx] += 1 if diff > 0 else -1
        diff += -1 if diff > 0 else 1
    for i in range(1, 5):
        if counts[i] < counts[i - 1]:
            transfer = counts[i - 1] - counts[i]
            counts[i] += transfer
            counts[i - 1] -= transfer
    return counts


COMMENTS = {
    1: [
        "Không hài lòng",
        "Món nguội và không ngon",
        "Không giống mô tả",
    ],
    2: [
        "Cần cải thiện gia vị",
        "Phục vụ hơi chậm",
        "Không như kỳ vọng",
    ],
    3: [
        "Tạm được",
        "Ổn so với giá",
        "Có thể sẽ đặt lại",
    ],
    4: [
        "Món ngon và nóng",
        "Đóng gói cẩn thận",
        "Giao nhanh, sẽ ủng hộ",
    ],
    5: [
        "Rất ngon, đáng tiền",
        "Siêu hài lòng",
        "Sẽ giới thiệu cho bạn bè",
    ],
}


def pick_order(food_id: int, food_to_orders: Dict[int, List[int]], orders: Dict[int, Order]) -> Order:
    candidates = food_to_orders.get(food_id) or list(orders.keys())
    order_id = RNG.choice(candidates)
    return orders[order_id]


def generate_ratings() -> None:
    foods = load_foods()
    users = load_users()
    orders, food_to_orders = load_orders_and_details()
    max_id, existing_counts = load_existing_ratings()

    user_ids = [user.id for user in users]
    next_id = max_id + 1
    rows: List[str] = []

    for food in foods:
        current = existing_counts.get(food.id, 0)
        target = max(current, RNG.randint(5, 20))
        additional = target - current
        if additional <= 0:
            continue
        counts_per_star = allocate_counts(additional)
        for star, star_count in enumerate(counts_per_star, start=1):
            if star_count <= 0:
                continue
            comments = COMMENTS.get(star, COMMENTS[3])
            for _ in range(star_count):
                order = pick_order(food.id, food_to_orders, orders)
                user_id = order.user_id if RNG.random() < 0.8 else RNG.choice(user_ids)
                content = RNG.choice(comments)
                rows.append(
                    "\t".join(
                        [
                            str(next_id),
                            str(user_id),
                            str(food.id),
                            content,
                            f"{float(star):.1f}",
                            str(order.id),
                        ]
                    )
                )
                next_id += 1

    if not rows:
        print("No new ratings needed; all foods already satisfy minimum counts.")
        return

    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    header = "COPY public.rating_food (id, user_id, food_id, content, point, order_id) FROM stdin;"
    with OUTPUT_PATH.open("w", encoding="utf-8", newline="\n") as fp:
        fp.write("\\encoding UTF8\n\n")
        fp.write(header + "\n")
        fp.write("\n".join(rows))
        fp.write("\n\\.\n")

    print(f"Generated {len(rows)} rating_food rows in {OUTPUT_PATH}.")


if __name__ == "__main__":
    generate_ratings()