"""
conftest.py - Pytest Configuration and Shared Fixtures

This file contains pytest fixtures and factory_boy factories
that are shared across all test files.
"""

import pytest
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken
import factory
from factory.django import DjangoModelFactory
from faker import Faker

from users.models import User
from inventory.models import Warehouse

fake = Faker()


# ============================================================================
# Factory Boy Factories
# ============================================================================

class UserFactory(DjangoModelFactory):
    """
    Factory for creating User instances with realistic data.
    
    Usage:
        user = UserFactory()
        admin = UserFactory(role='admin')
        inactive = UserFactory(is_active=False)
    """
    
    class Meta:
        model = User
    
    # Generate unique email and username using sequences
    email = factory.Sequence(lambda n: f'user{n}@pharma.com')
    username = factory.Sequence(lambda n: f'user{n}')
    
    # Name fields
    first_name = factory.LazyAttribute(lambda x: fake.first_name())
    last_name = factory.LazyAttribute(lambda x: fake.last_name())
    
    # Default password (will be hashed by set_password)
    password = factory.PostGenerationMethodCall('set_password', 'Test123!')
    
    # Default role
    role = 'staff'
    
    # Status fields
    is_active = True
    is_staff = False
    is_superuser = False
    
    # Warehouse assignment (nullable)
    assigned_warehouse = None


class AdminUserFactory(UserFactory):
    """Factory for creating admin users"""
    role = 'admin'
    is_staff = True
    is_superuser = True


class ManagerUserFactory(UserFactory):
    """Factory for creating warehouse manager users"""
    role = 'warehouse_manager'


class StaffUserFactory(UserFactory):
    """Factory for creating staff users"""
    role = 'staff'


class AuditorUserFactory(UserFactory):
    """Factory for creating auditor users"""
    role = 'auditor'


class InactiveUserFactory(UserFactory):
    """Factory for creating inactive users"""
    is_active = False


class WarehouseFactory(DjangoModelFactory):
    """
    Factory for creating Warehouse instances.
    
    Usage:
        warehouse = WarehouseFactory()
        warehouse = WarehouseFactory(manager=user)
    """
    
    class Meta:
        model = Warehouse
    
    name = factory.Sequence(lambda n: f'Warehouse {n}')
    code = factory.Sequence(lambda n: f'WH-{n:03d}')
    
    address = factory.LazyAttribute(lambda x: fake.street_address())
    city = factory.LazyAttribute(lambda x: fake.city())
    state = factory.LazyAttribute(lambda x: fake.state())
    country = 'India'
    pincode = factory.LazyAttribute(lambda x: fake.postcode())
    
    phone = factory.LazyAttribute(lambda x: fake.phone_number())
    email = factory.LazyAttribute(lambda x: fake.company_email())
    
    total_capacity = 10000
    manager = None
    is_active = True


# ============================================================================
# Pytest Fixtures
# ============================================================================

@pytest.fixture
def api_client():
    """
    Fixture for DRF API client.
    
    Usage:
        def test_something(api_client):
            response = api_client.get('/api/v1/endpoint/')
    """
    return APIClient()


@pytest.fixture
def user(db):
    """
    Fixture for creating a regular staff user.
    
    Usage:
        def test_something(user):
            assert user.role == 'staff'
    """
    return UserFactory()


@pytest.fixture
def admin_user(db):
    """
    Fixture for creating an admin user.
    
    Usage:
        def test_admin_action(admin_user):
            assert admin_user.role == 'admin'
    """
    return AdminUserFactory()


@pytest.fixture
def manager_user(db):
    """
    Fixture for creating a warehouse manager user.
    
    Usage:
        def test_manager_action(manager_user):
            assert manager_user.role == 'warehouse_manager'
    """
    return ManagerUserFactory()


@pytest.fixture
def staff_user(db):
    """
    Fixture for creating a staff user.
    
    Usage:
        def test_staff_action(staff_user):
            assert staff_user.role == 'staff'
    """
    return StaffUserFactory()


@pytest.fixture
def auditor_user(db):
    """
    Fixture for creating an auditor user.
    
    Usage:
        def test_auditor_action(auditor_user):
            assert auditor_user.role == 'auditor'
    """
    return AuditorUserFactory()


@pytest.fixture
def inactive_user(db):
    """
    Fixture for creating an inactive user.
    
    Usage:
        def test_inactive_user(inactive_user):
            assert inactive_user.is_active == False
    """
    return InactiveUserFactory()


@pytest.fixture
def warehouse(db):
    """
    Fixture for creating a warehouse.
    
    Usage:
        def test_warehouse(warehouse):
            assert warehouse.is_active == True
    """
    return WarehouseFactory()


@pytest.fixture
def authenticated_client(api_client, user):
    """
    Fixture for authenticated API client with a regular user.
    
    Usage:
        def test_authenticated_endpoint(authenticated_client):
            response = authenticated_client.get('/api/v1/profile/')
    """
    refresh = RefreshToken.for_user(user)
    api_client.credentials(HTTP_AUTHORIZATION=f'Bearer {refresh.access_token}')
    api_client.user = user  # Attach user to client for reference
    return api_client


@pytest.fixture
def admin_client(api_client, admin_user):
    """
    Fixture for authenticated API client with admin user.
    
    Usage:
        def test_admin_endpoint(admin_client):
            response = admin_client.post('/api/v1/admin-action/')
    """
    refresh = RefreshToken.for_user(admin_user)
    api_client.credentials(HTTP_AUTHORIZATION=f'Bearer {refresh.access_token}')
    api_client.user = admin_user
    return api_client


@pytest.fixture
def manager_client(api_client, manager_user):
    """
    Fixture for authenticated API client with manager user.
    
    Usage:
        def test_manager_endpoint(manager_client):
            response = manager_client.post('/api/v1/stock/transfer/')
    """
    refresh = RefreshToken.for_user(manager_user)
    api_client.credentials(HTTP_AUTHORIZATION=f'Bearer {refresh.access_token}')
    api_client.user = manager_user
    return api_client


@pytest.fixture
def auditor_client(api_client, auditor_user):
    """
    Fixture for authenticated API client with auditor user.
    
    Usage:
        def test_auditor_endpoint(auditor_client):
            response = auditor_client.get('/api/v1/audit-logs/')
    """
    refresh = RefreshToken.for_user(auditor_user)
    api_client.credentials(HTTP_AUTHORIZATION=f'Bearer {refresh.access_token}')
    api_client.user = auditor_user
    return api_client


@pytest.fixture
def get_tokens_for_user():
    """
    Fixture factory for getting JWT tokens for any user.
    
    Usage:
        def test_token_refresh(get_tokens_for_user, user):
            tokens = get_tokens_for_user(user)
            access = tokens['access']
            refresh = tokens['refresh']
    """
    from users.jwt_serializers import CustomTokenObtainPairSerializer

    def _get_tokens(user):
        refresh = CustomTokenObtainPairSerializer.get_token(user)
        access = refresh.access_token

        return {
            "refresh": str(refresh),
            "access": str(access),
        }
    return _get_tokens


@pytest.fixture
def authenticate_user(api_client):
    """
    Fixture factory for authenticating any user with API client.
    
    Usage:
        def test_something(api_client, authenticate_user, user):
            authenticate_user(user)
            response = api_client.get('/api/v1/protected/')
    """
    def _authenticate(user):
        refresh = RefreshToken.for_user(user)
        api_client.credentials(HTTP_AUTHORIZATION=f'Bearer {refresh.access_token}')
        return api_client
    return _authenticate


@pytest.fixture
def multiple_users(db):
    """
    Fixture for creating multiple users with different roles.
    
    Usage:
        def test_multiple_roles(multiple_users):
            admin = multiple_users['admin']
            manager = multiple_users['manager']
            staff = multiple_users['staff']
    """
    return {
        'admin': AdminUserFactory(),
        'manager': ManagerUserFactory(),
        'staff': StaffUserFactory(),
        'auditor': AuditorUserFactory(),
        'inactive': InactiveUserFactory()
    }


# ============================================================================
# Pytest Configuration
# ============================================================================

@pytest.fixture(autouse=True)
def enable_db_access_for_all_tests(db):
    """
    Automatically enable database access for all tests.
    """
    pass


# ============================================================================
# Helper Functions (can be used in tests)
# ============================================================================

def decode_jwt_token(token):
    """
    Helper function to decode JWT token without verification.
    
    Usage:
        payload = decode_jwt_token(access_token)
        assert payload['role'] == 'admin'
    """
    import jwt
    return jwt.decode(token, options={"verify_signature": False})


def create_user_with_credentials(role='staff', **kwargs):
    """
    Helper function to create user and return credentials.
    
    Usage:
        user, credentials = create_user_with_credentials(role='admin')
        # credentials = {'email': ..., 'password': 'Test123!'}
    """
    password = kwargs.pop('password', 'Test123!')
    
    if role == 'admin':
        user = AdminUserFactory(**kwargs)
    elif role == 'warehouse_manager':
        user = ManagerUserFactory(**kwargs)
    elif role == 'auditor':
        user = AuditorUserFactory(**kwargs)
    else:
        user = StaffUserFactory(**kwargs)
    
    # Return user and credentials dict
    credentials = {
        'email': user.email,
        'password': password  # Original password before hashing
    }
    
    return user, credentials


# Add this to pytest.ini or conftest.py
pytest_plugins = []