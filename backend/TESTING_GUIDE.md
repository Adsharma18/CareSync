# CareSync — Step-by-Step Testing Guide

This guide provides step-by-step instructions to run all CareSync automated tests, verification scripts, and endpoint checks.

---

## Prerequisites

Before running tests, ensure your virtual environment is active and PostgreSQL is running:

```powershell
# Activate virtual environment (Windows PowerShell)
.\.venv\Scripts\Activate.ps1

# Or in Windows Command Prompt (cmd.exe)
.\.venv\Scripts\activate.bat
```

Verify your environment configuration:
```powershell
python manage.py check
```

---

## Method 1: One-Click Automated Test Runner (Recommended)

You can run the complete automated check suite with a single command.

### In PowerShell:
```powershell
.\run_tests.ps1
```

### In Windows Command Prompt / Double-click:
```cmd
run_tests.bat
```

**What this executes automatically:**
1. Django System Configuration Checks (`python manage.py check`)
2. Database Migration Status Checks (`python manage.py makemigrations --check --dry-run`)
3. Full Django Automated Test Suite (63 unit & integration tests)
4. End-to-End Live API Verification (40 endpoint and permission checks)

---

## Method 2: Running the Django Automated Test Suite

CareSync includes **63 automated tests** covering user registration, JWT authentication, patient isolation, doctor directory permissions, and mapping constraints.

### 1. Run All 63 Tests
```powershell
python manage.py test
```

### 2. Run All Tests with Detailed (Verbose) Output
```powershell
python manage.py test --verbosity=2
```

### 3. Run Tests App-by-App
You can execute tests for individual applications:

* **Authentication & User Account Tests (10 tests):**
  ```powershell
  python manage.py test apps.accounts
  ```
* **Patient Management & Isolation Tests (15 tests):**
  ```powershell
  python manage.py test apps.patients
  ```
* **Doctor Directory & Permission Tests (14 tests):**
  ```powershell
  python manage.py test apps.doctors
  ```
* **Patient-Doctor Mapping & Validation Tests (24 tests):**
  ```powershell
  python manage.py test apps.mappings
  ```

---

## Method 3: Running the End-to-End API Verification Script

A dedicated verification script is located at [`scripts/verify_apis.py`](scripts/verify_apis.py). It tests all 16 endpoints live:

```powershell
python scripts/verify_apis.py
```

**Verification Coverage (40 Checks):**
* **Auth**: Registration, login, invalid credentials, duplicate email rejection, token refresh, and `/api/auth/me/`.
* **Patients**: Create, list, retrieve, update, delete, unauthenticated rejection, and cross-tenant `404` isolation.
* **Doctors**: Create, list shared directory, retrieve, creator update, non-creator `403` rejection.
* **Mappings**: Assign, duplicate `400` rejection, cross-tenant patient `400` rejection, retrieve assigned physicians, cascading deletion.
* **Error Handling**: Malformed tokens (`401`), non-existent UUIDs (`404`), unsupported HTTP methods (`405`).

---

## Method 4: Manual Endpoint Testing via curl / Postman

### Step 1: Start the Local Development Server
```powershell
python manage.py runserver
```
The server will start at `http://127.0.0.1:8000/`.

---

### Step 2: Register & Log In (Get Your Token)

#### 1. Register User:
```bash
curl -X POST http://127.0.0.1:8000/api/auth/register/ \
  -H "Content-Type: application/json" \
  -d '{"full_name": "Dr. Sarah Jenkins", "email": "sarah@clinic.org", "password": "SecurePassword123!"}'
```

#### 2. Log In:
```bash
curl -X POST http://127.0.0.1:8000/api/auth/login/ \
  -H "Content-Type: application/json" \
  -d '{"email": "sarah@clinic.org", "password": "SecurePassword123!"}'
```
*Copy the `"access"` token from the JSON response.*

---

### Step 3: Call Protected Endpoints with the Token

Attach the header `Authorization: Bearer <your_access_token>` to every request:

#### 1. API Directory Root:
```bash
curl -X GET http://127.0.0.1:8000/api/ \
  -H "Authorization: Bearer <your_access_token>"
```

#### 2. Create Patient:
```bash
curl -X POST http://127.0.0.1:8000/api/patients/ \
  -H "Authorization: Bearer <your_access_token>" \
  -H "Content-Type: application/json" \
  -d '{"first_name": "Eleanor", "last_name": "Vance", "date_of_birth": "1988-04-12", "gender": "Female", "contact_number": "+1-555-019-2834"}'
```

#### 3. List Patients:
```bash
curl -X GET http://127.0.0.1:8000/api/patients/ \
  -H "Authorization: Bearer <your_access_token>"
```

#### 4. List Doctors:
```bash
curl -X GET http://127.0.0.1:8000/api/doctors/ \
  -H "Authorization: Bearer <your_access_token>"
```

---

## Troubleshooting

| Issue / Error | Cause | Solution |
| :--- | :--- | :--- |
| `401 Unauthorized` | Missing or expired Bearer token | Call `POST /api/auth/login/` and include `Authorization: Bearer <access_token>` |
| `404 Not Found` | Opened root URL (`/`) or non-existent / other user's record | Use `/api/` or `/admin/`. Ensure patient belongs to caller |
| `403 Forbidden` | Attempting to edit or delete a doctor created by another user | Only the creator coordinator or staff can mutate doctor records |
| `Connection refused` (PostgreSQL) | Database server is stopped | Ensure PostgreSQL service is running (`net start postgresql-x64-17`) |
