# WasteLogix Hardware Relay

This folder connects an ESP32 + NEO-6M GPS device to the WasteLogix backend.

The backend listens on:

```text
POST http://localhost:4000/api/hardware/location
POST http://localhost:4000/api/hardware/status
```

Both endpoints require:

```text
x-iot-secret: iot-shared-secret
```

## Reserved Hardware Account

```text
email: hardware.relay@wastelogix.io
password: Hardware@12345
truck: TN-45-WL-9900
deviceKey: HARDWARE-TN459900
seed trip: seed-trip-hardware-live-relay
```

The hardware truck is separate from the mock/demo trucks. Mock routes stay mock, and this truck is reserved for live GPS telemetry.

## Check Ports

Run this first:

```powershell
powershell -ExecutionPolicy Bypass -File .\hardware\check_ports.ps1
```

You should see a real USB serial device such as:

```text
Silicon Labs CP210x USB to UART
USB-SERIAL CH340
USB JTAG/serial debug unit
```

If you only see Bluetooth COM ports, Windows has not detected the ESP32. Replace the USB cable, try another USB port, or install the CP210x/CH340 driver for your board.

## Direct Wi-Fi Mode

Use this if the ESP32 and backend machine are on the same Wi-Fi/hotspot. In this mode the ESP32 can be powered by a USB charger or power bank and does not need to stay connected to the laptop.

1. Start the backend.
2. Run the standalone checker:

```powershell
powershell -ExecutionPolicy Bypass -File .\hardware\standalone_check.ps1
```

3. Open `hardware\esp32_gps_firmware\esp32_gps_firmware.ino`.
4. Set `WIFI_SSID`, `WIFI_PASSWORD`, and `API_BASE_URL`.
5. `API_BASE_URL` must use the LAN IP printed by the checker, not `localhost`.
6. Upload from Arduino IDE or `arduino-cli`.
7. Power the ESP32 from a USB charger or power bank.

Example:

```cpp
const char* API_BASE_URL = "http://10.198.88.87:4000/api";
const char* SECONDARY_API_BASE_URL = "";
```

For a fully laptop-free deployment where no backend laptop is running nearby, deploy the backend to a public HTTPS host and set `SECONDARY_API_BASE_URL` to that deployed API URL, for example `https://your-wastelogix-backend.example.com/api`.

If the ESP32 direct HTTP logs show `connection refused` or timeouts, run PowerShell as Administrator and allow the backend port:

```powershell
powershell -ExecutionPolicy Bypass -File .\hardware\standalone_check.ps1 -OpenFirewall
```

The firmware keeps USB serial bridge output enabled and also stores up to 16 GPS telemetry payloads locally for retry if direct Wi-Fi temporarily fails.

## USB Serial Bridge Mode

Use this if the ESP32 cannot reach the backend directly over Wi-Fi.

1. Upload the firmware.
2. Close Arduino Serial Monitor.
3. Start the backend:

```powershell
cd backend
npm run dev
```

4. Run the bridge:

```powershell
powershell -ExecutionPolicy Bypass -File .\hardware\serial_bridge.ps1 -PortName COM7
```

Replace `COM7` with the real ESP32 COM port from `check_ports.ps1`.

The firmware prints `SERIAL_JSON` telemetry every 10 seconds. The bridge reads those lines and forwards them to the backend with the required IoT secret.

## Expected Dashboard Behavior

- Admin fleet map: `TN-45-WL-9900` moves when GPS fixes arrive.
- Admin trip replay: hardware location logs appear under the hardware trip.
- Driver login `hardware.relay@wastelogix.io`: shows the live hardware route and telemetry.
- If GPS has no fix, the backend still receives heartbeat status so the truck shows as a connected hardware unit.
