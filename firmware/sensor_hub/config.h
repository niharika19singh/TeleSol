// ============================================================
// CONFIGURATION CONSTANTS - ESP32 SENSOR HUB
// ============================================================

#ifndef CONFIG_H
#define CONFIG_H

// WiFi
#define WIFI_SSID         "YOUR_WIFI_SSID"
#define WIFI_PASSWORD     "YOUR_WIFI_PASSWORD"
#define NODE_ID           "sensor_hub_001"

// MQTT (optional, not used in main sketch)
#define MQTT_BROKER       "192.168.1.100"
#define MQTT_PORT         1883

// Backend
#define BACKEND_URL       "http://your-backend-url/api/sensors/data"

// HLK-LD2410 24GHz Radar (UART)
#define RADAR_RX_PIN      16    // ESP32 RX <- Radar TX
#define RADAR_TX_PIN      17    // ESP32 TX -> Radar RX
#define RADAR_BAUD        256000

// VL53L0X ToF Sensor (I2C)
#define I2C_SDA           21
#define I2C_SCL           22
#define VL53L0X_ADDR      0x29

// MPU6050 IMU (I2C - shared bus)
#define MPU6050_ADDR      0x68

// INMP441 I2S Microphone
#define I2S_WS            25    // Word Select (LRCL)
#define I2S_SD            32    // Serial Data (DOUT)
#define I2S_SCK           33    // Serial Clock (BCLK)

// SSD1306 OLED Display (I2C - shared bus)
#define OLED_ADDR         0x3C
#define OLED_WIDTH        128
#define OLED_HEIGHT       64

// Status LED
#define LED_PIN           2     // Built-in LED

// Zone Area (for density calculation)
#define ZONE_AREA         20.0  // m² (example value)

#endif // CONFIG_H
