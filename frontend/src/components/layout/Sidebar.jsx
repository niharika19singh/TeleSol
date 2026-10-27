// ═══════════════════════════════════════════════════════
// TeleSol — Unified Sidebar Navigation
// Supports both TeleSol PayPilot (Payments) and TeleSol Sentinel (IoT)
// ═══════════════════════════════════════════════════════

import { useState } from 'react';
import {
  LayoutDashboard, Map, BarChart3, Bell, FlaskConical,
  ChevronLeft, ChevronRight, Shield, Wifi, WifiOff, Cpu,
  CreditCard, Search, Users, PlusCircle, FileText, History,
  Bot, ShieldCheck, Sparkles, FileCheck, Sliders, AlertTriangle
} from 'lucide-react';
import StatusDot from '../shared/StatusDot';

const SENTINEL_NAV = [
  { id: 'sentinel_dashboard', label: 'Command Center', icon: LayoutDashboard },
  { id: 'sensors', label: 'Sensors Feed', icon: Cpu },
  { id: 'map', label: 'Venue Zone Map', icon: Map },
  { id: 'analytics', label: 'Crowd Analytics', icon: BarChart3 },
  { id: 'alerts', label: 'Incident Alerts', icon: Bell },
  { id: 'simulation', label: 'Simulation Lab', icon: FlaskConical },
];

const PAYPILOT_NAV = [
  { id: 'paypilot_dashboard', label: 'Overview', icon: LayoutDashboard },
  { id: 'discovery', label: 'Discovery & Trust', icon: Search },
  { id: 'agreements', label: 'Service Agreements', icon: FileCheck },
  { id: 'mandates', label: 'Mandates & Policy', icon: FileText },
  { id: 'simulator', label: 'Safety Simulator', icon: Sliders },
  { id: 'delegations', label: 'Agent Delegations', icon: Users },
  { id: 'evidence_bundles', label: 'Evidence Bundles', icon: ShieldCheck },
  { id: 'disputes', label: 'Disputes & Recovery', icon: AlertTriangle },
  { id: 'transactions', label: 'Ledger & Receipts', icon: History },
  { id: 'ai_workflow', label: 'AI Intent Agent', icon: Bot },
  { id: 'audit', label: 'Cryptographic Audit', icon: Shield },
];

export default function Sidebar({
  currentPage,
  onNavigate,
  activeProduct,
  onSwitchProduct,
  isConnected,
  alertCount = 0
}) {
  const [collapsed, setCollapsed] = useState(false);

  const isPayPilot = activeProduct === 'paypilot';
  const navItems = isPayPilot ? PAYPILOT_NAV : SENTINEL_NAV;

  return (
    <aside
      className={`
        fixed top-0 left-0 h-full z-40
        bg-crowd-surface/95 backdrop-blur-xl
        border-r border-crowd-border
        flex flex-col
        transition-all duration-300 ease-in-out
        ${collapsed ? 'w-[68px]' : 'w-[230px]'}
      `}
    >
      {/* ── Brand ── */}
      <div className={`flex items-center gap-3 px-4 h-16 border-b border-crowd-border ${collapsed ? 'justify-center' : ''}`}>
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-crowd-cyan to-crowd-purple flex items-center justify-center flex-shrink-0 shadow-[0_0_12px_rgba(0,212,255,0.25)]">
          {isPayPilot ? <CreditCard size={18} className="text-white" /> : <Shield size={18} className="text-white" />}
        </div>
        {!collapsed && (
          <div className="overflow-hidden">
            <h1 className="text-sm font-bold font-display text-crowd-text-primary tracking-wide">
              TeleSol
            </h1>
            <p className="text-[10px] text-crowd-cyan font-semibold uppercase tracking-widest">
              {isPayPilot ? 'PayPilot • HSK' : 'Sentinel NOC'}
            </p>
          </div>
        )}
      </div>

      {/* ── Product Switcher (PayPilot vs Sentinel) ── */}
      {!collapsed ? (
        <div className="p-2 border-b border-crowd-border/80">
          <div className="flex rounded-lg bg-black/40 p-1 border border-crowd-border text-xs font-mono font-bold">
            <button
              onClick={() => onSwitchProduct('paypilot')}
              className={`flex-1 py-1 rounded text-center transition-all ${
                isPayPilot
                  ? 'bg-crowd-cyan/20 text-crowd-cyan shadow-[0_0_10px_rgba(0,212,255,0.2)]'
                  : 'text-crowd-text-muted hover:text-crowd-text-primary'
              }`}
            >
              PayPilot
            </button>
            <button
              onClick={() => onSwitchProduct('sentinel')}
              className={`flex-1 py-1 rounded text-center transition-all ${
                !isPayPilot
                  ? 'bg-crowd-purple/20 text-crowd-purple shadow-[0_0_10px_rgba(168,85,247,0.2)]'
                  : 'text-crowd-text-muted hover:text-crowd-text-primary'
              }`}
            >
              Sentinel
            </button>
          </div>
        </div>
      ) : (
        <div className="py-2 border-b border-crowd-border flex justify-center">
          <button
            onClick={() => onSwitchProduct(isPayPilot ? 'sentinel' : 'paypilot')}
            title={`Switch to ${isPayPilot ? 'Sentinel' : 'PayPilot'}`}
            className="w-8 h-8 rounded-lg bg-white/[0.04] flex items-center justify-center text-crowd-cyan hover:bg-white/[0.08]"
          >
            {isPayPilot ? <CreditCard size={14} /> : <Shield size={14} />}
          </button>
        </div>
      )}

      {/* ── Navigation Items ── */}
      <nav className="flex-1 py-3 px-2 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = currentPage === item.id;
          const Icon = item.icon;

          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              title={collapsed ? item.label : undefined}
              className={`
                w-full flex items-center gap-3 px-3 py-2 rounded-lg
                text-xs font-medium transition-all duration-200
                ${isActive
                  ? 'bg-crowd-cyan/15 text-crowd-cyan border-l-2 border-crowd-cyan font-bold shadow-[inset_0_0_20px_rgba(0,212,255,0.05)]'
                  : 'text-crowd-text-secondary hover:text-crowd-text-primary hover:bg-white/[0.03] border-l-2 border-transparent'
                }
                ${collapsed ? 'justify-center px-0' : ''}
              `}
            >
              <Icon size={16} className={isActive ? 'text-crowd-cyan' : ''} />
              {!collapsed && <span>{item.label}</span>}

              {/* Alert pill for Sentinel Alerts */}
              {!collapsed && item.id === 'alerts' && alertCount > 0 && (
                <span className="ml-auto px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-crowd-danger/20 text-crowd-danger">
                  {alertCount}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* ── Bottom Section: Network & Collapse ── */}
      <div className={`px-4 py-3 border-t border-crowd-border ${collapsed ? 'flex justify-center' : ''}`}>
        {!collapsed ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-[11px] font-mono text-crowd-text-muted">
              <span className="flex items-center gap-1.5">
                <StatusDot status={isConnected ? 'green' : 'amber'} size={6} />
                {isConnected ? 'Backend Live' : 'Connecting...'}
              </span>
              <button
                onClick={() => setCollapsed(true)}
                className="p-1 rounded hover:bg-white/[0.05] text-crowd-text-muted hover:text-white"
                title="Collapse sidebar"
              >
                <ChevronLeft size={14} />
              </button>
            </div>
            <div className="text-[10px] font-mono text-crowd-cyan/80 bg-crowd-cyan/5 px-2 py-1 rounded border border-crowd-cyan/20">
              Chain: HSK 133 (Testnet)
            </div>
          </div>
        ) : (
          <button
            onClick={() => setCollapsed(false)}
            className="p-1.5 rounded-lg bg-white/[0.04] text-crowd-text-muted hover:text-white"
            title="Expand sidebar"
          >
            <ChevronRight size={14} />
          </button>
        )}
      </div>
    </aside>
  );
}
