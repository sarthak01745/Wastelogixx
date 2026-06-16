$ErrorActionPreference = "Stop"

$tcpPorts = @(4000, 8080, 4100)

Write-Host "WasteLogix port check" -ForegroundColor Cyan
Write-Host ""

foreach ($port in $tcpPorts) {
  $listeners = Get-NetTCPConnection -State Listen -ErrorAction SilentlyContinue |
    Where-Object { $_.LocalPort -eq $port }

  if ($listeners) {
    $processes = $listeners | ForEach-Object {
      $process = Get-Process -Id $_.OwningProcess -ErrorAction SilentlyContinue
      if ($process) {
        "$($process.ProcessName) pid=$($_.OwningProcess)"
      } else {
        "pid=$($_.OwningProcess)"
      }
    } | Sort-Object -Unique

    Write-Host "TCP $port is BUSY: $($processes -join ', ')" -ForegroundColor Yellow
  } else {
    Write-Host "TCP $port is free" -ForegroundColor Green
  }
}

Write-Host ""
Write-Host "Serial ports detected:" -ForegroundColor Cyan

$serialDevices = Get-CimInstance Win32_SerialPort -ErrorAction SilentlyContinue |
  Select-Object DeviceID, Name, Description, Manufacturer, PNPDeviceID

if (-not $serialDevices) {
  Write-Host "No serial ports were reported by Windows." -ForegroundColor Red
  exit 1
}

$serialDevices | Format-Table -AutoSize

$hardwarePorts = $serialDevices | Where-Object {
  $_.Name -notmatch "Bluetooth" -and
  $_.Description -notmatch "Bluetooth" -and
  (
    $_.Name -match "CP210|CH340|USB|UART|JTAG|serial" -or
    $_.Description -match "CP210|CH340|USB|UART|JTAG|serial"
  )
}

if ($hardwarePorts) {
  Write-Host ""
  Write-Host "Likely hardware COM port(s): $($hardwarePorts.DeviceID -join ', ')" -ForegroundColor Green
  Write-Host "Run the bridge with:"
  Write-Host "powershell -ExecutionPolicy Bypass -File .\hardware\serial_bridge.ps1 -PortName $($hardwarePorts[0].DeviceID)"
} else {
  Write-Host ""
  Write-Host "No ESP32/USB hardware serial port is visible. Only non-hardware or Bluetooth serial ports were detected." -ForegroundColor Red
  Write-Host "Use a data USB cable, try another USB port, or install the CP210x/CH340 driver for your board."
}
