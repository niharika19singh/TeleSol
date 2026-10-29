// ═══════════════════════════════════════════════════════
// SENPAY — Active Incident Monitoring & Event Log
// Professional Telecom NOC Incident Management & Flight-Strip Architecture
// Grounded in Network Topology, CRS Thresholds, and PayPilot Mitigation
// ═══════════════════════════════════════════════════════

import React, { useState, useMemo } from 'react';
import {
  AlertTriangle,
  AlertOctagon,
  Info,
  ArrowRight,
  Filter,
  Radio,
  Activity,
  Shield,
  Clock,
  ChevronRight,
  Layers,
  Zap,
  CheckCircle2,
  Cpu
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { getRiskLevel } from '../../data/mockData';

const SEVERITY_OPTIONS = ['all', 'critical', 'warning', 'info'];

function formatTimestamp(ts) {
  if (!ts) return '18:41:10 UTC';
  return new Date(ts).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    timeZoneName: 'short'
  });
}

function formatTimeAgo(ts) {
  if (!ts) return '14m ago';
  const diff = Math.floor((Date.now() - ts) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  return `${Math.floor(diff / 3600)}h ago`;
}

export default function AlertsPage({ alerts = [], zones = [], onSelectIncidentForMitigation }) {
  const { isLight } = useTheme();
  const [filter, setFilter] = useState('all');
  const [selectedZoneFilter, setSelectedZoneFilter] = useState('all');
  const [expandedAlertId, setExpandedAlertId] = useState(null);

  const filteredAlerts = useMemo(() => {
    return alerts.filter((a) => {
      if (filter !== 'all' && a.severity !== filter) return false;
      if (selectedZoneFilter !== 'all' && a.zoneId !== selectedZoneFilter) return false;
      return true;
    });
  }, [alerts, filter, selectedZoneFilter]);

  const stats = useMemo(
    () => ({
      critical: alerts.filter((a) => a.severity === 'critical' || a.severity === 'danger').length,
      warning: alerts.filter((a) => a.severity === 'warning').length,
      info: alerts.filter((a) => a.severity === 'info').length,
    }),
    [alerts]
  );

  return (
    <div className="space-y-4 max-w-[1600px] mx-auto pb-8 font-sans animate-fade-in-up">
      {/* ── 1. Top Section Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-senpay-border/60">
        <div>
          <div className="text-[10px] font-mono text-senpay-text-muted uppercase tracking-wider mb-0.5">
            NETWORK OPERATIONS &bull; INCIDENT RADAR
          </div>
          <h1 className="text-xl font-bold font-display text-senpay-text-primary flex items-center gap-2">
            Active Incident Monitoring &amp; Event Stream
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <div className="px-2.5 py-1 rounded bg-senpay-panel border border-senpay-green/30 text-[11px] font-mono text-senpay-green font-bold flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-senpay-green animate-pulse" />
            <span>Continuous Probe Feed: 49.6 stats/s</span>
          </div>
        </div>
      </div>

      {/* ── 2. Operational Metrics Overview (Flight-Strip Header Stats) ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 font-mono">
        {/* Critical Card */}
        <div className="senpay-card p-3.5 border-l-[3px] border-l-senpay-red hover-elevate">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] text-senpay-text-muted uppercase tracking-wider">
                Critical SLA Violations (P1)
              </p>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl font-bold text-senpay-red">{stats.critical}</span>
                <span className="text-[10px] text-senpay-text-muted">CRS &gt; 65.0 Threshold</span>
              </div>
            </div>
            <div className="w-9 h-9 rounded bg-senpay-red/10 border border-senpay-red/30 flex items-center justify-center text-senpay-red">
              <AlertOctagon size={18} className="noc-pulse-subtle" />
            </div>
          </div>
        </div>

        {/* Warning Card */}
        <div className="senpay-card p-3.5 border-l-[3px] border-l-senpay-amber hover-elevate">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] text-senpay-text-muted uppercase tracking-wider">
                Elevated Risk Alerts (P2)
              </p>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl font-bold text-senpay-amber">{stats.warning}</span>
                <span className="text-[10px] text-senpay-text-muted">CRS 40.0 - 65.0</span>
              </div>
            </div>
            <div className="w-9 h-9 rounded bg-senpay-amber/10 border border-senpay-amber/30 flex items-center justify-center text-senpay-amber">
              <AlertTriangle size={18} />
            </div>
          </div>
        </div>

        {/* Nominal / Info Card */}
        <div className="senpay-card p-3.5 border-l-[3px] border-l-senpay-cyan hover-elevate">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] text-senpay-text-muted uppercase tracking-wider">
                Nominal Telemetry Probes
              </p>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl font-bold text-senpay-cyan">{stats.info}</span>
                <span className="text-[10px] text-senpay-text-muted">Active Baseline Scans</span>
              </div>
            </div>
            <div className="w-9 h-9 rounded bg-senpay-cyan/10 border border-senpay-cyan/30 flex items-center justify-center text-senpay-cyan">
              <Activity size={18} />
            </div>
          </div>
        </div>
      </div>

      {/* ── 3. Filters & Query Bar ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-lg bg-senpay-panel border border-senpay-border text-xs font-mono">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[10px] text-senpay-text-muted uppercase flex items-center gap-1">
            <Filter size={12} />
            <span>Severity:</span>
          </span>
          <div className="flex items-center gap-1 bg-senpay-card rounded p-0.5 border border-senpay-border">
            {SEVERITY_OPTIONS.map((opt) => {
              const isSelected = filter === opt;
              return (
                <button
                  key={opt}
                  onClick={() => setFilter(opt)}
                  className={`px-2.5 py-1 rounded text-[11px] font-bold uppercase transition ${
                    isSelected
                      ? opt === 'critical'
                        ? 'bg-senpay-red/15 text-senpay-red border border-senpay-red/40'
                        : opt === 'warning'
                        ? 'bg-senpay-amber/15 text-senpay-amber border border-senpay-amber/40'
                        : opt === 'info'
                        ? 'bg-senpay-cyan/15 text-senpay-cyan border border-senpay-cyan/40'
                        : 'bg-senpay-elevated text-senpay-text-primary border border-senpay-border'
                      : 'text-senpay-text-muted hover:text-senpay-text-primary'
                  }`}
                >
                  {opt}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[10px] text-senpay-text-muted uppercase">Sector / Node:</span>
          <select
            value={selectedZoneFilter}
            onChange={(e) => setSelectedZoneFilter(e.target.value)}
            className="bg-senpay-card border border-senpay-border rounded px-2.5 py-1 text-xs text-senpay-text-primary font-mono outline-none focus:border-senpay-cyan"
          >
            <option value="all">All Sectors &amp; Cells</option>
            {zones.map((z) => (
              <option key={z.id} value={z.id}>
                {z.name ? z.name.split('—')[0].trim() : z.id}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* ── 4. Flight-Strip Incident Stream ── */}
      <div className="space-y-2.5">
        {filteredAlerts.map((alert, idx) => {
          const isCritical = alert.severity === 'critical' || alert.severity === 'danger';
          const isWarning = alert.severity === 'warning';
          const isExpanded = expandedAlertId === (alert.id || idx);

          return (
            <div
              key={alert.id || idx}
              className={`
                senpay-card border-l-[3px] transition-all duration-200 overflow-hidden
                ${
                  isCritical
                    ? 'border-l-senpay-red'
                    : isWarning
                    ? 'border-l-senpay-amber'
                    : 'border-l-senpay-cyan'
                }
              `}
            >
              {/* Flight-Strip Summary Header */}
              <div
                onClick={() => setExpandedAlertId(isExpanded ? null : alert.id || idx)}
                className="p-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3 cursor-pointer hover:bg-senpay-panel/50 transition-colors"
              >
                {/* Left: Sector & Severity */}
                <div className="flex items-start md:items-center gap-3 min-w-0">
                  <div
                    className={`w-7 h-7 rounded flex items-center justify-center flex-shrink-0 ${
                      isCritical
                        ? 'bg-senpay-red/15 text-senpay-red border border-senpay-red/30'
                        : isWarning
                        ? 'bg-senpay-amber/15 text-senpay-amber border border-senpay-amber/30'
                        : 'bg-senpay-cyan/15 text-senpay-cyan border border-senpay-cyan/30'
                    }`}
                  >
                    {isCritical ? (
                      <AlertOctagon size={14} className="noc-pulse-subtle" />
                    ) : isWarning ? (
                      <AlertTriangle size={14} />
                    ) : (
                      <Info size={14} />
                    )}
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-3">
                    <span className="font-mono font-bold text-xs text-senpay-text-primary tracking-wide">
                      {alert.zone || alert.zoneId || 'Sector Zone'}
                    </span>
                    <span
                      className={`text-[9.5px] font-mono px-2 py-0.5 rounded font-bold uppercase w-fit ${
                        isCritical
                          ? 'bg-senpay-red/15 text-senpay-red border border-senpay-red/30'
                          : isWarning
                          ? 'bg-senpay-amber/15 text-senpay-amber border border-senpay-amber/30'
                          : 'bg-senpay-cyan/15 text-senpay-cyan border border-senpay-cyan/30'
                      }`}
                    >
                      {alert.severity} &bull; CRS {alert.riskScore || 0}
                    </span>
                    <span className="text-xs text-senpay-text-secondary truncate max-w-md hidden lg:inline">
                      {alert.message}
                    </span>
                  </div>
                </div>

                {/* Right: Timestamp & Action */}
                <div className="flex items-center gap-4 justify-between md:justify-end flex-shrink-0">
                  <div className="text-right text-[10px] font-mono text-senpay-text-muted">
                    <div>{formatTimestamp(alert.timestamp)}</div>
                    <div>{formatTimeAgo(alert.timestamp)}</div>
                  </div>
                  <ChevronRight
                    size={14}
                    className={`text-senpay-text-muted transition-transform duration-200 ${
                      isExpanded ? 'rotate-90 text-senpay-cyan' : ''
                    }`}
                  />
                </div>
              </div>

              {/* Progressive Disclosure: Expanded Technical Inspection Drawer */}
              {isExpanded && (
                <div className="px-4 pb-4 pt-2 border-t border-senpay-border/60 bg-senpay-panel/40 font-mono text-xs animate-drawer-enter">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 my-2">
                    <div className="p-2.5 rounded bg-senpay-card border border-senpay-border">
                      <span className="text-[10px] text-senpay-text-muted uppercase block">
                        Telemetry Diagnostics
                      </span>
                      <div className="mt-1 space-y-1 text-[11px]">
                        <div className="flex justify-between">
                          <span className="text-senpay-text-secondary">Congestion Index:</span>
                          <span className={isCritical ? 'text-senpay-red font-bold' : 'text-senpay-amber font-bold'}>
                            {alert.riskScore || 0} / 100
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-senpay-text-secondary">Packet Loss Rate:</span>
                          <span className="text-senpay-text-primary">
                            {isCritical ? '14.2% (Severe)' : '2.1% (Nominal)'}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-senpay-text-secondary">Downlink Latency:</span>
                          <span className="text-senpay-text-primary">
                            {isCritical ? '142 ms RTT' : '28 ms RTT'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="p-2.5 rounded bg-senpay-card border border-senpay-border">
                      <span className="text-[10px] text-senpay-text-muted uppercase block">
                        Network Route Provenance
                      </span>
                      <div className="mt-1 space-y-1 text-[11px]">
                        <div className="flex justify-between">
                          <span className="text-senpay-text-secondary">Serving Gateway:</span>
                          <span className="text-senpay-text-primary">GW-CORE-01</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-senpay-text-secondary">Base Station:</span>
                          <span className="text-senpay-text-primary">BS-WEST-02</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-senpay-text-secondary">Radio Carrier:</span>
                          <span className="text-senpay-cyan">n78 5G URLLC</span>
                        </div>
                      </div>
                    </div>

                    <div className="p-2.5 rounded bg-senpay-card border border-senpay-border flex flex-col justify-between">
                      <div>
                        <span className="text-[10px] text-senpay-text-muted uppercase block">
                          Autonomous Remediation
                        </span>
                        <p className="text-[11px] text-senpay-text-secondary mt-1 font-sans">
                          {alert.action || 'Deploy dynamic carrier slice via PayPilot coordinator.'}
                        </p>
                      </div>
                      <div className="mt-2">
                        <span className="text-[10px] text-senpay-cyan font-bold">
                          Est. Cost: 12.50 HSK &bull; -50.8 CRS Reduction
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end pt-2 border-t border-senpay-border/40">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (typeof window !== 'undefined') {
                          window.location.hash = '#command_center';
                        }
                      }}
                      className={`py-1.5 px-3 rounded bg-senpay-cyan hover:opacity-90 ${
                        isLight ? 'text-white' : 'text-black'
                      } font-mono font-bold text-xs tracking-wider uppercase transition flex items-center gap-1.5`}
                    >
                      <Zap size={12} />
                      <span>Mitigate in Command Center</span>
                      <ArrowRight size={12} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {filteredAlerts.length === 0 && (
          <div className="senpay-card p-12 text-center text-senpay-text-muted font-mono text-xs">
            <Radio size={24} className="mx-auto mb-2 opacity-40 text-senpay-cyan" />
            <p className="text-sm font-bold text-senpay-text-primary">All Telemetry Sectors Nominal</p>
            <p className="text-xs text-senpay-text-secondary mt-1">
              No active incidents matching the current filter criteria.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
