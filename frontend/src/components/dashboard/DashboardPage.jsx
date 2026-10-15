// ═══════════════════════════════════════════════════════
// TeleSol Sentinel — Command Center Dashboard
// Full hardware-free command room with simulation controls,
// multi-zone heatmap, AI predictions, and TinyFish Web Agent
// ═══════════════════════════════════════════════════════

import { useState, useMemo } from 'react';
import {
  MapPin, ShieldAlert, Users, Gauge, TrendingUp, Brain, Clock,
  Play, Pause, RotateCcw, Zap, Globe, ExternalLink, Search,
  AlertTriangle, CheckCircle2, Radio, Layers, Activity, ShieldCheck
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import KPICard from '../shared/KPICard';
import RiskBadge from '../shared/RiskBadge';
import GlassCard from '../shared/GlassCard';
import CrowdMap from '../map/CrowdMap';
import AlertFeed from '../alerts/AlertFeed';
import SensorInsights from '../sensors/SensorInsights';
import { riskOverTime, getRiskLevel } from '../../data/mockData';

const SCENARIOS = [
  { id: 'normal', label: 'Normal Flow', color: '#00FF88', desc: 'Baseline steady crowd movement' },
  { id: 'congestion', label: 'Congestion', color: '#FFB800', desc: 'Peak arrival flow across gates' },
  { id: 'sudden_surge', label: 'Sudden Surge', color: '#FF8C00', desc: 'Rapid flash-crowd influx' },
  { id: 'blocked_exit', label: 'Blocked Exit', color: '#FF3B5C', desc: 'Severe exit constriction at Gate C/F' },
];

export default function DashboardPage({
  zones = [],
  alerts = [],
  kpis = {},
  sentinel = null,
  aiForecast = null,
  tinyfish = null,
  timeline = [],
  onControlSentinel,
  onTriggerTinyFish,
}) {
  const [selectedZone, setSelectedZone] = useState(null);
  const [investigatingZone, setInvestigatingZone] = useState('zone-c');
  const [investigationReason, setInvestigationReason] = useState('Elevated density and corridor bottleneck');
  const [isSubmittingInv, setIsSubmittingInv] = useState(false);

  // Active scenario from sentinel or default to normal
  const currentScenario = sentinel?.scenario || 'normal';
  const isRunning = sentinel?.isRunning ?? true;
  const speed = sentinel?.speed ?? 1.0;
  const simTime = sentinel?.simTime ?? 0;

  // Format elapsed simulation time
  const formatTime = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Risk trend for chart
  const chartData = useMemo(() => riskOverTime.map(d => ({
    time: d.time,
    risk: Math.round(d.value),
  })), []);

  const avgRisk = kpis.avgRiskScore || 0;
  const riskTrendColor = avgRisk > 65 ? '#FF3B5C' : avgRisk > 40 ? '#FFB800' : '#00FF88';

  // AI model forecast data
  const forecastList = aiForecast?.forecast5min?.length > 0 ? aiForecast.forecast5min : [
    { time: 'Now', avgRisk: avgRisk, peakZone: 'Gate C', peakRisk: Math.min(100, avgRisk + 15) },
    { time: '+1m', avgRisk: Math.min(100, avgRisk + 3), peakZone: 'Gate C', peakRisk: Math.min(100, avgRisk + 18) },
    { time: '+2m', avgRisk: Math.min(100, avgRisk + 6), peakZone: 'Gate C', peakRisk: Math.min(100, avgRisk + 22) },
    { time: '+3m', avgRisk: Math.min(100, avgRisk + 8), peakZone: 'Gate B', peakRisk: Math.min(100, avgRisk + 20) },
    { time: '+4m', avgRisk: Math.min(100, avgRisk + 5), peakZone: 'Gate B', peakRisk: Math.min(100, avgRisk + 15) },
    { time: '+5m', avgRisk: Math.min(100, avgRisk + 2), peakZone: 'Gate B', peakRisk: Math.min(100, avgRisk + 10) },
  ];

  const aiConfidence = aiForecast?.confidence || 89.2;
  const aiModelName = aiForecast?.modelName || 'CrowdPredict v3.5';
  const aiModelType = aiForecast?.modelType || 'Statistical ML Regressor & Rules Fallback';

  // TinyFish active or recent investigation
  const activeInv = tinyfish?.activeInvestigation;
  const isTinyFishLive = activeInv?.sourceType === 'live_tinyfish';

  const handleScenarioChange = (scenarioId) => {
    onControlSentinel?.({ scenario: scenarioId });
  };

  const handlePlayPause = () => {
    onControlSentinel?.({ action: isRunning ? 'pause' : 'start' });
  };

  const handleReset = () => {
    onControlSentinel?.({ action: 'reset' });
  };

  const handleSpeedChange = (newSpeed) => {
    onControlSentinel?.({ speed: newSpeed });
  };

  const handleManualInvestigate = async () => {
    if (!onTriggerTinyFish) return;
    setIsSubmittingInv(true);
    try {
      await onTriggerTinyFish(investigatingZone, investigationReason);
    } finally {
      setTimeout(() => setIsSubmittingInv(false), 800);
    }
  };

  return (
    <div className="space-y-4 animate-fade-in-up">

      {/* ── TOP: Sentinel Simulation Control Bar ── */}
      <GlassCard className="border-crowd-cyan/20 bg-gradient-to-r from-crowd-surface/90 via-crowd-surface/80 to-crowd-surface/90">
        <div className="flex flex-wrap items-center justify-between gap-3">
          
          {/* Left: Simulation State & Controls */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 bg-black/40 px-3 py-1.5 rounded-lg border border-crowd-border">
              <button
                onClick={handlePlayPause}
                title={isRunning ? 'Pause Simulation' : 'Start Simulation'}
                className="p-1 rounded hover:bg-white/10 text-crowd-cyan transition-colors"
              >
                {isRunning ? <Pause size={16} /> : <Play size={16} />}
              </button>
              <button
                onClick={handleReset}
                title="Reset Simulation"
                className="p-1 rounded hover:bg-white/10 text-crowd-text-muted hover:text-crowd-text-primary transition-colors"
              >
                <RotateCcw size={16} />
              </button>
              <span className="text-[10px] font-mono font-bold text-crowd-text-secondary ml-1">
                {formatTime(simTime)}
              </span>
            </div>

            {/* Speed Selector */}
            <div className="flex items-center bg-black/40 rounded-lg p-0.5 border border-crowd-border text-[10px] font-mono">
              {[1, 2, 5].map((s) => (
                <button
                  key={s}
                  onClick={() => handleSpeedChange(s)}
                  className={`px-2 py-1 rounded transition-all ${
                    speed === s ? 'bg-crowd-cyan/20 text-crowd-cyan font-bold' : 'text-crowd-text-muted hover:text-white'
                  }`}
                >
                  {s}x
                </button>
              ))}
            </div>

            <div className="hidden sm:flex items-center gap-2 pl-2 border-l border-crowd-border">
              <span className="relative flex h-2 w-2">
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isRunning ? 'bg-crowd-safe' : 'bg-crowd-warning'}`} />
                <span className={`relative inline-flex rounded-full h-2 w-2 ${isRunning ? 'bg-crowd-safe' : 'bg-crowd-warning'}`} />
              </span>
              <span className="text-xs font-semibold text-crowd-text-primary">
                Hardware-Free Sentinel
              </span>
              <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-crowd-cyan/10 text-crowd-cyan border border-crowd-cyan/30">
                ACTIVE
              </span>
            </div>
          </div>

          {/* Right: Scenario Switcher */}
          <div className="flex items-center gap-1.5 overflow-x-auto">
            <span className="text-[11px] text-crowd-text-muted font-medium mr-1 hidden md:inline">
              Scenario:
            </span>
            {SCENARIOS.map((sc) => {
              const isSelected = currentScenario === sc.id;
              return (
                <button
                  key={sc.id}
                  onClick={() => handleScenarioChange(sc.id)}
                  title={sc.desc}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all flex items-center gap-1.5 border ${
                    isSelected
                      ? 'border-opacity-60 shadow-lg'
                      : 'border-transparent text-crowd-text-muted hover:text-crowd-text-secondary hover:bg-white/[0.04]'
                  }`}
                  style={{
                    backgroundColor: isSelected ? `${sc.color}18` : 'transparent',
                    borderColor: isSelected ? sc.color : 'transparent',
                    color: isSelected ? sc.color : undefined,
                  }}
                >
                  <span
                    className="w-1.5 h-1.5 rounded-full"
                    style={{ backgroundColor: sc.color }}
                  />
                  <span>{sc.label}</span>
                </button>
              );
            })}
          </div>

        </div>
      </GlassCard>

      {/* ── KPI Row ── */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <KPICard
          icon={MapPin}
          label="Active Zones"
          value={kpis.activeZones || zones.length}
          color="cyan"
          trend="stable"
        />
        <KPICard
          icon={Gauge}
          label="Avg Risk Score"
          value={kpis.avgRiskScore}
          unit="/100"
          color={kpis.avgRiskScore > 65 ? 'red' : kpis.avgRiskScore > 40 ? 'warning' : 'green'}
          trend={kpis.avgRiskScore > 50 ? 'up' : 'stable'}
        />
        <KPICard
          icon={ShieldAlert}
          label="Critical Alerts"
          value={kpis.highRiskAlerts}
          color={kpis.highRiskAlerts > 0 ? 'red' : 'green'}
          trend={kpis.highRiskAlerts > 2 ? 'up' : 'stable'}
        />
        <KPICard
          icon={Users}
          label="Peak Density"
          value={(kpis.peakDensity || 0).toFixed(1)}
          unit="ppl/m²"
          color={kpis.peakDensity > 6 ? 'red' : kpis.peakDensity > 4 ? 'warning' : 'green'}
          trend={kpis.peakDensity > 5 ? 'up' : 'down'}
        />
        <KPICard
          icon={Layers}
          label="Venue Occupancy"
          value={sentinel?.venue?.occupancyPct ? `${sentinel.venue.occupancyPct}%` : '42%'}
          unit={sentinel?.venue?.totalOccupancy ? `${sentinel.venue.totalOccupancy} ppl` : ''}
          color={sentinel?.venue?.occupancyPct > 75 ? 'red' : sentinel?.venue?.occupancyPct > 50 ? 'warning' : 'green'}
          trend="stable"
        />
      </div>

      {/* ── Multi-Zone Venue Heatmap & Occupancy Strip ── */}
      <GlassCard>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Layers size={14} className="text-crowd-cyan" />
            <h3 className="text-xs font-semibold text-crowd-text-primary">Venue Zones Heatmap & Occupancy</h3>
          </div>
          <span className="text-[10px] text-crowd-text-muted font-mono">
            {zones.length} Monitored Sectors • IIIT-Delhi Campus Venue
          </span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
          {zones.map((z) => {
            const riskLvl = getRiskLevel(z.riskScore);
            const occPct = Math.min(100, Math.round(((z.occupancy || (z.density * 30)) / (z.capacity || 200)) * 100));
            const isSelected = selectedZone?.id === z.id;
            return (
              <div
                key={z.id}
                onClick={() => setSelectedZone(isSelected ? null : z)}
                className={`p-2.5 rounded-lg border transition-all cursor-pointer ${
                  isSelected ? 'border-crowd-cyan bg-crowd-cyan/10' : 'border-crowd-border/40 bg-crowd-bg/40 hover:border-crowd-border'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] font-bold text-crowd-text-primary truncate">
                    {z.name.split('—')[0].trim()}
                  </span>
                  <span
                    className="text-[9px] font-mono px-1 rounded font-bold"
                    style={{ backgroundColor: `${riskLvl.color}20`, color: riskLvl.color }}
                  >
                    {z.riskScore}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[10px] text-crowd-text-muted mb-1.5">
                  <span>{z.density.toFixed(1)} ppl/m²</span>
                  <span>{occPct}% cap</span>
                </div>
                {/* Capacity Meter Bar */}
                <div className="h-1.5 rounded-full bg-crowd-border/60 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${occPct}%`, backgroundColor: riskLvl.color }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </GlassCard>

      {/* ── Main Grid: Map + Alerts Feed ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Map (2/3) */}
        <div className="lg:col-span-2">
          <CrowdMap
            zones={zones}
            selectedZone={selectedZone}
            onSelectZone={setSelectedZone}
            height={420}
          />
        </div>

        {/* Alerts Feed (1/3) */}
        <div className="lg:col-span-1" style={{ height: 420 }}>
          <AlertFeed alerts={alerts} compact maxItems={15} />
        </div>
      </div>

      {/* ── TinyFish Web Agent & AI Predictions Row ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* TinyFish Live Web Intelligence Card (2/3 width) */}
        <GlassCard className="lg:col-span-2 border-crowd-cyan/30 flex flex-col justify-between">
          <div>
            {/* Header with TinyFish Badge */}
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3 pb-2 border-b border-crowd-border/40">
              <div className="flex items-center gap-2">
                <Globe size={16} className="text-crowd-cyan" />
                <h3 className="text-xs font-bold text-crowd-text-primary tracking-wide">
                  TinyFish Web Agent Intelligence
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className="text-[10px] font-mono px-2 py-0.5 rounded font-bold flex items-center gap-1.5"
                  style={{
                    backgroundColor: isTinyFishLive ? 'rgba(0,212,255,0.15)' : 'rgba(168,85,247,0.15)',
                    color: isTinyFishLive ? '#00D4FF' : '#A855F7',
                    border: `1px solid ${isTinyFishLive ? 'rgba(0,212,255,0.3)' : 'rgba(168,85,247,0.3)'}`,
                  }}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${isTinyFishLive ? 'bg-crowd-cyan animate-pulse' : 'bg-crowd-purple'}`} />
                  {isTinyFishLive ? 'TinyFish Live Web Evidence' : 'TinyFish Fallback (Set TINYFISH_API_KEY)'}
                </span>
                <span className="text-[10px] text-crowd-text-muted font-mono">
                  Status: <strong className="text-crowd-safe">{activeInv?.status?.toUpperCase() || 'IDLE'}</strong>
                </span>
              </div>
            </div>

            {/* Findings & Context */}
            {activeInv ? (
              <div className="space-y-3">
                <div className="bg-black/30 p-2.5 rounded-lg border border-crowd-border/50">
                  <div className="flex items-center justify-between text-[11px] font-mono text-crowd-text-muted mb-1">
                    <span>Target: <strong className="text-white">{activeInv.zoneName}</strong></span>
                    <span>Query: {activeInv.query}</span>
                  </div>
                  <p className="text-xs text-crowd-text-secondary leading-relaxed">
                    {activeInv.findings}
                  </p>
                </div>

                {/* Sources & Citations */}
                <div>
                  <h4 className="text-[10px] uppercase font-bold text-crowd-text-muted mb-1.5 tracking-wider">
                    Verified Web Sources & Citations
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {activeInv.sources?.map((s, idx) => (
                      <a
                        key={idx}
                        href={s.url}
                        target="_blank"
                        rel="noreferrer"
                        className="p-2 rounded bg-crowd-bg/50 border border-crowd-border/40 hover:border-crowd-cyan/50 transition-colors block group"
                      >
                        <div className="flex items-center justify-between text-[11px] font-semibold text-crowd-text-primary group-hover:text-crowd-cyan truncate">
                          <span className="truncate">{s.title}</span>
                          <ExternalLink size={12} className="flex-shrink-0 ml-1 text-crowd-text-muted group-hover:text-crowd-cyan" />
                        </div>
                        <p className="text-[10px] text-crowd-text-muted line-clamp-2 mt-0.5">
                          {s.snippet}
                        </p>
                      </a>
                    ))}
                  </div>
                </div>

                {/* Evidence-backed Recommendations */}
                <div>
                  <h4 className="text-[10px] uppercase font-bold text-crowd-safe mb-1.5 tracking-wider flex items-center gap-1">
                    <ShieldCheck size={12} /> Evidence-Backed Operational Guidance
                  </h4>
                  <ul className="space-y-1 text-xs text-crowd-text-primary">
                    {activeInv.recommendations?.map((rec, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <CheckCircle2 size={13} className="text-crowd-safe flex-shrink-0 mt-0.5" />
                        <span>{rec}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ) : (
              <div className="text-center py-6 text-crowd-text-muted text-xs">
                <Search size={24} className="mx-auto mb-2 opacity-40 text-crowd-cyan" />
                No active web investigation. TinyFish automatically triggers when risk scores spike, or you can run one manually below.
              </div>
            )}
          </div>

          {/* Manual Investigation Trigger Bar */}
          <div className="mt-3 pt-3 border-t border-crowd-border/30 flex flex-wrap items-center gap-2">
            <span className="text-[11px] text-crowd-text-muted font-medium">Trigger Investigation:</span>
            <select
              value={investigatingZone}
              onChange={(e) => setInvestigatingZone(e.target.value)}
              className="bg-crowd-bg border border-crowd-border rounded px-2 py-1 text-xs text-crowd-text-primary"
            >
              {zones.map(z => (
                <option key={z.id} value={z.id}>{z.name}</option>
              ))}
            </select>
            <input
              type="text"
              value={investigationReason}
              onChange={(e) => setInvestigationReason(e.target.value)}
              placeholder="Reason for investigation..."
              className="flex-1 min-w-[150px] bg-crowd-bg border border-crowd-border rounded px-2.5 py-1 text-xs text-crowd-text-primary placeholder-crowd-text-muted/60"
            />
            <button
              onClick={handleManualInvestigate}
              disabled={isSubmittingInv}
              className="px-3 py-1 bg-crowd-cyan/20 hover:bg-crowd-cyan/30 border border-crowd-cyan/40 text-crowd-cyan font-semibold rounded text-xs transition-all flex items-center gap-1"
            >
              <Search size={12} />
              {isSubmittingInv ? 'Dispatching...' : 'Dispatch Agent'}
            </button>
          </div>
        </GlassCard>

        {/* Right column: AI Prediction Confidence & 5-Min Forecast */}
        <div className="space-y-4">
          
          {/* AI Model Card */}
          <GlassCard glow="purple" className="flex flex-col items-center justify-center text-center">
            <Brain size={22} className="text-crowd-purple mb-1.5" />
            <p className="text-[10px] text-crowd-text-muted uppercase tracking-wider mb-1">
              AI Prediction Confidence
            </p>
            <RiskBadge score={aiConfidence} size={76} showLabel={false} />
            <p className="text-xs font-semibold text-crowd-text-primary mt-1.5 font-mono">{aiModelName}</p>
            <p className="text-[10px] text-crowd-purple font-mono">{aiModelType}</p>
            <div className="flex items-center gap-1 mt-1 text-[10px] text-crowd-text-muted">
              <Clock size={10} />
              <span>5-15m window • {aiForecast?.inferenceLatencyMs || 18}ms inference</span>
            </div>
            {aiForecast?.anomalyDetected && (
              <div className="mt-2 px-2 py-1 bg-crowd-danger/20 border border-crowd-danger/50 rounded text-[10px] text-crowd-danger font-semibold flex items-center gap-1 animate-pulse">
                <AlertTriangle size={12} />
                Anomaly Spike Detected ({aiForecast.anomalyScore}/100)
              </div>
            )}
          </GlassCard>

          {/* 5-Minute Forecast */}
          <GlassCard>
            <h3 className="text-xs font-semibold text-crowd-text-primary flex items-center gap-2 mb-2">
              <Clock size={14} className="text-crowd-warning" />
              Multi-Zone 5-Min Predictive Forecast
            </h3>
            <div className="space-y-1.5">
              {forecastList.map((f, i) => {
                const risk = getRiskLevel(f.peakRisk);
                return (
                  <div key={i} className="flex items-center gap-2.5 text-xs">
                    <span className="font-mono text-crowd-text-muted w-9">{f.time}</span>
                    <div className="flex-1 h-1.5 rounded-full bg-crowd-border overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${f.avgRisk}%`, backgroundColor: getRiskLevel(f.avgRisk).color }}
                      />
                    </div>
                    <span className="font-mono w-6 text-right font-bold" style={{ color: risk.color }}>
                      {f.peakRisk}
                    </span>
                    <span className="text-crowd-text-muted w-14 truncate text-[10px]">{f.peakZone}</span>
                  </div>
                );
              })}
            </div>
          </GlassCard>
        </div>
      </div>

      {/* ── Incident Timeline & Risk Trend Row ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Risk Over Time Chart (2/3 width) */}
        <GlassCard className="lg:col-span-2">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-semibold text-crowd-text-primary flex items-center gap-2">
              <TrendingUp size={14} className="text-crowd-cyan" />
              Congestion Risk Trend (Sliding Window)
            </h3>
            <span className="text-[10px] font-mono text-crowd-text-muted">Dynamic CRS Evolution</span>
          </div>
          <ResponsiveContainer width="100%" height={160}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="riskGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={riskTrendColor} stopOpacity={0.3} />
                  <stop offset="100%" stopColor={riskTrendColor} stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748B' }} />
              <YAxis domain={[0, 100]} axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748B' }} width={28} />
              <Tooltip
                contentStyle={{
                  background: 'rgba(12,18,32,0.95)',
                  border: '1px solid rgba(30,45,74,0.6)',
                  borderRadius: 8,
                  fontSize: 11,
                }}
                labelStyle={{ color: '#94A3B8' }}
              />
              <Area type="monotone" dataKey="risk" stroke={riskTrendColor} strokeWidth={2} fill="url(#riskGradient)" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </GlassCard>

        {/* Incident Timeline Feed (1/3 width) */}
        <GlassCard className="lg:col-span-1">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-semibold text-crowd-text-primary flex items-center gap-2">
              <Activity size={14} className="text-crowd-warning" />
              Incident Timeline
            </h3>
            <span className="text-[9px] font-mono text-crowd-text-muted">Live Sentinel Log</span>
          </div>
          <div className="overflow-y-auto space-y-2 pr-1" style={{ maxHeight: 160 }}>
            {timeline.length > 0 ? (
              timeline.slice(0, 10).map((evt, idx) => (
                <div key={idx} className="text-[11px] p-2 rounded bg-crowd-bg/40 border border-crowd-border/30">
                  <div className="flex items-center justify-between text-crowd-text-muted font-mono text-[9px] mb-0.5">
                    <span className="text-crowd-cyan">{evt.time}</span>
                    <span className="uppercase">{evt.zone}</span>
                  </div>
                  <p className="text-crowd-text-secondary leading-snug">{evt.message}</p>
                </div>
              ))
            ) : (
              <p className="text-[11px] text-center text-crowd-text-muted py-8">
                Operating nominal. Events will appear as crowd dynamics fluctuate.
              </p>
            )}
          </div>
        </GlassCard>
      </div>

      {/* ── Sensor Insights Strip ── */}
      <SensorInsights />
    </div>
  );
}
