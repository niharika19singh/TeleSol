import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { Shield, Lock, Mail, User, Eye, EyeOff, Radio, CheckCircle, ArrowRight, ArrowLeft, AlertCircle, Sun, Moon } from 'lucide-react';

export default function LoginPage({ onLoginSuccess, onNavigateLanding, onNavigateSignup, onNavigateForgotPassword }) {
  const { login, register, demoSignIn, demoAdminSignIn } = useAuth();
  const { theme, toggleTheme, isLight } = useTheme();
  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Form states
  const [identifier, setIdentifier] = useState('operator@telesol.io');
  const [password, setPassword] = useState('senpay-telecom-2026');
  
  // Register fields
  const [regUsername, setRegUsername] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regFullName, setRegFullName] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regRole, setRegRole] = useState('operator');

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(identifier.trim(), password);
      if (onLoginSuccess) {
        onLoginSuccess();
      } else {
        window.location.hash = '#command_center';
      }
    } catch (err) {
      setError(err.message || 'Authentication failed. Please verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await register({
        username: regUsername.trim(),
        email: regEmail.trim(),
        password: regPassword,
        full_name: regFullName.trim(),
        role: regRole,
      });
      setSuccessMsg('Account registered successfully! Access granted.');
      setTimeout(() => {
        if (onLoginSuccess) {
          onLoginSuccess();
        } else {
          window.location.hash = '#command_center';
        }
      }, 700);
    } catch (err) {
      setError(err.message || 'Registration failed. Check username and email availability.');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoFill = async () => {
    setError('');
    setLoading(true);
    try {
      await demoSignIn();
      if (onLoginSuccess) {
        onLoginSuccess();
      } else {
        window.location.hash = '#command_center';
      }
    } catch (err) {
      setError(err.message || 'Demo sign-in failed. Please check backend connection.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-senpay-bg text-senpay-text-primary flex flex-col justify-between font-sans relative overflow-hidden select-none transition-colors duration-150">
      {/* Background ambient mesh */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(16,185,129,0.12),rgba(255,255,255,0))]" />
      <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 left-1/4 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Top Header */}
      <header className="relative z-10 w-full max-w-7xl mx-auto px-6 py-6 flex items-center justify-between">
        <button
          onClick={onNavigateLanding || (() => { window.location.hash = '#landing'; })}
          className="flex items-center gap-2 text-senpay-text-secondary hover:text-senpay-cyan transition-colors text-sm font-medium"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Public Landing
        </button>

        <div className="flex items-center gap-3">
          {/* Theme Switcher Toggle */}
          <button
            onClick={toggleTheme}
            className="p-1.5 px-2.5 rounded-lg border border-senpay-border bg-senpay-panel hover:bg-senpay-elevated text-senpay-text-secondary hover:text-senpay-text-primary transition flex items-center gap-1.5 text-xs font-mono"
            title={`Switch to ${isLight ? 'Obsidian Dark' : 'Porcelain Light'} theme`}
            aria-label="Toggle theme"
          >
            {isLight ? (
              <Moon size={14} className="text-senpay-cyan" />
            ) : (
              <Sun size={14} className="text-senpay-amber" />
            )}
            <span className="text-[10px] font-bold uppercase tracking-wider">
              {isLight ? 'Dark' : 'Light'}
            </span>
          </button>

          <div className="flex items-center gap-2 bg-senpay-panel border border-senpay-border px-3 py-1 rounded-full text-xs text-senpay-text-secondary font-mono">
            <span className="w-2 h-2 rounded-full bg-senpay-green animate-pulse" />
            HSK CHAIN TESTNET (133)
          </div>
        </div>
      </header>

      {/* Main Card */}
      <main className="relative z-10 flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-md bg-senpay-card border border-senpay-border rounded-2xl shadow-2xl backdrop-blur-xl p-8">
          {/* Logo & Headline */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-senpay-green/10 border border-senpay-green/20 text-senpay-green mb-3">
              <Radio className="w-6 h-6 animate-pulse" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-senpay-text-primary flex items-center justify-center gap-2">
              SENPAY <span className="text-senpay-cyan text-xs font-mono uppercase bg-senpay-cyan/10 px-2 py-0.5 rounded border border-senpay-cyan/20">Ops Console</span>
            </h1>
            <p className="text-sm text-senpay-text-secondary mt-1">
              Deterministic Autonomous Telecom Settlement Console
            </p>
          </div>

          {/* Quick Demo Sign-In Banners */}
          <div className="mb-6 space-y-2">
            <div className="p-3 bg-senpay-green/10 border border-senpay-green/30 rounded-xl flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 text-senpay-green font-medium">
                <Shield className="w-4 h-4 text-senpay-green flex-shrink-0" />
                <span>NOC Operator Account</span>
              </div>
              <button
                type="button"
                onClick={handleDemoFill}
                disabled={loading}
                className="bg-senpay-green hover:opacity-90 text-white font-semibold px-2.5 py-1 rounded shadow text-xs transition flex items-center gap-1 disabled:opacity-50"
              >
                Sign In &rarr;
              </button>
            </div>

            <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 text-emerald-500 font-medium">
                <Lock className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                <span>Platform Admin Account</span>
              </div>
              <button
                type="button"
                onClick={async () => {
                  setError('');
                  setLoading(true);
                  try {
                    await demoAdminSignIn();
                    if (onLoginSuccess) onLoginSuccess();
                    else window.location.hash = '#command_center';
                  } catch (err) {
                    setError(err.message || 'Admin login failed');
                  } finally {
                    setLoading(false);
                  }
                }}
                disabled={loading}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold px-2.5 py-1 rounded shadow text-xs transition flex items-center gap-1 disabled:opacity-50"
              >
                Admin In &rarr;
              </button>
            </div>
          </div>

          {/* Mode Switcher Tabs */}
          <div className="grid grid-cols-2 p-1 bg-senpay-panel rounded-lg border border-senpay-border mb-6 text-sm">
            <button
              type="button"
              onClick={() => { setMode('login'); setError(''); }}
              className={`py-1.5 rounded-md font-medium transition ${
                mode === 'login'
                  ? 'bg-senpay-card text-senpay-text-primary shadow-sm border border-senpay-border/50'
                  : 'text-senpay-text-muted hover:text-senpay-text-primary'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => { setMode('register'); setError(''); }}
              className={`py-1.5 rounded-md font-medium transition ${
                mode === 'register'
                  ? 'bg-senpay-card text-senpay-text-primary shadow-sm border border-senpay-border/50'
                  : 'text-senpay-text-muted hover:text-senpay-text-primary'
              }`}
            >
              Register Access
            </button>
          </div>

          {/* Error & Success Messages */}
          {error && (
            <div className="mb-4 p-3 bg-senpay-rose/15 border border-senpay-rose/40 rounded-xl text-xs text-senpay-rose flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-senpay-rose flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="mb-4 p-3 bg-senpay-green/15 border border-senpay-green/40 rounded-xl text-xs text-senpay-green flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-senpay-green flex-shrink-0 mt-0.5" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Login Form */}
          {mode === 'login' ? (
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-senpay-text-secondary mb-1.5">
                  Email or Username
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-senpay-text-muted">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    required
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder="operator@telesol.io"
                    className="w-full pl-9 pr-3 py-2 bg-senpay-panel border border-senpay-border rounded-lg text-sm text-senpay-text-primary placeholder:text-senpay-text-muted focus:outline-none focus:border-senpay-cyan focus:ring-1 focus:ring-senpay-cyan transition"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-medium text-senpay-text-secondary">
                    Password
                  </label>
                  <a
                    href="#forgot-password"
                    onClick={(e) => {
                      e.preventDefault();
                      if (onNavigateForgotPassword) onNavigateForgotPassword();
                      else window.location.hash = '#forgot-password';
                    }}
                    className="text-[11px] text-senpay-cyan hover:underline font-mono"
                  >
                    Forgot password?
                  </a>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-senpay-text-muted">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full pl-9 pr-10 py-2 bg-senpay-panel border border-senpay-border rounded-lg text-sm text-senpay-text-primary placeholder:text-senpay-text-muted focus:outline-none focus:border-senpay-cyan focus:ring-1 focus:ring-senpay-cyan transition font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-senpay-text-muted hover:text-senpay-text-primary"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className={`w-full bg-senpay-cyan hover:opacity-90 ${isLight ? 'text-white' : 'text-black'} font-bold py-2.5 px-4 rounded-lg shadow-lg transition duration-200 flex items-center justify-center gap-2 text-sm disabled:opacity-50`}
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <span>Enter Autonomous Console</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>

              <div className="text-center pt-2">
                <a
                  href="#signup"
                  onClick={(e) => {
                    e.preventDefault();
                    if (onNavigateSignup) onNavigateSignup();
                    else window.location.hash = '#signup';
                  }}
                  className="text-xs text-senpay-text-secondary hover:text-senpay-text-primary hover:underline font-medium"
                >
                  Need an organization account? Register &rarr;
                </a>
              </div>
            </form>
          ) : (
            /* Register Form */
            <form onSubmit={handleRegisterSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-medium text-senpay-text-secondary mb-1">
                  Full Name
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-senpay-text-muted">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    required
                    value={regFullName}
                    onChange={(e) => setRegFullName(e.target.value)}
                    placeholder="Devin Vance"
                    className="w-full pl-9 pr-3 py-1.5 bg-senpay-panel border border-senpay-border rounded-lg text-sm text-senpay-text-primary placeholder:text-senpay-text-muted focus:outline-none focus:border-senpay-cyan"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium text-senpay-text-secondary mb-1">
                    Username
                  </label>
                  <input
                    type="text"
                    required
                    value={regUsername}
                    onChange={(e) => setRegUsername(e.target.value)}
                    placeholder="dvance"
                    className="w-full px-3 py-1.5 bg-senpay-panel border border-senpay-border rounded-lg text-sm text-senpay-text-primary placeholder:text-senpay-text-muted focus:outline-none focus:border-senpay-cyan"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-senpay-text-secondary mb-1">
                    Role
                  </label>
                  <select
                    value={regRole}
                    onChange={(e) => setRegRole(e.target.value)}
                    className="w-full px-3 py-1.5 bg-senpay-panel border border-senpay-border rounded-lg text-sm text-senpay-text-primary focus:outline-none focus:border-senpay-cyan"
                  >
                    <option value="operator">Operator</option>
                    <option value="risk_manager">Risk Manager</option>
                    <option value="auditor">Settlement Auditor</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-senpay-text-secondary mb-1">
                  Corporate Email
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-senpay-text-muted">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="email"
                    required
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    placeholder="dvance@carrier.com"
                    className="w-full pl-9 pr-3 py-1.5 bg-senpay-panel border border-senpay-border rounded-lg text-sm text-senpay-text-primary placeholder:text-senpay-text-muted focus:outline-none focus:border-senpay-cyan"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-senpay-text-secondary mb-1">
                  Password (min 8 chars)
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-senpay-text-muted">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={8}
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full pl-9 pr-10 py-1.5 bg-senpay-panel border border-senpay-border rounded-lg text-sm text-senpay-text-primary placeholder:text-senpay-text-muted focus:outline-none focus:border-senpay-cyan font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-senpay-text-muted hover:text-senpay-text-primary"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className={`w-full bg-senpay-cyan hover:opacity-90 ${isLight ? 'text-white' : 'text-black'} font-bold py-2 px-4 rounded-lg shadow-lg transition duration-200 flex items-center justify-center gap-2 text-sm disabled:opacity-50`}
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <span>Complete Registration</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>

              <div className="text-center pt-2">
                <a
                  href="#signup"
                  onClick={(e) => {
                    e.preventDefault();
                    if (onNavigateSignup) onNavigateSignup();
                    else window.location.hash = '#signup';
                  }}
                  className="text-xs text-senpay-text-secondary hover:text-senpay-text-primary hover:underline font-medium"
                >
                  Need an organization account? Register &rarr;
                </a>
              </div>
            </form>
          )}

          {/* Footer credentials hint */}
          <div className="mt-6 pt-4 border-t border-senpay-border text-center text-[11px] text-senpay-text-muted">
            <span className="font-mono text-senpay-text-secondary">Default Sandbox Credentials:</span><br />
            <span className="text-senpay-text-primary font-mono">operator@telesol.io</span> / <span className="text-senpay-text-primary font-mono">senpay-telecom-2026</span>
          </div>
        </div>
      </main>

      {/* Page Footer */}
      <footer className="relative z-10 w-full max-w-7xl mx-auto px-6 py-6 text-center text-xs text-senpay-text-muted">
        SENPAY 2.0 &bull; Trust-Aware Autonomous Telecom Settlement Protocol &bull; HSK Chain Horizon
      </footer>
    </div>
  );
}
