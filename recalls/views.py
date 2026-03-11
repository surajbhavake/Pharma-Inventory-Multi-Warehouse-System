from django.shortcuts import render

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status

from .models import RecallRequest
from .serializers import RecallRequestSerializer
from users.permissions import CanApproveRecalls


class RecallRequestListView(APIView):
    """
    List recall requests.
    """

    def get(self, request):

        recalls = RecallRequest.objects.select_related(
            "batch", "requested_by"
        ).all()

        serializer = RecallRequestSerializer(recalls, many=True)

        return Response(serializer.data)


class RecallApproveView(APIView):
    """
    Approve recall request.
    Only admin allowed.
    """

    permission_classes = [CanApproveRecalls]

    def post(self, request, recall_id):

        try:
            recall = RecallRequest.objects.get(id=recall_id)
        except RecallRequest.DoesNotExist:
            return Response(
                {"detail": "Recall request not found"},
                status=status.HTTP_404_NOT_FOUND,
            )

        recall.approve(request.user)

        return Response(
            {"message": "Recall approved successfully"},
            status=status.HTTP_200_OK,
        )

# Create your views here.
