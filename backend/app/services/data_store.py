"""In-memory data store for sensor readings. Shared across routers.

Supports dual data channels:
  - 'real'  — data from actual ESP32 sensors
  - 'sim'   — data from the simulation bridge
Each channel has its own state, alerts, and CRS history.
"""
from typing import Dict, Any, List, Optional
from datetime import datetime, timezone
import asyncio


class ChannelState:
    """State for a single data channel (real or simulated)."""

    def __init__(self, channel_name: str):
        self.channel = channel_name
        self.latest_reading: Optional[Dict[str, Any]] = None
        self.latest_processed: Optional[Dict[str, Any]] = None
        self.latest_crs: float = 0.0
        self.latest_level: str = "normal"
        self.latest_alert: Optional[Dict[str, Any]] = None
        self.node_id: str = "sensor_hub_001"
        self.last_update: Optional[str] = None
        self.crs_history: List[Dict[str, Any]] = []
        self.reading_count: int = 0

    def update(self, raw_payload, processed, crs, level, alert, node_id):
        self.latest_reading = raw_payload
        self.latest_processed = processed
        self.latest_crs = crs
        self.latest_level = level
        self.latest_alert = alert
        self.node_id = node_id
        self.last_update = datetime.now(timezone.utc).isoformat()
        self.reading_count += 1
        self.crs_history.append({
            "crs": round(crs, 1),
            "level": level,
            "timestamp": self.last_update,
            "channel": self.channel,
        })
        if len(self.crs_history) > 50:
            self.crs_history = self.crs_history[-50:]


class DataStore:
    """Dual-channel data store: real sensors vs simulation."""

    def __init__(self):
        self.real = ChannelState("real")
        self.sim = ChannelState("sim")
        self._ws_clients: List[Any] = []

        # Protocol layer stats
        self.coap_stats: Dict[str, Any] = {
            "active": False,
            "port": 5683,
            "requests_handled": 0,
            "last_request_time": None,
        }
        self.http_stats: Dict[str, Any] = {
            "requests_received": 0,
            "last_request_time": None,
        }

        # Multi-zone Sentinel & AI forecast state
        self.sentinel_data: Dict[str, Any] = {
            "isRunning": True,
            "scenario": "normal",
            "speed": 1.0,
            "simTime": 0,
            "zones": [],
            "venue": {
                "totalOccupancy": 0,
                "totalCapacity": 1600,
                "occupancyPct": 0.0,
                "avgRisk": 0.0,
                "peakZone": "Gate A",
                "peakRisk": 0,
            },
            "timeline": [],
        }
        self.ai_forecast: Dict[str, Any] = {
            "modelName": "CrowdPredict v3.5",
            "modelType": "Statistical ML Regressor & Rules Fallback",
            "confidence": 89.0,
            "predictionWindow": "5-15 min",
            "inferenceLatencyMs": 18,
            "forecast5min": [],
            "forecast15min": [],
            "anomalyDetected": False,
            "anomalyScore": 0.0,
        }

    def _get_channel(self, node_id: str) -> ChannelState:
        """Route data to the correct channel based on node_id prefix."""
        if node_id and node_id.startswith("SIM-"):
            return self.sim
        return self.real

    def update(self, raw_payload: Dict, processed: Dict, crs: float, level: str, alert: Dict, node_id: str):
        """Store reading in the appropriate channel."""
        ch = self._get_channel(node_id)
        ch.update(raw_payload, processed, crs, level, alert, node_id)

        # Global HTTP stats
        total = self.real.reading_count + self.sim.reading_count
        self.http_stats["requests_received"] = total
        self.http_stats["last_request_time"] = ch.last_update

    # ── Channel-aware getters ──

    def _active_channel(self, channel: Optional[str] = None) -> ChannelState:
        """Return the requested channel state. Defaults to real if data exists, else sim."""
        if channel == "sim":
            return self.sim
        if channel == "real":
            return self.real
        # Auto: prefer real if it has data
        if self.real.latest_reading:
            return self.real
        return self.sim

    def get_stats(self, channel: str = None) -> Dict[str, Any]:
        ch = self._active_channel(channel)
        p = ch.latest_processed or {}
        return {
            "totalNodes": 1,
            "activeNodes": 1 if ch.last_update else 0,
            "activeDevices": max(1, p.get("estimatedHumans", 0)) + 2,
            "networkUtil": round(p.get("networkUtilPct", 0), 1),
            "riskScore": round(ch.latest_crs, 1),
            "energySaved": 0.0,
            "activeAlerts": 1 if ch.latest_crs > 40 else 0,
            "lastUpdate": ch.last_update,
            "readingCount": ch.reading_count,
            "channel": ch.channel,
        }

    def get_sensor_health(self, channel: str = None) -> Dict[str, Any]:
        ch = self._active_channel(channel)
        sensors = {}
        if ch.latest_reading:
            raw = ch.latest_reading.get("sensors", {})
            sensors["radar"] = "active" if isinstance(raw.get("radar"), dict) else "offline"
            sensors["tof"] = "active" if isinstance(raw.get("tof"), dict) else "offline"
            sensors["audio"] = "active" if isinstance(raw.get("audio"), dict) else "offline"
            sensors["imu"] = "active" if isinstance(raw.get("imu"), dict) else "offline"
            sensors["camera"] = "active" if isinstance(raw.get("camera"), dict) else "offline"
        else:
            sensors = {k: "offline" for k in ["radar", "tof", "audio", "imu", "camera"]}
        sensors["lastUpdate"] = ch.last_update or "never"
        sensors["channel"] = ch.channel
        return sensors

    def get_live_data(self, channel: str = None) -> Dict[str, Any]:
        ch = self._active_channel(channel)
        if not ch.latest_reading:
            return {"status": "no_data"}
        raw = ch.latest_reading.get("sensors", {})
        p = ch.latest_processed or {}
        return {
            "radarHumans": p.get("estimatedHumans", 0),
            "radarDistance": raw.get("radar", {}).get("distance_cm", 0),
            "radarEnergy": raw.get("radar", {}).get("energyLevel", 0),
            "radarPresence": raw.get("radar", {}).get("humanDetected", False),
            "radarMoving": raw.get("radar", {}).get("movementState", 0),
            "noiseLevel": raw.get("audio", {}).get("noiseLevel_dB", 0),
            "isCrowdNoise": raw.get("audio", {}).get("isCrowdNoise", False),
            "tofDistance": raw.get("tof", {}).get("distance_mm", 0),
            "tofValid": raw.get("tof", {}).get("valid", False),
            "tofRangeStatus": raw.get("tof", {}).get("rangeStatus", 4),
            "vibration": raw.get("imu", {}).get("vibrationMagnitude", 0),
            "temperature": raw.get("imu", {}).get("temperature", 0),
            "accelX": raw.get("imu", {}).get("accelX", 0),
            "accelY": raw.get("imu", {}).get("accelY", 0),
            "accelZ": raw.get("imu", {}).get("accelZ", 0),
            "gyroX": raw.get("imu", {}).get("gyroX", 0),
            "gyroY": raw.get("imu", {}).get("gyroY", 0),
            "gyroZ": raw.get("imu", {}).get("gyroZ", 0),
            "cameraPeopleCount": raw.get("camera", {}).get("personCount", 0),
            "motionDetected": raw.get("camera", {}).get("motionDetected", False),
            "crowdDensity": p.get("crowdDensity", 0),
            "lastUpdate": ch.last_update,
            "channel": ch.channel,
        }

    def get_sensor_detail(self, channel: str = None) -> Dict[str, Any]:
        ch = self._active_channel(channel)
        if not ch.latest_reading:
            return {"status": "no_data"}
        raw = ch.latest_reading.get("sensors", {})
        computed = ch.latest_reading.get("computed", {})
        return {
            "imu": raw.get("imu", {}),
            "tof": raw.get("tof", {}),
            "radar": raw.get("radar", {}),
            "computed": computed,
            "crs": {
                "score": round(ch.latest_crs, 1),
                "level": ch.latest_level,
            },
            "lastUpdate": ch.last_update,
            "channel": ch.channel,
        }

    def get_crs_breakdown(self, channel: str = None) -> Dict[str, Any]:
        ch = self._active_channel(channel)
        p = ch.latest_processed or {}
        return {
            "crs": round(ch.latest_crs, 1),
            "level": ch.latest_level,
            "breakdown": {
                "deviceDemand": {"value": round(p.get("deviceDemandRatio", 0) * 100, 1), "weight": 0.35},
                "growthRate": {"value": round(p.get("growthRatePct", 0), 1), "weight": 0.25},
                "networkUtil": {"value": round(p.get("networkUtilPct", 0), 1), "weight": 0.30},
                "temporalFactor": {"value": round(p.get("temporalFactorPct", 0), 1), "weight": 0.10},
            },
            "history": ch.crs_history[-10:],
            "channel": ch.channel,
        }

    def set_sentinel_data(self, is_running: bool, scenario: str, speed: float, sim_time: int, zones: List[Dict], timeline: List[Dict]):
        avg_risk = sum(z.get("riskScore", 0) for z in zones) / max(1, len(zones))
        total_occ = sum(z.get("occupancy", 0) for z in zones)
        total_cap = sum(z.get("capacity", 200) for z in zones)
        peak_z = max(zones, key=lambda z: z.get("riskScore", 0)) if zones else {"name": "Gate A", "riskScore": 0}
        self.sentinel_data = {
            "isRunning": is_running,
            "scenario": scenario,
            "speed": speed,
            "simTime": sim_time,
            "zones": zones,
            "venue": {
                "totalOccupancy": total_occ,
                "totalCapacity": total_cap,
                "occupancyPct": round((total_occ / max(1, total_cap)) * 100, 1),
                "avgRisk": round(avg_risk, 1),
                "peakZone": peak_z.get("name", "").split("—")[0].strip(),
                "peakRisk": peak_z.get("riskScore", 0),
            },
            "timeline": timeline,
        }

    def set_ai_forecast(self, forecast: Dict[str, Any]):
        self.ai_forecast = forecast

    def get_sentinel_data(self) -> Dict[str, Any]:
        return self.sentinel_data

    def get_ai_forecast(self) -> Dict[str, Any]:
        return self.ai_forecast

    def get_alerts(self, channel: str = None) -> List[Dict[str, Any]]:
        alerts = []
        # Multi-zone alerts derived from sentinel zones
        for z in self.sentinel_data.get("zones", []):
            score = z.get("riskScore", 0)
            if score > 65:
                alerts.append({
                    "id": f"alrt-{z.get('id')}-crit",
                    "zone": z.get("name"),
                    "zoneId": z.get("id"),
                    "crs": score,
                    "severity": "critical",
                    "message": f"Critical congestion threshold exceeded ({score}/100)",
                    "action": f"Immediate crowd diversion required at {z.get('name')}. Open secondary gates.",
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                    "channel": "sim",
                })
            elif score > 40:
                alerts.append({
                    "id": f"alrt-{z.get('id')}-warn",
                    "zone": z.get("name"),
                    "zoneId": z.get("id"),
                    "crs": score,
                    "severity": "warning",
                    "message": f"Elevated crowd density ({z.get('density', 0):.1f} ppl/m²)",
                    "action": f"Monitor flow stability at {z.get('name')}. Prepare buffer queue.",
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                    "channel": "sim",
                })

        ch = self._active_channel(channel)
        if ch.latest_alert:
            alerts.insert(0, {
                "id": 1,
                "zone": f"Node {ch.node_id}",
                "crs": round(ch.latest_crs, 1),
                "severity": ch.latest_alert.get("type", "normal"),
                "action": ch.latest_alert.get("message", ""),
                "timestamp": ch.last_update,
                "channel": ch.channel,
            })
        return alerts

    def get_protocol_status(self) -> Dict[str, Any]:
        return {
            "http": {
                "active": True,
                "requestsReceived": self.http_stats.get("requests_received", 0),
                "lastRequestTime": self.http_stats.get("last_request_time"),
            },
            "coap": {
                "active": self.coap_stats.get("active", False),
                "port": self.coap_stats.get("port", 5683),
                "requestsHandled": self.coap_stats.get("requests_handled", 0),
                "lastRequestTime": self.coap_stats.get("last_request_time"),
            },
            "websocket": {
                "active": True,
                "clientsConnected": len(self._ws_clients),
            },
        }

    def get_channel_summary(self) -> Dict[str, Any]:
        """Return summary of both channels for the dashboard toggle."""
        return {
            "real": {
                "hasData": self.real.latest_reading is not None,
                "readingCount": self.real.reading_count,
                "lastUpdate": self.real.last_update,
                "crs": round(self.real.latest_crs, 1),
                "level": self.real.latest_level,
                "nodeId": self.real.node_id,
            },
            "sim": {
                "hasData": self.sim.latest_reading is not None,
                "readingCount": self.sim.reading_count,
                "lastUpdate": self.sim.last_update,
                "crs": round(self.sim.latest_crs, 1),
                "level": self.sim.latest_level,
                "nodeId": self.sim.node_id,
            },
        }

    def get_dashboard_all(self, channel: str = None) -> Dict[str, Any]:
        from app.services.tinyfish_service import tinyfish_service
        return {
            "stats": self.get_stats(channel),
            "sensorHealth": self.get_sensor_health(channel),
            "liveData": self.get_live_data(channel),
            "crs": self.get_crs_breakdown(channel),
            "alerts": self.get_alerts(channel),
            "protocols": self.get_protocol_status(),
            "channels": self.get_channel_summary(),
            "sentinel": self.sentinel_data,
            "aiForecast": self.ai_forecast,
            "tinyfish": tinyfish_service.get_status(),
        }

    async def add_ws_client(self, ws):
        self._ws_clients.append(ws)

    async def remove_ws_client(self, ws):
        if ws in self._ws_clients:
            self._ws_clients.remove(ws)

    async def broadcast(self, data: Dict):
        disconnected = []
        for ws in self._ws_clients:
            try:
                await ws.send_json(data)
            except Exception:
                disconnected.append(ws)
        for ws in disconnected:
            await self.remove_ws_client(ws)


# Singleton instance
store = DataStore()
