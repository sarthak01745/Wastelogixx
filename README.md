# WasteLogix

WasteLogix is a full-stack smart waste logistics platform for monitoring waste collection trips, tracking trucks in real time, detecting route anomalies, validating driver stops, generating invoices, and relaying live GPS data from ESP32 hardware.

The project includes an admin dashboard, a driver dashboard, a Node.js backend, a Supabase PostgreSQL database, Prisma data modeling, Socket.IO live updates, and optional ESP32 GPS integration.

## Features

- Role-based access for admins and drivers
- Supabase Auth backed login and signup
- Admin fleet dashboard with live truck tracking
- Driver dashboard for assigned trips, payments, route details, and invoices
- Task and trip assignment with route, truck, driver, timeline, payment, and load metadata
- OpenStreetMap route visualization with live location trails
- Anomaly detection for route deviation, long stops, GPS spoofing, repeated stops, and geofence violations
- Driver stop validation with reason capture and photo proof
- Driver trust score based on compliance and trip behavior
- Admin trip replay with historical location logs
- PDF invoice generation for trips
- Real-time updates through Socket.IO
- Offline location sync support from the driver app
- ESP32 + GPS hardware relay through direct Wi-Fi or USB serial bridge

## Tech Stack

| Layer | Technology |
| --- | --- |
| Frontend | React 18, TypeScript, Vite, Tailwind CSS, shadcn/ui, React Router |
| Maps and charts | Leaflet, React Leaflet, Recharts |
| Backend | Node.js, Express, TypeScript, Socket.IO |
| Database | Supabase PostgreSQL |
| ORM | Prisma |
| Auth | Supabase Auth, JWT |
| Validation and utilities | Zod, Turf.js, Multer, Puppeteer |
| Hardware | ESP32, NEO-6M GPS, PowerShell serial bridge |

## Project Structure

```text
.
├── backend/                  # Express API, Prisma schema, services, routes
│   ├── prisma/               # Prisma schema and seed script
│   └── src/                  # Backend source code
├── frontend/                 # React/Vite frontend application
│   ├── public/               # Static assets
│   └── src/                  # UI, pages, hooks, API clients
├── hardware/                 # ESP32 firmware and Windows helper scripts
├── features.md               # Feature notes
├── how_to_run.txt            # Original detailed local run guide
├── PROJECT_REPORT.md         # Project report
└── presentation_content.md   # Presentation notes
```

## Prerequisites

- Node.js 18 or newer
- npm
- Git
- A Supabase project with PostgreSQL and Auth enabled
- Windows PowerShell for the hardware helper scripts
- Arduino IDE or `arduino-cli` if you want to upload the ESP32 firmware

## Environment Setup

Create a backend environment file from the example:

```powershell
cd backend
copy .env.example .env
```

Update `backend/.env` with your Supabase values:

```env
DATABASE_URL="postgresql://postgres:<password>@db.<project-ref>.supabase.co:5432/postgres?sslmode=require"
PORT=4000
HOST="0.0.0.0"
CLIENT_URL="http://localhost:8080"
APP_URL="http://localhost:4000"
SUPABASE_URL="https://<project-ref>.supabase.co"
SUPABASE_PUBLISHABLE_KEY="sb_publishable_xxx"
SUPABASE_SERVICE_ROLE_KEY="sb_secret_xxx"
JWT_SECRET="change-this-secret"
JWT_EXPIRES_IN="7d"
IOT_SHARED_SECRET="iot-shared-secret"
```

If Prisma cannot reach `db.<project-ref>.supabase.co:5432`, use the Supabase Session Pooler connection string from the Supabase dashboard instead of the direct database URL. This is commonly needed on IPv4-only networks.

The frontend works with defaults:

```text
API: http://localhost:4000/api
Socket.IO: http://localhost:4000
Dev server: http://localhost:8080
```

To override them, create a frontend `.env` file:

```env
VITE_API_BASE_URL="http://localhost:4000/api"
VITE_SOCKET_URL="http://localhost:4000"
```

## Installation

Install backend dependencies:

```powershell
cd backend
npm install
```

Install frontend dependencies:

```powershell
cd frontend
npm install
```

## Database Setup

Run these commands from the `backend` directory:

```powershell
npx prisma generate
npx prisma db push
npm run prisma:seed
```

The seed script creates demo users, trucks, tasks, location logs, anomalies, invoices, driver scores, geofences, and South India route data centered around Tiruchirappalli.

Seeded route coverage includes:

- Tiruchirappalli to Chennai
- Tiruchirappalli to Bengaluru
- Tiruchirappalli to Madurai
- Tiruchirappalli to Puducherry
- Tiruchirappalli to Kochi

## Running Locally

Start the backend in one terminal:

```powershell
cd backend
npm run dev
```

The backend runs at:

```text
http://localhost:4000
```

Start the frontend in a second terminal:

```powershell
cd frontend
npm run dev
```

Open:

```text
http://localhost:8080
```

## Demo Accounts

These accounts are created by the seed script for local/demo use.

| Role | Email | Password |
| --- | --- | --- |
| Admin | `admin@smartwaste.io` | `Password@123` |
| Admin | `dummy.admin@routeshield.io` | `Admin@12345` |
| Driver | `driver.one@smartwaste.io` | `Password@123` |
| Driver | `driver.two@smartwaste.io` | `Password@123` |
| Driver | `driver.three@smartwaste.io` | `Password@123` |
| Driver | `driver.four@smartwaste.io` | `Password@123` |
| Driver | `dummy.driver@routeshield.io` | `Driver@12345` |
| Hardware relay | `hardware.relay@wastelogix.io` | `Hardware@12345` |

Do not use these credentials in a production deployment.

## Hardware GPS Relay

Hardware files are stored in `hardware/`.

The backend exposes:

```text
POST http://localhost:4000/api/hardware/location
POST http://localhost:4000/api/hardware/status
```

Both endpoints require:

```text
x-iot-secret: iot-shared-secret
```

Reserved hardware seed data:

```text
email: hardware.relay@wastelogix.io
truck: TN-45-WL-9900
device key: HARDWARE-TN459900
trip id: seed-trip-hardware-live-relay
```

Check ports and local network readiness:

```powershell
powershell -ExecutionPolicy Bypass -File .\hardware\check_ports.ps1
powershell -ExecutionPolicy Bypass -File .\hardware\standalone_check.ps1
```

For direct Wi-Fi mode, update `hardware/esp32_gps_firmware/esp32_gps_firmware.ino` with your Wi-Fi details and the LAN backend URL printed by `standalone_check.ps1`.

For USB serial bridge mode:

```powershell
powershell -ExecutionPolicy Bypass -File .\hardware\serial_bridge.ps1 -PortName COM4
```

Replace `COM4` with the ESP32 port reported by `check_ports.ps1`.

More details are available in `hardware/README.md`.

## Useful Commands

Backend commands:

```powershell
cd backend
npm run dev
npm run build
npm run start
npm run prisma:generate
npm run prisma:push
npm run prisma:seed
```

Frontend commands:

```powershell
cd frontend
npm run dev
npm run build
npm run preview
npm run lint
npm test
```

## Troubleshooting

If database setup fails:

- Confirm `backend/.env` contains the correct Supabase database URL and keys.
- If the direct database host fails, switch `DATABASE_URL` to the Supabase Session Pooler URL.
- If Prisma reports a Windows file lock, close running backend terminals and run `npx prisma generate` again.

If login fails:

- Confirm the seed script completed successfully.
- Confirm Supabase Auth users were created.
- Restart the backend after changing environment variables.

If the frontend loads but data does not appear:

- Confirm the backend is running on port `4000`.
- Confirm the frontend is running on port `8080`.
- Confirm `CLIENT_URL="http://localhost:8080"` is set in `backend/.env`.

If ESP32 direct Wi-Fi posting fails:

- Confirm the ESP32 and backend machine are on the same network.
- Use the LAN IP URL from `standalone_check.ps1`, not `localhost`.
- Run PowerShell as Administrator and use:

```powershell
powershell -ExecutionPolicy Bypass -File .\hardware\standalone_check.ps1 -OpenFirewall
```

- If direct Wi-Fi still fails, use the USB serial bridge mode.

## Security Notes

- `backend/.env`, `supabase.txt`, generated logs, `node_modules`, build output, and uploaded runtime files are intentionally ignored by Git.
- Keep Supabase service role keys private.
- Rotate demo passwords and secrets before deploying publicly.

## Authors

Created by Ayush Raj and Sarthak Jain.
