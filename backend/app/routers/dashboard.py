from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query
from typing import Optional
from app.services.data_store import store

router = APIRouter()


@router.get("/api/stats")
async def get_stats(channel: Optional[str] = Query(None)):
    """Aggregate stats for dashboard."""
    return store.get_stats(channel)


@router.get("/api/sensors/health")
async def get_sensor_health(channel: Optional[str] = Query(None)):
    """Sensor health status."""
    return store.get_sensor_health(channel)


@router.get("/api/sensors/live")
async def get_live_data(channel: Optional[str] = Query(None)):
    """Latest raw + processed sensor readings."""
    return store.get_live_data(channel)


@router.get("/api/crs/calculate")
async def get_crs(channel: Optional[str] = Query(None)):
    """Latest CRS score + breakdown."""
    return store.get_crs_breakdown(channel)


@router.get("/api/sensors/detail")
async def get_sensor_detail(channel: Optional[str] = Query(None)):
    """Granular per-sensor data for sensor dashboard cards."""
    return store.get_sensor_detail(channel)


@router.get("/api/alerts")
async def get_alerts(channel: Optional[str] = Query(None)):
    """Current active alerts."""
    return store.get_alerts(channel)


@router.get("/api/dashboard/all")
async def get_dashboard_all(channel: Optional[str] = Query(None)):
    """All dashboard data combined in one call."""
    return store.get_dashboard_all(channel)


@router.get("/api/channels")
async def get_channels():
    """Return summary of real vs sim data channels."""
    return store.get_channel_summary()


@router.get("/api/protocols/status")
async def get_protocol_status():
    """Status of all communication protocols (HTTP, CoAP, WebSocket)."""
    return store.get_protocol_status()


# ── Sentinel Simulation Controls ──

@router.get("/api/sentinel/status")
async def get_sentinel_status():
    """Return multi-zone venue status and simulation state."""
    from app.services.virtual_sentinel import virtual_sentinel
    return virtual_sentinel.get_status()


@router.post("/api/sentinel/control")
async def control_sentinel(payload: dict):
    """Control simulation: action (start/pause/reset), scenario, and speed."""
    from app.services.virtual_sentinel import virtual_sentinel
    action = payload.get("action")
    scenario = payload.get("scenario")
    speed = payload.get("speed")

    if action == "start":
        virtual_sentinel.start()
    elif action == "pause":
        virtual_sentinel.pause()
    elif action == "reset":
        virtual_sentinel.reset()

    if scenario:
        virtual_sentinel.set_scenario(scenario)
    if speed is not None:
        try:
            virtual_sentinel.set_speed(float(speed))
        except ValueError:
            pass

    return {
        "status": "success",
        "sentinel": virtual_sentinel.get_status(),
    }


# ── AI Predictions & Forecast ──

@router.get("/api/ai/forecast")
async def get_ai_forecast():
    """Return AI/ML 5-minute and 15-minute multi-zone congestion forecasts."""
    return store.get_ai_forecast()


# ── TinyFish Web Agent Endpoints ──

@router.get("/api/tinyfish/status")
async def get_tinyfish_status():
    """Return TinyFish configuration status, active investigation, and history."""
    from app.services.tinyfish_service import tinyfish_service
    return tinyfish_service.get_status()


@router.post("/api/tinyfish/investigate")
async def trigger_tinyfish_investigation(payload: dict):
    """Manually or automatically trigger an asynchronous TinyFish web agent investigation."""
    from app.services.tinyfish_service import tinyfish_service
    from app.services.virtual_sentinel import virtual_sentinel
    import asyncio

    zone_id = payload.get("zone_id", "zone-c")
    reason = payload.get("reason", "Manual operator investigation triggered from dashboard")

    # Find matching zone name
    zone_name = "Gate C — VIP Corridor"
    for z in virtual_sentinel.zones:
        if z.get("id") == zone_id:
            zone_name = z.get("name", zone_name).split("—")[0].strip()
            break

    # Dispatch non-blocking background task
    task = asyncio.create_task(
        tinyfish_service.run_investigation(
            zone_id=zone_id,
            zone_name=zone_name,
            reason=reason,
            manual=True,
        )
    )

    return {
        "status": "investigation_started",
        "zone_id": zone_id,
        "zone_name": zone_name,
        "sourceType": "live_tinyfish" if tinyfish_service.is_configured() else "simulated_fallback",
    }


@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """WebSocket for real-time dashboard updates."""
    await websocket.accept()
    await store.add_ws_client(websocket)
    try:
        # Send current state immediately
        await websocket.send_json({
            "type": "initial",
            "data": store.get_dashboard_all(),
        })
        # Keep connection alive
        while True:
            # Wait for any message (ping/pong) from client
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_json({"type": "pong"})
    except WebSocketDisconnect:
        await store.remove_ws_client(websocket)
    except Exception:
        await store.remove_ws_client(websocket)
