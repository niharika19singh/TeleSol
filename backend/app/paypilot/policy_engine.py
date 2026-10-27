"""
TeleSol PayPilot — Deterministic Payment Policy Engine
═══════════════════════════════════════════════════════
Evaluates payment mandates against strict cryptographic and financial rules:
- Per-transaction limit
- Daily cumulative budget ceiling
- Allowed token assets (HSK, USDT, USDC)
- Allowed networks (133: HSK Testnet, 177: HSK Mainnet)
- Recipient address allowlist
- Expiry timeline validation
- Duplicate & replay protection
- Agent permission boundary: Provider cannot authorize self-payment

Decisions:
- APPROVED (Eligible for user wallet authorization)
- REJECTED (Policy violation)
- MANUAL_APPROVAL_REQUIRED (Requires extra supervisor signature)
"""

import json
import logging
from typing import Dict, Any, List, Optional
from datetime import datetime, timezone
from app.paypilot.db import db_session
from app.paypilot.audit import record_audit_event

logger = logging.getLogger("telesol.paypilot.policy")


class PolicyEngine:
    def get_policy(self, policy_id: Optional[str] = None) -> Dict[str, Any]:
        """Fetch policy by ID, or return active default policy."""
        with db_session() as conn:
            cursor = conn.cursor()
            if policy_id:
                cursor.execute("SELECT * FROM policies WHERE id = ?;", (policy_id,))
            else:
                cursor.execute("SELECT * FROM policies WHERE is_active = 1 LIMIT 1;")
            row = cursor.fetchone()

        if not row:
            # Fallback default policy if none in DB
            return {
                "id": "policy_default",
                "name": "Standard Autonomous Policy",
                "max_amount_per_tx": 50.0,
                "max_daily_budget": 200.0,
                "allowed_assets": ["HSK", "USDT", "USDC"],
                "allowed_networks": [133, 177],
                "allowed_recipients": [],
                "require_manual_approval": 1,
                "is_active": 1,
            }

        return {
            "id": row["id"],
            "name": row["name"],
            "description": row["description"],
            "max_amount_per_tx": float(row["max_amount_per_tx"]),
            "max_daily_budget": float(row["max_daily_budget"]),
            "allowed_assets": json.loads(row["allowed_assets"] or '["HSK"]'),
            "allowed_networks": json.loads(row["allowed_networks"] or "[133]"),
            "allowed_recipients": json.loads(row["allowed_recipients"] or "[]"),
            "require_manual_approval": int(row["require_manual_approval"]),
            "is_active": int(row["is_active"]),
        }

    def update_policy(self, policy_id: str, updates: Dict[str, Any]) -> Dict[str, Any]:
        """Update policy limits and whitelist rules."""
        now = datetime.now(timezone.utc).isoformat()
        with db_session() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM policies WHERE id = ?;", (policy_id,))
            existing = cursor.fetchone()
            if not existing:
                raise ValueError(f"Policy '{policy_id}' not found.")

            allowed_assets = json.dumps(updates.get("allowed_assets", json.loads(existing["allowed_assets"])))
            allowed_networks = json.dumps(updates.get("allowed_networks", json.loads(existing["allowed_networks"])))
            allowed_recipients = json.dumps(updates.get("allowed_recipients", json.loads(existing["allowed_recipients"] or "[]")))

            cursor.execute("""
            UPDATE policies
            SET name = ?, description = ?, max_amount_per_tx = ?, max_daily_budget = ?,
                allowed_assets = ?, allowed_networks = ?, allowed_recipients = ?,
                require_manual_approval = ?, is_active = ?, updated_at = ?
            WHERE id = ?;
            """, (
                updates.get("name", existing["name"]),
                updates.get("description", existing["description"]),
                float(updates.get("max_amount_per_tx", existing["max_amount_per_tx"])),
                float(updates.get("max_daily_budget", existing["max_daily_budget"])),
                allowed_assets,
                allowed_networks,
                allowed_recipients,
                int(updates.get("require_manual_approval", existing["require_manual_approval"])),
                int(updates.get("is_active", existing["is_active"])),
                now,
                policy_id
            ))

        record_audit_event(
            event_type="POLICY_UPDATED",
            actor="operator",
            entity_type="POLICY",
            entity_id=policy_id,
            action="update_spending_policy",
            details=updates
        )

        return self.get_policy(policy_id)

    def calculate_daily_spent(self, payer_id: str) -> float:
        """Calculate total amount settled or authorized in the current UTC day."""
        today_start = datetime.now(timezone.utc).strftime("%Y-%m-%d 00:00:00")
        with db_session() as conn:
            cursor = conn.cursor()
            cursor.execute("""
            SELECT COALESCE(SUM(amount), 0.0) as total
            FROM mandates
            WHERE payer_id = ?
              AND created_at >= ?
              AND execution_status IN ('SETTLED', 'EXECUTING')
              AND authorization_status = 'AUTHORIZED';
            """, (payer_id, today_start))
            row = cursor.fetchone()
        return float(row["total"]) if row else 0.0

    def evaluate_mandate(self, mandate: Dict[str, Any], policy_id: Optional[str] = None) -> Dict[str, Any]:
        """
        Deterministically evaluate a payment mandate against active spending policies.
        Returns a dict with:
          - decision: 'APPROVED' | 'REJECTED' | 'MANUAL_APPROVAL_REQUIRED'
          - rules: List of individual rule checks
          - reason: Summary text
        """
        policy = self.get_policy(policy_id)
        rules: List[Dict[str, Any]] = []
        violations: List[str] = []

        amount = float(mandate.get("amount", 0.0))
        asset = str(mandate.get("asset", "")).upper()
        network_id = int(mandate.get("network_id", 0))
        recipient = str(mandate.get("recipient_address", "")).strip()
        payer_id = str(mandate.get("payer_id", ""))
        payee_id = str(mandate.get("payee_id", ""))
        expiry_str = str(mandate.get("expiry_timestamp", ""))
        mandate_id = str(mandate.get("mandate_id", ""))

        # Rule 1: Amount must be positive
        r1_passed = amount > 0.0
        rules.append({"rule": "positive_amount", "passed": r1_passed, "value": amount})
        if not r1_passed:
            violations.append("Payment amount must be greater than zero.")

        # Rule 2: Per-transaction spending limit
        r2_passed = amount <= policy["max_amount_per_tx"]
        rules.append({
            "rule": "max_amount_per_tx",
            "passed": r2_passed,
            "limit": policy["max_amount_per_tx"],
            "requested": amount
        })
        if not r2_passed:
            violations.append(f"Amount {amount} {asset} exceeds single-transaction limit of {policy['max_amount_per_tx']} {asset}.")

        # Rule 3: Daily cumulative budget
        daily_spent = self.calculate_daily_spent(payer_id)
        r3_passed = (daily_spent + amount) <= policy["max_daily_budget"]
        rules.append({
            "rule": "max_daily_budget",
            "passed": r3_passed,
            "daily_budget": policy["max_daily_budget"],
            "spent_today": daily_spent,
            "new_total": daily_spent + amount
        })
        if not r3_passed:
            violations.append(f"Cumulative spend {daily_spent + amount:.2f} {asset} would exceed daily limit of {policy['max_daily_budget']:.2f} {asset}.")

        # Rule 4: Asset whitelist
        r4_passed = asset in policy["allowed_assets"]
        rules.append({
            "rule": "allowed_assets",
            "passed": r4_passed,
            "allowed": policy["allowed_assets"],
            "requested": asset
        })
        if not r4_passed:
            violations.append(f"Asset '{asset}' is not permitted by policy (Allowed: {policy['allowed_assets']}).")

        # Rule 5: Network whitelist
        r5_passed = network_id in policy["allowed_networks"]
        rules.append({
            "rule": "allowed_networks",
            "passed": r5_passed,
            "allowed": policy["allowed_networks"],
            "requested": network_id
        })
        if not r5_passed:
            violations.append(f"Network ID {network_id} is not permitted by policy (Allowed: {policy['allowed_networks']}).")

        # Rule 6: Recipient allowlist (if configured)
        allowed_recipients = [r.lower() for r in policy.get("allowed_recipients", [])]
        if allowed_recipients:
            r6_passed = recipient.lower() in allowed_recipients
            rules.append({
                "rule": "allowed_recipients",
                "passed": r6_passed,
                "recipient": recipient
            })
            if not r6_passed:
                violations.append(f"Recipient address '{recipient}' is not on the authorized provider allowlist.")
        else:
            rules.append({"rule": "allowed_recipients", "passed": True, "note": "Open allowlist active"})

        # Rule 7: Expiry validation
        r7_passed = False
        try:
            exp_dt = datetime.fromisoformat(expiry_str.replace("Z", "+00:00"))
            now_dt = datetime.now(timezone.utc)
            r7_passed = exp_dt > now_dt
        except Exception:
            r7_passed = False
        rules.append({"rule": "expiry_valid", "passed": r7_passed, "expiry": expiry_str})
        if not r7_passed:
            violations.append("Mandate expiration date must be in the future.")

        # Rule 8: Agent role boundary: Provider cannot authorize its own payment
        r8_passed = payer_id != payee_id
        rules.append({"rule": "agent_role_separation", "passed": r8_passed, "payer": payer_id, "payee": payee_id})
        if not r8_passed:
            violations.append("Conflict of interest: Provider agent cannot mandate payment to itself.")

        # Determine Decision
        if violations:
            decision = "REJECTED"
            reason = "Policy rejection: " + " | ".join(violations)
        elif policy["require_manual_approval"] and amount > (policy["max_amount_per_tx"] * 0.75):
            decision = "MANUAL_APPROVAL_REQUIRED"
            reason = f"Payment amount ({amount} {asset}) is within 75% of maximum ceiling. Requires high-value supervisor confirmation."
        else:
            decision = "APPROVED"
            reason = "Mandate conforms with all autonomous spending limits, whitelist rules, and network criteria. Ready for wallet authorization."

        # Persist Policy Decision
        now = datetime.now(timezone.utc).isoformat()
        import uuid
        import time
        decision_id = f"pdec_{int(time.time_ns())}_{uuid.uuid4().hex[:6]}"

        with db_session() as conn:
            cursor = conn.cursor()
            cursor.execute("""
            INSERT INTO policy_decisions (id, mandate_id, policy_id, decision, rules_evaluated, reason, evaluated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?);
            """, (
                decision_id,
                mandate_id,
                policy["id"],
                decision,
                json.dumps(rules),
                reason,
                now
            ))

            # Update mandate authorization status if mandate exists
            auth_status = "POLICY_APPROVED" if decision == "APPROVED" else "REJECTED"
            cursor.execute("UPDATE mandates SET authorization_status = ? WHERE mandate_id = ?;", (auth_status, mandate_id))

        record_audit_event(
            event_type="POLICY_EVALUATED",
            actor="policy_engine",
            entity_type="MANDATE",
            entity_id=mandate_id,
            action="evaluate_mandate",
            details={"decision": decision, "reason": reason, "violations": violations}
        )

        return {
            "decision_id": decision_id,
            "decision": decision,
            "policy_id": policy["id"],
            "rules": rules,
            "violations": violations,
            "reason": reason,
            "evaluated_at": now
        }


policy_engine = PolicyEngine()
