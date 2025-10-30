"""
Utility functions and custom fields for the FastFood API
"""
from rest_framework import serializers
from django.utils import timezone
import pytz


class VietnamDateTimeField(serializers.DateTimeField):
    """
    Custom DateTimeField that automatically converts datetime to Vietnam timezone
    and formats it as a readable string without timezone suffix
    
    Handles both:
    - Timezone-aware datetime (properly converts to Vietnam time)
    - Naive datetime (assumes it's UTC and converts to Vietnam time)
    """
    def to_representation(self, value):
        if not value:
            return None
        
        vietnam_tz = pytz.timezone('Asia/Ho_Chi_Minh')
        
        # Check if datetime is naive (no timezone info)
        if value.tzinfo is None or value.tzinfo.utcoffset(value) is None:
            # Naive datetime - assume it's UTC (Django default with USE_TZ=True)
            # Old data stored before proper timezone handling
            utc_tz = pytz.UTC
            utc_time = utc_tz.localize(value)  # Add UTC timezone info
            vietnam_time = utc_time.astimezone(vietnam_tz)  # Convert to VN time
        else:
            # Timezone-aware datetime - convert to Vietnam timezone
            vietnam_time = value.astimezone(vietnam_tz)
        
        # Format as string without timezone info
        return vietnam_time.strftime('%Y-%m-%d %H:%M:%S')
