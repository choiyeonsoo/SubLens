Set-Location "D:\sublens\ai"

if (-not (Test-Path "venv")) {
    Write-Host "Creating virtual environment..."
    python -m venv venv
}

& ".\venv\Scripts\Activate.ps1"

uvicorn main:app --host 0.0.0.0 --port 8001 --reload
