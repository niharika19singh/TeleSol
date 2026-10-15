// ═══════════════════════════════════════════════════════
// TeleSol — MPU6050 IMU Sensor Card
// Shows accelerometer, gyroscope, temperature & vibration
// ═══════════════════════════════════════════════════════

import { Activity, Thermometer, Waves } from 'lucide-react';
import GlassCard from '../shared/GlassCard';

function AxisBar({ label, value, max = 10, color }) {
  const pct = Math.min(Math.abs(value) / max * 100, 100);
  const isNeg = value < 0;
  return (
    <div className="flex items-center gap-2 text-[11px]">
      <span className="w-5 font-mono text-crowd-text-muted">{label}</span>
      <div className="flex-1 h-2 rounded-full bg-crowd-border/40 overflow-hidden relative">
        <div className="absolute inset-0 flex">
          <div className="w-1/2" />
          <div className="w-px h-full bg-crowd-border/60" />
          <div className="w-1/2" />
        </div>
        <div
          className="absolute h-full rounded-full transition-all duration-500"
          style={{
            width: `${pct / 2}%`,
            left: isNeg ? `${50 - pct / 2}%` : '50%',
            backgroundColor: color,
            opacity: 0.85,
          }}
        />
      </div>
      <span className="w-12 text-right font-mono text-crowd-text-secondary">{value.toFixed(1)}</span>
    </div>
  );
}

function VibrationGauge({ value, max = 10 }) {
  const pct = Math.min(value / max * 100, 100);
  const color = pct > 60 ? '#FF3B5C' : pct > 30 ? '#FFB800' : '#00FF88';
  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference - (pct / 100) * circumference * 0.75;

  return (
    <div className="relative w-24 h-24 flex items-center justify-center">
      <svg className="absolute inset-0 -rotate-135" viewBox="0 0 96 96">
        <circle cx="48" cy="48" r={radius} fill="none" stroke="rgba(100,116,139,0.15)" strokeWidth="6"
          strokeDasharray={`${circumference * 0.75} ${circumference * 0.25}`} strokeLinecap="round" />
        <circle cx="48" cy="48" r={radius} fill="none" stroke={color} strokeWidth="6"
          strokeDasharray={`${circumference * 0.75} ${circumference * 0.25}`}
          strokeDashoffset={dashOffset} strokeLinecap="round"
          className="transition-all duration-700"
          style={{ filter: `drop-shadow(0 0 6px ${color}40)` }} />
      </svg>
      <div className="text-center z-10">
        <span className="text-lg font-bold font-mono" style={{ color }}>{value.toFixed(1)}</span>
        <p className="text-[9px] text-crowd-text-muted">m/s²</p>
      </div>
    </div>
  );
}

export default function MPU6050Card({ data = {} }) {
  const {
    accelX = 0, accelY = 0, accelZ = 9.81,
    gyroX = 0, gyroY = 0, gyroZ = 0,
    temperature = 25, vibrationMagnitude = 0
  } = data;

  return (
    <GlassCard className="sensor-card" glow="cyan">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="sensor-icon-box sensor-icon-mpu">
            <Activity size={18} className="text-crowd-cyan" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-crowd-text-primary">MPU6050</h3>
            <p className="text-[10px] text-crowd-text-muted">6-Axis IMU Sensor</p>
          </div>
        </div>
        <div className="sensor-status-live">
          <span className="sensor-pulse" />
          <span className="text-[10px] font-semibold text-crowd-safe">LIVE</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Left: Axis Data */}
        <div className="space-y-3">
          {/* Accelerometer */}
          <div>
            <p className="text-[10px] text-crowd-text-muted uppercase tracking-wider mb-1.5">Accelerometer (m/s²)</p>
            <div className="space-y-1.5">
              <AxisBar label="X" value={accelX} max={10} color="#00D4FF" />
              <AxisBar label="Y" value={accelY} max={10} color="#00FF88" />
              <AxisBar label="Z" value={accelZ} max={20} color="#A855F7" />
            </div>
          </div>
          {/* Gyroscope */}
          <div>
            <p className="text-[10px] text-crowd-text-muted uppercase tracking-wider mb-1.5">Gyroscope (°/s)</p>
            <div className="space-y-1.5">
              <AxisBar label="X" value={gyroX} max={500} color="#00D4FF" />
              <AxisBar label="Y" value={gyroY} max={500} color="#00FF88" />
              <AxisBar label="Z" value={gyroZ} max={500} color="#A855F7" />
            </div>
          </div>
        </div>

        {/* Right: Vibration + Temperature */}
        <div className="flex flex-col items-center gap-3">
          <div>
            <p className="text-[10px] text-crowd-text-muted uppercase tracking-wider text-center mb-1">Vibration</p>
            <VibrationGauge value={vibrationMagnitude} max={8} />
          </div>
          <div className="flex items-center gap-2 bg-crowd-border/20 rounded-lg px-3 py-2">
            <Thermometer size={14} className="text-crowd-warning" />
            <div>
              <span className="text-sm font-bold font-mono text-crowd-text-primary">{temperature.toFixed(1)}</span>
              <span className="text-[10px] text-crowd-text-muted ml-1">°C</span>
            </div>
          </div>
        </div>
      </div>
    </GlassCard>
  );
}
