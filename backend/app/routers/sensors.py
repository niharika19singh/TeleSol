from fastapi import APIRouter, Request, HTTPException
from typing import Any, Dict
from app.models.schemas import SensorPayload
from app.services.sensor_processor import SensorProcessor
from app.services.crs_calculator import CRSCalculator
from app.services.alert_engine import AlertEngine
from app.services.data_store import store
from app.utils.helpers import build_response
from datetime import datetime, timezone
import asyncio

router = APIRouter()


@router.post("/api/sensors/data")
async def ingest_sensor_data(payload: SensorPayload, request: Request):
    """Endpoint to ingest sensor payloads, process them, calculate CRS, and return status."""
    try:
        raw = payload.dict()
        processed = SensorProcessor.process(raw)

        # Prepare percentage inputs for CRS calculator
        device_pct = float(processed.get("deviceDemandRatio", 0.0)) * 100.0
        growth_pct = float(processed.get("growthRatePct", 0.0))
        network_pct = float(processed.get("networkUtilPct", 0.0))
        temporal_pct = float(processed.get("temporalFactorPct", 0.0))

        crs = CRSCalculator.calculate(device_pct, growth_pct, network_pct, temporal_pct)
        level = CRSCalculator.get_level(crs)

        alert = AlertEngine.check_alert(crs)

        timestamp_iso = datetime.now(timezone.utc).isoformat()

        # Store in memory for dashboard
        store.update(raw, processed, crs, level, alert, payload.node_id)

        # Broadcast to WebSocket clients
        try:
            asyncio.create_task(store.broadcast({
                "type": "sensor_update",
                "data": store.get_dashboard_all(),
            }))
        except Exception:
            pass

        response = build_response("received", crs, level, timestamp_iso)
        # include processed metrics for dashboard/debugging
        response["processed"] = processed
        response["alert"] = alert
        response["node_id"] = payload.node_id

        return response

    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
