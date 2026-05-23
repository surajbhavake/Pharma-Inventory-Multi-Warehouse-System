from rest_framework import serializers

from .models import RecallRequest


class RecallRequestSerializer(
    serializers.ModelSerializer
):

    # =====================================================
    # BATCH INFO
    # =====================================================

    batch_number = serializers.CharField(
        source="batch.batch_number",
        read_only=True
    )

    medicine_name = serializers.CharField(
        source="batch.medicine.name",
        read_only=True
    )

    # =====================================================
    # USER INFO
    # =====================================================

    requested_by_username = serializers.CharField(
        source="requested_by.username",
        read_only=True
    )

    reviewed_by_username = serializers.CharField(
        source="reviewed_by.username",
        read_only=True
    )

    # =====================================================
    # SERIALIZER META
    # =====================================================

    class Meta:

        model = RecallRequest

        fields = [

            # PRIMARY
            "id",

            # BATCH
            "batch",
            "batch_number",
            "medicine_name",

            # RECALL DETAILS
            "reason",
            "severity",

            # STATUS
            "status",

            # REQUEST INFO
            "requested_by",
            "requested_by_username",
            "requested_at",

            # REVIEW INFO
            "reviewed_by",
            "reviewed_by_username",
            "reviewed_at",
            "review_notes",

            # REJECTION
            "rejection_reason",
        ]

        read_only_fields = [

            "id",

            "status",

            "requested_by",
            "requested_at",

            "reviewed_by",
            "reviewed_at",
        ]