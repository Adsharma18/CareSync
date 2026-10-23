from django.contrib import admin
from .models import PatientDoctorMapping


@admin.register(PatientDoctorMapping)
class PatientDoctorMappingAdmin(admin.ModelAdmin):
    list_display = ('id', 'patient', 'doctor', 'assigned_at')
    list_filter = ('assigned_at',)
    search_fields = (
        'patient__first_name',
        'patient__last_name',
        'doctor__first_name',
        'doctor__last_name',
        'notes'
    )
    readonly_fields = ('assigned_at',)

    def get_queryset(self, request):
        return super().get_queryset(request).select_related('patient', 'doctor')
