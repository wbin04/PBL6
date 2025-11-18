from django.db import models
from django.contrib.auth.models import AbstractBaseUser, PermissionsMixin
from django.contrib.auth.models import UserManager
from django.utils import timezone


def get_vietnam_time():
    """Trả về thời gian hiện tại theo múi giờ Việt Nam"""
    now = timezone.now()
    # Chuyển về múi giờ Việt Nam (UTC+7)
    vietnam_tz = timezone.get_fixed_timezone(7 * 60)  # 7 giờ * 60 phút
    return now.astimezone(vietnam_tz)


class Role(models.Model):
    role_name = models.CharField(max_length=20)
    
    class Meta:
        db_table = 'roles'
    
    def __str__(self):
        return self.role_name


class User(AbstractBaseUser, PermissionsMixin):
    # Fields that exist in your database
    fullname = models.CharField(max_length=50, blank=True)
    first_name = models.CharField(max_length=150, default='', blank=True, db_column='first_name')
    last_name = models.CharField(max_length=150, default='', blank=True, db_column='last_name')
    username = models.CharField(max_length=30, unique=True)
    password = models.CharField(max_length=30)
    email = models.EmailField(max_length=50, unique=True)
    address = models.CharField(max_length=100, blank=True)
    phone_number = models.CharField(max_length=10, blank=True)
    latitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    longitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    created_date = models.DateTimeField(default=get_vietnam_time)
    role = models.ForeignKey(Role, on_delete=models.SET_NULL, null=True, blank=True, db_column='role_id')
    
    # Registration status fields
    is_shipper_registered = models.BooleanField(null=True, blank=True, default=None)
    is_store_registered = models.BooleanField(null=True, blank=True, default=None)
    
    # Required fields for Django authentication
    last_login = models.DateTimeField(null=True, blank=True)
    is_superuser = models.BooleanField(default=False)
    is_staff = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)
    date_joined = models.DateTimeField(default=get_vietnam_time)
    
    objects = UserManager()
    
    class Meta:
        db_table = 'users'
        managed = True  # Enable migrations to add new fields
    
    # Use email as the unique identifier for authentication
    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['username']
    
    def __str__(self):
        return f"{self.fullname} ({self.username})"

    def set_password(self, raw_password):
        """
        Store raw password directly (max 30 chars) without hashing.
        """
        self.password = raw_password

    def check_password(self, raw_password):
        """
        Verify the raw password matches the stored plaintext password.
        """
        return self.password == raw_password
