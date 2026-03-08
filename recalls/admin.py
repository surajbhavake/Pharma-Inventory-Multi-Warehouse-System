from django.contrib import admin
from .models import RecallRequest


@admin.register(RecallRequest)
class RecallRequestAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "batch",
        "severity",
        "status",
        "requested_by",
        "requested_at",
    )

    list_filter = ("status", "severity")

    search_fields = ("batch__batch_number",)

    ordering = ("-requested_at",)