from django.urls import path

from .views import (
    RecallRejectView,
    RecallRequestListView,
    RecallApproveView,
)

app_name = "recalls"

urlpatterns = [

    path(
        "recalls/",
        RecallRequestListView.as_view(),
        name="recall-list",
    ),

    path(
        "recalls/<uuid:recall_id>/approve/",
        RecallApproveView.as_view(),
        name="recall-approve",
    ),
    path(
    "recalls/<uuid:recall_id>/reject/",
    RecallRejectView.as_view(),
    name="reject-recall",
),
]