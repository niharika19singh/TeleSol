from typing import Dict, Any

class CRSCalculator:
    @staticmethod
    def calculate(device_demand: float, growth_rate: float, network_util: float, temporal_factor: float) -> float:
        # Weights
        alpha = 0.35
        beta = 0.25
        gamma = 0.30
        delta = 0.10
        # CRS formula
        crs = (
            alpha * device_demand +
            beta * growth_rate +
            gamma * network_util +
            delta * temporal_factor
        )
        return min(max(crs, 0), 100)

    @staticmethod
    def get_level(crs: float) -> str:
        if crs <= 40:
            return "normal"
        elif crs <= 60:
            return "elevated"
        elif crs <= 80:
            return "high"
        else:
            return "critical"
