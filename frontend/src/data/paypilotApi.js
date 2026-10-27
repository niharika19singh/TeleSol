/**
 * TeleSol PayPilot 2.0 — API Client
 * ═════════════════════════════════
 * Connects frontend to PayPilot FastAPI backend endpoints:
 * Service Agreements, Delegations, Safety Simulator, Trust Profiles,
 * Evidence Bundles, Dispute Management, Sentinel Bridge, and HSP Gateway.
 */

import { API_BASE } from './api';

async function paypilotFetch(path, options = {}) {
  const url = `${API_BASE}/api/paypilot${path}`;
  try {
    const res = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.detail || data.error || `HTTP ${res.status}`);
    }
    return data;
  } catch (err) {
    console.warn(`[PayPilot API] ${path} error:`, err.message);
    throw err;
  }
}

// 1. Dashboard & Health
export async function fetchPayPilotDashboard() {
  return await paypilotFetch('/dashboard');
}

export async function fetchPayPilotHealth() {
  return await paypilotFetch('/health');
}

// 2. Agents
export async function fetchAgents() {
  return await paypilotFetch('/agents');
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
  return await paypilotFetch(path);
}

export async function registerProvider(providerData) {
  return await paypilotFetch('/providers', {
    method: 'POST',
    body: JSON.stringify(providerData),
  });
}

export async function discoverServices(query) {
  return await paypilotFetch(`/discovery?query=${encodeURIComponent(query)}`);
}

export async function fetchProviderTrust(providerId, amount = null) {
  const path = amount != null
    ? `/providers/${providerId}/trust?amount=${encodeURIComponent(amount)}`
    : `/providers/${providerId}/trust`;
  return await paypilotFetch(path);
}

// 4. Service Agreements (Phase 2)
export async function fetchServiceAgreements() {
  return await paypilotFetch('/agreements');
}

export async function fetchServiceAgreement(agreementId) {
  return await paypilotFetch(`/agreements/${agreementId}`);
}

export async function createServiceAgreement(agreementData) {
  return await paypilotFetch('/agreements', {
    method: 'POST',
    body: JSON.stringify(agreementData),
  });
}

export async function verifyAgreementTamper(agreementId) {
  return await paypilotFetch(`/agreements/${agreementId}/tamper-check`, {
    method: 'POST',
  });
}

// 5. Payment Requests & Mandates
export async function fetchPaymentRequests() {
  return await paypilotFetch('/payment-requests');
}

export async function createPaymentRequest(reqData) {
  return await paypilotFetch('/payment-requests', {
    method: 'POST',
    body: JSON.stringify(reqData),
  });
}

export async function fetchMandates() {
  return await paypilotFetch('/mandates');
}

// 6. Agent Delegations & Budgets (Phase 4)
export async function fetchDelegations() {
  return await paypilotFetch('/delegations');
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
  return await paypilotFetch('/simulate', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

// 8. Policy Engine
export async function fetchPolicy() {
  return await paypilotFetch('/policies');
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
  return await paypilotFetch('/transactions');
}

export async function fetchReceipt(receiptId) {
  return await paypilotFetch(`/receipts/${receiptId}`);
}

export function getReceiptExportUrl(receiptId) {
  return `${API_BASE}/api/paypilot/receipts/${receiptId}/export`;
}

// 11. Evidence Bundles (Phase 6)
export async function fetchEvidenceBundles() {
  return await paypilotFetch('/evidence-bundles');
}

export async function fetchEvidenceBundle(bundleId) {
  return await paypilotFetch(`/evidence-bundles/${bundleId}`);
}

export async function verifyEvidenceBundle(bundleId) {
  return await paypilotFetch(`/evidence-bundles/${bundleId}/verify`, {
    method: 'POST',
  });
}

export function getEvidenceBundleExportUrl(bundleId) {
  return `${API_BASE}/api/paypilot/evidence-bundles/${bundleId}/export`;
}

// 12. Incident & Dispute Management (Phase 7)
export async function fetchIncidents() {
  return await paypilotFetch('/incidents');
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
  return await paypilotFetch(`/safe-retry-check/${mandateId}`);
}

// 13. Sentinel-to-PayPilot Bridge (Phase 8)
export async function fetchSentinelIncidents() {
  return await paypilotFetch('/sentinel-bridge/incidents');
}

export async function proposeSentinelMitigation(zoneId, providerId = null) {
  return await paypilotFetch('/sentinel-bridge/propose-mitigation', {
    method: 'POST',
    body: JSON.stringify({ zone_id: zoneId, provider_id: providerId }),
  });
}

// 14. Audit Trail
export async function fetchAuditTrail(limit = 50) {
  return await paypilotFetch(`/audit?limit=${limit}`);
}

// 15. AI Agent Intent (Phase 10)
export async function parseUserIntent(intent, buyerAgentId = 'agent_buyer_sentinel') {
  return await paypilotFetch('/ai/intent', {
    method: 'POST',
    body: JSON.stringify({ intent, buyer_agent_id: buyerAgentId }),
  });
}

// 16. Demo Data Reseed
export async function reseedDemoData() {
  return await paypilotFetch('/demo/seed', {
    method: 'POST',
  });
}

// 17. Outcome-Driven Autonomous Procurement (Phase 11 / v3.0)
export async function evaluateOptimizer(params) {
  return await paypilotFetch('/optimizer/evaluate', {
    method: 'POST',
    body: JSON.stringify(params),
  });
}

export async function fetchOptimizerEvaluations() {
  return await paypilotFetch('/optimizer/evaluations');
}

export async function evaluateCounterfactual(payload) {
  return await paypilotFetch('/evaluator/counterfactual', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function fetchCounterfactualEvaluation(evalId) {
  return await paypilotFetch(`/evaluator/evaluations/${evalId}`);
}

export async function diagnoseAndProposeRecovery(payload) {
  return await paypilotFetch('/recovery/diagnose', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function fetchRecoveryActions() {
  return await paypilotFetch('/recovery/actions');
}

export async function evaluateSentinelOutcome(payload) {
  return await paypilotFetch('/sentinel/evaluate-outcome', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

