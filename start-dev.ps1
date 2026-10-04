# Run from project root:  .\start-dev.ps1
$root = $PSScriptRoot

Write-Host "=== AI Tailor: Backend + AI (Python) + Mobile ===" -ForegroundColor Cyan
Write-Host "Project root: $root`n"

# MongoDB Atlas (auto URI from ATLAS_* in backend\.env)
$envFile = Join-Path $root "backend\.env"
$hasAtlasPassword = $false
if (Test-Path $envFile) {
  $raw = Get-Content $envFile -Raw
  $hasAtlasPassword = $raw -match 'ATLAS_PASSWORD=([^\s#<]+)' -and $Matches[1].Length -gt 0
  if (-not $hasAtlasPassword) {
    Write-Host "[!] Atlas password not set — run: .\setup-atlas.ps1 (or set ATLAS_PASSWORD in backend\.env)" -ForegroundColor DarkYellow
    Write-Host "    Backend will use in-memory Mongo until then." -ForegroundColor DarkYellow
  } else {
    Write-Host "[0] MongoDB Atlas — auto-connect from backend\.env" -ForegroundColor Green
  }
}
if (-not $hasAtlasPassword -and (Get-Command docker -ErrorAction SilentlyContinue)) {
  Write-Host "[0] Starting local MongoDB (Docker)..." -ForegroundColor Yellow
  docker compose up -d 2>$null
  Start-Sleep -Seconds 2
}

# AI service (Python) — lite install if full deps missing
Write-Host "[1/3] Starting AI service (http://localhost:8000)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$root'; .\start-ai.ps1"
Start-Sleep -Seconds 3

# Backend
Write-Host "[2/3] Starting backend (http://localhost:5000)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$root\backend'; npm run dev"

Start-Sleep -Seconds 2

# Mobile (Expo) — use npm start (local Expo CLI), not global expo-cli
Write-Host "[3/3] Starting mobile (Expo)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$root\mobile'; npm start"

Write-Host "`nDone." -ForegroundColor Green
Write-Host "  Backend API:  http://localhost:5000/health"
Write-Host "  Mobile:       Press 'a' in Expo terminal for Android emulator"
Write-Host "  API URL:      http://10.0.2.2:5000 (emulator) — see mobile\app.config.js"
Write-Host "`nAtlas setup once: .\setup-atlas.ps1  (or ATLAS_PASSWORD=... in backend\.env)"
Write-Host "AI features (measurements/try-on) need Python: cd ai-service; .\venv\Scripts\activate; python app.py"
