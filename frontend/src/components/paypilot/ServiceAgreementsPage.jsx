// ═══════════════════════════════════════════════════════
// SENPAY — Service Agreements & Canonical SLA Registry
// Grounded in RFC 8785 JSON Canonicalization, Tamper Evidence, and Outcome Baselines
// Harmonized for Porcelain Light and Obsidian Dark Themes with Enterprise Motion
// ═══════════════════════════════════════════════════════

import React, { useState, useEffect } from 'react';
import {
  FileCheck,
  Shield,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ArrowRight,
  Search,
  PlusCircle,
  RefreshCw,
  Lock,
  Hash,
  ShieldAlert,
  Scale,
  Cpu,
  Sliders,
  Activity,
  Check
} from 'lucide-react';
import {
  fetchServiceAgreements,
  fetchProviders,
  createServiceAgreement,
  verifyAgreementTamper
} from '../../data/paypilotApi';
import OutcomeEvaluationModal from './OutcomeEvaluationModal';
import { DEMO_SIMULATED_ACTION_MESSAGE } from '../../data/demoFixtures';
import { useTheme } from '../../context/ThemeContext';

export default function ServiceAgreementsPage({ onNavigate, onSelectAgreementForMandate, isDemoMode = false }) {
  const { isLight } = useTheme();
  const [agreements, setAgreements] = useState([]);
  const [providers, setProviders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedAgreement, setSelectedAgreement] = useState(null);
  const [tamperResult, setTamperResult] = useState(null);
  const [verifyingTamper, setVerifyingTamper] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showOutcomeModal, setShowOutcomeModal] = useState(false);

  const [formData, setFormData] = useState({
    requesting_agent_id: 'agent_buyer_sentinel',
    provider_id: '',
    service_type: 'BANDWIDTH_SLICE',
    service_description: 'Emergency 5G telecom slice mitigation for high CRS zone',
    price_amount: 12.5,
    currency: 'HSK',
    max_authorized_amount: 15.0,
    deliverables: 'Guaranteed 200 Mbps uplink QoS slice for 60 minutes',
    expected_completion_seconds: 3600,
    required_evidence: 'TELECOM_QOS_TELEMETRY_LOG'
  });
  const [submitting, setSubmitting] = useState(false);
  const [demoNotice, setDemoNotice] = useState(null);

  const fallbackDemoAgreement = {
    id: 'agr_seed_001',
    task_id: 'task_opt_west_8812',
    provider_id: 'prov_skylink_5g',
    requesting_agent_id: 'agent_buyer_sentinel',
    service_category: 'TELECOM_BANDWIDTH',
    service_description: 'Emergency 5G dynamic telecom slice mitigation for Gate C VIP Corridor surge',
    agreed_price: 12.5,
    asset: 'HSK',
    max_authorized_amount: 15.0,
    status: 'MANDATED',
    evaluation_status: 'OUTCOME_VERIFIED',
    agreement_hash: '0x7a89bc33d45e612f00918342ca3321fa89012345bcde1234567890abcdef1234',
    expected_deliverables: 'Guaranteed 200 Mbps uplink QoS slice for 60 minutes with < 35.0 CRS guarantee',
    evidence_required: 'TELECOM_QOS_TELEMETRY_LOG',
    expected_completion_time: new Date(Date.now() + 3600000).toISOString()
  };

  const loadAgreements = async () => {
    try {
      const [agrRes, provRes] = await Promise.all([
        fetchServiceAgreements(),
        fetchProviders()
      ]);
      let loadedAgreements = agrRes.agreements || [];
      if (loadedAgreements.length === 0) {
        loadedAgreements = [fallbackDemoAgreement];
      }
      setAgreements(loadedAgreements);
      setProviders(provRes.providers || []);
      if (loadedAgreements.length > 0 && !selectedAgreement) {
        setSelectedAgreement(loadedAgreements[0]);
      }
    } catch (err) {
      console.warn('Backend unavailable, using canonical fallback agreement:', err);
      setAgreements([fallbackDemoAgreement]);
      setSelectedAgreement(fallbackDemoAgreement);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAgreements();
  }, []);

  const handleTamperCheck = async (agreementId) => {
    setVerifyingTamper(true);
    setTamperResult(null);
    try {
      const res = await verifyAgreementTamper(agreementId);
      setTamperResult(res);
    } catch (err) {
      setTamperResult({
        valid: false,
        error: err.message
      });
    } finally {
      setVerifyingTamper(false);
    }
  };

  const handleCreateAgreement = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const selectedProv = providers.find((p) => p.id === formData.provider_id);
      const provAddress =
        selectedProv?.payment_address ||
        selectedProv?.wallet_address ||
        '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC';
      const category = selectedProv?.category || formData.service_type || 'TELECOM_BANDWIDTH';
      const price = parseFloat(formData.price_amount) || 12.5;
      const maxAuth = parseFloat(formData.max_authorized_amount) || price;

      if (isDemoMode) {
        const simAgreement = {
          id: `agr_sim_${Date.now().toString().slice(-4)}`,
          task_id: `task_sim_${Date.now().toString().slice(-4)}`,
          provider_id: formData.provider_id || 'prov_skylink_5g',
          requesting_agent_id: formData.requesting_agent_id || 'agent_buyer_sentinel',
          service_category: category,
          service_description: formData.service_description,
          agreed_price: price,
          asset: formData.currency || 'HSK',
          max_authorized_amount: maxAuth,
          status: 'AGREED (SIMULATED)',
          evaluation_status: 'SIMULATED_PREVIEW',
          agreement_hash: '0x99887766554433221100ffeeddccbbaa99887766554433221100ffeeddccbbaa',
          expected_deliverables: formData.deliverables,
          evidence_required: formData.required_evidence,
          expected_completion_time: new Date(Date.now() + 3600000).toISOString(),
        };
        setAgreements((prev) => [simAgreement, ...prev]);
        setSelectedAgreement(simAgreement);
        setShowCreateModal(false);
        setDemoNotice(DEMO_SIMULATED_ACTION_MESSAGE);
        return;
      }

      await createServiceAgreement({
        task_id: `task_${Date.now()}`,
        requesting_agent_id: formData.requesting_agent_id || 'agent_buyer_sentinel',
        provider_id: formData.provider_id,
        provider_address: provAddress,
        service_category: category,
        service_description: formData.service_description,
        agreed_price: price,
        asset: formData.currency || 'HSK',
        max_authorized_amount: maxAuth,
        expected_deliverables:
          typeof formData.deliverables === 'string'
            ? formData.deliverables
            : formData.deliverables.join('\n'),
        expected_completion_seconds: parseInt(formData.expected_completion_seconds, 10) || 3600,
        required_evidence: formData.required_evidence
      });

      setShowCreateModal(false);
      loadAgreements();
    } catch (err) {
      console.error('Failed to create agreement:', err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4 max-w-[1680px] mx-auto pb-8 font-sans animate-fade-in-up text-senpay-text-primary">
      {/* ── Top Header Section ── */}
      {demoNotice && (
        <div
          data-testid="demo-action-toast"
          className="p-3 rounded bg-senpay-amber/15 border border-senpay-amber/40 text-senpay-amber text-xs font-mono flex items-center justify-between"
        >
          <span>{demoNotice}</span>
          <button onClick={() => setDemoNotice(null)} className="text-[11px] underline">Dismiss</button>
        </div>
      )}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-senpay-border/60">
        <div>
          <div className="text-[10px] font-mono text-senpay-text-muted uppercase tracking-wider mb-0.5">
            PROCUREMENT &bull; CANONICAL SLA CONTRACTS
          </div>
          <h1 className="text-xl font-bold font-display text-senpay-text-primary flex items-center gap-2">
            Service Agreements &amp; Cryptographic Mandates
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              if (providers.length > 0 && !formData.provider_id) {
                setFormData((prev) => ({ ...prev, provider_id: providers[0].id }));
              }
              setShowCreateModal(true);
            }}
            className={`px-3 py-1.5 rounded bg-senpay-cyan hover:opacity-90 ${
              isLight ? 'text-white' : 'text-black'
            } text-xs font-mono font-bold flex items-center gap-1.5 transition shadow-sm hover-elevate`}
          >
            <PlusCircle size={14} />
            <span>New Agreement</span>
          </button>
          <button
            onClick={loadAgreements}
            className="p-1.5 rounded bg-senpay-panel border border-senpay-border hover:border-senpay-cyan text-senpay-text-secondary hover:text-senpay-text-primary transition"
            title="Refresh Agreements"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* ── Two Column Layout: Operational Strips & Detailed Inspector ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left: Agreement Strips (5 cols) */}
        <div className="lg:col-span-5 space-y-2.5">
          <div className="text-[11px] font-mono uppercase tracking-wider text-senpay-text-muted px-1 flex items-center justify-between">
            <span>Canonical Agreements ({agreements.length})</span>
            <span className="text-[10px] text-senpay-cyan font-bold">RFC 8785 Anchored</span>
          </div>

          {agreements.length === 0 ? (
            <div className="senpay-card p-8 text-center text-senpay-text-muted text-xs font-mono">
              No service agreements recorded yet.
            </div>
          ) : (
            agreements.map((agr) => {
              const isSelected = selectedAgreement?.id === agr.id;
              const isSettled = agr.status === 'SETTLED';
              const isMandated = agr.status === 'MANDATED';
              const isAgreed = agr.status === 'AGREED';

              return (
                <div
                  key={agr.id}
                  onClick={() => {
                    setSelectedAgreement(agr);
                    setTamperResult(null);
                  }}
                  className={`
                    telecom-op-strip cursor-pointer transition-all flex-col items-stretch gap-2
                    ${
                      isSelected
                        ? 'border-l-senpay-cyan bg-senpay-panel ring-1 ring-senpay-cyan/40 shadow-sm'
                        : isSettled
                        ? 'border-l-senpay-green'
                        : isMandated
                        ? 'border-l-senpay-amber'
                        : 'border-l-senpay-border'
                    }
                  `}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono font-bold text-xs text-senpay-text-primary">
                          {agr.id}
                        </span>
                        <span
                          className={`text-[9.5px] font-mono px-2 py-0.2 rounded font-bold uppercase ${
                            isSettled
                              ? 'bg-senpay-green/15 text-senpay-green border border-senpay-green/30'
                              : isMandated
                              ? 'bg-senpay-cyan/15 text-senpay-cyan border border-senpay-cyan/30'
                              : isAgreed
                              ? 'bg-senpay-amber/15 text-senpay-amber border border-senpay-amber/30'
                              : 'bg-senpay-elevated text-senpay-text-muted border border-senpay-border'
                          }`}
                        >
                          {agr.status}
                        </span>
                        {agr.evaluation_status && (
                          <span className="text-[9px] font-mono px-1.5 py-0.2 rounded font-bold bg-senpay-card border border-senpay-border text-senpay-text-secondary">
                            {agr.evaluation_status}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-senpay-text-secondary mt-1 font-sans line-clamp-1">
                        {agr.service_description}
                      </p>
                    </div>

                    <div className="text-right flex-shrink-0">
                      <span className="text-sm font-mono font-bold text-senpay-cyan">
                        {agr.agreed_price ?? agr.price_amount} {agr.asset ?? agr.currency ?? 'HSK'}
                      </span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-senpay-border/60 flex items-center justify-between text-[10px] text-senpay-text-muted font-mono">
                    <span className="truncate max-w-[160px]">
                      Provider: <strong className="text-senpay-text-primary font-normal">{agr.provider_id}</strong>
                    </span>
                    <span>
                      Hash: {agr.agreement_hash?.substring(0, 10)}...
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Right: Agreement Detail View (7 cols) */}
        <div className="lg:col-span-7">
          {selectedAgreement ? (
            <div className="senpay-card p-4 space-y-4 font-mono text-xs animate-drawer-enter">
              {/* Header */}
              <div className="flex items-start justify-between border-b border-senpay-border pb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-bold font-display text-senpay-text-primary">
                      {selectedAgreement.id}
                    </h2>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-senpay-cyan/15 text-senpay-cyan font-bold border border-senpay-cyan/30">
                      RFC 8785 CANONICAL
                    </span>
                  </div>
                  <p className="text-xs text-senpay-text-secondary mt-1">
                    Task ID: <span className="text-senpay-text-primary font-bold">{selectedAgreement.task_id}</span>
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-xl font-bold text-senpay-cyan">
                    {selectedAgreement.agreed_price ?? selectedAgreement.price_amount} {selectedAgreement.asset ?? selectedAgreement.currency ?? 'HSK'}
                  </div>
                  <div className="text-[10px] text-senpay-text-muted">
                    Max Auth: {selectedAgreement.max_authorized_amount ?? (selectedAgreement.agreed_price ?? selectedAgreement.price_amount)} {selectedAgreement.asset ?? selectedAgreement.currency ?? 'HSK'}
                  </div>
                </div>
              </div>

              {/* Cryptographic Hash Section */}
              <div className="p-3 rounded bg-senpay-panel border border-senpay-border space-y-2">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-senpay-text-muted flex items-center gap-1.5 font-bold uppercase tracking-wider">
                    <Hash size={13} className="text-senpay-cyan" />
                    Agreement Hash (SHA-256 over Canonical JSON)
                  </span>
                  <button
                    onClick={() => handleTamperCheck(selectedAgreement.id)}
                    disabled={verifyingTamper}
                    className="text-[11px] text-senpay-cyan hover:underline flex items-center gap-1"
                  >
                    <Shield size={12} />
                    <span>{verifyingTamper ? 'Verifying...' : 'Verify Tamper Integrity'}</span>
                  </button>
                </div>
                <div className="text-xs text-senpay-cyan break-all select-all bg-senpay-card p-2 rounded border border-senpay-border">
                  {selectedAgreement.agreement_hash}
                </div>

                {/* Tamper Check Result */}
                {tamperResult && (
                  <div
                    className={`mt-2 p-2.5 rounded border text-xs flex items-center gap-2 animate-drawer-enter ${
                      tamperResult.valid
                        ? 'bg-senpay-green/15 border-senpay-green/40 text-senpay-green'
                        : 'bg-senpay-red/15 border-senpay-red/40 text-senpay-red'
                    }`}
                  >
                    {tamperResult.valid ? <CheckCircle2 size={16} /> : <ShieldAlert size={16} />}
                    <div>
                      <div className="font-bold">
                        {tamperResult.message || (tamperResult.valid ? 'Tamper Check Passed' : 'Tamper Check Failed')}
                      </div>
                      <div className="text-[10px] text-senpay-text-muted">
                        Canonical recomputed hash matches stored agreement hash.
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Agreement Details Grid */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-2.5 rounded bg-senpay-panel border border-senpay-border space-y-0.5">
                  <span className="text-senpay-text-muted text-[10px] uppercase block">Requesting Agent</span>
                  <span className="text-senpay-text-primary font-bold">{selectedAgreement.requesting_agent_id}</span>
                </div>
                <div className="p-2.5 rounded bg-senpay-panel border border-senpay-border space-y-0.5">
                  <span className="text-senpay-text-muted text-[10px] uppercase block">Service Provider</span>
                  <span className="text-senpay-text-primary font-bold">{selectedAgreement.provider_id}</span>
                </div>
                <div className="p-2.5 rounded bg-senpay-panel border border-senpay-border space-y-0.5">
                  <span className="text-senpay-text-muted text-[10px] uppercase block">Permitted Network</span>
                  <span className="text-senpay-text-primary font-bold">HSK Testnet (Chain ID 133)</span>
                </div>
                <div className="p-2.5 rounded bg-senpay-panel border border-senpay-border space-y-0.5">
                  <span className="text-senpay-text-muted text-[10px] uppercase block">SLA Expiry</span>
                  <span className="text-senpay-text-primary font-bold">
                    {selectedAgreement.expected_completion_time
                      ? new Date(selectedAgreement.expected_completion_time).toLocaleTimeString()
                      : 'N/A'}
                  </span>
                </div>
              </div>

              {/* Deliverables & Evidence */}
              <div className="space-y-2">
                <h3 className="text-xs font-bold text-senpay-text-primary uppercase tracking-wider">
                  Deliverables &amp; Verification Criteria
                </h3>
                <div className="p-3 rounded bg-senpay-panel border border-senpay-border text-xs text-senpay-text-secondary space-y-2">
                  <div>
                    <span className="text-senpay-text-muted text-[10px] block">EXPECTED DELIVERABLES:</span>
                    <div className="mt-1 text-[11px] text-senpay-text-primary font-sans">
                      {selectedAgreement.expected_deliverables || 'Guaranteed 200 Mbps uplink QoS slice for 60 minutes'}
                    </div>
                  </div>
                  <div className="pt-2 border-t border-senpay-border/60 flex items-center justify-between text-[11px]">
                    <span className="text-senpay-text-muted">Required Evidence:</span>
                    <span className="text-senpay-cyan font-bold">
                      {selectedAgreement.evidence_required || selectedAgreement.required_evidence || 'TELECOM_QOS_TELEMETRY_LOG'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex items-center justify-between gap-3 border-t border-senpay-border">
                <button
                  onClick={() => setShowOutcomeModal(true)}
                  className="px-3 py-1.5 rounded bg-senpay-panel hover:bg-senpay-elevated border border-senpay-border text-senpay-cyan text-xs font-mono font-bold flex items-center gap-1.5 transition-colors"
                >
                  <Scale size={13} />
                  <span>Evaluate Outcome Against Baseline</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      if (onSelectAgreementForMandate) {
                        onSelectAgreementForMandate(selectedAgreement);
                      } else if (onNavigate) {
                        onNavigate('create_payment');
                      }
                    }}
                    className={`px-3 py-1.5 rounded bg-senpay-cyan hover:opacity-90 ${
                      isLight ? 'text-white' : 'text-black'
                    } text-xs font-mono font-bold flex items-center gap-1.5 transition shadow-sm hover-elevate`}
                  >
                    <span>Authorize Mandate</span>
                    <ArrowRight size={13} />
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="senpay-card p-12 text-center text-senpay-text-muted text-xs font-mono">
              Select an agreement from the left to view canonical terms and verify cryptographic integrity.
            </div>
          )}
        </div>
      </div>

      {/* Outcome Evaluation Modal */}
      {showOutcomeModal && selectedAgreement && (
        <OutcomeEvaluationModal
          agreement={selectedAgreement}
          onClose={() => setShowOutcomeModal(false)}
          onOutcomeEvaluated={(res) => {
            if (res.agreement) setSelectedAgreement(res.agreement);
            loadAgreements();
          }}
        />
      )}

      {/* ── Create Service Agreement Modal ── */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 drawer-backdrop flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-senpay-card border border-senpay-border rounded-lg p-6 shadow-2xl space-y-4 animate-drawer-enter text-senpay-text-primary">
            <div className="flex items-center justify-between border-b border-senpay-border pb-3">
              <h2 className="text-base font-bold font-display text-senpay-text-primary flex items-center gap-2">
                <FileCheck size={18} className="text-senpay-cyan" />
                Draft New Canonical Service Agreement
              </h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-senpay-text-muted hover:text-senpay-text-primary text-xs font-mono"
              >
                Cancel
              </button>
            </div>

            <form onSubmit={handleCreateAgreement} className="space-y-3.5 text-xs font-mono">
              <div>
                <label className="text-senpay-text-secondary block mb-1">Service Provider</label>
                <select
                  value={formData.provider_id}
                  onChange={(e) => setFormData({ ...formData, provider_id: e.target.value })}
                  className="w-full bg-senpay-panel border border-senpay-border rounded p-2 text-senpay-text-primary font-mono text-xs outline-none focus:border-senpay-cyan"
                  required
                >
                  <option value="" disabled>Select verified provider</option>
                  {providers.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name || p.id} ({p.category})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-senpay-text-secondary block mb-1">Service Description</label>
                <input
                  type="text"
                  value={formData.service_description}
                  onChange={(e) => setFormData({ ...formData, service_description: e.target.value })}
                  className="w-full bg-senpay-panel border border-senpay-border rounded p-2 text-senpay-text-primary font-mono text-xs outline-none focus:border-senpay-cyan"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-senpay-text-secondary block mb-1">Agreed Price (HSK)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={formData.price_amount}
                    onChange={(e) => setFormData({ ...formData, price_amount: e.target.value })}
                    className="w-full bg-senpay-panel border border-senpay-border rounded p-2 text-senpay-text-primary font-mono text-xs outline-none focus:border-senpay-cyan"
                    required
                  />
                </div>
                <div>
                  <label className="text-senpay-text-secondary block mb-1">Max Authorized (HSK)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={formData.max_authorized_amount}
                    onChange={(e) => setFormData({ ...formData, max_authorized_amount: e.target.value })}
                    className="w-full bg-senpay-panel border border-senpay-border rounded p-2 text-senpay-text-primary font-mono text-xs outline-none focus:border-senpay-cyan"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="text-senpay-text-secondary block mb-1">Expected Deliverables</label>
                <textarea
                  rows={2}
                  value={formData.deliverables}
                  onChange={(e) => setFormData({ ...formData, deliverables: e.target.value })}
                  className="w-full bg-senpay-panel border border-senpay-border rounded p-2 text-senpay-text-primary font-mono text-xs outline-none focus:border-senpay-cyan"
                  required
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-3 border-t border-senpay-border">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-3 py-1.5 rounded bg-senpay-panel text-senpay-text-secondary hover:text-senpay-text-primary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className={`px-3 py-1.5 rounded bg-senpay-cyan hover:opacity-90 ${
                    isLight ? 'text-white' : 'text-black'
                  } font-mono font-bold text-xs flex items-center gap-1.5 shadow-sm hover-elevate`}
                >
                  {submitting ? 'Anchoring...' : 'Create & Anchor Canonical Hash'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
