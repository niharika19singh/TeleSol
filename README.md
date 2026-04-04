# TeleSol — Predictive Telecom Congestion Intelligence

Real-time crowd monitoring and telecom congestion prediction using ESP32 sensors.

## Architecture
```
ESP32 Sensor Hub ──┐
                   ├──► FastAPI Backend ──► React Dashboard
ESP32-CAM Node ────┘        (CRS Engine)       (NOC View)
```

## Structure
| Folder | Description |
|--------|-------------|
| `firmware/sensor_hub/` | ESP32 DevKit — radar, ToF, mic, IMU, OLED |
| `firmware/camera_node/` | ESP32-CAM — person counting via frame differencing |
| `backend/` | FastAPI + WebSocket — sensor ingestion, CRS calculation, alerts |
| `frontend/` | React + Vite + TailwindCSS — NOC dashboard with live map |
| `docs/` | API reference, wiring diagrams |

## CRS Formula
```
CRS = 0.35×DeviceDemand + 0.25×GrowthRate + 0.30×NetworkUtil + 0.10×TemporalFactor
```
**Levels:** Normal (0–40) → Elevated (41–60) → High (61–80) → Critical (81–100)

## Quick Start

### Backend
```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

### ESP32 Firmware
1. Edit `config.h` in each firmware folder — set WiFi and backend URL
2. Flash using Arduino IDE with ESP32 board support

## Theme
- Dark mode (#0D1117)
- Cyan, green, orange accents
- Monospace for sensor values

## Mac OS X - Fresh Install (No Prerequisites)
If you are on a Mac and do not have any programming software installed (like Node.js or Python), follow these exact steps to run the complete TeleSol application:

**Step 1: Install Homebrew (The Mac Package Manager)**
Open your **Terminal** application (you can find it in your Applications > Utilities folder) and paste this entire line, then press Enter:
```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```
*(Note: It may ask for your Mac password. Typing your password won't show characters on the screen, just type it and hit Enter. Follow any on-screen prompts it gives you at the end to add Homebrew to your PATH).*

**Step 2: Install Node.js and Python**
Once Homebrew is installed, install the required languages by running:
```bash
brew install node python@3.11
```

**Step 3: Download and Run the Application**
If you have downloaded this project folder, ensure you open two separate Terminal windows or tabs inside the `telesol` directory.

**Terminal 1 (Backend - Python)**
```bash
# Navigate to the backend folder
cd path/to/telesol/backend

# Create a virtual environment and start the server
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

**Terminal 2 (Frontend - React)**
```bash
# Navigate to the frontend folder
cd path/to/telesol/frontend

# Install dependencies and start the dashboard
npm install
npm run dev
```

Your Mac will now host the application locally! Open the URL provided in Terminal 2 (usually `http://localhost:5173`) in your web browser.
