import uuid
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from apps.accounts.models import CustomUser
from apps.doctors.models import Doctor
from apps.patients.models import Patient
from apps.mappings.models import PatientDoctorMapping


class DoctorAPITests(APITestCase):
    """
    Automated test suite for CareSync Doctor CRUD Endpoints.
    Verifies authentication, shared directory visibility,
    creator/admin-restricted mutations (403 for non-creators),
    serializer validation, and cascade effects upon doctor deletion.
    """

    def setUp(self):
        self.doctors_list_url = reverse('doctor-list')

        # Create two standard coordinators and one admin user
        self.user_a = CustomUser.objects.create_user(
            email='coordinator.a@clinic.org',
            password='SecurePassword123!',
            full_name='Dr. Coordinator A'
        )
        self.user_b = CustomUser.objects.create_user(
            email='coordinator.b@clinic.org',
            password='SecurePassword123!',
            full_name='Dr. Coordinator B'
        )
        self.admin_user = CustomUser.objects.create_superuser(
            email='admin@clinic.org',
            password='AdminPassword123!',
            full_name='Admin User'
        )

        self.valid_doctor_payload = {
            'first_name': 'Marcus',
            'last_name': 'Brody',
            'specialization': 'Cardiology',
            'contact_number': '+1-555-432-1100',
            'email': 'marcus.brody@hospital.org',
            'years_of_experience': 14
        }

    def test_unauthenticated_access_blocked(self):
        """Verify unauthenticated requests return 401 Unauthorized."""
        response_get = self.client.get(self.doctors_list_url)
        self.assertEqual(response_get.status_code, status.HTTP_401_UNAUTHORIZED)

        response_post = self.client.post(self.doctors_list_url, self.valid_doctor_payload, format='json')
        self.assertEqual(response_post.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_create_doctor_success(self):
        """Verify doctor creation binds caller as created_by and returns 201 Created."""
        self.client.force_authenticate(user=self.user_a)
        response = self.client.post(self.doctors_list_url, self.valid_doctor_payload, format='json')

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn('id', response.data)
        self.assertEqual(response.data['email'], self.valid_doctor_payload['email'])
        self.assertEqual(response.data['created_by_email'], self.user_a.email)

        # Check DB
        doctor = Doctor.objects.get(id=response.data['id'])
        self.assertEqual(doctor.created_by, self.user_a)

    def test_create_doctor_duplicate_email_rejected(self):
        """Verify creating a doctor with an existing email returns 400 Bad Request."""
        self.client.force_authenticate(user=self.user_a)
        self.client.post(self.doctors_list_url, self.valid_doctor_payload, format='json')

        # Attempt to create another doctor with identical email (different case)
        duplicate_payload = self.valid_doctor_payload.copy()
        duplicate_payload['email'] = 'MARCUS.BRODY@hospital.org'
        duplicate_payload['first_name'] = 'Different'

        response = self.client.post(self.doctors_list_url, duplicate_payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('email', response.data)

    def test_create_doctor_negative_experience_rejected(self):
        """Verify negative years_of_experience returns 400 Bad Request."""
        self.client.force_authenticate(user=self.user_a)
        invalid_payload = self.valid_doctor_payload.copy()
        invalid_payload['years_of_experience'] = -5

        response = self.client.post(self.doctors_list_url, invalid_payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('years_of_experience', response.data)

    def test_list_doctors_shared_directory(self):
        """Verify any authenticated user can view the institutional directory."""
        Doctor.objects.create(created_by=self.user_a, **self.valid_doctor_payload)

        # Coordinator B (not the creator) lists doctors
        self.client.force_authenticate(user=self.user_b)
        response = self.client.get(self.doctors_list_url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['email'], self.valid_doctor_payload['email'])

    def test_retrieve_doctor_shared_directory(self):
        """Verify any authenticated user can view details of any doctor."""
        doctor = Doctor.objects.create(created_by=self.user_a, **self.valid_doctor_payload)
        detail_url = reverse('doctor-detail', kwargs={'pk': doctor.id})

        self.client.force_authenticate(user=self.user_b)
        response = self.client.get(detail_url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['id'], str(doctor.id))

    def test_update_doctor_by_creator_success(self):
        """Verify creator can update doctor profile."""
        doctor = Doctor.objects.create(created_by=self.user_a, **self.valid_doctor_payload)
        detail_url = reverse('doctor-detail', kwargs={'pk': doctor.id})

        self.client.force_authenticate(user=self.user_a)
        response = self.client.patch(detail_url, {'specialization': 'Pediatric Cardiology'}, format='json')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['specialization'], 'Pediatric Cardiology')

    def test_update_doctor_by_non_creator_forbidden(self):
        """Verify non-creator coordinator attempting update returns 403 Forbidden."""
        doctor = Doctor.objects.create(created_by=self.user_a, **self.valid_doctor_payload)
        detail_url = reverse('doctor-detail', kwargs={'pk': doctor.id})

        self.client.force_authenticate(user=self.user_b)
        response = self.client.patch(detail_url, {'specialization': 'Unauthorized Change'}, format='json')

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_update_doctor_by_admin_success(self):
        """Verify system admin (staff) can update any doctor profile."""
        doctor = Doctor.objects.create(created_by=self.user_a, **self.valid_doctor_payload)
        detail_url = reverse('doctor-detail', kwargs={'pk': doctor.id})

        self.client.force_authenticate(user=self.admin_user)
        response = self.client.patch(detail_url, {'years_of_experience': 25}, format='json')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['years_of_experience'], 25)

    def test_delete_doctor_by_creator_success(self):
        """Verify creator can delete doctor profile."""
        doctor = Doctor.objects.create(created_by=self.user_a, **self.valid_doctor_payload)
        detail_url = reverse('doctor-detail', kwargs={'pk': doctor.id})

        self.client.force_authenticate(user=self.user_a)
        response = self.client.delete(detail_url)

        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(Doctor.objects.filter(id=doctor.id).exists())

    def test_delete_doctor_by_non_creator_forbidden(self):
        """Verify non-creator attempting deletion returns 403 Forbidden."""
        doctor = Doctor.objects.create(created_by=self.user_a, **self.valid_doctor_payload)
        detail_url = reverse('doctor-detail', kwargs={'pk': doctor.id})

        self.client.force_authenticate(user=self.user_b)
        response = self.client.delete(detail_url)

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertTrue(Doctor.objects.filter(id=doctor.id).exists())

    def test_delete_doctor_by_admin_success(self):
        """Verify system admin can delete any doctor profile."""
        doctor = Doctor.objects.create(created_by=self.user_a, **self.valid_doctor_payload)
        detail_url = reverse('doctor-detail', kwargs={'pk': doctor.id})

        self.client.force_authenticate(user=self.admin_user)
        response = self.client.delete(detail_url)

        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(Doctor.objects.filter(id=doctor.id).exists())

    def test_delete_doctor_with_existing_mapping(self):
        """
        Verify that deleting a doctor with an active patient assignment:
        1. Cascades cleanly to delete the PatientDoctorMapping.
        2. Preserves the associated Patient record intact.
        """
        doctor = Doctor.objects.create(created_by=self.user_a, **self.valid_doctor_payload)
        patient = Patient.objects.create(
            owner=self.user_a,
            first_name='Eleanor',
            last_name='Vance',
            date_of_birth='1988-04-12',
            gender='Female',
            contact_number='+1-555-019-2834'
        )
        mapping = PatientDoctorMapping.objects.create(
            patient=patient,
            doctor=doctor,
            notes='Active treatment mapping'
        )

        mapping_id = mapping.id
        patient_id = patient.id
        doctor_id = doctor.id

        # Delete the doctor
        self.client.force_authenticate(user=self.user_a)
        detail_url = reverse('doctor-detail', kwargs={'pk': doctor.id})
        response = self.client.delete(detail_url)

        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)

        # 1. Doctor is deleted
        self.assertFalse(Doctor.objects.filter(id=doctor_id).exists())

        # 2. Associated mapping is cascade-deleted
        self.assertFalse(PatientDoctorMapping.objects.filter(id=mapping_id).exists())

        # 3. Patient record is preserved completely intact
        self.assertTrue(Patient.objects.filter(id=patient_id).exists())
