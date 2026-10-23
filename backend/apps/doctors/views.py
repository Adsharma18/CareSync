from rest_framework import viewsets
from .models import Doctor
from .serializers import DoctorSerializer
from .permissions import IsDoctorCreatorOrReadOnly


class DoctorViewSet(viewsets.ModelViewSet):
    """
    ViewSet for the institutional Doctor directory:
    - POST   /api/doctors/       -> Register doctor (auto-associates created_by=request.user)
    - GET    /api/doctors/       -> List all doctors (accessible by all authenticated users)
    - GET    /api/doctors/<id>/  -> Retrieve doctor details (all authenticated users)
    - PUT    /api/doctors/<id>/  -> Full update of doctor (creator or admin only)
    - PATCH  /api/doctors/<id>/  -> Partial update of doctor (creator or admin only)
    - DELETE /api/doctors/<id>/  -> Delete doctor (creator or admin only)
    """
    queryset = Doctor.objects.all()
    serializer_class = DoctorSerializer
    permission_classes = [IsDoctorCreatorOrReadOnly]

    def perform_create(self, serializer):
        """
        Record the authenticated coordinator who registered this doctor.
        """
        serializer.save(created_by=self.request.user)
