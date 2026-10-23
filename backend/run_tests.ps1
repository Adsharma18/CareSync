# CareSync PowerShell Test Runner
Write-Host "=====================================================================" -ForegroundColor Cyan
Write-Host "                    CARESYNC TEST RUNNER" -ForegroundColor Cyan
Write-Host "=====================================================================`n" -ForegroundColor Cyan

$PythonBin = "..\.venv\Scripts\python.exe"
if (-not (Test-Path $PythonBin)) {
    $PythonBin = ".\.venv\Scripts\python.exe"
}
if (-not (Test-Path $PythonBin)) {
    $PythonBin = "python"
}

Write-Host "[1/4] Running Django System Checks..." -ForegroundColor Yellow
& $PythonBin manage.py check
if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] System checks failed!" -ForegroundColor Red
    exit 1
}

Write-Host "`n[2/4] Checking Database Migrations..." -ForegroundColor Yellow
& $PythonBin manage.py makemigrations --check --dry-run
if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Pending migrations detected!" -ForegroundColor Red
    exit 1
}

Write-Host "`n[3/4] Running Automated Test Suite (63 Tests)..." -ForegroundColor Yellow
& $PythonBin manage.py test
if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Test suite failed!" -ForegroundColor Red
    exit 1
}

Write-Host "`n[4/4] Running Live End-to-End API Verification..." -ForegroundColor Yellow
& $PythonBin scripts/verify_apis.py
if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] API verification script failed!" -ForegroundColor Red
    exit 1
}

Write-Host "`n=====================================================================" -ForegroundColor Green
Write-Host "         ALL CARESYNC TESTS AND CHECKS COMPLETED SUCCESSFULLY!" -ForegroundColor Green
Write-Host "=====================================================================" -ForegroundColor Green
