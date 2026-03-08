from django.contrib import admin
from .models import User


@admin.register(User)
class UserAdmin(admin.ModelAdmin):
    list_display = (
        "email",
        "username",
        "role",
        "assigned_warehouse",
        "is_active",
        "is_staff",
        "date_joined",
    )

    list_filter = ("role", "is_active", "is_staff")

    search_fields = ("email", "username", "first_name", "last_name")

    ordering = ("-date_joined",)