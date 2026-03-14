$ErrorActionPreference = "Stop"

$root = "C:\Users\anshg\Agentic-Trading-Application"
$frontend = Join-Path $root "frontend"
$backendLog = Join-Path $root "backend.dev.log"
$frontendLog = Join-Path $root "frontend.dev.log"

function Test-PortOpen {
  param(
    [string]$HostName,
    [int]$Port
  )

  try {
    $client = New-Object System.Net.Sockets.TcpClient
    $iar = $client.BeginConnect($HostName, $Port, $null, $null)
    $ok = $iar.AsyncWaitHandle.WaitOne(1000, $false)
    if (-not $ok) {
      $client.Close()
      return $false
    }
    $client.EndConnect($iar)
    $client.Close()
    return $true
  } catch {
    return $false
  }
}

function Wait-ForPort {
  param(
    [string]$HostName,
    [int]$Port,
    [int]$TimeoutSeconds = 60
  )

  $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
  while ((Get-Date) -lt $deadline) {
    if (Test-PortOpen -HostName $HostName -Port $Port) {
      return $true
    }
    Start-Sleep -Milliseconds 750
  }
  return $false
}

function Get-LanIp {
  try {
    $ip = Get-NetIPAddress -AddressFamily IPv4 |
      Where-Object {
        $_.IPAddress -notlike "127.*" -and
        $_.IPAddress -notlike "169.254.*"
      } |
      Select-Object -First 1 -ExpandProperty IPAddress
    if ($ip) { return $ip }
  } catch {}
  return "localhost"
}

Write-Host "Starting backend..." -ForegroundColor Cyan
Start-Process cmd.exe -ArgumentList "/k", "cd /d $root && if exist .venv\Scripts\activate.bat call .venv\Scripts\activate.bat && uvicorn main:app --reload --port 8000 > ""$backendLog"" 2>&1" -WindowStyle Normal

if (-not (Wait-ForPort -HostName "127.0.0.1" -Port 8000 -TimeoutSeconds 45)) {
  Write-Host "Backend failed to start. See $backendLog" -ForegroundColor Red
  exit 1
}

Write-Host "Starting frontend..." -ForegroundColor Cyan
Start-Process cmd.exe -ArgumentList "/k", "cd /d $frontend && npm.cmd run dev > ""$frontendLog"" 2>&1" -WindowStyle Normal

if (-not (Wait-ForPort -HostName "127.0.0.1" -Port 3000 -TimeoutSeconds 45)) {
  Write-Host "Frontend failed to start. See $frontendLog" -ForegroundColor Red
  exit 1
}

$lanIp = Get-LanIp
$localUrl = "http://localhost:3000"
$lanUrl = "http://$lanIp:3000"

Write-Host ""
Write-Host "App is running:" -ForegroundColor Green
Write-Host "Local: $localUrl"
Write-Host "LAN:   $lanUrl"
Write-Host "API:   http://localhost:8000/docs"
Write-Host "Backend log: $backendLog"
Write-Host "Frontend log: $frontendLog"
Write-Host ""

Start-Process $localUrl
