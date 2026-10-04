# Urgent start — login/register work without Atlas
$root = $PSScriptRoot
Write-Host "Starting AI Tailor (urgent mode)..." -ForegroundColor Cyan

Get-NetTCPConnection -LocalPort 5000 -ErrorAction SilentlyContinue |
  ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }

Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$root\backend'; npm run dev"
Start-Sleep -Seconds 3

Write-Host "`nBackend starting on http://localhost:5000" -ForegroundColor Green
Write-Host "Users saved to: backend\data\users.json (if Mongo not up)" -ForegroundColor Yellow
Write-Host "`nIn another terminal:" -ForegroundColor Cyan
Write-Host "  cd '$root\mobile'; npm start"
Write-Host "  Press 'a' for Android emulator`n"
