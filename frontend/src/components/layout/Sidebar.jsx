// ═══════════════════════════════════════════════════════
// CrowdShield — Sidebar Navigation
// Collapsible sidebar with page navigation + branding
// ═══════════════════════════════════════════════════════

import { useState } from 'react';
import {
  LayoutDashboard, Map, BarChart3, Bell, FlaskConical,
  ChevronLeft, ChevronRight, Shield, Wifi, WifiOff
} from 'lucide-react';
import StatusDot from '../shared/StatusDot';

const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'map', label: 'Map View', icon: Map },
  { id: 'analytics', label: 'Analytics', icon: BarChart3 },
  { id: 'alerts', label: 'Alerts', icon: Bell },
  { id: 'simulation', label: 'Simulation', icon: FlaskConical },
];

export default function Sidebar({ currentPage, onNavigate, isConnected, alertCount = 0 }) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={`
        fixed top-0 left-0 h-full z-40
        bg-crowd-surface/95 backdrop-blur-xl
        border-r border-crowd-border
        flex flex-col
        transition-all duration-300 ease-in-out
        ${collapsed ? 'w-[68px]' : 'w-[220px]'}
      `}
    >
      {/* ── Brand ── */}
      <div className={`flex items-center gap-3 px-4 h-16 border-b border-crowd-border ${collapsed ? 'justify-center' : ''}`}>
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-crowd-cyan to-crowd-purple flex items-center justify-center flex-shrink-0">
          <Shield size={18} className="text-white" />
        </div>
        {!collapsed && (
          <div className="overflow-hidden">
            <h1 className="text-sm font-bold font-display text-crowd-text-primary tracking-wide">CrowdShield</h1>
            <p className="text-[10px] text-crowd-text-muted uppercase tracking-widest">Intelligence</p>
          </div>
        )}
      </div>

      {/* ── Navigation ── */}
      <nav className="flex-1 py-4 px-2 space-y-1">
        {NAV_ITEMS.map(item => {
          const isActive = currentPage === item.id;
          const Icon = item.icon;

          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              title={collapsed ? item.label : undefined}
              className={`
                w-full flex items-center gap-3 px-3 py-2.5 rounded-lg
                text-sm font-medium transition-all duration-200
                ${isActive
                  ? 'bg-crowd-cyan/10 text-crowd-cyan border-l-2 border-crowd-cyan shadow-[inset_0_0_20px_rgba(0,212,255,0.05)]'
                  : 'text-crowd-text-secondary hover:text-crowd-text-primary hover:bg-white/[0.03] border-l-2 border-transparent'
                }
                ${collapsed ? 'justify-center px-0' : ''}
              `}
            >
              <Icon size={18} className={isActive ? 'text-crowd-cyan' : ''} />
              {!collapsed && <span>{item.label}</span>}
              {!collapsed && item.id === 'alerts' && alertCount > 0 && (
                <span className="ml-auto px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-crowd-danger/20 text-crowd-danger">
                  {alertCount}
                </span>
              )}
              {collapsed && item.id === 'alerts' && alertCount > 0 && (
                <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-crowd-danger" />
              )}
            </button>
          );
        })}
      </nav>

      {/* ── Connection Status ── */}
      <div className={`px-4 py-3 border-t border-crowd-border ${collapsed ? 'flex justify-center' : ''}`}>
        {collapsed ? (
          isConnected ? <Wifi size={14} className="text-crowd-safe" /> : <WifiOff size={14} className="text-crowd-text-muted" />
        ) : (
          <div className="flex items-center gap-2">
            <StatusDot status={isConnected ? 'active' : 'offline'} size="sm" />
            <span className={`text-xs ${isConnected ? 'text-crowd-safe' : 'text-crowd-text-muted'}`}>
              {isConnected ? 'Backend Live' : 'Offline Mode'}
            </span>
          </div>
        )}
      </div>

      {/* ── Collapse Toggle ── */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-20 w-6 h-6 rounded-full bg-crowd-surface border border-crowd-border flex items-center justify-center text-crowd-text-muted hover:text-crowd-cyan hover:border-crowd-cyan/40 transition-colors"
      >
        {collapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
      </button>
    </aside>
  );
}
