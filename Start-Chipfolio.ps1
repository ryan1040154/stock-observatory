$ErrorActionPreference = 'Stop'
$projectRoot = $PSScriptRoot
$url = 'http://127.0.0.1:47831'
try {
  try { $health = Invoke-RestMethod "$url/api/health" -TimeoutSec 2 } catch { $health = $null }
  if ($health) {
    if ($health.app -ne 'chipfolio-local' -or [IO.Path]::GetFullPath($health.root).TrimEnd('\','/') -ne $projectRoot.TrimEnd('\','/')) { throw 'Port 47831 belongs to another application.' }
  } else {
    if (!(Test-Path -LiteralPath (Join-Path $projectRoot 'local-dist/index.html'))) { throw 'Missing local build. Run npm run build in the project first.' }
    $bundledNode = Join-Path $env:USERPROFILE '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node.exe'
    $runtime = if (Test-Path -LiteralPath $bundledNode) { $bundledNode } else { (Get-Command node -ErrorAction Stop).Source }
    $dataPath = Join-Path $projectRoot 'data'
    New-Item -ItemType Directory -Path $dataPath -Force | Out-Null
    $env:CHIPFOLIO_PORT = '47831'
    $env:CHIPFOLIO_DATA_DIR = $dataPath
    $server = Start-Process -FilePath $runtime -ArgumentList ('"' + (Join-Path $projectRoot 'local/server.ts') + '"') -WorkingDirectory $projectRoot -WindowStyle Hidden -RedirectStandardOutput (Join-Path $dataPath 'server.log') -RedirectStandardError (Join-Path $dataPath 'server-error.log') -PassThru
    for ($attempt = 0; $attempt -lt 30; $attempt++) {
      Start-Sleep -Milliseconds 300
      if ($server.HasExited) { throw 'Server failed. See data/server-error.log.' }
      try { $health = Invoke-RestMethod "$url/api/health" -TimeoutSec 1; break } catch { }
    }
    if (!$health -or $health.app -ne 'chipfolio-local') { throw 'Local server did not become ready.' }
  }
  Start-Process $url
} catch { Write-Host $_ -ForegroundColor Red; Read-Host 'Press Enter to close'; exit 1 }
