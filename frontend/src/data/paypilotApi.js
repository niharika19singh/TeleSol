/**
 * TeleSol PayPilot 2.0 — API Client with Deterministic Demo Adapter Fallback
 * ══════════════════════════════════════════════════════════════════════════
 * Connects frontend to PayPilot FastAPI backend endpoints:
 * Service Agreements, Delegations, Safety Simulator, Trust Profiles,
 * Evidence Bundles, Dispute Management, Sentinel Bridge, and HSP Gateway.
 * When in Demo Mode or when backend endpoints are unreachable, provides
 * deterministic, clearly-labelled SENPAY demo fixtures.
 */

import { API_BASE } from './api';
import {
  DATA_SOURCE_LABELS,
  DEMO_AGENTS,
  DEMO_PROVIDERS,
  DEMO_AGREEMENTS,
  DEMO_MANDATES,
  DEMO_POLICY,
  DEMO_DELEGATIONS,
  DEMO_EVIDENCE_BUNDLES,
  DEMO_INCIDENTS,
  DEMO_AUDIT_LOGS,
  buildDemoSafetySimulation,
} from './demoFixtures';

async function paypilotFetch(path, options = {}, fallbackData = undefined) {
  const url = `${API_BASE}/api/paypilot${path}`;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4500);
    const res = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      signal: controller.signal,
      ...options,
    });
    clearTimeout(timeout);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.detail || data.error || `HTTP ${res.status}`);
    }
    return {
      ...data,
      _dataSource: DATA_SOURCE_LABELS.LIVE_BACKEND,
    };
  } catch (err) {
    console.warn(`[PayPilot API] ${path} fallback triggered:`, err.message);
    if (fallbackData !== undefined) {
      return typeof fallbackData === 'function' ? fallbackData() : fallbackData;
    }
    throw err;
  }
}

// 1. Dashboard & Health
export async function fetchPayPilotDashboard() {
  return await paypilotFetch('/dashboard', {}, () => ({
    status: 'ok',
    demo_mode: true,
    total_requests: 4,
    authorized_mandates: 2,
    settled_transactions: 1,
    total_volume_hsk: 20.5,
    _dataSource: DATA_SOURCE_LABELS.SYNTHETIC_DEMO,
  }));
}

export async function fetchPayPilotHealth() {
  return await paypilotFetch('/health', {}, () => ({
    status: 'healthy',
    mode: 'DEMO',
    network_id: 133,
    _dataSource: DATA_SOURCE_LABELS.SYNTHETIC_DEMO,
  }));
}

// 2. Agents
export async function fetchAgents() {
  return await paypilotFetch('/agents', {}, () => ({
    agents: DEMO_AGENTS,
    _dataSource: DATA_SOURCE_LABELS.SYNTHETIC_DEMO,
  }));
}

export async function createAgent(agentData) {
  return await paypilotFetch('/agents', {
    method: 'POST',
    body: JSON.stringify(agentData),
  });
}

export async function updateAgentStatus(agentId, status) {
  return await paypilotFetch(`/agents/${agentId}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
}

// 3. Providers & Discovery
export async function fetchProviders(category = null) {
  const path = category ? `/providers?category=${encodeURIComponent(category)}` : '/providers';
  return await paypilotFetch(path, {}, () => ({
    providers: category
      ? DEMO_PROVIDERS.filter((p) => p.category === category)
      : DEMO_PROVIDERS,
    _dataSource: DATA_SOURCE_LABELS.SYNTHETIC_DEMO,
  }));
}

export async function registerProvider(providerData) {
  return await paypilotFetch('/providers', {
    method: 'POST',
    body: JSON.stringify(providerData),
  });
}

export async function discoverServices(query) {
  return await paypilotFetch(
    `/discovery?query=${encodeURIComponent(query)}`,
    {},
    () => {
      const q = (query || '').toLowerCase();
      const matched = DEMO_PROVIDERS.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q)
      );
      return {
        providers: matched.length > 0 ? matched : DEMO_PROVIDERS,
        external_leads: [],
        tinyfish_configured: false,
        _dataSource: DATA_SOURCE_LABELS.SYNTHETIC_DEMO,
      };
    }
  );
}

export async function fetchProviderTrust(providerId, amount = null) {
  const path = amount != null
    ? `/providers/${providerId}/trust?amount=${encodeURIComponent(amount)}`
    : `/providers/${providerId}/trust`;
  return await paypilotFetch(path, {}, () => {
    const prov = DEMO_PROVIDERS.find((p) => p.id === providerId) || DEMO_PROVIDERS[0];
    return {
      provider_id: prov.id,
      provider_name: prov.name,
      overall_trust_score: prov.trust_score || 96,
      tier: 'TIER_1_VERIFIED',
      recommendation: 'ELIGIBLE_FOR_AUTONOMOUS_ESCROW',
      historical_sla_fulfillment_pct: 98.4,
      dispute_rate_pct: 0.0,
      signals: [
        { name: 'On-Chain Identity Registry', status: 'VERIFIED', score: 98 },
        { name: 'Historical QoS SLA Fulfillment', status: 'VERIFIED', score: 97 },
        { name: 'RFC 8785 Contract Compliance', status: 'VERIFIED', score: 100 },
      ],
      _dataSource: DATA_SOURCE_LABELS.SYNTHETIC_DEMO,
    };
  });
}

// 4. Service Agreements (Phase 2)
export async function fetchServiceAgreements() {
  return await paypilotFetch('/agreements', {}, () => ({
    agreements: DEMO_AGREEMENTS,
    _dataSource: DATA_SOURCE_LABELS.SYNTHETIC_DEMO,
  }));
}

export async function fetchServiceAgreement(agreementId) {
  return await paypilotFetch(`/agreements/${agreementId}`, {}, () => ({
    agreement: DEMO_AGREEMENTS.find((a) => a.id === agreementId) || DEMO_AGREEMENTS[0],
    _dataSource: DATA_SOURCE_LABELS.SYNTHETIC_DEMO,
  }));
}

export async function createServiceAgreement(agreementData) {
  return await paypilotFetch('/agreements', {
    method: 'POST',
    body: JSON.stringify(agreementData),
  });
}

export async function verifyAgreementTamper(agreementId) {
  return await paypilotFetch(
    `/agreements/${agreementId}/tamper-check`,
    { method: 'POST' },
    () => ({
      valid: true,
      agreement_id: agreementId,
      message: 'Canonical RFC 8785 SHA-256 digest verified intact (Simulated Demo Check).',
      _dataSource: DATA_SOURCE_LABELS.SIMULATED_RESULT,
    })
  );
}

// 5. Payment Requests & Mandates
export async function fetchPaymentRequests() {
  return await paypilotFetch('/payment-requests', {}, () => ({
    payment_requests: [],
    _dataSource: DATA_SOURCE_LABELS.SYNTHETIC_DEMO,
  }));
}

export async function createPaymentRequest(reqData) {
  return await paypilotFetch('/payment-requests', {
    method: 'POST',
    body: JSON.stringify(reqData),
  });
}

export async function fetchMandates() {
  return await paypilotFetch('/mandates', {}, () => ({
    mandates: DEMO_MANDATES,
    _dataSource: DATA_SOURCE_LABELS.SYNTHETIC_DEMO,
  }));
}

// 6. Agent Delegations & Budgets (Phase 4)
export async function fetchDelegations() {
  return await paypilotFetch('/delegations', {}, () => ({
    delegations: DEMO_DELEGATIONS,
    _dataSource: DATA_SOURCE_LABELS.SYNTHETIC_DEMO,
  }));
}

export async function createDelegation(delegationData) {
  return await paypilotFetch('/delegations', {
    method: 'POST',
    body: JSON.stringify(delegationData),
  });
}

export async function updateDelegationStatus(delegationId, status, actor = 'admin_operator') {
  return await paypilotFetch(`/delegations/${delegationId}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status, actor }),
  });
}

// 7. Pre-Execution Safety Simulator (Phase 3)
export async function simulateSafety(payload) {
  return await paypilotFetch(
    '/simulate',
    {
      method: 'POST',
      body: JSON.stringify(payload),
    },
    () => buildDemoSafetySimulation(payload)
  );
}

// 8. Policy Engine
export async function fetchPolicy() {
  return await paypilotFetch('/policies', {}, () => ({
    policy: DEMO_POLICY,
    _dataSource: DATA_SOURCE_LABELS.SYNTHETIC_DEMO,
  }));
}

export async function updatePolicy(policyId, updates) {
  return await paypilotFetch(`/policies/${policyId}`, {
    method: 'PUT',
    body: JSON.stringify(updates),
  });
}

// 9. Payment Execution
export async function executePayment(execData) {
  return await paypilotFetch('/execute', {
    method: 'POST',
    body: JSON.stringify(execData),
  });
}

// 10. Transactions & Receipts
export async function fetchTransactions() {
  return await paypilotFetch('/transactions', {}, () => ({
    transactions: [
      {
        id: 'tx_demo_001',
        mandate_id: 'man_settled_001',
        amount: 8.0,
        asset: 'HSK',
        status: 'DEMO_VERIFIED',
        tx_hash: '0x573b9e4210a8b417c89f00112233445566778899aabbccddeeff00112233e79f',
        network_id: 133,
        created_at: new Date(Date.now() - 1800000).toISOString(),
        data_source: DATA_SOURCE_LABELS.SYNTHETIC_DEMO,
      },
    ],
    _dataSource: DATA_SOURCE_LABELS.SYNTHETIC_DEMO,
  }));
}

export async function fetchReceipt(receiptId) {
  return await paypilotFetch(`/receipts/${receiptId}`, {}, () => ({
    receipt_id: receiptId,
    status: 'DEMO_SIMULATED',
    _dataSource: DATA_SOURCE_LABELS.SYNTHETIC_DEMO,
  }));
}

export function getReceiptExportUrl(receiptId) {
  return `${API_BASE}/api/paypilot/receipts/${receiptId}/export`;
}

// 11. Evidence Bundles (Phase 6)
export async function fetchEvidenceBundles() {
  return await paypilotFetch('/evidence-bundles', {}, () => ({
    evidence_bundles: DEMO_EVIDENCE_BUNDLES,
    _dataSource: DATA_SOURCE_LABELS.SYNTHETIC_DEMO,
  }));
}

export async function fetchEvidenceBundle(bundleId) {
  return await paypilotFetch(`/evidence-bundles/${bundleId}`, {}, () => ({
    bundle: DEMO_EVIDENCE_BUNDLES.find((b) => b.id === bundleId) || DEMO_EVIDENCE_BUNDLES[0],
    _dataSource: DATA_SOURCE_LABELS.SYNTHETIC_DEMO,
  }));
}

export async function verifyEvidenceBundle(bundleId) {
  return await paypilotFetch(
    `/evidence-bundles/${bundleId}/verify`,
    { method: 'POST' },
    () => ({
      verified: true,
      bundle_id: bundleId,
      checklist: [
        { check: '1. Canonical RFC 8785 JSON Serialization', passed: true, detail: 'Valid canonical digest' },
        { check: '2. Service Agreement Hash Binding', passed: true, detail: 'Matches agr_seed_001' },
        { check: '3. Deterministic Policy Engine Approval', passed: true, detail: '11/11 rules passed' },
        { check: '4. Delegation Budget Reservation', passed: true, detail: 'Within 150.0 HSK pool' },
        { check: '5. Counterfactual Telemetry Evaluation', passed: true, detail: 'CRS 78.0 -> 22.0 (< 35.0 SLA)' },
        { check: '6. Settlement Receipt Attribution', passed: true, detail: 'Simulated Demo Adapter (Testnet 133)' },
        { check: '7. Audit Chain Continuity', passed: true, detail: 'SHA-256 chain unbroken' },
        { check: '8. Zero Credential Leakage', passed: true, detail: 'Redaction verified' },
      ],
      _dataSource: DATA_SOURCE_LABELS.SIMULATED_RESULT,
    })
  );
}

export function getEvidenceBundleExportUrl(bundleId) {
  return `${API_BASE}/api/paypilot/evidence-bundles/${bundleId}/export`;
}

// 12. Incident & Dispute Management (Phase 7)
export async function fetchIncidents() {
  return await paypilotFetch('/incidents', {}, () => ({
    incidents: DEMO_INCIDENTS,
    _dataSource: DATA_SOURCE_LABELS.SYNTHETIC_DEMO,
  }));
}

export async function createIncident(incidentData) {
  return await paypilotFetch('/incidents', {
    method: 'POST',
    body: JSON.stringify(incidentData),
  });
}

export async function updateIncidentStatus(incidentId, status, resolutionNotes = '', actor = 'admin_operator') {
  return await paypilotFetch(`/incidents/${incidentId}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status, resolution_notes: resolutionNotes, actor }),
  });
}

export async function checkSafeRetry(mandateId) {
  return await paypilotFetch(`/safe-retry-check/${mandateId}`, {}, () => ({
    mandate_id: mandateId,
    can_retry_safely: true,
    reason: 'Simulated idempotency check: No settled on-chain transaction hash exists for this mandate; retry is safe.',
    _dataSource: DATA_SOURCE_LABELS.SIMULATED_RESULT,
  }));
}

// 13. Sentinel-to-PayPilot Bridge (Phase 8)
export async function fetchSentinelIncidents() {
  return await paypilotFetch('/sentinel-bridge/incidents', {}, () => ({
    incidents: DEMO_INCIDENTS,
    _dataSource: DATA_SOURCE_LABELS.SYNTHETIC_DEMO,
  }));
}

export async function proposeSentinelMitigation(zoneId, providerId = null) {
  return await paypilotFetch(
    '/sentinel-bridge/propose-mitigation',
    {
      method: 'POST',
      body: JSON.stringify({ zone_id: zoneId, provider_id: providerId }),
    },
    () => ({
      status: 'SIMULATED_PROPOSAL',
      zone_id: zoneId,
      provider_id: providerId || 'prov_skylink_5g',
      estimated_cost_hsk: 12.5,
      _dataSource: DATA_SOURCE_LABELS.SIMULATED_RESULT,
    })
  );
}

// 14. Audit Trail
export async function fetchAuditTrail(limit = 50) {
  return await paypilotFetch(`/audit?limit=${limit}`, {}, () => ({
    audit_logs: DEMO_AUDIT_LOGS,
    chain_integrity: {
      is_valid: true,
      total_records_verified: DEMO_AUDIT_LOGS.length,
    },
    _dataSource: DATA_SOURCE_LABELS.SYNTHETIC_DEMO,
  }));
}

// 15. AI Agent Intent (Phase 10)
export async function parseUserIntent(intent, buyerAgentId = 'agent_buyer_sentinel') {
  return await paypilotFetch(
    '/ai/intent',
    {
      method: 'POST',
      body: JSON.stringify({ intent, buyer_agent_id: buyerAgentId }),
    },
    () => ({
      status: 'HALTED_FOR_AUTHORIZATION',
      buyer_agent_id: buyerAgentId,
      sanitized_intent: intent,
      recommended_provider: DEMO_PROVIDERS[0],
      proposed_amount_hsk: 12.5,
      policy_precheck: 'PASSED',
      note: 'Demo Mode simulation: AI intent parsed and halted prior to wallet authorization.',
      _dataSource: DATA_SOURCE_LABELS.SIMULATED_RESULT,
    })
  );
}

// 16. Demo Data Reseed
export async function reseedDemoData() {
  return await paypilotFetch('/demo/seed', {
    method: 'POST',
  });
}

// 17. Outcome-Driven Autonomous Procurement (Phase 11 / v3.0)
export async function evaluateOptimizer(params) {
  return await paypilotFetch(
    '/optimizer/evaluate',
    {
      method: 'POST',
      body: JSON.stringify(params),
    },
    () => ({
      selected_candidate: {
        provider_id: 'prov_skylink_5g',
        provider_name: 'SkyLink Dynamic 5G Slicing',
        service_category: 'TELECOM_BANDWIDTH',
        cost_hsk: 12.5,
        predicted_crs_reduction: 50.8,
        predicted_post_crs: 22.0,
      },
      _dataSource: DATA_SOURCE_LABELS.SIMULATED_RESULT,
    })
  );
}

export async function fetchOptimizerEvaluations() {
  return await paypilotFetch('/optimizer/evaluations', {}, () => ({
    evaluations: [],
    _dataSource: DATA_SOURCE_LABELS.SYNTHETIC_DEMO,
  }));
}

export async function evaluateCounterfactual(payload) {
  return await paypilotFetch(
    '/evaluator/counterfactual',
    {
      method: 'POST',
      body: JSON.stringify(payload),
    },
    () => ({
      outcome_classification: 'SUCCESSFUL',
      baseline_crs: 78.0,
      observed_crs: 22.0,
      improvement_pct: 71.8,
      settlement_eligibility: 'PERFORMANCE_SATISFIED',
      _dataSource: DATA_SOURCE_LABELS.SIMULATED_RESULT,
    })
  );
}

export async function fetchCounterfactualEvaluation(evalId) {
  return await paypilotFetch(`/evaluator/evaluations/${evalId}`, {}, () => ({
    evaluation_id: evalId,
    outcome_classification: 'SUCCESSFUL',
    _dataSource: DATA_SOURCE_LABELS.SIMULATED_RESULT,
  }));
}

export async function diagnoseAndProposeRecovery(payload) {
  return await paypilotFetch('/recovery/diagnose', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function fetchRecoveryActions() {
  return await paypilotFetch('/recovery/actions', {}, () => ({
    actions: [],
    _dataSource: DATA_SOURCE_LABELS.SYNTHETIC_DEMO,
  }));
}

export async function evaluateSentinelOutcome(payload) {
  return await paypilotFetch(
    '/sentinel/evaluate-outcome',
    {
      method: 'POST',
      body: JSON.stringify(payload),
    },
    () => ({
      status: 'SIMULATED_OUTCOME_VERIFIED',
      outcome_status: 'VERIFIED_SUCCESS',
      message: 'Simulated outcome verification: Post-mitigation CRS (22.0) satisfies SLA threshold (< 35.0). In Demo Mode, escrow release is simulated and no real blockchain transfer is executed.',
      is_simulated: true,
      _dataSource: DATA_SOURCE_LABELS.SIMULATED_RESULT,
    })
  );
}
