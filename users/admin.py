from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import User


@admin.register(User)
class UserAdmin(BaseUserAdmin):

    list_display = (
        "email",
        "username",
        "role",
        "assigned_warehouse",
        "is_active",
        "is_staff",
        "date_joined",
    )

    list_filter = (
        "role",
        "is_active",
        "is_staff",
    )

    search_fields = ("email", "username", "first_name", "last_name")

    ordering = ("-date_joined",)

    fieldsets = (
        ("Authentication", {
            "fields": ("email", "username", "password")
        }),
        ("Personal Info", {
            "fields": ("first_name", "last_name")
        }),
        ("Permissions", {
            "fields": ("role", "is_active", "is_staff", "is_superuser")
        }),
        ("Warehouse Assignment", {
            "fields": ("assigned_warehouse",)
        }),
        ("Important Dates", {
            "fields": ("last_login", "date_joined")
        }),
    )

    add_fieldsets = (
        (None, {
            "classes": ("wide",),
            "fields": (
                "email",
                "username",
                "password1",
                "password2",
                "role",
                "assigned_warehouse",
                "is_active",
                "is_staff",
            ),
        }),
    )

    filter_horizontal = ()