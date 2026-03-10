"""
users/urls.py - URL Configuration for User Authentication
"""

from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView

from .views import (
    RegisterView,
    CustomTokenObtainPairView,
    LogoutView,
    UserProfileView,
    PasswordChangeView,
    UserListView,
    UserDetailView,
    test_auth
)

app_name = 'users'

urlpatterns = [
    # ========================================================================
    # Authentication Endpoints
    # ========================================================================
    
    # Registration
    path('auth/register/', RegisterView.as_view(), name='register'),
    
    # Login (obtain JWT tokens with role claims)
    path('auth/login/', CustomTokenObtainPairView.as_view(), name='login'),
    
    # Refresh JWT token
    path('auth/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    
    # Logout (blacklist refresh token)
    path('auth/logout/', LogoutView.as_view(), name='logout'),
    
    # Current user profile
    path('auth/profile/', UserProfileView.as_view(), name='profile'),
    
    # Password change
    path('auth/password/change/', PasswordChangeView.as_view(), name='password_change'),
    
    # Test authentication
    path('auth/test/', test_auth, name='test_auth'),
    
    # ========================================================================
    # User Management Endpoints (Admin)
    # ========================================================================
    
    # List all users
    path('users/', UserListView.as_view(), name='user_list'),
    
    # Get user by ID
    path('users/<uuid:id>/', UserDetailView.as_view(), name='user_detail'),
]