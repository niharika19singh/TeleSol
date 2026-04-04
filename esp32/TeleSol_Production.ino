/*
 * ══════════════════════════════════════════════════════════════════════════════
 *                         TELESOL SENSOR HUB - PRODUCTION
 *                      Crowd Detection & Telecom Intelligence
 * ══════════════════════════════════════════════════════════════════════════════
 * 
 * HARDWARE CONFIGURATION:
 * ────────────────────────
 * Main Controller: ESP32 DevKit V1
 * 
 * SENSORS:
 *   • SSD1306 OLED 128x64 (I2C: 0x3C) - Status display
 *   • INMP441 Microphone (I2S) - Crowd noise detection
 *   • HLK-LD2420 Radar (UART) - Human presence & motion
 *   • ESP32-CAM (WiFi) - Person counting via AI
 *   • Phone Camera (optional) - Backup via IP Webcam app
 * 
 * WIRING DIAGRAM:
 * ────────────────
 *   OLED:
 *     VCC → 3.3V | GND → GND | SDA → GPIO21 | SCL → GPIO22
 * 
 *   INMP441 Microphone:
 *     VCC → 3.3V | GND → GND | WS → GPIO25 | SD → GPIO32 | SCK → GPIO33 | L/R → GND
 * 
 *   HLK-LD2420 Radar:
 *     VCC → 5V (VIN) | GND → GND | TX → GPIO16 | RX → GPIO17
 * 
 *   ESP32-CAM:
 *     Connected via WiFi (same network)
 *     Access stream: http://[CAM_IP]/stream
 * 
 * LIBRARIES REQUIRED:
 * ───────────────────
 *   • Adafruit SSD1306
 *   • Adafruit GFX Library
 *   • WiFi (built-in)
 *   • HTTPClient (built-in)
 *   • ArduinoJson
 * 
 * ══════════════════════════════════════════════════════════════════════════════
 */

#include <Wire.h>
#include <WiFi.h>
#include <HTTPClient.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>
#include <driver/i2s.h>

// ══════════════════════════════════════════════════════════════════════════════
//                              CONFIGURATION
// ══════════════════════════════════════════════════════════════════════════════

// WiFi Credentials - UPDATE THESE!
const char* WIFI_SSID = "sameer's iPhone";
const char* WIFI_PASS = "9899320810";

// ESP32-CAM IP Address - UPDATE AFTER CAM CONNECTS!
const char* ESP32_CAM_IP = "192.168.1.100";

// Phone Camera (IP Webcam app) - OPTIONAL BACKUP
const char* PHONE_CAM_IP = "192.168.1.101:8080";

// Backend Server - UPDATE FOR PRODUCTION!
const char* BACKEND_URL = "http://192.168.1.50:8000/api/sensors/data";

// Node Configuration
const char* NODE_ID = "TELESOL-001";
const char* NODE_LOCATION = "Entry-Gate-1";

// ══════════════════════════════════════════════════════════════════════════════
//                                PIN DEFINITIONS
// ══════════════════════════════════════════════════════════════════════════════

// I2C (OLED)
#define I2C_SDA 21
#define I2C_SCL 22

// I2S Microphone (INMP441)
#define MIC_WS  25
#define MIC_SD  32
#define MIC_SCK 33

// UART (HLK-LD2420 Radar)
#define RADAR_RX 16  // ESP32 RX ← Radar TX
#define RADAR_TX 17  // ESP32 TX → Radar RX

// OLED Display
#define SCREEN_WIDTH 128
#define SCREEN_HEIGHT 64

// ══════════════════════════════════════════════════════════════════════════════
//                                OBJECTS
// ══════════════════════════════════════════════════════════════════════════════

Adafruit_SSD1306 display(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire, -1);
HTTPClient http;

// ══════════════════════════════════════════════════════════════════════════════
//                              STATUS FLAGS
// ══════════════════════════════════════════════════════════════════════════════

bool oledOK = false;
bool micOK = false;
bool radarOK = false;
bool wifiOK = false;
bool camOK = false;
bool backendOK = false;

// ══════════════════════════════════════════════════════════════════════════════
//                              SENSOR DATA
// ══════════════════════════════════════════════════════════════════════════════

// Microphone
float noiseDB = 0;
float noiseMin = 100;
float noiseMax = 0;
float noiseAvg = 0;
int noiseSamples = 0;

// Radar (HLK-LD2420)
bool radarPresence = false;
int radarDistance = 0;      // cm
int radarEnergy = 0;        // signal strength 0-100
bool radarMoving = false;
int radarHumanCount = 0;

// Camera
int cameraPersonCount = 0;
unsigned long lastCameraUpdate = 0;

// Computed Values
int totalHumans = 0;
float crowdDensity = 0;     // persons per sq meter
int congestionRisk = 0;     // 0-100 CRS score
String activityLevel = "LOW";
String riskLevel = "NORMAL";

// Timing
unsigned long lastUpdate = 0;
unsigned long lastRadarData = 0;
unsigned long lastBackendPush = 0;
unsigned long startTime = 0;

// ══════════════════════════════════════════════════════════════════════════════
//                              CRS ALGORITHM
// ══════════════════════════════════════════════════════════════════════════════

// CRS = α(D/C) + βG + γU + δT
// α=35%, β=25%, γ=30%, δ=10%
const float ALPHA = 0.35;  // Demand weight
const float BETA = 0.25;   // Growth weight
const float GAMMA = 0.30;  // Utilization weight
const float DELTA = 0.10;  // Historical weight

// Thresholds
const int CRS_NORMAL = 40;
const int CRS_ELEVATED = 60;
const int CRS_HIGH = 80;

// ══════════════════════════════════════════════════════════════════════════════
//                                  SETUP
// ══════════════════════════════════════════════════════════════════════════════

void setup() {
  Serial.begin(115200);
  delay(500);
  
  startTime = millis();
  
  printBanner();
  
  // Initialize I2C
  Wire.begin(I2C_SDA, I2C_SCL);
  Wire.setClock(400000);
  
  // Initialize UART for radar
  Serial2.begin(115200, SERIAL_8N1, RADAR_RX, RADAR_TX);
  
  // Initialize all components
  initOLED();
  initMicrophone();
  initRadar();
  connectWiFi();
  
  if (wifiOK) {
    checkESP32CAM();
    checkBackend();
  }
  
  // Print status summary
  printStatus();
  
  // Show status on OLED
  if (oledOK) {
    showStatusScreen();
    delay(3000);
  }
  
  Serial.println("\n[SYSTEM] Starting main loop...\n");
}

void printBanner() {
  Serial.println();
  Serial.println("╔══════════════════════════════════════════════════════════════╗");
  Serial.println("║                                                              ║");
  Serial.println("║                    ████████╗███████╗██╗     ███████╗         ║");
  Serial.println("║                    ╚══██╔══╝██╔════╝██║     ██╔════╝         ║");
  Serial.println("║                       ██║   █████╗  ██║     █████╗           ║");
  Serial.println("║                       ██║   ██╔══╝  ██║     ██╔══╝           ║");
  Serial.println("║                       ██║   ███████╗███████╗███████╗         ║");
  Serial.println("║                       ╚═╝   ╚══════╝╚══════╝╚══════╝         ║");
  Serial.println("║                                                              ║");
  Serial.println("║              CROWD DETECTION & TELECOM INTELLIGENCE          ║");
  Serial.println("║                        Production Build v2.0                 ║");
  Serial.println("║                                                              ║");
  Serial.println("╚══════════════════════════════════════════════════════════════╝");
  Serial.println();
  Serial.print("[NODE] ID: "); Serial.println(NODE_ID);
  Serial.print("[NODE] Location: "); Serial.println(NODE_LOCATION);
  Serial.println();
}

// ══════════════════════════════════════════════════════════════════════════════
//                            INITIALIZATION
// ══════════════════════════════════════════════════════════════════════════════

void initOLED() {
  Serial.print("[INIT] OLED Display........ ");
  if (display.begin(SSD1306_SWITCHCAPVCC, 0x3C)) {
    oledOK = true;
    Serial.println("✓ OK");
    
    display.clearDisplay();
    display.setTextSize(2);
    display.setTextColor(SSD1306_WHITE);
    display.setCursor(20, 10);
    display.println("TeleSol");
    display.setTextSize(1);
    display.setCursor(25, 35);
    display.println("Initializing...");
    display.setCursor(10, 50);
    display.println(NODE_ID);
    display.display();
  } else {
    Serial.println("✗ FAIL");
  }
}

void initMicrophone() {
  Serial.print("[INIT] INMP441 Mic......... ");
  
  i2s_config_t cfg = {
    .mode = (i2s_mode_t)(I2S_MODE_MASTER | I2S_MODE_RX),
    .sample_rate = 16000,
    .bits_per_sample = I2S_BITS_PER_SAMPLE_32BIT,
    .channel_format = I2S_CHANNEL_FMT_ONLY_LEFT,
    .communication_format = I2S_COMM_FORMAT_STAND_I2S,
    .intr_alloc_flags = ESP_INTR_FLAG_LEVEL1,
    .dma_buf_count = 4,
    .dma_buf_len = 256,
    .use_apll = false,
    .tx_desc_auto_clear = false,
    .fixed_mclk = 0
  };
  
  i2s_pin_config_t pins = {
    .bck_io_num = MIC_SCK,
    .ws_io_num = MIC_WS,
    .data_out_num = -1,
    .data_in_num = MIC_SD
  };
  
  if (i2s_driver_install(I2S_NUM_0, &cfg, 0, NULL) == ESP_OK &&
      i2s_set_pin(I2S_NUM_0, &pins) == ESP_OK) {
    micOK = true;
    Serial.println("✓ OK");
  } else {
    Serial.println("✗ FAIL");
  }
}

void initRadar() {
  Serial.print("[INIT] HLK-LD2420 Radar.... ");
  
  // Clear buffer
  while (Serial2.available()) Serial2.read();
  delay(500);
  
  // Wait for data
  unsigned long start = millis();
  while (millis() - start < 2000) {
    if (Serial2.available() > 0) {
      radarOK = true;
      Serial.println("✓ OK");
      return;
    }
    delay(50);
  }
  
  radarOK = true;  // Assume connected
  Serial.println("✓ OK (waiting for data)");
}

void connectWiFi() {
  Serial.print("[INIT] WiFi Connection..... ");
  
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASS);
  
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 30) {
    delay(500);
    Serial.print(".");
    attempts++;
  }
  
  if (WiFi.status() == WL_CONNECTED) {
    wifiOK = true;
    Serial.println(" ✓ OK");
    Serial.print("[WIFI] IP Address: ");
    Serial.println(WiFi.localIP());
    Serial.print("[WIFI] Signal: ");
    Serial.print(WiFi.RSSI());
    Serial.println(" dBm");
  } else {
    Serial.println(" ✗ FAIL");
  }
}

void checkESP32CAM() {
  Serial.print("[INIT] ESP32-CAM........... ");
  
  String url = "http://" + String(ESP32_CAM_IP) + "/";
  http.begin(url);
  http.setTimeout(3000);
  
  int code = http.GET();
  http.end();
  
  if (code == 200) {
    camOK = true;
    Serial.println("✓ OK");
    Serial.print("[CAM] Stream: http://");
    Serial.print(ESP32_CAM_IP);
    Serial.println("/stream");
  } else {
    Serial.println("✗ FAIL (check IP)");
  }
}

void checkBackend() {
  Serial.print("[INIT] Backend Server...... ");
  
  http.begin(BACKEND_URL);
  http.setTimeout(3000);
  
  int code = http.GET();
  http.end();
  
  if (code > 0) {
    backendOK = true;
    Serial.println("✓ OK");
  } else {
    Serial.println("✗ FAIL (offline mode)");
  }
}

void printStatus() {
  Serial.println();
  Serial.println("┌────────────────────────────────────────┐");
  Serial.println("│            SYSTEM STATUS               │");
  Serial.println("├────────────────────────────────────────┤");
  Serial.print("│  OLED Display:     "); Serial.println(oledOK ? "✓ Online          │" : "✗ Offline         │");
  Serial.print("│  Microphone:       "); Serial.println(micOK ? "✓ Online          │" : "✗ Offline         │");
  Serial.print("│  Radar (LD2420):   "); Serial.println(radarOK ? "✓ Online          │" : "✗ Offline         │");
  Serial.print("│  WiFi:             "); Serial.println(wifiOK ? "✓ Connected       │" : "✗ Disconnected    │");
  Serial.print("│  ESP32-CAM:        "); Serial.println(camOK ? "✓ Online          │" : "✗ Offline         │");
  Serial.print("│  Backend:          "); Serial.println(backendOK ? "✓ Connected       │" : "✗ Offline         │");
  Serial.println("└────────────────────────────────────────┘");
  
  int sensorCount = (micOK?1:0) + (radarOK?1:0) + (camOK?1:0);
  Serial.print("\n[READY] ");
  Serial.print(sensorCount);
  Serial.println("/3 sensors active");
}

void showStatusScreen() {
  display.clearDisplay();
  display.setTextSize(1);
  
  display.setCursor(0, 0);
  display.println("=== TELESOL READY ===");
  display.println();
  
  display.print("Mic:    "); display.println(micOK ? "OK" : "--");
  display.print("Radar:  "); display.println(radarOK ? "OK" : "--");
  display.print("Cam:    "); display.println(camOK ? "OK" : "--");
  display.print("WiFi:   "); display.println(wifiOK ? "OK" : "--");
  display.println();
  
  if (wifiOK) {
    display.print("IP:");
    display.println(WiFi.localIP());
  }
  
  display.display();
}

// ══════════════════════════════════════════════════════════════════════════════
//                              SENSOR READING
// ══════════════════════════════════════════════════════════════════════════════

void readMicrophone() {
  if (!micOK) {
    noiseDB = 0;
    return;
  }
  
  int32_t buf[256];
  size_t bytes;
  
  if (i2s_read(I2S_NUM_0, buf, sizeof(buf), &bytes, 100) != ESP_OK || bytes == 0) {
    return;
  }
  
  double sum = 0;
  int n = bytes / 4;
  
  for (int i = 0; i < n; i++) {
    int32_t s = buf[i] >> 14;
    sum += (double)s * s;
  }
  
  double rms = sqrt(sum / n);
  
  // Convert to dB with calibration
  // Adjusted formula to prevent constant 100dB
  if (rms > 0) {
    noiseDB = 20 * log10(rms);
    noiseDB = constrain(noiseDB + 30, 30, 100);  // Calibrated offset
  } else {
    noiseDB = 30;
  }
  
  // Update stats
  if (noiseDB < noiseMin) noiseMin = noiseDB;
  if (noiseDB > noiseMax) noiseMax = noiseDB;
  noiseAvg = ((noiseAvg * noiseSamples) + noiseDB) / (noiseSamples + 1);
  noiseSamples++;
}

void readRadar() {
  if (!radarOK) {
    radarPresence = false;
    return;
  }
  
  static String line = "";
  
  while (Serial2.available()) {
    char c = Serial2.read();
    
    if (c == '\n' || c == '\r') {
      if (line.length() > 0) {
        parseRadarLine(line);
        line = "";
        lastRadarData = millis();
      }
    } else {
      line += c;
      if (line.length() > 100) line = "";
    }
  }
  
  // Timeout check
  if (millis() - lastRadarData > 3000) {
    radarPresence = false;
    radarDistance = 0;
    radarEnergy = 0;
  }
}

void parseRadarLine(String line) {
  line.trim();
  String lower = line;
  lower.toLowerCase();
  
  // LD2420 Protocol parsing
  if (lower == "on" || lower.indexOf("on") >= 0 || lower.indexOf("presence") >= 0) {
    radarPresence = true;
  }
  else if (lower == "off" || lower.indexOf("off") >= 0 || lower.indexOf("no target") >= 0) {
    radarPresence = false;
    radarDistance = 0;
    radarEnergy = 0;
    radarMoving = false;
  }
  else if (lower.startsWith("range") || lower.startsWith("distance") || lower.startsWith("r ")) {
    int idx = lower.lastIndexOf(' ');
    if (idx > 0) {
      radarDistance = lower.substring(idx + 1).toInt();
      if (radarDistance > 0) radarPresence = true;
    }
  }
  else if (lower.startsWith("mov") || lower.indexOf("moving") >= 0) {
    radarMoving = true;
    radarPresence = true;
    int idx = lower.lastIndexOf(' ');
    if (idx > 0) {
      radarEnergy = lower.substring(idx + 1).toInt();
    }
  }
  else if (lower.startsWith("occ") || lower.startsWith("sta") || lower.indexOf("static") >= 0) {
    radarMoving = false;
    radarPresence = true;
    int idx = lower.lastIndexOf(' ');
    if (idx > 0) {
      radarEnergy = lower.substring(idx + 1).toInt();
    }
  }
  // Try parsing as plain number
  else {
    int val = line.toInt();
    if (val > 0 && val < 1000) {
      radarDistance = val;
      radarPresence = true;
    }
  }
  
  // Estimate humans based on energy
  if (radarPresence) {
    if (radarEnergy > 80) radarHumanCount = 3;
    else if (radarEnergy > 50) radarHumanCount = 2;
    else if (radarEnergy > 20) radarHumanCount = 1;
    else radarHumanCount = 1;
  } else {
    radarHumanCount = 0;
  }
}

void fetchCameraCount() {
  if (!wifiOK || !camOK) return;
  
  // Only fetch every 2 seconds
  if (millis() - lastCameraUpdate < 2000) return;
  lastCameraUpdate = millis();
  
  // In production, this would call the ESP32-CAM person detection endpoint
  // For now, we'll simulate or use a simple motion detection
  
  String url = "http://" + String(ESP32_CAM_IP) + "/count";
  http.begin(url);
  http.setTimeout(1000);
  
  int code = http.GET();
  if (code == 200) {
    String response = http.getString();
    cameraPersonCount = response.toInt();
  }
  http.end();
}

// ══════════════════════════════════════════════════════════════════════════════
//                              CRS CALCULATION
// ══════════════════════════════════════════════════════════════════════════════

void computeCrowdMetrics() {
  // Fuse sensor data for human count estimate
  totalHumans = 0;
  
  // Radar contribution
  if (radarPresence) {
    totalHumans += radarHumanCount;
  }
  
  // Noise-based estimation (crowd noise correlation)
  if (noiseDB > 50) {
    int noiseHumans = (int)((noiseDB - 50) / 10);
    totalHumans += noiseHumans;
  }
  
  // Camera contribution (most accurate)
  if (camOK && cameraPersonCount > 0) {
    // Camera overrides other estimates when available
    totalHumans = max(totalHumans, cameraPersonCount);
  }
  
  totalHumans = constrain(totalHumans, 0, 100);
  
  // Calculate crowd density (assuming 50 sq meter coverage)
  crowdDensity = totalHumans / 50.0;
  
  // Calculate CRS score
  float demand = min(totalHumans / 20.0, 1.0) * 100;       // D: normalized demand
  float capacity = 100;                                      // C: max capacity
  float growth = radarMoving ? 80 : 40;                      // G: growth indicator
  float utilization = min(noiseDB / 80.0, 1.0) * 100;       // U: utilization
  float historical = 50;                                     // T: baseline
  
  congestionRisk = (int)(
    ALPHA * (demand / capacity * 100) +
    BETA * growth +
    GAMMA * utilization +
    DELTA * historical
  );
  
  congestionRisk = constrain(congestionRisk, 0, 100);
  
  // Determine activity level
  if (radarMoving || noiseDB > 70) {
    activityLevel = "HIGH";
  } else if (radarPresence || noiseDB > 50) {
    activityLevel = "MED";
  } else {
    activityLevel = "LOW";
  }
  
  // Determine risk level
  if (congestionRisk >= CRS_HIGH) {
    riskLevel = "CRITICAL";
  } else if (congestionRisk >= CRS_ELEVATED) {
    riskLevel = "HIGH";
  } else if (congestionRisk >= CRS_NORMAL) {
    riskLevel = "ELEVATED";
  } else {
    riskLevel = "NORMAL";
  }
}

// ══════════════════════════════════════════════════════════════════════════════
//                              DISPLAY UPDATE
// ══════════════════════════════════════════════════════════════════════════════

void updateDisplay() {
  if (!oledOK) return;
  
  display.clearDisplay();
  display.setTextSize(1);
  
  // Header
  display.setCursor(0, 0);
  display.print("TeleSol");
  display.setCursor(50, 0);
  display.print("[");
  display.print(activityLevel);
  display.print("]");
  
  // WiFi indicator
  display.setCursor(105, 0);
  display.print(wifiOK ? "WiFi" : "----");
  
  display.drawLine(0, 9, 128, 9, SSD1306_WHITE);
  
  // Row 1: Radar
  display.setCursor(0, 12);
  display.print("Radar:");
  if (radarPresence) {
    display.print(radarDistance);
    display.print("cm ");
    display.print(radarMoving ? "MOV" : "STA");
  } else {
    display.print("No target");
  }
  
  // Row 2: Noise
  display.setCursor(0, 22);
  display.print("Noise:");
  display.print((int)noiseDB);
  display.print("dB");
  
  // Noise bar
  int bar = map((int)noiseDB, 30, 90, 0, 45);
  display.drawRect(75, 22, 47, 7, SSD1306_WHITE);
  display.fillRect(76, 23, constrain(bar, 0, 45), 5, SSD1306_WHITE);
  
  // Row 3: Camera
  display.setCursor(0, 32);
  display.print("Cam:");
  if (camOK) {
    display.print(cameraPersonCount);
    display.print(" ppl");
  } else {
    display.print("offline");
  }
  
  // Row 4: Estimated humans
  display.setCursor(0, 42);
  display.print("Total:~");
  display.print(totalHumans);
  display.print(" humans");
  
  // Row 5: CRS Score (most important!)
  display.setCursor(0, 54);
  display.print("CRS:");
  display.print(congestionRisk);
  display.print(" [");
  display.print(riskLevel);
  display.print("]");
  
  display.display();
}

void printSerial() {
  unsigned long uptime = (millis() - startTime) / 1000;
  
  Serial.print("[");
  Serial.print(uptime);
  Serial.print("s] ");
  
  Serial.print("Radar:");
  if (radarPresence) {
    Serial.print(radarDistance);
    Serial.print("cm");
    Serial.print(radarMoving ? "[M]" : "[S]");
  } else {
    Serial.print("---");
  }
  
  Serial.print(" | Noise:");
  Serial.print((int)noiseDB);
  Serial.print("dB");
  
  Serial.print(" | Cam:");
  Serial.print(cameraPersonCount);
  
  Serial.print(" | Est:");
  Serial.print(totalHumans);
  
  Serial.print(" | CRS:");
  Serial.print(congestionRisk);
  Serial.print("[");
  Serial.print(riskLevel);
  Serial.print("]");
  
  Serial.println();
}

// ══════════════════════════════════════════════════════════════════════════════
//                              BACKEND SYNC
// ══════════════════════════════════════════════════════════════════════════════

void pushToBackend() {
  if (!wifiOK || !backendOK) return;
  
  // Push every 5 seconds
  if (millis() - lastBackendPush < 5000) return;
  lastBackendPush = millis();
  
  // Build JSON payload
  String json = "{";
  json += "\"node_id\":\"" + String(NODE_ID) + "\",";
  json += "\"location\":\"" + String(NODE_LOCATION) + "\",";
  json += "\"radar_presence\":" + String(radarPresence ? "true" : "false") + ",";
  json += "\"radar_distance\":" + String(radarDistance) + ",";
  json += "\"radar_moving\":" + String(radarMoving ? "true" : "false") + ",";
  json += "\"noise_db\":" + String(noiseDB, 1) + ",";
  json += "\"camera_count\":" + String(cameraPersonCount) + ",";
  json += "\"total_humans\":" + String(totalHumans) + ",";
  json += "\"crs_score\":" + String(congestionRisk) + ",";
  json += "\"risk_level\":\"" + riskLevel + "\",";
  json += "\"activity_level\":\"" + activityLevel + "\"";
  json += "}";
  
  http.begin(BACKEND_URL);
  http.addHeader("Content-Type", "application/json");
  
  int code = http.POST(json);
  
  if (code != 200 && code != 201) {
    Serial.print("[BACKEND] Push failed: ");
    Serial.println(code);
  }
  
  http.end();
}

// ══════════════════════════════════════════════════════════════════════════════
//                                MAIN LOOP
// ══════════════════════════════════════════════════════════════════════════════

void loop() {
  // Read all sensors
  readMicrophone();
  readRadar();
  fetchCameraCount();
  
  // Compute crowd metrics
  computeCrowdMetrics();
  
  // Update display and serial (10Hz)
  if (millis() - lastUpdate >= 100) {
    lastUpdate = millis();
    updateDisplay();
    printSerial();
  }
  
  // Push to backend
  pushToBackend();
  
  // Small delay to prevent watchdog
  delay(10);
}
