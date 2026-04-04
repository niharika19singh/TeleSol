// ═══════════════════════════════════════════════════════
// CrowdShield — Map View Page
// Full-screen map with zone details sidebar
// ═══════════════════════════════════════════════════════

import { useState } from 'react';
import { MapPin, Users, Wind, Volume2, Shield } from 'lucide-react';
import CrowdMap from '../map/CrowdMap';
import GlassCard from '../shared/GlassCard';
import RiskBadge from '../shared/RiskBadge';
import { getRiskLevel } from '../../data/mockData';

export default function MapViewPage({ zones }) {
  const [selectedZone, setSelectedZone] = useState(null);

  return (
    <div className="animate-fade-in-up">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4" style={{ height: 'calc(100vh - 130px)' }}>
        {/* Map (3/4) */}
        <div className="lg:col-span-3 h-full">
          <CrowdMap
            zones={zones}
            selectedZone={selectedZone}
            onSelectZone={setSelectedZone}
            height="100%"
          />
        </div>

        {/* Zone Details Panel (1/4) */}
        <div className="space-y-3 overflow-y-auto">
          <h3 className="text-xs font-semibold text-crowd-text-muted uppercase tracking-wider flex items-center gap-2">
            <MapPin size={12} />
            {selectedZone ? 'Zone Details' : 'All Zones'}
          </h3>

          {selectedZone ? (
            /* Selected Zone Detail */
            <div className="space-y-3">
              <GlassCard glow={selectedZone.riskScore > 65 ? 'red' : selectedZone.riskScore > 40 ? 'warning' : 'green'}>
                <div className="text-center mb-3">
                  <h4 className="text-sm font-semibold text-crowd-text-primary mb-2">{selectedZone.name}</h4>
                  <RiskBadge score={selectedZone.riskScore} size={72} />
                </div>
                <div className="grid grid-cols-2 gap-2 mt-3">
                  <div className="bg-crowd-bg/50 rounded-lg p-2 text-center">
                    <Users size={12} className="text-crowd-cyan mx-auto mb-1" />
                    <p className="text-[10px] text-crowd-text-muted">Density</p>
                    <p className="text-sm font-bold font-mono text-crowd-text-primary">{selectedZone.density}</p>
                    <p className="text-[10px] text-crowd-text-muted">ppl/m²</p>
                  </div>
                  <div className="bg-crowd-bg/50 rounded-lg p-2 text-center">
                    <Wind size={12} className="text-crowd-warning mx-auto mb-1" />
                    <p className="text-[10px] text-crowd-text-muted">Flow</p>
                    <p className="text-sm font-bold font-mono text-crowd-text-primary">{selectedZone.flowInstability}%</p>
                    <p className="text-[10px] text-crowd-text-muted">instability</p>
                  </div>
                  <div className="bg-crowd-bg/50 rounded-lg p-2 text-center">
                    <Volume2 size={12} className="text-crowd-danger mx-auto mb-1" />
                    <p className="text-[10px] text-crowd-text-muted">Panic</p>
                    <p className="text-sm font-bold font-mono text-crowd-text-primary">{selectedZone.panicLevel}%</p>
                    <p className="text-[10px] text-crowd-text-muted">level</p>
                  </div>
                  <div className="bg-crowd-bg/50 rounded-lg p-2 text-center">
                    <Shield size={12} className="text-crowd-purple mx-auto mb-1" />
                    <p className="text-[10px] text-crowd-text-muted">Sensors</p>
                    <p className="text-sm font-bold font-mono text-crowd-text-primary">{selectedZone.sensorCount}</p>
                    <p className="text-[10px] text-crowd-text-muted">active</p>
                  </div>
                </div>
              </GlassCard>
              <button
                onClick={() => setSelectedZone(null)}
                className="w-full py-2 text-xs text-crowd-text-muted hover:text-crowd-text-secondary border border-crowd-border rounded-lg hover:border-crowd-border-light transition-all"
              >
                ← Show all zones
              </button>
            </div>
          ) : (
            /* All Zones List */
            <div className="space-y-2">
              {zones.map(z => {
                const risk = getRiskLevel(z.riskScore);
                return (
                  <GlassCard
                    key={z.id}
                    onClick={() => setSelectedZone(z)}
                    className="!p-3 cursor-pointer hover:!border-crowd-border-light"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: risk.color }} />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-crowd-text-primary truncate">{z.name}</p>
                        <p className="text-[10px] text-crowd-text-muted">{z.density} ppl/m²</p>
                      </div>
                      <div className="text-right">
                        <span className="font-mono text-sm font-bold" style={{ color: risk.color }}>{z.riskScore}</span>
                        <p className="text-[10px] uppercase font-semibold" style={{ color: risk.color }}>{risk.label}</p>
                      </div>
                    </div>
                  </GlassCard>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
