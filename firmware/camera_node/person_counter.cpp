#include "person_counter.h"
#include "config.h"
#include "esp_camera.h"

static uint8_t* prevFrame = nullptr;
static size_t prevFrameSize = 0;
static bool cameraReady = false;

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
    config.pixel_format = PIXFORMAT_GRAYSCALE;  // Grayscale for motion detection
    config.frame_size = FRAMESIZE_QQVGA;        // 160x120 for speed
    config.jpeg_quality = 12;
    config.fb_count = 2;

    esp_err_t err = esp_camera_init(&config);
    if (err != ESP_OK) {
        Serial.printf("[Camera] Init failed: 0x%x\n", err);
        return false;
    }

    cameraReady = true;
    Serial.println("[Camera] OV2640 initialized (QQVGA Grayscale)");
    return true;
}

CameraData readCamera() {
    CameraData data;
    data.personCount = 0;
    data.frameTimestamp = millis();
    data.motionDetected = false;

    if (!cameraReady) return data;

    // Capture a frame
    camera_fb_t* fb = esp_camera_fb_get();
    if (!fb) {
        Serial.println("[Camera] Capture failed");
        return data;
    }

    // Frame differencing for motion detection
    if (prevFrame != nullptr && prevFrameSize == fb->len) {
        uint32_t diffSum = 0;
        uint32_t changedPixels = 0;

        for (size_t i = 0; i < fb->len; i++) {
            int diff = abs((int)fb->buf[i] - (int)prevFrame[i]);
            diffSum += diff;
            if (diff > 30) {  // Per-pixel threshold
                changedPixels++;
            }
        }

        // Motion detected if enough pixels changed
        data.motionDetected = (diffSum > MOTION_THRESHOLD);

        // Estimate person count from motion blob size
        // Simple heuristic: each person occupies ~MIN_BLOB_SIZE changed pixels
        if (changedPixels > 0) {
            data.personCount = max(1, (int)(changedPixels / MIN_BLOB_SIZE));
            if (data.personCount > 10) data.personCount = 10;  // Clamp
        }
    }

    // Store current frame as reference for next comparison
    if (prevFrame == nullptr || prevFrameSize != fb->len) {
        if (prevFrame) free(prevFrame);
        prevFrame = (uint8_t*)malloc(fb->len);
        prevFrameSize = fb->len;
    }
    if (prevFrame) {
        memcpy(prevFrame, fb->buf, fb->len);
    }

    esp_camera_fb_return(fb);
    return data;
}
