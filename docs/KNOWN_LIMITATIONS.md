# TeleSol PayPilot: Known Limitations & Roadmap

This document outlines the current technical boundaries, hackathon mock adaptations, and planned engineering milestones for **TeleSol PayPilot**.

---

## 1. Current Status & Hackathon Adaptations

| Component | Current Implementation | Hackathon Scope Adaptation | Planned Production Upgrade |
| :--- | :--- | :--- | :--- |
| **HashKey Settlement Protocol (HSP)** | Fully implemented HMAC-SHA256 client (`hsp_service.py`) supporting official endpoints (`/api/v1/merchant/orders`). | When production merchant API keys are absent, falls back to `HSP_GATEWAY_DEMO` with clear UI labeling. | Formal onboarding into HashKey Merchant Sandbox/Production partner portal. |
| **HSK Chain Interaction** | Live JSON-RPC adapter polling `eth_getTransactionReceipt` and `eth_blockNumber` on HSK Testnet (133). | Deterministic demo transactions (`tx_demo_...`) labelled as `DEMO_VERIFIED` to prevent simulated falsification on public explorers. | Real HSK testnet faucet funds for automated test runner pipelines. |
| **Database Engine** | Thread-safe SQLite with Write-Ahead Logging (`PRAGMA journal_mode=WAL;`). | Compact, zero-dependency deployment suitable for local evaluation and hackathon judging. | PostgreSQL with connection pooling (e.g., Supabase / Neon / Cloud SQL) for high-concurrency production deployments. |
| **Supported Assets** | HSK (Native gas & currency), USDT (ERC-20), USDC (ERC-20). | Token contracts verified against HSK Testnet specifications. | Multi-token streaming and dynamic cross-token swaps. |
| **Service Discovery** | TinyFish Search & Fetch API adapter with untrusted data sanitization. | Bundled verified demo service providers when `TINYFISH_API_KEY` is not present. | Continuous decentralized agent registry indexing via decentralized DHT/P2P gossip. |

---

## 2. Security Boundaries & Assumptions

1. **Non-Custodial Principle**: PayPilot intentionally does not hold custody of private keys or seed phrases. All spending mandates require human approval via a browser extension (MetaMask/Rabby) or authorized MPC wallet.
2. **Untrusted Web Content**: Any text crawled from external web endpoints or agent service catalogs is sanitized through regex filters and treated strictly as data, never as executable code or prompt directives.
3. **Role Boundary Isolation**: A service provider agent cannot approve or authorize a payment directed to itself.

---

## 3. Future Roadmap

- [ ] **EIP-712 Typed Structured Data Signing**: Migrate mandate personal sign messages to full EIP-712 domain-separated typed data.
- [ ] **Account Abstraction (ERC-4337)**: Support session keys and paymasters on HSK Chain so agents can execute micro-transactions within pre-approved spending caps without interactive popups on every single call.
- [ ] **Automated Faucet Claiming**: Embedded HSK Testnet faucet claim integration for developers.
- [ ] **Multi-Agent Dispute Resolution**: Escrow-based mandate locking with autonomous arbitrator agent consensus.
