// ============================================================
// CAMERA NODE MAIN SKETCH - ESP32-CAM
// TeleSol - Predictive Telecom Congestion Intelligence
// ============================================================
#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include "config.h"
#include "person_counter.h"

// ---- Forward declarations ----
void connectWiFi();
void sendToBackend(StaticJsonDocument<256>& doc);

void setup() {
    Serial.begin(115200);
    Serial.println("\n[TeleSol] Camera Node starting...");

    pinMode(LED_BUILTIN, OUTPUT);
    pinMode(FLASH_PIN, OUTPUT);
    digitalWrite(FLASH_PIN, LOW);  // Flash off by default

    // Initialize WiFi
    connectWiFi();

    // Initialize camera
    if (initCamera()) {
        Serial.println("[Init] Camera ready!");
    } else {
        Serial.println("[Init] Camera FAILED — restarting in 5s...");
        delay(5000);
        ESP.restart();
    }

    // Take a throwaway frame to warm up sensor
    readCamera();
    delay(500);

    Serial.println("[Init] Camera Node ready!");
    digitalWrite(LED_BUILTIN, LOW);  // LED on = active (inverted on ESP32-CAM)
}

void loop() {
    // 1. Read camera
    CameraData cam = readCamera();

    // 2. Build JSON payload
    StaticJsonDocument<256> doc;
    doc["node_id"] = NODE_ID;
    doc["timestamp"] = millis();

    JsonObject sensors = doc.createNestedObject("sensors");
    JsonObject camObj = sensors.createNestedObject("camera");
    camObj["personCount"] = cam.personCount;
    camObj["motionDetected"] = cam.motionDetected;
    camObj["frameTimestamp"] = cam.frameTimestamp;

    JsonObject computed = doc.createNestedObject("computed");
    computed["estimatedHumans"] = cam.personCount;

    // 3. Send to backend
    if (WiFi.status() == WL_CONNECTED) {
        sendToBackend(doc);
    } else {
        Serial.println("[WiFi] Disconnected, reconnecting...");
        connectWiFi();
    }

    // 4. Debug output
    Serial.printf("[Camera] Persons=%d Motion=%s\n",
        cam.personCount,
        cam.motionDetected ? "YES" : "NO");

    // 5. Wait for next cycle (camera is slower)
    delay(5000);
}

void connectWiFi() {
    Serial.printf("[WiFi] Connecting to %s", WIFI_SSID);
    WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
    int retries = 0;
    while (WiFi.status() != WL_CONNECTED && retries < 30) {
        delay(500);
        Serial.print(".");
        retries++;
    }
    if (WiFi.status() == WL_CONNECTED) {
        Serial.printf("\n[WiFi] Connected! IP: %s\n", WiFi.localIP().toString().c_str());
    } else {
        Serial.println("\n[WiFi] Connection failed — will retry next cycle");
    }
}

void sendToBackend(StaticJsonDocument<256>& doc) {
    HTTPClient http;
    http.begin(BACKEND_URL);
    http.addHeader("Content-Type", "application/json");

    String payload;
    serializeJson(doc, payload);

    int httpCode = http.POST(payload);

    if (httpCode > 0) {
        Serial.printf("[HTTP] POST -> %d\n", httpCode);
    } else {
        Serial.printf("[HTTP] POST failed: %s\n", http.errorToString(httpCode).c_str());
    }

    http.end();
}
