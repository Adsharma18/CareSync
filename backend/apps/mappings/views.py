from rest_framework import generics, status, permissions
from rest_framework.views import APIView
from rest_framework.response import Response
from apps.patients.models import Patient
from .models import PatientDoctorMapping
from .serializers import (
    PatientDoctorMappingReadSerializer,
    PatientDoctorMappingCreateSerializer,
    AssignedDoctorItemSerializer
)


class MappingListCreateView(generics.ListCreateAPIView):
    """
    POST /api/mappings/  -> Assign a doctor to an owned patient.
    GET  /api/mappings/  -> List all mappings for the authenticated caller's patients.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        """
        Enforce horizontal tenant isolation:
        Only return mappings where the patient is owned by the authenticated caller.
        """
        return (
            PatientDoctorMapping.objects
            .filter(patient__owner=self.request.user)
            .select_related('patient', 'doctor')
        )

    def get_serializer_class(self):
        if self.request.method == 'POST':
            return PatientDoctorMappingCreateSerializer
        return PatientDoctorMappingReadSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        mapping = serializer.save()

        # Return full descriptive representation
        read_serializer = PatientDoctorMappingReadSerializer(mapping)
        return Response(read_serializer.data, status=status.HTTP_201_CREATED)


class MappingDetailView(APIView):
    """
    Handles:
    - GET    /api/mappings/<patient_id>/ -> List doctors assigned to a specific patient.
    - DELETE /api/mappings/<id>/         -> Remove a patient-doctor mapping by mapping ID.
    Both methods strictly enforce patient ownership.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, pk, *args, **kwargs):
        """
        GET /api/mappings/<patient_id>/
        Returns all doctors assigned to a specific patient.
        Returns 404 if the patient does not exist or belongs to another user.
        """
        try:
            patient = Patient.objects.get(pk=pk)
        except (Patient.DoesNotExist, ValueError):
            return Response(
                {"detail": "No Patient matches the given query."},
                status=status.HTTP_404_NOT_FOUND
            )

        # Enforce patient ownership
        if patient.owner != request.user:
            return Response(
                {"detail": "No Patient matches the given query."},
                status=status.HTTP_404_NOT_FOUND
            )

        mappings = (
            PatientDoctorMapping.objects
            .filter(patient=patient)
            .select_related('doctor')
        )
        assigned_serializer = AssignedDoctorItemSerializer(mappings, many=True)

        response_data = {
            "patient_id": str(patient.id),
            "patient_name": f"{patient.first_name} {patient.last_name}",
            "assigned_doctors": assigned_serializer.data
        }
        return Response(response_data, status=status.HTTP_200_OK)

    def delete(self, request, pk, *args, **kwargs):
        """
        DELETE /api/mappings/<id>/
        Removes the specified patient-doctor mapping record.
        Returns 404 if the mapping does not exist or links to a patient owned by another user.
        """
        try:
            mapping = PatientDoctorMapping.objects.select_related('patient').get(pk=pk)
        except (PatientDoctorMapping.DoesNotExist, ValueError):
            return Response(
                {"detail": "No Mapping matches the given query."},
                status=status.HTTP_404_NOT_FOUND
            )

        # Enforce patient ownership
        if mapping.patient.owner != request.user:
            return Response(
                {"detail": "No Mapping matches the given query."},
                status=status.HTTP_404_NOT_FOUND
            )

        mapping.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
