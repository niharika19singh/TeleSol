"""
TeleSol PayPilot 2.0 — Self-Healing Procurement & Safe Recovery Engine (Feature D)
═════════════════════════════════════════════════════════════════════════════════
Diagnoses underperforming or failed telecom interventions and plans bounded, safe recovery:
1. Ingests counterfactual evaluation outcome and telemetry.
2. Diagnoses plausible failure causes (QoS deficit, external crowd surge, telemetry dropout).
3. Re-runs Intervention Optimizer excluding failed provider/strategy.
4. Checks agent delegated spending limits and remaining cumulative budget.
5. Enforces maximum recovery attempt bounds (max 2 attempts) to prevent runaway payment loops.
6. If inconclusive, recommends gathering more sensor measurements rather than spending funds.
7. Halts for explicit user wallet authorization when proposing a new procurement mandate.
8. Records complete failure evidence, diagnosis, and recovery decision in the SHA-256 audit ledger.
"""

import json
import time
import uuid
import logging
from typing import Dict, Any, List, Optional
from datetime import datetime, timezone

from app.paypilot.db import db_session
from app.paypilot.intervention_optimizer import intervention_optimizer
from app.paypilot.delegation_service import delegation_service
from app.paypilot.audit import record_audit_event

logger = logging.getLogger("telesol.paypilot.recovery_engine")


class SafeRecoveryEngine:
    """
    Bounded self-healing recovery engine for failed or underperforming telecom interventions.
    """

    def diagnose_and_propose_recovery(
        self,
        incident_id: str,
        failed_agreement_id: str,
        counterfactual_evaluation_id: str,
        buyer_agent_id: str = "agent_buyer_sentinel",
        max_attempts: int = 2
    ) -> Dict[str, Any]:
        """
        Diagnose underperforming intervention and plan a bounded, policy-compliant recovery action.
        """
        now = datetime.now(timezone.utc).isoformat()
        recovery_id = f"rec_{int(time.time_ns())}_{uuid.uuid4().hex[:6]}"

        # 1. Inspect Failed Agreement and Counterfactual Evaluation
        with db_session() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM service_agreements WHERE id = ?;", (failed_agreement_id,))
            agr_row = cursor.fetchone()
            if not agr_row:
                raise ValueError(f"Agreement '{failed_agreement_id}' not found.")
            failed_agr = dict(agr_row)

            if not counterfactual_evaluation_id:
                counterfactual_evaluation_id = failed_agr.get("outcome_evaluation_id")

            if counterfactual_evaluation_id:
                cursor.execute("SELECT * FROM counterfactual_evaluations WHERE id = ?;", (counterfactual_evaluation_id,))
                eval_row = cursor.fetchone()
            else:
                cursor.execute("SELECT * FROM counterfactual_evaluations WHERE agreement_id = ? ORDER BY evaluated_at DESC LIMIT 1;", (failed_agreement_id,))
                eval_row = cursor.fetchone()

            if not eval_row:
                # Synthesize fallback evaluation if agreement was marked failed directly
                evaluation = {
                    "id": f"cfe_synth_{int(time.time_ns())}",
                    "agreement_id": failed_agreement_id,
                    "outcome_classification": "FAILED",
                    "evidence_summary": "Mitigation failed to produce required CRS attenuation; intervention timed out or breached SLA threshold.",
                    "zone_id": failed_agr.get("task_id", "zone_sentinel")
                }
            else:
                evaluation = dict(eval_row)

            # Check previous recovery attempts for this incident
            cursor.execute("""
            SELECT COUNT(*) as attempts FROM recovery_actions
            WHERE incident_id = ?;
            """, (incident_id,))
            attempts_so_far = cursor.fetchone()["attempts"]

        attempt_number = attempts_so_far + 1
        classification = evaluation.get("outcome_classification", "FAILED")
        failed_provider_id = failed_agr.get("provider_id")
        failed_category = failed_agr.get("service_category")
        zone_id = evaluation.get("zone_id", "zone_unknown")

        pre_metrics = json.loads(evaluation.get("pre_metrics") or "{}")
        post_metrics = json.loads(evaluation.get("post_metrics") or "{}")
        pre_crs = float(pre_metrics.get("crs_score", 65.0))
        post_crs = float(post_metrics.get("crs_score", 65.0))
        pre_density = float(pre_metrics.get("density", 3.0))
        post_density = float(post_metrics.get("density", 3.0))

        # 2. Diagnose Plausible Failure Cause
        if classification == "INCONCLUSIVE":
            diagnosis_code = "TELEMETRY_DROPOUT_OR_INSUFFICIENT_EVIDENCE"
            diagnosis_details = (
                "Post-intervention telemetry confidence was below threshold. "
                "Network metrics could not be verified with sufficient certainty to confirm mitigation."
            )
        elif post_density > (pre_density * 1.35):
            diagnosis_code = "UNEXPECTED_EXTERNAL_SURGE"
            diagnosis_details = (
                f"Crowd density surged by +{round((post_density - pre_density) / pre_density * 100)}% "
                f"({pre_density:.1f} -> {post_density:.1f} ppl/m²) during the intervention window, "
                "overwhelming allocated slice capacity."
            )
        elif post_crs >= pre_crs:
            diagnosis_code = "PROVIDER_QOS_DEFICIT"
            diagnosis_details = (
                f"Provider '{failed_provider_id}' allocated resources failed to produce measurable CRS attenuation. "
                f"CRS remained at {post_crs:.1f} (baseline was {pre_crs:.1f}). Possible SLA failure or routing defect."
            )
        else:
            diagnosis_code = "INSUFFICIENT_CAPACITY_SCALE"
            diagnosis_details = (
                f"Intervention yielded marginal drop of {round(pre_crs - post_crs, 1)} points, "
                f"which fell short of the required threshold ({evaluation.get('expected_improvement')} expected)."
            )

        # 3. Check Bounded Recovery Invariant: Maximum Attempts
        if attempt_number > max_attempts:
            action_type = "HALT_EXCEEDED_ATTEMPTS"
            justification = (
                f"Maximum recovery attempts reached ({attempts_so_far}/{max_attempts}). "
                "Autonomous procurement halted to prevent runaway spending. Manual network operations escalation required."
            )
            recovery_plan = {
                "recovery_id": recovery_id,
                "incident_id": incident_id,
                "attempt_number": attempt_number,
                "max_attempts": max_attempts,
                "action_type": action_type,
                "diagnosis": {
                    "code": diagnosis_code,
                    "details": diagnosis_details,
                    "failed_provider": failed_provider_id,
                    "failed_strategy": failed_category
                },
                "status": "HALTED_ESCALATION",
                "recommendation": "HALT_PROCUREMENT_MANUAL_ESCALATION",
                "requires_authorization": True,
                "justification": justification
            }
            eval_id_to_persist = counterfactual_evaluation_id or evaluation.get("id", f"cfe_synth_{int(time.time_ns())}")
            self._persist_recovery_action(recovery_plan, failed_agreement_id, eval_id_to_persist, now)
            return recovery_plan

        # 4. Check Inconclusive Handling: Recommend Measurement Only
        if classification == "INCONCLUSIVE":
            action_type = "GATHER_TELEMETRY_ONLY"
            justification = (
                "Because telemetry was inconclusive, safe policy dictates deploying millimeter-wave radar telemetry "
                "or waiting for next sensor beacon rather than committing additional capital to an unverified problem."
            )
            recovery_plan = {
                "recovery_id": recovery_id,
                "incident_id": incident_id,
                "attempt_number": attempt_number,
                "max_attempts": max_attempts,
                "action_type": action_type,
                "diagnosis": {
                    "code": diagnosis_code,
                    "details": diagnosis_details,
                    "failed_provider": failed_provider_id,
                    "failed_strategy": failed_category
                },
                "status": "PROPOSED",
                "recommendation": "DEPLOY_TELEMETRY_STREAM_ONLY",
                "recommended_service_category": "SENSOR_DATA",
                "requires_authorization": True,
                "justification": justification
            }
            eval_id_to_persist = counterfactual_evaluation_id or evaluation.get("id", f"cfe_synth_{int(time.time_ns())}")
            self._persist_recovery_action(recovery_plan, failed_agreement_id, eval_id_to_persist, now)
            return recovery_plan

        # 5. Check Active Delegation Budget for Recovery Procurement
        delegations = delegation_service.list_delegations(agent_id=buyer_agent_id)
        active_delegation = next((d for d in delegations if d["status"] == "ENABLED"), None)

        if not active_delegation:
            budget_ok = False
            remaining_budget = 0.0
            delegation_id = None
        else:
            delegation_id = active_delegation["id"]
            remaining_budget = float(active_delegation.get("remaining_budget", active_delegation.get("remaining_cumulative_budget", 0.0)))
            budget_ok = remaining_budget >= 5.0

        if not budget_ok:
            action_type = "HALT_BUDGET_EXHAUSTED"
            justification = (
                f"Agent delegation budget depleted (Remaining: {remaining_budget} HSK). "
                "Recovery procurement blocked by spending boundary. Agent cannot self-elevate limit."
            )
            recovery_plan = {
                "recovery_id": recovery_id,
                "incident_id": incident_id,
                "attempt_number": attempt_number,
                "max_attempts": max_attempts,
                "action_type": action_type,
                "diagnosis": {
                    "code": diagnosis_code,
                    "details": diagnosis_details,
                    "failed_provider": failed_provider_id
                },
                "status": "BLOCKED_BUDGET",
                "recommendation": "HALT_DELEGATION_CEILING_REACHED",
                "requires_authorization": True,
                "justification": justification
            }
            eval_id_to_persist = counterfactual_evaluation_id or evaluation.get("id", f"cfe_synth_{int(time.time_ns())}")
            self._persist_recovery_action(recovery_plan, failed_agreement_id, eval_id_to_persist, now)
            return recovery_plan

        # 6. Re-run Intervention Optimizer Excluding Failed Provider and Strategy
        # If external surge, recommend heavier bandwidth or transit diversion
        # Exclude failed provider to prevent repeating identical failure
        exclude_provs = [failed_provider_id]
        # If provider QoS deficit, also exclude that category if alternative category available
        exclude_cats = [failed_category] if diagnosis_code == "PROVIDER_QOS_DEFICIT" else []

        optimizer_res = intervention_optimizer.evaluate_incident(
            incident_id=f"rec_opt_{incident_id}_{attempt_number}",
            zone_id=zone_id,
            zone_name=failed_agr.get("service_description", "Monitored Zone"),
            crs_score=post_crs,
            density=post_density,
            flow_instability=float(post_metrics.get("flow_instability", 35.0)),
            budget_limit_hsk=min(remaining_budget, 25.0),
            exclude_provider_ids=exclude_provs,
            exclude_categories=exclude_cats
        )

        recommended_candidate = optimizer_res.get("selected_candidate")
        if not recommended_candidate or not recommended_candidate.get("feasibility"):
            # Fallback if category exclusion was too restrictive: allow category but forbid failed provider
            optimizer_res = intervention_optimizer.evaluate_incident(
                incident_id=f"rec_opt_fallback_{incident_id}_{attempt_number}",
                zone_id=zone_id,
                zone_name="Monitored Zone",
                crs_score=post_crs,
                density=post_density,
                budget_limit_hsk=min(remaining_budget, 25.0),
                exclude_provider_ids=exclude_provs
            )
            recommended_candidate = optimizer_res.get("selected_candidate")

        if recommended_candidate and recommended_candidate.get("feasibility"):
            action_type = (
                "SWITCH_SERVICE_STRATEGY"
                if recommended_candidate["service_category"] != failed_category
                else "RECOMMEND_ALTERNATIVE_PROVIDER"
            )
            justification = (
                f"Diagnosed '{diagnosis_code}'. "
                f"Recommended pivot from failed provider '{failed_provider_id}' ({failed_category}) "
                f"to alternative provider '{recommended_candidate['provider_name']}' ({recommended_candidate['service_category']}) "
                f"at {recommended_candidate['cost_hsk']} HSK (predicted drop: {recommended_candidate['predicted_crs_reduction']} CRS). "
                "Safe recovery requires explicit wallet authorization before broadcast."
            )
            recovery_plan = {
                "recovery_id": recovery_id,
                "incident_id": incident_id,
                "attempt_number": attempt_number,
                "max_attempts": max_attempts,
                "action_type": action_type,
                "diagnosis": {
                    "code": diagnosis_code,
                    "details": diagnosis_details,
                    "failed_provider": failed_provider_id,
                    "failed_strategy": failed_category
                },
                "recommended_candidate": recommended_candidate,
                "recommended_provider_id": recommended_candidate["provider_id"],
                "recommended_service_category": recommended_candidate["service_category"],
                "cost_hsk": recommended_candidate["cost_hsk"],
                "delegation_id": delegation_id,
                "budget_check_passed": True,
                "requires_authorization": True,
                "status": "PROPOSED",
                "justification": justification
            }
        else:
            action_type = "HALT_NO_FEASIBLE_ALTERNATIVE"
            justification = "No feasible alternative providers found within remaining delegation budget."
            recovery_plan = {
                "recovery_id": recovery_id,
                "incident_id": incident_id,
                "attempt_number": attempt_number,
                "max_attempts": max_attempts,
                "action_type": action_type,
                "diagnosis": {
                    "code": diagnosis_code,
                    "details": diagnosis_details,
                    "failed_provider": failed_provider_id
                },
                "status": "HALTED",
                "requires_authorization": True,
                "justification": justification
            }

        eval_id_to_persist = counterfactual_evaluation_id or evaluation.get("id", f"cfe_synth_{int(time.time_ns())}")
        self._persist_recovery_action(recovery_plan, failed_agreement_id, eval_id_to_persist, now)
        return recovery_plan

    def _persist_recovery_action(
        self,
        plan: Dict[str, Any],
        failed_agreement_id: str,
        counterfactual_evaluation_id: str,
        now: str
    ):
        with db_session() as conn:
            cursor = conn.cursor()
            cursor.execute("""
            INSERT INTO recovery_actions (
                id, incident_id, failed_agreement_id, evaluation_id, diagnosis,
                attempt_number, max_attempts, action_type, recommended_provider_id,
                recommended_service_category, budget_check_passed, delegation_check_passed,
                requires_authorization, justification, new_mandate_id, status, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, ?);
            """, (
                plan["recovery_id"],
                plan["incident_id"],
                failed_agreement_id,
                counterfactual_evaluation_id,
                json.dumps(plan["diagnosis"]),
                plan["attempt_number"],
                plan["max_attempts"],
                plan["action_type"],
                plan.get("recommended_provider_id"),
                plan.get("recommended_service_category"),
                1 if plan.get("budget_check_passed", True) else 0,
                1 if plan.get("budget_check_passed", True) else 0,
                1 if plan.get("requires_authorization", True) else 0,
                plan["justification"],
                plan["status"],
                now
            ))

        record_audit_event(
            event_type="RECOVERY_ACTION_PROPOSED",
            actor="recovery_engine",
            entity_type="RECOVERY_ACTION",
            entity_id=plan["recovery_id"],
            action="propose_bounded_recovery",
            details={
                "incident_id": plan["incident_id"],
                "failed_agreement_id": failed_agreement_id,
                "attempt_number": plan["attempt_number"],
                "action_type": plan["action_type"],
                "diagnosis_code": plan["diagnosis"]["code"],
                "recommended_provider": plan.get("recommended_provider_id")
            }
        )

    def list_recovery_actions(self, incident_id: Optional[str] = None) -> List[Dict[str, Any]]:
        """List recovery actions."""
        with db_session() as conn:
            cursor = conn.cursor()
            if incident_id:
                cursor.execute("SELECT * FROM recovery_actions WHERE incident_id = ? ORDER BY created_at DESC;", (incident_id,))
            else:
                cursor.execute("SELECT * FROM recovery_actions ORDER BY created_at DESC LIMIT 20;")
            rows = []
            for r in cursor.fetchall():
                d = dict(r)
                d["diagnosis"] = json.loads(d["diagnosis"] or "{}")
                rows.append(d)
            return rows


recovery_engine = SafeRecoveryEngine()
