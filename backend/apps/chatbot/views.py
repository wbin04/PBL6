import os
import re
import json
import unicodedata
from decimal import Decimal, InvalidOperation
from django.conf import settings
from django.db.models import Sum, Avg, Count, Q, F
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

try:
    import google.generativeai as genai
    GEMINI_AVAILABLE = True
except ImportError:
    GEMINI_AVAILABLE = False
    print("Warning: google-generativeai not installed. Chatbot will use fallback logic.")

from .models import ChatSession, ChatMessage, ChatCart
from .serializers import (
    ChatRequestSerializer, 
    ChatResponseSerializer, 
    ChatCartItemSerializer,
    ChatSessionSerializer
)
from apps.menu.models import Food, FoodSize, Category
from apps.stores.models import Store
from apps.orders.models import OrderDetail
from apps.ratings.models import RatingFood


# Configure Gemini AI if available
GEMINI_API_KEY = os.getenv('GEMINI_API_KEY', 'AIzaSyA83GwBcdmSv-Jqg75-87Iah3A6N1fpixU')
if GEMINI_AVAILABLE and GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)


def normalize_text(text):
    """Remove diacritics and normalize text for comparison"""
    if not text:
        return ""
    text = str(text).lower()
    text = unicodedata.normalize('NFD', text)
    text = ''.join(ch for ch in text if unicodedata.category(ch) != 'Mn')
    text = re.sub(r"\s+", " ", text).strip()
    return text


def find_menu_items(keyword, limit=10, store_name=None):
    """Find menu items matching keyword with scoring"""
    kw = normalize_text(keyword)
    if not kw:
        return []
    
    kw_tokens = set(re.findall(r"\w+", kw))
    matches = []
    
    foods = Food.objects.select_related('store', 'category').prefetch_related('sizes')
    
    # Filter by store if specified
    if store_name:
        foods = foods.filter(store__store_name=store_name)
    
    foods = foods.all()
    
    for food in foods:
        name_n = normalize_text(food.title)
        desc_n = normalize_text(food.description or '')
        cat_n = normalize_text(food.category.cate_name if food.category else '')
        
        score = 0
        
        # Exact name match
        if name_n == kw:
            score += 100
        
        # Keyword in name
        if kw in name_n:
            score += 50
        
        # Keyword in description
        if kw in desc_n:
            score += 20
        
        # Keyword in category
        if kw in cat_n:
            score += 15
        
        # Token overlap
        name_tokens = set(re.findall(r"\w+", name_n))
        desc_tokens = set(re.findall(r"\w+", desc_n))
        common_name = kw_tokens & name_tokens
        common_desc = kw_tokens & desc_tokens
        score += len(common_name) * 10
        score += len(common_desc) * 4
        
        # Boost for short single-token queries
        if len(kw_tokens) == 1 and len(common_name) == 1:
            score += 30
        
        if score > 0:
            matches.append({
                'food': food,
                'score': score
            })
    
    # Sort by score descending
    matches.sort(key=lambda x: -x['score'])
    return [m['food'] for m in matches[:limit]]


def get_popular_items(limit=5):
    """Get best-selling items"""
    try:
        popular = OrderDetail.objects.values('food').annotate(
            total_sold=Sum('quantity')
        ).order_by('-total_sold')[:limit]
        
        food_ids = [p['food'] for p in popular]
        foods = Food.objects.filter(id__in=food_ids).select_related('store', 'category')
        return list(foods)
    except Exception as e:
        print(f"Error getting popular items: {e}")
        return []


def get_top_rated_items(limit=5, min_rating=4):
    """Get highest rated items"""
    try:
        top_rated = RatingFood.objects.values('food').annotate(
            avg_rating=Avg('rating'),
            rating_count=Count('id')
        ).filter(avg_rating__gte=min_rating).order_by('-avg_rating', '-rating_count')[:limit]
        
        food_ids = [r['food'] for r in top_rated]
        foods = Food.objects.filter(id__in=food_ids).select_related('store', 'category')
        return list(foods)
    except Exception as e:
        print(f"Error getting top rated items: {e}")
        return []


def get_recommended_items(limit=5):
    """Get recommended items combining popularity and ratings"""
    popular = get_popular_items(20)
    top_rated = get_top_rated_items(20, min_rating=3)
    
    # Combine with simple scoring
    item_scores = {}
    
    for idx, food in enumerate(popular):
        item_scores[food.id] = {
            'food': food,
            'score': (20 - idx) * 0.6
        }
    
    for idx, food in enumerate(top_rated):
        if food.id in item_scores:
            item_scores[food.id]['score'] += (20 - idx) * 0.4
        else:
            item_scores[food.id] = {
                'food': food,
                'score': (20 - idx) * 0.4
            }
    
    sorted_items = sorted(item_scores.values(), key=lambda x: -x['score'])
    return [item['food'] for item in sorted_items[:limit]]


def process_with_gemini(user_message, menu_summary):
    """Process user message with Gemini AI"""
    if not GEMINI_AVAILABLE:
        return None
    
    try:
        model = genai.GenerativeModel("gemini-2.0-flash-exp")

        prompt = f"""Bạn là trợ lý đặt món. Cấu trúc DB:
Food: Món ăn (title, price).
FoodSize: Size món (size_name: S, M, L...).
Category: Loại món (cate_name: Gà, Trà sữa...).
Rating: Đánh giá sao (1-5).
Popularity: Dựa trên số lượng đã bán.

Menu hiện có (id, title, price, store, category):
{json.dumps(menu_summary[:30], ensure_ascii=False)}

Nhiệm vụ: Chuyển câu nói tự nhiên thành JSON query. Trả về JSON THUẦN (không dùng ```json).

Schema output:
{{
  "intent": "search|add_to_cart|bulk_order|product_inquiry|show_cart|greeting|other",
  "filters": {{
    "keyword": "",
    "category": "",
    "store_name": "",
    "min_rating": 0,
    "sort_by": "rating_desc|sales_desc|price_asc|price_desc"
  }},
  "items": [
    {{"keyword": "tên món", "quantity": 1, "size_preference": ""}}
  ],
  "keyword": "từ khóa cho product_inquiry",
  "question_type": "ingredient|description",
  "response": "câu trả lời ngắn"
}}

Quy tắc intent:
1. search: User hỏi tìm món, xem menu, món nào bán chạy/ngon ("Món gà đánh giá tốt", "Tôi muốn ăn gà ở KFC"). → Dùng filters: keyword (Food.title/Category.cate_name), store_name (Store.store_name), min_rating (RatingFood.rating >= val), sort_by (rating_desc/sales_desc).
2. add_to_cart: User đặt 1 món cụ thể ("Cho 1 gà rán size lớn", "Lấy 1 trà sữa"). → Dùng items: keyword, quantity, size_preference (text thô: "lớn", "L", "nhỏ" hoặc rỗng nếu không nói).
3. bulk_order: User đặt nhiều món ("Cho 1 gà, 2 nước, 1 pizza"). → Trả items array với từng keyword + quantity.
4. product_inquiry: Hỏi thành phần/mô tả món ("Món cơm tấm gồm gì?"). → Điền keyword + question_type.
5. show_cart: "Giỏ hàng của tôi", "Đã đặt gì".
6. greeting: Chào hỏi, cảm ơn.
7. other: Không khớp.

Ví dụ:
- "Món gà nào đánh giá tốt" → {{"intent":"search","filters":{{"keyword":"gà","min_rating":4,"sort_by":"rating_desc"}}}}
- "Tôi muốn ăn gà ở KFC" → {{"intent":"search","filters":{{"keyword":"gà","store_name":"KFC"}}}}
- "Cho 1 gà rán size lớn" → {{"intent":"add_to_cart","items":[{{"keyword":"gà rán","quantity":1,"size_preference":"lớn"}}]}}
- "Cho 1 gà rán" (không nói size) → {{"intent":"add_to_cart","items":[{{"keyword":"gà rán","quantity":1,"size_preference":""}}]}}
- "Cho 1 gà rán, 2 nước" → {{"intent":"bulk_order","items":[{{"keyword":"gà rán","quantity":1}},{{"keyword":"nước","quantity":2}}]}}
- "Món cơm tấm gồm gì?" → {{"intent":"product_inquiry","keyword":"cơm tấm","question_type":"ingredient"}}

Yêu cầu: "{user_message}"

JSON hợp lệ:"""

        response = model.generate_content(prompt)
        text = response.text.strip()
        
        # Clean markdown formatting
        text = re.sub(r'```json\s*', '', text)
        text = re.sub(r'```\s*', '', text)
        text = text.strip()
        
        result = json.loads(text)
        return result
    except Exception as e:
        print(f"Gemini AI error: {e}")
        return None


def get_item_sales_stats(food_id):
    """Get sales statistics for a specific item"""
    try:
        from django.db.models import Sum, Count
        
        result = OrderDetail.objects.filter(food_id=food_id).aggregate(
            total_sold=Sum('quantity'),
            order_count=Count('id', distinct=True)
        )
        
        if result and result['total_sold']:
            return {
                'total_sold': int(result['total_sold']),
                'order_count': int(result['order_count'])
            }
        return None
    except Exception as e:
        print(f"Error getting item sales stats: {e}")
        return None


def get_item_rating_stats(food_id):
    """Get rating statistics and top 3 reviews for a specific item"""
    try:
        from django.db.models import Avg, Count
        
        # Get average rating and count
        stats = RatingFood.objects.filter(food_id=food_id).aggregate(
            avg_rating=Avg('rating'),
            rating_count=Count('id')
        )
        
        if not stats or not stats['avg_rating']:
            return None
        
        # Get top 3 highest rated reviews with content
        top_reviews = RatingFood.objects.filter(
            food_id=food_id,
            content__isnull=False
        ).exclude(content='').order_by('-rating')[:3]
        
        reviews = []
        for review in top_reviews:
            reviews.append({
                'rating': review.rating,
                'comment': review.content
            })
        
        return {
            'avg_rating': float(stats['avg_rating']),
            'rating_count': int(stats['rating_count']),
            'top_reviews': reviews
        }
    except Exception as e:
        print(f"Error getting item rating stats: {e}")
        return None


def format_food_for_mobile(food, rating_stats=None, sales_stats=None):
    """Format food data for mobile app, optionally attaching badge metadata"""
    data = {
        'id': food.id,
        'title': food.title,
        'description': food.description or '',
        'price': str(food.price) if food.price else '0',
        'image': food.image if food.image else '',
        'store_id': food.store.id if food.store else 0,
        'store_name': food.store.store_name if food.store else '',
        'sizes': [
            {
                'id': size.id,
                'size_name': size.size_name,
                'price': str(size.price) if size.price else '0'
            }
            for size in food.sizes.all()
        ] if hasattr(food, 'sizes') and food.sizes.exists() else []
    }
    if rating_stats and food.id in rating_stats:
        data['avg_rating'] = rating_stats[food.id]['avg_rating']
        data['rating_count'] = rating_stats[food.id]['rating_count']
    if sales_stats and food.id in sales_stats:
        data['total_sold'] = sales_stats[food.id]['total_sold']
    return data


def format_food_info(food, include_sizes=True):
    """Format food information for display"""
    info = f"{food.title} - {food.price:,}đ"
    if food.store:
        info += f" ({food.store.store_name})"
    
    if include_sizes and hasattr(food, 'sizes') and food.sizes.exists():
        sizes = food.sizes.all()
        size_text = ", ".join([f"{s.size_name}: {s.price:,}đ" for s in sizes])
        info += f"\n  Sizes: {size_text}"
    
    return info


SIZE_KEYWORD_MAP = {
    's': {'s', 'small', 'nho', 'be', 'mini'},
    'm': {'m', 'medium', 'vua'},
    'l': {'l', 'large', 'lon', 'to', 'big', 'bu'},
}


def extract_filters_from_text(user_message):
    """Heuristic filters when AI quota exceeded - preserves Vietnamese accents"""
    if not user_message:
        return {}
    
    # Keep original text for keyword extraction
    text_lower = user_message.lower()
    filters = {}
    
    # Extract store name with partial matching
    # User might say "kfc" but store is "KFC Vietnam"
    # Prioritize: exact brand name > partial match
    normalized = normalize_text(user_message)
    store_candidates = list(Store.objects.values_list('store_name', flat=True))
    
    # First pass: exact brand match (kfc, mcdonald, pizza hut, etc.)
    brand_keywords = {
        'kfc': 'KFC Vietnam',
        'mcdonald': 'McDonalds Vietnam',
        'mcdonalds': 'McDonalds Vietnam',
        'pizza hut': 'Pizza Hut',
        'pizzahut': 'Pizza Hut',
        'domino': 'Dominos Pizza',
        'dominos': 'Dominos Pizza',
        'burger king': 'Burger King',
        'burgerking': 'Burger King',
        'highlands': 'Highlands Coffee - Hùng Vương - Long Khánh',
    }
    
    for brand_key, store_name in brand_keywords.items():
        if brand_key in normalized:
            # Verify store exists in database
            if store_name in store_candidates:
                filters['store_name'] = store_name
                # Remove brand from text
                text_lower = re.sub(r'\b' + re.escape(brand_key) + r'\b', ' ', text_lower, flags=re.IGNORECASE)
                text_lower = text_lower.strip()
                break
    
    # Second pass: token-based matching (if no exact brand found)
    if not filters.get('store_name'):
        text_tokens = set(re.findall(r'\w+', normalized))
        best_match = None
        max_token_overlap = 0
        
        for store_name in store_candidates:
            if not store_name:
                continue
            store_norm = normalize_text(store_name)
            store_tokens = set(re.findall(r'\w+', store_norm))
            
            # Calculate token overlap
            overlap = store_tokens & text_tokens
            # Filter out common words
            overlap = {t for t in overlap if len(t) > 2 and t not in ['chicken', 'pizza', 'burger', 'coffee']}
            
            if len(overlap) > max_token_overlap:
                max_token_overlap = len(overlap)
                best_match = store_name
        
        if best_match and max_token_overlap > 0:
            filters['store_name'] = best_match
            # Remove matched tokens
            store_norm = normalize_text(best_match)
            for token in re.findall(r'\w+', store_norm):
                if token and len(token) > 2:
                    text_lower = re.sub(r'\b' + re.escape(token) + r'\b', ' ', text_lower, flags=re.IGNORECASE)
            text_lower = text_lower.strip()
    
    # Remove filler words but keep Vietnamese characters
    filler_words = ['cho', 'tôi', 'toi', 'muốn', 'muon', 'ăn', 'an', 'ở', 'o', 'tại', 'tai', 
                    'thêm', 'them', 'làm', 'lam', 'giúp', 'giup', 'một', 'mot', 'hai', 'ba', 
                    'bốn', 'bon', 'năm', 'nam', 'xin', 'hãy', 'hay', 'gì', 'gi', 'món', 'mon', 
                    'nào', 'nao', 'của', 'cua', 'với', 'voi', 'và', 'va', 'các', 'cac', 'có', 'co',
                    'không', 'khong', 'được', 'duoc', 'có thể', 'co the']
    
    # Extract keyword while preserving Vietnamese
    tokens = text_lower.split()
    keyword_tokens = [t for t in tokens if t not in filler_words and not t.isdigit()]
    keyword = ' '.join(keyword_tokens).strip()
    if keyword:
        filters['keyword'] = keyword
    
    return filters


def collect_rating_stats(food_ids):
    """Return avg rating/count per food id"""
    if not food_ids:
        return {}
    stats = RatingFood.objects.filter(food_id__in=food_ids).values('food_id').annotate(
        avg_rating=Avg('rating'),
        rating_count=Count('id')
    )
    rating_map = {}
    for row in stats:
        if row['avg_rating'] is None:
            continue
        rating_map[row['food_id']] = {
            'avg_rating': float(row['avg_rating']),
            'rating_count': int(row['rating_count'])
        }
    return rating_map


def collect_sales_stats(food_ids):
    """Return total sold per food id"""
    if not food_ids:
        return {}
    stats = OrderDetail.objects.filter(food_id__in=food_ids).values('food_id').annotate(
        total_sold=Sum('quantity')
    )
    return {
        row['food_id']: {
            'total_sold': int(row['total_sold']) if row['total_sold'] else 0
        }
        for row in stats
    }


def search_foods_with_filters(filters, limit=12):
    """Apply keyword/store/category/rating filters and return foods with stats"""
    filters = filters or {}
    qs = Food.objects.select_related('store', 'category').prefetch_related('sizes')
    keyword = filters.get('keyword')
    if keyword:
        qs = qs.filter(
            Q(title__icontains=keyword) |
            Q(description__icontains=keyword) |
            Q(category__cate_name__icontains=keyword)
        )
    category = filters.get('category')
    if category:
        qs = qs.filter(category__cate_name__icontains=category)
    store_name = filters.get('store_name')
    if store_name:
        qs = qs.filter(store__store_name__icontains=store_name)
    price_range = filters.get('price_range') or {}
    min_price = price_range.get('min')
    max_price = price_range.get('max')
    try:
        if min_price is not None:
            qs = qs.filter(price__gte=Decimal(str(min_price)))
    except (TypeError, ValueError, InvalidOperation):
        pass
    try:
        if max_price is not None:
            qs = qs.filter(price__lte=Decimal(str(max_price)))
    except (TypeError, ValueError, InvalidOperation):
        pass

    candidate_limit = max(limit * 3, 30)
    candidates = list(qs[:candidate_limit])
    if not candidates:
        return {
            'foods': [],
            'rating_stats': {},
            'sales_stats': {},
            'filters': filters,
            'rating_filter_applied': False
        }

    food_ids = [food.id for food in candidates]
    rating_stats = collect_rating_stats(food_ids)
    sales_stats = collect_sales_stats(food_ids)

    filtered_foods = candidates
    rating_filter_applied = False
    min_rating = filters.get('min_rating')
    if min_rating is not None:
        try:
            min_rating_value = float(min_rating)
            filtered_foods = [
                food for food in candidates
                if rating_stats.get(food.id, {}).get('avg_rating', 0) >= min_rating_value
            ]
            if filtered_foods:
                rating_filter_applied = True
            else:
                filtered_foods = candidates
        except (TypeError, ValueError):
            pass

    sort_by = (filters.get('sort_by') or '').lower()
    if sort_by in ['rating_desc', 'rating']:
        filtered_foods.sort(
            key=lambda food: (
                rating_stats.get(food.id, {}).get('avg_rating', 0),
                rating_stats.get(food.id, {}).get('rating_count', 0)
            ),
            reverse=True
        )
    elif sort_by in ['sales_desc', 'best_seller', 'popularity']:
        filtered_foods.sort(
            key=lambda food: (
                sales_stats.get(food.id, {}).get('total_sold', 0),
                rating_stats.get(food.id, {}).get('avg_rating', 0)
            ),
            reverse=True
        )
    elif sort_by == 'price_asc':
        filtered_foods.sort(key=lambda food: food.price or Decimal('0'))
    elif sort_by == 'price_desc':
        filtered_foods.sort(key=lambda food: food.price or Decimal('0'), reverse=True)

    foods = filtered_foods[:limit]
    return {
        'foods': foods,
        'rating_stats': rating_stats,
        'sales_stats': sales_stats,
        'filters': filters,
        'rating_filter_applied': rating_filter_applied
    }


def format_food_list_reply(foods, heading, rating_stats=None, sales_stats=None):
    """Return (reply text, mobile data) for food list"""
    if not foods:
        return f"{heading}\n\nKhông tìm thấy món phù hợp.", []
    lines = [heading, '']
    for idx, food in enumerate(foods, 1):
        badges = []
        if rating_stats and food.id in rating_stats:
            stats = rating_stats[food.id]
            badges.append(f"⭐ {stats['avg_rating']:.1f} ({stats['rating_count']})")
        if sales_stats and food.id in sales_stats and sales_stats[food.id]['total_sold']:
            badges.append(f"🔥 {sales_stats[food.id]['total_sold']} đã bán")
        badge_text = f" [{' | '.join(badges)}]" if badges else ''
        line = f"{idx}. {food.title}{badge_text}"
        if food.store:
            line += f" - {food.store.store_name}"
        if food.price:
            line += f" ({float(food.price):,.0f}đ)"
        lines.append(line)
        if food.description:
            desc = food.description[:120]
            if len(food.description) > 120:
                desc += '...'
            lines.append(f"   {desc}")
        lines.append('')
    lines.append('Bạn muốn xem chi tiết hoặc đặt món nào?')
    reply = "\n".join(lines).strip()
    foods_data = [format_food_for_mobile(food, rating_stats, sales_stats) for food in foods]
    return reply, foods_data


def match_size_preference(food, size_preference):
    """Attempt to match human text to a FoodSize"""
    if not size_preference or not hasattr(food, 'sizes') or not food.sizes.exists():
        return None
    pref_normalized = normalize_text(size_preference)
    # Direct match on size name
    sizes = list(food.sizes.all())
    for size in sizes:
        if pref_normalized in normalize_text(size.size_name):
            return size
    # Synonym mapping (S/M/L)
    for canonical, options in SIZE_KEYWORD_MAP.items():
        if pref_normalized in options:
            for size in sizes:
                size_norm = normalize_text(size.size_name).replace('size', '').strip()
                if size_norm.startswith(canonical) or size_norm.endswith(canonical):
                    return size
    return None


def add_food_to_cart(session, food, quantity=1, size=None):
    """Persist a cart line item and return confirmation text"""
    quantity = max(int(quantity), 1)
    cart_kwargs = {
        'session': session,
        'food': food,
        'quantity': quantity
    }
    if size:
        cart_kwargs['food_size'] = size
    ChatCart.objects.create(**cart_kwargs)
    price_value = Decimal('0')
    if size and size.price:
        price_value = Decimal(size.price)
    elif food.price:
        price_value = Decimal(food.price)
    total = price_value * quantity if price_value else Decimal('0')
    size_label = f" ({size.size_name})" if size else ''
    reply = f"✅ Đã thêm {quantity} {food.title}{size_label}"
    if total > 0:
        reply += f" - {total:,.0f}đ"
    return reply


def handle_multi_item_request(session, state, requested_items):
    """Shared logic for bulk orders that need store selection"""
    normalized_requests = []
    for item in requested_items:
        name = item.get('name') or item.get('keyword')
        if not name:
            continue
        quantity = item.get('quantity', 1)
        try:
            quantity = int(quantity)
        except (TypeError, ValueError):
            quantity = 1
        normalized_requests.append({'name': name.strip(), 'quantity': max(quantity, 1)})

    if not normalized_requests:
        return None

    items_with_matches = []
    not_found = []
    for req in normalized_requests:
        matches = find_menu_items(req['name'], limit=10)
        if not matches:
            not_found.append(req['name'])
        else:
            items_with_matches.append({
                'requested': req,
                'matches': matches
            })

    if not_found:
        reply = "❌ Không tìm thấy: " + ", ".join(not_found)
        ChatMessage.objects.create(session=session, message=reply, is_user=False, intent='not_found')
        return Response({'reply': reply, 'intent': 'not_found'})

    if not items_with_matches:
        reply = "❌ Các món bạn yêu cầu chưa có sẵn. Bạn thử chọn món khác nhé!"
        ChatMessage.objects.create(session=session, message=reply, is_user=False, intent='not_found')
        return Response({'reply': reply, 'intent': 'not_found'})

    stores_dict = {}
    total_requested = len(items_with_matches)

    for item_data in items_with_matches:
        for match in item_data['matches']:
            if not match.store:
                continue
            sid = match.store.id
            if sid not in stores_dict:
                stores_dict[sid] = {
                    'store_id': sid,
                    'store_name': match.store.store_name,
                    'items': [],
                    'matched_count': 0,
                    'requested_items': {},
                }
            item_key = item_data['requested']['name']
            if item_key in stores_dict[sid]['requested_items']:
                continue
            stores_dict[sid]['requested_items'][item_key] = True
            price = float(match.price) if match.price else 0
            quantity = item_data['requested']['quantity']
            item_str = f"{quantity}x {match.title}"
            if price > 0:
                item_str += f" ({price:,.0f}đ)"
            stores_dict[sid]['items'].append(item_str)
            stores_dict[sid]['matched_count'] += 1

    sorted_stores = sorted(
        stores_dict.values(),
        key=lambda store: (-store['matched_count'], store['store_name'])
    )

    if not sorted_stores:
        reply = "❌ Các món hiện chưa sẵn sàng từ cùng một cửa hàng. Bạn thử chọn lại giúp mình nhé!"
        ChatMessage.objects.create(session=session, message=reply, is_user=False, intent='not_found')
        return Response({'reply': reply, 'intent': 'not_found'})

    reply = "🏪 **Các cửa hàng có món bạn yêu cầu:**\n\n"
    stores_data = []
    for idx, store_info in enumerate(sorted_stores[:6], 1):
        if store_info['matched_count'] == total_requested:
            badge = "✅ Đủ tất cả món"
        else:
            badge = f"⚠️ Có {store_info['matched_count']}/{total_requested} món"
        items_list = "\n     • ".join(store_info['items'])
        reply += f"{idx}. **{store_info['store_name']}** ({badge})\n"
        reply += f"     • {items_list}\n\n"
        stores_data.append({
            'store_id': store_info['store_id'],
            'store_name': store_info['store_name'],
            'matched_count': store_info['matched_count'],
            'total_requested': total_requested
        })

    reply += "💬 Bạn muốn đặt từ cửa hàng nào? (Nhập số hoặc tên cửa hàng)"

    # Persist serialized matches for follow-up store selection
    serialized_items = []
    for item_data in items_with_matches:
        serialized_matches = []
        for match in item_data['matches']:
            serialized_matches.append({
                'id': match.id,
                'title': match.title,
                'price': float(match.price) if match.price else 0,
                'store_id': match.store.id if match.store else None,
                'store_name': match.store.store_name if match.store else '',
                'has_sizes': match.sizes.exists() if hasattr(match, 'sizes') else False
            })
        serialized_items.append({
            'requested': item_data['requested'],
            'matches': serialized_matches
        })

    state['waiting_for'] = 'store'
    state['pending_items'] = serialized_items
    state['stores'] = sorted_stores
    session.state = state
    session.save()

    # Prepare foods grouped by selected stores for UI preview
    all_foods = []
    seen_ids = set()
    for store_info in sorted_stores[:6]:
        for item_data in items_with_matches:
            for match in item_data['matches']:
                if match.store and match.store.id == store_info['store_id'] and match.id not in seen_ids:
                    seen_ids.add(match.id)
                    all_foods.append(match)

    foods_data = [format_food_for_mobile(food) for food in all_foods]

    ChatMessage.objects.create(session=session, message=reply, is_user=False, intent='ask_store')
    return Response({
        'reply': reply,
        'intent': 'ask_store',
        'data': {
            'foods': foods_data,
            'stores': stores_data
        }
    })
@api_view(['POST'])
@permission_classes([AllowAny])
def chat_endpoint(request):
    """Main chat endpoint"""
    serializer = ChatRequestSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    user_message = serializer.validated_data['message']
    session_id = serializer.validated_data['session_id']
    
    # Get or create session
    session, created = ChatSession.objects.get_or_create(session_id=session_id)
    
    # Save user message
    ChatMessage.objects.create(
        session=session,
        message=user_message,
        is_user=True
    )
    
    # Get session state
    state = session.state or {}
    user_lower = user_message.lower().strip()
    
    # Check if user wants to start new request
    new_request_keywords = [
        'cho tôi', 'tôi muốn', 'đặt', 'gọi', 'order',
        'các món', 'món nào', 'có món', 'menu', 'thực đơn'
    ]
    
    is_new_request = any(kw in user_lower for kw in new_request_keywords)
    
    if is_new_request and state.get('waiting_for'):
        state.clear()
        session.state = state
        session.save()

    repeat_triggers = ['cái nữa', 'phần nữa', 'ly nữa', 'nữa nhé', 'nữa nha', 'nữa đi']
    normalized_tokens = normalize_text(user_message).split()
    allowed_repeat_tokens = {
        'cho', 'them', 'nua', 'cai', 'phan', 'ly', 'mot', 'hai', 'ba', 'bon', 'nam', 'nhe', 'nha', 'nhe', 'di'
    }
    if any(trigger in user_lower for trigger in repeat_triggers):
        if normalized_tokens and all(token in allowed_repeat_tokens or token.isdigit() for token in normalized_tokens):
            last_item = ChatCart.objects.filter(session=session).select_related('food', 'food_size').order_by('-created_at').first()
            if last_item:
                qty_match = re.search(r'(\d+)', user_lower)
                quantity = int(qty_match.group(1)) if qty_match else 1
                confirmation = add_food_to_cart(session, last_item.food, quantity=quantity, size=last_item.food_size)
                ChatMessage.objects.create(session=session, message=confirmation, is_user=False, intent='add_to_cart')
                return Response({'reply': confirmation, 'intent': 'add_to_cart'})
    
    # Handle size selection
    if state.get('waiting_for') == 'size':
        pending_item = state.get('pending_item')
        if pending_item:
            food = Food.objects.get(id=pending_item['food_id'])
            sizes = food.sizes.all()
            
            # Try to match size
            size_match = None
            for size in sizes:
                if normalize_text(size.size_name) in user_lower:
                    size_match = size
                    break
            
            if size_match:
                # Add to cart
                ChatCart.objects.create(
                    session=session,
                    food=food,
                    food_size=size_match,
                    quantity=pending_item['quantity']
                )
                
                reply = f"✅ Đã thêm {pending_item['quantity']} {food.title} ({size_match.size_name}) - {size_match.price:,}đ vào giỏ hàng!"
                
                state.clear()
                session.state = state
                session.save()
                
                ChatMessage.objects.create(
                    session=session,
                    message=reply,
                    is_user=False,
                    intent='add_to_cart'
                )
                
                return Response({
                    'reply': reply,
                    'intent': 'add_to_cart'
                })
            else:
                reply = "❌ Size không hợp lệ. Vui lòng chọn lại:\n\n"
                for size in sizes:
                    reply += f"- {size.size_name}: {size.price:,}đ\n"
                
                ChatMessage.objects.create(
                    session=session,
                    message=reply,
                    is_user=False,
                    intent='ask_size'
                )
                
                return Response({
                    'reply': reply,
                    'intent': 'ask_size'
                })
    
    # Handle store selection
    if state.get('waiting_for') == 'store':
        pending_items = state.get('pending_items', [])
        stores = state.get('stores', [])
        
        if not stores:
            state.clear()
            session.state = state
            session.save()
            reply = "❌ Đã xảy ra lỗi. Vui lòng thử lại."
            ChatMessage.objects.create(session=session, message=reply, is_user=False, intent='error')
            return Response({'reply': reply, 'intent': 'error'})
        
        # Try to match store
        user_input = user_message.lower()
        selected_store = None
        
        # Try by number
        try:
            idx = int(user_message) - 1
            if 0 <= idx < len(stores):
                selected_store = stores[idx]
        except:
            # Try by name
            for store in stores:
                if user_input in store['store_name'].lower():
                    selected_store = store
                    break
        
        if selected_store:
            # Filter items by selected store - only process items available at this store
            store_id = selected_store['store_id']
            items_from_store = []
            items_not_available = []
            
            for req in pending_items:
                # matches are now dicts, not Food objects
                matches = [m for m in req['matches'] if m.get('store_id') == store_id]
                if matches:
                    items_from_store.append({
                        'requested': req['requested'],
                        'menu_item_data': matches[0]  # Take best match (as dict)
                    })
                else:
                    items_not_available.append(req['requested']['name'])
            
            if not items_from_store:
                state.clear()
                session.state = state
                session.save()
                reply = "❌ Cửa hàng này không có món bạn yêu cầu."
                ChatMessage.objects.create(session=session, message=reply, is_user=False, intent='error')
                return Response({'reply': reply, 'intent': 'error'})
            
            # Process first item (might ask for size)
            first_item = items_from_store[0]
            food_data = first_item['menu_item_data']
            food = Food.objects.get(id=food_data['id'])  # Get actual Food object
            quantity = first_item['requested']['quantity']
            
            # Save remaining items to process later
            if len(items_from_store) > 1:
                state['pending_queue'] = items_from_store[1:]
            
            # Check if has sizes
            if food.sizes.exists():
                sizes = food.sizes.all()
                
                if len(list(sizes)) == 1:
                    # Auto-select single size
                    size = sizes[0]
                    ChatCart.objects.create(
                        session=session,
                        food=food,
                        food_size=size,
                        quantity=quantity
                    )
                    
                    reply = f"✅ Đã thêm {quantity} {food.title} ({size.size_name}) - {size.price:,}đ"
                    
                    # Process next item if any
                    if state.get('pending_queue'):
                        next_item = state['pending_queue'].pop(0)
                        if not state['pending_queue']:
                            del state['pending_queue']
                        
                        # Continue with next item
                        next_food_data = next_item['menu_item_data']
                        next_food = Food.objects.get(id=next_food_data['id'])
                        next_quantity = next_item['requested']['quantity']
                        
                        if next_food.sizes.exists():
                            sizes_str = "\n".join([
                                f"{i+1}. {s.size_name} - {s.price:,}đ"
                                for i, s in enumerate(next_food.sizes.all())
                            ])
                            reply += f"\n\n📦 {next_food.title} có các size:\n{sizes_str}\n\nBạn chọn size nào?"
                            
                            state['waiting_for'] = 'size'
                            state['pending_item'] = {
                                'food_id': next_food.id,
                                'quantity': next_quantity
                            }
                        else:
                            ChatCart.objects.create(
                                session=session,
                                food=next_food,
                                quantity=next_quantity
                            )
                            reply += f"\n✅ Đã thêm {next_quantity} {next_food.title} - {next_food.price:,}đ"
                            state.clear()
                    else:
                        state.clear()
                    
                    session.state = state
                    session.save()
                    
                    intent = 'add_to_cart' if not state.get('waiting_for') else 'ask_size'
                    ChatMessage.objects.create(session=session, message=reply, is_user=False, intent=intent)
                    return Response({'reply': reply, 'intent': intent})
                else:
                    # Ask for size
                    sizes_str = "\n".join([
                        f"{i+1}. {s.size_name} - {s.price:,}đ"
                        for i, s in enumerate(sizes)
                    ])
                    reply = f"📦 {food.title} có các size:\n{sizes_str}\n\nBạn chọn size nào?"
                    
                    state['waiting_for'] = 'size'
                    state['pending_item'] = {
                        'food_id': food.id,
                        'quantity': quantity
                    }
                    session.state = state
                    session.save()
                    
                    ChatMessage.objects.create(session=session, message=reply, is_user=False, intent='ask_size')
                    return Response({'reply': reply, 'intent': 'ask_size'})
            else:
                # No sizes - add directly
                ChatCart.objects.create(
                    session=session,
                    food=food,
                    quantity=quantity
                )
                
                reply = f"✅ Đã thêm {quantity} {food.title} - {food.price:,}đ"
                
                # Process next item if any
                if state.get('pending_queue'):
                    next_item = state['pending_queue'].pop(0)
                    if not state['pending_queue']:
                        del state['pending_queue']
                    
                    # Add next item
                    next_food_data = next_item['menu_item_data']
                    next_food = Food.objects.get(id=next_food_data['id'])
                    next_quantity = next_item['requested']['quantity']
                    
                    if next_food.sizes.exists():
                        sizes_str = "\n".join([
                            f"{i+1}. {s.size_name} - {s.price:,}đ"
                            for i, s in enumerate(next_food.sizes.all())
                        ])
                        reply += f"\n\n📦 {next_food.title} có các size:\n{sizes_str}\n\nBạn chọn size nào?"
                        
                        state['waiting_for'] = 'size'
                        state['pending_item'] = {
                            'food_id': next_food.id,
                            'quantity': next_quantity
                        }
                    else:
                        ChatCart.objects.create(
                            session=session,
                            food=next_food,
                            quantity=next_quantity
                        )
                        reply += f"\n✅ Đã thêm {next_quantity} {next_food.title} - {next_food.price:,}đ"
                        state.clear()
                else:
                    state.clear()
                
                session.state = state
                session.save()
                
                intent = 'add_to_cart' if not state.get('waiting_for') else 'ask_size'
                ChatMessage.objects.create(session=session, message=reply, is_user=False, intent=intent)
                return Response({'reply': reply, 'intent': intent})
        else:
            # Invalid store selection
            stores_str = "\n".join([f"{i+1}. {s['store_name']}" for i, s in enumerate(stores)])
            reply = f"❌ Không tìm thấy cửa hàng. Vui lòng chọn:\n{stores_str}"
            ChatMessage.objects.create(session=session, message=reply, is_user=False, intent='ask_store')
            return Response({'reply': reply, 'intent': 'ask_store'})
    
    # Process new order with AI
    menu_summary = []
    foods = Food.objects.select_related('store', 'category').prefetch_related('sizes')[:50]
    for food in foods:
        menu_summary.append({
            'id': food.id,
            'name': food.title,
            'price': float(food.price) if food.price else 0,
            'store': food.store.store_name if food.store else '',
            'category': food.category.cate_name if food.category else ''
        })
    
    # Try Gemini AI first
    ai_result = process_with_gemini(user_message, menu_summary)
    
    # If AI fails, try simple fallback
    if not ai_result:
        ai_result = {
            'intent': 'other',
            'response': 'Xin lỗi, tôi không hiểu. Bạn có thể nói rõ hơn không?'
        }
    
    intent = ai_result.get('intent', 'other')
    filters = ai_result.get('filters') or {}
    ai_items = ai_result.get('items') or []
    ai_response_text = ai_result.get('response')

    # 1. SEARCH intent (replaces advanced_search)
    if intent == 'search':
        search_result = search_foods_with_filters(filters, limit=12)
        foods = search_result['foods']
        rating_stats = search_result['rating_stats']
        sales_stats = search_result['sales_stats']
        
        # Build heading from filters
        if filters.get('store_name') and filters.get('keyword'):
            heading = f"🏪 Món '{filters['keyword']}' tại {filters['store_name']}:"
        elif filters.get('store_name'):
            heading = f"🏪 Món tại {filters['store_name']}:"
        elif filters.get('min_rating'):
            heading = f"⭐ Món '{filters.get('keyword', '')}' đánh giá cao:"
        elif filters.get('sort_by') == 'sales_desc':
            heading = f"🔥 Món '{filters.get('keyword', '')}' bán chạy:"
        elif filters.get('keyword'):
            heading = f"🔍 Kết quả cho '{filters['keyword']}':"
        else:
            heading = "📋 Gợi ý thực đơn:"
        
        if foods:
            reply, foods_data = format_food_list_reply(foods, heading, rating_stats, sales_stats)
        else:
            if filters.get('store_name'):
                reply = f"Hiện tại chưa có món nào tại {filters['store_name']} phù hợp với yêu cầu. Bạn thử chọn cửa hàng khác nhé!"
            else:
                reply = "Hiện tại chưa có món phù hợp. Bạn thử mô tả chi tiết hơn giúp mình nhé!"
            foods_data = []
        
        ChatMessage.objects.create(session=session, message=reply, is_user=False, intent='search')
        return Response({
            'reply': reply,
            'intent': 'search',
            'data': {'foods': foods_data, 'filters': filters}
        })

    # 2. PRODUCT_INQUIRY intent
    if intent == 'product_inquiry':
        keyword = ai_result.get('keyword') or filters.get('keyword')
        if not keyword and ai_items:
            keyword = ai_items[0].get('keyword') or ai_items[0].get('name')
        if keyword:
            matches = find_menu_items(keyword, limit=1)
            if matches:
                food = matches[0]
                reply = f"**{food.title}**"
                if food.store:
                    reply += f" ({food.store.store_name})"
                reply += "\n\n"
                if food.price:
                    reply += f"💰 Giá: {float(food.price):,.0f}đ\n\n"
                if food.description:
                    reply += f"📝 {food.description}\n\n"
                else:
                    reply += "Hiện món này chưa có mô tả chi tiết trong hệ thống.\n\n"
                reply += "Bạn có muốn đặt món này không?"
                foods_data = [format_food_for_mobile(food)]
                ChatMessage.objects.create(session=session, message=reply, is_user=False, intent='product_inquiry')
                return Response({'reply': reply, 'intent': 'product_inquiry', 'data': {'foods': foods_data}})
        reply = "Mình chưa tìm thấy thông tin món bạn hỏi. Bạn có thể nêu tên cụ thể giúp mình nhé!"
        ChatMessage.objects.create(session=session, message=reply, is_user=False, intent='product_inquiry')
        return Response({'reply': reply, 'intent': 'product_inquiry'})

    # 3. ADD_TO_CART intent (single item with optional size)
    if intent == 'add_to_cart' and ai_items:
        item = ai_items[0]  # Single item only
        keyword = item.get('keyword') or item.get('name')
        if not keyword:
            reply = "Mình chưa rõ món bạn muốn đặt. Bạn mô tả cụ thể hơn giúp mình nhé!"
            ChatMessage.objects.create(session=session, message=reply, is_user=False, intent='other')
            return Response({'reply': reply, 'intent': 'other'})
        
        matches = find_menu_items(keyword, limit=1)
        if not matches:
            reply = f"❌ Hiện mình chưa tìm thấy món '{keyword}'. Bạn thử tên khác nhé!"
            ChatMessage.objects.create(session=session, message=reply, is_user=False, intent='not_found')
            return Response({'reply': reply, 'intent': 'not_found'})
        
        food = matches[0]
        try:
            quantity = int(item.get('quantity', 1))
        except (TypeError, ValueError):
            quantity = 1
        quantity = max(quantity, 1)
        
        size_pref = item.get('size_preference', '').strip()
        
        # Check if food has sizes
        if food.sizes.exists():
            if size_pref:
                # Try to match size preference
                size_match = match_size_preference(food, size_pref)
                if size_match:
                    # Add to cart with matched size
                    confirmation = add_food_to_cart(session, food, quantity=quantity, size=size_match)
                    ChatMessage.objects.create(session=session, message=confirmation, is_user=False, intent='add_to_cart')
                    return Response({'reply': confirmation, 'intent': 'add_to_cart'})
            
            # No size preference or no match -> Slot Filling
            sizes = food.sizes.all()
            sizes_str = "\n".join([
                f"{idx+1}. {s.size_name} - {s.price:,}đ"
                for idx, s in enumerate(sizes)
            ])
            reply = f"📦 {food.title} có các size:\n{sizes_str}\n\nBạn chọn size nào?"
            state['waiting_for'] = 'size'
            state['pending_item'] = {'food_id': food.id, 'quantity': quantity}
            session.state = state
            session.save()
            ChatMessage.objects.create(session=session, message=reply, is_user=False, intent='ask_size')
            return Response({'reply': reply, 'intent': 'ask_size'})
        else:
            # No sizes - add directly
            confirmation = add_food_to_cart(session, food, quantity=quantity)
            ChatMessage.objects.create(session=session, message=confirmation, is_user=False, intent='add_to_cart')
            return Response({'reply': confirmation, 'intent': 'add_to_cart'})

    # 4. BULK_ORDER intent (multiple items)
    if intent == 'bulk_order':
        if not ai_items:
            reply = "Mình chưa rõ bạn muốn đặt món gì. Bạn có thể nói rõ hơn không?"
            ChatMessage.objects.create(session=session, message=reply, is_user=False, intent='other')
            return Response({'reply': reply, 'intent': 'other'})
        
        requested = []
        for item in ai_items:
            name = item.get('keyword') or item.get('name')
            if not name:
                continue
            requested.append({'name': name, 'quantity': item.get('quantity', 1)})
        
        if not requested:
            reply = "Mình chưa hiểu món bạn muốn đặt. Bạn thử nói lại giúp mình nhé!"
            ChatMessage.objects.create(session=session, message=reply, is_user=False, intent='other')
            return Response({'reply': reply, 'intent': 'other'})
        
        response = handle_multi_item_request(session, state, requested)
        if response:
            return response
    
    # 5. SHOW_CART intent
    if intent == 'show_cart':
        cart_items = ChatCart.objects.filter(session=session).select_related('food', 'food__store', 'food_size')
        if not cart_items:
            reply = "🛒 Giỏ hàng của bạn đang trống."
        else:
            reply = "🛒 **Giỏ hàng của bạn:**\n\n"
            total = 0
            for idx, item in enumerate(cart_items, 1):
                item_total = item.total_price
                total += item_total
                reply += f"{idx}. {item.quantity}x {item.food.title}"
                if item.food_size:
                    reply += f" (size {item.food_size.size_name})"
                reply += f"\n   {item.food.store.store_name if item.food.store else 'N/A'} - {item_total:,}đ\n"
            reply += f"\n💰 Tổng: {total:,}đ"
        ChatMessage.objects.create(session=session, message=reply, is_user=False, intent='show_cart')
        return Response({'reply': reply, 'intent': 'show_cart'})
    
    # 6. GREETING intent
    if intent == 'greeting':
        reply = "Xin chào! Tôi có thể giúp bạn:\n"
        reply += "• Tìm món ăn theo cửa hàng, loại món, rating\n"
        reply += "• Đặt món ăn (1 món hoặc nhiều món)\n"
        reply += "• Xem giỏ hàng và thông tin món\n\n"
        reply += "Bạn muốn làm gì ạ?"
        ChatMessage.objects.create(session=session, message=reply, is_user=False, intent='greeting')
        return Response({'reply': reply, 'intent': 'greeting'})
    
    # 7. OTHER / FALLBACK
    # First check if this looks like an order intent with multiple items: "cho tôi 1 gà và 2 nước"
    order_keywords = ['cho', 'đặt', 'dat', 'lấy', 'lay', 'mua']
    has_order_intent = any(kw in user_message.lower() for kw in order_keywords)
    
    # Generic search phrases that should NOT trigger order intent
    generic_phrases = ['các món', 'cac mon', 'món gì', 'mon gi', 'món nào', 'mon nao', 
                      'có gì', 'co gi', 'có món', 'co mon', 'menu', 'thực đơn', 'thuc don']
    is_generic_search = any(phrase in user_message.lower() for phrase in generic_phrases)
    
    # If generic search phrase detected, skip order intent and go to search fallback
    if not is_generic_search and has_order_intent:
        # Check for multiple items pattern: "1 X và 2 Y", "2 X, 1 Y"
        multi_item_pattern = r'(\d+)\s+([a-zA-ZÀ-ỹ]+(?:\s+[a-zA-ZÀ-ỹ]+)?)\s*(?:và|va|,)\s*(\d+)\s+([a-zA-ZÀ-ỹ]+(?:\s+[a-zA-ZÀ-ỹ]+)?)'
        multi_match = re.search(multi_item_pattern, user_message.lower())
        
        if multi_match:
            # Multiple items - bulk order
            requested_items = [
                {'name': multi_match.group(2).strip(), 'quantity': int(multi_match.group(1))},
                {'name': multi_match.group(4).strip(), 'quantity': int(multi_match.group(3))}
            ]
            response = handle_multi_item_request(session, state, requested_items)
            if response:
                return response
        
        # Single item pattern: "cho tôi 1 gà", "đặt 2 pizza"
        # But NOT generic like "cho tôi các món"
        single_item_pattern = r'(?:cho|dat|đặt|lay|lấy|mua)\s+(?:tôi|toi)?\s*(\d+)?\s+([a-zA-ZÀ-ỹ]+(?:\s+[a-zA-ZÀ-ỹ]+)?)'
        single_match = re.search(single_item_pattern, user_message.lower())
        
        if single_match:
            quantity = int(single_match.group(1)) if single_match.group(1) else 1
            item_name = single_match.group(2).strip()
            
            # Skip if item_name is generic
            if item_name not in ['các món', 'cac mon', 'món gì', 'mon gi', 'món nào', 'mon nao', 'món', 'mon']:
                # Extract store if mentioned (using brand-aware matching)
                store_filter = None
                normalized = normalize_text(user_message)
                
                # First: check exact brand keywords
                brand_keywords = {
                    'kfc': 'KFC Vietnam',
                    'mcdonald': 'McDonalds Vietnam',
                    'mcdonalds': 'McDonalds Vietnam',
                    'pizza hut': 'Pizza Hut',
                    'pizzahut': 'Pizza Hut',
                    'domino': 'Dominos Pizza',
                    'dominos': 'Dominos Pizza',
                    'burger king': 'Burger King',
                    'burgerking': 'Burger King',
                }
                
                for brand_key, store_name in brand_keywords.items():
                    if brand_key in normalized:
                        store_filter = store_name
                        break
                
                # Fallback: token-based matching
                if not store_filter:
                    text_tokens = set(re.findall(r'\w+', normalized))
                    store_candidates = list(Store.objects.values_list('store_name', flat=True))
                    
                    best_match = None
                    max_overlap = 0
                    for store_name in store_candidates:
                        if not store_name:
                            continue
                        store_norm = normalize_text(store_name)
                        store_tokens = set(re.findall(r'\w+', store_norm))
                        overlap = store_tokens & text_tokens
                        # Filter common words
                        overlap = {t for t in overlap if len(t) > 2 and t not in ['chicken', 'pizza', 'burger']}
                        if len(overlap) > max_overlap:
                            max_overlap = len(overlap)
                            best_match = store_name
                    
                    if best_match and max_overlap > 0:
                        store_filter = best_match
                
                # Use find_menu_items which has better fuzzy matching
                matches = find_menu_items(item_name, store_name=store_filter, limit=5)
                
                if not matches:
                    # No match - suggest search
                    reply = f"Không tìm thấy món '{item_name}'"
                    if store_filter:
                        reply += f" ở {store_filter}"
                    reply += ". Bạn có thể thử:\n• Gõ tên món khác\n• Xem menu đầy đủ\n• Hỏi 'món gì bán chạy?'"
                    ChatMessage.objects.create(session=session, message=reply, is_user=False, intent='other')
                    return Response({'reply': reply, 'intent': 'other'})
                
                if len(matches) == 1:
                    food = matches[0]
                    # Check if has sizes - need to ask
                    if food.sizes.exists():
                        reply = f"Món {food.title} có các size:\n\n"
                        for s in food.sizes.all():
                            reply += f"- {s.size_name}: {s.price:,}đ\n"
                        reply += "\nBạn chọn size nào?"
                        
                        state['waiting_for'] = 'size'
                        state['pending_item'] = {'food_id': food.id, 'quantity': quantity}
                        session.state = state
                        session.save()
                        
                        ChatMessage.objects.create(session=session, message=reply, is_user=False, intent='add_to_cart')
                        return Response({'reply': reply, 'intent': 'add_to_cart'})
                    else:
                        # Add directly
                        ChatCart.objects.create(session=session, food=food, quantity=quantity)
                        reply = f"✅ Đã thêm {quantity} {food.title}"
                        if food.store:
                            reply += f" ({food.store.store_name})"
                        reply += f" - {food.price:,}đ vào giỏ hàng!"
                        ChatMessage.objects.create(session=session, message=reply, is_user=False, intent='add_to_cart')
                        return Response({'reply': reply, 'intent': 'add_to_cart'})
                else:
                    # Multiple matches - prioritize by store and title length
                    if store_filter:
                        # Sort: store match first, then shorter titles
                        matches = sorted(matches, key=lambda f: (
                            0 if f.store and f.store.store_name == store_filter else 1,
                            len(f.title)
                        ))
                    else:
                        # Sort by title length (shorter = more relevant)
                        matches = sorted(matches, key=lambda f: len(f.title))
                    
                    # Show top 5
                    reply = f"Tìm thấy {len(matches)} món"
                    if store_filter:
                        reply += f" tại {store_filter}"
                    reply += ":\n\n"
                    
                    foods_data = []
                    for idx, food in enumerate(matches[:5], 1):
                        reply += f"{idx}. {food.title}"
                        if food.store:
                            reply += f" ({food.store.store_name})"
                        reply += f" - {food.price:,}đ\n"
                        foods_data.append(format_food_for_mobile(food))
                    reply += "\nBạn muốn đặt món nào?"
                    ChatMessage.objects.create(session=session, message=reply, is_user=False, intent='add_to_cart')
                    return Response({'reply': reply, 'intent': 'add_to_cart', 'data': {'foods': foods_data}})
    
    # Try heuristic filters when AI returns other/unknown (for search intent)
    fallback_filters = extract_filters_from_text(user_message)
    if fallback_filters:
        fallback_heading = "📋 Gợi ý thực đơn"
        if fallback_filters.get('store_name') and fallback_filters.get('keyword'):
            fallback_heading = f"🏪 Món '{fallback_filters['keyword']}' tại {fallback_filters['store_name']}:"
        elif fallback_filters.get('store_name'):
            fallback_heading = f"🏪 Món tại {fallback_filters['store_name']}:"
        elif fallback_filters.get('keyword'):
            fallback_heading = f"🔍 Kết quả cho '{fallback_filters['keyword']}':"
        search_result = search_foods_with_filters(fallback_filters, limit=10)
        foods = search_result['foods']
        if foods:
            reply, foods_data = format_food_list_reply(
                foods,
                fallback_heading,
                search_result['rating_stats'],
                search_result['sales_stats']
            )
            ChatMessage.objects.create(session=session, message=reply, is_user=False, intent='search')
            return Response({'reply': reply, 'intent': 'search', 'data': {'foods': foods_data}})
        elif fallback_filters.get('store_name'):
            reply = f"Hiện chưa có món nào thuộc cửa hàng {fallback_filters['store_name']} phù hợp với mô tả. Bạn thử chọn cửa hàng khác nhé!"
            ChatMessage.objects.create(session=session, message=reply, is_user=False, intent='search')
            return Response({'reply': reply, 'intent': 'search'})

    # Ultimate fallback
    reply = "Xin lỗi, mình chưa hiểu yêu cầu của bạn. Bạn có thể nói rõ hơn không?"
    ChatMessage.objects.create(session=session, message=reply, is_user=False, intent='other')
    return Response({'reply': reply, 'intent': 'other'})


@api_view(['GET'])
@permission_classes([AllowAny])
def get_cart(request):
    """Get chatbot cart"""
    session_id = request.query_params.get('session_id')
    if not session_id:
        return Response({'error': 'session_id required'}, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        session = ChatSession.objects.get(session_id=session_id)
        cart_items = ChatCart.objects.filter(session=session).select_related(
            'food', 'food__store', 'food_size'
        )
        
        serializer = ChatCartItemSerializer(cart_items, many=True)
        
        total = sum(item.total_price for item in cart_items)
        
        return Response({
            'cart': serializer.data,
            'total': total,
            'count': len(cart_items)
        })
    except ChatSession.DoesNotExist:
        return Response({
            'cart': [],
            'total': 0,
            'count': 0
        })


@api_view(['POST'])
@permission_classes([AllowAny])
def clear_cart(request):
    """Clear chatbot cart"""
    session_id = request.data.get('session_id')
    if not session_id:
        return Response({'error': 'session_id required'}, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        session = ChatSession.objects.get(session_id=session_id)
        ChatCart.objects.filter(session=session).delete()
        
        # Clear state
        session.state = {}
        session.save()
        
        return Response({'message': 'Cart cleared successfully'})
    except ChatSession.DoesNotExist:
        return Response({'message': 'No cart found'})


@api_view(['GET'])
@permission_classes([AllowAny])
def get_menu(request):
    """Get full menu"""
    foods = Food.objects.select_related('store', 'category').prefetch_related('sizes').all()[:50]
    
    menu = []
    for food in foods:
        item = {
            'id': food.id,
            'name': food.title,
            'price': float(food.price) if food.price else 0,
            'description': food.description or '',
            'store_id': food.store.id if food.store else None,
            'store_name': food.store.store_name if food.store else '',
            'category': food.category.cate_name if food.category else '',
            'sizes': []
        }
        
        if food.sizes.exists():
            for size in food.sizes.all():
                item['sizes'].append({
                    'name': size.size_name,
                    'price': float(size.price) if size.price else 0
                })
        
        menu.append(item)
    
    return Response({'menu': menu})
