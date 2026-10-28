"""
Unit & Integration Tests for Outcome-Driven Procurement (Workstream 3)
"""

import unittest
import secrets
from fastapi.testclient import TestClient
from app.main import app
from app.paypilot.db import init_db


class TestOutcomeDrivenProcurement(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        init_db()
        cls.client = TestClient(app)

    def test_01_create_agreement_and_verify_success_outcome(self):
        """Test creating a service agreement and verifying a successful outcome."""
        task_id = f"task_outcome_{secrets.token_hex(4)}"
        # 1. Create structured agreement with explicit baseline and SLA criteria
        agr_res = self.client.post("/api/paypilot/agreements", json={
            "task_id": task_id,
            "requesting_agent_id": "agent_buyer_sentinel",
            "provider_id": "prov_skylink_5g",
            "provider_address": "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
            "service_category": "TELECOM_BANDWIDTH",
            "service_description": "Dedicated 5G Ultra-Low Latency Slice for Gate C congestion relief",
            "agreed_price": 12.5,
            "asset": "HSK",
            "max_authorized_amount": 15.0,
            "expected_deliverables": "Sustained >100 Mbps uplink, packet loss < 0.5%",
            "expected_completion_time": "2026-10-31T18:00:00Z",
            "evidence_required": "TELEMETRY_STREAM",
            "baseline_value": 75.0,
            "target_threshold": 20.0
        })
        self.assertEqual(agr_res.status_code, 200)
        agr = agr_res.json()["agreement"]
        agreement_id = agr["agreement_id"]

        # 2. Verify outcome with successful telemetry (significant CRS reduction from 75 to 18)
        verify_res = self.client.post(
            f"/api/paypilot/agreements/{agreement_id}/verify-outcome",
            json={
                "post_metrics": {
                    "crs_score": 18.0,
                    "density": 2.1,
                    "flow_instability": 8.0,
                    "latency_ms": 19.5,
                    "packet_loss_pct": 0.05
                }
            }
        )
        self.assertEqual(verify_res.status_code, 200)
        ver_data = verify_res.json()
        self.assertEqual(ver_data["outcome_status"], "VERIFIED_SUCCESS")
        self.assertEqual(ver_data["counterfactual_evaluation"]["outcome_classification"], "SUCCESSFUL")
        self.assertIsNone(ver_data.get("recovery_plan"))

    def test_02_verify_failure_outcome_triggers_recovery(self):
        """Test that a failed mitigation triggers an automatic bounded self-healing recovery plan."""
        task_id = f"task_fail_{secrets.token_hex(4)}"
        agr_res = self.client.post("/api/paypilot/agreements", json={
            "task_id": task_id,
            "requesting_agent_id": "agent_buyer_sentinel",
            "provider_id": "prov_skylink_5g",
            "provider_address": "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
            "service_category": "TELECOM_BANDWIDTH",
            "service_description": "Secondary slice allocation",
            "agreed_price": 10.0,
            "asset": "HSK",
            "max_authorized_amount": 12.0,
            "expected_deliverables": "Bandwidth mitigation",
            "expected_completion_time": "2026-10-31T18:00:00Z",
            "baseline_value": 70.0,
            "target_threshold": 25.0
        })
        agr = agr_res.json()["agreement"]
        agreement_id = agr["agreement_id"]

        # Verify outcome with failing metrics (congestion stayed high at 78.5)
        verify_res = self.client.post(
            f"/api/paypilot/agreements/{agreement_id}/verify-outcome",
            json={
                "post_metrics": {
                    "crs_score": 78.5,
                    "density": 6.8,
                    "flow_instability": 48.0,
                    "latency_ms": 110.0,
                    "packet_loss_pct": 5.4
                }
            }
        )
        self.assertEqual(verify_res.status_code, 200)
        ver_data = verify_res.json()
        self.assertEqual(ver_data["outcome_status"], "VERIFIED_FAILURE")
        self.assertEqual(ver_data["counterfactual_evaluation"]["outcome_classification"], "FAILED")
        
        # Must produce bounded self-healing recovery plan
        self.assertIsNotNone(ver_data.get("recovery_plan"))
        rec = ver_data["recovery_plan"]
        self.assertIn("recovery_id", rec)
        self.assertIn("action_type", rec)
        self.assertIn("recommended_provider_id", rec)

    def test_03_provider_reliability_profile(self):
        """Test retrieving historical SLA compliance and reliability tier for a provider."""
        res = self.client.get("/api/paypilot/providers/prov_skylink_5g/reliability")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["status"], "success")
        self.assertEqual(data["provider_id"], "prov_skylink_5g")
        self.assertIn("sla_compliance_percent", data)
        self.assertIn("reliability_tier", data)
        self.assertIn("metrics", data)
        self.assertGreaterEqual(data["sla_compliance_percent"], 0.0)

    def test_04_direct_incident_recovery_generation(self):
        """Test explicit incident recovery trigger endpoint with a known agreement."""
        task_id = f"task_rec_{secrets.token_hex(4)}"
        agr_res = self.client.post("/api/paypilot/agreements", json={
            "task_id": task_id,
            "requesting_agent_id": "agent_buyer_sentinel",
            "provider_id": "prov_skylink_5g",
            "provider_address": "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
            "service_category": "TELECOM_BANDWIDTH",
            "service_description": "Slice allocation for recovery test",
            "agreed_price": 10.0,
            "asset": "HSK",
            "max_authorized_amount": 12.0,
            "expected_deliverables": "Bandwidth mitigation",
            "expected_completion_time": "2026-10-31T18:00:00Z"
        })
        agr_id = agr_res.json()["agreement"]["agreement_id"]

        incident_id = f"inc_{secrets.token_hex(4)}"
        res = self.client.post(
            f"/api/paypilot/incidents/{incident_id}/recovery",
            json={"failed_agreement_id": agr_id}
        )
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["status"], "success")
        self.assertIn("recovery_plan", data)
        self.assertIn("recovery_id", data["recovery_plan"])


if __name__ == "__main__":
    unittest.main()
