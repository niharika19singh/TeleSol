"""
CoAP Service — TeleSol Lightweight Edge Protocol
UDP-based CoAP server for constrained devices.
Accepts sensor data via PUT, serves CRS via GET.
"""

import json
import asyncio
import logging
from datetime import datetime, timezone

import aiocoap
import aiocoap.resource as resource

from app.services.sensor_processor import SensorProcessor
from app.services.crs_calculator import CRSCalculator
from app.services.alert_engine import AlertEngine
from app.services.data_store import store

logger = logging.getLogger("telesol.coap")

COAP_PORT = 5683


class SensorResource(resource.Resource):
    """CoAP resource: coap://host:5683/sensors
    
    PUT — Accept sensor payload from edge devices (same format as HTTP POST).
    GET — Return latest sensor summary.
    """

    async def render_put(self, request):
        """Process incoming sensor data from a CoAP client."""
        try:
            payload_str = request.payload.decode("utf-8")
            payload = json.loads(payload_str)

            # Process through existing pipeline
            processed = SensorProcessor.process(payload)

            device_pct = float(processed.get("deviceDemandRatio", 0.0)) * 100.0
            growth_pct = float(processed.get("growthRatePct", 0.0))
            network_pct = float(processed.get("networkUtilPct", 0.0))
            temporal_pct = float(processed.get("temporalFactorPct", 0.0))

            crs = CRSCalculator.calculate(device_pct, growth_pct, network_pct, temporal_pct)
            level = CRSCalculator.get_level(crs)
            alert = AlertEngine.check_alert(crs)

            node_id = payload.get("node_id", "coap-node")
            store.update(payload, processed, crs, level, alert, node_id)

            # Update CoAP stats
            store.coap_stats["requests_handled"] += 1
            store.coap_stats["last_request_time"] = datetime.now(timezone.utc).isoformat()

            # Broadcast to WebSocket clients
            try:
                asyncio.create_task(
                    store.broadcast({"type": "sensor_update", "data": store.get_dashboard_all()})
                )
            except Exception:
                pass

            logger.info("[CoAP] PUT /sensors — CRS=%.1f [%s] from %s", crs, level, node_id)

            response = json.dumps({
                "status": "received",
                "crs": round(crs, 1),
                "level": level,
                "source": "coap",
            })
            return aiocoap.Message(
                code=aiocoap.CHANGED,
                payload=response.encode("utf-8"),
            )

        except json.JSONDecodeError:
            logger.warning("[CoAP] Invalid JSON in PUT /sensors")
            return aiocoap.Message(
                code=aiocoap.BAD_REQUEST,
                payload=b'{"error":"invalid JSON"}',
            )
        except Exception as e:
            logger.error("[CoAP] Processing error: %s", str(e))
            return aiocoap.Message(
                code=aiocoap.INTERNAL_SERVER_ERROR,
                payload=json.dumps({"error": str(e)}).encode("utf-8"),
            )

    async def render_get(self, request):
        """Return latest sensor summary."""
        data = store.get_sensor_detail()
        return aiocoap.Message(
            code=aiocoap.CONTENT,
            payload=json.dumps(data).encode("utf-8"),
        )


class CRSResource(resource.Resource):
    """CoAP resource: coap://host:5683/crs
    
    GET — Return latest CRS score and breakdown.
    """

    async def render_get(self, request):
        data = store.get_crs_breakdown()
        return aiocoap.Message(
            code=aiocoap.CONTENT,
            payload=json.dumps(data).encode("utf-8"),
        )


class StatusResource(resource.Resource):
    """CoAP resource: coap://host:5683/status
    
    GET — Node health check / protocol status.
    """

    async def render_get(self, request):
        data = {
            "service": "TeleSol CoAP",
            "status": "active",
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "requests_handled": store.coap_stats.get("requests_handled", 0),
        }
        return aiocoap.Message(
            code=aiocoap.CONTENT,
            payload=json.dumps(data).encode("utf-8"),
        )


class CoAPService:
    """Manages the CoAP server lifecycle."""

    def __init__(self):
        self.context = None
        self.active = False

    async def start(self):
        """Start the CoAP server on port 5683."""
        root = resource.Site()
        root.add_resource(["sensors"], SensorResource())
        root.add_resource(["crs"], CRSResource())
        root.add_resource(["status"], StatusResource())

        try:
            self.context = await aiocoap.Context.create_server_context(root, bind=("127.0.0.1", COAP_PORT))
            self.active = True
            store.coap_stats["active"] = True
            store.coap_stats["port"] = COAP_PORT
            logger.info("[CoAP] Server started on udp://0.0.0.0:%d", COAP_PORT)
            logger.info("[CoAP] Resources: /sensors (PUT/GET), /crs (GET), /status (GET)")
        except OSError as e:
            self.active = False
            store.coap_stats["active"] = False
            store.coap_stats["error"] = str(e)
            logger.warning("[CoAP] Could not start: %s (port %d may be in use)", str(e), COAP_PORT)
        except Exception as e:
            self.active = False
            store.coap_stats["active"] = False
            logger.warning("[CoAP] Start error: %s", str(e))

    def get_status(self) -> dict:
        return {
            "active": self.active,
            "port": COAP_PORT,
            "resources": ["/sensors", "/crs", "/status"],
            "requestsHandled": store.coap_stats.get("requests_handled", 0),
            "lastRequestTime": store.coap_stats.get("last_request_time"),
        }


# ── Singleton ──
coap_service = CoAPService()
