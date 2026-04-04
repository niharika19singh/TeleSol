def build_response(status: str, crs: float, level: str, timestamp: str):
    return {
        "status": status,
        "crs": crs,
        "level": level,
        "timestamp": timestamp
    }
