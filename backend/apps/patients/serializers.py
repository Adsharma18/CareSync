import datetime
from rest_framework import serializers
from .models import Patient


class PatientSerializer(serializers.ModelSerializer):
    """
    Serializer for Patient records.
    Ownership is strictly managed by the viewset context (request.user).
    """
    owner_email = serializers.ReadOnlyField(source='owner.email')

    class Meta:
        model = Patient
        fields = (
            'id',
            'first_name',
            'last_name',
            'date_of_birth',
            'gender',
            'contact_number',
            'medical_history',
            'owner_email',
            'created_at',
            'updated_at'
        )
        read_only_fields = ('id', 'owner', 'owner_email', 'created_at', 'updated_at')

    def validate_date_of_birth(self, value):
        if value > datetime.date.today():
            raise serializers.ValidationError("Date of birth cannot be in the future.")
        return value

    def validate_gender(self, value):
        valid_genders = [choice[0] for choice in Patient.GENDER_CHOICES]
        # Match case-insensitively to choice
        for valid in valid_genders:
            if value.lower() == valid.lower():
                return valid
        raise serializers.ValidationError(
            f"Gender must be one of: {', '.join(valid_genders)}."
        )
