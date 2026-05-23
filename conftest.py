"""
conftest.py - Pytest Configuration and Shared Fixtures
"""

import pytest
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken
import factory
from factory.django import DjangoModelFactory
from faker import Faker
from datetime import date

from users.models import User
from inventory.models import Warehouse, Medicine, Batch

fake = Faker()

# ============================================================================
# Factory Boy Factories
# ============================================================================

class UserFactory(DjangoModelFactory):
    class Meta:
        model = User

    email = factory.Sequence(lambda n: f'user{n}@pharma.com')
    username = factory.Sequence(lambda n: f'user{n}')

    first_name = factory.LazyAttribute(lambda x: fake.first_name())
    last_name = factory.LazyAttribute(lambda x: fake.last_name())

    password = factory.PostGenerationMethodCall('set_password', 'Test123!')

    role = 'staff'
    is_active = True
    is_staff = False
    is_superuser = False
    assigned_warehouse = None


class AdminUserFactory(UserFactory):
    role = 'admin'
    is_staff = True
    is_superuser = True


class ManagerUserFactory(UserFactory):
    role = 'warehouse_manager'


class StaffUserFactory(UserFactory):
    role = 'staff'


class AuditorUserFactory(UserFactory):
    role = 'auditor'


class InactiveUserFactory(UserFactory):
    is_active = False


class WarehouseFactory(DjangoModelFactory):
    class Meta:
        model = Warehouse

    name = factory.Sequence(lambda n: f'Warehouse {n}')
    code = factory.Sequence(lambda n: f'WH-{n:03d}')

    address = factory.LazyAttribute(lambda x: fake.street_address())
    city = factory.LazyAttribute(lambda x: fake.city())
    state = factory.LazyAttribute(lambda x: fake.state())
    country = 'India'
    pincode = factory.LazyAttribute(lambda x: fake.postcode())

    phone = factory.Sequence(lambda n: f"98765432{n:02d}")
    email = factory.LazyAttribute(lambda x: fake.company_email())

    total_capacity = 10000
    manager = None
    is_active = True


# 🆕 NEW FACTORIES (IMPORTANT)

class MedicineFactory(DjangoModelFactory):
    class Meta:
        model = Medicine

    name = factory.Sequence(lambda n: f'Medicine {n}')
    generic_name = "Generic"
    manufacturer = "Pharma Inc"
    category = "tablet"
    storage_type = "room_temp"
    min_stock_threshold = 10


class BatchFactory(DjangoModelFactory):
    class Meta:
        model = Batch

    medicine = factory.SubFactory(MedicineFactory)
    batch_number = factory.Sequence(lambda n: f'BATCH-{n}')
    manufacture_date = date(2024, 1, 1)
    expiry_date = date(2027, 1, 1)
    total_quantity = 1000


# ============================================================================
# Fixtures
# ============================================================================

@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def user(db):
    return UserFactory()


@pytest.fixture
def admin_user(db):
    return AdminUserFactory()


@pytest.fixture
def manager_user(db):
    return ManagerUserFactory()


@pytest.fixture
def staff_user(db):
    return StaffUserFactory()


@pytest.fixture
def auditor_user(db):
    return AuditorUserFactory()


@pytest.fixture
def inactive_user(db):
    return InactiveUserFactory()


@pytest.fixture
def warehouse(db):
    return WarehouseFactory()


# 🆕 IMPORTANT FIXTURES (THIS FIXES YOUR ERROR)

@pytest.fixture
def medicine(db):
    return MedicineFactory()


@pytest.fixture
def batch(db, medicine):
    return BatchFactory(medicine=medicine)


@pytest.fixture
def warehouse_factory(db):
    def create_warehouse():
        return WarehouseFactory()
    return create_warehouse


# ============================================================================
# Auth Clients
# ============================================================================

@pytest.fixture
def authenticated_client(api_client, user):
    refresh = RefreshToken.for_user(user)
    api_client.credentials(HTTP_AUTHORIZATION=f'Bearer {refresh.access_token}')
    api_client.user = user
    return api_client


@pytest.fixture
def admin_client(api_client, admin_user):
    refresh = RefreshToken.for_user(admin_user)
    api_client.credentials(HTTP_AUTHORIZATION=f'Bearer {refresh.access_token}')
    api_client.user = admin_user
    return api_client


@pytest.fixture
def manager_client(api_client, manager_user):
    refresh = RefreshToken.for_user(manager_user)
    api_client.credentials(HTTP_AUTHORIZATION=f'Bearer {refresh.access_token}')
    api_client.user = manager_user
    return api_client


@pytest.fixture
def auditor_client(api_client, auditor_user):
    refresh = RefreshToken.for_user(auditor_user)
    api_client.credentials(HTTP_AUTHORIZATION=f'Bearer {refresh.access_token}')
    api_client.user = auditor_user
    return api_client


# ============================================================================
# Token Helpers
# ============================================================================

@pytest.fixture
def get_tokens_for_user():
    from users.jwt_serializers import CustomTokenObtainPairSerializer

    def _get_tokens(user):
        refresh = CustomTokenObtainPairSerializer.get_token(user)
        return {
            "refresh": str(refresh),
            "access": str(refresh.access_token),
        }
    return _get_tokens


@pytest.fixture
def authenticate_user(api_client):
    def _authenticate(user):
        refresh = RefreshToken.for_user(user)
        api_client.credentials(HTTP_AUTHORIZATION=f'Bearer {refresh.access_token}')
        return api_client
    return _authenticate


@pytest.fixture
def multiple_users(db):
    return {
        'admin': AdminUserFactory(),
        'manager': ManagerUserFactory(),
        'staff': StaffUserFactory(),
        'auditor': AuditorUserFactory(),
        'inactive': InactiveUserFactory()
    }


# ============================================================================
# Global DB Access
# ============================================================================

@pytest.fixture(autouse=True)
def enable_db_access_for_all_tests(db):
    pass