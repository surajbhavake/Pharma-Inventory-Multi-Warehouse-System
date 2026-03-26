"""
inventory/filters.py - Custom Filter Classes for Inventory Models

Provides advanced filtering capabilities using django-filter.
"""

import django_filters
from django.utils import timezone
from datetime import timedelta

from .models import Medicine, Batch
from .models import Medicine, Batch, Warehouse, WarehouseStock


class MedicineFilter(django_filters.FilterSet):
    """
    Custom filter for Medicine model.
    
    Filters:
    - category: Exact match or multiple categories
    - storage_type: Exact match or multiple storage types
    - is_active: Boolean filter
    - manufacturer: Case-insensitive contains
    - min_stock_threshold_gte: Minimum threshold greater than or equal
    - min_stock_threshold_lte: Minimum threshold less than or equal
    """
    
    # Exact filters
    category = django_filters.CharFilter(
        field_name='category',
        lookup_expr='iexact',
        help_text='Filter by category (case-insensitive)'
    )
    
    storage_type = django_filters.ChoiceFilter(
        field_name='storage_type',
        choices=Medicine.STORAGE_TYPE_CHOICES,
        help_text='Filter by storage type'
    )
    
    is_active = django_filters.BooleanFilter(
        field_name='is_active',
        help_text='Filter by active status'
    )
    
    # Contains filters
    manufacturer = django_filters.CharFilter(
        field_name='manufacturer',
        lookup_expr='icontains',
        help_text='Filter by manufacturer name (contains)'
    )
    
    name_contains = django_filters.CharFilter(
        field_name='name',
        lookup_expr='icontains',
        help_text='Filter by medicine name (contains)'
    )
    
    # Range filters
    min_stock_threshold_gte = django_filters.NumberFilter(
        field_name='min_stock_threshold',
        lookup_expr='gte',
        help_text='Minimum threshold greater than or equal to'
    )
    
    min_stock_threshold_lte = django_filters.NumberFilter(
        field_name='min_stock_threshold',
        lookup_expr='lte',
        help_text='Minimum threshold less than or equal to'
    )
    
    # Multiple choice filters
    categories = django_filters.MultipleChoiceFilter(
        field_name='category',
        choices=[],  # Dynamically populated
        help_text='Filter by multiple categories (comma-separated)'
    )
    
    storage_types = django_filters.MultipleChoiceFilter(
        field_name='storage_type',
        choices=Medicine.STORAGE_TYPE_CHOICES,
        help_text='Filter by multiple storage types (comma-separated)'
    )
    
    class Meta:
        model = Medicine
        fields = [
            'category',
            'storage_type',
            'is_active',
            'manufacturer',
        ]
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        
        # Dynamically populate category choices
        categories = Medicine.objects.values_list('category', flat=True).distinct()
        self.filters['categories'].extra['choices'] = [(cat, cat) for cat in categories if cat]


class BatchFilter(django_filters.FilterSet):
    """
    Custom filter for Batch model.
    
    Filters:
    - medicine: Filter by medicine ID
    - is_recalled: Boolean filter for recall status
    - manufacture_date_before: Manufactured before date
    - manufacture_date_after: Manufactured after date
    - expiry_date_before: Expires before date
    - expiry_date_after: Expires after date
    - is_expired: Filter expired batches
    - expiring_soon: Filter batches expiring within X days
    """
    
    # Foreign key filter
    medicine = django_filters.UUIDFilter(
        field_name='medicine__id',
        help_text='Filter by medicine ID'
    )
    
    medicine_name = django_filters.CharFilter(
        field_name='medicine__name',
        lookup_expr='icontains',
        help_text='Filter by medicine name (contains)'
    )
    
    # Boolean filter
    is_recalled = django_filters.BooleanFilter(
        field_name='is_recalled',
        help_text='Filter by recall status'
    )
    
    # Date filters - Manufacture date
    manufacture_date_before = django_filters.DateFilter(
        field_name='manufacture_date',
        lookup_expr='lte',
        help_text='Manufactured on or before this date (YYYY-MM-DD)'
    )
    
    manufacture_date_after = django_filters.DateFilter(
        field_name='manufacture_date',
        lookup_expr='gte',
        help_text='Manufactured on or after this date (YYYY-MM-DD)'
    )
    
    # Date filters - Expiry date
    expiry_date_before = django_filters.DateFilter(
        field_name='expiry_date',
        lookup_expr='lte',
        help_text='Expires on or before this date (YYYY-MM-DD)'
    )
    
    expiry_date_after = django_filters.DateFilter(
        field_name='expiry_date',
        lookup_expr='gte',
        help_text='Expires on or after this date (YYYY-MM-DD)'
    )
    
    # Custom filter: Is expired
    is_expired = django_filters.BooleanFilter(
        method='filter_is_expired',
        help_text='Filter expired batches (true/false)'
    )
    
    # Custom filter: Expiring soon
    expiring_within_days = django_filters.NumberFilter(
        method='filter_expiring_within_days',
        help_text='Filter batches expiring within X days'
    )
    
    # Batch number search
    batch_number_contains = django_filters.CharFilter(
        field_name='batch_number',
        lookup_expr='icontains',
        help_text='Filter by batch number (contains)'
    )
    
    class Meta:
        model = Batch
        fields = [
            'medicine',
            'is_recalled',
            'manufacture_date',
            'expiry_date',
        ]
    
    def filter_is_expired(self, queryset, name, value):
        """
        Custom filter method for expired batches.
        
        Args:
            value: True to get expired, False to get non-expired
        """
        today = timezone.now().date()
        
        if value:
            # Get expired batches
            return queryset.filter(expiry_date__lt=today)
        else:
            # Get non-expired batches
            return queryset.filter(expiry_date__gte=today)
    
    def filter_expiring_within_days(self, queryset, name, value):
        """
        Custom filter method for batches expiring within X days.
        
        Args:
            value: Number of days (e.g., 30 for batches expiring in next 30 days)
        """
        today = timezone.now().date()
        future_date = today + timedelta(days=int(value))
        
        return queryset.filter(
            expiry_date__gte=today,
            expiry_date__lte=future_date,
            is_recalled=False
        )


class WarehouseFilter(django_filters.FilterSet):
    """
    Custom filter for Warehouse model.
    """
    
    city = django_filters.CharFilter(
        field_name='city',
        lookup_expr='icontains',
        help_text='Filter by city name (contains)'
    )
    
    state = django_filters.CharFilter(
        field_name='state',
        lookup_expr='icontains',
        help_text='Filter by state name (contains)'
    )
    
    is_active = django_filters.BooleanFilter(
        field_name='is_active',
        help_text='Filter by active status'
    )
    
    manager = django_filters.UUIDFilter(
        field_name='manager__id',
        help_text='Filter by manager user ID'
    )
    
    from .models import Warehouse
    
    class Meta:
        model = Warehouse
        fields = ['city', 'state', 'is_active', 'manager']