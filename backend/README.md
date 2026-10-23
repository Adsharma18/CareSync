# CareSync — Django REST Framework Backend

A robust, multi-tenant-style Healthcare Backend REST API built with **Django 5.1**, **Django REST Framework (DRF)**, **PostgreSQL**, and **SimpleJWT**.

CareSync allows healthcare coordinators to securely authenticate, manage patient records within strict tenant boundaries, browse a shared institutional physician directory, and assign doctors to patients with database-enforced integrity.

---

## 1. Technology Stack

* **Language:** Python 3.11+ / 3.12+
* **Framework:** Django 5.1.x
* **API Engine:** Django REST Framework 3.15+
* **Authentication:** `djangorestframework-simplejwt`
* **Database:** PostgreSQL 15+ / 17 (Driver: `psycopg2-binary`)
* **CORS Support:** `django-cors-headers`
* **Configuration:** `python-dotenv`

---

## 2. Directory Layout

```
backend/
├── manage.py                        # Django CLI entrypoint
├── config/                          # Project Root Configuration
│   ├── settings.py                  # Environment-driven settings, PostgreSQL, SimpleJWT, CORS
│   ├── urls.py                      # Global API router, root redirect, and API root view
│   ├── wsgi.py                      # WSGI entrypoint
│   └── asgi.py                      # ASGI entrypoint
├── apps/                            # Modular Domain Applications
│   ├── accounts/                    # User Authentication & JWT (/api/auth/)
│   ├── patients/                    # Patient Management (/api/patients/)
│   ├── doctors/                     # Institutional Doctor Directory (/api/doctors/)
│   └── mappings/                    # Patient-Doctor Mappings (/api/mappings/)
├── scripts/                         # End-to-end API verification runner
├── postman/                         # Pre-configured Postman collection & environment
├── requirements.txt                 # Backend Python dependencies
├── .env.example                     # Environment template (committed)
├── run_tests.bat                    # Windows batch test runner
└── run_tests.ps1                    # PowerShell test runner
```

---

## 3. Quick Start Guide (Windows)

### 3.1 Activate Virtual Environment
From the repository root or backend directory:
```powershell
# In CareSync/ root:
.\.venv\Scripts\Activate.ps1

# Navigate into backend:
cd backend
```

### 3.2 Configure Environment (.env)
Copy `.env.example` to `.env`:
```powershell
Copy-Item .env.example .env
```
Populate `.env` with your PostgreSQL database credentials:
```bash
DEBUG=True
SECRET_KEY=your-secure-random-secret-key-here
ALLOWED_HOSTS=127.0.0.1,localhost
DB_NAME=caresync_db
DB_USER=caresync_user
DB_PASSWORD=SecurePostgresPassword123!
DB_HOST=localhost
DB_PORT=5432
JWT_ACCESS_TOKEN_LIFETIME_MINUTES=15
JWT_REFRESH_TOKEN_LIFETIME_DAYS=7
CORS_ALLOWED_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
```

### 3.3 Apply Migrations & Create Superuser
```powershell
python manage.py migrate
python manage.py createsuperuser
```

### 3.4 Start Development Server
```powershell
python manage.py runserver 127.0.0.1:8000
```
Backend services will be live at:
* **API Root:** `http://127.0.0.1:8000/api/`
* **Django Admin:** `http://127.0.0.1:8000/admin/`

---

## 4. API Endpoint Reference

All protected endpoints require the HTTP header:
`Authorization: Bearer <access_token>`

### 4.1 Authentication (`/api/auth/`)
* `POST /api/auth/register/` — Register a new coordinator (`full_name`, `email`, `password`)
* `POST /api/auth/login/` — Authenticate credentials, returns `{ access, refresh }`
* `POST /api/auth/token/refresh/` — Obtain new access token via `{ refresh }`
* `GET  /api/auth/me/` — Get authenticated coordinator profile

### 4.2 Patients (`/api/patients/`)
* `POST   /api/patients/` — Register patient (caller bound as owner)
* `GET    /api/patients/` — List caller's patients (isolated per coordinator)
* `GET    /api/patients/<id>/` — Retrieve patient details
* `PUT    /api/patients/<id>/` — Full update of patient
* `PATCH  /api/patients/<id>/` — Partial update of patient
* `DELETE /api/patients/<id>/` — Delete patient (cascades to delete active assignments)

### 4.3 Doctors (`/api/doctors/`)
* `POST   /api/doctors/` — Register doctor in institutional directory
* `GET    /api/doctors/` — Shared directory view (open to all authenticated users)
* `GET    /api/doctors/<id>/` — Retrieve doctor details
* `PUT    /api/doctors/<id>/` — Update doctor (creator or admin only, otherwise 403)
* `PATCH  /api/doctors/<id>/` — Patch doctor (creator or admin only, otherwise 403)
* `DELETE /api/doctors/<id>/` — Delete doctor (creator or admin only, otherwise 403)

### 4.4 Patient-Doctor Mappings (`/api/mappings/`)
* `POST   /api/mappings/` — Assign doctor to caller's patient (`patient`, `doctor`, `notes`)
* `GET    /api/mappings/` — List all mappings for caller's patients
* `GET    /api/mappings/<patient_id>/` — List assigned care team for a patient
* `DELETE /api/mappings/<id>/` — Remove a mapping record

---

## 5. Automated Tests

Run the full automated test suite (63 tests):
```powershell
python manage.py test --verbosity=2
```

Run the live endpoint verification script:
```powershell
python scripts/verify_apis.py
```
