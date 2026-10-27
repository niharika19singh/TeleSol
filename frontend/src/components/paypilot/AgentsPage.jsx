import { useState, useEffect } from 'react';
import {
  Users, Bot, Shield, PlusCircle, CheckCircle2,
  XCircle, AlertTriangle, Lock, RefreshCw, Key
} from 'lucide-react';
import { fetchAgents, createAgent, updateAgentStatus } from '../../data/paypilotApi';
import GlassCard from '../shared/GlassCard';

export default function AgentsPage() {
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    id: '',
    name: '',
    role: 'BUYER',
    description: '',
    capabilities: 'qos_eval, emergency_routing',
    wallet_address: '',
    spending_limit: 50.0,
    daily_limit: 200.0,
  });
  const [submitting, setSubmitting] = useState(false);
  const [statusMsg, setStatusMsg] = useState(null);

  const loadAgents = async () => {
    try {
      const res = await fetchAgents();
      setAgents(res.agents || []);
    } catch (err) {
      console.error('Failed to load agents:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAgents();
  }, []);

  const handleToggleStatus = async (agent) => {
    const nextStatus = agent.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    try {
      await updateAgentStatus(agent.id, nextStatus);
      await loadAgents();
      setStatusMsg({ type: 'success', text: `Agent '${agent.name}' marked ${nextStatus}.` });
    } catch (err) {
      setStatusMsg({ type: 'error', text: err.message });
    }
    setTimeout(() => setStatusMsg(null), 4000);
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const caps = formData.capabilities.split(',').map((c) => c.trim()).filter(Boolean);
      await createAgent({
        id: formData.id.trim(),
        name: formData.name.trim(),
        role: formData.role,
        description: formData.description.trim(),
        capabilities: caps,
        wallet_address: formData.wallet_address.trim() || undefined,
        spending_limit: parseFloat(formData.spending_limit) || 0,
        daily_limit: parseFloat(formData.daily_limit) || 0,
      });
      setShowModal(false);
      setFormData({
        id: '',
        name: '',
        role: 'BUYER',
        description: '',
        capabilities: 'qos_eval, emergency_routing',
        wallet_address: '',
        spending_limit: 50.0,
        daily_limit: 200.0,
      });
      await loadAgents();
      setStatusMsg({ type: 'success', text: 'Agent registered successfully.' });
    } catch (err) {
      setStatusMsg({ type: 'error', text: err.message });
    } finally {
      setSubmitting(false);
      setTimeout(() => setStatusMsg(null), 4000);
    }
  };

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold font-display text-crowd-text-primary flex items-center gap-2">
            <Users size={22} className="text-crowd-cyan" />
            Agent Identity & Permission Management
          </h1>
          <p className="text-xs text-crowd-text-secondary mt-1">
            Register and manage autonomous Buyer, Provider, and Payment agents with strict permission boundaries.
          </p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-crowd-cyan text-crowd-bg text-xs font-bold hover:bg-crowd-cyan/90 transition-all shadow-[0_0_15px_rgba(0,212,255,0.2)]"
        >
          <PlusCircle size={15} />
          <span>Register New Agent</span>
        </button>
      </div>

      {/* ── Status Toast ── */}
      {statusMsg && (
        <div className={`p-3 rounded-lg text-xs flex items-center gap-2 ${
          statusMsg.type === 'success' ? 'bg-crowd-safe/15 border border-crowd-safe/30 text-crowd-safe' : 'bg-crowd-danger/15 border border-crowd-danger/30 text-crowd-danger'
        }`}>
          {statusMsg.type === 'success' ? <CheckCircle2 size={15} /> : <AlertTriangle size={15} />}
          <span>{statusMsg.text}</span>
        </div>
      )}

      {/* ── Security Permission Notice ── */}
      <div className="p-3.5 rounded-xl bg-crowd-card border border-crowd-border text-xs text-crowd-text-secondary space-y-1">
        <div className="font-bold text-crowd-text-primary flex items-center gap-1.5">
          <Shield size={14} className="text-crowd-purple" />
          Role Permission Separation Policy
        </div>
        <p>
          PayPilot strictly segregates agent roles. <strong>Provider agents</strong> cannot propose or authorize payments to themselves. <strong>Buyer agents</strong> can only construct requests within their spending ceilings. <strong>Payment agents</strong> validate deterministic policy rules before handing off to user wallet signing.
        </p>
      </div>

      {/* ── Agents Grid ── */}
      {loading ? (
        <div className="flex items-center justify-center p-12 text-crowd-text-muted">
          <RefreshCw size={20} className="animate-spin text-crowd-cyan mr-2" />
          <span className="text-sm font-mono">Loading agents...</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {agents.map((ag) => {
            const isBuyer = ag.role === 'BUYER';
            const isProvider = ag.role === 'PROVIDER';
            const isPayment = ag.role === 'PAYMENT';

            const roleColor = isBuyer
              ? 'text-crowd-cyan border-crowd-cyan/30 bg-crowd-cyan/10'
              : isProvider
              ? 'text-crowd-purple border-crowd-purple/30 bg-crowd-purple/10'
              : 'text-crowd-safe border-crowd-safe/30 bg-crowd-safe/10';

            return (
              <GlassCard key={ag.id} className="p-4 flex flex-col justify-between space-y-4 hover:border-crowd-cyan/30 transition-all">
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="text-sm font-bold text-crowd-text-primary font-display flex items-center gap-1.5">
                        <Bot size={16} className={isBuyer ? 'text-crowd-cyan' : isProvider ? 'text-crowd-purple' : 'text-crowd-safe'} />
                        {ag.name}
                      </h3>
                      <div className="text-[10px] font-mono text-crowd-text-muted mt-0.5">
                        ID: {ag.id}
                      </div>
                    </div>

                    <span className={`px-2 py-0.5 text-[10px] font-mono font-bold uppercase rounded border ${roleColor}`}>
                      {ag.role}
                    </span>
                  </div>

                  <p className="text-xs text-crowd-text-secondary leading-relaxed">
                    {ag.description || 'Autonomous agent operative on HSK Chain.'}
                  </p>

                  {/* Capabilities */}
                  <div className="space-y-1.5 pt-2 border-t border-crowd-border/60">
                    <span className="text-[10px] font-mono text-crowd-text-muted uppercase">Capabilities</span>
                    <div className="flex flex-wrap gap-1">
                      {Array.isArray(ag.capabilities) && ag.capabilities.map((cap, i) => (
                        <span key={i} className="px-2 py-0.5 rounded bg-white/[0.04] text-[10px] font-mono text-crowd-text-secondary border border-crowd-border">
                          {cap}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Financial Ceilings */}
                  <div className="p-2.5 rounded-lg bg-white/[0.02] border border-crowd-border/80 text-[11px] font-mono space-y-1">
                    <div className="flex justify-between">
                      <span className="text-crowd-text-muted">Per-Tx Limit:</span>
                      <span className="text-crowd-text-primary font-bold">{ag.spending_limit} HSK</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-crowd-text-muted">Daily Budget:</span>
                      <span className="text-crowd-cyan font-bold">{ag.daily_limit} HSK</span>
                    </div>
                    {ag.wallet_address && (
                      <div className="truncate text-[10px] text-crowd-text-muted pt-1 border-t border-crowd-border/40">
                        Wallet: <span className="text-crowd-text-secondary">{ag.wallet_address}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer Controls */}
                <div className="flex items-center justify-between pt-2 border-t border-crowd-border/60">
                  <div className="flex items-center gap-1.5">
                    <span className={`w-2 h-2 rounded-full ${ag.status === 'ACTIVE' ? 'bg-crowd-safe' : 'bg-crowd-text-muted'}`} />
                    <span className="text-[11px] font-mono uppercase text-crowd-text-secondary">{ag.status}</span>
                  </div>

                  <button
                    onClick={() => handleToggleStatus(ag)}
                    className={`px-2.5 py-1 rounded text-[11px] font-medium transition-all ${
                      ag.status === 'ACTIVE'
                        ? 'bg-white/[0.05] text-crowd-text-muted hover:text-crowd-danger hover:bg-crowd-danger/10'
                        : 'bg-crowd-safe/10 text-crowd-safe hover:bg-crowd-safe/20'
                    }`}
                  >
                    {ag.status === 'ACTIVE' ? 'Disable' : 'Enable'}
                  </button>
                </div>
              </GlassCard>
            );
          })}
        </div>
      )}

      {/* ── Register Agent Modal ── */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-crowd-surface border border-crowd-border rounded-2xl w-full max-w-lg p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-crowd-border">
              <h2 className="text-base font-bold font-display text-crowd-text-primary flex items-center gap-2">
                <Bot size={18} className="text-crowd-cyan" />
                Register Autonomous Agent
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-crowd-text-muted hover:text-crowd-text-primary"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-crowd-text-secondary font-medium">Agent ID</label>
                  <input
                    type="text"
                    required
                    value={formData.id}
                    onChange={(e) => setFormData({ ...formData, id: e.target.value })}
                    placeholder="agent_edge_optimizer"
                    className="w-full bg-crowd-card border border-crowd-border rounded-lg px-3 py-2 text-crowd-text-primary focus:outline-none focus:border-crowd-cyan font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-crowd-text-secondary font-medium">Agent Role</label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    className="w-full bg-crowd-card border border-crowd-border rounded-lg px-3 py-2 text-crowd-text-primary focus:outline-none focus:border-crowd-cyan font-mono"
                  >
                    <option value="BUYER">BUYER (Requesting Agent)</option>
                    <option value="PROVIDER">PROVIDER (Service Node)</option>
                    <option value="PAYMENT">PAYMENT (Orchestrator)</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-crowd-text-secondary font-medium">Agent Display Name</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Edge Congestion Optimizer Node"
                  className="w-full bg-crowd-card border border-crowd-border rounded-lg px-3 py-2 text-crowd-text-primary focus:outline-none focus:border-crowd-cyan"
                />
              </div>

              <div className="space-y-1">
                <label className="text-crowd-text-secondary font-medium">Description</label>
                <textarea
                  rows={2}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Monitors throughput degradation and issues micro-payments for 5G emergency slices."
                  className="w-full bg-crowd-card border border-crowd-border rounded-lg px-3 py-2 text-crowd-text-primary focus:outline-none focus:border-crowd-cyan"
                />
              </div>

              <div className="space-y-1">
                <label className="text-crowd-text-secondary font-medium">Capabilities (comma-separated)</label>
                <input
                  type="text"
                  value={formData.capabilities}
                  onChange={(e) => setFormData({ ...formData, capabilities: e.target.value })}
                  placeholder="bandwidth_qos, packet_inspection, auto_mandate"
                  className="w-full bg-crowd-card border border-crowd-border rounded-lg px-3 py-2 text-crowd-text-primary focus:outline-none focus:border-crowd-cyan font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="text-crowd-text-secondary font-medium">EVM Wallet Address (optional)</label>
                <input
                  type="text"
                  value={formData.wallet_address}
                  onChange={(e) => setFormData({ ...formData, wallet_address: e.target.value })}
                  placeholder="0x70997970C51812dc3A010C7d01b50e0d17dc79C8"
                  className="w-full bg-crowd-card border border-crowd-border rounded-lg px-3 py-2 text-crowd-text-primary focus:outline-none focus:border-crowd-cyan font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-crowd-text-secondary font-medium">Per-Tx Ceiling (HSK)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    value={formData.spending_limit}
                    onChange={(e) => setFormData({ ...formData, spending_limit: e.target.value })}
                    className="w-full bg-crowd-card border border-crowd-border rounded-lg px-3 py-2 text-crowd-text-primary focus:outline-none focus:border-crowd-cyan font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-crowd-text-secondary font-medium">Daily Budget Limit (HSK)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    value={formData.daily_limit}
                    onChange={(e) => setFormData({ ...formData, daily_limit: e.target.value })}
                    className="w-full bg-crowd-card border border-crowd-border rounded-lg px-3 py-2 text-crowd-text-primary focus:outline-none focus:border-crowd-cyan font-mono"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-crowd-border">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] text-crowd-text-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-lg bg-crowd-cyan text-crowd-bg font-bold hover:bg-crowd-cyan/90 transition-all shadow-[0_0_12px_rgba(0,212,255,0.25)]"
                >
                  {submitting ? 'Registering...' : 'Register Agent'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
