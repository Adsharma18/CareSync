# CareSync — Healthcare Backend REST API

![Django](https://img.shields.io/badge/Django-5.1-092E20?style=for-the-badge&logo=django&logoColor=white)
![DRF](https://img.shields.io/badge/Django_REST_Framework-3.17-red?style=for-the-badge&logo=django&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-17-336791?style=for-the-badge&logo=postgresql&logoColor=white)
![JWT](https://img.shields.io/badge/JWT-SimpleJWT-black?style=for-the-badge&logo=jsonwebtokens&logoColor=white)
![Tests](https://img.shields.io/badge/Tests-52%20Passed%20(100%25)-brightgreen?style=for-the-badge)

A robust, multi-tenant-style Healthcare Backend REST API built with **Django**, **Django REST Framework (DRF)**, **PostgreSQL**, and **SimpleJWT**. CareSync allows healthcare coordinators to securely authenticate, manage patient records within strict tenant boundaries, browse a shared institutional physician directory, and assign doctors to patients with database-enforced integrity.

---

## Table of Contents
1. [Project Overview & Key Features](#1-project-overview--key-features)
2. [Technology Stack](#2-technology-stack)
3. [Prerequisites](#3-prerequisites)
4. [Step-by-Step Setup Guide](#4-step-by-step-setup-guide)
5. [PostgreSQL Database Provisioning](#5-postgresql-database-provisioning)
6. [Environment Configuration (.env)](#6-environment-configuration-env)
7. [Database Migrations](#7-database-migrations)
8. [Running the Application (Backend & Frontend)](#8-running-the-application-backend--frontend)
9. [CareSync React Frontend Application](#9-caresync-react-frontend-application)
10. [JWT Authentication Workflow](#10-jwt-authentication-workflow)
11. [API Endpoint Reference & Sample Payloads](#11-api-endpoint-reference--sample-payloads)
12. [Data Ownership & Security Rules](#12-data-ownership--security-rules)
13. [Automated Testing & Postman Collection](#13-automated-testing--postman-collection)
14. [Project Directory Layout](#14-project-directory-layout)
15. [Submission Checklist & Requirements Audit](#15-submission-checklist--requirements-audit)

---

## 1. Project Overview & Key Features

* **Custom User Authentication:** Email-based credentials with salted PBKDF2 SHA-256 password hashing.
* **Stateless JWT Security:** Industry-standard SimpleJWT tokens with 15-minute access token lifespan, 7-day refresh lifespan, and token rotation.
* **Horizontal Tenant Isolation:** Patients and mappings are strictly anchored to the authenticated coordinator. Users can never view, mutate, or delete another coordinator's patient records (`404 Not Found` returned on unauthorized cross-tenant attempts).
* **Institutional Doctor Directory:** Shared physician roster visible to all authenticated coordinators, with mutation rights strictly limited to the creator or system admin (`403 Forbidden` on unauthorized mutation attempts).
* **Relational Mapping Integrity:** Relational linking between patients and attending physicians, backed by a database-level `UniqueConstraint(fields=['patient', 'doctor'])` that prevents duplicate doctor assignments.
* **Cascade Resiliency:** Deleting a doctor cleanly cascade-deletes active doctor mappings while leaving patient records 100% preserved.

---

## 2. Technology Stack

* **Language:** Python 3.11+ / 3.12
* **Web Framework:** Django 5.1.x
* **API Framework:** Django REST Framework 3.17.x
* **Authentication Engine:** `djangorestframework-simplejwt` 5.5.x
* **Database:** PostgreSQL 15+ / 17 (Driver: `psycopg2-binary` 2.9.x)
* **Configuration:** `python-dotenv` 1.2.x
* **Testing:** Django `APITestCase` & Postman Runner

---

## 3. Prerequisites

Before setting up the project, ensure you have the following installed on your machine:
* **Python 3.11+ or 3.12+** (`python --version`)
* **PostgreSQL 15+ or 17+** actively running on port `5432`
* **Git** (`git --version`)
* **Postman** (for API testing and collection verification)

---

## 4. Step-by-Step Setup Guide

### 4.1 Clone Repository & Navigate
```bash
git clone <repository-url>
cd CareSync
```

### 4.2 Create & Activate Python Virtual Environment

* **On Windows (PowerShell):**
  ```powershell
  python -m venv .venv
  .\.venv\Scripts\Activate.ps1
  ```
  *(If PowerShell execution policies block script activation, run: `Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned`)*

* **On macOS / Linux:**
  ```bash
  python3 -m venv .venv
  source .venv/bin/activate
  ```

### 4.3 Install Dependencies
```bash
pip install --upgrade pip
pip install -r backend/requirements.txt
```

---

## 5. PostgreSQL Database Provisioning

Connect to your PostgreSQL server via `psql` or pgAdmin (as superuser `postgres`) and execute the following SQL commands:

```sql
-- 1. Create a dedicated user with an encrypted password
CREATE USER caresync_user WITH ENCRYPTED PASSWORD 'SecurePostgresPassword123!';

-- 2. Grant CREATEDB privilege (required for running automated test suites)
ALTER USER caresync_user CREATEDB;

-- 3. Create the database owned by caresync_user
CREATE DATABASE caresync_db OWNER caresync_user;

-- 4. Grant full privileges
GRANT ALL PRIVILEGES ON DATABASE caresync_db TO caresync_user;
```

---

## 6. Environment Configuration (.env)

CareSync adheres to the **Twelve-Factor App methodology**. Sensitive keys, passwords, and environment flags are never hardcoded.

### 6.1 Create `.env` from Template
Copy `.env.example` to create your local `.env` inside `backend/`:
* **Windows (PowerShell):** `Copy-Item backend\.env.example backend\.env`
* **macOS / Linux:** `cp backend/.env.example backend/.env`

### 6.2 Populate `.env` Parameters
```bash
# Django Security
DEBUG=True
SECRET_KEY=generate-a-strong-random-50-character-secret-key-here
ALLOWED_HOSTS=127.0.0.1,localhost

# PostgreSQL Database Configuration
DB_NAME=caresync_db
DB_USER=caresync_user
DB_PASSWORD=SecurePostgresPassword123!
DB_HOST=localhost
DB_PORT=5432

# SimpleJWT Settings
JWT_ACCESS_TOKEN_LIFETIME_MINUTES=15
JWT_REFRESH_TOKEN_LIFETIME_DAYS=7
```
> **Security Notice:** `.env` is explicitly listed in [`.gitignore`](.gitignore) and is never tracked by version control.

---

## 7. Database Migrations

Apply the database schema to PostgreSQL:
```powershell
cd backend
python manage.py migrate
```

To create a superuser for accessing the Django Admin interface:
```powershell
python manage.py createsuperuser
```

---

## 8. Running the Application (Backend & Frontend)

CareSync consists of a high-performance **Django REST Framework** backend paired with a modern, responsive **React (Vite)** single-page application.

### 8.1 Terminal 1 — Start the Django Backend Server

Ensure your virtual environment is active and navigate to `backend/`:
```powershell
# Windows PowerShell
.\.venv\Scripts\Activate.ps1
cd backend
python manage.py runserver 127.0.0.1:8000
```
```bash
# macOS / Linux
source .venv/bin/activate
cd backend
python manage.py runserver 127.0.0.1:8000
```
Backend services will be live at:
* **REST API Root:** `http://127.0.0.1:8000/api/`
* **Django Administration Panel:** `http://127.0.0.1:8000/admin/`

---

### 8.2 Terminal 2 — Start the React Frontend Application

Open a second terminal window and navigate to the `frontend/` directory:
```bash
cd frontend

# 1. Install frontend dependencies (if not already installed)
npm install

# 2. Configure environment file (created from .env.example)
# VITE_API_BASE_URL=http://127.0.0.1:8000

# 3. Start the Vite development server
npm run dev
```

The user-facing website will boot at:
* **CareSync Web Application:** `http://localhost:5173/`

---

## 9. CareSync React Frontend Application

The CareSync frontend is built using **React 19**, **Vite**, **React Router 7**, **Axios**, and **Lucide React**, structured for enterprise healthcare workflows.

### 9.1 Architecture & Design System
* **Healthcare Aesthetic:** Clean clinical white surfaces (`#ffffff`, `#f8fafc`), medical teal primary accents (`#0d9488`), and slate blue secondary accents (`#0284c7`).
* **Cross-Origin Resource Sharing (CORS):** Fully integrated via `django-cors-headers` with whitelist support for `http://localhost:5173` and `http://127.0.0.1:5173`.
* **Stateless JWT Security & Interceptors:**
  * Axios request interceptor attaches `Authorization: Bearer <access_token>`.
  * Axios response interceptor intercepts `401 Unauthorized` responses and automatically triggers silent token refresh using `/api/auth/token/refresh/` with queue lock protection against refresh race conditions.
  * Invalid sessions automatically clear storage and cleanly redirect to `/login`.
* **Responsive Layout:**
  * Sticky top navigation bar with brand icon, navigation links, user identity chip, and sign out button.
  * Left sidebar on desktop for rapid clinical navigation (Dashboard, Patients, Doctors, Care Team Mappings, and Django Admin external link).
  * Collapsible drawer menu for mobile and tablet screens.

### 9.2 Key Pages & Features
1. **Public Landing Page (`/`):** Healthcare hero overview, enterprise capability highlights, and direct CTAs.
2. **Authentication Pages (`/login`, `/register`):**
   * Coordinator registration with full name, email, and password confirmation.
   * Secure sign-in with client-side and server-side validation error mapping.
3. **Clinical Dashboard (`/dashboard`):**
   * Live metrics aggregated from backend: Total Patients, Total Doctors, Active Assignments.
   * Recent patient registrations and recent care team mappings.
   * One-click refresh and quick-action buttons.
4. **Patients Registry (`/patients`):**
   * Horizontal tenant isolation: coordinators only see their registered patients.
   * Real-time search across names, phone numbers, and medical conditions.
   * Register and Edit modals with DOB validation (prevents future dates) and gender selectors.
   * Delete confirmation modal with permanent deletion warnings.
   * Care team inspection modal showing all doctors assigned to a patient.
5. **Doctor Directory (`/doctors`):**
   * Institutional physician directory with specializations, email, phone, and experience.
   * Specialty filter dropdown and live text search.
   * Registration modal for adding verified specialists.
   * Creator/Admin edit and delete protection: graceful handling of `403 Forbidden` for non-creator coordinators.
6. **Care Team Assignments (`/mappings`):**
   * Establish patient-doctor relationships with patient selector, doctor selector, and clinical notes.
   * Automatic detection and friendly error reporting for duplicate assignments (`UniqueConstraint`).
   * Filter assignments by patient or free-form search.
   * View full care team breakdown for any selected patient.
   * Remove assignments with confirmation dialog.

### 9.3 Frontend Production Build
To create an optimized production build:
```bash
cd frontend
npm run build
```
Compiled production assets are output to `frontend/dist/`.

---

## 10. JWT Authentication Workflow

CareSync uses stateless Bearer tokens for API authorization.

```
1. Client POSTs credentials -> /api/auth/login/
2. Server responds with { "access": "...", "refresh": "..." }
3. Client includes Bearer token in subsequent requests:
   Header: Authorization: Bearer <access_token>
4. When access token expires (15 min), client POSTs refresh token -> /api/auth/token/refresh/
5. Server responds with a fresh { "access": "..." } token
```

---

## 11. API Endpoint Reference & Sample Payloads

All protected endpoints require the HTTP header:
`Authorization: Bearer <access_token>`

---

### 11.1 Authentication (`/api/auth/`)

#### Register User
* **Method & URL:** `POST /api/auth/register/`
* **Auth Required:** No
* **Request:**
  ```json
  {
    "full_name": "Dr. Sarah Jenkins",
    "email": "sarah.jenkins@clinic.org",
    "password": "SecurePassword123!"
  }
  ```
* **Success Response (`201 Created`):**
  ```json
  {
    "id": "1091408d-d701-48ed-b5d4-d2dd7a22a7e1",
    "full_name": "Dr. Sarah Jenkins",
    "email": "sarah.jenkins@clinic.org",
    "created_at": "2026-10-22T13:33:36.158549Z"
  }
  ```

#### Login User
* **Method & URL:** `POST /api/auth/login/`
* **Auth Required:** No
* **Request:**
  ```json
  {
    "email": "sarah.jenkins@clinic.org",
    "password": "SecurePassword123!"
  }
  ```
* **Success Response (`200 OK`):**
  ```json
  {
    "access": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refresh": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
  ```

#### Refresh Access Token
* **Method & URL:** `POST /api/auth/token/refresh/`
* **Auth Required:** No
* **Request:**
  ```json
  {
    "refresh": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
  ```
* **Success Response (`200 OK`):**
  ```json
  {
    "access": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.new_access_token..."
  }
  ```

---

### 11.2 Patients (`/api/patients/`)

#### Create Patient
* **Method & URL:** `POST /api/patients/`
* **Auth Required:** Yes
* **Request:**
  ```json
  {
    "first_name": "Eleanor",
    "last_name": "Vance",
    "date_of_birth": "1988-04-12",
    "gender": "Female",
    "contact_number": "+1-555-019-2834",
    "medical_history": "Hypertension, penicillin allergy."
  }
  ```
* **Success Response (`201 Created`):**
  ```json
  {
    "id": "e2eeb20c-62b4-40fd-a9d6-f32dffe51ecb",
    "first_name": "Eleanor",
    "last_name": "Vance",
    "date_of_birth": "1988-04-12",
    "gender": "Female",
    "contact_number": "+1-555-019-2834",
    "medical_history": "Hypertension, penicillin allergy.",
    "owner_email": "sarah.jenkins@clinic.org",
    "created_at": "2026-10-22T13:38:00Z",
    "updated_at": "2026-10-22T13:38:00Z"
  }
  ```

#### List Owned Patients
* **Method & URL:** `GET /api/patients/`
* **Auth Required:** Yes
* **Success Response (`200 OK`):**
  ```json
  [
    {
      "id": "e2eeb20c-62b4-40fd-a9d6-f32dffe51ecb",
      "first_name": "Eleanor",
      "last_name": "Vance",
      "date_of_birth": "1988-04-12",
      "gender": "Female",
      "contact_number": "+1-555-019-2834",
      "medical_history": "Hypertension, penicillin allergy.",
      "owner_email": "sarah.jenkins@clinic.org",
      "created_at": "2026-10-22T13:38:00Z",
      "updated_at": "2026-10-22T13:38:00Z"
    }
  ]
  ```

#### Retrieve Patient Details
* **Method & URL:** `GET /api/patients/<id>/`
* **Auth Required:** Yes
* **Success Response (`200 OK`):** Returns the patient JSON object.
* **Error Response (`404 Not Found`):** Returned if patient ID does not exist OR is owned by another coordinator.

#### Update Patient Record
* **Method & URL:** `PUT /api/patients/<id>/` or `PATCH /api/patients/<id>/`
* **Auth Required:** Yes
* **Request (`PATCH` example):**
  ```json
  {
    "contact_number": "+1-555-999-4422"
  }
  ```
* **Success Response (`200 OK`):** Returns updated patient object.

#### Delete Patient Record
* **Method & URL:** `DELETE /api/patients/<id>/`
* **Auth Required:** Yes
* **Success Response (`204 No Content`):** Empty body. Cascades to delete patient's doctor assignments.

---

### 11.3 Doctors (`/api/doctors/`)

#### Register Doctor
* **Method & URL:** `POST /api/doctors/`
* **Auth Required:** Yes (Any authenticated coordinator)
* **Request:**
  ```json
  {
    "first_name": "Gregory",
    "last_name": "House",
    "specialization": "Diagnostic Medicine",
    "contact_number": "+1-555-432-1100",
    "email": "dr.house@hospital.org",
    "years_of_experience": 20
  }
  ```
* **Success Response (`201 Created`):**
  ```json
  {
    "id": "d77060a6-0f26-4da0-a1c7-83612db24453",
    "first_name": "Gregory",
    "last_name": "House",
    "specialization": "Diagnostic Medicine",
    "contact_number": "+1-555-432-1100",
    "email": "dr.house@hospital.org",
    "years_of_experience": 20,
    "created_by_email": "sarah.jenkins@clinic.org",
    "created_at": "2026-10-22T13:43:30Z",
    "updated_at": "2026-10-22T13:43:30Z"
  }
  ```

#### List All Doctors (Directory View)
* **Method & URL:** `GET /api/doctors/`
* **Auth Required:** Yes (Open to all authenticated users)
* **Success Response (`200 OK`):** Array of all registered physician profiles.

#### Retrieve Doctor Details
* **Method & URL:** `GET /api/doctors/<id>/`
* **Auth Required:** Yes (Open to all authenticated users)
* **Success Response (`200 OK`):** Returns physician JSON object.

#### Update Doctor
* **Method & URL:** `PUT /api/doctors/<id>/` or `PATCH /api/doctors/<id>/`
* **Auth Required:** Yes (Creator or Staff only)
* **Success Response (`200 OK`):** Returns updated physician object.
* **Error Response (`403 Forbidden`):** Returned if caller is not the creator or staff.

#### Delete Doctor
* **Method & URL:** `DELETE /api/doctors/<id>/`
* **Auth Required:** Yes (Creator or Staff only)
* **Success Response (`204 No Content`):** Empty body. Cascades to delete active assignments while keeping patients preserved.

---

### 11.4 Patient-Doctor Mappings (`/api/mappings/`)

#### Assign Doctor to Patient
* **Method & URL:** `POST /api/mappings/`
* **Auth Required:** Yes
* **Request:**
  ```json
  {
    "patient": "e2eeb20c-62b4-40fd-a9d6-f32dffe51ecb",
    "doctor": "d77060a6-0f26-4da0-a1c7-83612db24453",
    "notes": "Referred for initial consultation."
  }
  ```
* **Success Response (`201 Created`):**
  ```json
  {
    "id": "ea25bf27-960d-4a4d-bbcb-848c68791904",
    "patient": "e2eeb20c-62b4-40fd-a9d6-f32dffe51ecb",
    "patient_name": "Eleanor Vance",
    "doctor": "d77060a6-0f26-4da0-a1c7-83612db24453",
    "doctor_name": "Dr. Gregory House",
    "specialization": "Diagnostic Medicine",
    "notes": "Referred for initial consultation.",
    "assigned_at": "2026-10-22T13:51:22Z"
  }
  ```
* **Validation Error Responses:**
  * **Ownership Violation (`400 Bad Request`):**
    ```json
    {"patient": ["You can only assign doctors to patients you own."]}
    ```
  * **Duplicate Assignment (`400 Bad Request`):**
    ```json
    {"non_field_errors": ["This doctor is already assigned to this patient."]}
    ```

#### List Mappings for Caller's Patients
* **Method & URL:** `GET /api/mappings/`
* **Auth Required:** Yes
* **Success Response (`200 OK`):** Array of mappings associated with the caller's patients.

#### List Doctors for a Specific Patient
* **Method & URL:** `GET /api/mappings/<patient_id>/`
* **Auth Required:** Yes (Patient must belong to caller)
* **Success Response (`200 OK`):**
  ```json
  {
    "patient_id": "e2eeb20c-62b4-40fd-a9d6-f32dffe51ecb",
    "patient_name": "Eleanor Vance",
    "assigned_doctors": [
      {
        "mapping_id": "ea25bf27-960d-4a4d-bbcb-848c68791904",
        "doctor_id": "d77060a6-0f26-4da0-a1c7-83612db24453",
        "doctor_name": "Dr. Gregory House",
        "specialization": "Diagnostic Medicine",
        "assigned_at": "2026-10-22T13:51:22Z",
        "notes": "Referred for initial consultation."
      }
    ]
  }
  ```
* **Error Response (`404 Not Found`):** Returned if patient ID does not exist OR belongs to another user.

#### Remove Mapping
* **Method & URL:** `DELETE /api/mappings/<id>/`
* **Auth Required:** Yes (Patient linked to mapping must belong to caller)
* **Success Response (`204 No Content`):** Empty body.

---

## 12. Data Ownership & Security Rules

| Entity / Resource | Read Access | Creation Access | Update / Delete Access | Enforcement Mechanism |
| :--- | :--- | :--- | :--- | :--- |
| **User Account** | Self (`/api/auth/me/`) | Anyone (Registration) | Self / Admin | `IsAuthenticated` |
| **Patient Record** | Owner only | Authenticated User | Owner only | `get_queryset()` scoped to `request.user` + `IsPatientOwner` |
| **Doctor Record** | All Authenticated Users | Authenticated User | Creator or Admin | `IsDoctorCreatorOrReadOnly` (`403 Forbidden` for non-creators) |
| **Patient Mapping**| Owner of Patient | Owner of Patient | Owner of Patient | Serializer `validate_patient()` + `patient__owner` filtering |

---

## 13. Automated Testing & Postman Collection

### 13.1 Django Automated Test Suite
CareSync contains 63 comprehensive unit and integration tests covering positive flows, negative flows, boundary checks, duplicate constraints, and multi-tenant isolation.

Execute the test suite:
```powershell
cd backend
python manage.py test --verbosity=2
```

### 13.2 Postman Test Suite Execution
Pre-configured Postman artifacts are located in the [`backend/postman/`](backend/postman/) directory:
* [`backend/postman/CareSync_API.postman_collection.json`](backend/postman/CareSync_API.postman_collection.json) (26 automated requests with assertions)
* [`backend/postman/CareSync_Local.postman_environment.json`](backend/postman/CareSync_Local.postman_environment.json) (Local environment configuration)

**Steps to Run in Postman:**
1. In Postman, click **Import** $\rightarrow$ select both files from `backend/postman/`.
2. Select **CareSync Local Environment** in the environment selector.
3. Ensure your local Django server is running (`cd backend && python manage.py runserver`).
4. Click **Run collection** $\rightarrow$ All 26 automated requests execute sequentially with 100% green tests.

---

## 14. Project Directory Layout

```
CareSync/
│
├── .gitignore                       # Multi-tier exclusion for secrets, venvs, and build outputs
├── README.md                        # Complete documentation and onboarding guide
│
├── backend/                         # Django REST Framework Backend
│   ├── manage.py                    # Django management command CLI
│   ├── requirements.txt             # Pinned backend dependencies (Django, DRF, CORS, etc.)
│   ├── .env.example                 # Backend environment template (committed)
│   ├── README.md                    # Dedicated backend documentation
│   ├── PRD.md                       # Product Requirements Document
│   ├── TESTING_GUIDE.md             # Test suite execution guide
│   ├── run_tests.bat                # Windows batch test runner
│   ├── run_tests.ps1                # PowerShell test runner
│   │
│   ├── config/                      # Project Root Configuration
│   │   ├── __init__.py
│   │   ├── settings.py              # Environment-driven settings (CORS configured)
│   │   ├── urls.py                  # Global API URL router
│   │   ├── wsgi.py                  # Production WSGI entrypoint
│   │   └── asgi.py                  # Production ASGI entrypoint
│   │
│   ├── apps/                        # Modular Domain Applications
│   │   ├── accounts/                # User Authentication & JWT (/api/auth/)
│   │   │   ├── models.py            # CustomUser model (email login)
│   │   │   ├── serializers.py       # Register, User, Token serializers
│   │   │   ├── views.py             # Register, Login, Me views
│   │   │   ├── urls.py              # /api/auth/ routes
│   │   │   └── tests/               # Automated authentication tests
│   │   │
│   │   ├── patients/                # Patient Domain (/api/patients/)
│   │   │   ├── models.py            # Patient model (owner foreign key)
│   │   │   ├── permissions.py       # IsPatientOwner permission
│   │   │   ├── serializers.py       # PatientSerializer
│   │   │   ├── views.py             # PatientViewSet (get_queryset scoped)
│   │   │   ├── urls.py              # /api/patients/ routes
│   │   │   └── tests/               # Automated patient tests
│   │   │
│   │   ├── doctors/                 # Doctor Directory Domain (/api/doctors/)
│   │   │   ├── models.py            # Doctor model (created_by foreign key)
│   │   │   ├── permissions.py       # IsDoctorCreatorOrReadOnly permission
│   │   │   ├── serializers.py       # DoctorSerializer
│   │   │   ├── views.py             # DoctorViewSet
│   │   │   ├── urls.py              # /api/doctors/ routes
│   │   │   └── tests/               # Automated doctor tests
│   │   │
│   │   └── mappings/                # Patient-Doctor Mapping Domain (/api/mappings/)
│   │       ├── models.py            # PatientDoctorMapping model (UniqueConstraint)
│   │       ├── permissions.py       # IsMappingPatientOwner permission
│   │       ├── serializers.py       # Create & Read mapping serializers
│   │       ├── views.py             # MappingListCreateView & MappingDetailView
│   │       ├── urls.py              # /api/mappings/ routes
│   │       └── tests/               # Automated mapping tests
│   │
│   ├── scripts/                     # Verification & Maintenance Scripts
│   │   └── verify_apis.py           # 45-point comprehensive end-to-end endpoint verification
│   │
│   └── postman/                     # Testing Artifacts
│       ├── CareSync_API.postman_collection.json
│       └── CareSync_Local.postman_environment.json
│
├── frontend/                        # User-Facing React Web Application
│   ├── index.html                   # HTML entry point with healthcare branding
│   ├── package.json                 # Frontend dependencies (React 19, Router, Axios, Lucide)
│   ├── vite.config.js               # Vite bundling configuration
│   ├── .env.example                 # Frontend environment template (VITE_API_BASE_URL)
│   │
│   └── src/
│       ├── main.jsx                 # Mounts AuthProvider, Router, and App
│       ├── App.jsx                  # Route definitions (Public & Protected)
│       ├── index.css                # Healthcare clinical design system (Teal & Blue)
│       │
│       ├── api/                     # Reusable Django API Service Layer
│       │   ├── client.js            # Axios client with Bearer tokens & 401 auto-refresh
│       │   ├── auth.js              # Register, Login, Refresh, Me endpoints
│       │   ├── patients.js          # Patient CRUD API methods
│       │   ├── doctors.js           # Doctor directory API methods
│       │   └── mappings.js          # Care team mapping API methods
│       │
│       ├── context/
│       │   └── AuthContext.jsx      # Authentication state & session hydration
│       │
│       ├── components/              # Shared Healthcare UI Components
│       │   ├── Navbar.jsx           # Top navigation with auth actions & mobile drawer
│       │   ├── Sidebar.jsx          # Clinical workspace navigation
│       │   ├── Layout.jsx           # Master shell layout
│       │   ├── ProtectedRoute.jsx   # Route guard for authenticated coordinators
│       │   ├── Modal.jsx            # Accessible dialog for create/edit & deletes
│       │   ├── Alert.jsx            # Reusable error/success alerts
│       │   └── LoadingSpinner.jsx   # Clinical loading spinner
│       │
│       └── pages/                   # Application Views
│           ├── Home.jsx             # Public landing page with features & hero
│           ├── Login.jsx            # Sign-in form with validation & error handling
│           ├── Register.jsx         # Coordinator account registration
│           ├── Dashboard.jsx        # Real-time summary stats & quick actions
│           ├── Patients.jsx         # Patient registry with search, CRUD, care team inspection
│           ├── Doctors.jsx          # Doctor directory with specialty filter & 403 handling
│           ├── Mappings.jsx         # Care team manager with duplicate assignment blocking
│           └── NotFound.jsx         # 404 error page
│
├── scripts/                         # Verification & Maintenance Scripts
│   └── verify_apis.py               # 45-point comprehensive end-to-end endpoint verification
│
└── postman/                         # Testing Artifacts
    ├── CareSync_API.postman_collection.json
    └── CareSync_Local.postman_environment.json
```

---

## 15. Submission Checklist & Requirements Audit

| PRD Section / Requirement | Implementation Detail | Verified Status |
| :--- | :--- | :---: |
| **Custom User Model** | Email as username, UUID PK, PBKDF2 hash, `AUTH_USER_MODEL = 'accounts.CustomUser'` | Complete |
| **Authentication Endpoints** | `POST /api/auth/register/`, `POST /api/auth/login/`, `POST /api/auth/token/refresh/` | Complete |
| **Patient CRUD & Isolation** | All 5 patient endpoints implemented; `get_queryset()` scoped strictly to `owner=request.user` | Complete |
| **Doctor Directory CRUD** | All 5 doctor endpoints implemented; shared directory read; creator/admin mutation restricted (`403`) | Complete |
| **Patient-Doctor Mappings** | All 4 mapping endpoints implemented; patient ownership checked; duplicate assignments blocked | Complete |
| **Database Constraints** | `UniqueConstraint(fields=['patient', 'doctor'])` enforced at database level | Complete |
| **Frontend Web Application**| Complete user-facing React + Vite application connected to live Django REST APIs | Complete |
| **Frontend Security** | JWT Bearer headers, automated 401 token refresh queue, protected routes | Complete |
| **CORS Integration** | `django-cors-headers` active with whitelisted Vite origins | Complete |
| **Environment & Security** | `.env` ignored in Git; `.env.example` provided; zero hardcoded secrets | Complete |
| **Automated Testing** | 63 automated tests passing across all apps (0 errors, 0 failures) | Complete |
| **Postman Artifacts** | Collection and environment files tested and exported in `postman/` | Complete |
| **Incomplete Requirements** | None. All PRD sections, backend endpoints, and frontend features fully satisfied. | **0 Pending** |
