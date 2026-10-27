// ═══════════════════════════════════════════════════════
// SENPAY — Network Digital Twin (Map & Deep Inspection Page)
// Real Telecom Measurement Ingestion (UCC 5G Dataset),
// OpenCelliD Provider Integration, and ML Risk Inference
// ═══════════════════════════════════════════════════════

import React, { useState, useEffect, useMemo, useCallback } from 'react';
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
  AlertTriangle,
  Search,
  Filter,
  Layers,
  Database,
  Cpu,
  RefreshCw,
  ExternalLink,
  ChevronDown,
  Wifi,
  BarChart2
} from 'lucide-react';
import CrowdMap from '../map/CrowdMap';
import GlassCard from '../shared/GlassCard';
import RiskBadge from '../shared/RiskBadge';
import { getRiskLevel } from '../../data/mockData';
import { 
  fetchDigitalTwinSites, 
  fetchDigitalTwinSiteDetail,
  fetchOpenCellIdStatus 
} from '../../data/api';

export default function MapViewPage({ zones = [], isLive = false }) {
  // Region & Dataset Filter: 'ucc_5g' | 'campus_sim' | 'all'
  const [selectedSource, setSelectedSource] = useState('ucc_5g');
  const [techFilter, setTechFilter] = useState('all');
  const [riskFilter, setRiskFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Loaded sites from backend
  const [backendSites, setBackendSites] = useState([]);
  const [isLoadingSites, setIsLoadingSites] = useState(false);
  const [activeSiteDetail, setActiveSiteDetail] = useState(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [selectedZone, setSelectedZone] = useState(null);
  const [openCellIdStatus, setOpenCellIdStatus] = useState(null);

  // 9 Map Layers state
  const [layersOpen, setLayersOpen] = useState(false);
  const [layers, setLayers] = useState({
    sites: true,        // 1. Network Sites
    tech: true,         // 2. Cell Technology
    signal: true,       // 3. Signal Quality
    congestion: true,   // 4. Congestion (CRS)
    density: false,     // 5. Crowd Density
    incidents: true,    // 6. Active Incidents
    prediction: true,   // 7. Predicted Risk
    coverage: false,    // 8. Coverage Areas (simulated)
    links: true,        // 9. Site-to-Site Links (simulated)
  });

  const toggleLayer = (layerKey) => {
    setLayers((prev) => ({ ...prev, [layerKey]: !prev[layerKey] }));
  };

  // Fetch sites from backend digital twin API
  const loadSites = useCallback(async () => {
    setIsLoadingSites(true);
    try {
      const res = await fetchDigitalTwinSites({
        source: selectedSource,
        tech: techFilter,
        risk: riskFilter,
        query: searchQuery,
      });
      if (res && res.sites && res.sites.length > 0) {
        setBackendSites(res.sites);
      } else if (zones && zones.length > 0 && selectedSource !== 'ucc_5g') {
        setBackendSites(zones);
      }
    } catch (err) {
      console.warn('Failed to fetch digital twin sites:', err);
      if (zones && zones.length > 0) {
        setBackendSites(zones);
      }
    } finally {
      setIsLoadingSites(false);
    }
  }, [selectedSource, techFilter, riskFilter, searchQuery, zones]);

  useEffect(() => {
    loadSites();
  }, [loadSites]);

  // Load OpenCelliD status
  useEffect(() => {
    fetchOpenCellIdStatus().then((data) => {
      if (data) setOpenCellIdStatus(data);
    });
  }, []);

  // When a site is selected, fetch deep telemetry & ML prediction from backend
  const handleSelectSite = useCallback(async (site) => {
    setSelectedZone(site);
    if (!site) {
      setActiveSiteDetail(null);
      return;
    }

    setIsLoadingDetail(true);
    try {
      const detail = await fetchDigitalTwinSiteDetail(site.id || site.site_id);
      if (detail && detail.site) {
        setActiveSiteDetail(detail);
      } else {
        // Fallback to local site metadata
        setActiveSiteDetail({ site, history: [], ml_prediction: null });
      }
    } catch (err) {
      console.warn('Failed to load deep site details:', err);
      setActiveSiteDetail({ site, history: [], ml_prediction: null });
    } finally {
      setIsLoadingDetail(false);
    }
  }, []);

  // Filter sites for display
  const displaySites = useMemo(() => {
    let list = backendSites.length > 0 ? backendSites : zones;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter((s) => {
        const name = (s.name || s.site_id || s.id || '').toLowerCase();
        const cell = (s.cell_id || '').toLowerCase();
        return name.includes(q) || cell.includes(q);
      });
    }

    if (techFilter !== 'all') {
      list = list.filter((s) => {
        const t = (s.technology || s.tech_type || '').toLowerCase();
        return techFilter === '5G' ? t.includes('5g') : t.includes('lte') || t.includes('4g');
      });
    }

    if (riskFilter !== 'all') {
      list = list.filter((s) => {
        const crs = Number.isFinite(s.riskScore) ? s.riskScore : (s.metrics?.crs ?? 0);
        if (riskFilter === 'safe') return crs <= 40;
        if (riskFilter === 'warning') return crs > 40 && crs <= 65;
        if (riskFilter === 'critical') return crs > 65;
        return true;
      });
    }

    return list;
  }, [backendSites, zones, searchQuery, techFilter, riskFilter]);

  // Aggregate statistics
  const stats = useMemo(() => {
    if (displaySites.length === 0) {
      return { total: 0, fiveGCount: 0, criticalCount: 0, avgCrs: 0 };
    }
    const total = displaySites.length;
    const fiveGCount = displaySites.filter((s) => (s.technology || '').includes('5G')).length;
    const criticalCount = displaySites.filter((s) => {
      const crs = Number.isFinite(s.riskScore) ? s.riskScore : (s.metrics?.crs ?? 0);
      return crs > 65;
    }).length;
    const sumCrs = displaySites.reduce((acc, s) => {
      const crs = Number.isFinite(s.riskScore) ? s.riskScore : (s.metrics?.crs ?? 0);
      return acc + crs;
    }, 0);
    const avgCrs = Math.round(sumCrs / Math.max(1, total));
    return { total, fiveGCount, criticalCount, avgCrs };
  }, [displaySites]);

  // Render Sparkline for radio metric history
  const renderSparkline = (points, valueKey, label, unit, color = '#00E5FF') => {
    if (!points || points.length < 2) return null;
    const values = points.map((p) => Number(p[valueKey])).filter((v) => Number.isFinite(v));
    if (values.length < 2) return null;

    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = Math.max(1, max - min);
    const height = 36;
    const width = 200;

    const coords = values.map((val, idx) => {
      const x = (idx / (values.length - 1)) * width;
      const y = height - ((val - min) / range) * (height - 8) - 4;
      return `${x},${y}`;
    }).join(' ');

    const lastVal = values[values.length - 1];

    return (
      <div className="bg-[#0A0F16] p-2.5 rounded-lg border border-senpay-border/50">
        <div className="flex justify-between items-center mb-1 text-[11px] font-mono">
          <span className="text-slate-400">{label}</span>
          <span className="font-bold text-white">
            {lastVal.toFixed(1)} <span className="text-slate-400 text-[10px]">{unit}</span>
          </span>
        </div>
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-9 overflow-visible">
          <polyline
            fill="none"
            stroke={color}
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            points={coords}
          />
        </svg>
      </div>
    );
  };

  return (
    <div className="space-y-3 animate-fade-in-up">
      {/* ── Page Header & Data Provenance Banner ── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-2.5 border-b border-senpay-border/60">
        <div>
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <h2 className="text-base font-bold text-white tracking-wide uppercase font-mono">
              Network Digital Twin
            </h2>
            <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#101822] border border-senpay-border text-[11px] font-mono">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-emerald-400 font-bold">
                {selectedSource === 'ucc_5g'
                  ? 'HISTORICAL 5G DATASET (UCC CORK)'
                  : selectedSource === 'campus_sim'
                  ? 'SIMULATION (DELHI SECTORS)'
                  : 'MULTISOURCE HYBRID'}
              </span>
            </div>
            {openCellIdStatus && (
              <span className="text-[10px] font-mono text-slate-400 border border-slate-800 px-2 py-0.5 rounded bg-slate-900/60">
                OpenCelliD: {openCellIdStatus.configured ? 'Active' : 'Unconfigured'}
              </span>
            )}
          </div>
          <p className="text-xs text-senpay-text-muted">
            Empirical 5G NR/LTE radio telemetry, dynamic cellular masts, and real-time ML risk inference
          </p>
        </div>

        {/* Aggregate KPI Badges */}
        <div className="flex items-center gap-2 text-xs font-mono">
          <div className="px-3 py-1 rounded-lg bg-[#101821] border border-senpay-border text-center">
            <div className="text-[9px] text-senpay-text-muted uppercase">Active Sites</div>
            <div className="text-sm font-bold text-white">{stats.total}</div>
          </div>
          <div className="px-3 py-1 rounded-lg bg-[#101821] border border-senpay-border text-center">
            <div className="text-[9px] text-senpay-text-muted uppercase">5G NR Masts</div>
            <div className="text-sm font-bold text-senpay-cyan">{stats.fiveGCount}</div>
          </div>
          <div className="px-3 py-1 rounded-lg bg-[#101821] border border-senpay-border text-center">
            <div className="text-[9px] text-senpay-text-muted uppercase">Avg CRS</div>
            <div className="text-sm font-bold text-white">{stats.avgCrs} / 100</div>
          </div>
          <div className="px-3 py-1 rounded-lg bg-[#101821] border border-senpay-border text-center">
            <div className="text-[9px] text-senpay-text-muted uppercase">Critical Alerts</div>
            <div className="text-sm font-bold text-rose-400">{stats.criticalCount}</div>
          </div>
        </div>
      </div>

      {/* ── Map Operations Toolbar ── */}
      <div className="flex flex-wrap items-center justify-between gap-2 p-2 rounded-xl bg-[#101821] border border-senpay-border text-xs font-mono">
        {/* Left: Dataset / Region Selector */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-slate-400 font-bold uppercase text-[10px] mr-1">Region:</span>
          <button
            onClick={() => {
              setSelectedSource('ucc_5g');
              setSelectedZone(null);
            }}
            className={`px-2.5 py-1 rounded text-xs transition ${
              selectedSource === 'ucc_5g'
                ? 'bg-senpay-cyan/20 text-senpay-cyan border border-senpay-cyan/50 font-bold'
                : 'text-slate-400 hover:text-white bg-[#0A0F16] border border-slate-800'
            }`}
          >
            🇮🇪 Cork 5G Grid (UCC Public)
          </button>
          <button
            onClick={() => {
              setSelectedSource('campus_sim');
              setSelectedZone(null);
            }}
            className={`px-2.5 py-1 rounded text-xs transition ${
              selectedSource === 'campus_sim'
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/50 font-bold'
                : 'text-slate-400 hover:text-white bg-[#0A0F16] border border-slate-800'
            }`}
          >
            🇮🇳 Delhi Campus (Simulation)
          </button>
          <button
            onClick={() => {
              setSelectedSource('all');
              setSelectedZone(null);
            }}
            className={`px-2.5 py-1 rounded text-xs transition ${
              selectedSource === 'all'
                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/50 font-bold'
                : 'text-slate-400 hover:text-white bg-[#0A0F16] border border-slate-800'
            }`}
          >
            All Sites
          </button>
        </div>

        {/* Right: Search, Filters & Layers Popover */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Search Box */}
          <div className="relative">
            <Search size={12} className="absolute left-2.5 top-2 text-slate-400" />
            <input
              type="text"
              placeholder="Filter site ID or cell..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-7 pr-2.5 py-1 rounded bg-[#0A0F16] border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-senpay-cyan w-36 sm:w-44"
            />
          </div>

          {/* Tech Filter */}
          <select
            value={techFilter}
            onChange={(e) => setTechFilter(e.target.value)}
            className="px-2 py-1 rounded bg-[#0A0F16] border border-slate-800 text-xs text-white focus:outline-none"
          >
            <option value="all">All Tech</option>
            <option value="5G">5G NR</option>
            <option value="LTE">4G LTE</option>
          </select>

          {/* Risk Filter */}
          <select
            value={riskFilter}
            onChange={(e) => setRiskFilter(e.target.value)}
            className="px-2 py-1 rounded bg-[#0A0F16] border border-slate-800 text-xs text-white focus:outline-none"
          >
            <option value="all">All Risk</option>
            <option value="safe">Safe (0-40)</option>
            <option value="warning">Warning (41-65)</option>
            <option value="critical">Critical (66+)</option>
          </select>

          {/* 9 Map Layers Dropdown Button */}
          <div className="relative">
            <button
              onClick={() => setLayersOpen(!layersOpen)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded border transition ${
                layersOpen
                  ? 'bg-senpay-cyan text-slate-950 border-senpay-cyan font-bold'
                  : 'bg-[#0A0F16] border-slate-800 text-slate-300 hover:text-white'
              }`}
            >
              <Layers size={12} />
              <span>Layers</span>
              <ChevronDown size={11} />
            </button>

            {layersOpen && (
              <div className="absolute right-0 mt-2 w-56 rounded-xl bg-[#0D1520] border border-senpay-border shadow-2xl p-2.5 z-50 text-xs font-mono space-y-1.5">
                <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">
                  Toggle Map Layers
                </div>
                {[
                  { id: 'sites', label: '1. Network Sites', desc: 'Masts & Towers' },
                  { id: 'tech', label: '2. Cell Technology', desc: '5G NR vs LTE' },
                  { id: 'signal', label: '3. Signal Quality', desc: 'RSRP & RSRQ' },
                  { id: 'congestion', label: '4. Congestion Score', desc: 'Empirical CRS' },
                  { id: 'density', label: '5. Crowd Density', desc: 'ppl/m² badges' },
                  { id: 'incidents', label: '6. Active Incidents', desc: 'Critical alerts' },
                  { id: 'prediction', label: '7. Predicted Risk', desc: 'ML forward forecast' },
                  { id: 'coverage', label: '8. Coverage Hulls', desc: 'Simulated radius (off)' },
                  { id: 'links', label: '9. Site-to-Site Links', desc: 'Backhaul mesh' },
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => toggleLayer(item.id)}
                    className="w-full flex items-center justify-between px-2 py-1 rounded hover:bg-slate-800/60 text-left transition"
                  >
                    <div>
                      <span className="text-white block">{item.label}</span>
                      <span className="text-[9px] text-slate-500">{item.desc}</span>
                    </div>
                    {layers[item.id] ? (
                      <span className="text-senpay-cyan font-bold">ON</span>
                    ) : (
                      <span className="text-slate-500">OFF</span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Main Layout: Map Canvas (3/4) + Deep Site Inspection Panel (1/4) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4" style={{ height: 'calc(100vh - 200px)', minHeight: '580px' }}>
        {/* Central Map Canvas */}
        <div className="lg:col-span-3 h-full">
          <CrowdMap
            zones={displaySites}
            selectedZone={selectedZone}
            onSelectZone={handleSelectSite}
            height="100%"
            isLive={isLive}
            layers={layers}
            onToggleLayer={toggleLayer}
          />
        </div>

        {/* Right Sidebar: Deep Site Inspection or Active Sites List */}
        <div className="space-y-3 overflow-y-auto pr-1">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono flex items-center gap-1.5">
              <MapPin size={13} className="text-senpay-cyan" />
              <span>{selectedZone ? 'Site Telemetry & ML' : 'Monitored Sites'}</span>
            </h3>
            <span className="text-[11px] font-mono text-senpay-text-muted">
              {displaySites.length} Active
            </span>
          </div>

          {selectedZone ? (
            /* ── Deep Site Detail & ML Inference View ── */
            <div className="space-y-3 animate-fade-in text-xs font-mono">
              <div className="p-3.5 rounded-xl bg-[#101821] border border-senpay-border shadow-xl space-y-3">
                {/* Site Header */}
                <div className="flex items-start justify-between pb-2 border-b border-senpay-border/60">
                  <div>
                    <span className="text-[10px] font-bold text-senpay-cyan uppercase tracking-wider">
                      {selectedZone.technology || '5G NR'} • CELL {selectedZone.cell_id || selectedZone.id}
                    </span>
                    <h4 className="text-sm font-bold text-white leading-snug">
                      {selectedZone.name || selectedZone.site_id || selectedZone.id}
                    </h4>
                  </div>
                  {(() => {
                    const crs = Number.isFinite(selectedZone.riskScore)
                      ? selectedZone.riskScore
                      : (selectedZone.metrics?.crs ?? 0);
                    const risk = getRiskLevel(crs);
                    return (
                      <span
                        className="px-2 py-0.5 rounded text-[10px] font-bold uppercase"
                        style={{ backgroundColor: `${risk.color}25`, color: risk.color }}
                      >
                        {risk.label}
                      </span>
                    );
                  })()}
                </div>

                {/* Provenance Pill */}
                <div className="px-2.5 py-1.5 rounded-lg bg-[#0C131C] border border-slate-800 text-[10px] flex items-center justify-between">
                  <span className="text-slate-400">Data Provenance:</span>
                  <span className="font-bold text-senpay-cyan">
                    {selectedZone.data_provenance
                      ? selectedZone.data_provenance.replace('_', ' ')
                      : 'HISTORICAL PUBLIC DATA'}
                  </span>
                </div>

                {/* CRS Gauge */}
                {(() => {
                  const crs = Number.isFinite(selectedZone.riskScore)
                    ? selectedZone.riskScore
                    : (selectedZone.metrics?.crs ?? 0);
                  const risk = getRiskLevel(crs);
                  return (
                    <div className="text-center py-2 bg-[#0C131C] rounded-xl border border-senpay-border/40">
                      <div className="text-3xl font-black tracking-tight" style={{ color: risk.color }}>
                        {crs}
                        <span className="text-xs text-slate-500 font-normal ml-1">/ 100</span>
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        Congestion Risk Score (CRS)
                      </div>
                      <div className="mx-4 mt-2 h-1.5 rounded-full bg-slate-800 overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${Math.min(100, Math.max(0, crs))}%`,
                            backgroundColor: risk.color,
                          }}
                        />
                      </div>
                    </div>
                  );
                })()}

                {/* Real Radio Telemetry Metrics */}
                <div className="space-y-1.5">
                  <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                    Radio Link Quality
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-[#0C131C] rounded-lg p-2 border border-slate-800/80">
                      <p className="text-[10px] text-slate-400">RSRP (Signal)</p>
                      <p className="text-xs font-bold text-white">
                        {selectedZone.metrics?.rsrp !== undefined ? `${selectedZone.metrics.rsrp} dBm` : '—'}
                      </p>
                    </div>
                    <div className="bg-[#0C131C] rounded-lg p-2 border border-slate-800/80">
                      <p className="text-[10px] text-slate-400">RSRQ (Quality)</p>
                      <p className="text-xs font-bold text-white">
                        {selectedZone.metrics?.rsrq !== undefined ? `${selectedZone.metrics.rsrq} dB` : '—'}
                      </p>
                    </div>
                    <div className="bg-[#0C131C] rounded-lg p-2 border border-slate-800/80">
                      <p className="text-[10px] text-slate-400">SNR (Noise)</p>
                      <p className="text-xs font-bold text-white">
                        {selectedZone.metrics?.snr !== undefined ? `${selectedZone.metrics.snr} dB` : '—'}
                      </p>
                    </div>
                    <div className="bg-[#0C131C] rounded-lg p-2 border border-slate-800/80">
                      <p className="text-[10px] text-slate-400">Downlink Throughput</p>
                      <p className="text-xs font-bold text-emerald-400">
                        {selectedZone.metrics?.downlink_bitrate_mbps !== undefined
                          ? `${selectedZone.metrics.downlink_bitrate_mbps} Mbps`
                          : '—'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Machine Learning Forward Inference */}
                {activeSiteDetail?.ml_prediction && (
                  <div className="space-y-1.5 pt-1 border-t border-senpay-border/50">
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="text-senpay-cyan font-bold uppercase flex items-center gap-1">
                        <Cpu size={11} />
                        <span>ML Model Inference</span>
                      </span>
                      <span className="text-slate-400">
                        {(activeSiteDetail.ml_prediction.confidence * 100).toFixed(0)}% Conf
                      </span>
                    </div>
                    <div className="bg-[#0C131C] p-2 rounded-lg border border-senpay-cyan/30 text-[11px] space-y-1">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Predicted CRS:</span>
                        <span className="font-bold text-white">
                          {activeSiteDetail.ml_prediction.predicted_crs}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Classification:</span>
                        <span className="font-bold text-amber-400 uppercase">
                          {activeSiteDetail.ml_prediction.severity}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Inference Latency:</span>
                        <span className="text-slate-300">
                          {activeSiteDetail.ml_prediction.latency_ms} ms
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Historical Sparkline Charts */}
                {activeSiteDetail?.history && activeSiteDetail.history.length > 2 && (
                  <div className="space-y-2 pt-1 border-t border-senpay-border/50">
                    <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1">
                      <BarChart2 size={11} />
                      <span>Observation Trends (Past Readings)</span>
                    </div>
                    {renderSparkline(activeSiteDetail.history, 'rsrp', 'RSRP Trend', 'dBm', '#00E5FF')}
                    {renderSparkline(activeSiteDetail.history, 'downlink_bitrate_mbps', 'Throughput Trend', 'Mbps', '#00FF88')}
                  </div>
                )}

                {/* Spatial Coordinates */}
                <div className="pt-2 border-t border-senpay-border/40 text-[10px] space-y-1 text-slate-400">
                  <div className="flex justify-between">
                    <span>GPS Coordinates:</span>
                    <span className="text-slate-200">
                      {Number.isFinite(selectedZone.lat) && Number.isFinite(selectedZone.lng)
                        ? `${selectedZone.lat.toFixed(5)}, ${selectedZone.lng.toFixed(5)}`
                        : '—'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Observation Count:</span>
                    <span className="text-slate-200">{selectedZone.sample_count || '1'} records</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <button
                onClick={() => setSelectedZone(null)}
                className="w-full py-2 px-3 text-xs font-mono font-medium text-senpay-text-muted hover:text-white bg-[#101821] hover:bg-[#15202c] border border-senpay-border rounded-xl transition flex items-center justify-center gap-1.5"
              >
                <span>← Show All Sites</span>
              </button>

              <button
                onClick={() => {
                  window.location.hash = '#optimizer';
                }}
                className="w-full py-2 px-3 text-xs font-mono font-bold text-slate-950 bg-senpay-cyan hover:bg-cyan-300 rounded-xl transition flex items-center justify-center gap-1.5 shadow-lg shadow-senpay-cyan/15"
              >
                <span>Mitigate in Intervention Optimizer</span>
                <ArrowRight size={13} />
              </button>
            </div>
          ) : (
            /* ── All Sites List View ── */
            <div className="space-y-2 font-mono">
              {displaySites.slice(0, 30).map((s) => {
                const crs = Number.isFinite(s.riskScore) ? s.riskScore : (s.metrics?.crs ?? 0);
                const risk = getRiskLevel(crs);
                const siteName = s.name ? s.name.split('—')[0].trim() : (s.site_id || s.id);
                const tech = s.technology || (s.tech_type === '5G_NR' ? '5G' : 'LTE');

                return (
                  <div
                    key={s.id}
                    onClick={() => handleSelectSite(s)}
                    className="p-2.5 rounded-xl bg-[#101821] border border-senpay-border/60 hover:border-senpay-cyan/60 hover:bg-[#14202c] cursor-pointer transition-all duration-200 group"
                  >
                    <div className="flex items-center gap-2.5">
                      <div
                        className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: risk.color }}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-bold text-white group-hover:text-senpay-cyan transition truncate">
                            {siteName}
                          </p>
                          <span className="text-xs font-bold" style={{ color: risk.color }}>
                            {crs}
                          </span>
                        </div>
                        <div className="flex items-center justify-between mt-0.5 text-[10px] text-senpay-text-muted">
                          <span>{tech} • {s.cell_id ? `Cell ${s.cell_id}` : 'Mast'}</span>
                          <span className="uppercase text-[9px] font-bold" style={{ color: risk.color }}>
                            {risk.label}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
              {displaySites.length > 30 && (
                <div className="text-center text-[10px] text-slate-500 py-1">
                  Showing top 30 of {displaySites.length} sites. Use search to filter.
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
