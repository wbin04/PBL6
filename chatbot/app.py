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


class OrderDetail(db.Model):
    __tablename__ = 'order_detail'
    id = db.Column(db.Integer, primary_key=True)
    order_id = db.Column(db.Integer, db.ForeignKey('orders.id'))
    food_id = db.Column(db.Integer, db.ForeignKey('food.id'))
    food_option_id = db.Column(db.Integer)
    quantity = db.Column(db.Integer)
    food_price = db.Column(db.Numeric)
    food_option_price = db.Column(db.Numeric)


class RatingFood(db.Model):
    __tablename__ = 'rating_food'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer)
    food_id = db.Column(db.Integer, db.ForeignKey('food.id'))
    content = db.Column(db.String)
    point = db.Column(db.Integer)
    order_id = db.Column(db.Integer)


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
        SESSIONS[session_id] = {
            'cart': [], 
            'state': {},
            'last_mentioned_item': None  # Track last item for context
        }
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


def get_popular_items(limit=5):
    """Get best-selling items based on ORDER_DETAIL"""
    try:
        # Query: SELECT food_id, SUM(quantity) as total_sold
        #        FROM order_detail
        #        GROUP BY food_id
        #        ORDER BY total_sold DESC
        #        LIMIT limit
        from sqlalchemy import func
        
        results = db.session.query(
            OrderDetail.food_id,
            func.sum(OrderDetail.quantity).label('total_sold')
        ).group_by(OrderDetail.food_id)\
         .order_by(func.sum(OrderDetail.quantity).desc())\
         .limit(limit)\
         .all()
        
        popular_items = []
        for food_id, total_sold in results:
            # Find in MENU
            for item in MENU:
                if item['id'] == food_id:
                    item_copy = dict(item)
                    item_copy['total_sold'] = int(total_sold)
                    popular_items.append(item_copy)
                    break
        
        return popular_items
    except Exception as e:
        print(f"[ERROR] get_popular_items: {e}")
        return []


def get_top_rated_items(limit=5, min_rating=4):
    """Get highest rated items from RATING_FOOD"""
    try:
        # Query: SELECT food_id, AVG(point) as avg_rating, COUNT(*) as rating_count
        #        FROM rating_food
        #        GROUP BY food_id
        #        HAVING AVG(point) >= min_rating
        #        ORDER BY avg_rating DESC, rating_count DESC
        #        LIMIT limit
        from sqlalchemy import func
        
        results = db.session.query(
            RatingFood.food_id,
            func.avg(RatingFood.point).label('avg_rating'),
            func.count(RatingFood.id).label('rating_count')
        ).group_by(RatingFood.food_id)\
         .having(func.avg(RatingFood.point) >= min_rating)\
         .order_by(func.avg(RatingFood.point).desc(), func.count(RatingFood.id).desc())\
         .limit(limit)\
         .all()
        
        top_rated = []
        for food_id, avg_rating, rating_count in results:
            # Find in MENU
            for item in MENU:
                if item['id'] == food_id:
                    item_copy = dict(item)
                    item_copy['avg_rating'] = float(avg_rating)
                    item_copy['rating_count'] = int(rating_count)
                    top_rated.append(item_copy)
                    break
        
        return top_rated
    except Exception as e:
        print(f"[ERROR] get_top_rated_items: {e}")
        return []


def get_recommended_items(limit=5):
    """Get recommended items combining popularity and ratings"""
    try:
        from sqlalchemy import func
        
        # Join ORDER_DETAIL with RATING_FOOD to get items that are both popular and well-rated
        # Query: SELECT food_id, SUM(od.quantity) as sales, AVG(rf.point) as rating, COUNT(rf.id) as reviews
        #        FROM order_detail od
        #        LEFT JOIN rating_food rf ON od.food_id = rf.food_id
        #        GROUP BY food_id
        #        HAVING AVG(rf.point) >= 3 OR AVG(rf.point) IS NULL
        #        ORDER BY (sales * 0.6 + COALESCE(rating, 3) * reviews * 0.4) DESC
        
        # Simplified: Get items that appear in both popular and top-rated
        popular = get_popular_items(20)  # Get more for better combination
        top_rated = get_top_rated_items(20, min_rating=3)  # Get more for better combination
        
        # Combine and score
        item_scores = {}
        
        for item in popular:
            food_id = item['id']
            if food_id not in item_scores:
                item_scores[food_id] = {'item': item, 'score': 0}
            item_scores[food_id]['score'] += item.get('total_sold', 0) * 0.1
        
        for item in top_rated:
            food_id = item['id']
            if food_id not in item_scores:
                item_scores[food_id] = {'item': item, 'score': 0}
            item_scores[food_id]['score'] += item.get('avg_rating', 0) * item.get('rating_count', 1) * 2
        
        # Sort by combined score
        sorted_items = sorted(item_scores.values(), key=lambda x: -x['score'])
        
        recommended = []
        for entry in sorted_items[:limit]:
            item = entry['item']
            # Add both metrics if available
            if 'total_sold' in item and 'avg_rating' in item:
                item['recommendation_reason'] = f"Bán chạy ({item['total_sold']} đơn) & Đánh giá cao ({item['avg_rating']:.1f}⭐)"
            elif 'total_sold' in item:
                item['recommendation_reason'] = f"Bán chạy ({item['total_sold']} đơn)"
            elif 'avg_rating' in item:
                item['recommendation_reason'] = f"Đánh giá cao ({item['avg_rating']:.1f}⭐)"
            recommended.append(item)
        
        return recommended
    except Exception as e:
        print(f"[ERROR] get_recommended_items: {e}")
        return []


def get_item_sales_stats(food_id):
    """Get sales statistics for a specific item"""
    try:
        from sqlalchemy import func
        
        result = db.session.query(
            func.sum(OrderDetail.quantity).label('total_sold'),
            func.count(OrderDetail.id).label('order_count')
        ).filter(OrderDetail.food_id == food_id).first()
        
        if result and result.total_sold:
            return {
                'total_sold': int(result.total_sold),
                'order_count': int(result.order_count)
            }
        return None
    except Exception as e:
        print(f"[ERROR] get_item_sales_stats: {e}")
        return None


def get_item_rating_stats(food_id):
    """Get rating statistics and top 3 reviews for a specific item"""
    try:
        from sqlalchemy import func
        
        # Get average rating and count
        stats = db.session.query(
            func.avg(RatingFood.point).label('avg_rating'),
            func.count(RatingFood.id).label('rating_count')
        ).filter(RatingFood.food_id == food_id).first()
        
        if not stats or not stats.avg_rating:
            return None
        
        # Get top 3 highest rated reviews with content
        top_reviews = db.session.query(RatingFood)\
            .filter(RatingFood.food_id == food_id)\
            .filter(RatingFood.content.isnot(None))\
            .filter(RatingFood.content != '')\
            .order_by(RatingFood.point.desc())\
            .limit(3)\
            .all()
        
        reviews = []
        for review in top_reviews:
            reviews.append({
                'rating': review.point,
                'comment': review.content
            })
        
        return {
            'avg_rating': float(stats.avg_rating),
            'rating_count': int(stats.rating_count),
            'top_reviews': reviews
        }
    except Exception as e:
        print(f"[ERROR] get_item_rating_stats: {e}")
        return None


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
        
        print(f"[DEBUG] Store selection - User input: {user_message}")
        print(f"[DEBUG] Store options: {[s['store_name'] for s in store_options]}")
        
        # Try to match store
        user_input = user_message.lower()
        selected_store = None
        
        # Try by number
        try:
            idx = int(user_message) - 1
            if 0 <= idx < len(store_options):
                selected_store = store_options[idx]
                print(f"[DEBUG] Selected by index: {selected_store['store_name']}")
        except:
            # Try by name
            for store in store_options:
                if user_input in store['store_name'].lower():
                    selected_store = store
                    print(f"[DEBUG] Selected by name: {selected_store['store_name']}")
                    break
        
        if selected_store:
            # Filter items by selected store - only process items available at this store
            store_id = selected_store['store_id']
            items_from_store = []
            items_not_available = []
            
            for req in pending_items:
                matches = [m for m in req['matches'] if m['store_id'] == store_id]
                if matches:
                    items_from_store.append({
                        'requested': req['requested'],
                        'menu_item': matches[0]
                    })
                else:
                    # This item is not available at selected store
                    items_not_available.append(req['requested']['name'])
            
            if not items_from_store:
                state.clear()
                return app.response_class(
                    json.dumps({
                        "intent": "error",
                        "reply": "❌ Cửa hàng này không có món bạn yêu cầu."
                    }, ensure_ascii=False),
                    mimetype='application/json'
                )
            
            # Inform user if some items are not available
            if items_not_available:
                unavailable_msg = f"\n⚠️ Lưu ý: {selected_store['store_name']} không có: {', '.join(items_not_available)}"
            else:
                unavailable_msg = ""
            
            # Process first item (might ask for size)
            state.clear()
            state['pending_queue'] = items_from_store[1:]  # Save rest for later
            state['unavailable_notice'] = unavailable_msg  # Store for later
            
            print(f"[DEBUG] Processing item for cart: {items_from_store[0]['menu_item']['name']}")
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

Quy tắc:
- Nếu có "cho tôi", "tôi muốn", "đặt", "gọi" + tên món/số lượng → intent là "add_to_cart"
- Trích xuất TẤT CẢ món ăn được yêu cầu (kể cả 1 món)
- Chỉ lấy tên món chính, bỏ từ "món", "cái", "phần"
- Nếu hỏi "có món X nào không", "có X không", "có bán X không" → intent là "menu_inquiry"
- Nếu hỏi "trong món X có gì", "thành phần X", "X gồm những gì" → intent là "ingredient_inquiry"
- Nếu hỏi về STATS món cụ thể: "số lượt bán món X", "đánh giá món X", "món X thế nào", "bán bao nhiêu" → intent là "item_stats", trích xuất query
- Nếu hỏi về món BÁN CHẠY: "món nào bán chạy", "món bán nhiều", "món phổ biến", "món nào bán chạy nhất" → intent là "popular_items"
- Nếu hỏi về ĐÁNH GIÁ: "món nào ngon", "đánh giá cao", "món được yêu thích", "món nào tốt nhất" → intent là "top_rated"
- Nếu hỏi GỢI Ý: "gợi ý món", "nên ăn gì", "món gì ngon", "đề xuất", "món nào nên thử" → intent là "recommendation"
- Nếu KHÔNG khớp các intent trên và chỉ hỏi chung chung "món ăn", "menu" → intent là "show_menu"

Ví dụ:
- "món nào bán chạy nhất" → popular_items
- "những món được bán gần đây" → popular_items
- "gợi ý món ngon cho tôi" → recommendation
- "số lượt bán và đánh giá món này thế nào" → item_stats, query=""
- "đánh giá món tôm burger thế nào" → item_stats, query="tôm burger"
- "có món gì" → show_menu

Trả về JSON:
{{
  "intent": "add_to_cart" | "menu_inquiry" | "ingredient_inquiry" | "item_stats" | "popular_items" | "top_rated" | "recommendation" | "show_cart" | "show_menu" | "greeting" | "other",
  "items": [
    {{"name": "tên món gần đúng", "quantity": số_lượng}}
  ],
  "query": "từ khóa tìm kiếm (cho menu_inquiry, ingredient_inquiry, item_stats)",
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
    
    # If Gemini doesn't recognize intent but message looks like order, try direct search
    if intent not in ["add_to_cart", "show_cart", "show_menu"] and has_order_intent:
        # Extract potential items from user message using simple heuristics
        # Look for patterns like "cho tôi 1 pizza", "1 gà và 2 nước"
        import re as re_module
        # Match patterns: number + word(s)
        item_pattern = r'(\d+)\s+([a-zA-ZÀ-ỹ\s]+?)(?=\s+và|\s+với|$|,|\s+\d+)'
        potential_items = re_module.findall(item_pattern, user_message, re_module.IGNORECASE)
        
        if potential_items:
            requested_items = []
            for qty_str, name in potential_items:
                name = name.strip()
                if name and len(name) > 1:
                    requested_items.append({
                        "name": name,
                        "quantity": int(qty_str) if qty_str.isdigit() else 1
                    })
            
            if requested_items:
                # Process as add_to_cart
                intent = "add_to_cart"
                parsed["intent"] = "add_to_cart"
                parsed["items"] = requested_items
    
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

        # === CASE 1: Single item requested ===
        # ALWAYS show all matching options grouped by store before asking confirmation
        if len(items_with_matches) == 1:
            matches = items_with_matches[0]['matches']
            if matches:
                # Group by store and show ALL options
                stores_dict = {}
                for match in matches:
                    sid = match['store_id']
                    if sid not in stores_dict:
                        stores_dict[sid] = {
                            'store_id': sid,
                            'store_name': match['store_name'],
                            'items': []
                        }
                    
                    # Format item with price
                    price = match.get('price')
                    if price and price > 0:
                        item_str = f"{match['name']} ({price:,}đ)"
                    else:
                        item_str = match['name']
                    
                    stores_dict[sid]['items'].append(item_str)
                
                store_options = list(stores_dict.values())
                
                # Build detailed response showing all options
                stores_str = "🏪 **Món bạn yêu cầu có ở các cửa hàng sau:**\n\n"
                
                for i, store_info in enumerate(store_options, 1):
                    items_list = "\n     • ".join(store_info['items'])
                    stores_str += f"{i}. **{store_info['store_name']}**\n     • {items_list}\n\n"
                
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
        
        # === CASE 2: Multiple items requested ===
        # Find ALL stores that have AT LEAST ONE matching item
        # Group by store and show which items are available at each store
        stores_dict = {}
        
        for item_data in items_with_matches:
            for match in item_data['matches']:
                sid = match['store_id']
                if sid not in stores_dict:
                    stores_dict[sid] = {
                        'store_id': sid,
                        'store_name': match['store_name'],
                        'items': [],
                        'matched_count': 0,
                        'item_ids': set()  # Track which requested items are added
                    }
                
                # Check if this requested item is already added to this store
                item_key = f"{item_data['requested']['name']}_{item_data['requested']['quantity']}"
                if item_key in stores_dict[sid]['item_ids']:
                    continue  # Skip duplicate
                
                stores_dict[sid]['item_ids'].add(item_key)
                
                # Add this item to the store with quantity
                quantity = item_data['requested']['quantity']
                price = match.get('price')
                if price and price > 0:
                    item_str = f"{quantity}x {match['name']} ({price:,}đ)"
                else:
                    item_str = f"{quantity}x {match['name']}"
                
                stores_dict[sid]['items'].append(item_str)
                stores_dict[sid]['matched_count'] += 1
        
        # Clean up item_ids before returning (not needed in response)
        for store in stores_dict.values():
            del store['item_ids']
        
        # Sort stores: prioritize those with more items (ideally all items)
        sorted_stores = sorted(
            stores_dict.values(), 
            key=lambda x: (-x['matched_count'], x['store_name'])
        )
        
        # Build response showing ALL stores with their available items
        store_options = []
        stores_str = "🏪 **Các cửa hàng có món bạn yêu cầu:**\n\n"
        
        for i, store_info in enumerate(sorted_stores, 1):
            items_list = "\n     • ".join(store_info['items'])
            
            # Indicate if store has all items or partial
            total_requested = len(items_with_matches)
            if store_info['matched_count'] == total_requested:
                badge = "✅ Đủ tất cả món"
            else:
                badge = f"⚠️ Có {store_info['matched_count']}/{total_requested} món"
            
            stores_str += f"{i}. **{store_info['store_name']}** ({badge})\n     • {items_list}\n\n"
            
            store_options.append({
                'store_id': store_info['store_id'],
                'store_name': store_info['store_name'],
                'items': store_info['items'],
                'matched_count': store_info['matched_count'],
                'total_requested': total_requested
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
    
    elif intent == "menu_inquiry":
        # Handle "có món X nào không"
        query = parsed.get("query", "").strip()
        if not query:
            # Try to extract from items
            items = parsed.get("items", [])
            if items:
                query = items[0].get("name", "")
        
        if not query:
            return app.response_class(
                json.dumps({
                    "intent": "menu_inquiry",
                    "reply": "Bạn muốn tìm món gì ạ?"
                }, ensure_ascii=False),
                mimetype='application/json'
            )
        
        # Search menu with description
        matches = find_menu_items(query)
        
        if not matches:
            return app.response_class(
                json.dumps({
                    "intent": "menu_inquiry",
                    "reply": f"Rất tiếc, hiện tại chúng tôi không có món nào liên quan đến '{query}' ạ."
                }, ensure_ascii=False),
                mimetype='application/json'
            )
        
        # Group by food name to show unique items
        seen_names = set()
        unique_matches = []
        for match in matches[:10]:  # Limit to top 10
            name = match['name']
            if name not in seen_names:
                seen_names.add(name)
                unique_matches.append(match)
        
        reply = f"Có ạ! Chúng tôi có các món liên quan đến '{query}':\n\n"
        for i, item in enumerate(unique_matches, 1):
            reply += f"{i}. **{item['name']}** ({item['store_name']})"
            if item.get('price') and item['price'] > 0:
                reply += f" - {item['price']:,}đ"
            reply += "\n"
            
            # Show description if available
            desc = item.get('description', '').strip()
            if desc:
                # Limit description length
                if len(desc) > 100:
                    desc = desc[:100] + "..."
                reply += f"   _{desc}_\n"
            reply += "\n"
        
        reply += "Bạn muốn đặt món nào không ạ?"
        
        # Save first item to context for follow-up questions
        if unique_matches:
            session['last_mentioned_item'] = unique_matches[0]
        
        return app.response_class(
            json.dumps({
                "intent": "menu_inquiry",
                "reply": reply.strip(),
                "items": unique_matches
            }, ensure_ascii=False),
            mimetype='application/json'
        )
    
    elif intent == "ingredient_inquiry":
        # Handle "trong món X có gì"
        query = parsed.get("query", "").strip()
        if not query:
            # Try to extract from items
            items = parsed.get("items", [])
            if items:
                query = items[0].get("name", "")
        
        if not query:
            return app.response_class(
                json.dumps({
                    "intent": "ingredient_inquiry",
                    "reply": "Bạn muốn hỏi về món nào ạ?"
                }, ensure_ascii=False),
                mimetype='application/json'
            )
        
        # Search for the specific item
        matches = find_menu_items(query)
        
        if not matches:
            return app.response_class(
                json.dumps({
                    "intent": "ingredient_inquiry",
                    "reply": f"Rất tiếc, tôi không tìm thấy món '{query}' trong thực đơn ạ."
                }, ensure_ascii=False),
                mimetype='application/json'
            )
        
        # Get the best match
        best_match = matches[0]
        desc = best_match.get('description', '').strip()
        
        if not desc:
            reply = f"**{best_match['name']}** ({best_match['store_name']})\n\n"
            reply += "Rất tiếc, hiện tại tôi chưa có thông tin chi tiết về thành phần của món này. "
            reply += "Bạn có thể hỏi thêm thông tin khi đặt hàng nhé!"
        else:
            reply = f"**{best_match['name']}** ({best_match['store_name']})\n\n"
            if best_match.get('price') and best_match['price'] > 0:
                reply += f"💰 Giá: {best_match['price']:,}đ\n\n"
            reply += f"📝 Mô tả: {desc}\n\n"
            reply += "Bạn muốn đặt món này không ạ?"
        
        return app.response_class(
            json.dumps({
                "intent": "ingredient_inquiry",
                "reply": reply.strip(),
                "item": best_match
            }, ensure_ascii=False),
            mimetype='application/json'
        )
    
    elif intent == "item_stats":
        # Handle "số lượt bán và đánh giá món X thế nào"
        query = parsed.get("query", "").strip()
        
        # If no query provided, check last mentioned item from context
        if not query:
            last_item = session.get('last_mentioned_item')
            if last_item:
                query = last_item.get('name', '')
        
        if not query:
            return app.response_class(
                json.dumps({
                    "intent": "item_stats",
                    "reply": "Vui lòng cho biết bạn muốn hỏi về món ăn nào ạ?"
                }, ensure_ascii=False),
                mimetype='application/json'
            )
        
        # Search for the item
        matches = find_menu_items(query)
        
        if not matches:
            return app.response_class(
                json.dumps({
                    "intent": "item_stats",
                    "reply": f"Rất tiếc, tôi không tìm thấy món '{query}' trong thực đơn ạ."
                }, ensure_ascii=False),
                mimetype='application/json'
            )
        
        # Get best match
        item = matches[0]
        food_id = item['id']
        
        # Get sales stats
        sales_stats = get_item_sales_stats(food_id)
        
        # Get rating stats
        rating_stats = get_item_rating_stats(food_id)
        
        # Build response
        reply = f"📊 **Thống kê món {item['name']}** ({item['store_name']})\n\n"
        
        if item.get('price') and item['price'] > 0:
            reply += f"💰 Giá: {item['price']:,}đ\n\n"
        
        # Sales info
        if sales_stats:
            reply += f"📦 **Lượt bán:** {sales_stats['total_sold']} món (qua {sales_stats['order_count']} đơn hàng)\n\n"
        else:
            reply += "📦 **Lượt bán:** Chưa có dữ liệu\n\n"
        
        # Rating info
        if rating_stats:
            reply += f"⭐ **Đánh giá:** {rating_stats['avg_rating']:.1f}/5 ({rating_stats['rating_count']} đánh giá)\n\n"
            
            # Show top 3 reviews
            if rating_stats['top_reviews']:
                reply += "💬 **Top đánh giá:**\n"
                for i, review in enumerate(rating_stats['top_reviews'], 1):
                    stars = '⭐' * int(review['rating'])
                    comment = review['comment']
                    # Limit comment length
                    if len(comment) > 100:
                        comment = comment[:100] + "..."
                    reply += f"{i}. {stars}\n   \"{comment}\"\n\n"
        else:
            reply += "⭐ **Đánh giá:** Chưa có đánh giá\n\n"
        
        reply += "Bạn muốn đặt món này không ạ?"
        
        return app.response_class(
            json.dumps({
                "intent": "item_stats",
                "reply": reply.strip(),
                "item": item,
                "sales_stats": sales_stats,
                "rating_stats": rating_stats
            }, ensure_ascii=False),
            mimetype='application/json'
        )
    
    elif intent == "popular_items":
        # Handle "món nào bán chạy"
        popular = get_popular_items()  # Default limit=5
        
        if not popular:
            return app.response_class(
                json.dumps({
                    "intent": "popular_items",
                    "reply": "Hiện tại chưa có dữ liệu về món bán chạy ạ. Bạn có thể xem menu đầy đủ không?"
                }, ensure_ascii=False),
                mimetype='application/json'
            )
        
        reply = "🔥 **Top món bán chạy nhất:**\n\n"
        for i, item in enumerate(popular, 1):
            reply += f"{i}. **{item['name']}** ({item['store_name']})"
            if item.get('price') and item['price'] > 0:
                reply += f" - {item['price']:,}đ"
            reply += f"\n   📦 Đã bán: {item['total_sold']} đơn\n"
            
            # Show description if available
            desc = item.get('description', '').strip()
            if desc and len(desc) <= 80:
                reply += f"   _{desc}_\n"
            reply += "\n"
        
        reply += "Bạn muốn đặt món nào không ạ?"
        
        return app.response_class(
            json.dumps({
                "intent": "popular_items",
                "reply": reply.strip(),
                "items": popular
            }, ensure_ascii=False),
            mimetype='application/json'
        )
    
    elif intent == "top_rated":
        # Handle "món nào được đánh giá cao"
        top_rated = get_top_rated_items()  # Default limit=5, min_rating=4
        
        if not top_rated:
            return app.response_class(
                json.dumps({
                    "intent": "top_rated",
                    "reply": "Hiện tại chưa có dữ liệu đánh giá ạ. Bạn có thể xem menu đầy đủ không?"
                }, ensure_ascii=False),
                mimetype='application/json'
            )
        
        reply = "⭐ **Top món được đánh giá cao nhất:**\n\n"
        for i, item in enumerate(top_rated, 1):
            reply += f"{i}. **{item['name']}** ({item['store_name']})"
            if item.get('price') and item['price'] > 0:
                reply += f" - {item['price']:,}đ"
            reply += f"\n   ⭐ Đánh giá: {item['avg_rating']:.1f}/5 ({item['rating_count']} reviews)\n"
            
            # Show description if available
            desc = item.get('description', '').strip()
            if desc and len(desc) <= 80:
                reply += f"   _{desc}_\n"
            reply += "\n"
        
        reply += "Bạn muốn đặt món nào không ạ?"
        
        return app.response_class(
            json.dumps({
                "intent": "top_rated",
                "reply": reply.strip(),
                "items": top_rated
            }, ensure_ascii=False),
            mimetype='application/json'
        )
    
    elif intent == "recommendation":
        # Handle "gợi ý món ngon"
        recommended = get_recommended_items()  # Default limit=5
        
        if not recommended:
            return app.response_class(
                json.dumps({
                    "intent": "recommendation",
                    "reply": "Hiện tại chưa có đủ dữ liệu để gợi ý ạ. Bạn có thể xem menu đầy đủ không?"
                }, ensure_ascii=False),
                mimetype='application/json'
            )
        
        reply = "💡 **Gợi ý món ngon cho bạn:**\n\n"
        for i, item in enumerate(recommended, 1):
            reply += f"{i}. **{item['name']}** ({item['store_name']})"
            if item.get('price') and item['price'] > 0:
                reply += f" - {item['price']:,}đ"
            reply += "\n"
            
            # Show recommendation reason
            if item.get('recommendation_reason'):
                reply += f"   💬 {item['recommendation_reason']}\n"
            
            # Show description if available
            desc = item.get('description', '').strip()
            if desc and len(desc) <= 80:
                reply += f"   _{desc}_\n"
            reply += "\n"
        
        reply += "Bạn muốn đặt món nào không ạ?"
        
        return app.response_class(
            json.dumps({
                "intent": "recommendation",
                "reply": reply.strip(),
                "items": recommended
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
            
            # All done - build final message
            price_display = f"{sizes[0]['price']:,}đ" if sizes[0]['price'] else "Liên hệ"
            final_message = f"✅ Đã thêm {cart_item['quantity']} {cart_item['name']} size {sizes[0]['name']} - {price_display}"
            
            # Add unavailable notice if any
            unavailable_notice = state.get('unavailable_notice', '')
            if unavailable_notice:
                final_message += unavailable_notice
            
            state.clear()
            return app.response_class(
                json.dumps({
                    "intent": "add_to_cart",
                    "reply": final_message
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
    
    # All done - build final message
    price_display = f"{cart_item['price']:,}đ" if cart_item['price'] else "Liên hệ"
    final_message = f"✅ Đã thêm {cart_item['quantity']} {cart_item['name']} - {price_display}"
    
    # Add unavailable notice if any
    unavailable_notice = state.get('unavailable_notice', '')
    if unavailable_notice:
        final_message += unavailable_notice
    
    state.clear()
    return app.response_class(
        json.dumps({
            "intent": "add_to_cart",
            "reply": final_message
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