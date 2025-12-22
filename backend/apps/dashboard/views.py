from datetime import timedelta
from decimal import Decimal

from django.db.models import Avg, Count, DecimalField, F, OuterRef, Subquery, Sum, Value, ExpressionWrapper
from django.db.models.functions import Coalesce, TruncDay, TruncMonth, ExtractHour
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.exceptions import PermissionDenied
from rest_framework.permissions import IsAuthenticated, BasePermission
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.authentication.models import User
from apps.menu.models import Food
from apps.orders.models import Order, OrderDetail
from apps.ratings.models import RatingFood
from apps.stores.models import Store

CANCELLED_STATUSES = ['Đã hủy', 'Đã huỷ']
DELIVERY_CANCELLED_STATUSES = ['Đã huỷ', 'Đã hủy']
PROCESSING_STATUSES = ['Chờ xác nhận', 'Đã xác nhận', 'Đang chuẩn bị', 'Sẵn sàng', 'Đang giao']


class IsAdminOrStoreManager(BasePermission):
    """Allow role_id=2 admins, or store managers (role_id=3) when requesting their store."""

    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return False

        if _is_admin(user):
            return True

        manager_store_id = _get_manager_store_id(user)
        if manager_store_id is None:
            return False

        store_param = request.query_params.get('store_id') or getattr(view, 'kwargs', {}).get('store_id')
        try:
            return store_param is not None and int(store_param) == int(manager_store_id)
        except (TypeError, ValueError):
            return False

def _is_admin(user):
    return user.is_authenticated and getattr(user, 'role_id', None) == 2


def _is_store_manager(user):
    return user.is_authenticated and getattr(user, 'role_id', None) == 3


def _get_manager_store_id(user):
    if not _is_store_manager(user):
        return None
    return Store.objects.filter(manager=user).values_list('id', flat=True).first()

def _effective_total_expression():
    decimal_field = DecimalField(max_digits=14, decimal_places=2)
    return Coalesce(
        F('total_after_discount'),
        F('total_before_discount'),
        F('total_money'),
        Value(0, output_field=decimal_field),
        output_field=decimal_field,
    )


def _get_orders_queryset_for_user(request):
    """Return an orders queryset filtered by optional store_id and user permissions."""
    store_param = request.query_params.get('store_id')
    store_id = None

    if store_param is not None and store_param != '':
        try:
            store_id = int(store_param)
        except (TypeError, ValueError):
            raise PermissionDenied('store_id must be an integer')

    qs = Order.objects.all()
    if store_id is not None:
        qs = qs.filter(store_id=store_id)

    if _is_admin(request.user):
        return qs, store_id

    manager_store_id = _get_manager_store_id(request.user)
    if manager_store_id is None:
        raise PermissionDenied('Admin access required')

    if store_id is not None and store_id != manager_store_id:
        raise PermissionDenied('You can only view your own store data')

    return qs.filter(store_id=manager_store_id), manager_store_id


def _build_year_series(base_qs, year):
    monthly = {month: Decimal('0') for month in range(1, 13)}
    aggregated = (
        base_qs.filter(created_date__year=year)
        .annotate(month=TruncMonth('created_date'))
        .values('month')
        .annotate(total=Sum(_effective_total_expression()))
        .order_by('month')
    )
    for entry in aggregated:
        month = entry['month'].month if entry['month'] else None
        if month is not None:
            monthly[month] = entry['total'] or Decimal('0')
    return [float(monthly[idx]) for idx in range(1, 13)]


def _month_start(reference_dt, offset):
    """Return the first day of the month offset by `offset` months from reference_dt."""
    month_index = reference_dt.month - 1 + offset
    year = reference_dt.year + month_index // 12
    month = month_index % 12 + 1
    return reference_dt.replace(year=year, month=month, day=1, hour=0, minute=0, second=0, microsecond=0)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def admin_dashboard_metrics(request):
    if not _is_admin(request.user):
        return Response({'error': 'Admin access required'}, status=status.HTTP_403_FORBIDDEN)

    now = timezone.localtime()
    start_of_day = now.replace(hour=0, minute=0, second=0, microsecond=0)
    thirty_days_ago = now - timedelta(days=30)

    orders_qs = Order.objects.exclude(order_status__in=CANCELLED_STATUSES)

    overall_revenue = orders_qs.aggregate(
        total=Coalesce(
            Sum(_effective_total_expression()),
            Value(0, output_field=DecimalField(max_digits=14, decimal_places=2)),
        )
    )['total'] or Decimal('0')
    stats = {
        'total_customers': User.objects.filter(role_id=1).count(),
        'orders_today': orders_qs.filter(created_date__gte=start_of_day).count(),
        'system_revenue': overall_revenue,
        'active_stores': Store.objects.filter(manager__isnull=False).count(),
    }

    current_year = now.year
    previous_year = current_year - 1
    revenue_trend = {
        'labels': ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
        'current_year': _build_year_series(orders_qs, current_year),
        'previous_year': _build_year_series(orders_qs, previous_year),
    }

    effective_total = _effective_total_expression()
    rating_subquery = Subquery(
        RatingFood.objects.filter(food__store_id=OuterRef('store_id'))
        .values('food__store_id')
        .annotate(avg=Avg('rating'))
        .values('avg')[:1],
        output_field=DecimalField(max_digits=3, decimal_places=2),
    )

    top_stores_queryset = (
        orders_qs.filter(store_id__isnull=False, created_date__gte=thirty_days_ago)
        .values('store_id', 'store__store_name')
        .annotate(
            orders=Count('id'),
            revenue=Coalesce(
                Sum(effective_total),
                Value(0, output_field=DecimalField(max_digits=14, decimal_places=2)),
            ),
            avg_rating=rating_subquery,
        )
        .order_by('-revenue')[:5]
    )

    top_stores = [
        {
            'store_id': entry['store_id'],
            'store_name': entry['store__store_name'],
            'orders': entry['orders'],
            'revenue': entry['revenue'],
            'avg_rating': float(entry['avg_rating']) if entry['avg_rating'] is not None else None,
        }
        for entry in top_stores_queryset
    ]

    response_data = {
        'stats': stats,
        'revenue_trend': revenue_trend,
        'top_stores': top_stores,
        'generated_at': now.isoformat(),
    }

    return Response(response_data)


def _build_weekly_series(base_qs, start_of_day):
    seven_days_ago = start_of_day - timedelta(days=6)
    aggregated = (
        base_qs.filter(created_date__gte=seven_days_ago)
        .annotate(day=TruncDay('created_date'))
        .values('day')
        .annotate(total=Sum(_effective_total_expression()))
    )
    totals = {entry['day'].date(): entry['total'] or Decimal('0') for entry in aggregated if entry['day']}
    labels = []
    data = []
    for offset in range(6, -1, -1):
        day = (start_of_day - timedelta(days=offset)).date()
        labels.append(day.strftime('%d/%m'))
        data.append(float(totals.get(day, Decimal('0'))))
    return labels, data


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def store_dashboard_metrics(request, store_id):
    store = get_object_or_404(Store, id=store_id)

    if not _is_admin(request.user):
        manager_store_id = _get_manager_store_id(request.user)
        if manager_store_id != store_id:
            return Response({'error': 'Access denied'}, status=status.HTTP_403_FORBIDDEN)

    now = timezone.localtime()
    start_of_day = now.replace(hour=0, minute=0, second=0, microsecond=0)
    thirty_days_ago = now - timedelta(days=30)

    orders_qs = Order.objects.filter(store=store)
    active_orders = orders_qs.exclude(order_status__in=CANCELLED_STATUSES)
    delivered_orders = orders_qs.filter(delivery_status='Đã giao')

    revenue_today = active_orders.filter(created_date__gte=start_of_day).aggregate(
        total=Coalesce(
            Sum(_effective_total_expression()),
            Value(0, output_field=DecimalField(max_digits=14, decimal_places=2)),
        )
    )['total'] or Decimal('0')

    total_foods = Food.objects.filter(store=store).count()
    available_foods = Food.objects.filter(store=store, availability='Còn hàng').count()

    yesterday_start = start_of_day - timedelta(days=1)
    yesterday_end = start_of_day - timedelta(microseconds=1)
    revenue_yesterday = active_orders.filter(created_date__range=(yesterday_start, yesterday_end)).aggregate(
        total=Coalesce(
            Sum(_effective_total_expression()),
            Value(0, output_field=DecimalField(max_digits=14, decimal_places=2)),
        )
    )['total'] or Decimal('0')

    orders_today = active_orders.filter(created_date__gte=start_of_day).count()
    processing_orders = active_orders.filter(order_status__in=PROCESSING_STATUSES).count()
    delivered_orders = active_orders.filter(order_status='Đã giao').count()
    customers_30_days = active_orders.filter(created_date__gte=thirty_days_ago).values('user_id').distinct().count()

    store_ratings = RatingFood.objects.filter(food__store=store)
    rating_stats = store_ratings.aggregate(
        average=Avg('rating'),
        total=Count('id')
    )
    average_rating = round(rating_stats['average'] or 0, 1) if rating_stats.get('average') else 0
    total_ratings = rating_stats.get('total') or 0

    labels, weekly_totals = _build_weekly_series(active_orders, start_of_day)

    # Hourly revenue today vs yesterday
    effective_total = _effective_total_expression()
    def _hourly_series(qs):
        aggregated = (
            qs
            .annotate(hour=ExtractHour('created_date'))
            .values('hour')
            .annotate(total=Coalesce(Sum(effective_total), Value(0, output_field=DecimalField(max_digits=14, decimal_places=2))))
        )
        mapping = {entry['hour']: float(entry['total'] or 0) for entry in aggregated if entry['hour'] is not None}
        return [mapping.get(h, 0.0) for h in range(24)]

    hourly_today = _hourly_series(active_orders.filter(created_date__gte=start_of_day))
    hourly_yesterday = _hourly_series(active_orders.filter(created_date__range=(yesterday_start, yesterday_end)))

    details_qs = OrderDetail.objects.filter(order__in=active_orders)
    price_expr = ExpressionWrapper(
        (F('food_price') + Coalesce(F('food_option_price'), Value(0))) * F('quantity'),
        output_field=DecimalField(max_digits=14, decimal_places=2),
    )

    top_foods_queryset = (
        details_qs
        .annotate(subtotal=price_expr)
        .values('food_id', 'food__title')
        .annotate(
            quantity=Sum('quantity'),
            revenue=Coalesce(Sum('subtotal'), Value(0, output_field=DecimalField(max_digits=14, decimal_places=2))),
        )
        .order_by('-quantity')[:5]
    )
    top_foods = [
        {
            'food_id': entry['food_id'],
            'food_name': entry['food__title'],
            'quantity': entry['quantity'] or 0,
            'revenue': float(entry['revenue'] or 0),
        }
        for entry in top_foods_queryset
    ]

    size_stack_queryset = (
        details_qs
        .values('food__title', 'food_option__size_name')
        .annotate(quantity=Sum('quantity'))
        .order_by('-quantity')
    )
    size_stack = [
        {
            'food_name': entry['food__title'],
            'size': entry['food_option__size_name'] or 'Mặc định',
            'quantity': entry['quantity'] or 0,
        }
        for entry in size_stack_queryset
    ]

    size_revenue_queryset = (
        details_qs
        .annotate(subtotal=price_expr)
        .values('food_option__size_name')
        .annotate(revenue=Coalesce(Sum('subtotal'), Value(0, output_field=DecimalField(max_digits=14, decimal_places=2))))
        .order_by('-revenue')
    )
    size_revenue = [
        {
            'size': entry['food_option__size_name'] or 'Mặc định',
            'revenue': float(entry['revenue'] or 0),
        }
        for entry in size_revenue_queryset
    ]

    recent_orders = []
    for order in active_orders.order_by('-created_date')[:5]:
        details = list(order.details.all()[:3])
        items_summary = ', '.join(f"{detail.food.title} x{detail.quantity}" for detail in details)
        if order.details.count() > len(details):
            items_summary += '...'
        recent_orders.append({
            'order_id': order.id,
            'code': f"ORD-{order.id:05d}",
            'customer': getattr(order.user, 'fullname', order.user.username if order.user else ''),
            'status': order.order_status,
            'total': float(order.total_after_discount or order.total_before_discount or order.total_money or Decimal('0')),
            'created_at': order.created_date.isoformat(),
            'items': items_summary,
        })

    response_data = {
        'store': {
            'id': store.id,
            'name': store.store_name,
            'address': store.address,
            'image': store.image,
            'average_rating': average_rating,
            'total_ratings': total_ratings,
            'is_open': True,  # Placeholder until store opening hours are stored
        },
        'stats': {
            'revenue_today': revenue_today,
            'orders_today': orders_today,
            'processing_orders': processing_orders,
            'delivered_orders': delivered_orders,
            'customers_30_days': customers_30_days,
            'average_rating': average_rating,
            'total_foods': total_foods,
            'available_foods': available_foods,
            'total_ratings': total_ratings,
        },
        'revenue_trend': {
            'labels': labels,
            'data': weekly_totals,
        },
        'top_foods': top_foods,
        'recent_orders': recent_orders,
        'generated_at': now.isoformat(),
        'hourly_revenue': {
            'series': [{'hour': h, 'today': hourly_today[h], 'yesterday': hourly_yesterday[h]} for h in range(24)],
            'today_total': float(revenue_today),
            'yesterday_total': float(revenue_yesterday),
        },
        'top_foods_pie': [
            {
                'name': entry['food_name'],
                'value': entry['quantity'],
                'revenue': entry['revenue'],
            }
            for entry in top_foods
        ],
        'size_stack': size_stack,
        'size_revenue': size_revenue,
        'loyal_customers': [
            {
                'user_id': entry['user_id'],
                'fullname': entry['user__fullname'] or '',
                'orders': entry['orders'] or 0,
                'total_spent': float(entry['total_spent'] or 0),
            }
            for entry in (
                active_orders
                .values('user_id', 'user__fullname')
                .annotate(
                    orders=Count('id'),
                    total_spent=Coalesce(Sum(_effective_total_expression()), Value(0, output_field=DecimalField(max_digits=14, decimal_places=2))),
                )
                .order_by('-orders')[:5]
            )
        ],
        'recent_reviews': [
            {
                'user': rating.user.fullname if hasattr(rating.user, 'fullname') else rating.user.username,
                'rating': rating.rating,
                'content': rating.content,
                'food': rating.food.title,
                'id': rating.id,
            }
            for rating in RatingFood.objects.filter(food__store=store).order_by('-id')[:5]
        ],
        'rating_radar': [
            {'score': score, 'count': RatingFood.objects.filter(food__store=store, rating=score).count()}
            for score in range(1, 6)
        ],
        'availability': {
            'in_stock': Food.objects.filter(store=store, availability='Còn hàng').count(),
            'total': Food.objects.filter(store=store).count(),
        },
    }

    return Response(response_data)


class DashboardOverviewAPIView(APIView):
    permission_classes = [IsAdminOrStoreManager]

    def get(self, request):
        orders_qs, store_id = _get_orders_queryset_for_user(request)
        orders_qs = orders_qs.exclude(delivery_status__in=DELIVERY_CANCELLED_STATUSES)
        effective_total = _effective_total_expression()

        revenue = orders_qs.aggregate(
            total=Coalesce(
                Sum(effective_total),
                Value(0, output_field=DecimalField(max_digits=14, decimal_places=2)),
            )
        )['total'] or Decimal('0')

        total_orders = orders_qs.count()
        if store_id is None:
            total_customers = User.objects.filter(role_id=1).count()
            total_stores = Store.objects.count()
            total_foods = Food.objects.count()
        else:
            total_customers = orders_qs.values('user_id').distinct().count()
            total_stores = 1 if Store.objects.filter(id=store_id).exists() else 0
            total_foods = Food.objects.filter(store_id=store_id).count()

        return Response({
            'total_revenue': float(revenue),
            'total_orders': total_orders,
            'total_customers': total_customers,
            'total_stores': total_stores,
            'total_foods': total_foods,
            'store_id': store_id,
        })


class RevenueChartAPIView(APIView):
    permission_classes = [IsAdminOrStoreManager]

    def get(self, request):
        orders_qs, store_id = _get_orders_queryset_for_user(request)
        now = timezone.localtime()
        start_window = _month_start(now, -5)
        effective_total = _effective_total_expression()

        aggregated = (
            orders_qs.exclude(delivery_status__in=DELIVERY_CANCELLED_STATUSES)
            .filter(created_date__gte=start_window)
            .annotate(month=TruncMonth('created_date'))
            .values('month')
            .annotate(
                revenue=Coalesce(
                    Sum(effective_total),
                    Value(0, output_field=DecimalField(max_digits=14, decimal_places=2)),
                ),
                orders=Count('id'),
            )
        )
        aggregated_map = {entry['month'].date(): entry for entry in aggregated if entry['month']}

        points = []
        for offset in range(-5, 1):
            month_start = _month_start(now, offset)
            entry = aggregated_map.get(month_start.date(), {})
            label = month_start.strftime('%m/%Y')
            points.append({
                'label': label,
                'revenue': float(entry.get('revenue') or Decimal('0')),
                'orders': entry.get('orders', 0) or 0,
            })

        return Response({'store_id': store_id, 'range_months': 6, 'data': points})


class TopStoresAPIView(APIView):
    permission_classes = [IsAdminOrStoreManager]

    def get(self, request):
        orders_qs, store_id = _get_orders_queryset_for_user(request)
        effective_total = _effective_total_expression()
        base_qs = orders_qs.exclude(delivery_status__in=DELIVERY_CANCELLED_STATUSES)

        aggregated = (
            base_qs
            .values('store_id', 'store__store_name')
            .annotate(
                revenue=Coalesce(
                    Sum(effective_total),
                    Value(0, output_field=DecimalField(max_digits=14, decimal_places=2)),
                ),
                orders=Count('id'),
            )
            .order_by('-revenue')
        )

        if store_id is None:
            aggregated = aggregated[:5]

        top_stores = [
            {
                'store_id': entry['store_id'],
                'store_name': entry['store__store_name'],
                'revenue': float(entry['revenue'] or Decimal('0')),
                'orders': entry['orders'] or 0,
            }
            for entry in aggregated
        ]

        return Response({'store_id': store_id, 'results': top_stores})


class OrderStatusAPIView(APIView):
    permission_classes = [IsAdminOrStoreManager]

    def get(self, request):
        orders_qs, store_id = _get_orders_queryset_for_user(request)

        aggregated = orders_qs.values('delivery_status').annotate(count=Count('id'))
        total_orders = orders_qs.count()
        denominator = total_orders or 1  # avoid division by zero

        status_labels = [status for status, _ in Order.DELIVERY_STATUS_CHOICES]
        counts = {label: 0 for label in status_labels}
        for entry in aggregated:
            status = entry['delivery_status']
            if status in counts:
                counts[status] = entry['count']

        results = [
            {
                'status': label,
                'count': counts[label],
                'percent': round(counts[label] * 100 / denominator, 2) if denominator else 0,
            }
            for label in status_labels
        ]

        return Response({'store_id': store_id, 'total_orders': total_orders, 'statuses': results})


class FunnelConversionAPIView(APIView):
    permission_classes = [IsAdminOrStoreManager]

    def get(self, request):
        orders_qs, store_id = _get_orders_queryset_for_user(request)
        total_orders = orders_qs.count()

        active_orders = orders_qs.exclude(delivery_status__in=DELIVERY_CANCELLED_STATUSES)
        confirmed_orders = active_orders.count()
        delivered_orders = orders_qs.filter(delivery_status='Đã giao').count()

        funnel_steps = [
            {'step': 'Cart', 'value': total_orders},
            {'step': 'Đặt hàng', 'value': total_orders},
            {'step': 'Đã xác nhận', 'value': confirmed_orders},
            {'step': 'Đã giao', 'value': delivered_orders},
        ]

        starting_value = funnel_steps[0]['value'] or 1
        for entry in funnel_steps:
            entry['conversion'] = round(entry['value'] * 100 / starting_value, 2) if starting_value else 0

        return Response({'store_id': store_id, 'steps': funnel_steps})


class OrderHeatmapAPIView(APIView):
    permission_classes = [IsAdminOrStoreManager]

    def get(self, request):
        orders_qs, store_id = _get_orders_queryset_for_user(request)
        base_qs = orders_qs.exclude(delivery_status__in=DELIVERY_CANCELLED_STATUSES)

        aggregated = (
            base_qs
            .annotate(hour=ExtractHour('created_date'))
            .values('hour')
            .annotate(count=Count('id'))
        )

        hour_counts = {h: 0 for h in range(24)}
        for entry in aggregated:
            hour = entry.get('hour') or 0
            if 0 <= hour <= 23:
                hour_counts[hour] = entry.get('count') or 0

        data = [{'hour': h, 'count': hour_counts[h]} for h in range(24)]

        return Response({'store_id': store_id, 'data': data})


class StoresTableAPIView(APIView):
    permission_classes = [IsAdminOrStoreManager]

    def get(self, request):
        orders_qs, store_id = _get_orders_queryset_for_user(request)
        effective_total = _effective_total_expression()
        base_qs = orders_qs.exclude(delivery_status__in=DELIVERY_CANCELLED_STATUSES)

        aggregated = (
            base_qs
            .values('store_id', 'store__store_name', 'store__address', 'store__image')
            .annotate(
                total_orders=Count('id'),
                revenue=Coalesce(
                    Sum(effective_total),
                    Value(0, output_field=DecimalField(max_digits=14, decimal_places=2)),
                ),
            )
            .order_by('-revenue')
        )

        stores = [
            {
                'store_id': entry['store_id'],
                'store_name': entry['store__store_name'],
                'address': entry['store__address'],
                'image': entry['store__image'],
                'total_orders': entry['total_orders'] or 0,
                'revenue': float(entry['revenue'] or Decimal('0')),
            }
            for entry in aggregated
            if entry['store_id'] is not None
        ]

        if store_id and not stores:
            store = get_object_or_404(Store, id=store_id)
            stores.append({
                'store_id': store.id,
                'store_name': store.store_name,
                'address': store.address,
                'image': store.image,
                'total_orders': 0,
                'revenue': 0,
            })

        return Response({'store_id': store_id, 'results': stores})
