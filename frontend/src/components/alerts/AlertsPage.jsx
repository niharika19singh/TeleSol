// ═══════════════════════════════════════════════════════
// CrowdShield — Alerts Page
// Full alert history with severity filters
// ═══════════════════════════════════════════════════════

import { useState, useMemo } from 'react';
import { AlertTriangle, AlertOctagon, Info, ArrowRight, Filter } from 'lucide-react';
import GlassCard from '../shared/GlassCard';
import StatusDot from '../shared/StatusDot';
import { getRiskLevel } from '../../data/mockData';

const SEVERITY_OPTIONS = ['all', 'critical', 'warning', 'info'];

function formatTimestamp(ts) {
  return new Date(ts).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function formatTimeAgo(ts) {
  const diff = Math.floor((Date.now() - ts) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  return `${Math.floor(diff / 3600)}h ago`;
}

export default function AlertsPage({ alerts, zones }) {
  const [filter, setFilter] = useState('all');
  const [selectedZoneFilter, setSelectedZoneFilter] = useState('all');

  const filteredAlerts = useMemo(() => {
    return alerts.filter(a => {
      if (filter !== 'all' && a.severity !== filter) return false;
      if (selectedZoneFilter !== 'all' && a.zoneId !== selectedZoneFilter) return false;
      return true;
    });
  }, [alerts, filter, selectedZoneFilter]);

  const stats = useMemo(() => ({
    critical: alerts.filter(a => a.severity === 'critical').length,
    warning: alerts.filter(a => a.severity === 'warning').length,
    info: alerts.filter(a => a.severity === 'info').length,
  }), [alerts]);

  const severityConfig = {
    critical: { icon: AlertOctagon, color: 'text-crowd-danger', bg: 'bg-crowd-danger/10', border: 'border-l-crowd-danger', dot: 'danger' },
    warning: { icon: AlertTriangle, color: 'text-crowd-warning', bg: 'bg-crowd-warning/10', border: 'border-l-crowd-warning', dot: 'warning' },
    info: { icon: Info, color: 'text-crowd-cyan', bg: 'bg-crowd-cyan/10', border: 'border-l-crowd-cyan', dot: 'active' },
  };

  return (
    <div className="space-y-4 animate-fade-in-up">
      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-3">
        <GlassCard glow="red">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] text-crowd-text-muted uppercase tracking-wider">Critical</p>
              <p className="text-2xl font-bold font-display text-crowd-danger">{stats.critical}</p>
            </div>
            <AlertOctagon size={24} className="text-crowd-danger/40" />
          </div>
        </GlassCard>
        <GlassCard glow="warning">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] text-crowd-text-muted uppercase tracking-wider">Warning</p>
              <p className="text-2xl font-bold font-display text-crowd-warning">{stats.warning}</p>
            </div>
            <AlertTriangle size={24} className="text-crowd-warning/40" />
          </div>
        </GlassCard>
        <GlassCard glow="cyan">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] text-crowd-text-muted uppercase tracking-wider">Info</p>
              <p className="text-2xl font-bold font-display text-crowd-cyan">{stats.info}</p>
            </div>
            <Info size={24} className="text-crowd-cyan/40" />
          </div>
        </GlassCard>
      </div>

      {/* Filters */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Filter size={14} className="text-crowd-text-muted" />
          <div className="flex items-center gap-1 bg-crowd-surface rounded-lg p-0.5 border border-crowd-border">
            {SEVERITY_OPTIONS.map(opt => (
              <button
                key={opt}
                onClick={() => setFilter(opt)}
                className={`px-3 py-1 rounded-md text-xs font-medium capitalize transition-all ${
                  filter === opt
                    ? opt === 'critical' ? 'bg-crowd-danger/15 text-crowd-danger'
                    : opt === 'warning' ? 'bg-crowd-warning/15 text-crowd-warning'
                    : opt === 'info' ? 'bg-crowd-cyan/15 text-crowd-cyan'
                    : 'bg-white/5 text-crowd-text-primary'
                    : 'text-crowd-text-muted hover:text-crowd-text-secondary'
                }`}
              >
                {opt}
              </button>
            ))}
          </div>
        </div>
        <select
          value={selectedZoneFilter}
          onChange={(e) => setSelectedZoneFilter(e.target.value)}
          className="bg-crowd-surface border border-crowd-border rounded-lg px-3 py-1.5 text-xs text-crowd-text-secondary outline-none focus:border-crowd-cyan/40"
        >
          <option value="all">All Zones</option>
          {zones.map(z => (
            <option key={z.id} value={z.id}>{z.name.split('—')[0].trim()}</option>
          ))}
        </select>
      </div>

      {/* Alert List */}
      <div className="space-y-2">
        {filteredAlerts.map(alert => {
          const config = severityConfig[alert.severity] || severityConfig.info;
          const Icon = config.icon;
          const risk = getRiskLevel(alert.riskScore);

          return (
            <GlassCard key={alert.id} className={`border-l-2 ${config.border} !rounded-l-none animate-fade-in-up`}>
              <div className="flex items-start gap-3">
                <div className={`p-2 rounded-lg ${config.bg} flex-shrink-0`}>
                  <Icon size={16} className={config.color} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-sm font-semibold ${config.color}`}>{alert.zone}</span>
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold" style={{ color: risk.color, backgroundColor: risk.bg }}>
                      {alert.riskScore}/100
                    </span>
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase ${config.bg} ${config.color}`}>
                      {alert.severity}
                    </span>
                  </div>
                  <p className="text-sm text-crowd-text-secondary">{alert.message}</p>
                  {alert.action && (
                    <div className="flex items-center gap-1.5 mt-2 text-xs text-crowd-text-muted bg-crowd-bg/50 rounded-lg px-3 py-1.5">
                      <ArrowRight size={12} className="text-crowd-cyan flex-shrink-0" />
                      <span>{alert.action}</span>
                    </div>
                  )}
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-[10px] font-mono text-crowd-text-muted">{formatTimestamp(alert.timestamp)}</p>
                  <p className="text-[10px] text-crowd-text-muted">{formatTimeAgo(alert.timestamp)}</p>
                </div>
              </div>
            </GlassCard>
          );
        })}
        {filteredAlerts.length === 0 && (
          <div className="text-center py-12 text-crowd-text-muted">
            <div className="text-4xl mb-3">🔍</div>
            <p className="text-sm">No alerts match your filters</p>
          </div>
        )}
      </div>
    </div>
  );
}
