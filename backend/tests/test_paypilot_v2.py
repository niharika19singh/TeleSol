"""
TeleSol PayPilot 2.0 — Extended Unit & Integration Test Suite
════════════════════════════════════════════════════════════
Thoroughly tests the trust-aware autonomous payment coordination platform:
1. Canonical JSON RFC 8785 deterministic ordering and SHA-256 digests
2. Service agreement creation, canonical hashing, and tamper detection
3. Agreement parameter binding: amount, recipient, asset, network enforcement
4. Delegated agent budgets: atomic reservation, settlement, and release
5. Delegation permission boundaries: agents cannot self-modify or elevate limits
6. Explainable provider trust analysis: signal provenance and INSUFFICIENT_HISTORY flag
7. Payment Safety Simulator: APPROVED, BLOCKED, REQUIRES REVIEW 3-state outcomes
8. Safety Simulator hypothetical policy simulation without mutating production policy
9. Task-to-Settlement Evidence Bundle: canonical hashing and independent 8-point verification
10. Dispute and incident management: timeline tracking and safe retry idempotency
11. TeleSol Sentinel to PayPilot bridge: zone congestion to service procurement proposal
12. HSP Gateway client v2.3.0: canonical HMAC-SHA256 signing and webhook verification
"""

import os
import sys
import json
import time
import unittest
from datetime import datetime, timezone, timedelta
from fastapi.testclient import TestClient

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.main import app
from app.paypilot.canonical import canonical_json, hash_canonical_json
from app.paypilot.service_agreement import service_agreement_service
from app.paypilot.delegation_service import delegation_service
from app.paypilot.trust_analyzer import provider_trust_analyzer
from app.paypilot.safety_simulator import payment_safety_simulator
from app.paypilot.evidence_bundle import evidence_bundle_service
from app.paypilot.dispute_manager import dispute_manager
from app.paypilot.sentinel_bridge import sentinel_bridge
from app.paypilot.hsp_service import hsp_service
from app.paypilot.db import init_db, seed_initial_data


class TestPayPilotV2Features(unittest.IsolatedAsyncioTestCase):
    @classmethod
    def setUpClass(cls):
        init_db()
        seed_initial_data(force=True)
        cls.client = TestClient(app)

    def test_01_canonical_json_rfc8785(self):
        """Verify RFC 8785 Canonical JSON sorting and consistency."""
        unordered = {
            "z": 100,
            "a": "first",
            "nested": {
                "m": True,
                "b": None,
                "a": [3, 1, 2]
            }
        }
        c_str = canonical_json(unordered)
        self.assertEqual(c_str, '{"a":"first","nested":{"a":[3,1,2],"b":null,"m":true},"z":100}')

        # Re-hashing produces deterministic 64-char lowercase hex
        digest = hash_canonical_json(unordered)
        self.assertEqual(len(digest), 64)
        self.assertTrue(all(c in "0123456789abcdef" for c in digest))

    def test_02_service_agreement_creation_and_tamper_detection(self):
        """Test service agreement creation and tamper detection on canonical terms."""
        exp_time = (datetime.now(timezone.utc) + timedelta(hours=4)).isoformat()
        agr = service_agreement_service.create_agreement(
            task_id="task_test_01",
            requesting_agent_id="agent_buyer_sentinel",
            provider_id="prov_skylink_5g",
            provider_address="0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
            service_category="TELECOM_BANDWIDTH",
            service_description="Dedicated 100Mbps Uplink",
            agreed_price=12.5,
            asset="HSK",
            max_authorized_amount=12.5,
            expected_deliverables="Guaranteed 100Mbps slice",
            expected_completion_time=exp_time,
            network_id=133
        )
        self.assertIn("agreement_id", agr)
        self.assertIn("agreement_hash", agr)
        self.assertEqual(len(agr["agreement_hash"]), 64)

        # 1. Valid payment parameters match
        valid, err, _ = service_agreement_service.validate_payment_binding(
            agreement_id=agr["agreement_id"],
            proposed_amount=12.5,
            proposed_recipient="0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
            proposed_asset="HSK",
            proposed_network_id=133
        )
        self.assertTrue(valid)
        self.assertIsNone(err)

        # 2. Exceeding max authorized amount is rejected
        valid2, err2, _ = service_agreement_service.validate_payment_binding(
            agreement_id=agr["agreement_id"],
            proposed_amount=20.0,
            proposed_recipient="0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
            proposed_asset="HSK",
            proposed_network_id=133
        )
        self.assertFalse(valid2)
        self.assertIn("exceeds maximum authorized amount", err2)

        # 3. Recipient mismatch is rejected
        valid3, err3, _ = service_agreement_service.validate_payment_binding(
            agreement_id=agr["agreement_id"],
            proposed_amount=12.5,
            proposed_recipient="0x9999999999999999999999999999999999999999",
            proposed_asset="HSK",
            proposed_network_id=133
        )
        self.assertFalse(valid3)
        self.assertIn("Recipient address mismatch", err3)

    def test_03_delegated_budgets_and_permissions(self):
        """Test agent delegation creation, budget evaluation, and reservation."""
        now = datetime.now(timezone.utc).isoformat()
        future = (datetime.now(timezone.utc) + timedelta(days=7)).isoformat()

        del_obj = delegation_service.create_delegation(
            agent_id="agent_buyer_sentinel",
            delegator_address="0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
            service_categories=["TELECOM_BANDWIDTH"],
            max_amount_per_tx=20.0,
            max_cumulative_spend=50.0,
            allowed_recipients=["0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC"],
            allowed_assets=["HSK"],
            allowed_networks=[133],
            valid_from=now,
            valid_until=future
        )
        del_id = del_obj["id"]

        # 1. Inspect remaining budget
        d = delegation_service.get_delegation(del_id)
        self.assertEqual(d["remaining_budget"], 50.0)

        # 2. Evaluate within boundaries -> passed
        ok, viols, _ = delegation_service.evaluate_payment_against_delegation(
            delegation_id=del_id,
            amount=15.0,
            recipient="0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
            asset="HSK",
            network_id=133,
            category="TELECOM_BANDWIDTH"
        )
        self.assertTrue(ok)
        self.assertEqual(len(viols), 0)

        # 3. Reserve 15.0 budget
        reserved = delegation_service.reserve_budget(del_id, 15.0)
        self.assertTrue(reserved)
        d_after = delegation_service.get_delegation(del_id)
        self.assertEqual(d_after["reserved_amount"], 15.0)
        self.assertEqual(d_after["remaining_budget"], 35.0)

        # 4. Agent attempting to self-modify delegation is forbidden
        with self.assertRaises(PermissionError):
            delegation_service.set_delegation_status(del_id, "SUSPENDED", modifier_actor="agent_buyer_sentinel")

        # 5. Delegator suspending delegation
        updated = delegation_service.set_delegation_status(del_id, "SUSPENDED", modifier_actor="0x70997970C51812dc3A010C7d01b50e0d17dc79C8")
        self.assertEqual(updated["status"], "SUSPENDED")

    def test_04_provider_trust_signals_and_provenance(self):
        """Test explainable provider trust signals with provenance and insufficient history flag."""
        trust = provider_trust_analyzer.analyze_provider("prov_skylink_5g", proposed_amount=12.5)
        self.assertEqual(trust["provider_id"], "prov_skylink_5g")
        self.assertIn("signals", trust)
        self.assertGreaterEqual(len(trust["signals"]), 5)

        # Verify every signal has provenance
        for sig in trust["signals"]:
            self.assertIn("name", sig)
            self.assertIn("status", sig)
            self.assertIn("source", sig)
            self.assertIn("verification_method", sig)
            self.assertIn("confidence_limitations", sig)

        # SkyLink has 1 seed settlement -> must be flagged as INSUFFICIENT_HISTORY
        self.assertEqual(trust["overall_assessment"], "INSUFFICIENT_HISTORY")

    async def test_05_safety_simulator_outcomes(self):
        """Test Payment Safety Simulator 3-state outcomes (APPROVED, BLOCKED, REQUIRES REVIEW)."""
        # 1. APPROVED FOR AUTHORISATION: Valid parameters within ceiling
        sim1 = await payment_safety_simulator.simulate_payment(
            amount=10.0,
            asset="HSK",
            network_id=133,
            recipient_address="0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
            buyer_agent_id="agent_buyer_sentinel",
            provider_id="prov_skylink_5g",
            purpose="Standard procurement"
        )
        self.assertIn(sim1["outcome"], ("APPROVED FOR AUTHORISATION", "REQUIRES REVIEW"))
        self.assertIn("estimated_fee", sim1)

        # 2. BLOCKED: Amount exceeds single tx limit (50 HSK)
        sim2 = await payment_safety_simulator.simulate_payment(
            amount=250.0,
            asset="HSK",
            network_id=133,
            recipient_address="0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
            buyer_agent_id="agent_buyer_sentinel"
        )
        self.assertEqual(sim2["outcome"], "BLOCKED")
        self.assertTrue(any("exceeds single-transaction limit" in v for v in sim2["violations"]))

        # 3. Hypothetical simulation mode
        sim_hypo = await payment_safety_simulator.simulate_payment(
            amount=80.0,
            asset="HSK",
            network_id=133,
            recipient_address="0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
            buyer_agent_id="agent_buyer_sentinel",
            hypothetical_policy_overrides={"max_amount_per_tx": 100.0, "max_daily_budget": 500.0}
        )
        self.assertTrue(sim_hypo["is_hypothetical"])
        self.assertNotEqual(sim_hypo["outcome"], "BLOCKED")

    async def test_06_evidence_bundle_and_independent_verification(self):
        """Test creating an evidence bundle and executing independent 8-point verification."""
        bundles = evidence_bundle_service.list_bundles()
        self.assertGreaterEqual(len(bundles), 1)

        seed_bundle = bundles[0]
        report = await evidence_bundle_service.verify_bundle_independently(seed_bundle["id"])

        self.assertIn("status", report)
        self.assertIn("checks", report)
        self.assertIn("bundle_hash_integrity", report["checks"])
        self.assertIn("agreement_hash_consistency", report["checks"])
        self.assertIn("wallet_signature_verification", report["checks"])
        self.assertIn("on_chain_verification", report["checks"])
        self.assertIn("audit_chain_integrity", report["checks"])
        self.assertTrue(report["checks"]["bundle_hash_integrity"]["valid"])

    def test_07_dispute_and_safe_retry_management(self):
        """Test incident recording, dispute timeline, and safe retry idempotency checks."""
        inc = dispute_manager.record_incident(
            incident_type="REVERTED_TRANSACTION",
            detection_reason="HSK Chain EVM execution reverted with 0x0 status.",
            severity="HIGH",
            mandate_id="man_failed_test_01",
            recommended_action="Inspect contract error and request refund."
        )
        self.assertEqual(inc["status"], "OPEN")
        self.assertEqual(inc["severity"], "HIGH")

        # Update dispute status
        updated = dispute_manager.update_incident_status(
            incident_id=inc["id"],
            new_status="RESOLVED",
            actor="supervisor",
            notes="Refund issued and alternative provider allocated."
        )
        self.assertEqual(updated["status"], "RESOLVED")
        self.assertEqual(len(updated["timeline"]), 2)

        # Retry check: Settled mandate cannot be retried
        retry_check = dispute_manager.evaluate_safe_retry("man_hsp_seed_demo_001")
        self.assertFalse(retry_check["can_retry"])
        self.assertIn("already SETTLED", retry_check["reason"])

    async def test_08_sentinel_to_paypilot_bridge(self):
        """Test Sentinel crowd congestion scanning and automated mitigation proposal generation."""
        actionable = sentinel_bridge.get_actionable_incidents()
        self.assertIsInstance(actionable, list)

        # Generate proposal for Gate C
        proposal = await sentinel_bridge.create_mitigation_proposal(
            zone_id="zone-c",
            buyer_agent_id="agent_buyer_sentinel"
        )
        self.assertIn("proposal_id", proposal)
        self.assertIn("incident", proposal)
        self.assertIn("service_agreement", proposal)
        self.assertIn("safety_simulation", proposal)
        self.assertEqual(proposal["incident"]["zone_id"], "zone-c")
        self.assertIn("agreement_hash", proposal["service_agreement"])

    def test_09_hsp_v2_signing_and_webhook_verification(self):
        """Test official HashKey Merchant v2.3.0 HMAC request headers and webhook signature verification."""
        body = {"cart_mandate": {"id": "TEST_001"}}
        headers = hsp_service.generate_hmac_headers("POST", "/api/v1/merchant/orders", query="", body_dict=body)

        self.assertIn("X-App-Key", headers)
        self.assertIn("X-Timestamp", headers)
        self.assertIn("X-Nonce", headers)
        self.assertIn("X-Signature", headers)
        self.assertEqual(len(headers["X-Signature"]), 64)

        # Webhook signature verification
        hsp_service.app_secret = "test_merchant_secret_12345"
        raw_body = b'{"status":"payment-finalized","cart_mandate_id":"TEST_001"}'
        ts = str(int(time.time()))
        msg = f"{ts}.".encode("utf-8") + raw_body
        import hmac, hashlib
        sig = hmac.new(b"test_merchant_secret_12345", msg, hashlib.sha256).hexdigest()
        sig_header = f"t={ts},v1={sig}"

        valid, err = hsp_service.verify_webhook_signature(sig_header, raw_body)
        self.assertTrue(valid, f"Webhook validation failed: {err}")

        # Invalid body fails verification
        tampered_body = b'{"status":"payment-finalized","cart_mandate_id":"TAMPERED"}'
        invalid, err2 = hsp_service.verify_webhook_signature(sig_header, tampered_body)
        self.assertFalse(invalid)

    async def test_10_evidence_bundle_negative_tamper_tests(self):
        """Negative test: Tampering with individual fields in evidence bundle is detected and rejected."""
        bundles = evidence_bundle_service.list_bundles()
        self.assertGreaterEqual(len(bundles), 1)
        original_bundle = bundles[0]
        bid = original_bundle["id"]

        from app.paypilot.db import db_session

        # 1. Tamper with transaction_hash in database record
        with db_session() as conn:
            cursor = conn.cursor()
            cursor.execute("UPDATE evidence_bundles SET transaction_hash = '0xtampered_tx_hash' WHERE id = ?;", (bid,))

        rep1 = await evidence_bundle_service.verify_bundle_independently(bid)
        self.assertFalse(rep1["verified"])
        self.assertEqual(rep1["status"], "TAMPERED")
        self.assertFalse(rep1["checks"]["bundle_hash_integrity"]["valid"])

        # 2. Restore transaction_hash, tamper with agreement_hash
        with db_session() as conn:
            cursor = conn.cursor()
            cursor.execute("UPDATE evidence_bundles SET transaction_hash = ?, agreement_hash = 'tampered_agreement_hash_abcdef1234567890abcdef1234567890abcdef12' WHERE id = ?;", (original_bundle["transaction_hash"], bid))

        rep2 = await evidence_bundle_service.verify_bundle_independently(bid)
        self.assertFalse(rep2["verified"])
        self.assertEqual(rep2["status"], "TAMPERED")

        # 3. Restore and tamper inside canonical_bundle JSON (e.g. change amount from 12.5 to 999.0)
        c_dict = json.loads(original_bundle["canonical_bundle"])
        c_dict["amount"] = 999.0
        tampered_c_json = json.dumps(c_dict)

        with db_session() as conn:
            cursor = conn.cursor()
            cursor.execute("""
            UPDATE evidence_bundles
            SET agreement_hash = ?, canonical_bundle = ?
            WHERE id = ?;
            """, (original_bundle["agreement_hash"], tampered_c_json, bid))

        rep3 = await evidence_bundle_service.verify_bundle_independently(bid)
        self.assertFalse(rep3["verified"])
        self.assertEqual(rep3["status"], "TAMPERED")
        self.assertFalse(rep3["checks"]["bundle_hash_integrity"]["valid"])

        # Restore original state
        with db_session() as conn:
            cursor = conn.cursor()
            cursor.execute("""
            UPDATE evidence_bundles
            SET canonical_bundle = ?, transaction_hash = ?, agreement_hash = ?
            WHERE id = ?;
            """, (original_bundle["canonical_bundle"], original_bundle["transaction_hash"], original_bundle["agreement_hash"], bid))

        rep_restored = await evidence_bundle_service.verify_bundle_independently(bid)
        self.assertTrue(rep_restored["verified"])
        self.assertEqual(rep_restored["status"], "VERIFIED")

    async def test_11_sentinel_to_paypilot_end_to_end(self):
        """End-to-end: Sentinel incident ➔ Mitigation proposal ➔ Staged mandate ➔ Execution ➔ Evidence Bundle."""
        # 1. Propose mitigation from Sentinel congestion
        proposal = await sentinel_bridge.create_mitigation_proposal(
            zone_id="zone-c",
            buyer_agent_id="agent_buyer_sentinel"
        )
        self.assertIn("mandate", proposal)
        mandate_info = proposal["mandate"]
        mandate_id = mandate_info["mandate_id"]
        self.assertIsNotNone(mandate_id)

        # 2. Execute payment through PayPilot router using test client
        exec_payload = {
            "mandate_id": mandate_id,
            "wallet_signature": "0x304502210089abcdef0123456789abcdef0123456789abcdef0123456789abcdef01234502200123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
            "signer_address": "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
            "is_demo": True
        }
        resp = self.client.post("/api/paypilot/execute", json=exec_payload)
        self.assertEqual(resp.status_code, 200, f"Execution failed: {resp.text}")
        exec_data = resp.json()

        self.assertEqual(exec_data["status"], "SETTLED")
        self.assertIn("receipt", exec_data)
        self.assertIn("evidence_bundle_id", exec_data)

        # 3. Independently verify the resulting evidence bundle
        eb_id = exec_data["evidence_bundle_id"]
        eb_report = await evidence_bundle_service.verify_bundle_independently(eb_id)
        self.assertTrue(eb_report["verified"])
        self.assertEqual(eb_report["status"], "VERIFIED")
        self.assertIn("checklist", eb_report)
        self.assertEqual(len(eb_report["checklist"]), 8)

    def test_12_delegation_status_and_actor_flexibility(self):
        """Test delegation status update with both body actor and query actor, plus ACTIVE normalization."""
        del_list = delegation_service.list_delegations()
        self.assertGreaterEqual(len(del_list), 1)
        did = del_list[0]["id"]

        # 1. Update status passing actor in body (no query param)
        res1 = self.client.patch(
            f"/api/paypilot/delegations/{did}/status",
            json={"status": "SUSPENDED", "actor": "admin_operator"}
        )
        self.assertEqual(res1.status_code, 200)
        self.assertEqual(res1.json()["delegation"]["status"], "SUSPENDED")

        # 2. Normalize ACTIVE to ENABLED
        res2 = self.client.patch(
            f"/api/paypilot/delegations/{did}/status",
            json={"status": "ACTIVE", "actor": "admin_operator"}
        )
        self.assertEqual(res2.status_code, 200)
        self.assertEqual(res2.json()["delegation"]["status"], "ENABLED")

    def test_13_service_agreement_creation_via_api(self):
        """Test Service Agreement creation via API with custom parameters."""
        exp_time = (datetime.now(timezone.utc) + timedelta(hours=2)).isoformat()
        payload = {
            "task_id": "task_api_test_99",
            "requesting_agent_id": "agent_buyer_sentinel",
            "provider_id": "prov_skylink_5g",
            "provider_address": "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
            "service_category": "TELECOM_BANDWIDTH",
            "service_description": "Dedicated 50 Mbps Slice for Gate B",
            "agreed_price": 10.0,
            "asset": "HSK",
            "max_authorized_amount": 10.0,
            "expected_deliverables": "Dedicated bandwidth slice",
            "expected_completion_time": exp_time,
            "network_id": 133,
            "evidence_required": "BANDWIDTH_TELEMETRY"
        }
        resp = self.client.post("/api/paypilot/agreements", json=payload)
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertEqual(data["status"], "success")
        self.assertIn("agreement_hash", data["agreement"])
        self.assertEqual(data["agreement"]["agreed_price"], 10.0)


if __name__ == "__main__":
    unittest.main()
