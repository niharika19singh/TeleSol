import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { verifyEmail, resendVerification } from '../../data/api';
import {
  Shield,
  CheckCircle,
  AlertCircle,
  ArrowRight,
  RefreshCw,
  Sun,
  Moon,
  Mail,
} from 'lucide-react';

export default function VerifyEmailPage({ onNavigateLogin, onNavigateLanding }) {
  const { theme, toggleTheme, isLight } = useTheme();

  // Extract token from either window.location.search or window.location.hash
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

  const [tokenInput, setTokenInput] = useState(getUrlToken);
  const [resendEmail, setResendEmail] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [verified, setVerified] = useState(false);
  const [error, setError] = useState('');
  const [resendMsg, setResendMsg] = useState('');
  const [resendLoading, setResendLoading] = useState(false);

  useEffect(() => {
    const urlToken = getUrlToken();
    if (urlToken && !verified && !verifying) {
      triggerVerification(urlToken);
    }
  }, []);

  const triggerVerification = async (tok) => {
    if (!tok || !tok.trim()) {
      setError('Please provide a verification token.');
      return;
    }
    setVerifying(true);
    setError('');
    try {
      await verifyEmail(tok.trim());
      setVerified(true);
    } catch (err) {
      const msg = typeof err === 'string' ? err : (err?.message || err?.detail || 'Verification token is invalid, expired, or already used.');
      setError(typeof msg === 'string' ? msg : JSON.stringify(msg));
    } finally {
      setVerifying(false);
    }
  };

  const handleResend = async (e) => {
    e.preventDefault();
    if (!resendEmail || !resendEmail.includes('@')) {
      setError('Please enter a valid email address.');
      return;
    }
    setResendLoading(true);
    setError('');
    setResendMsg('');
    try {
      const res = await resendVerification(resendEmail.trim().toLowerCase());
      setResendMsg(res.message || 'Verification link sent. Please check your inbox.');
      if (res._dev_verification_token) {
        setTokenInput(res._dev_verification_token);
      }
    } catch (err) {
      setError(err.message || 'Unable to resend verification email.');
    } finally {
      setResendLoading(false);
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
              ACCOUNT VERIFICATION
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
          {verified ? (
            /* Verified Success State */
            <div className="text-center py-4">
              <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-6 h-6" />
              </div>
              <h1 className="text-xl font-bold tracking-tight mb-2">Account Verified</h1>
              <p className={`text-sm mb-6 ${isLight ? 'text-zinc-600' : 'text-zinc-400'}`}>
                Your email address has been successfully confirmed. You now possess active access to the
                SENPAY telecom operations console.
              </p>
              <button
                onClick={onNavigateLogin}
                className="w-full py-2.5 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-sm transition-colors flex items-center justify-center gap-2"
              >
                <span>Continue to Sign In</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          ) : (
            /* Token Verification Form & Resend */
            <>
              <div className="mb-6 text-center">
                <div className="w-10 h-10 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 flex items-center justify-center mx-auto mb-3">
                  <Mail className="w-5 h-5" />
                </div>
                <h1 className="text-xl font-bold tracking-tight">Verify Your Account</h1>
                <p className={`text-xs mt-1.5 ${isLight ? 'text-zinc-500' : 'text-zinc-400'}`}>
                  Enter or confirm the single-use token sent to your email address.
                </p>
              </div>

              {error && (
                <div className="mb-5 p-3 rounded-lg border border-red-500/20 bg-red-500/10 text-red-500 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {resendMsg && (
                <div className="mb-5 p-3 rounded-lg border border-emerald-500/20 bg-emerald-500/10 text-emerald-500 text-xs flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 shrink-0" />
                  <span>{resendMsg}</span>
                </div>
              )}

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  triggerVerification(tokenInput);
                }}
                className="space-y-4"
              >
                <div>
                  <label className="block text-xs font-mono font-medium mb-1.5">VERIFICATION TOKEN</label>
                  <input
                    type="text"
                    required
                    value={tokenInput}
                    onChange={(e) => setTokenInput(e.target.value)}
                    placeholder="Paste single-use token code"
                    className={`w-full px-3 py-2 text-sm font-mono rounded-lg border focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-colors ${
                      isLight ? 'bg-white border-zinc-300' : 'bg-zinc-900 border-zinc-800'
                    }`}
                  />
                </div>

                <button
                  type="submit"
                  disabled={verifying || !tokenInput}
                  className="w-full py-2.5 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {verifying ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <span>Verify Account Token</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>

              {/* Resend Section */}
              <div className="mt-8 pt-6 border-t border-zinc-200 dark:border-zinc-900">
                <span className={`block text-xs font-mono font-medium mb-2 ${isLight ? 'text-zinc-600' : 'text-zinc-400'}`}>
                  NEED A FRESH VERIFICATION LINK?
                </span>
                <form onSubmit={handleResend} className="flex gap-2">
                  <input
                    type="email"
                    value={resendEmail}
                    onChange={(e) => setResendEmail(e.target.value)}
                    placeholder="Enter registered email"
                    className={`flex-1 px-3 py-2 text-xs rounded-lg border focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-colors ${
                      isLight ? 'bg-white border-zinc-300' : 'bg-zinc-900 border-zinc-800'
                    }`}
                  />
                  <button
                    type="submit"
                    disabled={resendLoading || !resendEmail}
                    className="px-3 py-2 rounded-lg bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 text-xs font-medium hover:opacity-90 transition-opacity flex items-center gap-1.5 disabled:opacity-50"
                  >
                    {resendLoading ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      'Resend'
                    )}
                  </button>
                </form>
              </div>

              <div className="mt-6 text-center">
                <button
                  onClick={onNavigateLogin}
                  className={`text-xs hover:underline ${isLight ? 'text-zinc-600' : 'text-zinc-400'}`}
                >
                  &larr; Return to Sign In
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
        <span>SENPAY Verification Protocol &bull; 24-Hour Cryptographic Expiration Window</span>
      </footer>
    </div>
  );
}
