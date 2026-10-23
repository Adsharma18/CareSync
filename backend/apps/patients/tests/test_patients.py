import datetime
import uuid
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from apps.accounts.models import CustomUser
from apps.patients.models import Patient


class PatientAPITests(APITestCase):
    """
    Automated test suite for CareSync Patient CRUD Endpoints.
    Verifies authentication requirements, horizontal tenant isolation,
    owner binding, validation rules, and proper HTTP status codes.
    """

    def setUp(self):
        self.patients_list_url = reverse('patient-list')

        # Create two distinct healthcare coordinators for multi-tenant isolation testing
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

        self.valid_patient_payload = {
            'first_name': 'Eleanor',
            'last_name': 'Vance',
            'date_of_birth': '1988-04-12',
            'gender': 'Female',
            'contact_number': '+1-555-019-2834',
            'medical_history': 'Hypertension, penicillin allergy.'
        }

    def test_unauthenticated_access_blocked(self):
        """Verify unauthenticated requests return 401 Unauthorized."""
        # Unauthenticated GET
        response = self.client.get(self.patients_list_url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

        # Unauthenticated POST
        response = self.client.post(self.patients_list_url, self.valid_patient_payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_create_patient_success(self):
        """Verify patient creation automatically assigns authenticated user as owner."""
        self.client.force_authenticate(user=self.user_a)
        response = self.client.post(self.patients_list_url, self.valid_patient_payload, format='json')

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn('id', response.data)
        self.assertEqual(response.data['first_name'], 'Eleanor')
        self.assertEqual(response.data['owner_email'], self.user_a.email)

        # Check DB level ownership
        patient = Patient.objects.get(id=response.data['id'])
        self.assertEqual(patient.owner, self.user_a)

    def test_create_patient_ignores_payload_owner(self):
        """Verify client cannot spoof patient ownership via payload."""
        self.client.force_authenticate(user=self.user_a)
        spoofed_payload = self.valid_patient_payload.copy()
        spoofed_payload['owner'] = str(self.user_b.id)

        response = self.client.post(self.patients_list_url, spoofed_payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        patient = Patient.objects.get(id=response.data['id'])
        self.assertEqual(patient.owner, self.user_a)
        self.assertNotEqual(patient.owner, self.user_b)

    def test_create_patient_future_dob_rejected(self):
        """Verify date_of_birth in the future returns 400 Bad Request."""
        self.client.force_authenticate(user=self.user_a)
        future_payload = self.valid_patient_payload.copy()
        future_payload['date_of_birth'] = (datetime.date.today() + datetime.timedelta(days=1)).isoformat()

        response = self.client.post(self.patients_list_url, future_payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('date_of_birth', response.data)

    def test_create_patient_invalid_gender_rejected(self):
        """Verify invalid gender returns 400 Bad Request."""
        self.client.force_authenticate(user=self.user_a)
        invalid_gender_payload = self.valid_patient_payload.copy()
        invalid_gender_payload['gender'] = 'InvalidGender'

        response = self.client.post(self.patients_list_url, invalid_gender_payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('gender', response.data)

    def test_list_patients_tenant_isolation(self):
        """Verify GET /api/patients/ returns ONLY patients owned by authenticated caller."""
        # Create 2 patients for User A
        Patient.objects.create(owner=self.user_a, first_name='A1', last_name='Test', date_of_birth='1990-01-01', gender='Male', contact_number='111')
        Patient.objects.create(owner=self.user_a, first_name='A2', last_name='Test', date_of_birth='1991-01-01', gender='Female', contact_number='222')

        # Create 1 patient for User B
        Patient.objects.create(owner=self.user_b, first_name='B1', last_name='Test', date_of_birth='1992-01-01', gender='Other', contact_number='333')

        # User A query
        self.client.force_authenticate(user=self.user_a)
        resp_a = self.client.get(self.patients_list_url)
        self.assertEqual(resp_a.status_code, status.HTTP_200_OK)
        self.assertEqual(len(resp_a.data), 2)
        patient_names_a = [p['first_name'] for p in resp_a.data]
        self.assertIn('A1', patient_names_a)
        self.assertIn('A2', patient_names_a)
        self.assertNotIn('B1', patient_names_a)

        # User B query
        self.client.force_authenticate(user=self.user_b)
        resp_b = self.client.get(self.patients_list_url)
        self.assertEqual(resp_b.status_code, status.HTTP_200_OK)
        self.assertEqual(len(resp_b.data), 1)
        self.assertEqual(resp_b.data[0]['first_name'], 'B1')

    def test_retrieve_owned_patient_success(self):
        """Verify retrieving an owned patient by ID returns 200 OK."""
        patient = Patient.objects.create(owner=self.user_a, **self.valid_patient_payload)
        detail_url = reverse('patient-detail', kwargs={'pk': patient.id})

        self.client.force_authenticate(user=self.user_a)
        response = self.client.get(detail_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['id'], str(patient.id))

    def test_retrieve_other_user_patient_returns_404(self):
        """Verify attempting to retrieve another user's patient returns 404 Not Found."""
        patient_a = Patient.objects.create(owner=self.user_a, **self.valid_patient_payload)
        detail_url = reverse('patient-detail', kwargs={'pk': patient_a.id})

        # User B attempts to access User A's patient
        self.client.force_authenticate(user=self.user_b)
        response = self.client.get(detail_url)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_update_owned_patient_success(self):
        """Verify updating an owned patient returns 200 OK."""
        patient = Patient.objects.create(owner=self.user_a, **self.valid_patient_payload)
        detail_url = reverse('patient-detail', kwargs={'pk': patient.id})

        self.client.force_authenticate(user=self.user_a)
        patch_payload = {'contact_number': '+1-555-999-0000'}
        response = self.client.patch(detail_url, patch_payload, format='json')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['contact_number'], '+1-555-999-0000')

    def test_update_other_user_patient_returns_404(self):
        """Verify attempting to update another user's patient returns 404 Not Found."""
        patient_a = Patient.objects.create(owner=self.user_a, **self.valid_patient_payload)
        detail_url = reverse('patient-detail', kwargs={'pk': patient_a.id})

        self.client.force_authenticate(user=self.user_b)
        patch_payload = {'contact_number': '+1-555-000-9999'}
        response = self.client.patch(detail_url, patch_payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_delete_other_user_patient_returns_404(self):
        """Verify attempting to delete another user's patient returns 404 Not Found."""
        patient_a = Patient.objects.create(owner=self.user_a, **self.valid_patient_payload)
        detail_url = reverse('patient-detail', kwargs={'pk': patient_a.id})

        self.client.force_authenticate(user=self.user_b)
        response = self.client.delete(detail_url)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

        # Confirm patient still exists
        self.assertTrue(Patient.objects.filter(id=patient_a.id).exists())

    def test_delete_owned_patient_success(self):
        """Verify deleting an owned patient returns 204 No Content."""
        patient = Patient.objects.create(owner=self.user_a, **self.valid_patient_payload)
        detail_url = reverse('patient-detail', kwargs={'pk': patient.id})

        self.client.force_authenticate(user=self.user_a)
        response = self.client.delete(detail_url)
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)

        # Confirm patient was deleted
        self.assertFalse(Patient.objects.filter(id=patient.id).exists())

    def test_nonexistent_patient_returns_404(self):
        """Verify querying non-existent UUID returns 404 Not Found."""
        self.client.force_authenticate(user=self.user_a)
        random_uuid = uuid.uuid4()
        detail_url = reverse('patient-detail', kwargs={'pk': random_uuid})

        response = self.client.get(detail_url)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
