import os
import uuid
import asyncio
import logging
from fastapi import FastAPI, Request, status
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware

# Load environment variables (.env) before service initialization
try:
    from dotenv import load_dotenv
    load_dotenv()
except Exception:
    pass

from app.routers import sensors, dashboard, paypilot, auth, ml, digital_twin, admin
from app.paypilot.db import init_db, seed_initial_data, validate_db_target
from app.services.email_service import EmailService

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

@app.middleware("http")
async def security_headers_and_correlation_id_middleware(request: Request, call_next):
    """
    Production security headers & request correlation ID tracking.
    Enforces MIME sniffing protection, clickjacking defense, and modern transport safety.
    """
    request_id = request.headers.get("x-request-id") or f"req_{uuid.uuid4().hex[:12]}"
    response = await call_next(request)
    response.headers["X-Request-ID"] = request_id
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    if os.getenv("ENVIRONMENT") == "production":
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    return response

app.include_router(sensors.router)
app.include_router(dashboard.router)
app.include_router(paypilot.router)
app.include_router(auth.router)
app.include_router(ml.router)
app.include_router(digital_twin.router)
app.include_router(admin.router)


@app.on_event("startup")
async def startup_event():
    """Launch DB schema initialization, CoAP server and Virtual Sentinel."""
    # ── Database Validation & Initialization ──
    try:
        db_target_info = validate_db_target()
        logger.info(
            "[STARTUP] Persistent DB path verified: %s (exists=%s, strict_persistence=%s)",
            db_target_info["path"], db_target_info["exists"], db_target_info["strict_persistence"]
        )
        init_db()
        seed_initial_data(force=False)
        logger.info("[STARTUP] TeleSol PayPilot SQLite DB initialized")
    except Exception as e:
        logger.error("[STARTUP] PayPilot DB initialization error: %s", str(e))
        if os.getenv("REQUIRE_EXISTING_DB", "").lower() in ("true", "1", "yes") or \
           os.getenv("STRICT_PERSISTENCE", "").lower() in ("true", "1", "yes"):
            raise

    # ── Transactional Email Configuration Check ──
    try:
        email_status = EmailService.validate_configuration()
        logger.info(
            "[STARTUP] Email Service active_provider=%s, is_production=%s, from=%s",
            email_status["active_provider"], email_status["is_production"], email_status["from_address"]
        )
    except Exception as e:
        logger.warning("[STARTUP] Email configuration inspection failed: %s", str(e))

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


@app.get("/health/live")
async def liveness_probe():
    """Liveness probe: returns 200 OK if service process is alive."""
    return {"status": "alive", "service": "telesol-sentinel-backend"}


@app.get("/health/ready")
async def readiness_probe():
    """Readiness probe: validates database connectivity and core subsystems."""
    from app.paypilot.db import db_session
    from app.ml.inference import load_model

    db_ready = False
    try:
        with db_session() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT 1")
            db_ready = bool(cursor.fetchone())
    except Exception as e:
        logger.error("[READINESS] DB check failed: %s", str(e))

    model_ready = load_model() is not None

    all_ready = db_ready
    status_code = status.HTTP_200_OK if all_ready else status.HTTP_503_SERVICE_UNAVAILABLE
    return JSONResponse(
        status_code=status_code,
        content={
            "status": "ready" if all_ready else "degraded",
            "database": "connected" if db_ready else "error",
            "ml_model": "loaded" if model_ready else "fallback_mode",
        }
    )


@app.get("/health")
@app.get("/api/health")
async def health_check():
    """Production health check endpoint for Render / monitoring."""
    from app.services.tinyfish_service import tinyfish_service
    from app.services.virtual_sentinel import virtual_sentinel
    from app.paypilot.hsp_service import hsp_service
    from app.paypilot.db import db_session
    from app.ml.inference import load_model

    db_ok = False
    try:
        with db_session() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT 1")
            db_ok = True
    except Exception:
        db_ok = False

    model_bundle = load_model()

    return {
        "status": "healthy" if db_ok else "degraded",
        "service": "telesol-sentinel-backend",
        "version": "3.5.0",
        "hardware_free_mode": True,
        "database": {"status": "online" if db_ok else "offline"},
        "ml_inference": {
            "status": "ready" if model_bundle else "offline",
            "model_version": model_bundle.get("model_version") if model_bundle else None
        },
        "sentinel_running": virtual_sentinel.is_running,
        "tinyfish_configured": tinyfish_service.is_configured(),
        "hsp_gateway_mode": hsp_service.get_status()["mode"],
    }


if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    uvicorn.run("app.main:app", host="0.0.0.0", port=port, reload=False)

