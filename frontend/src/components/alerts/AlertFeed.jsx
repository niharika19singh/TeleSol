// ═══════════════════════════════════════════════════════
// SENPAY — Operational Alert & Incident Feed Component
// Compact scrollable telecom event stream with flight-strip styling
// ═══════════════════════════════════════════════════════

import React, { useRef, useEffect } from 'react';
import { AlertTriangle, AlertOctagon, Info, ArrowRight, Radio, Shield } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

function formatTime(ts) {
  if (!ts) return 'just now';
  const diff = Math.floor((Date.now() - ts) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  return `${Math.floor(diff / 3600)}h ago`;
}

function AlertItem({ alert, compact = false, onSelectIncident }) {
  const isCritical = alert.severity === 'critical' || alert.severity === 'danger';
  const isWarning = alert.severity === 'warning';

  return (
    <div
      onClick={() => onSelectIncident && onSelectIncident(alert)}
      className={`
        border-l-[3px] rounded-r-md p-2.5 transition-all duration-200 cursor-pointer
        font-mono text-xs
        ${
          isCritical
            ? 'border-l-senpay-red bg-senpay-panel hover:bg-senpay-elevated shadow-sm'
            : isWarning
            ? 'border-l-senpay-amber bg-senpay-panel hover:bg-senpay-elevated'
            : 'border-l-senpay-cyan bg-senpay-panel hover:bg-senpay-elevated'
        }
      `}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          {isCritical ? (
            <AlertOctagon size={13} className="text-senpay-red flex-shrink-0 noc-pulse-subtle" />
          ) : isWarning ? (
            <AlertTriangle size={13} className="text-senpay-amber flex-shrink-0" />
          ) : (
            <Info size={13} className="text-senpay-cyan flex-shrink-0" />
          )}
          <span className="font-bold text-senpay-text-primary text-[11px] truncate">
            {alert.zone || alert.zoneId || 'Sector Zone'}
          </span>
          <span
            className={`text-[9.5px] px-1.5 py-0.2 rounded font-bold ${
              isCritical
                ? 'bg-senpay-red/15 text-senpay-red border border-senpay-red/30'
                : isWarning
                ? 'bg-senpay-amber/15 text-senpay-amber border border-senpay-amber/30'
                : 'bg-senpay-cyan/15 text-senpay-cyan border border-senpay-cyan/30'
            }`}
          >
            CRS {alert.riskScore || 0}
          </span>
        </div>
        <span className="text-[10px] text-senpay-text-muted flex-shrink-0">
          {formatTime(alert.timestamp)}
        </span>
      </div>

      <p className="text-[11px] text-senpay-text-secondary mt-1 font-sans leading-snug line-clamp-2">
        {alert.message}
      </p>

      {!compact && alert.action && (
        <div className="flex items-center gap-1.5 mt-2 pt-1.5 border-t border-senpay-border/60 text-[10px] text-senpay-cyan font-mono">
          <ArrowRight size={10} />
          <span className="truncate">{alert.action}</span>
        </div>
      )}
    </div>
  );
}

export default function AlertFeed({
  alerts = [],
  maxItems = 20,
  compact = false,
  title = 'Real-Time Operational Alerts',
  onSelectIncident,
}) {
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = 0;
    }
  }, [alerts.length]);

  const criticalCount = alerts.filter(
    (a) => a.severity === 'critical' || a.severity === 'danger'
  ).length;

  return (
    <div className="senpay-card p-3.5 h-full flex flex-col justify-between overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 mb-2 border-b border-senpay-border flex-shrink-0">
        <div className="flex items-center gap-2">
          <Radio size={13} className="text-senpay-cyan animate-pulse" />
          <h3 className="text-xs font-mono font-bold text-senpay-text-primary tracking-wider uppercase">
            {title}
          </h3>
          {criticalCount > 0 && (
            <span className="px-2 py-0.5 text-[9.5px] font-mono font-bold rounded bg-senpay-red/15 text-senpay-red border border-senpay-red/40">
              {criticalCount} Critical
            </span>
          )}
        </div>
        <span className="text-[10px] font-mono text-senpay-text-muted">
          {alerts.length} events
        </span>
      </div>

      {/* Alert List */}
      <div
        ref={scrollRef}
        className="flex-1 space-y-2 overflow-y-auto pr-1"
        style={{ maxHeight: compact ? 300 : undefined }}
      >
        {alerts.slice(0, maxItems).map((alert, idx) => (
          <AlertItem
            key={alert.id || idx}
            alert={alert}
            compact={compact}
            onSelectIncident={onSelectIncident}
          />
        ))}

        {alerts.length === 0 && (
          <div className="p-6 text-center text-senpay-text-muted font-mono text-xs">
            <Radio size={20} className="mx-auto mb-2 opacity-40 text-senpay-cyan" />
            <span>Telemetry nominal &bull; No active incidents</span>
          </div>
        )}
      </div>

      {/* Footer Status */}
      <div className="pt-2 mt-2 border-t border-senpay-border flex items-center justify-between text-[10px] font-mono text-senpay-text-muted flex-shrink-0">
        <span>Sentinel Daemon Stream</span>
        <span className="text-senpay-green font-semibold">&bull; Active Telemetry</span>
      </div>
    </div>
  );
}
