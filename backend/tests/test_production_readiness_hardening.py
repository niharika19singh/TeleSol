"""
TeleSol PayPilot & Sentinel — Production Readiness Hardening Test Suite
══════════════════════════════════════════════════════════════════════
Validates production readiness gates:
1. Security Headers (nosniff, DENY, XSS, Referrer-Policy) and X-Request-ID tracking.
2. Liveness (/health/live) and Readiness (/health/ready) probes with DB and ML connectivity.
3. Database backup creation, SHA-256 verification, and PRAGMA integrity audit.
4. Missing Evidence Guard: Empty post_metrics yields INCONCLUSIVE, preventing silent success.
5. Telemetry sanitization against NaN, Infinity, negative values, and out-of-bounds parameters.
6. Admin database backup trigger and listing endpoints (PLATFORM_ADMIN only).
"""

import os
import math
import json
import unittest
from fastapi.testclient import TestClient

from app.main import app
from app.paypilot.db import init_db
from app.paypilot.db_backup import create_backup, verify_backup
from app.services.auth_service import create_access_token
from app.services.crs_calculator import CRSCalculator
from app.services.sensor_processor import SensorProcessor
from app.utils.helpers import safe_float, validate_coordinates, sanitize_telemetry_payload


class TestProductionReadinessHardening(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        init_db()
        from app.paypilot.db import db_session
        from datetime import datetime, timezone
        now_iso = datetime.now(timezone.utc).isoformat()

        with db_session() as conn:
            cursor = conn.cursor()
            cursor.execute(
                """
                INSERT OR REPLACE INTO users (id, username, email, password_hash, salt, full_name, role, is_active, email_verified, workspace_id, org_name, created_at)
                VALUES (?, ?, ?, 'hash', 'salt', ?, ?, 1, 1, 'ws_telesol_default', 'TeleSol Global', ?)
                """,
                ("usr_admin_readiness", "admin_readiness", "admin_readiness@telesol.io", "Admin Readiness", "PLATFORM_ADMIN", now_iso)
            )
            cursor.execute(
                """
                INSERT OR REPLACE INTO users (id, username, email, password_hash, salt, full_name, role, is_active, email_verified, workspace_id, org_name, created_at)
                VALUES (?, ?, ?, 'hash', 'salt', ?, ?, 1, 1, 'ws_telesol_default', 'TeleSol Global', ?)
                """,
                ("usr_op_readiness", "op_readiness", "op_readiness@telesol.io", "Operator Readiness", "NOC_OPERATOR", now_iso)
            )
            conn.commit()

        cls.client = TestClient(app)
        cls.admin_token = create_access_token(
            user_id="usr_admin_readiness",
            username="admin_readiness",
            email="admin_readiness@telesol.io",
            role="PLATFORM_ADMIN"
        )
        cls.operator_token = create_access_token(
            user_id="usr_op_readiness",
            username="op_readiness",
            email="op_readiness@telesol.io",
            role="NOC_OPERATOR"
        )

    def test_01_security_headers_and_correlation_id(self):
        """Verify production security headers and correlation ID tracking on API requests."""
        res = self.client.get("/health")
        self.assertEqual(res.status_code, 200)

        # Correlation ID
        req_id = res.headers.get("x-request-id")
        self.assertIsNotNone(req_id)
        self.assertTrue(req_id.startswith("req_"))

        # Security Headers
        self.assertEqual(res.headers.get("x-content-type-options"), "nosniff")
        self.assertEqual(res.headers.get("x-frame-options"), "DENY")
        self.assertEqual(res.headers.get("x-xss-protection"), "1; mode=block")
        self.assertEqual(res.headers.get("referrer-policy"), "strict-origin-when-cross-origin")

    def test_02_liveness_and_readiness_probes(self):
        """Verify liveness and readiness probe semantics for container orchestration."""
        # Liveness
        live_res = self.client.get("/health/live")
        self.assertEqual(live_res.status_code, 200)
        self.assertEqual(live_res.json()["status"], "alive")

        # Readiness
        ready_res = self.client.get("/health/ready")
        self.assertEqual(ready_res.status_code, 200)
        ready_data = ready_res.json()
        self.assertEqual(ready_data["status"], "ready")
        self.assertEqual(ready_data["database"], "connected")
        self.assertEqual(ready_data["ml_model"], "loaded")

        # Health summary
        health_res = self.client.get("/health")
        self.assertEqual(health_res.status_code, 200)
        health_data = health_res.json()
        self.assertEqual(health_data["status"], "healthy")
        self.assertEqual(health_data["database"]["status"], "online")
        self.assertEqual(health_data["ml_inference"]["status"], "ready")

    def test_03_online_database_backup_and_integrity_verification(self):
        """Verify non-blocking SQLite online backup creation and cryptographic audit."""
        meta = create_backup()
        self.assertIn("backup_path", meta)
        self.assertIn("sha256", meta)
        self.assertEqual(meta["integrity"], "ok")
        self.assertGreater(meta["file_size_bytes"], 0)
        self.assertIn("users", meta["table_counts"])
        self.assertIn("service_agreements", meta["table_counts"])

        # Verification audit
        verif = verify_backup(meta["backup_path"])
        self.assertTrue(verif["valid"])
        self.assertEqual(verif["integrity_check"], "ok")
        self.assertTrue(verif["hash_verified_against_meta"])
        self.assertGreater(verif["tables_found"], 15)

    def test_04_missing_evidence_cannot_silently_succeed(self):
        """Verify that omitting post_metrics in verify-outcome produces INCONCLUSIVE, not success."""
        # Create test agreement
        agr_res = self.client.post("/api/paypilot/agreements", json={
            "task_id": "zone_unverified_task",
            "requesting_agent_id": "agent_buyer_sentinel",
            "provider_id": "prov_skylink_5g",
            "provider_address": "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
            "service_category": "TELECOM_BANDWIDTH",
            "service_description": "Bandwidth mitigation slice",
            "agreed_price": 200.0,
            "asset": "HSK",
            "max_authorized_amount": 250.0,
            "expected_deliverables": "CRS drop >= 20.0",
            "expected_completion_time": "2026-12-31T23:59:59Z",
            "baseline_value": 75.0,
            "target_threshold": 20.0
        })
        self.assertEqual(agr_res.status_code, 200)
        agr_id = agr_res.json()["agreement"]["id"]

        # Attempt verification with empty payload / missing post_metrics
        verify_res = self.client.post(
            f"/api/paypilot/agreements/{agr_id}/verify-outcome",
            json={"post_metrics": {}},
            headers={"Authorization": f"Bearer {self.operator_token}"}
        )
        self.assertEqual(verify_res.status_code, 200)
        data = verify_res.json()

        # Must strictly be INCONCLUSIVE, never VERIFIED_SUCCESS
        self.assertEqual(data["outcome_status"], "INCONCLUSIVE")
        cfe = data.get("counterfactual_evaluation", {})
        self.assertEqual(cfe.get("outcome_classification"), "INCONCLUSIVE")
        self.assertEqual(cfe.get("baseline_type"), "MISSING_EVIDENCE")
        self.assertEqual(cfe.get("confidence_score"), 0.0)

    def test_05_telemetry_nan_inf_and_boundary_sanitization(self):
        """Verify robust telemetry sanitization against NaN, Infinity, and impossible inputs."""
        # 1. safe_float
        self.assertEqual(safe_float(float("nan"), default=10.0), 10.0)
        self.assertEqual(safe_float(float("inf"), default=0.0), 0.0)
        self.assertEqual(safe_float(float("-inf"), default=0.0), 0.0)
        self.assertEqual(safe_float("invalid_str", default=5.0), 5.0)
        self.assertEqual(safe_float(-50.0, default=0.0, min_val=0.0), 0.0)
        self.assertEqual(safe_float(150.0, default=0.0, max_val=100.0), 100.0)

        # 2. validate_coordinates
        self.assertIsNone(validate_coordinates(95.0, 10.0))  # Lat out of range
        self.assertIsNone(validate_coordinates(float("nan"), 10.0))
        valid_coords = validate_coordinates(42.3601, -71.0589)
        self.assertIsNotNone(valid_coords)
        self.assertEqual(valid_coords[0], 42.3601)

        # 3. CRSCalculator with NaN and Inf inputs
        crs_clean = CRSCalculator.calculate(
            device_demand=float("nan"),
            growth_rate=float("inf"),
            network_util=-999.0,
            temporal_factor=float("nan")
        )
        self.assertTrue(math.isfinite(crs_clean))
        self.assertGreaterEqual(crs_clean, 0.0)
        self.assertLessEqual(crs_clean, 100.0)

        # 4. SensorProcessor with malformed payload
        malformed_payload = {
            "sensors": {"camera": {"personCount": "invalid_int"}},
            "computed": {
                "zoneArea": float("nan"),
                "deviceMultiplier": float("inf"),
                "eventBoost": -5.0,
                "capacity": 0.0,
                "growthRate": float("nan"),
                "networkUtil": 999.0
            }
        }
        res = SensorProcessor.process(malformed_payload)
        for k, v in res.items():
            if isinstance(v, (int, float)):
                self.assertTrue(math.isfinite(v), f"Field {k} returned non-finite {v}")

    def test_06_admin_database_backup_endpoints(self):
        """Verify PLATFORM_ADMIN database backup endpoints and ordinary user rejection."""
        # Ordinary user should be rejected with HTTP 403
        unauth_res = self.client.post(
            "/api/admin/database/backup",
            headers={"Authorization": f"Bearer {self.operator_token}"}
        )
        self.assertEqual(unauth_res.status_code, 403)

        # Platform Admin can trigger backup
        auth_res = self.client.post(
            "/api/admin/database/backup",
            headers={"Authorization": f"Bearer {self.admin_token}"}
        )
        self.assertEqual(auth_res.status_code, 200)
        data = auth_res.json()
        self.assertEqual(data["status"], "success")
        self.assertIn("backup", data)
        self.assertEqual(data["backup"]["integrity"], "ok")

        # Platform Admin can list backups
        list_res = self.client.get(
            "/api/admin/database/backups",
            headers={"Authorization": f"Bearer {self.admin_token}"}
        )
        self.assertEqual(list_res.status_code, 200)
        backups = list_res.json()["backups"]
        self.assertGreater(len(backups), 0)


if __name__ == "__main__":
    unittest.main()
