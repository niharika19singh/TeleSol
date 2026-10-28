import React, { useState } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { resetPassword } from '../../data/api';
import {
  Shield,
  Lock,
  ArrowRight,
  AlertCircle,
  CheckCircle,
  Sun,
  Moon,
  Eye,
  EyeOff,
} from 'lucide-react';

export default function ResetPasswordPage({ onNavigateLogin, onNavigateLanding }) {
  const { isLight, toggleTheme } = useTheme();

  const getUrlToken = () => {
    if (typeof window === 'undefined') return '';
    const hash = window.location.hash;
    if (hash.includes('token=')) {
      const match = hash.match(/token=([^&]+)/);
      if (match && match[1]) return decodeURIComponent(match[1]);
    }
    const params = new URLSearchParams(window.location.search);
    return params.get('token') || '';
  };

  const [token, setToken] = useState(getUrlToken);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const hasMinLength = newPassword.length >= 8;
  const passwordsMatch = newPassword && newPassword === confirmPassword;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!token || !token.trim()) {
      setError('Password reset token is missing.');
      return;
    }
    if (!hasMinLength) {
      setError('Password must be at least 8 characters long.');
      return;
    }
    if (!passwordsMatch) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      await resetPassword(token.trim(), newPassword);
      setSuccess(true);
    } catch (err) {
      setError(err.message || 'Password reset token is invalid or has expired.');
    } finally {
      setLoading(false);
    }
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
        <button
          onClick={onNavigateLanding}
          className="flex items-center gap-3 group focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 rounded px-1"
        >
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-500">
            <Shield className="w-4 h-4" />
          </div>
          <div className="text-left">
            <span className="font-mono text-sm font-bold tracking-wider uppercase block">
              SENPAY // TELESOL
            </span>
            <span className={`text-[10px] block ${isLight ? 'text-zinc-500' : 'text-zinc-400'}`}>
              CREDENTIAL UPDATE
            </span>
          </div>
        </button>

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
          className={`w-full max-w-md p-8 rounded-xl border shadow-xl ${
            isLight ? 'bg-zinc-50/60 border-zinc-200' : 'bg-zinc-950 border-zinc-900'
          }`}
        >
          {success ? (
            <div className="text-center py-4">
              <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-6 h-6" />
              </div>
              <h2 className="text-xl font-bold tracking-tight mb-2">Password Successfully Updated</h2>
              <p className={`text-sm mb-6 ${isLight ? 'text-zinc-600' : 'text-zinc-400'}`}>
                Your credentials have been re-keyed and salted with PBKDF2. You may now access the operational console with your new password.
              </p>
              <button
                onClick={onNavigateLogin}
                className="w-full py-2.5 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-sm transition-colors flex items-center justify-center gap-2"
              >
                <span>Sign In With New Password</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <>
              <div className="mb-6 text-center">
                <div className="w-10 h-10 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 flex items-center justify-center mx-auto mb-3">
                  <Lock className="w-5 h-5" />
                </div>
                <h1 className="text-xl font-bold tracking-tight">Set New Password</h1>
                <p className={`text-xs mt-1.5 ${isLight ? 'text-zinc-500' : 'text-zinc-400'}`}>
                  Choose a robust password for your operator account.
                </p>
              </div>

              {error && (
                <div className="mb-5 p-3 rounded-lg border border-red-500/20 bg-red-500/10 text-red-500 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-mono font-medium mb-1.5">RESET TOKEN</label>
                  <input
                    type="text"
                    required
                    value={token}
                    onChange={(e) => setToken(e.target.value)}
                    placeholder="Paste single-use reset token"
                    className={`w-full px-3 py-2 text-sm font-mono rounded-lg border focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-colors ${
                      isLight ? 'bg-white border-zinc-300' : 'bg-zinc-900 border-zinc-800'
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono font-medium mb-1.5">NEW PASSWORD</label>
                  <div className="relative">
                    <Lock
                      className={`w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 ${
                        isLight ? 'text-zinc-400' : 'text-zinc-500'
                      }`}
                    />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="••••••••••••"
                      className={`w-full pl-9 pr-10 py-2 text-sm rounded-lg border focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-colors ${
                        isLight ? 'bg-white border-zinc-300' : 'bg-zinc-900 border-zinc-800'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 opacity-50 hover:opacity-100"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-mono font-medium mb-1.5">CONFIRM NEW PASSWORD</label>
                  <div className="relative">
                    <Lock
                      className={`w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 ${
                        isLight ? 'text-zinc-400' : 'text-zinc-500'
                      }`}
                    />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••••••"
                      className={`w-full pl-9 pr-3 py-2 text-sm rounded-lg border focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-colors ${
                        isLight ? 'bg-white border-zinc-300' : 'bg-zinc-900 border-zinc-800'
                      }`}
                    />
                  </div>
                </div>

                {/* Password Quality Signals */}
                <div className="space-y-1 text-[11px] font-mono py-1">
                  <div
                    className={`flex items-center gap-1.5 ${
                      hasMinLength ? 'text-emerald-500' : isLight ? 'text-zinc-400' : 'text-zinc-600'
                    }`}
                  >
                    <div
                      className={`w-1.5 h-1.5 rounded-full ${hasMinLength ? 'bg-emerald-500' : 'bg-zinc-400'}`}
                    />
                    At least 8 characters
                  </div>
                  {confirmPassword && (
                    <div
                      className={`flex items-center gap-1.5 ${
                        passwordsMatch ? 'text-emerald-500' : 'text-red-500'
                      }`}
                    >
                      <div
                        className={`w-1.5 h-1.5 rounded-full ${
                          passwordsMatch ? 'bg-emerald-500' : 'bg-red-500'
                        }`}
                      />
                      {passwordsMatch ? 'Passwords match' : 'Passwords do not match'}
                    </div>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-sm transition-colors flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
                >
                  {loading ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <span>Update Password</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            </>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer
        className={`px-6 py-4 text-center border-t text-xs font-mono ${
          isLight ? 'border-zinc-200 text-zinc-500' : 'border-zinc-900 text-zinc-500'
        }`}
      >
        <span>SENPAY Authentication Service &bull; Single-Use Token Invalidation</span>
      </footer>
    </div>
  );
}
