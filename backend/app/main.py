import os
import asyncio
import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Load environment variables (.env) before service initialization
try:
    from dotenv import load_dotenv
    load_dotenv()
except Exception:
    pass

from app.routers import sensors, dashboard, paypilot, auth, ml, digital_twin
from app.paypilot.db import init_db, seed_initial_data

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("telesol")

app = FastAPI(
    title="TeleSol Sentinel API",
    version="3.5.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS — Support both production Vercel domains and local development
allowed_origins_env = os.getenv("ALLOWED_ORIGINS", "*")
allowed_origins = [o.strip() for o in allowed_origins_env.split(",") if o.strip()]
if not allowed_origins or "*" in allowed_origins:
    cors_origins = ["*"]
else:
    cors_origins = allowed_origins

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True if cors_origins != ["*"] else False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(sensors.router)
app.include_router(dashboard.router)
app.include_router(paypilot.router)
app.include_router(auth.router)
app.include_router(ml.router)
app.include_router(digital_twin.router)


@app.on_event("startup")
async def startup_event():
    """Launch DB schema initialization, CoAP server and Virtual Sentinel."""
    # ── TeleSol PayPilot Persistent DB & Seed ──
    try:
        init_db()
        seed_initial_data(force=False)
        logger.info("[STARTUP] TeleSol PayPilot SQLite DB initialized")
    except Exception as e:
        logger.error("[STARTUP] PayPilot DB initialization error: %s", str(e))
    # ── CoAP ──
    try:
        from app.services.coap_service import coap_service
        await coap_service.start()
        logger.info("[STARTUP] CoAP service started")
    except Exception as e:
        logger.warning("[STARTUP] CoAP service unavailable: %s", str(e))

    # ── Virtual Sentinel (Hardware-Free Engine) ──
    try:
        from app.services.virtual_sentinel import virtual_sentinel
        virtual_sentinel.start()
        logger.info("[STARTUP] TeleSol Virtual Sentinel started in hardware-free mode")
    except Exception as e:
        logger.warning("[STARTUP] Virtual Sentinel startup error: %s", str(e))


@app.get("/")
async def root():
    from app.services.tinyfish_service import tinyfish_service
    from app.paypilot.hsp_service import hsp_service
    return {
        "name": "TeleSol Sentinel API",
        "subsystem": "TeleSol PayPilot",
        "version": "4.0.0",
        "product": "TeleSol PayPilot — Agent Payments on HSK Chain",
        "track": "Agent Payments & A2A Settlement (HSP)",
        "status": "running",
        "hardware_free_mode": True,
        "protocols": {
            "http": "active",
            "coap": "available",
            "websocket": "active",
        },
        "tinyfish": {
            "configured": tinyfish_service.is_configured(),
            "masked_key": tinyfish_service.get_masked_key(),
        },
        "paypilot": {
            "hsp_gateway_mode": hsp_service.get_status()["mode"],
            "supported_networks": [133, 177],
            "hsk_chain": "HashKey Chain",
        }
    }


@app.get("/health")
@app.get("/api/health")
async def health_check():
    """Production health check endpoint for Render / monitoring."""
    from app.services.tinyfish_service import tinyfish_service
    from app.services.virtual_sentinel import virtual_sentinel
    return {
        "status": "healthy",
        "service": "telesol-sentinel-backend",
        "version": "3.5.0",
        "hardware_free_mode": True,
        "sentinel_running": virtual_sentinel.is_running,
        "tinyfish_configured": tinyfish_service.is_configured(),
    }


if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    uvicorn.run("app.main:app", host="0.0.0.0", port=port, reload=False)

