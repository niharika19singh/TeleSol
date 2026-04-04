# TeleSol 🛰️

## Predictive Network Intelligence for Telecom Congestion

> **"See the crowd. Save the network."**

TeleSol is an AI-powered crowd detection and telecom congestion prediction platform that helps network operators prevent service disruptions during high-density events.

![Status](https://img.shields.io/badge/Status-Production%20Ready-00D9FF)
![License](https://img.shields.io/badge/License-Proprietary-FF8C00)
![Platform](https://img.shields.io/badge/Platform-ESP32-00FF88)

---

## 🎯 Problem Statement

Every major event — IPL matches, Diwali celebrations, election rallies — causes telecom networks to crash. Traditional monitoring only detects problems **after** calls drop.

**TeleSol predicts congestion 5 minutes before it happens.**

---

## 💡 Solution

A 3-tier IoT architecture combining:
- **Edge Sensors** — Low-cost nodes detecting crowd presence, noise, and motion
- **Camera Module** — AI-powered person counting
- **Cloud Backend** — CRS (Congestion Risk Score) algorithm with predictive ML

---

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         TIER 1: EDGE NODES                         │
│                        (₹500-800 per node)                         │
├─────────────────────────────────────────────────────────────────────┤
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐            │
│  │   Mic    │  │  Radar   │  │  Camera  │  │   OLED   │            │
│  │ INMP441  │  │ LD2420   │  │ ESP32CAM │  │  Display │            │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘            │
│       │             │             │             │                   │
│       └─────────────┴──────┬──────┴─────────────┘                   │
│                            │                                        │
│                     ┌──────▼──────┐                                 │
│                     │  ESP32 Hub  │                                 │
│                     │  (DevKit)   │                                 │
│                     └──────┬──────┘                                 │
└────────────────────────────┼────────────────────────────────────────┘
                             │ WiFi / 4G
┌────────────────────────────▼────────────────────────────────────────┐
│                        TIER 2: BACKEND                              │
├─────────────────────────────────────────────────────────────────────┤
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐            │
│  │ FastAPI  │  │   CRS    │  │    ML    │  │ Postgres │            │
│  │  Server  │  │  Engine  │  │  Model   │  │    DB    │            │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘            │
└────────────────────────────┬────────────────────────────────────────┘
                             │
┌────────────────────────────▼────────────────────────────────────────┐
│                       TIER 3: DASHBOARD                             │
├─────────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                    React + Leaflet Map                       │   │
│  │                    Real-time WebSocket                       │   │
│  │                    Telecom NOC Interface                     │   │
│  └─────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 📦 Hardware Requirements

### Main Sensor Hub (ESP32 DevKit V1)

| Component | Model | Purpose | Cost (₹) |
|-----------|-------|---------|----------|
| Microcontroller | ESP32 DevKit V1 | Main processor | 400 |
| Display | SSD1306 OLED 128x64 | Status display | 150 |
| Microphone | INMP441 | Crowd noise detection | 150 |
| Radar | HLK-LD2420 | Human presence & motion | 450 |
| **Total** | | | **~₹1,150** |

### Camera Module (ESP32-CAM)

| Component | Model | Purpose | Cost (₹) |
|-----------|-------|---------|----------|
| Camera | ESP32-CAM AI Thinker | Person counting | 500 |
| **Total** | | | **~₹500** |

### Complete Node Cost: **₹1,650**

---

## 🔌 Wiring Diagram

### ESP32 DevKit Connections

```
ESP32 DevKit          Sensors
────────────          ───────

3V3 ─────────────┬──► OLED VCC
                 └──► INMP441 VCC

VIN (5V) ────────────► HLK-LD2420 VCC ⚠️ (Must be 5V!)

GND ─────────────┬──► OLED GND
                 ├──► INMP441 GND
                 ├──► INMP441 L/R
                 └──► HLK-LD2420 GND

GPIO21 (SDA) ────────► OLED SDA
GPIO22 (SCL) ────────► OLED SCL

GPIO25 ──────────────► INMP441 WS
GPIO32 ──────────────► INMP441 SD
GPIO33 ──────────────► INMP441 SCK

GPIO16 (RX) ─────────► HLK-LD2420 TX
GPIO17 (TX) ─────────► HLK-LD2420 RX
```

### Pin Reference Table

| Sensor | VCC | GND | Data Pins |
|--------|-----|-----|-----------|
| **OLED** | 3V3 | GND | SDA→21, SCL→22 |
| **INMP441** | 3V3 | GND | WS→25, SD→32, SCK→33, L/R→GND |
| **HLK-LD2420** | **5V (VIN)** | GND | TX→16, RX→17 |

⚠️ **Important:** HLK-LD2420 radar MUST be connected to 5V (VIN pin), not 3.3V!

---

## 📁 Project Structure

```
TeleSol/
├── firmware/
│   ├── TeleSol_Production.ino    # Main sensor hub code
│   └── TeleSol_ESP32CAM.ino      # Camera module code
│
├── backend/
│   ├── app/
│   │   ├── main.py               # FastAPI server
│   │   ├── models.py             # Data models
│   │   ├── crs_engine.py         # CRS algorithm
│   │   └── websocket.py          # Real-time updates
│   └── requirements.txt
│
├── frontend/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── components/
│   │   │   ├── NetworkMap.jsx    # Leaflet map
│   │   │   ├── CRSGauge.jsx      # Risk score display
│   │   │   └── SensorPanel.jsx   # Live sensor data
│   │   └── hooks/
│   │       └── useDashboardData.js
│   └── package.json
│
├── docs/
│   ├── TeleSol_Pitch_Deck.pptx
│   ├── TeleSol_Technical_Framework.pptx
│   └── Wiring_Guide.md
│
└── README.md
```

---

## 🚀 Quick Start

### 1. Flash ESP32 DevKit (Sensor Hub)

```bash
# Install Arduino IDE and ESP32 board package

# Install libraries:
# - Adafruit SSD1306
# - Adafruit GFX Library

# Open TeleSol_Production.ino
# Update WiFi credentials (lines 18-19):
const char* WIFI_SSID = "your_wifi_name";
const char* WIFI_PASS = "your_wifi_password";

# Select board: ESP32 Dev Module
# Upload
```

### 2. Flash ESP32-CAM (Camera Module)

```bash
# Open TeleSol_ESP32CAM.ino
# Update WiFi credentials (lines 14-15)

# Select board: AI Thinker ESP32-CAM
# Upload using USB-TTL adapter or ESP32 as programmer
```

### 3. Start Backend

```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

### 4. Start Dashboard

```bash
cd frontend
npm install
npm run dev
# Open http://localhost:5173
```

---

## 📊 CRS Algorithm

The **Congestion Risk Score (CRS)** predicts network congestion using:

```
CRS = α(D/C) + βG + γU + δT

Where:
  α = 35% — Demand weight
  β = 25% — Growth weight  
  γ = 30% — Utilization weight
  δ = 10% — Historical weight

  D = Current crowd demand
  C = Network capacity
  G = Growth rate (increasing/decreasing)
  U = Current utilization
  T = Historical baseline
```

### Risk Levels

| CRS Score | Level | Action |
|-----------|-------|--------|
| 0-40 | NORMAL | No action needed |
| 41-60 | ELEVATED | Monitor closely |
| 61-80 | HIGH | Prepare load balancing |
| 81-100 | CRITICAL | Activate emergency protocols |

---

## 📡 API Endpoints

### Backend REST API

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/dashboard/all` | All dashboard data |
| GET | `/api/towers` | Tower status list |
| GET | `/api/alerts` | Active alerts |
| GET | `/api/sensors/live` | Live sensor data |
| POST | `/api/sensors/data` | Push sensor readings |
| WS | `/ws` | Real-time updates (2s) |
| WS | `/ws/sensors` | Sensor updates (1s) |

### ESP32-CAM Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | Web interface |
| GET | `/stream` | MJPEG video stream |
| GET | `/capture` | Single JPEG frame |
| GET | `/count` | Person count (integer) |
| GET | `/status` | Full status JSON |
| GET | `/flash?on` | Turn flash LED on |
| GET | `/flash?off` | Turn flash LED off |

---

## 🖥️ Serial Monitor Output

### Sensor Hub
```
╔══════════════════════════════════════════════════════════════╗
║                    TELESOL SENSOR HUB                        ║
║              CROWD DETECTION & TELECOM INTELLIGENCE          ║
╚══════════════════════════════════════════════════════════════╝

[NODE] ID: TELESOL-001
[NODE] Location: Entry-Gate-1

[INIT] OLED Display........ ✓ OK
[INIT] INMP441 Mic......... ✓ OK
[INIT] HLK-LD2420 Radar.... ✓ OK
[INIT] WiFi Connection..... ✓ OK
[INIT] ESP32-CAM........... ✓ OK
[INIT] Backend Server...... ✓ OK

[READY] 3/3 sensors active

[125s] Radar:150cm[M] | Noise:68dB | Cam:3 | Est:5 | CRS:72[HIGH]
```

### ESP32-CAM
```
╔════════════════════════════════════════╗
║      TELESOL ESP32-CAM MODULE          ║
║      Person Detection & Streaming      ║
╚════════════════════════════════════════╝

[INIT] Camera.......... ✓ OK
[INIT] WiFi............ ✓ OK
[WIFI] IP: 192.168.1.105

┌────────────────────────────────────────┐
│           CAMERA READY                 │
├────────────────────────────────────────┤
│  Web UI:  http://192.168.1.105         │
│  Stream:  http://192.168.1.105/stream  │
│  Count:   http://192.168.1.105/count   │
└────────────────────────────────────────┘

[STATUS] 125s | FPS: 12.5 | Persons: 3 | Motion: YES | Heap: 125432
```

---

## 🎨 Dashboard Features

- **Real-time Map** — Leaflet map with tower markers (Delhi NCR)
- **CRS Gauge** — Visual congestion risk indicator
- **Live Sensor Panel** — Noise, radar, camera feeds
- **Alert System** — Automatic notifications for high CRS
- **Historical Charts** — Trend analysis with Recharts
- **Dark Theme** — NOC-optimized UI

### Color Palette

| Color | Hex | Usage |
|-------|-----|-------|
| Background | `#0D1117` | Main background |
| Card | `#1A2332` | Card surfaces |
| Cyan | `#00D9FF` | Primary accent |
| Green | `#00FF88` | Success/Normal |
| Orange | `#FF8C00` | Warning/Elevated |
| Red | `#FF4444` | Critical/Error |
| Purple | `#9B59B6` | Secondary accent |

---

## 📱 Phone Camera (Alternative)

If ESP32-CAM isn't available, use Android phone as camera:

1. Install **IP Webcam** app from Play Store
2. Open app → scroll down → tap **"Start server"**
3. Note the IP address shown (e.g., `192.168.1.101:8080`)
4. Access stream: `http://[phone-ip]:8080/video`
5. Update `PHONE_CAM_IP` in code

---

## 🏢 Deployment Scenarios

### Stadium (50,000 capacity)
- **50 edge nodes** at entry gates, sections, food courts
- **5 hub nodes** with cameras
- **Cost:** ₹35,000 - 50,000

### Metro Station
- **10 edge nodes** at platforms, stairs, gates
- **2 hub nodes** at main hall
- **Cost:** ₹8,000 - 12,000

### Religious Venue / Festival
- **15 edge nodes** around main area
- **3 hub nodes** at entry paths
- **Cost:** ₹12,000 - 18,000

---

## 💰 Cost Comparison

| Solution | Cost per Venue | Deploy Time |
|----------|---------------|-------------|
| Cisco/Huawei | ₹5-10 Lakh | 2 months |
| Density.io | ₹3-5 Lakh | 1 month |
| Custom IoT | ₹1-2 Lakh | 2 weeks |
| **TeleSol** | **₹35,000-50,000** | **2 days** |

**10x cheaper. 10x faster.**

---

## 🛡️ Competitive Advantages

1. **Predictive, Not Reactive** — 5-minute advance warning
2. **India-First** — Built for Indian crowd patterns, events, telecom networks
3. **Low-Cost Hardware** — Uses commodity ESP32 sensors
4. **Telecom-Native** — Speaks NOC language, integrates with existing tools
5. **Scalable** — Same architecture from 1 venue to 1000

---

## 🔒 Patent Status

**Provisional Patent Filed** for:
- Crowd Risk Scoring (CRS) algorithm
- Multi-sensor fusion method for telecom congestion prediction
- Edge-to-cloud architecture for real-time crowd analytics

---

## 👥 Team

| Role | Name |
|------|------|
| Lead Developer | Sameer Verma |
| Institution | IIIT Delhi (B.Tech ECE, 2029) |

---

## 📞 Contact

- **Email:** sameerverma1802@gmail.com
- **GitHub:** [github.com/beingaeditor/TeleSol](https://github.com/beingaeditor/TeleSol)

---

## 📄 License

Proprietary. All rights reserved.

---

<p align="center">
  <b>TeleSol</b> — Predictive Network Intelligence<br>
  <i>"See the crowd. Save the network."</i>
</p>
