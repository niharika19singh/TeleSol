// ═════════════════════════════════════════════════════════════════
// SENPAY — Operational Network Topology & Digital Twin Canvas
// Professional Network Operations Center (NOC) Schematic Representation
// Supports 3 Operational View Modes: Topology | Geographic | Incident Focus
// Harmonized for Light (Porcelain) and Dark (Obsidian) Themes
// ═════════════════════════════════════════════════════════════════

import React, { useState } from 'react';
import { 
  Server, 
  Radio, 
  Wifi, 
  AlertTriangle, 
  ShieldCheck, 
  Activity, 
  ArrowRight, 
  Zap, 
  Layers, 
  X, 
  Crosshair, 
  Maximize2,
  Compass,
  CheckCircle2
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

export const TOPOLOGY_NODES = [
  {
    id: 'GW-CORE-01',
    label: 'GW-CORE-01',
    name: 'Primary Core Gateway',
    type: 'GATEWAY',
    tier: 'Tier-1 Backbone',
    x: 80,
    y: 165,
    geoX: 110,
    geoY: 170,
    lat: '37.7749° N',
    lon: '122.4194° W',
    status: 'NOMINAL',
    crs: 12.0,
    latency: '18 ms',
    loss: '0.0%',
    throughput: '84.2 Gbps',
    provenance: 'Backbone MPLS Core',
    description: 'Central telecom gateway orchestrating metropolitan transit and core peering.'
  },
  {
    id: 'BS-SFO-01',
    label: 'BS-SFO-01',
    name: 'SFO Metro Access Point',
    type: 'BASE_STATION',
    tier: 'Tier-2 Distribution',
    x: 230,
    y: 85,
    geoX: 190,
    geoY: 110,
    lat: '37.7833° N',
    lon: '122.4167° W',
    status: 'NOMINAL',
    crs: 21.0,
    latency: '24 ms',
    loss: '0.1%',
    throughput: '9.8 Gbps',
    provenance: '5G gNodeB Macro Cell',
    description: 'Commercial 5G access point covering north metropolitan transit corridors.'
  },
  {
    id: 'BS-WEST-02',
    label: 'BS-WEST-02',
    name: 'West Corridor Hub',
    type: 'BASE_STATION',
    tier: 'Tier-2 Distribution',
    x: 230,
    y: 165,
    geoX: 240,
    geoY: 185,
    lat: '37.7690° N',
    lon: '122.4467° W',
    status: 'ELEVATED',
    crs: 64.0,
    latency: '68 ms',
    loss: '2.8%',
    throughput: '14.1 Gbps',
    provenance: 'UCC 5G Trace Node #02',
    description: 'Serving feeder base station experiencing heavy upstream packet queueing.'
  },
  {
    id: 'BS-OAK-03',
    label: 'BS-OAK-03',
    name: 'East Hub Base Station',
    type: 'BASE_STATION',
    tier: 'Tier-2 Distribution',
    x: 230,
    y: 250,
    geoX: 280,
    geoY: 250,
    lat: '37.8044° N',
    lon: '122.2712° W',
    status: 'NOMINAL',
    crs: 24.0,
    latency: '26 ms',
    loss: '0.2%',
    throughput: '11.4 Gbps',
    provenance: '5G gNodeB Macro Cell',
    description: 'East Bay distribution sector maintaining stable carrier-grade QoS.'
  },
  {
    id: 'SEC-GATE-A',
    label: 'SEC-GATE-A',
    name: 'Gate A — Main Entry',
    type: 'SECTOR',
    tier: 'Tier-3 Radio Sector',
    x: 430,
    y: 75,
    geoX: 380,
    geoY: 100,
    lat: '37.7890° N',
    lon: '122.4010° W',
    status: 'NOMINAL',
    crs: 18.0,
    latency: '22 ms',
    loss: '0.1%',
    throughput: '4.2 Gbps',
    provenance: 'Sector Antenna Array n78',
    description: 'Primary public entry zone with steady pedestrian ingress.'
  },
  {
    id: 'SEC-VIP-C1',
    label: 'SEC-VIP-C1',
    name: 'Gate C — VIP Corridor',
    type: 'SECTOR',
    tier: 'Tier-3 Radio Sector',
    x: 430,
    y: 165,
    geoX: 410,
    geoY: 185,
    lat: '37.7650° N',
    lon: '122.4350° W',
    status: 'CRITICAL',
    crs: 78.0,
    latency: '142 ms',
    loss: '14.2%',
    throughput: '1.4 Gbps (Throttled)',
    provenance: 'Sentinel Probe #4 · UCC 5G Feed',
    description: 'CRITICAL BOTTLENECK: High crowd density surge causing bufferbloat and packet drop.'
  },
  {
    id: 'SEC-EAST-B2',
    label: 'SEC-EAST-B2',
    name: 'Gate B — East Wing',
    type: 'SECTOR',
    tier: 'Tier-3 Radio Sector',
    x: 430,
    y: 255,
    geoX: 440,
    geoY: 260,
    lat: '37.7950° N',
    lon: '122.2580° W',
    status: 'NOMINAL',
    crs: 26.0,
    latency: '29 ms',
    loss: '0.3%',
    throughput: '5.8 Gbps',
    provenance: 'Sector Antenna Array n78',
    description: 'East wing terminal sector operating under standard capacity bounds.'
  },
  {
    id: 'SLICE-SKYLINK-5G',
    label: 'SLICE-SKYLINK-5G',
    name: 'SkyLink Dynamic 5G Slice',
    type: 'MITIGATION_SLICE',
    tier: 'Autonomous Overlay',
    x: 330,
    y: 105,
    geoX: 320,
    geoY: 135,
    lat: 'Virtual / Dynamic Allocation',
    lon: 'Dedicated 100MHz Carrier',
    status: 'RECOMMENDED',
    crs: 22.0,
    latency: '38 ms (Projected)',
    loss: '1.8% (Projected)',
    throughput: '+20.0 Gbps Burst',
    provenance: 'PayPilot Optimizer Candidate #1 (12.50 HSK)',
    description: 'On-demand URLLC network slice routing high-priority traffic around the congested feeder.'
  }
];

export const TOPOLOGY_LINKS = [
  { id: 'link_gw_sfo', source: 'GW-CORE-01', target: 'BS-SFO-01', type: 'BACKHAUL', status: 'NOMINAL', latency: '6ms' },
  { id: 'link_gw_west', source: 'GW-CORE-01', target: 'BS-WEST-02', type: 'BACKHAUL', status: 'ELEVATED', latency: '14ms' },
  { id: 'link_gw_oak', source: 'GW-CORE-01', target: 'BS-OAK-03', type: 'BACKHAUL', status: 'NOMINAL', latency: '8ms' },
  { id: 'link_sfo_gate_a', source: 'BS-SFO-01', target: 'SEC-GATE-A', type: 'ACCESS', status: 'NOMINAL', latency: '12ms' },
  { id: 'link_west_vip_c1', source: 'BS-WEST-02', target: 'SEC-VIP-C1', type: 'AFFECTED_CONGESTION', status: 'CRITICAL', latency: '142ms', loss: '14.2%' },
  { id: 'link_oak_east_b2', source: 'BS-OAK-03', target: 'SEC-EAST-B2', type: 'ACCESS', status: 'NOMINAL', latency: '15ms' },
  { id: 'link_mitigation_in', source: 'GW-CORE-01', target: 'SLICE-SKYLINK-5G', type: 'MITIGATION_ROUTE', status: 'AUTONOMOUS' },
  { id: 'link_mitigation_out', source: 'SLICE-SKYLINK-5G', target: 'SEC-VIP-C1', type: 'MITIGATION_ROUTE', status: 'AUTONOMOUS' }
];

export default function NetworkTopologyCanvas({
  selectedNodeId,
  onSelectNode,
  showMitigation = true
}) {
  const { isLight } = useTheme();
  const [viewMode, setViewMode] = useState('topology'); // 'topology' | 'geographic' | 'incident'
  const [showLabels, setShowLabels] = useState(true);
  const [activeInspector, setActiveInspector] = useState(selectedNodeId || 'SEC-VIP-C1');

  const selectedNode = TOPOLOGY_NODES.find((n) => n.id === activeInspector) || TOPOLOGY_NODES[5];

  const handleNodeClick = (node) => {
    setActiveInspector(node.id);
    if (onSelectNode) onSelectNode(node.id);
  };

  // Theme-aware tokens for SVG canvas rendering
  const palette = {
    canvasBg: isLight ? '#F4F6F8' : '#000000',
    gridStroke: isLight ? '#D5DDE5' : '#16222F',
    border: isLight ? '#D5DDE5' : '#26323E',
    nodeFill: isLight ? '#FFFFFF' : '#0A0D10',
    nodeStroke: isLight ? '#D5DDE5' : '#26323E',
    linkNeutral: isLight ? '#D5DDE5' : '#26323E',
    linkElevated: isLight ? '#946200' : '#E8AD43',
    linkCritical: isLight ? '#C62836' : '#E45B64',
    accent: isLight ? '#007F95' : '#20C7D9',
    success: isLight ? '#16794B' : '#39B980',
    textPrimary: isLight ? '#17212B' : '#F1F5F9',
    textMuted: isLight ? '#6B7A89' : '#758396',
    tagBg: isLight ? '#EDF1F5' : '#10161D',
  };

  return (
    <div className="relative w-full h-full flex flex-col justify-between bg-senpay-bg rounded-lg border border-senpay-border overflow-hidden select-none transition-colors duration-150">
      {/* ── 1. Compact View Controls & Status Header ── */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-senpay-border bg-senpay-card text-xs">
        {/* Left: View Mode Selector */}
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-mono text-senpay-text-muted uppercase mr-1 hidden sm:inline">
            Mode:
          </span>
          <button
            onClick={() => setViewMode('topology')}
            className={`px-2.5 py-1 rounded text-[11px] font-mono transition ${
              viewMode === 'topology'
                ? 'bg-senpay-panel text-senpay-cyan border border-senpay-cyan/40 font-bold'
                : 'text-senpay-text-secondary hover:text-senpay-text-primary border border-transparent'
            }`}
          >
            Topology
          </button>
          <button
            onClick={() => setViewMode('geographic')}
            className={`px-2.5 py-1 rounded text-[11px] font-mono transition ${
              viewMode === 'geographic'
                ? 'bg-senpay-panel text-senpay-cyan border border-senpay-cyan/40 font-bold'
                : 'text-senpay-text-secondary hover:text-senpay-text-primary border border-transparent'
            }`}
          >
            Geographic Map
          </button>
          <button
            onClick={() => setViewMode('incident')}
            className={`px-2.5 py-1 rounded text-[11px] font-mono transition flex items-center gap-1 ${
              viewMode === 'incident'
                ? 'bg-senpay-panel text-senpay-red border border-senpay-red/50 font-bold'
                : 'text-senpay-text-secondary hover:text-senpay-text-primary border border-transparent'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-senpay-red" />
            <span>Incident Focus</span>
          </button>
        </div>

        {/* Right: Telemetry status & Labels toggle */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowLabels(!showLabels)}
            className={`text-[10px] font-mono px-2 py-0.5 rounded border transition ${
              showLabels
                ? 'border-senpay-cyan/40 text-senpay-cyan bg-senpay-panel'
                : 'border-senpay-border text-senpay-text-muted hover:text-senpay-text-secondary'
            }`}
          >
            Labels {showLabels ? 'ON' : 'OFF'}
          </button>

          <div className="flex items-center gap-1.5 text-[10px] font-mono text-senpay-green border border-senpay-green/30 px-2 py-0.5 rounded bg-senpay-panel">
            <span className="w-1.5 h-1.5 rounded-full bg-senpay-green" />
            <span className="hidden md:inline">Sentinel Daemon: Connected</span>
            <span className="md:hidden">Sync</span>
          </div>
        </div>
      </div>

      {/* ── 2. Precise Schematic Canvas ── */}
      <div className="relative flex-1 w-full min-h-[300px] bg-senpay-bg overflow-hidden flex items-center justify-center transition-colors duration-150">
        {/* Engineering Grid Backdrop */}
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <pattern id="techGridTheme" width="24" height="24" patternUnits="userSpaceOnUse">
              <path d="M 24 0 L 0 0 0 24" fill="none" stroke={palette.gridStroke} strokeWidth="0.8" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#techGridTheme)" />
        </svg>

        {/* Geographic Mode Backdrop Lines */}
        {viewMode === 'geographic' && (
          <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-3 text-[9px] font-mono text-senpay-text-muted opacity-75">
            <div className="flex justify-between border-b border-senpay-border pb-1">
              <span>LAT 37.8200° N &bull; LON 122.4600° W</span>
              <span>METROPOLITAN CARRIER FOOTPRINT &bull; SCALE: 1:25,000</span>
            </div>
            <div className="flex justify-between border-t border-senpay-border pt-1">
              <span>DATUM: WGS-84 &bull; PRECISION: &plusmn;2.5M</span>
              <span>TELECOM SITE SECTORS: 7 ACTIVE</span>
            </div>
          </div>
        )}

        {/* Interactive SVG Diagram */}
        <svg
          viewBox={viewMode === 'incident' ? '180 40 320 220' : '0 10 540 310'}
          className="w-full h-full max-h-[380px] transition-all duration-300"
          preserveAspectRatio="xMidYMid meet"
        >
          <defs>
            {/* Arrowhead Markers */}
            <marker id="arrow-neutral" viewBox="0 0 6 6" refX="5" refY="3" markerWidth="4" markerHeight="4" orient="auto">
              <path d="M 0 1 L 5 3 L 0 5 z" fill={palette.linkNeutral} />
            </marker>
            <marker id="arrow-cyan" viewBox="0 0 6 6" refX="5" refY="3" markerWidth="4" markerHeight="4" orient="auto">
              <path d="M 0 1 L 5 3 L 0 5 z" fill={palette.accent} />
            </marker>
            <marker id="arrow-red" viewBox="0 0 6 6" refX="5" refY="3" markerWidth="4" markerHeight="4" orient="auto">
              <path d="M 0 1 L 5 3 L 0 5 z" fill={palette.linkCritical} />
            </marker>
          </defs>

          {/* ── Network Connections (Links) ── */}
          {TOPOLOGY_LINKS.map((link) => {
            const sourceNode = TOPOLOGY_NODES.find((n) => n.id === link.source);
            const targetNode = TOPOLOGY_NODES.find((n) => n.id === link.target);
            if (!sourceNode || !targetNode) return null;

            const isGeo = viewMode === 'geographic';
            const sx = isGeo ? sourceNode.geoX : sourceNode.x;
            const sy = isGeo ? sourceNode.geoY : sourceNode.y;
            const tx = isGeo ? targetNode.geoX : targetNode.x;
            const ty = isGeo ? targetNode.geoY : targetNode.y;

            // Incident focus filters out unrelated links
            if (viewMode === 'incident' && !['link_gw_west', 'link_west_vip_c1', 'link_mitigation_in', 'link_mitigation_out'].includes(link.id)) {
              return null;
            }

            // Normal Backhaul Link
            if (link.type === 'BACKHAUL' || link.type === 'ACCESS') {
              const isWestElevated = link.id === 'link_gw_west';
              return (
                <g key={link.id}>
                  <line
                    x1={sx}
                    y1={sy}
                    x2={tx}
                    y2={ty}
                    stroke={isWestElevated ? palette.linkElevated : palette.linkNeutral}
                    strokeWidth={isWestElevated ? 2 : 1.5}
                    strokeDasharray={isWestElevated ? '4 3' : 'none'}
                  />
                  {showLabels && (
                    <text
                      x={(sx + tx) / 2}
                      y={(sy + ty) / 2 - 4}
                      fill={palette.textMuted}
                      fontSize="7.5"
                      fontFamily="monospace"
                      textAnchor="middle"
                    >
                      {link.latency}
                    </text>
                  )}
                </g>
              );
            }

            // Affected Link (Congestion Incident)
            if (link.type === 'AFFECTED_CONGESTION') {
              return (
                <g key={link.id}>
                  {/* Critical Red Connection Line */}
                  <line
                    x1={sx}
                    y1={sy}
                    x2={tx}
                    y2={ty}
                    stroke={palette.linkCritical}
                    strokeWidth="2.5"
                    strokeDasharray="6 3"
                  />
                  {/* Warning Annotation Tag */}
                  <rect
                    x={(sx + tx) / 2 - 40}
                    y={(sy + ty) / 2 - 9}
                    width="80"
                    height="16"
                    rx="3"
                    fill={palette.tagBg}
                    stroke={palette.linkCritical}
                    strokeWidth="1"
                  />
                  <text
                    x={(sx + tx) / 2}
                    y={(sy + ty) / 2 + 2.5}
                    fill={palette.linkCritical}
                    fontSize="7.5"
                    fontWeight="bold"
                    fontFamily="monospace"
                    textAnchor="middle"
                  >
                    14.2% LOSS &bull; 142ms
                  </text>
                </g>
              );
            }

            // Mitigation Route Link (SkyLink 5G Slice)
            if (link.type === 'MITIGATION_ROUTE' && showMitigation) {
              return (
                <g key={link.id}>
                  <line
                    x1={sx}
                    y1={sy}
                    x2={tx}
                    y2={ty}
                    stroke={palette.accent}
                    strokeWidth="1.8"
                    strokeDasharray="4 3"
                    markerEnd="url(#arrow-cyan)"
                  />
                </g>
              );
            }

            return null;
          })}

          {/* ── Network Nodes ── */}
          {TOPOLOGY_NODES.map((node) => {
            const isGeo = viewMode === 'geographic';
            const nx = isGeo ? node.geoX : node.x;
            const ny = isGeo ? node.geoY : node.y;
            const isSelected = activeInspector === node.id;
            const isCritical = node.status === 'CRITICAL';
            const isElevated = node.status === 'ELEVATED';
            const isMitigation = node.type === 'MITIGATION_SLICE';

            if (viewMode === 'incident' && !['GW-CORE-01', 'BS-WEST-02', 'SEC-VIP-C1', 'SLICE-SKYLINK-5G'].includes(node.id)) {
              return null;
            }

            return (
              <g
                key={node.id}
                onClick={() => handleNodeClick(node)}
                className="cursor-pointer group"
                tabIndex={0}
                role="button"
                aria-label={`Inspect network node ${node.id}`}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleNodeClick(node); }}
              >
                {/* Selection Outline */}
                {isSelected && (
                  <circle
                    cx={nx}
                    cy={ny}
                    r="16"
                    fill="none"
                    stroke={palette.accent}
                    strokeWidth="1.5"
                    strokeDasharray="3 2"
                  />
                )}

                {/* Node Geometry by Role */}
                {node.type === 'GATEWAY' && (
                  <g>
                    <rect
                      x={nx - 10}
                      y={ny - 10}
                      width="20"
                      height="20"
                      rx="3"
                      fill={palette.nodeFill}
                      stroke={isSelected ? palette.accent : palette.nodeStroke}
                      strokeWidth="1.8"
                    />
                    <rect x={nx - 4} y={ny - 4} width="8" height="8" rx="1" fill={palette.success} />
                  </g>
                )}

                {node.type === 'BASE_STATION' && (
                  <g>
                    <circle
                      cx={nx}
                      cy={ny}
                      r="9"
                      fill={palette.nodeFill}
                      stroke={isElevated ? palette.linkElevated : isSelected ? palette.accent : palette.nodeStroke}
                      strokeWidth="1.8"
                    />
                    <circle
                      cx={nx}
                      cy={ny}
                      r="3.5"
                      fill={isElevated ? palette.linkElevated : palette.success}
                    />
                  </g>
                )}

                {node.type === 'SECTOR' && (
                  <g>
                    <polygon
                      points={`${nx},${ny - 9} ${nx + 8},${ny + 5} ${nx - 8},${ny + 5}`}
                      fill={palette.nodeFill}
                      stroke={isCritical ? palette.linkCritical : isSelected ? palette.accent : palette.nodeStroke}
                      strokeWidth="1.8"
                    />
                    <circle
                      cx={nx}
                      cy={ny + 1}
                      r="2.5"
                      fill={isCritical ? palette.linkCritical : palette.success}
                    />
                    {/* Critical Incident Marker */}
                    {isCritical && (
                      <g>
                        <circle cx={nx + 9} cy={ny - 9} r="4.5" fill={palette.linkCritical} />
                        <text
                          x={nx + 9}
                          y={ny - 7}
                          fill="#FFFFFF"
                          fontSize="6.5"
                          fontWeight="bold"
                          fontFamily="sans-serif"
                          textAnchor="middle"
                        >
                          !
                        </text>
                      </g>
                    )}
                  </g>
                )}

                {node.type === 'MITIGATION_SLICE' && (
                  <g>
                    <polygon
                      points={`${nx},${ny - 10} ${nx + 10},${ny} ${nx},${ny + 10} ${nx - 10},${ny}`}
                      fill={palette.tagBg}
                      stroke={palette.accent}
                      strokeWidth="1.8"
                    />
                    <circle cx={nx} cy={ny} r="2.5" fill={palette.accent} />
                  </g>
                )}

                {/* Node Text Label */}
                {showLabels && (
                  <g>
                    <text
                      x={nx}
                      y={ny + 18}
                      fill={isCritical ? palette.linkCritical : isSelected ? palette.accent : palette.textPrimary}
                      fontSize="8"
                      fontWeight={isCritical || isSelected ? 'bold' : 'normal'}
                      fontFamily="monospace"
                      textAnchor="middle"
                    >
                      {node.label}
                    </text>
                    <text
                      x={nx}
                      y={ny + 26}
                      fill={palette.textMuted}
                      fontSize="6.5"
                      fontFamily="monospace"
                      textAnchor="middle"
                    >
                      {node.type === 'MITIGATION_SLICE' ? '12.5 HSK' : `CRS: ${node.crs.toFixed(0)}`}
                    </text>
                  </g>
                )}
              </g>
            );
          })}
        </svg>

        {/* ── 3. Embedded Compact Technical Inspector Tray ── */}
        {selectedNode && (
          <div className="absolute bottom-2 right-2 max-w-[280px] w-full p-2.5 rounded bg-senpay-card border border-senpay-border shadow-lg text-xs font-mono z-20 transition-colors duration-150">
            <div className="flex items-center justify-between pb-1.5 border-b border-senpay-border mb-2">
              <div className="flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${
                  selectedNode.status === 'CRITICAL' ? 'bg-senpay-red' :
                  selectedNode.status === 'ELEVATED' ? 'bg-senpay-amber' :
                  selectedNode.status === 'RECOMMENDED' ? 'bg-senpay-cyan' : 'bg-senpay-green'
                }`} />
                <span className="font-bold text-senpay-text-primary text-[11px]">{selectedNode.id}</span>
              </div>
              <span className={`text-[9px] px-1.5 py-0.2 rounded font-bold ${
                selectedNode.status === 'CRITICAL' ? 'bg-senpay-red/15 text-senpay-red border border-senpay-red/40' :
                selectedNode.status === 'ELEVATED' ? 'bg-senpay-amber/15 text-senpay-amber border border-senpay-amber/40' :
                selectedNode.status === 'RECOMMENDED' ? 'bg-senpay-cyan/15 text-senpay-cyan border border-senpay-cyan/40' :
                'bg-senpay-green/15 text-senpay-green border border-senpay-green/40'
              }`}>
                {selectedNode.status}
              </span>
            </div>

            <div className="space-y-1 text-[10px] text-senpay-text-secondary">
              <div className="flex justify-between">
                <span className="text-senpay-text-muted">Role:</span>
                <span className="text-senpay-text-primary font-semibold">{selectedNode.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-senpay-text-muted">Congestion Risk:</span>
                <span className={selectedNode.crs >= 65 ? 'text-senpay-red font-bold' : 'text-senpay-green'}>
                  {selectedNode.crs.toFixed(1)} / 100
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-senpay-text-muted">Latency &bull; Loss:</span>
                <span className="text-senpay-text-primary">{selectedNode.latency} &bull; {selectedNode.loss}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-senpay-text-muted">Coordinates:</span>
                <span className="text-senpay-text-muted">{selectedNode.lat}, {selectedNode.lon}</span>
              </div>
              <div className="pt-1 border-t border-senpay-border/60 text-[9px] text-senpay-text-muted leading-tight">
                {selectedNode.provenance}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── 4. Technical Legend Footer ── */}
      <div className="flex items-center justify-between px-3 py-1.5 border-t border-senpay-border bg-senpay-card text-[10px] font-mono text-senpay-text-muted">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-sm border border-senpay-border bg-senpay-panel inline-block" />
            <span>Gateway</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full border border-senpay-border bg-senpay-panel inline-block" />
            <span>Base Station</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-0 h-0 border-l-[3.5px] border-l-transparent border-r-[3.5px] border-r-transparent border-b-[6px] border-b-senpay-red inline-block" />
            <span>Affected Sector</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rotate-45 border border-senpay-cyan bg-senpay-panel inline-block" />
            <span>Mitigation Slice</span>
          </div>
        </div>

        <div className="hidden sm:flex items-center gap-1 text-senpay-text-secondary">
          <span>Click any node to inspect telemetry</span>
        </div>
      </div>
    </div>
  );
}
