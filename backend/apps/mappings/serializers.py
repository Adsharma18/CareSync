from rest_framework import serializers
from rest_framework.validators import UniqueTogetherValidator
from apps.patients.models import Patient
from apps.doctors.models import Doctor
from .models import PatientDoctorMapping


class PatientDoctorMappingReadSerializer(serializers.ModelSerializer):
    """
    Detailed read serializer for Patient-Doctor Mapping instances.
    Provides denormalized names and specializations for client convenience.
    """
    patient_name = serializers.SerializerMethodField()
    doctor_name = serializers.SerializerMethodField()
    specialization = serializers.ReadOnlyField(source='doctor.specialization')

    class Meta:
        model = PatientDoctorMapping
        fields = (
            'id',
            'patient',
            'patient_name',
            'doctor',
            'doctor_name',
            'specialization',
            'notes',
            'assigned_at'
        )
        read_only_fields = fields

    def get_patient_name(self, obj):
        return f"{obj.patient.first_name} {obj.patient.last_name}"

    def get_doctor_name(self, obj):
        return f"Dr. {obj.doctor.first_name} {obj.doctor.last_name}"


class PatientDoctorMappingCreateSerializer(serializers.ModelSerializer):
    """
    Create serializer for establishing a Patient-Doctor mapping.
    Enforces that:
    1. The target patient is owned by the authenticated caller.
    2. The target doctor exists.
    3. Duplicate assignments are rejected with the PRD-specified error message.
    """
    patient = serializers.PrimaryKeyRelatedField(
        queryset=Patient.objects.all(),
        help_text="UUID of the patient (must be owned by caller)."
    )
    doctor = serializers.PrimaryKeyRelatedField(
        queryset=Doctor.objects.all(),
        help_text="UUID of the doctor to assign."
    )
    notes = serializers.CharField(
        required=False,
        allow_blank=True,
        allow_null=True
    )

    class Meta:
        model = PatientDoctorMapping
        fields = ('id', 'patient', 'doctor', 'notes', 'assigned_at')
        read_only_fields = ('id', 'assigned_at')
        validators = [
            UniqueTogetherValidator(
                queryset=PatientDoctorMapping.objects.all(),
                fields=['patient', 'doctor'],
                message="This doctor is already assigned to this patient."
            )
        ]

    def validate_patient(self, value):
        request = self.context.get('request')
        if request and value.owner != request.user:
            raise serializers.ValidationError("You can only assign doctors to patients you own.")
        return value


class AssignedDoctorItemSerializer(serializers.Serializer):
    """
    Sub-serializer representing an assigned physician for a specific patient.
    """
    mapping_id = serializers.UUIDField(source='id')
    doctor_id = serializers.UUIDField(source='doctor.id')
    doctor_name = serializers.SerializerMethodField()
    specialization = serializers.CharField(source='doctor.specialization')
    assigned_at = serializers.DateTimeField()
    notes = serializers.CharField(allow_null=True, allow_blank=True)

    def get_doctor_name(self, obj):
        return f"Dr. {obj.doctor.first_name} {obj.doctor.last_name}"
