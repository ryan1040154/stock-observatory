$ErrorActionPreference='Stop'
$site='http://localhost:5173'
$session=New-Object Microsoft.PowerShell.Commands.WebRequestSession
Invoke-WebRequest "$site/signin-with-chatgpt?return_to=/" -WebSession $session | Out-Null
$original=Invoke-RestMethod "$site/api/portfolio" -WebSession $session
function Mutation($payload){Invoke-RestMethod "$site/api/portfolio" -Method Post -ContentType 'application/json' -Body ($payload|ConvertTo-Json -Depth 8 -Compress) -WebSession $session}
$trade=@{id=[guid]::NewGuid().ToString();date='2025-01-02';broker='新光';symbol='2330';name='測試紀錄';kind='buy';shares=100;price=100;fee=20;tax=0;amount=0;note='API test - removed after validation'}
try{
 $added=Mutation @{action='add';trade=$trade;revision=$original.revision}
 if($added.portfolio.trades.Count -ne $original.portfolio.trades.Count+1){throw 'Transaction was not persisted'}
 $read=Invoke-RestMethod "$site/api/portfolio" -WebSession $session
 if(-not ($read.portfolio.trades.id -contains $trade.id)){throw 'Readback mismatch'}
 try{Mutation @{action='add';trade=$trade;revision=$original.revision}|Out-Null;throw 'Expected conflict'}catch{if($_.Exception.Response.StatusCode.value__ -ne 409){throw}}
 $bad=$trade.Clone();$bad.id=[guid]::NewGuid().ToString();$bad.kind='sell';$bad.shares=10000000
 try{Mutation @{action='add';trade=$bad;revision=$read.revision}|Out-Null;throw 'Expected oversell rejection'}catch{if($_.Exception.Response.StatusCode.value__ -ne 400){throw}}
 Write-Output 'PASS: persistence, readback, conflict and oversell rejection'
}finally{
 $latest=Invoke-RestMethod "$site/api/portfolio" -WebSession $session
 if($latest.portfolio.trades.id -contains $trade.id){Mutation @{action='delete';id=$trade.id;revision=$latest.revision}|Out-Null}
}
$restored=Invoke-RestMethod "$site/api/portfolio" -WebSession $session
if($restored.portfolio.trades.Count -ne $original.portfolio.trades.Count){throw 'Cleanup mismatch'}
try{Invoke-RestMethod "$site/api/portfolio"|Out-Null;throw 'Expected auth rejection'}catch{if($_.Exception.Response.StatusCode.value__ -ne 401){throw}}
$chips=Invoke-RestMethod "$site/api/market?group=chips&symbols=2330" -WebSession $session
if(-not $chips.holdings.Count -or $chips.holdings[0].over1000 -le 0){throw 'Missing TDCC holdings'}
Write-Output ('PASS: unauthenticated rejection, cleanup and TDCC '+$chips.holdings[0].date)
