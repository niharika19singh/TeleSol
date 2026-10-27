# TeleSol — Predictive Telecom Intelligence & PayPilot 2.0 Trust-Aware Payments
## HSK Chain Horizon Hackathon: Agent Payments & A2A Settlement (HSP) Track

TeleSol is a dual-subsystem Web3 & IoT platform designed for high-density telecommunication infrastructure and trust-aware autonomous AI agent commerce.

- **TeleSol Sentinel**: Real-time crowd monitoring and telecom congestion prediction (Congestion Risk Score - CRS) powered by ESP32 sensors and TinyFish web intelligence.
- **TeleSol PayPilot 2.0**: Trust-aware autonomous Agent-to-Agent (A2A) payment coordination and settlement platform on **HSK Chain**, integrating the official **HashKey Settlement Protocol (HSP) v2.3.0** (Merchant API & AP2 Cart Mandate).

---

## 1. Subsystem Architecture

```
                                  TELECOMMUNICATIONS & AGENT ECOSYSTEM
                                                   │
                ┌──────────────────────────────────┴──────────────────────────────────┐
                │                                                                     │
                ▼                                                                     ▼
     [ TeleSol Sentinel: IoT Engine ]                                      [ TeleSol PayPilot 2.0: Web3 Payments ]
  ┌───────────────────────────────────┐                                 ┌───────────────────────────────────┐
  │ • ESP32 Radar / ToF / IMU Sensors │                                 │ • Service Discovery (TinyFish)    │
  │ • Real-time Congestion Score (CRS)│                                 │ • Service Agreements (RFC 8785)   │
  │ • Zone Ingestion & Alerts Stream  │                                 │ • Explainable Provider Trust (4F) │
  │ • Sentinel-to-PayPilot Mitigation │                                 │ • Pre-Execution Safety Simulator  │
  └─────────────────┬─────────────────┘                                 │ • Agent Delegations & Budgets     │
                    │                                                   │ • Mandatory Web3 Wallet Auth      │
                    │                                                   │ • HashKey Settlement (HSP v2.3.0) │
                    │                                                   │ • Evidence Bundles (8-Pt Verify)  │
                    │                                                   │ • Incidents, Disputes & Safe Retry│
                    │                                                   │ • Tamper-Evident SHA-256 Audit    │
                    │                                                   └─────────────────┬─────────────────┘
                    └─────────────────────────────────┬───────────────────────────────────┘
                                                      │
                                                      ▼
                                       ┌─────────────────────────────┐
                                       │ FastAPI Backend (Port 8000) │
                                       │   - CRS Realtime Engine     │
                                       │   - PayPilot 2.0 REST Suite │
                                       │   - SQLite WAL Persistence  │
                                       └──────────────┬──────────────┘
                                                      │
                                                      ▼
                                       ┌─────────────────────────────┐
                                       │ React 19 Frontend (Port 5173│
                                       │   - Telecom NOC Dashboard   │
                                       │   - PayPilot 2.0 Suite      │
                                       │   - Sentinel Bridge Alerts  │
                                       │   - Product Mode Switcher   │
                                       └─────────────────────────────┘
```

---

## 2. TeleSol PayPilot 2.0: Four-Pillar Trust Binding

Unlike traditional Web3 agent payment implementations that treat payments as isolated transactions, PayPilot 2.0 introduces a cryptographic **Four-Pillar Binding**:

1. **Agent Task Intent**: The explicit operational reason for requesting a service (e.g. emergency 5G slice mitigation in response to elevated Sentinel CRS scores).
2. **Selected Service Provider**: Verified on-chain provider identity with explainable trust signals (address checksum, SLA terms, local settlement count) and documented confidence limits.
3. **Payment Mandate & Spending Boundary**: Deterministically enforced policies and user-delegated spending bounds, anchored off-chain via RFC 8785 canonical hashes.
4. **Independently Verifiable Settlement**: Tamper-evident evidence bundle connecting wallet signatures, HashKey Settlement Protocol (HSP) v2.3.0 gateway execution, and on-chain HSK Chain transaction receipts.

---

## 3. Quick Start (2 Commands)

### Prerequisites
- Python 3.10+
- Node.js 18+

### Step 1: Backend Setup
```bash
cd backend
source venv/bin/activate
# Or create venv: python3 -m venv venv && pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```
*Health Check*: Visit `http://localhost:8000/api/paypilot/health`

### Step 2: Frontend Setup
```bash
cd frontend
npm install
npm run dev
```
*Application UI*: Open `http://localhost:5173` in your browser. Use the sidebar product switcher to toggle between **TeleSol PayPilot** and **TeleSol Sentinel**.

---

## 4. Automated Test Suite (33/33 Tests Passing)

The repository contains an automated test suite verifying both subsystems and all 10 phases of PayPilot 2.0:

```bash
cd backend
PYTHONPATH=. venv/bin/python -m unittest discover tests
```

**Results (33/33 passing in ~0.3s)**:
- `test_sentinel.py` (10 tests): Sensor ingestion, CRS calculation formula, alert thresholds, WebSocket broadcast.
- `test_paypilot.py` (9 tests): Basic agent registration, policy evaluation, wallet execution, audit trails.
- `test_paypilot_v2.py` (9 tests):
  - `test_01_canonical_json_determinism`: RFC 8785 canonical serialization and hashing.
  - `test_02_service_agreement_tamper_check`: Pre-authorization tamper check detecting term changes.
  - `test_03_prompt_injection_sanitization`: Untrusted web lead sanitization and injection flagging.
  - `test_04_agent_delegation_budget_reservation`: Atomic reserve/settle/release lifecycle and non-escalation guard.
  - `test_05_provider_trust_signals`: Explainable 4-factor trust evaluation and `INSUFFICIENT_HISTORY` flag.
  - `test_06_pre_execution_safety_simulator`: 11 deterministic checks with 3-state output (`APPROVED`, `BLOCKED`, `REQUIRES REVIEW`).
  - `test_07_evidence_bundle_verification`: Complete 8-point independent cryptographic verification.
  - `test_08_dispute_and_safe_retry_idempotency`: Safe retry check blocking double payments for in-flight/settled orders.
  - `test_09_sentinel_congestion_to_mitigation`: Real-time Sentinel CRS congestion ➔ autonomous mitigation agreement ➔ mandate staging.
- `test_contract_specs.py` (5 tests): HSK Chain RPC configuration, AgentPolicyRegistry bytecode, EIP-712 typing.

---

## 5. Official Protocol & Network Grounding

- **Target Network**: HSK Chain (Testnet Chain ID `133`, Mainnet Chain ID `177`). RPC: `https://testnet.hsk.xyz`.
- **Payment Protocol**: HashKey Settlement Protocol (HSP) / HashKey Merchant API v2.3.0.
  - RFC 8785 Canonical JSON request body hashing.
  - Official HMAC-SHA256 headers: `X-App-Key`, `X-Timestamp`, `X-Nonce`, `X-Signature`.
  - AP2 Cart Mandate structure with x402 payment request.
  - Webhook verification: `X-Signature: t=<timestamp>,v1=<signature>`.
- **Dual-Mode Assurance**: Includes an explicit, transparent Demo Adapter (`is_demo=True`, `gateway_type="HSP_GATEWAY_DEMO"`) when live merchant credentials are not configured, with zero fabricated mainnet transaction proofs.

---

## 6. Documentation Directory

- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md): Complete system architecture, component breakdown, and security invariants.
- [`docs/HSP_INTEGRATION.md`](docs/HSP_INTEGRATION.md): HashKey Merchant API v2.3.0, Cart Mandate, HMAC, and Webhook verification guide.
- [`docs/HSK_CHAIN.md`](docs/HSK_CHAIN.md): HSK Chain RPC endpoints, explorer, gas parameters, and network metadata.
- [`docs/DEMO.md`](docs/DEMO.md): 10-stage end-to-end judge walkthrough guide.
- [`docs/SECURITY.md`](docs/SECURITY.md): Threat model, prompt injection defenses, deterministic policy boundaries, and wallet authorization safeguards.
- [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md): Production deployment guide, Dockerfile, Nginx reverse proxy, and environment variables.
- [`docs/KNOWN_LIMITATIONS.md`](docs/KNOWN_LIMITATIONS.md): Documented observation limits and testnet conditions.
