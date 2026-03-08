"""
inventory/models.py - Core inventory models for batch-level pharmaceutical tracking
"""

from django.db import models
from django.core.validators import MinValueValidator
from django.utils import timezone
from django.conf import settings
import uuid


class Medicine(models.Model):
    """
    Medicine master catalog.
    Each medicine represents a unique pharmaceutical product.
    """
    
    STORAGE_TYPE_CHOICES = [
        ('refrigerated', 'Refrigerated (2-8°C)'),
        ('frozen', 'Frozen (-20°C)'),
        ('room_temp', 'Room Temperature'),
        ('controlled', 'Controlled Substance'),
    ]
    
    # Primary key
    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
        db_index=True
    )
    
    # Medicine details
    name = models.CharField(
        max_length=255,
        db_index=True,
        help_text='Medicine name'
    )
    generic_name = models.CharField(
        max_length=255,
        blank=True,
        help_text='Generic/scientific name'
    )
    manufacturer = models.CharField(
        max_length=255,
        db_index=True,
        help_text='Manufacturer name'
    )
    
    # Classification
    category = models.CharField(
        max_length=100,
        db_index=True,
        help_text='Medicine category (e.g., Antibiotic, Analgesic)'
    )
    dosage_form = models.CharField(
        max_length=100,
        help_text='Dosage form (e.g., Tablet, Syrup, Injection)'
    )
    strength = models.CharField(
        max_length=50,
        help_text='Strength (e.g., 500mg, 10ml)'
    )
    
    # Storage requirements
    storage_type = models.CharField(
        max_length=20,
        choices=STORAGE_TYPE_CHOICES,
        default='room_temp',
        db_index=True
    )
    
    # Stock management
    min_stock_threshold = models.IntegerField(
        default=10,
        validators=[MinValueValidator(0)],
        help_text='Minimum stock level before alert'
    )
    
    # Unique constraint: same medicine from same manufacturer
    sku = models.CharField(
        max_length=100,
        unique=True,
        db_index=True,
        help_text='Stock Keeping Unit (unique identifier)'
    )
    
    # Metadata
    description = models.TextField(blank=True)
    is_active = models.BooleanField(default=True, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'medicines'
        verbose_name = 'Medicine'
        verbose_name_plural = 'Medicines'
        ordering = ['name']
        indexes = [
            models.Index(fields=['name', 'manufacturer']),
            models.Index(fields=['category']),
            models.Index(fields=['is_active']),
        ]
    
    def __str__(self):
        return f"{self.name} ({self.strength}) - {self.manufacturer}"
    
    def get_total_stock(self):
        """Calculate total stock across all warehouses"""
        return self.batches.aggregate(
            total=models.Sum('warehouse_stocks__quantity')
        )['total'] or 0
    
    def is_low_stock(self):
        """Check if total stock is below minimum threshold"""
        return self.get_total_stock() < self.min_stock_threshold


class Batch(models.Model):
    """
    Individual batch of a medicine.
    Each batch has unique manufacture/expiry dates and batch number.
    This is critical for recalls and compliance.
    """
    
    # Primary key
    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
        db_index=True
    )
    
    # Foreign key to medicine
    medicine = models.ForeignKey(
        Medicine,
        on_delete=models.PROTECT,  # Cannot delete medicine if batches exist
        related_name='batches',
        db_index=True
    )
    
    # Batch identification
    batch_number = models.CharField(
        max_length=100,
        db_index=True,
        help_text='Manufacturer batch/lot number'
    )
    
    # Dates
    manufacture_date = models.DateField(db_index=True)
    expiry_date = models.DateField(db_index=True)
    
    # Quantity tracking
    total_quantity = models.IntegerField(
        validators=[MinValueValidator(0)],
        help_text='Total quantity in this batch (all warehouses combined)'
    )
    
    # Recall status
    is_recalled = models.BooleanField(
        default=False,
        db_index=True,
        help_text='Whether this batch has been recalled'
    )
    recall_reason = models.TextField(
        blank=True,
        help_text='Reason for recall (if recalled)'
    )
    recalled_at = models.DateTimeField(null=True, blank=True)
    recalled_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='recalled_batches'
    )
    
    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='created_batches'
    )
    
    class Meta:
        db_table = 'batches'
        verbose_name = 'Batch'
        verbose_name_plural = 'Batches'
        ordering = ['-manufacture_date']
        unique_together = [['medicine', 'batch_number']]  # Unique batch number per medicine
        indexes = [
            models.Index(fields=['batch_number']),
            models.Index(fields=['expiry_date']),
            models.Index(fields=['is_recalled']),
            models.Index(fields=['medicine', 'expiry_date']),
        ]
        constraints = [
            models.CheckConstraint(
                check=models.Q(total_quantity__gte=0),
                name='batch_total_quantity_non_negative'
            ),
        ]
    
    def __str__(self):
        return f"{self.medicine.name} - Batch {self.batch_number}"
    
    def is_expired(self):
        """Check if batch has expired"""
        return self.expiry_date < timezone.now().date()
    
    def days_until_expiry(self):
        """Calculate days until expiry"""
        delta = self.expiry_date - timezone.now().date()
        return delta.days
    
    def is_expiring_soon(self, days=30):
        """Check if batch is expiring within specified days"""
        return 0 <= self.days_until_expiry() <= days
    
    def get_allocated_quantity(self):
        """Calculate total quantity allocated across all warehouses"""
        return self.warehouse_stocks.aggregate(
            total=models.Sum('quantity')
        )['total'] or 0
    
    def get_available_quantity(self):
        """Calculate unallocated quantity"""
        return self.total_quantity - self.get_allocated_quantity()
    
    def can_dispatch(self):
        """Check if batch can be dispatched (not recalled and not expired)"""
        return not self.is_recalled and not self.is_expired()


class Warehouse(models.Model):
    """
    Physical warehouse locations.
    Each warehouse stores batches with separate stock levels.
    """
    
    # Primary key
    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
        db_index=True
    )
    
    # Warehouse details
    name = models.CharField(
        max_length=255,
        unique=True,
        db_index=True,
        help_text='Warehouse name'
    )
    code = models.CharField(
        max_length=50,
        unique=True,
        db_index=True,
        help_text='Warehouse code (e.g., WH-001)'
    )
    
    # Location
    address = models.TextField()
    city = models.CharField(max_length=100, db_index=True)
    state = models.CharField(max_length=100)
    country = models.CharField(max_length=100, default='India')
    pincode = models.CharField(max_length=20)
    
    # Contact
    phone = models.CharField(max_length=20)
    email = models.EmailField(blank=True)
    
    # Capacity
    total_capacity = models.IntegerField(
        validators=[MinValueValidator(0)],
        help_text='Total storage capacity (units)',
        null=True,
        blank=True
    )
    
    # Manager assignment
    manager = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='managed_warehouses',
        limit_choices_to={'role': 'warehouse_manager'}
    )
    
    # Status
    is_active = models.BooleanField(default=True, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'warehouses'
        verbose_name = 'Warehouse'
        verbose_name_plural = 'Warehouses'
        ordering = ['name']
        indexes = [
            models.Index(fields=['code']),
            models.Index(fields=['is_active']),
            models.Index(fields=['city']),
        ]
    
    def __str__(self):
        return f"{self.name} ({self.code})"
    
    def get_current_capacity(self):
        """Calculate current stock level"""
        return self.warehouse_stocks.aggregate(
            total=models.Sum('quantity')
        )['total'] or 0
    
    def get_available_capacity(self):
        """Calculate remaining capacity"""
        if self.total_capacity:
            return self.total_capacity - self.get_current_capacity()
        return None
    
    def is_at_capacity(self):
        """Check if warehouse is at full capacity"""
        if self.total_capacity:
            return self.get_current_capacity() >= self.total_capacity
        return False


class WarehouseStock(models.Model):
    """
    Stock levels for each batch at each warehouse.
    
    CRITICAL CONSTRAINTS:
    1. UNIQUE(warehouse, batch) - One stock record per batch per warehouse
    2. CHECK(quantity >= 0) - Stock cannot be negative
    3. Sum of all warehouse stocks <= batch total_quantity
    """
    
    # Primary key
    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
        db_index=True
    )
    
    # Foreign keys
    warehouse = models.ForeignKey(
        Warehouse,
        on_delete=models.PROTECT,
        related_name='warehouse_stocks',
        db_index=True
    )
    batch = models.ForeignKey(
        Batch,
        on_delete=models.PROTECT,
        related_name='warehouse_stocks',
        db_index=True
    )
    
    # Stock quantity
    quantity = models.IntegerField(
        default=0,
        validators=[MinValueValidator(0)],
        help_text='Current quantity in this warehouse'
    )
    
    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    last_movement_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        db_table = 'warehouse_stock'
        verbose_name = 'Warehouse Stock'
        verbose_name_plural = 'Warehouse Stocks'
        unique_together = [['warehouse', 'batch']]  # CRITICAL: One record per batch per warehouse
        ordering = ['-updated_at']
        indexes = [
            models.Index(fields=['warehouse', 'batch']),
            models.Index(fields=['quantity']),
            models.Index(fields=['updated_at']),
        ]
        constraints = [
            # CRITICAL: Ensure stock quantity is never negative
            models.CheckConstraint(
                check=models.Q(quantity__gte=0),
                name='warehouse_stock_quantity_non_negative'
            ),
        ]
    
    def __str__(self):
        return f"{self.warehouse.code} - {self.batch.batch_number}: {self.quantity} units"
    
    def can_transfer(self, quantity):
        """Check if sufficient stock available for transfer"""
        return self.quantity >= quantity and quantity > 0


class StockMovement(models.Model):
    """
    Immutable ledger of all stock movements (append-only).
    Every stock change creates a ledger entry for audit trail.
    
    Movement Types:
    - ALLOCATION: Initial stock allocated to warehouse from batch
    - TRANSFER_OUT: Stock transferred out of warehouse
    - TRANSFER_IN: Stock transferred into warehouse
    - DISPATCH: Stock dispatched/sold from warehouse
    - ADJUSTMENT: Manual stock adjustment (with reason)
    - RECALL: Stock removed due to recall
    """
    
    MOVEMENT_TYPE_CHOICES = [
        ('ALLOCATION', 'Initial Allocation'),
        ('TRANSFER_OUT', 'Transfer Out'),
        ('TRANSFER_IN', 'Transfer In'),
        ('DISPATCH', 'Dispatch/Sale'),
        ('ADJUSTMENT', 'Manual Adjustment'),
        ('RECALL', 'Recall Removal'),
    ]
    
    # Primary key
    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
        db_index=True
    )
    
    # Foreign keys
    batch = models.ForeignKey(
        Batch,
        on_delete=models.PROTECT,
        related_name='movements',
        db_index=True
    )
    warehouse = models.ForeignKey(
        Warehouse,
        on_delete=models.PROTECT,
        related_name='movements',
        db_index=True
    )
    
    # Movement details
    movement_type = models.CharField(
        max_length=20,
        choices=MOVEMENT_TYPE_CHOICES,
        db_index=True
    )
    quantity = models.IntegerField(
        help_text='Positive for incoming, negative for outgoing'
    )
    
    # Related movements (for transfers)
    reference_id = models.UUIDField(
        null=True,
        blank=True,
        db_index=True,
        help_text='Links TRANSFER_OUT and TRANSFER_IN pairs'
    )
    related_warehouse = models.ForeignKey(
        Warehouse,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='related_movements',
        help_text='Source/destination warehouse for transfers'
    )
    
    # Audit fields
    performed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='performed_movements',
        db_index=True
    )
    performed_at = models.DateTimeField(auto_now_add=True, db_index=True)
    
    # Additional context
    notes = models.TextField(
        blank=True,
        help_text='Reason for movement (required for adjustments)'
    )
    
    class Meta:
        db_table = 'stock_movements'
        verbose_name = 'Stock Movement'
        verbose_name_plural = 'Stock Movements'
        ordering = ['-performed_at']
        indexes = [
            models.Index(fields=['batch', 'warehouse']),
            models.Index(fields=['movement_type']),
            models.Index(fields=['performed_at']),
            models.Index(fields=['performed_by']),
            models.Index(fields=['reference_id']),
        ]
        # Note: No unique constraints - append-only ledger
    
    def __str__(self):
        sign = '+' if self.quantity >= 0 else ''
        return f"{self.movement_type}: {sign}{self.quantity} units - {self.batch.batch_number} @ {self.warehouse.code}"
    
    def save(self, *args, **kwargs):
        """Override save to prevent updates (append-only)"""
        if self.pk:
            raise ValueError("Stock movements cannot be modified (append-only ledger)")
        super().save(*args, **kwargs)
    
    def delete(self, *args, **kwargs):
        """Override delete to prevent deletion (append-only)"""
        raise ValueError("Stock movements cannot be deleted (audit trail)")