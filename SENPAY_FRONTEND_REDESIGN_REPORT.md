# SENPAY Frontend Redesign: Operational NOC & Motion Design Transformation

**Target Repository:** `https://github.com/niharika19singh/TeleSol`  
**Latest Production Commit:** `5b01e36` (`main` branch)  
**Live Frontend:** [https://frontend-five-psi-43.vercel.app](https://frontend-five-psi-43.vercel.app)  
**Live Backend API:** [https://telesol-sentinel-api.onrender.com](https://telesol-sentinel-api.onrender.com)  

---

## 1. Executive Summary & Design Vision

The SENPAY interface has been completely transformed into a disciplined, high-density **Telecom Network Operations Center (NOC)** platform. 

The redesign is grounded in two specific design references:

### Reference 1 — Operational Dashboard Design ([Dribbble Shot 26103275](https://dribbble.com/shots/26103275-AI-Powered-Airport-Interface))
- **Spatial Composition & Situational Awareness:** Multi-panel spatial layouts displaying real-time network topology, radio link metrics (RSRP, RSRQ, SNR, Throughput), and active incident severities concurrently without visual clutter.
- **Operational Flight-Strips:** Dedicated telemetry ribbons (`.telecom-op-strip`) at the top of every critical operational view, displaying incident identifiers (`#INC-2026-8812`), topology breadcrumbs (`GW-CORE-01 → BS-WEST-02 → SEC-VIP-C1`), live packet loss, RTT, throughput degradation, ML model provenance, and instantaneous 1-click mitigation actions.
- **Tight Coupling of Monitoring → Analytics → Action:** Telemetry detection flows directly into Counterfactual Impact Projections (-71.8% CRS drop) and automated PayPilot escrow authorization without context-switching.

### Reference 2 — Enterprise Motion Design ([Dribbble Shot 26834933](https://dribbble.com/shots/26834933-Website-Motion-Design))
- **Disciplined Enterprise Motion:** Restrained durations (150ms–350ms) using custom easing curves (`cubic-bezier(0.16, 1, 0.3, 1)`) for subtle, professional micro-interactions.
- **Progressive Disclosure Drawers:** Interactive slide-out panels (`.drawer-enter`) for telemetry inspection, cryptographic proof bundles, and multi-signature authorizer trails.
- **Subtle Live Pulses & Elevation:** Heartbeat indicators (`.noc-pulse-subtle`) for live radio feeds and smooth elevation transitions (`.hover-elevate`) on hover.
- **Full Accessibility Compliance:** Complete `@media (prefers-reduced-motion: reduce)` overrides across all animations and transitions.

---

## 2. Global Dual-Theme Architecture

SENPAY adheres strictly to exactly two production themes, designed at the CSS variable token level:

| Theme | Background | Panel / Card | Border | Accent & Highlights |
| :--- | :--- | :--- | :--- | :--- |
| **Obsidian Dark** | `#07090D` (True technical black) | `#0F141B` / `#141B24` | `#232F3D` | Technical Cyan (`#00E5FF`), Amber (`#FFB800`), Rose (`#FF3366`) |
| **Porcelain Light** | `#F8FAFC` (Clean operational white) | `#FFFFFF` / `#F1F5F9` | `#CBD5E1` | Deep Technical Blue (`#0284C7`), Amber (`#D97706`), Crimson (`#E11D48`) |

Both themes have been verified using headless browser rendering across all key views, ensuring high contrast, sharp font readability, and zero illegible gray-on-gray elements. Both can be tested via `?theme=dark` or `?theme=light`.

---

## 3. Visual Evidence Gallery (20 Full-Resolution Artifacts)

````carousel
![Live Production Command Center — Obsidian Dark](/Users/user/.gemini/antigravity/brain/0e2f0d3e-6e2c-4850-bfad-9935511b02a6/redesign_20_live_production_command_center.png)
<!-- slide -->
![Command Center — Obsidian Dark](/Users/user/.gemini/antigravity/brain/0e2f0d3e-6e2c-4850-bfad-9935511b02a6/redesign_01_command_center_dark.png)
<!-- slide -->
![Command Center — Porcelain Light](/Users/user/.gemini/antigravity/brain/0e2f0d3e-6e2c-4850-bfad-9935511b02a6/redesign_02_command_center_porcelain_light.png)
<!-- slide -->
![Telecom Intervention Optimizer — Obsidian Dark](/Users/user/.gemini/antigravity/brain/0e2f0d3e-6e2c-4850-bfad-9935511b02a6/redesign_16_intervention_optimizer_dark.png)
<!-- slide -->
![Telecom Intervention Optimizer — Porcelain Light](/Users/user/.gemini/antigravity/brain/0e2f0d3e-6e2c-4850-bfad-9935511b02a6/redesign_17_intervention_optimizer_light.png)
<!-- slide -->
![Pre-Execution Safety Simulator — Obsidian Dark](/Users/user/.gemini/antigravity/brain/0e2f0d3e-6e2c-4850-bfad-9935511b02a6/redesign_18_safety_simulator_dark.png)
<!-- slide -->
![Pre-Execution Safety Simulator — Porcelain Light](/Users/user/.gemini/antigravity/brain/0e2f0d3e-6e2c-4850-bfad-9935511b02a6/redesign_19_safety_simulator_light.png)
<!-- slide -->
![Incident Monitor & Alerts — Obsidian Dark](/Users/user/.gemini/antigravity/brain/0e2f0d3e-6e2c-4850-bfad-9935511b02a6/redesign_03_incident_monitor_dark.png)
<!-- slide -->
![Incident Monitor & Alerts — Porcelain Light](/Users/user/.gemini/antigravity/brain/0e2f0d3e-6e2c-4850-bfad-9935511b02a6/redesign_06_incident_monitor_light.png)
<!-- slide -->
![Payment Operations & Settlement — Obsidian Dark](/Users/user/.gemini/antigravity/brain/0e2f0d3e-6e2c-4850-bfad-9935511b02a6/redesign_04_payment_operations_dark.png)
<!-- slide -->
![Payment Operations & Settlement — Porcelain Light](/Users/user/.gemini/antigravity/brain/0e2f0d3e-6e2c-4850-bfad-9935511b02a6/redesign_07_payment_operations_light.png)
<!-- slide -->
![Service Agreements & SLA Registry — Obsidian Dark](/Users/user/.gemini/antigravity/brain/0e2f0d3e-6e2c-4850-bfad-9935511b02a6/redesign_05_service_agreements_dark.png)
<!-- slide -->
![Service Agreements & SLA Registry — Porcelain Light](/Users/user/.gemini/antigravity/brain/0e2f0d3e-6e2c-4850-bfad-9935511b02a6/redesign_08_service_agreements_light.png)
<!-- slide -->
![Provider Discovery & Slices — Obsidian Dark](/Users/user/.gemini/antigravity/brain/0e2f0d3e-6e2c-4850-bfad-9935511b02a6/redesign_14_provider_discovery_dark.png)
<!-- slide -->
![Provider Discovery & Slices — Porcelain Light](/Users/user/.gemini/antigravity/brain/0e2f0d3e-6e2c-4850-bfad-9935511b02a6/redesign_15_provider_discovery_light.png)
<!-- slide -->
![Network Digital Twin Map — Obsidian Dark](/Users/user/.gemini/antigravity/brain/0e2f0d3e-6e2c-4850-bfad-9935511b02a6/redesign_11_map_digital_twin_dark.png)
<!-- slide -->
![Network Digital Twin Map — Porcelain Light](/Users/user/.gemini/antigravity/brain/0e2f0d3e-6e2c-4850-bfad-9935511b02a6/redesign_12_map_digital_twin_light.png)
<!-- slide -->
![Telemetry Engine & Risk Analytics — Obsidian Dark](/Users/user/.gemini/antigravity/brain/0e2f0d3e-6e2c-4850-bfad-9935511b02a6/redesign_09_analytics_dark.png)
<!-- slide -->
![Telemetry Engine & Risk Analytics — Porcelain Light](/Users/user/.gemini/antigravity/brain/0e2f0d3e-6e2c-4850-bfad-9935511b02a6/redesign_10_analytics_light.png)
````

---

## 4. Screen-by-Screen Redesign Breakdown

### A. Main Dashboard & Command Center ([ActiveCommandCenter.jsx](file:///Users/user/Documents/TeleSol-mac-release/frontend/src/components/command/ActiveCommandCenter.jsx))
- **Top Operational Flight-Strip:** Incident `#INC-2026-8812` ribbon showing topology breadcrumbs (`GATEWAY → FIBER → BS-WEST-02 → SEC-VIP-C1`), live packet loss (14.2%), RTT (142ms), throughput loss (-120 Mbps), ML provenance trigger, and 1-click **Authorize 12.50 HSK Escrow**.
- **Network Digital Twin:** Interactive sector tabs (`SEC-VIP-C1`, `BS-WEST-02`, `SkyLink Slice`) overlaid with a Counterfactual Impact Projection badge (-71.8% CRS drop).
- **8-Stage Operational Workflow:** Interactive milestone track (Detection → Diagnosis → CFE → Proposal → Policy Check → Multi-Sig → Escrow Locked → Service Active) with clickable drawer disclosure.
- **Provider Multi-Criteria Ranking:** Multi-criteria decision matrix ranking SkyLink, Apex Optical, and MetroWave.

### B. Telecom Intervention Optimizer & What-If Engine ([SimulationPage.jsx](file:///Users/user/Documents/TeleSol-mac-release/frontend/src/components/simulation/SimulationPage.jsx))
- **Operational Incident Strip:** Top flight-strip for `#INC-2026-8812` targeting Sector C (VIP Corridor, BS-WEST-02) with live telemetry baselines.
- **Physical Radio Parameters:** Dynamic sliders for PRB Resource Congestion (0-10 PRB/10), Ingress Throughput Load (0-500 Mbps-eq), and Backhaul Link Degradation (0-100%).
- **Intervention Route Selection:** Interactive comparison cards between SkyLink 5G Dedicated Slice (12.50 HSK, -94% loss), Apex Optical Direct Transit (18.00 HSK, -98% loss), and MetroWave Micro-POP Offload (8.25 HSK, -85% loss).
- **Projected Counterfactual SLA Outcome Card:** Real-time impact forecast showing CRS drop (78 → 22), packet loss reduction (14.2% → 0.8%), latency drop (142ms → 14ms), and 99.999% SLA safety.
- **Autonomous Escrow Lock Simulator:** Direct dry-run lock into HashKey Testnet (133).

### C. Pre-Execution Policy & Safety Simulator ([SafetySimulatorView.jsx](file:///Users/user/Documents/TeleSol-mac-release/frontend/src/components/paypilot/SafetySimulatorView.jsx))
- **11-Rule Deterministic Pre-Flight Gate:** Comprehensive verification without private key signing or gas spend (ceiling checks, daily budget velocity, token allowlists, recipient sanitization, duplicate prevention, and trust scoring).
- **RFC 8785 Audit Trail Inspection:** Exact JSON canonicalization preview with fee estimation and execution permissions.

### D. Incident Management & Alert Feed ([AlertsPage.jsx](file:///Users/user/Documents/TeleSol-mac-release/frontend/src/components/alerts/AlertsPage.jsx), [AlertFeed.jsx](file:///Users/user/Documents/TeleSol-mac-release/frontend/src/components/alerts/AlertFeed.jsx))
- **Severity Ribbons:** Compact flight-strip incident cards with colored severity indicator ribbons.
- **Telemetry Inspection Drawer:** Expandable drawer detailing RSRP signal degradation, hop packet loss, and direct PayPilot mitigation actions.

### E. Autonomous Payment Operations & Settlement ([PaymentOperationsPage.jsx](file:///Users/user/Documents/TeleSol-mac-release/frontend/src/components/paypilot/PaymentOperationsPage.jsx))
- **5-Stage Escrow Lifecycle Visualizer:** State progression: Created → Locked → Delivered → Evaluated → Settled.
- **Dual-Wave Telemetry Chart:** Recharts area visualizer showing real-time QoS performance against contractual SLA baselines.
- **Cryptographic Audit Drawer:** Progressive disclosure panel inspecting RFC 8785 canonical hashes, counterfactual proofs, and HashKey settlement transaction hashes.

### F. Service Agreements & SLA Registry ([ServiceAgreementsPage.jsx](file:///Users/user/Documents/TeleSol-mac-release/frontend/src/components/paypilot/ServiceAgreementsPage.jsx))
- **SLA Flight-Strips:** Structured cards highlighting latency guarantees (<20ms), guaranteed bitrate (500 Mbps), and penalty terms.
- **Tamper Integrity Badges:** Live verification of SHA-256 agreement hashes against on-chain records.

### G. Service & Provider Discovery ([DiscoveryPage.jsx](file:///Users/user/Documents/TeleSol-mac-release/frontend/src/components/paypilot/DiscoveryPage.jsx))
- **Verified Telecom Provider Catalog:** Live listing for SkyLink 5G Slice, Apex Optical Transit, MetroWave Micro-POP, and Sentinel Traffic Broker with real-time pricing and Trust Scores (91%–98%).

---

## 5. Verification & Test Suite Summary

- **Frontend Production Build:** Successful Vite compilation with zero chunk-size warnings; clean chunk splitting configured via `manualChunks` in `vite.config.js` (`vendor-icons`, `vendor-map`, `vendor-charts`, `index`).
- **Backend Test Suite:** 126/126 unit and integration tests passing (`Ran 126 tests in 1.925s - OK`).
- **Live Deployment:** Deployed to Vercel production: [https://frontend-five-psi-43.vercel.app](https://frontend-five-psi-43.vercel.app) (HTTP/2 200).
- **Backend API Health:** Remote Render API verified healthy: [https://telesol-sentinel-api.onrender.com/api/health](https://telesol-sentinel-api.onrender.com/api/health) (v3.5.0, ML inference ready, database online).
