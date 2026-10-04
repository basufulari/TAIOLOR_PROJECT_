# Start MongoDB for AI Tailor (requires Docker Desktop)
$root = $PSScriptRoot
Set-Location $root

if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
  Write-Host "Docker not found. Install Docker Desktop, or set USE_IN_MEMORY_DB=true in backend\.env" -ForegroundColor Red
  exit 1
}

docker compose up -d
Write-Host "MongoDB running on mongodb://127.0.0.1:27017/ai_tailor" -ForegroundColor Green
Write-Host "Then: cd backend; npm run dev"
