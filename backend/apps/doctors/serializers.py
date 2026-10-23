from rest_framework import serializers
from .models import Doctor


class DoctorSerializer(serializers.ModelSerializer):
    """
    Serializer for the Doctor directory.
    Validates email uniqueness and non-negative experience.
    """
    created_by_email = serializers.ReadOnlyField(source='created_by.email')

    class Meta:
        model = Doctor
        fields = (
            'id',
            'first_name',
            'last_name',
            'specialization',
            'contact_number',
            'email',
            'years_of_experience',
            'created_by_email',
            'created_at',
            'updated_at'
        )
        read_only_fields = ('id', 'created_by', 'created_by_email', 'created_at', 'updated_at')

    def validate_email(self, value):
        normalized_email = value.strip().lower()
        query = Doctor.objects.filter(email__iexact=normalized_email)
        if self.instance:
            query = query.exclude(pk=self.instance.pk)
        if query.exists():
            raise serializers.ValidationError("A doctor with this email already exists.")
        return normalized_email

    def validate_years_of_experience(self, value):
        if value < 0:
            raise serializers.ValidationError("Ensure this value is greater than or equal to 0.")
        return value
