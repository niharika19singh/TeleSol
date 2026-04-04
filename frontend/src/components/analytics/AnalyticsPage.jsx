// ═══════════════════════════════════════════════════════
// CrowdShield — Analytics Page
// Charts: Risk over time, Density trend, Instability
// ═══════════════════════════════════════════════════════

import { useState, useMemo } from 'react';
import {
  AreaChart, Area, LineChart, Line, BarChart, Bar,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis
} from 'recharts';
import { BarChart3, Clock } from 'lucide-react';
import GlassCard from '../shared/GlassCard';
import { riskOverTime, densityTrend, instabilityTrend, generateZoneTimeSeries } from '../../data/mockData';

const CHART_TOOLTIP_STYLE = {
  contentStyle: {
    background: 'rgba(12,18,32,0.95)',
    border: '1px solid rgba(30,45,74,0.6)',
    borderRadius: 8,
    fontSize: 11,
    color: '#F1F5F9',
  },
  labelStyle: { color: '#94A3B8' },
};

const TIME_RANGES = ['5min', '15min', '1hr', '24hr'];

export default function AnalyticsPage({ zones }) {
  const [timeRange, setTimeRange] = useState('15min');

  const riskData = useMemo(() => riskOverTime.map(d => ({ time: d.time, risk: Math.round(d.value) })), []);
  const densityData = useMemo(() => densityTrend.map(d => ({ time: d.time, density: parseFloat(d.value.toFixed(1)) })), []);
  const instabilityData = useMemo(() => instabilityTrend.map(d => ({ time: d.time, instability: Math.round(d.value) })), []);

  // Radar data from zones
  const radarData = useMemo(() => zones.map(z => ({
    zone: z.name.split('—')[0].trim(),
    risk: z.riskScore,
    density: Math.min(100, z.density * 10),
    instability: z.flowInstability,
  })), [zones]);

  return (
    <div className="space-y-4 animate-fade-in-up">
      {/* Time Range Selector */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-crowd-text-primary flex items-center gap-2">
          <BarChart3 size={16} className="text-crowd-cyan" />
          Crowd Analytics
        </h3>
        <div className="flex items-center gap-1 bg-crowd-surface rounded-lg p-0.5 border border-crowd-border">
          {TIME_RANGES.map(r => (
            <button
              key={r}
              onClick={() => setTimeRange(r)}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
                timeRange === r
                  ? 'bg-crowd-cyan/15 text-crowd-cyan'
                  : 'text-crowd-text-muted hover:text-crowd-text-secondary'
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* Main Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Risk Over Time */}
        <GlassCard>
          <h4 className="text-xs font-semibold text-crowd-text-secondary mb-3">Risk Score Over Time</h4>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={riskData}>
              <defs>
                <linearGradient id="analyticsRiskGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#FF3B5C" stopOpacity={0.25} />
                  <stop offset="100%" stopColor="#FF3B5C" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1E2D4A" />
              <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748B' }} interval="preserveStartEnd" />
              <YAxis domain={[0, 100]} axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748B' }} width={32} />
              <Tooltip {...CHART_TOOLTIP_STYLE} />
              <Area type="monotone" dataKey="risk" stroke="#FF3B5C" strokeWidth={2} fill="url(#analyticsRiskGrad)" dot={false} animationDuration={800} />
            </AreaChart>
          </ResponsiveContainer>
        </GlassCard>

        {/* Density Trend */}
        <GlassCard>
          <h4 className="text-xs font-semibold text-crowd-text-secondary mb-3">Crowd Density Trend</h4>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={densityData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1E2D4A" />
              <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748B' }} interval="preserveStartEnd" />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748B' }} width={32} />
              <Tooltip {...CHART_TOOLTIP_STYLE} />
              <Line type="monotone" dataKey="density" stroke="#00D4FF" strokeWidth={2} dot={false} animationDuration={800} />
            </LineChart>
          </ResponsiveContainer>
        </GlassCard>

        {/* Movement Instability */}
        <GlassCard>
          <h4 className="text-xs font-semibold text-crowd-text-secondary mb-3">Movement Instability</h4>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={instabilityData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1E2D4A" />
              <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748B' }} interval={4} />
              <YAxis domain={[0, 100]} axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748B' }} width={32} />
              <Tooltip {...CHART_TOOLTIP_STYLE} />
              <Bar dataKey="instability" fill="#FFB800" radius={[2, 2, 0, 0]} animationDuration={800} />
            </BarChart>
          </ResponsiveContainer>
        </GlassCard>

        {/* Zone Comparison Radar */}
        <GlassCard>
          <h4 className="text-xs font-semibold text-crowd-text-secondary mb-3">Zone Risk Comparison</h4>
          <ResponsiveContainer width="100%" height={220}>
            <RadarChart data={radarData}>
              <PolarGrid stroke="#1E2D4A" />
              <PolarAngleAxis dataKey="zone" tick={{ fontSize: 10, fill: '#94A3B8' }} />
              <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
              <Radar name="Risk" dataKey="risk" stroke="#FF3B5C" fill="#FF3B5C" fillOpacity={0.15} strokeWidth={2} />
              <Radar name="Density" dataKey="density" stroke="#00D4FF" fill="#00D4FF" fillOpacity={0.1} strokeWidth={2} />
              <Radar name="Instability" dataKey="instability" stroke="#FFB800" fill="#FFB800" fillOpacity={0.1} strokeWidth={2} />
              <Legend
                wrapperStyle={{ fontSize: 10, color: '#94A3B8' }}
              />
            </RadarChart>
          </ResponsiveContainer>
        </GlassCard>
      </div>

      {/* Zone Breakdown Table */}
      <GlassCard>
        <h4 className="text-xs font-semibold text-crowd-text-secondary mb-3">Zone Breakdown</h4>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-crowd-border">
                <th className="text-left py-2 text-crowd-text-muted font-medium">Zone</th>
                <th className="text-right py-2 text-crowd-text-muted font-medium">Risk</th>
                <th className="text-right py-2 text-crowd-text-muted font-medium">Density</th>
                <th className="text-right py-2 text-crowd-text-muted font-medium">Flow %</th>
                <th className="text-right py-2 text-crowd-text-muted font-medium">Panic %</th>
                <th className="text-right py-2 text-crowd-text-muted font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-crowd-border/50">
              {zones.map(z => {
                const risk = z.riskScore > 65 ? 'text-crowd-danger' : z.riskScore > 40 ? 'text-crowd-warning' : 'text-crowd-safe';
                return (
                  <tr key={z.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="py-2.5 text-crowd-text-primary font-medium">{z.name}</td>
                    <td className={`py-2.5 text-right font-mono font-bold ${risk}`}>{z.riskScore}</td>
                    <td className="py-2.5 text-right font-mono text-crowd-text-secondary">{z.density}</td>
                    <td className="py-2.5 text-right font-mono text-crowd-text-secondary">{z.flowInstability}%</td>
                    <td className="py-2.5 text-right font-mono text-crowd-text-secondary">{z.panicLevel}%</td>
                    <td className="py-2.5 text-right">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase ${
                        z.status === 'danger' ? 'bg-crowd-danger/15 text-crowd-danger' :
                        z.status === 'warning' ? 'bg-crowd-warning/15 text-crowd-warning' :
                        'bg-crowd-safe/15 text-crowd-safe'
                      }`}>
                        {z.status}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </GlassCard>
    </div>
  );
}
