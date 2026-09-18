$ErrorActionPreference = 'Stop'
$projectRoot = $PSScriptRoot
Set-Location $projectRoot
$nodePath = Join-Path $env:USERPROFILE '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node.exe'
if (!(Test-Path -LiteralPath $nodePath)) { $nodePath = (Get-Command node -ErrorAction Stop).Source }
Write-Host "Using node: $nodePath" -ForegroundColor DarkGray

Write-Host '== TypeScript check ==' -ForegroundColor Cyan
& $nodePath 'node_modules/typescript/bin/tsc' --noEmit
if ($LASTEXITCODE -ne 0) { Write-Host 'tsc check failed.' -ForegroundColor Red; Read-Host 'Press Enter to close'; exit 1 }
Write-Host 'tsc check passed.' -ForegroundColor Green

Write-Host '== Building local-dist ==' -ForegroundColor Cyan
& $nodePath 'node_modules/vite/bin/vite.js' build --config vite.local.config.ts
if ($LASTEXITCODE -ne 0) { Write-Host 'Build failed.' -ForegroundColor Red; Read-Host 'Press Enter to close'; exit 1 }
Write-Host 'Build succeeded.' -ForegroundColor Green

Write-Host '== Restarting Chipfolio ==' -ForegroundColor Cyan
try { & (Join-Path $projectRoot 'Stop-Chipfolio.ps1'); if ($LASTEXITCODE -ne 0) { throw 'Stopping Chipfolio failed.' } } catch { Write-Host $_ -ForegroundColor Red; Read-Host 'Press Enter to close'; exit 1 }
Start-Sleep -Seconds 1
& (Join-Path $projectRoot 'Start-Chipfolio.ps1')
if ($LASTEXITCODE -ne 0) { Write-Host 'Starting Chipfolio failed.' -ForegroundColor Red; Read-Host 'Press Enter to close'; exit 1 }

Write-Host 'Done.' -ForegroundColor Green
Read-Host 'Press Enter to close'
