import uuid
from django.urls import reverse
from django.core.exceptions import ValidationError
from django.db import IntegrityError
from django.forms import modelform_factory
from django.test import TestCase, Client
from rest_framework import status
from rest_framework.test import APITestCase
from apps.accounts.models import CustomUser
from apps.patients.models import Patient
from apps.doctors.models import Doctor
from apps.mappings.models import PatientDoctorMapping


class PatientDoctorMappingAPITests(APITestCase):
    """
    Automated test suite for CareSync Patient-Doctor Mapping Endpoints.
    Verifies creation, duplicate assignment prevention, patient ownership enforcement,
    cross-tenant data protection (404s), and mapping deletion.
    """

    def setUp(self):
        self.mappings_list_url = reverse('mapping_list_create')

        # Create two healthcare coordinators
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

        # Create a patient for User A
        self.patient_a = Patient.objects.create(
            owner=self.user_a,
            first_name='Eleanor',
            last_name='Vance',
            date_of_birth='1988-04-12',
            gender='Female',
            contact_number='+1-555-019-2834',
            medical_history='Hypertension'
        )

        # Create a patient for User B
        self.patient_b = Patient.objects.create(
            owner=self.user_b,
            first_name='Theodora',
            last_name='Crain',
            date_of_birth='1992-06-20',
            gender='Female',
            contact_number='+1-555-019-5555'
        )

        # Create two doctors
        self.doctor_1 = Doctor.objects.create(
            created_by=self.user_a,
            first_name='Marcus',
            last_name='Brody',
            specialization='Cardiology',
            contact_number='+1-555-432-1100',
            email='marcus.brody@hospital.org',
            years_of_experience=14
        )
        self.doctor_2 = Doctor.objects.create(
            created_by=self.user_b,
            first_name='Gregory',
            last_name='House',
            specialization='Diagnostic Medicine',
            contact_number='+1-555-432-2200',
            email='gregory.house@hospital.org',
            years_of_experience=20
        )

    def test_unauthenticated_access_blocked(self):
        """Verify unauthenticated requests return 401 Unauthorized."""
        # Unauthenticated GET
        response_get = self.client.get(self.mappings_list_url)
        self.assertEqual(response_get.status_code, status.HTTP_401_UNAUTHORIZED)

        # Unauthenticated POST
        response_post = self.client.post(self.mappings_list_url, {
            'patient': str(self.patient_a.id),
            'doctor': str(self.doctor_1.id)
        }, format='json')
        self.assertEqual(response_post.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_create_mapping_valid_assignment(self):
        """Verify coordinator can successfully assign a doctor to an owned patient."""
        self.client.force_authenticate(user=self.user_a)
        payload = {
            'patient': str(self.patient_a.id),
            'doctor': str(self.doctor_1.id),
            'notes': 'Initial referral for heart monitoring.'
        }
        response = self.client.post(self.mappings_list_url, payload, format='json')

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn('id', response.data)
        self.assertEqual(response.data['patient'], self.patient_a.id)
        self.assertEqual(response.data['patient_name'], 'Eleanor Vance')
        self.assertEqual(response.data['doctor'], self.doctor_1.id)
        self.assertEqual(response.data['doctor_name'], 'Dr. Marcus Brody')
        self.assertEqual(response.data['specialization'], 'Cardiology')
        self.assertEqual(response.data['notes'], 'Initial referral for heart monitoring.')
        self.assertIn('assigned_at', response.data)

        # Verify DB
        self.assertTrue(PatientDoctorMapping.objects.filter(id=response.data['id']).exists())

    def test_create_mapping_other_user_patient_rejected(self):
        """Verify coordinator cannot assign a doctor to another user's patient."""
        self.client.force_authenticate(user=self.user_b)
        payload = {
            'patient': str(self.patient_a.id),  # Owned by User A
            'doctor': str(self.doctor_1.id),
            'notes': 'Attempting unauthorized mapping'
        }
        response = self.client.post(self.mappings_list_url, payload, format='json')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('patient', response.data)
        self.assertIn('You can only assign doctors to patients you own', str(response.data['patient']))

    def test_create_mapping_duplicate_rejected(self):
        """Verify assigning the same doctor to the same patient again returns 400 Bad Request."""
        # Initial mapping
        PatientDoctorMapping.objects.create(patient=self.patient_a, doctor=self.doctor_1)

        self.client.force_authenticate(user=self.user_a)
        payload = {
            'patient': str(self.patient_a.id),
            'doctor': str(self.doctor_1.id),
            'notes': 'Duplicate attempt'
        }
        response = self.client.post(self.mappings_list_url, payload, format='json')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('non_field_errors', response.data)
        self.assertIn('This doctor is already assigned to this patient', str(response.data['non_field_errors']))

    def test_create_mapping_missing_patient(self):
        """Verify submitting non-existent patient UUID returns 400 Bad Request."""
        self.client.force_authenticate(user=self.user_a)
        payload = {
            'patient': str(uuid.uuid4()),
            'doctor': str(self.doctor_1.id)
        }
        response = self.client.post(self.mappings_list_url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('patient', response.data)

    def test_create_mapping_missing_doctor(self):
        """Verify submitting non-existent doctor UUID returns 400 Bad Request."""
        self.client.force_authenticate(user=self.user_a)
        payload = {
            'patient': str(self.patient_a.id),
            'doctor': str(uuid.uuid4())
        }
        response = self.client.post(self.mappings_list_url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('doctor', response.data)

    def test_list_mappings_tenant_isolation(self):
        """Verify GET /api/mappings/ returns ONLY mappings for the caller's patients."""
        # Mapping for User A's patient
        mapping_a = PatientDoctorMapping.objects.create(patient=self.patient_a, doctor=self.doctor_1)
        # Mapping for User B's patient
        mapping_b = PatientDoctorMapping.objects.create(patient=self.patient_b, doctor=self.doctor_2)

        # User A query
        self.client.force_authenticate(user=self.user_a)
        resp_a = self.client.get(self.mappings_list_url)
        self.assertEqual(resp_a.status_code, status.HTTP_200_OK)
        self.assertEqual(len(resp_a.data), 1)
        self.assertEqual(resp_a.data[0]['id'], str(mapping_a.id))
        self.assertEqual(resp_a.data[0]['patient_name'], 'Eleanor Vance')

        # User B query
        self.client.force_authenticate(user=self.user_b)
        resp_b = self.client.get(self.mappings_list_url)
        self.assertEqual(resp_b.status_code, status.HTTP_200_OK)
        self.assertEqual(len(resp_b.data), 1)
        self.assertEqual(resp_b.data[0]['id'], str(mapping_b.id))
        self.assertEqual(resp_b.data[0]['patient_name'], 'Theodora Crain')

    def test_get_assigned_doctors_for_patient_success(self):
        """Verify GET /api/mappings/<patient_id>/ returns list of assigned doctors."""
        PatientDoctorMapping.objects.create(patient=self.patient_a, doctor=self.doctor_1, notes='Note 1')
        PatientDoctorMapping.objects.create(patient=self.patient_a, doctor=self.doctor_2, notes='Note 2')

        detail_url = reverse('mapping_detail', kwargs={'pk': self.patient_a.id})
        self.client.force_authenticate(user=self.user_a)
        response = self.client.get(detail_url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['patient_id'], str(self.patient_a.id))
        self.assertEqual(response.data['patient_name'], 'Eleanor Vance')
        self.assertEqual(len(response.data['assigned_doctors']), 2)

    def test_get_assigned_doctors_for_other_user_patient_returns_404(self):
        """Verify attempting to view doctor mappings for another user's patient returns 404 Not Found."""
        PatientDoctorMapping.objects.create(patient=self.patient_a, doctor=self.doctor_1)

        detail_url = reverse('mapping_detail', kwargs={'pk': self.patient_a.id})

        # User B attempts to view mappings for User A's patient
        self.client.force_authenticate(user=self.user_b)
        response = self.client.get(detail_url)

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_get_assigned_doctors_nonexistent_patient_returns_404(self):
        """Verify querying non-existent patient UUID returns 404 Not Found."""
        self.client.force_authenticate(user=self.user_a)
        detail_url = reverse('mapping_detail', kwargs={'pk': uuid.uuid4()})
        response = self.client.get(detail_url)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_delete_mapping_by_patient_owner_success(self):
        """Verify patient owner can delete an active doctor mapping."""
        mapping = PatientDoctorMapping.objects.create(patient=self.patient_a, doctor=self.doctor_1)
        delete_url = reverse('mapping_detail', kwargs={'pk': mapping.id})

        self.client.force_authenticate(user=self.user_a)
        response = self.client.delete(delete_url)

        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(PatientDoctorMapping.objects.filter(id=mapping.id).exists())

    def test_delete_mapping_by_other_user_returns_404(self):
        """Verify another coordinator attempting to delete a mapping returns 404 Not Found."""
        mapping = PatientDoctorMapping.objects.create(patient=self.patient_a, doctor=self.doctor_1)
        delete_url = reverse('mapping_detail', kwargs={'pk': mapping.id})

        # User B attempts to delete mapping for User A's patient
        self.client.force_authenticate(user=self.user_b)
        response = self.client.delete(delete_url)

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        # Mapping must still exist in DB
        self.assertTrue(PatientDoctorMapping.objects.filter(id=mapping.id).exists())

    def test_delete_nonexistent_mapping_returns_404(self):
        """Verify deleting non-existent mapping UUID returns 404 Not Found."""
        self.client.force_authenticate(user=self.user_a)
        delete_url = reverse('mapping_detail', kwargs={'pk': uuid.uuid4()})
        response = self.client.delete(delete_url)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)


class PatientDoctorMappingModelAndAdminTests(TestCase):
    """
    Test suite for PatientDoctorMapping model validation, clean(),
    __str__ safety, duplicate protection, and Django Admin behavior.
    """

    def setUp(self):
        self.user = CustomUser.objects.create_user(
            email='testuser@hospital.org',
            password='Password123!',
            full_name='Test Coordinator'
        )
        self.admin_user = CustomUser.objects.create_superuser(
            email='admin@hospital.org',
            password='AdminPassword123!',
            full_name='Super Admin'
        )
        self.patient = Patient.objects.create(
            owner=self.user,
            first_name='Clara',
            last_name='Oswald',
            date_of_birth='1989-11-23',
            gender='Female',
            contact_number='+1-555-123-4567'
        )
        self.doctor_1 = Doctor.objects.create(
            created_by=self.user,
            first_name='John',
            last_name='Watson',
            specialization='General Medicine',
            contact_number='+1-555-765-4321',
            email='watson@hospital.org',
            years_of_experience=10
        )
        self.doctor_2 = Doctor.objects.create(
            created_by=self.user,
            first_name='Martha',
            last_name='Jones',
            specialization='Pediatrics',
            contact_number='+1-555-765-9999',
            email='jones@hospital.org',
            years_of_experience=8
        )
        self.MappingForm = modelform_factory(
            PatientDoctorMapping,
            fields=['patient', 'doctor', 'notes']
        )

    def test_valid_mapping_creation_and_full_clean(self):
        """Verify valid mapping instance passes full_clean() and saves successfully."""
        mapping = PatientDoctorMapping(
            patient=self.patient,
            doctor=self.doctor_1,
            notes='Standard assignment.'
        )
        mapping.full_clean()
        mapping.save()

        self.assertIsNotNone(mapping.id)
        self.assertTrue(PatientDoctorMapping.objects.filter(id=mapping.id).exists())
        self.assertEqual(mapping.patient, self.patient)
        self.assertEqual(mapping.doctor, self.doctor_1)

    def test_missing_doctor_in_model_form_produces_validation_error(self):
        """
        Verify that submitting an admin form with a missing doctor produces
        a standard Django form validation error instead of crashing with
        RelatedObjectDoesNotExist.
        """
        form = self.MappingForm(data={
            'patient': str(self.patient.id),
            'doctor': '',
            'notes': 'Missing doctor submission'
        })
        self.assertFalse(form.is_valid())
        self.assertIn('doctor', form.errors)
        self.assertIn('This field is required.', form.errors['doctor'])

    def test_missing_patient_in_model_form_produces_validation_error(self):
        """Verify submitting form with missing patient produces standard validation error."""
        form = self.MappingForm(data={
            'patient': '',
            'doctor': str(self.doctor_1.id),
            'notes': 'Missing patient submission'
        })
        self.assertFalse(form.is_valid())
        self.assertIn('patient', form.errors)
        self.assertIn('This field is required.', form.errors['patient'])

    def test_missing_doctor_in_full_clean(self):
        """Verify full_clean() raises ValidationError when doctor is None."""
        mapping = PatientDoctorMapping(patient=self.patient, doctor=None)
        with self.assertRaises(ValidationError) as ctx:
            mapping.full_clean()
        self.assertIn('doctor', ctx.exception.message_dict)

    def test_missing_patient_in_full_clean(self):
        """Verify full_clean() raises ValidationError when patient is None."""
        mapping = PatientDoctorMapping(patient=None, doctor=self.doctor_1)
        with self.assertRaises(ValidationError) as ctx:
            mapping.full_clean()
        self.assertIn('patient', ctx.exception.message_dict)

    def test_clean_method_safe_with_unassigned_foreign_keys(self):
        """
        Verify that clean() returns cleanly without evaluating ForeignKeys
        when patient_id or doctor_id is missing.
        """
        mapping_empty = PatientDoctorMapping()
        mapping_empty.clean()

        mapping_no_doc = PatientDoctorMapping(patient=self.patient)
        mapping_no_doc.clean()

        mapping_no_pat = PatientDoctorMapping(doctor=self.doctor_1)
        mapping_no_pat.clean()

    def test_duplicate_assignment_rejected_by_clean_and_unique_constraint(self):
        """
        Verify duplicate assignment raises ValidationError in clean()
        and IntegrityError when attempting duplicate database insertion.
        """
        PatientDoctorMapping.objects.create(patient=self.patient, doctor=self.doctor_1)

        duplicate = PatientDoctorMapping(patient=self.patient, doctor=self.doctor_1)
        with self.assertRaises(ValidationError) as ctx:
            duplicate.clean()
        self.assertIn('This doctor is already assigned to this patient.', str(ctx.exception))

        with self.assertRaises(IntegrityError):
            duplicate.save()

    def test_assign_same_patient_to_different_doctor_succeeds(self):
        """Verify that a single patient can be assigned to multiple distinct doctors."""
        PatientDoctorMapping.objects.create(patient=self.patient, doctor=self.doctor_1)

        second_mapping = PatientDoctorMapping(patient=self.patient, doctor=self.doctor_2)
        second_mapping.full_clean()
        second_mapping.save()

        assignments = PatientDoctorMapping.objects.filter(patient=self.patient)
        self.assertEqual(assignments.count(), 2)

    def test_assign_same_doctor_to_different_patients_succeeds(self):
        """Verify that a single doctor can be assigned to multiple distinct patients."""
        patient_2 = Patient.objects.create(
            owner=self.user,
            first_name='Rory',
            last_name='Williams',
            date_of_birth='1988-02-14',
            gender='Male',
            contact_number='+1-555-444-3322'
        )
        PatientDoctorMapping.objects.create(patient=self.patient, doctor=self.doctor_1)

        second_mapping = PatientDoctorMapping(patient=patient_2, doctor=self.doctor_1)
        second_mapping.full_clean()
        second_mapping.save()

        assignments = PatientDoctorMapping.objects.filter(doctor=self.doctor_1)
        self.assertEqual(assignments.count(), 2)

    def test_str_representation_safe_under_all_states(self):
        """Verify __str__ returns descriptive string and never raises RelatedObjectDoesNotExist."""
        # Fully populated
        mapping = PatientDoctorMapping(patient=self.patient, doctor=self.doctor_1)
        mapping_str = str(mapping)
        self.assertIn('Clara Oswald', mapping_str)
        self.assertIn('Dr. John Watson', mapping_str)

        # Both unassigned
        empty_mapping = PatientDoctorMapping()
        self.assertEqual(str(empty_mapping), 'Unassigned Patient <-> Unassigned Doctor')

        # Patient only
        patient_only = PatientDoctorMapping(patient=self.patient)
        self.assertIn('Clara Oswald', str(patient_only))
        self.assertIn('Unassigned Doctor', str(patient_only))

        # Doctor only
        doctor_only = PatientDoctorMapping(doctor=self.doctor_1)
        self.assertIn('Unassigned Patient', str(doctor_only))
        self.assertIn('Dr. John Watson', str(doctor_only))

    def test_admin_changeform_missing_doctor_returns_200_with_form_errors(self):
        """
        Verify Django Admin changeform renders regular validation error
        (HTTP 200) instead of HTTP 500 when doctor is omitted.
        """
        client = Client()
        client.login(email='admin@hospital.org', password='AdminPassword123!')

        add_url = reverse('admin:mappings_patientdoctormapping_add')
        # Check GET loads correctly and contains doctors in dropdown
        response_get = client.get(add_url)
        self.assertEqual(response_get.status_code, 200)
        self.assertContains(response_get, 'Watson')
        self.assertContains(response_get, 'Jones')

        # Check POST with missing doctor returns 200 with validation message
        post_data = {
            'patient': str(self.patient.id),
            'doctor': '',
            'notes': 'Admin form test with blank doctor'
        }
        response_post = client.post(add_url, post_data)
        self.assertEqual(response_post.status_code, 200)
        self.assertContains(response_post, 'This field is required.')

        # Check POST with valid data redirects (302) and creates record
        valid_post_data = {
            'patient': str(self.patient.id),
            'doctor': str(self.doctor_1.id),
            'notes': 'Admin form test success'
        }
        response_valid = client.post(add_url, valid_post_data)
        self.assertEqual(response_valid.status_code, 302)
        self.assertTrue(PatientDoctorMapping.objects.filter(
            patient=self.patient,
            doctor=self.doctor_1
        ).exists())
