"""In-memory data store for sensor readings. Shared across routers."""
from typing import Dict, Any, List, Optional
from datetime import datetime, timezone
import asyncio

class DataStore:
    """Simple in-memory store for the latest sensor data and CRS history."""

    def __init__(self):
        self.latest_reading: Optional[Dict[str, Any]] = None
        self.latest_processed: Optional[Dict[str, Any]] = None
        self.latest_crs: float = 0.0
        self.latest_level: str = "normal"
        self.latest_alert: Optional[Dict[str, Any]] = None
        self.node_id: str = "sensor_hub_001"
        self.last_update: Optional[str] = None
        self.crs_history: List[Dict[str, Any]] = []
        self.reading_count: int = 0
        self._ws_clients: List[Any] = []

    def update(self, raw_payload: Dict, processed: Dict, crs: float, level: str, alert: Dict, node_id: str):
        """Store the latest reading."""
        self.latest_reading = raw_payload
        self.latest_processed = processed
        self.latest_crs = crs
        self.latest_level = level
        self.latest_alert = alert
        self.node_id = node_id
        self.last_update = datetime.now(timezone.utc).isoformat()
        self.reading_count += 1

        # Keep last 50 CRS readings for history
        self.crs_history.append({
            "crs": round(crs, 1),
            "level": level,
            "timestamp": self.last_update,
        })
        if len(self.crs_history) > 50:
            self.crs_history = self.crs_history[-50:]

    def get_stats(self) -> Dict[str, Any]:
        """Return aggregated stats for dashboard."""
        p = self.latest_processed or {}
        return {
            "totalNodes": 1,
            "activeNodes": 1 if self.last_update else 0,
            "activeDevices": max(1, p.get("estimatedHumans", 0)) + 2,  # sensors + humans
            "networkUtil": round(p.get("networkUtilPct", 0), 1),
            "riskScore": round(self.latest_crs, 1),
            "energySaved": 0.0,
            "activeAlerts": 1 if self.latest_crs > 40 else 0,
            "lastUpdate": self.last_update,
            "readingCount": self.reading_count,
        }

    def get_sensor_health(self) -> Dict[str, Any]:
        """Return sensor health status."""
        sensors = {}
        if self.latest_reading:
            raw = self.latest_reading.get("sensors", {})
            sensors["radar"] = "active" if isinstance(raw.get("radar"), dict) else "offline"
            sensors["tof"] = "active" if isinstance(raw.get("tof"), dict) else "offline"
            sensors["audio"] = "active" if isinstance(raw.get("audio"), dict) else "offline"
            sensors["imu"] = "active" if isinstance(raw.get("imu"), dict) else "offline"
            sensors["camera"] = "active" if isinstance(raw.get("camera"), dict) else "offline"
        else:
            sensors = {k: "offline" for k in ["radar", "tof", "audio", "imu", "camera"]}
        sensors["lastUpdate"] = self.last_update or "never"
        return sensors

    def get_live_data(self) -> Dict[str, Any]:
        """Return latest sensor readings."""
        if not self.latest_reading:
            return {"status": "no_data"}
        raw = self.latest_reading.get("sensors", {})
        p = self.latest_processed or {}
        return {
            "radarHumans": p.get("estimatedHumans", 0),
            "radarDistance": raw.get("radar", {}).get("distance_cm", 0),
            "radarEnergy": raw.get("radar", {}).get("energyLevel", 0),
            "noiseLevel": raw.get("audio", {}).get("noiseLevel_dB", 0),
            "isCrowdNoise": raw.get("audio", {}).get("isCrowdNoise", False),
            "tofDistance": raw.get("tof", {}).get("distance_mm", 0),
            "vibration": raw.get("imu", {}).get("vibrationMagnitude", 0),
            "temperature": raw.get("imu", {}).get("temperature", 0),
            "cameraPeopleCount": raw.get("camera", {}).get("personCount", 0),
            "motionDetected": raw.get("camera", {}).get("motionDetected", False),
            "crowdDensity": p.get("crowdDensity", 0),
            "lastUpdate": self.last_update,
        }

    def get_crs_breakdown(self) -> Dict[str, Any]:
        """Return CRS calculation breakdown."""
        p = self.latest_processed or {}
        return {
            "crs": round(self.latest_crs, 1),
            "level": self.latest_level,
            "breakdown": {
                "deviceDemand": {"value": round(p.get("deviceDemandRatio", 0) * 100, 1), "weight": 0.35},
                "growthRate": {"value": round(p.get("growthRatePct", 0), 1), "weight": 0.25},
                "networkUtil": {"value": round(p.get("networkUtilPct", 0), 1), "weight": 0.30},
                "temporalFactor": {"value": round(p.get("temporalFactorPct", 0), 1), "weight": 0.10},
            },
            "history": self.crs_history[-10:],
        }

    def get_alerts(self) -> List[Dict[str, Any]]:
        """Return current alerts."""
        if not self.latest_alert:
            return []
        return [{
            "id": 1,
            "zone": f"Node {self.node_id}",
            "crs": round(self.latest_crs, 1),
            "severity": self.latest_alert.get("type", "normal"),
            "action": self.latest_alert.get("message", ""),
            "timestamp": self.last_update,
        }]

    def get_dashboard_all(self) -> Dict[str, Any]:
        """Return all dashboard data combined."""
        return {
            "stats": self.get_stats(),
            "sensorHealth": self.get_sensor_health(),
            "liveData": self.get_live_data(),
            "crs": self.get_crs_breakdown(),
            "alerts": self.get_alerts(),
        }

    async def add_ws_client(self, ws):
        self._ws_clients.append(ws)

    async def remove_ws_client(self, ws):
        if ws in self._ws_clients:
            self._ws_clients.remove(ws)

    async def broadcast(self, data: Dict):
        """Broadcast to all connected WebSocket clients."""
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
