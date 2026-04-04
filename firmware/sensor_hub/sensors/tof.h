// VL53L0X ToF Sensor
#ifndef TOF_H
#define TOF_H
#include <Arduino.h>

struct ToFData {
    uint16_t distance_mm;
    bool valid;
    uint8_t rangeStatus;
};

void initToF();
ToFData readToF();

#endif // TOF_H
