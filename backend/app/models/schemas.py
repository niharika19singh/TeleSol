from pydantic import BaseModel
from typing import Dict, Any

class RadarData(BaseModel):
    humanDetected: bool
    distance_cm: int
    movementState: int
    energyLevel: int

class ToFData(BaseModel):
    distance_mm: int
    valid: bool
    rangeStatus: int

class AudioData(BaseModel):
    noiseLevel_dB: float
    peakAmplitude: float
    isCrowdNoise: bool

class IMUData(BaseModel):
    accelX: float
    accelY: float
    accelZ: float
    gyroX: float
    gyroY: float
    gyroZ: float
    temperature: float
    vibrationMagnitude: float

class CameraData(BaseModel):
    personCount: int
    frameTimestamp: int
    motionDetected: bool

class SensorPayload(BaseModel):
    node_id: str
    timestamp: int
    sensors: Dict[str, Any]
    computed: Dict[str, Any]
