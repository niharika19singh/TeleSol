from typing import Dict, Any
from datetime import datetime

ZONE_AREA_DEFAULT = 20.0  # m^2
DEVICE_MULTIPLIER_DEFAULT = 2.0  # devices per person
CAPACITY_DEFAULT = 100.0  # devices capacity for a zone


class SensorProcessor:
    @staticmethod
    def process(payload: Dict[str, Any]) -> Dict[str, Any]:
        """Process raw sensor payload and return estimations and metrics.

        Returns a dict containing at least:
        - estimatedHumans (int)
        - crowdDensity (float, persons per m^2)
        - deviceDemand (float)
        - deviceDemandRatio (float, D/C as ratio 0..inf)
        - growthRatePct (0..100)
        - networkUtilPct (0..100)
        - temporalFactorPct (0..100)
        """
        sensors = payload.get("sensors", {})
        computed = payload.get("computed", {})

        # 1) Estimate humans
        estimated = 0
        # Prefer camera count when available
        cam = sensors.get("camera")
        if isinstance(cam, dict) and cam.get("personCount") is not None:
            try:
                estimated = int(cam.get("personCount", 0))
            except Exception:
                estimated = 0

        # Fallback to radar heuristics
        if estimated == 0 and isinstance(sensors.get("radar"), dict):
            r = sensors.get("radar", {})
            if r.get("humanDetected"):
                # Use energyLevel as a rough proxy
                try:
                    energy = float(r.get("energyLevel", 0))
                except Exception:
                    energy = 0.0
                # Rough heuristic: energy 0-100 -> 0-4 people
                estimated = max(1, int(round(energy / 25.0)))

        # As an additional fallback use computed.estimatedHumans
        if estimated == 0:
            try:
                estimated = int(computed.get("estimatedHumans", 0))
            except Exception:
                estimated = 0

        # Clamp
        estimated = max(0, estimated)

        # 2) Crowd density
        try:
            zone_area = float(computed.get("zoneArea", ZONE_AREA_DEFAULT))
        except Exception:
            zone_area = ZONE_AREA_DEFAULT
        if zone_area <= 0:
            zone_area = ZONE_AREA_DEFAULT
        crowd_density = estimated / zone_area

        # 3) Device demand D = rho * A * mu * (1 + sigma)
        try:
            mu = float(computed.get("deviceMultiplier", DEVICE_MULTIPLIER_DEFAULT))
        except Exception:
            mu = DEVICE_MULTIPLIER_DEFAULT
        try:
            sigma = float(computed.get("eventBoost", 0.0))
        except Exception:
            sigma = 0.0
        device_demand = crowd_density * zone_area * mu * (1.0 + sigma)

        # 4) Capacity C (from computed or default)
        try:
            capacity = float(computed.get("capacity", CAPACITY_DEFAULT))
        except Exception:
            capacity = CAPACITY_DEFAULT
        if capacity <= 0:
            capacity = CAPACITY_DEFAULT

        device_demand_ratio = device_demand / capacity

        # 5) Growth rate - try to read from computed otherwise default 0
        try:
            growth_rate = float(computed.get("growthRate", 0.0))
        except Exception:
            growth_rate = 0.0
        # Expect growth_rate in 0..1 or 0..100; normalize to 0..100
        if growth_rate <= 1.5:
            growth_rate_pct = growth_rate * 100.0
        else:
            growth_rate_pct = min(max(growth_rate, 0.0), 100.0)

        # 6) Network utilization from computed (0..100)
        try:
            network_util = float(computed.get("networkUtil", 50.0))
        except Exception:
            network_util = 50.0
        network_util = min(max(network_util, 0.0), 100.0)

        # 7) Temporal factor: higher during peak hours (18-23)
        ts = payload.get("timestamp")
        if isinstance(ts, (int, float)):
            try:
                # assume epoch milliseconds
                dt = datetime.utcfromtimestamp(ts / 1000.0)
            except Exception:
                dt = datetime.utcnow()
        else:
            dt = datetime.utcnow()
        hour = dt.hour
        if 18 <= hour <= 23:
            temporal_factor = 80.0
        elif 8 <= hour <= 10:
            temporal_factor = 60.0
        else:
            temporal_factor = 20.0

        return {
            "estimatedHumans": estimated,
            "crowdDensity": round(crowd_density, 4),
            "deviceDemand": round(device_demand, 2),
            "deviceDemandRatio": round(device_demand_ratio, 4),
            "growthRatePct": round(growth_rate_pct, 2),
            "networkUtilPct": round(network_util, 2),
            "temporalFactorPct": round(temporal_factor, 2),
            "zoneArea": zone_area,
        }
