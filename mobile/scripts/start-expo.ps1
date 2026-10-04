param(
  [switch]$ClearCache,
  [switch]$Android
)

# Metro bundler needs more RAM on Windows (avoids SIGTERM / heap OOM during bundle)
$env:NODE_OPTIONS = '--max-old-space-size=8192'

$root = Join-Path $PSScriptRoot '..'
Set-Location $root

$expo = Join-Path $root 'node_modules\.bin\expo.cmd'
if (-not (Test-Path $expo)) {
  Write-Error 'Expo not installed. Run: npm install'
  exit 1
}

$expoArgs = @('start', '--offline')
if ($ClearCache) { $expoArgs += '-c' }
if ($Android) { $expoArgs += '--android' }

& $expo @expoArgs
