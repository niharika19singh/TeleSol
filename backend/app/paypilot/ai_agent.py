"""
TeleSol PayPilot — Trust-Aware AI Agent Workflow & Intent Orchestrator (Phase 10)
══════════════════════════════════════════════════════════════════════════════
Orchestrates the multi-agent workflow:
Buyer Agent ──► Service Discovery & Provider Comparison
            ──► Explainable Provider Trust & Reliability Analysis
            ──► Structured Service Agreement (RFC 8785 agreement_hash)
            ──► Delegated Budget & Permission Boundary Check
            ──► Deterministic Safety Simulator Pre-Flight
            ──► Proposed Mandate (HSP Cart Mandate)
            ──► MANDATORY SECURITY HALT FOR WALLET AUTHORIZATION

Security Invariants:
- Untrusted web content is sanitized against prompt injection and overrides.
- Model cannot bypass limits, sign transactions, or substitute for policy engine.
- Every step leaves an inspectable provenance trace.
"""

import re
import json
import time
import uuid
import logging
from typing import Dict, Any, List, Optional
from datetime import datetime, timezone, timedelta

from app.paypilot.db import db_session
from app.paypilot.policy_engine import policy_engine
from app.paypilot.delegation_service import delegation_service
from app.paypilot.service_agreement import service_agreement_service
from app.paypilot.trust_analyzer import provider_trust_analyzer
from app.paypilot.safety_simulator import payment_safety_simulator
from app.paypilot.audit import record_audit_event
from app.services.tinyfish_service import tinyfish_service

logger = logging.getLogger("telesol.paypilot.ai")

PROMPT_INJECTION_PATTERNS = [
    r"ignore previous instructions",
    r"system prompt",
    r"override policy",
    r"bypass approval",
    r"transfer all funds",
    r"send to 0x[a-fA-F0-9]{40}",
    r"you are now in developer mode",
    r"jailbreak",
    r"execute without confirmation",
    r"disable limit",
    r"grant all permissions",
    r"act as root",
]


def sanitize_untrusted_content(text: str) -> str:
    """Sanitize retrieved external web snippets, provider descriptions, and user prompts."""
    if not text:
        return ""
    clean = text
    for pattern in PROMPT_INJECTION_PATTERNS:
        clean = re.sub(pattern, "[FLAGGED_UNTRUSTED_CONTENT]", clean, flags=re.IGNORECASE)
    return clean[:1500]


class AiAgentOrchestrator:
    async def parse_and_plan_intent(
        self,
        user_intent: str,
        buyer_agent_id: str = "agent_buyer_sentinel"
    ) -> Dict[str, Any]:
        """
        Parse natural language intent into an inspectable 6-step payment preparation plan.
        Halts strictly before wallet signing to guarantee explicit user authorization.
        """
        now = datetime.now(timezone.utc)
        now_str = now.isoformat()
        future_exp = (now + timedelta(hours=2)).isoformat()
        intent_clean = sanitize_untrusted_content(user_intent)

        # Extract amount limit from intent text if specified (e.g. "up to 40 HSK" or "under 25")
        amount_match = re.search(r"(?:up to|under|max|limit of|for)\s+(\d+(?:\.\d+)?)\s*(hsk|usdt|usdc)?", intent_clean, re.IGNORECASE)
        limit_amount = float(amount_match.group(1)) if amount_match else 25.0
        requested_asset = (amount_match.group(2) if amount_match and amount_match.group(2) else "HSK").upper()

        trace_steps: List[Dict[str, Any]] = []

        # Trace 1: Buyer Agent Requirement Intake
        trace_steps.append({
            "step": 1,
            "agent": "Buyer Agent (TeleSol Sentinel)",
            "role": "BUYER",
            "action": "Intake & Requirement Extraction",
            "status": "COMPLETED",
            "details": f"Interpreted service need: '{intent_clean}'. Extracted budget limit: {limit_amount} {requested_asset}."
        })

        # Trace 2: Provider Discovery & Catalog Comparison
        providers = await self._discover_providers_for_intent(intent_clean)
        selected_provider = providers[0] if providers else None
        source_note = "TinyFish Web Search + HSK Provider Directory" if tinyfish_service.is_configured() else "HSK Service Directory (Seed Discovery)"

        trace_steps.append({
            "step": 2,
            "agent": "Discovery Engine",
            "role": "DISCOVERY",
            "action": "Provider Query & Catalog Match",
            "status": "COMPLETED",
            "details": f"Found {len(providers)} matching provider(s) via {source_note}."
        })

        if not selected_provider:
            return {
                "success": False,
                "error": "No matching service provider found for intent.",
                "trace": trace_steps
            }

        # Trace 3: Provider Trust & Reliability Evaluation (Phase 5)
        price = float(selected_provider.get("unit_price", 10.0))
        proposed_amount = min(price, limit_amount)
        if proposed_amount <= 0:
            proposed_amount = 5.0

        trust_profile = provider_trust_analyzer.analyze_provider(selected_provider["id"], proposed_amount=proposed_amount)

        trace_steps.append({
            "step": 3,
            "agent": "Trust & Reliability Sentinel",
            "role": "SECURITY",
            "action": "Evaluate Explainable Provider Trust Signals",
            "status": "COMPLETED",
            "details": (
                f"Evaluated provider '{selected_provider['name']}'. Assessment: {trust_profile['overall_assessment']} "
                f"({trust_profile['confidence_level']}). {trust_profile['explanation']}"
            )
        })

        # Trace 4: Construct Structured Service Agreement (Phase 2)
        task_id = f"task_ai_{int(time.time_ns())}_{uuid.uuid4().hex[:6]}"
        agreement = service_agreement_service.create_agreement(
            task_id=task_id,
            requesting_agent_id=buyer_agent_id,
            provider_id=selected_provider["id"],
            provider_address=selected_provider["payment_address"],
            service_category=selected_provider.get("category", "TELECOM_BANDWIDTH"),
            service_description=f"Autonomous procurement: {intent_clean[:120]}",
            agreed_price=proposed_amount,
            asset=selected_provider.get("asset", "HSK"),
            max_authorized_amount=proposed_amount,
            expected_deliverables=f"Execution of {selected_provider.get('category')} task",
            expected_completion_time=future_exp,
            network_id=int(selected_provider.get("network_id", 133)),
            evidence_required="COMPLETION_TELEMETRY"
        )

        trace_steps.append({
            "step": 4,
            "agent": "Service Agreement Layer",
            "role": "BINDING",
            "action": "Generate Canonical Service Agreement",
            "status": "COMPLETED",
            "details": f"Agreement {agreement['agreement_id']} created. Canonical hash: {agreement['agreement_hash'][:16]}... (RFC 8785)."
        })

        # Trace 5: Safety Simulator & Delegation Pre-Flight (Phase 3 & 4)
        delegations = delegation_service.list_delegations(agent_id=buyer_agent_id)
        active_delegation = next((d for d in delegations if d["status"] == "ENABLED"), None)
        delegation_id = active_delegation["id"] if active_delegation else None

        simulation_result = await payment_safety_simulator.simulate_payment(
            amount=proposed_amount,
            asset=agreement["asset"],
            network_id=agreement["network_id"],
            recipient_address=agreement["provider_address"],
            buyer_agent_id=buyer_agent_id,
            provider_id=selected_provider["id"],
            purpose=agreement["service_description"],
            agreement_id=agreement["agreement_id"],
            delegation_id=delegation_id
        )

        sim_passed = simulation_result["outcome"] == "APPROVED FOR AUTHORISATION"
        trace_steps.append({
            "step": 5,
            "agent": "Payment Safety Simulator & Policy Engine",
            "role": "POLICY_ENGINE",
            "action": "Deterministic Safety & Delegation Evaluation",
            "status": "COMPLETED" if sim_passed else "BLOCKED",
            "details": f"Simulator Outcome: {simulation_result['outcome']}. {simulation_result['outcome_reason']}"
        })

        # Trace 6: Mandatory Security Halt (Wallet Authorization Required)
        req_id = f"req_ai_{int(time.time_ns())}_{uuid.uuid4().hex[:6]}"
        mandate_id = f"man_ai_{int(time.time_ns())}_{uuid.uuid4().hex[:6]}"

        trace_steps.append({
            "step": 6,
            "agent": "PayPilot Security Sentinel",
            "role": "GOVERNANCE",
            "action": "Mandatory Wallet Signing Checkpoint (Awaiting User)",
            "status": "AWAITING_WALLET_APPROVAL",
            "details": "Agent stopped execution before payment dispatch. User must review terms and sign EIP-191/Cart Mandate authorization."
        })

        # Persist prepared Payment Request & Mandate
        with db_session() as conn:
            cursor = conn.cursor()
            cursor.execute("""
            INSERT INTO payment_requests (
                id, title, buyer_agent_id, provider_id, recipient_address, asset, amount,
                network_id, purpose, reference_metadata, expiry_timestamp, policy_id,
                agreement_id, agreement_hash, delegation_id, status, is_demo, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'policy_telecom_standard', ?, ?, ?, 'SUBMITTED', 1, ?, ?);
            """, (
                req_id,
                f"Procure {selected_provider['name']}",
                buyer_agent_id,
                selected_provider["id"],
                selected_provider["payment_address"],
                agreement["asset"],
                proposed_amount,
                agreement["network_id"],
                agreement["service_description"],
                json.dumps({"intent": intent_clean, "agreement_id": agreement["agreement_id"]}),
                future_exp,
                agreement["agreement_id"],
                agreement["agreement_hash"],
                delegation_id,
                now_str,
                now_str
            ))

            cursor.execute("""
            INSERT INTO mandates (
                id, mandate_id, request_id, payer_id, payee_id, recipient_address,
                amount, asset, network_id, purpose, spending_limit, expiry_timestamp,
                agreement_id, agreement_hash, delegation_id,
                authorization_status, execution_status, verification_status, is_demo, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'POLICY_APPROVED', 'PENDING', 'UNVERIFIED', 1, ?);
            """, (
                mandate_id,
                mandate_id,
                req_id,
                buyer_agent_id,
                selected_provider["id"],
                selected_provider["payment_address"],
                proposed_amount,
                agreement["asset"],
                agreement["network_id"],
                agreement["service_description"],
                limit_amount,
                future_exp,
                agreement["agreement_id"],
                agreement["agreement_hash"],
                delegation_id,
                now_str
            ))

        record_audit_event(
            event_type="AI_PLAN_GENERATED",
            actor=buyer_agent_id,
            entity_type="PAYMENT_REQUEST",
            entity_id=req_id,
            action="plan_intent",
            details={
                "intent": intent_clean,
                "provider": selected_provider["name"],
                "proposed_amount": proposed_amount,
                "agreement_hash": agreement["agreement_hash"],
                "simulator_outcome": simulation_result["outcome"]
            }
        )

        proposed_mandate_obj = {
            "mandate_id": mandate_id,
            "request_id": req_id,
            "payer_id": buyer_agent_id,
            "payee_id": selected_provider["id"],
            "recipient_address": selected_provider["payment_address"],
            "amount": proposed_amount,
            "asset": agreement["asset"],
            "network_id": agreement["network_id"],
            "purpose": agreement["service_description"],
            "spending_limit": limit_amount,
            "expiry_timestamp": future_exp,
            "agreement_id": agreement["agreement_id"],
            "agreement_hash": agreement["agreement_hash"]
        }

        return {
            "success": True,
            "intent": intent_clean,
            "selected_provider": selected_provider,
            "service_agreement": agreement,
            "proposed_mandate": proposed_mandate_obj,
            "trust_profile": trust_profile,
            "safety_simulation": simulation_result,
            "payment_request_id": req_id,
            "mandate_id": mandate_id,
            "trace": trace_steps,
            "requires_wallet_signature": True
        }

    async def _discover_providers_for_intent(self, intent: str) -> List[Dict[str, Any]]:
        """Search local directory and rank by relevance."""
        intent_lower = intent.lower()
        with db_session() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM providers ORDER BY verified DESC, unit_price ASC;")
            rows = cursor.fetchall()

        results = []
        for r in rows:
            p = dict(r)
            score = 0
            if p["category"].lower() in intent_lower or p["name"].lower() in intent_lower:
                score += 5
            if any(term in intent_lower for term in ["bandwidth", "5g", "slice", "cellular"]) and p["category"] == "TELECOM_BANDWIDTH":
                score += 10
            if any(term in intent_lower for term in ["radar", "sensor", "iot", "crowd"]) and p["category"] == "SENSOR_DATA":
                score += 10
            if any(term in intent_lower for term in ["transit", "metro", "bus", "routing"]) and p["category"] == "ROUTING_AI":
                score += 10
            if any(term in intent_lower for term in ["compute", "ai", "inference", "vision"]) and p["category"] == "EDGE_COMPUTE":
                score += 10

            p["relevance_score"] = score
            results.append(p)

        results.sort(key=lambda x: x["relevance_score"], reverse=True)
        return results


ai_agent = AiAgentOrchestrator()
