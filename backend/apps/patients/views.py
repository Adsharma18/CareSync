from rest_framework import viewsets, permissions
from .models import Patient
from .serializers import PatientSerializer
from .permissions import IsPatientOwner


class PatientViewSet(viewsets.ModelViewSet):
    """
    ViewSet for full CRUD management of Patient records:
    - POST   /api/patients/       -> Create patient (auto-assigns owner=request.user)
    - GET    /api/patients/       -> List owned patients only
    - GET    /api/patients/<id>/  -> Retrieve owned patient details (404 if owned by another)
    - PUT    /api/patients/<id>/  -> Full update of owned patient
    - PATCH  /api/patients/<id>/  -> Partial update of owned patient
    - DELETE /api/patients/<id>/  -> Delete owned patient
    """
    serializer_class = PatientSerializer
    permission_classes = [permissions.IsAuthenticated, IsPatientOwner]

    def get_queryset(self):
        """
        Enforce horizontal data isolation.
        Returns ONLY patients owned by the authenticated caller.
        """
        return Patient.objects.filter(owner=self.request.user)

    def perform_create(self, serializer):
        """
        Automatically bind the patient record to the authenticated user.
        Ignores and overrides any owner id passed in the client payload.
        """
        serializer.save(owner=self.request.user)
