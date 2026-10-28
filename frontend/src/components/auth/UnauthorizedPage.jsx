import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import {
  ShieldAlert,
  ArrowRight,
  LogOut,
  Sun,
  Moon,
  Lock,
} from 'lucide-react';

export default function UnauthorizedPage({ onNavigateDashboard, onNavigateLogin }) {
  const { user, logout } = useAuth();
  const { isLight, toggleTheme } = useTheme();

  const handleSwitchAccount = async () => {
    await logout();
    if (onNavigateLogin) onNavigateLogin();
    else window.location.hash = '#login';
  };

  return (
    <div
      className={`min-h-screen flex flex-col justify-between transition-colors duration-200 ${
        isLight ? 'bg-white text-zinc-950' : 'bg-black text-zinc-100'
      }`}
    >
      {/* Header */}
      <header
        className={`w-full px-6 py-4 flex items-center justify-between border-b ${
          isLight ? 'border-zinc-200 bg-white' : 'border-zinc-900 bg-zinc-950/80'
        } backdrop-blur-sm`}
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-500">
            <Lock className="w-4 h-4" />
          </div>
          <div className="text-left">
            <span className="font-mono text-sm font-bold tracking-wider uppercase block">
              SENPAY // ACCESS CONTROL
            </span>
            <span className={`text-[10px] block ${isLight ? 'text-zinc-500' : 'text-zinc-400'}`}>
              ROLE-BASED RESTRICTION
            </span>
          </div>
        </div>

        <button
          onClick={toggleTheme}
          aria-label="Toggle Theme"
          className={`p-2 rounded-md border transition-colors ${
            isLight
              ? 'border-zinc-300 text-zinc-700 hover:bg-zinc-100'
              : 'border-zinc-800 text-zinc-300 hover:bg-zinc-900'
          }`}
        >
          {isLight ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
        </button>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div
          className={`w-full max-w-lg p-8 rounded-xl border shadow-xl text-center ${
            isLight ? 'bg-zinc-50/60 border-zinc-200' : 'bg-zinc-950 border-zinc-900'
          }`}
        >
          <div className="w-14 h-14 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-500 flex items-center justify-center mx-auto mb-4">
            <ShieldAlert className="w-7 h-7" />
          </div>

          <span className="inline-block px-2.5 py-0.5 rounded text-[11px] font-mono font-bold bg-amber-500/10 text-amber-500 border border-amber-500/20 mb-3">
            HTTP 403 // INSUFFICIENT PRIVILEGES
          </span>

          <h1 className="text-2xl font-bold tracking-tight mb-2">Access Denied</h1>

          <p className={`text-sm mb-6 ${isLight ? 'text-zinc-600' : 'text-zinc-400'}`}>
            Your authenticated account does not possess the operational role or administrative
            clearance required to access this resource.
          </p>

          {/* Current Identity Details */}
          {user && (
            <div
              className={`p-4 rounded-lg border text-left mb-6 font-mono text-xs ${
                isLight ? 'bg-zinc-100 border-zinc-300' : 'bg-zinc-900 border-zinc-800'
              }`}
            >
              <div className="flex justify-between py-1 border-b border-zinc-200 dark:border-zinc-800">
                <span className="opacity-60">USER ID:</span>
                <span className="font-bold">{user.id}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-zinc-200 dark:border-zinc-800">
                <span className="opacity-60">EMAIL:</span>
                <span>{user.email}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-zinc-200 dark:border-zinc-800">
                <span className="opacity-60">ASSIGNED ROLE:</span>
                <span className="text-amber-500 font-bold">{user.role || 'NOC_OPERATOR'}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="opacity-60">WORKSPACE:</span>
                <span>{user.org_name || user.workspace_id || 'TeleSol Global'}</span>
              </div>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={onNavigateDashboard}
              className="flex-1 py-2.5 px-4 rounded-lg bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 font-medium text-sm hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
            >
              <span>Return to Operations Console</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={handleSwitchAccount}
              className={`px-4 py-2.5 rounded-lg border font-medium text-sm transition-colors flex items-center justify-center gap-2 ${
                isLight
                  ? 'border-zinc-300 text-zinc-700 hover:bg-zinc-100'
                  : 'border-zinc-800 text-zinc-300 hover:bg-zinc-900'
              }`}
            >
              <LogOut className="w-4 h-4" />
              <span>Switch Account</span>
            </button>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer
        className={`px-6 py-4 text-center border-t text-xs font-mono ${
          isLight ? 'border-zinc-200 text-zinc-500' : 'border-zinc-900 text-zinc-500'
        }`}
      >
        <span>SENPAY Multi-Tenant Security Engine &bull; Role Enforcement Active</span>
      </footer>
    </div>
  );
}
