import { useState, useEffect } from 'react';
import {
  FileText, ShieldCheck, CheckCircle2, Clock, AlertTriangle,
  Lock, Settings, RefreshCw, ArrowRight, ExternalLink, Sliders
} from 'lucide-react';
import { fetchMandates, fetchPolicy, updatePolicy } from '../../data/paypilotApi';
import { DEMO_SIMULATED_ACTION_MESSAGE } from '../../data/demoFixtures';
import GlassCard from '../shared/GlassCard';

export default function MandatePolicyPage({ onSelectMandateToExecute, onNavigate, isDemoMode = false }) {
  const [mandates, setMandates] = useState([]);
  const [policy, setPolicy] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('ALL');
  const [showPolicyEditor, setShowPolicyEditor] = useState(false);
  const [policyForm, setPolicyForm] = useState({
    max_amount_per_tx: 50.0,
    max_daily_budget: 200.0,
    require_manual_approval: 1,
  });
  const [policySaving, setPolicySaving] = useState(false);
  const [toastMsg, setToastMsg] = useState(null);

  const loadData = async () => {
    try {
      const [mRes, pRes] = await Promise.all([fetchMandates(), fetchPolicy()]);
      setMandates(mRes.mandates || []);
      if (pRes.policy) {
        setPolicy(pRes.policy);
        setPolicyForm({
          max_amount_per_tx: pRes.policy.max_amount_per_tx,
          max_daily_budget: pRes.policy.max_daily_budget,
          require_manual_approval: pRes.policy.require_manual_approval,
        });
      }
    } catch (err) {
      console.error('Failed to load mandates and policy:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSavePolicy = async (e) => {
    e.preventDefault();
    if (!policy) return;
    setPolicySaving(true);
    try {
      if (isDemoMode) {
        setPolicy((prev) => ({
          ...prev,
          max_amount_per_tx: parseFloat(policyForm.max_amount_per_tx),
          max_daily_budget: parseFloat(policyForm.max_daily_budget),
          require_manual_approval: parseInt(policyForm.require_manual_approval, 10),
        }));
        setShowPolicyEditor(false);
        setToastMsg({ type: 'success', text: DEMO_SIMULATED_ACTION_MESSAGE });
        return;
      }
      await updatePolicy(policy.id, {
        max_amount_per_tx: parseFloat(policyForm.max_amount_per_tx),
        max_daily_budget: parseFloat(policyForm.max_daily_budget),
        require_manual_approval: parseInt(policyForm.require_manual_approval, 10),
      });
      await loadData();
      setShowPolicyEditor(false);
      setToastMsg({ type: 'success', text: 'Spending policy rules updated and audited.' });
    } catch (err) {
      setToastMsg({ type: 'error', text: err.message });
    } finally {
      setPolicySaving(false);
      setTimeout(() => setToastMsg(null), 4000);
    }
  };

  const filteredMandates = mandates.filter((m) => {
    if (filter === 'ALL') return true;
    if (filter === 'ACTIONABLE') return m.authorization_status === 'POLICY_APPROVED' && m.execution_status !== 'SETTLED';
    if (filter === 'SETTLED') return m.execution_status === 'SETTLED';
    if (filter === 'REJECTED') return m.authorization_status === 'REJECTED';
    return true;
  });

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold font-display text-crowd-text-primary flex items-center gap-2">
            <FileText size={22} className="text-crowd-cyan" />
            HSP Payment Mandates & Policy Lifecycle
          </h1>
          <p className="text-xs text-crowd-text-secondary mt-1">
            Structured payment authorizations, deterministic policy validation, and state machine lifecycle.
          </p>
        </div>

        <button
          onClick={() => setShowPolicyEditor(!showPolicyEditor)}
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-crowd-card hover:bg-white/[0.05] border border-crowd-border text-crowd-text-primary text-xs font-medium transition-all"
        >
          <Sliders size={14} className="text-crowd-cyan" />
          <span>{showPolicyEditor ? 'Hide Policy Settings' : 'Configure Policy Engine'}</span>
        </button>
      </div>

      {/* Toast Notification */}
      {toastMsg && (
        <div className={`p-3 rounded-lg text-xs flex items-center gap-2 ${
          toastMsg.type === 'success' ? 'bg-crowd-safe/15 border border-crowd-safe/30 text-crowd-safe' : 'bg-crowd-danger/15 border border-crowd-danger/30 text-crowd-danger'
        }`}>
          {toastMsg.type === 'success' ? <CheckCircle2 size={15} /> : <AlertTriangle size={15} />}
          <span>{toastMsg.text}</span>
        </div>
      )}

      {/* ── Policy Editor Drawer ── */}
      {showPolicyEditor && policy && (
        <GlassCard className="p-5 border-crowd-cyan/30 space-y-4 animate-fade-in-up">
          <div className="flex items-center justify-between pb-3 border-b border-crowd-border">
            <div className="flex items-center gap-2 text-sm font-bold font-display text-crowd-text-primary">
              <ShieldCheck size={18} className="text-crowd-cyan" />
              <span>Deterministic Spending Policy Engine Controls</span>
            </div>
            <span className="text-[10px] font-mono text-crowd-text-muted">ID: {policy.id}</span>
          </div>

          <form onSubmit={handleSavePolicy} className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div className="space-y-1">
              <label className="text-crowd-text-secondary font-medium">Per-Tx Ceiling (HSK)</label>
              <input
                type="number"
                step="1"
                min="1"
                required
                value={policyForm.max_amount_per_tx}
                onChange={(e) => setPolicyForm({ ...policyForm, max_amount_per_tx: e.target.value })}
                className="w-full bg-crowd-card border border-crowd-border rounded-lg px-3 py-2 text-crowd-text-primary focus:outline-none focus:border-crowd-cyan font-mono"
              />
              <span className="text-[10px] text-crowd-text-muted">Maximum single transaction limit.</span>
            </div>

            <div className="space-y-1">
              <label className="text-crowd-text-secondary font-medium">Daily Cumulative Ceiling (HSK)</label>
              <input
                type="number"
                step="5"
                min="1"
                required
                value={policyForm.max_daily_budget}
                onChange={(e) => setPolicyForm({ ...policyForm, max_daily_budget: e.target.value })}
                className="w-full bg-crowd-card border border-crowd-border rounded-lg px-3 py-2 text-crowd-text-primary focus:outline-none focus:border-crowd-cyan font-mono"
              />
              <span className="text-[10px] text-crowd-text-muted">24-hour total spend cap across all agents.</span>
            </div>

            <div className="space-y-1">
              <label className="text-crowd-text-secondary font-medium">Approval Policy</label>
              <select
                value={policyForm.require_manual_approval}
                onChange={(e) => setPolicyForm({ ...policyForm, require_manual_approval: parseInt(e.target.value, 10) })}
                className="w-full bg-crowd-card border border-crowd-border rounded-lg px-3 py-2 text-crowd-text-primary focus:outline-none focus:border-crowd-cyan font-mono"
              >
                <option value={1}>Mandatory Wallet Signature (Recommended)</option>
                <option value={0}>Zero-Click Autonomous (Dev Mode Only)</option>
              </select>
              <span className="text-[10px] text-crowd-text-muted">Require explicit user approval per mandate.</span>
            </div>

            <div className="md:col-span-3 flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowPolicyEditor(false)}
                className="px-3.5 py-1.5 rounded-lg bg-white/[0.05] text-crowd-text-secondary text-xs"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={policySaving}
                className="px-5 py-1.5 rounded-lg bg-crowd-cyan text-crowd-bg font-bold text-xs hover:bg-crowd-cyan/90 transition-all shadow-[0_0_10px_rgba(0,212,255,0.2)]"
              >
                {policySaving ? 'Updating...' : 'Save Policy Rules'}
              </button>
            </div>
          </form>
        </GlassCard>
      )}

      {/* ── 6-Stage Lifecycle Flow Overview ── */}
      <GlassCard className="p-4 space-y-3">
        <h3 className="text-xs font-semibold text-crowd-text-muted uppercase tracking-wider font-mono">
          HSP Mandate State Machine Progression
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-6 gap-2 text-center text-[11px] font-mono">
          <div className="p-2.5 rounded-lg bg-white/[0.03] border border-crowd-border space-y-1">
            <span className="w-5 h-5 rounded-full bg-white/10 text-crowd-text-secondary inline-flex items-center justify-center text-[10px] font-bold">1</span>
            <div className="font-bold text-crowd-text-primary">Drafted</div>
            <div className="text-[9px] text-crowd-text-muted">Agent Request</div>
          </div>
          <div className="p-2.5 rounded-lg bg-crowd-cyan/10 border border-crowd-cyan/30 space-y-1">
            <span className="w-5 h-5 rounded-full bg-crowd-cyan/20 text-crowd-cyan inline-flex items-center justify-center text-[10px] font-bold">2</span>
            <div className="font-bold text-crowd-cyan">Policy OK</div>
            <div className="text-[9px] text-crowd-text-muted">Ceiling Validated</div>
          </div>
          <div className="p-2.5 rounded-lg bg-crowd-warning/10 border border-crowd-warning/30 space-y-1">
            <span className="w-5 h-5 rounded-full bg-crowd-warning/20 text-crowd-warning inline-flex items-center justify-center text-[10px] font-bold">3</span>
            <div className="font-bold text-crowd-warning">Wallet Sign</div>
            <div className="text-[9px] text-crowd-text-muted">User Approved</div>
          </div>
          <div className="p-2.5 rounded-lg bg-crowd-purple/10 border border-crowd-purple/30 space-y-1">
            <span className="w-5 h-5 rounded-full bg-crowd-purple/20 text-crowd-purple inline-flex items-center justify-center text-[10px] font-bold">4</span>
            <div className="font-bold text-crowd-purple">HSP Submit</div>
            <div className="text-[9px] text-crowd-text-muted">Gateway Order</div>
          </div>
          <div className="p-2.5 rounded-lg bg-crowd-cyan/10 border border-crowd-cyan/30 space-y-1">
            <span className="w-5 h-5 rounded-full bg-crowd-cyan/20 text-crowd-cyan inline-flex items-center justify-center text-[10px] font-bold">5</span>
            <div className="font-bold text-crowd-cyan">HSK Verified</div>
            <div className="text-[9px] text-crowd-text-muted">Receipt 0x1</div>
          </div>
          <div className="p-2.5 rounded-lg bg-crowd-safe/10 border border-crowd-safe/30 space-y-1">
            <span className="w-5 h-5 rounded-full bg-crowd-safe/20 text-crowd-safe inline-flex items-center justify-center text-[10px] font-bold">6</span>
            <div className="font-bold text-crowd-safe">Settled</div>
            <div className="text-[9px] text-crowd-text-muted">Receipt Issued</div>
          </div>
        </div>
      </GlassCard>

      {/* ── Mandates List & Filters ── */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-1.5">
            {['ALL', 'ACTIONABLE', 'SETTLED', 'REJECTED'].map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1 rounded-lg text-xs font-mono font-bold transition-all ${
                  filter === f
                    ? 'bg-crowd-cyan/20 text-crowd-cyan border border-crowd-cyan/40'
                    : 'bg-white/[0.03] text-crowd-text-secondary hover:text-crowd-text-primary border border-crowd-border'
                }`}
              >
                {f === 'ACTIONABLE' ? 'Awaiting Signature' : f}
              </button>
            ))}
          </div>

          <span className="text-xs font-mono text-crowd-text-muted">
            Showing {filteredMandates.length} of {mandates.length} mandates
          </span>
        </div>

        <GlassCard className="overflow-hidden">
          {filteredMandates.length === 0 ? (
            <div className="p-8 text-center text-sm text-crowd-text-secondary">
              No mandates match this filter. Create a new payment request to generate a mandate.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-crowd-border bg-white/[0.02] text-crowd-text-muted font-mono uppercase text-[10px]">
                    <th className="py-2.5 px-3">Mandate ID</th>
                    <th className="py-2.5 px-3">Payer / Payee</th>
                    <th className="py-2.5 px-3">Amount</th>
                    <th className="py-2.5 px-3">Policy Status</th>
                    <th className="py-2.5 px-3">Execution State</th>
                    <th className="py-2.5 px-3">Verification</th>
                    <th className="py-2.5 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-crowd-border/60">
                  {filteredMandates.map((m) => {
                    const isSettled = m.execution_status === 'SETTLED';
                    const isApproved = m.authorization_status === 'POLICY_APPROVED';
                    const isRejected = m.authorization_status === 'REJECTED';
                    const isAuthorized = m.authorization_status === 'AUTHORIZED';

                    return (
                      <tr key={m.id} className="hover:bg-white/[0.02] transition-colors">
                        <td className="py-3 px-3 font-mono font-medium">
                          <div className="text-crowd-text-primary">{m.mandate_id}</div>
                          <div className="text-[10px] text-crowd-text-muted truncate max-w-[140px]">{m.purpose}</div>
                        </td>
                        <td className="py-3 px-3 font-mono text-[11px]">
                          <div className="text-crowd-text-primary">From: {m.payer_id}</div>
                          <div className="text-crowd-text-secondary truncate max-w-[160px]">To: {m.recipient_address}</div>
                        </td>
                        <td className="py-3 px-3 font-mono font-bold text-crowd-cyan">
                          {m.amount} {m.asset}
                        </td>
                        <td className="py-3 px-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                            isApproved || isAuthorized ? 'bg-crowd-safe/20 text-crowd-safe' :
                            isRejected ? 'bg-crowd-danger/20 text-crowd-danger' :
                            'bg-crowd-warning/20 text-crowd-warning'
                          }`}>
                            {m.authorization_status}
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                            isSettled ? 'bg-crowd-safe/20 text-crowd-safe' :
                            'bg-white/[0.05] text-crowd-text-secondary'
                          }`}>
                            {m.execution_status}
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                            m.verification_status === 'VERIFIED' ? 'bg-crowd-safe/20 text-crowd-safe' :
                            m.verification_status === 'FAILED' ? 'bg-crowd-danger/20 text-crowd-danger' :
                            'bg-white/[0.05] text-crowd-text-muted'
                          }`}>
                            {m.verification_status || 'UNVERIFIED'}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right">
                          {isApproved && !isSettled ? (
                            <button
                              onClick={() => onSelectMandateToExecute(m)}
                              className="px-3 py-1 rounded-lg bg-crowd-cyan text-crowd-bg font-bold text-[11px] hover:bg-crowd-cyan/90 transition-all shadow-[0_0_10px_rgba(0,212,255,0.2)]"
                            >
                              Authorize & Settle
                            </button>
                          ) : isSettled ? (
                            <button
                              onClick={() => onNavigate('transactions')}
                              className="px-2.5 py-1 rounded bg-white/[0.05] text-crowd-text-secondary hover:text-crowd-text-primary text-[11px]"
                            >
                              View Receipt
                            </button>
                          ) : (
                            <span className="text-[11px] text-crowd-text-muted font-mono">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </GlassCard>
      </div>
    </div>
  );
}
