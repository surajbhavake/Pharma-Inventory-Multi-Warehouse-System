"""
recalls/models.py - Recall approval workflow model
"""

import uuid

from django.conf import settings
from django.db import models
from django.utils import timezone


class RecallRequest(models.Model):
    """
    Recall request and approval workflow.
    """

    STATUS_CHOICES = [
        ("PENDING", "Pending Review"),
        ("APPROVED", "Approved"),
        ("REJECTED", "Rejected"),
    ]

    SEVERITY_CHOICES = [
        ("LOW", "Low - Quality Issue"),
        ("MEDIUM", "Medium - Minor Safety"),
        ("HIGH", "High - Major Safety"),
        ("CRITICAL", "Critical - Life Threatening"),
    ]

    # =========================================================================
    # PRIMARY KEY
    # =========================================================================

    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
        db_index=True,
    )

    # =========================================================================
    # BATCH
    # =========================================================================

    batch = models.ForeignKey(
        "inventory.Batch",
        on_delete=models.PROTECT,
        related_name="recall_requests",
        db_index=True,
    )

    # =========================================================================
    # RECALL DETAILS
    # =========================================================================

    reason = models.TextField(
        help_text="Detailed reason for recall request"
    )

    severity = models.CharField(
        max_length=10,
        choices=SEVERITY_CHOICES,
        default="MEDIUM",
        db_index=True,
        help_text="Severity level of the recall",
    )

    # =========================================================================
    # AFFECTED STOCK
    # =========================================================================

    affected_quantity = models.IntegerField(
        null=True,
        blank=True,
        help_text="Total quantity affected by recall",
    )

    affected_warehouses = models.ManyToManyField(
        "inventory.Warehouse",
        related_name="recall_requests",
        blank=True,
        help_text="Warehouses with affected stock",
    )

    # =========================================================================
    # STATUS
    # =========================================================================

    status = models.CharField(
        max_length=10,
        choices=STATUS_CHOICES,
        default="PENDING",
        db_index=True,
    )

    # =========================================================================
    # REQUEST INFO
    # =========================================================================

    requested_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="submitted_recalls",
        db_index=True,
        limit_choices_to={
            "role__in": ["admin", "warehouse_manager"]
        },
    )

    requested_at = models.DateTimeField(
        auto_now_add=True,
        db_index=True,
    )

    # =========================================================================
    # REVIEW INFO
    # =========================================================================

    reviewed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="reviewed_recalls",
        limit_choices_to={"role": "admin"},
    )

    reviewed_at = models.DateTimeField(
        null=True,
        blank=True,
    )

    review_notes = models.TextField(
        blank=True,
        help_text="Admin notes during review",
    )

    # =========================================================================
    # REJECTION INFO
    # =========================================================================

    rejection_reason = models.TextField(
        blank=True,
        help_text="Reason for rejection",
    )

    # =========================================================================
    # EXTERNAL REFERENCES
    # =========================================================================

    regulatory_reference = models.CharField(
        max_length=255,
        blank=True,
        help_text="Regulatory body reference number",
    )

    external_reference = models.CharField(
        max_length=255,
        blank=True,
        help_text="External manufacturer notice reference",
    )

    # =========================================================================
    # METADATA
    # =========================================================================

    updated_at = models.DateTimeField(auto_now=True)

    # =========================================================================
    # MODEL META
    # =========================================================================

    class Meta:
        db_table = "recall_requests"

        verbose_name = "Recall Request"

        verbose_name_plural = "Recall Requests"

        ordering = ["-requested_at"]

        indexes = [
            models.Index(fields=["status"]),
            models.Index(fields=["severity"]),
            models.Index(fields=["requested_at"]),
            models.Index(fields=["batch", "status"]),
            models.Index(fields=["requested_by"]),
        ]

    # =========================================================================
    # STRING REPRESENTATION
    # =========================================================================

    def __str__(self):
        return (
            f"Recall #{self.id} - "
            f"{self.batch.batch_number} "
            f"({self.status})"
        )

    # =========================================================================
    # PERMISSION HELPERS
    # =========================================================================

    def can_approve(self, user):

        return (
            self.status == "PENDING"
            and user.is_authenticated
            and user.role == "admin"
        )

    def can_reject(self, user):

        return (
            self.status == "PENDING"
            and user.is_authenticated
            and user.role == "admin"
        )

    # =========================================================================
    # APPROVE WORKFLOW
    # =========================================================================

    def approve(self, admin_user, review_notes=""):

        if not self.can_approve(admin_user):
            raise ValueError(
                "Cannot approve this recall request"
            )

        # Update recall request
        self.status = "APPROVED"
        self.reviewed_by = admin_user
        self.reviewed_at = timezone.now()
        self.review_notes = review_notes

        self.save()

        # Side effect: mark batch recalled
        self.batch.is_recalled = True
        self.batch.recall_reason = self.reason
        self.batch.recalled_at = timezone.now()
        self.batch.recalled_by = admin_user

        self.batch.save()

        return True

    # =========================================================================
    # REJECT WORKFLOW
    # =========================================================================

    def reject(self, admin_user, rejection_reason):

        if not self.can_reject(admin_user):
            raise ValueError(
                "Cannot reject this recall request"
            )

        self.status = "REJECTED"
        self.reviewed_by = admin_user
        self.reviewed_at = timezone.now()
        self.rejection_reason = rejection_reason

        self.save()

        return True

    # =========================================================================
    # STATUS HELPERS
    # =========================================================================

    def is_pending(self):

        return self.status == "PENDING"

    def is_approved(self):

        return self.status == "APPROVED"

    def is_rejected(self):

        return self.status == "REJECTED"

    # =========================================================================
    # TIME HELPERS
    # =========================================================================

    def get_days_pending(self):

        if self.status != "PENDING":
            return None

        delta = timezone.now() - self.requested_at

        return delta.days

    # =========================================================================
    # SAFE SAVE OVERRIDE
    # =========================================================================

    def save(self, *args, **kwargs):
        """
        Safe state transition validation.

        Prevents changing APPROVED/REJECTED
        recalls back into another state.
        """

        old_instance = None

        # IMPORTANT FIX:
        # only fetch old object if it already exists
        if self.pk and RecallRequest.objects.filter(pk=self.pk).exists():

            old_instance = RecallRequest.objects.get(pk=self.pk)

            # prevent illegal transitions
            if (
                old_instance.status != "PENDING"
                and self.status != old_instance.status
            ):
                raise ValueError(
                    f"Cannot change status from "
                    f"{old_instance.status}. "
                    "Only PENDING recalls can change state."
                )

        super().save(*args, **kwargs)