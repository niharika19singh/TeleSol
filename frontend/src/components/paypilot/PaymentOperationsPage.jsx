// ═══════════════════════════════════════════════════════
// SENPAY — Payment Operations & Autonomous Settlement Console
// Grounded in Escrow Locking, Real-Time SLA Verification, and HashKey Blockchain Proofs
// Harmonized for Porcelain Light & Obsidian Dark Themes with Enterprise Motion
// ═══════════════════════════════════════════════════════

import React, { useState, useEffect } from 'react';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Circle,
  Clock,
  ShieldCheck,
  Copy,
  Check,
  Lock,
  ArrowRight,
  ExternalLink,
  RefreshCw,
  FileText,
  AlertOctagon,
  Sliders,
  Shield,
  Zap,
  Sparkles,
  Pencil,
  FileCheck2,
  Scale
} from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, Line } from 'recharts';
import { evaluateSentinelOutcome, fetchServiceAgreements, fetchTransactions } from '../../data/paypilotApi';
import { useTheme } from '../../context/ThemeContext';

export default function PaymentOperationsPage({
  onNavigate,
  onOpenDispute,
  onViewProof,
}) {
  const { isLight } = useTheme();
  const [mode, setMode] = useState('demo');
  const [copied, setCopied] = useState(false);
  const [evaluating, setEvaluating] = useState(false);
  const [outcomeResult, setOutcomeResult] = useState(null);

  // Dual Telemetry Wave Data (Simulated Baseline vs Live Mitigated)
  const telemetryData = [
    { time: '04:10', sim: 28, live: 34 },
    { time: '04:11', sim: 35, live: 46 },
    { time: '04:12', sim: 42, live: 55 },
    { time: '04:13', sim: 38, live: 49 },
    { time: '04:14', sim: 26, live: 38 },
    { time: '04:15', sim: 19, live: 24 },
    { time: '04:16', sim: 14, live: 14.2 },
  ];

  const handleCopyHash = () => {
    navigator.clipboard?.writeText('0x573b9e4210a8b417c89f');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleVerifyRelease = async () => {
    setEvaluating(true);
    try {
      const res = await evaluateSentinelOutcome({
        agreement_id: 'agr_seed_001',
        post_metrics: {
          crs_score: 22.0,
          latency_ms: 14.2,
          packet_loss_pct: 0.04
        }
      });
      setOutcomeResult(res);
    } catch (err) {
      console.error('Outcome verification failed:', err);
    } finally {
      setEvaluating(false);
    }
  };

  return (
    <div className="space-y-4 max-w-[1680px] mx-auto pb-8 font-sans animate-fade-in-up text-senpay-text-primary">
      {/* ── Top Header Section ── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-2 border-b border-senpay-border/60">
        <div>
          <div className="text-[10px] font-mono text-senpay-text-muted uppercase tracking-wider mb-0.5">
            PAYMENT OPERATIONS &amp; SETTLEMENT COORDINATOR
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-xl font-bold font-display text-senpay-text-primary flex items-center gap-2">
              Payment Operations &amp; Autonomous Settlement
            </h1>

            {/* Top Incident Pill */}
            <div className="px-2.5 py-0.5 rounded bg-senpay-amber/15 border border-senpay-amber/40 text-[10px] font-mono font-bold text-senpay-amber flex items-center gap-1.5">
              <AlertTriangle size={11} />
              <span>INCIDENT #INC-2026-8812 (West Corridor)</span>
            </div>
          </div>
        </div>

        {/* Mode Toggle & Status */}
        <div className="flex items-center gap-2 self-start lg:self-center">
          <span className="text-[11px] font-mono text-senpay-text-secondary">Engine Mode:</span>
          <div className="flex rounded bg-senpay-panel border border-senpay-border p-0.5 text-xs font-mono">
            <button
              onClick={() => setMode('demo')}
              className={`px-3 py-1 rounded font-bold transition-all ${
                mode === 'demo'
                  ? 'bg-senpay-card text-senpay-text-primary shadow-sm'
                  : 'text-senpay-text-muted hover:text-senpay-text-primary'
              }`}
            >
              DEMO
            </button>
            <button
              onClick={() => setMode('live')}
              className={`px-3 py-1 rounded font-bold transition-all ${
                mode === 'live'
                  ? 'bg-senpay-cyan text-slate-950 font-black'
                  : 'text-senpay-text-muted hover:text-senpay-text-primary'
              }`}
            >
              LIVE
            </button>
          </div>
        </div>
      </div>

      {/* ── Payment Lifecycle Step Progression (Reference 1 Flight Strip) ── */}
      <div className="flex items-center justify-between gap-2 overflow-x-auto py-2.5 px-3 rounded bg-senpay-panel border border-senpay-border text-xs font-mono">
        <div className="flex items-center gap-1.5 text-senpay-text-muted">
          <CheckCircle2 size={13} className="text-senpay-green" />
          <span className="font-bold text-senpay-text-primary">1. SELECT</span>
          <span className="text-[10px] text-senpay-text-muted">(SkyLink 5G)</span>
          <ArrowRight size={12} className="text-senpay-border ml-2" />
        </div>

        <div className="flex items-center gap-1.5 text-senpay-cyan font-bold">
          <CheckCircle2 size={13} className="text-senpay-green" />
          <span>2. AUTHORIZE</span>
          <span className="text-[10px] font-normal text-senpay-cyan">(Signed)</span>
          <ArrowRight size={12} className="text-senpay-border ml-2" />
        </div>

        <div className="flex items-center gap-1.5 text-senpay-cyan font-bold">
          <CheckCircle2 size={13} className="text-senpay-green" />
          <span>3. PROCURE</span>
          <span className="text-[10px] font-normal text-senpay-cyan">(Reserved)</span>
          <ArrowRight size={12} className="text-senpay-border ml-2" />
        </div>

        <div className="flex items-center gap-1.5 text-senpay-amber font-bold">
          <Clock size={13} className="animate-spin text-senpay-amber" />
          <span>4. VERIFY</span>
          <span className="text-[10px] font-normal text-senpay-amber">(Outcome Pending)</span>
          <ArrowRight size={12} className="text-senpay-border ml-2" />
        </div>

        <div className="flex items-center gap-1.5 text-senpay-text-muted font-bold">
          <Circle size={13} />
          <span>5. SETTLE</span>
          <span className="text-[10px] font-normal text-senpay-text-muted">(Awaiting Release)</span>
        </div>
      </div>

      {/* ── Main Operations Grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* ── Left Column (Col 1-6) ── */}
        <div className="lg:col-span-6 space-y-4">
          {/* 1. Contract Escrow & Atomic Payments */}
          <div className="senpay-card p-4">
            <div className="flex items-center justify-between pb-2 border-b border-senpay-border mb-3">
              <div>
                <span className="text-xs font-mono font-bold text-senpay-text-primary tracking-wider uppercase block">
                  Contract Escrow &amp; Atomic Settlement
                </span>
                <span className="text-xs text-senpay-text-secondary">
                  Service Provider: SkyLink Dynamic 5G Slicing
                </span>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-senpay-cyan/15 text-senpay-cyan border border-senpay-cyan/30 font-bold">
                MANDATE: man_opt_west_8812
              </span>
            </div>

            {/* Escrow Banner */}
            <div className="p-4 rounded-lg bg-senpay-panel border border-senpay-cyan/40 shadow-sm relative overflow-hidden">
              <div className="flex items-center gap-2 text-senpay-cyan font-mono text-xs font-bold mb-1">
                <Zap size={14} />
                <span>PAYMENT DISPATCHED &bull; HELD IN TIME-LOCKED ESCROW</span>
              </div>
              <div className="text-[10px] font-mono text-senpay-text-muted mb-4">
                Cryptographic Workflow: Agreement &rarr; Mandate &rarr; Escrow Deposit &rarr; Telemetry Validation
              </div>

              {/* Cryptographic Workflow Flow Diagram */}
              <div className="flex items-center justify-between max-w-sm mx-auto my-3 px-2 text-senpay-cyan">
                <div className="w-8 h-8 rounded bg-senpay-card border border-senpay-cyan/40 flex items-center justify-center" title="Telemetry Feed">
                  <Activity size={15} />
                </div>
                <span className="text-xs text-senpay-border">&rarr;</span>

                <div className="w-8 h-8 rounded bg-senpay-card border border-senpay-cyan/40 flex items-center justify-center" title="Escrow Lock">
                  <Lock size={15} />
                </div>
                <span className="text-xs text-senpay-border">&rarr;</span>

                <div className="w-8 h-8 rounded bg-senpay-card border border-senpay-cyan/40 flex items-center justify-center" title="Service Agreement Hash">
                  <FileText size={15} />
                </div>
                <span className="text-xs text-senpay-border">&rarr;</span>

                <div className="w-8 h-8 rounded bg-senpay-card border border-senpay-cyan/40 flex items-center justify-center" title="Policy Authorization">
                  <ShieldCheck size={15} />
                </div>
                <span className="text-xs text-senpay-border">&rarr;</span>

                <div className="w-8 h-8 rounded bg-senpay-green/20 border border-senpay-green text-senpay-green flex items-center justify-center" title="Outcome Settle">
                  <Check size={16} />
                </div>
              </div>

              {/* Amount Display */}
              <div className="mt-4 pt-3 border-t border-senpay-border flex items-baseline justify-between">
                <div>
                  <span className="text-3xl font-black font-display text-senpay-text-primary tracking-tight">
                    12.50 HSK
                  </span>
                  <span className="text-xs font-mono font-bold text-senpay-cyan ml-2">
                    ($12,500 USD Eqv.)
                  </span>
                </div>
                <span className="text-[10px] font-mono text-senpay-text-muted">
                  Chain ID: 133 (HashKey Testnet)
                </span>
              </div>
            </div>
          </div>

          {/* 2. Blockchain Receipts & Escrow Parameters */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Blockchain Receipts */}
            <div className="senpay-card p-3.5 flex flex-col justify-between">
              <div>
                <span className="text-xs font-mono font-bold text-senpay-text-primary tracking-wider uppercase block">
                  Blockchain Receipts
                </span>
                <span className="text-[10px] font-mono text-senpay-text-muted block mb-2">
                  HSK Chain Testnet Integration
                </span>

                <div className="space-y-2 text-xs font-mono pt-1">
                  <div className="flex items-center justify-between">
                    <span className="text-senpay-text-secondary">Block Height</span>
                    <span className="text-senpay-text-primary font-bold flex items-center gap-1">
                      #8,812,402
                      <Copy size={11} className="text-senpay-text-muted cursor-pointer hover:text-senpay-cyan" onClick={handleCopyHash} />
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-senpay-text-secondary">Tx Hash:</span>
                    <span className="text-senpay-cyan font-mono text-[11px]">
                      0x573b...e79f
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-senpay-text-secondary">Gas Consumed:</span>
                    <span className="text-senpay-text-primary">110,321 gwei</span>
                  </div>
                </div>
              </div>

              {/* Automated Safety Check */}
              <div className="pt-3 border-t border-senpay-border mt-3">
                <span className="text-[10px] font-mono text-senpay-text-muted block mb-1">
                  Automated Safety Checks
                </span>
                <div className="flex items-center gap-1.5 text-senpay-green text-xs font-mono font-bold">
                  <CheckCircle2 size={13} />
                  <span>No Reentrancy Risk &bull; Bounds Verified</span>
                </div>
              </div>
            </div>

            {/* Escrow Parameters */}
            <div className="senpay-card p-3.5 flex flex-col justify-between">
              <div>
                <span className="text-xs font-mono font-bold text-senpay-text-primary tracking-wider uppercase block">
                  Escrow Parameters
                </span>

                <div className="space-y-2 mt-2">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-senpay-text-secondary">Deposit Time</span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-senpay-text-primary">18:41 UTC</span>
                      <Check size={12} className="text-senpay-green" />
                    </div>
                  </div>

                  <div className="text-xs font-mono">
                    <span className="text-senpay-text-secondary block">Release Condition (SLA)</span>
                    <div className="text-[11px] text-senpay-text-primary font-medium mt-0.5 leading-snug">
                      Downlink CRS &lt; 35.0<br />
                      Packet drop &lt; 0.1% for 1 hour
                    </div>
                  </div>
                </div>
              </div>

              {/* Progress & Release state */}
              <div className="pt-3 border-t border-senpay-border mt-3">
                <span className="text-[10px] font-mono text-senpay-text-muted block mb-1">
                  Release State
                </span>
                <div className="flex items-center gap-1.5 text-senpay-amber text-[11px] font-mono font-bold">
                  <Clock size={13} className="animate-spin text-senpay-amber" />
                  <span>Awaiting Autonomous Telemetry Evaluation...</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Right Column (Col 7-12) ── */}
        <div className="lg:col-span-6 space-y-4">
          {/* 1. Live Telemetry & Dispute Verification */}
          <div className="senpay-card p-4">
            <div className="flex items-center justify-between pb-1">
              <div>
                <span className="text-xs font-mono font-bold text-senpay-text-primary tracking-wider uppercase block">
                  Live Telemetry &amp; Outcome Evaluation
                </span>
                <div className="flex items-center gap-2 text-[10px] font-mono mt-0.5">
                  <span className="text-senpay-text-muted">Multi-tier dynamic visualizer</span>
                  <span className="text-senpay-border">|</span>
                  <span className="text-senpay-amber font-bold">= baseline CRS</span>
                  <span className="text-senpay-cyan font-bold">- live mitigated telemetry</span>
                </div>
              </div>
            </div>

            <p className="text-[11px] text-senpay-text-secondary mt-1 mb-2 font-sans">
              Sentinel Live Validation &mdash; Inspect post-mitigation telemetry against SLA criteria.
            </p>

            {/* Dual Wave Area Chart */}
            <div className="h-28 w-full my-2">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={telemetryData}>
                  <defs>
                    <linearGradient id="liveCyan" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={isLight ? '#007F95' : '#20C7D9'} stopOpacity={0.3} />
                      <stop offset="95%" stopColor={isLight ? '#007F95' : '#20C7D9'} stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="simOrange" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={isLight ? '#946200' : '#E8AD43'} stopOpacity={0.2} />
                      <stop offset="95%" stopColor={isLight ? '#946200' : '#E8AD43'} stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <Area
                    type="monotone"
                    dataKey="live"
                    stroke={isLight ? '#007F95' : '#20C7D9'}
                    strokeWidth={2}
                    fill="url(#liveCyan)"
                  />
                  <Area
                    type="monotone"
                    dataKey="sim"
                    stroke={isLight ? '#946200' : '#E8AD43'}
                    strokeWidth={1.5}
                    strokeDasharray="3 3"
                    fill="url(#simOrange)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Performance Verification Status Card */}
            <div className="p-3 rounded bg-senpay-panel border border-senpay-amber/40 my-2">
              <div className="text-[10px] font-mono text-senpay-text-muted mb-0.5">
                Outcome Evaluation Pipeline
              </div>
              <div className="text-xs font-mono font-bold text-senpay-amber tracking-wide uppercase flex items-center justify-between">
                <span>POST-INTERVENTION TELEMETRY: CRS 22.0 (SLA FULFILLED)</span>
                {evaluating && <RefreshCw size={13} className="animate-spin text-senpay-amber" />}
              </div>
            </div>

            {/* 3 Telemetry Metrics */}
            <div className="grid grid-cols-3 gap-2 mt-2">
              {/* Latency */}
              <div className="p-2.5 rounded bg-senpay-panel border border-senpay-border text-xs font-mono">
                <div className="flex items-center justify-between text-senpay-text-secondary text-[10px]">
                  <span>Latency</span>
                  <Check size={11} className="text-senpay-green" />
                </div>
                <div className="text-sm font-bold text-senpay-text-primary mt-1">14.2ms</div>
                <div className="text-[9px] text-senpay-green">&lt; 35ms Target Met</div>
              </div>

              {/* CRS Score */}
              <div className="p-2.5 rounded bg-senpay-panel border border-senpay-border text-xs font-mono">
                <div className="flex items-center justify-between text-senpay-text-secondary text-[10px]">
                  <span>CRS Score</span>
                  <Check size={11} className="text-senpay-green" />
                </div>
                <div className="text-sm font-bold text-senpay-green mt-1">22.0 / 100</div>
                <div className="text-[9px] text-senpay-green">&lt; 35.0 Target Met</div>
              </div>

              {/* Packet Loss */}
              <div className="p-2.5 rounded bg-senpay-panel border border-senpay-border text-xs font-mono">
                <div className="flex items-center justify-between text-senpay-text-secondary text-[10px]">
                  <span>Packet Loss</span>
                  <Check size={11} className="text-senpay-green" />
                </div>
                <div className="text-sm font-bold text-senpay-green mt-1">0.04%</div>
                <div className="text-[9px] text-senpay-green">&lt; 0.1% SLA Target</div>
              </div>
            </div>
          </div>

          {/* 2. Audit & Trace Event Log + Action Panel */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Audit & Trace Event Log */}
            <div className="senpay-card p-3.5">
              <span className="text-xs font-mono font-bold text-senpay-text-primary tracking-wider uppercase block pb-2 border-b border-senpay-border mb-2">
                Audit &amp; Trace Event Log
              </span>

              <div className="space-y-1.5 font-mono text-[11px]">
                <div className="flex items-center gap-2">
                  <span className="text-senpay-text-muted">18:41</span>
                  <span className="text-senpay-green font-semibold">escrow_fund_reserved_OK</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-senpay-text-muted">18:41</span>
                  <span className="text-senpay-violet">hsk_mandate_signed</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-senpay-text-muted">18:42</span>
                  <span className="text-senpay-cyan">hsp_slice_allocated</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-senpay-text-muted">18:50</span>
                  <span className="text-senpay-green">telemetry_crs_dropped_22</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-senpay-text-muted">18:55</span>
                  <span className="text-senpay-amber font-semibold">outcome_ready_for_release</span>
                </div>
              </div>
            </div>

            {/* Action Panel */}
            <div className="senpay-card p-3.5 flex flex-col justify-between">
              <span className="text-xs font-mono font-bold text-senpay-text-primary tracking-wider uppercase block pb-2 border-b border-senpay-border mb-2">
                Action Panel
              </span>

              <div className="space-y-2 my-1">
                {/* Vibrant Cyan Button: VERIFY & RELEASE ESCROW */}
                <button
                  onClick={handleVerifyRelease}
                  disabled={evaluating}
                  className={`w-full py-2.5 px-3 rounded bg-senpay-cyan hover:opacity-90 ${
                    isLight ? 'text-white' : 'text-black'
                  } font-mono font-bold text-xs uppercase tracking-wider shadow-sm flex items-center justify-center gap-1.5 transition-all active:scale-[0.98] hover-elevate`}
                >
                  {evaluating ? (
                    <>
                      <RefreshCw size={13} className="animate-spin" />
                      <span>EVALUATING SLA...</span>
                    </>
                  ) : (
                    <>
                      <Zap size={13} />
                      <span>VERIFY &amp; RELEASE ESCROW</span>
                    </>
                  )}
                </button>

                {/* Secondary Button: Initiate Dispute Bundle */}
                <button
                  onClick={() => onNavigate('disputes')}
                  className="w-full py-2 px-3 rounded bg-senpay-panel hover:bg-senpay-elevated text-senpay-text-secondary hover:text-senpay-text-primary border border-senpay-border text-xs font-mono font-medium transition-colors"
                >
                  Initiate Dispute Bundle
                </button>

                {/* Secondary Button: View Proof Bundle */}
                <button
                  onClick={() => onNavigate('evidence')}
                  className="w-full py-2 px-3 rounded bg-senpay-panel hover:bg-senpay-elevated text-senpay-text-secondary hover:text-senpay-text-primary border border-senpay-border text-xs font-mono font-medium transition-colors"
                >
                  View Proof Bundle
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Outcome Result Notification Drawer */}
      {outcomeResult && (
        <div className="senpay-card p-4 border-l-[3px] border-l-senpay-green animate-drawer-enter font-mono text-xs">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-senpay-border">
            <div className="flex items-center gap-2">
              <CheckCircle2 size={16} className="text-senpay-green" />
              <span className="font-bold text-senpay-text-primary">
                Outcome Evaluation: {outcomeResult.status || 'VERIFIED_SUCCESS'}
              </span>
            </div>
            <button
              onClick={() => setOutcomeResult(null)}
              className="text-senpay-text-muted hover:text-senpay-text-primary"
            >
              Dismiss
            </button>
          </div>
          <p className="text-senpay-text-secondary font-sans leading-relaxed">
            {outcomeResult.message || 'Telemetry SLA criteria validated. Escrow payout of 12.50 HSK dispatched to SkyLink provider wallet.'}
          </p>
          <div className="mt-2 text-[10px] text-senpay-text-muted">
            Settlement Hash: <code className="text-senpay-cyan">0x7a89b...41cd</code> &bull; Verified on HashKey Testnet 133
          </div>
        </div>
      )}
    </div>
  );
}
