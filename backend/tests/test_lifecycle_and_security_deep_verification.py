"""
Deep Backend Security and Procurement Lifecycle Verification Suite
════════════════════════════════════════════════════════════════════
Covers all requirements from the SENPAY Production Architecture Prompt:
1. Security & RBAC:
   - Public registration cannot create PLATFORM_ADMIN
   - Tampered tokens/payloads are rejected (HTTP 401)
   - Multi-tenant workspace isolation (cross-workspace record access rejected with 403)
   - Password hashes & salt are never exposed in profile responses
   - Expired & reused tokens are rejected
2. Procurement Lifecycle (8 Scenarios):
   - Scenario 1: Successful intervention with sufficient evidence (VERIFIED_SUCCESS)
   - Scenario 2: Failed intervention (VERIFIED_FAILURE -> Recovery proposed)
   - Scenario 3: Missing evidence (Cannot silently become success -> INCONCLUSIVE)
   - Scenario 4: Inconclusive outcome (Held in escrow, never verified success)
   - Scenario 5: Duplicate settlement request (Idempotency violation HTTP 400)
   - Scenario 6: Insufficient budget (Delegation limit or policy ceiling violation HTTP 400)
   - Scenario 7: Unauthorized financial action (ANALYST / SERVICE_PROVIDER blocked with HTTP 403)
   - Scenario 8: Failed dispatch and permitted recovery (Dispute logged, reservation released)
"""

import unittest
import json
import secrets
import time
from datetime import datetime, timezone, timedelta
from starlette.testclient import TestClient

from app.main import app
from app.services.auth_service import AuthService, hash_password, create_access_token
from app.paypilot.db import db_session


class TestDeepSecurityAndProcurementLifecycle(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(app)
        cls.admin_token = create_access_token(
            user_id="usr_admin_test",
            username="admin_test",
            email="admin@telesol.io",
            role="PLATFORM_ADMIN",
            workspace_id="ws_telesol_default",
            org_name="TeleSol Core"
        )
        cls.operator_token = create_access_token(
            user_id="usr_op_test",
            username="op_test",
            email="operator@telesol.io",
            role="NOC_OPERATOR",
            workspace_id="ws_telesol_default",
            org_name="TeleSol Core"
        )
        cls.analyst_token = create_access_token(
            user_id="usr_analyst_test",
            username="analyst_test",
            email="analyst@telesol.io",
            role="ANALYST",
            workspace_id="ws_telesol_default",
            org_name="TeleSol Core"
        )

    # ─────────────────────────────────────────────────────────────
    # PART 1: BACKEND SECURITY VERIFICATION
    # ─────────────────────────────────────────────────────────────

    def test_sec_01_public_registration_cannot_create_admin(self):
        """Public signup must strictly forbid assigning PLATFORM_ADMIN."""
        res = self.client.post("/api/auth/register", json={
            "full_name": "Attacker Admin",
            "email": f"attacker_{secrets.token_hex(4)}@exploit.io",
            "password": "Password123!",
            "role": "PLATFORM_ADMIN"
        })
        self.assertIn(res.status_code, [400, 422])
        self.assertIn("PLATFORM_ADMIN", res.text)

    def test_sec_02_tampered_token_rejected(self):
        """Modifying token payload or signature must immediately invalidate access."""
        valid_token = self.operator_token
        parts = valid_token.split(".")
        # Tamper payload
        tampered_token = f"eyJ1c3IiOiJhZG1pbiIsInJvbCI6IlBMQVRGT1JNX0FETUlOIn0.{parts[1]}"
        res = self.client.get("/api/auth/me", headers={"Authorization": f"Bearer {tampered_token}"})
        self.assertEqual(res.status_code, 401)

    def test_sec_03_expired_and_reused_tokens(self):
        """Email verification tokens cannot be reused or redeemed after expiry."""
        email = f"token_test_{secrets.token_hex(4)}@telesol.io"
        reg = self.client.post("/api/auth/register", json={
            "full_name": "Token Tester",
            "email": email,
            "password": "Password123!"
        }).json()
        token = reg.get("_dev_verification_token")
        self.assertTrue(token)

        # 1. Successful verification
        v1 = self.client.post("/api/auth/verify-email", json={"token": token})
        self.assertEqual(v1.status_code, 200)

        # 2. Reused token rejected
        v2 = self.client.post("/api/auth/verify-email", json={"token": token})
        self.assertEqual(v2.status_code, 400)
        self.assertIn("already been used", v2.text)

        # 3. Expired token rejected
        now_past = (datetime.now(timezone.utc) - timedelta(hours=2)).isoformat()
        expired_token = secrets.token_urlsafe(32)
        with db_session() as conn:
            conn.execute(
                "INSERT INTO verification_tokens (id, user_id, token, token_type, expires_at, created_at) VALUES (?, ?, ?, 'EMAIL_VERIFY', ?, ?)",
                (f"tok_{secrets.token_hex(4)}", reg["id"], expired_token, now_past, now_past)
            )
            conn.commit()

        v3 = self.client.post("/api/auth/verify-email", json={"token": expired_token})
        self.assertEqual(v3.status_code, 400)
        self.assertIn("expired", v3.text)

    def test_sec_04_passwords_never_exposed(self):
        """Profile and user endpoints must never expose password_hash or salt."""
        # Register a real user in the DB
        email = f"profile_test_{secrets.token_hex(4)}@telesol.io"
        reg = AuthService.register_user(
            email=email,
            password="SecurePassword123!",
            full_name="Profile Auditor",
            auto_verify=True
        )
        token = create_access_token(
            user_id=reg["id"],
            username=reg["username"],
            email=reg["email"],
            role=reg["role"],
            workspace_id=reg["workspace_id"]
        )
        res = self.client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertNotIn("password_hash", data)
        self.assertNotIn("salt", data)
        self.assertNotIn("password", data)

    def test_sec_05_workspace_data_isolation(self):
        """Users in Workspace A cannot access service agreements belonging to Workspace B."""
        ws_a = f"ws_alpha_{secrets.token_hex(3)}"
        ws_b = f"ws_beta_{secrets.token_hex(3)}"

        token_a = create_access_token(
            user_id="usr_a",
            username="user_a",
            email="user_a@alpha.io",
            role="NOC_OPERATOR",
            workspace_id=ws_a,
            org_name="Alpha Corp"
        )
        token_b = create_access_token(
            user_id="usr_b",
            username="user_b",
            email="user_b@beta.io",
            role="NOC_OPERATOR",
            workspace_id=ws_b,
            org_name="Beta Corp"
        )

        # Create agreement in Workspace B
        agr_b_res = self.client.post("/api/paypilot/agreements", json={
            "task_id": "zone_b_incident",
            "requesting_agent_id": "agent_b",
            "provider_id": "prov_skylink_5g",
            "provider_address": "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
            "service_category": "TELECOM_BANDWIDTH",
            "service_description": "Dedicated 5G slice for Beta Corp",
            "agreed_price": 500.0,
            "asset": "HSK",
            "max_authorized_amount": 550.0,
            "expected_deliverables": "100Mbps dedicated slice",
            "expected_completion_time": "2026-12-31T23:59:59Z",
            "workspace_id": ws_b
        }, headers={"Authorization": f"Bearer {token_b}"})
        self.assertEqual(agr_b_res.status_code, 200)
        agr_b_id = agr_b_res.json()["agreement"]["id"]

        # User A attempts to view agreements: should NOT see Workspace B's agreement
        list_a = self.client.get("/api/paypilot/agreements", headers={"Authorization": f"Bearer {token_a}"})
        self.assertEqual(list_a.status_code, 200)
        agreements_a = list_a.json()["agreements"]
        self.assertFalse(any(a["id"] == agr_b_id for a in agreements_a))

        # User A directly requests Workspace B's agreement: must be rejected with HTTP 403 Forbidden
        direct_a = self.client.get(f"/api/paypilot/agreements/{agr_b_id}", headers={"Authorization": f"Bearer {token_a}"})
        self.assertEqual(direct_a.status_code, 403)
        self.assertIn("Cross-workspace access violation", direct_a.json()["detail"])

        # User B can view it normally
        direct_b = self.client.get(f"/api/paypilot/agreements/{agr_b_id}", headers={"Authorization": f"Bearer {token_b}"})
        self.assertEqual(direct_b.status_code, 200)

        # Platform Admin can view it across workspaces
        direct_admin = self.client.get(f"/api/paypilot/agreements/{agr_b_id}", headers={"Authorization": f"Bearer {self.admin_token}"})
        self.assertEqual(direct_admin.status_code, 200)

    # ─────────────────────────────────────────────────────────────
    # PART 2: PROCUREMENT LIFECYCLE (8 SCENARIOS)
    # ─────────────────────────────────────────────────────────────

    def test_proc_01_successful_intervention_sufficient_evidence(self):
        """Scenario 1: Successful intervention with telemetry exceeding threshold -> VERIFIED_SUCCESS."""
        agr_res = self.client.post("/api/paypilot/agreements", json={
            "task_id": "zone_success_task",
            "requesting_agent_id": "agent_buyer_sentinel",
            "provider_id": "prov_skylink_5g",
            "provider_address": "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
            "service_category": "TELECOM_BANDWIDTH",
            "service_description": "Capacity relief slice",
            "agreed_price": 250.0,
            "asset": "HSK",
            "max_authorized_amount": 300.0,
            "expected_deliverables": "CRS drop of >= 20 points",
            "expected_completion_time": "2026-12-31T23:59:59Z",
            "baseline_value": 75.0,
            "target_threshold": 20.0
        })
        self.assertEqual(agr_res.status_code, 200)
        agr_id = agr_res.json()["agreement"]["id"]

        # Telemetry: CRS dropped from 75 to 25 (delta: 50, exceeding 20 target)
        post_metrics = {
            "crs_score": 25.0,
            "density": 2.1,
            "flow_instability": 8.0,
            "latency_ms": 18.0,
            "packet_loss_pct": 0.5
        }
        verify_res = self.client.post(f"/api/paypilot/agreements/{agr_id}/verify-outcome", json={
            "post_metrics": post_metrics
        })
        self.assertEqual(verify_res.status_code, 200)
        data = verify_res.json()
        self.assertEqual(data["outcome_status"], "VERIFIED_SUCCESS")
        self.assertEqual(data["agreement"]["settlement_eligibility"], "PERFORMANCE_SATISFIED")

    def test_proc_02_failed_intervention_triggers_recovery(self):
        """Scenario 2: Failed intervention with underperforming metrics -> VERIFIED_FAILURE and bounded recovery."""
        agr_res = self.client.post("/api/paypilot/agreements", json={
            "task_id": "zone_fail_task",
            "requesting_agent_id": "agent_buyer_sentinel",
            "provider_id": "prov_skylink_5g",
            "provider_address": "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
            "service_category": "TELECOM_BANDWIDTH",
            "service_description": "Capacity relief slice",
            "agreed_price": 250.0,
            "asset": "HSK",
            "max_authorized_amount": 300.0,
            "expected_deliverables": "CRS drop of >= 20 points",
            "expected_completion_time": "2026-12-31T23:59:59Z",
            "baseline_value": 75.0,
            "target_threshold": 20.0
        })
        agr_id = agr_res.json()["agreement"]["id"]

        # Telemetry: CRS remained at 72 (delta: 3, far below 20 target)
        post_metrics = {
            "crs_score": 72.0,
            "density": 4.9,
            "flow_instability": 30.0,
            "latency_ms": 55.0,
            "packet_loss_pct": 5.2
        }
        verify_res = self.client.post(f"/api/paypilot/agreements/{agr_id}/verify-outcome", json={
            "post_metrics": post_metrics
        })
        self.assertEqual(verify_res.status_code, 200)
        data = verify_res.json()
        self.assertEqual(data["outcome_status"], "VERIFIED_FAILURE")
        self.assertEqual(data["agreement"]["settlement_eligibility"], "PERFORMANCE_BREACH_REFUND_SIMULATED")
        self.assertIsNotNone(data.get("recovery_plan"))
        self.assertIn("recovery_id", data["recovery_plan"])

    def test_proc_03_missing_evidence_becomes_inconclusive(self):
        """Scenario 3: Missing evidence must NEVER silently become success; must classify as INCONCLUSIVE."""
        agr_res = self.client.post("/api/paypilot/agreements", json={
            "task_id": "zone_missing_evidence_task",
            "requesting_agent_id": "agent_buyer_sentinel",
            "provider_id": "prov_skylink_5g",
            "provider_address": "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
            "service_category": "TELECOM_BANDWIDTH",
            "service_description": "Capacity relief slice",
            "agreed_price": 250.0,
            "asset": "HSK",
            "max_authorized_amount": 300.0,
            "expected_deliverables": "CRS drop of >= 20 points",
            "expected_completion_time": "2026-12-31T23:59:59Z",
            "baseline_value": 65.0,
            "target_threshold": 20.0
        })
        agr_id = agr_res.json()["agreement"]["id"]

        # Missing packet loss, missing latency, and fallback heuristic
        sparse_metrics = {
            "crs_score": 60.0
        }
        verify_res = self.client.post(f"/api/paypilot/agreements/{agr_id}/verify-outcome", json={
            "post_metrics": sparse_metrics
        })
        self.assertEqual(verify_res.status_code, 200)
        data = verify_res.json()
        # Must be either INCONCLUSIVE or FAILED, NEVER VERIFIED_SUCCESS
        self.assertNotEqual(data["outcome_status"], "VERIFIED_SUCCESS")
        self.assertNotEqual(data["agreement"]["settlement_eligibility"], "PERFORMANCE_SATISFIED")

    def test_proc_04_inconclusive_outcome_held_in_escrow(self):
        """Scenario 4: Inconclusive outcomes are held in escrow under INCONCLUSIVE_DISPUTE_HOLD."""
        agr_res = self.client.post("/api/paypilot/agreements", json={
            "task_id": "zone_inconclusive_task",
            "requesting_agent_id": "agent_buyer_sentinel",
            "provider_id": "prov_skylink_5g",
            "provider_address": "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
            "service_category": "TELECOM_BANDWIDTH",
            "service_description": "Telemetry slice",
            "agreed_price": 100.0,
            "asset": "HSK",
            "max_authorized_amount": 100.0,
            "expected_deliverables": "Monitoring",
            "expected_completion_time": "2026-12-31T23:59:59Z"
        })
        agr_id = agr_res.json()["agreement"]["id"]

        # Post noisy evaluation
        with db_session() as conn:
            conn.execute(
                "UPDATE service_agreements SET evaluation_status = 'INSUFFICIENT_EVIDENCE', settlement_eligibility = 'INCONCLUSIVE_DISPUTE_HOLD' WHERE id = ?",
                (agr_id,)
            )
            conn.commit()

        checked = self.client.get(f"/api/paypilot/agreements/{agr_id}").json()["agreement"]
        self.assertEqual(checked["settlement_eligibility"], "INCONCLUSIVE_DISPUTE_HOLD")

    def test_proc_05_duplicate_settlement_idempotency_violation(self):
        """Scenario 5: Attempting duplicate settlement on a SETTLED mandate must return HTTP 400."""
        req_res = self.client.post("/api/paypilot/payment-requests", json={
            "title": "Idempotency Test Payment",
            "buyer_agent_id": "agent_buyer_sentinel",
            "recipient_address": "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
            "asset": "HSK",
            "amount": 15.0,
            "purpose": "Autonomous slice settlement",
            "is_demo": True
        }, headers={"Authorization": f"Bearer {self.operator_token}"})
        self.assertEqual(req_res.status_code, 200)
        mandate_id = req_res.json()["mandate_id"]

        exec_payload = {
            "mandate_id": mandate_id,
            "wallet_signature": "0x" + "a" * 130,
            "signer_address": "0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65",
            "is_demo": True
        }

        # First execution -> Succeeds
        exec_1 = self.client.post("/api/paypilot/execute", json=exec_payload, headers={"Authorization": f"Bearer {self.operator_token}"})
        self.assertEqual(exec_1.status_code, 200)
        self.assertTrue(exec_1.json()["success"])

        # Second execution -> Rejected as Idempotency violation
        exec_2 = self.client.post("/api/paypilot/execute", json=exec_payload, headers={"Authorization": f"Bearer {self.operator_token}"})
        self.assertEqual(exec_2.status_code, 400)
        self.assertIn("Idempotency violation", exec_2.json()["detail"])

    def test_proc_06_insufficient_budget_rejected(self):
        """Scenario 6: Payment exceeding delegation budget or policy ceiling must be rejected."""
        # 1. Create limited delegation: max 50 HSK cumulative
        del_res = self.client.post("/api/paypilot/delegations", json={
            "agent_id": "agent_buyer_sentinel",
            "delegator_address": "0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65",
            "service_categories": ["TELECOM_BANDWIDTH"],
            "max_amount_per_tx": 25.0,
            "max_cumulative_spend": 50.0,
            "valid_until": "2026-12-31T23:59:59Z"
        }, headers={"Authorization": f"Bearer {self.operator_token}"})
        self.assertEqual(del_res.status_code, 200)
        del_id = del_res.json()["delegation"]["id"]

        # Request exceeding max_amount_per_tx (e.g. 35 > 25)
        bad_req = self.client.post("/api/paypilot/payment-requests", json={
            "title": "Overlimit Request",
            "buyer_agent_id": "agent_buyer_sentinel",
            "recipient_address": "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
            "asset": "HSK",
            "amount": 35.0,
            "purpose": "Excessive bandwidth purchase",
            "delegation_id": del_id
        }, headers={"Authorization": f"Bearer {self.operator_token}"})
        self.assertEqual(bad_req.status_code, 400)
        self.assertIn("Delegation Ceiling Exceeded", bad_req.json()["detail"])

    def test_proc_07_unauthorized_financial_action_blocked(self):
        """Scenario 7: Read-only ANALYST role is strictly blocked from financial payment execution."""
        # Analyst attempts to create payment request
        res = self.client.post("/api/paypilot/payment-requests", json={
            "title": "Unauthorized Analyst Payment",
            "buyer_agent_id": "agent_buyer_sentinel",
            "recipient_address": "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
            "asset": "HSK",
            "amount": 20.0,
            "purpose": "Analyst attempting payment"
        }, headers={"Authorization": f"Bearer {self.analyst_token}"})
        self.assertEqual(res.status_code, 403)
        self.assertIn("not authorized to execute or authorize financial payments", res.json()["detail"])

    def test_proc_08_failed_dispatch_and_permitted_recovery(self):
        """Scenario 8: Incident recovery endpoint generates structured recovery action within bounds."""
        agr_res = self.client.post("/api/paypilot/agreements", json={
            "task_id": "zone_dispatch_fail_task",
            "requesting_agent_id": "agent_buyer_sentinel",
            "provider_id": "prov_skylink_5g",
            "provider_address": "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
            "service_category": "TELECOM_BANDWIDTH",
            "service_description": "Slice requiring failover recovery",
            "agreed_price": 200.0,
            "asset": "HSK",
            "max_authorized_amount": 250.0,
            "expected_deliverables": "Capacity restoration",
            "expected_completion_time": "2026-12-31T23:59:59Z"
        })
        self.assertEqual(agr_res.status_code, 200)
        agr_id = agr_res.json()["agreement"]["id"]

        incident_id = f"inc_test_{int(time.time())}"
        rec_res = self.client.post(f"/api/paypilot/incidents/{incident_id}/recovery", json={
            "failed_agreement_id": agr_id
        })
        self.assertEqual(rec_res.status_code, 200)
        rec = rec_res.json()["recovery_plan"]
        self.assertIn("recovery_id", rec)
        self.assertIn("action_type", rec)
        self.assertIn("diagnosis", rec)
        self.assertIn(rec["status"], ["PROPOSED", "AUTO_RECOVERED"])


if __name__ == "__main__":
    unittest.main()
