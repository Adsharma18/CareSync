from rest_framework import permissions


class IsPatientOwner(permissions.BasePermission):
    """
    Object-level permission allowing only the owner of a patient record
    to view, modify, or delete it.
    """
    def has_object_permission(self, request, view, obj):
        # Read or write permissions are strictly for the owner
        return obj.owner == request.user
