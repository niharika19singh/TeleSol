// ═══════════════════════════════════════════════════════
// CrowdShield — Sensor Insights Component
// Shows live sensor status from backend, no mock data
// ═══════════════════════════════════════════════════════

import { useState, useEffect } from 'react';
import { Radio, Activity, Crosshair, Brain, Clock } from 'lucide-react';
import { fetchSensorHealth, fetchLiveData, fetchSensorDetail } from '../../data/api';
import GlassCard from '../shared/GlassCard';

const ICON_MAP = { Radio, Activity, Crosshair };

// Default sensor cards — populated by real backend data
const DEFAULT_SENSORS = [
  {
    key: 'radar',
    label: 'HLK-LD2420 Radar',
    metric: 'Human Detection',
    value: 0,
    unit: 'humans',
    confidence: 0,
    status: 'offline',
    icon: 'Radio',
  },
  {
    key: 'imu',
    label: 'MPU6050 IMU',
    metric: 'Vibration Level',
    value: 0,
    unit: 'm/s²',
    confidence: 0,
    status: 'offline',
    icon: 'Activity',
  },
  {
    key: 'tof',
    label: 'VL53L0X ToF',
    metric: 'Distance',
    value: 0,
    unit: 'mm',
    confidence: 0,
    status: 'offline',
    icon: 'Crosshair',
  },
];

function SensorCard({ sensor }) {
  const Icon = ICON_MAP[sensor.icon] || Activity;
  const isOnline = sensor.status === 'active' || sensor.status === 'online';
  const confColor = sensor.confidence > 90 ? 'bg-crowd-safe' : sensor.confidence > 75 ? 'bg-crowd-warning' : sensor.confidence > 50 ? 'bg-crowd-warning' : 'bg-crowd-border';

  return (
    <GlassCard className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`p-2 rounded-lg ${isOnline ? 'bg-crowd-cyan/10' : 'bg-crowd-border/10'}`}>
            <Icon size={16} className={isOnline ? 'text-crowd-cyan' : 'text-crowd-text-muted'} />
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
          <span className="text-[10px] text-crowd-text-muted">
            {isOnline ? 'Confidence' : 'Status'}
          </span>
          <span className={`text-[10px] font-mono font-bold ${isOnline ? 'text-crowd-text-secondary' : 'text-crowd-text-muted'}`}>
            {isOnline ? `${sensor.confidence}%` : 'No Data'}
          </span>
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
  const [sensors, setSensors] = useState(DEFAULT_SENSORS);
  const [hasData, setHasData] = useState(false);

  useEffect(() => {
    const fetchSensors = async () => {
      try {
        const [detail, health] = await Promise.all([
          fetchSensorDetail(),
          fetchSensorHealth(),
        ]);

        if (detail && detail.status !== 'no_data') {
          setHasData(true);
          const healthMap = {};
          if (health?.sensors) {
            health.sensors.forEach(s => { healthMap[s.type] = s; });
          }

          setSensors([
            {
              ...DEFAULT_SENSORS[0],
              value: detail.radar?.humanDetected ? (detail.computed?.estimatedHumans || 1) : 0,
              confidence: detail.radar?.humanDetected ? Math.min(95, 60 + (detail.radar?.energyLevel || 0) * 0.4) : 0,
              status: healthMap.radar?.status || (detail.radar ? 'active' : 'offline'),
            },
            {
              ...DEFAULT_SENSORS[1],
              value: (detail.imu?.vibrationMagnitude || 0).toFixed(1),
              confidence: detail.imu?.temperature ? 92 : 0,
              status: healthMap.imu?.status || (detail.imu ? 'active' : 'offline'),
            },
            {
              ...DEFAULT_SENSORS[2],
              value: detail.tof?.valid ? detail.tof.distance_mm : 0,
              confidence: detail.tof?.valid ? 94 : 0,
              status: healthMap.tof?.status || (detail.tof?.valid ? 'active' : 'offline'),
            },
          ]);
        }
      } catch {
        // Backend offline — keep defaults
      }
    };

    fetchSensors();
    const interval = setInterval(fetchSensors, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-crowd-text-primary flex items-center gap-2">
        <Activity size={14} className="text-crowd-cyan" />
        Sensor Insights
        {!hasData && (
          <span className="text-[10px] text-crowd-text-muted font-normal ml-2">
            — Waiting for ESP12E data
          </span>
        )}
      </h3>

      {/* Sensor Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {sensors.map(sensor => (
          <SensorCard key={sensor.key} sensor={sensor} />
        ))}
      </div>
    </div>
  );
}
