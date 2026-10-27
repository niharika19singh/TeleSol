// ═══════════════════════════════════════════════════════
// SENPAY Hero Section: Operational Decision Replay
// Research-grounded, credible telecom operations sequence:
// 1. Detect -> 2. Analyze -> 3. Compare -> 4. Authorize -> 5. Verify -> 6. Stable
// ═══════════════════════════════════════════════════════

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  ChevronRight, 
  AlertTriangle, 
  ShieldCheck, 
  Cpu, 
  Wallet, 
  CheckCircle2, 
  TrendingDown, 
  ArrowRight,
  Radio,
  Sliders,
  Sparkles,
  Lock,
  Layers,
  FileCheck2
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

export const STAGES = [
  { id: 'detect', label: '1. Detect', duration: 2400, desc: 'Congestion Threshold Breached' },
  { id: 'analyze', label: '2. Analyze', duration: 2400, desc: 'Radio Link Degradation' },
  { id: 'compare', label: '3. Compare', duration: 3200, desc: 'Intervention Optimizer' },
  { id: 'authorize', label: '4. Authorize', duration: 3200, desc: 'Agent Mandate & Dispatch' },
  { id: 'verify', label: '5. Verify', duration: 2800, desc: 'Counterfactual SLA Check' },
  { id: 'stable', label: '6. Settle', duration: 3500, desc: 'Autonomous Settlement' },
];

export default function HeroOperationsReplay({ onLaunchConsole }) {
  const { isHighContrast } = useTheme();
  const [currentStageIndex, setCurrentStageIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  // Check reduced motion preference
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
      setPrefersReducedMotion(mediaQuery.matches);
      const handler = (e) => setPrefersReducedMotion(e.matches);
      mediaQuery.addEventListener('change', handler);
      return () => mediaQuery.removeEventListener('change', handler);
    }
  }, []);

  // Main Sequence Timer Loop
  useEffect(() => {
    if (!isPlaying) return;

    const currentStage = STAGES[currentStageIndex];
    const timer = setTimeout(() => {
      setCurrentStageIndex((prev) => (prev + 1) % STAGES.length);
    }, currentStage.duration);

    return () => clearTimeout(timer);
  }, [currentStageIndex, isPlaying]);

  // Keyboard navigation (Space to toggle, Left/Right arrows to step)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;
      if (e.code === 'Space') {
        e.preventDefault();
        setIsPlaying((p) => !p);
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        setCurrentStageIndex((p) => (p + 1) % STAGES.length);
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        setCurrentStageIndex((p) => (p - 1 + STAGES.length) % STAGES.length);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const currentStage = STAGES[currentStageIndex];
  const stageId = currentStage.id;

  // Topology node states derived from current stage
  const isIncidentActive = stageId === 'detect' || stageId === 'analyze' || stageId === 'compare';
  const isProcurementActive = stageId === 'authorize';
  const isOutcomeResolved = stageId === 'verify' || stageId === 'stable';

  const vipCrs = isIncidentActive ? 84 : isProcurementActive ? 48 : 22;
  const vipColor = isIncidentActive ? '#FF3B5C' : isProcurementActive ? '#FFB800' : '#00FF88';

  // Fixed Schematic Layout Coordinates (ViewBox 540 x 320)
  const nodes = {
    core: { x: 270, y: 155, id: '5G-MACRO-GW', label: 'Aggregation Hub', tech: 'Core Backhaul' },
    gateA: { x: 100, y: 75, id: 'SEC-A', label: 'Main Entry', tech: '5G-SA', crs: 18, color: '#00FF88' },
    gateB: { x: 440, y: 75, id: 'SEC-B', label: 'East Wing', tech: '5G-SA', crs: 24, color: '#00FF88' },
    gateC: { x: 270, y: 265, id: 'SEC-C', label: 'VIP Corridor', tech: '5G NR Slice', crs: vipCrs, color: vipColor },
    gateD: { x: 100, y: 245, id: 'SEC-D', label: 'South Exit', tech: 'LTE-A', crs: 15, color: '#00FF88' },
    provider: { x: 440, y: 245, id: 'APEX-NET', label: 'On-Demand Slice', tech: 'HSK Provider', crs: null, color: '#00E5FF' },
  };

  return (
    <div className="relative w-full max-w-[620px] rounded-2xl bg-[#0D1520] border border-senpay-border shadow-[0_20px_50px_rgba(0,0,0,0.65)] overflow-hidden font-mono select-none">
      {/* ── 1. Top Operational Replay Header & Stage Track ── */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-2.5 bg-[#0A0F16] border-b border-senpay-border/80 text-xs">
        {/* Left: Replay Status Pill */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-senpay-cyan/15 border border-senpay-cyan/40 text-[10px] text-senpay-cyan font-bold">
            <span className={`w-1.5 h-1.5 rounded-full bg-senpay-cyan ${isPlaying && !prefersReducedMotion ? 'animate-pulse' : ''}`} />
            <span>OPERATIONAL DECISION REPLAY</span>
          </div>
          <span className="text-[10px] text-slate-400 hidden sm:inline">
            Runbook #TEL-2026-VIP
          </span>
        </div>

        {/* Right: Interactive Play / Pause / Replay Controls */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className="p-1 rounded bg-[#131D2A] hover:bg-[#1A283A] text-slate-300 hover:text-white transition"
            title={isPlaying ? 'Pause simulation (Space)' : 'Play simulation (Space)'}
            aria-label={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? <Pause size={12} /> : <Play size={12} />}
          </button>
          <button
            onClick={() => {
              setCurrentStageIndex(0);
              setIsPlaying(true);
            }}
            className="p-1 rounded bg-[#131D2A] hover:bg-[#1A283A] text-slate-300 hover:text-white transition"
            title="Restart sequence from Step 1"
            aria-label="Restart"
          >
            <RotateCcw size={12} />
          </button>
        </div>
      </div>

      {/* ── 2. Sequential Stage Step Indicators ── */}
      <div className="grid grid-cols-6 border-b border-slate-800 text-[10px] bg-[#080D14]">
        {STAGES.map((s, idx) => {
          const isActive = idx === currentStageIndex;
          const isPast = idx < currentStageIndex;
          return (
            <button
              key={s.id}
              onClick={() => {
                setCurrentStageIndex(idx);
                setIsPlaying(false);
              }}
              className={`py-1.5 px-1 text-center transition-all border-b-2 ${
                isActive
                  ? 'border-senpay-cyan bg-senpay-cyan/10 text-white font-bold'
                  : isPast
                  ? 'border-emerald-500/60 text-slate-300 hover:text-white'
                  : 'border-transparent text-slate-500 hover:text-slate-400'
              }`}
            >
              <div className="truncate">{s.label}</div>
            </button>
          );
        })}
      </div>

      {/* ── 3. Visual Stage Canvas: Restrained 2D Schematic Network Topology ── */}
      <div className="relative w-full h-[250px] bg-[#090E16] overflow-hidden">
        {/* Subtle Telecom Grid Pattern */}
        <svg
          className="w-full h-full absolute inset-0"
          viewBox="0 0 540 320"
          preserveAspectRatio="xMidYMid meet"
        >
          <defs>
            <pattern id="heroGridPattern" width="30" height="30" patternUnits="userSpaceOnUse">
              <path d="M 30 0 L 0 0 0 30" fill="none" stroke="#121D2C" strokeWidth="0.8" />
              <circle cx="30" cy="30" r="1" fill="#182738" />
            </pattern>
            <radialGradient id="gwAura" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#00E5FF" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#00E5FF" stopOpacity="0" />
            </radialGradient>
          </defs>

          {/* Grid Background */}
          <rect width="540" height="320" fill="url(#heroGridPattern)" />

          {/* Core Gateway Central Aura */}
          <circle cx={nodes.core.x} cy={nodes.core.y} r="75" fill="url(#gwAura)" />

          {/* ── Physical Backhaul Links ── */}
          {/* Link: Core -> Gate A */}
          <line
            x1={nodes.core.x}
            y1={nodes.core.y}
            x2={nodes.gateA.x}
            y2={nodes.gateA.y}
            stroke="#1D3044"
            strokeWidth="1.6"
            strokeDasharray="4 3"
          />

          {/* Link: Core -> Gate B */}
          <line
            x1={nodes.core.x}
            y1={nodes.core.y}
            x2={nodes.gateB.x}
            y2={nodes.gateB.y}
            stroke="#1D3044"
            strokeWidth="1.6"
            strokeDasharray="4 3"
          />

          {/* Link: Core -> Gate D */}
          <line
            x1={nodes.core.x}
            y1={nodes.core.y}
            x2={nodes.gateD.x}
            y2={nodes.gateD.y}
            stroke="#1D3044"
            strokeWidth="1.6"
            strokeDasharray="4 3"
          />

          {/* ── Highlighted Incident Link: Core -> Gate C (VIP Corridor) ── */}
          <line
            x1={nodes.core.x}
            y1={nodes.core.y}
            x2={nodes.gateC.x}
            y2={nodes.gateC.y}
            stroke={vipColor}
            strokeWidth={isIncidentActive ? 2.8 : 2}
            strokeOpacity={isIncidentActive ? 0.95 : 0.6}
            strokeDasharray={isIncidentActive ? '6 4' : '4 3'}
            className={!prefersReducedMotion && isIncidentActive ? 'animate-pulse' : ''}
          />

          {/* ── Autonomous Slice Link: Gate C -> Apex Provider (Active in Dispatch/Verify) ── */}
          {(isProcurementActive || isOutcomeResolved) && (
            <g>
              <line
                x1={nodes.gateC.x}
                y1={nodes.gateC.y}
                x2={nodes.provider.x}
                y2={nodes.provider.y}
                stroke="#00E5FF"
                strokeWidth="2.2"
                strokeDasharray="5 3"
                strokeOpacity="0.85"
              />
              <text
                x={(nodes.gateC.x + nodes.provider.x) / 2}
                y={(nodes.gateC.y + nodes.provider.y) / 2 - 8}
                textAnchor="middle"
                fill="#00E5FF"
                fontSize="8"
                fontWeight="bold"
              >
                AUTONOMOUS SLICE (10 Gbps)
              </text>
            </g>
          )}

          {/* ── Central Gateway Hub Node ── */}
          <g transform={`translate(${nodes.core.x}, ${nodes.core.y})`}>
            <circle r="22" fill="#0E1622" stroke="#00E5FF" strokeWidth="2" />
            <circle r="12" fill="#00E5FF" fillOpacity="0.15" />
            <text textAnchor="middle" y="3" fill="#00E5FF" fontSize="8.5" fontWeight="bold">
              5G-GW
            </text>
            <text textAnchor="middle" y="33" fill="#94A3B8" fontSize="8">
              5G Macro Core
            </text>
          </g>

          {/* ── Sector Nodes (Gate A, B, D) ── */}
          {[nodes.gateA, nodes.gateB, nodes.gateD].map((n) => (
            <g key={n.id} transform={`translate(${n.x}, ${n.y})`}>
              <circle r="14" fill="#0E1622" stroke="#00FF88" strokeWidth="1.5" />
              <text textAnchor="middle" y="3" fill="#FFFFFF" fontSize="7.5" fontWeight="bold">
                {n.id}
              </text>
              <text textAnchor="middle" y="22" fill="#94A3B8" fontSize="7.5">
                {n.label}
              </text>
            </g>
          ))}

          {/* ── Monitored Incident Sector: Gate C (VIP Corridor) ── */}
          <g transform={`translate(${nodes.gateC.x}, ${nodes.gateC.y})`}>
            {/* Pulsing incident ring */}
            {isIncidentActive && !prefersReducedMotion && (
              <circle
                r="28"
                fill="none"
                stroke="#FF3B5C"
                strokeWidth="1.5"
                opacity="0.4"
                className="animate-ping"
                style={{ animationDuration: '2.5s' }}
              />
            )}
            <circle
              r="18"
              fill="#0E1622"
              stroke={vipColor}
              strokeWidth="2"
              className={isIncidentActive ? 'drop-shadow-[0_0_8px_rgba(255,59,92,0.8)]' : ''}
            />
            <text textAnchor="middle" y="3" fill="#FFFFFF" fontSize="8" fontWeight="bold">
              {nodes.gateC.id}
            </text>
            <text textAnchor="middle" y="27" fill="#FFFFFF" fontSize="8.5" fontWeight="bold">
              {nodes.gateC.label}
            </text>
            <text
              textAnchor="middle"
              y="38"
              fill={vipColor}
              fontSize="8"
              fontWeight="bold"
            >
              CRS: {vipCrs} / 100
            </text>
          </g>

          {/* ── On-Demand Provider Node (Apex Networks) ── */}
          <g transform={`translate(${nodes.provider.x}, ${nodes.provider.y})`}>
            <rect
              x="-26"
              y="-14"
              width="52"
              height="28"
              rx="5"
              fill="#0E1622"
              stroke={isProcurementActive || isOutcomeResolved ? '#00E5FF' : '#22364C'}
              strokeWidth="1.4"
            />
            <text textAnchor="middle" y="3" fill="#00E5FF" fontSize="7.5" fontWeight="bold">
              APEX-5G
            </text>
            <text textAnchor="middle" y="24" fill="#94A3B8" fontSize="7.5">
              Decentralized Slice
            </text>
          </g>
        </svg>

        {/* Floating Context Label in Top Left */}
        <div className="absolute top-2.5 left-3 flex items-center gap-1.5 px-2 py-0.5 rounded bg-[#0A0F16]/90 border border-slate-800 text-[9px] text-slate-400">
          <Radio size={10} className="text-senpay-cyan" />
          <span>Active Target: Gate C (VIP Core)</span>
        </div>
      </div>

      {/* ── 4. Dynamic Operations & Decision Drawer ── */}
      <div className="p-3.5 bg-[#0C121B] border-t border-senpay-border/80 min-h-[145px] text-xs">
        {/* SCENE 1: DETECT */}
        {stageId === 'detect' && (
          <div className="space-y-2 animate-fade-in">
            <div className="flex items-center justify-between pb-1.5 border-b border-slate-800">
              <span className="text-[10px] text-rose-400 font-bold flex items-center gap-1 uppercase">
                <AlertTriangle size={12} />
                <span>Incident Detected • Ingress Bottleneck</span>
              </span>
              <span className="px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-400 text-[9px] font-bold">
                CRITICAL (CRS 84)
              </span>
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-300">
              <span>Affected Node: Gate C (VIP Core Corridor)</span>
              <span className="text-slate-400 font-mono">Trace ID: #INC-2026-VIP</span>
            </div>
            <div className="p-2 rounded bg-[#080D14] border border-rose-500/30 text-[10px] text-slate-300 flex items-center justify-between">
              <span>Provenance: Simulated Event Engine</span>
              <span className="font-bold text-rose-400">Predicted SLA Breach in 4.2 min</span>
            </div>
          </div>
        )}

        {/* SCENE 2: ANALYZE */}
        {stageId === 'analyze' && (
          <div className="space-y-2 animate-fade-in">
            <div className="flex items-center justify-between pb-1.5 border-b border-slate-800">
              <span className="text-[10px] text-amber-400 font-bold flex items-center gap-1 uppercase">
                <Cpu size={12} />
                <span>Radio &amp; Flow Analysis • Buffer Bloat</span>
              </span>
              <span className="text-[10px] text-slate-400">ML Model: RF-GB-v1.0</span>
            </div>
            <div className="grid grid-cols-4 gap-1.5 text-center text-[10px]">
              <div className="p-1 rounded bg-[#080D14] border border-slate-800">
                <div className="text-slate-400">RSRP</div>
                <div className="font-bold text-rose-400">-104 dBm</div>
              </div>
              <div className="p-1 rounded bg-[#080D14] border border-slate-800">
                <div className="text-slate-400">Loss</div>
                <div className="font-bold text-rose-400">14.2%</div>
              </div>
              <div className="p-1 rounded bg-[#080D14] border border-slate-800">
                <div className="text-slate-400">Latency</div>
                <div className="font-bold text-amber-400">142 ms</div>
              </div>
              <div className="p-1 rounded bg-[#080D14] border border-slate-800">
                <div className="text-slate-400">Density</div>
                <div className="font-bold text-slate-200">4.8 ppl/m²</div>
              </div>
            </div>
            <p className="text-[10px] text-slate-400">
              Downlink capacity exhausted. Intervention optimizer triggered automatically.
            </p>
          </div>
        )}

        {/* SCENE 3: COMPARE INTERVENTIONS */}
        {stageId === 'compare' && (
          <div className="space-y-2 animate-fade-in">
            <div className="flex items-center justify-between pb-1 border-b border-slate-800">
              <span className="text-[10px] text-senpay-cyan font-bold flex items-center gap-1 uppercase">
                <Sparkles size={12} />
                <span>Intervention Options Evaluated</span>
              </span>
              <span className="text-[10px] text-slate-400">3 Candidates</span>
            </div>
            <div className="space-y-1 text-[10px]">
              <div className="flex items-center justify-between p-1 rounded bg-[#080D14] text-slate-400 opacity-60">
                <span>1. Do Nothing</span>
                <span>CRS 84 • $0 Cost • 94% Breach Risk</span>
              </div>
              <div className="flex items-center justify-between p-1 rounded bg-[#080D14] text-slate-400 opacity-70">
                <span>2. Local Traffic Shaping</span>
                <span>CRS 58 • $0 Cost • Moderate Mitigation</span>
              </div>
              <div className="flex items-center justify-between p-1.5 rounded bg-senpay-cyan/15 border border-senpay-cyan/50 text-white font-bold">
                <span className="text-senpay-cyan">3. Autonomous 5G Slice (Apex)</span>
                <span className="text-emerald-400">CRS 22 • 12.50 HSK • 96% Conf</span>
              </div>
            </div>
          </div>
        )}

        {/* SCENE 4: AUTHORIZE & DISPATCH */}
        {stageId === 'authorize' && (
          <div className="space-y-2 animate-fade-in">
            <div className="flex items-center justify-between pb-1.5 border-b border-slate-800">
              <span className="text-[10px] text-amber-400 font-bold flex items-center gap-1 uppercase">
                <Wallet size={12} />
                <span>Procurement &amp; Policy Validation</span>
              </span>
              <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 text-[9px] font-bold">
                MANDATE SIGNED
              </span>
            </div>
            <div className="space-y-1 text-[10px] text-slate-300">
              <div className="flex justify-between">
                <span className="text-slate-400">Delegation:</span>
                <span className="font-bold text-white">del_sentinel_telecom_001 (50 HSK Limit)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Atomic Budget Authorization:</span>
                <span className="font-bold text-senpay-cyan">12.50 HSK (Reserved in Escrow)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">HSP Dispatch:</span>
                <span className="text-emerald-400 font-bold">Submitting slice route to Apex Net...</span>
              </div>
            </div>
          </div>
        )}

        {/* SCENE 5: VERIFY OUTCOME */}
        {stageId === 'verify' && (
          <div className="space-y-2 animate-fade-in">
            <div className="flex items-center justify-between pb-1.5 border-b border-slate-800">
              <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-1 uppercase">
                <CheckCircle2 size={12} />
                <span>Counterfactual SLA Outcome Verification</span>
              </span>
              <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-[9px] font-bold">
                SLA RESTORED
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-[10px]">
              <div className="p-1.5 rounded bg-[#080D14] border border-slate-800">
                <span className="text-slate-400 block">Baseline (No Action):</span>
                <span className="font-bold text-rose-400">CRS 84 (Critical Congestion)</span>
              </div>
              <div className="p-1.5 rounded bg-[#080D14] border border-emerald-500/40">
                <span className="text-slate-400 block">Observed Outcome:</span>
                <span className="font-bold text-emerald-400">CRS 22 (-73.8% Reduction)</span>
              </div>
            </div>
            <p className="text-[10px] text-slate-300">
              Mitigation verified successfully. Escrow settlement unlocked.
            </p>
          </div>
        )}

        {/* SCENE 6: STABLE OPERATIONAL STATE */}
        {stageId === 'stable' && (
          <div className="space-y-2.5 animate-fade-in">
            <div className="flex items-center justify-between pb-1.5 border-b border-slate-800">
              <span className="text-[10px] text-senpay-cyan font-bold flex items-center gap-1 uppercase">
                <FileCheck2 size={12} />
                <span>Autonomous Lifecycle Complete</span>
              </span>
              <span className="px-1.5 py-0.5 rounded bg-senpay-cyan/20 text-senpay-cyan text-[9px] font-bold">
                SETTLED ON HSK
              </span>
            </div>
            <div className="flex items-center justify-between text-[10px] text-slate-300">
              <span>Receipt: <strong className="text-white">RCPT-HSK-133-VIP</strong></span>
              <span className="text-emerald-400 font-bold">12.50 HSK Transferred</span>
            </div>
            <div className="flex items-center gap-2 pt-1">
              <button
                onClick={() => onLaunchConsole('command_center')}
                className="flex-1 py-1 px-2.5 rounded bg-senpay-cyan hover:bg-cyan-300 text-slate-950 font-bold text-[10px] transition text-center"
              >
                Inspect Live Console →
              </button>
              <button
                onClick={() => {
                  setCurrentStageIndex(0);
                  setIsPlaying(true);
                }}
                className="py-1 px-2.5 rounded bg-[#131D2A] hover:bg-[#1A283A] text-slate-300 font-medium text-[10px] transition"
              >
                Replay Cycle ↺
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── 5. Bottom Progress Scrubber ── */}
      <div className="h-1 bg-[#090D14] w-full overflow-hidden">
        <div
          className="h-full bg-senpay-cyan transition-all duration-300"
          style={{ width: `${((currentStageIndex + 1) / STAGES.length) * 100}%` }}
        />
      </div>
    </div>
  );
}
