import pytest
from django.urls import reverse
from inventory.models import WarehouseStock, StockMovement


@pytest.mark.django_db
class TestStockTransfer:

    def test_transfer_success(
        self,
        admin_client,
        batch,
        warehouse,
        warehouse_factory,
    ):
        """
        ✅ ACID TEST:
        - Source decremented
        - Destination incremented
        - 2 movement entries created
        - Same reference_id
        """

        source = warehouse
        destination = warehouse_factory()

        source_stock = WarehouseStock.objects.create(
            batch=batch,
            warehouse=source,
            quantity=100
        )

        url = reverse("inventory:stock-transfer")

        response = admin_client.post(
            url,
            {
                "batch_id": batch.id,
                "source_warehouse_id": source.id,
                "destination_warehouse_id": destination.id,
                "quantity": 50,
            },
            format="json"
        )

        assert response.status_code == 200

        source_stock.refresh_from_db()
        dest_stock = WarehouseStock.objects.get(
            batch=batch,
            warehouse=destination
        )

        assert source_stock.quantity == 50
        assert dest_stock.quantity == 50

        movements = StockMovement.objects.all()
        assert movements.count() == 2

        # Check same reference_id
        reference_ids = set(movements.values_list("reference_id", flat=True))
        assert len(reference_ids) == 1

    # ---------------------------------------------------------

    def test_transfer_insufficient_stock(
        self,
        admin_client,
        batch,
        warehouse,
        warehouse_factory,
    ):
        """
        ❌ Should fail if insufficient stock
        """

        source = warehouse
        destination = warehouse_factory()

        WarehouseStock.objects.create(
            batch=batch,
            warehouse=source,
            quantity=10
        )

        url = reverse("inventory:stock-transfer")

        response = admin_client.post(
            url,
            {
                "batch_id": batch.id,
                "source_warehouse_id": source.id,
                "destination_warehouse_id": destination.id,
                "quantity": 50,
            },
            format="json"
        )

        assert response.status_code == 400

    # ---------------------------------------------------------

    def test_transfer_atomicity_no_partial_updates(
        self,
        admin_client,
        batch,
        warehouse,
        warehouse_factory,
        monkeypatch
    ):
        """
        🔥 CRITICAL:
        If failure occurs → NO partial update
        """

        source = warehouse
        destination = warehouse_factory()

        source_stock = WarehouseStock.objects.create(
            batch=batch,
            warehouse=source,
            quantity=100
        )

        url = reverse("inventory:stock-transfer")

        # Force failure during movement creation
        def fail_create(*args, **kwargs):
            raise Exception("Simulated failure")

        monkeypatch.setattr(
            "inventory.models.StockMovement.objects.create",
            fail_create
        )

        response = admin_client.post(
            url,
            {
                "batch_id": batch.id,
                "source_warehouse_id": source.id,
                "destination_warehouse_id": destination.id,
                "quantity": 50,
            },
            format="json"
        )

        assert response.status_code == 400

        source_stock.refresh_from_db()
        assert source_stock.quantity == 100  # unchanged

    # ---------------------------------------------------------

    def test_transfer_creates_destination_if_missing(
        self,
        admin_client,
        batch,
        warehouse,
        warehouse_factory,
    ):
        """
        ✅ Destination stock auto-created
        """

        source = warehouse
        destination = warehouse_factory()

        WarehouseStock.objects.create(
            batch=batch,
            warehouse=source,
            quantity=100
        )

        url = reverse("inventory:stock-transfer")

        response = admin_client.post(
            url,
            {
                "batch_id": batch.id,
                "source_warehouse_id": source.id,
                "destination_warehouse_id": destination.id,
                "quantity": 30,
            },
            format="json"
        )

        assert response.status_code == 200

        dest_stock = WarehouseStock.objects.get(
            batch=batch,
            warehouse=destination
        )

        assert dest_stock.quantity == 30