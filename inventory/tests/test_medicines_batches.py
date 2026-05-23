"""
inventory/tests/test_medicines_batches.py - Tests for Medicine and Batch ViewSets

Tests cover:
- Medicine CRUD operations
- Batch CRUD operations with date validation
- Search functionality
- Filtering by category and storage_type
- Permission checks
- Expiry date > manufacture date validation
"""

import pytest
from django.urls import reverse
from rest_framework import status
from datetime import date, timedelta

from inventory.models import Medicine, Batch
from conftest import UserFactory, AdminUserFactory, ManagerUserFactory


# ============================================================================
# Medicine Tests
# ============================================================================

@pytest.mark.django_db
class TestMedicineViewSet:
    """Test Medicine ViewSet operations"""
    
    def test_list_medicines(self, authenticated_client, db):
        """Test listing medicines"""
        # Create test medicines
        Medicine.objects.create(
            name='Paracetamol',
            manufacturer='PharmaCorp',
            category='Analgesic',
            dosage_form='Tablet',
            strength='500mg',
            storage_type='room_temp',
            sku='PAR-500-PC',
            min_stock_threshold=100
        )
        Medicine.objects.create(
            name='Insulin',
            manufacturer='BioPharma',
            category='Diabetes',
            dosage_form='Injection',
            strength='100IU/ml',
            storage_type='refrigerated',
            sku='INS-100-BP',
            min_stock_threshold=50
        )
        
        url = reverse('inventory:medicine-list')
        response = authenticated_client.get(url)
        
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data['results']) == 2
    
    def test_search_medicines_by_name(self, authenticated_client, db):
        """Test searching medicines by name"""
        Medicine.objects.create(
            name='Paracetamol',
            manufacturer='PharmaCorp',
            category='Analgesic',
            dosage_form='Tablet',
            strength='500mg',
            storage_type='room_temp',
            sku='PAR-500-PC'
        )
        Medicine.objects.create(
            name='Ibuprofen',
            manufacturer='PharmaCorp',
            category='Analgesic',
            dosage_form='Tablet',
            strength='400mg',
            storage_type='room_temp',
            sku='IBU-400-PC'
        )
        
        url = reverse('inventory:medicine-list')
        response = authenticated_client.get(url, {'search': 'Paracetamol'})
        
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data['results']) == 1
        assert response.data['results'][0]['name'] == 'Paracetamol'
    
    def test_filter_medicines_by_category(self, authenticated_client, db):
        """Test filtering medicines by category"""
        Medicine.objects.create(
            name='Paracetamol',
            manufacturer='PharmaCorp',
            category='Analgesic',
            dosage_form='Tablet',
            strength='500mg',
            storage_type='room_temp',
            sku='PAR-500-PC'
        )
        Medicine.objects.create(
            name='Amoxicillin',
            manufacturer='PharmaCorp',
            category='Antibiotic',
            dosage_form='Capsule',
            strength='500mg',
            storage_type='room_temp',
            sku='AMX-500-PC'
        )
        
        url = reverse('inventory:medicine-list')
        response = authenticated_client.get(url, {'category': 'Analgesic'})
        
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data['results']) == 1
        assert response.data['results'][0]['category'] == 'Analgesic'
    
    def test_filter_medicines_by_storage_type(self, authenticated_client, db):
        """Test filtering medicines by storage type"""
        Medicine.objects.create(
            name='Paracetamol',
            manufacturer='PharmaCorp',
            category='Analgesic',
            dosage_form='Tablet',
            strength='500mg',
            storage_type='room_temp',
            sku='PAR-500-PC'
        )
        Medicine.objects.create(
            name='Insulin',
            manufacturer='BioPharma',
            category='Diabetes',
            dosage_form='Injection',
            strength='100IU/ml',
            storage_type='refrigerated',
            sku='INS-100-BP'
        )
        
        url = reverse('inventory:medicine-list')
        response = authenticated_client.get(url, {'storage_type': 'refrigerated'})
        
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data['results']) == 1
        assert response.data['results'][0]['storage_type'] == 'refrigerated'
    
    def test_create_medicine_as_manager(self, manager_client, db):
        """Test creating medicine as warehouse manager"""
        url = reverse('inventory:medicine-list')
        data = {
            'name': 'Aspirin',
            'manufacturer': 'PharmaCorp',
            'category': 'Analgesic',
            'dosage_form': 'Tablet',
            'strength': '75mg',
            'storage_type': 'room_temp',
            'sku': 'ASP-75-PC',
            'min_stock_threshold': 50
        }
        
        response = manager_client.post(url, data, format='json')
        
        assert response.status_code == status.HTTP_201_CREATED
        assert Medicine.objects.filter(sku='ASP-75-PC').exists()
    
    def test_create_medicine_as_staff_forbidden(self, authenticated_client, db):
        """Test that staff cannot create medicines"""
        url = reverse('inventory:medicine-list')
        data = {
            'name': 'Aspirin',
            'manufacturer': 'PharmaCorp',
            'category': 'Analgesic',
            'dosage_form': 'Tablet',
            'strength': '75mg',
            'storage_type': 'room_temp',
            'sku': 'ASP-75-PC'
        }
        
        response = authenticated_client.post(url, data, format='json')
        
        assert response.status_code == status.HTTP_403_FORBIDDEN


# ============================================================================
# Batch Tests
# ============================================================================

@pytest.mark.django_db
class TestBatchViewSet:
    """Test Batch ViewSet operations"""
    
    @pytest.fixture
    def medicine(self, db):
        """Create a test medicine"""
        return Medicine.objects.create(
            name='Paracetamol',
            manufacturer='PharmaCorp',
            category='Analgesic',
            dosage_form='Tablet',
            strength='500mg',
            storage_type='room_temp',
            sku='PAR-500-PC'
        )
    
    def test_create_batch_success(self, manager_client, medicine):
        """Test creating batch with valid dates"""
        url = reverse('inventory:batch-list')
        data = {
            'medicine': str(medicine.id),
            'batch_number': 'LOT-2024-001',
            'manufacture_date': '2024-01-01',
            'expiry_date': '2025-12-31',
            'total_quantity': 1000
        }
        
        response = manager_client.post(url, data, format='json')
        
        assert response.status_code == status.HTTP_201_CREATED
        assert Batch.objects.filter(batch_number='LOT-2024-001').exists()
    
    def test_create_batch_expiry_before_manufacture_fails(self, manager_client, medicine):
        """Test that expiry date must be after manufacture date"""
        url = reverse('inventory:batch-list')
        data = {
            'medicine': str(medicine.id),
            'batch_number': 'LOT-2024-002',
            'manufacture_date': '2024-12-31',
            'expiry_date': '2024-01-01',  # Before manufacture date!
            'total_quantity': 1000
        }
        
        response = manager_client.post(url, data, format='json')
        
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert 'expiry_date' in response.data
        assert 'must be after manufacture date' in str(response.data['expiry_date']).lower()
    
    def test_create_batch_expiry_same_as_manufacture_fails(self, manager_client, medicine):
        """Test that expiry date cannot be same as manufacture date"""
        url = reverse('inventory:batch-list')
        data = {
            'medicine': str(medicine.id),
            'batch_number': 'LOT-2024-003',
            'manufacture_date': '2024-06-01',
            'expiry_date': '2024-06-01',  # Same date!
            'total_quantity': 1000
        }
        
        response = manager_client.post(url, data, format='json')
        
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert 'expiry_date' in response.data
    
    def test_create_batch_short_shelf_life_warning(self, manager_client, medicine):
        """Test warning for suspiciously short shelf life"""
        url = reverse('inventory:batch-list')
        data = {
            'medicine': str(medicine.id),
            'batch_number': 'LOT-2024-004',
            'manufacture_date': '2024-06-01',
            'expiry_date': '2024-06-15',  # Only 14 days shelf life
            'total_quantity': 1000
        }
        
        response = manager_client.post(url, data, format='json')
        
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert 'expiry_date' in response.data
        assert 'unusually short' in str(response.data['expiry_date']).lower()
    
    def test_create_batch_duplicate_batch_number_fails(self, manager_client, medicine):
        """Test that batch numbers must be unique per medicine"""
        # Create first batch
        Batch.objects.create(
            medicine=medicine,
            batch_number='LOT-2024-001',
            manufacture_date=date(2024, 1, 1),
            expiry_date=date(2025, 12, 31),
            total_quantity=1000
        )
        
        # Try to create duplicate
        url = reverse('inventory:batch-list')
        data = {
            'medicine': str(medicine.id),
            'batch_number': 'LOT-2024-001',  # Duplicate!
            'manufacture_date': '2024-02-01',
            'expiry_date': '2025-12-31',
            'total_quantity': 500
        }
        
        response = manager_client.post(url, data, format='json')
        
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert 'batch_number' in response.data
        assert 'already exists' in str(response.data['batch_number']).lower()
    
    def test_filter_batches_by_medicine(self, authenticated_client, medicine, db):
        """Test filtering batches by medicine"""
        # Create batches for this medicine
        Batch.objects.create(
            medicine=medicine,
            batch_number='LOT-2024-001',
            manufacture_date=date(2024, 1, 1),
            expiry_date=date(2025, 12, 31),
            total_quantity=1000
        )
        
        # Create another medicine with batch
        other_medicine = Medicine.objects.create(
            name='Ibuprofen',
            manufacturer='PharmaCorp',
            category='Analgesic',
            dosage_form='Tablet',
            strength='400mg',
            storage_type='room_temp',
            sku='IBU-400-PC'
        )
        Batch.objects.create(
            medicine=other_medicine,
            batch_number='LOT-2024-002',
            manufacture_date=date(2024, 1, 1),
            expiry_date=date(2025, 12, 31),
            total_quantity=500
        )
        
        url = reverse('inventory:batch-list')
        response = authenticated_client.get(url, {'medicine': str(medicine.id)})
        
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data['results']) == 1
        assert response.data['results'][0]['batch_number'] == 'LOT-2024-001'
    
    def test_get_expiring_soon_batches(self, authenticated_client, medicine, db):
        """Test getting batches expiring soon"""
        # Create batch expiring in 15 days
        expiry_date = date.today() + timedelta(days=15)
        Batch.objects.create(
            medicine=medicine,
            batch_number='LOT-2024-001',
            manufacture_date=date(2024, 1, 1),
            expiry_date=expiry_date,
            total_quantity=1000
        )
        
        # Create batch expiring in 60 days
        Batch.objects.create(
            medicine=medicine,
            batch_number='LOT-2024-002',
            manufacture_date=date(2024, 1, 1),
            expiry_date=date.today() + timedelta(days=60),
            total_quantity=500
        )
        
        url = reverse('inventory:batch-expiring-soon')
        response = authenticated_client.get(url, {'days': 30})
        
        assert response.status_code == status.HTTP_200_OK
        assert response.data['count'] == 1
        assert response.data['batches'][0]['batch_number'] == 'LOT-2024-001'
    
    def test_batch_cannot_be_deleted(self, admin_client, medicine, db):
        """Test that batches cannot be deleted for audit compliance"""
        batch = Batch.objects.create(
            medicine=medicine,
            batch_number='LOT-2024-001',
            manufacture_date=date(2024, 1, 1),
            expiry_date=date(2025, 12, 31),
            total_quantity=1000
        )
        
        url = reverse('inventory:batch-detail', args=[batch.id])
        response = admin_client.delete(url)
        
        assert response.status_code == status.HTTP_403_FORBIDDEN
        assert 'cannot be deleted' in str(response.data['error']).lower()
        assert Batch.objects.filter(id=batch.id).exists()


# ============================================================================
# Run tests with: pytest inventory/tests/test_medicines_batches.py -v
# ============================================================================