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
