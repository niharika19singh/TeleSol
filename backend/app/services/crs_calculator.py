from typing import Dict, Any
from app.utils.helpers import safe_float


class CRSCalculator:
    @staticmethod
    def calculate(device_demand: float, growth_rate: float, network_util: float, temporal_factor: float) -> float:
        # Sanitize all inputs against NaN, Infinity, and negative values
        dd = safe_float(device_demand, default=0.0, min_val=0.0)
        gr = safe_float(growth_rate, default=0.0, min_val=0.0, max_val=100.0)
        nu = safe_float(network_util, default=50.0, min_val=0.0, max_val=100.0)
        tf = safe_float(temporal_factor, default=20.0, min_val=0.0, max_val=100.0)

        # Weights
        alpha = 0.35
        beta = 0.25
        gamma = 0.30
        delta = 0.10
        # CRS formula
        crs = (
            alpha * dd +
            beta * gr +
            gamma * nu +
            delta * tf
        )
        return round(min(max(crs, 0.0), 100.0), 2)

    @staticmethod
    def get_level(crs: float) -> str:
        clean_crs = safe_float(crs, default=0.0, min_val=0.0, max_val=100.0)
        if clean_crs <= 40:
            return "normal"
        elif clean_crs <= 60:
            return "elevated"
        elif clean_crs <= 80:
            return "high"
        else:
            return "critical"
