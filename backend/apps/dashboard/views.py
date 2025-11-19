from datetime import timedelta
from decimal import Decimal

from django.db.models import Avg, Count, DecimalField, F, OuterRef, Subquery, Sum, Value
from django.db.models.functions import Coalesce, TruncDay, TruncMonth
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.authentication.models import User
from apps.orders.models import Order, OrderDetail
from apps.ratings.models import RatingFood
from apps.stores.models import Store

CANCELLED_STATUSES = ['Đã hủy', 'Đã huỷ']
PROCESSING_STATUSES = ['Chờ xác nhận', 'Đã xác nhận', 'Đang chuẩn bị', 'Sẵn sàng', 'Đang giao']

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

    revenue_today = active_orders.filter(created_date__gte=start_of_day).aggregate(
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

    top_foods_queryset = (
        OrderDetail.objects.filter(order__store=store)
        .exclude(order__order_status__in=CANCELLED_STATUSES)
        .values('food_id', 'food__title')
        .annotate(quantity=Sum('quantity'))
        .order_by('-quantity')[:5]
    )
    top_foods = [
        {
            'food_id': entry['food_id'],
            'food_name': entry['food__title'],
            'quantity': entry['quantity'] or 0,
        }
        for entry in top_foods_queryset
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
        },
        'revenue_trend': {
            'labels': labels,
            'data': weekly_totals,
        },
        'top_foods': top_foods,
        'recent_orders': recent_orders,
        'generated_at': now.isoformat(),
    }

    return Response(response_data)
