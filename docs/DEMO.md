# TeleSol PayPilot 2.0: Hackathon Judge & Developer Demo Walkthrough
## Trust-Aware Autonomous Agent Payments on HSK Chain

Welcome to **TeleSol PayPilot 2.0**, the trust-aware autonomous Agent-to-Agent payment coordination and settlement platform built for the **HSK Chain Horizon Hackathon** under the **Agent Payments & A2A Settlement (HSP)** track.

This document walks you through running, exploring, and verifying the complete 10-stage end-to-end payment workflow.

---

## 1. Quick Launch (2 Commands)

Open two terminal windows in the workspace root:

### Terminal 1: Backend
```bash
cd backend
source venv/bin/activate
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```
*Health check: Visit `http://localhost:8000/api/paypilot/health` in your browser.*

### Terminal 2: Frontend
```bash
cd frontend
npm run dev
```
*Web application will be running at `http://localhost:5173`.*

---

## 2. Dual-Mode Environment Setup

PayPilot is pre-configured with a dual-mode adapter:

- **DEMO Mode (Ready out-of-the-box)**: All features, policy rules, AI parsing, mandate progression, and simulated wallet signatures work without needing third-party API keys or testnet gas.
- **LIVE HSK Testnet Mode**: Connect MetaMask or any EIP-1193 wallet to switch to **HSK Testnet (Chain ID 133)**. Set `HSP_APP_KEY` and `HSP_APP_SECRET` in `.env` if you have live HashKey Merchant credentials.

---

## 3. End-to-End Walkthrough: 10 Key Milestones

### Milestone 1: Sentinel NOC Congestion Alert & Telecom Trigger
1. Notice the top banner: **Sentinel NOC Trigger**.
2. When Crowd Risk Score (CRS) in any zone rises above 40 (or switch to Sentinel simulation scenario "Congestion" or "Sudden Surge"), an interactive alert bar appears.
3. Click **Mitigate with PayPilot**: The system automatically bridges Sentinel IoT intelligence to PayPilot, drafting a Service Agreement for an emergency 5G QoS slice (12.5 HSK) and staging a mandate with a mandatory wallet halt.

### Milestone 2: Discovery & Explainable Provider Trust Profile
1. Click **Discovery & Trust** in the sidebar.
2. Search for `"bandwidth"` or filter by category (`Telecom Bandwidth`, `Edge Compute`, etc.).
3. On any provider card (e.g., `prov_telecom_01`), click **Trust Signals**.
4. The **Explainable Provider Trust Profile** modal opens, displaying:
   - Overall advisory recommendation (`RECOMMENDED` / `PROCEED_WITH_CAUTION`).
   - `INSUFFICIENT_HISTORY` flag if recorded settlements < 3.
   - 4 factor cards with verified provenance: HSK Address Checksum, SLA Completeness, Local Settlement Count, and Dispute Rate.
   - Explicit advisory disclaimer: *"Trust signals are purely advisory intelligence and do not override deterministic spending rules."*

### Milestone 3: Service Agreement Creation & RFC 8785 Canonical Hash Anchoring
1. Click **Service Agreements** in the sidebar.
2. Select an agreement (e.g., `SA-SENTINEL-EDGE-001`).
3. Inspect the cryptographic **Agreement Hash (SHA-256 over Canonical RFC 8785 JSON)**.
4. Click **Verify Tamper Integrity**: The backend recalculates the canonical JSON from stored database parameters and asserts 100% hash equivalence.
5. Review the binding: Task ID, Requesting Agent, Provider, SLA Expiry, Deliverables, and Required Evidence (`TELECOM_QOS_TELEMETRY_LOG`).

### Milestone 4: Pre-Execution Safety Simulator
1. Click **Safety Simulator** in the sidebar.
2. Notice the **Zero-Risk Pre-flight Guarantee**: Dry-run only; never invokes private keys or broadcasts transactions.
3. Observe the evaluation of **11 Deterministic Checks**:
   - `AGENT_ACTIVE`, `PROVIDER_REGISTERED`, `MAX_AMOUNT_PER_TX`, `DAILY_VOLUME_CEILING`, `VELOCITY_LIMIT`, `RATE_LIMIT`, `PROHIBITED_CATEGORIES`, `MANDATE_EXPIRATION`, `PERMITTED_ASSET`, `PERMITTED_NETWORK`, `DUPLICATE_PAYMENT_DETECTION`.
4. Drag the **Simulated Amount** slider above 50 HSK (or adjust hypothetical policy overrides):
   - Notice the instantaneous state transition to **BLOCKED** with clear explanatory feedback!
5. Select a prohibited category or unregistered provider to see exact guardrail failures.

### Milestone 5: Agent Delegations & Atomic Budget Reservation
1. Click **Agent Delegations** in the sidebar.
2. Review delegated budgets (e.g. `DEL-SENTINEL-AUTONOMOUS` with 100 HSK Total Budget).
3. Inspect the multi-segment progress bar showing **Spent** vs **In-Flight Reserved** vs **Free Available**.
4. Click **Suspend** on any delegation: notice the instant status change to `SUSPENDED` and audit trail entry. Click **Resume** to reactivate.
5. Review the non-escalation guarantee: *"Agents cannot self-elevate limits or alter permissions."*

### Milestone 6: Mandatory Wallet Authorization & Security Halt
1. Click **Mandates & Policy** in the sidebar.
2. Click **Authorize Mandate** on an approved mandate.
3. The **Wallet Execution Modal** appears, halting autonomous progression until explicit human approval is granted.
4. Sign with MetaMask on HSK Testnet (Chain ID 133) or use the interactive Demo Wallet.
5. The signature is captured and verified against the payer address.

### Milestone 7: HashKey Merchant API v2.3.0 Execution
1. Once signed, the system formulates an AP2 Cart Mandate payload with RFC 8785 canonical body hashing.
2. Generates official HMAC-SHA256 headers: `X-App-Key`, `X-Timestamp`, `X-Nonce`, `X-Signature`.
3. Submits to `/api/v1/merchant/orders` (or transparent Demo Adapter if credentials are not configured).
4. Displays real-time gateway order ID and settlement confirmation.

### Milestone 8: HSK Chain Node Verification & Settlement Receipts
1. The **HSK Chain Adapter** queries `eth_getTransactionReceipt` from `https://testnet.hsk.xyz`.
2. Confirms status `0x1`, block height, and gas used.
3. The modal issues a **Settlement Receipt** with 3-tier attribution (Policy Engine + HSP Gateway + HSK Block Explorer).
4. Click **Download JSON Receipt** to export.

### Milestone 9: Cryptographic Evidence Bundle & 8-Point Verification
1. Click **Evidence Bundles** in the sidebar.
2. Select a bundle (e.g. `EB-SETTLE-001`).
3. Review the complete Four-Pillar Binding connecting:
   - 1. Task & Requesting Agent
   - 2. Service Agreement Canonical Hash
   - 3. Authorized Mandate & Wallet Signature
   - 4. HSK Chain Settlement Receipt
4. Click **Verify Bundle**: Triggers an independent 8-point verification routine verifying bundle hash, agreement hash, signature format, chain ID, duplicate tx detection, receipt existence, audit chain continuity, and gateway state.
5. Click **Export JSON** to download the self-verifying evidence bundle document.

### Milestone 10: Payment Incidents, Disputes & Safe Idempotent Recovery
1. Click **Disputes & Recovery** in the sidebar.
2. Select an incident (e.g., `INC-TIMEOUT-001`).
3. Click **Safe Retry Check**: The system queries `/api/paypilot/safe-retry-check/{mandate_id}`, verifying that no funds are in-flight or settled before permitting a retry with a fresh nonce.
4. Try updating incident status to `INVESTIGATING`, `REFUNDED`, or `CLOSED`.

---

## 4. Verifying Test Suite (33/33 Passing)

To run the complete automated test suite verifying all 10 phases:

```bash
cd backend
PYTHONPATH=. venv/bin/python -m unittest discover tests
```

Expected output:
```
Ran 33 tests in 0.326s
OK
```
All unit tests for Sentinel CRS, TinyFish discovery, Canonical JSON, Service Agreements, Delegations, Simulator, Trust Profiles, Evidence Bundles, Disputes, Sentinel Bridge, and HSP Gateway pass cleanly.
