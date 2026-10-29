// ═══════════════════════════════════════════════════════
// SENPAY — Telecom Intervention Optimizer & What-If Engine
// Operational NOC Simulation for Dynamic 5G Slicing & Transit
// ═══════════════════════════════════════════════════════

import { useState } from 'react';
import {
  Play, Pause, RotateCcw, Gauge, Zap, Timer, Radio,
  Activity, ArrowRight, ShieldCheck, ShieldAlert, Cpu,
  Layers, Signal, Server, CheckCircle2, TrendingDown, RefreshCw
} from 'lucide-react';
import GlassCard from '../shared/GlassCard';
import RiskBadge from '../shared/RiskBadge';
import CrowdMap from '../map/CrowdMap';
import AlertFeed from '../alerts/AlertFeed';
import { getRiskLevel } from '../../data/mockData';

function TelecomSliderControl({ icon: Icon, label, sublabel, value, min, max, step, unit, onChange, color = 'cyan' }) {
  const percentage = Math.min(100, Math.max(0, ((value - min) / (max - min)) * 100));
  const colorMap = {
    cyan: 'text-cyan-500 dark:text-cyan-400',
    warning: 'text-amber-500 dark:text-amber-400',
    red: 'text-rose-500 dark:text-rose-400',
    emerald: 'text-emerald-500 dark:text-emerald-400'
  };

  const barColor = color === 'cyan' ? '#00E5FF' : color === 'warning' ? '#FFB800' : color === 'emerald' ? '#10B981' : '#FF3366';

  return (
    <div className="space-y-1.5 p-3 rounded-lg bg-slate-50 dark:bg-[#07090D]/60 border border-slate-200 dark:border-[#232F3D]/80">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1 rounded bg-slate-200/50 dark:bg-white/[0.04]">
            <Icon size={14} className={colorMap[color]} />
          </div>
          <div>
            <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 block">{label}</span>
            {sublabel && <span className="text-[10px] text-slate-500 dark:text-slate-400">{sublabel}</span>}
          </div>
        </div>
        <span className={`text-sm font-mono font-bold ${colorMap[color]}`}>
          {typeof value === 'number' ? (Number.isInteger(value) ? value : value.toFixed(1)) : value}{unit}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full accent-cyan-500 cursor-pointer"
        style={{
          background: `linear-gradient(to right, ${barColor} 0%, ${barColor} ${percentage}%, rgba(100,116,139,0.2) ${percentage}%, rgba(100,116,139,0.2) 100%)`,
        }}
      />
      <div className="flex justify-between text-[10px] font-mono text-slate-500 dark:text-slate-400">
        <span>Min: {min}{unit}</span>
        <span>Max: {max}{unit}</span>
      </div>
    </div>
  );
}

export default function SimulationPage({
  zones, alerts, params, updateParam, isRunning, setIsRunning,
  speed, setSpeed, simTime, resetSimulation, kpis
}) {
  const [selectedMitigation, setSelectedMitigation] = useState('skylink_5g');
  const [allocatedBandwidth, setAllocatedBandwidth] = useState(10); // Gbps

  const formatSimTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Mitigation options
  const mitigations = [
    {
      id: 'skylink_5g',
      name: 'SkyLink 5G Dedicated Slice',
      provider: 'prov_telecom_01',
      cost: '12.50 HSK',
      latency: '14ms',
      lossReduction: '-94%',
      riskDelta: '-71.8%',
      reliability: '99.999%',
      status: 'RECOMMENDED'
    },
    {
      id: 'apex_optical',
      name: 'Apex Optical Direct Transit',
      provider: 'prov_telecom_02',
      cost: '18.00 HSK',
      latency: '9ms',
      lossReduction: '-98%',
      riskDelta: '-76.2%',
      reliability: '99.999%',
      status: 'PREMIUM'
    },
    {
      id: 'metrowave_pop',
      name: 'MetroWave Micro-POP Offload',
      provider: 'prov_telecom_03',
      cost: '8.25 HSK',
      latency: '22ms',
      lossReduction: '-85%',
      riskDelta: '-62.0%',
      reliability: '99.99%',
      status: 'BUDGET'
    }
  ];

  const currentMitigation = mitigations.find(m => m.id === selectedMitigation) || mitigations[0];

  // Derived telecom metrics based on simulation params
  // crowdDensity (0-10) -> PRB Load (0-100%)
  const prbLoadPercent = Math.min(100, (params.crowdDensity || 5) * 10);
  // entryRate (0-500) -> Ingress load (100-2500 Mbps)
  const ingressThroughput = Math.round(100 + ((params.entryRate || 100) / 500) * 2400);
  // exitBlockage (0-100) -> Backhaul link degradation (0-50%)
  const backhaulDegradation = Math.round(((params.exitBlockage || 0) / 100) * 50);

  return (
    <div className="space-y-4 animate-fade-in-up">
      {/* ── TOP OPERATIONAL INCIDENT FLIGHT-STRIP (#INC-2026-8812) ── */}
      <div className="telecom-op-strip p-3.5 rounded-xl border border-slate-200 dark:border-[#232F3D] bg-white dark:bg-[#0F141B] shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 font-mono font-bold uppercase tracking-wider text-[11px]">
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
              ACTIVE INCIDENT: #INC-2026-8812
            </span>
            <div className="hidden sm:block">
              <span className="font-semibold text-slate-800 dark:text-slate-200">Sector C (Gate C - VIP Corridor, BS-WEST-02)</span>
              <span className="text-slate-500 dark:text-slate-400 ml-2 font-mono text-[11px]">Path: GW-CORE-01 → BS-WEST-02 → SEC-VIP-C1</span>
            </div>
          </div>

          <div className="flex items-center gap-4 text-slate-600 dark:text-slate-300 font-mono text-[11px]">
            <div className="flex items-center gap-1.5">
              <span className="text-slate-500 dark:text-slate-400">Baseline CRS:</span>
              <span className="font-bold text-rose-500">78.0 / 100</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-slate-500 dark:text-slate-400">Packet Loss:</span>
              <span className="font-bold text-rose-500">14.2%</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-slate-500 dark:text-slate-400">RTT:</span>
              <span className="font-bold text-amber-500">142 ms</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-slate-500 dark:text-slate-400">Intervention Mode:</span>
              <span className="font-bold text-cyan-600 dark:text-cyan-400">Autonomous 5G Slicing</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── SIMULATION BANNER & CONTROL TOOLBAR ── */}
      <div className="bg-gradient-to-r from-cyan-500/10 via-slate-100 dark:via-[#141B24] to-cyan-500/10 border border-slate-200 dark:border-[#232F3D] rounded-xl px-5 py-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center">
              <Radio size={20} className="text-cyan-600 dark:text-cyan-400" />
            </div>
            <div>
              <h3 className="text-sm font-bold font-display text-slate-900 dark:text-slate-100 flex items-center gap-2">
                Telecom Intervention Optimizer & What-If Engine
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-500/15 border border-cyan-500/30 text-cyan-600 dark:text-cyan-400 font-semibold">
                  ML-DRIVEN DRY-RUN
                </span>
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Adjust 5G physical radio parameters, simulate backhaul degradation, and forecast counterfactual SLA outcomes
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Simulation Timer */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white dark:bg-[#07090D] border border-slate-200 dark:border-[#232F3D]">
              <Timer size={12} className="text-slate-500 dark:text-slate-400" />
              <span className="font-mono text-xs text-slate-800 dark:text-slate-200 font-bold">{formatSimTime(simTime)}</span>
            </div>

            {/* Speed Multiplier */}
            <div className="flex items-center gap-0.5 bg-white dark:bg-[#07090D] rounded-lg p-0.5 border border-slate-200 dark:border-[#232F3D]">
              {[1, 2, 5].map(s => (
                <button
                  key={s}
                  onClick={() => setSpeed(s)}
                  className={`px-2.5 py-1 rounded-md text-xs font-mono font-medium transition-all ${
                    speed === s
                      ? 'bg-cyan-500/20 text-cyan-600 dark:text-cyan-400 font-bold'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  {s}x
                </button>
              ))}
            </div>

            {/* Play/Pause */}
            <button
              onClick={() => setIsRunning(!isRunning)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-mono font-bold transition-all shadow-sm ${
                isRunning
                  ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 hover:bg-amber-500/25'
                  : 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/25'
              }`}
            >
              {isRunning ? <><Pause size={14} /> Pause Simulator</> : <><Play size={14} /> Run Simulator</>}
            </button>

            {/* Reset */}
            <button
              onClick={resetSimulation}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-mono font-medium text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-[#232F3D] hover:bg-slate-100 dark:hover:bg-white/[0.04] transition-all"
            >
              <RotateCcw size={14} /> Reset
            </button>
          </div>
        </div>
      </div>

      {/* ── MAIN CONTENT GRID ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left Column: Radio Parameters & What-If Sliders (4 cols) */}
        <div className="lg:col-span-4 space-y-4">
          <GlassCard className="p-4 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-[#232F3D] pb-2">
              <h4 className="text-xs font-bold font-mono text-slate-900 dark:text-slate-100 uppercase tracking-wider flex items-center gap-2">
                <Cpu size={14} className="text-cyan-600 dark:text-cyan-400" />
                Physical Radio Parameters
              </h4>
              <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400">Layer 1/2 Telemetry</span>
            </div>

            <div className="space-y-3">
              <TelecomSliderControl
                icon={Radio}
                label="PRB Resource Congestion"
                sublabel="Physical Resource Block utilization on gNB"
                value={params.crowdDensity}
                min={0}
                max={10}
                step={0.1}
                unit=" PRB/10"
                onChange={(v) => updateParam('crowdDensity', v)}
                color={params.crowdDensity > 7 ? 'red' : params.crowdDensity > 4 ? 'warning' : 'cyan'}
              />

              <TelecomSliderControl
                icon={Activity}
                label="Ingress Throughput Load"
                sublabel="Active traffic stream ingress rate"
                value={params.entryRate}
                min={0}
                max={500}
                step={10}
                unit=" Mbps-eq"
                onChange={(v) => updateParam('entryRate', v)}
                color="warning"
              />

              <TelecomSliderControl
                icon={Signal}
                label="Backhaul Link Degradation"
                sublabel="Simulated optical link attenuation / jitter"
                value={params.exitBlockage}
                min={0}
                max={100}
                step={5}
                unit="%"
                onChange={(v) => updateParam('exitBlockage', v)}
                color="red"
              />
            </div>
          </GlassCard>

          {/* Counterfactual Mitigation Selection */}
          <GlassCard className="p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-[#232F3D] pb-2">
              <h4 className="text-xs font-bold font-mono text-slate-900 dark:text-slate-100 uppercase tracking-wider flex items-center gap-2">
                <Zap size={14} className="text-amber-500" />
                Select Intervention Route
              </h4>
              <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400">PayPilot Catalog</span>
            </div>

            <div className="space-y-2">
              {mitigations.map((m) => (
                <div
                  key={m.id}
                  onClick={() => setSelectedMitigation(m.id)}
                  className={`p-2.5 rounded-lg border cursor-pointer transition-all ${
                    selectedMitigation === m.id
                      ? 'bg-cyan-500/10 border-cyan-500/50 shadow-sm'
                      : 'bg-slate-50 dark:bg-[#07090D]/50 border-slate-200 dark:border-[#232F3D] hover:border-slate-300 dark:hover:border-slate-600'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-xs text-slate-900 dark:text-slate-100">{m.name}</span>
                    <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded ${
                      m.status === 'RECOMMENDED' ? 'bg-cyan-500/20 text-cyan-600 dark:text-cyan-400' :
                      m.status === 'PREMIUM' ? 'bg-purple-500/20 text-purple-600 dark:text-purple-400' :
                      'bg-slate-500/20 text-slate-600 dark:text-slate-400'
                    }`}>
                      {m.status}
                    </span>
                  </div>
                  <div className="flex items-center justify-between mt-1 text-[11px] font-mono text-slate-500 dark:text-slate-400">
                    <span>Cost: <strong className="text-slate-800 dark:text-slate-200">{m.cost}</strong></span>
                    <span>Loss: <strong className="text-emerald-500">{m.lossReduction}</strong></span>
                    <span>Risk: <strong className="text-emerald-500">{m.riskDelta}</strong></span>
                  </div>
                </div>
              ))}
            </div>
          </GlassCard>

          {/* Sector Risk Matrix */}
          <GlassCard className="p-4 space-y-2">
            <h4 className="text-xs font-bold font-mono text-slate-900 dark:text-slate-100 uppercase tracking-wider mb-2">
              Sector Telemetry State
            </h4>
            <div className="space-y-2">
              {zones.map(z => {
                const risk = getRiskLevel(z.riskScore);
                const telecomSectorName = z.id === 'zone-c' ? 'Sector C — VIP Corridor (Target)' :
                                          z.id === 'zone-a' ? 'Sector A — North Plaza Cell' :
                                          z.id === 'zone-b' ? 'Sector B — East Concourse Cell' :
                                          `Sector ${z.id.replace('zone-', '').toUpperCase()} — Core Transit`;
                return (
                  <div key={z.id} className="flex items-center justify-between p-2 rounded bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-[#232F3D]/50 text-xs">
                    <div className="flex items-center gap-2 truncate">
                      <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: risk.color }} />
                      <span className="text-slate-700 dark:text-slate-300 truncate font-medium text-[11px]">
                        {telecomSectorName}
                      </span>
                    </div>
                    <span className="font-mono text-xs font-bold ml-2" style={{ color: risk.color }}>
                      {z.riskScore} CRS
                    </span>
                  </div>
                );
              })}
            </div>
          </GlassCard>
        </div>

        {/* Center: Digital Twin Topology Map (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="rounded-xl overflow-hidden border border-slate-200 dark:border-[#232F3D] bg-white dark:bg-[#0F141B] shadow-sm">
            <div className="p-3 border-b border-slate-200 dark:border-[#232F3D] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Layers size={14} className="text-cyan-600 dark:text-cyan-400" />
                <span className="text-xs font-bold font-mono text-slate-900 dark:text-slate-100 uppercase tracking-wider">
                  Digital Twin Topology View
                </span>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold border border-emerald-500/20">
                LIVE INTERPOLATION
              </span>
            </div>
            <CrowdMap zones={zones} height={520} />
          </div>

          {/* Quick Counterfactual Impact Summary Card */}
          <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-500/10 via-slate-50 dark:via-[#141B24] to-cyan-500/10 border border-emerald-500/30 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
                <ShieldCheck size={16} />
                Projected Counterfactual SLA Outcome
              </span>
              <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400">
                via {currentMitigation.name}
              </span>
            </div>

            <div className="grid grid-cols-4 gap-2 font-mono text-center">
              <div className="p-2 rounded bg-white dark:bg-[#07090D] border border-slate-200 dark:border-[#232F3D]">
                <span className="text-[10px] text-slate-500 dark:text-slate-400 block">CRS Risk</span>
                <span className="text-sm font-bold text-emerald-500">{currentMitigation.riskDelta}</span>
                <span className="text-[9px] text-slate-400 block">78 → 22</span>
              </div>
              <div className="p-2 rounded bg-white dark:bg-[#07090D] border border-slate-200 dark:border-[#232F3D]">
                <span className="text-[10px] text-slate-500 dark:text-slate-400 block">Packet Loss</span>
                <span className="text-sm font-bold text-emerald-500">{currentMitigation.lossReduction}</span>
                <span className="text-[9px] text-slate-400 block">14.2% → 0.8%</span>
              </div>
              <div className="p-2 rounded bg-white dark:bg-[#07090D] border border-slate-200 dark:border-[#232F3D]">
                <span className="text-[10px] text-slate-500 dark:text-slate-400 block">Latency</span>
                <span className="text-sm font-bold text-cyan-500">{currentMitigation.latency}</span>
                <span className="text-[9px] text-slate-400 block">142ms → 14ms</span>
              </div>
              <div className="p-2 rounded bg-white dark:bg-[#07090D] border border-slate-200 dark:border-[#232F3D]">
                <span className="text-[10px] text-slate-500 dark:text-slate-400 block">SLA Safety</span>
                <span className="text-sm font-bold text-emerald-500">{currentMitigation.reliability}</span>
                <span className="text-[9px] text-slate-400 block">Deterministic</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: KPIs & Live Alert Feed (3 cols) */}
        <div className="lg:col-span-3 space-y-4">
          {/* Quick Telecom KPIs */}
          <div className="grid grid-cols-2 gap-3">
            <GlassCard className="!p-3 text-center">
              <p className="text-[10px] text-slate-500 dark:text-slate-400 font-mono uppercase">Network Avg CRS</p>
              <div className="flex justify-center mt-2">
                <RiskBadge score={kpis.avgRiskScore} size={50} showLabel={false} />
              </div>
              <p className="text-[10px] font-mono text-slate-500 dark:text-slate-400 mt-1">Cross-Sector Mean</p>
            </GlassCard>

            <GlassCard className="!p-3 text-center">
              <p className="text-[10px] text-slate-500 dark:text-slate-400 font-mono uppercase">Peak PRB Load</p>
              <p className={`text-xl font-bold font-mono mt-3 ${
                prbLoadPercent > 80 ? 'text-rose-500' : prbLoadPercent > 50 ? 'text-amber-500' : 'text-emerald-500'
              }`}>
                {prbLoadPercent.toFixed(1)}%
              </p>
              <p className="text-[10px] font-mono text-slate-500 dark:text-slate-400 mt-1">Radio Resource Block</p>
            </GlassCard>
          </div>

          {/* Autonomous PayPilot Action Preview */}
          <GlassCard className="p-4 space-y-2.5">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-[#232F3D] pb-2">
              <span className="text-xs font-mono font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                <Server size={13} className="text-cyan-500" />
                Autonomous Escrow Lock
              </span>
              <span className="text-[10px] font-mono text-emerald-500 font-bold">READY</span>
            </div>
            <div className="space-y-1.5 text-xs font-mono">
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">Target Provider:</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">{currentMitigation.provider}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">Escrow Amount:</span>
                <span className="font-bold text-cyan-500">{currentMitigation.cost}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">Settlement Chain:</span>
                <span className="text-slate-700 dark:text-slate-300">HashKey Testnet (133)</span>
              </div>
            </div>
            <button
              onClick={() => alert(`Pre-authorized escrow for ${currentMitigation.name} (${currentMitigation.cost}) locked in dry-run mode.`)}
              className="w-full mt-2 py-2 px-3 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-mono text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-sm"
            >
              <CheckCircle2 size={14} />
              Simulate Escrow Lock
            </button>
          </GlassCard>

          {/* Simulation Alerts */}
          <div style={{ height: 350 }}>
            <AlertFeed
              alerts={alerts}
              compact
              maxItems={8}
              title="Simulator Event Stream"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
