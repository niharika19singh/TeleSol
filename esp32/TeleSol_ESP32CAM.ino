/*
 * ══════════════════════════════════════════════════════════════════════════════
 *                      TELESOL ESP32-CAM - PERSON COUNTER
 *                         Camera Module with Web Stream
 * ══════════════════════════════════════════════════════════════════════════════
 * 
 * BOARD: AI Thinker ESP32-CAM
 * 
 * FEATURES:
 *   • Live MJPEG video stream
 *   • Motion detection
 *   • Person counting (basic frame differencing)
 *   • REST API for sensor hub integration
 *   • Web interface
 * 
 * ENDPOINTS:
 *   /         - Web interface with live stream
 *   /stream   - MJPEG video stream
 *   /capture  - Single JPEG frame
 *   /count    - Current person count (JSON)
 *   /status   - System status (JSON)
 * 
 * ══════════════════════════════════════════════════════════════════════════════
 */

#include "esp_camera.h"
#include <WiFi.h>
#include "esp_http_server.h"
#include "esp_timer.h"

// ══════════════════════════════════════════════════════════════════════════════
//                              CONFIGURATION
// ══════════════════════════════════════════════════════════════════════════════

// WiFi - UPDATE THESE!
const char* WIFI_SSID = "sameer's iPhone";
const char* WIFI_PASS = "9899320810";

// Camera Settings
#define FRAME_SIZE FRAMESIZE_VGA   // 640x480
#define JPEG_QUALITY 12            // 0-63, lower = better quality

// Motion Detection
#define MOTION_THRESHOLD 15        // Pixel difference threshold
#define MIN_MOTION_AREA 500        // Minimum changed pixels to count as motion

// ══════════════════════════════════════════════════════════════════════════════
//                           AI THINKER PINOUT
// ══════════════════════════════════════════════════════════════════════════════

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
#define FLASH_GPIO_NUM     4

// ══════════════════════════════════════════════════════════════════════════════
//                              GLOBAL STATE
// ══════════════════════════════════════════════════════════════════════════════

httpd_handle_t stream_httpd = NULL;
httpd_handle_t api_httpd = NULL;

int personCount = 0;
int motionLevel = 0;
bool motionDetected = false;
unsigned long lastMotionTime = 0;
unsigned long frameCount = 0;
unsigned long startTime = 0;

// Previous frame for motion detection
uint8_t* prevFrame = NULL;
size_t prevFrameSize = 0;

// ══════════════════════════════════════════════════════════════════════════════
//                            CAMERA INIT
// ══════════════════════════════════════════════════════════════════════════════

bool initCamera() {
  camera_config_t config;
  config.ledc_channel = LEDC_CHANNEL_0;
  config.ledc_timer = LEDC_TIMER_0;
  config.pin_d0 = Y2_GPIO_NUM;
  config.pin_d1 = Y3_GPIO_NUM;
  config.pin_d2 = Y4_GPIO_NUM;
  config.pin_d3 = Y5_GPIO_NUM;
  config.pin_d4 = Y6_GPIO_NUM;
  config.pin_d5 = Y7_GPIO_NUM;
  config.pin_d6 = Y8_GPIO_NUM;
  config.pin_d7 = Y9_GPIO_NUM;
  config.pin_xclk = XCLK_GPIO_NUM;
  config.pin_pclk = PCLK_GPIO_NUM;
  config.pin_vsync = VSYNC_GPIO_NUM;
  config.pin_href = HREF_GPIO_NUM;
  config.pin_sscb_sda = SIOD_GPIO_NUM;
  config.pin_sscb_scl = SIOC_GPIO_NUM;
  config.pin_pwdn = PWDN_GPIO_NUM;
  config.pin_reset = RESET_GPIO_NUM;
  config.xclk_freq_hz = 20000000;
  config.pixel_format = PIXFORMAT_JPEG;
  config.grab_mode = CAMERA_GRAB_LATEST;
  
  if (psramFound()) {
    config.frame_size = FRAME_SIZE;
    config.jpeg_quality = JPEG_QUALITY;
    config.fb_count = 2;
    config.fb_location = CAMERA_FB_IN_PSRAM;
    Serial.println("[CAM] PSRAM found - using VGA");
  } else {
    config.frame_size = FRAMESIZE_QVGA;
    config.jpeg_quality = 15;
    config.fb_count = 1;
    config.fb_location = CAMERA_FB_IN_DRAM;
    Serial.println("[CAM] No PSRAM - using QVGA");
  }

  esp_err_t err = esp_camera_init(&config);
  if (err != ESP_OK) {
    Serial.printf("[CAM] Init failed: 0x%x\n", err);
    return false;
  }
  
  // Adjust sensor settings
  sensor_t *s = esp_camera_sensor_get();
  s->set_brightness(s, 0);
  s->set_contrast(s, 0);
  s->set_saturation(s, 0);
  s->set_whitebal(s, 1);
  s->set_awb_gain(s, 1);
  s->set_wb_mode(s, 0);
  s->set_exposure_ctrl(s, 1);
  s->set_aec2(s, 0);
  s->set_gain_ctrl(s, 1);
  s->set_agc_gain(s, 0);
  s->set_gainceiling(s, (gainceiling_t)0);
  s->set_bpc(s, 0);
  s->set_wpc(s, 1);
  s->set_raw_gma(s, 1);
  s->set_lenc(s, 1);
  s->set_hmirror(s, 0);
  s->set_vflip(s, 0);
  s->set_dcw(s, 1);
  
  Serial.println("[CAM] Camera initialized");
  return true;
}

// ══════════════════════════════════════════════════════════════════════════════
//                          MOTION DETECTION
// ══════════════════════════════════════════════════════════════════════════════

void detectMotion(camera_fb_t* fb) {
  if (!fb || fb->format != PIXFORMAT_JPEG) return;
  
  // Simple motion detection: compare with previous frame
  // This is a basic implementation - production would use better algorithms
  
  static int frameSkip = 0;
  frameSkip++;
  if (frameSkip < 5) return;  // Check every 5th frame
  frameSkip = 0;
  
  if (prevFrame == NULL) {
    prevFrame = (uint8_t*)malloc(fb->len);
    if (prevFrame) {
      memcpy(prevFrame, fb->buf, fb->len);
      prevFrameSize = fb->len;
    }
    return;
  }
  
  // Compare frames (simplified)
  int changedPixels = 0;
  size_t compareSize = min(prevFrameSize, fb->len);
  
  for (size_t i = 0; i < compareSize; i += 100) {  // Sample every 100 bytes
    int diff = abs((int)fb->buf[i] - (int)prevFrame[i]);
    if (diff > MOTION_THRESHOLD) {
      changedPixels++;
    }
  }
  
  motionLevel = changedPixels;
  
  if (changedPixels > MIN_MOTION_AREA / 100) {
    motionDetected = true;
    lastMotionTime = millis();
    
    // Estimate person count based on motion intensity
    if (changedPixels > 50) personCount = 3;
    else if (changedPixels > 30) personCount = 2;
    else if (changedPixels > 10) personCount = 1;
  } else if (millis() - lastMotionTime > 3000) {
    motionDetected = false;
    personCount = 0;
  }
  
  // Update previous frame
  if (prevFrameSize != fb->len) {
    free(prevFrame);
    prevFrame = (uint8_t*)malloc(fb->len);
    prevFrameSize = fb->len;
  }
  if (prevFrame) {
    memcpy(prevFrame, fb->buf, fb->len);
  }
  
  frameCount++;
}

// ══════════════════════════════════════════════════════════════════════════════
//                           HTTP HANDLERS
// ══════════════════════════════════════════════════════════════════════════════

// Stream handler - MJPEG
static esp_err_t stream_handler(httpd_req_t *req) {
  camera_fb_t *fb = NULL;
  esp_err_t res = ESP_OK;
  char part_buf[64];
  
  static const char* STREAM_CONTENT_TYPE = "multipart/x-mixed-replace;boundary=frame";
  static const char* STREAM_BOUNDARY = "\r\n--frame\r\n";
  static const char* STREAM_PART = "Content-Type: image/jpeg\r\nContent-Length: %u\r\n\r\n";

  res = httpd_resp_set_type(req, STREAM_CONTENT_TYPE);
  if (res != ESP_OK) return res;
  
  httpd_resp_set_hdr(req, "Access-Control-Allow-Origin", "*");

  while (true) {
    fb = esp_camera_fb_get();
    if (!fb) {
      Serial.println("[STREAM] Frame capture failed");
      res = ESP_FAIL;
      break;
    }
    
    // Run motion detection
    detectMotion(fb);
    
    size_t hlen = snprintf(part_buf, 64, STREAM_PART, fb->len);
    
    res = httpd_resp_send_chunk(req, STREAM_BOUNDARY, strlen(STREAM_BOUNDARY));
    if (res == ESP_OK) res = httpd_resp_send_chunk(req, part_buf, hlen);
    if (res == ESP_OK) res = httpd_resp_send_chunk(req, (const char *)fb->buf, fb->len);
    
    esp_camera_fb_return(fb);
    
    if (res != ESP_OK) break;
  }
  
  return res;
}

// Single capture handler
static esp_err_t capture_handler(httpd_req_t *req) {
  camera_fb_t *fb = esp_camera_fb_get();
  if (!fb) {
    httpd_resp_send_500(req);
    return ESP_FAIL;
  }
  
  httpd_resp_set_type(req, "image/jpeg");
  httpd_resp_set_hdr(req, "Content-Disposition", "inline; filename=capture.jpg");
  httpd_resp_set_hdr(req, "Access-Control-Allow-Origin", "*");
  httpd_resp_send(req, (const char *)fb->buf, fb->len);
  
  esp_camera_fb_return(fb);
  return ESP_OK;
}

// Person count API
static esp_err_t count_handler(httpd_req_t *req) {
  char response[32];
  snprintf(response, sizeof(response), "%d", personCount);
  
  httpd_resp_set_type(req, "text/plain");
  httpd_resp_set_hdr(req, "Access-Control-Allow-Origin", "*");
  return httpd_resp_send(req, response, strlen(response));
}

// Status API (JSON)
static esp_err_t status_handler(httpd_req_t *req) {
  char json[256];
  unsigned long uptime = (millis() - startTime) / 1000;
  float fps = frameCount / (float)max(uptime, 1UL);
  
  snprintf(json, sizeof(json),
    "{\"person_count\":%d,\"motion_detected\":%s,\"motion_level\":%d,"
    "\"fps\":%.1f,\"uptime\":%lu,\"free_heap\":%u}",
    personCount,
    motionDetected ? "true" : "false",
    motionLevel,
    fps,
    uptime,
    ESP.getFreeHeap()
  );
  
  httpd_resp_set_type(req, "application/json");
  httpd_resp_set_hdr(req, "Access-Control-Allow-Origin", "*");
  return httpd_resp_send(req, json, strlen(json));
}

// Flash control
static esp_err_t flash_handler(httpd_req_t *req) {
  char buf[8];
  if (httpd_req_get_url_query_str(req, buf, sizeof(buf)) == ESP_OK) {
    if (strstr(buf, "on")) {
      digitalWrite(FLASH_GPIO_NUM, HIGH);
    } else {
      digitalWrite(FLASH_GPIO_NUM, LOW);
    }
  }
  
  httpd_resp_set_hdr(req, "Access-Control-Allow-Origin", "*");
  return httpd_resp_send(req, "OK", 2);
}

// Main web page
static esp_err_t index_handler(httpd_req_t *req) {
  const char* html = R"rawliteral(
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>TeleSol Camera</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:-apple-system,BlinkMacSystemFont,sans-serif;background:#0D1117;color:#fff;padding:16px}
    h1{color:#00D9FF;font-size:24px;margin-bottom:4px}
    .subtitle{color:#9CA3AF;font-size:14px;margin-bottom:20px}
    .card{background:#1A2332;border-radius:12px;padding:16px;margin-bottom:16px}
    .stream{width:100%;border-radius:8px;border:2px solid #374151}
    .stats{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:16px}
    .stat{background:#242F3D;padding:12px;border-radius:8px;text-align:center}
    .stat-value{font-size:28px;font-weight:700;color:#00D9FF}
    .stat-label{font-size:12px;color:#9CA3AF;margin-top:4px}
    .status{display:flex;align-items:center;gap:8px;margin-bottom:12px}
    .dot{width:10px;height:10px;border-radius:50%;background:#00FF88;animation:pulse 2s infinite}
    @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.5}}
    .btn{background:#00D9FF;color:#0D1117;border:none;padding:10px 20px;border-radius:6px;cursor:pointer;font-weight:600;margin-right:8px}
    .btn:hover{background:#00B8D9}
    .btn-off{background:#374151;color:#fff}
    .motion-bar{height:8px;background:#374151;border-radius:4px;overflow:hidden;margin-top:8px}
    .motion-fill{height:100%;background:linear-gradient(90deg,#00FF88,#FF8C00,#FF4444);transition:width 0.3s}
  </style>
</head>
<body>
  <h1>TeleSol Camera</h1>
  <p class="subtitle">Person Detection Module</p>
  
  <div class="card">
    <div class="status">
      <span class="dot"></span>
      <span>Live Stream</span>
    </div>
    <img class="stream" src="/stream" alt="Camera Stream">
  </div>
  
  <div class="stats">
    <div class="stat">
      <div class="stat-value" id="count">0</div>
      <div class="stat-label">Persons</div>
    </div>
    <div class="stat">
      <div class="stat-value" id="fps">0</div>
      <div class="stat-label">FPS</div>
    </div>
    <div class="stat">
      <div class="stat-value" id="motion">-</div>
      <div class="stat-label">Motion</div>
    </div>
  </div>
  
  <div class="card">
    <p style="color:#9CA3AF;font-size:13px;margin-bottom:8px">Motion Level</p>
    <div class="motion-bar">
      <div class="motion-fill" id="motionBar" style="width:0%"></div>
    </div>
  </div>
  
  <div class="card">
    <button class="btn" onclick="fetch('/flash?on')">Flash ON</button>
    <button class="btn btn-off" onclick="fetch('/flash?off')">Flash OFF</button>
    <button class="btn" onclick="location.href='/capture'" style="float:right">Capture</button>
  </div>
  
  <p style="text-align:center;color:#6B7280;font-size:12px;margin-top:20px">
    TeleSol | Predictive Network Intelligence
  </p>
  
  <script>
    function updateStats() {
      fetch('/status')
        .then(r => r.json())
        .then(d => {
          document.getElementById('count').textContent = d.person_count;
          document.getElementById('fps').textContent = d.fps.toFixed(1);
          document.getElementById('motion').textContent = d.motion_detected ? 'YES' : 'NO';
          document.getElementById('motionBar').style.width = Math.min(d.motion_level * 2, 100) + '%';
        })
        .catch(() => {});
    }
    setInterval(updateStats, 1000);
    updateStats();
  </script>
</body>
</html>
)rawliteral";

  httpd_resp_set_type(req, "text/html");
  return httpd_resp_send(req, html, strlen(html));
}

// ══════════════════════════════════════════════════════════════════════════════
//                           SERVER SETUP
// ══════════════════════════════════════════════════════════════════════════════

void startServers() {
  httpd_config_t config = HTTPD_DEFAULT_CONFIG();
  config.server_port = 80;
  config.ctrl_port = 32768;
  config.max_uri_handlers = 8;

  // Start main server
  if (httpd_start(&stream_httpd, &config) == ESP_OK) {
    httpd_uri_t index_uri = {.uri = "/", .method = HTTP_GET, .handler = index_handler};
    httpd_uri_t stream_uri = {.uri = "/stream", .method = HTTP_GET, .handler = stream_handler};
    httpd_uri_t capture_uri = {.uri = "/capture", .method = HTTP_GET, .handler = capture_handler};
    httpd_uri_t count_uri = {.uri = "/count", .method = HTTP_GET, .handler = count_handler};
    httpd_uri_t status_uri = {.uri = "/status", .method = HTTP_GET, .handler = status_handler};
    httpd_uri_t flash_uri = {.uri = "/flash", .method = HTTP_GET, .handler = flash_handler};
    
    httpd_register_uri_handler(stream_httpd, &index_uri);
    httpd_register_uri_handler(stream_httpd, &stream_uri);
    httpd_register_uri_handler(stream_httpd, &capture_uri);
    httpd_register_uri_handler(stream_httpd, &count_uri);
    httpd_register_uri_handler(stream_httpd, &status_uri);
    httpd_register_uri_handler(stream_httpd, &flash_uri);
    
    Serial.println("[HTTP] Server started on port 80");
  }
}

// ══════════════════════════════════════════════════════════════════════════════
//                                SETUP
// ══════════════════════════════════════════════════════════════════════════════

void setup() {
  Serial.begin(115200);
  Serial.setDebugOutput(true);
  delay(1000);
  
  startTime = millis();
  
  Serial.println();
  Serial.println("╔════════════════════════════════════════╗");
  Serial.println("║      TELESOL ESP32-CAM MODULE          ║");
  Serial.println("║      Person Detection & Streaming      ║");
  Serial.println("╚════════════════════════════════════════╝");
  Serial.println();
  
  // Flash LED
  pinMode(FLASH_GPIO_NUM, OUTPUT);
  digitalWrite(FLASH_GPIO_NUM, LOW);
  
  // Boot indication
  for (int i = 0; i < 3; i++) {
    digitalWrite(FLASH_GPIO_NUM, HIGH);
    delay(100);
    digitalWrite(FLASH_GPIO_NUM, LOW);
    delay(100);
  }
  
  // Initialize camera
  Serial.print("[INIT] Camera.......... ");
  if (initCamera()) {
    Serial.println("✓ OK");
  } else {
    Serial.println("✗ FAIL");
    Serial.println("[ERROR] Camera init failed! Check ribbon cable.");
    return;
  }
  
  // Connect WiFi
  Serial.print("[INIT] WiFi............ ");
  WiFi.begin(WIFI_SSID, WIFI_PASS);
  WiFi.setSleep(false);
  
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 30) {
    delay(500);
    Serial.print(".");
    attempts++;
  }
  
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println(" ✓ OK");
    Serial.print("[WIFI] IP: ");
    Serial.println(WiFi.localIP());
    
    // Start HTTP servers
    startServers();
    
    Serial.println();
    Serial.println("┌────────────────────────────────────────┐");
    Serial.println("│           CAMERA READY                 │");
    Serial.println("├────────────────────────────────────────┤");
    Serial.print("│  Web UI:  http://");
    Serial.print(WiFi.localIP());
    Serial.println("       │");
    Serial.print("│  Stream:  http://");
    Serial.print(WiFi.localIP());
    Serial.println("/stream │");
    Serial.print("│  Count:   http://");
    Serial.print(WiFi.localIP());
    Serial.println("/count  │");
    Serial.println("└────────────────────────────────────────┘");
    
    // Success flash
    for (int i = 0; i < 5; i++) {
      digitalWrite(FLASH_GPIO_NUM, HIGH);
      delay(50);
      digitalWrite(FLASH_GPIO_NUM, LOW);
      delay(50);
    }
  } else {
    Serial.println(" ✗ FAIL");
    Serial.println("[ERROR] WiFi connection failed!");
  }
}

// ══════════════════════════════════════════════════════════════════════════════
//                                LOOP
// ══════════════════════════════════════════════════════════════════════════════

void loop() {
  // Main processing happens in stream handler
  // Just keep status logging here
  
  static unsigned long lastLog = 0;
  
  if (millis() - lastLog > 10000) {
    lastLog = millis();
    unsigned long uptime = (millis() - startTime) / 1000;
    float fps = frameCount / (float)max(uptime, 1UL);
    
    Serial.print("[STATUS] ");
    Serial.print(uptime);
    Serial.print("s | FPS: ");
    Serial.print(fps, 1);
    Serial.print(" | Persons: ");
    Serial.print(personCount);
    Serial.print(" | Motion: ");
    Serial.print(motionDetected ? "YES" : "NO");
    Serial.print(" | Heap: ");
    Serial.println(ESP.getFreeHeap());
  }
  
  // Reconnect WiFi if disconnected
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("[WIFI] Reconnecting...");
    WiFi.reconnect();
    delay(5000);
  }
  
  delay(100);
}
