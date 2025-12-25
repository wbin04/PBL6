"""
Chatbot Statistics Utilities
Các hàm truy vấn database để hỗ trợ chatbot thống kê món ăn
"""

from datetime import timedelta
from decimal import Decimal
from django.db.models import Sum, Avg, Count, Q, F
from django.utils import timezone
from django.conf import settings

from apps.menu.models import Food
from apps.orders.models import Order, OrderDetail
from apps.ratings.models import RatingFood


# === INTENT CLASSIFICATION KEYWORDS ===

# Từ khóa cho intent: Bán chạy / Mua nhiều
BEST_SELLER_KEYWORDS = [
    'bán chạy', 'ban chay', 'mua nhiều', 'mua nhieu', 'bán nhiều', 'ban nhieu',
    'phổ biến', 'pho bien', 'hot', 'nổi tiếng', 'noi tieng', 'best seller',
    'bestseller', 'đông khách', 'dong khach', 'được mua', 'duoc mua',
    'đặt nhiều', 'dat nhieu', 'ưa chuộng', 'ua chuong', 'thịnh hành', 'thinh hanh',
    'top bán', 'top ban', 'bán chạy nhất', 'ban chay nhat', 'bán được nhiều', 
    'được đặt nhiều', 'mọi người hay mua', 'moi nguoi hay mua'
]

# Từ khóa cho intent: Đánh giá tốt / Ngon nhất  
TOP_RATED_KEYWORDS = [
    'đánh giá', 'danh gia', 'đánh giá cao', 'danh gia cao', 'ngon nhất', 'ngon nhat',
    'ngon', 'tốt nhất', 'tot nhat', 'chất lượng', 'chat luong', 'rating', 'rate',
    'sao', 'star', 'điểm cao', 'diem cao', 'được khen', 'duoc khen', 'recommend',
    'gợi ý', 'goi y', 'nên ăn', 'nen an', 'nên thử', 'nen thu', 'đề xuất', 'de xuat',
    'review tốt', 'review tot', 'nhiều sao', 'nhieu sao', '5 sao', '4 sao',
    'được yêu thích', 'duoc yeu thich', 'yêu thích', 'yeu thich'
]

# Từ khóa cho intent: Trending / Gần đây
TRENDING_KEYWORDS = [
    'gần đây', 'gan day', 'mới', 'moi', 'trending', 'hot gần đây', 'hot gan day',
    'tuần này', 'tuan nay', 'tháng này', 'thang nay', 'hôm nay', 'hom nay',
    'mới đây', 'moi day', 'xu hướng', 'xu huong', 'đang hot', 'dang hot',
    'trend', 'mới nhất', 'moi nhat', 'latest', 'recent', 'thời gian gần',
    'thoi gian gan', 'hiện tại', 'hien tai', 'bây giờ', 'bay gio'
]


def classify_statistics_intent(message: str) -> dict:
    """
    Phân loại ý định thống kê từ tin nhắn của người dùng
    
    Returns:
        dict với các key:
        - intent_type: 'best_seller' | 'top_rated' | 'trending' | None
        - confidence: float (0-1)
        - keywords_matched: list of matched keywords
    """
    if not message:
        return {'intent_type': None, 'confidence': 0, 'keywords_matched': []}
    
    message_lower = message.lower()
    
    results = {
        'best_seller': {'count': 0, 'keywords': []},
        'top_rated': {'count': 0, 'keywords': []},
        'trending': {'count': 0, 'keywords': []}
    }
    
    # Check best seller keywords
    for kw in BEST_SELLER_KEYWORDS:
        if kw in message_lower:
            results['best_seller']['count'] += 1
            results['best_seller']['keywords'].append(kw)
    
    # Check top rated keywords
    for kw in TOP_RATED_KEYWORDS:
        if kw in message_lower:
            results['top_rated']['count'] += 1
            results['top_rated']['keywords'].append(kw)
    
    # Check trending keywords
    for kw in TRENDING_KEYWORDS:
        if kw in message_lower:
            results['trending']['count'] += 1
            results['trending']['keywords'].append(kw)
    
    # Determine primary intent
    best_intent = None
    max_count = 0
    matched_keywords = []
    
    for intent_type, data in results.items():
        if data['count'] > max_count:
            max_count = data['count']
            best_intent = intent_type
            matched_keywords = data['keywords']
    
    # Calculate confidence based on keyword matches
    confidence = min(max_count / 3.0, 1.0) if max_count > 0 else 0
    
    return {
        'intent_type': best_intent if max_count > 0 else None,
        'confidence': confidence,
        'keywords_matched': matched_keywords
    }


def get_best_selling_foods(limit: int = 5, store_id: int = None, category_id: int = None) -> list:
    """
    Lấy danh sách món ăn bán chạy nhất
    Dựa trên tổng số lượng đã bán từ OrderDetail
    
    Args:
        limit: Số lượng món trả về (mặc định 5)
        store_id: Lọc theo cửa hàng (optional)
        category_id: Lọc theo danh mục (optional)
    
    Returns:
        List[dict] với thông tin món ăn và số lượng đã bán
    """
    try:
        # Base query - aggregate by food_id
        query = OrderDetail.objects.values('food_id').annotate(
            total_sold=Sum('quantity')
        ).filter(total_sold__gt=0)
        
        # Get food IDs ordered by total sold
        top_foods_data = query.order_by('-total_sold')[:limit * 2]  # Get more to filter
        
        food_ids = [item['food_id'] for item in top_foods_data]
        sales_map = {item['food_id']: item['total_sold'] for item in top_foods_data}
        
        if not food_ids:
            return []
        
        # Get Food objects with related data
        foods_qs = Food.objects.filter(id__in=food_ids).select_related('store', 'category')
        
        # Apply additional filters
        if store_id:
            foods_qs = foods_qs.filter(store_id=store_id)
        if category_id:
            foods_qs = foods_qs.filter(category_id=category_id)
        
        foods = list(foods_qs)
        
        # Get rating stats for these foods
        rating_stats = get_foods_rating_stats(food_ids)
        
        # Build result with stats
        results = []
        for food in foods:
            result = _format_food_with_stats(
                food, 
                total_sold=sales_map.get(food.id, 0),
                rating_stats=rating_stats.get(food.id)
            )
            result['badge_type'] = 'best_seller'
            result['badge_text'] = 'Bán chạy nhất'
            results.append(result)
        
        # Sort by total_sold
        results.sort(key=lambda x: x.get('total_sold', 0), reverse=True)
        
        return results[:limit]
        
    except Exception as e:
        print(f"Error getting best selling foods: {e}")
        return []


def get_top_rated_foods(limit: int = 5, min_rating: float = 3.5, min_reviews: int = 1, 
                        store_id: int = None, category_id: int = None) -> list:
    """
    Lấy danh sách món ăn được đánh giá cao nhất
    Dựa trên điểm trung bình từ RatingFood
    
    Args:
        limit: Số lượng món trả về (mặc định 5)
        min_rating: Điểm tối thiểu (mặc định 3.5)
        min_reviews: Số đánh giá tối thiểu (mặc định 1)
        store_id: Lọc theo cửa hàng (optional)
        category_id: Lọc theo danh mục (optional)
    
    Returns:
        List[dict] với thông tin món ăn và điểm đánh giá
    """
    try:
        # Aggregate ratings by food
        rating_query = RatingFood.objects.values('food_id').annotate(
            avg_rating=Avg('rating'),
            review_count=Count('id')
        ).filter(
            avg_rating__gte=min_rating,
            review_count__gte=min_reviews
        ).order_by('-avg_rating', '-review_count')[:limit * 2]
        
        food_ids = [item['food_id'] for item in rating_query]
        rating_map = {
            item['food_id']: {
                'avg_rating': float(item['avg_rating']),
                'review_count': item['review_count']
            } 
            for item in rating_query
        }
        
        if not food_ids:
            return []
        
        # Get Food objects
        foods_qs = Food.objects.filter(id__in=food_ids).select_related('store', 'category')
        
        if store_id:
            foods_qs = foods_qs.filter(store_id=store_id)
        if category_id:
            foods_qs = foods_qs.filter(category_id=category_id)
        
        foods = list(foods_qs)
        
        # Get sales stats
        sales_stats = get_foods_sales_stats(food_ids)
        
        # Build results
        results = []
        for food in foods:
            rating_data = rating_map.get(food.id, {})
            result = _format_food_with_stats(
                food,
                total_sold=sales_stats.get(food.id, {}).get('total_sold', 0),
                rating_stats=rating_data
            )
            
            # Generate star badge
            avg = rating_data.get('avg_rating', 0)
            stars = '⭐' * int(round(avg))
            result['badge_type'] = 'top_rated'
            result['badge_text'] = f'{stars} ({avg:.1f})'
            results.append(result)
        
        # Sort by avg_rating
        results.sort(key=lambda x: x.get('average_rating', 0), reverse=True)
        
        return results[:limit]
        
    except Exception as e:
        print(f"Error getting top rated foods: {e}")
        return []


def get_trending_foods(days: int = 7, limit: int = 5, 
                       store_id: int = None, category_id: int = None) -> list:
    """
    Lấy danh sách món ăn trending (được đặt nhiều trong thời gian gần đây)
    
    Args:
        days: Số ngày để tính trending (mặc định 7)
        limit: Số lượng món trả về (mặc định 5)
        store_id: Lọc theo cửa hàng (optional)
        category_id: Lọc theo danh mục (optional)
    
    Returns:
        List[dict] với thông tin món ăn trending
    """
    try:
        # Calculate date range
        end_date = timezone.now()
        start_date = end_date - timedelta(days=days)
        
        # Get orders in date range
        recent_orders = Order.objects.filter(
            created_date__gte=start_date,
            created_date__lte=end_date
        ).exclude(
            order_status='Đã huỷ'
        ).values_list('id', flat=True)
        
        if not recent_orders:
            # Fallback to last 30 days if no recent orders
            start_date = end_date - timedelta(days=30)
            recent_orders = Order.objects.filter(
                created_date__gte=start_date,
                created_date__lte=end_date
            ).exclude(
                order_status='Đã huỷ'
            ).values_list('id', flat=True)
        
        if not recent_orders:
            return []
        
        # Get food counts from order details
        trending_query = OrderDetail.objects.filter(
            order_id__in=recent_orders
        ).values('food_id').annotate(
            recent_orders=Count('order_id', distinct=True),
            recent_quantity=Sum('quantity')
        ).order_by('-recent_orders', '-recent_quantity')[:limit * 2]
        
        food_ids = [item['food_id'] for item in trending_query]
        trending_map = {
            item['food_id']: {
                'recent_orders': item['recent_orders'],
                'recent_quantity': item['recent_quantity']
            }
            for item in trending_query
        }
        
        if not food_ids:
            return []
        
        # Get Food objects
        foods_qs = Food.objects.filter(id__in=food_ids).select_related('store', 'category')
        
        if store_id:
            foods_qs = foods_qs.filter(store_id=store_id)
        if category_id:
            foods_qs = foods_qs.filter(category_id=category_id)
        
        foods = list(foods_qs)
        
        # Get rating and total sales stats
        rating_stats = get_foods_rating_stats(food_ids)
        sales_stats = get_foods_sales_stats(food_ids)
        
        # Build results
        results = []
        for food in foods:
            trending_data = trending_map.get(food.id, {})
            result = _format_food_with_stats(
                food,
                total_sold=sales_stats.get(food.id, {}).get('total_sold', 0),
                rating_stats=rating_stats.get(food.id)
            )
            result['recent_orders'] = trending_data.get('recent_orders', 0)
            result['recent_quantity'] = trending_data.get('recent_quantity', 0)
            result['badge_type'] = 'trending'
            result['badge_text'] = f'🔥 Hot {days} ngày qua'
            results.append(result)
        
        # Sort by recent activity
        results.sort(key=lambda x: (x.get('recent_orders', 0), x.get('recent_quantity', 0)), reverse=True)
        
        return results[:limit]
        
    except Exception as e:
        print(f"Error getting trending foods: {e}")
        return []


def get_foods_rating_stats(food_ids: list) -> dict:
    """
    Lấy thống kê đánh giá cho nhiều món ăn
    
    Args:
        food_ids: List ID của các món ăn
    
    Returns:
        Dict mapping food_id -> {'avg_rating': float, 'review_count': int}
    """
    if not food_ids:
        return {}
    
    try:
        stats = RatingFood.objects.filter(
            food_id__in=food_ids
        ).values('food_id').annotate(
            avg_rating=Avg('rating'),
            review_count=Count('id')
        )
        
        return {
            item['food_id']: {
                'avg_rating': float(item['avg_rating']) if item['avg_rating'] else 0,
                'review_count': item['review_count']
            }
            for item in stats
        }
    except Exception as e:
        print(f"Error getting rating stats: {e}")
        return {}


def get_foods_sales_stats(food_ids: list) -> dict:
    """
    Lấy thống kê số lượng bán cho nhiều món ăn
    
    Args:
        food_ids: List ID của các món ăn
    
    Returns:
        Dict mapping food_id -> {'total_sold': int}
    """
    if not food_ids:
        return {}
    
    try:
        stats = OrderDetail.objects.filter(
            food_id__in=food_ids
        ).values('food_id').annotate(
            total_sold=Sum('quantity')
        )
        
        return {
            item['food_id']: {
                'total_sold': int(item['total_sold']) if item['total_sold'] else 0
            }
            for item in stats
        }
    except Exception as e:
        print(f"Error getting sales stats: {e}")
        return {}


def _format_food_with_stats(food, total_sold: int = 0, rating_stats: dict = None) -> dict:
    """
    Format food object với thống kê để trả về cho mobile app
    
    Args:
        food: Food model instance
        total_sold: Tổng số lượng đã bán
        rating_stats: Dict với avg_rating và review_count
    
    Returns:
        Dict với đầy đủ thông tin món ăn và thống kê
    """
    rating_stats = rating_stats or {}
    
    # Build image URL
    image_url = food.image if food.image else ''
    if image_url and not image_url.startswith(('http://', 'https://')):
        # Relative path - will be handled by frontend
        pass
    
    return {
        'id': food.id,
        'title': food.title,
        'description': food.description or '',
        'price': str(food.price) if food.price else '0',
        'image': image_url,
        'image_url': image_url,  # Alias for compatibility
        'store_id': food.store.id if food.store else 0,
        'store_name': food.store.store_name if food.store else '',
        'category_id': food.category.id if food.category else 0,
        'category_name': food.category.cate_name if food.category else '',
        'average_rating': rating_stats.get('avg_rating', 0),
        'review_count': rating_stats.get('review_count', 0),
        'total_sold': total_sold,
        'sizes': [
            {
                'id': size.id,
                'size_name': size.size_name,
                'price': str(size.price) if size.price else '0'
            }
            for size in food.sizes.all()
        ] if hasattr(food, 'sizes') and food.sizes.exists() else []
    }


def generate_statistics_response(intent_type: str, foods: list, keywords: list = None) -> str:
    """
    Tạo câu trả lời tự nhiên bằng tiếng Việt cho chatbot
    
    Args:
        intent_type: 'best_seller' | 'top_rated' | 'trending'
        foods: List các món ăn đã format
        keywords: List từ khóa đã match (optional)
    
    Returns:
        String phản hồi thân thiện
    """
    if not foods:
        responses = {
            'best_seller': "Hiện tại chưa có dữ liệu về món bán chạy. Bạn có muốn xem menu không?",
            'top_rated': "Hiện tại chưa có đánh giá nào. Bạn có muốn xem menu không?",
            'trending': "Gần đây chưa có món nào nổi bật. Bạn có muốn xem menu không?"
        }
        return responses.get(intent_type, "Không tìm thấy thông tin. Bạn cần hỗ trợ gì thêm?")
    
    count = len(foods)
    
    if intent_type == 'best_seller':
        intro = f"🔥 Đây là Top {count} món bán chạy nhất:\n\n"
        for idx, food in enumerate(foods, 1):
            line = f"{idx}. **{food['title']}**"
            if food.get('store_name'):
                line += f" - {food['store_name']}"
            if food.get('total_sold'):
                line += f" ({food['total_sold']} đã bán)"
            intro += line + "\n"
        intro += "\n💡 Bạn muốn đặt món nào? Chỉ cần nhấn vào hoặc nói tên món nhé!"
        
    elif intent_type == 'top_rated':
        intro = f"⭐ Đây là Top {count} món được đánh giá cao nhất:\n\n"
        for idx, food in enumerate(foods, 1):
            rating = food.get('average_rating', 0)
            reviews = food.get('review_count', 0)
            stars = '⭐' * int(round(rating))
            line = f"{idx}. **{food['title']}** {stars} ({rating:.1f}/5 - {reviews} đánh giá)"
            if food.get('store_name'):
                line += f"\n   📍 {food['store_name']}"
            intro += line + "\n"
        intro += "\n💡 Muốn thử món nào? Nhấn vào thẻ để xem chi tiết hoặc đặt ngay!"
        
    elif intent_type == 'trending':
        intro = f"📈 Đây là Top {count} món đang HOT gần đây:\n\n"
        for idx, food in enumerate(foods, 1):
            line = f"{idx}. **{food['title']}**"
            if food.get('store_name'):
                line += f" - {food['store_name']}"
            if food.get('recent_orders'):
                line += f" (🛒 {food['recent_orders']} đơn gần đây)"
            intro += line + "\n"
        intro += "\n🔥 Những món này đang được đặt rất nhiều đó! Bạn muốn thử không?"
        
    else:
        intro = "Đây là kết quả tìm kiếm của bạn:\n\n"
        for idx, food in enumerate(foods, 1):
            intro += f"{idx}. {food['title']}"
            if food.get('price'):
                intro += f" - {float(food['price']):,.0f}đ"
            intro += "\n"
    
    return intro


def get_statistics_for_intent(intent_type: str, limit: int = 5, 
                              store_id: int = None, category_id: int = None,
                              days_for_trending: int = 7) -> tuple:
    """
    Hàm tổng hợp để lấy thống kê dựa trên intent
    
    Args:
        intent_type: 'best_seller' | 'top_rated' | 'trending'
        limit: Số lượng món trả về
        store_id: Lọc theo cửa hàng (optional)
        category_id: Lọc theo danh mục (optional)
        days_for_trending: Số ngày cho trending (mặc định 7)
    
    Returns:
        Tuple (foods_list, response_text)
    """
    foods = []
    
    if intent_type == 'best_seller':
        foods = get_best_selling_foods(limit, store_id, category_id)
    elif intent_type == 'top_rated':
        foods = get_top_rated_foods(limit, store_id=store_id, category_id=category_id)
    elif intent_type == 'trending':
        foods = get_trending_foods(days_for_trending, limit, store_id, category_id)
    
    response_text = generate_statistics_response(intent_type, foods)
    
    return foods, response_text
