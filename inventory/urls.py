"""
inventory/urls.py - URL Configuration for Inventory API
"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import (
    StockAllocationView,
    StockTransferView,
    StockMovementViewSet,
    LowStockAlertView,
    MedicineViewSet,
    BatchViewSet,
    WarehouseViewSet,
    WarehouseStockViewSet,
    AuditLogViewSet,
)

app_name = "inventory"

# Router
router = DefaultRouter()
router.register(r"medicines", MedicineViewSet, basename="medicine")
router.register(r"batches", BatchViewSet, basename="batch")
router.register(r"warehouses", WarehouseViewSet, basename="warehouse")
router.register(r"movements", StockMovementViewSet, basename="movements")
router.register(
    r'warehouse-stock',
    WarehouseStockViewSet,
    basename='warehouse-stock'
)
router.register(
    r"audit-logs",
    AuditLogViewSet,
    basename="audit-logs"
)

urlpatterns = [
    # Router endpoints
    path("", include(router.urls)),

    # Custom endpoints
    path("stock/allocate/", StockAllocationView.as_view(), name="stock-allocate"),
    path(
    "stock-allocation/",
    StockAllocationView.as_view(),
    name="stock-allocation",
),
    path("stock/transfer/", StockTransferView.as_view(), name="stock-transfer"),
    path("alerts/low-stock/", LowStockAlertView.as_view(), name="low-stock-alert"),
]