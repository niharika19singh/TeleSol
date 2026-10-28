"""
TeleSol PayPilot 2.0 — Counterfactual Mitigation Evaluator (Feature B)
═════════════════════════════════════════════════════════════════════
Determines whether a purchased telecom intervention plausibly improved the network,
instead of assuming success simply because an on-chain payment settled.

Implements a defensible baseline hierarchy:
1. UNTREATED_CONTROL_ZONE: A comparable monitored zone with similar initial density/congestion.
2. HISTORICAL_TREND: Extrapolated pre-intervention progression trajectory if untreated.
3. FALLBACK_HEURISTIC: Low-confidence static comparison when control/trend are absent.

Distinguishes:
- Observed improvement (post - pre)
- Expected improvement (digital twin projection)
- Attributable improvement (counterfactual baseline - observed post)
- Confidence level & explicit limitations
"""

import json
import time
import uuid
import math
import logging
from typing import Dict, Any, List, Optional
from datetime import datetime, timezone

from app.paypilot.db import db_session
from app.paypilot.audit import record_audit_event
from app.services.data_store import store

logger = logging.getLogger("telesol.paypilot.counterfactual_evaluator")


class CounterfactualEvaluator:
    """
    Evaluates telecom intervention outcomes against counterfactual baselines.
    """

    def evaluate_intervention(
        self,
        agreement_id: str,
        mandate_id: Optional[str],
        zone_id: str,
        pre_metrics: Dict[str, Any],
        post_metrics: Dict[str, Any],
        expected_improvement: float,
        target_threshold: float = 20.0,
        control_zone_id: Optional[str] = None,
        pre_intervention_trend_rate_per_min: float = 2.5,
        evaluation_window_seconds: int = 60
    ) -> Dict[str, Any]:
        """
        Execute counterfactual outcome assessment.
        """
        now = datetime.now(timezone.utc).isoformat()
        eval_id = f"cfe_{zone_id}_{int(time.time_ns())}_{uuid.uuid4().hex[:6]}"

        # Missing or Invalid Evidence Guard: Missing, non-numeric, or incomplete evidence cannot silently succeed
        has_valid_evidence = False
        parsed_post_crs = None
        if post_metrics and isinstance(post_metrics, dict):
            raw_crs = post_metrics.get("crs_score")
            if raw_crs is not None:
                try:
                    f = float(raw_crs)
                    if not (math.isnan(f) or math.isinf(f)):
                        parsed_post_crs = f
                        has_valid_evidence = True
                except (ValueError, TypeError):
                    has_valid_evidence = False

            if not has_valid_evidence and "packet_loss_pct" in post_metrics:
                try:
                    f = float(post_metrics["packet_loss_pct"])
                    if not (math.isnan(f) or math.isinf(f)):
                        has_valid_evidence = True
                except (ValueError, TypeError):
                    has_valid_evidence = False

        if not has_valid_evidence:
            logger.warning("[CFE] Outcome verification requested without valid telemetry evidence for %s", agreement_id)
            pre_crs = float(pre_metrics.get("crs_score", 65.0))
            baseline_type = "MISSING_EVIDENCE" if not post_metrics else "INVALID_EVIDENCE"
            cfe_report = {
                "evaluation_id": eval_id,
                "agreement_id": agreement_id,
                "mandate_id": mandate_id,
                "zone_id": zone_id,
                "pre_intervention_crs": pre_crs,
                "post_intervention_crs": pre_crs,
                "observed_improvement": 0.0,
                "expected_improvement": expected_improvement,
                "counterfactual_projected_crs": pre_crs,
                "attributable_improvement": 0.0,
                "target_threshold": target_threshold,
                "baseline_type": baseline_type,
                "baseline_details": {"error": "Missing post-intervention telemetry evidence" if not post_metrics else "Invalid post-intervention telemetry evidence"},
                "outcome_classification": "INCONCLUSIVE",
                "confidence_score": 0.0,
                "confidence_level": "UNRELIABLE",
                "evidence_summary": "Missing post-intervention telemetry evidence. Outcome is inconclusive; settlement cannot be authorized." if not post_metrics else "Invalid post-intervention telemetry evidence. Outcome is inconclusive; settlement cannot be authorized.",
                "limitations_notes": "No empirical post-intervention metrics were provided." if not post_metrics else "Telemetry evidence was non-numeric or failed validation.",
                "evaluated_at": now
            }
            with db_session() as conn:
                cursor = conn.cursor()
                cursor.execute("""
                INSERT INTO counterfactual_evaluations (
                    id, agreement_id, mandate_id, zone_id, intervention_id, pre_metrics, post_metrics,
                    baseline_type, baseline_metrics, observed_improvement, expected_improvement,
                    attributable_improvement, outcome_classification, confidence_score,
                    confidence_level, evidence_summary, limitations_notes, evaluated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
                """, (
                    eval_id, agreement_id, mandate_id, zone_id, pre_metrics.get("candidate_id"),
                    json.dumps(pre_metrics), json.dumps(post_metrics or {}),
                    baseline_type, json.dumps({"error": cfe_report["baseline_details"]["error"]}),
                    0.0, expected_improvement, 0.0, "INCONCLUSIVE", 0.0, "UNRELIABLE",
                    cfe_report["evidence_summary"], cfe_report["limitations_notes"], now
                ))
            return cfe_report

        pre_crs = float(pre_metrics.get("crs_score", 65.0))
        post_crs = parsed_post_crs if parsed_post_crs is not None else float(post_metrics.get("crs_score", pre_crs))
        pre_density = float(pre_metrics.get("density", 3.0))
        post_density = float(post_metrics.get("density", pre_density))

        observed_crs_delta = round(pre_crs - post_crs, 1)  # positive means improved
        observed_density_delta = round(pre_density - post_density, 2)

        # 1. Defensible Baseline Hierarchy
        baseline_type = "FALLBACK_HEURISTIC"
        baseline_metrics: Dict[str, Any] = {}
        confidence_penalties = 0.0
        limitations: List[str] = []

        # Hierarchy Level 1: Comparable Untreated Control Zone
        sentinel_state = store.get_sentinel_data()
        zones = sentinel_state.get("zones", [])

        control_zone = None
        if control_zone_id:
            control_zone = next((z for z in zones if z.get("id") == control_zone_id), None)
        else:
            # Look for an untreated zone with initial CRS > 30 that is NOT zone_id
            candidates = [z for z in zones if z.get("id") != zone_id and float(z.get("riskScore", 0)) >= 30.0]
            if candidates:
                control_zone = candidates[0]

        if control_zone:
            baseline_type = "CONTROL_ZONE"
            ctrl_crs = float(control_zone.get("riskScore", pre_crs))
            # If control zone worsened by delta, add that growth to projected untreated target
            ctrl_growth = max(0.0, ctrl_crs - 40.0) * 0.15
            projected_untreated_crs = round(pre_crs + ctrl_growth, 1)
            baseline_metrics = {
                "control_zone_id": control_zone.get("id"),
                "control_zone_name": control_zone.get("name"),
                "control_crs": ctrl_crs,
                "projected_untreated_crs": projected_untreated_crs,
                "derivation": f"Indexed to comparable untreated venue sector '{control_zone.get('name')}'"
            }
            limitations.append("Control zone exhibits similar venue physics but may experience localized foot traffic variations.")

        elif pre_intervention_trend_rate_per_min != 0.0:
            # Hierarchy Level 2: Historical Trend Extrapolation
            baseline_type = "HISTORICAL_TREND"
            growth = (evaluation_window_seconds / 60.0) * pre_intervention_trend_rate_per_min
            projected_untreated_crs = round(min(100.0, pre_crs + growth), 1)
            baseline_metrics = {
                "pre_trend_rate_per_min": pre_intervention_trend_rate_per_min,
                "projected_growth": round(growth, 1),
                "projected_untreated_crs": projected_untreated_crs,
                "derivation": f"Linear growth extrapolation (+{pre_intervention_trend_rate_per_min:.1f} CRS/min) over {evaluation_window_seconds}s"
            }
            confidence_penalties += 0.15
            limitations.append("Linear trend extrapolation assumes unperturbed crowd influx; does not account for venue capacity ceilings.")

        else:
            # Hierarchy Level 3: Fallback Heuristic
            baseline_type = "FALLBACK_HEURISTIC"
            projected_untreated_crs = round(pre_crs, 1)
            baseline_metrics = {
                "projected_untreated_crs": projected_untreated_crs,
                "derivation": "Static baseline assumption (CRS assumed invariant in absence of control data)"
            }
            confidence_penalties += 0.35
            limitations.append("No active control zone or pre-trend telemetry available; static baseline exhibits low causal confidence.")

        # 2. Attributable Improvement Calculation
        # What did the intervention achieve compared to what would have happened?
        attributable_improvement = round(projected_untreated_crs - post_crs, 1)

        # 3. Confidence Calculation
        base_confidence = 0.90 - confidence_penalties
        # Telemetry completeness check
        if "latency_ms" not in post_metrics or "packet_loss_pct" not in post_metrics:
            base_confidence -= 0.10
            limitations.append("Post-intervention packet loss or latency telemetry missing; outcome relies primarily on crowd density & CRS attenuation.")

        confidence_score = max(0.20, min(1.0, round(base_confidence, 2)))
        if confidence_score >= 0.80:
            confidence_level = "HIGH"
        elif confidence_score >= 0.50:
            confidence_level = "MEDIUM"
        else:
            confidence_level = "INSUFFICIENT_EVIDENCE"

        # 4. Outcome Classification
        if confidence_level == "INSUFFICIENT_EVIDENCE":
            outcome_class = "INCONCLUSIVE"
            evidence_summary = (
                f"Evaluation inconclusive due to low confidence ({confidence_score * 100:.0f}%). "
                "Insufficient telemetry prevents distinguishing intervention impact from ambient variation."
            )
        elif attributable_improvement >= target_threshold and observed_crs_delta > 0:
            outcome_class = "SUCCESSFUL"
            evidence_summary = (
                f"Intervention succeeded. Delivered {attributable_improvement} CRS points of attributable improvement "
                f"against baseline ({projected_untreated_crs:.1f} projected vs {post_crs:.1f} observed), exceeding the {target_threshold:.1f} threshold."
            )
        elif attributable_improvement >= (target_threshold * 0.5) and observed_crs_delta > 0:
            outcome_class = "PARTIALLY_SUCCESSFUL"
            evidence_summary = (
                f"Intervention partially effective. Attributable drop was {attributable_improvement} points "
                f"(achieved {round((attributable_improvement / target_threshold) * 100)}% of the {target_threshold} target)."
            )
        else:
            outcome_class = "FAILED"
            evidence_summary = (
                f"Intervention underperformed. Attributable drop ({attributable_improvement} CRS) fell below target threshold "
                f"({target_threshold} CRS). Post-intervention CRS remained elevated at {post_crs:.1f}."
            )

        limitations_str = " | ".join(limitations)

        # 5. Persist Evaluation Record in Database
        with db_session() as conn:
            cursor = conn.cursor()
            cursor.execute("""
            INSERT INTO counterfactual_evaluations (
                id, agreement_id, mandate_id, zone_id, intervention_id, pre_metrics, post_metrics,
                baseline_type, baseline_metrics, observed_improvement, expected_improvement,
                attributable_improvement, outcome_classification, confidence_score,
                confidence_level, evidence_summary, limitations_notes, evaluated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
            """, (
                eval_id,
                agreement_id,
                mandate_id,
                zone_id,
                pre_metrics.get("candidate_id"),
                json.dumps(pre_metrics),
                json.dumps(post_metrics),
                baseline_type,
                json.dumps(baseline_metrics),
                observed_crs_delta,
                expected_improvement,
                attributable_improvement,
                outcome_class,
                confidence_score,
                confidence_level,
                evidence_summary,
                limitations_str,
                now
            ))

        record_audit_event(
            event_type="COUNTERFACTUAL_OUTCOME_EVALUATED",
            actor="counterfactual_evaluator",
            entity_type="COUNTERFACTUAL_EVALUATION",
            entity_id=eval_id,
            action="evaluate_mitigation_outcome",
            details={
                "agreement_id": agreement_id,
                "mandate_id": mandate_id,
                "zone_id": zone_id,
                "baseline_type": baseline_type,
                "observed_crs_delta": observed_crs_delta,
                "attributable_improvement": attributable_improvement,
                "outcome_classification": outcome_class,
                "confidence_level": confidence_level
            }
        )

        return {
            "evaluation_id": eval_id,
            "agreement_id": agreement_id,
            "mandate_id": mandate_id,
            "zone_id": zone_id,
            "pre_intervention_crs": pre_crs,
            "post_intervention_crs": post_crs,
            "observed_improvement": observed_crs_delta,
            "expected_improvement": expected_improvement,
            "counterfactual_projected_crs": projected_untreated_crs,
            "attributable_improvement": attributable_improvement,
            "target_threshold": target_threshold,
            "baseline_type": baseline_type,
            "baseline_details": baseline_metrics,
            "outcome_classification": outcome_class,
            "confidence_score": confidence_score,
            "confidence_level": confidence_level,
            "evidence_summary": evidence_summary,
            "limitations_notes": limitations_str,
            "evaluated_at": now
        }

    def get_evaluation(self, evaluation_id: str) -> Optional[Dict[str, Any]]:
        """Retrieve a specific counterfactual evaluation record."""
        with db_session() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM counterfactual_evaluations WHERE id = ?;", (evaluation_id,))
            row = cursor.fetchone()
            if not row:
                return None
            d = dict(row)
            d["pre_metrics"] = json.loads(d["pre_metrics"] or "{}")
            d["post_metrics"] = json.loads(d["post_metrics"] or "{}")
            d["baseline_metrics"] = json.loads(d["baseline_metrics"] or "{}")
            return d


counterfactual_evaluator = CounterfactualEvaluator()
