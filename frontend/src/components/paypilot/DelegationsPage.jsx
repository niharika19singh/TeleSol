import { useState, useEffect } from 'react';
import {
  Users, Shield, CheckCircle2, AlertTriangle, Lock,
  PlusCircle, RefreshCw, Slash, Play, ArrowUpRight, Ban
} from 'lucide-react';
import {
  fetchDelegations,
  fetchAgents,
  createDelegation,
  updateDelegationStatus
} from '../../data/paypilotApi';
import GlassCard from '../shared/GlassCard';

export default function DelegationsPage() {
  const [delegations, setDelegations] = useState([]);
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [notification, setNotification] = useState(null);

  const [formData, setFormData] = useState({
    delegation_id: '',
    agent_id: 'agent_buyer_sentinel',
    delegator_address: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
    max_total_budget: 100.0,
    max_amount_per_tx: 25.0,
    daily_budget_limit: 50.0,
    allowed_categories: 'TELECOM_BANDWIDTH,EDGE_COMPUTE,SENSOR_DATA',
    valid_until_hours: 168
  });

  const loadData = async () => {
    try {
      const [delRes, agRes] = await Promise.all([
        fetchDelegations(),
        fetchAgents()
      ]);
      setDelegations(delRes.delegations || []);
      setAgents(agRes.agents || []);
    } catch (err) {
      console.error('Failed to load delegations:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleToggleStatus = async (delegationId, currentStatus) => {
    const nextStatus = (currentStatus === 'ENABLED' || currentStatus === 'ACTIVE') ? 'SUSPENDED' : 'ENABLED';
    try {
      await updateDelegationStatus(delegationId, nextStatus, 'admin_operator');
      setNotification({
        type: 'success',
        text: `Delegation ${delegationId} status changed to ${nextStatus}`
      });
      await loadData();
    } catch (err) {
      setNotification({ type: 'error', text: err.message });
    } finally {
      setTimeout(() => setNotification(null), 4000);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const categories = formData.allowed_categories.split(',').map(c => c.trim()).filter(Boolean);
      const validUntilDate = new Date(Date.now() + (parseInt(formData.valid_until_hours, 10) * 3600 * 1000)).toISOString();
      await createDelegation({
        agent_id: formData.agent_id,
        delegator_address: formData.delegator_address,
        service_categories: categories,
        max_amount_per_tx: parseFloat(formData.max_amount_per_tx),
        max_cumulative_spend: parseFloat(formData.max_total_budget),
        allowed_recipients: [],
        allowed_assets: ['HSK', 'USDT', 'USDC'],
        allowed_networks: [133, 177],
        valid_until: validUntilDate
      });
      setShowModal(false);
      setNotification({
        type: 'success',
        text: 'New agent delegation policy created and registered on audit trail.'
      });
      await loadData();
    } catch (err) {
      setNotification({ type: 'error', text: err.message });
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
            <Users className="text-crowd-cyan" size={24} />
            Agent Delegations & Spending Boundaries
          </h1>
          <p className="text-xs text-crowd-text-muted mt-1">
            Governs delegated agent wallets, atomic budget reservations, and permission limits. Agents cannot self-elevate limits.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowModal(true)}
            className="btn-primary text-xs flex items-center gap-2 px-3 py-2"
          >
            <PlusCircle size={15} />
            Grant New Delegation
          </button>
          <button
            onClick={loadData}
            className="p-2 rounded-lg bg-crowd-surface border border-crowd-border hover:border-crowd-cyan text-crowd-text-secondary"
            title="Refresh Delegations"
          >
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* ── Security Rule Callout ── */}
      <div className="p-4 rounded-xl bg-crowd-purple/5 border border-crowd-purple/20 flex items-start gap-3">
        <Lock className="text-crowd-purple flex-shrink-0 mt-0.5" size={18} />
        <div className="text-xs font-mono">
          <div className="font-bold text-crowd-purple uppercase tracking-wider">
            Agent Boundary Invariant
          </div>
          <div className="text-crowd-text-secondary mt-0.5 leading-relaxed">
            All AI payment actions operate strictly within pre-authorized budget bounds. In-flight mandates atomically reserve budget; settlements commit it; failures release it. An agent attempt to request or sign beyond delegated ceilings is deterministically blocked.
          </div>
        </div>
      </div>

      {/* ── Delegations Grid ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {delegations.map((del) => {
          const budget = del.max_cumulative_spend ?? del.max_total_budget ?? 1;
          const spent = del.cumulative_spend ?? del.current_spent ?? 0;
          const reserved = del.reserved_amount ?? del.current_reserved ?? 0;
          const available = del.remaining_cumulative_budget !== undefined
            ? del.remaining_cumulative_budget
            : Math.max(0, budget - spent - reserved);
          const spentPct = Math.min(100, Math.round((spent / budget) * 100));
          const reservedPct = Math.min(100 - spentPct, Math.round((reserved / budget) * 100));

          const isSuspended = del.status === 'SUSPENDED';
          const categories = del.service_categories || del.allowed_categories || [];

          return (
            <GlassCard key={del.id} className="p-6 space-y-5">
              {/* Header */}
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-sm text-crowd-text-primary">
                      {del.id}
                    </span>
                    <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold ${
                      isSuspended
                        ? 'bg-crowd-danger/20 text-crowd-danger border border-crowd-danger/30'
                        : 'bg-crowd-safe/20 text-crowd-safe border border-crowd-safe/30'
                    }`}>
                      {del.status}
                    </span>
                  </div>
                  <p className="text-xs font-mono text-crowd-text-muted mt-1">
                    Agent ID: <span className="text-crowd-cyan font-bold">{del.agent_id}</span>
                  </p>
                </div>

                <button
                  onClick={() => handleToggleStatus(del.id, del.status)}
                  className={`text-xs font-mono px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all ${
                    isSuspended
                      ? 'bg-crowd-safe/20 text-crowd-safe hover:bg-crowd-safe/30'
                      : 'bg-crowd-danger/20 text-crowd-danger hover:bg-crowd-danger/30'
                  }`}
                  title={isSuspended ? 'Resume Delegation' : 'Suspend Delegation'}
                >
                  {isSuspended ? <Play size={13} /> : <Ban size={13} />}
                  {isSuspended ? 'Resume' : 'Suspend'}
                </button>
              </div>

              {/* Budget Progress Bar */}
              <div className="space-y-2">
                <div className="flex justify-between items-baseline font-mono text-xs">
                  <span className="text-crowd-text-muted text-[10px] uppercase font-bold">
                    Budget Allocation ({budget} HSK Total)
                  </span>
                  <span className="text-crowd-safe font-bold">
                    {available.toFixed(1)} HSK Available
                  </span>
                </div>

                {/* Multi-segment Bar */}
                <div className="w-full h-3 bg-black/40 rounded-full overflow-hidden flex border border-crowd-border">
                  <div
                    style={{ width: `${spentPct}%` }}
                    className="bg-crowd-purple h-full"
                    title={`Spent: ${spent} HSK (${spentPct}%)`}
                  />
                  <div
                    style={{ width: `${reservedPct}%` }}
                    className="bg-crowd-warning h-full"
                    title={`In-Flight Reserved: ${reserved} HSK (${reservedPct}%)`}
                  />
                </div>

                <div className="flex items-center justify-between text-[11px] font-mono text-crowd-text-muted pt-1">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-crowd-purple inline-block" />
                    <span>Spent: {spent.toFixed(1)} HSK</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-crowd-warning inline-block" />
                    <span>Reserved: {reserved.toFixed(1)} HSK</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-crowd-safe inline-block" />
                    <span>Free: {available.toFixed(1)} HSK</span>
                  </div>
                </div>
              </div>

              {/* Limits Grid */}
              <div className="grid grid-cols-2 gap-3 font-mono text-xs">
                <div className="p-2.5 rounded-lg bg-white/[0.02] border border-crowd-border">
                  <span className="text-[10px] text-crowd-text-muted uppercase block">Max Per Transaction</span>
                  <span className="text-crowd-text-primary font-bold">{del.max_amount_per_tx} HSK</span>
                </div>
                <div className="p-2.5 rounded-lg bg-white/[0.02] border border-crowd-border">
                  <span className="text-[10px] text-crowd-text-muted uppercase block">Daily Budget Limit</span>
                  <span className="text-crowd-text-primary font-bold">{del.daily_budget_limit} HSK</span>
                </div>
              </div>

              {/* Allowed Categories */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-mono text-crowd-text-muted uppercase font-bold block">
                  Permitted Service Scopes
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {categories.map((cat, idx) => (
                    <span
                      key={idx}
                      className="text-[10px] font-mono px-2 py-0.5 rounded bg-crowd-cyan/10 text-crowd-cyan border border-crowd-cyan/20"
                    >
                      {cat}
                    </span>
                  ))}
                </div>
              </div>

              {/* Footer info */}
              <div className="pt-2 border-t border-crowd-border/60 flex items-center justify-between text-[11px] font-mono text-crowd-text-muted">
                <span className="truncate max-w-[200px]" title={del.delegator_address}>
                  Delegator: {del.delegator_address?.substring(0, 10)}...
                </span>
                <span>
                  Expires: {del.valid_until ? (typeof del.valid_until === 'number' ? new Date(del.valid_until * 1000).toLocaleDateString() : new Date(del.valid_until).toLocaleDateString()) : 'Permanent'}
                </span>
              </div>
            </GlassCard>
          );
        })}
      </div>

      {/* ── Create Delegation Modal ── */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-crowd-surface border border-crowd-border rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-crowd-border pb-3">
              <h2 className="text-base font-bold font-display text-crowd-text-primary flex items-center gap-2">
                <Users size={18} className="text-crowd-cyan" />
                Grant New Agent Delegation
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-crowd-text-muted hover:text-crowd-text-primary text-xs font-mono"
              >
                Cancel
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4 text-xs font-mono">
              <div>
                <label className="text-crowd-text-secondary block mb-1">Target Agent</label>
                <select
                  value={formData.agent_id}
                  onChange={(e) => setFormData({ ...formData, agent_id: e.target.value })}
                  className="w-full bg-black/40 border border-crowd-border rounded-lg p-2 text-crowd-text-primary font-mono text-xs"
                  required
                >
                  {agents.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name || a.id} ({a.role})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-crowd-text-secondary block mb-1">Total Budget</label>
                  <input
                    type="number"
                    step="1"
                    value={formData.max_total_budget}
                    onChange={(e) => setFormData({ ...formData, max_total_budget: e.target.value })}
                    className="w-full bg-black/40 border border-crowd-border rounded-lg p-2 text-crowd-text-primary font-mono text-xs"
                    required
                  />
                </div>
                <div>
                  <label className="text-crowd-text-secondary block mb-1">Max Per Tx</label>
                  <input
                    type="number"
                    step="1"
                    value={formData.max_amount_per_tx}
                    onChange={(e) => setFormData({ ...formData, max_amount_per_tx: e.target.value })}
                    className="w-full bg-black/40 border border-crowd-border rounded-lg p-2 text-crowd-text-primary font-mono text-xs"
                    required
                  />
                </div>
                <div>
                  <label className="text-crowd-text-secondary block mb-1">Daily Limit</label>
                  <input
                    type="number"
                    step="1"
                    value={formData.daily_budget_limit}
                    onChange={(e) => setFormData({ ...formData, daily_budget_limit: e.target.value })}
                    className="w-full bg-black/40 border border-crowd-border rounded-lg p-2 text-crowd-text-primary font-mono text-xs"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="text-crowd-text-secondary block mb-1">
                  Allowed Categories (comma separated)
                </label>
                <input
                  type="text"
                  value={formData.allowed_categories}
                  onChange={(e) => setFormData({ ...formData, allowed_categories: e.target.value })}
                  className="w-full bg-black/40 border border-crowd-border rounded-lg p-2 text-crowd-text-primary font-mono text-xs"
                  required
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-3 border-t border-crowd-border">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-lg bg-white/[0.04] text-crowd-text-secondary hover:text-crowd-text-primary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn-primary px-4 py-2 flex items-center gap-2"
                >
                  {submitting ? 'Granting...' : 'Grant Delegation & Register'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
