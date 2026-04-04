// Camera Data Struct
#ifndef PERSON_COUNTER_H
#define PERSON_COUNTER_H
#include <Arduino.h>

struct CameraData {
    uint8_t personCount;
    uint32_t frameTimestamp;
    bool motionDetected;
};

bool initCamera();
CameraData readCamera();

#endif // PERSON_COUNTER_H
