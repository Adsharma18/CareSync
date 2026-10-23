import uuid
from django.db import models
from django.core.exceptions import ValidationError


class PatientDoctorMapping(models.Model):
    """
    Relational mapping entity associating a Patient with an assigned Doctor.
    Guarantees no duplicate assignments of the same doctor to the same patient.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    patient = models.ForeignKey(
        'patients.Patient',
        on_delete=models.CASCADE,
        related_name='doctor_mappings',
        db_index=True,
        help_text="The patient assigned to the doctor."
    )
    doctor = models.ForeignKey(
        'doctors.Doctor',
        on_delete=models.CASCADE,
        related_name='patient_mappings',
        db_index=True,
        help_text="The attending doctor assigned to the patient."
    )
    notes = models.TextField(
        blank=True,
        null=True,
        help_text="Optional consultation or assignment notes."
    )
    assigned_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Patient-Doctor Mapping'
        verbose_name_plural = 'Patient-Doctor Mappings'
        ordering = ['-assigned_at']
        constraints = [
            models.UniqueConstraint(
                fields=['patient', 'doctor'],
                name='unique_patient_doctor_assignment'
            )
        ]

    def clean(self):
        super().clean()
        # Avoid evaluating foreign key descriptors when IDs are missing
        if not self.patient_id or not self.doctor_id:
            return

        # Ensure that during model-level validation (e.g. Django Admin),
        # duplicate assignments are caught cleanly
        if PatientDoctorMapping.objects.filter(
            patient_id=self.patient_id,
            doctor_id=self.doctor_id
        ).exclude(pk=self.pk).exists():
            raise ValidationError("This doctor is already assigned to this patient.")

    def __str__(self):
        try:
            patient_str = str(self.patient) if self.patient_id else "Unassigned Patient"
        except Exception:
            patient_str = f"Patient ({self.patient_id})" if self.patient_id else "Unassigned Patient"

        try:
            doctor_str = str(self.doctor) if self.doctor_id else "Unassigned Doctor"
        except Exception:
            doctor_str = f"Doctor ({self.doctor_id})" if self.doctor_id else "Unassigned Doctor"

        return f"{patient_str} <-> {doctor_str}"
