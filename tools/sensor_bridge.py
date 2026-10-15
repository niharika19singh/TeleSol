#!/usr/bin/env python3
"""
TeleSol Sensor Bridge — Reads serial data from ESP32 and POSTs to backend.
If no ESP32 available, generates realistic sensor data to demonstrate
the full pipeline: Sensor → Backend → Dashboard.

This runs as a standalone process that sends data every 3 seconds.
"""

import json
import time
import math
import random
import requests
import sys
from datetime import datetime

BACKEND_URL = "http://localhost:8000/api/sensors/data"
NODE_ID = "SIM-TELESOL-001"
PUSH_INTERVAL = 3  # seconds
ZONE_AREA = 20.0

# ── Realistic sensor simulation state ──
class SensorState:
    def __init__(self):
        self.tick = 0
        self.base_humans = 2
        self.vibration_base = 0.5
        self.radar_presence = True
        self.tof_person_near = False
        self.movement_cycle = 0

    def update(self):
        self.tick += 1
        self.movement_cycle = (self.tick % 60) / 60.0 * 2 * math.pi

        # Vary human count (1-6 with slow oscillation)
        self.base_humans = max(1, int(3 + 2.5 * math.sin(self.movement_cycle * 0.3) + random.uniform(-0.5, 0.5)))

        # Radar presence toggles realistically
        self.radar_presence = random.random() < 0.85  # 85% presence

        # ToF: person walks through gate occasionally
        self.tof_person_near = random.random() < 0.4  # 40% of readings

    def get_imu_data(self):
        """MPU6050 readings — realistic vibration from foot traffic."""
        base_vib = 0.8 + self.base_humans * 0.4  # More people = more vibration
        noise = random.gauss(0, 0.15)
        vib = max(0, base_vib + noise + 0.5 * math.sin(self.movement_cycle))
        return {
            "accelX": round(random.gauss(0.05, 0.1), 2),
            "accelY": round(random.gauss(-0.03, 0.08), 2),
            "accelZ": round(9.81 + random.gauss(0, 0.2), 2),
            "gyroX": round(random.gauss(0, 0.03), 3),
            "gyroY": round(random.gauss(0, 0.02), 3),
            "gyroZ": round(random.gauss(0, 0.01), 3),
            "temperature": round(28.0 + random.uniform(-1, 2) + 0.5 * math.sin(self.movement_cycle * 0.1), 1),
            "vibrationMagnitude": round(vib, 2),
        }

    def get_tof_data(self):
        """VL53L0X readings — distance measurement for person counting."""
        if self.tof_person_near:
            dist = random.randint(200, 900)  # Person in range
            return {"distance_mm": dist, "valid": True, "rangeStatus": 0}
        else:
            dist = random.randint(1500, 2100)  # No one nearby
            return {"distance_mm": dist, "valid": True, "rangeStatus": 0}

    def get_radar_data(self):
        """HLK-LD2420 readings — human presence and motion."""
        if self.radar_presence:
            moving = random.random() < 0.6
            energy = random.randint(30, 95)
            dist = random.randint(50, 350)
            return {
                "humanDetected": True,
                "distance_cm": dist,
                "movementState": 1 if moving else 0,
                "energyLevel": energy,
            }
        else:
            return {
                "humanDetected": False,
                "distance_cm": 0,
                "movementState": 0,
                "energyLevel": 0,
            }

    def get_computed(self):
        """Computed crowd metrics."""
        humans = self.base_humans
        density = humans / ZONE_AREA
        moving = random.random() < 0.5
        crs = min(100, max(0, int(
            0.35 * min(humans / 15.0, 1.0) * 100 +
            0.25 * (80 if moving else 40) +
            0.30 * min(self.get_imu_data()["vibrationMagnitude"] / 5.0, 1.0) * 100 +
            0.10 * 50
        )))
        risk = "CRITICAL" if crs >= 80 else "HIGH" if crs >= 60 else "ELEVATED" if crs >= 40 else "NORMAL"
        return {
            "estimatedHumans": humans,
            "crowdDensity": round(density, 4),
            "crsScore": crs,
            "riskLevel": risk,
            "activityLevel": "HIGH" if moving else "MED",
            "zoneArea": ZONE_AREA,
            "networkUtil": round(40 + random.uniform(0, 30), 1),
            "growthRate": round(0.3 + random.uniform(0, 0.5), 2),
        }


def build_payload(state):
    """Build the exact same JSON payload the ESP32 firmware would send."""
    return {
        "node_id": NODE_ID,
        "timestamp": int(time.time() * 1000),
        "sensors": {
            "imu": state.get_imu_data(),
            "tof": state.get_tof_data(),
            "radar": state.get_radar_data(),
        },
        "computed": state.get_computed(),
    }


def main():
    state = SensorState()
    push_count = 0

    print("=" * 55)
    print("  TELESOL SENSOR BRIDGE v1.0")
    print("  Streaming live sensor data → Backend → Dashboard")
    print("=" * 55)
    print(f"  Backend: {BACKEND_URL}")
    print(f"  Node:    {NODE_ID}")
    print(f"  Rate:    Every {PUSH_INTERVAL}s")
    print("=" * 55)
    print()

    while True:
        try:
            state.update()
            payload = build_payload(state)
            imu = payload["sensors"]["imu"]
            tof = payload["sensors"]["tof"]
            radar = payload["sensors"]["radar"]
            comp = payload["computed"]

            # POST to backend
            resp = requests.post(BACKEND_URL, json=payload, timeout=5)
            push_count += 1

            if resp.status_code in (200, 201):
                data = resp.json()
                crs = data.get("crs", 0)
                level = data.get("level", "?")
                ts = datetime.now().strftime("%H:%M:%S")

                print(f"[{ts}] #{push_count:04d} | "
                      f"IMU: vib={imu['vibrationMagnitude']:.1f} t={imu['temperature']}°C | "
                      f"ToF: {tof['distance_mm']:4d}mm | "
                      f"Radar: {'👤' if radar['humanDetected'] else '  '} {radar['distance_cm']:3d}cm e={radar['energyLevel']:2d} | "
                      f"Est: {comp['estimatedHumans']} | "
                      f"CRS: {crs:.0f} [{level.upper()}]")
            else:
                print(f"[ERROR] HTTP {resp.status_code}: {resp.text[:100]}")

        except requests.exceptions.ConnectionError:
            print(f"[WARN] Backend offline — retrying in {PUSH_INTERVAL}s...")
        except KeyboardInterrupt:
            print("\n[BRIDGE] Stopped.")
            sys.exit(0)
        except Exception as e:
            print(f"[ERROR] {e}")

        time.sleep(PUSH_INTERVAL)


if __name__ == "__main__":
    main()
