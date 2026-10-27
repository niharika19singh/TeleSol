import React, { useState, useEffect } from 'react';
import {
  AlertTriangle, MoreVertical, CheckCircle2, Circle, Radio,
  Sparkles, Shield, ArrowRight, Zap, RefreshCw, Layers, Check,
  Cpu, Database, Activity, X, Sliders, BarChart3, ChevronRight
} from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip } from 'recharts';
import { fetchModelInfo, fetchDatasetCatalog, runModelInference } from '../../data/api';

export default function ActiveCommandCenter({
  onNavigate,
  onSelectMandateForSigning,
  wallet,
}) {
  const [nodeDataEnabled, setNodeDataEnabled] = useState(true);
  const [manualZoom, setManualZoom] = useState(false);
  const [activeTab, setActiveTab] = useState('all');

  // ML Intelligence & Provenance state
  const [mlModalOpen, setMlModalOpen] = useState(false);
  const [modelInfo, setModelInfo] = useState(null);
  const [datasetInfo, setDatasetInfo] = useState(null);
  const [testRsrp, setTestRsrp] = useState(-105.0);
  const [testRsrq, setTestRsrq] = useState(-14.5);
  const [testSnr, setTestSnr] = useState(2.0);
  const [testDlBitrate, setTestDlBitrate] = useState(8500);
  const [testCqi, setTestCqi] = useState(8);
  const [predResult, setPredResult] = useState(null);
  const [predLoading, setPredLoading] = useState(false);

  useEffect(() => {
    async function loadMlData() {
      try {
        const [mInfo, dInfo] = await Promise.all([
          fetchModelInfo(),
          fetchDatasetCatalog()
        ]);
        if (mInfo) setModelInfo(mInfo);
        if (dInfo) setDatasetInfo(dInfo);
      } catch (err) {
        console.warn('[ML] Failed to load ML info:', err);
      }
    }
    loadMlData();
  }, []);

  const handleRunInference = async (e) => {
    if (e) e.preventDefault();
    setPredLoading(true);
    try {
      const res = await runModelInference({
        rsrp: Number(testRsrp),
        rsrq: Number(testRsrq),
        snr: Number(testSnr),
        cqi: Number(testCqi),
        dl_bitrate: Number(testDlBitrate),
      });
      setPredResult(res);
    } catch (err) {
      console.warn('[ML] Inference failed:', err);
    } finally {
      setPredLoading(false);
    }
  };

  // CRS Sparkline data
  const crsTrendData = [
    { time: '18:30', crs: 42 },
    { time: '18:35', crs: 48 },
    { time: '18:40', crs: 56 },
    { time: '18:45', crs: 64 },
    { time: '18:50', crs: 74 },
    { time: '18:55', crs: 78 },
  ];

  const handleAuthorizeFunds = () => {
    if (onSelectMandateForSigning) {
      onSelectMandateForSigning({
        mandate_id: 'man_opt_west_8812',
        agreement_id: 'agr_seed_001',
        amount: 12.5,
        asset: 'HSK',
        network_id: 133,
        recipient_address: '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC',
        purpose: 'West Region Congestion Spike Mitigation (SkyLink 5G Slice)',
      });
    } else {
      onNavigate('operations');
    }
  };

  return (
    <div className="space-y-4 max-w-[1600px] mx-auto pb-8">
      {/* ── Top Incident Banner ── */}
      <div className="rounded-xl bg-[#1B1914] border border-[#FFB800]/50 p-3.5 flex items-center justify-between shadow-[0_0_20px_rgba(255,184,0,0.12)]">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-lg bg-senpay-amber/20 border border-senpay-amber/40 flex items-center justify-center text-senpay-amber flex-shrink-0">
            <AlertTriangle size={17} />
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono text-sm font-black text-senpay-amber tracking-wide">
              INCIDENT #INC-2026-8812:
            </span>
            <span className="text-sm font-semibold text-white">
              West Region Congestion Spike
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setMlModalOpen(true)}
            className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-950/60 hover:bg-emerald-900/80 text-emerald-300 border border-emerald-500/40 text-xs font-mono font-bold transition-all shadow-[0_0_12px_rgba(16,185,129,0.2)]"
            title="Inspect trained ML model metrics and run live inference"
          >
            <Cpu size={13} className="text-emerald-400" />
            <span>ML Model: 98.7% Acc (UCC 5G)</span>
          </button>
          <button
            onClick={() => onNavigate('incident_monitor')}
            className="px-2.5 py-1 rounded-lg bg-[#27231A] hover:bg-[#342D1E] text-senpay-amber border border-senpay-amber/30 text-xs font-mono font-bold transition-all"
          >
            Inspect Details
          </button>
        </div>
      </div>

      {/* ── Main Grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* ── Network Digital Twin (Left 7 Cols) ── */}
        <div className="lg:col-span-7 senpay-card p-4 flex flex-col justify-between overflow-hidden relative min-h-[420px]">
          {/* Header & Controls */}
          <div className="flex items-center justify-between pb-3 border-b border-senpay-border/60 z-10">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold text-white tracking-wider uppercase">
                NETWORK DIGITAL TWIN
              </span>
            </div>

            <div className="flex items-center gap-3 text-xs">
              <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-[#101821] border border-senpay-border text-[11px] font-mono text-senpay-text-muted">
                <span>Manual Zoom</span>
              </div>

              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-mono text-senpay-text-secondary">Node Data</span>
                <button
                  onClick={() => setNodeDataEnabled(!nodeDataEnabled)}
                  className={`w-8 h-4 rounded-full transition-colors relative ${
                    nodeDataEnabled ? 'bg-senpay-cyan' : 'bg-senpay-panel'
                  }`}
                >
                  <span
                    className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-transform ${
                      nodeDataEnabled ? 'right-0.5' : 'left-0.5'
                    }`}
                  />
                </button>
              </div>

              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-mono text-senpay-text-secondary">Toggle</span>
                <span className="w-7 h-3.5 rounded-full bg-[#101821] border border-senpay-border inline-block relative">
                  <span className="w-2.5 h-2.5 rounded-full bg-senpay-text-muted absolute top-0.5 left-0.5" />
                </span>
              </div>

              <MoreVertical size={14} className="text-senpay-text-muted cursor-pointer" />
            </div>
          </div>

          {/* Interactive Geographic Network Map Canvas */}
          <div className="relative flex-1 w-full my-2 min-h-[310px] bg-[#0E1520] rounded-xl border border-senpay-border/40 overflow-hidden flex items-center justify-center">
            {/* Subtle California / West Coast Background Silhouette */}
            <svg
              className="absolute inset-0 w-full h-full opacity-35 pointer-events-none"
              viewBox="0 0 600 360"
              preserveAspectRatio="xMidYMid meet"
            >
              <defs>
                <linearGradient id="calCoast" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#1B2B3D" />
                  <stop offset="100%" stopColor="#0B131C" />
                </linearGradient>
                <linearGradient id="hotspotGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#FF3B5C" stopOpacity="0.8" />
                  <stop offset="50%" stopColor="#FFB800" stopOpacity="0.5" />
                  <stop offset="100%" stopColor="#00E5FF" stopOpacity="0" />
                </linearGradient>
                <radialGradient id="pulseCenter">
                  <stop offset="0%" stopColor="#FF3B5C" stopOpacity="0.9" />
                  <stop offset="60%" stopColor="#FF8C00" stopOpacity="0.4" />
                  <stop offset="100%" stopColor="#FF3B5C" stopOpacity="0" />
                </radialGradient>
              </defs>

              {/* Landmass Contour */}
              <path
                d="M 120,20 Q 180,60 210,120 Q 230,160 270,220 Q 320,270 420,330 L 460,350 L 60,350 L 60,20 Z"
                fill="url(#calCoast)"
                stroke="#1E3247"
                strokeWidth="1.2"
              />

              {/* Grid Lat/Long Lines */}
              <line x1="0" y1="90" x2="600" y2="90" stroke="#162536" strokeDasharray="4 4" strokeWidth="0.8" />
              <line x1="0" y1="180" x2="600" y2="180" stroke="#162536" strokeDasharray="4 4" strokeWidth="0.8" />
              <line x1="0" y1="270" x2="600" y2="270" stroke="#162536" strokeDasharray="4 4" strokeWidth="0.8" />
              <line x1="200" y1="0" x2="200" y2="360" stroke="#162536" strokeDasharray="4 4" strokeWidth="0.8" />
              <line x1="380" y1="0" x2="380" y2="360" stroke="#162536" strokeDasharray="4 4" strokeWidth="0.8" />

              {/* Geographic Labels */}
              <text x="210" y="85" fill="#4B627D" fontSize="10" fontFamily="sans-serif">California</text>
              <text x="440" y="270" fill="#4B627D" fontSize="9" fontFamily="sans-serif">Los Keinge</text>

              {/* Primary Network Links */}
              {/* Cyan Stream from Bay Area to Central Corridor */}
              <path
                d="M 215,125 Q 235,160 280,185"
                fill="none"
                stroke="#00E5FF"
                strokeWidth="3.2"
                strokeLinecap="round"
                className="drop-shadow-[0_0_8px_rgba(0,229,255,0.8)]"
              />
              <path
                d="M 215,125 Q 200,165 210,210"
                fill="none"
                stroke="#00E5FF"
                strokeWidth="2.5"
                strokeDasharray="4 4"
                className="animate-flow-dash"
              />

              {/* Congested Flow Trail (Yellow & Red Gradient) */}
              <path
                d="M 215,125 Q 260,150 280,185 Q 310,230 320,290"
                fill="none"
                stroke="#FFB800"
                strokeWidth="3.5"
                strokeLinecap="round"
                className="drop-shadow-[0_0_10px_rgba(255,184,0,0.8)]"
              />

              {/* Secondary Lower Cyan Link */}
              <path
                d="M 210,210 Q 235,260 320,290"
                fill="none"
                stroke="#00E5FF"
                strokeWidth="2.2"
                strokeLinecap="round"
              />

              {/* Hotspot Concentric Rings */}
              <circle cx="280" cy="185" r="42" fill="none" stroke="#FF3B5C" strokeWidth="1.2" opacity="0.3" className="hotspot-ring-3" />
              <circle cx="280" cy="185" r="28" fill="none" stroke="#FF8C00" strokeWidth="1.5" opacity="0.5" className="hotspot-ring-2" />
              <circle cx="280" cy="185" r="16" fill="url(#pulseCenter)" className="hotspot-ring-1" />
              <circle cx="280" cy="185" r="6" fill="#FF3B5C" className="drop-shadow-[0_0_8px_#FF3B5C]" />

              {/* Signal Propagation Waves */}
              <path d="M 334,286 A 8,8 0 0,1 334,296" fill="none" stroke="#A855F7" strokeWidth="1.5" />
              <path d="M 338,283 A 13,13 0 0,1 338,299" fill="none" stroke="#A855F7" strokeWidth="1.5" opacity="0.7" />
              <path d="M 342,280 A 18,18 0 0,1 342,302" fill="none" stroke="#A855F7" strokeWidth="1.5" opacity="0.4" />
            </svg>

            {/* Network Nodes with Tags */}
            {/* SFO-01 Tag */}
            <div className="absolute top-[110px] left-[175px] z-20 flex items-center">
              <div className="px-2 py-0.5 rounded-full bg-[#271E0B] border border-senpay-amber text-[10px] font-mono font-bold text-senpay-amber shadow-[0_0_10px_rgba(255,184,0,0.5)]">
                SFO-01
              </div>
            </div>

            {/* OAK-03 Tag */}
            <div className="absolute top-[115px] left-[255px] z-20 flex items-center">
              <div className="px-2 py-0.5 rounded-full bg-[#0C2433] border border-senpay-cyan text-[10px] font-mono font-bold text-senpay-cyan shadow-[0_0_10px_rgba(0,229,255,0.5)]">
                OAK-03
              </div>
            </div>

            {/* Active Nodes Points */}
            <div className="absolute top-[125px] left-[215px] -translate-x-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full bg-senpay-cyan ring-4 ring-senpay-cyan/30" />
            <div className="absolute top-[210px] left-[210px] -translate-x-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-senpay-cyan" />
            <div className="absolute top-[290px] left-[320px] -translate-x-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-senpay-amber" />

            {/* Zoom Controls overlay */}
            <div className="absolute top-3 left-3 flex flex-col rounded bg-[#101821]/90 border border-senpay-border overflow-hidden text-senpay-text-secondary text-xs font-mono">
              <button className="px-2 py-1 hover:text-white hover:bg-senpay-panel">+</button>
              <div className="h-[1px] bg-senpay-border" />
              <button className="px-2 py-1 hover:text-white hover:bg-senpay-panel">−</button>
            </div>

            {/* Bottom Controls */}
            <div className="absolute bottom-3 left-3 z-10 flex items-center gap-2">
              <span className="text-[10px] font-mono text-senpay-text-muted">Manual Zoom</span>
              <button
                onClick={() => setManualZoom(!manualZoom)}
                className={`w-7 h-3.5 rounded-full transition-colors relative ${
                  manualZoom ? 'bg-senpay-cyan' : 'bg-[#101821] border border-senpay-border'
                }`}
              >
                <span
                  className={`absolute top-0.5 w-2.5 h-2.5 rounded-full bg-white transition-transform ${
                    manualZoom ? 'right-0.5' : 'left-0.5'
                  }`}
                />
              </button>
            </div>

            {/* Bottom Right Telemetry Active */}
            <div className="absolute bottom-3 right-3 z-10 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#0A1A17] border border-senpay-green/50 text-[11px] font-mono font-bold text-senpay-green shadow-[0_0_12px_rgba(0,255,136,0.25)]">
              <span className="w-2 h-2 rounded-full bg-senpay-green animate-pulse" />
              <span>((•)) Telemetry Active</span>
            </div>
          </div>
        </div>

        {/* ── Right Top: Playful Timeline & CRS Score (Right 5 Cols) ── */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          {/* ── Playful / Workflow Timeline ── */}
          <div className="senpay-card p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-mono font-bold text-white tracking-wider uppercase">
                PLAYFUL TIMELINE
              </span>
            </div>

            {/* Steps text */}
            <div className="text-[10px] font-mono text-senpay-text-muted flex items-center gap-1 flex-wrap mb-4">
              <span className="text-senpay-green">DETECT</span>
              <span>→</span>
              <span className="text-senpay-cyan">ANALYZE</span>
              <span>→</span>
              <span className="text-senpay-violet">SIMULATE</span>
              <span>→</span>
              <span className="text-senpay-text-secondary">SELECT</span>
              <span>→</span>
              <span className="text-senpay-amber font-bold">AUTHORIZE</span>
              <span>→</span>
              <span>PROCURE</span>
              <span>→</span>
              <span>LERIFY</span>
            </div>

            {/* Curved Sine Wave Graphic with Glowing Checkpoints */}
            <div className="relative h-20 w-full flex items-center justify-center">
              <svg className="w-full h-full" viewBox="0 0 340 70" fill="none">
                <defs>
                  <linearGradient id="waveGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#00E5FF" />
                    <stop offset="35%" stopColor="#00FF88" />
                    <stop offset="70%" stopColor="#A855F7" />
                    <stop offset="100%" stopColor="#FFB800" />
                  </linearGradient>
                </defs>

                {/* Ambient glow wave */}
                <path
                  d="M 10,48 Q 45,15 80,36 T 150,42 T 220,18 T 290,44 L 330,30"
                  fill="none"
                  stroke="url(#waveGrad)"
                  strokeWidth="3.2"
                  strokeLinecap="round"
                  className="drop-shadow-[0_0_10px_rgba(0,229,255,0.7)]"
                />

                {/* Node 1: DETECT */}
                <circle cx="80" cy="36" r="6" fill="#00FF88" />
                <path d="M 77,36 L 79,38 L 83,34" stroke="#0B1118" strokeWidth="1.5" strokeLinecap="round" />

                {/* Node 2: ANALYZE */}
                <circle cx="150" cy="42" r="6" fill="#00E5FF" />
                <path d="M 147,42 L 149,44 L 153,40" stroke="#0B1118" strokeWidth="1.5" strokeLinecap="round" />

                {/* Node 3: SIMULATE */}
                <circle cx="220" cy="18" r="7" fill="#FFB800" className="drop-shadow-[0_0_8px_#FFB800]" />
                <path d="M 217,18 L 219,20 L 223,16" stroke="#0B1118" strokeWidth="1.5" strokeLinecap="round" />

                {/* Node 4: AUTHORIZING FUNDS active check */}
                <circle cx="290" cy="44" r="8" fill="#FFB800" className="drop-shadow-[0_0_12px_#FFB800]" />
                <path d="M 286,44 L 289,47 L 294,41" stroke="#0B1118" strokeWidth="2" strokeLinecap="round" />
              </svg>

              {/* Floating AUTHORIZING FUNDS badge */}
              <div className="absolute bottom-0 right-4 px-2.5 py-0.5 rounded-full bg-[#271E0B] border border-senpay-amber text-[10px] font-mono font-bold text-senpay-amber shadow-[0_0_10px_rgba(255,184,0,0.5)]">
                AUTHORIZING FUNDS
              </div>
            </div>
          </div>

          {/* ── Congestion Risk Score (CRS) ── */}
          <div className="senpay-card p-4 relative overflow-hidden flex flex-col justify-between">
            <div className="flex items-center justify-between pb-2">
              <span className="text-xs font-mono font-bold text-white tracking-wider uppercase">
                Congestion Risk Score (CRS)
              </span>
              <MoreVertical size={14} className="text-senpay-text-muted" />
            </div>

            <div className="grid grid-cols-2 items-center gap-3 my-2">
              {/* Big Score with Tech Circuit background */}
              <div className="p-3 rounded-xl bg-[#111A24] border border-senpay-border relative overflow-hidden flex items-baseline gap-1">
                <span className="text-4xl lg:text-5xl font-black font-display text-white tracking-tight">
                  78
                </span>
                <span className="text-xl font-bold font-mono text-senpay-cyan">
                  /100
                </span>
              </div>

              {/* Golden Sparkline Trend */}
              <div className="h-16 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={crsTrendData}>
                    <defs>
                      <linearGradient id="crsGold" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#FFB800" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#FFB800" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <Area
                      type="monotone"
                      dataKey="crs"
                      stroke="#FFB800"
                      strokeWidth={2.4}
                      fillOpacity={1}
                      fill="url(#crsGold)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Bottom Alert Count & ML Source Link */}
            <div className="flex items-center justify-between gap-2 pt-1 flex-wrap">
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#271418] border border-senpay-red/40 text-xs font-mono text-senpay-red font-bold">
                <AlertTriangle size={13} />
                <span>Active Alerts: 2</span>
              </div>
              <button
                onClick={() => setMlModalOpen(true)}
                className="text-[11px] font-mono text-emerald-400 hover:text-emerald-300 underline underline-offset-2 flex items-center gap-1"
              >
                <span>ML Model Specs</span>
                <ChevronRight size={11} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Bottom Row (3 Cards: Specs, Comparison, Budget) ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-12 gap-4">
        {/* ── 1. Active Incident Specs (Col 1-3) ── */}
        <div className="lg:col-span-4 senpay-card p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-2">
              <span className="text-xs font-mono font-bold text-white tracking-wider uppercase">
                Active Incident Specs
              </span>
              <MoreVertical size={14} className="text-senpay-text-muted" />
            </div>

            <p className="text-xs text-senpay-text-secondary leading-relaxed mb-3">
              Detail card — with rich tech annotations — wolier-nutsive, anoltekes, and anronations.
            </p>

            <div className="mb-4">
              <span className="px-2.5 py-1 rounded-full bg-[#271E0B] border border-senpay-amber text-[10px] font-mono font-bold text-senpay-amber shadow-[0_0_10px_rgba(255,184,0,0.3)]">
                PENDING AUTHORIZATION
              </span>
            </div>
          </div>

          {/* Actionable Sub-tasks */}
          <div className="space-y-2 pt-3 border-t border-senpay-border/60">
            <span className="text-[11px] font-mono font-bold text-senpay-text-primary block">
              Actionable sub-tasks
            </span>

            <div className="space-y-1.5 text-xs font-mono">
              <div className="flex items-center justify-between text-senpay-green">
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={13} />
                  <span>Actionable sub-tasks</span>
                </div>
                <span className="text-[10px] text-senpay-text-muted">»</span>
              </div>

              <div className="flex items-center justify-between text-senpay-cyan">
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={13} />
                  <span>Actionable contronal</span>
                </div>
                <span className="text-[10px] text-senpay-text-muted">»</span>
              </div>

              <div className="flex items-center justify-between text-senpay-text-muted">
                <div className="flex items-center gap-2">
                  <Circle size={13} />
                  <span>Actionable detail</span>
                </div>
                <span className="text-[10px] text-senpay-text-muted">»</span>
              </div>
            </div>
          </div>
        </div>

        {/* ── 2. Interactive Comparison Table (Col 4-8) ── */}
        <div className="lg:col-span-5 senpay-card p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3">
              <span className="text-xs font-mono font-bold text-white tracking-wider uppercase">
                Interactive Comparison
              </span>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead>
                  <tr className="text-[10px] text-senpay-text-muted uppercase border-b border-senpay-border/60">
                    <th className="pb-2 font-normal">Provider</th>
                    <th className="pb-2 font-normal">Status</th>
                    <th className="pb-2 font-normal">Impact</th>
                    <th className="pb-2 font-normal">Est. Cost</th>
                    <th className="pb-2 font-normal text-right">Speed</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-senpay-border/40">
                  {/* Row 1: Ait-Net / SkyLink */}
                  <tr className="group hover:bg-senpay-panel/40 transition-colors">
                    <td className="py-2.5">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded bg-senpay-cyan/20 border border-senpay-cyan/40 text-senpay-cyan flex items-center justify-center font-bold text-[10px]">
                          A
                        </span>
                        <div>
                          <div className="font-bold text-white">Ait-Net Solutions</div>
                          <div className="text-[10px] text-senpay-text-muted">Ait-Net Solutions</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-2.5">
                      <span className="px-2 py-0.5 rounded-full bg-[#0A1A17] border border-senpay-green text-[9px] font-bold text-senpay-green">
                        OPTIMIZED CHOICE
                      </span>
                    </td>
                    <td className="py-2.5 text-white font-bold">50.8%</td>
                    <td className="py-2.5 text-senpay-text-primary">$.95</td>
                    <td className="py-2.5 text-right">
                      <span className="px-1.5 py-0.5 rounded bg-[#0A1A17] border border-senpay-cyan text-[10px] font-bold text-senpay-cyan">
                        92.0
                      </span>
                    </td>
                  </tr>

                  {/* Row 2: Apex Carrier */}
                  <tr className="group hover:bg-senpay-panel/40 transition-colors">
                    <td className="py-2.5">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded bg-senpay-violet/20 border border-senpay-violet/40 text-senpay-violet flex items-center justify-center font-bold text-[10px]">
                          A
                        </span>
                        <div>
                          <div className="font-bold text-white">Apex Carrier</div>
                          <div className="text-[10px] text-senpay-text-muted">Apex Carrier</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-2.5">
                      <span className="px-2 py-0.5 rounded-full bg-[#241026] border border-senpay-violet text-[9px] font-bold text-senpay-violet">
                        OPTIMIZED CHOICE
                      </span>
                    </td>
                    <td className="py-2.5 text-white font-bold">36.9%</td>
                    <td className="py-2.5 text-senpay-text-primary">$.55</td>
                    <td className="py-2.5 text-right">
                      <span className="px-1.5 py-0.5 rounded bg-[#271E0B] border border-senpay-amber text-[10px] font-bold text-senpay-amber">
                        83.0
                      </span>
                    </td>
                  </tr>

                  {/* Row 3: Velo-Fiber */}
                  <tr className="group hover:bg-senpay-panel/40 transition-colors">
                    <td className="py-2.5">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded bg-[#FF3B5C]/20 border border-[#FF3B5C]/40 text-[#FF3B5C] flex items-center justify-center font-bold text-[10px]">
                          V
                        </span>
                        <div>
                          <div className="font-bold text-white">Velo-Fiber</div>
                          <div className="text-[10px] text-senpay-text-muted">Velo-Fiber Badey</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-2.5">
                      <span className="px-2 py-0.5 rounded-full bg-[#0C1D2E] border border-senpay-cyan text-[9px] font-bold text-senpay-cyan">
                        OPTIMIZED CHOICE
                      </span>
                    </td>
                    <td className="py-2.5 text-white font-bold">40.0%</td>
                    <td className="py-2.5 text-senpay-text-primary">$.75</td>
                    <td className="py-2.5 text-right">
                      <span className="px-1.5 py-0.5 rounded bg-[#0A1A17] border border-senpay-green text-[10px] font-bold text-senpay-green">
                        73.0
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* ── 3. Budget Tracker & Authorize CTA (Col 9-12) ── */}
        <div className="lg:col-span-3 senpay-card p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-1">
              <span className="text-xs font-mono font-bold text-white tracking-wider uppercase">
                Budget Tracker
              </span>
              <MoreVertical size={14} className="text-senpay-text-muted" />
            </div>

            <div className="flex items-center justify-between text-[11px] font-mono text-senpay-text-muted mb-3">
              <span>Agent Delegations</span>
              <span className="text-white font-bold">$25,000 max</span>
            </div>

            <div className="text-[10px] font-mono text-senpay-text-muted text-right mb-2">
              Reserved / Remaining
            </div>

            {/* Vertical Multi-bar Chart with Agent Icons */}
            <div className="flex items-end justify-between gap-3 h-28 px-2 pb-2 border-b border-senpay-border/60">
              {/* Bar 1 (Orange/Pink) */}
              <div className="flex flex-col items-center gap-1.5 flex-1">
                <div className="w-full h-24 rounded-t bg-gradient-to-t from-[#FF3B5C] to-[#FFB800] shadow-[0_0_8px_rgba(255,184,0,0.4)]" />
                <div className="w-5 h-5 rounded-full bg-[#271E0B] border border-senpay-amber text-[9px] font-mono flex items-center justify-center text-senpay-amber">
                  👤
                </div>
              </div>

              {/* Bar 2 (Cyan) */}
              <div className="flex flex-col items-center gap-1.5 flex-1">
                <div className="w-full h-18 rounded-t bg-gradient-to-t from-[#00B4D8] to-[#00E5FF] shadow-[0_0_8px_rgba(0,229,255,0.4)]" />
                <div className="w-5 h-5 rounded-full bg-[#0C2433] border border-senpay-cyan text-[9px] font-mono flex items-center justify-center text-senpay-cyan">
                  📄
                </div>
              </div>

              {/* Bar 3 (Violet) */}
              <div className="flex flex-col items-center gap-1.5 flex-1">
                <div className="w-full h-16 rounded-t bg-gradient-to-t from-[#6D28D9] to-[#A855F7] shadow-[0_0_8px_rgba(168,85,247,0.4)]" />
                <div className="w-5 h-5 rounded-full bg-[#241026] border border-senpay-violet text-[9px] font-mono flex items-center justify-center text-senpay-violet">
                  🤖
                </div>
              </div>

              {/* Bar 4 (Green) */}
              <div className="flex flex-col items-center gap-1.5 flex-1">
                <div className="w-full h-14 rounded-t bg-gradient-to-t from-[#059669] to-[#00FF88] shadow-[0_0_8px_rgba(0,255,136,0.4)]" />
                <div className="w-5 h-5 rounded-full bg-[#0A1A17] border border-senpay-green text-[9px] font-mono flex items-center justify-center text-senpay-green">
                  🌐
                </div>
              </div>
            </div>
          </div>

          {/* Luminous Cyan CTA Button */}
          <div className="pt-4">
            <button
              onClick={handleAuthorizeFunds}
              className="w-full py-2.5 px-4 rounded-xl bg-senpay-cyan hover:bg-[#33EAFF] text-[#0B1118] font-mono font-black text-xs tracking-wider uppercase flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(0,229,255,0.7)] transition-all transform active:scale-[0.98]"
            >
              <span>AUTHORIZE FUNDS</span>
              <span className="text-sm font-black">»</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── ML Intelligence & Dataset Provenance Modal ── */}
      {mlModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 overflow-y-auto">
          <div className="relative w-full max-w-4xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden my-8 text-slate-100">
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-slate-800 bg-slate-950/60">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                  <Cpu className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-base flex items-center gap-2">
                    SENPAY ML Architecture &amp; Data Provenance
                    <span className="text-[10px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded">
                      ACTIVE MODEL
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400 font-mono">
                    Model: SENPAY-5G-CRS-v1.0-RF-GB &bull; 96,028 Real Commercial 5G Traces
                  </p>
                </div>
              </div>
              <button
                onClick={() => setMlModalOpen(false)}
                className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-400 hover:text-white transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content Body */}
            <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
              {/* Top Metrics Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 bg-slate-950/70 rounded-xl border border-slate-800">
                  <span className="text-[10px] font-mono text-slate-400 block uppercase">3-Class Accuracy</span>
                  <span className="text-2xl font-black text-emerald-400 font-mono">98.7%</span>
                  <span className="text-[10px] text-slate-500 block">F1 Macro: 97.6%</span>
                </div>
                <div className="p-3 bg-slate-950/70 rounded-xl border border-slate-800">
                  <span className="text-[10px] font-mono text-slate-400 block uppercase">Continuous CRS MAE</span>
                  <span className="text-2xl font-black text-cyan-400 font-mono">0.27</span>
                  <span className="text-[10px] text-slate-500 block">R² Score: 0.999</span>
                </div>
                <div className="p-3 bg-slate-950/70 rounded-xl border border-slate-800">
                  <span className="text-[10px] font-mono text-slate-400 block uppercase">Dataset Size</span>
                  <span className="text-2xl font-black text-white font-mono">96,028</span>
                  <span className="text-[10px] text-slate-500 block">Accepted Clean Rows</span>
                </div>
                <div className="p-3 bg-slate-950/70 rounded-xl border border-slate-800">
                  <span className="text-[10px] font-mono text-slate-400 block uppercase">Top Risk Factor</span>
                  <span className="text-xl font-black text-amber-400 font-mono">RSRQ</span>
                  <span className="text-[10px] text-slate-500 block">35.7% Importance</span>
                </div>
              </div>

              {/* Grid: Provenance & Live Simulator */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Column 1: Provenance & Architecture */}
                <div className="space-y-4">
                  <div className="p-4 bg-slate-950/50 rounded-xl border border-slate-800 space-y-2">
                    <h4 className="text-xs font-bold font-mono text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                      <Database className="w-3.5 h-3.5 text-cyan-400" />
                      Public Dataset Provenance
                    </h4>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      Trained on client-side cellular KPIs collected from a major commercial 5G production network via G-NetTrack Pro.
                    </p>
                    <div className="space-y-1 text-xs font-mono pt-1 text-slate-300">
                      <div><span className="text-slate-500">Source:</span> University College Cork (UCC) MISL</div>
                      <div><span className="text-slate-500">License:</span> GNU GPL-3.0 (Commercial Trace Benchmark)</div>
                      <div><span className="text-slate-500">Normal / Congested / Critical:</span> 29K / 61.6K / 5.4K</div>
                    </div>
                  </div>

                  <div className="p-4 bg-slate-950/50 rounded-xl border border-slate-800 space-y-2">
                    <h4 className="text-xs font-bold font-mono text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                      <BarChart3 className="w-3.5 h-3.5 text-amber-400" />
                      Feature Importance Breakdown
                    </h4>
                    <div className="space-y-2 pt-1">
                      <div>
                        <div className="flex justify-between text-[11px] font-mono mb-0.5">
                          <span>RSRQ (Signal Quality)</span>
                          <span className="text-amber-400">35.7%</span>
                        </div>
                        <div className="w-full bg-slate-800 rounded-full h-1.5">
                          <div className="bg-amber-400 h-1.5 rounded-full" style={{ width: '35.7%' }} />
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between text-[11px] font-mono mb-0.5">
                          <span>SNR (Signal-to-Noise Ratio)</span>
                          <span className="text-cyan-400">32.6%</span>
                        </div>
                        <div className="w-full bg-slate-800 rounded-full h-1.5">
                          <div className="bg-cyan-400 h-1.5 rounded-full" style={{ width: '32.6%' }} />
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between text-[11px] font-mono mb-0.5">
                          <span>DL Bitrate (Throughput)</span>
                          <span className="text-emerald-400">9.4%</span>
                        </div>
                        <div className="w-full bg-slate-800 rounded-full h-1.5">
                          <div className="bg-emerald-400 h-1.5 rounded-full" style={{ width: '9.4%' }} />
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between text-[11px] font-mono mb-0.5">
                          <span>RSRP (Signal Power)</span>
                          <span className="text-slate-400">8.1%</span>
                        </div>
                        <div className="w-full bg-slate-800 rounded-full h-1.5">
                          <div className="bg-slate-500 h-1.5 rounded-full" style={{ width: '8.1%' }} />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Column 2: Interactive Live Inference Simulator */}
                <div className="p-4 bg-slate-950/70 rounded-xl border border-slate-800 space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold font-mono text-white uppercase tracking-wider flex items-center gap-1.5">
                      <Sliders className="w-3.5 h-3.5 text-emerald-400" />
                      Live Telemetry Inference Tester
                    </h4>
                    <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">
                      API: POST /api/ml/predict
                    </span>
                  </div>

                  <form onSubmit={handleRunInference} className="space-y-3">
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <label className="block text-slate-400 font-mono text-[11px] mb-1">RSRP (dBm)</label>
                        <input
                          type="number"
                          step="0.5"
                          value={testRsrp}
                          onChange={(e) => setTestRsrp(e.target.value)}
                          className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded text-xs font-mono text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-400 font-mono text-[11px] mb-1">RSRQ (dB)</label>
                        <input
                          type="number"
                          step="0.5"
                          value={testRsrq}
                          onChange={(e) => setTestRsrq(e.target.value)}
                          className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded text-xs font-mono text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-400 font-mono text-[11px] mb-1">SNR (dB)</label>
                        <input
                          type="number"
                          step="0.5"
                          value={testSnr}
                          onChange={(e) => setTestSnr(e.target.value)}
                          className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded text-xs font-mono text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-400 font-mono text-[11px] mb-1">DL Bitrate (kbps)</label>
                        <input
                          type="number"
                          step="500"
                          value={testDlBitrate}
                          onChange={(e) => setTestDlBitrate(e.target.value)}
                          className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded text-xs font-mono text-white"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={predLoading}
                      className="w-full py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold font-mono text-xs rounded-lg transition flex items-center justify-center gap-1.5 disabled:opacity-50"
                    >
                      {predLoading ? (
                        <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <>
                          <Zap className="w-3.5 h-3.5" />
                          <span>Run ML Model Inference</span>
                        </>
                      )}
                    </button>
                  </form>

                  {/* Prediction Output */}
                  {predResult && (
                    <div className="p-3 bg-slate-900/90 rounded-lg border border-slate-700 space-y-2 text-xs font-mono animate-fadeIn">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">Predicted CRS:</span>
                        <span className={`text-base font-bold ${
                          predResult.predicted_crs >= 75 ? 'text-rose-400' :
                          predResult.predicted_crs >= 50 ? 'text-amber-400' : 'text-emerald-400'
                        }`}>
                          {predResult.predicted_crs} / 100
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">Severity Class:</span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-white">
                          {predResult.congestion_severity}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-400">Confidence:</span>
                        <span className="text-cyan-400">{(predResult.confidence_score * 100).toFixed(1)}%</span>
                      </div>
                      {predResult.contributing_risk_factors?.length > 0 && (
                        <div className="pt-1.5 border-t border-slate-800">
                          <span className="text-[10px] text-slate-400 block mb-1">Risk Factors Detected:</span>
                          <ul className="list-disc list-inside text-[11px] text-amber-300/90 space-y-0.5">
                            {predResult.contributing_risk_factors.map((f, i) => (
                              <li key={i}>{f}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between text-xs font-mono text-slate-400">
              <span>Reproducible pipeline: <code className="text-slate-300">python3 -m app.ml.train</code></span>
              <button
                onClick={() => setMlModalOpen(false)}
                className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
