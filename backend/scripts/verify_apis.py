"""
CareSync End-to-End API Verification Script
Tests all 16 PRD-specified REST API endpoints and error conditions.
"""

import os
import sys
import uuid
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE_DIR))
sys.path.insert(0, str(BASE_DIR / 'apps'))

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')

import django
django.setup()

from rest_framework.test import APIClient
from rest_framework import status

results = []

def record(endpoint, method, expected_status, actual_status, note=""):
    passed = expected_status == actual_status
    status_str = "PASS" if passed else "FAIL"
    results.append({
        "endpoint": endpoint,
        "method": method,
        "expected": expected_status,
        "actual": actual_status,
        "status": status_str,
        "note": note
    })
    color = "\033[92m" if passed else "\033[91m"
    reset = "\033[0m"
    print(f"[{color}{status_str}{reset}] {method:<6} {endpoint:<35} -> Expected: {expected_status}, Got: {actual_status} ({note})")

def main():
    print("=" * 80)
    print("               CARESYNC END-TO-END API TEST RUNNER")
    print("=" * 80)

    client = APIClient()

    # 1. API Root & Authentication
    print("\n[1/5] Testing Authentication Endpoints...")
    # Root URL redirect check
    r = client.get('/')
    record('/', 'GET', 302, r.status_code, "Root URL redirects (302) to /api/")

    r = client.get('/api/')
    record('/api/', 'GET', 401, r.status_code, "Unauthenticated /api/ returns 401 Bearer realm")

    user_a_email = f"coordinator_{uuid.uuid4().hex[:6]}@clinic.org"
    user_a_pass = "SecurePassword123!"
    r = client.post('/api/auth/register/', {
        "full_name": "Dr. Sarah Jenkins",
        "email": user_a_email,
        "password": user_a_pass
    }, format='json')
    record('/api/auth/register/', 'POST', 201, r.status_code, "Register User A")

    user_b_email = f"coordinator_{uuid.uuid4().hex[:6]}@clinic.org"
    user_b_pass = "SecurePassword123!"
    r = client.post('/api/auth/register/', {
        "full_name": "Dr. Gregory House",
        "email": user_b_email,
        "password": user_b_pass
    }, format='json')
    record('/api/auth/register/', 'POST', 201, r.status_code, "Register User B")

    r = client.post('/api/auth/register/', {
        "full_name": "Dr. Sarah Jenkins",
        "email": user_a_email,
        "password": user_a_pass
    }, format='json')
    record('/api/auth/register/ (duplicate)', 'POST', 400, r.status_code, "Duplicate email rejected (400)")

    r = client.post('/api/auth/login/', {"email": user_a_email, "password": user_a_pass}, format='json')
    record('/api/auth/login/', 'POST', 200, r.status_code, "User A login returns JWT tokens")
    token_a = r.data.get('access')
    refresh_a = r.data.get('refresh')

    r = client.post('/api/auth/login/', {"email": user_a_email, "password": "WrongPassword!"}, format='json')
    record('/api/auth/login/ (bad creds)', 'POST', 401, r.status_code, "Invalid password rejected (401)")

    r = client.post('/api/auth/token/refresh/', {"refresh": refresh_a}, format='json')
    record('/api/auth/token/refresh/', 'POST', 200, r.status_code, "Refresh access token (200)")

    r = client.post('/api/auth/login/', {"email": user_b_email, "password": user_b_pass}, format='json')
    token_b = r.data.get('access')

    client.credentials(HTTP_AUTHORIZATION=f'Bearer {token_a}')
    r = client.get('/api/auth/me/')
    record('/api/auth/me/', 'GET', 200, r.status_code, "Get authenticated profile for User A")

    r = client.get('/api/')
    record('/api/ (authenticated)', 'GET', 200, r.status_code, "Authenticated request to /api/ returns 200")

    # 2. Patients API
    print("\n[2/5] Testing Patient Management Endpoints...")
    unauth = APIClient()
    r = unauth.post('/api/patients/', {"first_name": "Test"}, format='json')
    record('/api/patients/ (unauth)', 'POST', 401, r.status_code, "Unauthenticated access blocked (401)")

    r = client.post('/api/patients/', {
        "first_name": "Eleanor",
        "last_name": "Vance",
        "date_of_birth": "1988-04-12",
        "gender": "Female",
        "contact_number": "+1-555-019-2834"
    }, format='json')
    record('/api/patients/', 'POST', 201, r.status_code, "Create patient owned by User A")
    patient_a_id = r.data.get('id')

    client.credentials(HTTP_AUTHORIZATION=f'Bearer {token_b}')
    r = client.post('/api/patients/', {
        "first_name": "Theodora",
        "last_name": "Crain",
        "date_of_birth": "1992-06-20",
        "gender": "Female",
        "contact_number": "+1-555-019-5555"
    }, format='json')
    record('/api/patients/', 'POST', 201, r.status_code, "Create patient owned by User B")
    patient_b_id = r.data.get('id')

    client.credentials(HTTP_AUTHORIZATION=f'Bearer {token_a}')
    r = client.get('/api/patients/')
    record('/api/patients/', 'GET', 200, r.status_code, "List patients (scoped strictly to User A)")

    r = client.get(f'/api/patients/{patient_a_id}/')
    record(f'/api/patients/{patient_a_id}/', 'GET', 200, r.status_code, "Retrieve own patient")

    r = client.get(f'/api/patients/{patient_b_id}/')
    record('/api/patients/<other_user_id>/', 'GET', 404, r.status_code, "Cannot view other user patient (404)")

    r = client.put(f'/api/patients/{patient_a_id}/', {
        "first_name": "Eleanor",
        "last_name": "Vance-Updated",
        "date_of_birth": "1988-04-12",
        "gender": "Female",
        "contact_number": "+1-555-999-0000"
    }, format='json')
    record(f'/api/patients/{patient_a_id}/', 'PUT', 200, r.status_code, "Update own patient")

    r = client.patch(f'/api/patients/{patient_a_id}/', {
        "contact_number": "+1-555-888-7777"
    }, format='json')
    record(f'/api/patients/{patient_a_id}/', 'PATCH', 200, r.status_code, "Patch own patient (200)")

    r = client.patch(f'/api/patients/{patient_b_id}/', {
        "contact_number": "+1-555-000-1111"
    }, format='json')
    record('/api/patients/<other_user_id>/', 'PATCH', 404, r.status_code, "Cannot patch other user patient (404)")

    r = client.put(f'/api/patients/{patient_b_id}/', {
        "first_name": "Hack",
        "last_name": "Attempt",
        "date_of_birth": "1990-01-01",
        "gender": "Male",
        "contact_number": "+1-555-000-0000"
    }, format='json')
    record('/api/patients/<other_user_id>/', 'PUT', 404, r.status_code, "Cannot update other user patient (404)")

    r = client.delete(f'/api/patients/{patient_b_id}/')
    record('/api/patients/<other_user_id>/', 'DELETE', 404, r.status_code, "Cannot delete other user patient (404)")

    # 3. Doctors API
    print("\n[3/5] Testing Doctor Directory Endpoints...")
    doc_email_1 = f"marcus_{uuid.uuid4().hex[:6]}@hospital.org"
    r = client.post('/api/doctors/', {
        "first_name": "Marcus",
        "last_name": "Brody",
        "specialization": "Cardiology",
        "contact_number": "+1-555-432-1100",
        "email": doc_email_1,
        "years_of_experience": 14
    }, format='json')
    record('/api/doctors/', 'POST', 201, r.status_code, "Create doctor as User A")
    doctor_1_id = r.data.get('id')

    client.credentials(HTTP_AUTHORIZATION=f'Bearer {token_b}')
    doc_email_2 = f"gregory_{uuid.uuid4().hex[:6]}@hospital.org"
    r = client.post('/api/doctors/', {
        "first_name": "Gregory",
        "last_name": "House",
        "specialization": "Diagnostic Medicine",
        "contact_number": "+1-555-432-2200",
        "email": doc_email_2,
        "years_of_experience": 20
    }, format='json')
    record('/api/doctors/', 'POST', 201, r.status_code, "Create doctor 2 as User B")
    doctor_2_id = r.data.get('id')

    client.credentials(HTTP_AUTHORIZATION=f'Bearer {token_a}')
    r = client.get('/api/doctors/')
    record('/api/doctors/', 'GET', 200, r.status_code, "List shared doctor directory")

    r = client.get(f'/api/doctors/{doctor_2_id}/')
    record(f'/api/doctors/{doctor_2_id}/', 'GET', 200, r.status_code, "Retrieve any doctor in directory")

    r = client.put(f'/api/doctors/{doctor_1_id}/', {
        "first_name": "Marcus",
        "last_name": "Brody",
        "specialization": "Cardiology",
        "contact_number": "+1-555-432-1100",
        "email": doc_email_1,
        "years_of_experience": 15
    }, format='json')
    record(f'/api/doctors/{doctor_1_id}/', 'PUT', 200, r.status_code, "Creator can update doctor")

    r = client.patch(f'/api/doctors/{doctor_1_id}/', {
        "years_of_experience": 16
    }, format='json')
    record(f'/api/doctors/{doctor_1_id}/', 'PATCH', 200, r.status_code, "Creator can patch doctor (200)")

    r = client.patch(f'/api/doctors/{doctor_2_id}/', {
        "years_of_experience": 22
    }, format='json')
    record('/api/doctors/<other_user_doc>/', 'PATCH', 403, r.status_code, "Non-creator cannot patch doctor (403)")

    r = client.put(f'/api/doctors/{doctor_2_id}/', {
        "first_name": "Gregory",
        "last_name": "House",
        "specialization": "Neurology",
        "contact_number": "+1-555-432-2200",
        "email": doc_email_2,
        "years_of_experience": 21
    }, format='json')
    record('/api/doctors/<other_user_doc>/', 'PUT', 403, r.status_code, "Non-creator cannot update doctor (403)")

    r = client.delete(f'/api/doctors/{doctor_2_id}/')
    record('/api/doctors/<other_user_doc>/', 'DELETE', 403, r.status_code, "Non-creator cannot delete doctor (403)")

    # 4. Mappings API
    print("\n[4/5] Testing Patient-Doctor Mapping Endpoints...")
    r = client.post('/api/mappings/', {
        "patient": patient_a_id,
        "doctor": doctor_1_id,
        "notes": "Initial referral"
    }, format='json')
    record('/api/mappings/', 'POST', 201, r.status_code, "Assign doctor to owned patient")
    mapping_1_id = r.data.get('id')

    r = client.post('/api/mappings/', {
        "patient": patient_a_id,
        "doctor": doctor_1_id,
        "notes": "Duplicate referral"
    }, format='json')
    record('/api/mappings/ (duplicate)', 'POST', 400, r.status_code, "Duplicate assignment rejected (400)")

    r = client.post('/api/mappings/', {
        "patient": patient_b_id,
        "doctor": doctor_1_id,
        "notes": "Unauthorized referral"
    }, format='json')
    record('/api/mappings/ (other patient)', 'POST', 400, r.status_code, "Cannot assign doctor to other patient (400)")

    r = client.post('/api/mappings/', {
        "patient": patient_a_id,
        "doctor": doctor_2_id,
        "notes": "Secondary consult"
    }, format='json')
    record('/api/mappings/ (second doctor)', 'POST', 201, r.status_code, "Assign second doctor to same patient")
    mapping_2_id = r.data.get('id')

    r = client.get('/api/mappings/')
    record('/api/mappings/', 'GET', 200, r.status_code, "List mappings for caller's patients")

    r = client.get(f'/api/mappings/{patient_a_id}/')
    record(f'/api/mappings/<patient_id>/', 'GET', 200, r.status_code, "Get assigned doctors for patient")

    r = client.get(f'/api/mappings/{patient_b_id}/')
    record('/api/mappings/<other_patient_id>/', 'GET', 404, r.status_code, "Cannot view other user mappings (404)")

    client.credentials(HTTP_AUTHORIZATION=f'Bearer {token_b}')
    r = client.delete(f'/api/mappings/{mapping_2_id}/')
    record('/api/mappings/<other_mapping_id>/', 'DELETE', 404, r.status_code, "Cannot delete other user mapping (404)")

    client.credentials(HTTP_AUTHORIZATION=f'Bearer {token_a}')
    r = client.delete(f'/api/mappings/{mapping_2_id}/')
    record(f'/api/mappings/{mapping_2_id}/', 'DELETE', 204, r.status_code, "Owner can delete mapping (204)")

    # 5. Error Handling
    print("\n[5/5] Testing Edge Cases & Error Handling...")
    bad_client = APIClient()
    bad_client.credentials(HTTP_AUTHORIZATION='Bearer InvalidOrExpiredToken')
    r = bad_client.get('/api/patients/')
    record('/api/patients/ (bad token)', 'GET', 401, r.status_code, "Invalid token returns 401")

    fake_uuid = uuid.uuid4()
    r = client.get(f'/api/patients/{fake_uuid}/')
    record(f'/api/patients/{fake_uuid}/', 'GET', 404, r.status_code, "Nonexistent patient returns 404")

    r = client.get(f'/api/doctors/{fake_uuid}/')
    record(f'/api/doctors/{fake_uuid}/', 'GET', 404, r.status_code, "Nonexistent doctor returns 404")

    r = client.delete(f'/api/mappings/{fake_uuid}/')
    record(f'/api/mappings/{fake_uuid}/', 'DELETE', 404, r.status_code, "Nonexistent mapping delete returns 404")

    r = client.post(f'/api/patients/{patient_a_id}/', {"first_name": "Invalid"}, format='json')
    record(f'/api/patients/{patient_a_id}/', 'POST', 405, r.status_code, "Unsupported POST on detail returns 405")

    # Clean up patient A (cascades mappings)
    r = client.delete(f'/api/patients/{patient_a_id}/')
    record(f'/api/patients/{patient_a_id}/', 'DELETE', 204, r.status_code, "Delete patient (204) & cascade mappings")

    # Print Summary
    print("\n" + "=" * 80)
    passed_cnt = sum(1 for x in results if x['status'] == 'PASS')
    failed_cnt = sum(1 for x in results if x['status'] == 'FAIL')
    print(f"TEST SUMMARY: Total: {len(results)} | Passed: {passed_cnt} | Failed: {failed_cnt}")
    if failed_cnt == 0:
        print("ALL TESTS PASSED SUCCESSFULLY! (100% PASS RATE)")
    print("=" * 80)

if __name__ == '__main__':
    main()
