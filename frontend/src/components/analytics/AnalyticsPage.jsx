// ═══════════════════════════════════════════════════════
// SENPAY — Network Operations Telemetry & Risk Analytics
// Telecom KPI trends, PRB utilization, latency, and predictive risk
// ═══════════════════════════════════════════════════════

import { useState, useMemo } from 'react';
import {
  AreaChart, Area, LineChart, Line, BarChart, Bar,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis
} from 'recharts';
import { BarChart3, Clock, Radio, Activity, TrendingUp, Cpu, ShieldCheck } from 'lucide-react';
import { riskOverTime, densityTrend, instabilityTrend } from '../../data/mockData';

const TIME_RANGES = ['5min', '15min', '1hr', '24hr'];

export default function AnalyticsPage({ zones = [] }) {
  const [timeRange, setTimeRange] = useState('15min');

  const riskData = useMemo(() => riskOverTime.map(d => ({ time: d.time, risk: Math.round(d.value) })), []);
  const utilizationData = useMemo(() => densityTrend.map(d => ({ time: d.time, prbUtilization: parseFloat((d.value * 10).toFixed(1)) })), []);
  const packetLossData = useMemo(() => instabilityTrend.map(d => ({ time: d.time, packetLoss: parseFloat((d.value * 0.12).toFixed(2)) })), []);

  // Radar data from telecom zones/sectors
  const radarData = useMemo(() => {
    if (!zones || zones.length === 0) {
      return [
        { zone: 'SEC-VIP-C1', crs: 82, prb: 91, loss: 4.8 },
        { zone: 'BS-WEST-02', crs: 58, prb: 64, loss: 1.9 },
        { zone: 'EAST-IND-04', crs: 34, prb: 42, loss: 0.6 },
        { zone: 'STADIUM-01', crs: 76, prb: 88, loss: 3.9 },
        { zone: 'METRO-CENTRAL', crs: 69, prb: 78, loss: 2.7 }
      ];
    }
    return zones.map(z => ({
      zone: (z.name || z.site_id || z.id || '').split('—')[0].trim(),
      crs: Number.isFinite(z.riskScore) ? z.riskScore : (z.metrics?.crs ?? 45),
      prb: Math.min(100, Math.round((z.density || z.metrics?.prb_utilization || 5) * 10)),
      loss: Math.round(z.flowInstability || z.metrics?.packet_loss_pct || 2),
    }));
  }, [zones]);

  return (
    <div className="space-y-4 animate-fade-in-up">
      {/* ── Page Header & Flight Strip Time Range Bar ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-senpay-border">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-senpay-text-primary tracking-wide uppercase font-mono flex items-center gap-2">
              <BarChart3 size={16} className="text-senpay-cyan" />
              <span>Network Operations & Risk Analytics</span>
            </h2>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-senpay-cyan/15 text-senpay-cyan border border-senpay-cyan/30">
              TELEMETRY ENGINE
            </span>
          </div>
          <p className="text-xs text-senpay-text-muted mt-0.5">
            Temporal telemetry aggregation, radio resource block utilization, packet loss drift, and multi-sector radar profiling
          </p>
        </div>

        {/* Time Range Selector */}
        <div className="flex items-center gap-1 bg-senpay-panel rounded-lg p-1 border border-senpay-border self-start sm:self-auto font-mono text-xs">
          <Clock size={12} className="text-senpay-text-muted ml-1 mr-0.5" />
          {TIME_RANGES.map(r => (
            <button
              key={r}
              onClick={() => setTimeRange(r)}
              className={`px-3 py-1 rounded text-xs font-semibold transition ${
                timeRange === r
                  ? 'bg-senpay-card text-senpay-cyan border border-senpay-cyan/40 shadow-sm'
                  : 'text-senpay-text-muted hover:text-senpay-text-secondary border border-transparent'
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* ── Main Charts Grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Risk Over Time */}
        <div className="p-4 rounded-xl bg-senpay-card border border-senpay-border shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-xs font-bold text-senpay-text-secondary uppercase tracking-wider font-mono flex items-center gap-1.5">
              <TrendingUp size={13} className="text-senpay-rose" />
              <span>Aggregate Congestion Risk Score (CRS)</span>
            </h4>
            <span className="text-[10px] font-mono text-senpay-text-muted">Critical Threshold: 75</span>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={riskData}>
              <defs>
                <linearGradient id="analyticsRiskGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--senpay-red)" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="var(--senpay-red)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--senpay-border)" opacity={0.6} />
              <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'var(--senpay-text-muted)' }} interval="preserveStartEnd" />
              <YAxis domain={[0, 100]} axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'var(--senpay-text-muted)' }} width={32} />
              <Tooltip
                contentStyle={{
                  background: 'var(--senpay-card)',
                  borderColor: 'var(--senpay-border)',
                  borderRadius: '8px',
                  fontSize: '11px',
                  color: 'var(--senpay-text-primary)'
                }}
              />
              <Area type="monotone" dataKey="risk" stroke="var(--senpay-red)" strokeWidth={2} fill="url(#analyticsRiskGrad)" dot={false} animationDuration={600} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* PRB Resource Block Utilization */}
        <div className="p-4 rounded-xl bg-senpay-card border border-senpay-border shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-xs font-bold text-senpay-text-secondary uppercase tracking-wider font-mono flex items-center gap-1.5">
              <Radio size={13} className="text-senpay-cyan" />
              <span>PRB Resource Block Utilization (%)</span>
            </h4>
            <span className="text-[10px] font-mono text-senpay-text-muted">Target SLA: &lt;80%</span>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={utilizationData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--senpay-border)" opacity={0.6} />
              <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'var(--senpay-text-muted)' }} interval="preserveStartEnd" />
              <YAxis domain={[0, 100]} axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'var(--senpay-text-muted)' }} width={32} />
              <Tooltip
                contentStyle={{
                  background: 'var(--senpay-card)',
                  borderColor: 'var(--senpay-border)',
                  borderRadius: '8px',
                  fontSize: '11px',
                  color: 'var(--senpay-text-primary)'
                }}
              />
              <Line type="monotone" dataKey="prbUtilization" stroke="var(--senpay-cyan)" strokeWidth={2} dot={false} animationDuration={600} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Packet Loss Drift */}
        <div className="p-4 rounded-xl bg-senpay-card border border-senpay-border shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-xs font-bold text-senpay-text-secondary uppercase tracking-wider font-mono flex items-center gap-1.5">
              <Activity size={13} className="text-senpay-amber" />
              <span>Packet Loss Instability Rate (%)</span>
            </h4>
            <span className="text-[10px] font-mono text-senpay-text-muted">Max Tolerable: 2.0%</span>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={packetLossData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--senpay-border)" opacity={0.6} />
              <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'var(--senpay-text-muted)' }} interval={4} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'var(--senpay-text-muted)' }} width={32} />
              <Tooltip
                contentStyle={{
                  background: 'var(--senpay-card)',
                  borderColor: 'var(--senpay-border)',
                  borderRadius: '8px',
                  fontSize: '11px',
                  color: 'var(--senpay-text-primary)'
                }}
              />
              <Bar dataKey="packetLoss" fill="var(--senpay-amber)" radius={[2, 2, 0, 0]} animationDuration={600} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Multi-Sector Comparison Radar */}
        <div className="p-4 rounded-xl bg-senpay-card border border-senpay-border shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-xs font-bold text-senpay-text-secondary uppercase tracking-wider font-mono flex items-center gap-1.5">
              <Cpu size={13} className="text-senpay-cyan" />
              <span>Multi-Sector Congestion & Load Profile</span>
            </h4>
            <span className="text-[10px] font-mono text-senpay-text-muted">Normalized Metrics</span>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <RadarChart data={radarData}>
              <PolarGrid stroke="var(--senpay-border)" opacity={0.6} />
              <PolarAngleAxis dataKey="zone" tick={{ fontSize: 10, fill: 'var(--senpay-text-secondary)' }} />
              <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
              <Radar name="CRS" dataKey="crs" stroke="var(--senpay-red)" fill="var(--senpay-red)" fillOpacity={0.15} strokeWidth={2} />
              <Radar name="PRB Load" dataKey="prb" stroke="var(--senpay-cyan)" fill="var(--senpay-cyan)" fillOpacity={0.12} strokeWidth={2} />
              <Radar name="Loss %" dataKey="loss" stroke="var(--senpay-amber)" fill="var(--senpay-amber)" fillOpacity={0.12} strokeWidth={2} />
              <Legend
                wrapperStyle={{ fontSize: 10, color: 'var(--senpay-text-secondary)' }}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── Sector Breakdown Table ── */}
      <div className="p-4 rounded-xl bg-senpay-card border border-senpay-border shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-xs font-bold text-senpay-text-secondary uppercase tracking-wider font-mono flex items-center gap-1.5">
            <ShieldCheck size={13} className="text-senpay-cyan" />
            <span>Active Sector Telemetry Breakdown</span>
          </h4>
          <span className="text-[10px] font-mono text-senpay-text-muted">
            {zones.length || 5} Sectors Monitored
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs font-mono">
            <thead>
              <tr className="border-b border-senpay-border text-senpay-text-muted text-[10px] uppercase">
                <th className="text-left py-2 font-semibold">Sector / Mast</th>
                <th className="text-right py-2 font-semibold">CRS Risk</th>
                <th className="text-right py-2 font-semibold">PRB Load</th>
                <th className="text-right py-2 font-semibold">Throughput</th>
                <th className="text-right py-2 font-semibold">Packet Loss</th>
                <th className="text-right py-2 font-semibold">SLA Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-senpay-border/40">
              {(zones.length > 0 ? zones : [
                { id: '1', name: 'SEC-VIP-C1 (Central Hub)', riskScore: 82, density: 9.1, flowInstability: 4.8, panicLevel: 4.8, status: 'danger' },
                { id: '2', name: 'BS-WEST-02 (West Sector)', riskScore: 58, density: 6.4, flowInstability: 1.9, panicLevel: 1.9, status: 'warning' },
                { id: '3', name: 'EAST-IND-04 (East Industrial)', riskScore: 34, density: 4.2, flowInstability: 0.6, panicLevel: 0.6, status: 'safe' },
                { id: '4', name: 'STADIUM-01 (Stadium Macro)', riskScore: 76, density: 8.8, flowInstability: 3.9, panicLevel: 3.9, status: 'danger' },
                { id: '5', name: 'METRO-CENTRAL (Underground)', riskScore: 69, density: 7.8, flowInstability: 2.7, panicLevel: 2.7, status: 'warning' },
              ]).map(z => {
                const crs = Number.isFinite(z.riskScore) ? z.riskScore : 45;
                const riskColor = crs > 70 ? 'text-senpay-rose' : crs > 40 ? 'text-senpay-amber' : 'text-senpay-cyan';
                const status = z.status || (crs > 70 ? 'critical' : crs > 40 ? 'warning' : 'nominal');
                const throughput = (950 - crs * 8.5).toFixed(0);

                return (
                  <tr key={z.id} className="hover:bg-senpay-panel/50 transition">
                    <td className="py-2.5 text-senpay-text-primary font-semibold">{z.name}</td>
                    <td className={`py-2.5 text-right font-bold ${riskColor}`}>{crs}</td>
                    <td className="py-2.5 text-right text-senpay-text-secondary">{(z.density * 10).toFixed(0)}%</td>
                    <td className="py-2.5 text-right text-senpay-text-secondary">{throughput} Mbps</td>
                    <td className="py-2.5 text-right text-senpay-text-secondary">{z.flowInstability}%</td>
                    <td className="py-2.5 text-right">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        status === 'danger' || status === 'critical' ? 'bg-senpay-rose/15 text-senpay-rose border border-senpay-rose/30' :
                        status === 'warning' ? 'bg-senpay-amber/15 text-senpay-amber border border-senpay-amber/30' :
                        'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                      }`}>
                        {status}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
