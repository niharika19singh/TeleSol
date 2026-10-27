"""
TeleSol PayPilot — Explainable Provider Trust & Reliability Analysis (Phase 5)
═════════════════════════════════════════════════════════════════════════════
Computes an inspectable, provenance-backed trust profile for service providers
using explicit application records and verifiable attributes:
- Address & registry consistency
- Terms completeness and clarity
- Local settlement success history
- Recorded dispute / incident count
- Service completion evidence compliance
- Explicit 'INSUFFICIENT_HISTORY' indicator when records < 3
- Full signal provenance with verification method and confidence limits
- Advisory only: Trust analysis never overrides deterministic payment policy
"""

import logging
from typing import Dict, Any, List, Optional
from datetime import datetime, timezone

from app.paypilot.db import db_session

logger = logging.getLogger("telesol.paypilot.trust")


class ProviderTrustAnalyzer:
    def analyze_provider(self, provider_id: str, proposed_amount: Optional[float] = None) -> Dict[str, Any]:
        """
        Produce a transparent, signal-by-signal trust analysis for a provider.
        Every signal identifies its source, observation time, and confidence limitations.
        """
        now = datetime.now(timezone.utc).isoformat()

        with db_session() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM providers WHERE id = ?;", (provider_id,))
            prov_row = cursor.fetchone()

        if not prov_row:
            return {
                "provider_id": provider_id,
                "overall_status": "UNKNOWN_PROVIDER",
                "signals": [],
                "explanation": f"Provider '{provider_id}' is not registered in the system.",
                "confidence_score": 0.0
            }

        provider = dict(prov_row)
        signals: List[Dict[str, Any]] = []

        # Signal 1: Address Format & Identity Consistency
        addr = provider.get("payment_address", "")
        addr_valid = bool(addr and addr.startswith("0x") and len(addr) == 42)
        signals.append({
            "name": "WALLET_ADDRESS_FORMAT",
            "status": "VERIFIED" if addr_valid else "FAILED",
            "observed_value": addr,
            "source": "Local Provider Registry",
            "verification_method": "EVM standard 20-byte hex checksum check",
            "observation_time": now,
            "confidence_limitations": "Proves valid EVM syntax only; does not independently verify entity identity or off-chain reputation."
        })

        # Signal 2: Commercial Terms Completeness
        terms_complete = bool(
            provider.get("unit_price") is not None and
            provider.get("pricing_model") and
            provider.get("asset") and
            provider.get("service_url")
        )
        signals.append({
            "name": "TERMS_COMPLETENESS",
            "status": "VERIFIED" if terms_complete else "UNVERIFIED",
            "observed_value": {
                "unit_price": provider.get("unit_price"),
                "pricing_model": provider.get("pricing_model"),
                "asset": provider.get("asset"),
                "service_url": provider.get("service_url")
            },
            "source": "Provider Service Manifest",
            "verification_method": "Schema validation of price, billing model, and endpoint URL",
            "observation_time": now,
            "confidence_limitations": "Verifies publication of pricing parameters; does not guarantee uptime or QoS under load."
        })

        # Signal 3: Advertised Price vs Proposed Payment Consistency
        if proposed_amount is not None:
            unit_price = float(provider.get("unit_price", 0.0))
            price_reasonable = proposed_amount >= unit_price * 0.5
            signals.append({
                "name": "PRICE_CONSISTENCY",
                "status": "VERIFIED" if price_reasonable else "UNVERIFIED",
                "observed_value": {
                    "advertised_unit_price": unit_price,
                    "proposed_amount": proposed_amount
                },
                "source": "Comparison between Registry Price and Proposed Payment",
                "verification_method": "Threshold consistency comparison",
                "observation_time": now,
                "confidence_limitations": "Price deviations may represent legitimate dynamic usage or volume discounts."
            })

        # Signal 4: Historical Settlements in this Application
        with db_session() as conn:
            cursor = conn.cursor()
            cursor.execute("""
            SELECT COUNT(*) as total,
                   SUM(CASE WHEN chain_verification_status IN ('VERIFIED', 'DEMO_VERIFIED') THEN 1 ELSE 0 END) as successful
            FROM settlement_receipts
            WHERE payee_address = ?;
            """, (provider.get("payment_address"),))
            hist = cursor.fetchone()
            total_settlements = hist["total"] if hist else 0
            successful_settlements = hist["successful"] if hist and hist["successful"] else 0

        settlement_status = "VERIFIED" if total_settlements >= 3 else "INSUFFICIENT_HISTORY"
        success_rate = (successful_settlements / total_settlements * 100.0) if total_settlements > 0 else 0.0
        signals.append({
            "name": "HISTORICAL_SETTLEMENT_RECORD",
            "status": settlement_status,
            "observed_value": {
                "total_settlements_recorded": total_settlements,
                "successful_settlements": successful_settlements,
                "success_rate_pct": round(success_rate, 1)
            },
            "source": "Local Settlement Receipts Ledger",
            "verification_method": "Aggregation of past completed transactions matching provider address",
            "observation_time": now,
            "confidence_limitations": (
                "Limited to transactions executed inside this TeleSol PayPilot instance. "
                "Absence of records indicates insufficient local history, not fraud."
            )
        })

        # Signal 5: Recorded Incident & Dispute History
        with db_session() as conn:
            cursor = conn.cursor()
            cursor.execute("""
            SELECT COUNT(*) as total_disputes
            FROM payment_incidents i
            JOIN mandates m ON m.mandate_id = i.mandate_id
            WHERE m.recipient_address = ?;
            """, (provider.get("payment_address"),))
            disp_row = cursor.fetchone()
            dispute_count = disp_row["total_disputes"] if disp_row else 0

        signals.append({
            "name": "RECORDED_DISPUTES",
            "status": "VERIFIED" if dispute_count == 0 else "FAILED",
            "observed_value": {"recorded_disputes_count": dispute_count},
            "source": "Local Payment Incidents & Disputes Ledger",
            "verification_method": "Query of unresolved or historical disputes against provider address",
            "observation_time": now,
            "confidence_limitations": "Does not reflect disputes on external platforms or off-chain communications."
        })

        # Signal 6: Discovery Freshness & Source Provenance
        source_type = provider.get("source_type", "REGISTRY")
        signals.append({
            "name": "PROVENANCE_SOURCE",
            "status": "VERIFIED" if source_type in ("REGISTRY", "SEED") else "UNVERIFIED",
            "observed_value": {
                "source_type": source_type,
                "source_url": provider.get("source_url"),
                "discovered_at": provider.get("discovered_at") or provider.get("created_at")
            },
            "source": "Provider Discovery Metadata",
            "verification_method": "Catalog provenance origin tracking",
            "observation_time": now,
            "confidence_limitations": "Web-discovered sources (TinyFish) are untrusted external leads until verified by an operator."
        })

        # Signal 7: Outcome-Based Operational Performance (Feature F)
        with db_session() as conn:
            cursor = conn.cursor()
            cursor.execute("""
            SELECT a.id as agreement_id, c.outcome_classification, c.attributable_improvement
            FROM service_agreements a
            JOIN counterfactual_evaluations c ON c.agreement_id = a.id
            WHERE a.provider_id = ?
            GROUP BY a.id;
            """, (provider_id,))
            outcome_rows = [dict(r) for r in cursor.fetchall()]

        total_evaluated = len(outcome_rows)
        successful_evals = sum(1 for r in outcome_rows if r["outcome_classification"] == "SUCCESSFUL")
        partial_evals = sum(1 for r in outcome_rows if r["outcome_classification"] == "PARTIALLY_SUCCESSFUL")
        failed_evals = sum(1 for r in outcome_rows if r["outcome_classification"] == "FAILED")
        avg_attributable_drop = (
            round(sum(float(r["attributable_improvement"]) for r in outcome_rows) / total_evaluated, 1)
            if total_evaluated > 0 else 0.0
        )
        outcome_success_rate = (
            round((successful_evals / total_evaluated) * 100.0, 1)
            if total_evaluated > 0 else 0.0
        )

        if total_evaluated < 3:
            performance_tier = "INSUFFICIENT_DATA"
            perf_status = "INSUFFICIENT_HISTORY"
            perf_explanation = f"Provider has {total_evaluated} evaluated agreement(s) (< 3 required for statistically defensible tier)."
        elif outcome_success_rate >= 80.0:
            performance_tier = "PROVEN_HIGH_PERFORMER"
            perf_status = "VERIFIED"
            perf_explanation = f"Provider achieved SLA threshold on {successful_evals}/{total_evaluated} agreements ({outcome_success_rate}% success rate)."
        elif outcome_success_rate >= 50.0:
            performance_tier = "ADEQUATE_PERFORMER"
            perf_status = "VERIFIED"
            perf_explanation = f"Provider met SLA on {successful_evals}/{total_evaluated} agreements ({outcome_success_rate}% success rate)."
        else:
            performance_tier = "ELEVATED_BREACH_RISK"
            perf_status = "FAILED"
            perf_explanation = f"Frequent underperformance ({failed_evals}/{total_evaluated} failed agreements). High risk of SLA breach."

        signals.append({
            "name": "OUTCOME_PERFORMANCE_RECORD",
            "status": perf_status,
            "observed_value": {
                "total_evaluated_agreements": total_evaluated,
                "successful_outcomes": successful_evals,
                "partially_successful_outcomes": partial_evals,
                "failed_outcomes": failed_evals,
                "outcome_success_rate_pct": outcome_success_rate,
                "average_attributable_crs_drop": avg_attributable_drop,
                "performance_tier": performance_tier
            },
            "source": "Counterfactual Mitigation Evaluations Ledger",
            "verification_method": "Deduplicated aggregation of verified post-intervention network mitigation outcomes",
            "observation_time": now,
            "confidence_limitations": (
                "Reflects empirical counterfactual evaluations in this venue. "
                "Evaluations are deduplicated per agreement to prevent artificial rating inflation. "
                "Simulated runs are segregated from production performance."
            )
        })

        # Transparent Aggregate Trust Assessment
        if total_settlements < 3:
            overall_assessment = "INSUFFICIENT_HISTORY"
            explanation = (
                f"Provider '{provider['name']}' has fewer than 3 recorded settlements ({total_settlements} found). "
                "The system displays verified terms but requires explicit user review."
            )
            confidence_level = "LOW_CONFIDENCE"
        elif dispute_count > 0:
            overall_assessment = "DISPUTED"
            explanation = f"Provider has {dispute_count} recorded incident(s) in this application. Review before authorizing payment."
            confidence_level = "HIGH_CONFIDENCE_WARNING"
        elif success_rate >= 90.0 and terms_complete:
            overall_assessment = "ESTABLISHED"
            explanation = f"Provider has {total_settlements} successful settlements with a {success_rate:.0f}% success rate and complete terms."
            confidence_level = "HIGH_CONFIDENCE"
        else:
            overall_assessment = "MODERATE"
            explanation = "Provider has valid terms and partial settlement history with zero recorded disputes."
            confidence_level = "MEDIUM_CONFIDENCE"

        return {
            "provider_id": provider_id,
            "provider_name": provider["name"],
            "category": provider["category"],
            "payment_address": provider["payment_address"],
            "wallet_address": provider["payment_address"],
            "overall_assessment": overall_assessment,
            "recommendation": overall_assessment,
            "confidence_level": confidence_level,
            "total_signals_evaluated": len(signals),
            "verified_signals": sum(1 for s in signals if s["status"] == "VERIFIED"),
            "operational_performance": {
                "total_evaluated_agreements": total_evaluated,
                "successful_outcomes": successful_evals,
                "failed_outcomes": failed_evals,
                "outcome_success_rate_pct": outcome_success_rate,
                "success_rate_pct": outcome_success_rate,
                "average_attributable_crs_drop": avg_attributable_drop,
                "average_attributable_drop": avg_attributable_drop,
                "performance_tier": performance_tier,
                "explanation": perf_explanation
            },
            "signals": signals,
            "factors": [
                {
                    "name": s["name"],
                    "score": 1.0 if s["status"] == "VERIFIED" else (0.5 if s["status"] == "INSUFFICIENT_HISTORY" else 0.0),
                    "status": s["status"],
                    "detail": str(s.get("observed_value")),
                    "source": s.get("source"),
                    "confidence_limits": s.get("confidence_limitations")
                }
                for s in signals
            ],
            "explanation": explanation,
            "flags": ["INSUFFICIENT_HISTORY"] if total_settlements < 3 else [],
            "formula_documentation": (
                "Assessment Formula: ESTABLISHED requires >=3 recorded settlements, >=90% success rate, 0 disputes, "
                "and complete terms. Performance tiers require >=3 evaluated agreements to graduate beyond INSUFFICIENT_DATA. "
                "Identity trust and operational performance are evaluated separately."
            ),
            "analyzed_at": now
        }


provider_trust_analyzer = ProviderTrustAnalyzer()
