#include "radar.h"

// HLK-LD2410 uses UART at 256000 baud
// Protocol: Engineering mode for detailed target data
// Frame format: 0xF4F3F2F1 [data...] 0xF8F7F6F5

static HardwareSerial radarSerial(2); // UART2
static bool radarInitialized = false;

void initRadar(int rxPin, int txPin, long baud) {
    radarSerial.begin(baud, SERIAL_8N1, rxPin, txPin);
    radarInitialized = true;
    Serial.println("[Radar] HLK-LD2410 initialized on UART2");
}

RadarData readRadar() {
    RadarData data;
    data.humanDetected = false;
    data.distance_cm = 0;
    data.movementState = 0;
    data.energyLevel = 0;

    if (!radarInitialized) return data;

    // Read available data from radar
    uint8_t buf[64];
    int idx = 0;
    unsigned long start = millis();

    // Wait up to 100ms for a complete frame
    while (millis() - start < 100 && idx < 64) {
        if (radarSerial.available()) {
            buf[idx++] = radarSerial.read();
        }
    }

    if (idx < 10) return data;

    // Look for frame header F4 F3 F2 F1
    for (int i = 0; i < idx - 8; i++) {
        if (buf[i] == 0xF4 && buf[i+1] == 0xF3 && buf[i+2] == 0xF2 && buf[i+3] == 0xF1) {
            // Parse target data after header
            int dataStart = i + 6; // skip header + length
            if (dataStart + 4 < idx) {
                uint8_t targetState = buf[dataStart];   // 0=no target, 1=moving, 2=static, 3=both
                uint16_t movingDist = buf[dataStart+1] | (buf[dataStart+2] << 8);
                uint8_t movingEnergy = buf[dataStart+3];

                if (targetState > 0) {
                    data.humanDetected = true;
                    data.distance_cm = movingDist;
                    data.movementState = targetState;
                    data.energyLevel = movingEnergy;
                }
            }
            break;
        }
    }

    // Flush remaining buffer
    while (radarSerial.available()) radarSerial.read();

    return data;
}
