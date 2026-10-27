// ═══════════════════════════════════════════════════════
// CrowdShield — KPI Card Component
// Large metric display with icon, trend, and status color
// ═══════════════════════════════════════════════════════

import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

export default function KPICard({ icon: Icon, label, value, unit = '', trend = 'stable', color = 'cyan' }) {
  const colorMap = {
    cyan: { text: 'text-senpay-cyan', bg: 'bg-senpay-cyan/10', border: 'border-senpay-cyan/30', glow: 'shadow-[0_0_15px_rgba(0,229,255,0.12)]' },
    green: { text: 'text-senpay-green', bg: 'bg-senpay-green/10', border: 'border-senpay-green/30', glow: 'shadow-[0_0_15px_rgba(0,255,136,0.12)]' },
    red: { text: 'text-senpay-red', bg: 'bg-senpay-red/10', border: 'border-senpay-red/30', glow: 'shadow-[0_0_15px_rgba(255,59,92,0.12)]' },
    warning: { text: 'text-senpay-amber', bg: 'bg-senpay-amber/10', border: 'border-senpay-amber/30', glow: 'shadow-[0_0_15px_rgba(255,184,0,0.12)]' },
    purple: { text: 'text-senpay-violet', bg: 'bg-senpay-violet/10', border: 'border-senpay-violet/30', glow: 'shadow-[0_0_15px_rgba(168,85,247,0.12)]' },
  };

  const c = colorMap[color] || colorMap.cyan;

  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;
  const trendColor = trend === 'up' ? 'text-senpay-red' : trend === 'down' ? 'text-senpay-green' : 'text-senpay-text-muted';

  return (
    <div className={`bg-[#151F2A] rounded-xl p-4 ${c.border} border ${c.glow} animate-fade-in-up shadow-[0_4px_20px_rgba(0,0,0,0.4)]`}>
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
        <p className="text-xs font-mono font-medium text-senpay-text-muted uppercase tracking-wider">{label}</p>
        <div className="flex items-baseline gap-1">
          <span className={`text-2xl font-bold font-display ${c.text}`}>{value}</span>
          {unit && <span className="text-sm font-mono text-senpay-text-muted">{unit}</span>}
        </div>
      </div>
    </div>
  );
}
