// ═══════════════════════════════════════════════════════
// CrowdShield — KPI Card Component
// Large metric display with icon, trend, and status color
// ═══════════════════════════════════════════════════════

import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

export default function KPICard({ icon: Icon, label, value, unit = '', trend = 'stable', color = 'cyan' }) {
  const colorMap = {
    cyan: { text: 'text-crowd-cyan', bg: 'bg-crowd-cyan/10', border: 'border-crowd-cyan/20', glow: 'shadow-[0_0_15px_rgba(0,212,255,0.1)]' },
    green: { text: 'text-crowd-safe', bg: 'bg-crowd-safe/10', border: 'border-crowd-safe/20', glow: 'shadow-[0_0_15px_rgba(0,255,136,0.1)]' },
    red: { text: 'text-crowd-danger', bg: 'bg-crowd-danger/10', border: 'border-crowd-danger/20', glow: 'shadow-[0_0_15px_rgba(255,59,92,0.1)]' },
    warning: { text: 'text-crowd-warning', bg: 'bg-crowd-warning/10', border: 'border-crowd-warning/20', glow: 'shadow-[0_0_15px_rgba(255,184,0,0.1)]' },
    purple: { text: 'text-crowd-purple', bg: 'bg-crowd-purple/10', border: 'border-crowd-purple/20', glow: 'shadow-[0_0_15px_rgba(168,85,247,0.1)]' },
  };

  const c = colorMap[color] || colorMap.cyan;

  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;
  const trendColor = trend === 'up' ? 'text-crowd-danger' : trend === 'down' ? 'text-crowd-safe' : 'text-crowd-text-muted';

  return (
    <div className={`glass-card p-4 ${c.border} border ${c.glow} animate-fade-in-up`}>
      <div className="flex items-start justify-between mb-3">
        <div className={`p-2 rounded-lg ${c.bg}`}>
          {Icon && <Icon size={18} className={c.text} />}
        </div>
        <div className={`flex items-center gap-1 ${trendColor}`}>
          <TrendIcon size={14} />
          <span className="text-xs font-medium">
            {trend === 'up' ? '↑' : trend === 'down' ? '↓' : '—'}
          </span>
        </div>
      </div>
      <div className="space-y-1">
        <p className="text-xs font-medium text-crowd-text-muted uppercase tracking-wider">{label}</p>
        <div className="flex items-baseline gap-1">
          <span className={`text-2xl font-bold font-display ${c.text}`}>{value}</span>
          {unit && <span className="text-sm text-crowd-text-muted">{unit}</span>}
        </div>
      </div>
    </div>
  );
}
