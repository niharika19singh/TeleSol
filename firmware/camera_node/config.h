// Camera Node Config - AI-Thinker ESP32-CAM
#ifndef CONFIG_H
#define CONFIG_H

// WiFi
#define WIFI_SSID         "YOUR_WIFI_SSID"
#define WIFI_PASSWORD     "YOUR_WIFI_PASSWORD"
#define NODE_ID           "camera_node_001"

// Backend
#define BACKEND_URL       "http://YOUR_BACKEND_IP:8000/api/sensors/data"

// AI-Thinker ESP32-CAM Pin Definitions
#define PWDN_GPIO_NUM     32
#define RESET_GPIO_NUM    -1
#define XCLK_GPIO_NUM      0
#define SIOD_GPIO_NUM     26
#define SIOC_GPIO_NUM     27
#define Y9_GPIO_NUM       35
#define Y8_GPIO_NUM       34
#define Y7_GPIO_NUM       39
#define Y6_GPIO_NUM       36
#define Y5_GPIO_NUM       21
#define Y4_GPIO_NUM       19
#define Y3_GPIO_NUM       18
#define Y2_GPIO_NUM        5
#define VSYNC_GPIO_NUM    25
#define HREF_GPIO_NUM     23
#define PCLK_GPIO_NUM     22

#define FLASH_PIN          4
#define LED_BUILTIN       33

// Motion detection thresholds
#define MOTION_THRESHOLD  15000   // Pixel difference threshold
#define MIN_BLOB_SIZE     500     // Minimum changed pixels for a person

#endif // CONFIG_H
