// ═══════════════════════════════════════════════════════
// TeleSol — HLK-LD2420 Radar Sensor Card
// Shows human presence, distance, motion, energy, count
// ═══════════════════════════════════════════════════════

import { Radio, Users, Zap, Move } from 'lucide-react';
import GlassCard from '../shared/GlassCard';

function RadarSweep({ presence }) {
  return (
    <div className="relative w-28 h-28 flex items-center justify-center">
      {/* Background rings */}
      <div className="absolute inset-0 rounded-full border border-crowd-border/20" />
      <div className="absolute inset-3 rounded-full border border-crowd-border/15" />
      <div className="absolute inset-6 rounded-full border border-crowd-border/10" />

      {/* Sweep beam */}
      {presence && (
        <div className="absolute inset-0 radar-sweep">
          <div className="absolute top-1/2 left-1/2 w-1/2 h-px origin-left"
            style={{
              background: 'linear-gradient(90deg, rgba(0,212,255,0.6), transparent)',
            }}
          />
        </div>
      )}

      {/* Center dot */}
      <div className={`w-4 h-4 rounded-full ${
        presence ? 'bg-crowd-safe shadow-[0_0_12px_rgba(0,255,136,0.5)]' : 'bg-crowd-border'
      } transition-colors duration-500 z-10`}>
        {presence && <div className="w-full h-full rounded-full bg-crowd-safe animate-ping opacity-40" />}
      </div>

      {/* Detection blip */}
      {presence && (
        <div className="absolute w-2 h-2 rounded-full bg-crowd-cyan animate-pulse"
          style={{ top: '25%', left: '60%', boxShadow: '0 0 8px rgba(0,212,255,0.6)' }}
        />
      )}
    </div>
  );
}

function EnergyBar({ energy }) {
  const segments = 10;
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-crowd-text-muted uppercase tracking-wider">Signal Energy</span>
        <span className="text-xs font-mono font-bold text-crowd-text-secondary">{energy}%</span>
      </div>
      <div className="flex gap-0.5">
        {Array.from({ length: segments }).map((_, i) => {
          const threshold = (i + 1) * 10;
          const active = energy >= threshold;
          const color = threshold <= 30 ? '#00FF88' : threshold <= 60 ? '#FFB800' : '#FF3B5C';
          return (
            <div
              key={i}
              className="flex-1 h-3 rounded-sm transition-all duration-300"
              style={{
                backgroundColor: active ? color : 'rgba(100,116,139,0.12)',
                boxShadow: active ? `0 0 4px ${color}30` : 'none',
              }}
            />
          );
        })}
      </div>
    </div>
  );
}

export default function RadarCard({ data = {} }) {
  const {
    humanDetected = false,
    distance_cm = 0,
    movementState = 0,
    energyLevel = 0,
    humanCount = 0,
  } = data;

  const isMoving = movementState === 1;

  return (
    <GlassCard className="sensor-card" glow="purple">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="sensor-icon-box sensor-icon-radar">
            <Radio size={18} className="text-crowd-purple" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-crowd-text-primary">HLK-LD2420</h3>
            <p className="text-[10px] text-crowd-text-muted">24GHz mmWave Radar</p>
          </div>
        </div>
        <div className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-[10px] font-semibold ${
          humanDetected 
            ? 'bg-crowd-safe/15 text-crowd-safe' 
            : 'bg-crowd-border/30 text-crowd-text-muted'
        }`}>
          <span className={`w-1.5 h-1.5 rounded-full ${humanDetected ? 'bg-crowd-safe sensor-pulse-dot' : 'bg-crowd-text-muted'}`} />
          {humanDetected ? 'DETECTED' : 'NO TARGET'}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Left: Radar Sweep */}
        <div className="flex flex-col items-center gap-2">
          <RadarSweep presence={humanDetected} />
        </div>

        {/* Right: Data */}
        <div className="space-y-3">
          {/* Distance */}
          <div className="bg-crowd-border/10 rounded-lg p-2">
            <p className="text-[9px] text-crowd-text-muted uppercase">Distance</p>
            <div className="flex items-baseline gap-1">
              <span className="text-xl font-bold font-mono text-crowd-text-primary">
                {humanDetected ? distance_cm : '---'}
              </span>
              <span className="text-[10px] text-crowd-text-muted">cm</span>
            </div>
          </div>

          {/* Motion State */}
          <div className="flex items-center gap-2">
            <Move size={14} className={isMoving ? 'text-crowd-warning' : 'text-crowd-text-muted'} />
            <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
              isMoving ? 'bg-crowd-warning/15 text-crowd-warning' : 'bg-crowd-border/20 text-crowd-text-muted'
            }`}>
              {isMoving ? 'MOVING' : 'STATIC'}
            </span>
          </div>

          {/* Human Count */}
          <div className="flex items-center gap-2">
            <Users size={14} className="text-crowd-cyan" />
            <span className="text-sm font-bold font-mono text-crowd-text-primary">~{humanCount}</span>
            <span className="text-[10px] text-crowd-text-muted">humans</span>
          </div>
        </div>
      </div>

      {/* Energy Bar */}
      <div className="mt-4 pt-3 border-t border-crowd-border/30">
        <EnergyBar energy={energyLevel} />
      </div>
    </GlassCard>
  );
}
