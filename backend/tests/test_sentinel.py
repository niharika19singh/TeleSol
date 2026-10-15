"""
TeleSol Sentinel Comprehensive Verification Test Suite
══════════════════════════════════════════════════════
Tests:
1. API Contracts & Endpoint schemas
2. Virtual Sentinel Hardware-Free Simulation (All 4 Scenarios)
3. TinyFish Web Agent: Success, Missing Key, Timeout, and Caching
4. Multi-Zone AI/ML Predictions & Anomaly Detection
5. Real-Time WebSocket Streaming & Ping/Pong
6. Preservation of Existing Features (CRS, CoAP status, Dual Channels)
"""

import os
import sys
import unittest
import asyncio
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient

# Ensure backend directory is in path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.main import app
from app.services.virtual_sentinel import virtual_sentinel
from app.services.tinyfish_service import tinyfish_service, TinyFishService
from app.services.ai_predictor import ai_predictor
from app.services.crs_calculator import CRSCalculator
from app.services.sensor_processor import SensorProcessor
from app.services.data_store import store


class TestTeleSolSentinel(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(app)

    def test_01_root_and_protocol_contract(self):
        """Test root endpoint returns hardware_free_mode and protocol status."""
        res = self.client.get("/")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data.get("name"), "TeleSol Sentinel API")
        self.assertTrue(data.get("hardware_free_mode"))
        self.assertIn("protocols", data)
        self.assertEqual(data["protocols"]["http"], "active")
        self.assertIn("tinyfish", data)

    def test_02_sentinel_status_schema(self):
        """Test /api/sentinel/status contract and multi-zone initialisation."""
        res = self.client.get("/api/sentinel/status")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn("isRunning", data)
        self.assertIn("scenario", data)
        self.assertIn("zones", data)
        self.assertEqual(len(data["zones"]), 6)
        
        # Verify 6 specific venue zones exist
        zone_ids = [z["id"] for z in data["zones"]]
        expected_ids = ["zone-a", "zone-b", "zone-c", "zone-d", "zone-e", "zone-f"]
        self.assertEqual(sorted(zone_ids), sorted(expected_ids))

        # Check venue stats
        self.assertIn("venue", data)
        self.assertIn("totalOccupancy", data["venue"])
        self.assertIn("totalCapacity", data["venue"])
        self.assertIn("occupancyPct", data["venue"])

    def test_03_all_four_scenarios(self):
        """Verify dynamic execution and behavior across all 4 scenarios."""
        scenarios = ["normal", "congestion", "sudden_surge", "blocked_exit"]
        
        for sc in scenarios:
            # Control endpoint sets scenario
            res = self.client.post("/api/sentinel/control", json={"action": "start", "scenario": sc, "speed": 2.0})
            self.assertEqual(res.status_code, 200)
            data = res.json()
            self.assertEqual(data["sentinel"]["scenario"], sc)
            
            # Step simulation
            virtual_sentinel._step_zones()
            status = virtual_sentinel.get_status()
            zones = status["zones"]

            if sc == "normal":
                avg_risk = sum(z["riskScore"] for z in zones) / len(zones)
                self.assertLessEqual(avg_risk, 45, "Normal scenario average risk should be safe/moderate")
            elif sc == "congestion":
                avg_density = sum(z["density"] for z in zones) / len(zones)
                self.assertGreaterEqual(avg_density, 3.0, "Congestion scenario should show elevated density")
            elif sc == "sudden_surge":
                peak = max(z["riskScore"] for z in zones)
                self.assertGreaterEqual(peak, 65, "Sudden surge should elevate peak zones into high risk")
            elif sc == "blocked_exit":
                gate_c = next(z for z in zones if z["id"] == "zone-c")
                self.assertGreaterEqual(gate_c["riskScore"], 70, "Blocked exit must cause critical Gate C escalation")

    def test_04_ai_forecast_contract(self):
        """Verify AI/ML forecast endpoint, confidence metrics, and predictions."""
        # Run predictor over current zones
        prediction = ai_predictor.predict(virtual_sentinel.zones)
        self.assertIn("modelName", prediction)
        self.assertIn("CrowdPredict", prediction["modelName"])
        self.assertIn("confidence", prediction)
        self.assertGreaterEqual(prediction["confidence"], 70.0)
        self.assertIn("forecast5min", prediction)
        self.assertEqual(len(prediction["forecast5min"]), 6)
        self.assertIn("forecast15min", prediction)
        self.assertIn("anomalyDetected", prediction)

        # Verify via REST endpoint
        res = self.client.get("/api/ai/forecast")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data.get("modelName"), "CrowdPredict v3.5")

    def test_05_tinyfish_missing_key_behavior(self):
        """Verify graceful fallback and safety when TINYFISH_API_KEY is missing."""
        service = TinyFishService()
        service._api_key = None
        self.assertFalse(service.is_configured())
        self.assertIsNone(service.get_masked_key())

        # Investigation should still complete using high-fidelity simulated fallback
        loop = asyncio.new_event_loop()
        inv = loop.run_until_complete(service.run_investigation("zone-c", "Gate C", "Congestion alert"))
        loop.close()

        self.assertEqual(inv["status"], "completed")
        self.assertEqual(inv["sourceType"], "simulated_fallback")
        self.assertGreaterEqual(len(inv["sources"]), 1)
        self.assertGreaterEqual(len(inv["recommendations"]), 1)
        self.assertIn("Simulated", inv["findings"])

    def test_06_tinyfish_timeout_behavior(self):
        """Verify that network timeout does not crash or block the application."""
        service = TinyFishService()
        service._api_key = "tf_dummy_key_12345678"
        self.assertTrue(service.is_configured())

        # Mock httpx timeout
        import httpx
        with patch("httpx.AsyncClient.get", side_effect=httpx.TimeoutException("Search timeout")):
            loop = asyncio.new_event_loop()
            res = loop.run_until_complete(service.search("test query"))
            self.assertFalse(res["success"])
            self.assertIn("timed out", res["error"])

            # Investigation falls back safely
            inv = loop.run_until_complete(service.run_investigation("zone-a", "Gate A", "Surge spike"))
            loop.close()
            self.assertEqual(inv["status"], "completed")
            self.assertEqual(inv["sourceType"], "simulated_fallback")

    def test_07_tinyfish_success_behavior_mocked(self):
        """Verify live schema parsing when TinyFish Search + Fetch respond successfully."""
        service = TinyFishService()
        service._api_key = "tf_valid_key_abcdef12"

        mock_search_response = MagicMock()
        mock_search_response.status_code = 200
        mock_search_response.json.return_value = {
            "results": [
                {
                    "title": "DMRC Live Alert: Violet Line Crowding",
                    "url": "https://delhimetrorail.com/alerts/violet-live",
                    "snippet": "Platform overcrowding at Govindpuri Station near Okhla.",
                }
            ]
        }

        mock_fetch_response = MagicMock()
        mock_fetch_response.status_code = 200
        mock_fetch_response.json.return_value = {
            "results": [
                {
                    "url": "https://delhimetrorail.com/alerts/violet-live",
                    "content": "# Live Advisory\nPassengers advised to avoid Govindpuri turnstiles.",
                }
            ]
        }

        with patch("httpx.AsyncClient.get", return_value=mock_search_response), \
             patch("httpx.AsyncClient.post", return_value=mock_fetch_response):
            loop = asyncio.new_event_loop()
            inv = loop.run_until_complete(service.run_investigation("zone-c", "Gate C", "Critical surge"))
            loop.close()

            self.assertEqual(inv["status"], "completed")
            self.assertEqual(inv["sourceType"], "live_tinyfish")
            self.assertEqual(len(inv["sources"]), 1)
            self.assertEqual(inv["sources"][0]["url"], "https://delhimetrorail.com/alerts/violet-live")
            self.assertIn("Live web search located", inv["findings"])

    def test_08_api_key_security(self):
        """Verify raw API key is NEVER leaked via status endpoints."""
        with patch.dict(os.environ, {"TINYFISH_API_KEY": "tf_live_secretkey_9988776655"}):
            tinyfish_service.reload_key()
            status = tinyfish_service.get_status()
            self.assertTrue(status["configured"])
            self.assertNotEqual(status["maskedKey"], "tf_live_secretkey_9988776655")
            self.assertTrue(status["maskedKey"].startswith("tf_l"))
            self.assertTrue(status["maskedKey"].endswith("6655"))

            # Check via REST endpoint
            res = self.client.get("/api/tinyfish/status")
            self.assertEqual(res.status_code, 200)
            data = res.json()
            self.assertNotIn("secretkey", str(data))

    def test_09_websocket_live_stream_and_ping(self):
        """Verify WebSocket accepts connection, sends initial state, and answers ping."""
        with self.client.websocket_connect("/ws") as ws:
            initial = ws.receive_json()
            self.assertEqual(initial["type"], "initial")
            data = initial["data"]
            self.assertIn("sentinel", data)
            self.assertIn("aiForecast", data)
            self.assertIn("tinyfish", data)
            self.assertIn("liveData", data)

            ws.send_text("ping")
            pong = ws.receive_json()
            self.assertEqual(pong.get("type"), "pong")

    def test_10_preservation_of_existing_features(self):
        """Confirm existing CRS formula, CoAP status, and dual-channel logic are intact."""
        # CRS formula test
        crs = CRSCalculator.calculate(device_demand=100.0, growth_rate=50.0, network_util=80.0, temporal_factor=20.0)
        # Expected: 0.35*100 + 0.25*50 + 0.30*80 + 0.10*20 = 35 + 12.5 + 24 + 2 = 73.5
        self.assertAlmostEqual(crs, 73.5, places=1)
        self.assertEqual(CRSCalculator.get_level(crs), "high")

        # Ingestion endpoint preserves existing schema
        test_payload = {
            "node_id": "TEST-NODE-001",
            "timestamp": 1700000000000,
            "sensors": {
                "radar": {"humanDetected": True, "distance_cm": 150, "movementState": 1, "energyLevel": 60},
                "tof": {"distance_mm": 450, "valid": True, "rangeStatus": 0},
                "audio": {"noiseLevel_dB": 55.0, "peakAmplitude": 0.3, "isCrowdNoise": False},
                "imu": {
                    "accelX": 0.05, "accelY": -0.02, "accelZ": 9.81,
                    "gyroX": 0.0, "gyroY": 0.0, "gyroZ": 0.0,
                    "temperature": 27.5, "vibrationMagnitude": 1.2
                },
                "camera": {"personCount": 2, "frameTimestamp": 1700000000000, "motionDetected": True}
            },
            "computed": {
                "estimatedHumans": 2, "zoneArea": 20.0, "capacity": 100.0,
                "growthRate": 0.2, "networkUtil": 45.0, "deviceMultiplier": 2.0, "eventBoost": 0.0
            }
        }
        res = self.client.post("/api/sensors/data", json=test_payload)
        self.assertEqual(res.status_code, 200)
        ingest_data = res.json()
        self.assertEqual(ingest_data.get("status"), "received")
        self.assertIn("crs", ingest_data)
        self.assertIn("level", ingest_data)

        # Protocol status still includes CoAP
        proto_res = self.client.get("/api/protocols/status")
        self.assertEqual(proto_res.status_code, 200)
        proto_data = proto_res.json()
        self.assertIn("coap", proto_data)
        self.assertIn("http", proto_data)
        self.assertIn("websocket", proto_data)


if __name__ == "__main__":
    unittest.main()
