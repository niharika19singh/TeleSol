"""
TeleSol PayPilot — Delegated Agent Budgets & Permission Boundaries (Phase 4)
════════════════════════════════════════════════════════════════════════════
Provides a structured delegation model that allows agents to prepare payments
within strict user-defined spending boundaries:
- Enforces service category, per-tx limit, cumulative spend cap, and whitelists.
- Atomically reserves budget during in-flight payments to prevent concurrent race conditions.
- Strictly forbids agents from modifying their own delegations or increasing spending caps.
- Tracks reserved, pending, settled, and released funds with complete audit trails.
"""

import json
import time
import uuid
import logging
from typing import Dict, Any, List, Optional, Tuple
from datetime import datetime, timezone

from app.paypilot.db import db_session
from app.paypilot.audit import record_audit_event

logger = logging.getLogger("telesol.paypilot.delegation")


class DelegationService:
    def create_delegation(
        self,
        agent_id: str,
        delegator_address: str,
        service_categories: List[str],
        max_amount_per_tx: float,
        max_cumulative_spend: float,
        allowed_recipients: List[str],
        allowed_assets: List[str],
        allowed_networks: List[int],
        valid_from: str,
        valid_until: str,
        require_manual_review_for_new_providers: bool = True,
        require_completion_evidence: bool = True
    ) -> Dict[str, Any]:
        """Create and persist a new delegated budget for an agent."""
        now = datetime.now(timezone.utc).isoformat()
        del_id = f"del_{int(time.time_ns())}_{uuid.uuid4().hex[:6]}"

        clean_assets = [a.upper() for a in allowed_assets]
        clean_recipients = [r.strip() for r in allowed_recipients]

        with db_session() as conn:
            cursor = conn.cursor()
            cursor.execute("""
            INSERT INTO agent_delegations (
                id, agent_id, delegator_address, service_categories, max_amount_per_tx,
                max_cumulative_spend, current_spent, reserved_amount, allowed_recipients,
                allowed_assets, allowed_networks, valid_from, valid_until,
                require_manual_review_for_new_providers, require_completion_evidence, status, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, 0.0, 0.0, ?, ?, ?, ?, ?, ?, ?, 'ENABLED', ?, ?);
            """, (
                del_id,
                agent_id,
                delegator_address,
                json.dumps(service_categories),
                float(max_amount_per_tx),
                float(max_cumulative_spend),
                json.dumps(clean_recipients),
                json.dumps(clean_assets),
                json.dumps(allowed_networks),
                valid_from,
                valid_until,
                1 if require_manual_review_for_new_providers else 0,
                1 if require_completion_evidence else 0,
                now,
                now
            ))

        record_audit_event(
            event_type="DELEGATION_CREATED",
            actor=delegator_address,
            entity_type="DELEGATION",
            entity_id=del_id,
            action="create_agent_delegation",
            details={
                "agent_id": agent_id,
                "max_amount_per_tx": max_amount_per_tx,
                "max_cumulative_spend": max_cumulative_spend,
                "valid_until": valid_until
            }
        )

        return self.get_delegation(del_id)

    def get_delegation(self, delegation_id: str) -> Optional[Dict[str, Any]]:
        """Retrieve delegation by ID with parsed JSON arrays and remaining budget calculation."""
        with db_session() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM agent_delegations WHERE id = ?;", (delegation_id,))
            row = cursor.fetchone()

        if not row:
            return None

        d = dict(row)
        d["service_categories"] = json.loads(d["service_categories"] or "[]")
        d["allowed_recipients"] = json.loads(d["allowed_recipients"] or "[]")
        d["allowed_assets"] = json.loads(d["allowed_assets"] or "[]")
        d["allowed_networks"] = json.loads(d["allowed_networks"] or "[]")
        d["max_amount_per_tx"] = float(d["max_amount_per_tx"])
        d["max_cumulative_spend"] = float(d["max_cumulative_spend"])
        d["current_spent"] = float(d["current_spent"])
        d["reserved_amount"] = float(d["reserved_amount"])
        d["remaining_budget"] = max(0.0, d["max_cumulative_spend"] - (d["current_spent"] + d["reserved_amount"]))
        d["require_manual_review_for_new_providers"] = bool(d["require_manual_review_for_new_providers"])
        d["require_completion_evidence"] = bool(d["require_completion_evidence"])
        return d

    def list_delegations(self, agent_id: Optional[str] = None) -> List[Dict[str, Any]]:
        """List delegations, optionally filtered by agent."""
        with db_session() as conn:
            cursor = conn.cursor()
            if agent_id:
                cursor.execute("SELECT id FROM agent_delegations WHERE agent_id = ? ORDER BY created_at DESC;", (agent_id,))
            else:
                cursor.execute("SELECT id FROM agent_delegations ORDER BY created_at DESC;")
            ids = [r["id"] for r in cursor.fetchall()]

        return [self.get_delegation(did) for did in ids if did]

    def set_delegation_status(self, delegation_id: str, new_status: str, modifier_actor: str) -> Dict[str, Any]:
        """
        Suspend or revoke a delegation.
        Enforces rule: Agent cannot modify its own delegation.
        """
        existing = self.get_delegation(delegation_id)
        if not existing:
            raise ValueError(f"Delegation '{delegation_id}' not found.")

        # Guard: Agent cannot alter its own delegation
        if modifier_actor.lower() == existing["agent_id"].lower():
            raise PermissionError("Security violation: Autonomous agent cannot modify or revoke its own delegation.")

        new_status = new_status.upper()
        if new_status == "ACTIVE":
            new_status = "ENABLED"
        if new_status not in ("ENABLED", "SUSPENDED", "REVOKED"):
            raise ValueError(f"Invalid delegation status: {new_status}")

        now = datetime.now(timezone.utc).isoformat()
        with db_session() as conn:
            cursor = conn.cursor()
            cursor.execute("""
            UPDATE agent_delegations
            SET status = ?, updated_at = ?
            WHERE id = ?;
            """, (new_status, now, delegation_id))

        record_audit_event(
            event_type="DELEGATION_STATUS_CHANGED",
            actor=modifier_actor,
            entity_type="DELEGATION",
            entity_id=delegation_id,
            action="update_delegation_status",
            details={"previous_status": existing["status"], "new_status": new_status}
        )

        return self.get_delegation(delegation_id)

    def evaluate_payment_against_delegation(
        self,
        delegation_id: str,
        amount: float,
        recipient: str,
        asset: str,
        network_id: int,
        category: str
    ) -> Tuple[bool, List[str], Dict[str, Any]]:
        """
        Evaluate proposed payment parameters against an active delegation.
        Returns: (passed, violations, delegation_summary)
        """
        d = self.get_delegation(delegation_id)
        if not d:
            return False, [f"Delegation '{delegation_id}' does not exist."], {}

        violations = []

        if d["status"] != "ENABLED":
            violations.append(f"Delegation is {d['status']}. Payments cannot be prepared under suspended or revoked authority.")

        now_dt = datetime.now(timezone.utc)
        try:
            from_dt = datetime.fromisoformat(d["valid_from"].replace("Z", "+00:00"))
            until_dt = datetime.fromisoformat(d["valid_until"].replace("Z", "+00:00"))
            if now_dt < from_dt:
                violations.append(f"Delegation not yet active (valid from {d['valid_from']}).")
            if now_dt > until_dt:
                violations.append(f"Delegation has expired (valid until {d['valid_until']}).")
        except Exception as e:
            violations.append(f"Delegation date format error: {str(e)}")

        if amount > d["max_amount_per_tx"]:
            violations.append(f"Requested amount ({amount} {asset}) exceeds delegation per-tx limit of {d['max_amount_per_tx']} {asset}.")

        projected_spend = d["current_spent"] + d["reserved_amount"] + amount
        if projected_spend > d["max_cumulative_spend"]:
            violations.append(
                f"Cumulative spend ({projected_spend:.2f} {asset}) exceeds authorized ceiling of {d['max_cumulative_spend']:.2f} {asset}. "
                f"(Spent: {d['current_spent']}, Reserved: {d['reserved_amount']})."
            )

        if d["service_categories"] and category not in d["service_categories"]:
            violations.append(f"Service category '{category}' is not authorized under this delegation (Permitted: {d['service_categories']}).")

        if d["allowed_assets"] and asset.upper() not in d["allowed_assets"]:
            violations.append(f"Asset '{asset}' is not permitted by delegation (Permitted: {d['allowed_assets']}).")

        if d["allowed_networks"] and int(network_id) not in d["allowed_networks"]:
            violations.append(f"Network ID {network_id} is not permitted by delegation (Permitted: {d['allowed_networks']}).")

        if d["allowed_recipients"]:
            allowed_rec_lower = [r.lower() for r in d["allowed_recipients"]]
            if recipient.lower() not in allowed_rec_lower:
                violations.append(f"Recipient '{recipient}' is not on the delegation's approved allowlist.")

        passed = len(violations) == 0
        return passed, violations, d

    def reserve_budget(self, delegation_id: str, amount: float) -> bool:
        """
        Atomically reserve budget for an in-flight payment request.
        Prevents concurrent requests from exceeding the cumulative ceiling.
        """
        with db_session() as conn:
            cursor = conn.cursor()
            cursor.execute("""
            UPDATE agent_delegations
            SET reserved_amount = reserved_amount + ?, updated_at = ?
            WHERE id = ? AND status = 'ENABLED' AND (current_spent + reserved_amount + ?) <= max_cumulative_spend;
            """, (amount, datetime.now(timezone.utc).isoformat(), delegation_id, amount))

            success = cursor.rowcount > 0
            if success:
                logger.info("[DELEGATION] Reserved %s on delegation %s", amount, delegation_id)
            else:
                logger.warning("[DELEGATION] Failed to reserve %s on delegation %s: ceiling exceeded or not enabled", amount, delegation_id)
            return success

    def settle_reservation(self, delegation_id: str, amount: float):
        """Transition reserved budget to confirmed spent budget upon successful settlement."""
        with db_session() as conn:
            cursor = conn.cursor()
            cursor.execute("""
            UPDATE agent_delegations
            SET reserved_amount = MAX(0.0, reserved_amount - ?),
                current_spent = current_spent + ?,
                updated_at = ?
            WHERE id = ?;
            """, (amount, amount, datetime.now(timezone.utc).isoformat(), delegation_id))
            logger.info("[DELEGATION] Settled %s on delegation %s", amount, delegation_id)

    def release_reservation(self, delegation_id: str, amount: float):
        """Release reserved budget back to available balance upon failure or cancellation."""
        with db_session() as conn:
            cursor = conn.cursor()
            cursor.execute("""
            UPDATE agent_delegations
            SET reserved_amount = MAX(0.0, reserved_amount - ?),
                updated_at = ?
            WHERE id = ?;
            """, (amount, datetime.now(timezone.utc).isoformat(), delegation_id))
            logger.info("[DELEGATION] Released reservation of %s on delegation %s", amount, delegation_id)


delegation_service = DelegationService()
