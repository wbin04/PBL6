import os
import re
import json
import unicodedata
from decimal import Decimal
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


def find_menu_items(keyword, limit=10):
    """Find menu items matching keyword with scoring"""
    kw = normalize_text(keyword)
    if not kw:
        return []
    
    kw_tokens = set(re.findall(r"\w+", kw))
    matches = []
    
    foods = Food.objects.select_related('store', 'category').prefetch_related('sizes').all()
    
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
            avg_rating=Avg('point'),
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
        
        prompt = f"""Bạn là chatbot bán đồ ăn thông minh. Phân tích yêu cầu và trả JSON.

Menu hiện có (ID, tên, giá, cửa hàng):
{json.dumps(menu_summary[:30], ensure_ascii=False)}

Yêu cầu khách hàng: "{user_message}"

QUAN TRỌNG - Quy tắc phân loại intent:
- Nếu có "cho tôi", "tôi muốn", "đặt", "gọi" + tên món/số lượng → intent="order"
- Nếu hỏi "có món X nào không", "có X không", "có bán X không" → intent="menu_inquiry" 
- Nếu hỏi "trong món X có gì", "thành phần X", "X gồm những gì" → intent="ingredient_inquiry"
- Nếu hỏi về STATS món cụ thể: "số lượt bán món X", "đánh giá món X", "món X thế nào" → intent="item_stats"
- Nếu hỏi "món nào bán chạy", "món phổ biến", "best seller" → intent="popular_items"
- Nếu hỏi "món nào ngon", "đánh giá cao", "top rated" → intent="top_rated"
- Nếu hỏi "gợi ý", "nên ăn gì", "đề xuất" → intent="recommendation"
- Nếu hỏi "các món", "menu", "thực đơn" (không có ý định đặt) → intent="menu_query"
- Nếu hỏi "giỏ hàng", "đã đặt gì" → intent="show_cart"
- Nếu chào hỏi, cảm ơn → intent="greeting"
- Nếu không khớp → intent="other"

Trả về JSON (KHÔNG thêm markdown ```json):
{{
  "intent": "order|menu_inquiry|ingredient_inquiry|item_stats|popular_items|top_rated|recommendation|menu_query|show_cart|greeting|other",
  "items": [
    {{"food_id": <id từ menu>, "quantity": <số lượng>, "size": "<S|M|L nếu có>"}}
  ],
  "query": "từ khóa tìm kiếm (cho menu_inquiry, ingredient_inquiry, item_stats)",
  "response": "<câu trả lời ngắn gọn>"
}}

Lưu ý:
- Với intent "order": điền food_id từ menu, quantity, size nếu có
- Với các intent khác: điền query để tìm kiếm
- Trả về JSON hợp lệ"""

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
            avg_rating=Avg('point'),
            rating_count=Count('id')
        )
        
        if not stats or not stats['avg_rating']:
            return None
        
        # Get top 3 highest rated reviews with content
        top_reviews = RatingFood.objects.filter(
            food_id=food_id,
            content__isnull=False
        ).exclude(content='').order_by('-point')[:3]
        
        reviews = []
        for review in top_reviews:
            reviews.append({
                'rating': review.point,
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


def format_food_for_mobile(food):
    """Format food data for mobile app"""
    return {
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
    
    # Handle menu queries
    menu_query_keywords = ['các món', 'món nào', 'có món gì', 'menu', 'thực đơn', 'danh sách']
    order_indicators = ['cho tôi', 'tôi muốn', 'đặt', 'gọi', 'thêm']
    
    is_menu_query = any(kw in user_lower for kw in menu_query_keywords)
    has_order_intent = any(kw in user_lower for kw in order_indicators)
    
    if is_menu_query and not has_order_intent and not state.get('waiting_for'):
        # Determine what type of menu query
        if 'bán chạy' in user_lower or 'phổ biến' in user_lower or 'best seller' in user_lower:
            foods = get_popular_items(10)
            reply = "🔥 **Món bán chạy:**\n\n"
            query_type = 'popular'
        elif 'đánh giá cao' in user_lower or 'rating' in user_lower or 'ngon' in user_lower:
            foods = get_top_rated_items(10)
            reply = "⭐ **Món đánh giá cao:**\n\n"
            query_type = 'top_rated'
        elif 'gợi ý' in user_lower or 'đề xuất' in user_lower or 'recommend' in user_lower:
            foods = get_recommended_items(10)
            reply = "💡 **Món được đề xuất:**\n\n"
            query_type = 'recommended'
        else:
            # Extract keyword from user message
            # Remove menu query keywords to get actual search term
            keyword = user_lower
            for kw in menu_query_keywords:
                keyword = keyword.replace(kw, '').strip()
            
            # Check for category
            categories = Category.objects.all()
            matched_cat = None
            for cat in categories:
                if normalize_text(cat.cate_name) in user_lower:
                    matched_cat = cat
                    break
            
            if matched_cat:
                foods = Food.objects.filter(category=matched_cat).select_related('store')[:10]
                reply = f"📋 **{matched_cat.cate_name}:**\n\n"
                query_type = 'category'
            elif keyword and len(keyword) > 1:
                # Use find_menu_items for keyword search
                foods = find_menu_items(keyword, limit=15)
                if foods:
                    reply = f"🔍 **Kết quả tìm '{keyword}':**\n\n"
                    query_type = 'search'
                else:
                    reply = f"❌ Không tìm thấy món nào với từ khóa '{keyword}'\n\n"
                    foods = Food.objects.select_related('store', 'category').all()[:15]
                    reply += "📋 **Một số món có sẵn:**\n\n"
                    query_type = 'fallback'
            else:
                foods = Food.objects.select_related('store', 'category').all()[:15]
                reply = "📋 **Thực đơn:**\n\n"
                query_type = 'all'
        
        for idx, food in enumerate(foods, 1):
            reply += f"{idx}. {format_food_info(food, include_sizes=False)}\n"
        
        reply += "\nBạn muốn đặt món nào?"
        
        # Format foods for mobile
        foods_data = [format_food_for_mobile(food) for food in foods]
        
        # Save bot message
        ChatMessage.objects.create(
            session=session,
            message=reply,
            is_user=False,
            intent='menu_query'
        )
        
        return Response({
            'reply': reply,
            'intent': 'menu_query',
            'data': {
                'foods': foods_data,
                'query_type': query_type
            }
        })
    
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
    
    # Build enhanced prompt for Gemini
    prompt = f"""Bạn là chatbot bán đồ ăn thông minh. Phân tích yêu cầu và trả JSON.

MENU (một phần):
{json.dumps(menu_summary[:30], ensure_ascii=False)}

Yêu cầu khách hàng: "{user_message}"

QUAN TRỌNG - Quy tắc phân loại intent:
- Nếu có "cho tôi", "tôi muốn", "đặt", "gọi" + tên món/số lượng → intent="order"
- Nếu hỏi "có món X nào không", "có X không", "có bán X không" → intent="menu_inquiry" 
- Nếu hỏi "trong món X có gì", "thành phần X", "X gồm những gì" → intent="ingredient_inquiry"
- Nếu hỏi về STATS món cụ thể: "số lượt bán món X", "đánh giá món X", "món X thế nào" → intent="item_stats"
- Nếu hỏi "món nào bán chạy", "món phổ biến", "best seller" → intent="popular_items"
- Nếu hỏi "món nào ngon", "đánh giá cao", "top rated" → intent="top_rated"
- Nếu hỏi "gợi ý", "nên ăn gì", "đề xuất" → intent="recommendation"
- Nếu hỏi "các món", "menu", "thực đơn" (không có ý định đặt) → intent="menu_query"
- Nếu hỏi "giỏ hàng", "đã đặt gì" → intent="show_cart"
- Nếu chào hỏi, cảm ơn → intent="greeting"
- Nếu không khớp → intent="other"

Trả về JSON hợp lệ (KHÔNG thêm markdown ```json):
{{
  "intent": "order|menu_inquiry|ingredient_inquiry|item_stats|popular_items|top_rated|recommendation|show_cart|greeting|other",
  "items": [
    {{"name": "tên món", "quantity": số_lượng}}
  ],
  "query": "từ khóa tìm kiếm cho các intent cần query",
  "response": "câu trả lời thân thiện ngắn gọn"
}}
"""
    
    # Try Gemini AI first
    ai_result = process_with_gemini(user_message, menu_summary)
    
    # If AI fails, try simple fallback
    if not ai_result:
        ai_result = {
            'intent': 'other',
            'response': 'Xin lỗi, tôi không hiểu. Bạn có thể nói rõ hơn không?'
        }
    
    intent = ai_result.get('intent', 'other')
    
    # === HANDLE NEW INTENTS FROM FLASK LOGIC ===
    
    # 1. Menu Inquiry: "Có món X nào không?"
    if intent == 'menu_inquiry':
        query = ai_result.get('query', '').strip()
        if not query and ai_result.get('items'):
            query = ai_result['items'][0].get('name', '')
        
        if query:
            matches = find_menu_items(query, limit=10)
            
            if not matches:
                reply = f"Rất tiếc, hiện tại chúng tôi không có món nào liên quan đến '{query}' ạ."
                ChatMessage.objects.create(session=session, message=reply, is_user=False, intent='menu_inquiry')
                return Response({'reply': reply, 'intent': 'menu_inquiry'})
            
            # Group unique items
            seen_names = set()
            unique_matches = []
            for match in matches:
                if match.title not in seen_names:
                    seen_names.add(match.title)
                    unique_matches.append(match)
            
            reply = f"Có ạ! Chúng tôi có các món liên quan đến '{query}':\n\n"
            for idx, food in enumerate(unique_matches, 1):
                reply += f"{idx}. {food.title}"
                if food.store:
                    reply += f" ({food.store.store_name})"
                if food.price:
                    reply += f" - {float(food.price):,.0f}đ"
                reply += "\n"
                if food.description:
                    desc = food.description[:100] + "..." if len(food.description) > 100 else food.description
                    reply += f"   {desc}\n"
                reply += "\n"
            
            reply += "Bạn muốn đặt món nào không ạ?"
            
            foods_data = [format_food_for_mobile(food) for food in unique_matches]
            
            ChatMessage.objects.create(session=session, message=reply, is_user=False, intent='menu_inquiry')
            
            return Response({
                'reply': reply,
                'intent': 'menu_inquiry',
                'data': {'foods': foods_data}
            })
    
    # 2. Ingredient Inquiry: "Trong món X có gì?"
    if intent == 'ingredient_inquiry':
        query = ai_result.get('query', '').strip()
        if not query and ai_result.get('items'):
            query = ai_result['items'][0].get('name', '')
        
        if query:
            matches = find_menu_items(query, limit=1)
            
            if not matches:
                reply = f"Rất tiếc, tôi không tìm thấy món '{query}' trong thực đơn ạ."
            else:
                food = matches[0]
                reply = f"**{food.title}**"
                if food.store:
                    reply += f" ({food.store.store_name})"
                reply += "\n\n"
                
                if food.price:
                    reply += f"💰 Giá: {float(food.price):,.0f}đ\n\n"
                
                if food.description:
                    reply += f"📝 Mô tả: {food.description}\n\n"
                    reply += "Bạn muốn đặt món này không ạ?"
                else:
                    reply += "Rất tiếc, hiện tại tôi chưa có thông tin chi tiết về thành phần của món này. "
                    reply += "Bạn có thể hỏi thêm thông tin khi đặt hàng nhé!"
                
                foods_data = [format_food_for_mobile(food)]
                
                ChatMessage.objects.create(session=session, message=reply, is_user=False, intent='ingredient_inquiry')
                
                return Response({
                    'reply': reply,
                    'intent': 'ingredient_inquiry',
                    'data': {'foods': foods_data}
                })
            
            ChatMessage.objects.create(session=session, message=reply, is_user=False, intent='ingredient_inquiry')
            return Response({'reply': reply, 'intent': 'ingredient_inquiry'})
    
    # 3. Item Stats: "Đánh giá món X thế nào?"
    if intent == 'item_stats':
        query = ai_result.get('query', '').strip()
        if not query and ai_result.get('items'):
            query = ai_result['items'][0].get('name', '')
        
        if query:
            matches = find_menu_items(query, limit=1)
            
            if not matches:
                reply = f"Rất tiếc, tôi không tìm thấy món '{query}' trong thực đơn ạ."
            else:
                food = matches[0]
                sales_stats = get_item_sales_stats(food.id)
                rating_stats = get_item_rating_stats(food.id)
                
                reply = f"📊 **Thống kê món {food.title}**"
                if food.store:
                    reply += f" ({food.store.store_name})"
                reply += "\n\n"
                
                if food.price:
                    reply += f"💰 Giá: {float(food.price):,.0f}đ\n\n"
                
                # Sales info
                if sales_stats:
                    reply += f"📦 **Lượt bán:** {sales_stats['total_sold']} món (qua {sales_stats['order_count']} đơn hàng)\n\n"
                else:
                    reply += "📦 **Lượt bán:** Chưa có dữ liệu\n\n"
                
                # Rating info
                if rating_stats:
                    reply += f"⭐ **Đánh giá:** {rating_stats['avg_rating']:.1f}/5 ({rating_stats['rating_count']} đánh giá)\n\n"
                    
                    if rating_stats['top_reviews']:
                        reply += "💬 **Top đánh giá:**\n"
                        for i, review in enumerate(rating_stats['top_reviews'], 1):
                            stars = '⭐' * int(review['rating'])
                            comment = review['comment']
                            if len(comment) > 100:
                                comment = comment[:100] + "..."
                            reply += f"{i}. {stars}\n   \"{comment}\"\n\n"
                else:
                    reply += "⭐ **Đánh giá:** Chưa có đánh giá\n\n"
                
                reply += "Bạn muốn đặt món này không ạ?"
                
                foods_data = [format_food_for_mobile(food)]
                
                ChatMessage.objects.create(session=session, message=reply, is_user=False, intent='item_stats')
                
                return Response({
                    'reply': reply,
                    'intent': 'item_stats',
                    'data': {
                        'foods': foods_data,
                        'sales_stats': sales_stats,
                        'rating_stats': rating_stats
                    }
                })
            
            ChatMessage.objects.create(session=session, message=reply, is_user=False, intent='item_stats')
            return Response({'reply': reply, 'intent': 'item_stats'})
    
    # 4. Popular Items: "Món nào bán chạy?"
    if intent == 'popular_items':
        popular = get_popular_items()
        
        if not popular:
            reply = "Hiện tại chưa có dữ liệu về món bán chạy ạ. Bạn có thể xem menu đầy đủ không?"
        else:
            reply = "🔥 **Top món bán chạy nhất:**\n\n"
            for idx, food in enumerate(popular, 1):
                reply += f"{idx}. {food.title}"
                if food.store:
                    reply += f" ({food.store.store_name})"
                if food.price:
                    reply += f" - {float(food.price):,.0f}đ"
                reply += "\n"
                
                # Add sales count if available (from OrderDetail aggregation)
                try:
                    from django.db.models import Sum
                    total_sold = OrderDetail.objects.filter(food_id=food.id).aggregate(Sum('quantity'))['quantity__sum']
                    if total_sold:
                        reply += f"   📦 Đã bán: {total_sold} đơn\n"
                except:
                    pass
                
                if food.description and len(food.description) <= 80:
                    reply += f"   {food.description}\n"
                reply += "\n"
            
            reply += "Bạn muốn đặt món nào không ạ?"
            
            foods_data = [format_food_for_mobile(food) for food in popular]
            
            ChatMessage.objects.create(session=session, message=reply, is_user=False, intent='popular_items')
            
            return Response({
                'reply': reply,
                'intent': 'popular_items',
                'data': {'foods': foods_data}
            })
        
        ChatMessage.objects.create(session=session, message=reply, is_user=False, intent='popular_items')
        return Response({'reply': reply, 'intent': 'popular_items'})
    
    # 5. Top Rated: "Món nào được đánh giá cao?"
    if intent == 'top_rated':
        top_rated = get_top_rated_items()
        
        if not top_rated:
            reply = "Hiện tại chưa có dữ liệu đánh giá ạ. Bạn có thể xem menu đầy đủ không?"
        else:
            reply = "⭐ **Top món được đánh giá cao nhất:**\n\n"
            for idx, food in enumerate(top_rated, 1):
                reply += f"{idx}. {food.title}"
                if food.store:
                    reply += f" ({food.store.store_name})"
                if food.price:
                    reply += f" - {float(food.price):,.0f}đ"
                reply += "\n"
                
                # Add rating if available
                try:
                    from django.db.models import Avg, Count
                    rating_data = RatingFood.objects.filter(food_id=food.id).aggregate(
                        avg_rating=Avg('point'),
                        rating_count=Count('id')
                    )
                    if rating_data['avg_rating']:
                        reply += f"   ⭐ Đánh giá: {rating_data['avg_rating']:.1f}/5 ({rating_data['rating_count']} reviews)\n"
                except:
                    pass
                
                if food.description and len(food.description) <= 80:
                    reply += f"   {food.description}\n"
                reply += "\n"
            
            reply += "Bạn muốn đặt món nào không ạ?"
            
            foods_data = [format_food_for_mobile(food) for food in top_rated]
            
            ChatMessage.objects.create(session=session, message=reply, is_user=False, intent='top_rated')
            
            return Response({
                'reply': reply,
                'intent': 'top_rated',
                'data': {'foods': foods_data}
            })
        
        ChatMessage.objects.create(session=session, message=reply, is_user=False, intent='top_rated')
        return Response({'reply': reply, 'intent': 'top_rated'})
    
    # 6. Recommendation: "Gợi ý món ngon?"
    if intent == 'recommendation':
        recommended = get_recommended_items()
        
        if not recommended:
            reply = "Hiện tại chưa có đủ dữ liệu để gợi ý ạ. Bạn có thể xem menu đầy đủ không?"
        else:
            reply = "💡 **Gợi ý món ngon cho bạn:**\n\n"
            for idx, food in enumerate(recommended, 1):
                reply += f"{idx}. {food.title}"
                if food.store:
                    reply += f" ({food.store.store_name})"
                if food.price:
                    reply += f" - {float(food.price):,.0f}đ"
                reply += "\n"
                
                if food.description and len(food.description) <= 80:
                    reply += f"   {food.description}\n"
                reply += "\n"
            
            reply += "Bạn muốn đặt món nào không ạ?"
            
            foods_data = [format_food_for_mobile(food) for food in recommended]
            
            ChatMessage.objects.create(session=session, message=reply, is_user=False, intent='recommendation')
            
            return Response({
                'reply': reply,
                'intent': 'recommendation',
                'data': {'foods': foods_data}
            })
        
        ChatMessage.objects.create(session=session, message=reply, is_user=False, intent='recommendation')
        return Response({'reply': reply, 'intent': 'recommendation'})
    
    # Continue with existing order processing logic
    if ai_result and ai_result.get('intent') == 'order' and ai_result.get('items'):
        # Process order from AI
        items = ai_result['items']
        if len(items) == 1:
            item = items[0]
            try:
                food = Food.objects.get(id=item['food_id'])
                quantity = item.get('quantity', 1)
                
                # Check if has sizes
                if food.sizes.exists():
                    size_name = item.get('size', '').upper()
                    if size_name:
                        # Try to find size
                        size = food.sizes.filter(size_name__iexact=size_name).first()
                        if size:
                            ChatCart.objects.create(
                                session=session,
                                food=food,
                                food_size=size,
                                quantity=quantity
                            )
                            reply = f"✅ Đã thêm {quantity} {food.title} ({size.size_name}) - {size.price:,}đ vào giỏ hàng!"
                        else:
                            # Ask for size
                            reply = f"Món {food.title} có các size:\n\n"
                            for s in food.sizes.all():
                                reply += f"- {s.size_name}: {s.price:,}đ\n"
                            reply += "\nBạn chọn size nào?"
                            
                            state['waiting_for'] = 'size'
                            state['pending_item'] = {
                                'food_id': food.id,
                                'quantity': quantity
                            }
                            session.state = state
                            session.save()
                            
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
                    else:
                        # Ask for size
                        reply = f"Món {food.title} có các size:\n\n"
                        for s in food.sizes.all():
                            reply += f"- {s.size_name}: {s.price:,}đ\n"
                        reply += "\nBạn chọn size nào?"
                        
                        state['waiting_for'] = 'size'
                        state['pending_item'] = {
                            'food_id': food.id,
                            'quantity': quantity
                        }
                        session.state = state
                        session.save()
                        
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
                else:
                    # Add directly
                    ChatCart.objects.create(
                        session=session,
                        food=food,
                        quantity=quantity
                    )
                    reply = f"✅ Đã thêm {quantity} {food.title} - {food.price:,}đ vào giỏ hàng!"
                
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
            except Food.DoesNotExist:
                pass
    
    # Fallback: Try to parse multiple items from user message
    # Look for patterns like "1 gà và 2 nước", "2 pizza, 1 burger"
    import re as re_module
    
    # Try to extract items with quantities
    # Pattern: number + words (item name)
    item_pattern = r'(\d+)\s+([a-zA-ZÀ-ỹ\s]+?)(?=\s+và|\s+với|,|\s+\d+|$)'
    potential_items = re_module.findall(item_pattern, user_message, re_module.IGNORECASE)
    
    requested_items = []
    if potential_items and has_order_intent:
        for qty_str, name in potential_items:
            name = name.strip()
            # Filter out common words
            if name and len(name) > 1 and name.lower() not in ['và', 'với', 'thêm', 'cho', 'tôi', 'muốn']:
                requested_items.append({
                    'name': name,
                    'quantity': int(qty_str) if qty_str.isdigit() else 1
                })
    
    # If we found multiple requested items, process them specially
    if len(requested_items) > 1:
        # Find matches for each item
        items_with_matches = []
        not_found = []
        
        for req in requested_items:
            name = req['name']
            quantity = req['quantity']
            
            matches = find_menu_items(name, limit=10)  # Get more matches for grouping
            
            if not matches:
                not_found.append(name)
            else:
                items_with_matches.append({
                    'requested': {'name': name, 'quantity': quantity},
                    'matches': matches
                })
        
        if not_found:
            reply = "❌ Không tìm thấy: " + ", ".join(not_found)
            ChatMessage.objects.create(session=session, message=reply, is_user=False, intent='not_found')
            return Response({'reply': reply, 'intent': 'not_found'})
        
        if items_with_matches:
            # Group by store - find stores that have at least one item
            stores_dict = {}
            
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
                            'requested_items': {},  # Track which requested items we have
                            'food_ids': []  # Store food IDs instead of objects
                        }
                    
                    # Check if this requested item is already added
                    item_key = item_data['requested']['name']
                    if item_key in stores_dict[sid]['requested_items']:
                        continue
                    
                    stores_dict[sid]['requested_items'][item_key] = True
                    stores_dict[sid]['food_ids'].append(match.id)  # Store ID instead of object
                    
                    # Format item with quantity and price
                    quantity = item_data['requested']['quantity']
                    price = float(match.price) if match.price else 0
                    
                    item_str = f"{quantity}x {match.title}"
                    if price > 0:
                        item_str += f" ({price:,.0f}đ)"
                    
                    stores_dict[sid]['items'].append(item_str)
                    stores_dict[sid]['matched_count'] += 1
            
            # Sort stores: prioritize those with more items
            sorted_stores = sorted(
                stores_dict.values(),
                key=lambda x: (-x['matched_count'], x['store_name'])
            )
            
            # Build response showing stores with their available items
            total_requested = len(items_with_matches)
            stores_data = []
            reply = "🏪 **Các cửa hàng có món bạn yêu cầu:**\n\n"
            
            for i, store_info in enumerate(sorted_stores[:6], 1):  # Limit to top 6 stores
                # Badge to show if store has all items
                if store_info['matched_count'] == total_requested:
                    badge = "✅ Đủ tất cả món"
                else:
                    badge = f"⚠️ Có {store_info['matched_count']}/{total_requested} món"
                
                items_list = "\n     • ".join(store_info['items'])
                reply += f"{i}. **{store_info['store_name']}** ({badge})\n"
                reply += f"     • {items_list}\n\n"
                
                # Collect store data for mobile
                stores_data.append({
                    'store_id': store_info['store_id'],
                    'store_name': store_info['store_name'],
                    'matched_count': store_info['matched_count'],
                    'total_requested': total_requested
                })
            
            reply += "💬 Bạn muốn đặt từ cửa hàng nào? (Nhập số hoặc tên cửa hàng)"
            
            # Save state for store selection (serialize Food objects to dicts)
            # Convert items_with_matches to serializable format
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
            state['stores'] = sorted_stores  # This is already dict format
            session.state = state
            session.save()
            
            # Also return foods grouped by store for mobile display
            all_foods = []
            for store_info in sorted_stores[:6]:
                store_id = store_info['store_id']
                # Get unique foods from this store
                seen_food_ids = set()
                for item_data in items_with_matches:
                    for match in item_data['matches']:
                        if match.store and match.store.id == store_id and match.id not in seen_food_ids:
                            seen_food_ids.add(match.id)
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
    
    # Single item or simple fallback: Try keyword search
    matches = find_menu_items(user_message, limit=5)
    
    if matches:
        if len(matches) == 1:
            food = matches[0]
            # Check if has sizes
            if food.sizes.exists():
                reply = f"Món {food.title} có các size:\n\n"
                for s in food.sizes.all():
                    reply += f"- {s.size_name}: {s.price:,}đ\n"
                reply += "\nBạn chọn size nào?"
                
                state['waiting_for'] = 'size'
                state['pending_item'] = {
                    'food_id': food.id,
                    'quantity': 1
                }
                session.state = state
                session.save()
                
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
            else:
                ChatCart.objects.create(
                    session=session,
                    food=food,
                    quantity=1
                )
                reply = f"✅ Đã thêm {food.title} - {food.price:,}đ vào giỏ hàng!"
                
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
            reply = "Tìm thấy các món:\n\n"
            for idx, food in enumerate(matches, 1):
                reply += f"{idx}. {format_food_info(food, include_sizes=False)}\n"
            reply += "\nBạn muốn đặt món nào?"
            
            # Format foods for mobile
            foods_data = [format_food_for_mobile(food) for food in matches]
            
            ChatMessage.objects.create(
                session=session,
                message=reply,
                is_user=False,
                intent='clarify'
            )
            
            return Response({
                'reply': reply,
                'intent': 'clarify',
                'data': {
                    'foods': foods_data
                }
            })
    
    # Default response - handle greeting and other
    if intent == 'greeting':
        reply = "Xin chào! Tôi có thể giúp bạn:\n"
        reply += "• Xem menu món ăn\n"
        reply += "• Đặt món ăn\n"
        reply += "• Xem món bán chạy/được yêu thích\n"
        reply += "• Gợi ý món ngon\n"
        reply += "• Xem đánh giá và thông tin món\n\n"
        reply += "Bạn muốn làm gì ạ?"
    elif intent == 'show_cart':
        # Show cart items
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
                reply += f"\n   {item.food.store.store_name if item.food.store else 'N/A'} - {item_total:,.0f}đ\n"
            
            reply += f"\n💰 Tổng: {total:,.0f}đ"
    else:
        reply = ai_result.get('response') if ai_result else "Xin lỗi, tôi không hiểu yêu cầu của bạn. Bạn có thể nói rõ hơn không?"
    
    ChatMessage.objects.create(
        session=session,
        message=reply,
        is_user=False,
        intent=intent
    )
    
    return Response({
        'reply': reply,
        'intent': intent
    })


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
