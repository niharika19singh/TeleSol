"""
Virtual Sentinel Simulation Engine — Hardware-Free TeleSol
══════════════════════════════════════════════════════════
Simulates multi-zone venue dynamics, realistic hardware sensor telemetry,
incident triggers, and automated TinyFish investigations without requiring physical boards.

Supported Scenarios:
1. 'normal'        — Regular steady crowd movement, low risk.
2. 'congestion'    — Peak arrival flow, density elevation.
3. 'sudden_surge'  — Rapid flash-crowd influx (concert/train arrival).
4. 'blocked_exit'  — Bottleneck / restricted egress at Gate C/F.
"""

import math
import time
import random
import asyncio
import logging
from typing import Dict, Any, List, Optional
from datetime import datetime, timezone

from app.services.data_store import store
from app.services.sensor_processor import SensorProcessor
from app.services.crs_calculator import CRSCalculator
from app.services.alert_engine import AlertEngine
from app.services.ai_predictor import ai_predictor
from app.services.tinyfish_service import tinyfish_service

logger = logging.getLogger("telesol.sentinel")

INITIAL_ZONES = [
    {
        "id": "zone-a",
        "name": "Gate A — Main Entry",
        "lat": 28.5469,
        "lng": 77.2710,
        "radius": 120,
        "density": 2.4,
        "flowInstability": 18,
        "panicLevel": 6,
        "riskScore": 25,
        "status": "safe",
        "sensorCount": 4,
        "capacity": 300,
        "occupancy": 72,
    },
    {
        "id": "zone-b",
        "name": "Gate B — East Wing",
        "lat": 28.5475,
        "lng": 77.2755,
        "radius": 100,
        "density": 3.6,
        "flowInstability": 32,
        "panicLevel": 12,
        "riskScore": 38,
        "status": "safe",
        "sensorCount": 3,
        "capacity": 200,
        "occupancy": 76,
    },
    {
        "id": "zone-c",
        "name": "Gate C — VIP Corridor",
        "lat": 28.5445,
        "lng": 77.2725,
        "radius": 80,
        "density": 4.2,
        "flowInstability": 38,
        "panicLevel": 15,
        "riskScore": 45,
        "status": "warning",
        "sensorCount": 5,
        "capacity": 150,
        "occupancy": 68,
    },
    {
        "id": "zone-d",
        "name": "Gate D — South Exit",
        "lat": 28.5440,
        "lng": 77.2695,
        "radius": 110,
        "density": 1.8,
        "flowInstability": 10,
        "panicLevel": 4,
        "riskScore": 14,
        "status": "safe",
        "sensorCount": 3,
        "capacity": 350,
        "occupancy": 63,
    },
    {
        "id": "zone-e",
        "name": "Gate E — Parking Zone",
        "lat": 28.5488,
        "lng": 77.2680,
        "radius": 140,
        "density": 3.1,
        "flowInstability": 25,
        "panicLevel": 10,
        "riskScore": 32,
        "status": "safe",
        "sensorCount": 4,
        "capacity": 250,
        "occupancy": 80,
    },
    {
        "id": "zone-f",
        "name": "Gate F — Emergency Exit",
        "lat": 28.5453,
        "lng": 77.2765,
        "radius": 90,
        "density": 1.2,
        "flowInstability": 8,
        "panicLevel": 3,
        "riskScore": 10,
        "status": "safe",
        "sensorCount": 2,
        "capacity": 400,
        "occupancy": 48,
    },
]


class VirtualSentinel:
    def __init__(self):
        self.is_running: bool = True
        self.scenario: str = "normal"  # 'normal', 'congestion', 'sudden_surge', 'blocked_exit'
        self.speed: float = 1.0        # 1x, 2x, 5x
        self.sim_time: int = 0
        self.zones: List[Dict[str, Any]] = [dict(z) for z in INITIAL_ZONES]
        self.timeline: List[Dict[str, Any]] = []
        self._task: Optional[asyncio.Task] = None
        self._last_alert_time: float = 0
        self._last_investigation_time: float = 0

    def start(self):
        """Resume or start simulation loop."""
        self.is_running = True
        if self._task is None or self._task.done():
            self._task = asyncio.create_task(self._run_loop())
        logger.info("[Sentinel] Simulation started/resumed. Scenario: %s", self.scenario)

    def pause(self):
        """Pause simulation loop."""
        self.is_running = False
        logger.info("[Sentinel] Simulation paused.")

    def reset(self):
        """Reset simulation state and zones to baseline."""
        self.sim_time = 0
        self.scenario = "normal"
        self.zones = [dict(z) for z in INITIAL_ZONES]
        self.timeline.append({
            "id": f"evt-{int(time.time())}",
            "time": datetime.now().strftime("%H:%M:%S"),
            "zone": "All Zones",
            "type": "info",
            "message": "Simulation reset to baseline normal state",
        })
        logger.info("[Sentinel] Simulation reset.")

    def set_scenario(self, scenario: str):
        """Switch active simulation scenario."""
        valid_scenarios = ["normal", "congestion", "sudden_surge", "blocked_exit"]
        if scenario in valid_scenarios:
            self.scenario = scenario
            self.timeline.insert(0, {
                "id": f"evt-{int(time.time())}",
                "time": datetime.now().strftime("%H:%M:%S"),
                "zone": "Venue",
                "type": "scenario_change",
                "message": f"Scenario changed to '{scenario.replace('_', ' ').upper()}'",
            })
            logger.info("[Sentinel] Scenario changed to %s", scenario)

    def set_speed(self, speed: float):
        """Set simulation speed multiplier."""
        self.speed = max(0.5, min(5.0, speed))

    def _step_zones(self):
        """Update multi-zone metrics according to active scenario."""
        self.sim_time += 1
        t = self.sim_time * 0.1

        for z in self.zones:
            zid = z["id"]
            base_cap = z.get("capacity", 200)

            if self.scenario == "normal":
                target_density = 2.0 + 0.5 * math.sin(t + hash(zid) % 5)
                target_flow = 15 + 5 * math.cos(t)
                target_panic = 5 + 3 * random.random()
                target_risk = 22 + 8 * math.sin(t * 0.5)

            elif self.scenario == "congestion":
                # Gradual elevation across all gates
                target_density = 5.2 + 1.0 * math.sin(t * 0.7)
                target_flow = 48 + 8 * math.cos(t)
                target_panic = 18 + 5 * random.random()
                target_risk = 58 + 7 * math.sin(t * 0.6)

            elif self.scenario == "sudden_surge":
                # Extreme spike at Gate A, B, C
                if zid in ["zone-a", "zone-b", "zone-c"]:
                    target_density = 7.8 + 1.2 * math.sin(t)
                    target_flow = 70 + 10 * math.cos(t)
                    target_panic = 42 + 10 * random.random()
                    target_risk = 82 + 8 * math.sin(t)
                else:
                    target_density = 3.5 + 0.8 * math.sin(t)
                    target_flow = 25 + 5 * math.cos(t)
                    target_panic = 10 + 4 * random.random()
                    target_risk = 35 + 8 * math.sin(t)

            elif self.scenario == "blocked_exit":
                # Gate C and Gate F severely restricted
                if zid == "zone-c":
                    target_density = 8.9 + 0.6 * math.sin(t)
                    target_flow = 85 + 8 * math.cos(t)
                    target_panic = 68 + 10 * random.random()
                    target_risk = 92 + 5 * math.sin(t)
                elif zid == "zone-f":
                    target_density = 6.8 + 1.0 * math.sin(t)
                    target_flow = 72 + 6 * math.cos(t)
                    target_panic = 55 + 8 * random.random()
                    target_risk = 84 + 6 * math.sin(t)
                else:
                    target_density = 5.0 + 1.0 * math.sin(t)
                    target_flow = 50 + 6 * math.cos(t)
                    target_panic = 25 + 5 * random.random()
                    target_risk = 60 + 8 * math.sin(t)

            # Dynamic convergence rate: faster response on sudden surge and blocked exit
            rate = 0.55 if self.scenario in ["sudden_surge", "blocked_exit"] else 0.3
            curr_density = z["density"]
            z["density"] = round(max(0.5, curr_density + (target_density - curr_density) * rate + random.uniform(-0.05, 0.05)), 2)
            
            curr_flow = z["flowInstability"]
            z["flowInstability"] = max(0, min(100, int(round(curr_flow + (target_flow - curr_flow) * rate + random.randint(-1, 1)))))

            curr_panic = z["panicLevel"]
            z["panicLevel"] = max(0, min(100, int(round(curr_panic + (target_panic - curr_panic) * rate + random.randint(-1, 1)))))

            curr_risk = z["riskScore"]
            new_risk = max(0, min(100, int(round(curr_risk + (target_risk - curr_risk) * rate + random.randint(-1, 1)))))
            z["riskScore"] = new_risk

            # Status classification
            if new_risk > 65:
                z["status"] = "danger"
            elif new_risk > 40:
                z["status"] = "warning"
            else:
                z["status"] = "safe"

            # Derive occupancy from density and area
            area = z["radius"] * z["radius"] * 0.005
            z["occupancy"] = min(int(base_cap * 1.5), int(z["density"] * area))

    def _generate_primary_sensor_packet(self) -> Dict[str, Any]:
        """Generate high-fidelity sensor frame for the primary node (SIM-TELESOL-001)."""
        # Mirror the most critical active zone
        peak_zone = max(self.zones, key=lambda z: z["riskScore"])
        density = peak_zone["density"]
        risk = peak_zone["riskScore"]

        humans = max(1, int(round(density * 2.2)))
        human_detected = humans > 0
        vibration = round(0.5 + (density / 3.0) + (random.uniform(-0.1, 0.2)), 2)
        tof_distance = max(180, int(1800 - (density * 180) + random.randint(-30, 30)))
        radar_energy = min(99, max(10, int(density * 12 + random.randint(-5, 5))))

        return {
            "node_id": "SIM-TELESOL-001",
            "timestamp": int(time.time() * 1000),
            "sensors": {
                "imu": {
                    "accelX": round(random.gauss(0.04, 0.08), 2),
                    "accelY": round(random.gauss(-0.02, 0.06), 2),
                    "accelZ": round(9.81 + random.gauss(0, 0.15), 2),
                    "gyroX": round(random.gauss(0, 0.02), 3),
                    "gyroY": round(random.gauss(0, 0.02), 3),
                    "gyroZ": round(random.gauss(0, 0.01), 3),
                    "temperature": round(28.5 + 0.3 * math.sin(self.sim_time * 0.1), 1),
                    "vibrationMagnitude": vibration,
                },
                "tof": {
                    "distance_mm": tof_distance,
                    "valid": True,
                    "rangeStatus": 0,
                },
                "radar": {
                    "humanDetected": human_detected,
                    "distance_cm": random.randint(80, 240),
                    "movementState": 1 if risk > 40 else 0,
                    "energyLevel": radar_energy,
                },
                "audio": {
                    "noiseLevel_dB": round(45.0 + density * 4.5 + random.uniform(-2, 2), 1),
                    "peakAmplitude": round(0.2 + density * 0.08, 2),
                    "isCrowdNoise": density > 4.0,
                },
                "camera": {
                    "personCount": humans,
                    "frameTimestamp": int(time.time() * 1000),
                    "motionDetected": True,
                },
            },
            "computed": {
                "estimatedHumans": humans,
                "crowdDensity": round(density, 2),
                "zoneArea": 20.0,
                "networkUtil": round(min(98.0, 35.0 + risk * 0.6), 1),
                "growthRate": round(0.3 if risk < 40 else 0.8, 2),
                "capacity": 100.0,
                "deviceMultiplier": 2.0,
                "eventBoost": 0.2 if self.scenario in ["sudden_surge", "blocked_exit"] else 0.0,
            },
        }

    async def _run_loop(self):
        """Main autonomous simulation step loop."""
        logger.info("[Sentinel] Background loop started.")
        while True:
            try:
                if self.is_running:
                    self._step_zones()
                    payload = self._generate_primary_sensor_packet()

                    # Ingest through standard TeleSol sensor processor
                    processed = SensorProcessor.process(payload)
                    device_pct = float(processed.get("deviceDemandRatio", 0.0)) * 100.0
                    growth_pct = float(processed.get("growthRatePct", 0.0))
                    network_pct = float(processed.get("networkUtilPct", 0.0))
                    temporal_pct = float(processed.get("temporalFactorPct", 0.0))

                    crs = CRSCalculator.calculate(device_pct, growth_pct, network_pct, temporal_pct)
                    level = CRSCalculator.get_level(crs)
                    alert = AlertEngine.check_alert(crs)

                    # Update data store channel
                    store.update(payload, processed, crs, level, alert, payload["node_id"])

                    # Run AI Predictor
                    prediction = ai_predictor.predict(self.zones)
                    store.set_ai_forecast(prediction)

                    # Update Sentinel state in store
                    store.set_sentinel_data(
                        is_running=self.is_running,
                        scenario=self.scenario,
                        speed=self.speed,
                        sim_time=self.sim_time,
                        zones=self.zones,
                        timeline=self.timeline[:25],
                    )

                    # Check threshold escalation for TinyFish trigger
                    peak_zone = max(self.zones, key=lambda z: z["riskScore"])
                    now = time.time()
                    if peak_zone["riskScore"] >= 75 and (now - self._last_investigation_time > 45):
                        self._last_investigation_time = now
                        reason = f"{peak_zone['name']} escalated to {peak_zone['riskScore']}/100 CRS in {self.scenario} scenario"
                        self.timeline.insert(0, {
                            "id": f"evt-{int(now)}",
                            "time": datetime.now().strftime("%H:%M:%S"),
                            "zone": peak_zone["name"].split("—")[0].strip(),
                            "type": "alert_critical",
                            "message": f"Critical risk detected ({peak_zone['riskScore']}/100). Auto-dispatching TinyFish Web Agent investigation.",
                        })
                        # Launch async background investigation (never blocking)
                        asyncio.create_task(
                            tinyfish_service.run_investigation(
                                zone_id=peak_zone["id"],
                                zone_name=peak_zone["name"].split("—")[0].strip(),
                                reason=reason,
                                manual=False,
                            )
                        )

                    # Broadcast update to WebSocket clients
                    try:
                        await store.broadcast({
                            "type": "sensor_update",
                            "data": store.get_dashboard_all(),
                        })
                    except Exception:
                        pass

                delay = max(0.4, 2.0 / self.speed)
                await asyncio.sleep(delay)

            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error("[Sentinel] Loop error: %s", str(e), exc_info=True)
                await asyncio.sleep(2.0)

    def get_status(self) -> Dict[str, Any]:
        """Return current sentinel state."""
        avg_risk = sum(z["riskScore"] for z in self.zones) / max(1, len(self.zones))
        total_occupancy = sum(z.get("occupancy", 0) for z in self.zones)
        total_capacity = sum(z.get("capacity", 200) for z in self.zones)
        peak_zone = max(self.zones, key=lambda z: z["riskScore"])

        return {
            "isRunning": self.is_running,
            "scenario": self.scenario,
            "speed": self.speed,
            "simTime": self.sim_time,
            "zones": self.zones,
            "venue": {
                "totalOccupancy": total_occupancy,
                "totalCapacity": total_capacity,
                "occupancyPct": round((total_occupancy / max(1, total_capacity)) * 100, 1),
                "avgRisk": round(avg_risk, 1),
                "peakZone": peak_zone["name"].split("—")[0].strip(),
                "peakRisk": peak_zone["riskScore"],
            },
            "timeline": self.timeline[:25],
        }


# Singleton sentinel
virtual_sentinel = VirtualSentinel()
