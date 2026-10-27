"""
TeleSol PayPilot 2.0 — Network Digital Twin & Intervention Optimizer (Feature A & E)
════════════════════════════════════════════════════════════════════════════════════
Evaluates candidate telecom interventions for a congestion incident before spending funds:
1. Accepts available metrics (CRS score, density, flow instability, latency, packet loss).
2. Distinguishes real measurements, simulated digital twin values, and assumed parameters.
3. Generates candidate interventions from the provider service catalogue.
4. Estimates expected outcome (CRS drop, latency drop, packet loss drop), cost, time to impact, and risk.
5. Ranks candidates deterministically using a transparent multi-attribute scoring function.
6. Recommends the optimal intervention subject to budget and delegation constraints.
7. Evaluates confidence based on evidence quality and freshness (Confidence-Aware Procurement).
"""

import json
import time
import uuid
import logging
from typing import Dict, Any, List, Optional
from datetime import datetime, timezone

from app.paypilot.db import db_session
from app.paypilot.audit import record_audit_event

logger = logging.getLogger("telesol.paypilot.intervention_optimizer")


class InterventionOptimizer:
    """
    Bounded Digital Twin and Intervention Optimizer for Telecom Congestion Mitigation.
    Evaluates, ranks, and recommends candidate interventions with full provenance.
    """

    def evaluate_incident(
        self,
        incident_id: str,
        zone_id: str,
        zone_name: str,
        crs_score: float,
        density: float = 3.0,
        flow_instability: float = 20.0,
        latency_ms: Optional[float] = None,
        packet_loss_pct: Optional[float] = None,
        bandwidth_utilization_pct: Optional[float] = None,
        affected_users: Optional[int] = None,
        budget_limit_hsk: float = 25.0,
        exclude_provider_ids: Optional[List[str]] = None,
        exclude_categories: Optional[List[str]] = None,
        weights: Optional[Dict[str, float]] = None
    ) -> Dict[str, Any]:
        """
        Evaluate candidate interventions and recommend the optimal intervention.
        Deterministic for identical inputs.
        """
        now = datetime.now(timezone.utc).isoformat()
        exclude_provs = set(exclude_provider_ids or [])
        exclude_cats = set(exclude_categories or [])

        # 1. Classify Data Provenance & Calculate Evidence Confidence (Feature E)
        real_measurements: Dict[str, Any] = {
            "zone_id": zone_id,
            "zone_name": zone_name,
            "crs_score": round(crs_score, 1),
            "density_people_per_m2": round(density, 2),
            "flow_instability_pct": round(flow_instability, 1),
        }
        if latency_ms is not None:
            real_measurements["latency_ms"] = round(latency_ms, 1)
        if packet_loss_pct is not None:
            real_measurements["packet_loss_pct"] = round(packet_loss_pct, 1)
        if bandwidth_utilization_pct is not None:
            real_measurements["bandwidth_utilization_pct"] = round(bandwidth_utilization_pct, 1)

        # Confidence Scoring: based on completeness of real measurements and QoS telemetry
        qos_metrics = [k for k in ("latency_ms", "packet_loss_pct", "bandwidth_utilization_pct") if k in real_measurements]
        if len(qos_metrics) >= 2:
            confidence_score = 0.95
            confidence_level = "HIGH"
            confidence_notes = "Full telemetry set present (sensors, latency, packet loss, bandwidth)."
        elif len(qos_metrics) == 1:
            confidence_score = 0.70
            confidence_level = "MEDIUM"
            confidence_notes = "Partial telemetry; some QoS metrics estimated via crowd density proxy."
        else:
            confidence_score = 0.40
            confidence_level = "LOW"
            confidence_notes = "Sparse telemetry; missing real QoS latency/loss metrics, high uncertainty in digital twin projections."

        # Proxies if latency/loss missing
        base_latency = latency_ms if latency_ms is not None else round(20.0 + (crs_score * 0.8) + (density * 5.0), 1)
        base_loss = packet_loss_pct if packet_loss_pct is not None else round(min(25.0, (crs_score / 100.0) ** 2 * 20.0), 1)
        base_users = affected_users if affected_users is not None else int(density * 180)

        assumed_values = {
            "venue_sector_area_m2": 180,
            "standard_slice_capacity_mbps": 500,
            "max_budget_limit_hsk": budget_limit_hsk,
            "telecom_brownout_crs_threshold": 75.0,
            "flow_chokepoint_instability_threshold": 45.0
        }

        # 2. Query Available Providers from Database
        with db_session() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM providers ORDER BY unit_price ASC;")
            rows = [dict(r) for r in cursor.fetchall()]

        # 3. Formulate Candidate Interventions
        # Scoring weights
        w_imp = (weights or {}).get("impact", 0.45)
        w_cost = (weights or {}).get("cost", 0.25)
        w_speed = (weights or {}).get("speed", 0.15)
        w_risk = (weights or {}).get("risk", 0.15)

        candidates: List[Dict[str, Any]] = []

        for p in rows:
            pid = p["id"]
            p_cat = p["category"]
            p_price = float(p["unit_price"])
            p_name = p["name"]
            p_verified = bool(p["verified"])

            if pid in exclude_provs or p_cat in exclude_cats:
                continue

            # Digital Twin simulation parameters per category
            if p_cat == "TELECOM_BANDWIDTH":
                # High impact on throughput, latency, loss, and high CRS
                imp_scale = min(1.0, crs_score / 80.0)
                pred_crs_drop = round(min(55.0, 15.0 + (crs_score * 0.45 * imp_scale)), 1)
                pred_latency_drop = round(min(base_latency * 0.65, 45.0), 1)
                pred_loss_drop = round(min(base_loss * 0.80, 15.0), 1)
                time_to_impact = 45  # seconds
                risk_score = 0.10 if p_verified else 0.30
                mechanism = "Direct 5G cellular uplink allocation; relieves RF congestion"

            elif p_cat == "EDGE_COMPUTE":
                # High impact on bottleneck recognition & flow instability
                flow_factor = min(1.0, flow_instability / 50.0)
                pred_crs_drop = round(min(40.0, 10.0 + (crs_score * 0.35 * flow_factor)), 1)
                pred_latency_drop = round(min(base_latency * 0.35, 20.0), 1)
                pred_loss_drop = round(min(base_loss * 0.40, 6.0), 1)
                time_to_impact = 75  # seconds
                risk_score = 0.15 if p_verified else 0.35
                mechanism = "Localized computer vision container detects physical bottleneck gates"

            elif p_cat == "SENSOR_DATA":
                # Fast telemetry enhancement, lower direct CRS drop
                pred_crs_drop = round(min(25.0, 8.0 + (crs_score * 0.20)), 1)
                pred_latency_drop = round(min(base_latency * 0.15, 10.0), 1)
                pred_loss_drop = round(min(base_loss * 0.20, 3.0), 1)
                time_to_impact = 25  # seconds
                risk_score = 0.08 if p_verified else 0.25
                mechanism = "Spatial mmWave radar stream sharpens density gradient tracking"

            elif p_cat == "ROUTING_AI":
                # Macro transit diversion, slower activation
                pred_crs_drop = round(min(35.0, 12.0 + (crs_score * 0.30)), 1)
                pred_latency_drop = round(min(base_latency * 0.25, 15.0), 1)
                pred_loss_drop = round(min(base_loss * 0.30, 5.0), 1)
                time_to_impact = 120  # seconds
                risk_score = 0.20 if p_verified else 0.40
                mechanism = "Transit feeder rerouting disperses approaching foot traffic"

            else:
                pred_crs_drop = round(crs_score * 0.20, 1)
                pred_latency_drop = 5.0
                pred_loss_drop = 1.0
                time_to_impact = 60
                risk_score = 0.30
                mechanism = f"Standard {p_cat} intervention"

            is_within_budget = p_price <= budget_limit_hsk
            feasibility = is_within_budget and p.get("status", "ACTIVE") == "ACTIVE"

            # Normalization for scoring (higher is better, 0.0 to 1.0)
            norm_impact = min(1.0, max(0.0, pred_crs_drop / 50.0))
            norm_cost = 1.0 - min(1.0, max(0.0, p_price / max(budget_limit_hsk, 1.0)))
            norm_speed = 1.0 - min(1.0, max(0.0, time_to_impact / 180.0))
            norm_safety = 1.0 - risk_score

            utility_score = (
                (w_imp * norm_impact) +
                (w_cost * norm_cost) +
                (w_speed * norm_speed) +
                (w_risk * norm_safety)
            )

            # Infeasible penalty
            if not feasibility:
                utility_score *= 0.1

            utility_score = round(utility_score, 4)

            candidate = {
                "candidate_id": f"cand_{pid}_{p_cat}",
                "provider_id": pid,
                "provider_name": p_name,
                "provider_address": p["payment_address"],
                "service_category": p_cat,
                "cost_hsk": p_price,
                "asset": p["asset"],
                "is_within_budget": is_within_budget,
                "feasibility": feasibility,
                "feasibility_reason": "Within budget and active" if feasibility else f"Exceeds budget ceiling ({p_price} > {budget_limit_hsk} HSK)" if not is_within_budget else "Provider not active",
                "predicted_crs_reduction": pred_crs_drop,
                "predicted_post_crs": max(0.0, round(crs_score - pred_crs_drop, 1)),
                "predicted_latency_drop_ms": pred_latency_drop,
                "predicted_packet_loss_drop_pct": pred_loss_drop,
                "expected_time_to_impact_seconds": time_to_impact,
                "risk_score": risk_score,
                "mechanism_description": mechanism,
                "utility_score": utility_score,
                "simulated_values": {
                    "predicted_crs_reduction": pred_crs_drop,
                    "predicted_latency_drop_ms": pred_latency_drop,
                    "predicted_packet_loss_drop_pct": pred_loss_drop,
                    "model_type": "BOUNDED_CROWD_TELECOM_DIGITAL_TWIN_V1"
                }
            }
            candidates.append(candidate)

        # 4. Deterministic Ranking (Utility Score Descending, then Cost Ascending)
        candidates.sort(key=lambda c: (-c["utility_score"], c["cost_hsk"]))

        # 5. Selection & Explanation Rationale
        feasible_candidates = [c for c in candidates if c["feasibility"]]
        if feasible_candidates:
            selected = feasible_candidates[0]
            # Explain why selected outperforms runners-up
            runners_up = [c for c in feasible_candidates[1:3]]
            runner_notes = []
            for r in runners_up:
                if selected["predicted_crs_reduction"] > r["predicted_crs_reduction"]:
                    runner_notes.append(f"{selected['predicted_crs_reduction']} vs {r['predicted_crs_reduction']} CRS drop over {r['provider_name']}")
                elif selected["cost_hsk"] < r["cost_hsk"]:
                    runner_notes.append(f"lower cost ({selected['cost_hsk']} vs {r['cost_hsk']} HSK) compared to {r['provider_name']}")
                else:
                    runner_notes.append(f"faster time to impact ({selected['expected_time_to_impact_seconds']}s vs {r['expected_time_to_impact_seconds']}s) over {r['provider_name']}")

            comparison_str = "; ".join(runner_notes) if runner_notes else "sole qualified candidate within budget"
            rationale = (
                f"Selected '{selected['provider_name']}' ({selected['service_category']}) as optimal intervention. "
                f"Addresses incident CRS {crs_score:.1f} with predicted drop of {selected['predicted_crs_reduction']} points "
                f"at {selected['cost_hsk']} {selected['asset']} ({selected['expected_time_to_impact_seconds']}s to impact). "
                f"Outperformed alternatives due to: {comparison_str}."
            )
        else:
            selected = candidates[0] if candidates else None
            rationale = "No candidates met feasibility and budget constraints; highest score candidate requires review."

        evaluation_id = f"intev_{zone_id}_{int(time.time_ns())}_{uuid.uuid4().hex[:6]}"

        # 6. Persist to Database
        with db_session() as conn:
            cursor = conn.cursor()
            cursor.execute("""
            INSERT INTO intervention_evaluations (
                id, incident_id, zone_id, zone_name, baseline_metrics, data_provenance,
                candidates, selected_candidate, selection_rationale, confidence_score,
                confidence_level, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
            """, (
                evaluation_id,
                incident_id,
                zone_id,
                zone_name,
                json.dumps(real_measurements),
                json.dumps({"real": real_measurements, "simulated": assumed_values}),
                json.dumps(candidates),
                json.dumps(selected or {}),
                rationale,
                confidence_score,
                confidence_level,
                now
            ))

        record_audit_event(
            event_type="INTERVENTION_OPTIMIZED",
            actor="intervention_optimizer",
            entity_type="INTERVENTION_EVALUATION",
            entity_id=evaluation_id,
            action="evaluate_and_rank_interventions",
            details={
                "incident_id": incident_id,
                "zone_id": zone_id,
                "candidates_evaluated": len(candidates),
                "selected_provider": selected["provider_id"] if selected else "NONE",
                "predicted_crs_reduction": selected["predicted_crs_reduction"] if selected else 0,
                "confidence_level": confidence_level
            }
        )

        return {
            "evaluation_id": evaluation_id,
            "incident_id": incident_id,
            "zone_id": zone_id,
            "zone_name": zone_name,
            "baseline_metrics": real_measurements,
            "data_provenance": {
                "real_measurements": real_measurements,
                "simulated_values": {
                    "base_latency_proxy_ms": base_latency,
                    "base_packet_loss_proxy_pct": base_loss,
                    "affected_users_estimate": base_users
                },
                "assumed_values": assumed_values
            },
            "candidates": candidates,
            "selected_candidate": selected,
            "selection_rationale": rationale,
            "confidence_score": confidence_score,
            "confidence_level": confidence_level,
            "confidence_notes": confidence_notes,
            "proceed_to_procurement": confidence_level in ("HIGH", "MEDIUM") and (selected and selected["feasibility"]),
            "evaluated_at": now
        }

    def list_evaluations(self, limit: int = 20) -> List[Dict[str, Any]]:
        """List historical intervention evaluations."""
        with db_session() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM intervention_evaluations ORDER BY created_at DESC LIMIT ?;", (limit,))
            rows = []
            for r in cursor.fetchall():
                d = dict(r)
                d["baseline_metrics"] = json.loads(d["baseline_metrics"] or "{}")
                d["data_provenance"] = json.loads(d["data_provenance"] or "{}")
                d["candidates"] = json.loads(d["candidates"] or "[]")
                d["selected_candidate"] = json.loads(d["selected_candidate"] or "{}")
                rows.append(d)
            return rows


intervention_optimizer = InterventionOptimizer()
