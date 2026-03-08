"""
recalls/models.py - Recall approval workflow model
"""

from django.db import models
from django.conf import settings
from django.utils import timezone
import uuid


class RecallRequest(models.Model):
    """
    Recall request and approval workflow.
    
    Workflow:
    1. Manager submits recall request (PENDING)
    2. Admin reviews and approves/rejects
    3. If approved, batch is marked as recalled
    
    This is NON-CRUD business logic - involves state transitions and side effects.
    """
    
    STATUS_CHOICES = [
        ('PENDING', 'Pending Review'),
        ('APPROVED', 'Approved'),
        ('REJECTED', 'Rejected'),
    ]
    
    SEVERITY_CHOICES = [
        ('LOW', 'Low - Quality Issue'),
        ('MEDIUM', 'Medium - Minor Safety'),
        ('HIGH', 'High - Major Safety'),
        ('CRITICAL', 'Critical - Life Threatening'),
    ]
    
    # Primary key
    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
        db_index=True
    )
    
    # Batch being recalled
    batch = models.ForeignKey(
        'inventory.Batch',
        on_delete=models.PROTECT,
        related_name='recall_requests',
        db_index=True
    )
    
    # Request details
    reason = models.TextField(
        help_text='Detailed reason for recall request'
    )
    severity = models.CharField(
        max_length=10,
        choices=SEVERITY_CHOICES,
        default='MEDIUM',
        db_index=True,
        help_text='Severity level of the recall'
    )
    
    # Affected stock information
    affected_quantity = models.IntegerField(
        help_text='Total quantity affected by recall',
        null=True,
        blank=True
    )
    affected_warehouses = models.ManyToManyField(
        'inventory.Warehouse',
        related_name='recall_requests',
        blank=True,
        help_text='Warehouses with affected stock'
    )
    
    # Workflow status
    status = models.CharField(
        max_length=10,
        choices=STATUS_CHOICES,
        default='PENDING',
        db_index=True
    )
    
    # Submission information
    requested_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='submitted_recalls',
        db_index=True,
        limit_choices_to={'role__in': ['admin', 'warehouse_manager']}
    )
    requested_at = models.DateTimeField(auto_now_add=True, db_index=True)
    
    # Review information
    reviewed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='reviewed_recalls',
        limit_choices_to={'role': 'admin'}
    )
    reviewed_at = models.DateTimeField(null=True, blank=True)
    review_notes = models.TextField(
        blank=True,
        help_text='Admin notes during review'
    )
    
    # Rejection information (if rejected)
    rejection_reason = models.TextField(
        blank=True,
        help_text='Reason for rejection (if rejected)'
    )
    
    # Additional context
    regulatory_reference = models.CharField(
        max_length=255,
        blank=True,
        help_text='Regulatory body reference number (if applicable)'
    )
    external_reference = models.CharField(
        max_length=255,
        blank=True,
        help_text='External reference (manufacturer notice, etc.)'
    )
    
    # Metadata
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'recall_requests'
        verbose_name = 'Recall Request'
        verbose_name_plural = 'Recall Requests'
        ordering = ['-requested_at']
        indexes = [
            models.Index(fields=['status']),
            models.Index(fields=['severity']),
            models.Index(fields=['requested_at']),
            models.Index(fields=['batch', 'status']),
            models.Index(fields=['requested_by']),
        ]
    
    def __str__(self):
        return f"Recall Request #{self.id} - {self.batch.batch_number} ({self.get_status_display()})"
    
    def can_approve(self, user):
        """Check if user can approve this recall request"""
        return (
            self.status == 'PENDING' and
            user.is_authenticated and
            user.role == 'admin'
        )
    
    def can_reject(self, user):
        """Check if user can reject this recall request"""
        return (
            self.status == 'PENDING' and
            user.is_authenticated and
            user.role == 'admin'
        )
    
    def approve(self, admin_user, review_notes=''):
        """
        Approve the recall request.
        
        Side effects:
        1. Updates recall request status to APPROVED
        2. Marks the batch as recalled
        3. Records review information
        
        This is NON-CRUD business logic.
        """
        if not self.can_approve(admin_user):
            raise ValueError("Cannot approve this recall request")
        
        # Update recall request
        self.status = 'APPROVED'
        self.reviewed_by = admin_user
        self.reviewed_at = timezone.now()
        self.review_notes = review_notes
        self.save()
        
        # Mark batch as recalled (SIDE EFFECT)
        self.batch.is_recalled = True
        self.batch.recall_reason = self.reason
        self.batch.recalled_at = timezone.now()
        self.batch.recalled_by = admin_user
        self.batch.save()
        
        return True
    
    def reject(self, admin_user, rejection_reason):
        """
        Reject the recall request.
        
        Side effects:
        1. Updates recall request status to REJECTED
        2. Records rejection reason and review information
        3. Batch remains NOT recalled
        """
        if not self.can_reject(admin_user):
            raise ValueError("Cannot reject this recall request")
        
        # Update recall request
        self.status = 'REJECTED'
        self.reviewed_by = admin_user
        self.reviewed_at = timezone.now()
        self.rejection_reason = rejection_reason
        self.save()
        
        return True
    
    def is_pending(self):
        """Check if recall request is pending review"""
        return self.status == 'PENDING'
    
    def is_approved(self):
        """Check if recall request is approved"""
        return self.status == 'APPROVED'
    
    def is_rejected(self):
        """Check if recall request is rejected"""
        return self.status == 'REJECTED'
    
    def get_days_pending(self):
        """Calculate days since request submission"""
        if self.status != 'PENDING':
            return None
        delta = timezone.now() - self.requested_at
        return delta.days
    
    def save(self, *args, **kwargs):
        """Override save to validate state transitions"""
        if self.pk:  # Existing record
            old_instance = RecallRequest.objects.get(pk=self.pk)
            
            # Validate status transitions
            if old_instance.status != 'PENDING' and self.status != old_instance.status:
                raise ValueError(
                    f"Cannot change status from {old_instance.status}. "
                    "Recall requests can only be updated when PENDING."
                )
        
        super().save(*args, **kwargs)