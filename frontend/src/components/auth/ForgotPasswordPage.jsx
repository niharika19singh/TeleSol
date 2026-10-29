import React, { useState } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { forgotPassword } from '../../data/api';
import {
  Shield,
  Mail,
  ArrowRight,
  AlertCircle,
  CheckCircle,
  Sun,
  Moon,
  Sparkles,
} from 'lucide-react';

export default function ForgotPasswordPage({ onNavigateLogin, onNavigateLanding }) {
  const { isLight, toggleTheme } = useTheme();

  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [devToken, setDevToken] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !email.includes('@')) {
      setError('Please provide a valid email address.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const res = await forgotPassword(email.trim().toLowerCase());
      setSubmitted(true);
      if (res._dev_reset_token) {
        setDevToken(res._dev_reset_token);
      }
    } catch (err) {
      setError(err.message || 'Unable to process password reset request.');
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
              CREDENTIAL RECOVERY
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
          {submitted ? (
            <div className="text-center py-4">
              <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-6 h-6" />
              </div>
              <h2 className="text-xl font-bold tracking-tight mb-2">Instructions Dispatched</h2>
              <p className={`text-sm mb-6 ${isLight ? 'text-zinc-600' : 'text-zinc-400'}`}>
                If an active account exists for <strong className={isLight ? 'text-zinc-900' : 'text-white'}>{email}</strong>,
                password reset instructions have been sent. The reset token remains valid for 1 hour.
              </p>

              {devToken && (
                <div
                  className={`p-4 rounded-lg border text-left mb-6 text-xs font-mono ${
                    isLight ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-emerald-950/30 border-emerald-900/60 text-emerald-300'
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-bold mb-1.5">
                    <Sparkles className="w-3.5 h-3.5" /> Development Fast-Track
                  </div>
                  <p className="mb-2 text-[11px] opacity-80">
                    Console mode is active. You can reset directly using this token:
                  </p>
                  <a
                    href={`#reset-password?token=${devToken}`}
                    onClick={(e) => {
                      e.preventDefault();
                      window.location.hash = `#reset-password?token=${devToken}`;
                    }}
                    className="inline-block px-3 py-1.5 bg-emerald-600 text-white rounded font-medium text-xs hover:bg-emerald-500 transition-colors"
                  >
                    Set New Password Now &rarr;
                  </a>
                </div>
              )}

              <button
                onClick={onNavigateLogin}
                className="w-full py-2.5 px-4 rounded-lg bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 font-medium text-sm hover:opacity-90 transition-opacity"
              >
                Return to Sign In
              </button>
            </div>
          ) : (
            <>
              <div className="mb-6 text-center">
                <div className="w-10 h-10 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 flex items-center justify-center mx-auto mb-3">
                  <Mail className="w-5 h-5" />
                </div>
                <h1 className="text-xl font-bold tracking-tight">Reset Password</h1>
                <p className={`text-xs mt-1.5 ${isLight ? 'text-zinc-500' : 'text-zinc-400'}`}>
                  Enter your registered email address to receive reset instructions.
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
                  <label htmlFor="forgot-email" className="block text-xs font-mono font-medium mb-1.5 cursor-pointer">ACCOUNT EMAIL</label>
                  <div className="relative">
                    <Mail
                      className={`w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none ${
                        isLight ? 'text-zinc-400' : 'text-zinc-500'
                      }`}
                    />
                    <input
                      id="forgot-email"
                      type="email"
                      required
                      autoComplete="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@carrier-ops.com"
                      className={`w-full pl-9 pr-3 py-2 text-sm rounded-lg border focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-colors select-text ${
                        isLight ? 'bg-white border-zinc-300' : 'bg-zinc-900 border-zinc-800'
                      }`}
                    />
                  </div>
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
                      <span>Send Password Reset Link</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>

              <div className="mt-6 text-center">
                <button
                  onClick={onNavigateLogin}
                  className={`text-xs hover:underline ${isLight ? 'text-zinc-600' : 'text-zinc-400'}`}
                >
                  &larr; Remember your password? Sign In
                </button>
              </div>
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
        <span>Protected by Anti-Enumeration &bull; Constant-Time Security Dispatch</span>
      </footer>
    </div>
  );
}
