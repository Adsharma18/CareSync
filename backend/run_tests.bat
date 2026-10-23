@echo off
setlocal enabledelayedexpansion

echo =====================================================================
echo                     CARESYNC TEST RUNNER
echo =====================================================================
echo.

set PYTHON_BIN=..\.venv\Scripts\python.exe
if not exist "!PYTHON_BIN!" (
    set PYTHON_BIN=.\.venv\Scripts\python.exe
)
if not exist "!PYTHON_BIN!" (
    set PYTHON_BIN=python
)

echo [1/4] Running Django System Checks...
!PYTHON_BIN! manage.py check
if errorlevel 1 (
    echo [ERROR] Django system check failed!
    exit /b 1
)
echo.

echo [2/4] Checking Database Migrations...
!PYTHON_BIN! manage.py makemigrations --check --dry-run
if errorlevel 1 (
    echo [ERROR] Pending migrations detected!
    exit /b 1
)
echo.

echo [3/4] Running Automated Test Suite (63 Tests)...
!PYTHON_BIN! manage.py test
if errorlevel 1 (
    echo [ERROR] Some tests failed!
    exit /b 1
)
echo.

echo [4/4] Running Live End-to-End API Verification...
!PYTHON_BIN! scripts\verify_apis.py
if errorlevel 1 (
    echo [ERROR] API verification failed!
    exit /b 1
)
echo.

echo =====================================================================
echo          ALL CARESYNC TESTS AND CHECKS COMPLETED SUCCESSFULLY!
echo =====================================================================
pause
