"""
inventory/serializers.py - DRF Serializers for Inventory Models

Includes validation for business rules at serializer level.
"""

from rest_framework import serializers
from django.utils import timezone
from datetime import date

from .models import Medicine, Batch, Warehouse, WarehouseStock, StockMovement


# ============================================================================
# Medicine Serializers
# ============================================================================

class MedicineSerializer(serializers.ModelSerializer):
    """
    Serializer for Medicine model.
    
    Includes computed fields for stock information.
    """
    
    # Computed fields
    total_stock = serializers.SerializerMethodField()
    is_low_stock = serializers.SerializerMethodField()
    active_batches_count = serializers.SerializerMethodField()
    
    class Meta:
        model = Medicine
        fields = [
            'id',
            'name',
            'generic_name',
            'manufacturer',
            'category',
            'dosage_form',
            'strength',
            'storage_type',
            'min_stock_threshold',
            'sku',
            'description',
            'is_active',
            'total_stock',
            'is_low_stock',
            'active_batches_count',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def get_total_stock(self, obj):
        """Calculate total stock across all warehouses"""
        return obj.get_total_stock()
    
    def get_is_low_stock(self, obj):
        """Check if stock is below minimum threshold"""
        return obj.is_low_stock()
    
    def get_active_batches_count(self, obj):
        """Count active batches (not recalled, not expired)"""
        return obj.batches.filter(
            is_recalled=False,
            expiry_date__gte=timezone.now().date()
        ).count()
    
    def validate_sku(self, value):
        """Validate SKU is unique"""
        if self.instance:  # Update
            if Medicine.objects.exclude(pk=self.instance.pk).filter(sku=value).exists():
                raise serializers.ValidationError(
                    f"A medicine with SKU '{value}' already exists."
                )
        else:  # Create
            if Medicine.objects.filter(sku=value).exists():
                raise serializers.ValidationError(
                    f"A medicine with SKU '{value}' already exists."
                )
        return value
    
    def validate_min_stock_threshold(self, value):
        """Validate minimum stock threshold is non-negative"""
        if value < 0:
            raise serializers.ValidationError(
                "Minimum stock threshold cannot be negative."
            )
        return value


class MedicineListSerializer(serializers.ModelSerializer):
    """
    Lightweight serializer for medicine list view.
    Excludes computed fields for better performance.
    """
    
    class Meta:
        model = Medicine
        fields = [
            'id',
            'name',
            'manufacturer',
            'category',
            'dosage_form',
            'strength',
            'storage_type',
            'sku',
            'is_active',
        ]


class MedicineCreateUpdateSerializer(serializers.ModelSerializer):
    """
    Serializer for creating/updating medicines.
    Simpler than detail serializer, no computed fields.
    """
    
    class Meta:
        model = Medicine
        fields = [
            'name',
            'generic_name',
            'manufacturer',
            'category',
            'dosage_form',
            'strength',
            'storage_type',
            'min_stock_threshold',
            'sku',
            'description',
            'is_active',
        ]
    
    def validate(self, attrs):
        """Cross-field validation"""
        # Ensure SKU is uppercase
        if 'sku' in attrs:
            attrs['sku'] = attrs['sku'].upper()
        
        return attrs


# ============================================================================
# Batch Serializers
# ============================================================================

class BatchSerializer(serializers.ModelSerializer):
    """
    Serializer for Batch model.
    
    Includes validation for expiry > manufacture date.
    """
    
    # Nested medicine data
    medicine_name = serializers.CharField(source='medicine.name', read_only=True)
    medicine_sku = serializers.CharField(source='medicine.sku', read_only=True)
    
    # Computed fields
    allocated_quantity = serializers.SerializerMethodField()
    available_quantity = serializers.SerializerMethodField()
    days_until_expiry = serializers.SerializerMethodField()
    is_expired = serializers.SerializerMethodField()
    is_expiring_soon = serializers.SerializerMethodField()
    can_dispatch = serializers.SerializerMethodField()
    
    class Meta:
        model = Batch
        fields = [
            'id',
            'medicine',
            'medicine_name',
            'medicine_sku',
            'batch_number',
            'manufacture_date',
            'expiry_date',
            'total_quantity',
            'allocated_quantity',
            'available_quantity',
            'is_recalled',
            'recall_reason',
            'recalled_at',
            'recalled_by',
            'days_until_expiry',
            'is_expired',
            'is_expiring_soon',
            'can_dispatch',
            'created_at',
            'updated_at',
            'created_by',
        ]
        
        read_only_fields = [
            'id',
            'is_recalled',
            'recall_reason',
            'recalled_at',
            'recalled_by',
            'created_at',
            'updated_at',
            'created_by',
        ]
        validators = [] 
    
    def get_allocated_quantity(self, obj):
        """Get total quantity allocated to warehouses"""
        return obj.get_allocated_quantity()
    
    def get_available_quantity(self, obj):
        """Get unallocated quantity"""
        return obj.get_available_quantity()
    
    def get_days_until_expiry(self, obj):
        """Calculate days until expiry"""
        return obj.days_until_expiry()
    
    def get_is_expired(self, obj):
        """Check if batch has expired"""
        return obj.is_expired()
    
    def get_is_expiring_soon(self, obj):
        """Check if batch is expiring within 30 days"""
        return obj.is_expiring_soon(days=30)
    
    def get_can_dispatch(self, obj):
        """Check if batch can be dispatched"""
        return obj.can_dispatch()
    
    def validate_manufacture_date(self, value):
        """Validate manufacture date is not in the future"""
        if value > date.today():
            raise serializers.ValidationError(
                "Manufacture date cannot be in the future."
            )
        return value
    
    def validate_total_quantity(self, value):
        """Validate total quantity is positive"""
        if value <= 0:
            raise serializers.ValidationError(
                "Total quantity must be greater than zero."
            )
        return value
    
    def validate(self, attrs):
        """
        Cross-field validation.
        
        CRITICAL: Validate expiry_date > manufacture_date
        """
        manufacture_date = attrs.get('manufacture_date')
        expiry_date = attrs.get('expiry_date')
        
        # If updating, get existing values if not provided
        if self.instance:
            manufacture_date = manufacture_date or self.instance.manufacture_date
            expiry_date = expiry_date or self.instance.expiry_date
        
        # Validate expiry > manufacture
        if manufacture_date and expiry_date:
            if expiry_date <= manufacture_date:
                raise serializers.ValidationError({
                    'expiry_date': (
                        f"Expiry date ({expiry_date}) must be after manufacture date ({manufacture_date}). "
                        f"A medicine cannot expire before or on the same day it was manufactured."
                    )
                })
            
            # Additional check: warn if expiry is too soon after manufacture
            days_difference = (expiry_date - manufacture_date).days
            if days_difference < 30:
                raise serializers.ValidationError({
                    'expiry_date': (
                        f"Expiry date is only {days_difference} days after manufacture date. "
                        f"This seems unusually short. Please verify the dates are correct."
                    )
                })
        
        # Validate batch_number uniqueness per medicine
        medicine = attrs.get('medicine')
        batch_number = attrs.get('batch_number')
        
        if medicine and batch_number:
            # Check for duplicate batch number for this medicine
            query = Batch.objects.filter(medicine=medicine, batch_number=batch_number)
            
            if self.instance:
                query = query.exclude(pk=self.instance.pk)
            
            if query.exists():
                raise serializers.ValidationError({
                    'batch_number': (
                        f"Batch number '{batch_number}' already exists for medicine '{medicine.name}'. "
                        f"Each batch number must be unique per medicine."
                    )
                })
        
        return attrs
    
    def create(self, validated_data):
        """Override create to add created_by"""
        user = self.context['request'].user
        validated_data['created_by'] = user
        return super().create(validated_data)


class BatchListSerializer(serializers.ModelSerializer):
    """
    Lightweight serializer for batch list view.
    """
    
    medicine_name = serializers.CharField(source='medicine.name', read_only=True)
    is_expired = serializers.SerializerMethodField()
    
    class Meta:
        model = Batch
        fields = [
            'id',
            'medicine',
            'medicine_name',
            'batch_number',
            'manufacture_date',
            'expiry_date',
            'total_quantity',
            'is_recalled',
            'is_expired',
        ]
    
    def get_is_expired(self, obj):
        return obj.is_expired()


class BatchCreateUpdateSerializer(serializers.ModelSerializer):
    """
    Serializer for creating/updating batches.
    Simplified for write operations.
    """
    
    class Meta:
        model = Batch
        fields = [
            'medicine',
            'batch_number',
            'manufacture_date',
            'expiry_date',
            'total_quantity',
        ]
        validators = [] 
    
    def validate_manufacture_date(self, value):
        """Validate manufacture date is not in the future"""
        if value > date.today():
            raise serializers.ValidationError(
                "Manufacture date cannot be in the future."
            )
        return value
    
    def validate_total_quantity(self, value):
        """Validate total quantity is positive"""
        if value <= 0:
            raise serializers.ValidationError(
                "Total quantity must be greater than zero."
            )
        return value
    
    def validate(self, attrs):
        """
        CRITICAL VALIDATION: Expiry date > Manufacture date
        """
        manufacture_date = attrs.get('manufacture_date')
        expiry_date = attrs.get('expiry_date')
        
        # If updating, get existing values if not provided
        if self.instance:
            manufacture_date = manufacture_date or self.instance.manufacture_date
            expiry_date = expiry_date or self.instance.expiry_date
        
        # CRITICAL: Validate expiry > manufacture
        if manufacture_date and expiry_date:
            if expiry_date <= manufacture_date:
                raise serializers.ValidationError({
                    'expiry_date': (
                        f"Expiry date ({expiry_date}) must be after manufacture date ({manufacture_date}). "
                        f"A medicine cannot expire before or on the same day it was manufactured."
                    )
                })
            
            # Warn if shelf life is suspiciously short
            days_difference = (expiry_date - manufacture_date).days
            if days_difference < 30:
                raise serializers.ValidationError({
                    'expiry_date': (
                        f"Expiry date is only {days_difference} days after manufacture. "
                        f"This seems unusually short. Please verify the dates."
                    )
                })
        
        # Validate batch uniqueness per medicine
        medicine = attrs.get('medicine')
        batch_number = attrs.get('batch_number')
        
        if medicine and batch_number:
            query = Batch.objects.filter(medicine=medicine, batch_number=batch_number)
            
            if self.instance:
                query = query.exclude(pk=self.instance.pk)
            
            if query.exists():
                raise serializers.ValidationError({
                    'batch_number': (
                        f"Batch '{batch_number}' already exists for '{medicine.name}'. "
                        f"Each batch number must be unique per medicine."
                    )
                })
        
        return attrs


# ============================================================================
# Warehouse Serializers (Basic)
# ============================================================================

class WarehouseSerializer(serializers.ModelSerializer):
    """Basic warehouse serializer"""
    
    manager_name = serializers.CharField(source='manager.get_full_name', read_only=True)
    current_capacity = serializers.SerializerMethodField()
    
    class Meta:
        model = Warehouse
        fields = [
            'id',
            'name',
            'code',
            'address',
            'city',
            'state',
            'country',
            'pincode',
            'phone',
            'email',
            'total_capacity',
            'current_capacity',
            'manager',
            'manager_name',
            'is_active',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def get_current_capacity(self, obj):
        """Get current stock level"""
        return obj.get_current_capacity()


# ============================================================================
# Warehouse Stock Serializers (Basic)
# ============================================================================

class WarehouseStockSerializer(serializers.ModelSerializer):
    """Warehouse stock serializer"""
    
    warehouse_name = serializers.CharField(source='warehouse.name', read_only=True)
    batch_number = serializers.CharField(source='batch.batch_number', read_only=True)
    medicine_name = serializers.CharField(source='batch.medicine.name', read_only=True)
    
    class Meta:
        model = WarehouseStock
        fields = [
            'id',
            'warehouse',
            'warehouse_name',
            'batch',
            'batch_number',
            'medicine_name',
            'quantity',
            'created_at',
            'updated_at',
            'last_movement_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'last_movement_at']