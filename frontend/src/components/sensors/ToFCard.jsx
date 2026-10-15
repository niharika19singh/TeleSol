// ═══════════════════════════════════════════════════════
// TeleSol — VL53L0X Time-of-Flight Sensor Card
// Shows distance measurement, range status, proximity
// ═══════════════════════════════════════════════════════

import { Crosshair, CheckCircle, XCircle } from 'lucide-react';
import GlassCard from '../shared/GlassCard';

function DistanceGauge({ distance, max = 2000, valid }) {
  const pct = valid ? Math.min(distance / max * 100, 100) : 0;
  const color = !valid ? '#64748B' :
    distance < 300 ? '#FF3B5C' :
    distance < 800 ? '#FFB800' : '#00FF88';

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-crowd-text-muted uppercase tracking-wider">Distance</span>
        <div className="flex items-center gap-1">
          <span className="text-2xl font-bold font-mono" style={{ color }}>
            {valid ? distance : '---'}
          </span>
          <span className="text-xs text-crowd-text-muted">mm</span>
        </div>
      </div>
      <div className="relative h-4 rounded-full bg-crowd-border/30 overflow-hidden">
        {/* Distance zones */}
        <div className="absolute inset-0 flex">
          <div className="w-[15%] bg-red-500/10 border-r border-crowd-border/30" />
          <div className="w-[25%] bg-yellow-500/10 border-r border-crowd-border/30" />
          <div className="flex-1 bg-green-500/10" />
        </div>
        {/* Fill bar */}
        <div
          className="absolute left-0 top-0 h-full rounded-full transition-all duration-700"
          style={{
            width: `${pct}%`,
            background: `linear-gradient(90deg, ${color}CC, ${color}88)`,
            boxShadow: valid ? `0 0 12px ${color}40` : 'none',
          }}
        />
        {/* Zone labels */}
        <div className="absolute inset-0 flex items-center text-[8px] font-mono text-crowd-text-muted/60">
          <span className="w-[15%] text-center">CLOSE</span>
          <span className="w-[25%] text-center">MID</span>
          <span className="flex-1 text-center">FAR</span>
        </div>
      </div>
      <div className="flex justify-between text-[9px] font-mono text-crowd-text-muted">
        <span>0mm</span>
        <span>300</span>
        <span>800</span>
        <span>2000mm</span>
      </div>
    </div>
  );
}

function ProximityIndicator({ distance, valid }) {
  const isClose = valid && distance > 0 && distance < 500;
  return (
    <div className="flex flex-col items-center gap-2">
      <div className={`relative w-16 h-16 rounded-full flex items-center justify-center ${
        isClose ? 'tof-proximity-active' : 'bg-crowd-border/20'
      }`}>
        {isClose && (
          <>
            <div className="absolute inset-0 rounded-full bg-crowd-danger/20 animate-ping" />
            <div className="absolute inset-1 rounded-full bg-crowd-danger/10 animate-pulse" />
          </>
        )}
        <Crosshair size={24} className={isClose ? 'text-crowd-danger' : 'text-crowd-text-muted'} />
      </div>
      <span className={`text-[10px] font-semibold uppercase tracking-wider ${
        isClose ? 'text-crowd-danger' : 'text-crowd-text-muted'
      }`}>
        {isClose ? 'PERSON DETECTED' : 'CLEAR'}
      </span>
    </div>
  );
}

export default function ToFCard({ data = {} }) {
  const {
    distance_mm = 0,
    valid = false,
    rangeStatus = 4,
  } = data;

  return (
    <GlassCard className="sensor-card" glow="green">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="sensor-icon-box sensor-icon-tof">
            <Crosshair size={18} className="text-crowd-safe" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-crowd-text-primary">VL53L0X</h3>
            <p className="text-[10px] text-crowd-text-muted">Time-of-Flight Laser</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          {valid ? (
            <div className="flex items-center gap-1 text-crowd-safe">
              <CheckCircle size={12} />
              <span className="text-[10px] font-semibold">VALID</span>
            </div>
          ) : (
            <div className="flex items-center gap-1 text-crowd-text-muted">
              <XCircle size={12} />
              <span className="text-[10px] font-semibold">NO RANGE</span>
            </div>
          )}
        </div>
      </div>

      {/* Distance Gauge */}
      <DistanceGauge distance={distance_mm} valid={valid} />

      {/* Bottom: Proximity + Status */}
      <div className="flex items-center justify-between mt-4 pt-3 border-t border-crowd-border/30">
        <ProximityIndicator distance={distance_mm} valid={valid} />
        <div className="text-right space-y-1">
          <div className="text-[10px] text-crowd-text-muted">Range Status</div>
          <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
            rangeStatus === 0 ? 'bg-crowd-safe/15 text-crowd-safe' :
            rangeStatus === 4 ? 'bg-crowd-text-muted/15 text-crowd-text-muted' :
            'bg-crowd-warning/15 text-crowd-warning'
          }`}>
            {rangeStatus === 0 ? 'OK' : rangeStatus === 4 ? 'OUT OF RANGE' : `CODE ${rangeStatus}`}
          </span>
        </div>
      </div>
    </GlassCard>
  );
}
