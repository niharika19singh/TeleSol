// ═══════════════════════════════════════════════════════
// CrowdShield — Simulation Page
// Interactive sliders + live map → watch zones change
// ═══════════════════════════════════════════════════════

import { Play, Pause, RotateCcw, Gauge, Users, DoorOpen, Zap, Timer } from 'lucide-react';
import GlassCard from '../shared/GlassCard';
import RiskBadge from '../shared/RiskBadge';
import CrowdMap from '../map/CrowdMap';
import AlertFeed from '../alerts/AlertFeed';
import { getRiskLevel } from '../../data/mockData';

function SliderControl({ icon: Icon, label, value, min, max, step, unit, onChange, color = 'cyan' }) {
  const percentage = ((value - min) / (max - min)) * 100;
  const colorMap = {
    cyan: 'text-crowd-cyan',
    warning: 'text-crowd-warning',
    red: 'text-crowd-danger',
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon size={14} className={colorMap[color]} />
          <span className="text-xs font-medium text-crowd-text-secondary">{label}</span>
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
        className="w-full"
        style={{
          background: `linear-gradient(to right, ${color === 'cyan' ? '#00D4FF' : color === 'warning' ? '#FFB800' : '#FF3B5C'} 0%, ${color === 'cyan' ? '#00D4FF' : color === 'warning' ? '#FFB800' : '#FF3B5C'} ${percentage}%, #1E2D4A ${percentage}%, #1E2D4A 100%)`,
        }}
      />
      <div className="flex justify-between text-[10px] text-crowd-text-muted">
        <span>{min}{unit}</span>
        <span>{max}{unit}</span>
      </div>
    </div>
  );
}

export default function SimulationPage({
  zones, alerts, params, updateParam, isRunning, setIsRunning,
  speed, setSpeed, simTime, resetSimulation, kpis
}) {
  const formatSimTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-4 animate-fade-in-up">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-crowd-purple/15 via-crowd-cyan/10 to-crowd-purple/15 border border-crowd-purple/30 rounded-xl px-5 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-crowd-purple/20 border border-crowd-purple/40 flex items-center justify-center">
              <Zap size={20} className="text-crowd-purple" />
            </div>
            <div>
              <h3 className="text-sm font-bold font-display text-crowd-text-primary">Simulation Mode</h3>
              <p className="text-[11px] text-crowd-text-muted">Adjust parameters and watch zones respond in real-time</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* Sim Timer */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-crowd-surface border border-crowd-border">
              <Timer size={12} className="text-crowd-text-muted" />
              <span className="font-mono text-sm text-crowd-text-primary">{formatSimTime(simTime)}</span>
            </div>

            {/* Speed Control */}
            <div className="flex items-center gap-0.5 bg-crowd-surface rounded-lg p-0.5 border border-crowd-border">
              {[1, 2, 5].map(s => (
                <button
                  key={s}
                  onClick={() => setSpeed(s)}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                    speed === s
                      ? 'bg-crowd-purple/15 text-crowd-purple'
                      : 'text-crowd-text-muted hover:text-crowd-text-secondary'
                  }`}
                >
                  {s}x
                </button>
              ))}
            </div>

            {/* Play/Pause */}
            <button
              onClick={() => setIsRunning(!isRunning)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                isRunning
                  ? 'bg-crowd-warning/15 text-crowd-warning border border-crowd-warning/30 hover:bg-crowd-warning/25'
                  : 'bg-crowd-safe/15 text-crowd-safe border border-crowd-safe/30 hover:bg-crowd-safe/25'
              }`}
            >
              {isRunning ? <><Pause size={14} /> Pause</> : <><Play size={14} /> Run</>}
            </button>

            {/* Reset */}
            <button
              onClick={resetSimulation}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-crowd-text-muted border border-crowd-border hover:text-crowd-text-primary hover:border-crowd-border-light transition-all"
            >
              <RotateCcw size={14} /> Reset
            </button>
          </div>
        </div>
      </div>

      {/* Main Content: Controls + Map + Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Control Panel (1 col) */}
        <div className="space-y-4">
          <GlassCard glow="purple">
            <h4 className="text-xs font-semibold text-crowd-text-primary mb-4 uppercase tracking-wider">Parameters</h4>
            <div className="space-y-5">
              <SliderControl
                icon={Users}
                label="Crowd Density"
                value={params.crowdDensity}
                min={0}
                max={10}
                step={0.1}
                unit=" ppl/m²"
                onChange={(v) => updateParam('crowdDensity', v)}
                color="cyan"
              />
              <SliderControl
                icon={Gauge}
                label="Entry Rate"
                value={params.entryRate}
                min={0}
                max={500}
                step={10}
                unit=" ppl/min"
                onChange={(v) => updateParam('entryRate', v)}
                color="warning"
              />
              <SliderControl
                icon={DoorOpen}
                label="Exit Blockage"
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

          {/* Zone Risk Summary */}
          <GlassCard>
            <h4 className="text-xs font-semibold text-crowd-text-primary mb-3 uppercase tracking-wider">Zone Status</h4>
            <div className="space-y-2">
              {zones.map(z => {
                const risk = getRiskLevel(z.riskScore);
                return (
                  <div key={z.id} className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: risk.color }} />
                    <span className="text-[11px] text-crowd-text-secondary flex-1 truncate">
                      {z.name.split('—')[0].trim()}
                    </span>
                    <span className="font-mono text-xs font-bold" style={{ color: risk.color }}>
                      {z.riskScore}
                    </span>
                  </div>
                );
              })}
            </div>
          </GlassCard>
        </div>

        {/* Map (2 cols) */}
        <div className="lg:col-span-2">
          <CrowdMap zones={zones} height={520} />
        </div>

        {/* Alerts & KPIs (1 col) */}
        <div className="space-y-4">
          {/* Quick KPIs */}
          <div className="grid grid-cols-2 gap-2">
            <GlassCard className="!p-3 text-center">
              <p className="text-[10px] text-crowd-text-muted">Avg Risk</p>
              <RiskBadge score={kpis.avgRiskScore} size={52} showLabel={false} />
            </GlassCard>
            <GlassCard className="!p-3 text-center">
              <p className="text-[10px] text-crowd-text-muted">Peak Density</p>
              <p className={`text-xl font-bold font-mono mt-2 ${kpis.peakDensity > 6 ? 'text-crowd-danger' : kpis.peakDensity > 4 ? 'text-crowd-warning' : 'text-crowd-safe'}`}>
                {kpis.peakDensity.toFixed(1)}
              </p>
              <p className="text-[10px] text-crowd-text-muted">ppl/m²</p>
            </GlassCard>
          </div>

          {/* Simulation Alerts */}
          <div style={{ height: 380 }}>
            <AlertFeed
              alerts={alerts}
              compact
              maxItems={10}
              title="Sim Alerts"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
