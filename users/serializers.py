"""
users/serializers.py - DRF Serializers for User Registration and Authentication
"""

from rest_framework import serializers
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from .models import User


class UserRegistrationSerializer(serializers.ModelSerializer):
    """
    Serializer for user registration.
    
    Features:
    - Email uniqueness validation
    - Password strength validation
    - Password confirmation matching
    - Automatic bcrypt hashing
    - Role assignment with validation
    """
    
    password = serializers.CharField(
        write_only=True,
        required=True,
        validators=[validate_password],
        style={'input_type': 'password'},
        help_text='Password must be at least 8 characters'
    )
    password_confirm = serializers.CharField(
        write_only=True,
        required=True,
        style={'input_type': 'password'},
        help_text='Re-enter password for confirmation'
    )
    
    class Meta:
        model = User
        fields = [
            'id',
            'email',
            'username',
            'password',
            'password_confirm',
            'first_name',
            'last_name',
            'role',
            'assigned_warehouse',
            'date_joined'
        ]
        read_only_fields = ['id', 'date_joined']
        extra_kwargs = {
            'email': {
                'required': True,
                'help_text': 'Unique email address for login'
            },
            'username': {
                'required': True,
                'help_text': 'Unique username'
            },
            'role': {
                'default': 'staff',
                'help_text': 'User role: admin, warehouse_manager, staff, or auditor'
            },
            'assigned_warehouse': {
                'required': False,
                'allow_null': True,
                'help_text': 'Assigned warehouse (optional, for managers and staff)'
            }
        }
    
    def validate_email(self, value):
        """
        Validate email uniqueness.
        Django's unique constraint will catch this, but we provide a clearer error.
        """
        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError(
                "A user with this email address already exists."
            )
        return value.lower()  # Normalize email to lowercase
    
    def validate_username(self, value):
        """Validate username uniqueness"""
        if User.objects.filter(username__iexact=value).exists():
            raise serializers.ValidationError(
                "A user with this username already exists."
            )
        return value
    
    def validate_role(self, value):
        """Validate role is one of the allowed choices"""
        allowed_roles = ['admin', 'warehouse_manager', 'staff', 'auditor']
        if value not in allowed_roles:
            raise serializers.ValidationError(
                f"Invalid role. Must be one of: {', '.join(allowed_roles)}"
            )
        return value
    
    def validate(self, attrs):
        """
        Validate password confirmation and business rules.
        """
        # Check password confirmation
        if attrs['password'] != attrs['password_confirm']:
            raise serializers.ValidationError({
                'password_confirm': "Passwords do not match."
            })
        
        # Remove password_confirm before creating user
        attrs.pop('password_confirm')
        
        # Business rule: warehouse_manager and staff should have assigned warehouse
        # (Warning only - not enforced)
        role = attrs.get('role', 'staff')
        assigned_warehouse = attrs.get('assigned_warehouse')
        
        if role in ['warehouse_manager', 'staff'] and not assigned_warehouse:
            # Could raise validation error, but we'll just warn in response
            pass
        
        return attrs
    
    def create(self, validated_data):
        """
        Create user with hashed password.
        
        Django's User.objects.create_user() automatically:
        1. Hashes the password using bcrypt (configured in settings)
        2. Normalizes the email
        3. Sets default fields
        """
        user = User.objects.create_user(
            email=validated_data['email'],
            username=validated_data['username'],
            password=validated_data['password'],
            first_name=validated_data.get('first_name', ''),
            last_name=validated_data.get('last_name', ''),
            role=validated_data.get('role', 'staff'),
            assigned_warehouse=validated_data.get('assigned_warehouse'),
        )
        return user


class UserSerializer(serializers.ModelSerializer):
    """
    Serializer for User profile (read-only operations).
    """
    
    full_name = serializers.CharField(source='get_full_name', read_only=True)
    warehouse_name = serializers.CharField(
        source='assigned_warehouse.name',
        read_only=True,
        allow_null=True
    )
    warehouse_code = serializers.CharField(
        source='assigned_warehouse.code',
        read_only=True,
        allow_null=True
    )
    
    class Meta:
        model = User
        fields = [
            'id',
            'email',
            'username',
            'first_name',
            'last_name',
            'full_name',
            'role',
            'assigned_warehouse',
            'warehouse_name',
            'warehouse_code',
            'is_active',
            'date_joined',
            'last_login'
        ]
        read_only_fields = [
            'id',
            'email',
            'date_joined',
            'last_login'
        ]


class PasswordChangeSerializer(serializers.Serializer):
    """
    Serializer for password change.
    """
    
    old_password = serializers.CharField(
        required=True,
        write_only=True,
        style={'input_type': 'password'}
    )
    new_password = serializers.CharField(
        required=True,
        write_only=True,
        validators=[validate_password],
        style={'input_type': 'password'}
    )
    new_password_confirm = serializers.CharField(
        required=True,
        write_only=True,
        style={'input_type': 'password'}
    )
    
    def validate_old_password(self, value):
        """Validate old password is correct"""
        user = self.context['request'].user
        if not user.check_password(value):
            raise serializers.ValidationError("Old password is incorrect.")
        return value
    
    def validate(self, attrs):
        """Validate new passwords match"""
        if attrs['new_password'] != attrs['new_password_confirm']:
            raise serializers.ValidationError({
                'new_password_confirm': "New passwords do not match."
            })
        return attrs
    
    def save(self):
        """Update user password"""
        user = self.context['request'].user
        user.set_password(self.validated_data['new_password'])
        user.save()
        return user


class UserUpdateSerializer(serializers.ModelSerializer):
    """
    Serializer for updating user profile.
    Allows updating: first_name, last_name, assigned_warehouse
    Does NOT allow changing: email, username, role, password
    """
    
    class Meta:
        model = User
        fields = [
            'first_name',
            'last_name',
            'assigned_warehouse'
        ]
        extra_kwargs = {
            'assigned_warehouse': {
                'required': False,
                'allow_null': True
            }
        }