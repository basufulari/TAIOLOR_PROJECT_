# One-time Atlas setup — saves password to backend\.env automatically
$root = $PSScriptRoot
$envPath = Join-Path $root "backend\.env"

Write-Host "MongoDB Atlas auto-setup" -ForegroundColor Cyan
Write-Host "User: shreezf9090_db_user | Cluster: cluster0.bxyza94.mongodb.net`n"

$secure = Read-Host "Enter Atlas DB password for shreezf9090_db_user" -AsSecureString
$bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
$plain = [Runtime.InteropServices.Marshal]::PtrToStringAuto($bstr)
[Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr)

if (-not $plain) {
  Write-Host "Password empty — cancelled." -ForegroundColor Red
  exit 1
}

if (-not (Test-Path $envPath)) {
  Write-Host "backend\.env not found" -ForegroundColor Red
  exit 1
}

$content = Get-Content $envPath -Raw

if ($content -match 'ATLAS_PASSWORD=.*') {
  $content = $content -replace 'ATLAS_PASSWORD=.*', "ATLAS_PASSWORD=$plain"
} else {
  $content += "`nATLAS_PASSWORD=$plain"
}

# Remove old placeholder URI lines
$content = $content -replace 'MONGODB_URI=mongodb\+srv://[^\r\n]+', '# MONGODB_URI=(auto from ATLAS_* vars)'

Set-Content -Path $envPath -Value $content.TrimEnd() -NoNewline
Add-Content -Path $envPath -Value "`n"

Write-Host "`nSaved ATLAS_PASSWORD to backend\.env" -ForegroundColor Green
Write-Host "Starting backend..." -ForegroundColor Yellow
Set-Location (Join-Path $root "backend")
npm run dev
