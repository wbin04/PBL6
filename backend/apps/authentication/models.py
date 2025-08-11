from django.db import models
from django.contrib.auth.models import AbstractBaseUser, PermissionsMixin
from django.contrib.auth.models import UserManager


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
    created_date = models.DateTimeField(auto_now_add=True)
    role = models.ForeignKey(Role, on_delete=models.SET_NULL, null=True, blank=True, db_column='role_id')
    
    # Required fields for Django authentication
    last_login = models.DateTimeField(null=True, blank=True)
    is_superuser = models.BooleanField(default=False)
    is_staff = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)
    date_joined = models.DateTimeField(auto_now_add=True)
    
    objects = UserManager()
    
    class Meta:
        db_table = 'users'
        managed = False  # Use existing users table without migrations
    
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
