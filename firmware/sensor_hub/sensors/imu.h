// MPU6050 IMU
#ifndef IMU_H
#define IMU_H
#include <Arduino.h>

struct IMUData {
    float accelX, accelY, accelZ;
    float gyroX, gyroY, gyroZ;
    float temperature;
    float vibrationMagnitude;
};

void initIMU();
IMUData readIMU();

#endif // IMU_H
