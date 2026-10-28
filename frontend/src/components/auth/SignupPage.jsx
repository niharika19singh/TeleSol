import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import {
  Shield,
  Lock,
  Mail,
  User,
  Building,
  CheckCircle,
  ArrowRight,
  ArrowLeft,
  AlertCircle,
  Eye,
  EyeOff,
  Sun,
  Moon,
  Sparkles,
} from 'lucide-react';

export default function SignupPage({ onNavigateLogin, onNavigateLanding }) {
  const { register } = useAuth();
  const { theme, toggleTheme, isLight } = useTheme();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [orgName, setOrgName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [verificationPending, setVerificationPending] = useState(false);
  const [devToken, setDevToken] = useState('');

  // Password validation checks
  const hasMinLength = password.length >= 8;
  const hasNumberOrSymbol = /[0-9!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password);
  const passwordsMatch = password && password === confirmPassword;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

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
      const res = await register({
        full_name: fullName.trim(),
        email: email.trim().toLowerCase(),
        organization_name: orgName.trim() || undefined,
        password: password,
      });

      const tok = res.raw?._dev_verification_token || res.user?._dev_verification_token || res._dev_verification_token;
      if (tok) {
        setDevToken(tok);
      }
      setVerificationPending(true);
    } catch (err) {
      setError(err.message || 'Registration failed. Please check your details.');
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
      {/* Header Bar */}
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
              SECURE REGISTRATION
            </span>
          </div>
        </button>

        <div className="flex items-center gap-4">
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
          <button
            onClick={onNavigateLogin}
            className={`text-xs font-mono font-medium hover:underline flex items-center gap-1.5 ${
              isLight ? 'text-zinc-700' : 'text-zinc-300'
            }`}
          >
            Already have an account? Sign In <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div
          className={`w-full max-w-md p-8 rounded-xl border shadow-xl ${
            isLight ? 'bg-zinc-50/60 border-zinc-200' : 'bg-zinc-950 border-zinc-900'
          }`}
        >
          {verificationPending ? (
            /* Verification Screen */
            <div className="text-center py-4">
              <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-6 h-6" />
              </div>
              <h2 className="text-xl font-bold tracking-tight mb-2">Check Your Email</h2>
              <p className={`text-sm mb-6 ${isLight ? 'text-zinc-600' : 'text-zinc-400'}`}>
                A single-use verification link has been dispatched to{' '}
                <strong className={isLight ? 'text-zinc-900' : 'text-white'}>{email}</strong>.
                Please verify your address within 24 hours to access the operational console.
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
                    Console mode is active. You can verify immediately using this token:
                  </p>
                  <a
                    href={`#verify-email?token=${devToken}`}
                    onClick={(e) => {
                      e.preventDefault();
                      window.location.hash = `#verify-email?token=${devToken}`;
                    }}
                    className="inline-block px-3 py-1.5 bg-emerald-600 text-white rounded font-medium text-xs hover:bg-emerald-500 transition-colors"
                  >
                    Verify Email Now &rarr;
                  </a>
                </div>
              )}

              <div className="flex flex-col gap-2">
                <button
                  onClick={onNavigateLogin}
                  className="w-full py-2.5 px-4 rounded-lg bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 font-medium text-sm hover:opacity-90 transition-opacity"
                >
                  Proceed to Sign In
                </button>
              </div>
            </div>
          ) : (
            /* Registration Form */
            <>
              <div className="mb-6 text-center">
                <h1 className="text-xl font-bold tracking-tight">Create SENPAY Account</h1>
                <p className={`text-xs mt-1.5 ${isLight ? 'text-zinc-500' : 'text-zinc-400'}`}>
                  Autonomous Telecom Procurement & Network Operations
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
                  <label className="block text-xs font-mono font-medium mb-1.5">FULL NAME</label>
                  <div className="relative">
                    <User
                      className={`w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 ${
                        isLight ? 'text-zinc-400' : 'text-zinc-500'
                      }`}
                    />
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="e.g. Rachel Chen"
                      className={`w-full pl-9 pr-3 py-2 text-sm rounded-lg border focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-colors ${
                        isLight ? 'bg-white border-zinc-300' : 'bg-zinc-900 border-zinc-800'
                      }`}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-mono font-medium mb-1.5">EMAIL ADDRESS</label>
                  <div className="relative">
                    <Mail
                      className={`w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 ${
                        isLight ? 'text-zinc-400' : 'text-zinc-500'
                      }`}
                    />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@telecom-org.com"
                      className={`w-full pl-9 pr-3 py-2 text-sm rounded-lg border focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-colors ${
                        isLight ? 'bg-white border-zinc-300' : 'bg-zinc-900 border-zinc-800'
                      }`}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-mono font-medium mb-1.5">
                    ORGANIZATION / WORKSPACE <span className="opacity-50">(OPTIONAL)</span>
                  </label>
                  <div className="relative">
                    <Building
                      className={`w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 ${
                        isLight ? 'text-zinc-400' : 'text-zinc-500'
                      }`}
                    />
                    <input
                      type="text"
                      value={orgName}
                      onChange={(e) => setOrgName(e.target.value)}
                      placeholder="e.g. TeleSol Cork Operations"
                      className={`w-full pl-9 pr-3 py-2 text-sm rounded-lg border focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-colors ${
                        isLight ? 'bg-white border-zinc-300' : 'bg-zinc-900 border-zinc-800'
                      }`}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-mono font-medium mb-1.5">PASSWORD</label>
                  <div className="relative">
                    <Lock
                      className={`w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 ${
                        isLight ? 'text-zinc-400' : 'text-zinc-500'
                      }`}
                    />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
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
                  <label className="block text-xs font-mono font-medium mb-1.5">CONFIRM PASSWORD</label>
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
                  <div
                    className={`flex items-center gap-1.5 ${
                      hasNumberOrSymbol ? 'text-emerald-500' : isLight ? 'text-zinc-400' : 'text-zinc-600'
                    }`}
                  >
                    <div
                      className={`w-1.5 h-1.5 rounded-full ${
                        hasNumberOrSymbol ? 'bg-emerald-500' : 'bg-zinc-400'
                      }`}
                    />
                    Contains numbers or symbols
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
                  className="w-full mt-2 py-2.5 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-sm transition-colors flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
                >
                  {loading ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <span>Create Account</span>
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
        <span>SENPAY Autonomous Telecom Operations Platform &bull; HashKey Chain Testnet L2</span>
      </footer>
    </div>
  );
}
