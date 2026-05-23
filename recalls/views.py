from django.shortcuts import render
from drf_spectacular.utils import extend_schema

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status


from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated

from .models import RecallRequest
from .serializers import RecallRequestSerializer
from users.permissions import CanApproveRecalls
from inventory.models import Batch, AuditLog


class RecallRequestListView(APIView):
    """
    List and create recall requests.
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):

        recalls = RecallRequest.objects.select_related(
            "batch",
            "requested_by"
        ).all()

        serializer = RecallRequestSerializer(
            recalls,
            many=True
        )

        return Response(serializer.data)

    @extend_schema(
        request=RecallRequestSerializer,
        responses=RecallRequestSerializer,
        summary="Create recall request",
        description="Create a new recall request for a batch."
    )
    def post(self, request):

        serializer = RecallRequestSerializer(
            data=request.data
        )

        if serializer.is_valid():

            serializer.save(
                requested_by=request.user
            )

            return Response(
                serializer.data,
                status=status.HTTP_201_CREATED
            )

        return Response(
            serializer.errors,
            status=status.HTTP_400_BAD_REQUEST
        )


class RecallApproveView(APIView):
    """
    Approve recall request.
    Only admin allowed.
    """

    permission_classes = [CanApproveRecalls]

    @extend_schema(
        summary="Approve recall request",
        responses={200: dict},
        tags=["Recalls"],
    )
    def post(self, request, recall_id):

        try:
            recall = RecallRequest.objects.get(id=recall_id)

        except RecallRequest.DoesNotExist:

            return Response(
                {"detail": "Recall request not found"},
                status=status.HTTP_404_NOT_FOUND,
            )
        batch = recall.batch
        AuditLog.objects.create(
    user=request.user,
    action="RECALL",
    entity_type="Batch",
    entity_id=str(batch.id),
    description=f"Approved recall for batch {batch.batch_number}",
)

        recall.approve(request.user)

        return Response(
            {"message": "Recall approved successfully"},
            status=status.HTTP_200_OK,
        )
    
class RecallRejectView(APIView):

    permission_classes = [CanApproveRecalls]

    def post(self, request, recall_id):

        try:

            recall = RecallRequest.objects.get(
                id=recall_id
            )

        except RecallRequest.DoesNotExist:

            return Response(
                {
                    "error": "Recall not found"
                },
                status=404
            )

        rejection_reason = request.data.get(
            "rejection_reason",
            "Rejected by admin"
        )

        try:

            recall.reject(
                request.user,
                rejection_reason
            )

            return Response(
                {
                    "message":
                    "Recall rejected successfully"
                }
            )

        except Exception as e:

            return Response(
                {
                    "error": str(e)
                },
                status=400
            )