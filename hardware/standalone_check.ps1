param(
  [int]$BackendPort = 4000,
  [string]$IotSecret = "iot-shared-secret",
  [switch]$OpenFirewall
)

$ErrorActionPreference = "Stop"

function Get-LanIp {
  $addresses = Get-NetIPAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue |
    Where-Object {
      $_.IPAddress -notlike "127.*" -and
      $_.PrefixOrigin -ne "WellKnown" -and
      $_.InterfaceAlias -notmatch "Loopback|vEthernet|Bluetooth"
    } |
    Sort-Object InterfaceAlias

  return $addresses | Select-Object -First 1
}

function Test-IsAdministrator {
  $identity = [Security.Principal.WindowsIdentity]::GetCurrent()
  $principal = New-Object Security.Principal.WindowsPrincipal($identity)
  return $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

$lanIp = Get-LanIp

if (-not $lanIp) {
  Write-Error "No LAN/Wi-Fi IPv4 address was found. Connect the laptop to Wi-Fi before using standalone hardware mode."
}

$apiBase = "http://$($lanIp.IPAddress):$BackendPort/api"
$healthUrl = "http://$($lanIp.IPAddress):$BackendPort/health"
$pingUrl = "$apiBase/hardware/ping"

Write-Host "WasteLogix standalone hardware check" -ForegroundColor Cyan
Write-Host ""
Write-Host "Laptop LAN IP: $($lanIp.IPAddress)"
Write-Host "Backend health URL: $healthUrl"
Write-Host "Firmware API_BASE_URL should be:"
Write-Host "  $apiBase" -ForegroundColor Green
Write-Host ""

if ($OpenFirewall) {
  if (-not (Test-IsAdministrator)) {
    Write-Warning "OpenFirewall was requested, but this terminal is not running as Administrator. Reopen PowerShell as Administrator and rerun with -OpenFirewall."
  } else {
    $ruleName = "WasteLogix Backend Port $BackendPort"
    $existingRule = Get-NetFirewallRule -DisplayName $ruleName -ErrorAction SilentlyContinue

    if (-not $existingRule) {
      New-NetFirewallRule `
        -DisplayName $ruleName `
        -Direction Inbound `
        -Action Allow `
        -Protocol TCP `
        -LocalPort $BackendPort `
        -Profile Any `
        | Out-Null

      Write-Host "Firewall rule created: $ruleName" -ForegroundColor Green
    } else {
      Write-Host "Firewall rule already exists: $ruleName" -ForegroundColor Green
    }
  }
}

try {
  $health = Invoke-RestMethod -Uri $healthUrl -TimeoutSec 5
  Write-Host "Backend health: $($health.status)" -ForegroundColor Green
} catch {
  Write-Warning "Backend health failed from this laptop IP: $($_.Exception.Message)"
  Write-Host "Start the backend first: cd backend; npm run dev"
}

try {
  $ping = Invoke-RestMethod `
    -Uri $pingUrl `
    -Method Get `
    -Headers @{ "x-iot-secret" = $IotSecret } `
    -TimeoutSec 5

  Write-Host "Hardware ping endpoint: $($ping.mode)" -ForegroundColor Green
} catch {
  Write-Warning "Hardware ping failed: $($_.Exception.Message)"
  Write-Host "Check backend .env IOT_SHARED_SECRET and make sure the backend was restarted after code changes."
}

Write-Host ""
Write-Host "Standalone power checklist:"
Write-Host "- Upload firmware after setting API_BASE_URL to the value above."
Write-Host "- Power ESP32 from USB charger or power bank, not AC mains directly."
Write-Host "- Keep ESP32 and backend machine on the same Wi-Fi/hotspot."
Write-Host "- If ESP32 direct HTTP still fails, run this script as Administrator with -OpenFirewall."
Write-Host "- USB serial bridge mode still works and is unchanged."
