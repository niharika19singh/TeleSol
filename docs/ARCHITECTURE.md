# TeleSol PayPilot 2.0 — System Architecture & Component Model
## Trust-Aware Autonomous Agent Payments on HSK Chain

---

## 1. Executive Summary

**TeleSol PayPilot 2.0** is an enterprise-grade, trust-aware autonomous Agent-to-Agent (A2A) payment coordination and settlement platform built natively for **HSK Chain** (HashKey Chain) under the **Agent Payments & A2A Settlement (HSP)** track.

Extending the IoT telecom congestion intelligence of **TeleSol Sentinel**, PayPilot 2.0 resolves the critical limitation of existing Web3 agent tooling—treating payments as isolated transactions—by establishing a cryptographically verifiable **Four-Pillar Binding**:

1. **Agent Task Intent**: The explicit operational reason for requesting a service (e.g. emergency 5G slice mitigation in response to elevated Crowd Risk Scores).
2. **Selected Service Provider**: Verified on-chain provider identity with explainable trust signals and SLA parameters.
3. **Payment Mandate & Spending Boundary**: Deterministically enforced policies and user-authorized spending bounds, anchored off-chain via RFC 8785 canonical hashes.
4. **Independently Verifiable Settlement**: Tamper-evident evidence bundle connecting wallet signatures, HashKey Settlement Protocol (HSP) v2.3.0 gateway execution, and on-chain HSK Chain transaction receipts.

---

## 2. End-to-End Trust-Aware Workflow

```
[Sentinel NOC: High Congestion Event (CRS > 40 / > 75)]
                       │
                       ▼
    [Phase 8: Sentinel-to-PayPilot Bridge]
    (Scans CRS, maps category, checks deduplication)
                       │
                       ▼
    [Phase 2: Service Agreement & Task Context]
    (Constructs canonical RFC 8785 terms: price, SLA, deliverables)
    (Computes SHA-256 agreement_hash)
                       │
                       ▼
    [Phase 5: Explainable Provider Trust Analyzer]
    (Evaluates address checksum, terms completeness, local settlement history)
    (Sets INSUFFICIENT_HISTORY flag if settlements < 3. Advisory only)
                       │
                       ▼
    [Phase 4: Agent Delegations & Budget Reservation]
    (Verifies delegated budget; atomically reserves funds)
    (Enforces non-escalation: agents cannot self-elevate permissions)
                       │
                       ▼
    [Phase 3: Pre-Execution Safety Simulator]
    (Evaluates 11 deterministic checks against live or hypothetical parameters)
    (Returns 3 explicit states: APPROVED FOR AUTHORISATION, BLOCKED, or REQUIRES REVIEW)
                       │
                       ▼
       ═════════════════════════════════════════
       [MANDATORY SECURITY HALT / WALLET SIGN]
       (Explicit operator authorization required)
       (Zero private keys held by LLM or server)
       ═════════════════════════════════════════
                       │
                       ▼
    [Phase 9: HashKey Settlement Protocol (HSP) v2.3.0]
    (RFC 8785 Canonical JSON body hash)
    (Official HMAC headers: X-App-Key, X-Timestamp, X-Nonce, X-Signature)
    (AP2 Cart Mandate payload: method_data, x402Version: 2, total details)
                       │
                       ▼
    [HSK Chain JSON-RPC Node Verification]
    (Direct query to https://testnet.hsk.xyz: status 0x1, block confirmation)
                       │
                       ▼
    [Phase 6: Cryptographic Evidence Bundle Assembly]
    (Assembles task, agreement, mandate, signature, HSP receipt, chain tx)
    (Calculates canonical bundle_hash; runs 8-point independent verification)
                       │
                       ▼
    [Phase 7: Dispute Management & Safe Recovery (If Needed)]
    (Structured incident logging; safe retry idempotency check)
```

---

## 3. Core Subsystems & Components

### 3.1. Canonical Serialization & Hash Anchoring (`app.paypilot.canonical`)
- **RFC 8785 Compliant**: Deterministic key sorting, strict float formatting without exponential notation, UTF-8 escaping.
- Generates reproducible SHA-256 digests (`agreement_hash`, `bundle_hash`) independent of programming language or formatting.

### 3.2. Service Agreement Layer (`app.paypilot.service_agreement`)
- Structures agreements connecting task requirements to financial parameters.
- Supports deliverables checklist, expected completion SLA, required evidence formats (`TELECOM_QOS_TELEMETRY_LOG`, etc.), and expiration timestamps.
- **Pre-Authorization Tamper Check**: Reconstructs canonical JSON from database parameters and verifies that the recalculated hash matches the stored `agreement_hash` before any mandate authorization.

### 3.3. Pre-Execution Safety Simulator (`app.paypilot.safety_simulator`)
- Pre-flight execution engine evaluating 11 deterministic checks:
  1. `AGENT_ACTIVE`: Requesting agent registered and active.
  2. `PROVIDER_REGISTERED`: Destination provider verified in registry.
  3. `MAX_AMOUNT_PER_TX`: Transaction amount within single-transaction cap.
  4. `DAILY_VOLUME_CEILING`: 24-hour UTC cumulative spending within daily limit.
  5. `VELOCITY_LIMIT`: Maximum transactions per hour not exceeded.
  6. `RATE_LIMIT`: Minimum interval between consecutive transactions maintained.
  7. `PROHIBITED_CATEGORIES`: Service category not in prohibited blacklist.
  8. `MANDATE_EXPIRATION`: SLA timestamp valid and unexpired.
  9. `PERMITTED_ASSET`: Asset in allowed list (`HSK`, `USDT`, `USDC`).
  10. `PERMITTED_NETWORK`: Chain ID in allowed list (`133` Testnet, `177` Mainnet).
  11. `DUPLICATE_PAYMENT_DETECTION`: Detects matching hash / in-flight requests.
- Returns explicit 3-state output:
  - `APPROVED FOR AUTHORISATION` (green)
  - `BLOCKED` (red)
  - `REQUIRES REVIEW` (amber)
- Pure dry-run: never invokes wallet keys or broadcasts transactions.

### 3.4. Agent Delegations & Budget Engine (`app.paypilot.delegation_service`)
- Enforces user-delegated spending ceilings per agent.
- Atomic balance lifecycle:
  - `reserve_budget(amount)`: Atomically locks funds when mandate is staged.
  - `settle_reservation(amount)`: Converts reserved balance to spent upon settlement.
  - `release_reservation(amount)`: Frees locked balance upon cancellation or failure.
- **Security Invariant**: Delegations cannot be created or modified by agent role identities (`agent_*`). Only administrative operators (`admin_operator`) can adjust limits.

### 3.5. Explainable Provider Trust Analyzer (`app.paypilot.trust_analyzer`)
- Deconstructs provider trust into 4 verifiable factors:
  1. HSK Address & Contract Verification (EVM address checksum and contract code inspection).
  2. Service Terms & SLA Completeness (deliverable clarity, pricing model, endpoint docs).
  3. Local Settlement History (exact count of successful local settlements).
  4. Dispute & Incident Frequency.
- Flags `INSUFFICIENT_HISTORY` whenever recorded local settlements < 3.
- Advisory only: never overrides deterministic policy limits or bypasses human approvals.

### 3.6. Evidence Bundle & 8-Point Verifier (`app.paypilot.evidence_bundle`)
- Packages complete task-to-settlement lifecycle into an immutable JSON document.
- Executes independent 8-point verification:
  1. `BUNDLE_HASH_INTEGRITY`: Recalculates canonical RFC 8785 hash.
  2. `AGREEMENT_HASH_MATCH`: Verifies embedded agreement hash.
  3. `SIGNATURE_FORMAT`: Confirms EVM wallet authorization signature presence.
  4. `CHAIN_ID_VALIDATION`: Verifies target chain matches official HSK network ID.
  5. `DUPLICATE_TRANSACTION_CHECK`: Asserts tx hash is unique across evidence bundles.
  6. `RECEIPT_EXISTS`: Cross-checks local settlement receipt store.
  7. `AUDIT_CHAIN_INTEGRITY`: Confirms inclusion in hash-chained audit ledger.
  8. `GATEWAY_EXECUTION_STATUS`: Verifies HSP payment state is `SETTLED`.

### 3.7. Payment Incidents & Safe Retry Manager (`app.paypilot.dispute_manager`)
- Tracks operational failures (`PROVIDER_TIMEOUT`, `REVERTED_ON_CHAIN`, `DELIVERABLE_BREACH`, `GATEWAY_ERROR`).
- **Safe Retry Idempotency Checker**: Inspects target mandate status and blocks retrying payments that are already in-flight or settled, preventing double-spending.

### 3.8. Sentinel-to-PayPilot Telecom Bridge (`app.paypilot.sentinel_bridge`)
- Real-time link between IoT congestion intelligence and autonomous Web3 payments.
- Continuously scans active Sentinel virtual monitoring zones:
  - `CRS >= 40`: Elevated congestion trigger (advisory staging).
  - `CRS >= 75`: Critical congestion trigger (priority staging).
- Maps congestion levels to mitigation categories (`TELECOM_BANDWIDTH`, `EDGE_COMPUTE`).
- Automatically drafts Service Agreement and stages Mandate, requiring operator wallet signing before execution.

### 3.9. HashKey Settlement Protocol (HSP) v2.3.0 Client (`app.paypilot.hsp_service`)
- Conforms to HashKey Merchant API v2.3.0 specification.
- Features:
  - Request HMAC: `METHOD\nPATH\nQUERY\nbodyHash\ntimestamp\nnonce` where `bodyHash = hex(SHA256(canonical_json(body)))`.
  - Request Headers: `X-App-Key`, `X-Timestamp`, `X-Nonce`, `X-Signature`.
  - AP2 Cart Mandate structure (`contents`, `id`, `user_cart_confirmation_required`, `payment_request` with `method_data` [x402Version 2] and `details`).
  - Webhook Signature Verification (`X-Signature: t=<unix_ts>,v1=<hmac_hex>`).
  - Dual-Mode transparent demo adapter (`is_demo=True`, `gateway_type="HSP_GATEWAY_DEMO"`).

---

## 4. Cryptographic Security Invariants

| Invariant | Enforcement Mechanism |
|---|---|
| **No Unsigned Payments** | Every mandate requires an EIP-712 or personal wallet signature before gateway submission. |
| **No Autonomous LLM Key Holding** | Private keys are held exclusively in the user's browser EVM wallet; server and AI agents hold zero keys. |
| **Deterministic Spending Guard** | Spending limits and daily budgets are evaluated deterministically in Python/SQL, never decided by LLMs. |
| **No Agent Privilege Escalation** | Agent identities cannot modify delegation budgets or spending policies. |
| **Anti-Tampering Assurance** | Pre-authorization recomputes RFC 8785 SHA-256 hash against initial terms. |
| **Prompt Injection Immunity** | External discovery data is sanitized; injection markers are flagged and blocked from policy execution. |
| **Idempotent Settlement** | Mandate states and tx hashes are tracked; retry checks prevent double payments. |
