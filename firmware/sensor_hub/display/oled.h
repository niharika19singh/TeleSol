// SSD1306 OLED Display
#ifndef OLED_H
#define OLED_H
#include <Arduino.h>
#include <WiFi.h>

void initOLED();
void updateDisplay(int estimatedHumans, float crowdDensity, String activityLevel);

#endif // OLED_H
