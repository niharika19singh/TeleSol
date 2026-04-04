// ═══════════════════════════════════════════════════════
// CrowdShield — Crowd Map (MOST IMPORTANT COMPONENT)
// Interactive Leaflet map with risk-colored zones
// ═══════════════════════════════════════════════════════

import { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, Circle, Popup, useMap } from 'react-leaflet';
import { getRiskLevel } from '../../data/mockData';
import 'leaflet/dist/leaflet.css';

// ── Auto-recenter helper ──
function MapRecenter({ center }) {
  const map = useMap();
  useEffect(() => {
    if (center) map.setView(center, 16, { animate: true, duration: 1 });
  }, [center, map]);
  return null;
}

export default function CrowdMap({ zones, selectedZone, onSelectZone, height = '100%' }) {
  const mapRef = useRef(null);
  const [mapReady, setMapReady] = useState(false);

  // Default center — IIITD campus
  const defaultCenter = [28.5459, 77.2732];
  const center = zones.length > 0 ? [zones[0].lat, zones[0].lng] : defaultCenter;

  return (
    <div className="relative rounded-xl overflow-hidden border border-crowd-border" style={{ height }}>
      {/* Scanner effect overlay */}
      <div className="absolute inset-0 z-[500] pointer-events-none overflow-hidden rounded-xl">
        <div className="scanner-line" />
      </div>

      {/* Map */}
      <MapContainer
        ref={mapRef}
        center={center}
        zoom={16}
        style={{ height: '100%', width: '100%', background: '#06090F' }}
        zoomControl={true}
        whenReady={() => setMapReady(true)}
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
        />

        <MapRecenter center={center} />

        {/* Zone circles */}
        {zones.map(zone => {
          const risk = getRiskLevel(zone.riskScore);
          const isDanger = zone.riskScore > 65;
          const isWarning = zone.riskScore > 40;
          const isSelected = selectedZone?.id === zone.id;

          return (
            <Circle
              key={zone.id}
              center={[zone.lat, zone.lng]}
              radius={zone.radius}
              pathOptions={{
                color: risk.color,
                weight: isSelected ? 3 : 2,
                fillColor: risk.color,
                fillOpacity: isDanger ? 0.35 : isWarning ? 0.2 : 0.12,
                dashArray: isDanger ? '' : '6 4',
                className: isDanger ? 'danger-pulse' : '',
              }}
              eventHandlers={{
                click: () => onSelectZone?.(zone),
              }}
            >
              <Popup>
                <div className="min-w-[200px] p-1">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold text-sm" style={{ color: risk.color }}>{zone.name}</h4>
                  </div>
                  <div className="space-y-1.5 text-xs">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Density</span>
                      <span className="font-mono font-medium text-white">{zone.density} ppl/m²</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Flow Instability</span>
                      <span className="font-mono font-medium text-white">{zone.flowInstability}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Panic Level</span>
                      <span className="font-mono font-medium text-white">{zone.panicLevel}%</span>
                    </div>
                    <div className="pt-1.5 mt-1.5 border-t border-gray-700 flex justify-between items-center">
                      <span className="text-gray-400 font-medium">Risk Score</span>
                      <span className="font-mono font-bold text-base" style={{ color: risk.color }}>
                        {zone.riskScore}/100
                      </span>
                    </div>
                  </div>
                  {/* Risk bar */}
                  <div className="mt-2 h-1.5 rounded-full bg-gray-700 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${zone.riskScore}%`, backgroundColor: risk.color }}
                    />
                  </div>
                </div>
              </Popup>
            </Circle>
          );
        })}
      </MapContainer>

      {/* Legend overlay */}
      <div className="absolute bottom-4 left-4 z-[600] glass rounded-lg px-3 py-2">
        <div className="flex items-center gap-4 text-[10px]">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-crowd-safe" />
            <span className="text-crowd-text-secondary">Safe (0-40)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-crowd-warning" />
            <span className="text-crowd-text-secondary">Warning (41-65)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-crowd-danger animate-pulse" />
            <span className="text-crowd-text-secondary">Critical (66+)</span>
          </div>
        </div>
      </div>

      {/* Selected zone info overlay */}
      {selectedZone && (
        <div className="absolute top-4 right-4 z-[600] glass rounded-lg p-3 min-w-[200px] animate-slide-in-right">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-crowd-text-primary truncate">{selectedZone.name}</span>
            <button
              onClick={() => onSelectZone?.(null)}
              className="text-crowd-text-muted hover:text-white text-xs ml-2"
            >✕</button>
          </div>
          <div className="grid grid-cols-2 gap-2 text-[10px]">
            <div className="bg-crowd-bg/50 rounded px-2 py-1">
              <div className="text-crowd-text-muted">Density</div>
              <div className="font-mono font-bold text-crowd-text-primary">{selectedZone.density}</div>
            </div>
            <div className="bg-crowd-bg/50 rounded px-2 py-1">
              <div className="text-crowd-text-muted">Risk</div>
              <div className="font-mono font-bold" style={{ color: getRiskLevel(selectedZone.riskScore).color }}>
                {selectedZone.riskScore}
              </div>
            </div>
            <div className="bg-crowd-bg/50 rounded px-2 py-1">
              <div className="text-crowd-text-muted">Flow</div>
              <div className="font-mono font-bold text-crowd-text-primary">{selectedZone.flowInstability}%</div>
            </div>
            <div className="bg-crowd-bg/50 rounded px-2 py-1">
              <div className="text-crowd-text-muted">Panic</div>
              <div className="font-mono font-bold text-crowd-text-primary">{selectedZone.panicLevel}%</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
