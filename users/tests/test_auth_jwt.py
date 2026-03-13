"""
users/tests/test_auth_jwt.py - Comprehensive JWT Authentication Tests

Tests cover:
- User registration with validation
- Login with JWT token generation
- Token refresh mechanism
- Role-based 403 permission checks
- Inactive user blocking
- Token expiration handling
- Password security
- Email uniqueness
"""

import pytest
from django.urls import reverse
from rest_framework import status
import jwt
import time

from users.models import User


# ============================================================================
# User Registration Tests
# ============================================================================

@pytest.mark.django_db
class TestUserRegistration:
    """Test user registration endpoint"""
    
    def test_registration_success(self, api_client):
        """Test successful user registration"""
        url = reverse('users:register')
        data = {
            'email': 'newuser@pharma.com',
            'username': 'newuser',
            'password': 'SecurePass123!',
            'password_confirm': 'SecurePass123!',
            'first_name': 'New',
            'last_name': 'User',
            'role': 'staff'
        }
        
        response = api_client.post(url, data, format='json')
        
        assert response.status_code == status.HTTP_201_CREATED
        assert response.data['message'] == 'User registered successfully'
        assert response.data['user']['email'] == 'newuser@pharma.com'
        assert response.data['user']['role'] == 'staff'
        assert 'password' not in response.data['user']
        
        # Verify user created in database
        user = User.objects.get(email='newuser@pharma.com')
        assert user.username == 'newuser'
        assert user.check_password('SecurePass123!')  # bcrypt verification
        assert user.role == 'staff'
        assert user.is_active is True
    
    def test_registration_duplicate_email(self, api_client, user):
        """Test registration with duplicate email fails"""
        url = reverse('users:register')
        data = {
            'email': user.email,  # Existing email
            'username': 'differentuser',
            'password': 'SecurePass123!',
            'password_confirm': 'SecurePass123!',
            'role': 'staff'
        }
        
        response = api_client.post(url, data, format='json')
        
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert 'email' in response.data['errors']
        assert 'already exists' in str(response.data['errors']['email']).lower()
    
    def test_registration_duplicate_username(self, api_client, user):
        """Test registration with duplicate username fails"""
        url = reverse('users:register')
        data = {
            'email': 'newuser@pharma.com',
            'username': user.username,  # Existing username
            'password': 'SecurePass123!',
            'password_confirm': 'SecurePass123!',
            'role': 'staff'
        }
        
        response = api_client.post(url, data, format='json')
        
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert 'username' in response.data['errors']
    
    def test_registration_password_mismatch(self, api_client):
        """Test registration with mismatched passwords fails"""
        url = reverse('users:register')
        data = {
            'email': 'newuser@pharma.com',
            'username': 'newuser',
            'password': 'SecurePass123!',
            'password_confirm': 'DifferentPass123!',
            'role': 'staff'
        }
        
        response = api_client.post(url, data, format='json')
        
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert 'password_confirm' in response.data['errors']
        assert 'do not match' in str(response.data['errors']['password_confirm']).lower()
    
    def test_registration_weak_password(self, api_client):
        """Test registration with weak password fails"""
        url = reverse('users:register')
        data = {
            'email': 'newuser@pharma.com',
            'username': 'newuser',
            'password': '123',  # Too short
            'password_confirm': '123',
            'role': 'staff'
        }
        
        response = api_client.post(url, data, format='json')
        
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert 'password' in response.data['errors']
    
    def test_registration_common_password(self, api_client):
        """Test registration with common password fails"""
        url = reverse('users:register')
        data = {
            'email': 'newuser@pharma.com',
            'username': 'newuser',
            'password': 'password123',  # Common password
            'password_confirm': 'password123',
            'role': 'staff'
        }
        
        response = api_client.post(url, data, format='json')
        
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert 'password' in response.data['errors']
    
    def test_registration_invalid_role(self, api_client):
        """Test registration with invalid role fails"""
        url = reverse('users:register')
        data = {
            'email': 'newuser@pharma.com',
            'username': 'newuser',
            'password': 'SecurePass123!',
            'password_confirm': 'SecurePass123!',
            'role': 'superadmin'  # Invalid role
        }
        
        response = api_client.post(url, data, format='json')
        
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert 'role' in response.data['errors']
    
    def test_registration_missing_fields(self, api_client):
        """Test registration with missing required fields fails"""
        url = reverse('users:register')
        data = {
            'email': 'newuser@pharma.com',
            # Missing username, password, password_confirm
        }
        
        response = api_client.post(url, data, format='json')
        
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert 'username' in response.data['errors']
        assert 'password' in response.data['errors']


# ============================================================================
# Login / JWT Token Generation Tests
# ============================================================================

@pytest.mark.django_db
class TestLogin:
    """Test login and JWT token generation"""
    
    def test_login_success(self, api_client, user):
        """Test successful login returns JWT tokens with role claims"""
        url = reverse('users:login')
        data = {
            'email': user.email,
            'password': 'Test123!'  # Default password from UserFactory
        }
        
        response = api_client.post(url, data, format='json')
        
        assert response.status_code == status.HTTP_200_OK
        assert 'access' in response.data
        assert 'refresh' in response.data
        assert 'user' in response.data
        
        # Verify user data in response
        assert response.data['user']['email'] == user.email
        assert response.data['user']['role'] == user.role
        
        # Decode JWT and verify custom claims
        access_token = response.data['access']
        decoded = jwt.decode(access_token, options={"verify_signature": False})
        
        assert decoded['email'] == user.email
        assert decoded['role'] == user.role
        assert decoded['username'] == user.username
        assert 'can_approve_recalls' in decoded
        assert 'can_manage_stock' in decoded
    
    def test_login_admin_role_claims(self, api_client, admin_user):
        """Test admin login includes correct role claims"""
        url = reverse('users:login')
        data = {
            'email': admin_user.email,
            'password': 'Test123!'
        }
        
        response = api_client.post(url, data, format='json')
        
        assert response.status_code == status.HTTP_200_OK
        
        # Decode JWT and verify admin permissions
        access_token = response.data['access']
        decoded = jwt.decode(access_token, options={"verify_signature": False})
        
        assert decoded['role'] == 'admin'
        assert decoded['can_approve_recalls'] is True
        assert decoded['can_manage_stock'] is True
        assert decoded['is_admin'] is True
    
    def test_login_manager_role_claims(self, api_client, manager_user):
        """Test manager login includes correct role claims"""
        url = reverse('users:login')
        data = {
            'email': manager_user.email,
            'password': 'Test123!'
        }
        
        response = api_client.post(url, data, format='json')
        
        assert response.status_code == status.HTTP_200_OK
        
        # Decode JWT and verify manager permissions
        access_token = response.data['access']
        decoded = jwt.decode(access_token, options={"verify_signature": False})
        
        assert decoded['role'] == 'warehouse_manager'
        assert decoded['can_approve_recalls'] is False
        assert decoded['can_manage_stock'] is True
        assert decoded['is_manager'] is True
    
    def test_login_invalid_credentials(self, api_client, user):
        """Test login with invalid credentials fails"""
        url = reverse('users:login')
        data = {
            'email': user.email,
            'password': 'WrongPassword123!'
        }
        
        response = api_client.post(url, data, format='json')
        
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
    
    def test_login_nonexistent_user(self, api_client):
        """Test login with non-existent user fails"""
        url = reverse('users:login')
        data = {
            'email': 'nonexistent@pharma.com',
            'password': 'Test123!'
        }
        
        response = api_client.post(url, data, format='json')
        
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
    
    def test_login_inactive_user(self, api_client, inactive_user):
        """Test login with inactive user is blocked"""
        url = reverse('users:login')
        data = {
            'email': inactive_user.email,
            'password': 'Test123!'
        }
        
        response = api_client.post(url, data, format='json')
        
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
    
    def test_login_case_insensitive_email(self, api_client, user):
        """Test login is case-insensitive for email"""
        url = reverse('users:login')
        data = {
            'email': user.email.upper(),  # Uppercase email
            'password': 'Test123!'
        }
        
        response = api_client.post(url, data, format='json')
        
        # Should succeed (email is normalized in login)
        assert response.status_code == status.HTTP_200_OK


# ============================================================================
# Token Refresh Tests
# ============================================================================

@pytest.mark.django_db
class TestTokenRefresh:
    """Test JWT token refresh functionality"""
    
    def test_token_refresh_success(self, api_client, user):
        """Test successful token refresh"""
        # Login to get tokens
        login_url = reverse('users:login')
        login_response = api_client.post(login_url, {
            'email': user.email,
            'password': 'Test123!'
        }, format='json')
        
        refresh_token = login_response.data['refresh']
        old_access_token = login_response.data['access']
        
        # Refresh token
        refresh_url = reverse('users:token_refresh')
        response = api_client.post(refresh_url, {
            'refresh': refresh_token
        }, format='json')
        
        assert response.status_code == status.HTTP_200_OK
        assert 'access' in response.data
        assert 'refresh' in response.data
        
        # New tokens should be different
        new_access_token = response.data['access']
        new_refresh_token = response.data['refresh']
        
        assert new_access_token != old_access_token
        assert new_refresh_token != refresh_token  # Token rotation enabled
    
    def test_token_refresh_invalid_token(self, api_client):
        """Test token refresh with invalid refresh token fails"""
        refresh_url = reverse('users:token_refresh')
        response = api_client.post(refresh_url, {
            'refresh': 'invalid-token-12345'
        }, format='json')
        
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
    
    def test_token_refresh_with_access_token(self, api_client, user):
        """Test using access token for refresh fails"""
        # Login to get tokens
        login_url = reverse('users:login')
        login_response = api_client.post(login_url, {
            'email': user.email,
            'password': 'Test123!'
        }, format='json')
        
        access_token = login_response.data['access']
        
        # Try to refresh with access token (should fail)
        refresh_url = reverse('users:token_refresh')
        response = api_client.post(refresh_url, {
            'refresh': access_token
        }, format='json')
        
        assert response.status_code == status.HTTP_401_UNAUTHORIZED


# ============================================================================
# Role-Based Permission Tests (403 Checks)
# ============================================================================

@pytest.mark.django_db
class TestRoleBasedPermissions:
    """Test role-based access control with 403 responses"""
    
    def test_admin_only_endpoint_with_admin(self, admin_client):
        """Test admin-only endpoint allows admin"""
        url = reverse('users:user_list')  # Admin-only endpoint
        response = admin_client.get(url)
        
        # Should allow access (200 or 404, not 403)
        assert response.status_code != status.HTTP_403_FORBIDDEN
    
    def test_admin_only_endpoint_with_staff(self, authenticated_client):
        """Test admin-only endpoint blocks staff with 403"""
        url = reverse('users:user_list')  # Admin-only endpoint
        response = authenticated_client.get(url)
        
        # Should be forbidden
        assert response.status_code == status.HTTP_403_FORBIDDEN
        assert 'detail' in response.data
    
    def test_manager_can_access_stock_endpoints(self, manager_client):
        """Test warehouse manager can access stock management endpoints"""
        # This would be a stock transfer endpoint (example)
        # url = reverse('inventory:stock_transfer')
        # response = manager_client.post(url, data)
        # assert response.status_code != status.HTTP_403_FORBIDDEN
        pass  # Placeholder for when inventory endpoints are created
    
    def test_staff_cannot_access_stock_endpoints(self, authenticated_client):
        """Test staff user cannot access stock management endpoints"""
        # This would be a stock transfer endpoint (example)
        # url = reverse('inventory:stock_transfer')
        # response = authenticated_client.post(url, data)
        # assert response.status_code == status.HTTP_403_FORBIDDEN
        pass  # Placeholder for when inventory endpoints are created
    
    def test_auditor_read_only_access(self, auditor_client):
        """Test auditor has read-only access"""
        # Auditor can read
        url = reverse('users:user_list')
        response = auditor_client.get(url)
        # Should allow read access
        # assert response.status_code != status.HTTP_403_FORBIDDEN
        
        # But cannot write (if endpoint allows POST)
        # response = auditor_client.post(url, data)
        # assert response.status_code == status.HTTP_403_FORBIDDEN
        pass  # Placeholder


# ============================================================================
# Inactive User Blocking Tests
# ============================================================================

@pytest.mark.django_db
class TestInactiveUserBlocking:
    """Test that inactive users are blocked from authentication"""
    
    def test_inactive_user_cannot_login(self, api_client, inactive_user):
        """Test inactive user cannot login"""
        url = reverse('users:login')
        data = {
            'email': inactive_user.email,
            'password': 'Test123!'
        }
        
        response = api_client.post(url, data, format='json')
        
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
    
    def test_inactive_user_cannot_access_endpoints(self, api_client, inactive_user, get_tokens_for_user):
        """Test inactive user's token doesn't work"""
        # Manually create token for inactive user
        tokens = get_tokens_for_user(inactive_user)
        
        # Try to access protected endpoint
        url = reverse('users:profile')
        api_client.credentials(HTTP_AUTHORIZATION=f'Bearer {tokens["access"]}')
        response = api_client.get(url)
        
        # Should be denied (401 or 403)
        assert response.status_code in [status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN]
    
    def test_user_deactivation_blocks_access(self, api_client, user, get_tokens_for_user):
        """Test that deactivating a user blocks their existing tokens"""
        # Get token while user is active
        tokens = get_tokens_for_user(user)
        
        # Deactivate user
        user.is_active = False
        user.save()
        
        # Try to access protected endpoint with old token
        url = reverse('users:profile')
        api_client.credentials(HTTP_AUTHORIZATION=f'Bearer {tokens["access"]}')
        response = api_client.get(url)
        
        # Should be denied
        assert response.status_code in [status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN]


# ============================================================================
# Authenticated Endpoint Access Tests
# ============================================================================

@pytest.mark.django_db
class TestAuthenticatedEndpoints:
    """Test endpoints that require authentication"""
    
    def test_profile_access_with_valid_token(self, authenticated_client):
        """Test accessing profile with valid JWT token"""
        url = reverse('users:profile')
        response = authenticated_client.get(url)
        
        assert response.status_code == status.HTTP_200_OK
        assert 'email' in response.data
        assert response.data['email'] == authenticated_client.user.email
    
    def test_profile_access_without_token(self, api_client):
        """Test accessing profile without token returns 401"""
        url = reverse('users:profile')
        response = api_client.get(url)
        
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
    
    def test_profile_access_with_invalid_token(self, api_client):
        """Test accessing profile with invalid token returns 401"""
        url = reverse('users:profile')
        api_client.credentials(HTTP_AUTHORIZATION='Bearer invalid-token-12345')
        response = api_client.get(url)
        
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
    
    def test_test_auth_endpoint(self, authenticated_client):
        """Test the test_auth endpoint"""
        url = reverse('users:test_auth')
        response = authenticated_client.get(url)
        
        assert response.status_code == status.HTTP_200_OK
        assert response.data['message'] == 'Authentication successful'
        assert response.data['user']['is_authenticated'] is True


# ============================================================================
# Logout / Token Blacklisting Tests
# ============================================================================

@pytest.mark.django_db
class TestLogout:
    """Test logout and token blacklisting"""
    
    def test_logout_success(self, api_client, user):
        """Test successful logout blacklists refresh token"""
        # Login
        login_url = reverse('users:login')
        login_response = api_client.post(login_url, {
            'email': user.email,
            'password': 'Test123!'
        }, format='json')
        
        access_token = login_response.data['access']
        refresh_token = login_response.data['refresh']
        
        # Logout
        logout_url = reverse('users:logout')
        api_client.credentials(HTTP_AUTHORIZATION=f'Bearer {access_token}')
        response = api_client.post(logout_url, {
            'refresh': refresh_token
        }, format='json')
        
        assert response.status_code == status.HTTP_205_RESET_CONTENT
        
        # Try to use blacklisted refresh token
        refresh_url = reverse('users:token_refresh')
        api_client.credentials()  # Remove auth header
        refresh_response = api_client.post(refresh_url, {
            'refresh': refresh_token
        }, format='json')
        
        # Should fail because token is blacklisted
        assert refresh_response.status_code == status.HTTP_401_UNAUTHORIZED
    
    def test_logout_without_refresh_token(self, authenticated_client):
        """Test logout without refresh token fails"""
        logout_url = reverse('users:logout')
        response = authenticated_client.post(logout_url, {}, format='json')
        
        assert response.status_code == status.HTTP_400_BAD_REQUEST


# ============================================================================
# Multiple Role Testing
# ============================================================================

@pytest.mark.django_db
class TestMultipleRoles:
    """Test different user roles with factory_boy"""
    
    def test_all_roles_can_login(self, api_client, multiple_users):
        """Test all user roles can login successfully"""
        url = reverse('users:login')
        
        for role, user in multiple_users.items():
            if role == 'inactive':
                continue  # Skip inactive user
            
            response = api_client.post(url, {
                'email': user.email,
                'password': 'Test123!'
            }, format='json')
            
            assert response.status_code == status.HTTP_200_OK, f"Login failed for {role}"
            assert response.data['user']['role'] == user.role
    
    def test_role_specific_permissions(self, api_client, multiple_users, get_tokens_for_user):
        """Test role-specific permission claims in JWT"""
        roles_permissions = {
            'admin': {'can_approve_recalls': True, 'can_manage_stock': True},
            'manager': {'can_approve_recalls': False, 'can_manage_stock': True},
            'staff': {'can_approve_recalls': False, 'can_manage_stock': False},
            'auditor': {'can_approve_recalls': False, 'can_manage_stock': False},
        }
        
        for role, expected_perms in roles_permissions.items():
            user = multiple_users[role]
            tokens = get_tokens_for_user(user)
            
            # Decode JWT
            decoded = jwt.decode(tokens['access'], options={"verify_signature": False})
            
            assert decoded['can_approve_recalls'] == expected_perms['can_approve_recalls']
            assert decoded['can_manage_stock'] == expected_perms['can_manage_stock']


# ============================================================================
# Password Change Tests
# ============================================================================

@pytest.mark.django_db
class TestPasswordChange:
    """Test password change functionality"""
    
    def test_password_change_success(self, api_client, user):
        """Test successful password change"""
        # Login
        login_url = reverse('users:login')
        login_response = api_client.post(login_url, {
            'email': user.email,
            'password': 'Test123!'
        }, format='json')
        
        token = login_response.data['access']
        
        # Change password
        change_url = reverse('users:password_change')
        api_client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        response = api_client.post(change_url, {
            'old_password': 'Test123!',
            'new_password': 'NewPass123!',
            'new_password_confirm': 'NewPass123!'
        }, format='json')
        
        assert response.status_code == status.HTTP_200_OK
        
        # Verify new password works
        user.refresh_from_db()
        assert user.check_password('NewPass123!')
        
        # Verify old password doesn't work
        assert not user.check_password('Test123!')
    
    def test_password_change_wrong_old_password(self, authenticated_client):
        """Test password change with wrong old password fails"""
        change_url = reverse('users:password_change')
        response = authenticated_client.post(change_url, {
            'old_password': 'WrongOldPass123!',
            'new_password': 'NewPass123!',
            'new_password_confirm': 'NewPass123!'
        }, format='json')
        
        assert response.status_code == status.HTTP_400_BAD_REQUEST


# ============================================================================
# Run all tests with: pytest users/tests/test_auth_jwt.py -v
# ============================================================================