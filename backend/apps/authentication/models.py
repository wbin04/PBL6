from django.db import models
from django.contrib.auth.models import AbstractBaseUser, PermissionsMixin
from django.contrib.auth.base_user import BaseUserManager
from django.utils.translation import gettext_lazy as _


class Role(models.Model):
    role_name = models.CharField(max_length=20)

    class Meta:
        db_table = 'roles'

    def __str__(self):
        return self.role_name


class CustomUserManager(BaseUserManager):
    use_in_migrations = True

    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError("Email is required")
        email = self.normalize_email(email)

        # đảm bảo luôn có username hợp lệ, cắt tối đa 150 ký tự
        username = extra_fields.get('username') or email.split('@')[0][:150]
        extra_fields['username'] = username

        user = self.model(email=email, **extra_fields)
        if password:
            user.set_password(password)  # hash an toàn
        else:
            user.set_unusable_password()
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        extra_fields.setdefault('is_active', True)

        if extra_fields.get('is_staff') is not True:
            raise ValueError('Superuser must have is_staff=True.')
        if extra_fields.get('is_superuser') is not True:
            raise ValueError('Superuser must have is_superuser=True.')

        return self.create_user(email, password, **extra_fields)


class User(AbstractBaseUser, PermissionsMixin):
    fullname = models.CharField(max_length=50, blank=True)
    first_name = models.CharField(max_length=150, default='', blank=True, db_column='first_name')
    last_name  = models.CharField(max_length=150, default='', blank=True, db_column='last_name')

    # tăng lên 150 để an toàn như Django mặc định
    username   = models.CharField(max_length=150, unique=True)

    # AbstractBaseUser đã có password=CharField(128), nhưng khai báo lại cho rõ ràng
    password   = models.CharField(_('password'), max_length=128)

    # email nên là 254 theo chuẩn RFC
    email      = models.EmailField(max_length=254, unique=True)

    address      = models.CharField(max_length=100, blank=True)
    phone_number = models.CharField(max_length=10, blank=True)

    created_date = models.DateTimeField(auto_now_add=True)
    role = models.ForeignKey(Role, on_delete=models.SET_NULL, null=True, blank=True, db_column='role_id')

    # flags
    is_shipper_registered = models.BooleanField(null=True, blank=True, default=None)
    is_store_registered   = models.BooleanField(null=True, blank=True, default=None)

    # auth required
    last_login   = models.DateTimeField(null=True, blank=True)
    is_superuser = models.BooleanField(default=False)
    is_staff     = models.BooleanField(default=False)
    is_active    = models.BooleanField(default=True)
    date_joined  = models.DateTimeField(auto_now_add=True)

    objects = CustomUserManager()

    class Meta:
        db_table = 'users'
        managed = True

    USERNAME_FIELD  = 'email'
    REQUIRED_FIELDS = ['username']  # createsuperuser sẽ hỏi thêm

    def __str__(self):
        return f"{self.fullname} ({self.username})"
