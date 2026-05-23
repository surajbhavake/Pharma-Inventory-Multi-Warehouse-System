from django.shortcuts import render

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status

from .models import WarehouseStock
from .serializers import WarehouseStockSerializer
from users.permissions import CanManageStock, AuditorReadOnly


class WarehouseStockListView(APIView):
    """
    List stock for warehouses.
    Auditors can read, admin/manager can modify.
    """

    permission_classes = [AuditorReadOnly]

    def get(self, request):

        stocks = WarehouseStock.objects.select_related(
            "warehouse", "batch"
        ).all()

        serializer = WarehouseStockSerializer(stocks, many=True)

        return Response(serializer.data)


class StockTransferView(APIView):
    """
    Transfer stock between warehouses.
    Only admin and warehouse_manager allowed.
    """

    permission_classes = [CanManageStock]

    def post(self, request):

        # real transfer logic will go into services.py later
        return Response(
            {"message": "Stock transfer executed"},
            status=status.HTTP_200_OK,
        )
# Create your views here.
"""
inventory/views.py - DRF ViewSets for Inventory Management

Includes advanced filtering, search, and ordering capabilities.
"""

from rest_framework import viewsets, filters, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from drf_spectacular.utils import extend_schema, extend_schema_view, OpenApiParameter, OpenApiResponse

from .models import Medicine, Batch, Warehouse, WarehouseStock
from .serializers import (
    MedicineSerializer,
    MedicineListSerializer,
    MedicineCreateUpdateSerializer,
    BatchSerializer,
    BatchListSerializer,
    BatchCreateUpdateSerializer,
    WarehouseSerializer,
    WarehouseStockSerializer,
)
from .filters import MedicineFilter, BatchFilter
from users.permissions import IsAdminOrManager, IsStaffOrAbove, AuditorReadOnly


# ============================================================================
# Medicine ViewSet
# ============================================================================

@extend_schema_view(
    list=extend_schema(
        summary="List all medicines",
        description="""
        Get a paginated list of all medicines with search and filtering.
        
        **Search:** Search by name, generic_name, manufacturer, or SKU
        
        **Filters:**
        - `category`: Filter by medicine category
        - `storage_type`: Filter by storage requirements
        - `is_active`: Filter active/inactive medicines
        
        **Ordering:** Sort by name, created_at, or min_stock_threshold
        """,
        parameters=[
            OpenApiParameter(
                name='search',
                description='Search in name, generic_name, manufacturer, or SKU',
                required=False,
                type=str
            ),
            OpenApiParameter(
                name='category',
                description='Filter by category',
                required=False,
                type=str
            ),
            OpenApiParameter(
                name='storage_type',
                description='Filter by storage type (refrigerated, frozen, room_temp, controlled)',
                required=False,
                type=str
            ),
            OpenApiParameter(
                name='is_active',
                description='Filter by active status',
                required=False,
                type=bool
            ),
            OpenApiParameter(
                name='ordering',
                description='Sort results (e.g., name, -created_at)',
                required=False,
                type=str
            ),
        ],
        tags=['Inventory - Medicines']
    ),
    retrieve=extend_schema(
        summary="Get medicine details",
        description="Retrieve detailed information about a specific medicine.",
        tags=['Inventory - Medicines']
    ),
    create=extend_schema(
        summary="Create a new medicine",
        description="Add a new medicine to the catalog. Requires admin or warehouse manager role.",
        tags=['Inventory - Medicines']
    ),
    update=extend_schema(
        summary="Update medicine",
        description="Update all fields of a medicine. Requires admin or warehouse manager role.",
        tags=['Inventory - Medicines']
    ),
    partial_update=extend_schema(
        summary="Partially update medicine",
        description="Update specific fields of a medicine. Requires admin or warehouse manager role.",
        tags=['Inventory - Medicines']
    ),
    destroy=extend_schema(
        summary="Delete medicine",
        description="Delete a medicine from the catalog. Requires admin role.",
        tags=['Inventory - Medicines']
    ),
)
class MedicineViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Medicine model with search and filtering.
    
    Permissions:
    - List/Retrieve: Any authenticated user
    - Create/Update: Admin or Warehouse Manager
    - Delete: Admin only
    
    Features:
    - Search by name, generic_name, manufacturer, SKU
    - Filter by category, storage_type, is_active
    - Order by name, created_at, min_stock_threshold
    """
    
    queryset = Medicine.objects.all()
    permission_classes = [IsAuthenticated]
    filter_backends = [
        DjangoFilterBackend,
        filters.SearchFilter,
        filters.OrderingFilter
    ]
    
    # Search configuration
    search_fields = [
        'name',
        'generic_name',
        'manufacturer',
        'sku',
    ]
    
    # Filtering configuration
    filterset_class = MedicineFilter  # Using custom filter class
    
    # Alternative: Simple filtering (if not using custom filter class)
    # filterset_fields = ['category', 'storage_type', 'is_active']
    
    # Ordering configuration
    ordering_fields = [
        'name',
        'created_at',
        'updated_at',
        'min_stock_threshold',
        'manufacturer',
    ]
    ordering = ['name']  # Default ordering
    
    def get_serializer_class(self):
        """Return appropriate serializer based on action"""
        if self.action == 'list':
            return MedicineListSerializer
        elif self.action in ['create', 'update', 'partial_update']:
            return MedicineCreateUpdateSerializer
        return MedicineSerializer
    
    def get_permissions(self):
        """Set permissions based on action"""
        if self.action in ['list', 'retrieve']:
            # Read operations - all authenticated users
            permission_classes = [IsStaffOrAbove]
        elif self.action in ['create', 'update', 'partial_update']:
            # Write operations - admin and managers
            permission_classes = [IsAdminOrManager]
        elif self.action == 'destroy':
            # Delete - admin only
            from users.permissions import IsAdmin
            permission_classes = [IsAdmin]
        else:
            permission_classes = [IsAuthenticated]
        
        return [permission() for permission in permission_classes]
    
    @extend_schema(
        summary="Get low stock medicines",
        description="Get all medicines with stock below minimum threshold.",
        responses={200: MedicineListSerializer(many=True)},
        tags=['Inventory - Medicines']
    )
    @action(detail=False, methods=['get'])
    def low_stock(self, request):
        """Custom action: Get medicines with low stock"""
        low_stock_medicines = [
            medicine for medicine in self.get_queryset()
            if medicine.is_low_stock()
        ]
        
        serializer = MedicineListSerializer(low_stock_medicines, many=True)
        return Response(serializer.data)
    
    @extend_schema(
        summary="Get medicine statistics",
        description="Get statistics for a specific medicine (total stock, batches, etc.).",
        tags=['Inventory - Medicines']
    )
    @action(detail=True, methods=['get'])
    def statistics(self, request, pk=None):
        """Custom action: Get medicine statistics"""
        medicine = self.get_object()
        
        stats = {
            'medicine_id': str(medicine.id),
            'medicine_name': medicine.name,
            'total_stock': medicine.get_total_stock(),
            'is_low_stock': medicine.is_low_stock(),
            'min_threshold': medicine.min_stock_threshold,
            'total_batches': medicine.batches.count(),
            'active_batches': medicine.batches.filter(
                is_recalled=False,
                expiry_date__gte=timezone.now().date()
            ).count(),
            'recalled_batches': medicine.batches.filter(is_recalled=True).count(),
            'expired_batches': medicine.batches.filter(
                expiry_date__lt=timezone.now().date()
            ).count(),
        }
        
        return Response(stats)


# ============================================================================
# Batch ViewSet
# ============================================================================

@extend_schema_view(
    list=extend_schema(
        summary="List all batches",
        description="""
        Get a paginated list of all medicine batches with filtering.
        
        **Filters:**
        - `medicine`: Filter by medicine ID
        - `is_recalled`: Filter recalled/active batches
        - `expiry_date_before`: Batches expiring before date
        - `expiry_date_after`: Batches expiring after date
        - `is_expired`: Filter expired batches
        
        **Search:** Search by batch_number
        """,
        parameters=[
            OpenApiParameter(
                name='medicine',
                description='Filter by medicine ID',
                required=False,
                type=str
            ),
            OpenApiParameter(
                name='is_recalled',
                description='Filter by recall status',
                required=False,
                type=bool
            ),
            OpenApiParameter(
                name='search',
                description='Search by batch number',
                required=False,
                type=str
            ),
        ],
        tags=['Inventory - Batches']
    ),
    retrieve=extend_schema(
        summary="Get batch details",
        description="Retrieve detailed information about a specific batch.",
        tags=['Inventory - Batches']
    ),
    create=extend_schema(
        summary="Create a new batch",
        description="""
        Create a new medicine batch.
        
        **Validations:**
        - Expiry date must be after manufacture date
        - Batch number must be unique per medicine
        - Total quantity must be positive
        - Manufacture date cannot be in the future
        
        Requires admin or warehouse manager role.
        """,
        tags=['Inventory - Batches']
    ),
    update=extend_schema(
        summary="Update batch",
        description="Update batch information. Cannot modify if recalled.",
        tags=['Inventory - Batches']
    ),
    partial_update=extend_schema(
        summary="Partially update batch",
        description="Update specific batch fields. Cannot modify if recalled.",
        tags=['Inventory - Batches']
    ),
)
class BatchViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Batch model with filtering and validation.
    
    Permissions:
    - List/Retrieve: Any authenticated user
    - Create/Update: Admin or Warehouse Manager
    - Cannot delete batches (compliance requirement)
    
    Features:
    - Filter by medicine, recall status, expiry dates
    - Search by batch number
    - Automatic validation of expiry > manufacture dates
    """
    
    queryset = Batch.objects.all().select_related('medicine', 'created_by')
    permission_classes = [IsAuthenticated]
    filter_backends = [
        DjangoFilterBackend,
        filters.SearchFilter,
        filters.OrderingFilter
    ]
    
    # Search configuration
    search_fields = ['batch_number']
    
    # Filtering configuration
    filterset_class = BatchFilter  # Using custom filter class
    
    # Ordering configuration
    ordering_fields = [
        'manufacture_date',
        'expiry_date',
        'created_at',
        'batch_number',
    ]
    ordering = ['-created_at']  # Default: newest first
    
    def get_serializer_class(self):
        """Return appropriate serializer based on action"""
        if self.action == 'list':
            return BatchListSerializer
        elif self.action in ['create', 'update', 'partial_update']:
            return BatchCreateUpdateSerializer
        return BatchSerializer
    
    def get_permissions(self):
        """Set permissions based on action"""
        if self.action in ['list', 'retrieve']:
            permission_classes = [IsStaffOrAbove]
        elif self.action in ['create', 'update', 'partial_update']:
            permission_classes = [IsAdminOrManager]
        elif self.action == 'destroy':
            # Batches cannot be deleted (audit requirement)
            from rest_framework.permissions import IsAdminUser
            permission_classes = [IsAdminUser]  # Even admins should not delete
        else:
            permission_classes = [IsAuthenticated]
        
        return [permission() for permission in permission_classes]
    
    def destroy(self, request, *args, **kwargs):
        """
        Override destroy to prevent batch deletion.
        Batches are immutable for compliance.
        """
        return Response(
            {
                'error': 'Batches cannot be deleted for audit compliance reasons. '
                         'Use the recall process to mark batches as inactive.'
            },
            status=status.HTTP_403_FORBIDDEN
        )
    
    @extend_schema(
        summary="Get expiring batches",
        description="Get batches expiring within specified days (default 30).",
        parameters=[
            OpenApiParameter(
                name='days',
                description='Number of days to check (default: 30)',
                required=False,
                type=int
            ),
        ],
        tags=['Inventory - Batches']
    )
    @action(detail=False, methods=['get'])
    def expiring_soon(self, request):
        """Custom action: Get batches expiring soon"""
        days = int(request.query_params.get('days', 30))
        
        from django.utils import timezone
        from datetime import timedelta
        
        expiry_threshold = timezone.now().date() + timedelta(days=days)
        
        batches = self.get_queryset().filter(
            expiry_date__lte=expiry_threshold,
            expiry_date__gte=timezone.now().date(),
            is_recalled=False
        )
        
        serializer = BatchListSerializer(batches, many=True)
        return Response({
            'days': days,
            'count': batches.count(),
            'batches': serializer.data
        })
    
    @extend_schema(
        summary="Get expired batches",
        description="Get all expired batches that have not been recalled.",
        tags=['Inventory - Batches']
    )
    @action(detail=False, methods=['get'])
    def expired(self, request):
        """Custom action: Get expired batches"""
        from django.utils import timezone
        
        batches = self.get_queryset().filter(
            expiry_date__lt=timezone.now().date(),
            is_recalled=False
        )
        
        serializer = BatchListSerializer(batches, many=True)
        return Response({
            'count': batches.count(),
            'batches': serializer.data
        })
    
    @extend_schema(
        summary="Get batch stock allocation",
        description="Get warehouse stock allocation for a specific batch.",
        tags=['Inventory - Batches']
    )
    @action(detail=True, methods=['get'])
    def stock_allocation(self, request, pk=None):
        """Custom action: Get batch stock allocation across warehouses"""
        batch = self.get_object()
        
        warehouse_stocks = batch.warehouse_stocks.select_related('warehouse').all()
        
        allocation = {
            'batch_id': str(batch.id),
            'batch_number': batch.batch_number,
            'total_quantity': batch.total_quantity,
            'allocated_quantity': batch.get_allocated_quantity(),
            'available_quantity': batch.get_available_quantity(),
            'warehouses': [
                {
                    'warehouse_id': str(stock.warehouse.id),
                    'warehouse_name': stock.warehouse.name,
                    'warehouse_code': stock.warehouse.code,
                    'quantity': stock.quantity,
                }
                for stock in warehouse_stocks
            ]
        }
        
        return Response(allocation)


# ============================================================================
# Warehouse ViewSet (Basic)
# ============================================================================

@extend_schema_view(
    list=extend_schema(
        summary="List all warehouses",
        tags=['Inventory - Warehouses']
    ),
    retrieve=extend_schema(
        summary="Get warehouse details",
        tags=['Inventory - Warehouses']
    ),
    create=extend_schema(
        summary="Create a new warehouse",
        tags=['Inventory - Warehouses']
    ),
)
class WarehouseViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Warehouse model.
    """
    
    queryset = Warehouse.objects.all().select_related('manager')
    serializer_class = WarehouseSerializer
    permission_classes = [AuditorReadOnly]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['name', 'code', 'city']
    ordering_fields = ['name', 'created_at', 'city']
    ordering = ['name']


# Import timezone at top if not already imported
from django.utils import timezone