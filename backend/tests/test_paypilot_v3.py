"""
TeleSol PayPilot 2.0 — Outcome-Driven Telecom Procurement Test Suite (v3.0)
══════════════════════════════════════════════════════════════════════════
Tests the 6 core innovations:
1. Feature A: Network Digital Twin & Intervention Optimizer
2. Feature B: Counterfactual Mitigation Evaluator
3. Feature C: Outcome-Contingent Service Agreements & Lifecycle
4. Feature D: Self-Healing Procurement & Bounded Safe Recovery
5. Feature E: Confidence-Aware Procurement Decisions
6. Feature F: Outcome-Based Provider Reputation & Anti-Inflation
"""

import os
import sys
import json
import uuid
import unittest
from datetime import datetime, timezone, timedelta
from fastapi.testclient import TestClient

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.main import app
from app.paypilot.db import init_db, seed_initial_data, db_session
from app.paypilot.intervention_optimizer import intervention_optimizer
from app.paypilot.counterfactual_evaluator import counterfactual_evaluator
from app.paypilot.recovery_engine import recovery_engine
from app.paypilot.service_agreement import service_agreement_service
from app.paypilot.trust_analyzer import provider_trust_analyzer
from app.paypilot.sentinel_bridge import sentinel_bridge


class TestOutcomeDrivenProcurement(unittest.IsolatedAsyncioTestCase):
    @classmethod
    def setUpClass(cls):
        init_db()
        seed_initial_data(force=True)
        cls.client = TestClient(app)

    def test_01_optimizer_deterministic_ranking(self):
        """Test Requirement 1: Candidate interventions are ranked consistently for identical inputs."""
        res1 = intervention_optimizer.evaluate_incident(
            incident_id="inc_det_1",
            zone_id="zone-c",
            zone_name="Gate C Surge",
            crs_score=78.5,
            density=5.5,
            flow_instability=40.0,
            budget_limit_hsk=25.0
        )
        res2 = intervention_optimizer.evaluate_incident(
            incident_id="inc_det_2",
            zone_id="zone-c",
            zone_name="Gate C Surge",
            crs_score=78.5,
            density=5.5,
            flow_instability=40.0,
            budget_limit_hsk=25.0
        )

        self.assertEqual(len(res1["candidates"]), len(res2["candidates"]))
        self.assertEqual(res1["selected_candidate"]["candidate_id"], res2["selected_candidate"]["candidate_id"])
        self.assertEqual(res1["selected_candidate"]["utility_score"], res2["selected_candidate"]["utility_score"])

        # Check sorting order: scores must be monotonically descending
        scores = [c["utility_score"] for c in res1["candidates"]]
        self.assertEqual(scores, sorted(scores, reverse=True))

    def test_02_optimizer_budget_and_feasibility_rejection(self):
        """Test Requirement 2: Infeasible or over-budget interventions are rejected."""
        # Very low budget (e.g. 0.01 HSK) where no candidate can qualify
        res = intervention_optimizer.evaluate_incident(
            incident_id="inc_budget_tight",
            zone_id="zone-c",
            zone_name="Gate C Surge",
            crs_score=75.0,
            budget_limit_hsk=0.01
        )
        for c in res["candidates"]:
            self.assertFalse(c["is_within_budget"])
            self.assertFalse(c["feasibility"])

        # Normal budget allows feasible candidates
        res_ok = intervention_optimizer.evaluate_incident(
            incident_id="inc_budget_normal",
            zone_id="zone-c",
            zone_name="Gate C Surge",
            crs_score=75.0,
            budget_limit_hsk=20.0
        )
        feasible = [c for c in res_ok["candidates"] if c["feasibility"]]
        self.assertGreaterEqual(len(feasible), 1)

    def test_03_confidence_aware_missing_telemetry(self):
        """Test Requirement 3: Missing telemetry lowers confidence or produces inconclusive result."""
        # Full telemetry -> HIGH confidence
        res_full = intervention_optimizer.evaluate_incident(
            incident_id="inc_conf_full",
            zone_id="zone-c",
            zone_name="Gate C",
            crs_score=70.0,
            density=4.0,
            flow_instability=20.0,
            latency_ms=35.0,
            packet_loss_pct=2.5,
            bandwidth_utilization_pct=85.0,
            affected_users=700
        )
        self.assertEqual(res_full["confidence_level"], "HIGH")
        self.assertGreaterEqual(res_full["confidence_score"], 0.80)

        # Sparse telemetry -> LOW / MEDIUM confidence
        res_sparse = intervention_optimizer.evaluate_incident(
            incident_id="inc_conf_sparse",
            zone_id="zone-c",
            zone_name="Gate C",
            crs_score=70.0,
            density=4.0,
            flow_instability=20.0,
            latency_ms=None,
            packet_loss_pct=None
        )
        self.assertIn(res_sparse["confidence_level"], ("MEDIUM", "LOW"))

    def test_04_payment_execution_separate_from_outcome(self):
        """Test Requirement 4: A payment success does not automatically mark service outcome as successful."""
        exp_time = (datetime.now(timezone.utc) + timedelta(hours=2)).isoformat()
        agr = service_agreement_service.create_agreement(
            task_id="task_sep_test",
            requesting_agent_id="agent_buyer_sentinel",
            provider_id="prov_skylink_5g",
            provider_address="0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
            service_category="TELECOM_BANDWIDTH",
            service_description="Dedicated 50 Mbps Slice",
            agreed_price=12.5,
            asset="HSK",
            max_authorized_amount=12.5,
            expected_deliverables="5G Slice",
            expected_completion_time=exp_time,
            network_id=133,
            target_metric="CRS_REDUCTION",
            baseline_value=75.0,
            target_threshold=25.0
        )
        self.assertEqual(agr["evaluation_status"], "OUTCOME_PENDING")
        self.assertEqual(agr["settlement_eligibility"], "IMMEDIATE_PAID_OUTCOME_UNVERIFIED")

        # Simulate payment execution
        service_agreement_service.update_status(agr["id"], "EXECUTED")
        updated = service_agreement_service.get_agreement(agr["id"])
        self.assertEqual(updated["status"], "EXECUTED")
        # Outcome is STILL OUTCOME_PENDING; payment does not equal outcome verification!
        self.assertEqual(updated["evaluation_status"], "OUTCOME_PENDING")

    def test_05_counterfactual_evaluation_scenarios(self):
        """Test Requirement 5: A service agreement's outcome conditions are evaluated correctly against baseline."""
        # Scenario A: Succeeded (CRS dropped from 78.0 to 45.0, baseline was 82.0 -> attributable drop 37.0 >= 20.0)
        eval_success = counterfactual_evaluator.evaluate_intervention(
            agreement_id="agr_test_success",
            mandate_id="man_01",
            zone_id="zone-c",
            pre_metrics={"crs_score": 78.0, "density": 5.0},
            post_metrics={"crs_score": 45.0, "density": 3.0, "latency_ms": 25.0, "packet_loss_pct": 1.0},
            expected_improvement=25.0,
            target_threshold=20.0
        )
        self.assertEqual(eval_success["outcome_classification"], "SUCCESSFUL")
        self.assertGreaterEqual(eval_success["attributable_improvement"], 20.0)

        # Scenario B: Failed (CRS remained elevated at 74.0, attributable drop only 4.0 < 20.0)
        eval_failed = counterfactual_evaluator.evaluate_intervention(
            agreement_id="agr_test_failed",
            mandate_id="man_02",
            zone_id="zone-c",
            pre_metrics={"crs_score": 78.0, "density": 5.0},
            post_metrics={"crs_score": 74.0, "density": 5.1, "latency_ms": 70.0, "packet_loss_pct": 12.0},
            expected_improvement=25.0,
            target_threshold=20.0
        )
        self.assertEqual(eval_failed["outcome_classification"], "FAILED")

    def test_06_inconclusive_outcome_does_not_trigger_new_payment(self):
        """Test Requirement 6: Inconclusive outcome recommends gathering telemetry, not spending funds."""
        # Create a mock failed agreement and inconclusive evaluation
        agr = service_agreement_service.create_agreement(
            task_id="task_inconc",
            requesting_agent_id="agent_buyer_sentinel",
            provider_id="prov_skylink_5g",
            provider_address="0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
            service_category="TELECOM_BANDWIDTH",
            service_description="Dedicated 50 Mbps Slice",
            agreed_price=10.0,
            asset="HSK",
            max_authorized_amount=10.0,
            expected_deliverables="5G Slice",
            expected_completion_time=(datetime.now(timezone.utc) + timedelta(hours=1)).isoformat()
        )
        eval_inconclusive = counterfactual_evaluator.evaluate_intervention(
            agreement_id=agr["id"],
            mandate_id="man_inconc",
            zone_id="zone-c",
            pre_metrics={"crs_score": 60.0},
            post_metrics={"crs_score": 58.0},  # missing density, latency, loss
            expected_improvement=20.0,
            pre_intervention_trend_rate_per_min=0.0  # fallback heuristic
        )
        self.assertEqual(eval_inconclusive["outcome_classification"], "INCONCLUSIVE")

        # Run recovery
        rec = recovery_engine.diagnose_and_propose_recovery(
            incident_id="task_inconc",
            failed_agreement_id=agr["id"],
            counterfactual_evaluation_id=eval_inconclusive["evaluation_id"]
        )
        self.assertEqual(rec["action_type"], "GATHER_TELEMETRY_ONLY")
        self.assertIn("telemetry", rec["justification"].lower())
        self.assertNotIn("cost_hsk", rec)  # No payment proposed!

    def test_07_failed_intervention_proposes_safe_alternative(self):
        """Test Requirement 7: A failed intervention generates a safe alternative recommendation."""
        agr = service_agreement_service.create_agreement(
            task_id="task_fail_alt",
            requesting_agent_id="agent_buyer_sentinel",
            provider_id="prov_skylink_5g",
            provider_address="0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
            service_category="TELECOM_BANDWIDTH",
            service_description="Dedicated 50 Mbps Slice",
            agreed_price=12.5,
            asset="HSK",
            max_authorized_amount=12.5,
            expected_deliverables="5G Slice",
            expected_completion_time=(datetime.now(timezone.utc) + timedelta(hours=1)).isoformat()
        )
        eval_failed = counterfactual_evaluator.evaluate_intervention(
            agreement_id=agr["id"],
            mandate_id="man_fail_alt",
            zone_id="zone-c",
            pre_metrics={"crs_score": 75.0, "density": 5.0, "flow_instability": 30.0},
            post_metrics={"crs_score": 74.0, "density": 5.0, "latency_ms": 65.0, "packet_loss_pct": 10.0},
            expected_improvement=25.0,
            target_threshold=20.0
        )
        rec = recovery_engine.diagnose_and_propose_recovery(
            incident_id="task_fail_alt",
            failed_agreement_id=agr["id"],
            counterfactual_evaluation_id=eval_failed["evaluation_id"]
        )
        self.assertIn(rec["action_type"], ("SWITCH_SERVICE_STRATEGY", "RECOMMEND_ALTERNATIVE_PROVIDER"))
        # Must NOT re-recommend the same failed provider!
        self.assertNotEqual(rec.get("recommended_provider_id"), "prov_skylink_5g")
        self.assertTrue(rec.get("requires_authorization"))

    def test_08_recovery_attempt_limits_enforced(self):
        """Test Requirement 8: Recovery attempt limits (max 2) are strictly enforced."""
        agr = service_agreement_service.create_agreement(
            task_id="task_max_att",
            requesting_agent_id="agent_buyer_sentinel",
            provider_id="prov_skylink_5g",
            provider_address="0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
            service_category="TELECOM_BANDWIDTH",
            service_description="Dedicated 50 Mbps Slice",
            agreed_price=12.5,
            asset="HSK",
            max_authorized_amount=12.5,
            expected_deliverables="5G Slice",
            expected_completion_time=(datetime.now(timezone.utc) + timedelta(hours=1)).isoformat()
        )
        eval_failed = counterfactual_evaluator.evaluate_intervention(
            agreement_id=agr["id"],
            mandate_id="man_max_att",
            zone_id="zone-c",
            pre_metrics={"crs_score": 75.0, "density": 5.0},
            post_metrics={"crs_score": 75.0, "density": 5.0, "latency_ms": 65.0, "packet_loss_pct": 10.0},
            expected_improvement=25.0,
            target_threshold=20.0
        )

        # Attempt 1 -> Succeeded proposing alternative
        inc_id = f"task_max_att_{uuid.uuid4().hex[:6]}"
        rec1 = recovery_engine.diagnose_and_propose_recovery(
            incident_id=inc_id,
            failed_agreement_id=agr["id"],
            counterfactual_evaluation_id=eval_failed["evaluation_id"],
            max_attempts=2
        )
        self.assertEqual(rec1["attempt_number"], 1)
        self.assertNotEqual(rec1["action_type"], "HALT_EXCEEDED_ATTEMPTS")

        # Attempt 2 -> Succeeded
        rec2 = recovery_engine.diagnose_and_propose_recovery(
            incident_id=inc_id,
            failed_agreement_id=agr["id"],
            counterfactual_evaluation_id=eval_failed["evaluation_id"],
            max_attempts=2
        )
        self.assertEqual(rec2["attempt_number"], 2)

        # Attempt 3 -> Must be HALTED
        rec3 = recovery_engine.diagnose_and_propose_recovery(
            incident_id=inc_id,
            failed_agreement_id=agr["id"],
            counterfactual_evaluation_id=eval_failed["evaluation_id"],
            max_attempts=2
        )
        self.assertEqual(rec3["action_type"], "HALT_EXCEEDED_ATTEMPTS")
        self.assertEqual(rec3["status"], "HALTED_ESCALATION")

    def test_09_delegation_limits_prevent_recovery_overspend(self):
        """Test Requirement 9: Budget and delegated spending limits cannot be bypassed by recovery."""
        from app.paypilot.delegation_service import delegation_service
        # Suspend or deplete delegation for test agent
        del_obj = delegation_service.create_delegation(
            agent_id="agent_broke",
            delegator_address="0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
            service_categories=["TELECOM_BANDWIDTH"],
            max_amount_per_tx=1.0,
            max_cumulative_spend=1.0,
            allowed_recipients=[],
            allowed_assets=["HSK"],
            allowed_networks=[133],
            valid_from=datetime.now(timezone.utc).isoformat(),
            valid_until=(datetime.now(timezone.utc) + timedelta(days=1)).isoformat()
        )
        # Reserve full 1.0 HSK
        delegation_service.reserve_budget(del_obj["id"], 1.0)

        agr = service_agreement_service.create_agreement(
            task_id="task_broke",
            requesting_agent_id="agent_broke",
            provider_id="prov_skylink_5g",
            provider_address="0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
            service_category="TELECOM_BANDWIDTH",
            service_description="5G Slice",
            agreed_price=10.0,
            asset="HSK",
            max_authorized_amount=10.0,
            expected_deliverables="Slice",
            expected_completion_time=(datetime.now(timezone.utc) + timedelta(hours=1)).isoformat()
        )
        eval_failed = counterfactual_evaluator.evaluate_intervention(
            agreement_id=agr["id"],
            mandate_id="man_broke",
            zone_id="zone-c",
            pre_metrics={"crs_score": 70.0},
            post_metrics={"crs_score": 70.0, "latency_ms": 60.0, "packet_loss_pct": 8.0},
            expected_improvement=20.0
        )
        rec = recovery_engine.diagnose_and_propose_recovery(
            incident_id="task_broke",
            failed_agreement_id=agr["id"],
            counterfactual_evaluation_id=eval_failed["evaluation_id"],
            buyer_agent_id="agent_broke"
        )
        self.assertEqual(rec["action_type"], "HALT_BUDGET_EXHAUSTED")
        self.assertEqual(rec["status"], "BLOCKED_BUDGET")

    def test_10_provider_performance_anti_inflation(self):
        """Test Requirement 10: Provider performance cannot be inflated by duplicate evaluations."""
        # Provider profile
        prof = provider_trust_analyzer.analyze_provider("prov_skylink_5g")
        initial_evals = prof["operational_performance"]["total_evaluated_agreements"]

        # Run counterfactual evaluation on agreement 1
        agr1 = service_agreement_service.create_agreement(
            task_id="task_anti_inf_1",
            requesting_agent_id="agent_buyer_sentinel",
            provider_id="prov_skylink_5g",
            provider_address="0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
            service_category="TELECOM_BANDWIDTH",
            service_description="Dedicated 50 Mbps Slice",
            agreed_price=12.5,
            asset="HSK",
            max_authorized_amount=12.5,
            expected_deliverables="5G Slice",
            expected_completion_time=(datetime.now(timezone.utc) + timedelta(hours=1)).isoformat()
        )
        counterfactual_evaluator.evaluate_intervention(
            agreement_id=agr1["id"],
            mandate_id="man_anti_1",
            zone_id="zone-c",
            pre_metrics={"crs_score": 75.0},
            post_metrics={"crs_score": 45.0, "latency_ms": 25.0, "packet_loss_pct": 1.0},
            expected_improvement=25.0
        )
        prof_after_1 = provider_trust_analyzer.analyze_provider("prov_skylink_5g")
        self.assertEqual(prof_after_1["operational_performance"]["total_evaluated_agreements"], initial_evals + 1)

        # Duplicate evaluation on SAME agreement 1 (e.g. re-running evaluator)
        counterfactual_evaluator.evaluate_intervention(
            agreement_id=agr1["id"],
            mandate_id="man_anti_1",
            zone_id="zone-c",
            pre_metrics={"crs_score": 75.0},
            post_metrics={"crs_score": 45.0, "latency_ms": 25.0, "packet_loss_pct": 1.0},
            expected_improvement=25.0
        )
        prof_after_dup = provider_trust_analyzer.analyze_provider("prov_skylink_5g")
        # Must still be initial_evals + 1 because it deduplicates by agreement_id!
        self.assertEqual(prof_after_dup["operational_performance"]["total_evaluated_agreements"], initial_evals + 1)

    def test_11_simulated_vs_real_measurements_distinguished(self):
        """Test Requirement 11: Simulated, assumed, and real measurements remain distinguishable."""
        opt_res = intervention_optimizer.evaluate_incident(
            incident_id="inc_distinguish_test",
            zone_id="zone-c",
            zone_name="Gate C",
            crs_score=72.0,
            density=4.5,
            flow_instability=28.0,
            latency_ms=38.0
        )
        prov = opt_res["data_provenance"]
        self.assertIn("real_measurements", prov)
        self.assertIn("simulated_values", prov)
        self.assertIn("assumed_values", prov)

        # Assert real measurements contain only inputs from observation
        self.assertEqual(prov["real_measurements"]["crs_score"], 72.0)
        self.assertEqual(prov["real_measurements"]["density_people_per_m2"], 4.5)

        # Assert digital twin candidate contains clear model type tag
        cand = opt_res["selected_candidate"]
        self.assertIn("simulated_values", cand)
        self.assertEqual(cand["simulated_values"]["model_type"], "BOUNDED_CROWD_TELECOM_DIGITAL_TWIN_V1")

    async def test_12_end_to_end_outcome_driven_procurement_flow(self):
        """Test Requirement 12: End-to-end outcome-driven lifecycle: Sentinel -> Optimizer -> Mandate -> Execute -> Counterfactual -> Settlement Status."""
        # 1. Propose mitigation
        prop = await sentinel_bridge.create_mitigation_proposal(zone_id="zone-c")
        self.assertIn("intervention_optimizer", prop)
        self.assertIn("candidates", prop["intervention_optimizer"])
        self.assertIn("service_agreement", prop)
        agr = prop["service_agreement"]
        self.assertEqual(agr["evaluation_status"], "OUTCOME_PENDING")
        self.assertIn("target_threshold", agr)

        # 2. Execute payment via API
        mandate_id = prop["mandate"]["mandate_id"]
        exec_res = self.client.post("/api/paypilot/execute", json={
            "mandate_id": mandate_id,
            "wallet_signature": "0x304502210089abcdef0123456789abcdef0123456789abcdef0123456789abcdef01234502200123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
            "signer_address": "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
            "is_demo": True
        })
        self.assertEqual(exec_res.status_code, 200)

        # 3. Evaluate outcome via API
        eval_resp = self.client.post("/api/paypilot/sentinel/evaluate-outcome", json={
            "agreement_id": agr["agreement_id"],
            "post_metrics": {
                "crs_score": 20.0,
                "density": 2.0,
                "flow_instability": 10.0,
                "latency_ms": 22.0,
                "packet_loss_pct": 0.8
            }
        })
        self.assertEqual(eval_resp.status_code, 200)
        eval_data = eval_resp.json()
        self.assertEqual(eval_data["counterfactual_evaluation"]["outcome_classification"], "SUCCESSFUL")
        self.assertEqual(eval_data["agreement"]["evaluation_status"], "OUTCOME_VERIFIED")
        self.assertEqual(eval_data["agreement"]["settlement_eligibility"], "PERFORMANCE_SATISFIED")


if __name__ == "__main__":
    unittest.main()
