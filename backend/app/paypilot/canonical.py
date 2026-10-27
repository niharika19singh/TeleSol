"""
TeleSol PayPilot — Canonical JSON & Cryptographic Hashing Utilities
════════════════════════════════════════════════════════════════════
Implements deterministic JSON serialization per RFC 8785 (Canonical JSON)
and SHA-256 digest calculation for:
- HashKey Settlement Protocol (HSP) body hashes and cart_hash
- Service Agreements (agreement_hash)
- Evidence Bundles (bundle_hash)
- Audit Trail entries
"""

import json
import hashlib
from typing import Any


def canonical_json(obj: Any) -> str:
    """
    Deterministically serialize Python primitives and nested structures
    following RFC 8785 Canonical JSON rules:
    - Object keys sorted lexicographically (Unicode code point order)
    - No decorative whitespace
    - Arrays preserve element order
    - UTF-8 representation without character escapes where valid
    """
    if obj is None:
        return "null"
    if isinstance(obj, bool):
        return "true" if obj else "false"
    if isinstance(obj, int):
        return str(obj)
    if isinstance(obj, float):
        # Format whole floats with standard decimal representation
        if obj.is_integer():
            return f"{int(obj)}"
        return f"{obj}"
    if isinstance(obj, str):
        return json.dumps(obj, ensure_ascii=False)
    if isinstance(obj, (list, tuple)):
        return "[" + ",".join(canonical_json(item) for item in obj) + "]"
    if isinstance(obj, dict):
        sorted_keys = sorted(obj.keys())
        return "{" + ",".join(
            json.dumps(k, ensure_ascii=False) + ":" + canonical_json(obj[k])
            for k in sorted_keys
        ) + "}"
    raise TypeError(f"Object of type {type(obj).__name__} is not JSON serializable")


def hash_canonical_json(obj: Any) -> str:
    """Compute the SHA-256 digest of the canonical JSON string, returned as 64 lowercase hex characters."""
    c_str = canonical_json(obj)
    return hashlib.sha256(c_str.encode("utf-8")).hexdigest()
