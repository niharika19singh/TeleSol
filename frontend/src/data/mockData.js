// ═══════════════════════════════════════════════════════
// CrowdShield — Mock Data for Crowd Dynamics Intelligence
// ═══════════════════════════════════════════════════════

// Zone coordinates centered around IIITD, Delhi
export const ZONES = [
  {
    id: 'zone-a',
    name: 'Gate A — Main Entry',
    lat: 28.5469,
    lng: 77.2710,
    radius: 120,
    density: 3.2,
    flowInstability: 22,
    panicLevel: 8,
    riskScore: 28,
    status: 'safe',
    sensorCount: 4,
  },
  {
    id: 'zone-b',
    name: 'Gate B — East Wing',
    lat: 28.5475,
    lng: 77.2755,
    radius: 100,
    density: 5.8,
    flowInstability: 45,
    panicLevel: 18,
    riskScore: 52,
    status: 'warning',
    sensorCount: 3,
  },
  {
    id: 'zone-c',
    name: 'Gate C — VIP Corridor',
    lat: 28.5445,
    lng: 77.2725,
    radius: 80,
    density: 7.4,
    flowInstability: 68,
    panicLevel: 42,
    riskScore: 78,
    status: 'danger',
    sensorCount: 5,
  },
  {
    id: 'zone-d',
    name: 'Gate D — South Exit',
    lat: 28.5440,
    lng: 77.2695,
    radius: 110,
    density: 2.1,
    flowInstability: 12,
    panicLevel: 5,
    riskScore: 15,
    status: 'safe',
    sensorCount: 3,
  },
  {
    id: 'zone-e',
    name: 'Gate E — Parking Zone',
    lat: 28.5488,
    lng: 77.2680,
    radius: 140,
    density: 4.5,
    flowInstability: 38,
    panicLevel: 15,
    riskScore: 42,
    status: 'warning',
    sensorCount: 4,
  },
  {
    id: 'zone-f',
    name: 'Gate F — Emergency Exit',
    lat: 28.5453,
    lng: 77.2765,
    radius: 90,
    density: 1.5,
    flowInstability: 8,
    panicLevel: 3,
    riskScore: 10,
    status: 'safe',
    sensorCount: 2,
  },
];

// Risk score thresholds
export const RISK_THRESHOLDS = {
  SAFE: { min: 0, max: 40, color: '#00FF88', label: 'Safe', bg: 'rgba(0,255,136,0.12)' },
  WARNING: { min: 41, max: 65, color: '#FFB800', label: 'Warning', bg: 'rgba(255,184,0,0.12)' },
  DANGER: { min: 66, max: 100, color: '#FF3B5C', label: 'Critical', bg: 'rgba(255,59,92,0.12)' },
};

export function getRiskLevel(score) {
  if (score <= 40) return RISK_THRESHOLDS.SAFE;
  if (score <= 65) return RISK_THRESHOLDS.WARNING;
  return RISK_THRESHOLDS.DANGER;
}

export function getStatusFromScore(score) {
  if (score <= 40) return 'safe';
  if (score <= 65) return 'warning';
  return 'danger';
}

// ── KPI Data ──
export const KPI_DATA = {
  activeZones: 6,
  avgRiskScore: 37,
  highRiskAlerts: 3,
  peakDensity: 7.4,
};

// ── Time Series Data (last 30 points) ──
function generateTimeSeries(baseValue, variance, points = 30) {
  const now = Date.now();
  return Array.from({ length: points }, (_, i) => ({
    time: new Date(now - (points - i) * 60000).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
    timestamp: now - (points - i) * 60000,
    value: Math.max(0, Math.min(100, baseValue + (Math.random() - 0.5) * variance * 2)),
  }));
}

export const riskOverTime = generateTimeSeries(38, 15);
export const densityTrend = generateTimeSeries(4.2, 2);
export const instabilityTrend = generateTimeSeries(30, 18);

// Per-zone time series
export function generateZoneTimeSeries() {
  return ZONES.map(z => ({
    zoneId: z.id,
    zoneName: z.name.split('—')[0].trim(),
    data: generateTimeSeries(z.riskScore, 12),
  }));
}

// ── Alerts Data ──
export const ALERTS = [
  {
    id: 'alrt-001',
    zone: 'Gate C — VIP Corridor',
    zoneId: 'zone-c',
    severity: 'critical',
    riskScore: 78,
    message: 'Density exceeding safe threshold — 7.4 ppl/m²',
    action: 'Redirect crowd to Gate D and Gate F exits immediately',
    timestamp: Date.now() - 30000,
  },
  {
    id: 'alrt-002',
    zone: 'Gate C — VIP Corridor',
    zoneId: 'zone-c',
    severity: 'critical',
    riskScore: 78,
    message: 'Panic spike detected via audio sensors',
    action: 'Deploy security staff and open emergency barriers',
    timestamp: Date.now() - 45000,
  },
  {
    id: 'alrt-003',
    zone: 'Gate B — East Wing',
    zoneId: 'zone-b',
    severity: 'warning',
    riskScore: 52,
    message: 'Flow instability rising — 45% above baseline',
    action: 'Monitor closely. Prepare crowd diversion to Gate E',
    timestamp: Date.now() - 120000,
  },
  {
    id: 'alrt-004',
    zone: 'Gate E — Parking Zone',
    zoneId: 'zone-e',
    severity: 'warning',
    riskScore: 42,
    message: 'Entry rate spike detected — 280 ppl/min',
    action: 'Throttle entry at Gate E. Open secondary lanes',
    timestamp: Date.now() - 300000,
  },
  {
    id: 'alrt-005',
    zone: 'Gate B — East Wing',
    zoneId: 'zone-b',
    severity: 'warning',
    riskScore: 55,
    message: 'Counter-flow detected near bottleneck zone',
    action: 'Enable one-way flow enforcement at Gate B corridor',
    timestamp: Date.now() - 420000,
  },
  {
    id: 'alrt-006',
    zone: 'Gate A — Main Entry',
    zoneId: 'zone-a',
    severity: 'info',
    riskScore: 28,
    message: 'Crowd density stabilized after intervention',
    action: 'Continue monitoring. No immediate action required',
    timestamp: Date.now() - 600000,
  },
  {
    id: 'alrt-007',
    zone: 'Gate C — VIP Corridor',
    zoneId: 'zone-c',
    severity: 'critical',
    riskScore: 82,
    message: 'Exit blockage detected — flow rate dropped 70%',
    action: 'Clear obstruction at Gate C exit. Deploy rapid response team',
    timestamp: Date.now() - 15000,
  },
  {
    id: 'alrt-008',
    zone: 'Gate D — South Exit',
    zoneId: 'zone-d',
    severity: 'info',
    riskScore: 15,
    message: 'All sensors nominal — zone operating safely',
    action: 'No action needed',
    timestamp: Date.now() - 900000,
  },
];

// ── Sensor Data ──
export const SENSOR_DATA = {
  camera: {
    label: 'Camera Array',
    metric: 'Crowd Density',
    value: 7.4,
    unit: 'ppl/m²',
    confidence: 94,
    status: 'active',
    lastUpdate: Date.now() - 2000,
    icon: 'Camera',
  },
  motion: {
    label: 'Motion Sensors',
    metric: 'Flow Instability',
    value: 68,
    unit: '%',
    confidence: 87,
    status: 'active',
    lastUpdate: Date.now() - 1500,
    icon: 'Activity',
  },
  audio: {
    label: 'Audio Analysis',
    metric: 'Panic Level',
    value: 42,
    unit: '%',
    confidence: 78,
    status: 'active',
    lastUpdate: Date.now() - 3000,
    icon: 'Mic',
  },
};

// ── AI Model Data ──
export const AI_MODEL = {
  name: 'CrowdPredict v3.2',
  confidence: 89,
  predictionWindow: '5 min',
  inferenceLatency: 45,
  accuracy: 93.2,
  lastTrained: '2026-03-28',
};

// ── 5-Minute Forecast ──
export const FORECAST_5MIN = [
  { time: 'Now', avgRisk: 37, peakZone: 'Gate C', peakRisk: 78 },
  { time: '+1m', avgRisk: 39, peakZone: 'Gate C', peakRisk: 81 },
  { time: '+2m', avgRisk: 42, peakZone: 'Gate C', peakRisk: 84 },
  { time: '+3m', avgRisk: 44, peakZone: 'Gate B', peakRisk: 79 },
  { time: '+4m', avgRisk: 41, peakZone: 'Gate B', peakRisk: 72 },
  { time: '+5m', avgRisk: 38, peakZone: 'Gate B', peakRisk: 65 },
];

// ── Utility: Add realistic jitter to data ──
export function jitter(value, range = 2) {
  return Math.max(0, value + (Math.random() - 0.5) * range * 2);
}

export function jitterInt(value, range = 2) {
  return Math.max(0, Math.round(jitter(value, range)));
}
