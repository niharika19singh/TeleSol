// INMP441 Microphone
#ifndef MICROPHONE_H
#define MICROPHONE_H
#include <Arduino.h>

struct AudioData {
    float noiseLevel_dB;
    float peakAmplitude;
    bool isCrowdNoise;
};

void initMicrophone();
AudioData readAudio();

#endif // MICROPHONE_H
