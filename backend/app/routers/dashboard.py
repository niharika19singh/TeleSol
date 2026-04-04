from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from app.services.data_store import store

router = APIRouter()


@router.get("/api/stats")
async def get_stats():
    """Aggregate stats for dashboard."""
    return store.get_stats()


@router.get("/api/sensors/health")
async def get_sensor_health():
    """Sensor health status."""
    return store.get_sensor_health()


@router.get("/api/sensors/live")
async def get_live_data():
    """Latest raw + processed sensor readings."""
    return store.get_live_data()


@router.get("/api/crs/calculate")
async def get_crs():
    """Latest CRS score + breakdown."""
    return store.get_crs_breakdown()


@router.get("/api/alerts")
async def get_alerts():
    """Current active alerts."""
    return store.get_alerts()


@router.get("/api/dashboard/all")
async def get_dashboard_all():
    """All dashboard data combined in one call."""
    return store.get_dashboard_all()


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
