# recalls/services.py

from django.db import transaction
from rest_framework.exceptions import ValidationError

from inventory.models import StockMovement
from .models import RecallRequest


@transaction.atomic
def approve_recall(recall, approved_by):
    """
    Atomic recall approval workflow.

    Steps:
    1. Approve recall request
    2. Mark batch recalled
    3. Create RECALL stock movement

    Rolls back automatically if anything fails.
    """

    # ❌ Already approved
    if recall.status == "APPROVED":
        raise ValidationError("Recall already approved")

    # 🔒 Lock batch row
    batch = recall.batch.__class__.objects.select_for_update().get(
        id=recall.batch.id
    )

    # 1️⃣ Approve recall request
    recall.status = "APPROVED"
    recall.approved_by = approved_by
    recall.save()

    # 2️⃣ Mark batch recalled
    batch.is_recalled = True
    batch.save()

    # 3️⃣ Create ledger entry
    StockMovement.objects.create(
        batch=batch,
        warehouse=None,
        movement_type="RECALL",
        quantity=batch.total_quantity,
        created_by=approved_by,
    )

    return recall