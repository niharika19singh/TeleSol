import React, { useState } from 'react';
import {
  Search, SlidersHorizontal, Bell, AlertTriangle, ChevronDown,
  Moon, Sun, ExternalLink, ShieldCheck, Wallet, Terminal, LogOut, User
} from 'lucide-react';
import SenPayLogo from '../shared/SenPayLogo';
import { useAuth } from '../../context/AuthContext';
import { useTheme, THEMES } from '../../context/ThemeContext';

export default function SenPayTopBar({
  currentPage,
  onNavigate,
  mode = 'demo',
  onToggleMode,
  wallet,
  alertCount = 2,
}) {
  const { user, isAuthenticated, logout } = useAuth();
  const { theme, setTheme, isHighContrast } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMenuOpen, setFilterMenuOpen] = useState(false);
  const [themeMenuOpen, setThemeMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-30 h-14 bg-senpay-sidebar/95 backdrop-blur-md border-b border-senpay-border flex items-center justify-between px-4 lg:px-6 transition-colors duration-150">
      {/* ── Left Section: Brand & Environment Badge ── */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => onNavigate('landing')}
          className="flex items-center group text-left"
          title="View Public Landing Page"
        >
          <SenPayLogo size="default" />
        </button>

        {/* Environment Badge */}
        <div className="flex items-center">
          <button
            onClick={onToggleMode}
            className="px-2.5 py-0.5 rounded-full bg-senpay-amber text-slate-950 text-[11px] font-black tracking-wide font-mono uppercase shadow-sm hover:brightness-110 transition-all flex items-center gap-1.5"
            title="Click to toggle Demo / Live Testnet mode"
          >
            <span>DEMO MODE</span>
          </button>
        </div>
      </div>

      {/* ── Center Section: Search & Quick Filters ── */}
      <div className="hidden md:flex items-center gap-2 max-w-md w-full mx-4">
        {/* Search */}
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-senpay-text-muted" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search..."
            className="w-full bg-senpay-panel border border-senpay-border rounded-lg pl-8 pr-3 py-1.5 text-xs text-senpay-text-primary placeholder:text-senpay-text-muted focus:outline-none focus:border-senpay-cyan font-mono transition-colors"
          />
        </div>

        {/* Quick Filters */}
        <div className="relative">
          <button
            onClick={() => setFilterMenuOpen(!filterMenuOpen)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-senpay-panel border border-senpay-border text-xs text-senpay-text-secondary hover:text-senpay-text-primary hover:border-senpay-border-light transition-colors"
          >
            <SlidersHorizontal size={13} />
            <span>Quick filters</span>
            <ChevronDown size={12} className="opacity-70" />
          </button>

          {filterMenuOpen && (
            <div className="absolute right-0 mt-2 w-48 rounded-xl bg-senpay-card border border-senpay-border shadow-xl py-1 z-50 text-xs">
              <button
                onClick={() => { onNavigate('incident_monitor'); setFilterMenuOpen(false); }}
                className="w-full text-left px-3 py-1.5 hover:bg-senpay-panel text-senpay-text-secondary hover:text-senpay-text-primary"
              >
                High-Severity Incidents
              </button>
              <button
                onClick={() => { onNavigate('agreements'); setFilterMenuOpen(false); }}
                className="w-full text-left px-3 py-1.5 hover:bg-senpay-panel text-senpay-text-secondary hover:text-senpay-text-primary"
              >
                Pending Service Agreements
              </button>
              <button
                onClick={() => { onNavigate('operations'); setFilterMenuOpen(false); }}
                className="w-full text-left px-3 py-1.5 hover:bg-senpay-panel text-senpay-text-secondary hover:text-senpay-text-primary"
              >
                Active Escrow Payments
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Right Section: Alerts, Wallet, Avatar, Theme ── */}
      <div className="flex items-center gap-3">
        {/* Alert Badges */}
        <div className="flex items-center gap-2">
          {/* Critical Red Alert Badge */}
          <button
            onClick={() => onNavigate('incident_monitor')}
            className="relative w-8 h-8 rounded-lg bg-senpay-panel border border-senpay-border hover:border-senpay-red/50 flex items-center justify-center text-senpay-text-secondary hover:text-senpay-red transition-colors"
            title="Active Critical Alerts"
          >
            <AlertTriangle size={15} />
            <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-senpay-red text-white text-[9px] font-bold flex items-center justify-center shadow-sm">
              1
            </span>
          </button>

          {/* Warning Amber Alert Badge */}
          <button
            onClick={() => onNavigate('command_center')}
            className="relative w-8 h-8 rounded-lg bg-senpay-panel border border-senpay-border hover:border-senpay-amber/50 flex items-center justify-center text-senpay-text-secondary hover:text-senpay-amber transition-colors"
            title="Warning Level Incidents"
          >
            <Bell size={15} />
            <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-senpay-amber text-slate-950 text-[9px] font-black flex items-center justify-center shadow-sm">
              1
            </span>
          </button>
        </div>

        {/* Web3 Wallet Pill */}
        {wallet?.isConnected ? (
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-senpay-panel border border-senpay-cyan/30 text-[11px] font-mono text-senpay-cyan">
            <span className="w-1.5 h-1.5 rounded-full bg-senpay-cyan animate-pulse" />
            <span>{wallet.shortAddress || '0x71C...49b2'}</span>
          </div>
        ) : (
          <button
            onClick={wallet?.connect}
            className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-senpay-cyan/15 hover:bg-senpay-cyan/25 border border-senpay-cyan/40 text-[11px] font-mono text-senpay-cyan font-bold transition-all"
          >
            <Wallet size={12} />
            <span>Connect Wallet</span>
          </button>
        )}

        {/* User Account / Profile Menu */}
        {isAuthenticated ? (
          <div className="relative">
            <button
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className="flex items-center gap-2 px-2 py-1 rounded-lg bg-senpay-panel hover:bg-senpay-elevated border border-senpay-border text-xs text-senpay-text-primary transition"
              title="Operator Profile"
            >
              <div className="w-6 h-6 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-500 flex items-center justify-center font-bold text-[11px]">
                {user?.full_name ? user.full_name[0].toUpperCase() : 'O'}
              </div>
              <div className="hidden xl:flex flex-col text-left">
                <span className="text-[11px] font-medium leading-none text-senpay-text-primary">{user?.full_name || user?.username || 'Operator'}</span>
                <span className="text-[9px] font-mono leading-tight text-emerald-500 capitalize">{user?.role || 'Operator'}</span>
              </div>
              <ChevronDown size={11} className="text-senpay-text-muted" />
            </button>

            {userMenuOpen && (
              <div className="absolute right-0 mt-2 w-48 rounded-xl bg-senpay-card border border-senpay-border shadow-2xl py-2 z-50 text-xs">
                <div className="px-3 py-1.5 border-b border-senpay-border/60 mb-1">
                  <div className="text-[11px] text-senpay-text-muted">Signed in as</div>
                  <div className="font-mono text-xs text-senpay-text-primary truncate">{user?.email || 'operator@telesol.io'}</div>
                </div>
                <button
                  onClick={() => {
                    setUserMenuOpen(false);
                    onNavigate('audit');
                  }}
                  className="w-full text-left px-3 py-1.5 text-senpay-text-secondary hover:text-senpay-text-primary hover:bg-senpay-panel flex items-center gap-2"
                >
                  <Terminal size={12} />
                  <span>Audit Trail</span>
                </button>
                <button
                  onClick={async () => {
                    setUserMenuOpen(false);
                    await logout();
                    onNavigate('landing');
                  }}
                  className="w-full text-left px-3 py-1.5 text-rose-500 hover:bg-rose-500/10 flex items-center gap-2 mt-1 border-t border-senpay-border/40 pt-1.5"
                >
                  <LogOut size={12} />
                  <span>Sign Out</span>
                </button>
              </div>
            )}
          </div>
        ) : (
          <button
            onClick={() => onNavigate('login')}
            className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold font-mono transition"
          >
            <User size={12} />
            <span>Sign In</span>
          </button>
        )}

        {/* Theme Selector: Exactly Light and Dark */}
        <div className="relative">
          <button
            onClick={() => setThemeMenuOpen(!themeMenuOpen)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-senpay-panel border border-senpay-border text-xs text-senpay-text-secondary hover:text-senpay-text-primary transition-colors"
            title="Switch theme (Light / Dark)"
            aria-label="Theme selector"
          >
            {theme === THEMES.LIGHT ? (
              <Sun size={12} className="text-amber-500" />
            ) : (
              <Moon size={12} className="text-senpay-cyan" />
            )}
            <span className="font-mono text-[11px] capitalize font-medium">
              {theme === THEMES.LIGHT ? 'Light' : 'Dark'}
            </span>
            <ChevronDown size={11} className="opacity-70" />
          </button>

          {themeMenuOpen && (
            <div className="absolute right-0 mt-2 w-36 rounded-lg bg-senpay-card border border-senpay-border shadow-xl py-1 z-50 text-xs font-mono">
              <button
                onClick={() => {
                  setTheme(THEMES.LIGHT);
                  setThemeMenuOpen(false);
                }}
                className={`w-full text-left px-3 py-1.5 flex items-center justify-between transition-colors ${
                  theme === THEMES.LIGHT
                    ? 'text-senpay-cyan font-bold bg-senpay-panel'
                    : 'text-senpay-text-secondary hover:text-senpay-text-primary hover:bg-senpay-panel/50'
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <Sun size={11} className="text-amber-500" />
                  <span>Light</span>
                </div>
                {theme === THEMES.LIGHT && <span className="text-[10px]">✓</span>}
              </button>
              <button
                onClick={() => {
                  setTheme(THEMES.DARK);
                  setThemeMenuOpen(false);
                }}
                className={`w-full text-left px-3 py-1.5 flex items-center justify-between transition-colors ${
                  theme === THEMES.DARK
                    ? 'text-senpay-cyan font-bold bg-senpay-panel'
                    : 'text-senpay-text-secondary hover:text-senpay-text-primary hover:bg-senpay-panel/50'
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <Moon size={11} className="text-senpay-cyan" />
                  <span>Dark</span>
                </div>
                {theme === THEMES.DARK && <span className="text-[10px]">✓</span>}
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
