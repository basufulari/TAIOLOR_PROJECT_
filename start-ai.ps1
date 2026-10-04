# Start Python AI service (lite deps if full install fails)
$root = $PSScriptRoot
$aiDir = Join-Path $root "ai-service"
$py = Join-Path $aiDir "venv\Scripts\python.exe"
$pip = Join-Path $aiDir "venv\Scripts\pip.exe"

if (-not (Test-Path $py)) {
  Write-Host "Creating venv..." -ForegroundColor Yellow
  Set-Location $aiDir
  python -m venv venv
}

Set-Location $aiDir
& $py -c "import fastapi" 2>$null
if ($LASTEXITCODE -ne 0) {
  Write-Host "Installing lite AI dependencies..." -ForegroundColor Yellow
  & $pip install --trusted-host pypi.org --trusted-host files.pythonhosted.org -r requirements-lite.txt
  Write-Host "Optional (best pose): pip install mediapipe==0.10.14" -ForegroundColor DarkYellow
}

Write-Host "Starting AI service on http://localhost:8000" -ForegroundColor Green
& $py app.py
