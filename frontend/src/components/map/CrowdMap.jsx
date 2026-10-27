// ═══════════════════════════════════════════════════════
// SENPAY Network Digital Twin — Crowd & Telecom Map
// High-reliability geographic basemap with automatic
// dark schematic network topology fallback
// ═══════════════════════════════════════════════════════

import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { MapContainer, TileLayer, Circle, Popup, useMap } from 'react-leaflet';
import { 
  AlertTriangle, 
  Layers, 
  Map as MapIcon, 
  Network, 
  RefreshCw, 
  Radio, 
  Maximize2, 
  ShieldCheck, 
  ShieldAlert, 
  Activity,
  Wifi,
  ChevronRight,
  Info
} from 'lucide-react';
import { getRiskLevel, RISK_THRESHOLDS } from '../../data/mockData';
import 'leaflet/dist/leaflet.css';

// ── Default Tile Providers (All Public & Keyless) ──
const TILE_PROVIDERS = {
  esriDark: {
    name: 'Dark Basemap',
    id: 'esriDark',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ',
    maxZoom: 16,
    isDark: true,
  },
  osm: {
    name: 'OpenStreetMap',
    id: 'osm',
    url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors',
    maxZoom: 19,
    isDark: false,
  },
};

// ── Component: Auto-Recenter on selectedZone or default coordinates ──
function MapRecenter({ center }) {
  const map = useMap();
  useEffect(() => {
    if (center && Number.isFinite(center[0]) && Number.isFinite(center[1])) {
      map.setView(center, map.getZoom() || 16, { animate: true, duration: 0.8 });
    }
  }, [center, map]);
  return null;
}

// ── Component: Map Container Auto-Resize Observer ──
function MapResizeHandler() {
  const map = useMap();
  useEffect(() => {
    // Initial size invalidation after layout settles
    const timer = setTimeout(() => {
      try {
        map.invalidateSize();
      } catch {
        // ignore unmounted map errors
      }
    }, 250);

    const handleResize = () => {
      try {
        map.invalidateSize();
      } catch {}
    };

    window.addEventListener('resize', handleResize);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', handleResize);
    };
  }, [map]);
  return null;
}

// ── Component: Tile Error Monitor ──
function TileErrorMonitor({ onTileError }) {
  const map = useMap();
  useEffect(() => {
    let errorCount = 0;
    const handleTileError = () => {
      errorCount++;
      if (errorCount >= 4) {
        onTileError();
      }
    };
    map.on('tileerror', handleTileError);
    return () => {
      map.off('tileerror', handleTileError);
    };
  }, [map, onTileError]);
  return null;
}

// ── Component: Schematic Network Topology Canvas (Robust Fallback & Dedicated View) ──
function SchematicTopologyView({ zones, selectedZone, onSelectZone }) {
  // Pre-calculated geometric placement for the 6 monitored sectors around a central gateway
  const sectorPositions = {
    'zone-a': { x: 190, y: 130, sector: 'SEC-A', code: 'GATE-A', role: 'Main Entry Ingress' },
    'zone-b': { x: 730, y: 130, sector: 'SEC-B', code: 'GATE-B', role: 'East Wing Perimeter' },
    'zone-c': { x: 460, y: 100, sector: 'SEC-C', code: 'GATE-C', role: 'VIP Core Corridor' },
    'zone-d': { x: 460, y: 440, sector: 'SEC-D', code: 'GATE-D', role: 'South Exit Egress' },
    'zone-e': { x: 190, y: 410, sector: 'SEC-E', code: 'GATE-E', role: 'Parking Zone Access' },
    'zone-f': { x: 730, y: 410, sector: 'SEC-F', code: 'GATE-F', role: 'Emergency Egress' },
  };

  const centerNode = { x: 460, y: 270, label: 'CENTRAL 5G MACRO GATEWAY', sub: 'NOC Aggregation Hub' };

  return (
    <div className="relative w-full h-full bg-[#080D14] flex flex-col items-center justify-center overflow-hidden select-none">
      {/* Background Matrix / Grid lines */}
      <svg
        className="w-full h-full absolute inset-0"
        viewBox="0 0 920 540"
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          <pattern id="telecomGrid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#121D2B" strokeWidth="0.8" />
            <circle cx="40" cy="40" r="1" fill="#1C2F44" />
          </pattern>
          <linearGradient id="linkCyanGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#00E5FF" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#00E5FF" stopOpacity="0.2" />
          </linearGradient>
          <radialGradient id="centerAura" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#00E5FF" stopOpacity="0.25" />
            <stop offset="60%" stopColor="#00E5FF" stopOpacity="0.05" />
            <stop offset="100%" stopColor="#00E5FF" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Grid Background */}
        <rect width="920" height="540" fill="url(#telecomGrid)" />

        {/* Outer Perimeter Handover Rings (Inter-sector telemetry links) */}
        <polygon
          points="190,130 460,100 730,130 730,410 460,440 190,410"
          fill="none"
          stroke="#1A2D42"
          strokeWidth="1.5"
          strokeDasharray="6 6"
        />

        {/* Central Core Gateway Aura */}
        <circle cx={centerNode.x} cy={centerNode.y} r="110" fill="url(#centerAura)" />

        {/* Backhaul Links: Central Gateway to Each Sector */}
        {zones.map((zone) => {
          const pos = sectorPositions[zone.id] || { x: 460, y: 270 };
          const risk = getRiskLevel(zone.riskScore);
          const isSelected = selectedZone?.id === zone.id;
          return (
            <g key={`link-${zone.id}`}>
              <line
                x1={centerNode.x}
                y1={centerNode.y}
                x2={pos.x}
                y2={pos.y}
                stroke={isSelected ? '#00E5FF' : risk.color}
                strokeWidth={isSelected ? 2.5 : 1.5}
                strokeOpacity={isSelected ? 0.9 : 0.4}
                strokeDasharray={zone.riskScore > 65 ? '' : '5 4'}
              />
              {/* Mid-point signal flow beacon */}
              <circle
                cx={(centerNode.x + pos.x) / 2}
                cy={(centerNode.y + pos.y) / 2}
                r={isSelected ? 3.5 : 2.5}
                fill={risk.color}
                opacity="0.8"
              />
            </g>
          );
        })}

        {/* Central 5G Core Gateway Node */}
        <g transform={`translate(${centerNode.x}, ${centerNode.y})`}>
          <circle r="36" fill="#0C141F" stroke="#00E5FF" strokeWidth="2" />
          <circle r="46" fill="none" stroke="#00E5FF" strokeWidth="1" strokeDasharray="4 3" opacity="0.6" className="animate-spin" style={{ animationDuration: '25s' }} />
          <circle r="20" fill="#00E5FF" fillOpacity="0.15" />
          <text textAnchor="middle" y="4" fill="#00E5FF" fontSize="11" fontWeight="bold" fontFamily="monospace">
            5G-GW
          </text>
          <text textAnchor="middle" y="60" fill="#94A3B8" fontSize="9" fontWeight="bold" fontFamily="monospace" letterSpacing="0.05em">
            {centerNode.label}
          </text>
          <text textAnchor="middle" y="72" fill="#4B627D" fontSize="8" fontFamily="monospace">
            {centerNode.sub} • 10 Gbps Active Backhaul
          </text>
        </g>

        {/* Six Sector Nodes */}
        {zones.map((zone) => {
          const pos = sectorPositions[zone.id] || { x: 460, y: 270, sector: 'SEC-?', code: 'GATE' };
          const risk = getRiskLevel(zone.riskScore);
          const isSelected = selectedZone?.id === zone.id;
          const isDanger = zone.riskScore > 65;
          const isWarning = zone.riskScore > 40;

          const densityVal = Number.isFinite(zone.density) ? zone.density : '—';
          const riskVal = Number.isFinite(zone.riskScore) ? zone.riskScore : 0;

          return (
            <g
              key={zone.id}
              transform={`translate(${pos.x}, ${pos.y})`}
              onClick={() => onSelectZone?.(zone)}
              className="cursor-pointer group"
            >
              {/* Outer Coverage Boundary Radius */}
              <circle
                r="55"
                fill={risk.color}
                fillOpacity={isSelected ? 0.18 : isDanger ? 0.22 : 0.08}
                stroke={risk.color}
                strokeWidth={isSelected ? 2 : 1.2}
                strokeDasharray={isDanger ? '' : '5 4'}
              />

              {/* Pulsing Alert Halo for Critical */}
              {isDanger && (
                <circle
                  r="65"
                  fill="none"
                  stroke="#FF3B5C"
                  strokeWidth="1.5"
                  opacity="0.5"
                  className="animate-ping"
                  style={{ animationDuration: '2.5s' }}
                />
              )}

              {/* Core Node Box */}
              <rect
                x="-45"
                y="-30"
                width="90"
                height="60"
                rx="8"
                fill="#0F1722"
                stroke={isSelected ? '#00E5FF' : risk.color}
                strokeWidth={isSelected ? 2 : 1}
                className="transition-all duration-200 group-hover:stroke-[#00E5FF]"
              />

              {/* Sector Pill & Title */}
              <text textAnchor="middle" y="-14" fill="#94A3B8" fontSize="8" fontFamily="monospace" fontWeight="600">
                {pos.sector} • {pos.code}
              </text>
              <text textAnchor="middle" y="2" fill="#FFFFFF" fontSize="10" fontWeight="bold">
                {zone.name.split('—')[0].trim()}
              </text>

              {/* Metrics: Score & Density */}
              <text textAnchor="middle" y="16" fill={risk.color} fontSize="9" fontWeight="bold" fontFamily="monospace">
                CRS: {riskVal} • {risk.label.toUpperCase()}
              </text>
              <text textAnchor="middle" y="25" fill="#64748B" fontSize="7.5" fontFamily="monospace">
                {densityVal} ppl/m²
              </text>

              {/* Selection Accent Indicator */}
              {isSelected && (
                <circle cx="0" cy="-30" r="3.5" fill="#00E5FF" className="animate-pulse" />
              )}
            </g>
          );
        })}
      </svg>

      {/* Topology Overlay Legend */}
      <div className="absolute bottom-3 left-4 z-10 flex items-center gap-3 px-3 py-1.5 rounded-lg bg-[#0E1520]/90 border border-slate-800 text-[10px] font-mono backdrop-blur-md">
        <span className="text-slate-400 font-bold uppercase tracking-wider">Topology Model:</span>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-[#00FF88]" />
          <span className="text-slate-300">Safe (0-40)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-[#FFB800]" />
          <span className="text-slate-300">Warning (41-65)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-[#FF3B5C]" />
          <span className="text-slate-300">Critical (66+)</span>
        </div>
      </div>
    </div>
  );
}

// ── Main CrowdMap Component ──
export default function CrowdMap({
  zones = [],
  selectedZone = null,
  onSelectZone,
  height = '100%',
  isLive = false,
}) {
  const mapRef = useRef(null);
  const [mapReady, setMapReady] = useState(false);

  // Active View Mode: 'esriDark' | 'osm' | 'topology'
  const [viewMode, setViewMode] = useState('esriDark');
  const [tileError, setTileError] = useState(false);
  const [isFallbackActive, setIsFallbackActive] = useState(false);

  // Safe fallback coordinates (Delhi IIITD Campus baseline)
  const defaultCenter = [28.5459, 77.2732];

  // Calculate dynamic map center based on selected or first valid zone
  const center = useMemo(() => {
    if (selectedZone && Number.isFinite(selectedZone.lat) && Number.isFinite(selectedZone.lng)) {
      return [selectedZone.lat, selectedZone.lng];
    }
    const firstValid = zones.find(
      (z) => Number.isFinite(z.lat) && Number.isFinite(z.lng) && z.lat !== 0 && z.lng !== 0
    );
    return firstValid ? [firstValid.lat, firstValid.lng] : defaultCenter;
  }, [zones, selectedZone]);

  // Determine current active tile configuration
  const activeTileConfig = useMemo(() => {
    // Respect custom environment variable override if provided
    const customUrl = import.meta.env.VITE_MAP_TILE_URL;
    const customAttr = import.meta.env.VITE_MAP_ATTRIBUTION;
    if (customUrl) {
      return {
        name: 'Custom Basemap',
        url: customUrl,
        attribution: customAttr || 'Tiles &copy; Custom Map Provider',
        maxZoom: 18,
      };
    }

    if (viewMode === 'osm') {
      return TILE_PROVIDERS.osm;
    }
    return TILE_PROVIDERS.esriDark;
  }, [viewMode]);

  // Handle tile load failures by gracefully engaging the topology fallback
  const handleTileError = useCallback(() => {
    setTileError(true);
    setIsFallbackActive(true);
    setViewMode('topology');
  }, []);

  // Safe filter for zones with valid coordinates
  const validMapZones = useMemo(() => {
    return zones.filter(
      (z) =>
        Number.isFinite(z.lat) &&
        Number.isFinite(z.lng) &&
        z.lat >= -90 &&
        z.lat <= 90 &&
        z.lng >= -180 &&
        z.lng <= 180
    );
  }, [zones]);

  return (
    <div
      className="relative rounded-xl overflow-hidden border border-senpay-border bg-[#0B1118] flex flex-col"
      style={{ height }}
    >
      {/* ── Top Header Control Bar ── */}
      <div className="absolute top-3 left-3 right-3 z-[600] flex flex-wrap items-center justify-between gap-2 pointer-events-none">
        {/* Left Side: View Mode Toggles & Basemap Status Pill */}
        <div className="flex items-center gap-2 pointer-events-auto">
          {/* Mode Switcher */}
          <div className="flex items-center rounded-lg bg-[#0F1722]/90 border border-senpay-border p-0.5 backdrop-blur-md shadow-lg">
            <button
              onClick={() => {
                setViewMode('esriDark');
                setIsFallbackActive(false);
                setTileError(false);
              }}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-mono font-medium transition ${
                viewMode === 'esriDark' && !isFallbackActive
                  ? 'bg-senpay-cyan/20 text-senpay-cyan border border-senpay-cyan/40 shadow-sm'
                  : 'text-senpay-text-muted hover:text-white'
              }`}
              title="Switch to Dark Geographic Basemap (Esri Canvas)"
            >
              <MapIcon size={12} />
              <span>Dark Basemap</span>
            </button>

            <button
              onClick={() => {
                setViewMode('osm');
                setIsFallbackActive(false);
                setTileError(false);
              }}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-mono font-medium transition ${
                viewMode === 'osm' && !isFallbackActive
                  ? 'bg-senpay-cyan/20 text-senpay-cyan border border-senpay-cyan/40 shadow-sm'
                  : 'text-senpay-text-muted hover:text-white'
              }`}
              title="Switch to Standard OpenStreetMap Basemap"
            >
              <Layers size={12} />
              <span>OSM</span>
            </button>

            <button
              onClick={() => {
                setViewMode('topology');
                setIsFallbackActive(false);
              }}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-mono font-medium transition ${
                viewMode === 'topology' || isFallbackActive
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-sm'
                  : 'text-senpay-text-muted hover:text-white'
              }`}
              title="Switch to Schematic Network Topology View"
            >
              <Network size={12} />
              <span>Topology View</span>
            </button>
          </div>

          {/* Status Alert Pill when Fallback is Triggered */}
          {isFallbackActive && (
            <div className="flex items-center gap-2 px-3 py-1 rounded-lg bg-amber-500/15 border border-amber-500/40 text-amber-300 text-xs font-mono backdrop-blur-md shadow-lg animate-fade-in">
              <AlertTriangle size={13} className="text-amber-400 animate-pulse" />
              <span className="font-semibold">Basemap unavailable — topology view active</span>
              <button
                onClick={() => {
                  setTileError(false);
                  setIsFallbackActive(false);
                  setViewMode('esriDark');
                }}
                className="flex items-center gap-1 px-2 py-0.5 rounded bg-amber-500/25 hover:bg-amber-500/40 text-white text-[11px] font-bold border border-amber-500/50 transition ml-1"
                title="Attempt to reload basemap tiles"
              >
                <RefreshCw size={10} />
                <span>Retry Basemap</span>
              </button>
            </div>
          )}
        </div>

        {/* Right Side: Sector Count & Telemetry Mode Pill */}
        <div className="flex items-center gap-2 pointer-events-auto">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#0F1722]/90 border border-senpay-border text-xs font-mono text-slate-300 backdrop-blur-md shadow-lg">
            <Radio size={12} className={isLive ? 'text-emerald-400 animate-pulse' : 'text-senpay-cyan'} />
            <span className="font-bold">{zones.length}</span>
            <span className="text-senpay-text-muted">Sectors Monitored</span>
          </div>
        </div>
      </div>

      {/* ── Center Content: Either Schematic Topology or Geographic Leaflet Map ── */}
      {viewMode === 'topology' || isFallbackActive ? (
        <SchematicTopologyView
          zones={zones}
          selectedZone={selectedZone}
          onSelectZone={onSelectZone}
        />
      ) : (
        <div className="relative w-full h-full">
          <MapContainer
            ref={mapRef}
            center={center}
            zoom={16}
            style={{ height: '100%', width: '100%', background: '#0B1118' }}
            zoomControl={true}
            whenReady={() => setMapReady(true)}
          >
            {/* Real Geographic Basemap TileLayer (No Watermarks, Public & Free) */}
            <TileLayer
              key={`${activeTileConfig.id}-${activeTileConfig.url}`}
              url={activeTileConfig.url}
              attribution={activeTileConfig.attribution}
              maxZoom={activeTileConfig.maxZoom}
              className={activeTileConfig.isDark ? 'senpay-dark-tiles' : ''}
            />

            {/* Recenter & Invalidate Map Size Handlers */}
            <MapRecenter center={center} />
            <MapResizeHandler />
            <TileErrorMonitor onTileError={handleTileError} />

            {/* Zone Overlays: Circles & Tooltips */}
            {validMapZones.map((zone) => {
              const risk = getRiskLevel(zone.riskScore);
              const isDanger = zone.riskScore > 65;
              const isWarning = zone.riskScore > 40;
              const isSelected = selectedZone?.id === zone.id;

              const densityVal = Number.isFinite(zone.density) ? zone.density : '—';
              const flowVal = Number.isFinite(zone.flowInstability) ? `${zone.flowInstability}%` : '—';
              const panicVal = Number.isFinite(zone.panicLevel) ? `${zone.panicLevel}%` : '—';
              const riskVal = Number.isFinite(zone.riskScore) ? zone.riskScore : 0;
              const radiusVal = Number.isFinite(zone.radius) ? zone.radius : 100;

              return (
                <Circle
                  key={zone.id}
                  center={[zone.lat, zone.lng]}
                  radius={radiusVal}
                  pathOptions={{
                    color: isSelected ? '#00E5FF' : risk.color,
                    weight: isSelected ? 3.5 : 2,
                    fillColor: risk.color,
                    fillOpacity: isDanger ? 0.35 : isWarning ? 0.22 : 0.12,
                    dashArray: isDanger ? '' : '6 4',
                    className: isDanger ? 'danger-pulse' : '',
                  }}
                  eventHandlers={{
                    click: () => onSelectZone?.(zone),
                  }}
                >
                  <Popup>
                    <div className="min-w-[210px] p-1 font-sans">
                      <div className="flex items-center justify-between mb-2 pb-1.5 border-b border-slate-700">
                        <span className="font-bold text-sm text-white">{zone.name}</span>
                        <span
                          className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase"
                          style={{ backgroundColor: `${risk.color}25`, color: risk.color }}
                        >
                          {risk.label}
                        </span>
                      </div>
                      <div className="space-y-1.5 text-xs">
                        <div className="flex justify-between">
                          <span className="text-slate-400">Crowd Density:</span>
                          <span className="font-mono font-bold text-white">{densityVal} ppl/m²</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Flow Instability:</span>
                          <span className="font-mono font-medium text-white">{flowVal}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Panic Index:</span>
                          <span className="font-mono font-medium text-white">{panicVal}</span>
                        </div>
                        <div className="pt-1.5 mt-1.5 border-t border-slate-700/80 flex justify-between items-center">
                          <span className="text-slate-400 font-semibold">Congestion Score:</span>
                          <span className="font-mono font-bold text-base" style={{ color: risk.color }}>
                            {riskVal} / 100
                          </span>
                        </div>
                      </div>
                      <div className="mt-2.5 h-1.5 rounded-full bg-slate-800 overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{ width: `${Math.min(100, Math.max(0, riskVal))}%`, backgroundColor: risk.color }}
                        />
                      </div>
                    </div>
                  </Popup>
                </Circle>
              );
            })}
          </MapContainer>

          {/* Map Legend Overlay */}
          <div className="absolute bottom-4 left-4 z-[500] flex items-center gap-3 px-3 py-1.5 rounded-lg bg-[#0E1520]/90 border border-slate-800 text-[10px] font-mono backdrop-blur-md shadow-lg pointer-events-auto">
            <span className="text-slate-400 font-bold uppercase tracking-wider">Risk Level:</span>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#00FF88]" />
              <span className="text-slate-300">Safe (0-40)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#FFB800]" />
              <span className="text-slate-300">Warning (41-65)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#FF3B5C] animate-pulse" />
              <span className="text-slate-300">Critical (66+)</span>
            </div>
          </div>
        </div>
      )}

      {/* Selected Zone Quick Badge Overlay */}
      {selectedZone && (
        <div className="absolute top-14 right-3 z-[600] flex items-center gap-3 px-3 py-2 rounded-xl bg-[#0F1722]/95 border border-senpay-border shadow-2xl backdrop-blur-md animate-slide-in-right">
          <div
            className="w-2.5 h-2.5 rounded-full flex-shrink-0"
            style={{ backgroundColor: getRiskLevel(selectedZone.riskScore).color }}
          />
          <div className="flex flex-col">
            <span className="text-xs font-bold text-white leading-tight">{selectedZone.name}</span>
            <span className="text-[10px] font-mono text-slate-400">
              CRS {selectedZone.riskScore ?? '—'} • {selectedZone.density ?? '—'} ppl/m²
            </span>
          </div>
          <button
            onClick={() => onSelectZone?.(null)}
            className="text-slate-500 hover:text-white text-xs ml-2 px-1 rounded hover:bg-slate-800 transition"
            title="Deselect zone"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
}
