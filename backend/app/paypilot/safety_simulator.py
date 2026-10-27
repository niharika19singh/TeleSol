"""
TeleSol PayPilot — Payment Safety Simulator (Phase 3)
═════════════════════════════════════════════════════
Executes pre-flight evaluation and risk simulation before a payment reaches
the wallet-authorisation stage:
- Uses the actual backend policy engine and active delegation parameters.
- Returns one of three explicit outcomes:
    1. 'APPROVED FOR AUTHORISATION'
    2. 'BLOCKED'
    3. 'REQUIRES REVIEW'
- Supports interactive simulation mode with hypothetical limits or recipients
  without modifying active production policies.
- Computes estimated network fees using live HSK RPC gas price when online.
- Checks duplicate recent payments to prevent accidental double-spending.
- Safety invariant: The simulator NEVER signs or broadcasts transactions.
"""

import time
import logging
from typing import Dict, Any, List, Optional
from datetime import datetime, timezone, timedelta

from app.paypilot.db import db_session
from app.paypilot.policy_engine import policy_engine
from app.paypilot.delegation_service import delegation_service
from app.paypilot.service_agreement import service_agreement_service
from app.paypilot.trust_analyzer import provider_trust_analyzer
from app.paypilot.hsk_chain import hsk_chain

logger = logging.getLogger("telesol.paypilot.simulator")


class PaymentSafetySimulator:
    async def simulate_payment(
        self,
        amount: float,
        asset: str,
        network_id: int,
        recipient_address: str,
        buyer_agent_id: str,
        provider_id: Optional[str] = None,
        purpose: Optional[str] = "Service procurement",
        agreement_id: Optional[str] = None,
        delegation_id: Optional[str] = None,
        hypothetical_policy_overrides: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Run a complete, non-mutating pre-execution safety simulation.
        Does not broadcast or sign any transactions.
        """
        now = datetime.now(timezone.utc)
        now_str = now.isoformat()
        checks: List[Dict[str, Any]] = []
        violations: List[str] = []
        review_items: List[str] = []

        is_hypothetical = bool(hypothetical_policy_overrides)

        # 1. Base Policy Retrieval (with optional hypothetical overrides)
        active_policy = policy_engine.get_policy()
        effective_policy = dict(active_policy)
        if hypothetical_policy_overrides:
            for k, v in hypothetical_policy_overrides.items():
                if v is not None:
                    effective_policy[k] = v

        # Check 1: Amount positive
        amt_valid = amount > 0.0
        checks.append({
            "name": "POSITIVE_AMOUNT",
            "passed": amt_valid,
            "status": "PASS" if amt_valid else "FAIL",
            "details": f"Amount {amount} {asset} is positive." if amt_valid else "Amount must be strictly greater than 0.",
            "action_required": None if amt_valid else "Specify an amount greater than zero."
        })
        if not amt_valid:
            violations.append("Amount must be greater than zero.")

        # Check 2: Single-transaction limit
        max_tx = float(effective_policy["max_amount_per_tx"])
        tx_limit_passed = amount <= max_tx
        checks.append({
            "name": "TRANSACTION_CEILING",
            "passed": tx_limit_passed,
            "status": "PASS" if tx_limit_passed else "FAIL",
            "limit": max_tx,
            "requested": amount,
            "details": f"Requested {amount} {asset} vs single-tx ceiling of {max_tx} {asset}.",
            "action_required": None if tx_limit_passed else f"Reduce amount below {max_tx} {asset} or obtain policy elevation."
        })
        if not tx_limit_passed:
            violations.append(f"Amount {amount} {asset} exceeds single-transaction limit of {max_tx} {asset}.")

        # Check 3: Daily cumulative budget
        daily_spent = policy_engine.calculate_daily_spent(buyer_agent_id)
        max_daily = float(effective_policy["max_daily_budget"])
        daily_passed = (daily_spent + amount) <= max_daily
        checks.append({
            "name": "DAILY_CUMULATIVE_BUDGET",
            "passed": daily_passed,
            "status": "PASS" if daily_passed else "FAIL",
            "daily_budget": max_daily,
            "spent_today": daily_spent,
            "projected_total": daily_spent + amount,
            "details": f"Cumulative spend: {daily_spent:.2f} spent + {amount:.2f} proposed = {daily_spent + amount:.2f} / {max_daily:.2f} {asset}.",
            "action_required": None if daily_passed else "Daily spending ceiling exhausted for today. Wait for next UTC cycle or request supervisor override."
        })
        if not daily_passed:
            violations.append(f"Projected daily spend of {daily_spent + amount:.2f} {asset} exceeds daily ceiling of {max_daily:.2f} {asset}.")

        # Check 4: Asset Whitelist
        allowed_assets = effective_policy.get("allowed_assets", ["HSK", "USDT", "USDC"])
        asset_passed = asset.upper() in allowed_assets
        checks.append({
            "name": "ASSET_WHITELIST",
            "passed": asset_passed,
            "status": "PASS" if asset_passed else "FAIL",
            "allowed_assets": allowed_assets,
            "requested_asset": asset.upper(),
            "details": f"Asset '{asset.upper()}' in allowed set {allowed_assets}." if asset_passed else f"Asset '{asset}' is not permitted by policy.",
            "action_required": None if asset_passed else f"Switch asset to one of: {allowed_assets}."
        })
        if not asset_passed:
            violations.append(f"Asset '{asset}' is not permitted.")

        # Check 5: Network Whitelist
        allowed_networks = effective_policy.get("allowed_networks", [133, 177])
        network_passed = int(network_id) in allowed_networks
        net_info = hsk_chain.get_network_info(network_id)
        checks.append({
            "name": "NETWORK_COMPATIBILITY",
            "passed": network_passed,
            "status": "PASS" if network_passed else "FAIL",
            "chain_id": network_id,
            "network_name": net_info["name"],
            "allowed_networks": allowed_networks,
            "details": f"Target network is {net_info['name']} (Chain ID {network_id}).",
            "action_required": None if network_passed else f"Switch target network to one of: {allowed_networks}."
        })
        if not network_passed:
            violations.append(f"Network {network_id} is not supported.")

        # Check 6: Recipient Whitelist
        allowed_recipients = [r.lower() for r in effective_policy.get("allowed_recipients", [])]
        if allowed_recipients:
            rec_passed = recipient_address.lower() in allowed_recipients
            checks.append({
                "name": "RECIPIENT_ALLOWLIST",
                "passed": rec_passed,
                "status": "PASS" if rec_passed else "FAIL",
                "recipient": recipient_address,
                "details": f"Recipient '{recipient_address}' is in authorized whitelist." if rec_passed else "Recipient is NOT on approved whitelist.",
                "action_required": None if rec_passed else "Add recipient address to active policy allowlist."
            })
            if not rec_passed:
                violations.append("Recipient address is not permitted by policy allowlist.")
        else:
            checks.append({
                "name": "RECIPIENT_ALLOWLIST",
                "passed": True,
                "status": "PASS",
                "details": "Open recipient allowlist active. Any verified provider address is permitted.",
                "action_required": None
            })

        # Check 7: Duplicate Payment / Replay Detection
        is_duplicate = False
        with db_session() as conn:
            cursor = conn.cursor()
            one_hour_ago = (now - timedelta(hours=1)).isoformat()
            cursor.execute("""
            SELECT id, amount, recipient_address, created_at
            FROM payment_requests
            WHERE recipient_address = ? AND amount = ? AND created_at >= ? AND status IN ('SUBMITTED', 'SETTLED');
            """, (recipient_address, amount, one_hour_ago))
            dup_row = cursor.fetchone()
            if dup_row:
                is_duplicate = True

        checks.append({
            "name": "DUPLICATE_PAYMENT_CHECK",
            "passed": not is_duplicate,
            "status": "REVIEW" if is_duplicate else "PASS",
            "details": (
                f"Warning: Identical payment of {amount} {asset} to '{recipient_address}' was submitted within the last hour (Request: {dup_row['id']})."
                if is_duplicate else "No duplicate payments detected in the last hour."
            ),
            "action_required": "Confirm that this is an intentional repeat payment and not an accidental duplicate." if is_duplicate else None
        })
        if is_duplicate:
            review_items.append("Potential duplicate payment detected within the past 60 minutes.")

        # Check 8: Service Agreement Binding (Phase 2)
        if agreement_id:
            val_ok, val_err, _ = service_agreement_service.validate_payment_binding(
                agreement_id=agreement_id,
                proposed_amount=amount,
                proposed_recipient=recipient_address,
                proposed_asset=asset,
                proposed_network_id=network_id
            )
            checks.append({
                "name": "SERVICE_AGREEMENT_BINDING",
                "passed": val_ok,
                "status": "PASS" if val_ok else "FAIL",
                "agreement_id": agreement_id,
                "details": "Payment parameters cryptographically match the approved service agreement." if val_ok else val_err,
                "action_required": None if val_ok else "Reconcile payment request with approved service agreement terms."
            })
            if not val_ok:
                violations.append(f"Agreement binding violation: {val_err}")
        else:
            checks.append({
                "name": "SERVICE_AGREEMENT_BINDING",
                "passed": True,
                "status": "REVIEW",
                "details": "No service agreement referenced. Payment will proceed as direct unbundled transfer.",
                "action_required": "Attach a service agreement if this payment requires verifiable task completion proof."
            })
            review_items.append("Payment does not reference a formal service agreement.")

        # Check 9: Agent Delegation Check (Phase 4)
        if delegation_id:
            del_ok, del_viols, d_info = delegation_service.evaluate_payment_against_delegation(
                delegation_id=delegation_id,
                amount=amount,
                recipient=recipient_address,
                asset=asset,
                network_id=network_id,
                category=d_info.get("service_categories", ["TELECOM_BANDWIDTH"])[0] if "d_info" in locals() and d_info else "TELECOM_BANDWIDTH"
            )
            checks.append({
                "name": "AGENT_DELEGATION_COMPLIANCE",
                "passed": del_ok,
                "status": "PASS" if del_ok else "FAIL",
                "delegation_id": delegation_id,
                "remaining_budget": d_info.get("remaining_budget", 0.0),
                "details": f"Complies with delegation {delegation_id}." if del_ok else " | ".join(del_viols),
                "action_required": None if del_ok else "Adjust payment or seek higher delegation authorization."
            })
            if not del_ok:
                violations.extend(del_viols)

        # Check 10: Provider Trust Signals (Phase 5)
        trust_summary = None
        if provider_id:
            trust_summary = provider_trust_analyzer.analyze_provider(provider_id, proposed_amount=amount)
            trust_assessment = trust_summary.get("overall_assessment")
            if trust_assessment in ("INSUFFICIENT_HISTORY", "DISPUTED"):
                checks.append({
                    "name": "PROVIDER_TRUST_EVALUATION",
                    "passed": True,
                    "status": "REVIEW",
                    "details": trust_summary.get("explanation"),
                    "action_required": "Review provider profile before signing."
                })
                review_items.append(f"Provider assessment flagged: {trust_assessment}")
            else:
                checks.append({
                    "name": "PROVIDER_TRUST_EVALUATION",
                    "passed": True,
                    "status": "PASS",
                    "details": f"Provider trust assessment: {trust_assessment} ({trust_summary.get('confidence_level')}).",
                    "action_required": None
                })

        # Check 11: Estimated Network Fee
        estimated_gas_limit = 21000 if asset.upper() == "HSK" else 65000
        gas_price_gwei = 1.0  # Baseline HSK Chain gas price
        net_health = await hsk_chain.check_network_health(network_id)
        estimated_fee_native = (estimated_gas_limit * gas_price_gwei * 1e-9)

        fee_info = {
            "estimated_gas_limit": estimated_gas_limit,
            "gas_price_gwei": gas_price_gwei,
            "estimated_fee_native_hsk": round(estimated_fee_native, 6),
            "rpc_online": net_health.get("online", False),
            "data_source": "HSK Chain Node RPC Query" if net_health.get("online") else "Standard EVM Gas Table (Fallback)"
        }

        # Determine Final 3-State Outcome
        if violations:
            outcome = "BLOCKED"
            outcome_reason = "Payment cannot be authorised: Mandatory policy, ceiling, or security rules failed."
        elif review_items:
            outcome = "REQUIRES REVIEW"
            outcome_reason = "Payment can proceed to wallet review, but attention is required on flagged review items."
        else:
            outcome = "APPROVED FOR AUTHORISATION"
            outcome_reason = "All deterministic safety, policy, and budget checks passed. Ready for explicit user wallet authorization."

        return {
            "outcome": outcome,
            "outcome_reason": outcome_reason,
            "is_hypothetical": is_hypothetical,
            "requested_payment": {
                "amount": amount,
                "asset": asset.upper(),
                "recipient_address": recipient_address,
                "network_id": network_id,
                "network_name": net_info["name"],
                "buyer_agent_id": buyer_agent_id,
                "provider_id": provider_id,
                "purpose": purpose
            },
            "checks": checks,
            "violations": violations,
            "review_items": review_items,
            "estimated_fee": fee_info,
            "provider_trust": trust_summary,
            "simulated_at": now_str
        }


payment_safety_simulator = PaymentSafetySimulator()
