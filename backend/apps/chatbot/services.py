"""
Chatbot Query Service
Xử lý logic gợi ý món ăn thông minh dựa trên dữ liệu thực tế
"""

from datetime import timedelta
from decimal import Decimal
from typing import List, Dict, Optional, Any
from django.db.models import Sum, Avg, Count, Q, F
from django.utils import timezone
from django.conf import settings

from apps.menu.models import Food
from apps.orders.models import Order, OrderDetail
from apps.ratings.models import RatingFood


class ChatbotQueryService:
    """
    Service class chứa các static method để query dữ liệu thống kê món ăn
    """
    
    # === INTENT CLASSIFICATION ===
    
    BEST_SELLER_KEYWORDS = [
        'bán chạy', 'ban chay', 'mua nhiều', 'mua nhieu', 'bán nhiều', 'ban nhieu',
        'phổ biến', 'pho bien', 'hot', 'nổi tiếng', 'noi tieng', 'best seller',
        'bestseller', 'đông khách', 'dong khach', 'được mua', 'duoc mua',
        'đặt nhiều', 'dat nhieu', 'ưa chuộng', 'ua chuong', 'top bán', 'top ban',
        'bán được nhiều', 'được đặt nhiều', 'mọi người hay mua'
    ]
    
    TOP_RATED_KEYWORDS = [
        'đánh giá', 'danh gia', 'đánh giá cao', 'danh gia cao', 'ngon nhất', 'ngon nhat',
        'ngon', 'tốt nhất', 'tot nhat', 'chất lượng', 'chat luong', 'rating', 'rate',
        'sao', 'star', 'điểm cao', 'diem cao', 'được khen', 'duoc khen', 'recommend',
        'gợi ý', 'goi y', 'nên ăn', 'nen an', 'nên thử', 'nen thu', 'đề xuất', 'de xuat',
        'review tốt', 'nhiều sao', '5 sao', '4 sao', 'yêu thích', 'yeu thich'
    ]
    
    TRENDING_KEYWORDS = [
        'gần đây', 'gan day', 'mới', 'moi', 'trending', 'hot gần đây', 'hot gan day',
        'tuần này', 'tuan nay', 'tháng này', 'thang nay', 'hôm nay', 'hom nay',
        'mới đây', 'moi day', 'xu hướng', 'xu huong', 'đang hot', 'dang hot',
        'trend', 'mới nhất', 'moi nhat', 'latest', 'recent', 'bây giờ', 'bay gio'
    ]
    
    CHEAP_EATS_KEYWORDS = [
        'rẻ', 're', 'giá rẻ', 'gia re', 'tiết kiệm', 'tiet kiem', 'bình dân', 'binh dan',
        'dưới', 'duoi', 'ít tiền', 'it tien', 'cheap', 'budget', 'affordable',
        'không đắt', 'khong dat', 'hợp túi tiền', 'hop tui tien', 'giá tốt', 'gia tot',
        'giá cả phải chăng', 'sinh viên', 'sinh vien', 'kinh tế', 'kinh te'
    ]
    
    @staticmethod
    def classify_intent(message: str) -> Dict[str, Any]:
        """
        Phân loại ý định từ tin nhắn người dùng
        
        Returns:
            dict với intent_type và confidence
        """
        if not message:
            return {'intent_type': None, 'confidence': 0}
        
        message_lower = message.lower()
        
        results = {
            'best_seller': 0,
            'top_rated': 0,
            'trending': 0,
            'cheap_eats': 0
        }
        
        for kw in ChatbotQueryService.BEST_SELLER_KEYWORDS:
            if kw in message_lower:
                results['best_seller'] += 1
                
        for kw in ChatbotQueryService.TOP_RATED_KEYWORDS:
            if kw in message_lower:
                results['top_rated'] += 1
                
        for kw in ChatbotQueryService.TRENDING_KEYWORDS:
            if kw in message_lower:
                results['trending'] += 1
                
        for kw in ChatbotQueryService.CHEAP_EATS_KEYWORDS:
            if kw in message_lower:
                results['cheap_eats'] += 1
        
        # Get the intent with highest count
        max_count = max(results.values())
        if max_count == 0:
            return {'intent_type': None, 'confidence': 0}
        
        best_intent = max(results, key=results.get)
        confidence = min(max_count / 3.0, 1.0)
        
        return {
            'intent_type': best_intent,
            'confidence': confidence
        }
    
    # === QUERY METHODS ===
    
    @staticmethod
    def get_best_sellers(limit: int = 5, base_url: str = '') -> Dict[str, Any]:
        """
        Lấy danh sách món ăn bán chạy nhất
        Query OrderDetail, GROUP BY food, SUM(quantity), ORDER BY -total_sold
        
        Args:
            limit: Số lượng món trả về (mặc định 5)
            base_url: Base URL để build full image URL
        
        Returns:
            Response dict chuẩn với type, message, data
        """
        try:
            # Query OrderDetail, group by food, sum quantity
            best_sellers = OrderDetail.objects.values('food').annotate(
                total_sold=Sum('quantity')
            ).filter(total_sold__gt=0).order_by('-total_sold')[:limit]
            
            food_ids = [item['food'] for item in best_sellers]
            sales_map = {item['food']: item['total_sold'] for item in best_sellers}
            
            if not food_ids:
                return ChatbotQueryService._empty_response(
                    "Dạ, hiện tại chưa có dữ liệu món bán chạy. Bạn muốn xem menu không ạ? 🍔"
                )
            
            # Get Food objects with related data
            foods = Food.objects.filter(id__in=food_ids).select_related('store', 'category')
            
            # Build data array
            data = []
            for food in sorted(foods, key=lambda f: sales_map.get(f.id, 0), reverse=True):
                total_sold = sales_map.get(food.id, 0)
                data.append({
                    'id': food.id,
                    'title': food.title,
                    'price': float(food.price) if food.price else 0,
                    'image': ChatbotQueryService._build_image_url(food.image, base_url),
                    'badge': f'🔥 {total_sold} đã bán',
                    'badge_type': 'best_seller',
                    'store_name': food.store.store_name if food.store else '',
                    'store_id': food.store.id if food.store else 0,
                    'total_sold': total_sold
                })
            
            return {
                'type': 'recommendation',
                'message': f'🔥 Dạ, đây là Top {len(data)} món bán chạy nhất quán em nhé:',
                'data': data
            }
            
        except Exception as e:
            print(f"Error in get_best_sellers: {e}")
            return ChatbotQueryService._error_response()
    
    @staticmethod
    def get_top_rated(limit: int = 5, min_reviews: int = 3, base_url: str = '') -> Dict[str, Any]:
        """
        Lấy danh sách món ăn được đánh giá cao nhất
        Query RatingFood, GROUP BY food, AVG(rating), filter count >= min_reviews
        
        Args:
            limit: Số lượng món trả về
            min_reviews: Số đánh giá tối thiểu (tránh món 1 vote 5 sao)
            base_url: Base URL để build image
        
        Returns:
            Response dict chuẩn
        """
        try:
            # Query RatingFood, group by food, calculate avg and count
            top_rated = RatingFood.objects.values('food').annotate(
                avg_score=Avg('rating'),
                review_count=Count('id')
            ).filter(
                review_count__gte=min_reviews
            ).order_by('-avg_score', '-review_count')[:limit]
            
            food_ids = [item['food'] for item in top_rated]
            rating_map = {
                item['food']: {
                    'avg_score': float(item['avg_score']),
                    'review_count': item['review_count']
                }
                for item in top_rated
            }
            
            if not food_ids:
                # Fallback: get any rated foods without min_reviews constraint
                top_rated = RatingFood.objects.values('food').annotate(
                    avg_score=Avg('rating'),
                    review_count=Count('id')
                ).filter(avg_score__gte=3.5).order_by('-avg_score')[:limit]
                
                food_ids = [item['food'] for item in top_rated]
                rating_map = {
                    item['food']: {
                        'avg_score': float(item['avg_score']),
                        'review_count': item['review_count']
                    }
                    for item in top_rated
                }
            
            if not food_ids:
                return ChatbotQueryService._empty_response(
                    "Dạ, hiện tại chưa có đánh giá nào. Bạn muốn thử món nào đó không ạ? ⭐"
                )
            
            foods = Food.objects.filter(id__in=food_ids).select_related('store', 'category')
            
            data = []
            for food in sorted(foods, key=lambda f: rating_map.get(f.id, {}).get('avg_score', 0), reverse=True):
                rating_info = rating_map.get(food.id, {})
                avg = rating_info.get('avg_score', 0)
                count = rating_info.get('review_count', 0)
                
                # Create star badge
                stars = '⭐' * int(round(avg))
                
                data.append({
                    'id': food.id,
                    'title': food.title,
                    'price': float(food.price) if food.price else 0,
                    'image': ChatbotQueryService._build_image_url(food.image, base_url),
                    'badge': f'{stars} {avg:.1f}',
                    'badge_type': 'top_rated',
                    'store_name': food.store.store_name if food.store else '',
                    'store_id': food.store.id if food.store else 0,
                    'average_rating': avg,
                    'review_count': count
                })
            
            return {
                'type': 'recommendation',
                'message': f'⭐ Dạ, đây là Top {len(data)} món được khách khen ngon nhất nè:',
                'data': data
            }
            
        except Exception as e:
            print(f"Error in get_top_rated: {e}")
            return ChatbotQueryService._error_response()
    
    @staticmethod
    def get_trending(days: int = 7, limit: int = 5, base_url: str = '') -> Dict[str, Any]:
        """
        Lấy danh sách món trending (được đặt nhiều trong tuần qua)
        Filter Order trong days ngày, join OrderDetail để đếm món
        
        Args:
            days: Số ngày để tính trending
            limit: Số lượng món trả về
            base_url: Base URL cho image
        
        Returns:
            Response dict chuẩn
        """
        try:
            # Calculate date range
            end_date = timezone.now()
            start_date = end_date - timedelta(days=days)
            
            # Get orders in date range (exclude cancelled)
            recent_order_ids = Order.objects.filter(
                created_date__gte=start_date,
                created_date__lte=end_date
            ).exclude(
                order_status='Đã huỷ'
            ).values_list('id', flat=True)
            
            if not recent_order_ids:
                # Fallback to 30 days
                start_date = end_date - timedelta(days=30)
                recent_order_ids = Order.objects.filter(
                    created_date__gte=start_date
                ).exclude(
                    order_status='Đã huỷ'
                ).values_list('id', flat=True)
            
            if not recent_order_ids:
                return ChatbotQueryService._empty_response(
                    "Dạ, gần đây chưa có đơn hàng nào. Bạn muốn xem menu không ạ? 📈"
                )
            
            # Get trending foods from order details
            trending = OrderDetail.objects.filter(
                order_id__in=recent_order_ids
            ).values('food').annotate(
                recent_orders=Count('order', distinct=True),
                recent_quantity=Sum('quantity')
            ).order_by('-recent_orders', '-recent_quantity')[:limit]
            
            food_ids = [item['food'] for item in trending]
            trending_map = {
                item['food']: {
                    'recent_orders': item['recent_orders'],
                    'recent_quantity': item['recent_quantity']
                }
                for item in trending
            }
            
            if not food_ids:
                return ChatbotQueryService._empty_response(
                    "Dạ, gần đây chưa có món nào nổi bật. Bạn thử món best seller không ạ? 📈"
                )
            
            foods = Food.objects.filter(id__in=food_ids).select_related('store', 'category')
            
            data = []
            for food in sorted(foods, key=lambda f: trending_map.get(f.id, {}).get('recent_orders', 0), reverse=True):
                trend_info = trending_map.get(food.id, {})
                recent_orders = trend_info.get('recent_orders', 0)
                
                data.append({
                    'id': food.id,
                    'title': food.title,
                    'price': float(food.price) if food.price else 0,
                    'image': ChatbotQueryService._build_image_url(food.image, base_url),
                    'badge': f'🔥 Hot tuần này',
                    'badge_type': 'trending',
                    'store_name': food.store.store_name if food.store else '',
                    'store_id': food.store.id if food.store else 0,
                    'recent_orders': recent_orders
                })
            
            return {
                'type': 'recommendation',
                'message': f'📈 Dạ, đây là {len(data)} món đang hot {days} ngày qua nè:',
                'data': data
            }
            
        except Exception as e:
            print(f"Error in get_trending: {e}")
            return ChatbotQueryService._error_response()
    
    @staticmethod
    def get_cheap_eats(limit: int = 5, max_price: float = None, base_url: str = '') -> Dict[str, Any]:
        """
        Lấy danh sách món giá rẻ
        Filter Food có availability='Còn hàng', ORDER BY price ASC
        
        Args:
            limit: Số lượng món trả về
            max_price: Giá tối đa (optional)
            base_url: Base URL cho image
        
        Returns:
            Response dict chuẩn
        """
        try:
            # Query available foods, order by price ascending
            query = Food.objects.filter(
                availability='Còn hàng'
            ).exclude(
                price__isnull=True
            ).exclude(
                price=0
            ).select_related('store', 'category')
            
            if max_price:
                query = query.filter(price__lte=max_price)
            
            cheap_foods = query.order_by('price')[:limit]
            
            if not cheap_foods:
                return ChatbotQueryService._empty_response(
                    "Dạ, hiện tại chưa có món nào phù hợp. Bạn muốn xem menu đầy đủ không ạ? 💰"
                )
            
            data = []
            for food in cheap_foods:
                data.append({
                    'id': food.id,
                    'title': food.title,
                    'price': float(food.price) if food.price else 0,
                    'image': ChatbotQueryService._build_image_url(food.image, base_url),
                    'badge': '💰 Giá tốt',
                    'badge_type': 'cheap_eats',
                    'store_name': food.store.store_name if food.store else '',
                    'store_id': food.store.id if food.store else 0
                })
            
            price_note = f" dưới {int(max_price):,}đ" if max_price else " giá tốt"
            
            return {
                'type': 'recommendation',
                'message': f'💰 Dạ, đây là {len(data)} món{price_note} cho bạn nè:',
                'data': data
            }
            
        except Exception as e:
            print(f"Error in get_cheap_eats: {e}")
            return ChatbotQueryService._error_response()
    
    # === HELPER METHODS ===
    
    @staticmethod
    def _build_image_url(image_path: str, base_url: str = '') -> str:
        """Build full URL cho image"""
        if not image_path:
            return ''
        
        # Already full URL
        if image_path.startswith(('http://', 'https://')):
            return image_path
        
        # Build full URL
        if base_url:
            base = base_url.rstrip('/')
            if image_path.startswith('/media'):
                return f"{base}{image_path}"
            elif image_path.startswith('/'):
                return f"{base}/media{image_path}"
            else:
                return f"{base}/media/{image_path}"
        
        return image_path
    
    @staticmethod
    def _empty_response(message: str) -> Dict[str, Any]:
        """Return empty response with custom message"""
        return {
            'type': 'recommendation',
            'message': message,
            'data': []
        }
    
    @staticmethod
    def _error_response() -> Dict[str, Any]:
        """Return error response"""
        return {
            'type': 'error',
            'message': 'Dạ, có lỗi xảy ra rồi ạ. Bạn thử lại sau nhé! 🙏',
            'data': []
        }
    
    @staticmethod
    def process_recommendation_intent(message: str, base_url: str = '') -> Optional[Dict[str, Any]]:
        """
        Main method để xử lý intent và trả về recommendation
        
        Args:
            message: Tin nhắn từ người dùng
            base_url: Base URL cho images
        
        Returns:
            Response dict nếu match intent, None nếu không
        """
        intent_result = ChatbotQueryService.classify_intent(message)
        
        if not intent_result['intent_type'] or intent_result['confidence'] < 0.3:
            return None
        
        intent_type = intent_result['intent_type']
        
        if intent_type == 'best_seller':
            return ChatbotQueryService.get_best_sellers(limit=5, base_url=base_url)
        elif intent_type == 'top_rated':
            return ChatbotQueryService.get_top_rated(limit=5, base_url=base_url)
        elif intent_type == 'trending':
            return ChatbotQueryService.get_trending(days=7, limit=5, base_url=base_url)
        elif intent_type == 'cheap_eats':
            # Try to extract price limit from message
            max_price = ChatbotQueryService._extract_price_limit(message)
            return ChatbotQueryService.get_cheap_eats(limit=5, max_price=max_price, base_url=base_url)
        
        return None
    
    @staticmethod
    def _extract_price_limit(message: str) -> Optional[float]:
        """Extract price limit from message like 'dưới 50k', 'under 30000'"""
        import re
        
        # Pattern: dưới/under + number + k/000/đ
        patterns = [
            r'dưới\s*(\d+)\s*k',
            r'duoi\s*(\d+)\s*k',
            r'under\s*(\d+)\s*k',
            r'<\s*(\d+)\s*k',
            r'dưới\s*(\d+)\s*000',
            r'dưới\s*(\d+)\s*đ',
        ]
        
        for pattern in patterns:
            match = re.search(pattern, message.lower())
            if match:
                num = int(match.group(1))
                # If ends with 'k', multiply by 1000
                if 'k' in pattern:
                    return num * 1000
                return num
        
        return None
