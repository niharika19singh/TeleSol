import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Shield, Lock, Mail, User, Eye, EyeOff, Radio, CheckCircle, ArrowRight, ArrowLeft, AlertCircle } from 'lucide-react';

export default function LoginPage({ onLoginSuccess, onNavigateLanding }) {
  const { login, register, demoSignIn } = useAuth();
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
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between font-sans relative overflow-hidden select-none">
      {/* Background ambient mesh */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(16,185,129,0.12),rgba(255,255,255,0))]" />
      <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 left-1/4 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Top Header */}
      <header className="relative z-10 w-full max-w-7xl mx-auto px-6 py-6 flex items-center justify-between">
        <button
          onClick={onNavigateLanding || (() => { window.location.hash = '#landing'; })}
          className="flex items-center gap-2 text-slate-400 hover:text-emerald-400 transition-colors text-sm font-medium"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Public Landing
        </button>

        <div className="flex items-center gap-2 bg-slate-900/80 border border-slate-800 px-3 py-1 rounded-full text-xs text-slate-400 font-mono">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          HSK CHAIN TESTNET (133)
        </div>
      </header>

      {/* Main Card */}
      <main className="relative z-10 flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-md bg-slate-900/90 border border-slate-800/80 rounded-2xl shadow-2xl backdrop-blur-xl p-8">
          {/* Logo & Headline */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 mb-3">
              <Radio className="w-6 h-6 animate-pulse" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center justify-center gap-2">
              SENPAY <span className="text-emerald-400 text-xs font-mono uppercase bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">Ops Console</span>
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              Deterministic Autonomous Telecom Settlement Console
            </p>
          </div>

          {/* Quick Demo Sign-In Banner */}
          <div className="mb-6 p-3 bg-emerald-950/40 border border-emerald-800/50 rounded-xl flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 text-emerald-300">
              <Shield className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              <span>Hackathon Evaluation Account ready</span>
            </div>
            <button
              type="button"
              onClick={handleDemoFill}
              disabled={loading}
              className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold px-2.5 py-1 rounded shadow text-xs transition flex items-center gap-1 disabled:opacity-50"
            >
              1-Click Sign In
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          {/* Mode Switcher Tabs */}
          <div className="grid grid-cols-2 p-1 bg-slate-950/60 rounded-lg border border-slate-800 mb-6 text-sm">
            <button
              type="button"
              onClick={() => { setMode('login'); setError(''); }}
              className={`py-1.5 rounded-md font-medium transition ${
                mode === 'login'
                  ? 'bg-slate-800 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => { setMode('register'); setError(''); }}
              className={`py-1.5 rounded-md font-medium transition ${
                mode === 'register'
                  ? 'bg-slate-800 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Register Access
            </button>
          </div>

          {/* Error & Success Messages */}
          {error && (
            <div className="mb-4 p-3 bg-rose-950/50 border border-rose-800/60 rounded-xl text-xs text-rose-300 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="mb-4 p-3 bg-emerald-950/50 border border-emerald-800/60 rounded-xl text-xs text-emerald-300 flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Login Form */}
          {mode === 'login' ? (
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Email or Username
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    required
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder="operator@telesol.io"
                    className="w-full pl-9 pr-3 py-2 bg-slate-950/70 border border-slate-800 rounded-lg text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-medium text-slate-300">
                    Password
                  </label>
                  <span className="text-[11px] text-slate-500 font-mono">PBKDF2-SHA256</span>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full pl-9 pr-10 py-2 bg-slate-950/70 border border-slate-800 rounded-lg text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-slate-300"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold py-2.5 px-4 rounded-lg shadow-lg hover:shadow-emerald-500/20 transition duration-200 flex items-center justify-center gap-2 text-sm disabled:opacity-50"
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <span>Enter Autonomous Console</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </form>
          ) : (
            /* Register Form */
            <form onSubmit={handleRegisterSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Full Name
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    required
                    value={regFullName}
                    onChange={(e) => setRegFullName(e.target.value)}
                    placeholder="Devin Vance"
                    className="w-full pl-9 pr-3 py-1.5 bg-slate-950/70 border border-slate-800 rounded-lg text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Username
                  </label>
                  <input
                    type="text"
                    required
                    value={regUsername}
                    onChange={(e) => setRegUsername(e.target.value)}
                    placeholder="dvance"
                    className="w-full px-3 py-1.5 bg-slate-950/70 border border-slate-800 rounded-lg text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Role
                  </label>
                  <select
                    value={regRole}
                    onChange={(e) => setRegRole(e.target.value)}
                    className="w-full px-3 py-1.5 bg-slate-950/70 border border-slate-800 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-emerald-500"
                  >
                    <option value="operator">Operator</option>
                    <option value="risk_manager">Risk Manager</option>
                    <option value="auditor">Settlement Auditor</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Corporate Email
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="email"
                    required
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    placeholder="dvance@carrier.com"
                    className="w-full pl-9 pr-3 py-1.5 bg-slate-950/70 border border-slate-800 rounded-lg text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Password (min 8 chars)
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={8}
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full pl-9 pr-10 py-1.5 bg-slate-950/70 border border-slate-800 rounded-lg text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-emerald-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-slate-300"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold py-2 px-4 rounded-lg shadow-lg hover:shadow-emerald-500/20 transition duration-200 flex items-center justify-center gap-2 text-sm disabled:opacity-50"
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <span>Complete Registration</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* Footer credentials hint */}
          <div className="mt-6 pt-4 border-t border-slate-800/80 text-center text-[11px] text-slate-500">
            <span className="font-mono text-slate-400">Default Sandbox Credentials:</span><br />
            <span className="text-slate-300 font-mono">operator@telesol.io</span> / <span className="text-slate-300 font-mono">senpay-telecom-2026</span>
          </div>
        </div>
      </main>

      {/* Page Footer */}
      <footer className="relative z-10 w-full max-w-7xl mx-auto px-6 py-6 text-center text-xs text-slate-500">
        SENPAY 2.0 &bull; Trust-Aware Autonomous Telecom Settlement Protocol &bull; HSK Chain Horizon
      </footer>
    </div>
  );
}
