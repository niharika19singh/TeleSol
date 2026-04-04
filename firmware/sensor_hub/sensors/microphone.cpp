#include "microphone.h"
#include <driver/i2s.h>
#include "config.h"

static bool micInitialized = false;

// Noise thresholds
#define CROWD_NOISE_DB   60.0  // dB threshold for crowd noise
#define SAMPLE_COUNT     1024
#define REFERENCE_AMP    1.0   // Reference amplitude for dB calculation

void initMicrophone() {
    i2s_config_t i2s_config = {
        .mode = (i2s_mode_t)(I2S_MODE_MASTER | I2S_MODE_RX),
        .sample_rate = 16000,
        .bits_per_sample = I2S_BITS_PER_SAMPLE_32BIT,
        .channel_format = I2S_CHANNEL_FMT_ONLY_LEFT,
        .communication_format = I2S_COMM_FORMAT_STAND_I2S,
        .intr_alloc_flags = ESP_INTR_FLAG_LEVEL1,
        .dma_buf_count = 4,
        .dma_buf_len = SAMPLE_COUNT,
        .use_apll = false,
        .tx_desc_auto_clear = false,
        .fixed_mclk = 0,
    };

    i2s_pin_config_t pin_config = {
        .bck_io_num = I2S_SCK,
        .ws_io_num = I2S_WS,
        .data_out_num = I2S_PIN_NO_CHANGE,
        .data_in_num = I2S_SD,
    };

    if (i2s_driver_install(I2S_NUM_0, &i2s_config, 0, NULL) == ESP_OK) {
        i2s_set_pin(I2S_NUM_0, &pin_config);
        i2s_zero_dma_buffer(I2S_NUM_0);
        micInitialized = true;
        Serial.println("[Mic] INMP441 initialized on I2S");
    } else {
        Serial.println("[Mic] INMP441 init FAILED");
    }
}

AudioData readAudio() {
    AudioData data;
    data.noiseLevel_dB = 0.0;
    data.peakAmplitude = 0.0;
    data.isCrowdNoise = false;

    if (!micInitialized) return data;

    int32_t samples[SAMPLE_COUNT];
    size_t bytesRead = 0;

    i2s_read(I2S_NUM_0, samples, sizeof(samples), &bytesRead, pdMS_TO_TICKS(100));

    int sampleCount = bytesRead / sizeof(int32_t);
    if (sampleCount == 0) return data;

    // Calculate RMS
    double sumSquares = 0;
    int32_t peak = 0;
    for (int i = 0; i < sampleCount; i++) {
        int32_t s = samples[i] >> 14;  // Shift to useful range
        sumSquares += (double)s * s;
        if (abs(s) > peak) peak = abs(s);
    }
    double rms = sqrt(sumSquares / sampleCount);

    data.peakAmplitude = (float)peak;

    // Convert to dB (approximate)
    if (rms > REFERENCE_AMP) {
        data.noiseLevel_dB = 20.0 * log10(rms / REFERENCE_AMP);
    }

    // Clamp to reasonable range
    if (data.noiseLevel_dB > 120.0) data.noiseLevel_dB = 120.0;
    if (data.noiseLevel_dB < 0.0) data.noiseLevel_dB = 0.0;

    // Simple crowd noise detection: sustained noise above threshold
    data.isCrowdNoise = (data.noiseLevel_dB > CROWD_NOISE_DB);

    return data;
}
