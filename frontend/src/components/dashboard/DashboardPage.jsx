// ═══════════════════════════════════════════════════════
// CrowdShield — Dashboard Page (Hero Screen)
// Full-screen control room layout with KPIs, map, alerts
// ═══════════════════════════════════════════════════════

import { useState, useMemo } from 'react';
import { MapPin, ShieldAlert, Users, Gauge, TrendingUp, Brain, Clock } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import KPICard from '../shared/KPICard';
import RiskBadge from '../shared/RiskBadge';
import GlassCard from '../shared/GlassCard';
import CrowdMap from '../map/CrowdMap';
import AlertFeed from '../alerts/AlertFeed';
import SensorInsights from '../sensors/SensorInsights';
import { riskOverTime, FORECAST_5MIN, AI_MODEL, getRiskLevel } from '../../data/mockData';

export default function DashboardPage({ zones, alerts, kpis }) {
  const [selectedZone, setSelectedZone] = useState(null);

  // Risk trend for chart
  const chartData = useMemo(() => riskOverTime.map(d => ({
    time: d.time,
    risk: Math.round(d.value),
  })), []);

  const riskTrendColor = kpis.avgRiskScore > 65 ? '#FF3B5C' : kpis.avgRiskScore > 40 ? '#FFB800' : '#00FF88';

  return (
    <div className="space-y-4 animate-fade-in-up">
      {/* ── KPI Row ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KPICard
          icon={MapPin}
          label="Active Zones"
          value={kpis.activeZones}
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
          value={kpis.peakDensity.toFixed(1)}
          unit="ppl/m²"
          color={kpis.peakDensity > 6 ? 'red' : kpis.peakDensity > 4 ? 'warning' : 'green'}
          trend={kpis.peakDensity > 5 ? 'up' : 'down'}
        />
      </div>

      {/* ── Main Grid: Map + Alerts ── */}
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

      {/* ── Bottom Row: Chart + AI + Forecast ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Risk Over Time Chart */}
        <GlassCard className="lg:col-span-1">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-semibold text-crowd-text-primary flex items-center gap-2">
              <TrendingUp size={14} className="text-crowd-cyan" />
              Risk Trend (30 min)
            </h3>
          </div>
          <ResponsiveContainer width="100%" height={150}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="riskGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={riskTrendColor} stopOpacity={0.3} />
                  <stop offset="100%" stopColor={riskTrendColor} stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="time"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 10, fill: '#64748B' }}
                interval="preserveStartEnd"
              />
              <YAxis
                domain={[0, 100]}
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 10, fill: '#64748B' }}
                width={28}
              />
              <Tooltip
                contentStyle={{
                  background: 'rgba(12,18,32,0.95)',
                  border: '1px solid rgba(30,45,74,0.6)',
                  borderRadius: 8,
                  fontSize: 11,
                }}
                labelStyle={{ color: '#94A3B8' }}
              />
              <Area
                type="monotone"
                dataKey="risk"
                stroke={riskTrendColor}
                strokeWidth={2}
                fill="url(#riskGradient)"
                dot={false}
                animationDuration={800}
              />
            </AreaChart>
          </ResponsiveContainer>
        </GlassCard>

        {/* AI Prediction Confidence */}
        <GlassCard glow="purple" className="flex flex-col items-center justify-center text-center">
          <Brain size={20} className="text-crowd-purple mb-2" />
          <p className="text-[10px] text-crowd-text-muted uppercase tracking-wider mb-2">AI Prediction Confidence</p>
          <RiskBadge score={AI_MODEL.confidence} size={80} showLabel={false} />
          <p className="text-xs text-crowd-text-secondary mt-2 font-mono">{AI_MODEL.name}</p>
          <div className="flex items-center gap-1 mt-1">
            <Clock size={10} className="text-crowd-text-muted" />
            <span className="text-[10px] text-crowd-text-muted">{AI_MODEL.predictionWindow} window • {AI_MODEL.inferenceLatency}ms latency</span>
          </div>
        </GlassCard>

        {/* 5-Minute Forecast */}
        <GlassCard>
          <h3 className="text-xs font-semibold text-crowd-text-primary flex items-center gap-2 mb-3">
            <Clock size={14} className="text-crowd-warning" />
            5-Minute Forecast
          </h3>
          <div className="space-y-2">
            {FORECAST_5MIN.map((f, i) => {
              const risk = getRiskLevel(f.peakRisk);
              return (
                <div key={i} className="flex items-center gap-3 text-xs">
                  <span className="font-mono text-crowd-text-muted w-10">{f.time}</span>
                  <div className="flex-1 h-1.5 rounded-full bg-crowd-border overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${f.avgRisk}%`, backgroundColor: getRiskLevel(f.avgRisk).color }}
                    />
                  </div>
                  <span className="font-mono w-6 text-right" style={{ color: risk.color }}>{f.peakRisk}</span>
                  <span className="text-crowd-text-muted w-12 truncate text-[10px]">{f.peakZone}</span>
                </div>
              );
            })}
          </div>
        </GlassCard>
      </div>

      {/* ── Sensor Insights Strip ── */}
      <SensorInsights />
    </div>
  );
}
