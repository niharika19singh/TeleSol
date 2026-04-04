#include "oled.h"
#include <Adafruit_SSD1306.h>
#include <Wire.h>
#include "config.h"

static Adafruit_SSD1306 display(OLED_WIDTH, OLED_HEIGHT, &Wire, -1);
static bool oledInitialized = false;

void initOLED() {
    if (display.begin(SSD1306_SWITCHCAPVCC, OLED_ADDR)) {
        oledInitialized = true;
        display.clearDisplay();
        display.setTextColor(SSD1306_WHITE);
        display.setTextSize(1);
        display.setCursor(0, 0);
        display.println("TeleSol Hub");
        display.println("Initializing...");
        display.display();
        Serial.println("[OLED] SSD1306 initialized");
    } else {
        Serial.println("[OLED] SSD1306 init FAILED");
    }
}

void updateDisplay(int estimatedHumans, float crowdDensity, String activityLevel) {
    if (!oledInitialized) return;

    display.clearDisplay();
    display.setTextColor(SSD1306_WHITE);

    // Title
    display.setTextSize(1);
    display.setCursor(0, 0);
    display.println("=== TeleSol Hub ===");

    // Data
    display.setCursor(0, 16);
    display.print("Humans: ");
    display.println(estimatedHumans);

    display.print("Density: ");
    display.print(crowdDensity, 2);
    display.println(" /m2");

    display.print("Activity: ");
    display.println(activityLevel);

    // WiFi status
    display.setCursor(0, 56);
    display.print("WiFi: ");
    display.println(WiFi.status() == WL_CONNECTED ? "OK" : "X");

    display.display();
}
