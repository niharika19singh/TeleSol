// ═══════════════════════════════════════════════════════
// SENPAY — Network Digital Twin (Map & Topology View Page)
// Full-screen geographic and schematic crowd dynamics
// ═══════════════════════════════════════════════════════

import React, { useState, useMemo } from 'react';
import { 
  MapPin, 
  Users, 
  Wind, 
  Volume2, 
  Shield, 
  Activity, 
  Radio, 
  ArrowRight,
  TrendingUp,
  Sliders,
  CheckCircle2,
  AlertCircle,
  AlertTriangle
} from 'lucide-react';
import CrowdMap from '../map/CrowdMap';
import GlassCard from '../shared/GlassCard';
import RiskBadge from '../shared/RiskBadge';
import { getRiskLevel, RISK_THRESHOLDS } from '../../data/mockData';

export default function MapViewPage({ zones = [], isLive = false }) {
  const [selectedZone, setSelectedZone] = useState(null);

  // Compute aggregate statistics across active zones safely
  const stats = useMemo(() => {
    if (!zones || zones.length === 0) {
      return { avgRisk: 0, maxDensity: 0, totalSensors: 0, criticalCount: 0 };
    }
    const validZones = zones.filter((z) => Number.isFinite(z.riskScore));
    const avgRisk = Math.round(
      validZones.reduce((acc, z) => acc + z.riskScore, 0) / Math.max(1, validZones.length)
    );
    const maxDensity = Math.max(...zones.map((z) => (Number.isFinite(z.density) ? z.density : 0)), 0);
    const totalSensors = zones.reduce((acc, z) => acc + (z.sensorCount || 0), 0);
    const criticalCount = zones.filter((z) => z.riskScore > 65).length;
    return { avgRisk, maxDensity, totalSensors, criticalCount };
  }, [zones]);

  return (
    <div className="space-y-4 animate-fade-in-up">
      {/* ── Page Header & Telemetry Status Banner ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-senpay-border/60">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <h2 className="text-base font-bold text-white tracking-wide uppercase font-mono">
              Network Digital Twin
            </h2>
            <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#101822] border border-senpay-border text-[11px] font-mono">
              <span
                className={`w-2 h-2 rounded-full ${
                  isLive ? 'bg-emerald-400 animate-pulse' : 'bg-senpay-amber'
                }`}
              />
              <span className={isLive ? 'text-emerald-400 font-bold' : 'text-senpay-amber'}>
                {isLive ? 'LIVE TELEMETRY (SENTINEL DAEMON)' : 'SIMULATION ENGINE'}
              </span>
            </div>
          </div>
          <p className="text-xs text-senpay-text-muted">
            Real-time geospatial cellular link quality, crowd flow vectors, and automated risk scoring
          </p>
        </div>

        {/* Aggregate KPI Badges */}
        <div className="flex items-center gap-2 text-xs font-mono">
          <div className="px-3 py-1.5 rounded-lg bg-[#101821] border border-senpay-border text-center">
            <div className="text-[10px] text-senpay-text-muted uppercase">Avg Congestion</div>
            <div className="text-sm font-bold text-white">{stats.avgRisk} / 100</div>
          </div>
          <div className="px-3 py-1.5 rounded-lg bg-[#101821] border border-senpay-border text-center">
            <div className="text-[10px] text-senpay-text-muted uppercase">Peak Density</div>
            <div className="text-sm font-bold text-senpay-cyan">{stats.maxDensity} <span className="text-[10px] text-slate-400">ppl/m²</span></div>
          </div>
          <div className="px-3 py-1.5 rounded-lg bg-[#101821] border border-senpay-border text-center">
            <div className="text-[10px] text-senpay-text-muted uppercase">Active Sensors</div>
            <div className="text-sm font-bold text-emerald-400">{stats.totalSensors}</div>
          </div>
        </div>
      </div>

      {/* ── Main Layout: Map (3/4) + Zone Details Panel (1/4) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4" style={{ height: 'calc(100vh - 170px)', minHeight: '560px' }}>
        {/* Central Map Canvas */}
        <div className="lg:col-span-3 h-full">
          <CrowdMap
            zones={zones}
            selectedZone={selectedZone}
            onSelectZone={setSelectedZone}
            height="100%"
            isLive={isLive}
          />
        </div>

        {/* Right Sidebar: All Zones or Selected Zone Detail */}
        <div className="space-y-3 overflow-y-auto pr-1">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono flex items-center gap-1.5">
              <MapPin size={13} className="text-senpay-cyan" />
              <span>{selectedZone ? 'Sector Detail' : 'Monitored Sectors'}</span>
            </h3>
            <span className="text-[11px] font-mono text-senpay-text-muted">
              {zones.length} Sectors
            </span>
          </div>

          {selectedZone ? (
            /* ── Selected Zone Detail View ── */
            <div className="space-y-3 animate-fade-in">
              <div className="p-4 rounded-xl bg-[#101821] border border-senpay-border shadow-xl">
                <div className="flex items-start justify-between mb-3 pb-2 border-b border-senpay-border/60">
                  <div>
                    <span className="text-[10px] font-mono font-bold text-senpay-cyan uppercase tracking-wider">
                      {selectedZone.id.toUpperCase()} • 5G-NR
                    </span>
                    <h4 className="text-sm font-bold text-white leading-snug">{selectedZone.name}</h4>
                  </div>
                  <span
                    className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase"
                    style={{
                      backgroundColor: `${getRiskLevel(selectedZone.riskScore).color}20`,
                      color: getRiskLevel(selectedZone.riskScore).color,
                    }}
                  >
                    {getRiskLevel(selectedZone.riskScore).label}
                  </span>
                </div>

                {/* Risk Score Gauge */}
                <div className="text-center my-3 py-2 bg-[#0C131C] rounded-xl border border-senpay-border/40">
                  <div
                    className="text-3xl font-black font-mono tracking-tight"
                    style={{ color: getRiskLevel(selectedZone.riskScore).color }}
                  >
                    {selectedZone.riskScore}
                    <span className="text-xs text-slate-500 font-normal ml-1">/ 100</span>
                  </div>
                  <div className="text-[10px] font-mono text-slate-400 mt-0.5">
                    Congestion Risk Score (CRS)
                  </div>
                  <div className="mx-4 mt-2 h-1.5 rounded-full bg-slate-800 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${Math.min(100, Math.max(0, selectedZone.riskScore))}%`,
                        backgroundColor: getRiskLevel(selectedZone.riskScore).color,
                      }}
                    />
                  </div>
                </div>

                {/* 4 Primary Operational Metrics */}
                <div className="grid grid-cols-2 gap-2 mt-3">
                  <div className="bg-[#0C131C] rounded-lg p-2.5 border border-senpay-border/30 text-center">
                    <Users size={13} className="text-senpay-cyan mx-auto mb-1" />
                    <p className="text-[10px] text-senpay-text-muted">Crowd Density</p>
                    <p className="text-sm font-bold font-mono text-white">
                      {Number.isFinite(selectedZone.density) ? selectedZone.density : '—'}
                    </p>
                    <p className="text-[9px] text-senpay-text-muted font-mono">ppl/m²</p>
                  </div>

                  <div className="bg-[#0C131C] rounded-lg p-2.5 border border-senpay-border/30 text-center">
                    <Wind size={13} className="text-amber-400 mx-auto mb-1" />
                    <p className="text-[10px] text-senpay-text-muted">Flow Instability</p>
                    <p className="text-sm font-bold font-mono text-white">
                      {Number.isFinite(selectedZone.flowInstability) ? `${selectedZone.flowInstability}%` : '—'}
                    </p>
                    <p className="text-[9px] text-senpay-text-muted font-mono">turbulence</p>
                  </div>

                  <div className="bg-[#0C131C] rounded-lg p-2.5 border border-senpay-border/30 text-center">
                    <Volume2 size={13} className="text-rose-400 mx-auto mb-1" />
                    <p className="text-[10px] text-senpay-text-muted">Panic Index</p>
                    <p className="text-sm font-bold font-mono text-white">
                      {Number.isFinite(selectedZone.panicLevel) ? `${selectedZone.panicLevel}%` : '—'}
                    </p>
                    <p className="text-[9px] text-senpay-text-muted font-mono">acoustic/motion</p>
                  </div>

                  <div className="bg-[#0C131C] rounded-lg p-2.5 border border-senpay-border/30 text-center">
                    <Shield size={13} className="text-emerald-400 mx-auto mb-1" />
                    <p className="text-[10px] text-senpay-text-muted">Active Nodes</p>
                    <p className="text-sm font-bold font-mono text-white">
                      {selectedZone.sensorCount || '—'}
                    </p>
                    <p className="text-[9px] text-senpay-text-muted font-mono">sensors online</p>
                  </div>
                </div>

                {/* Spatial Coverage Metadata */}
                <div className="mt-3 pt-2.5 border-t border-senpay-border/40 text-[10px] font-mono space-y-1 text-slate-400">
                  <div className="flex justify-between">
                    <span>Coordinates:</span>
                    <span className="text-slate-200">
                      {Number.isFinite(selectedZone.lat) && Number.isFinite(selectedZone.lng)
                        ? `${selectedZone.lat.toFixed(4)}, ${selectedZone.lng.toFixed(4)}`
                        : 'Schematic Sector'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Cell Radius:</span>
                    <span className="text-slate-200">{selectedZone.radius || 100} meters</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <button
                onClick={() => setSelectedZone(null)}
                className="w-full py-2 px-3 text-xs font-mono font-medium text-senpay-text-muted hover:text-white bg-[#101821] hover:bg-[#15202c] border border-senpay-border rounded-xl transition flex items-center justify-center gap-1.5"
              >
                <span>← Show All 6 Sectors</span>
              </button>

              <button
                onClick={() => {
                  window.location.hash = '#optimizer';
                }}
                className="w-full py-2 px-3 text-xs font-mono font-bold text-slate-950 bg-senpay-cyan hover:bg-senpay-cyan/90 rounded-xl transition flex items-center justify-center gap-1.5 shadow-lg shadow-senpay-cyan/15"
              >
                <span>Inspect in Optimizer</span>
                <ArrowRight size={13} />
              </button>
            </div>
          ) : (
            /* ── All Zones List View ── */
            <div className="space-y-2">
              {zones.map((z) => {
                const risk = getRiskLevel(z.riskScore);
                const densityVal = Number.isFinite(z.density) ? z.density : '—';
                const riskVal = Number.isFinite(z.riskScore) ? z.riskScore : 0;

                return (
                  <div
                    key={z.id}
                    onClick={() => setSelectedZone(z)}
                    className="p-3 rounded-xl bg-[#101821] border border-senpay-border/60 hover:border-senpay-cyan/60 hover:bg-[#14202c] cursor-pointer transition-all duration-200 group"
                  >
                    <div className="flex items-center gap-2.5">
                      {/* Risk Status Indicator */}
                      <div
                        className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: risk.color }}
                      />

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-bold text-white group-hover:text-senpay-cyan transition truncate">
                            {z.name}
                          </p>
                          <span
                            className="font-mono text-xs font-bold"
                            style={{ color: risk.color }}
                          >
                            {riskVal}
                          </span>
                        </div>

                        <div className="flex items-center justify-between mt-1 text-[10px] font-mono text-senpay-text-muted">
                          <span>{densityVal} ppl/m²</span>
                          <span className="uppercase text-[9px] font-bold" style={{ color: risk.color }}>
                            {risk.label}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
