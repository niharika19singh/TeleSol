# TeleSol Backend API

## Overview
FastAPI backend for sensor data ingestion, CRS calculation, alert generation, and real-time dashboard updates.

### Endpoints
- POST /api/sensors/data: Sensor data ingestion
- GET /api/stats: Overall statistics
- GET /api/towers: All tower/zone data
- GET /api/alerts: Active alerts
- GET /api/sensors/health: Sensor status
- GET /api/sensors/live: Live sensor readings
- GET /api/crs/calculate: Calculate CRS
- GET /api/dashboard/all: All data in one call
- WebSocket: /ws, /ws/sensors

### Structure
- app/main.py: FastAPI entry point
- app/routers/: API endpoints
- app/services/: Business logic
- app/models/: Pydantic schemas
- app/utils/: Helper functions

### Requirements
See requirements.txt

### Run
```bash
uvicorn app.main:app --reload
```
