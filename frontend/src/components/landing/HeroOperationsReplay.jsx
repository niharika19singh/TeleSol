// ═══════════════════════════════════════════════════════
// SENPAY Hero Section: Operational Decision Replay
// Truthful, research-grounded telecom operations sequence:
// 1. Detect -> 2. Analyze -> 3. Compare -> 4. Authorize -> 5. Verify -> 6. Settle
// ═══════════════════════════════════════════════════════

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  ChevronRight, 
  ChevronLeft,
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
  FileCheck2,
  Info
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

// ── Centralized Deterministic Scenario Fixture ──
// All metrics are mathematically derived from SENPAY's backend models:
// - Incident in zone-c (VIP Corridor) from virtual_sentinel.py (sudden_surge scenario)
// - Telemetry QoS formulas from intervention_optimizer.py
// - Delegation del_sentinel_telecom_001 from db.py & delegation_service.py
// - HashKey HSP Demo Gateway Adapter execution from hsp_service.py
export const HERO_DEMO_SCENARIO = {
  scenarioId: 'runbook_vip_corridor_0881',
  runbookLabel: 'RUNBOOK #TEL-2026-VIP',
  modeLabel: 'DEMO REPLAY (AUTONOMOUS TELECOM RUNBOOK)',
  provenance: {
    eventSource: 'SIMULATION_ENGINE',
    engineName: 'TeleSol Sentinel Simulation Engine',
    networkSector: 'Campus Operational Grid (Gate C VIP Core)',
    telecomAdapter: 'HSP Gateway (Demo Adapter / HSK Testnet 133)',
  },
  incident: {
    id: 'INC-2026-VIP-0881',
    zoneId: 'zone-c',
    zoneName: 'Gate C — VIP Corridor',
    initialCrs: 84,
    status: 'CRITICAL',
    triggerThreshold: 65,
    timeToBreachMinutes: 4.2,
  },
  telemetry: {
    rsrpDbm: -104,
    packetLossPct: 14.2,
    latencyMs: 142,
    densityPplM2: 4.8,
    flowInstabilityPct: 78,
    mlModel: 'RF-GB-v1.0 (RandomForest & GradientBoosting)',
    inferenceConfidence: 0.96,
  },
  interventions: [
    {
      id: 'opt_1',
      title: '1. Do Nothing (Passive)',
      type: 'PASSIVE_MONITORING',
      predictedCrs: 84,
      costHsk: '0.00',
      slaRisk: '94% SLA Breach Risk',
      isSelected: false,
    },
    {
      id: 'opt_2',
      title: '2. Local Traffic Shaping',
      type: 'QOS_TRAFFIC_SHAPING',
      predictedCrs: 58,
      costHsk: '0.00',
      slaRisk: 'Moderate Mitigation (Warning)',
      isSelected: false,
    },
    {
      id: 'opt_3',
      title: '3. Autonomous 5G Slice (Apex)',
      type: 'DYNAMIC_SLICE_ALLOCATION',
      provider: 'SkyLink Dynamic 5G Slicing',
      predictedCrs: 22,
      crsUncertainty: '±3.2',
      costHsk: '12.50',
      confidencePct: 96,
      slaRisk: 'SLA Protected (< 35 CRS)',
      isSelected: true,
    },
  ],
  procurement: {
    delegationId: 'del_sentinel_telecom_001',
    delegationPoolLimitHsk: 150.0,
    perTxLimitHsk: 30.0,
    policyId: 'policy_telecom_standard',
    authorizedAmountHsk: '12.50',
    asset: 'HSK',
    networkId: 133,
    steps: [
      { key: 'policy', label: '1. Policy Check', status: 'PASSED', detail: 'Amount 12.50 <= 30.0 HSK tx limit' },
      { key: 'budget', label: '2. Budget Escrow', status: 'RESERVED', detail: '12.50 of 150.0 HSK pool reserved' },
      { key: 'wallet', label: '3. Agent Signature', status: 'AUTHORIZED', detail: 'EIP-712 Cart Mandate signed' },
      { key: 'dispatch', label: '4. HSP Gateway', status: 'SUBMITTED', detail: 'Dispatched to HSK Testnet router' },
    ],
  },
  outcome: {
    counterfactualBaselineCrs: 84,
    observedPostCrs: 22,
    reductionPct: 73.8,
    targetThreshold: 35,
    isSlaRestored: true,
    evaluationType: 'Counterfactual Digital Twin SLA Match',
  },
  settlement: {
    receiptId: 'RCPT-HSK-133-VIP',
    networkName: 'HashKey Chain Testnet (Chain ID: 133)',
    txHash: '0x8f2a49b10c73d9e83b4f6a7d18c9e0f2b3a4c5d6e7f8a9b0c1d2e3f4a5b6c7d8',
    adapterType: 'HSP Demo Gateway Adapter (Simulated Settlement)',
    settlementState: 'payment-finalized',
    isSimulatedAdapter: true,
  },
};

export const STAGES = [
  { id: 'detect', label: '1. Detect', duration: 2500, desc: 'Congestion Threshold Breached' },
  { id: 'analyze', label: '2. Analyze', duration: 2500, desc: 'Radio Link Degradation' },
  { id: 'compare', label: '3. Compare', duration: 3300, desc: 'Intervention Optimizer' },
  { id: 'authorize', label: '4. Authorize', duration: 3300, desc: 'Agent Mandate & Dispatch' },
  { id: 'verify', label: '5. Verify', duration: 2800, desc: 'Counterfactual SLA Check' },
  { id: 'stable', label: '6. Settle', duration: 3600, desc: 'Autonomous Settlement' },
];

export default function HeroOperationsReplay({ onLaunchConsole }) {
  const { isHighContrast, isLight } = useTheme();
  const [currentStageIndex, setCurrentStageIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [motionDisabledByUser, setMotionDisabledByUser] = useState(false);

  // Check reduced motion preference from system media query
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
      setPrefersReducedMotion(mediaQuery.matches);
      const handler = (e) => setPrefersReducedMotion(e.matches);
      mediaQuery.addEventListener('change', handler);
      return () => mediaQuery.removeEventListener('change', handler);
    }
  }, []);

  const isMotionSuppressed = prefersReducedMotion || motionDisabledByUser;

  // Main Sequence Timer Loop with explicit cleanup
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
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT' || e.target.tagName === 'TEXTAREA') return;
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
  const data = HERO_DEMO_SCENARIO;

  // Topology node states derived strictly from current stage
  const isIncidentActive = stageId === 'detect' || stageId === 'analyze' || stageId === 'compare';
  const isProcurementActive = stageId === 'authorize';
  const isOutcomeResolved = stageId === 'verify' || stageId === 'stable';

  const vipCrs = isIncidentActive ? data.incident.initialCrs : isProcurementActive ? 48 : data.outcome.observedPostCrs;
  const vipColor = isIncidentActive ? '#FF3B5C' : isProcurementActive ? '#FFB800' : '#00FF88';

  // Fixed Schematic Layout Coordinates (ViewBox 540 x 300)
  const nodes = {
    core: { x: 270, y: 145, id: '5G-MACRO-GW', label: 'Aggregation Hub', tech: 'Core Backhaul' },
    gateA: { x: 100, y: 70, id: 'SEC-A', label: 'Main Entry', tech: '5G-SA', crs: 18, color: '#00FF88' },
    gateB: { x: 440, y: 70, id: 'SEC-B', label: 'East Wing', tech: '5G-SA', crs: 24, color: '#00FF88' },
    gateC: { x: 270, y: 245, id: 'SEC-C', label: data.incident.zoneName, tech: '5G NR Slice', crs: vipCrs, color: vipColor },
    gateD: { x: 100, y: 230, id: 'SEC-D', label: 'South Exit', tech: 'LTE-A', crs: 15, color: '#00FF88' },
    provider: { x: 440, y: 230, id: 'APEX-NET', label: 'On-Demand Slice', tech: 'HSK Provider', crs: null, color: '#00E5FF' },
  };

  return (
    <div 
      className="relative w-full max-w-[620px] rounded-2xl bg-senpay-card border border-senpay-border shadow-2xl overflow-hidden font-mono select-none text-senpay-text-primary"
      role="region"
      aria-label="Interactive Autonomous Telecom Procurement Decision Replay"
    >
      {/* ── 1. Top Operational Replay Header ── */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-2.5 bg-senpay-panel border-b border-senpay-border text-xs">
        {/* Left: Replay Status Pill */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-senpay-cyan/15 border border-senpay-cyan/40 text-[10px] text-senpay-cyan font-bold">
            <span className={`w-1.5 h-1.5 rounded-full bg-senpay-cyan ${isPlaying && !isMotionSuppressed ? 'animate-pulse' : ''}`} />
            <span>OPERATIONAL DECISION REPLAY</span>
          </div>
          <span className="text-[10px] text-senpay-text-muted hidden sm:inline">
            {data.runbookLabel}
          </span>
        </div>

        {/* Right: Controls (Play/Pause, Step Back, Step Forward, Restart) */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => setCurrentStageIndex((p) => (p - 1 + STAGES.length) % STAGES.length)}
            className="p-1 rounded bg-senpay-elevated hover:bg-senpay-card border border-senpay-border/60 text-senpay-text-secondary hover:text-senpay-text-primary transition focus-visible:ring-1 focus-visible:ring-senpay-cyan"
            title="Step back to previous stage (Left Arrow)"
            aria-label="Previous Stage"
          >
            <ChevronLeft size={13} />
          </button>
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className="p-1 px-1.5 rounded bg-senpay-elevated hover:bg-senpay-card border border-senpay-border/60 text-senpay-text-secondary hover:text-senpay-text-primary transition flex items-center gap-1 focus-visible:ring-1 focus-visible:ring-senpay-cyan"
            title={isPlaying ? 'Pause simulation (Space)' : 'Play simulation (Space)'}
            aria-label={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? <Pause size={12} /> : <Play size={12} />}
            <span className="text-[9px] font-bold">{isPlaying ? 'PAUSE' : 'PLAY'}</span>
          </button>
          <button
            onClick={() => setCurrentStageIndex((p) => (p + 1) % STAGES.length)}
            className="p-1 rounded bg-senpay-elevated hover:bg-senpay-card border border-senpay-border/60 text-senpay-text-secondary hover:text-senpay-text-primary transition focus-visible:ring-1 focus-visible:ring-senpay-cyan"
            title="Step forward to next stage (Right Arrow)"
            aria-label="Next Stage"
          >
            <ChevronRight size={13} />
          </button>
          <button
            onClick={() => {
              setCurrentStageIndex(0);
              setIsPlaying(true);
            }}
            className="p-1 rounded bg-senpay-elevated hover:bg-senpay-card border border-senpay-border/60 text-senpay-text-secondary hover:text-senpay-text-primary transition focus-visible:ring-1 focus-visible:ring-senpay-cyan"
            title="Restart sequence from Step 1"
            aria-label="Restart"
          >
            <RotateCcw size={12} />
          </button>
        </div>
      </div>

      {/* ── 2. Sequential Stage Step Indicators ── */}
      <div className="grid grid-cols-6 border-b border-senpay-border text-[9px] sm:text-[10px] bg-senpay-panel">
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
              className={`py-1.5 px-0.5 text-center transition-all border-b-2 focus-visible:outline-none focus-visible:bg-senpay-elevated ${
                isActive
                  ? 'border-senpay-cyan bg-senpay-cyan/15 text-senpay-cyan font-bold'
                  : isPast
                  ? 'border-emerald-500/60 text-senpay-text-secondary hover:text-senpay-text-primary'
                  : 'border-transparent text-senpay-text-muted hover:text-senpay-text-secondary'
              }`}
              title={`Jump to ${s.label}: ${s.desc}`}
            >
              <div className="truncate">{s.label}</div>
            </button>
          );
        })}
      </div>

      {/* ── 3. Visual Stage Canvas: Restrained 2D Schematic Network Topology ── */}
      <div className="relative w-full h-[235px] sm:h-[245px] bg-senpay-panel/40 overflow-hidden">
        <svg
          className="w-full h-full absolute inset-0"
          viewBox="0 0 540 300"
          preserveAspectRatio="xMidYMid meet"
        >
          <defs>
            <pattern id="heroGridPattern" width="30" height="30" patternUnits="userSpaceOnUse">
              <path d="M 30 0 L 0 0 0 30" fill="none" stroke={isLight ? '#CBD5E1' : '#121D2C'} strokeWidth="0.8" />
              <circle cx="30" cy="30" r="1" fill={isLight ? '#94A3B8' : '#182738'} />
            </pattern>
            <radialGradient id="gwAura" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#00E5FF" stopOpacity={0.2} />
              <stop offset="100%" stopColor="#00E5FF" stopOpacity={0} />
            </radialGradient>
          </defs>

          {/* Grid Background */}
          <rect width="540" height="300" fill="url(#heroGridPattern)" />

          {/* Core Gateway Central Aura */}
          <circle cx={nodes.core.x} cy={nodes.core.y} r="70" fill="url(#gwAura)" />

          {/* ── Normal Backhaul Links: Core -> Gate A, B, D ── */}
          <line
            x1={nodes.core.x}
            y1={nodes.core.y}
            x2={nodes.gateA.x}
            y2={nodes.gateA.y}
            stroke={isLight ? '#CBD5E1' : '#1D3044'}
            strokeWidth="1.6"
            strokeDasharray="4 3"
          />
          <line
            x1={nodes.core.x}
            y1={nodes.core.y}
            x2={nodes.gateB.x}
            y2={nodes.gateB.y}
            stroke={isLight ? '#CBD5E1' : '#1D3044'}
            strokeWidth="1.6"
            strokeDasharray="4 3"
          />
          <line
            x1={nodes.core.x}
            y1={nodes.core.y}
            x2={nodes.gateD.x}
            y2={nodes.gateD.y}
            stroke={isLight ? '#CBD5E1' : '#1D3044'}
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
            className={!isMotionSuppressed && isIncidentActive ? 'animate-pulse' : ''}
          />

          {/* ── Autonomous Slice Link: Gate C -> Apex Provider (Active in Dispatch/Verify) ── */}
          {(isProcurementActive || isOutcomeResolved) && (
            <g>
              <line
                x1={nodes.gateC.x}
                y1={nodes.gateC.y}
                x2={nodes.provider.x}
                y2={nodes.provider.y}
                stroke={isLight ? '#007F95' : '#00E5FF'}
                strokeWidth="2.2"
                strokeDasharray="5 3"
                strokeOpacity="0.85"
              />
              <text
                x={(nodes.gateC.x + nodes.provider.x) / 2}
                y={(nodes.gateC.y + nodes.provider.y) / 2 - 8}
                textAnchor="middle"
                fill={isLight ? '#007F95' : '#00E5FF'}
                fontSize="8"
                fontWeight="bold"
              >
                AUTONOMOUS SLICE (10 Gbps)
              </text>
            </g>
          )}

          {/* ── Central Gateway Hub Node ── */}
          <g transform={`translate(${nodes.core.x}, ${nodes.core.y})`}>
            <circle r="22" fill={isLight ? '#FFFFFF' : '#0E1622'} stroke={isLight ? '#007F95' : '#00E5FF'} strokeWidth="2" />
            <circle r="12" fill={isLight ? '#007F95' : '#00E5FF'} fillOpacity="0.15" />
            <text textAnchor="middle" y="3" fill={isLight ? '#007F95' : '#00E5FF'} fontSize="8.5" fontWeight="bold">
              5G-GW
            </text>
            <text textAnchor="middle" y="32" fill={isLight ? '#526171' : '#94A3B8'} fontSize="8">
              5G Macro Core
            </text>
          </g>

          {/* ── Sector Nodes (Gate A, B, D) ── */}
          {[nodes.gateA, nodes.gateB, nodes.gateD].map((n) => (
            <g key={n.id} transform={`translate(${n.x}, ${n.y})`}>
              <circle r="14" fill={isLight ? '#FFFFFF' : '#0E1622'} stroke={isLight ? '#16794B' : '#00FF88'} strokeWidth="1.5" />
              <text textAnchor="middle" y="3" fill={isLight ? '#17212B' : '#FFFFFF'} fontSize="7.5" fontWeight="bold">
                {n.id}
              </text>
              <text textAnchor="middle" y="22" fill={isLight ? '#526171' : '#94A3B8'} fontSize="7.5">
                {n.label}
              </text>
            </g>
          ))}

          {/* ── Monitored Incident Sector: Gate C (VIP Corridor) ── */}
          <g transform={`translate(${nodes.gateC.x}, ${nodes.gateC.y})`}>
            {/* Pulsing incident ring */}
            {isIncidentActive && !isMotionSuppressed && (
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
              fill={isLight ? '#FFFFFF' : '#0E1622'}
              stroke={vipColor}
              strokeWidth="2"
              className={isIncidentActive ? 'drop-shadow-[0_0_8px_rgba(255,59,92,0.8)]' : ''}
            />
            <text textAnchor="middle" y="3" fill={isLight ? '#17212B' : '#FFFFFF'} fontSize="8" fontWeight="bold">
              {nodes.gateC.id}
            </text>
            <text textAnchor="middle" y="27" fill={isLight ? '#17212B' : '#FFFFFF'} fontSize="8.5" fontWeight="bold">
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
              fill={isLight ? '#FFFFFF' : '#0E1622'}
              stroke={isProcurementActive || isOutcomeResolved ? (isLight ? '#007F95' : '#00E5FF') : (isLight ? '#CBD5E1' : '#22364C')}
              strokeWidth="1.4"
            />
            <text textAnchor="middle" y="3" fill={isLight ? '#007F95' : '#00E5FF'} fontSize="7.5" fontWeight="bold">
              APEX-5G
            </text>
            <text textAnchor="middle" y="24" fill={isLight ? '#526171' : '#94A3B8'} fontSize="7.5">
              Decentralized Slice
            </text>
          </g>
        </svg>

        {/* Floating Context Label in Top Left */}
        <div className="absolute top-2.5 left-3 flex items-center gap-1.5 px-2 py-0.5 rounded bg-senpay-panel/90 border border-senpay-border text-[9px] text-senpay-text-secondary">
          <Radio size={10} className="text-senpay-cyan" />
          <span>Active Target: {data.incident.zoneName}</span>
        </div>
      </div>

      {/* ── 4. Dynamic Operations & Decision Drawer ── */}
      <div 
        className="p-3.5 bg-senpay-panel border-t border-senpay-border min-h-[155px] text-xs"
        aria-live="polite"
      >
        {/* SCENE 1: DETECT */}
        {stageId === 'detect' && (
          <div className="space-y-2 animate-fade-in">
            <div className="flex items-center justify-between pb-1.5 border-b border-senpay-border">
              <span className="text-[10px] text-senpay-rose font-bold flex items-center gap-1 uppercase">
                <AlertTriangle size={12} />
                <span>Incident Detected • Ingress Congestion Spike</span>
              </span>
              <span className="px-1.5 py-0.5 rounded bg-senpay-rose/20 text-senpay-rose text-[9px] font-bold">
                CRITICAL (CRS {data.incident.initialCrs} &gt; {data.incident.triggerThreshold})
              </span>
            </div>
            <div className="flex items-center justify-between text-[11px] text-senpay-text-secondary">
              <span>Target: {data.incident.zoneName} ({data.incident.zoneId})</span>
              <span className="text-senpay-text-muted font-mono">Trace ID: #{data.incident.id}</span>
            </div>
            <div className="p-2 rounded bg-senpay-card border border-senpay-rose/30 text-[10px] text-senpay-text-secondary flex items-center justify-between">
              <span>Data Source: {data.provenance.engineName} (Simulated Scenario)</span>
              <span className="font-bold text-senpay-rose">Breach Horizon: {data.incident.timeToBreachMinutes} min</span>
            </div>
          </div>
        )}

        {/* SCENE 2: ANALYZE */}
        {stageId === 'analyze' && (
          <div className="space-y-2 animate-fade-in">
            <div className="flex items-center justify-between pb-1.5 border-b border-senpay-border">
              <span className="text-[10px] text-senpay-amber font-bold flex items-center gap-1 uppercase">
                <Cpu size={12} />
                <span>Radio Link &amp; Flow Analysis • Buffer Bloat</span>
              </span>
              <span className="text-[10px] text-senpay-text-muted">{data.telemetry.mlModel}</span>
            </div>
            <div className="grid grid-cols-4 gap-1.5 text-center text-[10px]">
              <div className="p-1 rounded bg-senpay-card border border-senpay-border">
                <div className="text-senpay-text-muted">RSRP (Radio)</div>
                <div className="font-bold text-senpay-rose">{data.telemetry.rsrpDbm} dBm</div>
              </div>
              <div className="p-1 rounded bg-senpay-card border border-senpay-border">
                <div className="text-senpay-text-muted">Packet Loss</div>
                <div className="font-bold text-senpay-rose">{data.telemetry.packetLossPct}%</div>
              </div>
              <div className="p-1 rounded bg-senpay-card border border-senpay-border">
                <div className="text-senpay-text-muted">Queue Latency</div>
                <div className="font-bold text-senpay-amber">{data.telemetry.latencyMs} ms</div>
              </div>
              <div className="p-1 rounded bg-senpay-card border border-senpay-border">
                <div className="text-senpay-text-muted">Crowd Density</div>
                <div className="font-bold text-senpay-text-primary">{data.telemetry.densityPplM2} ppl/m²</div>
              </div>
            </div>
            <div className="flex justify-between items-center text-[10px] text-senpay-text-muted pt-0.5">
              <span>Provenance: Derived via Digital Twin QoS Models</span>
              <span className="text-senpay-cyan font-semibold">{(data.telemetry.inferenceConfidence * 100).toFixed(0)}% Model Confidence</span>
            </div>
          </div>
        )}

        {/* SCENE 3: COMPARE INTERVENTIONS */}
        {stageId === 'compare' && (
          <div className="space-y-2 animate-fade-in">
            <div className="flex items-center justify-between pb-1 border-b border-senpay-border">
              <span className="text-[10px] text-senpay-cyan font-bold flex items-center gap-1 uppercase">
                <Sparkles size={12} />
                <span>Intervention Options Evaluated (Multi-Attribute Scoring)</span>
              </span>
              <span className="text-[10px] text-senpay-text-muted">3 Candidates Evaluated</span>
            </div>
            <div className="space-y-1 text-[10px]">
              {data.interventions.map((opt) => (
                <div
                  key={opt.id}
                  className={`flex items-center justify-between p-1.5 rounded transition ${
                    opt.isSelected
                      ? 'bg-senpay-cyan/15 border border-senpay-cyan/50 text-senpay-text-primary font-bold'
                      : 'bg-senpay-card text-senpay-text-muted opacity-60 border border-transparent'
                  }`}
                >
                  <span className={opt.isSelected ? 'text-senpay-cyan' : ''}>
                    {opt.title}
                  </span>
                  <span className={opt.isSelected ? 'text-senpay-green font-mono' : 'font-mono'}>
                    Predicted CRS: {opt.predictedCrs} {opt.crsUncertainty ? `(${opt.crsUncertainty})` : ''} • {opt.costHsk} HSK • {opt.slaRisk}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* SCENE 4: AUTHORIZE & DISPATCH */}
        {stageId === 'authorize' && (
          <div className="space-y-2 animate-fade-in">
            <div className="flex items-center justify-between pb-1 border-b border-senpay-border">
              <span className="text-[10px] text-senpay-amber font-bold flex items-center gap-1 uppercase">
                <Wallet size={12} />
                <span>Procurement Lifecycle • Mandate Authorization</span>
              </span>
              <span className="px-1.5 py-0.5 rounded bg-senpay-amber/20 text-senpay-amber text-[9px] font-bold">
                BUDGET RESERVED IN ESCROW
              </span>
            </div>
            <div className="grid grid-cols-2 gap-1.5 text-[10px] text-senpay-text-secondary">
              {data.procurement.steps.map((st) => (
                <div key={st.key} className="p-1 rounded bg-senpay-card border border-senpay-border">
                  <div className="flex justify-between items-center">
                    <span className="text-senpay-text-muted font-semibold">{st.label}:</span>
                    <span className="text-senpay-green font-bold text-[9px]">{st.status}</span>
                  </div>
                  <div className="text-[9px] text-senpay-text-primary truncate mt-0.5">{st.detail}</div>
                </div>
              ))}
            </div>
            <div className="text-[9px] text-senpay-text-muted pt-0.5 flex justify-between">
              <span>Delegation: {data.procurement.delegationId}</span>
              <span>Amount: {data.procurement.authorizedAmountHsk} {data.procurement.asset}</span>
            </div>
          </div>
        )}

        {/* SCENE 5: VERIFY OUTCOME */}
        {stageId === 'verify' && (
          <div className="space-y-2 animate-fade-in">
            <div className="flex items-center justify-between pb-1.5 border-b border-senpay-border">
              <span className="text-[10px] text-senpay-green font-bold flex items-center gap-1 uppercase">
                <CheckCircle2 size={12} />
                <span>Counterfactual SLA Outcome Verification</span>
              </span>
              <span className="px-1.5 py-0.5 rounded bg-senpay-green/20 text-senpay-green text-[9px] font-bold">
                SLA RESTORED (CRS {data.outcome.observedPostCrs} &lt; {data.outcome.targetThreshold})
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-[10px]">
              <div className="p-1.5 rounded bg-senpay-card border border-senpay-border">
                <span className="text-senpay-text-muted block">Counterfactual Baseline (No Action):</span>
                <span className="font-bold text-senpay-rose">CRS {data.outcome.counterfactualBaselineCrs} (Critical Congestion)</span>
              </div>
              <div className="p-1.5 rounded bg-senpay-card border border-senpay-green/40">
                <span className="text-senpay-text-muted block">Observed Outcome Post-Mitigation:</span>
                <span className="font-bold text-senpay-green">CRS {data.outcome.observedPostCrs} (-{data.outcome.reductionPct}% Reduction)</span>
              </div>
            </div>
            <div className="text-[9px] text-senpay-text-muted pt-0.5 flex justify-between">
              <span>Method: {data.outcome.evaluationType}</span>
              <span className="text-senpay-green font-bold">Escrow Settlement Condition: SATISFIED</span>
            </div>
          </div>
        )}

        {/* SCENE 6: STABLE OPERATIONAL STATE */}
        {stageId === 'stable' && (
          <div className="space-y-2 animate-fade-in">
            <div className="flex items-center justify-between pb-1 border-b border-senpay-border">
              <span className="text-[10px] text-senpay-cyan font-bold flex items-center gap-1 uppercase">
                <FileCheck2 size={12} />
                <span>Autonomous Procurement Lifecycle Complete</span>
              </span>
              <span className="px-1.5 py-0.5 rounded bg-senpay-cyan/20 text-senpay-cyan text-[9px] font-bold">
                SETTLED ON HSK TESTNET
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-[10px] text-senpay-text-secondary">
              <div className="p-1.5 rounded bg-senpay-card border border-senpay-border">
                <span className="text-senpay-text-muted block">Settlement Receipt:</span>
                <span className="font-bold text-senpay-text-primary">{data.settlement.receiptId}</span>
              </div>
              <div className="p-1.5 rounded bg-senpay-card border border-senpay-border">
                <span className="text-senpay-text-muted block">Settled Amount:</span>
                <span className="font-bold text-senpay-green">{data.procurement.authorizedAmountHsk} {data.procurement.asset}</span>
              </div>
            </div>
            <div className="text-[9px] text-senpay-text-muted flex items-center justify-between">
              <span className="truncate">Adapter: {data.settlement.adapterType}</span>
              <span className="text-senpay-text-muted">Tx: 0x8f2a...c4e1</span>
            </div>
            <div className="flex items-center gap-2 pt-1">
              <button
                onClick={() => onLaunchConsole('command_center')}
                className={`flex-1 py-1.5 px-3 rounded-lg bg-senpay-cyan hover:opacity-90 ${isLight ? 'text-white' : 'text-black'} font-bold text-[10px] transition text-center focus-visible:ring-1 focus-visible:ring-senpay-cyan shadow-sm`}
              >
                Inspect Live Console →
              </button>
              <button
                onClick={() => {
                  setCurrentStageIndex(0);
                  setIsPlaying(true);
                }}
                className="py-1.5 px-3 rounded-lg bg-senpay-elevated hover:bg-senpay-card text-senpay-text-secondary hover:text-senpay-text-primary border border-senpay-border font-medium text-[10px] transition focus-visible:ring-1 focus-visible:ring-senpay-cyan"
              >
                Replay Runbook ↺
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── 5. Interactive Bottom Scrubber Track ── */}
      <div 
        className="h-1.5 bg-senpay-panel w-full flex cursor-pointer border-t border-senpay-border"
        title="Interactive progress track: click any section to scrub"
        onClick={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const clickX = e.clientX - rect.left;
          const ratio = Math.max(0, Math.min(1, clickX / rect.width));
          const targetIndex = Math.min(STAGES.length - 1, Math.floor(ratio * STAGES.length));
          setCurrentStageIndex(targetIndex);
          setIsPlaying(false);
        }}
      >
        {STAGES.map((s, idx) => (
          <div
            key={s.id}
            className={`flex-1 h-full transition-all duration-300 ${
              idx <= currentStageIndex ? 'bg-senpay-cyan' : 'bg-senpay-border/60'
            }`}
          />
        ))}
      </div>
    </div>
  );
}
