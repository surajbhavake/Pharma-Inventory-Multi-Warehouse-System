"""
inventory/urls.py - URL Configuration for Inventory API
"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import MedicineViewSet, BatchViewSet, WarehouseViewSet

app_name = 'inventory'

# Create router and register viewsets
router = DefaultRouter()
router.register(r'medicines', MedicineViewSet, basename='medicine')
router.register(r'batches', BatchViewSet, basename='batch')
router.register(r'warehouses', WarehouseViewSet, basename='warehouse')

urlpatterns = [
    # Router URLs
    path('', include(router.urls)),
]

# Generated URLs:
# GET    /api/v1/medicines/                     - List medicines
# POST   /api/v1/medicines/                     - Create medicine
# GET    /api/v1/medicines/{id}/                - Get medicine detail
# PUT    /api/v1/medicines/{id}/                - Update medicine
# PATCH  /api/v1/medicines/{id}/                - Partial update medicine
# DELETE /api/v1/medicines/{id}/                - Delete medicine
# GET    /api/v1/medicines/low_stock/           - Custom action: Low stock medicines
# GET    /api/v1/medicines/{id}/statistics/     - Custom action: Medicine statistics
#
# GET    /api/v1/batches/                       - List batches
# POST   /api/v1/batches/                       - Create batch
# GET    /api/v1/batches/{id}/                  - Get batch detail
# PUT    /api/v1/batches/{id}/                  - Update batch
# PATCH  /api/v1/batches/{id}/                  - Partial update batch
# GET    /api/v1/batches/expiring_soon/         - Custom action: Expiring batches
# GET    /api/v1/batches/expired/               - Custom action: Expired batches
# GET    /api/v1/batches/{id}/stock_allocation/ - Custom action: Stock allocation
#
# GET    /api/v1/warehouses/                    - List warehouses
# POST   /api/v1/warehouses/                    - Create warehouse
# GET    /api/v1/warehouses/{id}/               - Get warehouse detail
# PUT    /api/v1/warehouses/{id}/               - Update warehouse
# PATCH  /api/v1/warehouses/{id}/               - Partial update warehouse