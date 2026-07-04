from rest_framework.permissions import BasePermission


class IsManager(BasePermission):
    def has_permission(self, request, view):
        return getattr(request, "user_role", None) == "manager"


class IsSalesOrManager(BasePermission):
    def has_permission(self, request, view):
        return getattr(request, "user_role", None) in ["sales", "manager"]


class IsProductionOrManager(BasePermission):
    def has_permission(self, request, view):
        return getattr(request, "user_role", None) in ["production", "manager"]


class IsDispatchOrManager(BasePermission):
    def has_permission(self, request, view):
        return getattr(request, "user_role", None) in ["dispatch", "manager"]


class IsInventoryOrManager(BasePermission):
    def has_permission(self, request, view):
        return getattr(request, "user_role", None) in ["inventory", "manager"]


class IsAnyRole(BasePermission):
    ALLOWED = ["manager", "sales", "production", "dispatch", "inventory"]

    def has_permission(self, request, view):
        return getattr(request, "user_role", None) in self.ALLOWED

