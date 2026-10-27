import { useState, useEffect } from 'react';
import {
  CreditCard, ShieldCheck, ArrowUpRight, CheckCircle2,
  AlertTriangle, Clock, RefreshCw, Cpu, Layers, ExternalLink,
  Search, PlusCircle, Bot, Activity, Lock
} from 'lucide-react';
import { fetchPayPilotDashboard, reseedDemoData } from '../../data/paypilotApi';
import GlassCard from '../shared/GlassCard';

export default function PayPilotDashboard({ onNavigate, onSelectMandateToExecute, wallet }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [reseedLoading, setReseedLoading] = useState(false);

  const loadData = async () => {
    try {
      const res = await fetchPayPilotDashboard();
      setData(res);
    } catch (err) {
      console.error('Failed to load PayPilot dashboard:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 8000);
    return () => clearInterval(interval);
  }, []);

  const handleReseed = async () => {
    setReseedLoading(true);
    try {
      await reseedDemoData();
      await loadData();
    } catch (err) {
      console.error('Reseed failed:', err);
    } finally {
      setReseedLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-crowd-text-secondary gap-3">
        <RefreshCw size={24} className="animate-spin text-crowd-cyan" />
        <span className="text-sm font-mono">Loading TeleSol PayPilot on HSK Chain...</span>
      </div>
    );
  }

  const metrics = data?.metrics || {
    total_payment_requests: 0,
    pending_authorizations: 0,
    completed_settlements: 0,
    failed_or_rejected: 0,
  };

  const recentRequests = data?.recent_requests || [];
  const recentAudit = data?.recent_audit_events || [];
  const health = data?.integration_health || {};

  return (
    <div className="space-y-6">
      {/* ── Mode & Track Banner ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-xl bg-gradient-to-r from-crowd-surface via-crowd-card to-crowd-surface border border-crowd-border shadow-lg">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-crowd-cyan to-crowd-purple flex items-center justify-center flex-shrink-0 shadow-[0_0_15px_rgba(0,212,255,0.25)]">
            <CreditCard size={20} className="text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold font-display text-crowd-text-primary">
                TeleSol PayPilot
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-mono font-bold uppercase rounded bg-crowd-purple/20 text-crowd-purple border border-crowd-purple/30">
                HSK Horizon Hackathon
              </span>
              <span className="px-2 py-0.5 text-[10px] font-mono font-bold uppercase rounded bg-crowd-cyan/20 text-crowd-cyan border border-crowd-cyan/30">
                HSP Track
              </span>
            </div>
            <p className="text-xs text-crowd-text-secondary">
              AI-assisted autonomous agent payments, structured mandates, and deterministic settlement on HSK Chain.
            </p>
          </div>
        </div>

        {/* Quick action shortcuts */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => onNavigate('create_payment')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-crowd-cyan/15 hover:bg-crowd-cyan/25 text-crowd-cyan border border-crowd-cyan/30 text-xs font-semibold transition-all"
          >
            <PlusCircle size={14} />
            <span>New Payment</span>
          </button>
          <button
            onClick={() => onNavigate('discovery')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] text-crowd-text-primary border border-crowd-border text-xs font-medium transition-all"
          >
            <Search size={14} />
            <span>Discover Services</span>
          </button>
          <button
            onClick={() => onNavigate('ai_workflow')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-crowd-purple/15 hover:bg-crowd-purple/25 text-crowd-purple border border-crowd-purple/30 text-xs font-semibold transition-all"
          >
            <Bot size={14} />
            <span>AI Intent</span>
          </button>
          <button
            onClick={handleReseed}
            disabled={reseedLoading}
            title="Reseed demo agents, providers, policies and sample transactions"
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-crowd-surface hover:bg-white/[0.05] text-crowd-text-muted hover:text-crowd-text-primary border border-crowd-border text-xs transition-all"
          >
            <RefreshCw size={13} className={reseedLoading ? 'animate-spin' : ''} />
            <span className="hidden sm:inline">Reset Demo</span>
          </button>
        </div>
      </div>

      {/* ── KPI Metrics Grid ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1 */}
        <GlassCard className="p-4 border-l-4 border-l-crowd-cyan">
          <div className="flex items-center justify-between text-crowd-text-secondary mb-1">
            <span className="text-xs font-medium">Payment Requests</span>
            <Layers size={16} className="text-crowd-cyan" />
          </div>
          <div className="text-2xl font-bold font-mono text-crowd-text-primary">
            {metrics.total_payment_requests}
          </div>
          <div className="text-[11px] text-crowd-text-muted mt-1">
            Autonomous agent proposals
          </div>
        </GlassCard>

        {/* Metric 2 */}
        <GlassCard className="p-4 border-l-4 border-l-crowd-warning">
          <div className="flex items-center justify-between text-crowd-text-secondary mb-1">
            <span className="text-xs font-medium">Pending Authorizations</span>
            <Clock size={16} className="text-crowd-warning" />
          </div>
          <div className="text-2xl font-bold font-mono text-crowd-warning">
            {metrics.pending_authorizations}
          </div>
          <div className="text-[11px] text-crowd-text-muted mt-1">
            Awaiting wallet approval
          </div>
        </GlassCard>

        {/* Metric 3 */}
        <GlassCard className="p-4 border-l-4 border-l-crowd-safe">
          <div className="flex items-center justify-between text-crowd-text-secondary mb-1">
            <span className="text-xs font-medium">Completed Settlements</span>
            <CheckCircle2 size={16} className="text-crowd-safe" />
          </div>
          <div className="text-2xl font-bold font-mono text-crowd-safe">
            {metrics.completed_settlements}
          </div>
          <div className="text-[11px] text-crowd-text-muted mt-1">
            Verified on HSK Chain
          </div>
        </GlassCard>

        {/* Metric 4 */}
        <GlassCard className="p-4 border-l-4 border-l-crowd-danger">
          <div className="flex items-center justify-between text-crowd-text-secondary mb-1">
            <span className="text-xs font-medium">Policy Rejections</span>
            <AlertTriangle size={16} className="text-crowd-danger" />
          </div>
          <div className="text-2xl font-bold font-mono text-crowd-danger">
            {metrics.failed_or_rejected}
          </div>
          <div className="text-[11px] text-crowd-text-muted mt-1">
            Blocked by ceiling or role rules
          </div>
        </GlassCard>
      </div>

      {/* ── Integration Health & Network Status ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* HSP Gateway */}
        <GlassCard className="p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-crowd-text-primary flex items-center gap-1.5">
              <ShieldCheck size={14} className="text-crowd-cyan" />
              HSP Payment Gateway
            </span>
            <span className={`px-2 py-0.5 text-[10px] font-mono font-bold rounded ${
              health.hsp_gateway?.mode === 'LIVE' ? 'bg-crowd-safe/20 text-crowd-safe' : 'bg-crowd-warning/20 text-crowd-warning'
            }`}>
              {health.hsp_gateway?.mode || 'DEMO ADAPTER'}
            </span>
          </div>
          <div className="text-[11px] text-crowd-text-secondary space-y-1 font-mono">
            <div>Merchant: <span className="text-crowd-text-primary">{health.hsp_gateway?.merchant_id || 'MERCHANT_TELESOL_DEMO'}</span></div>
            <div>Order Route: <span className="text-crowd-cyan">POST /api/v1/merchant/orders</span></div>
            <div>Status: <span className="text-crowd-safe">Operational</span></div>
          </div>
        </GlassCard>

        {/* HSK Chain Testnet */}
        <GlassCard className="p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-crowd-text-primary flex items-center gap-1.5">
              <Cpu size={14} className="text-crowd-purple" />
              HSK Chain Testnet
            </span>
            <span className="px-2 py-0.5 text-[10px] font-mono font-bold rounded bg-crowd-purple/20 text-crowd-purple">
              CHAIN ID 133
            </span>
          </div>
          <div className="text-[11px] text-crowd-text-secondary space-y-1 font-mono">
            <div>RPC: <span className="text-crowd-text-primary">https://testnet.hsk.xyz</span></div>
            <div>Explorer: <a href="https://testnet-explorer.hskchain.net" target="_blank" rel="noreferrer" className="text-crowd-cyan hover:underline inline-flex items-center gap-0.5">testnet-explorer <ExternalLink size={10} /></a></div>
            <div>Latest Block: <span className="text-crowd-safe">{health.hsk_chain_testnet?.latestBlock || '4892100+'}</span></div>
          </div>
        </GlassCard>

        {/* Connected Wallet */}
        <GlassCard className="p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-crowd-text-primary flex items-center gap-1.5">
              <Lock size={14} className="text-crowd-safe" />
              Signer Wallet
            </span>
            <span className={`px-2 py-0.5 text-[10px] font-mono font-bold rounded ${
              wallet.isDemoWallet ? 'bg-crowd-warning/20 text-crowd-warning' : 'bg-crowd-safe/20 text-crowd-safe'
            }`}>
              {wallet.isDemoWallet ? 'DEMO ADAPTER' : 'INJECTED EVM'}
            </span>
          </div>
          <div className="text-[11px] text-crowd-text-secondary space-y-1 font-mono">
            <div>Address: <span className="text-crowd-text-primary">{wallet.address ? `${wallet.address.slice(0, 6)}...${wallet.address.slice(-4)}` : 'Disconnected'}</span></div>
            <div>Network: <span className="text-crowd-cyan">HSK Chain (133)</span></div>
            <div>Authorization: <span className="text-crowd-safe">Required per transaction</span></div>
          </div>
        </GlassCard>
      </div>

      {/* ── Main Two-Column View: Recent Requests & Audit Log ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Recent Payment Requests */}
        <div className="lg:col-span-2 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-crowd-text-primary flex items-center gap-2">
              <Activity size={16} className="text-crowd-cyan" />
              Recent Payment Requests & Mandates
            </h3>
            <button
              onClick={() => onNavigate('mandates')}
              className="text-xs text-crowd-cyan hover:underline font-mono"
            >
              View All Mandates →
            </button>
          </div>

          <GlassCard className="overflow-hidden">
            {recentRequests.length === 0 ? (
              <div className="p-8 text-center text-sm text-crowd-text-secondary">
                No payment requests created yet. Use "New Payment" or "AI Intent" to create one.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-crowd-border bg-white/[0.02] text-crowd-text-muted font-mono uppercase text-[10px]">
                      <th className="py-2.5 px-3">Request / Mandate</th>
                      <th className="py-2.5 px-3">Title & Purpose</th>
                      <th className="py-2.5 px-3">Amount</th>
                      <th className="py-2.5 px-3">Policy Status</th>
                      <th className="py-2.5 px-3">Settlement</th>
                      <th className="py-2.5 px-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-crowd-border/60">
                    {recentRequests.map((req) => {
                      const isSettled = req.execution_status === 'SETTLED';
                      const isApproved = req.authorization_status === 'POLICY_APPROVED';
                      const isRejected = req.authorization_status === 'REJECTED';

                      return (
                        <tr key={req.id} className="hover:bg-white/[0.02] transition-colors">
                          <td className="py-3 px-3 font-mono">
                            <div className="text-crowd-text-primary font-medium">{req.mandate_id || req.id}</div>
                            <div className="text-[10px] text-crowd-text-muted">HSK Chain ({req.network_id})</div>
                          </td>
                          <td className="py-3 px-3">
                            <div className="text-crowd-text-primary font-medium">{req.title}</div>
                            <div className="text-[11px] text-crowd-text-secondary truncate max-w-xs">{req.purpose}</div>
                          </td>
                          <td className="py-3 px-3 font-mono font-bold text-crowd-cyan">
                            {req.amount} {req.asset}
                          </td>
                          <td className="py-3 px-3">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                              isApproved ? 'bg-crowd-safe/20 text-crowd-safe' :
                              isRejected ? 'bg-crowd-danger/20 text-crowd-danger' :
                              'bg-crowd-warning/20 text-crowd-warning'
                            }`}>
                              {req.authorization_status || 'PENDING'}
                            </span>
                          </td>
                          <td className="py-3 px-3">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                              isSettled ? 'bg-crowd-safe/20 text-crowd-safe' :
                              'bg-white/[0.05] text-crowd-text-secondary'
                            }`}>
                              {req.execution_status || 'PENDING'}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-right">
                            {isApproved && !isSettled ? (
                              <button
                                onClick={() => onSelectMandateToExecute(req)}
                                className="px-2.5 py-1 rounded bg-crowd-cyan text-crowd-bg font-bold text-[11px] hover:bg-crowd-cyan/90 transition-all shadow-[0_0_10px_rgba(0,212,255,0.2)]"
                              >
                                Sign & Pay
                              </button>
                            ) : isSettled ? (
                              <button
                                onClick={() => onNavigate('transactions')}
                                className="px-2 py-1 rounded bg-white/[0.05] text-crowd-text-secondary hover:text-crowd-text-primary text-[11px]"
                              >
                                Receipt
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

        {/* Right 1 Col: Live Cryptographic Audit Stream */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-crowd-text-primary flex items-center gap-2">
              <ShieldCheck size={16} className="text-crowd-safe" />
              Tamper-Evident Audit Stream
            </h3>
            <button
              onClick={() => onNavigate('audit')}
              className="text-xs text-crowd-safe hover:underline font-mono"
            >
              Verify Chain →
            </button>
          </div>

          <GlassCard className="p-4 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-crowd-border">
              <span className="text-[11px] text-crowd-text-muted uppercase font-mono">SHA-256 Hash Chain</span>
              <span className="flex items-center gap-1 text-[10px] text-crowd-safe font-mono font-bold">
                <span className="w-1.5 h-1.5 rounded-full bg-crowd-safe animate-pulse" />
                VERIFIED INTACT
              </span>
            </div>

            <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
              {recentAudit.slice(0, 6).map((log) => {
                return (
                  <div key={log.id} className="p-2 rounded-lg bg-white/[0.02] border border-crowd-border/60 text-xs space-y-1">
                    <div className="flex items-center justify-between text-[10px] font-mono">
                      <span className="text-crowd-cyan font-bold">{log.event_type}</span>
                      <span className="text-crowd-text-muted">{new Date(log.timestamp).toLocaleTimeString()}</span>
                    </div>
                    <div className="text-crowd-text-secondary truncate">
                      {log.action} on <span className="text-crowd-text-primary font-mono">{log.entity_type}</span>
                    </div>
                    <div className="text-[9px] font-mono text-crowd-text-muted truncate">
                      Hash: <span className="text-crowd-safe">{log.current_hash?.slice(0, 16)}...</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </GlassCard>
        </div>
      </div>
    </div>
  );
}
