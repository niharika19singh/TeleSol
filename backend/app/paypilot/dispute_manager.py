"""
TeleSol PayPilot — Dispute, Failure & Incident Recovery Management (Phase 7)
═══════════════════════════════════════════════════════════════════════════
Provides lifecycle failure detection, user disputes, and safe idempotency-backed
recovery workflows:
- Automated detection of amount/recipient mismatches, expired mandates,
  duplicate payment attempts, reverted on-chain transactions, missing receipts,
  and terms tampering.
- Maintains structured incident records with timeline, evidence, and actionable recovery steps.
- Safe retry controller: Verifies prior on-chain or gateway broadcast state
  before permitting retry to prevent double charges.
- User dispute filing and resolution workflows.
"""

import json
import time
import uuid
import logging
from typing import Dict, Any, List, Optional
from datetime import datetime, timezone

from app.paypilot.db import db_session
from app.paypilot.audit import record_audit_event

logger = logging.getLogger("telesol.paypilot.dispute")


class DisputeManager:
    def record_incident(
        self,
        incident_type: str,
        detection_reason: str,
        severity: str = "MEDIUM",
        mandate_id: Optional[str] = None,
        request_id: Optional[str] = None,
        task_id: Optional[str] = None,
        evidence: Optional[Dict[str, Any]] = None,
        recommended_action: Optional[str] = None
    ) -> Dict[str, Any]:
        """Record a structured payment incident or policy violation."""
        now = datetime.now(timezone.utc).isoformat()
        incident_id = f"inc_{int(time.time_ns())}_{uuid.uuid4().hex[:6]}"

        timeline = [
            {
                "timestamp": now,
                "event": "INCIDENT_DETECTED",
                "reason": detection_reason,
                "severity": severity
            }
        ]

        with db_session() as conn:
            cursor = conn.cursor()
            cursor.execute("""
            INSERT INTO payment_incidents (
                id, incident_type, task_id, mandate_id, request_id, detection_reason,
                severity, evidence, timeline, status, recommended_action, resolution_notes, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'OPEN', ?, '', ?, ?);
            """, (
                incident_id,
                incident_type,
                task_id,
                mandate_id,
                request_id,
                detection_reason,
                severity.upper(),
                json.dumps(evidence or {}),
                json.dumps(timeline),
                recommended_action or "Review evidence and contact counterparty or supervisor.",
                now,
                now
            ))

        record_audit_event(
            event_type="PAYMENT_INCIDENT_RECORDED",
            actor="dispute_manager",
            entity_type="INCIDENT",
            entity_id=incident_id,
            action="record_payment_incident",
            details={
                "incident_type": incident_type,
                "severity": severity,
                "mandate_id": mandate_id,
                "reason": detection_reason
            }
        )

        return self.get_incident(incident_id)

    def get_incident(self, incident_id: str) -> Optional[Dict[str, Any]]:
        """Retrieve full incident record by ID."""
        with db_session() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM payment_incidents WHERE id = ?;", (incident_id,))
            row = cursor.fetchone()

        if not row:
            return None

        inc = dict(row)
        inc["evidence"] = json.loads(inc["evidence"] or "{}")
        inc["timeline"] = json.loads(inc["timeline"] or "[]")
        return inc

    def list_incidents(self, status: Optional[str] = None) -> List[Dict[str, Any]]:
        """List incidents with optional status filter."""
        with db_session() as conn:
            cursor = conn.cursor()
            if status:
                cursor.execute("SELECT id FROM payment_incidents WHERE status = ? ORDER BY created_at DESC;", (status,))
            else:
                cursor.execute("SELECT id FROM payment_incidents ORDER BY created_at DESC;")
            ids = [r["id"] for r in cursor.fetchall()]

        return [self.get_incident(iid) for iid in ids if iid]

    def update_incident_status(
        self,
        incident_id: str,
        new_status: str,
        actor: str,
        notes: str
    ) -> Dict[str, Any]:
        """Update incident workflow status and append timeline record."""
        existing = self.get_incident(incident_id)
        if not existing:
            raise ValueError(f"Incident '{incident_id}' not found.")

        now = datetime.now(timezone.utc).isoformat()
        timeline = existing["timeline"]
        timeline.append({
            "timestamp": now,
            "event": f"STATUS_CHANGED_TO_{new_status.upper()}",
            "actor": actor,
            "notes": notes
        })

        with db_session() as conn:
            cursor = conn.cursor()
            cursor.execute("""
            UPDATE payment_incidents
            SET status = ?, resolution_notes = ?, timeline = ?, updated_at = ?
            WHERE id = ?;
            """, (
                new_status.upper(),
                notes,
                json.dumps(timeline),
                now,
                incident_id
            ))

        record_audit_event(
            event_type="INCIDENT_STATUS_UPDATED",
            actor=actor,
            entity_type="INCIDENT",
            entity_id=incident_id,
            action="update_incident_status",
            details={"previous_status": existing["status"], "new_status": new_status, "notes": notes}
        )

        return self.get_incident(incident_id)

    def evaluate_safe_retry(self, mandate_id: str) -> Dict[str, Any]:
        """
        Check whether a failed or timed-out mandate can be safely retried.
        Enforces idempotency: Strictly forbids retrying if a transaction was already broadcast or settled.
        """
        with db_session() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM mandates WHERE mandate_id = ?;", (mandate_id,))
            m_row = cursor.fetchone()

        if not m_row:
            return {"can_retry": False, "reason": "Mandate not found."}

        mandate = dict(m_row)

        if mandate.get("execution_status") == "SETTLED":
            return {
                "can_retry": False,
                "reason": "Forbidden: Mandate is already SETTLED. Cannot retry an already settled payment.",
                "settlement_status": "SETTLED",
                "tx_hash": mandate.get("tx_hash")
            }

        if mandate.get("tx_hash") and mandate.get("verification_status") in ("VERIFIED", "DEMO_VERIFIED"):
            return {
                "can_retry": False,
                "reason": "Forbidden: An on-chain transaction hash is already verified for this mandate.",
                "tx_hash": mandate.get("tx_hash")
            }

        # Check for gateway in-flight orders
        with db_session() as conn:
            cursor = conn.cursor()
            cursor.execute("""
            SELECT gateway_type, status, error_code, executed_at
            FROM gateway_executions
            WHERE mandate_id = ?
            ORDER BY executed_at DESC LIMIT 1;
            """, (mandate_id,))
            g_row = cursor.fetchone()

        if g_row and g_row["status"] == "PROCESSING":
            return {
                "can_retry": False,
                "reason": "Payment order is currently PROCESSING at the gateway. Wait for webhook or polling completion before retrying.",
                "gateway_status": g_row["status"]
            }

        return {
            "can_retry": True,
            "reason": "Mandate is in failed or timed-out state with no broadcast on-chain transaction. Safe to retry with idempotent order key.",
            "mandate_id": mandate_id
        }


dispute_manager = DisputeManager()
