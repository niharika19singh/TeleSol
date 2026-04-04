// ═══════════════════════════════════════════════════════
// CrowdShield — Alert Feed Component
// Compact scrollable alert list with slide-in animation
// ═══════════════════════════════════════════════════════

import { useRef, useEffect } from 'react';
import { AlertTriangle, AlertOctagon, Info, ArrowRight } from 'lucide-react';
import StatusDot from '../shared/StatusDot';

function formatTime(ts) {
  const diff = Math.floor((Date.now() - ts) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  return `${Math.floor(diff / 3600)}h ago`;
}

function AlertItem({ alert, compact = false }) {
  const severityConfig = {
    critical: {
      icon: AlertOctagon,
      color: 'text-crowd-danger',
      bg: 'bg-crowd-danger/10',
      border: 'border-l-crowd-danger',
      dot: 'danger',
    },
    warning: {
      icon: AlertTriangle,
      color: 'text-crowd-warning',
      bg: 'bg-crowd-warning/10',
      border: 'border-l-crowd-warning',
      dot: 'warning',
    },
    info: {
      icon: Info,
      color: 'text-crowd-cyan',
      bg: 'bg-crowd-cyan/10',
      border: 'border-l-crowd-cyan',
      dot: 'active',
    },
  };

  const config = severityConfig[alert.severity] || severityConfig.info;
  const Icon = config.icon;

  return (
    <div className={`animate-fade-in-up border-l-2 ${config.border} ${config.bg} rounded-r-lg p-3 transition-all hover:brightness-110`}>
      <div className="flex items-start gap-2">
        <Icon size={14} className={`${config.color} mt-0.5 flex-shrink-0`} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className={`text-xs font-semibold ${config.color}`}>{alert.zone}</span>
            <span className="font-mono text-[10px] text-crowd-text-muted">{alert.riskScore}/100</span>
          </div>
          <p className="text-xs text-crowd-text-secondary leading-relaxed">{alert.message}</p>
          {!compact && alert.action && (
            <div className="flex items-center gap-1 mt-1.5 text-[10px] text-crowd-text-muted">
              <ArrowRight size={10} />
              <span>{alert.action}</span>
            </div>
          )}
        </div>
        <span className="text-[10px] text-crowd-text-muted flex-shrink-0 font-mono">{formatTime(alert.timestamp)}</span>
      </div>
    </div>
  );
}

export default function AlertFeed({ alerts, maxItems = 20, compact = false, title = 'Live Alerts' }) {
  const scrollRef = useRef(null);

  // Auto-scroll to top on new alerts
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = 0;
    }
  }, [alerts.length]);

  const criticalCount = alerts.filter(a => a.severity === 'critical').length;

  return (
    <div className="glass-card p-4 h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-3 flex-shrink-0">
        <div className="flex items-center gap-2">
          <StatusDot status={criticalCount > 0 ? 'danger' : 'safe'} size="sm" />
          <h3 className="text-sm font-semibold text-crowd-text-primary">{title}</h3>
          {criticalCount > 0 && (
            <span className="px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-crowd-danger/20 text-crowd-danger">
              {criticalCount} Critical
            </span>
          )}
        </div>
        <span className="text-[10px] text-crowd-text-muted">{alerts.length} total</span>
      </div>

      {/* Alert List */}
      <div
        ref={scrollRef}
        className="flex-1 space-y-2 overflow-y-auto min-h-0"
        style={{ maxHeight: compact ? 300 : undefined }}
      >
        {alerts.slice(0, maxItems).map(alert => (
          <AlertItem key={alert.id} alert={alert} compact={compact} />
        ))}
        {alerts.length === 0 && (
          <div className="text-center py-8 text-crowd-text-muted text-sm">
            <div className="text-3xl mb-2">✓</div>
            <p>All clear — no active alerts</p>
          </div>
        )}
      </div>
    </div>
  );
}
