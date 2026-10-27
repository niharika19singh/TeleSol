import { useState, useEffect } from 'react';
import {
  CreditCard, ShieldCheck, AlertTriangle, ArrowRight,
  CheckCircle2, Clock, Layers, Lock, Cpu
} from 'lucide-react';
import { createPaymentRequest, fetchAgents, fetchProviders, fetchPolicy } from '../../data/paypilotApi';
import GlassCard from '../shared/GlassCard';

export default function CreatePaymentPage({ prefilledProvider, onMandateCreated, onNavigate }) {
  const [agents, setAgents] = useState([]);
  const [providers, setProviders] = useState([]);
  const [policy, setPolicy] = useState(null);

  const [formData, setFormData] = useState({
    title: prefilledProvider ? `Procure ${prefilledProvider.name}` : 'Autonomous Bandwidth Buffer Slice',
    buyer_agent_id: 'agent_buyer_sentinel',
    provider_id: prefilledProvider ? prefilledProvider.id : '',
    recipient_address: prefilledProvider ? prefilledProvider.payment_address : '',
    asset: prefilledProvider ? prefilledProvider.asset : 'HSK',
    amount: prefilledProvider ? prefilledProvider.unit_price : 12.5,
    network_id: prefilledProvider ? prefilledProvider.network_id : 133,
    purpose: prefilledProvider
      ? `Acquire ${prefilledProvider.category} stream for venue congestion mitigation`
      : 'Procure emergency cellular bandwidth slice during Gate C surge',
    expiry_hours: 2,
    agreement_id: prefilledProvider ? (prefilledProvider.agreement_id || '') : '',
    delegation_id: prefilledProvider ? (prefilledProvider.delegation_id || '') : '',
    confirmed: false,
  });

  const [submitting, setSubmitting] = useState(false);
  const [createdResult, setCreatedResult] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);

  useEffect(() => {
    async function loadMeta() {
      try {
        const [agRes, provRes, polRes] = await Promise.all([
          fetchAgents(),
          fetchProviders(),
          fetchPolicy(),
        ]);
        setAgents(agRes.agents || []);
        setProviders(provRes.providers || []);
        setPolicy(polRes.policy || null);

        // Auto-select first buyer agent if none selected
        if (!formData.buyer_agent_id && agRes.agents?.length > 0) {
          const firstBuyer = agRes.agents.find((a) => a.role === 'BUYER');
          if (firstBuyer) setFormData((prev) => ({ ...prev, buyer_agent_id: firstBuyer.id }));
        }

        // Auto-select prefilled or first provider
        if (prefilledProvider) {
          setFormData((prev) => ({
            ...prev,
            title: `Procure ${prefilledProvider.name}`,
            provider_id: prefilledProvider.id,
            recipient_address: prefilledProvider.payment_address,
            asset: prefilledProvider.asset || 'HSK',
            amount: prefilledProvider.unit_price || 10.0,
            network_id: prefilledProvider.network_id || 133,
            purpose: `Acquire ${prefilledProvider.category} stream for venue congestion mitigation`,
            agreement_id: prefilledProvider.agreement_id || '',
            delegation_id: prefilledProvider.delegation_id || '',
          }));
        } else if (provRes.providers?.length > 0 && !formData.provider_id) {
          const firstProv = provRes.providers[0];
          setFormData((prev) => ({
            ...prev,
            provider_id: firstProv.id,
            recipient_address: firstProv.payment_address,
            asset: firstProv.asset || 'HSK',
            amount: firstProv.unit_price || 10.0,
            network_id: firstProv.network_id || 133,
          }));
        }
      } catch (err) {
        console.error('Failed to load metadata:', err);
      }
    }
    loadMeta();
  }, [prefilledProvider]);

  const handleProviderChange = (e) => {
    const provId = e.target.value;
    const selected = providers.find((p) => p.id === provId);
    if (selected) {
      setFormData((prev) => ({
        ...prev,
        provider_id: selected.id,
        recipient_address: selected.payment_address,
        asset: selected.asset || 'HSK',
        amount: selected.unit_price || 10.0,
        network_id: selected.network_id || 133,
        title: `Procure ${selected.name}`,
        purpose: `Acquire ${selected.category} for venue congestion mitigation`,
      }));
    } else {
      setFormData((prev) => ({ ...prev, provider_id: '' }));
    }
  };

  // Client-side Policy Preview Check
  const maxAllowed = policy?.max_amount_per_tx || 50.0;
  const isOverCeiling = parseFloat(formData.amount) > maxAllowed;
  const isInvalidAmount = parseFloat(formData.amount) <= 0 || isNaN(parseFloat(formData.amount));
  const isInvalidRecipient = !formData.recipient_address || !formData.recipient_address.startsWith('0x') || formData.recipient_address.length !== 42;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isInvalidAmount || isInvalidRecipient) return;

    setSubmitting(true);
    setErrorMsg(null);

    try {
      const res = await createPaymentRequest({
        title: formData.title.trim(),
        buyer_agent_id: formData.buyer_agent_id,
        provider_id: formData.provider_id || undefined,
        recipient_address: formData.recipient_address.trim(),
        asset: formData.asset,
        amount: parseFloat(formData.amount),
        network_id: parseInt(formData.network_id, 10),
        purpose: formData.purpose.trim(),
        expiry_hours: parseInt(formData.expiry_hours, 10) || 2,
        agreement_id: formData.agreement_id || undefined,
        delegation_id: formData.delegation_id || undefined,
        is_demo: true,
      });

      setCreatedResult(res);
      if (onMandateCreated) {
        onMandateCreated(res);
      }
    } catch (err) {
      setErrorMsg(err.message || 'Failed to create payment request');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* ── Header ── */}
      <div>
        <h1 className="text-xl font-bold font-display text-crowd-text-primary flex items-center gap-2">
          <CreditCard size={22} className="text-crowd-cyan" />
          Create Payment Request & Mandate
        </h1>
        <p className="text-xs text-crowd-text-secondary mt-1">
          Propose an autonomous payment mandate for provider services on HSK Chain with strict policy enforcement.
        </p>
      </div>

      {/* ── Error Banner ── */}
      {errorMsg && (
        <div className="p-3.5 rounded-xl bg-crowd-danger/15 border border-crowd-danger/30 text-crowd-danger text-xs flex items-center gap-2">
          <AlertTriangle size={16} />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* ── Success Result Card ── */}
      {createdResult && (
        <GlassCard className="p-5 border-crowd-safe/40 space-y-4 bg-crowd-safe/[0.03]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-crowd-safe font-bold text-sm font-display">
              <CheckCircle2 size={18} />
              <span>Mandate Successfully Created & Evaluated</span>
            </div>
            <span className="px-2 py-0.5 rounded font-mono text-[10px] font-bold bg-crowd-safe/20 text-crowd-safe uppercase">
              {createdResult.policy_decision?.decision || 'POLICY APPROVED'}
            </span>
          </div>

          <div className="p-3 rounded-lg bg-crowd-surface border border-crowd-border text-xs font-mono space-y-1">
            <div className="flex justify-between">
              <span className="text-crowd-text-muted">Request ID:</span>
              <span className="text-crowd-text-primary">{createdResult.request_id}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-crowd-text-muted">Mandate ID:</span>
              <span className="text-crowd-cyan font-bold">{createdResult.mandate_id}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-crowd-text-muted">Policy Reason:</span>
              <span className="text-crowd-safe">{createdResult.policy_decision?.reason}</span>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <button
              onClick={() => {
                setCreatedResult(null);
                setFormData((prev) => ({ ...prev, confirmed: false }));
              }}
              className="text-xs text-crowd-text-secondary hover:text-crowd-text-primary"
            >
              ← Create Another Request
            </button>

            <button
              onClick={() => onNavigate('mandates')}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-crowd-cyan text-crowd-bg text-xs font-bold hover:bg-crowd-cyan/90 transition-all shadow-[0_0_12px_rgba(0,212,255,0.25)]"
            >
              <span>Proceed to Wallet Authorization</span>
              <ArrowRight size={14} />
            </button>
          </div>
        </GlassCard>
      )}

      {/* ── Main Form ── */}
      {!createdResult && (
        <form onSubmit={handleSubmit} className="space-y-6">
          <GlassCard className="p-6 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-crowd-border">
              <span className="text-sm font-semibold text-crowd-text-primary flex items-center gap-2">
                <Layers size={16} className="text-crowd-cyan" />
                Mandate Details & Counterparties
              </span>
              <span className="text-[10px] font-mono text-crowd-cyan uppercase px-2 py-0.5 rounded bg-crowd-cyan/10 border border-crowd-cyan/20">
                HSK Chain Testnet (133)
              </span>
            </div>

            {/* Title */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-crowd-text-secondary">Payment Request Title</label>
              <input
                type="text"
                required
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="e.g. Emergency 5G Slice Bandwidth Allocation"
                className="w-full bg-crowd-card border border-crowd-border rounded-xl px-3.5 py-2.5 text-sm text-crowd-text-primary focus:outline-none focus:border-crowd-cyan"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Buyer Agent */}
              <div className="space-y-1">
                <label className="text-xs font-medium text-crowd-text-secondary">Requesting Agent (Buyer)</label>
                <select
                  value={formData.buyer_agent_id}
                  onChange={(e) => setFormData({ ...formData, buyer_agent_id: e.target.value })}
                  className="w-full bg-crowd-card border border-crowd-border rounded-xl px-3.5 py-2.5 text-sm text-crowd-text-primary focus:outline-none focus:border-crowd-cyan font-mono"
                >
                  {agents.filter((a) => a.role === 'BUYER').map((ag) => (
                    <option key={ag.id} value={ag.id}>
                      {ag.name} (Limit: {ag.spending_limit} HSK)
                    </option>
                  ))}
                </select>
              </div>

              {/* Provider Selection */}
              <div className="space-y-1">
                <label className="text-xs font-medium text-crowd-text-secondary">Target Service Provider</label>
                <select
                  value={formData.provider_id}
                  onChange={handleProviderChange}
                  className="w-full bg-crowd-card border border-crowd-border rounded-xl px-3.5 py-2.5 text-sm text-crowd-text-primary focus:outline-none focus:border-crowd-cyan font-mono"
                >
                  <option value="">Custom Manual Recipient</option>
                  {providers.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.unit_price} {p.asset})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Recipient Address */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-crowd-text-secondary">Payee Recipient Address (EVM 0x...)</label>
              <input
                type="text"
                required
                value={formData.recipient_address}
                onChange={(e) => setFormData({ ...formData, recipient_address: e.target.value })}
                placeholder="0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC"
                className={`w-full bg-crowd-card border rounded-xl px-3.5 py-2.5 text-sm font-mono text-crowd-text-primary focus:outline-none ${
                  isInvalidRecipient && formData.recipient_address
                    ? 'border-crowd-danger focus:border-crowd-danger'
                    : 'border-crowd-border focus:border-crowd-cyan'
                }`}
              />
              {isInvalidRecipient && formData.recipient_address && (
                <div className="text-[11px] text-crowd-danger font-mono">Must be a valid 42-character hexadecimal Ethereum address.</div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Amount */}
              <div className="space-y-1">
                <label className="text-xs font-medium text-crowd-text-secondary">Amount</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  className={`w-full bg-crowd-card border rounded-xl px-3.5 py-2.5 text-sm font-mono font-bold text-crowd-text-primary focus:outline-none ${
                    isOverCeiling ? 'border-crowd-danger text-crowd-danger' : 'border-crowd-border focus:border-crowd-cyan'
                  }`}
                />
              </div>

              {/* Asset Token */}
              <div className="space-y-1">
                <label className="text-xs font-medium text-crowd-text-secondary">Settlement Asset</label>
                <select
                  value={formData.asset}
                  onChange={(e) => setFormData({ ...formData, asset: e.target.value })}
                  className="w-full bg-crowd-card border border-crowd-border rounded-xl px-3.5 py-2.5 text-sm text-crowd-text-primary focus:outline-none focus:border-crowd-cyan font-mono"
                >
                  <option value="HSK">HSK (Native Gas Token)</option>
                  <option value="USDT">USDT (Stablecoin)</option>
                  <option value="USDC">USDC (Stablecoin)</option>
                </select>
              </div>

              {/* Network */}
              <div className="space-y-1">
                <label className="text-xs font-medium text-crowd-text-secondary">Target Network</label>
                <select
                  value={formData.network_id}
                  onChange={(e) => setFormData({ ...formData, network_id: parseInt(e.target.value, 10) })}
                  className="w-full bg-crowd-card border border-crowd-border rounded-xl px-3.5 py-2.5 text-sm text-crowd-text-primary focus:outline-none focus:border-crowd-cyan font-mono"
                >
                  <option value={133}>HSK Chain Testnet (133)</option>
                  <option value={177}>HSK Chain Mainnet (177)</option>
                </select>
              </div>
            </div>

            {/* Purpose */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-crowd-text-secondary">Payment Purpose & Contract Memo</label>
              <textarea
                rows={2}
                required
                value={formData.purpose}
                onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
                placeholder="Explicit description of the service delivery and justification."
                className="w-full bg-crowd-card border border-crowd-border rounded-xl px-3.5 py-2 text-sm text-crowd-text-primary focus:outline-none focus:border-crowd-cyan"
              />
            </div>

            {/* Expiry Hours */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-crowd-text-secondary">Mandate Validity Window</label>
              <select
                value={formData.expiry_hours}
                onChange={(e) => setFormData({ ...formData, expiry_hours: parseInt(e.target.value, 10) })}
                className="w-full bg-crowd-card border border-crowd-border rounded-xl px-3.5 py-2.5 text-sm text-crowd-text-primary focus:outline-none focus:border-crowd-cyan font-mono"
              >
                <option value={1}>1 Hour (Standard Micro-Mandate)</option>
                <option value={2}>2 Hours (Recommended for Congestion)</option>
                <option value={6}>6 Hours (Extended Session)</option>
                <option value={24}>24 Hours (Full Day Reservation)</option>
              </select>
            </div>

            {/* ── Deterministic Policy Check Feedback ── */}
            <div className={`p-3.5 rounded-xl border text-xs space-y-1 font-mono ${
              isOverCeiling
                ? 'bg-crowd-danger/10 border-crowd-danger/30 text-crowd-danger'
                : 'bg-crowd-safe/10 border-crowd-safe/30 text-crowd-safe'
            }`}>
              <div className="flex items-center justify-between font-bold">
                <span className="flex items-center gap-1.5">
                  {isOverCeiling ? <AlertTriangle size={15} /> : <ShieldCheck size={15} />}
                  Policy Pre-check: {isOverCeiling ? 'VIOLATION DETECTED' : 'COMPLIANT'}
                </span>
                <span>Max Ceiling: {maxAllowed} {formData.asset}</span>
              </div>
              <p className="text-[11px] opacity-90">
                {isOverCeiling
                  ? `Amount exceeds configured ceiling of ${maxAllowed} ${formData.asset}. The policy engine will reject this request unless limits are raised.`
                  : `Amount ${formData.amount} ${formData.asset} conforms with single-transaction and daily limits.`}
              </p>
            </div>

            {/* User Confirmation */}
            <label className="flex items-start gap-2.5 cursor-pointer pt-2">
              <input
                type="checkbox"
                required
                checked={formData.confirmed}
                onChange={(e) => setFormData({ ...formData, confirmed: e.target.checked })}
                className="mt-0.5 rounded border-crowd-border text-crowd-cyan focus:ring-crowd-cyan"
              />
              <span className="text-xs text-crowd-text-secondary select-none">
                I verify that this payment request is for legitimate autonomous services on HSK Chain and acknowledge that an explicit wallet signature is mandatory prior to execution.
              </span>
            </label>

            {/* Submit */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-crowd-border">
              <button
                type="button"
                onClick={() => onNavigate('dashboard')}
                className="px-4 py-2.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-crowd-text-secondary text-xs"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting || !formData.confirmed || isOverCeiling || isInvalidAmount}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-crowd-cyan text-crowd-bg font-bold text-xs hover:bg-crowd-cyan/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-[0_0_15px_rgba(0,212,255,0.25)]"
              >
                <span>{submitting ? 'Constructing Mandate...' : 'Generate HSP Mandate'}</span>
                <ArrowRight size={14} />
              </button>
            </div>
          </GlassCard>
        </form>
      )}
    </div>
  );
}
