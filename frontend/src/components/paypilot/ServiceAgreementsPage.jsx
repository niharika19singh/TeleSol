import { useState, useEffect } from 'react';
import {
  FileCheck, Shield, CheckCircle2, AlertTriangle, Clock,
  ArrowRight, Search, PlusCircle, RefreshCw, Lock, Hash, ShieldAlert,
  Scale, Cpu, Sliders, Activity
} from 'lucide-react';
import {
  fetchServiceAgreements,
  fetchProviders,
  createServiceAgreement,
  verifyAgreementTamper
} from '../../data/paypilotApi';
import GlassCard from '../shared/GlassCard';
import OutcomeEvaluationModal from './OutcomeEvaluationModal';

export default function ServiceAgreementsPage({ onNavigate, onSelectAgreementForMandate }) {
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
  const [notification, setNotification] = useState(null);

  const loadAgreements = async () => {
    try {
      const [agrRes, provRes] = await Promise.all([
        fetchServiceAgreements(),
        fetchProviders()
      ]);
      setAgreements(agrRes.agreements || []);
      setProviders(provRes.providers || []);
      if (agrRes.agreements && agrRes.agreements.length > 0 && !selectedAgreement) {
        setSelectedAgreement(agrRes.agreements[0]);
      }
    } catch (err) {
      console.error('Failed to load agreements:', err);
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
      const provAddress = selectedProv?.payment_address || selectedProv?.wallet_address || '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC';
      const category = selectedProv?.category || formData.service_type || 'TELECOM_BANDWIDTH';
      const price = parseFloat(formData.price_amount) || 12.5;
      const maxAuth = parseFloat(formData.max_authorized_amount) || price;
      const completionTime = new Date(Date.now() + (parseInt(formData.expected_completion_seconds, 10) || 3600) * 1000).toISOString();

      const res = await createServiceAgreement({
        task_id: `task_${Date.now()}`,
        requesting_agent_id: formData.requesting_agent_id || 'agent_buyer_sentinel',
        provider_id: formData.provider_id,
        provider_address: provAddress,
        service_category: category,
        service_description: formData.service_description,
        agreed_price: price,
        asset: formData.currency || 'HSK',
        max_authorized_amount: maxAuth,
        expected_deliverables: typeof formData.deliverables === 'string' ? formData.deliverables : formData.deliverables.join('\n'),
        expected_completion_time: completionTime,
        network_id: 133,
        evidence_required: formData.required_evidence || 'COMPLETION_TELEMETRY'
      });
      const agr = res.agreement || res;
      setShowCreateModal(false);
      setNotification({
        type: 'success',
        text: `Service Agreement ${agr.agreement_id || agr.id} created with canonical hash ${(agr.agreement_hash || '').substring(0, 16)}...`
      });
      await loadAgreements();
      setSelectedAgreement(agr);
    } catch (err) {
      setNotification({ type: 'error', text: err.message || 'Failed to create service agreement' });
    } finally {
      setSubmitting(false);
      setTimeout(() => setNotification(null), 5000);
    }
  };

  return (
    <div className="space-y-6">
      {/* ── Notification Banner ── */}
      {notification && (
        <div className={`p-4 rounded-xl border flex items-center justify-between ${
          notification.type === 'success'
            ? 'bg-crowd-safe/15 border-crowd-safe/40 text-crowd-safe'
            : 'bg-crowd-danger/15 border-crowd-danger/40 text-crowd-danger'
        }`}>
          <div className="flex items-center gap-2">
            {notification.type === 'success' ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
            <span className="text-sm font-medium">{notification.text}</span>
          </div>
          <button onClick={() => setNotification(null)} className="text-xs hover:opacity-75">Dismiss</button>
        </div>
      )}

      {/* ── Page Header ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold font-display text-crowd-text-primary flex items-center gap-2">
            <FileCheck className="text-crowd-cyan" size={24} />
            Service Agreements & Task Context
          </h1>
          <p className="text-xs text-crowd-text-muted mt-1">
            Binds agent tasks to canonical RFC 8785 terms before payment authorization. Off-chain terms are cryptographically anchored.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              if (providers.length > 0 && !formData.provider_id) {
                setFormData(prev => ({ ...prev, provider_id: providers[0].id }));
              }
              setShowCreateModal(true);
            }}
            className="btn-primary text-xs flex items-center gap-2 px-3 py-2"
          >
            <PlusCircle size={15} />
            New Service Agreement
          </button>
          <button
            onClick={loadAgreements}
            className="p-2 rounded-lg bg-crowd-surface border border-crowd-border hover:border-crowd-cyan text-crowd-text-secondary"
            title="Refresh Agreements"
          >
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* ── Two Column Layout: List & Selected Agreement Detail ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Agreement List (5 cols) */}
        <div className="lg:col-span-5 space-y-3">
          <div className="text-xs font-mono uppercase tracking-wider text-crowd-text-muted px-1 flex items-center justify-between">
            <span>Canonical Agreements ({agreements.length})</span>
            <span className="text-[10px] text-crowd-cyan">RFC 8785 Anchored</span>
          </div>

          {agreements.length === 0 ? (
            <GlassCard className="p-8 text-center text-crowd-text-muted text-xs">
              No service agreements recorded yet. Propose an agreement from discovery or create one above.
            </GlassCard>
          ) : (
            agreements.map((agr) => {
              const isSelected = selectedAgreement?.id === agr.id;
              return (
                <GlassCard
                  key={agr.id}
                  onClick={() => {
                    setSelectedAgreement(agr);
                    setTamperResult(null);
                  }}
                  className={`cursor-pointer transition-all ${
                    isSelected
                      ? 'border-crowd-cyan/50 shadow-[0_0_15px_rgba(0,212,255,0.12)]'
                      : 'hover:border-crowd-border/80'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono font-bold text-xs text-crowd-text-primary">
                          {agr.id}
                        </span>
                        <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold ${
                          agr.status === 'SETTLED'
                            ? 'bg-crowd-safe/20 text-crowd-safe'
                            : agr.status === 'MANDATED'
                            ? 'bg-crowd-cyan/20 text-crowd-cyan'
                            : agr.status === 'AGREED'
                            ? 'bg-crowd-purple/20 text-crowd-purple'
                            : 'bg-white/10 text-crowd-text-muted'
                        }`}>
                          {agr.status}
                        </span>
                        {agr.evaluation_status && (
                          <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded-full font-bold ${
                            agr.evaluation_status === 'OUTCOME_VERIFIED'
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              : agr.evaluation_status === 'OUTCOME_FAILED'
                              ? 'bg-red-500/20 text-red-300 border border-red-500/30'
                              : agr.evaluation_status === 'OUTCOME_PENDING'
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                              : 'bg-white/5 text-crowd-text-muted'
                          }`}>
                            {agr.evaluation_status}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-crowd-text-secondary mt-1 font-medium line-clamp-1">
                        {agr.service_description}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-mono font-bold text-crowd-cyan">
                        {agr.agreed_price ?? agr.price_amount} {agr.asset ?? agr.currency ?? 'HSK'}
                      </span>
                    </div>
                  </div>

                  <div className="mt-3 pt-2 border-t border-white/[0.05] flex items-center justify-between text-[11px] text-crowd-text-muted">
                    <span className="font-mono truncate max-w-[140px]" title={agr.provider_id}>
                      {agr.provider_id}
                    </span>
                    <span className="font-mono text-[10px] text-crowd-text-muted">
                      Hash: {agr.agreement_hash?.substring(0, 10)}...
                    </span>
                  </div>
                </GlassCard>
              );
            })
          )}
        </div>

        {/* Right: Agreement Detail View (7 cols) */}
        <div className="lg:col-span-7">
          {selectedAgreement ? (
            <GlassCard className="p-6 space-y-6">
              {/* Header */}
              <div className="flex items-start justify-between border-b border-crowd-border/80 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-bold font-display text-crowd-text-primary">
                      {selectedAgreement.id}
                    </h2>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-crowd-cyan/15 text-crowd-cyan font-bold border border-crowd-cyan/30">
                      RFC 8785 CANONICAL
                    </span>
                  </div>
                  <p className="text-xs text-crowd-text-secondary mt-1">
                    Task ID: <span className="font-mono text-crowd-text-primary">{selectedAgreement.task_id}</span>
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-xl font-mono font-black text-crowd-cyan">
                    {selectedAgreement.agreed_price ?? selectedAgreement.price_amount} {selectedAgreement.asset ?? selectedAgreement.currency ?? 'HSK'}
                  </div>
                  <div className="text-[10px] text-crowd-text-muted">
                    Max Authorized: {selectedAgreement.max_authorized_amount ?? (selectedAgreement.agreed_price ?? selectedAgreement.price_amount)} {selectedAgreement.asset ?? selectedAgreement.currency ?? 'HSK'}
                  </div>
                </div>
              </div>

              {/* Cryptographic Hash Section */}
              <div className="p-3.5 rounded-xl bg-black/40 border border-crowd-border font-mono space-y-2">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-crowd-text-muted flex items-center gap-1.5 font-bold uppercase tracking-wider">
                    <Hash size={13} className="text-crowd-cyan" />
                    Agreement Hash (SHA-256 over Canonical JSON)
                  </span>
                  <button
                    onClick={() => handleTamperCheck(selectedAgreement.id)}
                    disabled={verifyingTamper}
                    className="text-[11px] text-crowd-cyan hover:underline flex items-center gap-1"
                  >
                    <Shield size={12} />
                    {verifyingTamper ? 'Verifying...' : 'Verify Tamper Integrity'}
                  </button>
                </div>
                <div className="text-xs text-crowd-cyan break-all select-all bg-white/[0.03] p-2 rounded border border-white/[0.05]">
                  {selectedAgreement.agreement_hash}
                </div>

                {/* Tamper Check Result */}
                {tamperResult && (
                  <div className={`mt-2 p-2.5 rounded-lg border text-xs flex items-center gap-2 ${
                    tamperResult.valid
                      ? 'bg-crowd-safe/15 border-crowd-safe/40 text-crowd-safe'
                      : 'bg-crowd-danger/15 border-crowd-danger/40 text-crowd-danger'
                  }`}>
                    {tamperResult.valid ? <CheckCircle2 size={16} /> : <ShieldAlert size={16} />}
                    <div>
                      <div className="font-bold">{tamperResult.message || (tamperResult.valid ? 'Tamper Check Passed' : 'Tamper Check Failed')}</div>
                      <div className="text-[10px] font-mono text-crowd-text-muted">
                        Canonical recomputed hash matches stored agreement hash.
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Agreement Details Grid */}
              <div className="grid grid-cols-2 gap-4 text-xs font-mono">
                <div className="p-3 rounded-lg bg-white/[0.02] border border-crowd-border space-y-1">
                  <span className="text-crowd-text-muted text-[10px] uppercase block">Requesting Agent</span>
                  <span className="text-crowd-text-primary font-bold">{selectedAgreement.requesting_agent_id}</span>
                </div>
                <div className="p-3 rounded-lg bg-white/[0.02] border border-crowd-border space-y-1">
                  <span className="text-crowd-text-muted text-[10px] uppercase block">Service Provider</span>
                  <span className="text-crowd-text-primary font-bold">{selectedAgreement.provider_id}</span>
                </div>
                <div className="p-3 rounded-lg bg-white/[0.02] border border-crowd-border space-y-1">
                  <span className="text-crowd-text-muted text-[10px] uppercase block">Permitted Network</span>
                  <span className="text-crowd-text-primary font-bold">HSK Testnet (Chain ID 133)</span>
                </div>
                <div className="p-3 rounded-lg bg-white/[0.02] border border-crowd-border space-y-1">
                  <span className="text-crowd-text-muted text-[10px] uppercase block">SLA Expiry</span>
                  <span className="text-crowd-text-primary font-bold">
                    {selectedAgreement.expected_completion_time ? new Date(selectedAgreement.expected_completion_time).toLocaleTimeString() : (selectedAgreement.expires_at ? new Date(selectedAgreement.expires_at * 1000).toLocaleTimeString() : 'N/A')}
                  </span>
                </div>
              </div>

              {/* Deliverables & Evidence */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-crowd-text-primary uppercase tracking-wider font-mono">
                  Deliverables & Verification Criteria
                </h3>
                <div className="p-3 rounded-xl bg-white/[0.02] border border-crowd-border text-xs text-crowd-text-secondary space-y-2">
                  <div>
                    <span className="text-crowd-text-muted font-mono text-[10px] block">EXPECTED DELIVERABLES:</span>
                    <div className="mt-1 font-mono text-[11px] text-crowd-text-primary">
                      {selectedAgreement.expected_deliverables || (Array.isArray(selectedAgreement.deliverables) ? selectedAgreement.deliverables.join(', ') : JSON.stringify(selectedAgreement.deliverables))}
                    </div>
                  </div>
                  <div className="pt-2 border-t border-white/[0.05] flex items-center justify-between text-[11px] font-mono">
                    <span className="text-crowd-text-muted">Required Evidence:</span>
                    <span className="text-crowd-cyan font-bold">{selectedAgreement.evidence_required || selectedAgreement.required_evidence}</span>
                  </div>
                </div>
              </div>

              {/* Outcome Conditions & Settlement Eligibility (Feature C) */}
              <div className="p-3.5 rounded-xl bg-white/[0.02] border border-crowd-border space-y-2 font-mono">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-crowd-text-muted flex items-center gap-1.5 font-bold uppercase tracking-wider">
                    <Scale size={13} className="text-crowd-cyan" />
                    Outcome Contract & Baseline Metrics
                  </span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                    selectedAgreement.evaluation_status === 'OUTCOME_VERIFIED'
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      : selectedAgreement.evaluation_status === 'OUTCOME_FAILED'
                      ? 'bg-red-500/20 text-red-300 border border-red-500/30'
                      : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                  }`}>
                    {selectedAgreement.evaluation_status || 'OUTCOME_PENDING'}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2 pt-1 text-xs">
                  <div>
                    <span className="text-[10px] text-crowd-text-muted block">Target Metric</span>
                    <span className="text-white font-bold">{selectedAgreement.target_metric || 'CRS_REDUCTION'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-crowd-text-muted block">Baseline Value</span>
                    <span className="text-amber-400 font-bold">{selectedAgreement.baseline_value || '0.0'} / 100</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-crowd-text-muted block">Required Drop</span>
                    <span className="text-emerald-400 font-bold">≥ {selectedAgreement.target_threshold || '20.0'} pts</span>
                  </div>
                </div>
                <div className="pt-2 border-t border-white/[0.05] flex items-center justify-between text-[11px]">
                  <span className="text-crowd-text-muted">Settlement Eligibility:</span>
                  <span className="text-cyan-300 font-bold">{selectedAgreement.settlement_eligibility || 'IMMEDIATE_PAID_OUTCOME_UNVERIFIED'}</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex items-center justify-between gap-3 border-t border-crowd-border">
                <button
                  onClick={() => setShowOutcomeModal(true)}
                  className="px-3 py-1.5 rounded-lg bg-crowd-surface border border-crowd-border hover:border-crowd-cyan text-crowd-cyan text-xs font-mono font-bold flex items-center gap-1.5 transition-colors"
                >
                  <Scale size={13} />
                  Evaluate Outcome Against Baseline
                </button>

                <div className="flex items-center gap-2">
                  {selectedAgreement.mandate_id ? (
                    <button
                      onClick={() => onNavigate && onNavigate('mandates')}
                      className="btn-secondary text-xs flex items-center gap-2"
                    >
                      View Mandate ({selectedAgreement.mandate_id})
                      <ArrowRight size={14} />
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        if (onSelectAgreementForMandate) {
                          onSelectAgreementForMandate(selectedAgreement);
                        } else if (onNavigate) {
                          onNavigate('create_payment');
                        }
                      }}
                      className="btn-primary text-xs flex items-center gap-2"
                    >
                      Authorize Mandate from Agreement
                      <ArrowRight size={14} />
                    </button>
                  )}
                </div>
              </div>
            </GlassCard>
          ) : (
            <GlassCard className="p-12 text-center text-crowd-text-muted text-xs">
              Select an agreement from the left to view canonical terms and verify cryptographic integrity.
            </GlassCard>
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
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-crowd-surface border border-crowd-border rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-crowd-border pb-3">
              <h2 className="text-base font-bold font-display text-crowd-text-primary flex items-center gap-2">
                <FileCheck size={18} className="text-crowd-cyan" />
                Draft New Service Agreement
              </h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-crowd-text-muted hover:text-crowd-text-primary text-xs font-mono"
              >
                Cancel
              </button>
            </div>

            <form onSubmit={handleCreateAgreement} className="space-y-4 text-xs font-mono">
              <div>
                <label className="text-crowd-text-secondary block mb-1">Service Provider</label>
                <select
                  value={formData.provider_id}
                  onChange={(e) => setFormData({ ...formData, provider_id: e.target.value })}
                  className="w-full bg-black/40 border border-crowd-border rounded-lg p-2 text-crowd-text-primary font-mono text-xs"
                  required
                >
                  <option value="" disabled>Select verified provider</option>
                  {providers.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name || p.id} ({p.category}) - {p.wallet_address?.substring(0, 10)}...
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-crowd-text-secondary block mb-1">Service Description</label>
                <input
                  type="text"
                  value={formData.service_description}
                  onChange={(e) => setFormData({ ...formData, service_description: e.target.value })}
                  className="w-full bg-black/40 border border-crowd-border rounded-lg p-2 text-crowd-text-primary font-mono text-xs"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-crowd-text-secondary block mb-1">Agreed Price (HSK)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={formData.price_amount}
                    onChange={(e) => setFormData({ ...formData, price_amount: e.target.value })}
                    className="w-full bg-black/40 border border-crowd-border rounded-lg p-2 text-crowd-text-primary font-mono text-xs"
                    required
                  />
                </div>
                <div>
                  <label className="text-crowd-text-secondary block mb-1">Max Authorized (HSK)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={formData.max_authorized_amount}
                    onChange={(e) => setFormData({ ...formData, max_authorized_amount: e.target.value })}
                    className="w-full bg-black/40 border border-crowd-border rounded-lg p-2 text-crowd-text-primary font-mono text-xs"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="text-crowd-text-secondary block mb-1">Expected Deliverables (one per line)</label>
                <textarea
                  rows={2}
                  value={formData.deliverables}
                  onChange={(e) => setFormData({ ...formData, deliverables: e.target.value })}
                  className="w-full bg-black/40 border border-crowd-border rounded-lg p-2 text-crowd-text-primary font-mono text-xs"
                  required
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-3 border-t border-crowd-border">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-lg bg-white/[0.04] text-crowd-text-secondary hover:text-crowd-text-primary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn-primary px-4 py-2 flex items-center gap-2"
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
