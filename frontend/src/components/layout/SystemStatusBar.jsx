import React, { useState, useEffect } from 'react';
import { Terminal, Shield, Wifi, Activity } from 'lucide-react';

export default function SystemStatusBar({ isConnected = true, onOpenLogs }) {
  const [stats, setStats] = useState({
    ingestionRate: 49.6,
    throughput: 71.7,
    latestHash: '15a79ba36a5ba605cd38260773a86506f',
    seeksnn: '1440n46a1d409capruta.co',
    activeBlock: 34960520,
  });

  useEffect(() => {
    const interval = setInterval(() => {
      setStats((prev) => ({
        ...prev,
        ingestionRate: +(48.5 + Math.random() * 2.5).toFixed(1),
        throughput: +(70.2 + Math.random() * 3.0).toFixed(1),
        activeBlock: prev.activeBlock + 1,
      }));
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  return (
    <footer className="fixed bottom-0 left-0 right-0 h-7 bg-[#090D13] border-t border-senpay-border/80 px-4 flex items-center justify-between text-[11px] font-mono text-senpay-text-muted z-30 select-none">
      <div className="flex items-center gap-4 overflow-hidden truncate">
        {/* Ingestion & Telemetry */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <span className="text-senpay-text-secondary">Continuous Ingestion:</span>
          <span className="text-senpay-green font-bold">{stats.ingestionRate} stats</span>
        </div>

        <span className="text-senpay-border">|</span>

        {/* Throughput */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <span className="text-senpay-cyan font-bold">{stats.throughput} Btrits</span>
        </div>

        <span className="text-senpay-border">|</span>

        {/* Testnet hashes */}
        <div className="hidden md:flex items-center gap-1.5 truncate">
          <span className="text-senpay-text-secondary">Testnet hashes:</span>
          <span className="text-senpay-text-primary truncate max-w-[220px]">
            {stats.latestHash}
          </span>
        </div>

        <span className="hidden md:inline text-senpay-border">|</span>

        {/* Seeksnn */}
        <div className="hidden lg:flex items-center gap-1.5 truncate">
          <span className="text-senpay-text-secondary">Seeksnn:</span>
          <span className="text-senpay-text-muted truncate max-w-[200px]">
            {stats.seeksnn}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-3 flex-shrink-0">
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-senpay-green animate-pulse" />
          <span className="text-[10px] text-senpay-green font-bold">HSK Block #{stats.activeBlock}</span>
        </div>
        <span className="text-senpay-border">|</span>
        <button
          onClick={onOpenLogs}
          className="flex items-center gap-1 hover:text-senpay-cyan transition-colors"
        >
          <Terminal size={11} />
          <span>System logs</span>
        </button>
      </div>
    </footer>
  );
}
