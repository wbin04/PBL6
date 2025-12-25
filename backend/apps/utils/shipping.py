from __future__ import annotations

import logging
from dataclasses import dataclass
from decimal import Decimal, ROUND_HALF_UP
from math import radians, sin, cos, sqrt, atan2
from typing import Optional, Any

import requests
from django.conf import settings

EARTH_RADIUS_KM = 6371.0
GOOGLE_DIRECTIONS_URL = 'https://maps.googleapis.com/maps/api/directions/json'


logger = logging.getLogger(__name__)


@dataclass
class RouteInfo:
    distance_km: Optional[float]
    polyline: Optional[str] = None


def normalize_coordinate(value: Any) -> Optional[float]:
    """Safely convert database or request values to float coordinates."""
    if value is None or value == '':
        return None
    try:
        if isinstance(value, Decimal):
            return float(value)
        return float(value)
    except (TypeError, ValueError):
        return None


def haversine_distance_km(lat1: Any, lon1: Any, lat2: Any, lon2: Any) -> Optional[float]:
    """Calculate haversine distance between two lat/lon pairs (in kilometers)."""
    start_lat = normalize_coordinate(lat1)
    start_lon = normalize_coordinate(lon1)
    end_lat = normalize_coordinate(lat2)
    end_lon = normalize_coordinate(lon2)

    if None in (start_lat, start_lon, end_lat, end_lon):
        return None

    d_lat = radians(end_lat - start_lat)
    d_lon = radians(end_lon - start_lon)

    a = sin(d_lat / 2) ** 2 + cos(radians(start_lat)) * cos(radians(end_lat)) * sin(d_lon / 2) ** 2
    c = 2 * atan2(sqrt(a), sqrt(1 - a))

    return EARTH_RADIUS_KM * c


def driving_distance_km(lat1: Any, lon1: Any, lat2: Any, lon2: Any) -> RouteInfo:
    """Fetch driving distance via Google Directions API with haversine fallback."""
    start_lat = normalize_coordinate(lat1)
    start_lon = normalize_coordinate(lon1)
    end_lat = normalize_coordinate(lat2)
    end_lon = normalize_coordinate(lon2)

    if None in (start_lat, start_lon, end_lat, end_lon):
        return RouteInfo(distance_km=None)

    fallback_distance = haversine_distance_km(start_lat, start_lon, end_lat, end_lon)
    api_key = getattr(settings, 'GOOGLE_MAPS_API_KEY', '')

    if not api_key:
        logger.debug('GOOGLE_MAPS_API_KEY not configured; using haversine distance')
        return RouteInfo(distance_km=fallback_distance)

    params = {
        'origin': f'{start_lat},{start_lon}',
        'destination': f'{end_lat},{end_lon}',
        'mode': 'driving',
        'units': 'metric',
        'key': api_key,
    }

    try:
        response = requests.get(GOOGLE_DIRECTIONS_URL, params=params, timeout=10)
        response.raise_for_status()
        payload = response.json()
    except requests.RequestException as exc:
        logger.warning('Failed to fetch driving distance: %s', exc)
        return RouteInfo(distance_km=fallback_distance)

    status = payload.get('status')
    if status == 'OK':
        try:
            route = payload['routes'][0]
            legs = route['legs']
            distance_meters = legs[0]['distance']['value']
            polyline = route.get('overview_polyline', {}).get('points')
            return RouteInfo(distance_km=float(distance_meters) / 1000.0, polyline=polyline)
        except (KeyError, IndexError, TypeError, ValueError) as exc:
            logger.warning('Invalid directions payload: %s', exc)
            return RouteInfo(distance_km=fallback_distance)

    if status == 'ZERO_RESULTS':
        logger.info('Google Directions returned ZERO_RESULTS for origin %s and destination %s', params['origin'], params['destination'])
        return RouteInfo(distance_km=fallback_distance)

    logger.warning('Google Directions error (%s): %s', status, payload.get('error_message'))
    return RouteInfo(distance_km=fallback_distance)


def _to_decimal(value: Any) -> Decimal:
    if isinstance(value, Decimal):
        return value
    return Decimal(str(value))


def calculate_shipping_fee(distance_km: Optional[float]) -> Decimal:
    """Return shipping fee using configured base + per-km pricing."""
    base_fee = _to_decimal(getattr(settings, 'SHIPPING_BASE_FEE', Decimal('15000')))
    per_km = _to_decimal(getattr(settings, 'SHIPPING_FEE_PER_KM', Decimal('4000')))

    if distance_km is None:
        return base_fee.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)

    total = base_fee + (per_km * Decimal(str(distance_km)))
    return total.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
