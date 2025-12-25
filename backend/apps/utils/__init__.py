"""Utility helpers exposed under apps.utils."""
from __future__ import annotations

import pytz
from rest_framework import serializers

__all__ = ["VietnamDateTimeField"]


class VietnamDateTimeField(serializers.DateTimeField):
    """Serialize datetimes in Asia/Ho_Chi_Minh regardless of tz awareness."""

    def to_representation(self, value):
        if not value:
            return None

        vietnam_tz = pytz.timezone("Asia/Ho_Chi_Minh")

        if value.tzinfo is None or value.tzinfo.utcoffset(value) is None:
            utc_tz = pytz.UTC
            utc_time = utc_tz.localize(value)
            vietnam_time = utc_time.astimezone(vietnam_tz)
        else:
            vietnam_time = value.astimezone(vietnam_tz)

        return vietnam_time.strftime("%Y-%m-%d %H:%M:%S")
