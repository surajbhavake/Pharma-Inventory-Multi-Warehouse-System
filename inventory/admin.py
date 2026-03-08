from django.contrib import admin
from .models import (
    Medicine,
    Batch,
    Warehouse,
    WarehouseStock,
    StockMovement
)


@admin.register(Medicine)
class MedicineAdmin(admin.ModelAdmin):
    list_display = (
        "name",
        "manufacturer",
        "category",
        "strength",
        "storage_type",
        "min_stock_threshold",
        "is_active",
    )

    search_fields = ("name", "manufacturer", "sku")
    list_filter = ("category", "storage_type", "is_active")


@admin.register(Batch)
class BatchAdmin(admin.ModelAdmin):
    list_display = (
        "medicine",
        "batch_number",
        "manufacture_date",
        "expiry_date",
        "total_quantity",
        "is_recalled",
    )

    search_fields = ("batch_number",)
    list_filter = ("is_recalled", "expiry_date")


@admin.register(Warehouse)
class WarehouseAdmin(admin.ModelAdmin):
    list_display = (
        "name",
        "code",
        "city",
        "state",
        "is_active",
    )

    search_fields = ("name", "code", "city")
    list_filter = ("city", "is_active")


@admin.register(WarehouseStock)
class WarehouseStockAdmin(admin.ModelAdmin):
    list_display = (
        "warehouse",
        "batch",
        "quantity",
        "updated_at",
    )

    list_filter = ("warehouse",)
    search_fields = ("batch__batch_number",)


@admin.register(StockMovement)
class StockMovementAdmin(admin.ModelAdmin):
    list_display = (
        "batch",
        "warehouse",
        "movement_type",
        "quantity",
        "performed_by",
        "performed_at",
    )

    list_filter = ("movement_type", "warehouse")
    search_fields = ("batch__batch_number",)