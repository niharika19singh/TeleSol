// ═══════════════════════════════════════════════════════
// SENPAY Network Digital Twin — Telecom & Site Map
// High-reliability geographic basemap with custom telecom
// site markers, 9 map layers, and dark schematic topology
// ═══════════════════════════════════════════════════════

import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { MapContainer, TileLayer, Circle, Popup, Tooltip, Marker, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
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
  Info,
  Sliders,
  Check
} from 'lucide-react';
import { getRiskLevel } from '../../data/mockData';
import { useTheme, THEMES } from '../../context/ThemeContext';
import 'leaflet/dist/leaflet.css';

// ── Default Keyless Tile Providers ──
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

// ── Custom Telecom Mast DivIcon Factory ──
function createTelecomSiteIcon(site, isSelected, layers = {}) {
  const riskScore = Number.isFinite(site.riskScore) ? site.riskScore : (site.metrics?.crs ?? 0);
  const isDanger = riskScore > 65;
  const isWarning = riskScore > 40 && riskScore <= 65;
  const statusColor = isDanger ? '#FF3B5C' : isWarning ? '#FFB800' : '#00FF88';

  const tech = site.technology || (site.tech_type === '5G_NR' ? '5G' : 'LTE');
  const siteCode = site.name ? site.name.split('—')[0].trim() : (site.site_id || site.id);
  const showTech = layers.tech !== false;
  const showCongestion = layers.congestion !== false;

  return L.divIcon({
    className: 'custom-telecom-site-icon',
    html: `
      <div class="telecom-marker-container ${isSelected ? 'marker-selected' : ''}">
        <div class="marker-dot" style="background-color: ${statusColor}; box-shadow: 0 0 10px ${statusColor}80">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#0B1118" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round">
            <path d="M4.9 19.1C1 15.2 1 8.8 4.9 4.9"/>
            <path d="M7.8 16.2c-2.3-2.3-2.3-6.1 0-8.5"/>
            <circle cx="12" cy="12" r="2.2" fill="#0B1118"/>
            <path d="M16.2 7.8c2.3 2.3 2.3 6.1 0 8.5"/>
            <path d="M19.1 4.9C23 8.8 23 15.1 19.1 19"/>
          </svg>
        </div>
        <div class="marker-badge">
          <span class="badge-id">${siteCode}</span>
          ${showTech ? `<span class="badge-tech">${tech}</span>` : ''}
          ${showCongestion ? `<span class="badge-risk" style="color:${statusColor}">${riskScore}</span>` : ''}
        </div>
      </div>
    `,
    iconSize: [64, 42],
    iconAnchor: [32, 21],
    popupAnchor: [0, -22],
  });
}

// ── Map Bounds Auto-Fitter ──
function MapBoundsFitter({ sites }) {
  const map = useMap();
  const prevCount = useRef(sites.length);
  const prevCenterFirst = useRef(sites[0] ? `${sites[0].lat},${sites[0].lng}` : '');

  useEffect(() => {
    if (!sites || sites.length === 0) return;
    const currentFirst = `${sites[0].lat},${sites[0].lng}`;

    // Re-fit if site count changed significantly or center region switched
    if (sites.length !== prevCount.current || currentFirst !== prevCenterFirst.current) {
      prevCount.current = sites.length;
      prevCenterFirst.current = currentFirst;

      const validLatLngs = sites
        .filter((s) => Number.isFinite(s.lat) && Number.isFinite(s.lng))
        .map((s) => [s.lat, s.lng]);

      if (validLatLngs.length > 0) {
        try {
          const bounds = L.latLngBounds(validLatLngs);
          map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
        } catch {}
      }
    }
  }, [sites, map]);

  return null;
}

// ── Component: Auto-Recenter on selectedZone ──
function MapRecenter({ center }) {
  const map = useMap();
  useEffect(() => {
    if (center && Number.isFinite(center[0]) && Number.isFinite(center[1])) {
      map.setView(center, Math.max(map.getZoom() || 14, 14), { animate: true, duration: 0.8 });
    }
  }, [center, map]);
  return null;
}

// ── Component: Container Resize Observer ──
function MapResizeHandler() {
  const map = useMap();
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        map.invalidateSize();
      } catch {}
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

// ── Component: Schematic Network Topology Canvas ──
function SchematicTopologyView({ zones, selectedZone, onSelectZone }) {
  const sectorPositions = {
    'zone-a': { x: 190, y: 130, sector: 'SEC-A', code: 'GATE-A', role: 'Main Entry Ingress' },
    'zone-b': { x: 730, y: 130, sector: 'SEC-B', code: 'GATE-B', role: 'East Wing Perimeter' },
    'zone-c': { x: 460, y: 100, sector: 'SEC-C', code: 'GATE-C', role: 'VIP Core Corridor' },
    'zone-d': { x: 460, y: 440, sector: 'SEC-D', code: 'GATE-D', role: 'South Exit Egress' },
    'zone-e': { x: 190, y: 410, sector: 'SEC-E', code: 'GATE-E', role: 'Parking Zone Access' },
    'zone-f': { x: 730, y: 410, sector: 'SEC-F', code: 'GATE-F', role: 'Emergency Egress' },
  };

  const centerNode = { x: 460, y: 270, label: 'CENTRAL 5G CORE MACRO GATEWAY', sub: 'NOC Aggregation Hub' };

  // If viewing UCC 5G dataset or large site list, map them into an organized radial ring
  const displaySites = useMemo(() => {
    if (zones.length <= 6) {
      return zones.map((z) => ({
        ...z,
        pos: sectorPositions[z.id] || { x: 460, y: 270, sector: z.id, code: z.id },
      }));
    }
    // Arrange first 16 representative sites in concentric circles around core
    return zones.slice(0, 16).map((z, idx) => {
      const angle = (idx / 16) * 2 * Math.PI - Math.PI / 2;
      const radius = idx % 2 === 0 ? 190 : 130;
      return {
        ...z,
        pos: {
          x: Math.round(460 + radius * Math.cos(angle)),
          y: Math.round(270 + radius * Math.sin(angle)),
          sector: z.name ? z.name.split('—')[0].trim() : (z.site_id || `CELL-${idx}`),
          code: z.technology || '5G',
        },
      };
    });
  }, [zones]);

  return (
    <div className="relative w-full h-full bg-[#080D14] flex flex-col items-center justify-center overflow-hidden select-none">
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
          <radialGradient id="centerAura" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#00E5FF" stopOpacity="0.25" />
            <stop offset="60%" stopColor="#00E5FF" stopOpacity="0.05" />
            <stop offset="100%" stopColor="#00E5FF" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Grid Background */}
        <rect width="920" height="540" fill="url(#telecomGrid)" />

        {/* Outer Perimeter Handover Mesh */}
        {displaySites.length <= 6 && (
          <polygon
            points="190,130 460,100 730,130 730,410 460,440 190,410"
            fill="none"
            stroke="#1A2D42"
            strokeWidth="1.5"
            strokeDasharray="6 6"
          />
        )}

        {/* Central Gateway Aura */}
        <circle cx={centerNode.x} cy={centerNode.y} r="110" fill="url(#centerAura)" />

        {/* Backhaul Links: Central Gateway to Sites */}
        {displaySites.map((site) => {
          const pos = site.pos;
          const riskScore = Number.isFinite(site.riskScore) ? site.riskScore : (site.metrics?.crs ?? 0);
          const risk = getRiskLevel(riskScore);
          const isSelected = selectedZone?.id === site.id;
          return (
            <g key={`link-${site.id}`}>
              <line
                x1={centerNode.x}
                y1={centerNode.y}
                x2={pos.x}
                y2={pos.y}
                stroke={isSelected ? '#00E5FF' : risk.color}
                strokeWidth={isSelected ? 2.5 : 1.5}
                strokeOpacity={isSelected ? 0.9 : 0.35}
                strokeDasharray={riskScore > 65 ? '' : '5 4'}
              />
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

        {/* Central Core Gateway Node */}
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

        {/* Sector / Cell Nodes */}
        {displaySites.map((site) => {
          const pos = site.pos;
          const riskScore = Number.isFinite(site.riskScore) ? site.riskScore : (site.metrics?.crs ?? 0);
          const risk = getRiskLevel(riskScore);
          const isSelected = selectedZone?.id === site.id;
          const isDanger = riskScore > 65;

          const siteLabel = site.name ? site.name.split('—')[0].trim() : (site.site_id || site.id);
          const techLabel = site.technology || '5G';

          return (
            <g
              key={site.id}
              transform={`translate(${pos.x}, ${pos.y})`}
              onClick={() => onSelectZone?.(site)}
              className="cursor-pointer group"
            >
              {/* Pulsing Alert Halo for Critical */}
              {isDanger && (
                <circle
                  r="52"
                  fill="none"
                  stroke="#FF3B5C"
                  strokeWidth="1.5"
                  opacity="0.5"
                  className="animate-ping"
                  style={{ animationDuration: '2.5s' }}
                />
              )}

              {/* Node Card */}
              <rect
                x="-42"
                y="-26"
                width="84"
                height="52"
                rx="7"
                fill="#0F1722"
                stroke={isSelected ? '#00E5FF' : risk.color}
                strokeWidth={isSelected ? 2 : 1}
                className="transition-all duration-200 group-hover:stroke-[#00E5FF]"
              />

              {/* Sector Pill & Title */}
              <text textAnchor="middle" y="-12" fill="#94A3B8" fontSize="8" fontFamily="monospace" fontWeight="600">
                {pos.sector} • {techLabel}
              </text>
              <text textAnchor="middle" y="2" fill="#FFFFFF" fontSize="9.5" fontWeight="bold">
                {siteLabel}
              </text>

              {/* CRS & Status */}
              <text textAnchor="middle" y="16" fill={risk.color} fontSize="8.5" fontWeight="bold" fontFamily="monospace">
                CRS: {riskScore} • {risk.label.toUpperCase()}
              </text>

              {isSelected && (
                <circle cx="0" cy="-26" r="3.5" fill="#00E5FF" className="animate-pulse" />
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
  layers: externalLayers,
  onToggleLayer,
}) {
  const mapRef = useRef(null);
  const [mapReady, setMapReady] = useState(false);

  // Active View Mode: 'esriDark' | 'osm' | 'topology'
  const [viewMode, setViewMode] = useState('esriDark');
  const [tileError, setTileError] = useState(false);
  const [isFallbackActive, setIsFallbackActive] = useState(false);

  // 9 Default Map Layers
  const defaultLayers = {
    sites: true,        // 1. Network Sites
    tech: true,         // 2. Cell Technology
    signal: true,       // 3. Signal Quality
    congestion: true,   // 4. Congestion (CRS)
    density: false,     // 5. Crowd Density
    incidents: true,    // 6. Active Incidents
    prediction: true,   // 7. Predicted Risk
    coverage: false,    // 8. Coverage Areas (default OFF, simulated)
    links: true,        // 9. Site-to-Site Links (simulated backhaul)
  };

  const activeLayers = externalLayers || defaultLayers;

  // Filter valid geographic coordinates
  const validMapZones = useMemo(() => {
    return zones
      .map((z) => ({
        ...z,
        lat: Number.isFinite(z.lat) ? z.lat : (Number.isFinite(z.latitude) ? z.latitude : null),
        lng: Number.isFinite(z.lng) ? z.lng : (Number.isFinite(z.longitude) ? z.longitude : null),
      }))
      .filter(
        (z) =>
          Number.isFinite(z.lat) &&
          Number.isFinite(z.lng) &&
          z.lat >= -90 &&
          z.lat <= 90 &&
          z.lng >= -180 &&
          z.lng <= 180
      );
  }, [zones]);

  // Compute dynamic center
  const center = useMemo(() => {
    if (selectedZone && Number.isFinite(selectedZone.lat) && Number.isFinite(selectedZone.lng)) {
      return [selectedZone.lat, selectedZone.lng];
    }
    const firstValid = validMapZones[0];
    return firstValid ? [firstValid.lat, firstValid.lng] : [51.898, -8.473]; // Cork baseline default
  }, [selectedZone, validMapZones]);

  // Compute backhaul links between adjacent sites (for links layer)
  const backhaulLinks = useMemo(() => {
    if (!activeLayers.links || validMapZones.length < 2) return [];
    const links = [];
    // Draw links between nearby sites (simple distance mesh)
    for (let i = 0; i < Math.min(validMapZones.length, 25); i++) {
      for (let j = i + 1; j < Math.min(validMapZones.length, 25); j++) {
        const a = validMapZones[i];
        const b = validMapZones[j];
        const dist = Math.hypot(a.lat - b.lat, a.lng - b.lng);
        // Link sites within approx 1.5km
        if (dist < 0.02) {
          links.push([[a.lat, a.lng], [b.lat, b.lng]]);
        }
      }
    }
    return links;
  }, [validMapZones, activeLayers.links]);

  const { theme } = useTheme();

  const activeTileConfig = useMemo(() => {
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
    const isLightMode = theme === THEMES.LIGHT;
    if (viewMode === 'osm' || isLightMode) {
      return TILE_PROVIDERS.osm;
    }
    return TILE_PROVIDERS.esriDark;
  }, [viewMode, theme]);

  const handleTileError = useCallback(() => {
    setTileError(true);
    setIsFallbackActive(true);
    setViewMode('topology');
  }, []);

  return (
    <div
      className="relative rounded-xl overflow-hidden border border-senpay-border bg-senpay-bg flex flex-col transition-colors duration-150"
      style={{ height }}
    >
      {/* ── Top Header Control Bar ── */}
      <div className="absolute top-3 left-3 right-3 z-[600] flex flex-wrap items-center justify-between gap-2 pointer-events-none">
        {/* Left Side: View Mode Toggles */}
        <div className="flex items-center gap-2 pointer-events-auto">
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

        {/* Right Side: Site Count & Telemetry Mode Pill */}
        <div className="flex items-center gap-2 pointer-events-auto">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#0F1722]/90 border border-senpay-border text-xs font-mono text-slate-300 backdrop-blur-md shadow-lg">
            <Radio size={12} className={isLive ? 'text-emerald-400 animate-pulse' : 'text-senpay-cyan'} />
            <span className="font-bold">{validMapZones.length}</span>
            <span className="text-senpay-text-muted">Sites Active</span>
          </div>
        </div>
      </div>

      {/* ── Center Content: Schematic Topology or Geographic Leaflet Map ── */}
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
            zoom={14}
            style={{ height: '100%', width: '100%', background: '#0B1118' }}
            zoomControl={true}
            whenReady={() => setMapReady(true)}
          >
            {/* Real Geographic Basemap TileLayer */}
            <TileLayer
              key={`${activeTileConfig.id}-${activeTileConfig.url}`}
              url={activeTileConfig.url}
              attribution={activeTileConfig.attribution}
              maxZoom={activeTileConfig.maxZoom}
              className={activeTileConfig.isDark ? 'senpay-dark-tiles' : ''}
            />

            {/* Recenter, Fit Bounds & Invalidate Handlers */}
            <MapBoundsFitter sites={validMapZones} />
            <MapRecenter center={center} />
            <MapResizeHandler />
            <TileErrorMonitor onTileError={handleTileError} />

            {/* Layer 9: Site-to-Site Backhaul Links (Subtle mesh) */}
            {activeLayers.links &&
              backhaulLinks.map((link, idx) => (
                <Polyline
                  key={`link-mesh-${idx}`}
                  positions={link}
                  pathOptions={{
                    color: '#00E5FF',
                    weight: 1.2,
                    opacity: 0.25,
                    dashArray: '4 4',
                  }}
                />
              ))}

            {/* Layer 8: Optional Coverage Hulls (Default OFF, simulated) */}
            {activeLayers.coverage &&
              validMapZones.map((site) => {
                const riskScore = Number.isFinite(site.riskScore) ? site.riskScore : (site.metrics?.crs ?? 0);
                const risk = getRiskLevel(riskScore);
                const radius = site.estimated_coverage_radius_m || site.radius || 180;
                return (
                  <Circle
                    key={`cov-${site.id}`}
                    center={[site.lat, site.lng]}
                    radius={radius}
                    pathOptions={{
                      color: risk.color,
                      weight: 1,
                      fillColor: risk.color,
                      fillOpacity: 0.05,
                      dashArray: '4 4',
                    }}
                  />
                );
              })}

            {/* Layer 1-7: Realistic Telecom Site Markers */}
            {activeLayers.sites &&
              validMapZones.map((site) => {
                const isSelected = selectedZone?.id === site.id;
                const riskScore = Number.isFinite(site.riskScore) ? site.riskScore : (site.metrics?.crs ?? 0);
                const risk = getRiskLevel(riskScore);
                const siteName = site.name || site.site_id || site.id;
                const tech = site.technology || (site.tech_type === '5G_NR' ? '5G' : 'LTE');
                const rsrp = site.metrics?.rsrp ?? (site.rsrp ?? null);
                const rsrq = site.metrics?.rsrq ?? (site.rsrq ?? null);
                const density = site.density ?? (site.crowd_density ?? null);

                return (
                  <Marker
                    key={site.id}
                    position={[site.lat, site.lng]}
                    icon={createTelecomSiteIcon(site, isSelected, activeLayers)}
                    eventHandlers={{
                      click: () => onSelectZone?.(site),
                    }}
                  >
                    <Tooltip direction="top" offset={[0, -22]} opacity={0.95}>
                      <div className="p-1 font-mono text-xs">
                        <div className="font-bold text-white flex items-center justify-between gap-2">
                          <span>{siteName}</span>
                          <span className="text-[10px] px-1 py-0.5 rounded" style={{ backgroundColor: `${risk.color}30`, color: risk.color }}>
                            {tech} • CRS {riskScore}
                          </span>
                        </div>
                        {rsrp !== null && (
                          <div className="text-[10px] text-slate-300 mt-1">
                            RSRP: {rsrp} dBm {rsrq ? `| RSRQ: ${rsrq} dB` : ''}
                          </div>
                        )}
                        <div className="text-[9px] text-slate-400 mt-0.5">
                          {site.data_provenance ? site.data_provenance.replace('_', ' ') : 'PUBLIC DATA'}
                        </div>
                      </div>
                    </Tooltip>

                    <Popup>
                      <div className="min-w-[220px] p-1 font-sans">
                        <div className="flex items-center justify-between mb-2 pb-1.5 border-b border-slate-700">
                          <div>
                            <span className="text-[10px] font-mono text-senpay-cyan font-bold uppercase">{tech} SITE</span>
                            <h4 className="font-bold text-sm text-white leading-tight">{siteName}</h4>
                          </div>
                          <span
                            className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase"
                            style={{ backgroundColor: `${risk.color}25`, color: risk.color }}
                          >
                            {risk.label}
                          </span>
                        </div>

                        <div className="space-y-1.5 text-xs font-mono">
                          <div className="flex justify-between">
                            <span className="text-slate-400">Site ID / Cell:</span>
                            <span className="font-bold text-white">{site.cell_id || site.id}</span>
                          </div>
                          {rsrp !== null && (
                            <div className="flex justify-between">
                              <span className="text-slate-400">Signal (RSRP):</span>
                              <span className="font-bold text-white">{rsrp} dBm</span>
                            </div>
                          )}
                          {rsrq !== null && (
                            <div className="flex justify-between">
                              <span className="text-slate-400">Quality (RSRQ):</span>
                              <span className="font-bold text-white">{rsrq} dB</span>
                            </div>
                          )}
                          {density !== null && (
                            <div className="flex justify-between">
                              <span className="text-slate-400">Crowd Density:</span>
                              <span className="font-bold text-white">{density} ppl/m²</span>
                            </div>
                          )}
                          <div className="pt-1.5 mt-1.5 border-t border-slate-700/80 flex justify-between items-center">
                            <span className="text-slate-400 font-semibold">Congestion Score:</span>
                            <span className="font-mono font-bold text-base" style={{ color: risk.color }}>
                              {riskScore} / 100
                            </span>
                          </div>
                        </div>

                        <button
                          onClick={() => onSelectZone?.(site)}
                          className="mt-2.5 w-full py-1 text-center text-xs font-mono font-bold rounded bg-senpay-cyan text-slate-950 hover:bg-cyan-300 transition"
                        >
                          Deep Site Inspection →
                        </button>
                      </div>
                    </Popup>
                  </Marker>
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
            style={{ backgroundColor: getRiskLevel(selectedZone.riskScore || selectedZone.metrics?.crs || 0).color }}
          />
          <div className="flex flex-col">
            <span className="text-xs font-bold text-white leading-tight">
              {selectedZone.name || selectedZone.site_id || selectedZone.id}
            </span>
            <span className="text-[10px] font-mono text-slate-400">
              CRS {selectedZone.riskScore ?? selectedZone.metrics?.crs ?? '—'} • {selectedZone.technology || '5G'}
            </span>
          </div>
          <button
            onClick={() => onSelectZone?.(null)}
            className="text-slate-500 hover:text-white text-xs ml-2 px-1 rounded hover:bg-slate-800 transition"
            title="Deselect site"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
}
