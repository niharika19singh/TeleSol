# ESP32-CAM Camera Node Firmware

Person counting node using ESP32-CAM (AI-Thinker) with OV2640.

## Features
- Frame-differencing motion detection (QQVGA grayscale for speed)
- Basic person count estimation from changed pixel blobs
- HTTP POST to backend every 5s
- Auto-restart on camera init failure

## Pin Mapping
Uses AI-Thinker ESP32-CAM module defaults — see `config.h`.
- **Flash LED:** GPIO 4
- **Built-in LED:** GPIO 33

## Setup
1. Install Arduino IDE with ESP32 board support
2. Install library: `ArduinoJson`
3. Edit `config.h` — set `WIFI_SSID`, `WIFI_PASSWORD`, and `BACKEND_URL`
4. Select board: **AI Thinker ESP32-CAM**
5. Flash via FTDI (connect IO0 to GND during upload)

## Data Flow
ESP32-CAM captures frame → compares with previous frame → counts persons → HTTP POST to backend `/api/sensors/data` every 5s
