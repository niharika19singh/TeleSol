/*
 * ══════════════════════════════════════════════════════════════════════════════
 *                     TELESOL SENSOR HUB v4.0 — ESP32
 *              Crowd Detection & Telecom Intelligence — HTTP + CoAP
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * PROTOCOLS: HTTP POST + CoAP PUT (dual-protocol)
 *
 * SENSORS:
 *   • MPU6050 6-Axis IMU       (I2C: 0x68) — Vibration & motion
 *   • VL53L0X Time-of-Flight   (I2C: 0x29) — Distance / person counting
 *   • HLK-LD2420 24GHz Radar   (UART2)     — Human presence & detection
 *
 * LIBRARIES REQUIRED:
 *   • Adafruit MPU6050, Adafruit VL53L0X, ArduinoJson (existing)
 *   • CoAP-simple-library (CoAP over UDP)
 *
 * ══════════════════════════════════════════════════════════════════════════════
 */

#include <Wire.h>
#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <Adafruit_MPU6050.h>
#include <Adafruit_Sensor.h>
#include "Adafruit_VL53L0X.h"
#include <WiFiUdp.h>
#include <coap-simple.h>

// ═══════════════════ CONFIG ═══════════════════
const char* WIFI_SSID     = "sukunj";
const char* WIFI_PASS     = "1912@@2006Ns";

// HTTP
const char* BACKEND_URL   = "http://192.168.29.21:8000/api/sensors/data";

// CoAP
const char* COAP_SERVER   = "192.168.29.21";
const int   COAP_PORT     = 5683;

const char* NODE_ID       = "TELESOL-ESP32-001";
const int   PUSH_INTERVAL = 5000;
const float ZONE_AREA     = 20.0;

// Pins
#define I2C_SDA   21
#define I2C_SCL   22
#define RADAR_RX  16
#define RADAR_TX  17
#define LED_PIN   2

// ═══════════════════ OBJECTS ═══════════════════
Adafruit_MPU6050  mpu;
Adafruit_VL53L0X  tof = Adafruit_VL53L0X();
WiFiUDP           udp;
Coap              coap(udp);

// ═══════════════════ STATUS ═══════════════════
bool mpuOK = false, tofOK = false, radarOK = false;
bool wifiOK = false, httpOK = false, coapOK = false;

// ═══════════════════ SENSOR DATA ═══════════════════
float accelX=0, accelY=0, accelZ=0;
float gyroX=0, gyroY=0, gyroZ=0;
float mpuTemp=0, vibrationMag=0;

int  tofDistance=0;
bool tofValid=false;
int  tofRangeStatus=0;

bool radarPresence=false;
int  radarDistance=0, radarEnergy=0;
bool radarMoving=false;
int  radarHumanCount=0;

int   totalHumans=0;
float crowdDensity=0;
int   congestionRisk=0;
String activityLevel="LOW", riskLevel="NORMAL";

unsigned long lastUpdate=0, lastRadarData=0, lastPush=0, startTime=0;

const float ALPHA=0.35, BETA=0.25, GAMMA=0.30, DELTA=0.10;

// ═══════════════════ SETUP ═══════════════════
void setup() {
  Serial.begin(115200);
  delay(200);

  pinMode(LED_PIN, OUTPUT);
  digitalWrite(LED_PIN, LOW);
  startTime = millis();

  Serial.println();
  Serial.println(F("============================"));
  Serial.println(F("  TELESOL ESP32 v4.0"));
  Serial.println(F("  HTTP + CoAP Hub"));
  Serial.println(F("============================"));
  Serial.print(F("Node: ")); Serial.println(NODE_ID);

  Wire.begin(I2C_SDA, I2C_SCL);
  Wire.setClock(400000);
  Serial2.begin(115200, SERIAL_8N1, RADAR_RX, RADAR_TX);

  initMPU6050();
  initVL53L0X();
  initRadar();
  connectWiFi();

  if (wifiOK) {
    checkHTTPBackend();
    initCoAP();
  }

  printStatus();
  Serial.println(F("[SYSTEM] Starting main loop..."));

  for (int i=0; i<3; i++) {
    digitalWrite(LED_PIN, HIGH); delay(100);
    digitalWrite(LED_PIN, LOW);  delay(100);
  }
}

// ═══════════════════ SENSOR INIT ═══════════════════
void initMPU6050() {
  Serial.print(F("[INIT] MPU6050...... "));
  if (mpu.begin(0x68, &Wire)) {
    mpuOK = true;
    mpu.setAccelerometerRange(MPU6050_RANGE_8_G);
    mpu.setGyroRange(MPU6050_RANGE_500_DEG);
    mpu.setFilterBandwidth(MPU6050_BAND_21_HZ);
    Serial.println(F("OK"));
  } else {
    Serial.println(F("FAIL"));
  }
}

void initVL53L0X() {
  Serial.print(F("[INIT] VL53L0X...... "));
  if (tof.begin(0x29)) {
    tofOK = true;
    Serial.println(F("OK"));
  } else {
    Serial.println(F("FAIL"));
  }
}

void initRadar() {
  Serial.print(F("[INIT] HLK-LD2420... "));
  while (Serial2.available()) Serial2.read();
  delay(300);
  unsigned long t = millis();
  while (millis()-t < 2000) {
    if (Serial2.available() > 0) { radarOK = true; Serial.println(F("OK")); return; }
    delay(50);
  }
  radarOK = true;
  Serial.println(F("OK (waiting)"));
}

void connectWiFi() {
  Serial.print(F("[INIT] WiFi......... "));
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASS);
  int att = 0;
  while (WiFi.status() != WL_CONNECTED && att < 40) { delay(500); Serial.print("."); att++; }
  if (WiFi.status() == WL_CONNECTED) {
    wifiOK = true;
    Serial.println(F(" OK"));
    Serial.print(F("[WIFI] IP: ")); Serial.println(WiFi.localIP());
    Serial.print(F("[WIFI] RSSI: ")); Serial.print(WiFi.RSSI()); Serial.println(F(" dBm"));
  } else {
    Serial.println(F(" FAIL"));
  }
}

void checkHTTPBackend() {
  Serial.print(F("[INIT] HTTP Backend. "));
  HTTPClient http;
  http.begin(BACKEND_URL);
  http.setTimeout(3000);
  int code = http.GET();
  http.end();
  if (code > 0) { httpOK = true; Serial.println(F("OK")); }
  else { Serial.println(F("FAIL")); }
}

void initCoAP() {
  Serial.print(F("[INIT] CoAP......... "));
  udp.begin(5684);
  coapOK = true;
  Serial.println(F("OK"));
  Serial.printf("[CoAP] Ready → coap://%s:%d/sensors\n", COAP_SERVER, COAP_PORT);
}

void printStatus() {
  Serial.println();
  Serial.println(F("─── SYSTEM STATUS ───"));
  Serial.print(F("  MPU6050:  ")); Serial.println(mpuOK   ? "Online"  : "Offline");
  Serial.print(F("  VL53L0X:  ")); Serial.println(tofOK   ? "Online"  : "Offline");
  Serial.print(F("  Radar:    ")); Serial.println(radarOK  ? "Online"  : "Offline");
  Serial.print(F("  WiFi:     ")); Serial.println(wifiOK   ? "Connected" : "Disconnected");
  Serial.println(F("─── PROTOCOLS ───"));
  Serial.print(F("  HTTP:     ")); Serial.println(httpOK   ? "Connected" : "Offline");
  Serial.print(F("  CoAP:     ")); Serial.println(coapOK   ? "Ready"     : "Offline");
  Serial.println(F("─────────────────"));
}

// ═══════════════════ SENSOR READING ═══════════════════
void readMPU6050() {
  if (!mpuOK) return;
  sensors_event_t a, g, temp;
  mpu.getEvent(&a, &g, &temp);
  accelX = a.acceleration.x; accelY = a.acceleration.y; accelZ = a.acceleration.z;
  gyroX = g.gyro.x; gyroY = g.gyro.y; gyroZ = g.gyro.z;
  mpuTemp = temp.temperature;
  float totalAccel = sqrt(accelX*accelX + accelY*accelY + accelZ*accelZ);
  vibrationMag = abs(totalAccel - 9.81);
}

void readVL53L0X() {
  if (!tofOK) return;
  VL53L0X_RangingMeasurementData_t measure;
  tof.rangingTest(&measure, false);
  tofRangeStatus = measure.RangeStatus;
  if (measure.RangeStatus != 4) { tofDistance = measure.RangeMilliMeter; tofValid = true; }
  else { tofDistance = 0; tofValid = false; }
}

void readRadar() {
  if (!radarOK) return;
  static String line = "";
  while (Serial2.available()) {
    char c = Serial2.read();
    if (c == '\n' || c == '\r') {
      if (line.length() > 0) { parseRadarLine(line); line = ""; lastRadarData = millis(); }
    } else {
      line += c;
      if (line.length() > 100) line = "";
    }
  }
  if (millis() - lastRadarData > 3000) {
    radarPresence = false; radarDistance = 0; radarEnergy = 0; radarMoving = false;
  }
}

void parseRadarLine(String line) {
  line.trim();
  String lower = line; lower.toLowerCase();
  if (lower == "on" || lower.indexOf("presence") >= 0) { radarPresence = true; }
  else if (lower == "off" || lower.indexOf("no target") >= 0) { radarPresence = false; radarDistance = 0; radarEnergy = 0; radarMoving = false; }
  else if (lower.startsWith("range") || lower.startsWith("distance") || lower.startsWith("r ")) {
    int idx = lower.lastIndexOf(' ');
    if (idx > 0) { radarDistance = lower.substring(idx+1).toInt(); if (radarDistance > 0) radarPresence = true; }
  }
  else if (lower.startsWith("mov") || lower.indexOf("moving") >= 0) {
    radarMoving = true; radarPresence = true;
    int idx = lower.lastIndexOf(' '); if (idx > 0) radarEnergy = lower.substring(idx+1).toInt();
  }
  else if (lower.startsWith("occ") || lower.startsWith("sta") || lower.indexOf("static") >= 0) {
    radarMoving = false; radarPresence = true;
    int idx = lower.lastIndexOf(' '); if (idx > 0) radarEnergy = lower.substring(idx+1).toInt();
  }
  else { int val = line.toInt(); if (val > 0 && val < 1000) { radarDistance = val; radarPresence = true; } }

  if (radarPresence) {
    if (radarEnergy > 80) radarHumanCount = 3;
    else if (radarEnergy > 50) radarHumanCount = 2;
    else radarHumanCount = 1;
  } else { radarHumanCount = 0; }
}

// ═══════════════════ CRS ═══════════════════
void computeCrowdMetrics() {
  totalHumans = 0;
  if (radarPresence) totalHumans += radarHumanCount;
  if (tofValid && tofDistance > 0 && tofDistance < 1500) totalHumans += 1;
  if (vibrationMag > 2.0) totalHumans += 1;
  totalHumans = constrain(totalHumans, 0, 50);
  crowdDensity = totalHumans / ZONE_AREA;

  float demand = min((float)totalHumans / 15.0f, 1.0f) * 100.0f;
  float growth = radarMoving ? 80.0f : 40.0f;
  float util   = min(vibrationMag / 5.0f, 1.0f) * 100.0f;
  float hist   = 50.0f;
  congestionRisk = (int)(ALPHA*(demand/100.0f*100.0f) + BETA*growth + GAMMA*util + DELTA*hist);
  congestionRisk = constrain(congestionRisk, 0, 100);

  activityLevel = (radarMoving || vibrationMag > 3.0) ? "HIGH" :
                  (radarPresence || vibrationMag > 1.0) ? "MED" : "LOW";
  riskLevel = (congestionRisk >= 80) ? "CRITICAL" :
              (congestionRisk >= 60) ? "HIGH" :
              (congestionRisk >= 40) ? "ELEVATED" : "NORMAL";
}

// ═══════════════════ SERIAL OUTPUT ═══════════════════
void printSerial() {
  unsigned long up = (millis()-startTime)/1000;
  Serial.printf("[%lus] IMU:[%.1f,%.1f,%.1f] V:%.2f | ToF:%s | Radar:%s | Est:%d CRS:%d[%s] | H:%s C:%s\n",
    up, accelX, accelY, accelZ, vibrationMag,
    tofValid ? (String(tofDistance)+"mm").c_str() : "---",
    radarPresence ? (String(radarDistance)+"cm").c_str() : "---",
    totalHumans, congestionRisk, riskLevel.c_str(),
    httpOK ? "✓" : "✗", coapOK ? "✓" : "✗");
}

// ═══════════════════ BUILD JSON PAYLOAD ═══════════════════
float r1(float v) { return round(v*10)/10.0; }
float r2(float v) { return round(v*100)/100.0; }
float r4(float v) { return round(v*10000)/10000.0; }

String buildPayloadJSON() {
  JsonDocument doc;
  doc["node_id"]   = NODE_ID;
  doc["timestamp"] = millis();

  JsonObject sensors = doc["sensors"].to<JsonObject>();

  JsonObject imu = sensors["imu"].to<JsonObject>();
  imu["accelX"] = r2(accelX); imu["accelY"] = r2(accelY); imu["accelZ"] = r2(accelZ);
  imu["gyroX"] = r2(gyroX); imu["gyroY"] = r2(gyroY); imu["gyroZ"] = r2(gyroZ);
  imu["temperature"] = r1(mpuTemp);
  imu["vibrationMagnitude"] = r2(vibrationMag);

  JsonObject tofObj = sensors["tof"].to<JsonObject>();
  tofObj["distance_mm"] = tofDistance;
  tofObj["valid"] = tofValid;
  tofObj["rangeStatus"] = tofRangeStatus;

  JsonObject radar = sensors["radar"].to<JsonObject>();
  radar["humanDetected"] = radarPresence;
  radar["distance_cm"] = radarDistance;
  radar["movementState"] = radarMoving ? 1 : 0;
  radar["energyLevel"] = radarEnergy;

  JsonObject computed = doc["computed"].to<JsonObject>();
  computed["estimatedHumans"] = totalHumans;
  computed["crowdDensity"] = r4(crowdDensity);
  computed["crsScore"] = congestionRisk;
  computed["riskLevel"] = riskLevel;
  computed["activityLevel"] = activityLevel;
  computed["zoneArea"] = ZONE_AREA;
  computed["networkUtil"] = 50.0;
  computed["growthRate"] = radarMoving ? 0.8 : 0.2;

  String json;
  serializeJson(doc, json);
  return json;
}

// ═══════════════════ PROTOCOL PUSH ═══════════════════
void pushHTTP(const String& json) {
  HTTPClient http;
  http.begin(BACKEND_URL);
  http.addHeader("Content-Type", "application/json");
  http.setTimeout(5000);
  int code = http.POST(json);
  if (code == 200 || code == 201) {
    if (!httpOK) { httpOK = true; Serial.println(F("[HTTP] Connected!")); }
  } else {
    httpOK = false;
  }
  http.end();
}

void pushCoAP(const String& json) {
  IPAddress serverIP;
  serverIP.fromString(COAP_SERVER);
  int msgId = coap.put(serverIP, COAP_PORT, "sensors", json.c_str());
  if (msgId > 0) { coapOK = true; }
}

void pushToAllProtocols() {
  if (!wifiOK) return;

  if (WiFi.status() != WL_CONNECTED) {
    wifiOK = false; connectWiFi();
    if (!wifiOK) return;
  }

  if (millis() - lastPush < PUSH_INTERVAL) return;
  lastPush = millis();

  digitalWrite(LED_PIN, HIGH);

  String json = buildPayloadJSON();

  // 1. HTTP POST (primary, reliable)
  pushHTTP(json);

  // 2. CoAP PUT (lightweight, UDP)
  pushCoAP(json);

  digitalWrite(LED_PIN, LOW);
}

// ═══════════════════ MAIN LOOP ═══════════════════
void loop() {
  readMPU6050();
  readVL53L0X();
  readRadar();
  computeCrowdMetrics();

  coap.loop();

  if (millis() - lastUpdate >= 200) {
    lastUpdate = millis();
    printSerial();
  }

  pushToAllProtocols();
  delay(10);
}
