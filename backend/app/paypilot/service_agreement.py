"""
TeleSol PayPilot — Service Agreement & Task Context Layer (Phase 2)
════════════════════════════════════════════════════════════════════
Binds discovered service provider terms to structured service agreements:
- Generates canonical agreement terms per RFC 8785.
- Computes SHA-256 agreement_hash.
- Enforces strict tamper detection before payment authorization:
  recalculates agreement hash and rejects if amount, recipient, asset,
  chain, or scope differs from the approved terms.
"""

import time
import uuid
import logging
from typing import Dict, Any, Optional, Tuple
from datetime import datetime, timezone

from app.paypilot.db import db_session
from app.paypilot.canonical import canonical_json, hash_canonical_json
from app.paypilot.audit import record_audit_event

logger = logging.getLogger("telesol.paypilot.agreement")


class ServiceAgreementService:
    def create_agreement(
        self,
        task_id: str,
        requesting_agent_id: str,
        provider_id: str,
        provider_address: str,
        service_category: str,
        service_description: str,
        agreed_price: float,
        asset: str,
        max_authorized_amount: float,
        expected_deliverables: str,
        expected_completion_time: str,
        network_id: int = 133,
        evidence_required: str = "COMPLETION_TELEMETRY",
        target_metric: str = "CRS_REDUCTION",
        baseline_value: float = 0.0,
        target_threshold: float = 20.0,
        measurement_window_seconds: int = 60
    ) -> Dict[str, Any]:
        """
        Create a canonical service agreement with a cryptographic hash.
        Stores canonical representation and returns the agreement record.
        """
        now = datetime.now(timezone.utc).isoformat()
        agreement_id = f"agr_{int(time.time_ns())}_{uuid.uuid4().hex[:6]}"

        canonical_dict = {
            "agreement_id": agreement_id,
            "agreed_price": float(agreed_price),
            "asset": str(asset).upper(),
            "expected_deliverables": str(expected_deliverables).strip(),
            "max_authorized_amount": float(max_authorized_amount),
            "network_id": int(network_id),
            "provider_address": str(provider_address).strip(),
            "provider_id": str(provider_id).strip(),
            "requesting_agent_id": str(requesting_agent_id).strip(),
            "service_category": str(service_category).strip(),
            "task_id": str(task_id).strip()
        }

        canonical_terms = canonical_json(canonical_dict)
        agreement_hash = hash_canonical_json(canonical_dict)

        with db_session() as conn:
            cursor = conn.cursor()
            cursor.execute("""
            INSERT INTO service_agreements (
                id, task_id, requesting_agent_id, provider_id, provider_address,
                service_category, service_description, agreed_price, asset, max_authorized_amount,
                expected_deliverables, expected_completion_time, network_id, evidence_required,
                canonical_terms, agreement_hash, status,
                target_metric, baseline_value, target_threshold, measurement_window_seconds,
                evaluation_status, settlement_eligibility, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ACCEPTED', ?, ?, ?, ?, 'OUTCOME_PENDING', 'IMMEDIATE_PAID_OUTCOME_UNVERIFIED', ?, ?);
            """, (
                agreement_id,
                task_id,
                requesting_agent_id,
                provider_id,
                provider_address,
                service_category,
                service_description,
                float(agreed_price),
                asset.upper(),
                float(max_authorized_amount),
                expected_deliverables,
                expected_completion_time,
                int(network_id),
                evidence_required,
                canonical_terms,
                agreement_hash,
                target_metric,
                float(baseline_value),
                float(target_threshold),
                int(measurement_window_seconds),
                now,
                now
            ))

        record_audit_event(
            event_type="SERVICE_AGREEMENT_CREATED",
            actor=requesting_agent_id,
            entity_type="SERVICE_AGREEMENT",
            entity_id=agreement_id,
            action="create_service_agreement",
            details={
                "task_id": task_id,
                "provider_id": provider_id,
                "agreed_price": agreed_price,
                "asset": asset,
                "agreement_hash": agreement_hash,
                "target_metric": target_metric,
                "target_threshold": target_threshold
            }
        )

        return {
            "agreement_id": agreement_id,
            "id": agreement_id,
            "task_id": task_id,
            "requesting_agent_id": requesting_agent_id,
            "provider_id": provider_id,
            "provider_address": provider_address,
            "service_category": service_category,
            "service_description": service_description,
            "agreed_price": agreed_price,
            "asset": asset.upper(),
            "max_authorized_amount": max_authorized_amount,
            "expected_deliverables": expected_deliverables,
            "expected_completion_time": expected_completion_time,
            "network_id": network_id,
            "evidence_required": evidence_required,
            "canonical_terms": canonical_terms,
            "agreement_hash": agreement_hash,
            "status": "ACCEPTED",
            "target_metric": target_metric,
            "baseline_value": baseline_value,
            "target_threshold": target_threshold,
            "measurement_window_seconds": measurement_window_seconds,
            "evaluation_status": "OUTCOME_PENDING",
            "settlement_eligibility": "IMMEDIATE_PAID_OUTCOME_UNVERIFIED",
            "created_at": now
        }

    def record_outcome_evaluation(
        self,
        agreement_id: str,
        evaluation_id: str,
        outcome_classification: str,
        outcome_notes: str = ""
    ) -> Dict[str, Any]:
        """
        Record outcome evaluation status separately from payment settlement (Feature C).
        Separates payment settlement from verified mitigation delivery.
        """
        now = datetime.now(timezone.utc).isoformat()
        if outcome_classification == "SUCCESSFUL":
            eval_status = "OUTCOME_VERIFIED"
            settlement_eligibility = "PERFORMANCE_SATISFIED"
        elif outcome_classification == "FAILED":
            eval_status = "OUTCOME_FAILED"
            settlement_eligibility = "PERFORMANCE_BREACH_REFUND_SIMULATED"
        else:
            eval_status = "INSUFFICIENT_EVIDENCE"
            settlement_eligibility = "INCONCLUSIVE_DISPUTE_HOLD"

        with db_session() as conn:
            cursor = conn.cursor()
            cursor.execute("""
            UPDATE service_agreements
            SET evaluation_status = ?, settlement_eligibility = ?,
                outcome_evaluation_id = ?, outcome_notes = ?, updated_at = ?
            WHERE id = ?;
            """, (eval_status, settlement_eligibility, evaluation_id, outcome_notes, now, agreement_id))

        record_audit_event(
            event_type="AGREEMENT_OUTCOME_EVALUATED",
            actor="counterfactual_evaluator",
            entity_type="SERVICE_AGREEMENT",
            entity_id=agreement_id,
            action="record_outcome_evaluation",
            details={
                "evaluation_id": evaluation_id,
                "evaluation_status": eval_status,
                "settlement_eligibility": settlement_eligibility,
                "outcome_classification": outcome_classification
            }
        )

        return self.get_agreement(agreement_id)

    def update_status(self, agreement_id: str, new_status: str) -> Optional[Dict[str, Any]]:
        """Update agreement status (e.g., EXECUTED or DISPUTED)."""
        now = datetime.now(timezone.utc).isoformat()
        with db_session() as conn:
            cursor = conn.cursor()
            cursor.execute("UPDATE service_agreements SET status = ?, updated_at = ? WHERE id = ?;", (new_status, now, agreement_id))
        return self.get_agreement(agreement_id)

    def get_agreement(self, agreement_id: str) -> Optional[Dict[str, Any]]:
        """Retrieve service agreement by ID."""
        with db_session() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM service_agreements WHERE id = ?;", (agreement_id,))
            row = cursor.fetchone()
        return dict(row) if row else None

    def validate_payment_binding(
        self,
        agreement_id: str,
        proposed_amount: float,
        proposed_recipient: str,
        proposed_asset: str,
        proposed_network_id: int
    ) -> Tuple[bool, Optional[str], Optional[Dict[str, Any]]]:
        """
        Cryptographically verify that a proposed payment matches the approved agreement.
        Returns: (is_valid, error_reason, agreement_dict)
        """
        agreement = self.get_agreement(agreement_id)
        if not agreement:
            return False, f"Service agreement '{agreement_id}' not found.", None

        # Verify agreement hash integrity
        canonical_dict = {
            "agreement_id": agreement["id"],
            "agreed_price": float(agreement["agreed_price"]),
            "asset": str(agreement["asset"]).upper(),
            "expected_deliverables": str(agreement["expected_deliverables"]).strip(),
            "max_authorized_amount": float(agreement["max_authorized_amount"]),
            "network_id": int(agreement["network_id"]),
            "provider_address": str(agreement["provider_address"]).strip(),
            "provider_id": str(agreement["provider_id"]).strip(),
            "requesting_agent_id": str(agreement["requesting_agent_id"]).strip(),
            "service_category": str(agreement["service_category"]).strip(),
            "task_id": str(agreement["task_id"]).strip()
        }
        recomputed_hash = hash_canonical_json(canonical_dict)
        if recomputed_hash != agreement["agreement_hash"]:
            return False, "Agreement tampering detected: Stored agreement hash does not match canonical terms.", agreement

        # Check amount against max_authorized_amount
        if proposed_amount > float(agreement["max_authorized_amount"]):
            return False, (
                f"Proposed amount ({proposed_amount} {proposed_asset}) exceeds maximum "
                f"authorized amount ({agreement['max_authorized_amount']} {agreement['asset']}) in agreement."
            ), agreement

        # Check recipient
        if proposed_recipient.lower() != agreement["provider_address"].lower():
            return False, (
                f"Recipient address mismatch: Proposed recipient '{proposed_recipient}' does not match "
                f"agreed provider address '{agreement['provider_address']}'."
            ), agreement

        # Check asset
        if proposed_asset.upper() != agreement["asset"].upper():
            return False, (
                f"Asset mismatch: Proposed asset '{proposed_asset}' does not match agreed asset '{agreement['asset']}'."
            ), agreement

        # Check network
        if int(proposed_network_id) != int(agreement["network_id"]):
            return False, (
                f"Network mismatch: Proposed chain ID {proposed_network_id} does not match agreed chain ID {agreement['network_id']}."
            ), agreement

        # Check expiry
        try:
            exp_dt = datetime.fromisoformat(agreement["expected_completion_time"].replace("Z", "+00:00"))
            if exp_dt < datetime.now(timezone.utc):
                return False, f"Service agreement expired at {agreement['expected_completion_time']}.", agreement
        except Exception:
            pass

        return True, None, agreement


service_agreement_service = ServiceAgreementService()
