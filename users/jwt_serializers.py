"""
users/jwt_serializers.py - Custom JWT Token Serializers with Role Claims
"""

from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework import serializers


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    """
    Custom JWT serializer that adds user role and additional claims to token payload.
    
    Token payload will include:
    - user_id (default)
    - email
    - username
    - role (CRITICAL for RBAC)
    - warehouse_id (if assigned)
    - warehouse_code (if assigned)
    - full_name
    - is_active
    """
    
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)

        # Basic user info
        token['email'] = user.email
        token['username'] = user.username
        token['role'] = user.role
        token['full_name'] = user.get_full_name()
        token['is_active'] = user.is_active

        # Warehouse info
        if user.assigned_warehouse:
            token['warehouse_id'] = str(user.assigned_warehouse.id)
            token['warehouse_code'] = user.assigned_warehouse.code
            token['warehouse_name'] = user.assigned_warehouse.name
        else:
            token['warehouse_id'] = None
            token['warehouse_code'] = None
            token['warehouse_name'] = None

        # Role-based permission flags
        token['can_approve_recalls'] = user.role == "admin"

        token['can_manage_stock'] = user.role in [
            "admin",
            "warehouse_manager"
        ]

        token['is_admin'] = user.role == "admin"
        token['is_manager'] = user.role == "warehouse_manager"
        token['is_auditor'] = user.role == "auditor"

        return token
    
    def validate(self, attrs):
        """
        Override to add user data to response.
        """
        data = super().validate(attrs)
        
        # Add user information to login response
        data['user'] = {
            'id': str(self.user.id),
            'email': self.user.email,
            'username': self.user.username,
            'role': self.user.role,
            'full_name': self.user.get_full_name(),
            'assigned_warehouse': {
                'id': str(self.user.assigned_warehouse.id),
                'name': self.user.assigned_warehouse.name,
                'code': self.user.assigned_warehouse.code
            } if self.user.assigned_warehouse else None
        }
        
        return data


class CustomTokenRefreshSerializer(serializers.Serializer):
    """
    Custom token refresh serializer (if needed for additional validation).
    For now, we use the default from simplejwt.
    """
    pass