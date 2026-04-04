#include "imu.h"
#include <MPU6050_light.h>
#include <Wire.h>

static MPU6050 mpu(Wire);
static bool imuInitialized = false;

void initIMU() {
    byte status = mpu.begin();
    if (status == 0) {
        Serial.println("[IMU] MPU6050 initialized, calibrating...");
        mpu.calcOffsets();  // Calibrate gyro & accel
        imuInitialized = true;
        Serial.println("[IMU] Calibration done");
    } else {
        Serial.print("[IMU] MPU6050 init FAILED, status: ");
        Serial.println(status);
    }
}

IMUData readIMU() {
    IMUData data;
    data.accelX = 0.0;
    data.accelY = 0.0;
    data.accelZ = 0.0;
    data.gyroX = 0.0;
    data.gyroY = 0.0;
    data.gyroZ = 0.0;
    data.temperature = 0.0;
    data.vibrationMagnitude = 0.0;

    if (!imuInitialized) return data;

    mpu.update();

    data.accelX = mpu.getAccX();
    data.accelY = mpu.getAccY();
    data.accelZ = mpu.getAccZ();
    data.gyroX = mpu.getGyroX();
    data.gyroY = mpu.getGyroY();
    data.gyroZ = mpu.getGyroZ();
    data.temperature = mpu.getTemp();

    // Vibration magnitude = sqrt(ax^2 + ay^2 + az^2) - 1.0 (gravity)
    float mag = sqrt(data.accelX * data.accelX + data.accelY * data.accelY + data.accelZ * data.accelZ);
    data.vibrationMagnitude = abs(mag - 1.0);

    return data;
}
