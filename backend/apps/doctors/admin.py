from django.contrib import admin
from .models import Doctor


@admin.register(Doctor)
class DoctorAdmin(admin.ModelAdmin):
    list_display = ('id', 'first_name', 'last_name', 'specialization', 'email', 'contact_number', 'years_of_experience', 'created_by')
    list_filter = ('specialization', 'created_at')
    search_fields = ('first_name', 'last_name', 'email', 'specialization')
    readonly_fields = ('created_at', 'updated_at')
