param(
  [string]$PortName = "",
  [int]$BaudRate = 115200,
  [string]$ApiBase = "http://localhost:4000/api",
  [string]$DeviceKey = "HARDWARE-TN459900",
  [string]$IotSecret = "iot-shared-secret"
)

$ErrorActionPreference = "Stop"

function Get-HardwarePort {
  $ports = Get-CimInstance Win32_SerialPort -ErrorAction SilentlyContinue |
    Where-Object {
      $_.Name -notmatch "Bluetooth" -and
      $_.Description -notmatch "Bluetooth" -and
      (
        $_.Name -match "CP210|CH340|USB|UART|JTAG|serial" -or
        $_.Description -match "CP210|CH340|USB|UART|JTAG|serial"
      )
    } |
    Sort-Object DeviceID

  return $ports | Select-Object -First 1
}

function Invoke-BridgePost {
  param(
    [string]$Url,
    [hashtable]$Payload
  )

  if (-not $Payload.deviceKey) {
    $Payload.deviceKey = $DeviceKey
  }

  $body = $Payload | ConvertTo-Json -Compress -Depth 8

  try {
    $response = Invoke-RestMethod `
      -Uri $Url `
      -Method Post `
      -ContentType "application/json" `
      -Headers @{ "x-iot-secret" = $IotSecret } `
      -Body $body

    Write-Host "[BRIDGE] POST $Url ok -> $($response.mode)"
    return $response
  } catch {
    Write-Warning "[BRIDGE] POST $Url failed: $($_.Exception.Message)"
    return $null
  }
}

function ConvertTo-Hashtable {
  param([object]$InputObject)

  $table = @{}
  foreach ($property in $InputObject.PSObject.Properties) {
    $table[$property.Name] = $property.Value
  }
  return $table
}

if ([string]::IsNullOrWhiteSpace($PortName)) {
  $hardwarePort = Get-HardwarePort

  if (-not $hardwarePort) {
    Write-Error "No ESP32/USB hardware COM port was detected. Run .\hardware\check_ports.ps1 and connect the board with a data cable."
  }

  $PortName = $hardwarePort.DeviceID
}

$port = New-Object System.IO.Ports.SerialPort $PortName, $BaudRate, "None", 8, "One"
$port.NewLine = "`n"
$port.ReadTimeout = 1000
$port.DtrEnable = $true
$port.RtsEnable = $true

try {
  $port.Open()
  Write-Host "[BRIDGE] Listening on $PortName at $BaudRate baud" -ForegroundColor Green
  Write-Host "[BRIDGE] Forwarding telemetry to $ApiBase with deviceKey=$DeviceKey"

  $buffer = ""

  while ($true) {
    try {
      $chunk = $port.ReadExisting()
    } catch [System.TimeoutException] {
      continue
    }

    if ([string]::IsNullOrEmpty($chunk)) {
      Start-Sleep -Milliseconds 100
      continue
    }

    $buffer += $chunk.Replace("`r", "")

    while ($buffer.Contains("`n")) {
      $newlineIndex = $buffer.IndexOf("`n")
      $line = $buffer.Substring(0, $newlineIndex).Trim()
      $buffer = $buffer.Substring($newlineIndex + 1)

      if ([string]::IsNullOrWhiteSpace($line)) {
        continue
      }

      Write-Host "[SERIAL] $line"

      if (-not $line.StartsWith("SERIAL_JSON ")) {
        continue
      }

      $jsonText = $line.Substring("SERIAL_JSON ".Length)

      try {
        $payloadObject = $jsonText | ConvertFrom-Json
      } catch {
        Write-Warning "[BRIDGE] Invalid JSON from serial: $jsonText"
        continue
      }

      $payload = ConvertTo-Hashtable $payloadObject

      if (-not $payload.deviceKey -and $payload.vehicleId) {
        $payload.deviceKey = $payload.vehicleId
      }

      if (-not $payload.deviceKey) {
        $payload.deviceKey = $DeviceKey
      }

      switch ($payload.messageType) {
        "gps-data" {
          Invoke-BridgePost -Url "$ApiBase/hardware/location" -Payload $payload | Out-Null
        }
        "hardware-status" {
          Invoke-BridgePost -Url "$ApiBase/hardware/status" -Payload $payload | Out-Null
        }
        default {
          Write-Warning "[BRIDGE] Unknown messageType '$($payload.messageType)'"
        }
      }
    }
  }
} finally {
  if ($port.IsOpen) {
    $port.Close()
  }
}
