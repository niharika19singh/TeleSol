import { useState, useEffect } from 'react';
import {
  ShieldAlert, ShieldCheck, AlertTriangle, CheckCircle2,
  XCircle, Sliders, RefreshCw, Lock, Zap, Info, ArrowRight
} from 'lucide-react';
import { simulateSafety, fetchProviders, fetchAgents, fetchMandates } from '../../data/paypilotApi';
import GlassCard from '../shared/GlassCard';

export default function SafetySimulatorView({ onNavigate, onAuthorizeMandate }) {
  const [agents, setAgents] = useState([]);
  const [providers, setProviders] = useState([]);
  const [mandates, setMandates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [simulating, setSimulating] = useState(false);

  // Simulation form parameters
  const [formData, setFormData] = useState({
    mandate_id: '',
    agent_id: 'agent_buyer_sentinel',
    provider_id: 'prov_telecom_01',
    amount: 12.5,
    asset: 'HSK',
    network_id: 133,
    category: 'TELECOM_BANDWIDTH',
    // Hypothetical policy overrides
    override_max_amount: 50.0,
    override_daily_budget: 200.0,
    require_manual_approval: true,
  });

  const [simResult, setSimResult] = useState(null);

  const loadEntities = async () => {
    try {
      const [agRes, prRes, mdRes] = await Promise.all([
        fetchAgents(),
        fetchProviders(),
        fetchMandates()
      ]);
      setAgents(agRes.agents || []);
      setProviders(prRes.providers || []);
      setMandates(mdRes.mandates || []);
    } catch (err) {
      console.error('Failed to load simulator data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEntities();
    // Run an initial simulation with default values
    runSimulation({
      agent_id: 'agent_buyer_sentinel',
      provider_id: 'prov_telecom_01',
      amount: 12.5,
      asset: 'HSK',
      network_id: 133,
      category: 'TELECOM_BANDWIDTH',
      hypothetical_overrides: {
        max_amount_per_tx: 50.0,
        max_daily_budget: 200.0
      }
    });
  }, []);

  const runSimulation = async (payload = null) => {
    setSimulating(true);
    try {
      const body = payload || {
        mandate_id: formData.mandate_id || null,
        agent_id: formData.agent_id,
        provider_id: formData.provider_id,
        amount: parseFloat(formData.amount),
        asset: formData.asset,
        network_id: parseInt(formData.network_id, 10),
        category: formData.category,
        hypothetical_overrides: {
          max_amount_per_tx: parseFloat(formData.override_max_amount),
          max_daily_budget: parseFloat(formData.override_daily_budget),
          require_manual_approval: formData.require_manual_approval ? 1 : 0
        }
      };
      const res = await simulateSafety(body);
      setSimResult(res);
    } catch (err) {
      console.error('Simulation error:', err);
    } finally {
      setSimulating(false);
    }
  };

  const handleMandateSelect = (mId) => {
    setFormData(prev => ({ ...prev, mandate_id: mId }));
    const target = mandates.find(m => m.id === mId);
    if (target) {
      setFormData(prev => ({
        ...prev,
        mandate_id: mId,
        agent_id: target.agent_id || prev.agent_id,
        provider_id: target.provider_id || prev.provider_id,
        amount: target.amount || prev.amount,
        asset: target.asset || prev.asset
      }));
      runSimulation({
        mandate_id: mId,
        hypothetical_overrides: {
          max_amount_per_tx: parseFloat(formData.override_max_amount),
          max_daily_budget: parseFloat(formData.override_daily_budget)
        }
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* ── Page Header ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold font-display text-crowd-text-primary flex items-center gap-2">
            <ShieldAlert className="text-crowd-cyan" size={24} />
            Pre-Execution Policy & Safety Simulator
          </h1>
          <p className="text-xs text-crowd-text-muted mt-1">
            Deterministic pre-flight checks before wallet authorization. Evaluates 11 safety rules, velocity, and fee estimates without signing or broadcasting.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => runSimulation()}
            disabled={simulating}
            className="btn-primary text-xs flex items-center gap-2 px-3 py-2"
          >
            <RefreshCw size={14} className={simulating ? 'animate-spin' : ''} />
            {simulating ? 'Simulating...' : 'Run Safety Simulation'}
          </button>
        </div>
      </div>

      {/* ── Simulator Layout ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Interactive Controls & Hypothetical Overrides (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <GlassCard className="p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-crowd-border pb-3">
              <span className="text-xs font-mono font-bold text-crowd-text-primary flex items-center gap-2">
                <Sliders size={16} className="text-crowd-cyan" />
                Parameters & Overrides
              </span>
              <span className="text-[10px] font-mono text-crowd-text-muted">Pure Dry-Run</span>
            </div>

            {/* Mandate Selection Shortcut */}
            <div>
              <label className="text-xs font-mono text-crowd-text-secondary block mb-1">
                Select Existing Mandate (Optional)
              </label>
              <select
                value={formData.mandate_id}
                onChange={(e) => handleMandateSelect(e.target.value)}
                className="w-full bg-black/40 border border-crowd-border rounded-lg p-2 text-crowd-text-primary font-mono text-xs"
              >
                <option value="">-- Custom Simulation Payload --</option>
                {mandates.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.id} — {m.amount} {m.asset} ({m.authorization_status})
                  </option>
                ))}
              </select>
            </div>

            {/* Amount Slider */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-crowd-text-secondary">Simulated Amount:</span>
                <span className="text-crowd-cyan font-bold">{formData.amount} HSK</span>
              </div>
              <input
                type="range"
                min="1"
                max="100"
                step="0.5"
                value={formData.amount}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  setFormData(prev => ({ ...prev, amount: val }));
                }}
                className="w-full accent-crowd-cyan"
              />
              <div className="flex justify-between text-[10px] font-mono text-crowd-text-muted">
                <span>1 HSK</span>
                <span>50 HSK (Policy Default)</span>
                <span>100 HSK</span>
              </div>
            </div>

            {/* Provider Selection */}
            <div>
              <label className="text-xs font-mono text-crowd-text-secondary block mb-1">
                Destination Provider
              </label>
              <select
                value={formData.provider_id}
                onChange={(e) => setFormData({ ...formData, provider_id: e.target.value })}
                className="w-full bg-black/40 border border-crowd-border rounded-lg p-2 text-crowd-text-primary font-mono text-xs"
              >
                {providers.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name || p.id} ({p.category})
                  </option>
                ))}
                <option value="prov_unregistered_unknown">⚠️ Unregistered / Unknown Provider (Test Failure)</option>
              </select>
            </div>

            {/* Service Category */}
            <div>
              <label className="text-xs font-mono text-crowd-text-secondary block mb-1">
                Service Category
              </label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full bg-black/40 border border-crowd-border rounded-lg p-2 text-crowd-text-primary font-mono text-xs"
              >
                <option value="TELECOM_BANDWIDTH">TELECOM_BANDWIDTH (Permitted)</option>
                <option value="EDGE_COMPUTE">EDGE_COMPUTE (Permitted)</option>
                <option value="SENSOR_DATA">SENSOR_DATA (Permitted)</option>
                <option value="ROUTING_AI">ROUTING_AI (Permitted)</option>
                <option value="GAMBLING_PROHIBITED">GAMBLING_PROHIBITED (Prohibited Policy Test)</option>
              </select>
            </div>

            {/* Hypothetical Policy Overrides */}
            <div className="pt-3 border-t border-crowd-border space-y-3">
              <span className="text-[11px] font-mono font-bold text-crowd-purple uppercase tracking-wider block">
                Hypothetical Policy Overrides
              </span>

              <div className="grid grid-cols-2 gap-3 font-mono text-xs">
                <div>
                  <label className="text-crowd-text-muted text-[10px] block mb-1">Max Tx Limit</label>
                  <input
                    type="number"
                    value={formData.override_max_amount}
                    onChange={(e) => setFormData({ ...formData, override_max_amount: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-black/40 border border-crowd-border rounded p-1.5 text-crowd-text-primary text-xs"
                  />
                </div>
                <div>
                  <label className="text-crowd-text-muted text-[10px] block mb-1">Max Daily Budget</label>
                  <input
                    type="number"
                    value={formData.override_daily_budget}
                    onChange={(e) => setFormData({ ...formData, override_daily_budget: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-black/40 border border-crowd-border rounded p-1.5 text-crowd-text-primary text-xs"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1 font-mono text-xs">
                <input
                  type="checkbox"
                  id="require_approval"
                  checked={formData.require_manual_approval}
                  onChange={(e) => setFormData({ ...formData, require_manual_approval: e.target.checked })}
                  className="accent-crowd-cyan"
                />
                <label htmlFor="require_approval" className="text-crowd-text-secondary">
                  Require Manual Wallet Approval
                </label>
              </div>
            </div>

            <button
              onClick={() => runSimulation()}
              disabled={simulating}
              className="w-full btn-primary py-2 text-xs flex items-center justify-center gap-2 font-mono font-bold"
            >
              <Zap size={14} />
              Re-evaluate 11 Safety Checks
            </button>
          </GlassCard>

          {/* Security Guarantee Notice */}
          <div className="p-3 rounded-xl bg-crowd-cyan/5 border border-crowd-cyan/20 text-xs font-mono space-y-1">
            <div className="text-crowd-cyan font-bold flex items-center gap-1.5">
              <Lock size={13} />
              Zero-Risk Pre-flight Guarantee
            </div>
            <p className="text-[11px] text-crowd-text-muted leading-relaxed">
              This simulator performs dry-run mathematical and policy validation against local state and HSK Chain specifications. No private keys are invoked, and no transactions are broadcast.
            </p>
          </div>
        </div>

        {/* Right: Simulation Output & 11-Check Inspection (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          {simResult ? (
            <GlassCard className="p-6 space-y-6">
              {/* Outcome Banner */}
              <div className={`p-4 rounded-xl border flex items-center justify-between ${
                simResult.status === 'APPROVED FOR AUTHORISATION'
                  ? 'bg-crowd-safe/15 border-crowd-safe/40 text-crowd-safe'
                  : simResult.status === 'BLOCKED'
                  ? 'bg-crowd-danger/15 border-crowd-danger/40 text-crowd-danger'
                  : 'bg-crowd-warning/15 border-crowd-warning/40 text-crowd-warning'
              }`}>
                <div className="flex items-center gap-3">
                  {simResult.status === 'APPROVED FOR AUTHORISATION' ? (
                    <CheckCircle2 size={28} className="text-crowd-safe" />
                  ) : simResult.status === 'BLOCKED' ? (
                    <XCircle size={28} className="text-crowd-danger" />
                  ) : (
                    <AlertTriangle size={28} className="text-crowd-warning" />
                  )}
                  <div>
                    <div className="text-xs font-mono uppercase tracking-widest text-crowd-text-muted">
                      SIMULATION DECISION
                    </div>
                    <div className="text-base font-display font-black tracking-wide">
                      {simResult.status}
                    </div>
                  </div>
                </div>

                <div className="text-right font-mono text-xs">
                  <span className="text-crowd-text-muted block text-[10px]">ESTIMATED FEE</span>
                  <span className="font-bold text-crowd-cyan">{simResult.estimated_fee_hsk} HSK</span>
                </div>
              </div>

              {/* Summary Stats Grid */}
              <div className="grid grid-cols-3 gap-3 font-mono text-xs">
                <div className="p-3 rounded-lg bg-white/[0.02] border border-crowd-border">
                  <span className="text-[10px] text-crowd-text-muted uppercase block">Checks Passed</span>
                  <span className="text-base font-bold text-crowd-safe">
                    {simResult.checks?.filter(c => c.passed).length} / {simResult.checks?.length}
                  </span>
                </div>
                <div className="p-3 rounded-lg bg-white/[0.02] border border-crowd-border">
                  <span className="text-[10px] text-crowd-text-muted uppercase block">Wallet Approval</span>
                  <span className={`text-xs font-bold ${
                    simResult.requires_wallet_authorization ? 'text-crowd-cyan' : 'text-crowd-safe'
                  }`}>
                    {simResult.requires_wallet_authorization ? 'MANDATORY' : 'AUTO-PERMITTED'}
                  </span>
                </div>
                <div className="p-3 rounded-lg bg-white/[0.02] border border-crowd-border">
                  <span className="text-[10px] text-crowd-text-muted uppercase block">Target Network</span>
                  <span className="text-xs font-bold text-crowd-text-primary">
                    HSK Chain ({simResult.simulated_payload?.network_id || 133})
                  </span>
                </div>
              </div>

              {/* 11 Deterministic Checks Breakdown */}
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-crowd-border pb-2">
                  <span className="text-xs font-mono font-bold text-crowd-text-primary uppercase tracking-wider">
                    Deterministic Checks Breakdown ({simResult.checks?.length})
                  </span>
                  <span className="text-[10px] font-mono text-crowd-text-muted">
                    Non-negotiable security guardrails
                  </span>
                </div>

                <div className="space-y-2">
                  {simResult.checks?.map((chk, idx) => (
                    <div
                      key={idx}
                      className={`p-2.5 rounded-lg border flex items-center justify-between text-xs font-mono ${
                        chk.passed
                          ? 'bg-crowd-safe/[0.03] border-crowd-safe/20 text-crowd-text-secondary'
                          : 'bg-crowd-danger/[0.08] border-crowd-danger/40 text-crowd-danger'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        {chk.passed ? (
                          <CheckCircle2 size={15} className="text-crowd-safe flex-shrink-0" />
                        ) : (
                          <XCircle size={15} className="text-crowd-danger flex-shrink-0" />
                        )}
                        <div>
                          <span className="font-bold text-crowd-text-primary">{chk.name}</span>
                          <span className="text-[11px] text-crowd-text-muted block">{chk.details || chk.detail}</span>
                        </div>
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                        chk.passed ? 'bg-crowd-safe/20 text-crowd-safe' : 'bg-crowd-danger/20 text-crowd-danger'
                      }`}>
                        {chk.passed ? 'PASS' : 'FAIL'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Reasons & Action */}
              {(simResult.reasons || simResult.violations || simResult.review_items) && (
                <div className="p-3 rounded-lg bg-black/40 border border-crowd-border space-y-1 font-mono text-xs">
                  <span className="text-crowd-text-muted text-[10px] uppercase font-bold block">
                    Decision Details & Review Criteria:
                  </span>
                  <ul className="list-disc list-inside text-crowd-text-secondary space-y-0.5 text-[11px]">
                    {[
                      ...(simResult.reasons || []),
                      ...(simResult.violations || []),
                      ...(simResult.review_items || [])
                    ].map((r, i) => (
                      <li key={i}>{typeof r === 'string' ? r : r.details || r.detail || JSON.stringify(r)}</li>
                    ))}
                  </ul>
                </div>
              )}
            </GlassCard>
          ) : (
            <GlassCard className="p-12 text-center text-crowd-text-muted text-xs font-mono">
              Running pre-execution simulation...
            </GlassCard>
          )}
        </div>
      </div>
    </div>
  );
}
