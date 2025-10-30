import os
import json
import unicodedata
import re
from flask import Flask, request, jsonify, render_template
import google.generativeai as genai
from decimal import Decimal
from flask_sqlalchemy import SQLAlchemy

# --- CONFIG ---
genai.configure(api_key="AIzaSyA83GwBcdmSv-Jqg75-87Iah3A6N1fpixU")
app = Flask(__name__)
app.config['JSON_AS_ASCII'] = False

# --- Database ---
app.config['SQLALCHEMY_DATABASE_URI'] = 'postgresql://postgres@localhost/fastfood_db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db = SQLAlchemy(app)

# --- Global data ---
MENU = []
SESSIONS = {}  # {session_id: {'cart': [], 'state': {}}}

# --- Models ---
class Food(db.Model):
    __tablename__ = 'food'
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String)
    price = db.Column(db.Numeric)
    store_id = db.Column(db.Integer)
    description = db.Column(db.String)
    cate_id = db.Column(db.Integer, db.ForeignKey('category.id'))


class FoodSize(db.Model):
    __tablename__ = 'food_size'
    id = db.Column(db.Integer, primary_key=True)
    size_name = db.Column(db.String)
    price = db.Column(db.Numeric)
    food_id = db.Column(db.Integer, db.ForeignKey('food.id'))


class Store(db.Model):
    __tablename__ = 'stores'
    id = db.Column(db.Integer, primary_key=True)
    store_name = db.Column(db.String)
    image = db.Column(db.Text)
    description = db.Column(db.String)


class Category(db.Model):
    __tablename__ = 'category'
    id = db.Column(db.Integer, primary_key=True)
    cate_name = db.Column(db.String)
    image = db.Column(db.Text)


def load_menu_from_db():
    """Load complete menu with sizes, store info, and category"""
    try:
        items = []
        foods = Food.query.all()
        
        for f in foods:
            sizes_data = FoodSize.query.filter_by(food_id=f.id).all()
            sizes = []
            for fs in sizes_data:
                if fs.size_name:
                    price = int(fs.price) if fs.price else None
                    sizes.append({"name": fs.size_name, "price": price})
            
            store = Store.query.filter_by(id=f.store_id).first() if f.store_id else None
            store_name = store.store_name if store else "Không xác định"
            
            # Get category info
            category = Category.query.filter_by(id=f.cate_id).first() if f.cate_id else None
            category_name = category.cate_name if category else None
            
            base_price = None
            if isinstance(f.price, Decimal):
                base_price = int(f.price)
            else:
                try:
                    base_price = int(float(f.price)) if f.price else None
                except:
                    pass

            entry = {
                "id": f.id,
                "name": f.title or 'Unknown',
                "price": base_price,
                "store_id": f.store_id,
                "store_name": store_name,
                "description": f.description or "",
                "cate_id": f.cate_id,
                "category": category_name
            }
            
            if sizes:
                entry["sizes"] = sizes
                
            items.append(entry)

        return items if items else []
    except Exception as e:
        print(f'Warning: could not load menu from DB: {e}')
        return [
            {"id": 1, "name": "Gà Rán", "price": 45000, "store_id": 1, "store_name": "KFC", "category": "Gà giòn",
             "sizes": [{"name": "S", "price": 45000}, {"name": "M", "price": 55000}, {"name": "L", "price": 65000}]},
            {"id": 2, "name": "Khoai Tây", "price": 25000, "store_id": 1, "store_name": "KFC", "category": "Khoai tây chiên"},
            {"id": 3, "name": "Pepsi", "price": 10000, "store_id": 1, "store_name": "KFC", "category": "Nước giải khát",
             "sizes": [{"name": "M", "price": 10000}, {"name": "L", "price": 15000}]},
        ]


def get_session(session_id):
    """Get or create session data"""
    if session_id not in SESSIONS:
        SESSIONS[session_id] = {'cart': [], 'state': {}}
    return SESSIONS[session_id]


def find_menu_items(keyword):
    """Find all menu items matching keyword.

    This function is diacritics-insensitive and scores matches so we can
    prefer exact or name-matches over description-only matches. The
    returned list is sorted by score descending and each item gets a
    temporary '_score' field (harmless to callers).
    """
    def normalize_text(s: str) -> str:
        if not s:
            return ""
        s = str(s).lower()
        # remove diacritics
        s = unicodedata.normalize('NFD', s)
        s = ''.join(ch for ch in s if unicodedata.category(ch) != 'Mn')
        # collapse whitespace
        s = re.sub(r"\s+", " ", s).strip()
        return s

    kw = normalize_text(keyword)
    if not kw:
        return []

    kw_tokens = set(re.findall(r"\w+", kw))
    matches = []

    for item in MENU:
        name = item.get('name', '') or ''
        desc = item.get('description', '') or ''
        category = item.get('category', '') or ''

        name_n = normalize_text(name)
        desc_n = normalize_text(desc)
        cat_n = normalize_text(category)

        score = 0

        # exact name match
        if name_n == kw:
            score += 120

        # keyword in name
        if kw in name_n:
            score += 60

        # keyword in description
        if kw in desc_n:
            score += 40

        # keyword in category
        if kw in cat_n:
            score += 30

        # token overlap (bonus) and stronger boost for exact token in name
        name_tokens = set(re.findall(r"\w+", name_n))
        desc_tokens = set(re.findall(r"\w+", desc_n))
        common_name = kw_tokens & name_tokens
        common_desc = kw_tokens & desc_tokens
        score += len(common_name) * 10
        score += len(common_desc) * 4

        # If the query is short (1 token) and that token appears in the item's name,
        # give a larger boost to prefer it for short requests like "gà".
        if len(kw_tokens) == 1 and len(common_name) == 1:
            score += 40

        # If no match at all, skip
        if score <= 0:
            continue

        item_copy = dict(item)
        item_copy['_score'] = score
        matches.append(item_copy)

    # Sort by score desc, then prefer items with a price (deterministic tie-breaker)
    matches.sort(key=lambda x: (-x.get('_score', 0), x.get('price') or 0))
    return matches


def group_by_store(items):
    """Group items by store_id"""
    stores = {}
    for item in items:
        sid = item['store_id']
        if sid not in stores:
            stores[sid] = {
                'store_id': sid,
                'store_name': item['store_name'],
                'items': []
            }
        stores[sid]['items'].append(item)
    return list(stores.values())


# Load menu at startup
with app.app_context():
    MENU = load_menu_from_db()


@app.route("/chat", methods=["POST"])
def chat():
    data = request.json
    user_message = data.get("message", "").strip()
    session_id = data.get("session_id", "default")
    
    session = get_session(session_id)
    state = session['state']
    
    # === CHECK IF USER WANTS TO START NEW REQUEST ===
    user_lower = user_message.lower().strip()
    
    # Keywords that indicate a NEW order/request (not a selection)
    new_request_keywords = [
        'cho tôi', 'tôi muốn', 'đặt', 'gọi', 'order', 
        'các món', 'món nào', 'có món', 'menu', 'thực đơn',
        'thêm món', 'và', 'với'  # "1 gà và 2 nước" contains "và"
    ]
    
    # Simple selection patterns (when waiting for input)
    selection_patterns = ['m', 'l', 's', 'xl', 'xxl']
    
    # Check if this is clearly a new request
    is_new_request = False
    
    if state.get('waiting_for'):
        # If message contains new request keywords, it's a new request
        if any(keyword in user_lower for keyword in new_request_keywords):
            is_new_request = True
        # If message is NOT just a number or simple size, it's probably new request
        elif not (user_message.strip().isdigit() or user_lower in selection_patterns):
            # Check length - if too long for a selection, it's new request
            if len(user_message.strip()) > 15:
                is_new_request = True
    
    # Reset state if new request detected
    if is_new_request:
        state.clear()
    
    # === HANDLE DIRECT MENU QUERIES (bypass AI) ===
    # Check if user is asking about menu/categories - MUST check before AI processing
    menu_query_keywords = ['các món', 'món nào', 'có món gì', 'menu', 'thực đơn', 'danh sách', 'tất cả', 'món ăn']
    is_menu_query = any(keyword in user_lower for keyword in menu_query_keywords)
    
    # Also check if NOT an order (doesn't have quantity indicators)
    order_indicators = ['cho tôi', 'tôi muốn', 'đặt', 'gọi', 'thêm']
    has_order_intent = any(indicator in user_lower for indicator in order_indicators)
    
    if is_menu_query and not has_order_intent and not state.get('waiting_for'):
        # Check if user specified a store
        target_store_id = None
        target_store_name = None
        
        # Common store name patterns
        store_keywords = {
            'kfc': ['kfc', 'ken'],
            'mcdonalds': ['mcdonalds', 'mcdonald', 'mc donald', 'mc'],
            'burger king': ['burger king', 'burgerking', 'bk'],
            'pizza hut': ['pizza hut', 'pizzahut'],
            'dominos': ['dominos', 'domino'],
            'lotteria': ['lotteria'],
            'jollibee': ['jollibee'],
            'popeyes': ['popeyes'],
        }
        
        # Check if any store keyword is mentioned
        for store_key, keywords in store_keywords.items():
            if any(kw in user_lower for kw in keywords):
                # Find store in database
                try:
                    store = Store.query.filter(Store.store_name.ilike(f"%{store_key}%")).first()
                    if store:
                        target_store_id = store.id
                        target_store_name = store.store_name
                        break
                except:
                    pass
                
                # Fallback: search in MENU
                if not target_store_id:
                    for item in MENU:
                        if any(kw in item['store_name'].lower() for kw in keywords):
                            target_store_id = item['store_id']
                            target_store_name = item['store_name']
                            break
                
                if target_store_id:
                    break
        
        # Map user keywords to category names
        category_mapping = {
            'gà giòn': ['gà giòn', 'gà rán', 'fried chicken', 'gà', 'chicken'],
            'burger': ['burger', 'hamburger'],
            'mỳ ý': ['mỳ ý', 'pasta', 'spaghetti'],
            'khoai tây chiên': ['khoai tây', 'khoai', 'fries', 'french fries'],
            'món phụ': ['món phụ', 'side', 'phụ'],
            'tráng miệng': ['tráng miệng', 'dessert', 'ngọt', 'bánh ngọt'],
            'nước giải khát': ['nước', 'drink', 'nước giải khát', 'pepsi', 'coca', 'coke'],
            'món thêm': ['món thêm', 'thêm', 'extra']
        }
        
        # Find matching category
        target_category = None
        for cate_name, keywords in category_mapping.items():
            if any(kw in user_lower for kw in keywords):
                target_category = cate_name
                break
        
        # Find matching items
        matches = []
        
        # Filter by store if specified
        if target_store_id:
            store_items = [item for item in MENU if item['store_id'] == target_store_id]
            
            # Then filter by category if specified
            if target_category:
                matches = [
                    item for item in store_items
                    if item.get('category') and target_category.lower() in item['category'].lower()
                ]
                
                # Fuzzy search fallback
                if not matches:
                    search_keywords = category_mapping.get(target_category, [target_category])
                    for item in store_items:
                        item_text = f"{item['name']} {item.get('description', '')}".lower()
                        if any(kw in item_text for kw in search_keywords):
                            matches.append(item)
            else:
                # All items from this store
                matches = store_items
        else:
            # No specific store - filter by category only
            if target_category:
                matches = [
                    item for item in MENU 
                    if item.get('category') and target_category.lower() in item['category'].lower()
                ]
                
                # Fuzzy search fallback
                if not matches:
                    search_keywords = category_mapping.get(target_category, [target_category])
                    for item in MENU:
                        item_text = f"{item['name']} {item.get('description', '')}".lower()
                        if any(kw in item_text for kw in search_keywords):
                            matches.append(item)
            else:
                # Show all menu (limit to 30 items)
                matches = MENU[:30]
        
        if not matches:
            msg = f"❌ Xin lỗi, "
            if target_store_name and target_category:
                msg += f"{target_store_name} hiện không có món {target_category}."
            elif target_store_name:
                msg += f"{target_store_name} hiện không có món nào trong menu."
            elif target_category:
                msg += f"hiện không có món {target_category}."
            else:
                msg += "không tìm thấy món nào."
            
            return app.response_class(
                json.dumps({
                    "intent": "show_menu",
                    "reply": msg
                }, ensure_ascii=False),
                mimetype='application/json'
            )
        
        # Group by store and format output
        stores_dict = {}
        for item in matches:
            store_id = item['store_id']
            if store_id not in stores_dict:
                stores_dict[store_id] = {
                    'store_name': item['store_name'],
                    'items': []
                }
            stores_dict[store_id]['items'].append(item)
        
        # Build response
        title_parts = []
        if target_category:
            title_parts.append(f"món {target_category}")
        else:
            title_parts.append("menu")
        
        if target_store_name:
            title_parts.append(f"tại {target_store_name}")
        
        title = " ".join(title_parts)
        response_text = f"🍽️ **Danh sách {title}:**\n\n"
        
        for store_id, store_data in stores_dict.items():
            response_text += f"🏪 **{store_data['store_name']}**\n"
            
            for item in store_data['items']:
                if item.get('sizes'):
                    # Item has sizes
                    for size in item['sizes']:
                        price_str = f"{size['price']:,}đ" if size['price'] else "Liên hệ"
                        response_text += f"  • {item['name']} - Size {size['name']} - {price_str}\n"
                else:
                    # No sizes
                    price_str = f"{item['price']:,}đ" if item['price'] else "Liên hệ"
                    response_text += f"  • {item['name']} - {price_str}\n"
            
            response_text += "\n"
        
        response_text += "💬 Để đặt món, hãy nói: 'Cho tôi 1 [tên món]'"
        
        return app.response_class(
            json.dumps({
                "intent": "show_menu",
                "reply": response_text,
                "items": matches,
                "count": len(matches),
                "category": target_category,
                "store": target_store_name
            }, ensure_ascii=False),
            mimetype='application/json'
        )
    
    # === HANDLE PENDING SELECTIONS ===
    
    # 1. Waiting for size selection
    if state.get('waiting_for') == 'size':
        pending = state['pending_item']
        size_options = state['size_options']
        
        # Try to match user input with available sizes
        user_input = user_message.upper()
        matched_size = None
        
        for size_opt in size_options:
            if size_opt['name'].upper() == user_input or user_input in size_opt['name'].upper():
                matched_size = size_opt
                break
        
        if not matched_size:
            # Check if user input is a number (option index)
            try:
                idx = int(user_message) - 1
                if 0 <= idx < len(size_options):
                    matched_size = size_options[idx]
            except:
                pass
        
        if matched_size:
            # Add to cart with selected size
            cart_item = {
                'food_id': pending['food_id'],
                'name': pending['name'],
                'store_name': pending['store_name'],
                'store_id': pending['store_id'],
                'quantity': pending['quantity'],
                'size': matched_size['name'],
                'price': matched_size['price'] or 0
            }
            session['cart'].append(cart_item)
            
            # Check if there are more pending items
            if state.get('pending_queue'):
                next_item = state['pending_queue'].pop(0)
                if not state['pending_queue']:
                    del state['pending_queue']
                
                # Process next item
                return process_item_for_cart(session_id, next_item)
            
            # All done
            state.clear()
            price_display = f"{matched_size['price']:,}đ" if matched_size['price'] else "Liên hệ"
            return app.response_class(
                json.dumps({
                    "intent": "add_to_cart",
                    "reply": f"✅ Đã thêm {cart_item['quantity']} {cart_item['name']} ({cart_item['store_name']}) size {matched_size['name']} - {price_display} vào giỏ hàng!"
                }, ensure_ascii=False),
                mimetype='application/json'
            )
        else:
            sizes_str = ", ".join([f"{i+1}. {s['name']}" for i, s in enumerate(size_options)])
            return app.response_class(
                json.dumps({
                    "intent": "ask_size",
                    "reply": f"❌ Size không hợp lệ. Vui lòng chọn:\n{sizes_str}"
                }, ensure_ascii=False),
                mimetype='application/json'
            )
    
    # 2. Waiting for store selection
    if state.get('waiting_for') == 'store':
        pending_items = state['pending_items']
        store_options = state['store_options']
        
        # Try to match store
        user_input = user_message.lower()
        selected_store = None
        
        # Try by number
        try:
            idx = int(user_message) - 1
            if 0 <= idx < len(store_options):
                selected_store = store_options[idx]
        except:
            # Try by name
            for store in store_options:
                if user_input in store['store_name'].lower():
                    selected_store = store
                    break
        
        if selected_store:
            # Filter items by selected store and process them
            store_id = selected_store['store_id']
            items_from_store = []
            
            for req in pending_items:
                matches = [m for m in req['matches'] if m['store_id'] == store_id]
                if matches:
                    items_from_store.append({
                        'requested': req['requested'],
                        'menu_item': matches[0]
                    })
            
            if not items_from_store:
                state.clear()
                return app.response_class(
                    json.dumps({
                        "intent": "error",
                        "reply": "❌ Cửa hàng này không có món bạn yêu cầu."
                    }, ensure_ascii=False),
                    mimetype='application/json'
                )
            
            # Process first item (might ask for size)
            state.clear()
            state['pending_queue'] = items_from_store[1:]  # Save rest for later
            return process_item_for_cart(session_id, items_from_store[0])
        else:
            stores_str = "\n".join([f"{i+1}. {s['store_name']}" for i, s in enumerate(store_options)])
            return app.response_class(
                json.dumps({
                    "intent": "ask_store",
                    "reply": f"❌ Không tìm thấy cửa hàng. Vui lòng chọn:\n{stores_str}"
                }, ensure_ascii=False),
                mimetype='application/json'
            )
    
    # === NEW REQUEST - PARSE WITH GEMINI ===
    
    model = genai.GenerativeModel("gemini-2.5-flash")
    
    menu_summary = []
    for item in MENU[:50]:  # Limit to avoid token overflow
        summary = f"- {item['name']} ({item['store_name']})"
        if "sizes" in item:
            summary += f" - có size"
        menu_summary.append(summary)
    
    prompt = f"""
Bạn là chatbot bán đồ ăn. Phân tích yêu cầu và trả JSON.

MENU (một phần):
{chr(10).join(menu_summary)}

Yêu cầu: "{user_message}"

Trả về JSON:
{{
  "intent": "add_to_cart" | "show_cart" | "show_menu" | "greeting" | "other",
  "items": [
    {{"name": "tên món gần đúng", "quantity": số_lượng}}
  ],
  "reply": "câu trả lời thân thiện"
}}

Chỉ JSON, không markdown.
"""
    
    try:
        response = model.generate_content(prompt)
        text = response.text.strip().replace("```json", "").replace("```", "").strip()
        parsed = json.loads(text)
    except Exception as e:
        return app.response_class(
            json.dumps({"error": f"Lỗi phân tích: {str(e)}"}, ensure_ascii=False),
            mimetype='application/json'
        )
    
    intent = parsed.get("intent")
    
    # === HANDLE INTENTS ===
    
    if intent == "add_to_cart":
        requested_items = parsed.get("items", [])
        
        if not requested_items:
            return app.response_class(
                json.dumps({
                    "intent": "error",
                    "reply": "Bạn muốn đặt món gì ạ? Ví dụ: '1 gà rán và 2 nước'"
                }, ensure_ascii=False),
                mimetype='application/json'
            )
        
        # Check if user specified a store in the message
        specified_store_id = None
        specified_store_name = None
        
        store_keywords = {
            'kfc': ['kfc', 'ken'],
            'mcdonalds': ['mcdonalds', 'mcdonald', 'mc donald', 'mc'],
            'burger king': ['burger king', 'burgerking', 'bk'],
            'pizza hut': ['pizza hut', 'pizzahut'],
            'dominos': ['dominos', 'domino'],
            'lotteria': ['lotteria'],
            'jollibee': ['jollibee'],
            'popeyes': ['popeyes'],
        }
        
        # Common phrases indicating store specification
        store_phrases = ['của', 'từ', 'ở', 'tại', 'at', 'from']
        has_store_phrase = any(phrase in user_lower for phrase in store_phrases)
        
        if has_store_phrase:
            for store_key, keywords in store_keywords.items():
                if any(kw in user_lower for kw in keywords):
                    # Find store in database
                    try:
                        store = Store.query.filter(Store.store_name.ilike(f"%{store_key}%")).first()
                        if store:
                            specified_store_id = store.id
                            specified_store_name = store.store_name
                            break
                    except:
                        pass
                    
                    # Fallback: search in MENU
                    if not specified_store_id:
                        for item in MENU:
                            if any(kw in item['store_name'].lower() for kw in keywords):
                                specified_store_id = item['store_id']
                                specified_store_name = item['store_name']
                                break
                    
                    if specified_store_id:
                        break
        
        # Find matches for each requested item
        items_with_matches = []
        not_found = []
        
        for req in requested_items:
            name = req.get("name", "")
            quantity = req.get("quantity", 1)
            
            matches = find_menu_items(name)
            
            # Filter by specified store if provided
            if specified_store_id:
                matches = [m for m in matches if m['store_id'] == specified_store_id]
            
            if not matches:
                not_found.append(name)
            else:
                items_with_matches.append({
                    'requested': {'name': name, 'quantity': quantity},
                    'matches': matches
                })
        
        if not_found:
            msg = "❌ Không tìm thấy: " + ", ".join(not_found)
            if specified_store_name:
                msg += f" tại {specified_store_name}"
            return app.response_class(
                json.dumps({"intent": "not_found", "reply": msg}, ensure_ascii=False),
                mimetype='application/json'
            )

        # If user requested a single item and the top-scored match is
        # significantly better than the next one, auto-select that match
        # to avoid unnecessary store/clarification questions.
        if len(items_with_matches) == 1:
            matches = items_with_matches[0]['matches']
            if matches:
                top = matches[0]
                top_score = top.get('_score', 0)
                second_score = matches[1]['_score'] if len(matches) > 1 else 0

                # Auto-select heuristics:
                # - if top score is very high (absolute)
                # - OR if top is meaningfully better than the second
                # - OR for single-token queries give a slightly looser margin
                kw = items_with_matches[0]['requested']['name']
                kw_n = re.sub(r"\s+", " ", unicodedata.normalize('NFD', str(kw)).lower())
                kw_tokens_local = set(re.findall(r"\w+", kw_n))

                auto_select = False
                if top_score >= 100:
                    auto_select = True
                elif top_score >= second_score + 15:
                    auto_select = True
                elif len(kw_tokens_local) == 1 and top_score >= 70:
                    auto_select = True

                if auto_select:
                    selected = {k: v for k, v in top.items() if k != '_score'}
                    items_to_process = [{
                        'requested': items_with_matches[0]['requested'],
                        'menu_item': selected
                    }]
                    state.clear()
                    if len(items_to_process) > 1:
                        state['pending_queue'] = items_to_process[1:]
                    return process_item_for_cart(session_id, items_to_process[0])
        
        # Check stores and matches
        all_store_ids = set()
        total_matches = 0
        for item_data in items_with_matches:
            total_matches += len(item_data['matches'])
            for match in item_data['matches']:
                all_store_ids.add(match['store_id'])
        
        # ONLY auto-select store if:
        # 1. User explicitly specified store in message OR
        # 2. There's EXACTLY ONE match total (one item, one store)
        auto_select_store = False
        selected_store_id = None
        
        if specified_store_id:
            # User explicitly specified store
            auto_select_store = True
            selected_store_id = specified_store_id
        elif total_matches == 1:
            # Only ONE match in total - can auto select
            auto_select_store = True
            selected_store_id = items_with_matches[0]['matches'][0]['store_id']
        
        if auto_select_store:
            # Process directly
            items_to_process = []
            
            for item_data in items_with_matches:
                match = next((m for m in item_data['matches'] if m['store_id'] == selected_store_id), None)
                if match:
                    items_to_process.append({
                        'requested': item_data['requested'],
                        'menu_item': match
                    })
            
            if not items_to_process:
                return app.response_class(
                    json.dumps({
                        "intent": "not_found",
                        "reply": f"❌ Không tìm thấy món bạn yêu cầu tại {specified_store_name or 'cửa hàng đã chọn'}."
                    }, ensure_ascii=False),
                    mimetype='application/json'
                )
            
            state.clear()
            if len(items_to_process) > 1:
                state['pending_queue'] = items_to_process[1:]
            return process_item_for_cart(session_id, items_to_process[0])
        
        # Multiple stores OR multiple matches - ALWAYS ask user to choose
        # Build detailed options showing all available combinations
        stores_info = {}
        for item_data in items_with_matches:
            item_name = item_data['requested']['name']
            for match in item_data['matches']:
                sid = match['store_id']
                if sid not in stores_info:
                    stores_info[sid] = {
                        'store_id': sid,
                        'store_name': match['store_name'],
                        'items': []
                    }
                # Add with price info (handle None price)
                price = match.get('price')
                if price and price > 0:
                    price_str = f"{price:,}đ"
                    item_str = f"{match['name']} ({price_str})"
                else:
                    item_str = match['name']
                
                stores_info[sid]['items'].append(item_str)
        
        store_options = []
        stores_str = "🏪 **Món bạn yêu cầu có ở nhiều cửa hàng:**\n\n"
        
        for i, (sid, info) in enumerate(stores_info.items(), 1):
            items_list = "\n     • ".join(info['items'])
            stores_str += f"{i}. **{info['store_name']}**\n     • {items_list}\n\n"
            store_options.append({
                'store_id': info['store_id'],
                'store_name': info['store_name'],
                'items': info['items']
            })
        
        stores_str += "💬 Bạn muốn đặt từ cửa hàng nào? (Nhập số hoặc tên cửa hàng)"
        
        state['waiting_for'] = 'store'
        state['pending_items'] = items_with_matches
        state['store_options'] = store_options
        
        return app.response_class(
            json.dumps({
                "intent": "ask_store",
                "reply": stores_str,
                "stores": store_options
            }, ensure_ascii=False),
            mimetype='application/json'
        )
    
    elif intent == "show_cart":
        cart = session['cart']
        if not cart:
            return app.response_class(
                json.dumps({
                    "intent": "show_cart",
                    "reply": "🛒 Giỏ hàng trống."
                }, ensure_ascii=False),
                mimetype='application/json'
            )
        
        total = 0
        cart_str = "🛒 Giỏ hàng:\n\n"
        for i, item in enumerate(cart, 1):
            item_total = item['price'] * item['quantity']
            total += item_total
            cart_str += f"{i}. {item['quantity']}x {item['name']}"
            if item.get('size'):
                cart_str += f" (size {item['size']})"
            cart_str += f"\n   {item['store_name']} - {item_total:,}đ\n"
        
        cart_str += f"\n💰 Tổng: {total:,}đ"
        
        return app.response_class(
            json.dumps({
                "intent": "show_cart",
                "cart": cart,
                "total": total,
                "reply": cart_str
            }, ensure_ascii=False),
            mimetype='application/json'
        )
    
    # Default: return AI reply
    return app.response_class(
        json.dumps(parsed, ensure_ascii=False),
        mimetype='application/json'
    )


def process_item_for_cart(session_id, item_data):
    """Process a single item - ask for size if needed, or add to cart"""
    session = get_session(session_id)
    state = session['state']
    
    requested = item_data['requested']
    menu_item = item_data['menu_item']
    
    # Check if item has sizes
    if menu_item.get('sizes'):
        sizes = menu_item['sizes']
        
        if len(sizes) == 1:
            # Only one size - auto select
            cart_item = {
                'food_id': menu_item['id'],
                'name': menu_item['name'],
                'store_name': menu_item['store_name'],
                'store_id': menu_item['store_id'],
                'quantity': requested['quantity'],
                'size': sizes[0]['name'],
                'price': sizes[0]['price'] or 0
            }
            session['cart'].append(cart_item)
            
            # Check for more pending items
            if state.get('pending_queue'):
                next_item = state['pending_queue'].pop(0)
                if not state['pending_queue']:
                    del state['pending_queue']
                return process_item_for_cart(session_id, next_item)
            
            state.clear()
            price_display = f"{sizes[0]['price']:,}đ" if sizes[0]['price'] else "Liên hệ"
            return app.response_class(
                json.dumps({
                    "intent": "add_to_cart",
                    "reply": f"✅ Đã thêm {cart_item['quantity']} {cart_item['name']} size {sizes[0]['name']} - {price_display}"
                }, ensure_ascii=False),
                mimetype='application/json'
            )
        
        # Multiple sizes - ask user
        sizes_str = "\n".join([
            f"{i+1}. Size {s['name']}" + (f" - {s['price']:,}đ" if s['price'] else " - Liên hệ")
            for i, s in enumerate(sizes)
        ])
        
        state['waiting_for'] = 'size'
        state['pending_item'] = {
            'food_id': menu_item['id'],
            'name': menu_item['name'],
            'store_name': menu_item['store_name'],
            'store_id': menu_item['store_id'],
            'quantity': requested['quantity']
        }
        state['size_options'] = sizes
        
        return app.response_class(
            json.dumps({
                "intent": "ask_size",
                "reply": f"📦 {menu_item['name']} ({menu_item['store_name']}) có các size:\n{sizes_str}\n\nBạn chọn size nào?"
            }, ensure_ascii=False),
            mimetype='application/json'
        )
    
    # No sizes - add directly
    cart_item = {
        'food_id': menu_item['id'],
        'name': menu_item['name'],
        'store_name': menu_item['store_name'],
        'store_id': menu_item['store_id'],
        'quantity': requested['quantity'],
        'price': menu_item['price'] or 0
    }
    session['cart'].append(cart_item)
    
    # Check for more pending items
    if state.get('pending_queue'):
        next_item = state['pending_queue'].pop(0)
        if not state['pending_queue']:
            del state['pending_queue']
        return process_item_for_cart(session_id, next_item)
    
    state.clear()
    price_display = f"{cart_item['price']:,}đ" if cart_item['price'] else "Liên hệ"
    return app.response_class(
        json.dumps({
            "intent": "add_to_cart",
            "reply": f"✅ Đã thêm {cart_item['quantity']} {cart_item['name']} - {price_display}"
        }, ensure_ascii=False),
        mimetype='application/json'
    )


@app.route("/cart", methods=["GET"])
def get_cart():
    session_id = request.args.get("session_id", "default")
    session = get_session(session_id)
    cart = session['cart']
    total = sum(item['price'] * item['quantity'] for item in cart)
    
    return app.response_class(
        json.dumps({
            "cart": cart,
            "total": total,
            "count": len(cart)
        }, ensure_ascii=False),
        mimetype='application/json'
    )


@app.route("/cart/clear", methods=["POST"])
def clear_cart():
    session_id = request.json.get("session_id", "default")
    session = get_session(session_id)
    session['cart'].clear()
    session['state'].clear()
    
    return app.response_class(
        json.dumps({"message": "Đã xóa giỏ hàng"}, ensure_ascii=False),
        mimetype='application/json'
    )


@app.route('/stores', methods=['GET'])
def list_stores():
    try:
        stores = Store.query.all()
        out = [
            {
                'id': s.id,
                'store_name': s.store_name,
                'description': s.description,
                'image': s.image
            }
            for s in stores
        ]
        return app.response_class(
            json.dumps({'stores': out}, ensure_ascii=False),
            mimetype='application/json'
        )
    except Exception as e:
        return app.response_class(
            json.dumps({'error': str(e)}, ensure_ascii=False),
            mimetype='application/json'
        )


@app.route('/categories', methods=['GET'])
def list_categories():
    """Get all food categories"""
    try:
        categories = Category.query.all()
        out = [
            {
                'id': c.id,
                'cate_name': c.cate_name,
                'image': c.image
            }
            for c in categories
        ]
        return app.response_class(
            json.dumps({'categories': out}, ensure_ascii=False),
            mimetype='application/json'
        )
    except Exception as e:
        return app.response_class(
            json.dumps({'error': str(e)}, ensure_ascii=False),
            mimetype='application/json'
        )


@app.route("/menu", methods=["GET"])
def get_menu():
    return app.response_class(
        json.dumps({'menu': MENU}, ensure_ascii=False),
        mimetype='application/json'
    )


@app.route("/")
def index():
    return render_template('index.html')


if __name__ == "__main__":
    app.run(port=5000, debug=True)