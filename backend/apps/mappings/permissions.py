from rest_framework import permissions


class IsMappingPatientOwner(permissions.BasePermission):
    """
    Object-level permission allowing only the owner of the mapped patient
    to view, modify, or remove the mapping.
    """
    def has_object_permission(self, request, view, obj):
        return obj.patient.owner == request.user
