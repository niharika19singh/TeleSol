/*
 * ══════════════════════════════════════════════════════════════════════════════
 *                     TELESOL SENSOR HUB v3.0 — ESP-12E
 *                   Crowd Detection & Telecom Intelligence
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * HARDWARE: ESP-12E (ESP8266) Module
 *
 * SENSORS:
 *   • MPU6050 6-Axis IMU       (I2C: 0x68) — Vibration & motion
 *   • VL53L0X Time-of-Flight   (I2C: 0x29) — Distance / person counting
 *   • HLK-LD2420 24GHz Radar   (UART)      — Human presence & detection
 *
 * WIRING DIAGRAM (ESP-12E / NodeMCU pinout):
 * ──────────────────────────────────────────────
 *   MPU6050:
 *     VCC → 3.3V | GND → GND | SDA → D2 (GPIO4) | SCL → D1 (GPIO5)
 *     AD0 → GND (address 0x68)
 *
 *   VL53L0X:
 *     VCC → 3.3V | GND → GND | SDA → D2 (GPIO4) | SCL → D1 (GPIO5)
 *     (Shared I2C bus with MPU6050)
 *
 *   HLK-LD2420:
 *     VCC → VIN (5V) | GND → GND | TX → D5 (GPIO14) | RX → D6 (GPIO12)
 *
 * LIBRARIES REQUIRED (install via Arduino Library Manager):
 *   • Adafruit MPU6050
 *   • Adafruit VL53L0X
 *   • Adafruit Unified Sensor
 *   • ArduinoJson (v6+)
 *   • ESP8266WiFi       (built-in with ESP8266 board package)
 *   • ESP8266HTTPClient (built-in with ESP8266 board package)
 *   • SoftwareSerial     (built-in)
 *
 * BOARD SETTINGS (Arduino IDE):
 *   Board: "NodeMCU 1.0 (ESP-12E Module)" or "Generic ESP8266 Module"
 *   CPU Frequency: 80 MHz
 *   Flash Size: 4MB (FS:2MB OTA:~1019KB)
 *   Upload Speed: 115200
 *
 * ══════════════════════════════════════════════════════════════════════════════
 */

#include <Wire.h>
#include <ESP8266WiFi.h>
#include <ESP8266HTTPClient.h>
#include <WiFiClient.h>
#include <SoftwareSerial.h>
#include <ArduinoJson.h>

// Adafruit sensor libraries
#include <Adafruit_MPU6050.h>
#include <Adafruit_Sensor.h>
#include "Adafruit_VL53L0X.h"

#include "config.h"

// ══════════════════════════════════════════════════════════════════════════════
//                                OBJECTS
// ══════════════════════════════════════════════════════════════════════════════

Adafruit_MPU6050  mpu;
Adafruit_VL53L0X  tof = Adafruit_VL53L0X();
SoftwareSerial    radarSerial(RADAR_RX_PIN, RADAR_TX_PIN);
WiFiClient        wifiClient;

// ══════════════════════════════════════════════════════════════════════════════
//                              STATUS FLAGS
// ══════════════════════════════════════════════════════════════════════════════

bool mpuOK     = false;
bool tofOK     = false;
bool radarOK   = false;
bool wifiOK    = false;
bool backendOK = false;

// ══════════════════════════════════════════════════════════════════════════════
//                              SENSOR DATA
// ══════════════════════════════════════════════════════════════════════════════

// MPU6050
float accelX = 0, accelY = 0, accelZ = 0;
float gyroX  = 0, gyroY  = 0, gyroZ  = 0;
float mpuTemp = 0;
float vibrationMag = 0;

// VL53L0X
int   tofDistance = 0;       // mm
bool  tofValid = false;
int   tofRangeStatus = 0;

// HLK-LD2420 Radar
bool  radarPresence = false;
int   radarDistance = 0;     // cm
int   radarEnergy = 0;       // 0-100
bool  radarMoving = false;
int   radarHumanCount = 0;

// Computed
int   totalHumans = 0;
float crowdDensity = 0;
int   congestionRisk = 0;
String activityLevel = "LOW";
String riskLevel = "NORMAL";

// Timing
unsigned long lastUpdate = 0;
unsigned long lastRadarData = 0;
unsigned long lastBackendPush = 0;
unsigned long startTime = 0;

// CRS Weights
const float ALPHA = 0.35;
const float BETA  = 0.25;
const float GAMMA = 0.30;
const float DELTA = 0.10;
const int CRS_NORMAL   = 40;
const int CRS_ELEVATED = 60;
const int CRS_HIGH     = 80;

// ══════════════════════════════════════════════════════════════════════════════
//                                  SETUP
// ══════════════════════════════════════════════════════════════════════════════

void setup() {
  Serial.begin(115200);
  delay(100);
  yield();

  startTime = millis();

  // LED
  pinMode(LED_PIN, OUTPUT);
  digitalWrite(LED_PIN, HIGH);  // OFF (active LOW on ESP-12E)

  Serial.println();
  Serial.println(F("============================"));
  Serial.println(F("  TELESOL ESP-12E v3.0"));
  Serial.println(F("  3-Sensor Hub"));
  Serial.println(F("============================"));
  Serial.print(F("Node: ")); Serial.println(NODE_ID);
  yield();

  // I2C
  Wire.begin(I2C_SDA, I2C_SCL);
  Wire.setClock(100000);
  yield();

  // Radar UART
  radarSerial.begin(RADAR_BAUD);
  yield();

  // Init all sensors
  initMPU6050();
  yield();
  initVL53L0X();
  yield();
  initRadar();
  yield();
  connectWiFi();

  if (wifiOK) {
    checkBackend();
  }

  printStatus();

  Serial.println(F("[SYSTEM] Starting main loop..."));
}

void printBanner() {
  Serial.println();
  Serial.println(F("╔══════════════════════════════════════════════════════════════╗"));
  Serial.println(F("║                                                              ║"));
  Serial.println(F("║                    ████████╗███████╗██╗     ███████╗         ║"));
  Serial.println(F("║                    ╚══██╔══╝██╔════╝██║     ██╔════╝         ║"));
  Serial.println(F("║                       ██║   █████╗  ██║     █████╗           ║"));
  Serial.println(F("║                       ██║   ██╔══╝  ██║     ██╔══╝           ║"));
  Serial.println(F("║                       ██║   ███████╗███████╗███████╗         ║"));
  Serial.println(F("║                       ╚═╝   ╚══════╝╚══════╝╚══════╝         ║"));
  Serial.println(F("║                                                              ║"));
  Serial.println(F("║              CROWD DETECTION & TELECOM INTELLIGENCE          ║"));
  Serial.println(F("║               ESP-12E Build v3.0 — 3-Sensor Hub             ║"));
  Serial.println(F("║                                                              ║"));
  Serial.println(F("╚══════════════════════════════════════════════════════════════╝"));
  Serial.println();
  Serial.print(F("[NODE] ID: "));       Serial.println(NODE_ID);
  Serial.print(F("[NODE] Location: ")); Serial.println(NODE_LOCATION);
  Serial.print(F("[NODE] Sensors: MPU6050 + VL53L0X + HLK-LD2420"));
  Serial.println();
}

// ══════════════════════════════════════════════════════════════════════════════
//                            INITIALIZATION
// ══════════════════════════════════════════════════════════════════════════════

void initMPU6050() {
  Serial.print(F("[INIT] MPU6050 IMU......... "));

  if (mpu.begin(MPU6050_ADDR, &Wire)) {
    mpuOK = true;
    mpu.setAccelerometerRange(MPU6050_RANGE_8_G);
    mpu.setGyroRange(MPU6050_RANGE_500_DEG);
    mpu.setFilterBandwidth(MPU6050_BAND_21_HZ);
    Serial.println(F("✓ OK (±8G, ±500°/s)"));
  } else {
    Serial.println(F("✗ FAIL — check wiring (SDA→D2, SCL→D1)"));
  }
}

void initVL53L0X() {
  Serial.print(F("[INIT] VL53L0X ToF......... "));

  if (tof.begin(VL53L0X_ADDR)) {
    tofOK = true;
    Serial.println(F("✓ OK"));
  } else {
    Serial.println(F("✗ FAIL — check wiring (SDA→D2, SCL→D1)"));
  }
}

void initRadar() {
  Serial.print(F("[INIT] HLK-LD2420 Radar.... "));

  // Flush buffer
  while (radarSerial.available()) radarSerial.read();
  delay(300);

  // Wait for data
  unsigned long start = millis();
  while (millis() - start < 2000) {
    if (radarSerial.available() > 0) {
      radarOK = true;
      Serial.println(F("✓ OK"));
      return;
    }
    delay(50);
  }

  radarOK = true;  // Assume connected
  Serial.println(F("✓ OK (waiting for data)"));
}

void connectWiFi() {
  Serial.print(F("[INIT] WiFi Connection..... "));

  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 40) {
    delay(500);
    yield();
    Serial.print(".");
    attempts++;
  }
  digitalWrite(LED_PIN, HIGH);  // OFF

  if (WiFi.status() == WL_CONNECTED) {
    wifiOK = true;
    Serial.println(F(" ✓ OK"));
    Serial.print(F("[WIFI] IP: "));
    Serial.println(WiFi.localIP());
    Serial.print(F("[WIFI] RSSI: "));
    Serial.print(WiFi.RSSI());
    Serial.println(F(" dBm"));
  } else {
    Serial.println(F(" ✗ FAIL"));
  }
}

void checkBackend() {
  Serial.print(F("[INIT] Backend Server...... "));

  HTTPClient http;
  http.begin(wifiClient, BACKEND_URL);
  http.setTimeout(3000);

  int code = http.GET();
  http.end();

  if (code > 0) {
    backendOK = true;
    Serial.println(F("✓ OK"));
  } else {
    Serial.println(F("✗ FAIL (offline mode)"));
  }
}

void printStatus() {
  Serial.println();
  Serial.println(F("┌────────────────────────────────────────┐"));
  Serial.println(F("│         ESP-12E SYSTEM STATUS          │"));
  Serial.println(F("├────────────────────────────────────────┤"));
  Serial.print(F("│  MPU6050 IMU:      ")); Serial.println(mpuOK    ? F("✓ Online          │") : F("✗ Offline         │"));
  Serial.print(F("│  VL53L0X ToF:      ")); Serial.println(tofOK    ? F("✓ Online          │") : F("✗ Offline         │"));
  Serial.print(F("│  HLK-LD2420 Radar: ")); Serial.println(radarOK  ? F("✓ Online          │") : F("✗ Offline         │"));
  Serial.print(F("│  WiFi:             ")); Serial.println(wifiOK   ? F("✓ Connected       │") : F("✗ Disconnected    │"));
  Serial.print(F("│  Backend:          ")); Serial.println(backendOK? F("✓ Connected       │") : F("✗ Offline         │"));
  Serial.println(F("└────────────────────────────────────────┘"));

  int sensorCount = (mpuOK?1:0) + (tofOK?1:0) + (radarOK?1:0);
  Serial.print(F("\n[READY] "));
  Serial.print(sensorCount);
  Serial.println(F("/3 sensors active"));
}

// ══════════════════════════════════════════════════════════════════════════════
//                              SENSOR READING
// ══════════════════════════════════════════════════════════════════════════════

void readMPU6050() {
  if (!mpuOK) return;

  sensors_event_t a, g, temp;
  mpu.getEvent(&a, &g, &temp);

  accelX = a.acceleration.x;
  accelY = a.acceleration.y;
  accelZ = a.acceleration.z;
  gyroX  = g.gyro.x;
  gyroY  = g.gyro.y;
  gyroZ  = g.gyro.z;
  mpuTemp = temp.temperature;

  // Vibration magnitude = sqrt(ax² + ay² + az²) - gravity (9.81)
  float totalAccel = sqrt(accelX*accelX + accelY*accelY + accelZ*accelZ);
  vibrationMag = abs(totalAccel - 9.81);
}

void readVL53L0X() {
  if (!tofOK) return;

  VL53L0X_RangingMeasurementData_t measure;
  tof.rangingTest(&measure, false);

  tofRangeStatus = measure.RangeStatus;

  if (measure.RangeStatus != 4) {  // 4 = out of range / phase fail
    tofDistance = measure.RangeMilliMeter;
    tofValid = true;
  } else {
    tofDistance = 0;
    tofValid = false;
  }
}

void readRadar() {
  if (!radarOK) return;

  static String line = "";

  while (radarSerial.available()) {
    char c = radarSerial.read();

    if (c == '\n' || c == '\r') {
      if (line.length() > 0) {
        parseRadarLine(line);
        line = "";
        lastRadarData = millis();
      }
    } else {
      line += c;
      if (line.length() > 100) line = "";  // Overflow protection
    }
  }

  // Timeout — no data for 3 seconds
  if (millis() - lastRadarData > 3000) {
    radarPresence = false;
    radarDistance = 0;
    radarEnergy = 0;
    radarMoving = false;
  }
}

void parseRadarLine(String line) {
  line.trim();
  String lower = line;
  lower.toLowerCase();

  // LD2420 protocol parsing
  if (lower == "on" || lower.indexOf("presence") >= 0) {
    radarPresence = true;
  }
  else if (lower == "off" || lower.indexOf("no target") >= 0) {
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
    if (idx > 0) radarEnergy = lower.substring(idx + 1).toInt();
  }
  else if (lower.startsWith("occ") || lower.startsWith("sta") || lower.indexOf("static") >= 0) {
    radarMoving = false;
    radarPresence = true;
    int idx = lower.lastIndexOf(' ');
    if (idx > 0) radarEnergy = lower.substring(idx + 1).toInt();
  }
  else {
    // Try number parse (raw distance)
    int val = line.toInt();
    if (val > 0 && val < 1000) {
      radarDistance = val;
      radarPresence = true;
    }
  }

  // Estimate humans
  if (radarPresence) {
    if (radarEnergy > 80) radarHumanCount = 3;
    else if (radarEnergy > 50) radarHumanCount = 2;
    else if (radarEnergy > 20) radarHumanCount = 1;
    else radarHumanCount = 1;
  } else {
    radarHumanCount = 0;
  }
}

// ══════════════════════════════════════════════════════════════════════════════
//                              CRS CALCULATION
// ══════════════════════════════════════════════════════════════════════════════

void computeCrowdMetrics() {
  totalHumans = 0;

  // Radar contribution
  if (radarPresence) {
    totalHumans += radarHumanCount;
  }

  // ToF-based person detection (doorway counter heuristic)
  // If ToF reads < 1500mm and valid → someone in range
  if (tofValid && tofDistance > 0 && tofDistance < 1500) {
    totalHumans += 1;
  }

  // Vibration-based estimation (floor vibration = footsteps)
  if (vibrationMag > 2.0) {
    totalHumans += 1;
  }

  totalHumans = constrain(totalHumans, 0, 50);

  // Crowd density
  crowdDensity = totalHumans / ZONE_AREA;

  // CRS Score
  float demand = min((float)totalHumans / 15.0f, 1.0f) * 100.0f;
  float capacity = 100.0f;
  float growth = radarMoving ? 80.0f : 40.0f;
  float utilization = min(vibrationMag / 5.0f, 1.0f) * 100.0f;
  float historical = 50.0f;

  congestionRisk = (int)(
    ALPHA * (demand / capacity * 100.0f) +
    BETA  * growth +
    GAMMA * utilization +
    DELTA * historical
  );
  congestionRisk = constrain(congestionRisk, 0, 100);

  // Activity level
  if (radarMoving || vibrationMag > 3.0) {
    activityLevel = "HIGH";
  } else if (radarPresence || vibrationMag > 1.0) {
    activityLevel = "MED";
  } else {
    activityLevel = "LOW";
  }

  // Risk level
  if (congestionRisk >= CRS_HIGH)     riskLevel = "CRITICAL";
  else if (congestionRisk >= CRS_ELEVATED) riskLevel = "HIGH";
  else if (congestionRisk >= CRS_NORMAL)   riskLevel = "ELEVATED";
  else                                      riskLevel = "NORMAL";
}

// ══════════════════════════════════════════════════════════════════════════════
//                              SERIAL OUTPUT
// ══════════════════════════════════════════════════════════════════════════════

void printSerial() {
  unsigned long uptime = (millis() - startTime) / 1000;

  Serial.print("[");
  Serial.print(uptime);
  Serial.print("s] ");

  // MPU6050
  Serial.print("IMU:[");
  Serial.print(accelX, 1); Serial.print(",");
  Serial.print(accelY, 1); Serial.print(",");
  Serial.print(accelZ, 1); Serial.print("]");
  Serial.print(" V:"); Serial.print(vibrationMag, 2);
  Serial.print(" T:"); Serial.print(mpuTemp, 1);

  // VL53L0X
  Serial.print(" | ToF:");
  if (tofValid) {
    Serial.print(tofDistance); Serial.print("mm");
  } else {
    Serial.print("---");
  }

  // Radar
  Serial.print(" | Radar:");
  if (radarPresence) {
    Serial.print(radarDistance); Serial.print("cm");
    Serial.print(radarMoving ? "[M]" : "[S]");
  } else {
    Serial.print("---");
  }

  // Summary
  Serial.print(" | Est:"); Serial.print(totalHumans);
  Serial.print(" | CRS:"); Serial.print(congestionRisk);
  Serial.print("["); Serial.print(riskLevel); Serial.print("]");

  Serial.println();
}

// ══════════════════════════════════════════════════════════════════════════════
//                              BACKEND SYNC
// ══════════════════════════════════════════════════════════════════════════════

void pushToBackend() {
  if (!wifiOK) return;

  // Check WiFi reconnection
  if (WiFi.status() != WL_CONNECTED) {
    wifiOK = false;
    connectWiFi();
    if (!wifiOK) return;
  }

  // Push interval
  if (millis() - lastBackendPush < PUSH_INTERVAL_MS) return;
  lastBackendPush = millis();

  // LED ON during push
  digitalWrite(LED_PIN, LOW);

  // Build JSON using ArduinoJson for reliability
  JsonDocument doc;

  doc["node_id"]   = NODE_ID;
  doc["timestamp"] = millis();

  // Sensors object
  JsonObject sensors = doc["sensors"].to<JsonObject>();

  // IMU (MPU6050)
  JsonObject imu = sensors["imu"].to<JsonObject>();
  imu["accelX"] = round2(accelX);
  imu["accelY"] = round2(accelY);
  imu["accelZ"] = round2(accelZ);
  imu["gyroX"]  = round2(gyroX);
  imu["gyroY"]  = round2(gyroY);
  imu["gyroZ"]  = round2(gyroZ);
  imu["temperature"] = round1(mpuTemp);
  imu["vibrationMagnitude"] = round2(vibrationMag);

  // ToF (VL53L0X)
  JsonObject tofObj = sensors["tof"].to<JsonObject>();
  tofObj["distance_mm"]  = tofDistance;
  tofObj["valid"]        = tofValid;
  tofObj["rangeStatus"]  = tofRangeStatus;

  // Radar (HLK-LD2420)
  JsonObject radar = sensors["radar"].to<JsonObject>();
  radar["humanDetected"]  = radarPresence;
  radar["distance_cm"]    = radarDistance;
  radar["movementState"]  = radarMoving ? 1 : 0;
  radar["energyLevel"]    = radarEnergy;

  // Computed values
  JsonObject computed = doc["computed"].to<JsonObject>();
  computed["estimatedHumans"]  = totalHumans;
  computed["crowdDensity"]     = round4(crowdDensity);
  computed["crsScore"]         = congestionRisk;
  computed["riskLevel"]        = riskLevel;
  computed["activityLevel"]    = activityLevel;
  computed["zoneArea"]         = ZONE_AREA;
  computed["networkUtil"]      = 50.0;  // placeholder
  computed["growthRate"]       = radarMoving ? 0.8 : 0.2;

  // Serialize
  String json;
  serializeJson(doc, json);

  // POST
  HTTPClient http;
  http.begin(wifiClient, BACKEND_URL);
  http.addHeader("Content-Type", "application/json");
  http.setTimeout(5000);

  int code = http.POST(json);

  if (code == 200 || code == 201) {
    if (!backendOK) {
      backendOK = true;
      Serial.println(F("[BACKEND] Connected!"));
    }
  } else {
    Serial.print(F("[BACKEND] Push failed: "));
    Serial.println(code);
    backendOK = false;
  }

  http.end();

  // LED OFF
  digitalWrite(LED_PIN, HIGH);
}

// ══════════════════════════════════════════════════════════════════════════════
//                              HELPERS
// ══════════════════════════════════════════════════════════════════════════════

float round1(float v) { return ((int)(v * 10 + 0.5)) / 10.0; }
float round2(float v) { return ((int)(v * 100 + 0.5)) / 100.0; }
float round4(float v) { return ((int)(v * 10000 + 0.5)) / 10000.0; }

// ══════════════════════════════════════════════════════════════════════════════
//                                MAIN LOOP
// ══════════════════════════════════════════════════════════════════════════════

void loop() {
  // Read all sensors
  readMPU6050();
  readVL53L0X();
  readRadar();

  // Compute
  computeCrowdMetrics();

  // Display at ~5Hz
  if (millis() - lastUpdate >= 200) {
    lastUpdate = millis();
    printSerial();
  }

  // Push to backend
  pushToBackend();

  // Small yield for ESP8266 watchdog
  yield();
}
