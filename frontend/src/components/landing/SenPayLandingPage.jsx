import React, { useState } from 'react';
import {
  ArrowRight, ShieldCheck, Zap, Activity, CheckCircle2,
  ChevronDown, ExternalLink, Play, Lock, AlertTriangle, Layers
} from 'lucide-react';
import SenPayLogo from '../shared/SenPayLogo';

export default function SenPayLandingPage({ onLaunchConsole }) {
  const [demoMode, setDemoMode] = useState(true);

  return (
    <div className="min-h-screen bg-[#0B1118] text-[#F1F5F9] font-sans relative overflow-x-hidden">
      {/* ── Background Grid & Ambient Lighting ── */}
      <div className="absolute inset-0 senpay-grid-pattern opacity-40 pointer-events-none" />
      <div className="absolute top-0 right-1/4 w-[600px] h-[400px] bg-senpay-cyan/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute top-1/3 left-10 w-[500px] h-[500px] bg-senpay-violet/10 rounded-full blur-[160px] pointer-events-none" />

      {/* ── Top Navigation Bar ── */}
      <header className="sticky top-0 z-50 h-16 bg-[#0B1118]/90 backdrop-blur-md border-b border-senpay-border/60 px-6 lg:px-12 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center gap-4">
          <SenPayLogo size="default" showSubtitle={true} />
        </div>

        {/* Navigation Links */}
        <nav className="hidden lg:flex items-center gap-6 text-xs font-mono text-senpay-text-secondary">
          <div className="flex items-center gap-1 hover:text-white cursor-pointer transition-colors">
            <span>Product</span>
            <ChevronDown size={12} className="opacity-70" />
          </div>
          <div className="flex items-center gap-1 hover:text-white cursor-pointer transition-colors">
            <span>Technology</span>
            <ChevronDown size={12} className="opacity-70" />
          </div>
          <button
            onClick={() => onLaunchConsole('digital_twin')}
            className="hover:text-white transition-colors"
          >
            Network Digital Twin
          </button>
          <a href="#capabilities" className="hover:text-white transition-colors">
            Capabilities
          </a>
          <a
            href="https://telesol-sentinel-api.onrender.com/docs"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-white transition-colors"
          >
            Docs
          </a>
        </nav>

        {/* Right Action Elements */}
        <div className="flex items-center gap-3">
          {/* App Status Live */}
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#0A1A17] border border-senpay-green/40 text-[10px] font-mono text-senpay-green font-bold">
            <span className="w-1.5 h-1.5 rounded-full bg-senpay-green animate-pulse" />
            <span>App Status: Active (LIVE)</span>
          </div>

          {/* Demo Mode Toggle */}
          <button
            onClick={() => setDemoMode(!demoMode)}
            className="px-2.5 py-1 rounded-full bg-senpay-amber text-[#0B1118] text-[10px] font-black font-mono uppercase tracking-wider shadow-[0_0_10px_rgba(255,184,0,0.5)] flex items-center gap-1"
          >
            <span>DEMO MODE</span>
          </button>

          {/* Launch Console CTA Button */}
          <button
            onClick={() => onLaunchConsole('command_center')}
            className="py-1.5 px-4 rounded-xl bg-senpay-cyan hover:bg-[#33EAFF] text-[#0B1118] font-mono font-black text-xs tracking-wider uppercase shadow-[0_0_16px_rgba(0,229,255,0.6)] transition-all transform hover:scale-[1.02] active:scale-[0.98]"
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
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#151F2A] border border-senpay-border text-xs font-mono text-senpay-cyan">
              <span className="w-1.5 h-1.5 rounded-full bg-senpay-cyan animate-pulse" />
              <span>HSK Chain Horizon Hackathon • Agent Payments (HSP) Track</span>
            </div>

            {/* Massive Bold Headline */}
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black font-display text-white tracking-tight leading-[1.12]">
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
                className="py-3 px-6 rounded-xl bg-senpay-cyan hover:bg-[#33EAFF] text-[#0B1118] font-mono font-black text-sm tracking-wider uppercase shadow-[0_0_24px_rgba(0,229,255,0.6)] transition-all transform hover:scale-[1.02] active:scale-[0.98]"
              >
                Get Started Now
              </button>

              {/* Secondary CTA */}
              <button
                onClick={() => onLaunchConsole('operations')}
                className="flex items-center gap-2 text-white hover:text-senpay-cyan font-mono text-sm font-semibold transition-colors group"
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
                <div className="flex items-center gap-2 font-display font-bold text-sm tracking-wide hover:text-white transition-colors">
                  <span className="text-senpay-red font-black">V</span>
                  <span>Velo</span>
                </div>

                {/* Apex */}
                <div className="flex items-center gap-2 font-display font-bold text-sm tracking-wide hover:text-white transition-colors">
                  <span className="text-senpay-cyan font-black">▲</span>
                  <span>Apex</span>
                </div>

                {/* Alt-Net */}
                <div className="flex items-center gap-2 font-display font-bold text-sm tracking-wide hover:text-white transition-colors">
                  <span className="text-senpay-green font-black">☰</span>
                  <span>Alt-Net</span>
                </div>

                {/* HSK */}
                <div className="flex items-center gap-2 font-display font-bold text-sm tracking-wide hover:text-white transition-colors">
                  <span className="text-senpay-violet font-black">◆</span>
                  <span>HSK</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Isometric 3D Telecom Risk Stage */}
          <div className="lg:col-span-6 relative flex items-center justify-center min-h-[480px]">
            {/* Isometric Grid Container */}
            <div className="relative w-full max-w-[560px] h-[440px] rounded-2xl bg-[#101821] border border-senpay-border/80 shadow-[0_20px_50px_rgba(0,0,0,0.6)] p-4 overflow-hidden">
              {/* Circuit Grid Background */}
              <div className="absolute inset-0 senpay-circuit-pattern opacity-30 pointer-events-none" />

              {/* 3D Glass Stage Silhouette */}
              <svg className="w-full h-full" viewBox="0 0 520 380" fill="none">
                <defs>
                  <linearGradient id="planeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#1B293A" stopOpacity="0.8" />
                    <stop offset="100%" stopColor="#0D1622" stopOpacity="0.9" />
                  </linearGradient>
                  <linearGradient id="fiberGlow" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#00E5FF" />
                    <stop offset="50%" stopColor="#FFB800" />
                    <stop offset="100%" stopColor="#00FF88" />
                  </linearGradient>
                </defs>

                {/* Isometric Platform Plate */}
                <polygon
                  points="260,40 480,140 260,330 40,230"
                  fill="url(#planeGrad)"
                  stroke="#1E3247"
                  strokeWidth="1.8"
                />

                {/* Internal Network Grid Lines on Platform */}
                <path d="M 150,135 L 370,235" stroke="#1A2D40" strokeWidth="1" strokeDasharray="3 3" />
                <path d="M 260,85 L 150,285" stroke="#1A2D40" strokeWidth="1" strokeDasharray="3 3" />
                <path d="M 370,135 L 260,285" stroke="#1A2D40" strokeWidth="1" strokeDasharray="3 3" />

                {/* Glowing Fiber optic curves */}
                <path
                  d="M 120,180 Q 200,120 260,190 T 380,210"
                  fill="none"
                  stroke="url(#fiberGlow)"
                  strokeWidth="3.2"
                  strokeLinecap="round"
                  className="drop-shadow-[0_0_12px_rgba(0,229,255,0.8)]"
                />

                {/* Concentric Hotspot Rings on Stage */}
                <circle cx="260" cy="190" r="32" fill="none" stroke="#FF3B5C" strokeWidth="1.2" opacity="0.4" className="hotspot-ring-3" />
                <circle cx="260" cy="190" r="20" fill="none" stroke="#FFB800" strokeWidth="1.4" opacity="0.6" className="hotspot-ring-2" />
                <circle cx="260" cy="190" r="8" fill="#FF3B5C" className="drop-shadow-[0_0_10px_#FF3B5C]" />

                {/* Wireless waves */}
                <path d="M 275,185 A 10,10 0 0,1 275,195" fill="none" stroke="#A855F7" strokeWidth="1.5" />
                <path d="M 280,182 A 16,16 0 0,1 280,198" fill="none" stroke="#A855F7" strokeWidth="1.5" opacity="0.7" />

                {/* Network Nodes */}
                <circle cx="120" cy="180" r="5" fill="#00E5FF" />
                <circle cx="380" cy="210" r="5" fill="#00FF88" />
              </svg>

              {/* Node Tags */}
              <div className="absolute top-[160px] left-[70px] z-20 px-2 py-0.5 rounded-full bg-[#271E0B] border border-senpay-amber text-[9px] font-mono font-bold text-senpay-amber">
                SFO-01
              </div>
              <div className="absolute top-[120px] left-[175px] z-20 px-2 py-0.5 rounded-full bg-[#0C2433] border border-senpay-cyan text-[9px] font-mono font-bold text-senpay-cyan">
                OAK-03
              </div>

              {/* Hand-Drawn Style Annotations */}
              {/* 1. DETECT CONGESTION (Red) */}
              <div className="absolute bottom-[110px] left-6 text-senpay-red font-mono text-[11px] font-black flex items-center gap-1.5 drop-shadow">
                <AlertTriangle size={13} />
                <span>DETECT CONGESTION</span>
              </div>

              {/* 2. SIMULATE INTERVENTIONS (Cyan Spiral) */}
              <div className="absolute bottom-6 left-28 text-senpay-cyan font-mono text-[11px] font-black flex items-center gap-1 drop-shadow">
                <span className="text-base font-bold">◎</span>
                <span>SIMULATE INTERVENTIONS</span>
              </div>

              {/* 3. AUTHORIZE & SETTLE (Green) */}
              <div className="absolute bottom-6 right-10 text-senpay-green font-mono text-[11px] font-black flex items-center gap-1.5 drop-shadow">
                <CheckCircle2 size={14} />
                <span>AUTHORIZE &amp; SETTLE</span>
              </div>

              {/* Floating Floating 3D Dark Glass Console Card */}
              <div className="absolute top-6 right-6 w-52 p-3 rounded-xl bg-[#151F2A]/90 backdrop-blur-md border border-senpay-border shadow-[0_12px_32px_rgba(0,0,0,0.7)] text-xs font-mono space-y-2">
                <div className="flex items-center justify-between pb-1.5 border-b border-senpay-border">
                  <span className="text-[10px] text-senpay-text-muted">Active Incident</span>
                  <span className="px-1.5 py-0.2 rounded bg-senpay-green/20 text-senpay-green text-[9px] font-bold">
                    ATOMIC BUDGET
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-senpay-text-secondary text-[11px]">Mitigation</span>
                  <span className="text-white font-bold">SkyLink 5G</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-senpay-text-secondary text-[11px]">Dispatched</span>
                  <span className="text-senpay-cyan font-bold">$12,500</span>
                </div>
              </div>

              {/* Floating CRS 78/100 Card */}
              <div className="absolute top-10 left-8 px-3 py-2 rounded-xl bg-[#111A24]/90 backdrop-blur-md border border-senpay-cyan/40 shadow-[0_8px_24px_rgba(0,229,255,0.2)]">
                <div className="text-[9px] font-mono text-senpay-text-muted">Congestion Risk Score</div>
                <div className="text-xl font-black font-display text-white">
                  78<span className="text-xs font-mono text-senpay-cyan">/100</span>
                </div>
              </div>
            </div>
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
              <h3 className="text-xl font-bold font-display text-white mb-2 group-hover:text-senpay-cyan transition-colors">
                Sentinel Intelligence
              </h3>
              <p className="text-xs text-senpay-text-secondary leading-relaxed mb-6">
                Digital twin simulation, telemetry ingestion, and Congestion Risk tracking.
              </p>
            </div>

            {/* Embedded Mini Widget: Wave curve with CRS */}
            <div className="p-3 rounded-xl bg-[#0E1520] border border-senpay-border flex items-center justify-between">
              <span className="px-2 py-0.5 rounded bg-senpay-panel text-[10px] font-mono text-senpay-cyan font-bold">
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
              <h3 className="text-xl font-bold font-display text-white mb-2 group-hover:text-senpay-amber transition-colors">
                PayPilot Payments
              </h3>
              <p className="text-xs text-senpay-text-secondary leading-relaxed mb-6">
                On-chain escrow, atomic budget reservations, and policy ceilings.
              </p>
            </div>

            {/* Embedded Mini Widget: Wallet delegation pill */}
            <div className="p-3 rounded-xl bg-[#0E1520] border border-senpay-border flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="px-2 py-0.5 rounded bg-[#10292B] border border-senpay-teal text-[10px] font-mono font-bold text-senpay-teal">
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
              <h3 className="text-xl font-bold font-display text-white mb-2 group-hover:text-senpay-green transition-colors">
                Verified Outcomes
              </h3>
              <p className="text-xs text-senpay-text-secondary leading-relaxed mb-6">
                Distinct payment settlement and outcome validation from live telemetry.
              </p>
            </div>

            {/* Embedded Mini Widget: Outcome Badges */}
            <div className="p-3 rounded-xl bg-[#0E1520] border border-senpay-border flex items-center justify-between gap-2">
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
