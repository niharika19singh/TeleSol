#include "tof.h"
#include <Adafruit_VL53L0X.h>

static Adafruit_VL53L0X lox;
static bool tofInitialized = false;

void initToF() {
    if (lox.begin()) {
        tofInitialized = true;
        Serial.println("[ToF] VL53L0X initialized");
        // Set long range mode
        lox.configSensor(Adafruit_VL53L0X::VL53L0X_SENSE_LONG_RANGE);
    } else {
        Serial.println("[ToF] VL53L0X init FAILED - check wiring");
    }
}

ToFData readToF() {
    ToFData data;
    data.distance_mm = 0;
    data.valid = false;
    data.rangeStatus = 255;

    if (!tofInitialized) return data;

    VL53L0X_RangingMeasurementData_t measure;
    lox.rangingTest(&measure, false);

    data.rangeStatus = measure.RangeStatus;

    if (measure.RangeStatus != 4) { // 4 = out of range / phase failure
        data.distance_mm = measure.RangeMilliMeter;
        data.valid = true;
    }

    return data;
}
