# ESP32 Sensor Hub Firmware

Multi-sensor crowd monitoring node using ESP32 DevKit.

## Sensors
| Sensor | Interface | Purpose |
|--------|-----------|---------|
| HLK-LD2410 | UART (256000 baud) | 24GHz radar — human presence, distance, energy |
| VL53L0X | I2C (0x29) | Time-of-Flight — proximity detection |
| INMP441 | I2S | MEMS microphone — noise level, crowd noise |
| MPU6050 | I2C (0x68) | IMU — vibration, temperature |
| SSD1306 | I2C (0x3C) | 128×64 OLED status display |

## Pin Mapping
See `config.h` for full pin assignments:
- **Radar:** RX=16, TX=17
- **I2C (ToF, IMU, OLED):** SDA=21, SCL=22
- **I2S Mic:** WS=25, SD=32, SCK=33
- **LED:** GPIO 2

## Setup
1. Install Arduino IDE with ESP32 board support
2. Install libraries: `ArduinoJson`, `Adafruit_VL53L0X`, `MPU6050_light`, `Adafruit_SSD1306`, `Adafruit_GFX`
3. Edit `config.h` — set `WIFI_SSID`, `WIFI_PASSWORD`, and `BACKEND_URL`
4. Flash to ESP32 DevKit

## Data Flow
ESP32 reads all sensors → estimates humans → builds JSON → HTTP POST to backend `/api/sensors/data` every 2s
