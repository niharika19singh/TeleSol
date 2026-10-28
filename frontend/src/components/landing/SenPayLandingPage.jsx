import React, { useState } from 'react';
import {
  ArrowRight, ShieldCheck, Zap, Activity, CheckCircle2,
  ChevronDown, ExternalLink, Play, Lock, AlertTriangle, Layers,
  Sun, Moon
} from 'lucide-react';
import SenPayLogo from '../shared/SenPayLogo';
import HeroOperationsReplay from './HeroOperationsReplay';
import { useTheme } from '../../context/ThemeContext';

export default function SenPayLandingPage({ onLaunchConsole }) {
  const [demoMode, setDemoMode] = useState(true);
  const { theme, toggleTheme, isLight } = useTheme();

  return (
    <div className="min-h-screen bg-senpay-bg text-senpay-text-primary font-sans relative overflow-x-hidden transition-colors duration-150">
      {/* ── Background Grid & Ambient Lighting ── */}
      <div className="absolute inset-0 senpay-grid-pattern opacity-40 pointer-events-none" />
      <div className="absolute top-0 right-1/4 w-[600px] h-[400px] bg-senpay-cyan/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute top-1/3 left-10 w-[500px] h-[500px] bg-senpay-violet/10 rounded-full blur-[160px] pointer-events-none" />

      {/* ── Top Navigation Bar ── */}
      <header className="sticky top-0 z-50 h-16 bg-senpay-bg/90 backdrop-blur-md border-b border-senpay-border/60 px-6 lg:px-12 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center gap-4">
          <SenPayLogo size="default" showSubtitle={true} />
        </div>

        {/* Navigation Links */}
        <nav className="hidden lg:flex items-center gap-6 text-xs font-mono text-senpay-text-secondary">
          <div className="flex items-center gap-1 hover:text-senpay-text-primary cursor-pointer transition-colors">
            <span>Product</span>
            <ChevronDown size={12} className="opacity-70" />
          </div>
          <div className="flex items-center gap-1 hover:text-senpay-text-primary cursor-pointer transition-colors">
            <span>Technology</span>
            <ChevronDown size={12} className="opacity-70" />
          </div>
          <button
            onClick={() => onLaunchConsole('digital_twin')}
            className="hover:text-senpay-text-primary transition-colors"
          >
            Network Digital Twin
          </button>
          <a href="#capabilities" className="hover:text-senpay-text-primary transition-colors">
            Capabilities
          </a>
          <a
            href="https://telesol-sentinel-api.onrender.com/docs"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-senpay-text-primary transition-colors"
          >
            Docs
          </a>
        </nav>

        {/* Right Action Elements */}
        <div className="flex items-center gap-2.5">
          {/* App Status Live */}
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-senpay-panel border border-senpay-green/40 text-[10px] font-mono text-senpay-green font-bold">
            <span className="w-1.5 h-1.5 rounded-full bg-senpay-green animate-pulse" />
            <span>App Status: Active (LIVE)</span>
          </div>

          {/* Theme Switcher Toggle (Light Porcelain / Dark Obsidian) */}
          <button
            onClick={toggleTheme}
            className="p-1.5 px-2 rounded-lg border border-senpay-border bg-senpay-panel hover:bg-senpay-elevated text-senpay-text-secondary hover:text-senpay-text-primary transition flex items-center gap-1.5 text-xs font-mono"
            title={`Switch to ${isLight ? 'Obsidian Dark' : 'Porcelain Light'} theme`}
            aria-label="Toggle theme"
          >
            {isLight ? (
              <Moon size={14} className="text-senpay-cyan" />
            ) : (
              <Sun size={14} className="text-senpay-amber" />
            )}
            <span className="hidden md:inline text-[10px] font-bold uppercase tracking-wider">
              {isLight ? 'Dark' : 'Light'}
            </span>
          </button>

          {/* Demo Mode Toggle */}
          <button
            onClick={() => setDemoMode(!demoMode)}
            className="px-2.5 py-1 rounded-full bg-senpay-amber text-[#0B1118] text-[10px] font-black font-mono uppercase tracking-wider shadow-[0_0_10px_rgba(255,184,0,0.4)] flex items-center gap-1"
          >
            <span>DEMO MODE</span>
          </button>

          {/* Sign In Button */}
          <button
            onClick={() => onLaunchConsole('login')}
            className="py-1.5 px-3 rounded-xl bg-senpay-panel hover:bg-senpay-elevated text-senpay-text-primary border border-senpay-border font-mono font-medium text-xs tracking-wider transition-all"
          >
            Sign In
          </button>

          {/* Launch Console CTA Button */}
          <button
            onClick={() => onLaunchConsole('command_center')}
            className={`py-1.5 px-4 rounded-xl bg-senpay-cyan hover:opacity-90 ${isLight ? 'text-white' : 'text-black'} font-mono font-black text-xs tracking-wider uppercase shadow-[0_0_16px_rgba(0,229,255,0.4)] transition-all transform hover:scale-[1.02] active:scale-[0.98]`}
          >
            Launch Console
          </button>
        </div>
      </header>

      {/* ── Hero Section ── */}
      <section className="relative pt-12 pb-20 px-6 lg:px-12 max-w-[1600px] mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          {/* Left Column: Headline, Copy, CTAs, Partners */}
          <div className="lg:col-span-6 space-y-6">
            {/* Super Header Tagline */}
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-senpay-panel border border-senpay-border text-xs font-mono text-senpay-cyan">
              <span className="w-1.5 h-1.5 rounded-full bg-senpay-cyan animate-pulse" />
              <span>HSK Chain Horizon Hackathon • Agent Payments (HSP) Track</span>
            </div>

            {/* Massive Bold Headline */}
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black font-display text-senpay-text-primary tracking-tight leading-[1.12]">
              THE{' '}
              <span className="relative inline-block text-senpay-cyan">
                AUTONOMOUS PROCUREMENT
                {/* Hand-drawn chalk highlight underline */}
                <svg
                  className="absolute -bottom-2 left-0 w-full h-3 text-senpay-cyan"
                  viewBox="0 0 320 12"
                  fill="none"
                >
                  <path
                    d="M 2,8 Q 80,2 160,7 T 318,5"
                    stroke="currentColor"
                    strokeWidth="3.2"
                    strokeLinecap="round"
                  />
                </svg>
              </span>{' '}
              ENGINE FOR TELECOM RISK &amp; PAYMENTS
            </h1>

            {/* Subtitle */}
            <p className="text-base sm:text-lg text-senpay-text-secondary leading-relaxed max-w-xl">
              Sentinel Network Intelligence meets PayPilot 2.0. Detect risk, simulate
              interventions, and authorize micro-payments on-chain instantly.
            </p>

            {/* Action Buttons */}
            <div className="flex items-center gap-4 flex-wrap pt-2">
              {/* Primary CTA */}
              <button
                onClick={() => onLaunchConsole('command_center')}
                className={`py-3 px-6 rounded-xl bg-senpay-cyan hover:opacity-90 ${isLight ? 'text-white' : 'text-black'} font-mono font-black text-sm tracking-wider uppercase shadow-[0_0_24px_rgba(0,229,255,0.4)] transition-all transform hover:scale-[1.02] active:scale-[0.98]`}
              >
                Get Started Now
              </button>

              {/* Secondary CTA */}
              <button
                onClick={() => onLaunchConsole('operations')}
                className="flex items-center gap-2 text-senpay-text-primary hover:text-senpay-cyan font-mono text-sm font-semibold transition-colors group"
              >
                <span>Explore Interactive Demo</span>
                <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
              </button>
            </div>

            {/* Trusted by modern telcos */}
            <div className="pt-8 border-t border-senpay-border/60 space-y-3">
              <span className="text-[11px] font-mono text-senpay-text-muted uppercase tracking-wider block">
                Trusted by modern telcos &amp; decentralized networks
              </span>
              <div className="flex items-center gap-8 text-senpay-text-secondary">
                {/* Velo */}
                <div className="flex items-center gap-2 font-display font-bold text-sm tracking-wide hover:text-senpay-text-primary transition-colors">
                  <span className="text-senpay-red font-black">V</span>
                  <span>Velo</span>
                </div>

                {/* Apex */}
                <div className="flex items-center gap-2 font-display font-bold text-sm tracking-wide hover:text-senpay-text-primary transition-colors">
                  <span className="text-senpay-cyan font-black">▲</span>
                  <span>Apex</span>
                </div>

                {/* Alt-Net */}
                <div className="flex items-center gap-2 font-display font-bold text-sm tracking-wide hover:text-senpay-text-primary transition-colors">
                  <span className="text-senpay-green font-black">☰</span>
                  <span>Alt-Net</span>
                </div>

                {/* HSK */}
                <div className="flex items-center gap-2 font-display font-bold text-sm tracking-wide hover:text-senpay-text-primary transition-colors">
                  <span className="text-senpay-violet font-black">◆</span>
                  <span>HSK</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Grounded Operational Decision Replay */}
          <div className="lg:col-span-6 relative flex items-center justify-center min-h-[460px]">
            <HeroOperationsReplay onLaunchConsole={onLaunchConsole} />
          </div>
        </div>
      </section>

      {/* ── Capability Cards Section (Matching Reference 3 Bottom Row) ── */}
      <section id="capabilities" className="py-16 px-6 lg:px-12 max-w-[1600px] mx-auto border-t border-senpay-border/60">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1: Sentinel Intelligence */}
          <div
            onClick={() => onLaunchConsole('command_center')}
            className="senpay-card p-6 flex flex-col justify-between hover:border-senpay-cyan/50 transition-all cursor-pointer group"
          >
            <div>
              <div className="text-[9px] font-mono text-senpay-text-muted uppercase tracking-wider mb-1">
                How It Works
              </div>
              <div className="text-[10px] font-mono text-senpay-cyan mb-3">
                DETECT → ANALYZE → SIMULATE → SELECT → AUTHORIZE → PROCURE → LEARN
              </div>
              <h3 className="text-xl font-bold font-display text-senpay-text-primary mb-2 group-hover:text-senpay-cyan transition-colors">
                Sentinel Intelligence
              </h3>
              <p className="text-xs text-senpay-text-secondary leading-relaxed mb-6">
                Digital twin simulation, telemetry ingestion, and Congestion Risk tracking.
              </p>
            </div>

            {/* Embedded Mini Widget: Wave curve with CRS */}
            <div className="p-3 rounded-xl bg-senpay-panel border border-senpay-border flex items-center justify-between">
              <span className="px-2 py-0.5 rounded bg-senpay-elevated text-[10px] font-mono text-senpay-cyan font-bold">
                CRS
              </span>
              <svg className="w-28 h-6" viewBox="0 0 100 20" fill="none">
                <path d="M 0,15 Q 25,2 50,12 T 100,5" stroke="#00E5FF" strokeWidth="2" fill="none" />
                <circle cx="50" cy="12" r="3" fill="#FFB800" />
                <circle cx="100" cy="5" r="3" fill="#00FF88" />
              </svg>
            </div>
          </div>

          {/* Card 2: PayPilot Payments */}
          <div
            onClick={() => onLaunchConsole('delegations')}
            className="senpay-card p-6 flex flex-col justify-between hover:border-senpay-amber/50 transition-all cursor-pointer group"
          >
            <div>
              <div className="text-[9px] font-mono text-senpay-text-muted uppercase tracking-wider mb-1">
                How It Works
              </div>
              <div className="text-[10px] font-mono text-senpay-amber mb-3">
                DETECT → ANALYZE → SIMULATE → SELECT → AUTHORIZE → PROCURE → LEARN
              </div>
              <h3 className="text-xl font-bold font-display text-senpay-text-primary mb-2 group-hover:text-senpay-amber transition-colors">
                PayPilot Payments
              </h3>
              <p className="text-xs text-senpay-text-secondary leading-relaxed mb-6">
                On-chain escrow, atomic budget reservations, and policy ceilings.
              </p>
            </div>

            {/* Embedded Mini Widget: Wallet delegation pill */}
            <div className="p-3 rounded-xl bg-senpay-panel border border-senpay-border flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="px-2 py-0.5 rounded bg-senpay-elevated border border-senpay-teal text-[10px] font-mono font-bold text-senpay-teal">
                  WEST_REG_AGT
                </div>
                <CheckCircle2 size={13} className="text-senpay-green" />
              </div>
              <div className="w-7 h-4 rounded-full bg-senpay-teal relative">
                <div className="w-3 h-3 rounded-full bg-white absolute top-0.5 right-0.5" />
              </div>
            </div>
          </div>

          {/* Card 3: Verified Outcomes */}
          <div
            onClick={() => onLaunchConsole('operations')}
            className="senpay-card p-6 flex flex-col justify-between hover:border-senpay-green/50 transition-all cursor-pointer group"
          >
            <div>
              <div className="text-[9px] font-mono text-senpay-text-muted uppercase tracking-wider mb-1">
                How It Works
              </div>
              <div className="text-[10px] font-mono text-senpay-green mb-3">
                DETECT → ANALYZE → SIMULATE → SELECT → AUTHORIZE → PROCURE → LEARN
              </div>
              <h3 className="text-xl font-bold font-display text-senpay-text-primary mb-2 group-hover:text-senpay-green transition-colors">
                Verified Outcomes
              </h3>
              <p className="text-xs text-senpay-text-secondary leading-relaxed mb-6">
                Distinct payment settlement and outcome validation from live telemetry.
              </p>
            </div>

            {/* Embedded Mini Widget: Outcome Badges */}
            <div className="p-3 rounded-xl bg-senpay-panel border border-senpay-border flex items-center justify-between gap-2">
              <div className="flex items-center gap-1 text-[10px] font-mono text-senpay-green font-bold">
                <CheckCircle2 size={12} />
                <span>Escrow Released</span>
              </div>
              <div className="flex items-center gap-1 text-[10px] font-mono text-senpay-green font-bold">
                <CheckCircle2 size={12} />
                <span>Intervention Successful</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="py-8 px-6 lg:px-12 border-t border-senpay-border/40 text-xs font-mono text-senpay-text-muted flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <SenPayLogo size="small" />
          <span>• TeleSol Sentinel + PayPilot 2.0</span>
        </div>
        <div>
          <span>Built for the HSK Chain Horizon Hackathon • HSP Track</span>
        </div>
      </footer>
    </div>
  );
}
