$ErrorActionPreference = 'Stop'
try { $health = Invoke-RestMethod 'http://127.0.0.1:47831/api/health' -TimeoutSec 2 } catch { Write-Host 'Chipfolio is already stopped.'; exit 0 }
if ($health.app -ne 'chipfolio-local' -or [IO.Path]::GetFullPath($health.root).TrimEnd('\','/') -ne $PSScriptRoot.TrimEnd('\','/')) { throw 'This is not the server for this project.' }
$serverProcess = Get-CimInstance Win32_Process -Filter "ProcessId = $($health.pid)"
$expectedScript = Join-Path $PSScriptRoot 'local/server.ts'
if (!$serverProcess -or !$serverProcess.CommandLine.Contains($expectedScript)) { throw 'Server process identity could not be verified.' }
Stop-Process -Id $health.pid
Write-Host 'Chipfolio stopped. Your records are saved.'
