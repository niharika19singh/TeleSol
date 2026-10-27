"""
TeleSol PayPilot — Tamper-Evident Audit Logging Service
════════════════════════════════════════════════════════
Records auditable state transitions with SHA-256 cryptographic hash-chaining,
redacts sensitive credentials (private keys, tokens, secrets), and provides
audit integrity verification.
"""

import json
import hashlib
import logging
from typing import Dict, Any, List, Optional, Tuple
from datetime import datetime, timezone
from app.paypilot.db import db_session

logger = logging.getLogger("telesol.paypilot.audit")

SENSITIVE_KEYS = {
    "private_key", "secret", "api_key", "token", "password", "seed_phrase",
    "authorization", "signature", "key", "access_token", "merchant_secret"
}


def redact_sensitive_data(data: Any) -> Any:
    """Recursively redact confidential fields from objects before logging or persistence."""
    if isinstance(data, dict):
        redacted = {}
        for k, v in data.items():
            k_lower = str(k).lower()
            if any(s in k_lower for s in SENSITIVE_KEYS) and not k_lower.endswith("_id") and not k_lower.endswith("_address"):
                if isinstance(v, str) and len(v) > 8:
                    redacted[k] = f"{v[:3]}...[REDACTED]...{v[-3:]}"
                else:
                    redacted[k] = "[REDACTED]"
            else:
                redacted[k] = redact_sensitive_data(v)
        return redacted
    elif isinstance(data, list):
        return [redact_sensitive_data(item) for item in data]
    return data


def record_audit_event(
    event_type: str,
    actor: str,
    entity_type: str,
    entity_id: str,
    action: str,
    details: Dict[str, Any]
) -> Dict[str, Any]:
    """Append a new tamper-evident audit record using SHA-256 hash chaining."""
    with db_session() as conn:
        cursor = conn.cursor()

        # Retrieve latest hash
        cursor.execute("SELECT current_hash FROM audit_logs ORDER BY id DESC LIMIT 1;")
        row = cursor.fetchone()
        previous_hash = row["current_hash"] if row else "0" * 64

        now = datetime.now(timezone.utc).isoformat()
        clean_details = redact_sensitive_data(details)
        details_json = json.dumps(clean_details, sort_keys=True)

        # Compute current SHA-256 hash
        hash_payload = f"{previous_hash}|{event_type}|{actor}|{entity_type}|{entity_id}|{action}|{details_json}|{now}"
        current_hash = hashlib.sha256(hash_payload.encode("utf-8")).hexdigest()

        cursor.execute("""
        INSERT INTO audit_logs (event_type, actor, entity_type, entity_id, action, details, previous_hash, current_hash, timestamp)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);
        """, (
            event_type,
            actor,
            entity_type,
            entity_id,
            action,
            details_json,
            previous_hash,
            current_hash,
            now
        ))

        inserted_id = cursor.lastrowid

    logger.info("[AUDIT] %s | %s on %s:%s -> Hash: %s", event_type, action, entity_type, entity_id, current_hash[:12])
    return {
        "id": inserted_id,
        "event_type": event_type,
        "actor": actor,
        "entity_type": entity_type,
        "entity_id": entity_id,
        "action": action,
        "previous_hash": previous_hash,
        "current_hash": current_hash,
        "timestamp": now
    }


def verify_audit_chain() -> Tuple[bool, int, Optional[str]]:
    """
    Verify the cryptographic integrity of the entire audit trail.
    Returns: (is_valid: bool, total_verified: int, error_message: Optional[str])
    """
    with db_session() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT id, event_type, actor, entity_type, entity_id, action, details, previous_hash, current_hash, timestamp FROM audit_logs ORDER BY id ASC;")
        records = cursor.fetchall()

    if not records:
        return True, 0, None

    expected_prev = "0" * 64
    for idx, rec in enumerate(records):
        if idx == 0:
            expected_prev = rec["previous_hash"]
        else:
            if rec["previous_hash"] != expected_prev:
                return False, idx, f"Hash chain broken at record #{rec['id']}: expected previous {expected_prev}, got {rec['previous_hash']}"

        # Recompute hash
        hash_payload = f"{rec['previous_hash']}|{rec['event_type']}|{rec['actor']}|{rec['entity_type']}|{rec['entity_id']}|{rec['action']}|{rec['details']}|{rec['timestamp']}"
        computed = hashlib.sha256(hash_payload.encode("utf-8")).hexdigest()

        if computed != rec["current_hash"]:
            return False, idx, f"Data tampering detected at record #{rec['id']}: record hash {rec['current_hash']} does not match computed {computed}"

        expected_prev = rec["current_hash"]

    return True, len(records), None
