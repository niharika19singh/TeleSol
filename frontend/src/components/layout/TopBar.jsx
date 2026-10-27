// ═══════════════════════════════════════════════════════
// TeleSol — Unified TopBar Component
// ═══════════════════════════════════════════════════════

import { useState, useEffect } from 'react';
import { Radio, Clock, Zap, Globe, Shield, CreditCard, Lock, Key } from 'lucide-react';

const SCENARIO_LABELS = {
  normal: { label: 'Normal Flow', color: '#00FF88' },
  congestion: { label: 'Congestion', color: '#FFB800' },
  sudden_surge: { label: 'Sudden Surge', color: '#FF8C00' },
  blocked_exit: { label: 'Blocked Exit', color: '#FF3B5C' },
};

export default function TopBar({
  pageTitle,
  activeProduct,
  mode,
  scenario = 'normal',
  tinyfish = null,
  wallet,
  onToggleMode,
  onOpenWalletModal
}) {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const isPayPilot = activeProduct === 'paypilot';
  const isSimulation = mode === 'simulation';
  const scInfo = SCENARIO_LABELS[scenario] || SCENARIO_LABELS.normal;
  const isTinyFishLive = tinyfish?.configured;

  return (
    <header className="h-14 bg-crowd-surface/80 backdrop-blur-xl border-b border-crowd-border flex items-center justify-between px-4 lg:px-6 sticky top-0 z-30">
      {/* ── Left: Page Title & Product Badge ── */}
      <div className="flex items-center gap-3">
        <h2 className="text-sm lg:text-base font-semibold font-display text-crowd-text-primary">
          {pageTitle}
        </h2>

        {isPayPilot ? (
          <div className="flex items-center gap-2">
            {/* HSK Chain Indicator */}
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-crowd-purple/15 border border-crowd-purple/40 text-crowd-purple">
              <span className="w-1.5 h-1.5 rounded-full bg-crowd-purple animate-pulse" />
              <span>HSK CHAIN (133)</span>
            </div>

            {/* DEMO mode label */}
            <div className="hidden md:flex items-center gap-1 px-2 py-0.5 rounded-full bg-crowd-warning/15 border border-crowd-warning/30 text-[10px] font-mono font-bold text-crowd-warning">
              <span>DEMO MODE ACTIVE</span>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2">
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
        )}
      </div>

      {/* ── Center / Right: Wallet / Sim Controls & Clock ── */}
      <div className="flex items-center gap-3">
        {isPayPilot ? (
          /* Wallet Button */
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                if (wallet.isDemoWallet && wallet.hasInjectedProvider) {
                  wallet.connectInjectedWallet();
                } else if (!wallet.isDemoWallet) {
                  wallet.connectDemoWallet();
                }
              }}
              title="Click to toggle between Injected Web3 wallet and Demo Wallet"
              className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-mono font-medium transition-all ${
                wallet.isDemoWallet
                  ? 'bg-crowd-warning/10 border-crowd-warning/30 text-crowd-warning hover:bg-crowd-warning/20'
                  : 'bg-crowd-safe/10 border-crowd-safe/30 text-crowd-safe hover:bg-crowd-safe/20'
              }`}
            >
              <Lock size={13} />
              <span className="hidden sm:inline">
                {wallet.address ? `${wallet.address.slice(0, 6)}...${wallet.address.slice(-4)}` : 'Connect'}
              </span>
              <span className="text-[10px] px-1 py-0.2 rounded bg-black/30">
                {wallet.isDemoWallet ? 'DEMO' : 'EVM'}
              </span>
            </button>
          </div>
        ) : (
          /* Sentinel Sim Toggle */
          <button
            onClick={onToggleMode}
            className={`
              flex items-center gap-2 px-3.5 py-1.5 rounded-full
              border text-xs font-medium transition-all duration-300
              ${isSimulation
                ? 'bg-crowd-purple/15 border-crowd-purple/40 text-crowd-purple shadow-[0_0_15px_rgba(168,85,247,0.15)]'
                : 'bg-crowd-safe/10 border-crowd-safe/30 text-crowd-safe shadow-[0_0_15px_rgba(0,255,136,0.1)]'
              }
              hover:scale-[1.02] active:scale-[0.98]
            `}
          >
            {isSimulation ? (
              <>
                <Zap size={13} />
                <span>Sim Lab</span>
              </>
            ) : (
              <>
                <Radio size={13} />
                <span>Sentinel Live</span>
              </>
            )}
          </button>
        )}

        {/* Clock */}
        <div className="hidden sm:flex items-center gap-1.5 text-crowd-text-secondary text-xs font-mono">
          <Clock size={13} />
          <span>
            {time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </span>
        </div>

        {/* Logo Monogram */}
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-crowd-cyan to-crowd-purple p-[1px] flex items-center justify-center flex-shrink-0">
          <div className="w-full h-full bg-crowd-surface rounded-[7px] flex items-center justify-center">
            <span className="text-xs font-bold text-crowd-cyan">
              {isPayPilot ? 'PP' : 'TS'}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}
