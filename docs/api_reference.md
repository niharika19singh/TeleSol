# TeleSol API Reference

## Sensor Data Ingestion
POST /api/sensors/data
- Request: Combined sensor payload (see schemas.py)
- Response: { status, crs, level, timestamp }

## Dashboard Endpoints
GET /api/stats
GET /api/towers
GET /api/alerts
GET /api/sensors/health
GET /api/sensors/live
GET /api/crs/calculate
GET /api/dashboard/all

## WebSocket
WS /ws
WS /ws/sensors

See backend/app/routers/ for implementation details.
