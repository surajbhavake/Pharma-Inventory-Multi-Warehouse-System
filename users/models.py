"""
users/models.py - Custom User model with Role-Based Access Control
"""

from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
from django.db import models
from django.utils import timezone
import uuid


class UserManager(BaseUserManager):
    """Custom user manager for email-based authentication"""
    
    def create_user(self, email, username, password=None, **extra_fields):
        """Create and save a regular user"""
        if not email:
            raise ValueError('Users must have an email address')
        if not username:
            raise ValueError('Users must have a username')
        
        email = self.normalize_email(email)
        user = self.model(email=email, username=username, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user
    
    def create_superuser(self, email, username, password=None, **extra_fields):
        """Create and save a superuser"""
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        extra_fields.setdefault('role', 'admin')
        
        if extra_fields.get('is_staff') is not True:
            raise ValueError('Superuser must have is_staff=True')
        if extra_fields.get('is_superuser') is not True:
            raise ValueError('Superuser must have is_superuser=True')
        
        return self.create_user(email, username, password, **extra_fields)


class User(AbstractBaseUser, PermissionsMixin):
    """
    Custom User model with UUID primary key and role-based access control.
    
    Roles:
    - admin: Full system access, can approve recalls
    - warehouse_manager: Can manage stock, submit recalls
    - staff: Can view and perform basic operations
    - auditor: Read-only access to all data
    """
    
    ROLE_CHOICES = [
        ('admin', 'Administrator'),
        ('warehouse_manager', 'Warehouse Manager'),
        ('staff', 'Staff'),
        ('auditor', 'Auditor'),
    ]
    
    # Primary key - UUID for better security
    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
        db_index=True
    )
    
    # Authentication fields
    email = models.EmailField(
        verbose_name='email address',
        max_length=255,
        unique=True,
        db_index=True
    )
    username = models.CharField(
        max_length=150,
        unique=True,
        db_index=True
    )
    
    # Profile fields
    first_name = models.CharField(max_length=150, blank=True)
    last_name = models.CharField(max_length=150, blank=True)
    
    # Role-based access control
    role = models.CharField(
        max_length=20,
        choices=ROLE_CHOICES,
        default='staff',
        db_index=True
    )
    
    # Warehouse assignment (nullable - admin/auditor may not be assigned)
    assigned_warehouse = models.ForeignKey(
        'inventory.Warehouse',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='assigned_users',
        help_text='Warehouse this user is assigned to (optional)'
    )
    
    # Status fields
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)
    
    # Timestamps
    date_joined = models.DateTimeField(default=timezone.now)
    last_login = models.DateTimeField(null=True, blank=True)
    
    # Manager
    objects = UserManager()
    
    # Authentication settings
    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['username']
    
    class Meta:
        db_table = 'users'
        verbose_name = 'User'
        verbose_name_plural = 'Users'
        ordering = ['-date_joined']
        indexes = [
            models.Index(fields=['email']),
            models.Index(fields=['username']),
            models.Index(fields=['role']),
            models.Index(fields=['is_active']),
        ]
    
    def __str__(self):
        return f"{self.email} ({self.get_role_display()})"
    
    def get_full_name(self):
        """Return the first_name plus the last_name, with a space in between."""
        full_name = f"{self.first_name} {self.last_name}"
        return full_name.strip() or self.username
    
    def get_short_name(self):
        """Return the short name for the user."""
        return self.first_name or self.username
    
    # Permission helper methods
    def is_admin(self):
        """Check if user has admin role"""
        return self.role == 'admin'
    
    def is_manager(self):
        """Check if user has warehouse manager role"""
        return self.role == 'warehouse_manager'
    
    def is_auditor(self):
        """Check if user has auditor role"""
        return self.role == 'auditor'
    
    def can_approve_recalls(self):
        """Only admins can approve recall requests"""
        return self.role == 'admin'
    
    def can_manage_stock(self):
        """Admins and warehouse managers can manage stock"""
        return self.role in ['admin', 'warehouse_manager']
    
    def has_warehouse_access(self, warehouse):
        """Check if user has access to a specific warehouse"""
        if self.role in ['admin', 'auditor']:
            return True  # Admin and auditor have access to all warehouses
        return self.assigned_warehouse == warehouse