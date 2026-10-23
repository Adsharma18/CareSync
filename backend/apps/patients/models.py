import uuid
from django.db import models
from django.conf import settings


class Patient(models.Model):
    """
    Patient model representing individuals under the care of a coordinator (owner).
    Strict horizontal tenant isolation is enforced by linking every record to an owner.
    """
    GENDER_CHOICES = [
        ('Male', 'Male'),
        ('Female', 'Female'),
        ('Other', 'Other'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='patients',
        db_index=True,
        help_text="User/Coordinator who registered and owns this patient record."
    )
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100)
    date_of_birth = models.DateField()
    gender = models.CharField(max_length=10, choices=GENDER_CHOICES)
    contact_number = models.CharField(max_length=20)
    medical_history = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Patient'
        verbose_name_plural = 'Patients'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['owner', 'created_at'], name='patient_owner_created_idx'),
        ]

    def __str__(self):
        return f"{self.first_name} {self.last_name}"
