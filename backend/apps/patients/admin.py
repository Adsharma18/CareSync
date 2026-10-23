from django.contrib import admin
from .models import Patient


@admin.register(Patient)
class PatientAdmin(admin.ModelAdmin):
    list_display = ('id', 'first_name', 'last_name', 'owner', 'date_of_birth', 'gender', 'contact_number', 'created_at')
    list_filter = ('gender', 'created_at')
    search_fields = ('first_name', 'last_name', 'contact_number', 'owner__email', 'owner__full_name')
    readonly_fields = ('created_at', 'updated_at')
