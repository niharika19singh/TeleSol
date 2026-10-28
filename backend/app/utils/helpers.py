import math
from typing import Any, Optional, Dict


def safe_float(
    val: Any,
    default: float = 0.0,
    min_val: Optional[float] = None,
    max_val: Optional[float] = None
) -> float:
    """
    Safely convert an untrusted input to a bounded finite float.
    Replaces NaN, Infinity, and invalid types with default.
    """
    try:
        f = float(val)
        if math.isnan(f) or math.isinf(f):
            f = default
    except (ValueError, TypeError):
        f = default

    if min_val is not None:
        f = max(min_val, f)
    if max_val is not None:
        f = min(max_val, f)
    return f


def validate_coordinates(lat: Any, lon: Any) -> Optional[tuple[float, float]]:
    """Validate latitude (-90 to 90) and longitude (-180 to 180). Returns None if invalid."""
    try:
        lat_f = float(lat)
        lon_f = float(lon)
        if math.isnan(lat_f) or math.isinf(lat_f) or math.isnan(lon_f) or math.isinf(lon_f):
            return None
        if -90.0 <= lat_f <= 90.0 and -180.0 <= lon_f <= 180.0:
            return lat_f, lon_f
    except (ValueError, TypeError):
        pass
    return None


def sanitize_telemetry_payload(data: Dict[str, Any]) -> Dict[str, Any]:
    """Ensure all telemetry numbers are valid JSON-compliant numbers without NaN or Inf."""
    sanitized = {}
    for k, v in data.items():
        if isinstance(v, dict):
            sanitized[k] = sanitize_telemetry_payload(v)
        elif isinstance(v, float):
            sanitized[k] = safe_float(v)
        elif isinstance(v, (int, str, bool)) or v is None:
            sanitized[k] = v
        elif isinstance(v, list):
            sanitized[k] = [safe_float(item) if isinstance(item, float) else item for item in v]
        else:
            sanitized[k] = v
    return sanitized


def build_response(status: str, crs: float, level: str, timestamp: str):
    return {
        "status": status,
        "crs": safe_float(crs, 0.0, 0.0, 100.0),
        "level": level,
        "timestamp": timestamp
    }
