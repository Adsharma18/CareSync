from rest_framework import permissions


class IsDoctorCreatorOrReadOnly(permissions.BasePermission):
    """
    Permission policy for the institutional Doctor directory:
    - All authenticated users can list (GET) and view details (GET <id>).
    - Any authenticated user can create (POST) a doctor profile.
    - Mutations (PUT, PATCH, DELETE) are strictly restricted to:
      1. The user who created the record (`created_by`), OR
      2. System staff/admin users (`is_staff`).
    """
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated)

    def has_object_permission(self, request, view, obj):
        # Read-only actions are permitted for all authenticated users
        if request.method in permissions.SAFE_METHODS:
            return True

        # Mutation actions are allowed only for the creator or staff
        return bool(
            obj.created_by == request.user or request.user.is_staff
        )
