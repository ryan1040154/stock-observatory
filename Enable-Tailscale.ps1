$ErrorActionPreference = 'Stop'
$tailAddress = if ($env:CHIPFOLIO_TAILSCALE_IP) { $env:CHIPFOLIO_TAILSCALE_IP } else { (Get-NetIPAddress -InterfaceAlias Tailscale -AddressFamily IPv4 | Select-Object -First 1).IPAddress }
if (!$tailAddress -or $tailAddress -notmatch '^100\.(6[4-9]|[7-9][0-9]|1[01][0-9]|12[0-7])\.[0-9]{1,3}\.[0-9]{1,3}$') { throw 'A Tailscale IPv4 address is required.' }
$rule = Get-NetFirewallRule -DisplayName 'Chipfolio Tailscale 47831' -ErrorAction SilentlyContinue
if (!$rule) { New-NetFirewallRule -DisplayName 'Chipfolio Tailscale 47831' -Direction Inbound -Action Allow -Protocol TCP -LocalPort 47831 -LocalAddress $tailAddress -RemoteAddress 100.64.0.0/10 -InterfaceAlias Tailscale -Profile Any | Out-Null }
Write-Host "Ready: http://${tailAddress}:47831/"
Read-Host 'Press Enter to close'
