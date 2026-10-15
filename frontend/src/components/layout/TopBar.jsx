// ═══════════════════════════════════════════════════════
// TeleSol Sentinel — TopBar Component
// Status bar with scenario badge, TinyFish agent state, and clock
// ═══════════════════════════════════════════════════════

import { useState, useEffect } from 'react';
import { Radio, Clock, Zap, Globe, Shield } from 'lucide-react';
import StatusDot from '../shared/StatusDot';

const SCENARIO_LABELS = {
  normal: { label: 'Normal Flow', color: '#00FF88' },
  congestion: { label: 'Congestion', color: '#FFB800' },
  sudden_surge: { label: 'Sudden Surge', color: '#FF8C00' },
  blocked_exit: { label: 'Blocked Exit', color: '#FF3B5C' },
};

export default function TopBar({ pageTitle, mode, scenario = 'normal', tinyfish = null, onToggleMode }) {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const isSimulation = mode === 'simulation';
  const scInfo = SCENARIO_LABELS[scenario] || SCENARIO_LABELS.normal;
  const isTinyFishLive = tinyfish?.configured;

  return (
    <header className="h-14 bg-crowd-surface/80 backdrop-blur-xl border-b border-crowd-border flex items-center justify-between px-6 sticky top-0 z-30">
      {/* ── Left: Page Title & Scenario Badge ── */}
      <div className="flex items-center gap-3">
        <h2 className="text-base font-semibold font-display text-crowd-text-primary">{pageTitle}</h2>
        
        {/* Scenario Pill */}
        <div
          className="hidden sm:flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold"
          style={{
            backgroundColor: `${scInfo.color}15`,
            border: `1px solid ${scInfo.color}40`,
            color: scInfo.color,
          }}
        >
          <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: scInfo.color }} />
          <span>SCENARIO: {scInfo.label.toUpperCase()}</span>
        </div>

        {/* TinyFish Status Indicator */}
        <div className="hidden md:flex items-center gap-1 px-2 py-0.5 rounded-full bg-crowd-cyan/10 border border-crowd-cyan/20 text-[10px] font-mono text-crowd-cyan">
          <Globe size={11} />
          <span>TINYFISH: {isTinyFishLive ? 'LIVE' : 'AGENT READY'}</span>
        </div>
      </div>

      {/* ── Center: Mode Toggle ── */}
      <button
        onClick={onToggleMode}
        className={`
          flex items-center gap-2 px-4 py-1.5 rounded-full
          border text-sm font-medium transition-all duration-300
          ${isSimulation
            ? 'bg-crowd-purple/15 border-crowd-purple/40 text-crowd-purple shadow-[0_0_15px_rgba(168,85,247,0.15)]'
            : 'bg-crowd-safe/10 border-crowd-safe/30 text-crowd-safe shadow-[0_0_15px_rgba(0,255,136,0.1)]'
          }
          hover:scale-[1.02] active:scale-[0.98]
        `}
      >
        {isSimulation ? (
          <>
            <Zap size={14} />
            <span>Sim Lab</span>
          </>
        ) : (
          <>
            <Radio size={14} />
            <span>Sentinel Live</span>
          </>
        )}
        <span className={`w-8 h-4 rounded-full relative transition-colors duration-300 ${isSimulation ? 'bg-crowd-purple/40' : 'bg-crowd-safe/40'}`}>
          <span className={`absolute top-0.5 w-3 h-3 rounded-full transition-all duration-300 ${isSimulation ? 'right-0.5 bg-crowd-purple' : 'left-0.5 bg-crowd-safe'}`} />
        </span>
      </button>

      {/* ── Right: Clock & Logo ── */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 text-crowd-text-secondary">
          <Clock size={14} />
          <span className="text-sm font-mono">
            {time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </span>
        </div>
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-crowd-cyan to-crowd-purple p-[1px] flex items-center justify-center">
          <div className="w-full h-full bg-crowd-surface rounded-[7px] flex items-center justify-center">
            <span className="text-xs font-bold text-crowd-cyan">TS</span>
          </div>
        </div>
      </div>
    </header>
  );
}
