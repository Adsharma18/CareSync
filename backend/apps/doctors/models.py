import uuid
from django.db import models
from django.conf import settings


class Doctor(models.Model):
    """
    Doctor model representing physicians in the shared institutional directory.
    Any authenticated user can view the doctor directory.
    Mutations are restricted to the creator (`created_by`) or admin users.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='created_doctors',
        help_text="User who registered this doctor profile."
    )
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100)
    specialization = models.CharField(max_length=150, db_index=True)
    contact_number = models.CharField(max_length=20)
    email = models.EmailField(unique=True, max_length=255)
    years_of_experience = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Doctor'
        verbose_name_plural = 'Doctors'
        ordering = ['last_name', 'first_name']

    def __str__(self):
        return f"Dr. {self.first_name} {self.last_name} ({self.specialization})"
