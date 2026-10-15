// ═══════════════════════════════════════════════════════
// TeleSol — Sensor Dashboard Page
// Pure live data from ESP12E → Backend → Dashboard
// No mock data — shows real sensor readings only
// ═══════════════════════════════════════════════════════

import { useState, useEffect, useCallback } from 'react';
import { Activity, Gauge, Users, Shield, Radio, Crosshair, Smartphone, Clock, WifiOff, Globe, Zap, Cable } from 'lucide-react';
import MPU6050Card from './MPU6050Card';
import ToFCard from './ToFCard';
import RadarCard from './RadarCard';
import PhoneFeedCard from './PhoneFeedCard';
import KPICard from '../shared/KPICard';
import GlassCard from '../shared/GlassCard';
import { fetchLiveData, fetchCRS, fetchSensorHealth, fetchSensorDetail, fetchProtocolStatus, fetchChannels } from '../../data/api';

// Empty sensor state — shown when no data from backend
const EMPTY_SENSORS = {
  imu: {
    accelX: 0, accelY: 0, accelZ: 0,
    gyroX: 0, gyroY: 0, gyroZ: 0,
    temperature: 0, vibrationMagnitude: 0,
  },
  tof: {
    distance_mm: 0, valid: false, rangeStatus: 4,
  },
  radar: {
    humanDetected: false, distance_cm: 0,
    movementState: 0, energyLevel: 0, humanCount: 0,
  },
};

export default function SensorDashboardPage() {
  const [sensorData, setSensorData] = useState(EMPTY_SENSORS);
  const [crsData, setCrsData] = useState({ crs: 0, level: 'normal' });
  const [sensorHealth, setSensorHealth] = useState({});
  const [isLive, setIsLive] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [readingHistory, setReadingHistory] = useState([]);
  const [connectionError, setConnectionError] = useState(false);
  const [protocolStatus, setProtocolStatus] = useState(null);
  const [channel, setChannel] = useState(null);  // null=auto, 'real', 'sim'
  const [channelInfo, setChannelInfo] = useState(null);
  const [activeChannel, setActiveChannel] = useState('sim'); // which channel is actually serving data

  // Fetch real data from backend
  const fetchData = useCallback(async () => {
    try {
      const [detail, liveData, crs, health, protocols, channels] = await Promise.all([
        fetchSensorDetail(channel),
        fetchLiveData(channel),
        fetchCRS(channel),
        fetchSensorHealth(channel),
        fetchProtocolStatus(),
        fetchChannels(),
      ]);

      if (protocols) setProtocolStatus(protocols);
      if (channels) setChannelInfo(channels);

      // Check if backend returned actual sensor data
      if (detail && detail.status !== 'no_data') {
        setIsLive(true);
        setConnectionError(false);

        setSensorData({
          imu: detail.imu || EMPTY_SENSORS.imu,
          tof: detail.tof || EMPTY_SENSORS.tof,
          radar: {
            ...(detail.radar || EMPTY_SENSORS.radar),
            humanCount: liveData?.radarHumans || 0,
          },
        });

        if (crs) setCrsData(crs);
        if (health) setSensorHealth(health);
        setLastUpdate(Date.now());

        // Add to reading history
        setReadingHistory(prev => {
          const entry = {
            time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
            humans: liveData?.radarHumans || 0,
            tofDist: detail.tof?.distance_mm || 0,
            vibration: (detail.imu?.vibrationMagnitude || 0).toFixed(2),
            crs: crs?.crs ? Math.round(crs.crs) : 0,
          };
          return [entry, ...prev].slice(0, 15);
        });
      } else if (liveData && liveData.status !== 'no_data') {
        // Fallback: use live data endpoint if detail isn't populated
        setIsLive(true);
        setConnectionError(false);

        setSensorData({
          imu: {
            accelX: liveData.accelX || 0,
            accelY: liveData.accelY || 0,
            accelZ: liveData.accelZ || 0,
            gyroX: liveData.gyroX || 0,
            gyroY: liveData.gyroY || 0,
            gyroZ: liveData.gyroZ || 0,
            temperature: liveData.temperature || 0,
            vibrationMagnitude: liveData.vibration || 0,
          },
          tof: {
            distance_mm: liveData.tofDistance || 0,
            valid: liveData.tofValid || false,
            rangeStatus: liveData.tofRangeStatus || 4,
          },
          radar: {
            humanDetected: liveData.radarPresence || false,
            distance_cm: liveData.radarDistance || 0,
            movementState: liveData.radarMoving || 0,
            energyLevel: liveData.radarEnergy || 0,
            humanCount: liveData.radarHumans || 0,
          },
        });

        if (crs) setCrsData(crs);
        if (health) setSensorHealth(health);
        setLastUpdate(Date.now());
      } else {
        // Backend is reachable but no sensor data yet
        setIsLive(false);
        setConnectionError(false);
      }
    } catch {
      // Backend unreachable
      setConnectionError(true);
      setIsLive(false);
    }
  }, [channel]);

  // Determine which channel is actually active
  useEffect(() => {
    if (channelInfo) {
      if (channel === 'real' || channel === 'sim') {
        setActiveChannel(channel);
      } else {
        setActiveChannel(channelInfo.real?.hasData ? 'real' : 'sim');
      }
    }
  }, [channelInfo, channel]);

  // Poll backend every 2 seconds
  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 2000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const crsScore = Math.round(crsData?.crs || 0);
  const crsLevel = crsScore > 80 ? 'CRITICAL' : crsScore > 60 ? 'HIGH' : crsScore > 40 ? 'ELEVATED' : 'NORMAL';
  const crsColor = crsScore > 80 ? '#FF3B5C' : crsScore > 60 ? '#FF8C00' : crsScore > 40 ? '#FFB800' : '#00FF88';

  const timeSinceUpdate = lastUpdate ? Math.round((Date.now() - lastUpdate) / 1000) : null;

  return (
    <div className="space-y-4 animate-fade-in-up">

      {/* ── No Data Banner ── */}
      {!isLive && (
        <GlassCard className="border-crowd-warning/30">
          <div className="flex items-center gap-3 py-1">
            <WifiOff size={18} className={connectionError ? 'text-crowd-danger' : 'text-crowd-warning'} />
            <div>
              <p className="text-sm font-semibold text-crowd-text-primary">
                {connectionError ? 'Backend Offline' : 'Waiting for Sensor Data'}
              </p>
              <p className="text-[11px] text-crowd-text-muted">
                {connectionError
                  ? 'Cannot reach the backend server at localhost:8000. Make sure it is running.'
                  : 'No sensor data received yet. Connect the ESP12E and ensure it is POSTing to the backend.'
                }
              </p>
            </div>
          </div>
        </GlassCard>
      )}

      {/* ── Channel Toggle ── */}
      <div className="flex items-center gap-3">
        <div className="flex rounded-lg overflow-hidden border border-crowd-border/30" style={{ background: 'rgba(15,23,42,0.6)' }}>
          <button
            onClick={() => setChannel(null)}
            className="px-3 py-1.5 text-[11px] font-semibold transition-all"
            style={{
              background: channel === null ? 'rgba(0,212,255,0.15)' : 'transparent',
              color: channel === null ? '#00D4FF' : '#94a3b8',
              borderRight: '1px solid rgba(100,116,139,0.2)',
            }}
          >
            AUTO
          </button>
          <button
            onClick={() => setChannel('real')}
            className="px-3 py-1.5 text-[11px] font-semibold transition-all flex items-center gap-1.5"
            style={{
              background: channel === 'real' ? 'rgba(0,255,136,0.15)' : 'transparent',
              color: channel === 'real' ? '#00FF88' : '#94a3b8',
              borderRight: '1px solid rgba(100,116,139,0.2)',
            }}
          >
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: channelInfo?.real?.hasData ? '#00FF88' : '#475569' }} />
            REAL SENSORS
            {channelInfo?.real?.readingCount > 0 && (
              <span className="text-[9px] opacity-60">({channelInfo.real.readingCount})</span>
            )}
          </button>
          <button
            onClick={() => setChannel('sim')}
            className="px-3 py-1.5 text-[11px] font-semibold transition-all flex items-center gap-1.5"
            style={{
              background: channel === 'sim' ? 'rgba(168,85,247,0.15)' : 'transparent',
              color: channel === 'sim' ? '#A855F7' : '#94a3b8',
            }}
          >
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: channelInfo?.sim?.hasData ? '#A855F7' : '#475569' }} />
            SIMULATION
            {channelInfo?.sim?.readingCount > 0 && (
              <span className="text-[9px] opacity-60">({channelInfo.sim.readingCount})</span>
            )}
          </button>
        </div>
        <span className="text-[10px] font-mono px-2 py-1 rounded" style={{
          background: activeChannel === 'real' ? 'rgba(0,255,136,0.1)' : 'rgba(168,85,247,0.1)',
          color: activeChannel === 'real' ? '#00FF88' : '#A855F7',
          border: `1px solid ${activeChannel === 'real' ? 'rgba(0,255,136,0.3)' : 'rgba(168,85,247,0.3)'}`,
        }}>
          {activeChannel === 'real' ? '● REAL DATA' : '◇ SIMULATED'}
        </span>
      </div>

      {/* ── KPI Strip ── */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <KPICard
          icon={Radio}
          label="Radar Humans"
          value={sensorData.radar.humanCount}
          color={sensorData.radar.humanDetected ? 'cyan' : 'green'}
          trend={sensorData.radar.humanDetected ? 'up' : 'stable'}
        />
        <KPICard
          icon={Crosshair}
          label="ToF Distance"
          value={sensorData.tof.valid ? sensorData.tof.distance_mm : '---'}
          unit="mm"
          color={sensorData.tof.valid && sensorData.tof.distance_mm < 500 ? 'red' : 'green'}
          trend="stable"
        />
        <KPICard
          icon={Activity}
          label="Vibration"
          value={sensorData.imu.vibrationMagnitude.toFixed(1)}
          unit="m/s²"
          color={sensorData.imu.vibrationMagnitude > 3 ? 'warning' : 'green'}
          trend={sensorData.imu.vibrationMagnitude > 2 ? 'up' : 'stable'}
        />
        <KPICard
          icon={Gauge}
          label="CRS Score"
          value={crsScore}
          unit="/100"
          color={crsScore > 65 ? 'red' : crsScore > 40 ? 'warning' : 'green'}
          trend={crsScore > 50 ? 'up' : 'stable'}
        />
        <KPICard
          icon={Smartphone}
          label="Data Source"
          value={isLive ? 'LIVE' : 'NONE'}
          color={isLive ? 'green' : 'red'}
          trend="stable"
        />
      </div>

      {/* ── Protocol Status Card ── */}
      <GlassCard>
        <div className="flex items-center gap-2 mb-3">
          <Globe size={14} className="text-crowd-cyan" />
          <h3 className="text-xs font-semibold text-crowd-text-primary">Protocol Stack</h3>
          <span className="text-[9px] text-crowd-text-muted ml-auto font-mono">Multi-Protocol Architecture</span>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <ProtocolIndicator
            name="HTTP"
            icon={Globe}
            active={true}
            detail={protocolStatus?.http?.requestsReceived
              ? `${protocolStatus.http.requestsReceived} requests`
              : 'Primary channel'}
            color="#00D4FF"
            description="ESP32 → Backend POST"
          />
          <ProtocolIndicator
            name="CoAP"
            icon={Zap}
            active={protocolStatus?.coap?.active || false}
            detail={protocolStatus?.coap?.requestsHandled
              ? `${protocolStatus.coap.requestsHandled} requests`
              : 'UDP port 5683'}
            color="#A855F7"
            description="Lightweight edge protocol"
          />
          <ProtocolIndicator
            name="WebSocket"
            icon={Cable}
            active={true}
            detail={protocolStatus?.websocket?.clientsConnected != null
              ? `${protocolStatus.websocket.clientsConnected} clients`
              : 'Real-time push'}
            color="#FFB800"
            description="Backend → Dashboard"
          />
        </div>
      </GlassCard>

      {/* ── Sensor Cards Row ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <MPU6050Card data={sensorData.imu} />
        <ToFCard data={sensorData.tof} />
        <RadarCard data={sensorData.radar} />
      </div>

      {/* ── Phone Feed + CRS + History ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Phone Feed (2/3 width) */}
        <div className="lg:col-span-2">
          <PhoneFeedCard />
        </div>

        {/* Right column: CRS + History */}
        <div className="space-y-4">
          {/* CRS Gauge */}
          <GlassCard glow={crsScore > 60 ? 'red' : crsScore > 40 ? 'warning' : 'green'}>
            <div className="flex items-center gap-2 mb-3">
              <Shield size={14} className="text-crowd-cyan" />
              <h3 className="text-xs font-semibold text-crowd-text-primary">Congestion Risk Score</h3>
            </div>
            <div className="flex items-center justify-center py-2">
              <CRSGauge score={crsScore} color={crsColor} level={crsLevel} />
            </div>
            <div className="grid grid-cols-4 gap-2 mt-3">
              {[
                { label: 'Device', value: '35%', color: '#00D4FF' },
                { label: 'Growth', value: '25%', color: '#00FF88' },
                { label: 'Network', value: '30%', color: '#A855F7' },
                { label: 'Temporal', value: '10%', color: '#FFB800' },
              ].map(w => (
                <div key={w.label} className="text-center">
                  <div className="text-[10px] font-mono font-bold" style={{ color: w.color }}>{w.value}</div>
                  <div className="text-[8px] text-crowd-text-muted uppercase">{w.label}</div>
                </div>
              ))}
            </div>
          </GlassCard>

          {/* Reading History */}
          <GlassCard>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-semibold text-crowd-text-primary flex items-center gap-2">
                <Clock size={12} className="text-crowd-text-muted" />
                Recent Readings
              </h3>
              <span className="text-[9px] text-crowd-text-muted font-mono">
                {timeSinceUpdate !== null ? `${timeSinceUpdate}s ago` : 'No data'}
              </span>
            </div>
            <div className="overflow-hidden" style={{ maxHeight: 220 }}>
              <table className="w-full text-[10px]">
                <thead>
                  <tr className="text-crowd-text-muted border-b border-crowd-border/30">
                    <th className="text-left py-1 font-medium">Time</th>
                    <th className="text-right py-1 font-medium">PPL</th>
                    <th className="text-right py-1 font-medium">ToF</th>
                    <th className="text-right py-1 font-medium">Vib</th>
                    <th className="text-right py-1 font-medium">CRS</th>
                  </tr>
                </thead>
                <tbody>
                  {readingHistory.map((r, i) => (
                    <tr key={i} className="border-b border-crowd-border/10 text-crowd-text-secondary font-mono"
                      style={{ opacity: 1 - i * 0.05 }}>
                      <td className="py-1">{r.time}</td>
                      <td className="text-right text-crowd-cyan">{r.humans}</td>
                      <td className="text-right">{r.tofDist}</td>
                      <td className="text-right">{r.vibration}</td>
                      <td className="text-right" style={{
                        color: r.crs > 80 ? '#FF3B5C' : r.crs > 60 ? '#FF8C00' : r.crs > 40 ? '#FFB800' : '#00FF88'
                      }}>{r.crs}</td>
                    </tr>
                  ))}
                  {readingHistory.length === 0 && (
                    <tr>
                      <td colSpan={5} className="text-center py-6 text-crowd-text-muted text-[11px]">
                        No sensor data received yet.<br />
                        <span className="text-[9px]">Connect ESP12E → Backend → Dashboard</span>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </GlassCard>
        </div>
      </div>
    </div>
  );
}

// ── CRS Gauge Component ──
function CRSGauge({ score, color, level }) {
  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference - (score / 100) * circumference * 0.75;

  return (
    <div className="relative w-32 h-32 flex items-center justify-center">
      <svg className="absolute inset-0 -rotate-135" viewBox="0 0 128 128">
        <circle cx="64" cy="64" r={radius} fill="none" stroke="rgba(100,116,139,0.12)" strokeWidth="8"
          strokeDasharray={`${circumference * 0.75} ${circumference * 0.25}`} strokeLinecap="round" />
        <circle cx="64" cy="64" r={radius} fill="none" stroke={color} strokeWidth="8"
          strokeDasharray={`${circumference * 0.75} ${circumference * 0.25}`}
          strokeDashoffset={dashOffset} strokeLinecap="round"
          className="transition-all duration-1000"
          style={{ filter: `drop-shadow(0 0 8px ${color}50)` }} />
      </svg>
      <div className="text-center z-10">
        <span className="text-3xl font-bold font-mono" style={{ color }}>{score}</span>
        <p className="text-[9px] text-crowd-text-muted uppercase tracking-wider mt-0.5">{level}</p>
      </div>
    </div>
  );
}

// ── Protocol Indicator Component ──
function ProtocolIndicator({ name, icon: Icon, active, detail, color, description }) {
  return (
    <div className="relative rounded-lg p-3 transition-all duration-300"
      style={{
        background: active
          ? `linear-gradient(135deg, ${color}08, ${color}04)`
          : 'rgba(30,41,59,0.4)',
        border: `1px solid ${active ? color + '30' : 'rgba(100,116,139,0.15)'}`,
      }}
    >
      <div className="flex items-center gap-2 mb-1.5">
        <div className="relative">
          <Icon size={14} style={{ color: active ? color : '#64748b' }} />
          {active && (
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full animate-pulse"
              style={{ backgroundColor: color, boxShadow: `0 0 6px ${color}` }} />
          )}
        </div>
        <span className="text-[11px] font-bold text-crowd-text-primary">{name}</span>
        <span className="ml-auto text-[8px] font-mono px-1.5 py-0.5 rounded"
          style={{
            color: active ? color : '#94a3b8',
            background: active ? color + '15' : 'rgba(100,116,139,0.1)',
          }}>
          {active ? '● ACTIVE' : '○ IDLE'}
        </span>
      </div>
      <p className="text-[9px] text-crowd-text-muted leading-tight">{description}</p>
      <p className="text-[10px] font-mono mt-1" style={{ color: active ? color : '#64748b' }}>
        {detail}
      </p>
    </div>
  );
}
