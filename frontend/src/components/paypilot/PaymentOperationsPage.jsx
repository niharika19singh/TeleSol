import React, { useState, useEffect } from 'react';
import {
  AlertTriangle, CheckCircle2, Clock, ShieldCheck, Copy,
  Check, Lock, ArrowRight, ExternalLink, RefreshCw, FileText,
  AlertOctagon, Sliders, Shield, Zap, Sparkles, Pencil
} from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, Line } from 'recharts';
import { evaluateSentinelOutcome, fetchServiceAgreements, fetchTransactions } from '../../data/paypilotApi';

export default function PaymentOperationsPage({
  onNavigate,
  onOpenDispute,
  onViewProof,
}) {
  const [mode, setMode] = useState('demo');
  const [copied, setCopied] = useState(false);
  const [evaluating, setEvaluating] = useState(false);
  const [outcomeResult, setOutcomeResult] = useState(null);

  // Dual Telemetry Wave Data (Simulated Orange vs Live Cyan)
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
      // Calls the actual backend outcome evaluation endpoint!
      const res = await evaluateSentinelOutcome({
        agreement_id: 'agr_seed_001',
        post_metrics: {
          crs_score: 38.0,
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
    <div className="space-y-4 max-w-[1600px] mx-auto pb-8 font-sans">
      {/* ── Top Header Section ── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-2 border-b border-senpay-border/60">
        <div>
          <div className="text-[10px] font-mono text-senpay-text-muted uppercase tracking-wider mb-0.5">
            PAYMENT OPERATIONS & SETTLEMENT
          </div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold font-display text-white flex items-center gap-2">
              Payment Operations & Settlement
              <Pencil size={14} className="text-senpay-text-muted cursor-pointer hover:text-white" />
            </h1>

            {/* Top Incident Pill */}
            <div className="px-2.5 py-0.5 rounded-full bg-[#271E0B] border border-senpay-amber text-[10px] font-mono font-bold text-senpay-amber shadow-[0_0_8px_rgba(255,184,0,0.3)] flex items-center gap-1.5">
              <AlertTriangle size={11} />
              <span>INCIDENT #INC-2026-8812 (West Region)</span>
            </div>
          </div>
        </div>

        {/* Mode Toggle */}
        <div className="flex items-center gap-2 self-start lg:self-center">
          <span className="text-[11px] font-mono text-senpay-text-secondary">Mode Toggle</span>
          <div className="flex rounded-lg bg-senpay-panel border border-senpay-border p-0.5 text-xs font-mono">
            <button
              onClick={() => setMode('demo')}
              className={`px-3 py-1 rounded font-bold transition-all ${
                mode === 'demo' ? 'bg-senpay-card text-senpay-text-primary shadow-sm' : 'text-senpay-text-muted hover:text-senpay-text-primary'
              }`}
            >
              DEMO
            </button>
            <button
              onClick={() => setMode('live')}
              className={`px-3 py-1 rounded font-bold transition-all ${
                mode === 'live' ? 'bg-senpay-cyan text-white' : 'text-senpay-text-muted hover:text-senpay-text-primary'
              }`}
            >
              LIVE
            </button>
          </div>
        </div>
      </div>

      {/* ── Payment Lifecycle Step Progression ── */}
      <div className="flex items-center justify-between gap-2 overflow-x-auto py-2 text-xs font-mono border-b border-senpay-border/40">
        <div className="flex items-center gap-2 text-senpay-text-muted">
          <span>SELECT</span>
          <ArrowRight size={12} />
        </div>

        <div className="flex items-center gap-2 text-senpay-cyan font-bold">
          <span>AUTHORIZE</span>
          <span className="text-[10px] font-normal text-senpay-cyan/80">(Signed)</span>
          <ArrowRight size={12} className="text-senpay-cyan" />
        </div>

        <div className="flex items-center gap-2 text-[#00B4D8] font-bold">
          <span>PROCURE</span>
          <span className="text-[10px] font-normal text-[#00B4D8]/80">(Reserved)</span>
          <ArrowRight size={12} className="text-[#00B4D8]" />
        </div>

        <div className="flex items-center gap-2 text-senpay-green font-bold">
          <span>SETTLE</span>
          <span className="text-[10px] font-normal text-senpay-green/80">Success</span>
          <ArrowRight size={12} className="text-senpay-green" />
        </div>

        <div className="flex items-center gap-1.5 text-senpay-amber font-bold">
          <span>VERIFY</span>
          <span className="text-[10px] font-normal text-senpay-amber/80">(Outcome Pending)</span>
        </div>
      </div>

      {/* ── Main Operations Grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* ── Left Column (Col 1-6) ── */}
        <div className="lg:col-span-6 space-y-4">
          {/* 1. Contract Escrow & Atomic Payments */}
          <div className="senpay-card p-4">
            <div className="flex items-center justify-between pb-2">
              <div>
                <span className="text-xs font-mono font-bold text-white tracking-wider uppercase block">
                  Contract Escrow & Atomic Payments
                </span>
                <span className="text-xs text-senpay-text-secondary">Alt-Net Solutions</span>
              </div>
            </div>

            {/* Glowing Cyan/Teal Banner */}
            <div className="p-4 rounded-xl bg-gradient-to-r from-[#0C2433] via-[#103044] to-[#0C2433] border border-senpay-cyan/50 shadow-[0_0_20px_rgba(0,229,255,0.15)] my-2 relative overflow-hidden">
              <div className="flex items-center gap-2 text-senpay-cyan font-mono text-xs font-bold mb-1">
                <Zap size={14} />
                <span>PAYMENT DISPATCHED / HELD IN ESCROW</span>
              </div>
              <div className="text-[10px] font-mono text-senpay-text-muted mb-4">
                Cryptographic workflow
              </div>

              {/* Cryptographic Workflow Flow Diagram */}
              <div className="flex items-center justify-between max-w-sm mx-auto my-3 px-2 text-senpay-cyan">
                {/* Wave */}
                <div className="w-8 h-8 rounded-lg bg-[#0E1A26] border border-senpay-cyan/40 flex items-center justify-center">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M2 12 Q 6 4 10 12 T 18 12 T 22 12" />
                  </svg>
                </div>
                <span className="text-xs">→</span>

                {/* Lock Shield */}
                <div className="w-8 h-8 rounded-lg bg-[#0E1A26] border border-senpay-cyan/40 flex items-center justify-center">
                  <Lock size={15} />
                </div>
                <span className="text-xs">→</span>

                {/* Encrypted Document */}
                <div className="w-8 h-8 rounded-lg bg-[#0E1A26] border border-senpay-cyan/40 flex items-center justify-center">
                  <FileText size={15} />
                </div>
                <span className="text-xs">→</span>

                {/* Signed Document */}
                <div className="w-8 h-8 rounded-lg bg-[#0E1A26] border border-senpay-cyan/40 flex items-center justify-center">
                  <ShieldCheck size={15} />
                </div>
                <span className="text-xs">→</span>

                {/* Verified Check */}
                <div className="w-8 h-8 rounded-lg bg-senpay-green/20 border border-senpay-green text-senpay-green flex items-center justify-center">
                  <Check size={16} />
                </div>
              </div>

              {/* Amount Display */}
              <div className="mt-4 pt-3 border-t border-senpay-cyan/20 flex items-baseline justify-between">
                <div>
                  <span className="text-2xl lg:text-3xl font-black font-display text-white tracking-tight">
                    $12,500.00
                  </span>
                  <span className="text-xs font-mono font-bold text-senpay-cyan ml-1.5">
                    USD (12.5 HSK)
                  </span>
                </div>
                <span className="text-[10px] font-mono text-senpay-text-muted">
                  Cryptographic workflow
                </span>
              </div>
            </div>
          </div>

          {/* 2. Blockchain Receipts & Escrow Parameters (2 sub-cards side by side) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Blockchain Receipts */}
            <div className="senpay-card p-3.5 flex flex-col justify-between">
              <div>
                <span className="text-xs font-mono font-bold text-white tracking-wider uppercase block">
                  Blockchain Receipts
                </span>
                <span className="text-[10px] font-mono text-senpay-text-muted block mb-2">
                  HSK Chain Testnet Integration
                </span>

                {/* Circuit lines */}
                <div className="h-6 w-full border-b border-senpay-border/60 relative overflow-hidden mb-2">
                  <svg className="w-full h-full opacity-60" viewBox="0 0 160 20">
                    <path d="M 0,10 L 40,10 L 50,5 L 80,5 L 90,15 L 140,15 L 160,10" fill="none" stroke="#00E5FF" strokeWidth="1.2" />
                  </svg>
                </div>

                <div className="space-y-1.5 text-xs font-mono">
                  <div className="flex items-center justify-between">
                    <span className="text-senpay-text-secondary">Block</span>
                    <span className="text-white font-bold flex items-center gap-1">
                      #8,812,402
                      <Copy size={11} className="text-senpay-text-muted cursor-pointer hover:text-white" onClick={handleCopyHash} />
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-senpay-text-secondary">Tx Hash:</span>
                    <span className="text-senpay-cyan font-mono text-[11px]">
                      0x573b...e79f
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-senpay-text-secondary">Gas:</span>
                    <span className="text-senpay-text-primary">110,321 gwei</span>
                  </div>
                </div>
              </div>

              {/* Automated Safety Check */}
              <div className="pt-3 border-t border-senpay-border/60">
                <span className="text-[10px] font-mono text-senpay-text-muted block mb-1">
                  Automated Safety Check
                </span>
                <div className="flex items-center gap-1.5 text-senpay-green text-xs font-mono font-bold">
                  <CheckCircle2 size={13} />
                  <span>No Reentrancy Risk</span>
                </div>
              </div>
            </div>

            {/* Escrow Parameters */}
            <div className="senpay-card p-3.5 flex flex-col justify-between">
              <div>
                <span className="text-xs font-mono font-bold text-white tracking-wider uppercase block">
                  Escrow parameters
                </span>

                <div className="space-y-2 mt-2">
                  {/* Deposit Date */}
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-senpay-text-secondary">Deposit Date</span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-white">Oct 27, 2026</span>
                      <span className="w-4 h-4 rounded bg-[#271E0B] border border-senpay-amber text-[9px] flex items-center justify-center text-senpay-amber">
                        🔒
                      </span>
                      <Check size={12} className="text-senpay-green" />
                    </div>
                  </div>

                  {/* Release Condition */}
                  <div className="text-xs font-mono">
                    <span className="text-senpay-text-secondary block">Release Condition</span>
                    <div className="text-[11px] text-white font-medium mt-0.5 leading-snug">
                      Latency &lt;12ms<br />
                      Dropped &lt;0.1% for 1 hour
                    </div>
                  </div>
                </div>
              </div>

              {/* Progress & Release state */}
              <div className="pt-3 border-t border-senpay-border/60">
                <span className="text-[10px] font-mono text-senpay-text-muted block mb-1">
                  Progress &amp; Release state
                </span>
                <div className="flex items-center gap-1.5 text-senpay-amber text-[11px] font-mono font-bold">
                  <Clock size={13} className="animate-spin text-senpay-amber" />
                  <span>Awaiting Autonomous Verification telemetry...</span>
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
                <span className="text-xs font-mono font-bold text-white tracking-wider uppercase block">
                  Live Telemetry &amp; Dispute Verification
                </span>
                <div className="flex items-center gap-2 text-[10px] font-mono mt-0.5">
                  <span className="text-senpay-text-muted">Multi-tier dynamic visualizer</span>
                  <span className="text-senpay-border">|</span>
                  <span className="text-[#FF8C00] font-bold">= simulation</span>
                  <span className="text-senpay-cyan font-bold">- live network telemetry</span>
                </div>
              </div>
            </div>

            <p className="text-[11px] text-senpay-text-secondary mt-1 mb-2">
              Sentinel Live Validation — Inspect whether $12,500 payload matches SLA
            </p>

            {/* Dual Wave Area Chart */}
            <div className="h-28 w-full my-2">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={telemetryData}>
                  <defs>
                    <linearGradient id="liveCyan" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#00E5FF" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#00E5FF" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="simOrange" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#FF8C00" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#FF8C00" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <Area
                    type="monotone"
                    dataKey="live"
                    stroke="#00E5FF"
                    strokeWidth={2.4}
                    fill="url(#liveCyan)"
                  />
                  <Area
                    type="monotone"
                    dataKey="sim"
                    stroke="#FF8C00"
                    strokeWidth={1.8}
                    strokeDasharray="3 3"
                    fill="url(#simOrange)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Performance Verification Status Card */}
            <div className="p-3 rounded-xl bg-[#201B11] border border-senpay-amber/50 shadow-[0_0_12px_rgba(255,184,0,0.15)] my-2">
              <div className="text-[10px] font-mono text-senpay-text-muted mb-0.5">
                Performance Verification Status Card
              </div>
              <div className="text-xs font-mono font-black text-senpay-amber tracking-wide uppercase flex items-center justify-between">
                <span>TELEMETRY INGESTION: VERIFYING OUTCOME</span>
                {evaluating && <RefreshCw size={13} className="animate-spin text-senpay-amber" />}
              </div>
            </div>

            {/* 3 Telemetry Metrics */}
            <div className="grid grid-cols-3 gap-2 mt-2">
              {/* Latency */}
              <div className="p-2.5 rounded-lg bg-[#111A24] border border-senpay-border text-xs font-mono">
                <div className="flex items-center justify-between text-senpay-text-secondary text-[10px]">
                  <span>Latency</span>
                  <AlertTriangle size={11} className="text-senpay-amber" />
                </div>
                <div className="text-sm font-bold text-white mt-1">14.2ms</div>
                <div className="text-[9px] text-senpay-amber">Warning Amber Target (&lt;12ms)</div>
              </div>

              {/* Jitter */}
              <div className="p-2.5 rounded-lg bg-[#111A24] border border-senpay-border text-xs font-mono">
                <div className="flex items-center justify-between text-senpay-text-secondary text-[10px]">
                  <span>Jitter</span>
                  <Check size={11} className="text-senpay-green" />
                </div>
                <div className="text-sm font-bold text-senpay-green mt-1">1.2ms</div>
                <div className="text-[9px] text-senpay-green">OK ~~~</div>
              </div>

              {/* Packet Loss */}
              <div className="p-2.5 rounded-lg bg-[#111A24] border border-senpay-border text-xs font-mono">
                <div className="flex items-center justify-between text-senpay-text-secondary text-[10px]">
                  <span>Packet Loss</span>
                  <Check size={11} className="text-senpay-green" />
                </div>
                <div className="text-sm font-bold text-senpay-green mt-1">0.04%</div>
                <div className="text-[9px] text-senpay-green">&lt;0.1% OK -----</div>
              </div>
            </div>
          </div>

          {/* 2. Audit & Trace Event Log + Action Panel */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Audit & Trace Event Log */}
            <div className="senpay-card p-3.5">
              <span className="text-xs font-mono font-bold text-white tracking-wider uppercase block pb-2 border-b border-senpay-border/60">
                Audit &amp; Trace Event Log
              </span>

              <div className="space-y-1.5 font-mono text-[11px] mt-2">
                <div className="flex items-center gap-2">
                  <span className="text-senpay-text-muted">04:12</span>
                  <span className="text-senpay-green">escrow_fund_reserved_OK</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-senpay-text-muted">04:12</span>
                  <span className="text-senpay-violet">hsk_tx_broadcast</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-senpay-text-muted">04:13</span>
                  <span className="text-senpay-cyan">telemetry_data_polling_active</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-senpay-text-muted">04:15</span>
                  <span className="text-senpay-violet">hsk_tx_confirmed</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-senpay-text-muted">04:15</span>
                  <span className="text-senpay-amber">escrow_fund_comploned_OK</span>
                </div>
              </div>
            </div>

            {/* Action Panel */}
            <div className="senpay-card p-3.5 flex flex-col justify-between">
              <span className="text-xs font-mono font-bold text-white tracking-wider uppercase block pb-2 border-b border-senpay-border/60">
                Action Panel
              </span>

              <div className="space-y-2 my-2">
                {/* Vibrant Cyan Button: VERIFY & RELEASE ESCROW */}
                <button
                  onClick={handleVerifyRelease}
                  disabled={evaluating}
                  className="w-full py-2.5 px-3 rounded-xl bg-senpay-cyan hover:opacity-90 text-white font-mono font-bold text-xs uppercase tracking-wider shadow-sm flex items-center justify-center gap-1.5 transition-all active:scale-[0.98]"
                >
                  {evaluating ? (
                    <>
                      <RefreshCw size={13} className="animate-spin" />
                      <span>EVALUATING SLA...</span>
                    </>
                  ) : (
                    <span>VERIFY &amp; RELEASE ESCROW</span>
                  )}
                </button>

                {/* Secondary Button: Initiate Dispute Bundle */}
                <button
                  onClick={() => onNavigate('disputes')}
                  className="w-full py-2 px-3 rounded-lg bg-[#1B2733] hover:bg-[#233342] text-senpay-text-secondary hover:text-white border border-senpay-border text-xs font-mono font-medium transition-colors"
                >
                  Initiate Dispute Bundle
                </button>

                {/* Secondary Button: View Proof Bundle */}
                <button
                  onClick={() => onNavigate('evidence')}
                  className="w-full py-2 px-3 rounded-lg bg-[#1B2733] hover:bg-[#233342] text-senpay-text-secondary hover:text-white border border-senpay-border text-xs font-mono font-medium transition-colors"
                >
                  View Proof Bundle
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Footnote from Reference 2 ── */}
      <div className="text-[10px] font-mono text-senpay-text-muted pt-2">
        * Developer tracking for its layer-packed, highly functional, human, slightly hand-crafted tech vibe. No fake screen warp.
      </div>
    </div>
  );
}
