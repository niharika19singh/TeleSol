// ═══════════════════════════════════════════════════════
// CrowdShield — Sensor Insights Component
// Sensor cards with status + confidence bars
// ═══════════════════════════════════════════════════════

import { Camera, Activity, Mic, Brain, Clock } from 'lucide-react';
import { SENSOR_DATA, AI_MODEL } from '../../data/mockData';
import GlassCard from '../shared/GlassCard';

const ICON_MAP = { Camera, Activity, Mic };

function SensorCard({ sensor }) {
  const Icon = ICON_MAP[sensor.icon] || Activity;
  const confColor = sensor.confidence > 90 ? 'bg-crowd-safe' : sensor.confidence > 75 ? 'bg-crowd-warning' : 'bg-crowd-danger';

  return (
    <GlassCard className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-crowd-cyan/10">
            <Icon size={16} className="text-crowd-cyan" />
          </div>
          <div>
            <p className="text-xs font-semibold text-crowd-text-primary">{sensor.label}</p>
            <p className="text-[10px] text-crowd-text-muted">{sensor.metric}</p>
          </div>
        </div>
        <div className="text-right">
          <span className="text-lg font-bold font-mono text-crowd-text-primary">{sensor.value}</span>
          <span className="text-[10px] text-crowd-text-muted ml-1">{sensor.unit}</span>
        </div>
      </div>

      {/* Confidence bar */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] text-crowd-text-muted">Confidence</span>
          <span className="text-[10px] font-mono font-bold text-crowd-text-secondary">{sensor.confidence}%</span>
        </div>
        <div className="h-1.5 rounded-full bg-crowd-border overflow-hidden">
          <div
            className={`h-full rounded-full ${confColor} transition-all duration-700`}
            style={{ width: `${sensor.confidence}%` }}
          />
        </div>
      </div>
    </GlassCard>
  );
}

export default function SensorInsights() {
  const sensors = Object.values(SENSOR_DATA);

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-crowd-text-primary flex items-center gap-2">
        <Activity size={14} className="text-crowd-cyan" />
        Sensor Insights
      </h3>

      {/* Sensor Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {sensors.map(sensor => (
          <SensorCard key={sensor.label} sensor={sensor} />
        ))}
      </div>

      {/* AI Model Info */}
      <GlassCard glow="purple" className="mt-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-crowd-purple/10">
              <Brain size={16} className="text-crowd-purple" />
            </div>
            <div>
              <p className="text-xs font-semibold text-crowd-text-primary">{AI_MODEL.name}</p>
              <p className="text-[10px] text-crowd-text-muted">Prediction Engine</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-center">
              <p className="text-sm font-bold font-mono text-crowd-purple">{AI_MODEL.confidence}%</p>
              <p className="text-[10px] text-crowd-text-muted">Confidence</p>
            </div>
            <div className="text-center">
              <p className="text-sm font-bold font-mono text-crowd-safe">{AI_MODEL.accuracy}%</p>
              <p className="text-[10px] text-crowd-text-muted">Accuracy</p>
            </div>
            <div className="text-center">
              <div className="flex items-center gap-1">
                <Clock size={10} className="text-crowd-text-muted" />
                <p className="text-sm font-bold font-mono text-crowd-cyan">{AI_MODEL.inferenceLatency}ms</p>
              </div>
              <p className="text-[10px] text-crowd-text-muted">Latency</p>
            </div>
          </div>
        </div>
      </GlassCard>
    </div>
  );
}
