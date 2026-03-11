"""
users/permissions.py - Custom DRF Permission Classes for Role-Based Access Control

These permission classes extract the user's role from JWT token claims
and enforce role-based access control with clear error messages.
"""

from rest_framework import permissions
from rest_framework.exceptions import PermissionDenied


class IsAuthenticated(permissions.BasePermission):
    """
    Custom IsAuthenticated permission with clear error message.
    """
    
    message = "Authentication credentials were not provided or are invalid."
    
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated)


class RoleBasedPermission(permissions.BasePermission):
    """
    Base permission class that checks user role from JWT token claims.
    
    Usage in views:
        permission_classes = [RoleBasedPermission]
        allowed_roles = ['admin', 'warehouse_manager']
    
    The allowed_roles can be set on the view class or passed dynamically.
    """
    
    def has_permission(self, request, view):
        # Check if user is authenticated
        if not request.user or not request.user.is_authenticated:
            raise PermissionDenied(
                detail="Authentication credentials were not provided.",
                code="not_authenticated"
            )
        
        # Get allowed roles from view
        allowed_roles = getattr(view, 'allowed_roles', None)
        
        if allowed_roles is None:
            # If no roles specified, deny access
            raise PermissionDenied(
                detail="This endpoint has not configured role permissions.",
                code="misconfigured_permissions"
            )
        
        # Get user's role from user model (JWT claims are set during authentication)
        user_role = request.user.role
        
        # Check if user's role is in allowed roles
        if user_role not in allowed_roles:
            allowed_roles_str = ', '.join(allowed_roles)
            raise PermissionDenied(
                detail=f"This action requires one of the following roles: {allowed_roles_str}. Your role is '{user_role}'.",
                code="insufficient_permissions"
            )
        
        return True


class RequireRole(permissions.BasePermission):
    """
    Permission class that can be instantiated with specific roles.
    
    Usage:
        permission_classes = [RequireRole(['admin', 'warehouse_manager'])]
    
    Or create specific permission instances:
        IsAdmin = RequireRole(['admin'])
        IsManager = RequireRole(['admin', 'warehouse_manager'])
    """
    
    def __init__(self, allowed_roles):
        """
        Initialize with a list of allowed roles.
        
        Args:
            allowed_roles (list): List of role strings that are allowed
        """
        self.allowed_roles = allowed_roles
        super().__init__()
    
    def has_permission(self, request, view):
        # Check if user is authenticated
        if not request.user or not request.user.is_authenticated:
            raise PermissionDenied(
                detail="Authentication credentials were not provided.",
                code="not_authenticated"
            )
        
        # Get user's role
        user_role = request.user.role
        
        # Check if user's role is in allowed roles
        if user_role not in self.allowed_roles:
            allowed_roles_str = ', '.join(self.allowed_roles)
            raise PermissionDenied(
                detail=f"This action requires one of the following roles: {allowed_roles_str}. Your role is '{user_role}'.",
                code="insufficient_permissions"
            )
        
        return True


# ============================================================================
# Pre-configured Permission Classes for Common Roles
# ============================================================================

class IsAdmin(permissions.BasePermission):
    """
    Permission class that only allows admin users.
    
    Usage:
        permission_classes = [IsAdmin]
    """
    
    message = "This action requires 'admin' role. Your role is '{role}'."
    
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            raise PermissionDenied(
                detail="Authentication credentials were not provided.",
                code="not_authenticated"
            )
        
        if request.user.role != 'admin':
            raise PermissionDenied(
                detail=self.message.format(role=request.user.role),
                code="insufficient_permissions"
            )
        
        return True


class IsAdminOrManager(permissions.BasePermission):
    """
    Permission class that allows admin or warehouse_manager users.
    
    Usage:
        permission_classes = [IsAdminOrManager]
    """
    
    message = "This action requires 'admin' or 'warehouse_manager' role. Your role is '{role}'."
    
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            raise PermissionDenied(
                detail="Authentication credentials were not provided.",
                code="not_authenticated"
            )
        
        allowed_roles = ['admin', 'warehouse_manager']
        
        if request.user.role not in allowed_roles:
            raise PermissionDenied(
                detail=self.message.format(role=request.user.role),
                code="insufficient_permissions"
            )
        
        return True


class IsStaffOrAbove(permissions.BasePermission):
    """
    Permission class that allows staff, warehouse_manager, or admin users.
    (Excludes auditor)
    
    Usage:
        permission_classes = [IsStaffOrAbove]
    """
    
    message = "This action requires 'staff', 'warehouse_manager', or 'admin' role. Your role is '{role}'."
    
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            raise PermissionDenied(
                detail="Authentication credentials were not provided.",
                code="not_authenticated"
            )
        
        allowed_roles = ['admin', 'warehouse_manager', 'staff']
        
        if request.user.role not in allowed_roles:
            raise PermissionDenied(
                detail=self.message.format(role=request.user.role),
                code="insufficient_permissions"
            )
        
        return True


class IsAuditorOrAdmin(permissions.BasePermission):
    """
    Permission class that allows auditor or admin users.
    Useful for read-only endpoints that auditors need access to.
    
    Usage:
        permission_classes = [IsAuditorOrAdmin]
    """
    
    message = "This action requires 'auditor' or 'admin' role. Your role is '{role}'."
    
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            raise PermissionDenied(
                detail="Authentication credentials were not provided.",
                code="not_authenticated"
            )
        
        allowed_roles = ['admin', 'auditor']
        
        if request.user.role not in allowed_roles:
            raise PermissionDenied(
                detail=self.message.format(role=request.user.role),
                code="insufficient_permissions"
            )
        
        return True


# ============================================================================
# Object-Level Permissions
# ============================================================================

class IsOwnerOrAdmin(permissions.BasePermission):
    """
    Object-level permission to only allow owners or admins to edit an object.
    
    Usage:
        permission_classes = [IsOwnerOrAdmin]
    
    The model must have a 'created_by' or 'user' field linking to the User.
    """
    
    def has_object_permission(self, request, view, obj):
        # Admins can access any object
        if request.user.role == 'admin':
            return True
        
        # Check if object has created_by or user field
        if hasattr(obj, 'created_by'):
            owner = obj.created_by
        elif hasattr(obj, 'user'):
            owner = obj.user
        else:
            # If no owner field, deny access
            raise PermissionDenied(
                detail="Cannot determine object ownership.",
                code="ownership_error"
            )
        
        # Check if current user is the owner
        if owner != request.user:
            raise PermissionDenied(
                detail="You do not have permission to access this object. Only the owner or an admin can perform this action.",
                code="not_owner"
            )
        
        return True


class CanManageStock(permissions.BasePermission):
    """
    Permission for stock management operations.
    Only admin and warehouse_manager can manage stock.
    
    Usage:
        permission_classes = [CanManageStock]
    """
    
    message = "Stock management requires 'admin' or 'warehouse_manager' role. Your role is '{role}'."
    
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            raise PermissionDenied(
                detail="Authentication credentials were not provided.",
                code="not_authenticated"
            )
        
        # Use the helper method from User model
        if not request.user.can_manage_stock():
            raise PermissionDenied(
                detail=self.message.format(role=request.user.role),
                code="insufficient_permissions"
            )
        
        return True


class CanApproveRecalls(permissions.BasePermission):
    """
    Permission for recall approval operations.
    Only admin can approve recalls.
    
    Usage:
        permission_classes = [CanApproveRecalls]
    """
    
    message = "Recall approval requires 'admin' role. Your role is '{role}'."
    
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            raise PermissionDenied(
                detail="Authentication credentials were not provided.",
                code="not_authenticated"
            )
        
        # Use the helper method from User model
        if not request.user.can_approve_recalls():
            raise PermissionDenied(
                detail=self.message.format(role=request.user.role),
                code="insufficient_permissions"
            )
        
        return True


class HasWarehouseAccess(permissions.BasePermission):
    """
    Object-level permission to check if user has access to a specific warehouse.
    
    Usage:
        permission_classes = [HasWarehouseAccess]
    
    Admin and auditor have access to all warehouses.
    Others only have access to their assigned warehouse.
    """
    
    def has_object_permission(self, request, view, obj):
        if not request.user or not request.user.is_authenticated:
            raise PermissionDenied(
                detail="Authentication credentials were not provided.",
                code="not_authenticated"
            )
        
        # Admin and auditor have access to all warehouses
        if request.user.role in ['admin', 'auditor']:
            return True
        
        # Get the warehouse from the object
        # Object could be a Warehouse, or have a warehouse field
        if hasattr(obj, 'warehouse'):
            warehouse = obj.warehouse
        elif obj.__class__.__name__ == 'Warehouse':
            warehouse = obj
        else:
            # Can't determine warehouse
            raise PermissionDenied(
                detail="Cannot determine warehouse for this object.",
                code="warehouse_determination_error"
            )
        
        # Check if user has access to this warehouse
        if not request.user.has_warehouse_access(warehouse):
            raise PermissionDenied(
                detail=f"You do not have access to warehouse '{warehouse.name}'. You are only authorized for your assigned warehouse.",
                code="warehouse_access_denied"
            )
        
        return True


# ============================================================================
# Read-Only Permissions
# ============================================================================

class ReadOnlyOrAdmin(permissions.BasePermission):
    """
    Permission that allows read-only access to all authenticated users,
    but write access only to admins.
    
    Usage:
        permission_classes = [ReadOnlyOrAdmin]
    """
    
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            raise PermissionDenied(
                detail="Authentication credentials were not provided.",
                code="not_authenticated"
            )
        
        # Allow read-only for any authenticated user
        if request.method in permissions.SAFE_METHODS:  # GET, HEAD, OPTIONS
            return True
        
        # Write operations require admin role
        if request.user.role != 'admin':
            raise PermissionDenied(
                detail=f"Write operations require 'admin' role. Your role is '{request.user.role}'. You have read-only access.",
                code="read_only_access"
            )
        
        return True


class AuditorReadOnly(permissions.BasePermission):
    """
    Permission that allows auditors read-only access,
    and full access to admin/manager.
    
    Usage:
        permission_classes = [AuditorReadOnly]
    """
    
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            raise PermissionDenied(
                detail="Authentication credentials were not provided.",
                code="not_authenticated"
            )
        
        # Auditors can only read
        if request.user.role == 'auditor':
            if request.method not in permissions.SAFE_METHODS:
                raise PermissionDenied(
                    detail="Auditors have read-only access. Write operations are not permitted.",
                    code="auditor_read_only"
                )
            return True
        
        # Admin and managers have full access
        if request.user.role in ['admin', 'warehouse_manager']:
            return True
        
        # Staff and others are denied
        raise PermissionDenied(
            detail=f"This action requires 'admin', 'warehouse_manager', or 'auditor' (read-only) role. Your role is '{request.user.role}'.",
            code="insufficient_permissions"
        )


# ============================================================================
# Utility Functions
# ============================================================================

def check_role_permission(user, allowed_roles):
    """
    Utility function to check if user has one of the allowed roles.
    
    Args:
        user: User instance
        allowed_roles: List of allowed role strings
    
    Returns:
        bool: True if user has permission
    
    Raises:
        PermissionDenied: If user doesn't have required role
    """
    if not user or not user.is_authenticated:
        raise PermissionDenied(
            detail="Authentication credentials were not provided.",
            code="not_authenticated"
        )
    
    if user.role not in allowed_roles:
        allowed_roles_str = ', '.join(allowed_roles)
        raise PermissionDenied(
            detail=f"This action requires one of the following roles: {allowed_roles_str}. Your role is '{user.role}'.",
            code="insufficient_permissions"
        )
    
    return True