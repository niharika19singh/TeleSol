// ═════════════════════════════════════════════════════════════════
// SENPAY — Operational Network Topology & Digital Twin Canvas
// Professional Network Operations Center (NOC) Schematic Representation
// Supports 3 Operational View Modes: Topology | Geographic | Incident Focus
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
  const [viewMode, setViewMode] = useState('topology'); // 'topology' | 'geographic' | 'incident'
  const [showLabels, setShowLabels] = useState(true);
  const [activeInspector, setActiveInspector] = useState(selectedNodeId || 'SEC-VIP-C1');

  const selectedNode = TOPOLOGY_NODES.find((n) => n.id === activeInspector) || TOPOLOGY_NODES[5];

  const handleNodeClick = (node) => {
    setActiveInspector(node.id);
    if (onSelectNode) onSelectNode(node.id);
  };

  return (
    <div className="relative w-full h-full flex flex-col justify-between bg-[#0B1117] rounded-lg border border-[#293746] overflow-hidden select-none">
      {/* ── 1. Compact View Controls & Status Header ── */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-[#293746] bg-[#111A23]/90 text-xs">
        {/* Left: View Mode Selector */}
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-mono text-[#718297] uppercase mr-1 hidden sm:inline">
            Mode:
          </span>
          <button
            onClick={() => setViewMode('topology')}
            className={`px-2.5 py-1 rounded text-[11px] font-mono transition ${
              viewMode === 'topology'
                ? 'bg-[#15212C] text-[#35C7D9] border border-[#35C7D9]/40 font-bold'
                : 'text-[#9AAABA] hover:text-[#E6EDF3] border border-transparent'
            }`}
          >
            Topology
          </button>
          <button
            onClick={() => setViewMode('geographic')}
            className={`px-2.5 py-1 rounded text-[11px] font-mono transition ${
              viewMode === 'geographic'
                ? 'bg-[#15212C] text-[#35C7D9] border border-[#35C7D9]/40 font-bold'
                : 'text-[#9AAABA] hover:text-[#E6EDF3] border border-transparent'
            }`}
          >
            Geographic Map
          </button>
          <button
            onClick={() => setViewMode('incident')}
            className={`px-2.5 py-1 rounded text-[11px] font-mono transition flex items-center gap-1 ${
              viewMode === 'incident'
                ? 'bg-[#15212C] text-[#E45B64] border border-[#E45B64]/50 font-bold'
                : 'text-[#9AAABA] hover:text-[#E6EDF3] border border-transparent'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-[#E45B64]" />
            <span>Incident Focus</span>
          </button>
        </div>

        {/* Right: Telemetry status & Labels toggle */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowLabels(!showLabels)}
            className={`text-[10px] font-mono px-2 py-0.5 rounded border transition ${
              showLabels
                ? 'border-[#35C7D9]/40 text-[#35C7D9] bg-[#35C7D9]/10'
                : 'border-[#293746] text-[#718297] hover:text-[#9AAABA]'
            }`}
          >
            Labels {showLabels ? 'ON' : 'OFF'}
          </button>

          <div className="flex items-center gap-1.5 text-[10px] font-mono text-[#39B980] border border-[#39B980]/30 px-2 py-0.5 rounded bg-[#39B980]/10">
            <span className="w-1.5 h-1.5 rounded-full bg-[#39B980]" />
            <span className="hidden md:inline">Sentinel Daemon: Connected</span>
            <span className="md:hidden">Sync</span>
          </div>
        </div>
      </div>

      {/* ── 2. Precise Schematic Canvas ── */}
      <div className="relative flex-1 w-full min-h-[300px] bg-[#0B1117] overflow-hidden flex items-center justify-center">
        {/* Subtle Engineering Grid Backdrop */}
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <pattern id="techGrid" width="24" height="24" patternUnits="userSpaceOnUse">
              <path d="M 24 0 L 0 0 0 24" fill="none" stroke="#16222F" strokeWidth="0.8" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#techGrid)" />
        </svg>

        {/* Geographic Mode Backdrop Lines */}
        {viewMode === 'geographic' && (
          <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-3 text-[9px] font-mono text-[#718297] opacity-60">
            <div className="flex justify-between border-b border-[#1E2D3D] pb-1">
              <span>LAT 37.8200° N &bull; LON 122.4600° W</span>
              <span>METROPOLITAN CARRIER FOOTPRINT &bull; SCALE: 1:25,000</span>
            </div>
            <div className="flex justify-between border-t border-[#1E2D3D] pt-1">
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
              <path d="M 0 1 L 5 3 L 0 5 z" fill="#293746" />
            </marker>
            <marker id="arrow-cyan" viewBox="0 0 6 6" refX="5" refY="3" markerWidth="4" markerHeight="4" orient="auto">
              <path d="M 0 1 L 5 3 L 0 5 z" fill="#35C7D9" />
            </marker>
            <marker id="arrow-red" viewBox="0 0 6 6" refX="5" refY="3" markerWidth="4" markerHeight="4" orient="auto">
              <path d="M 0 1 L 5 3 L 0 5 z" fill="#E45B64" />
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
                    stroke={isWestElevated ? '#E8AD43' : '#293746'}
                    strokeWidth={isWestElevated ? 2 : 1.5}
                    strokeDasharray={isWestElevated ? '4 3' : 'none'}
                  />
                  {showLabels && (
                    <text
                      x={(sx + tx) / 2}
                      y={(sy + ty) / 2 - 4}
                      fill="#718297"
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
                    stroke="#E45B64"
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
                    fill="#15212C"
                    stroke="#E45B64"
                    strokeWidth="1"
                  />
                  <text
                    x={(sx + tx) / 2}
                    y={(sy + ty) / 2 + 2.5}
                    fill="#E45B64"
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
                    stroke="#35C7D9"
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
                    stroke="#35C7D9"
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
                      fill="#111A23"
                      stroke={isSelected ? '#35C7D9' : '#293746'}
                      strokeWidth="1.8"
                    />
                    <rect x={nx - 4} y={ny - 4} width="8" height="8" rx="1" fill="#39B980" />
                  </g>
                )}

                {node.type === 'BASE_STATION' && (
                  <g>
                    <circle
                      cx={nx}
                      cy={ny}
                      r="9"
                      fill="#111A23"
                      stroke={isElevated ? '#E8AD43' : isSelected ? '#35C7D9' : '#293746'}
                      strokeWidth="1.8"
                    />
                    <circle
                      cx={nx}
                      cy={ny}
                      r="3.5"
                      fill={isElevated ? '#E8AD43' : '#39B980'}
                    />
                  </g>
                )}

                {node.type === 'SECTOR' && (
                  <g>
                    <polygon
                      points={`${nx},${ny - 9} ${nx + 8},${ny + 5} ${nx - 8},${ny + 5}`}
                      fill="#111A23"
                      stroke={isCritical ? '#E45B64' : isSelected ? '#35C7D9' : '#293746'}
                      strokeWidth="1.8"
                    />
                    <circle
                      cx={nx}
                      cy={ny + 1}
                      r="2.5"
                      fill={isCritical ? '#E45B64' : '#39B980'}
                    />
                    {/* Critical Incident Badge */}
                    {isCritical && (
                      <g>
                        <circle cx={nx + 9} cy={ny - 9} r="4.5" fill="#E45B64" />
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
                      fill="#15212C"
                      stroke="#35C7D9"
                      strokeWidth="1.8"
                    />
                    <circle cx={nx} cy={ny} r="2.5" fill="#35C7D9" />
                  </g>
                )}

                {/* Node Text Label */}
                {showLabels && (
                  <g>
                    <text
                      x={nx}
                      y={ny + 18}
                      fill={isCritical ? '#E45B64' : isSelected ? '#35C7D9' : '#E6EDF3'}
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
                      fill="#718297"
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
          <div className="absolute bottom-2 right-2 max-w-[280px] w-full p-2.5 rounded bg-[#111A23]/95 border border-[#293746] shadow-xl text-xs font-mono backdrop-blur-sm z-20">
            <div className="flex items-center justify-between pb-1.5 border-b border-[#293746] mb-2">
              <div className="flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${
                  selectedNode.status === 'CRITICAL' ? 'bg-[#E45B64]' :
                  selectedNode.status === 'ELEVATED' ? 'bg-[#E8AD43]' :
                  selectedNode.status === 'RECOMMENDED' ? 'bg-[#35C7D9]' : 'bg-[#39B980]'
                }`} />
                <span className="font-bold text-[#E6EDF3] text-[11px]">{selectedNode.id}</span>
              </div>
              <span className={`text-[9px] px-1.5 py-0.2 rounded font-bold ${
                selectedNode.status === 'CRITICAL' ? 'bg-[#E45B64]/20 text-[#E45B64] border border-[#E45B64]/40' :
                selectedNode.status === 'ELEVATED' ? 'bg-[#E8AD43]/20 text-[#E8AD43] border border-[#E8AD43]/40' :
                selectedNode.status === 'RECOMMENDED' ? 'bg-[#35C7D9]/20 text-[#35C7D9] border border-[#35C7D9]/40' :
                'bg-[#39B980]/20 text-[#39B980] border border-[#39B980]/40'
              }`}>
                {selectedNode.status}
              </span>
            </div>

            <div className="space-y-1 text-[10px] text-[#9AAABA]">
              <div className="flex justify-between">
                <span className="text-[#718297]">Role:</span>
                <span className="text-[#E6EDF3] font-semibold">{selectedNode.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#718297]">Congestion Risk:</span>
                <span className={selectedNode.crs >= 65 ? 'text-[#E45B64] font-bold' : 'text-[#39B980]'}>
                  {selectedNode.crs.toFixed(1)} / 100
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#718297]">Latency &bull; Loss:</span>
                <span className="text-[#E6EDF3]">{selectedNode.latency} &bull; {selectedNode.loss}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#718297]">Coordinates:</span>
                <span className="text-[#718297]">{selectedNode.lat}, {selectedNode.lon}</span>
              </div>
              <div className="pt-1 border-t border-[#293746]/60 text-[9px] text-[#718297] leading-tight">
                {selectedNode.provenance}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── 4. Technical Legend Footer ── */}
      <div className="flex items-center justify-between px-3 py-1.5 border-t border-[#293746] bg-[#111A23] text-[10px] font-mono text-[#718297]">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-sm border border-[#293746] bg-[#111A23] inline-block" />
            <span>Gateway</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full border border-[#293746] bg-[#111A23] inline-block" />
            <span>Base Station</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-0 h-0 border-l-[3.5px] border-l-transparent border-r-[3.5px] border-r-transparent border-b-[6px] border-b-[#E45B64] inline-block" />
            <span>Affected Sector</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rotate-45 border border-[#35C7D9] bg-[#15212C] inline-block" />
            <span>Mitigation Slice</span>
          </div>
        </div>

        <div className="hidden sm:flex items-center gap-1 text-[#9AAABA]">
          <span>Click any node to inspect telemetry</span>
        </div>
      </div>
    </div>
  );
}
