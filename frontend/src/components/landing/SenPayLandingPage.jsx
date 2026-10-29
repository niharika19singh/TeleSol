import React from 'react';
import {
  ArrowRight, ShieldCheck, Zap, Activity, CheckCircle2,
  Layers, Sun, Moon, Network, Scale, FileCheck2, Lock,
  AlertTriangle, Sparkles, PackageCheck, History, Building2, CreditCard
} from 'lucide-react';
import SenPayLogo from '../shared/SenPayLogo';
import HeroOperationsReplay from './HeroOperationsReplay';
import { useTheme } from '../../context/ThemeContext';

const HOW_IT_WORKS_STAGES = [
  {
    step: '01',
    id: 'incident-detection',
    title: 'Incident Detection',
    tag: 'AUTOMATED TELEMETRY',
    summary: 'Continuous RF & sector ingestion monitors RSRP, packet loss, queue latency, and spatial density across cellular corridors.',
    artifact: 'Trigger: Congestion Risk Score (CRS) > 65.0 SLA threshold',
    accent: 'text-senpay-red border-senpay-red/40 bg-senpay-red/10',
  },
  {
    step: '02',
    id: 'risk-assessment',
    title: 'Risk Assessment',
    tag: 'SIMULATION & FORECAST',
    summary: 'Digital twin and ML inference project unmitigated congestion trajectories and localize bottlenecked base-station paths.',
    artifact: 'Output: 15-minute breach horizon & counterfactual baseline',
    accent: 'text-senpay-amber border-senpay-amber/40 bg-senpay-amber/10',
  },
  {
    step: '03',
    id: 'intervention-optimization',
    title: 'Intervention Optimization',
    tag: 'MULTI-CRITERIA RANKING',
    summary: 'Evaluates candidate interventions (passive monitoring, local QoS shaping, on-demand 5G slice, edge compute) by predicted CRS drop vs. HSK cost.',
    artifact: 'Output: Ranked provider recommendation & expected SLA impact',
    accent: 'text-senpay-cyan border-senpay-cyan/40 bg-senpay-cyan/10',
  },
  {
    step: '04',
    id: 'policy-validation',
    title: 'Policy Validation',
    tag: 'DETERMINISTIC GUARDRAILS',
    summary: 'Enforces 11 non-negotiable pre-execution safety checks against delegation budgets, per-transaction ceilings, and whitelisted providers.',
    artifact: 'Output: RFC 8785 canonical agreement hash & escrow mandate',
    accent: 'text-senpay-violet border-senpay-violet/40 bg-senpay-violet/10',
  },
  {
    step: '05',
    id: 'settlement-eligibility',
    title: 'Settlement Eligibility',
    tag: 'VERIFIED OUTCOME',
    summary: 'Compares post-intervention telemetry against counterfactual baselines. Escrow is eligible for release only when SLA restoration is verified.',
    artifact: 'Output: Signed evidence bundle & SHA-256 audit chain record',
    accent: 'text-senpay-green border-senpay-green/40 bg-senpay-green/10',
  },
];

const CAPABILITY_MODULES = [
  {
    id: 'command_center',
    title: 'Telecom Operations Command Center',
    category: 'OVERVIEW & SITUATIONAL AWARENESS',
    description: 'Unified NOC console combining active incident flight-strips, 8-stage procurement workflow, live CRS radar, and provider comparison tables.',
    icon: Activity,
    badge: 'Primary Console',
  },
  {
    id: 'digital_twin',
    title: 'Network Digital Twin & Spatial RF',
    category: 'INTELLIGENCE & TOPOLOGY',
    description: 'Interactive 2D schematic and geographic sector topology mapping macro gateways, base stations, congested corridors, and active 5G slices.',
    icon: Network,
    badge: 'Spatial View',
  },
  {
    id: 'optimizer',
    title: 'Intervention Optimizer & Counterfactuals',
    category: 'SIMULATION ENGINE',
    description: 'Test crowd density surges, exit blockages, and counterfactual SLA evaluations to compare unmitigated baselines against active interventions.',
    icon: Scale,
    badge: 'Interactive Simulator',
  },
  {
    id: 'agreements',
    title: 'Canonical SLA Service Agreements',
    category: 'AUTONOMOUS PROCUREMENT',
    description: 'Draft and inspect RFC 8785 canonical JSON service contracts with deterministic SHA-256 tamper checks and deliverable verification criteria.',
    icon: FileCheck2,
    badge: 'RFC 8785 Anchored',
  },
  {
    id: 'safety',
    title: '11-Rule Payment Safety Simulator',
    category: 'POLICY & ESCROW SAFETY',
    description: 'Dry-run pre-execution policy engine validating per-transaction limits, cumulative daily budgets, provider trust tiers, and replay guards.',
    icon: ShieldCheck,
    badge: '11 Safety Rules',
  },
  {
    id: 'operations',
    title: 'Payment Operations & Audit Trail',
    category: 'SETTLEMENT & PROVENANCE',
    description: 'Time-locked escrow tracking, post-intervention telemetry verification, 8-point evidence bundles, dispute handling, and SHA-256 hash-chained logs.',
    icon: PackageCheck,
    badge: 'Verifiable Records',
  },
];

export default function SenPayLandingPage({ onLaunchConsole }) {
  const { isLight, toggleTheme } = useTheme();

  const handleScrollToSection = (sectionId) => {
    if (typeof document !== 'undefined') {
      const el = document.getElementById(sectionId);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  };

  return (
    <div className="min-h-screen bg-senpay-bg text-senpay-text-primary font-sans relative overflow-x-hidden transition-colors duration-150 select-text">
      {/* ── Background Grid & Restrained Ambient Lighting ── */}
      <div className="absolute inset-0 senpay-grid-pattern opacity-40 pointer-events-none" />
      <div className="absolute top-0 right-1/4 w-[560px] h-[360px] bg-senpay-cyan/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute top-1/3 left-10 w-[460px] h-[460px] bg-senpay-violet/10 rounded-full blur-[160px] pointer-events-none" />

      {/* ── Sticky Header Navigation ── */}
      <header className="sticky top-0 z-50 h-16 bg-senpay-bg/90 backdrop-blur-md border-b border-senpay-border/60 px-6 lg:px-12 flex items-center justify-between">
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="flex items-center gap-3 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-senpay-cyan rounded-lg"
          aria-label="SENPAY Home"
        >
          <SenPayLogo size="default" showSubtitle={true} />
        </button>

        {/* Section Navigation Links */}
        <nav aria-label="Landing page sections" className="hidden lg:flex items-center gap-6 text-xs font-mono text-senpay-text-secondary">
          <button
            onClick={() => handleScrollToSection('problem')}
            className="hover:text-senpay-text-primary transition-colors focus:outline-none focus-visible:text-senpay-cyan"
          >
            The Problem
          </button>
          <button
            onClick={() => handleScrollToSection('approach')}
            className="hover:text-senpay-text-primary transition-colors focus:outline-none focus-visible:text-senpay-cyan"
          >
            SENPAY Approach
          </button>
          <button
            onClick={() => handleScrollToSection('how-it-works')}
            className="hover:text-senpay-text-primary transition-colors focus:outline-none focus-visible:text-senpay-cyan"
          >
            How It Works
          </button>
          <button
            onClick={() => handleScrollToSection('auditability')}
            className="hover:text-senpay-text-primary transition-colors focus:outline-none focus-visible:text-senpay-cyan"
          >
            Auditability
          </button>
          <button
            onClick={() => handleScrollToSection('capabilities')}
            className="hover:text-senpay-text-primary transition-colors focus:outline-none focus-visible:text-senpay-cyan"
          >
            Capabilities
          </button>
        </nav>

        {/* Right Actions: Theme Switcher & Immediate Demo CTA */}
        <div className="flex items-center gap-3">
          <button
            onClick={toggleTheme}
            className="p-1.5 px-2.5 rounded-lg border border-senpay-border bg-senpay-panel hover:bg-senpay-elevated text-senpay-text-secondary hover:text-senpay-text-primary transition flex items-center gap-1.5 text-xs font-mono focus:outline-none focus-visible:ring-2 focus-visible:ring-senpay-cyan"
            title={`Switch to ${isLight ? 'Obsidian Dark' : 'Porcelain Light'} theme`}
            aria-label="Toggle theme"
          >
            {isLight ? (
              <Moon size={14} className="text-senpay-cyan" />
            ) : (
              <Sun size={14} className="text-senpay-amber" />
            )}
            <span className="hidden sm:inline text-[10px] font-bold uppercase tracking-wider">
              {isLight ? 'Dark' : 'Light'}
            </span>
          </button>

          <button
            onClick={() => onLaunchConsole('demo')}
            data-testid="header-launch-demo-btn"
            className={`py-2 px-4 rounded-xl bg-senpay-cyan hover:opacity-90 ${
              isLight ? 'text-white' : 'text-black'
            } font-mono font-black text-xs tracking-wider uppercase shadow-[0_0_16px_rgba(0,229,255,0.3)] transition-all hover-elevate flex items-center gap-1.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-senpay-cyan`}
          >
            <span>Launch Interactive Demo</span>
            <ArrowRight size={14} />
          </button>
        </div>
      </header>

      {/* ── 1. HERO SECTION ── */}
      <section className="relative pt-12 pb-20 px-6 lg:px-12 max-w-[1600px] mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          {/* Left Column: Brand Value Proposition & Direct Demo CTAs */}
          <div className="lg:col-span-6 space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-senpay-panel border border-senpay-border text-xs font-mono text-senpay-cyan">
              <span className="w-1.5 h-1.5 rounded-full bg-senpay-cyan animate-pulse" />
              <span>TeleSol Sentinel + PayPilot 2.0 • HashKey Chain (Chain ID 133)</span>
            </div>

            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black font-display text-senpay-text-primary tracking-tight leading-[1.12]">
              RISK-AWARE{' '}
              <span className="text-senpay-cyan">
                AUTONOMOUS TELECOM OPERATIONS
              </span>{' '}
              &amp; VERIFIABLE SETTLEMENT
            </h1>

            <p className="text-base sm:text-lg text-senpay-text-secondary leading-relaxed max-w-xl">
              SENPAY connects real-time cellular congestion detection with deterministic
              procurement guardrails and outcome-gated escrow settlement. Detect sector
              degradation, simulate counterfactual interventions, validate spending policies,
              and verify SLA restoration before funds settle.
            </p>

            {/* Primary & Secondary CTAs (Zero Login Friction) */}
            <div className="flex items-center gap-4 flex-wrap pt-2">
              <button
                onClick={() => onLaunchConsole('demo')}
                data-testid="hero-launch-demo-btn"
                className={`py-3.5 px-6 rounded-xl bg-senpay-cyan hover:opacity-90 ${
                  isLight ? 'text-white' : 'text-black'
                } font-mono font-black text-sm tracking-wider uppercase shadow-[0_0_24px_rgba(0,229,255,0.35)] transition-all hover-elevate flex items-center gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-senpay-cyan`}
              >
                <span>Launch Interactive Demo &rarr;</span>
              </button>

              <button
                onClick={() => handleScrollToSection('how-it-works')}
                data-testid="hero-explore-workflow-btn"
                className="py-3.5 px-5 rounded-xl bg-senpay-panel hover:bg-senpay-elevated border border-senpay-border text-senpay-text-primary hover:border-senpay-cyan/50 font-mono text-sm font-semibold transition-all flex items-center gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-senpay-cyan"
              >
                <span>Explore How SENPAY Works</span>
              </button>
            </div>

            {/* Instant Access Reassurance Pill */}
            <div className="pt-4 border-t border-senpay-border/60 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs font-mono text-senpay-text-secondary">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 size={14} className="text-senpay-green" />
                <span>No login or credentials required</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 size={14} className="text-senpay-cyan" />
                <span>Interactive simulations &amp; live NOC topology</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 size={14} className="text-senpay-amber" />
                <span>Safe sandbox (zero real financial mutations)</span>
              </div>
            </div>
          </div>

          {/* Right Column: Interactive Operational Decision Replay */}
          <div className="lg:col-span-6 relative flex items-center justify-center min-h-[460px]">
            <HeroOperationsReplay onLaunchConsole={() => onLaunchConsole('demo')} />
          </div>
        </div>
      </section>

      {/* ── 2. THE PROBLEM: FRAGMENTED TELECOM OPERATIONS & SETTLEMENT ── */}
      <section
        id="problem"
        className="py-16 px-6 lg:px-12 max-w-[1600px] mx-auto border-t border-senpay-border/60"
      >
        <div className="max-w-3xl mb-10">
          <div className="text-xs font-mono text-senpay-red uppercase tracking-wider font-bold mb-2">
            01 • THE OPERATIONAL CHALLENGE
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold font-display text-senpay-text-primary tracking-tight">
            Why Telecom Incident Response and Vendor Settlement Break Down
          </h2>
          <p className="text-sm sm:text-base text-senpay-text-secondary mt-2 leading-relaxed">
            Modern multi-vendor cellular networks face dynamic congestion surges, but network
            operations centers (NOCs) and financial settlement workflows operate in disconnected silos.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="senpay-card p-6 space-y-3">
            <div className="w-9 h-9 rounded-lg bg-senpay-red/15 border border-senpay-red/30 text-senpay-red flex items-center justify-center">
              <AlertTriangle size={18} />
            </div>
            <h3 className="text-base font-bold font-display text-senpay-text-primary">
              Slow Manual Escalation During Congestion
            </h3>
            <p className="text-xs sm:text-sm text-senpay-text-secondary leading-relaxed">
              When a corridor experiences a sudden RSRP drop or packet-loss spike, manual capacity
              procurement across wholesale bandwidth providers takes hours—long after the SLA breach has occurred.
            </p>
          </div>

          <div className="senpay-card p-6 space-y-3">
            <div className="w-9 h-9 rounded-lg bg-senpay-amber/15 border border-senpay-amber/30 text-senpay-amber flex items-center justify-center">
              <Lock size={18} />
            </div>
            <h3 className="text-base font-bold font-display text-senpay-text-primary">
              Unbounded Agent Spending Risks
            </h3>
            <p className="text-xs sm:text-sm text-senpay-text-secondary leading-relaxed">
              Giving autonomous software agents direct wallet access without deterministic policy ceilings,
              counterparty allowlists, and atomic budget reservations creates unacceptable financial exposure.
            </p>
          </div>

          <div className="senpay-card p-6 space-y-3">
            <div className="w-9 h-9 rounded-lg bg-senpay-violet/15 border border-senpay-violet/30 text-senpay-violet flex items-center justify-center">
              <Scale size={18} />
            </div>
            <h3 className="text-base font-bold font-display text-senpay-text-primary">
              Settlement Without Verified SLA Outcomes
            </h3>
            <p className="text-xs sm:text-sm text-senpay-text-secondary leading-relaxed">
              Traditional telecom billing pays for provisioned capacity regardless of whether post-intervention
              telemetry actually restored latency, packet delivery, and Congestion Risk Scores (CRS).
            </p>
          </div>
        </div>
      </section>

      {/* ── 3. THE SENPAY APPROACH: RISK-AWARE DECISION-MAKING & VERIFIED OUTCOMES ── */}
      <section
        id="approach"
        className="py-16 px-6 lg:px-12 max-w-[1600px] mx-auto border-t border-senpay-border/60"
      >
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-5 space-y-4">
            <div className="text-xs font-mono text-senpay-cyan uppercase tracking-wider font-bold">
              02 • THE SENPAY ARCHITECTURE
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold font-display text-senpay-text-primary tracking-tight">
              Separating Automated Analysis, Dry-Run Simulation, and Verified Settlement
            </h2>
            <p className="text-sm sm:text-base text-senpay-text-secondary leading-relaxed">
              SENPAY never conflates AI recommendations with financial execution. Every operational
              stage maintains strict provenance between what is observed, what is simulated, and what
              is cryptographically verified.
            </p>
            <div className="pt-2">
              <button
                onClick={() => onLaunchConsole('command_center')}
                className="px-4 py-2.5 rounded-xl bg-senpay-panel hover:bg-senpay-elevated border border-senpay-cyan/40 text-senpay-cyan font-mono font-bold text-xs uppercase tracking-wider inline-flex items-center gap-2 transition"
              >
                <span>Inspect Command Center Architecture</span>
                <ArrowRight size={14} />
              </button>
            </div>
          </div>

          <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Pillar 1: Automated Decisions */}
            <div className="senpay-card p-5 border-t-2 border-t-senpay-cyan flex flex-col justify-between space-y-4">
              <div className="space-y-2">
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-senpay-cyan/15 text-senpay-cyan font-bold uppercase">
                  1. Automated Decisions
                </span>
                <h3 className="text-sm font-bold font-display text-senpay-text-primary">
                  Telemetry Scoring &amp; Candidate Ranking
                </h3>
                <p className="text-xs text-senpay-text-secondary leading-relaxed">
                  Sentinel continuously computes Congestion Risk Scores (CRS) and ranks candidate providers
                  by cost-per-CRS reduction, halting at the authorization boundary.
                </p>
              </div>
              <div className="text-[10px] font-mono text-senpay-text-muted pt-2 border-t border-senpay-border/60">
                Engine: Intervention Optimizer &amp; RF-GB Inference
              </div>
            </div>

            {/* Pillar 2: Simulations */}
            <div className="senpay-card p-5 border-t-2 border-t-senpay-amber flex flex-col justify-between space-y-4">
              <div className="space-y-2">
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-senpay-amber/15 text-senpay-amber font-bold uppercase">
                  2. Safe Simulations
                </span>
                <h3 className="text-sm font-bold font-display text-senpay-text-primary">
                  Counterfactual &amp; 11-Rule Policy Previews
                </h3>
                <p className="text-xs text-senpay-text-secondary leading-relaxed">
                  Operators test hypothetical surge scenarios and dry-run 11 deterministic spending policy
                  rules without broadcasting transactions or mutating state.
                </p>
              </div>
              <div className="text-[10px] font-mono text-senpay-text-muted pt-2 border-t border-senpay-border/60">
                Engine: Digital Twin &amp; Pre-Execution Safety Simulator
              </div>
            </div>

            {/* Pillar 3: Verified Outcomes */}
            <div className="senpay-card p-5 border-t-2 border-t-senpay-green flex flex-col justify-between space-y-4">
              <div className="space-y-2">
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-senpay-green/15 text-senpay-green font-bold uppercase">
                  3. Verified Outcomes
                </span>
                <h3 className="text-sm font-bold font-display text-senpay-text-primary">
                  Outcome-Gated Escrow &amp; Audit Proofs
                </h3>
                <p className="text-xs text-senpay-text-secondary leading-relaxed">
                  Settlement eligibility requires post-mitigation telemetry proving CRS dropped below the SLA
                  target. Inconclusive or missing telemetry automatically holds funds in dispute escrow.
                </p>
              </div>
              <div className="text-[10px] font-mono text-senpay-text-muted pt-2 border-t border-senpay-border/60">
                Engine: Counterfactual Evaluator &amp; RFC 8785 Bundles
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 4. HOW IT WORKS: 5-STAGE OPERATIONAL PIPELINE ── */}
      <section
        id="how-it-works"
        className="py-16 px-6 lg:px-12 max-w-[1600px] mx-auto border-t border-senpay-border/60"
      >
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-4">
          <div>
            <div className="text-xs font-mono text-senpay-cyan uppercase tracking-wider font-bold mb-2">
              03 • END-TO-END WORKFLOW
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold font-display text-senpay-text-primary tracking-tight">
              Incident Detection &rarr; Risk Assessment &rarr; Optimization &rarr; Policy Validation &rarr; Settlement
            </h2>
          </div>
          <span className="text-xs font-mono text-senpay-text-muted">
            Deterministic 5-Stage Telecom &amp; Financial Coordination Loop
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {HOW_IT_WORKS_STAGES.map((stage) => (
            <div
              key={stage.id}
              className="senpay-card p-5 flex flex-col justify-between hover:border-senpay-cyan/50 transition-all"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-lg font-black font-mono text-senpay-text-muted">
                    {stage.step}
                  </span>
                  <span className={`text-[9px] font-mono px-2 py-0.5 rounded border font-bold ${stage.accent}`}>
                    {stage.tag}
                  </span>
                </div>

                <h3 className="text-base font-bold font-display text-senpay-text-primary">
                  {stage.title}
                </h3>

                <p className="text-xs text-senpay-text-secondary leading-relaxed">
                  {stage.summary}
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-senpay-border/60 text-[10px] font-mono text-senpay-text-primary">
                {stage.artifact}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── 5. AUDITABILITY: EVIDENCE, POLICY DECISIONS & VERIFIABLE RECORDS ── */}
      <section
        id="auditability"
        className="py-16 px-6 lg:px-12 max-w-[1600px] mx-auto border-t border-senpay-border/60"
      >
        <div className="senpay-card p-6 lg:p-8 border-senpay-cyan/30">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-6 space-y-4">
              <div className="text-xs font-mono text-senpay-green uppercase tracking-wider font-bold">
                04 • CRYPTOGRAPHIC AUDITABILITY &amp; GOVERNANCE
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold font-display text-senpay-text-primary tracking-tight">
                Tamper-Evident Evidence Bundles and Deterministic Policy Decisions
              </h2>
              <p className="text-sm text-senpay-text-secondary leading-relaxed">
                Every service agreement, policy evaluation, delegation reservation, and post-intervention
                telemetry check is serialized using RFC 8785 Canonical JSON and linked into a sequential
                SHA-256 hash chain.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-xs font-mono">
                <div className="p-3 rounded-lg bg-senpay-panel border border-senpay-border">
                  <div className="text-senpay-cyan font-bold">RFC 8785 Canonicalization</div>
                  <div className="text-[11px] text-senpay-text-secondary mt-1 font-sans">
                    Deterministic agreement hashing detects any parameter tampering prior to settlement.
                  </div>
                </div>
                <div className="p-3 rounded-lg bg-senpay-panel border border-senpay-border">
                  <div className="text-senpay-green font-bold">8-Point Evidence Verification</div>
                  <div className="text-[11px] text-senpay-text-secondary mt-1 font-sans">
                    Binds task ID, SLA contract hash, policy approval, telemetry delta, and receipt status.
                  </div>
                </div>
              </div>
            </div>

            <div className="lg:col-span-6 bg-senpay-panel border border-senpay-border rounded-xl p-5 font-mono text-xs space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-senpay-border">
                <span className="font-bold text-senpay-text-primary flex items-center gap-2">
                  <ShieldCheck size={15} className="text-senpay-green" />
                  <span>VERIFIABLE AUDIT CHAIN RECORD PREVIEW</span>
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-senpay-green/15 text-senpay-green font-bold">
                  SHA-256 INTACT
                </span>
              </div>

              <div className="space-y-2 text-[11px]">
                <div className="flex justify-between">
                  <span className="text-senpay-text-muted">Agreement ID:</span>
                  <span className="text-senpay-text-primary font-bold">agr_seed_001 (SkyLink 5G Slice)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-senpay-text-muted">Canonical Agreement Hash:</span>
                  <span className="text-senpay-cyan">0x7a89bc33d45e...abcdef1234</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-senpay-text-muted">Pre-Execution Policy Check:</span>
                  <span className="text-senpay-green font-bold">11 / 11 Rules Passed (12.50 HSK &le; 30.0 HSK)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-senpay-text-muted">Counterfactual SLA Telemetry:</span>
                  <span className="text-senpay-green">CRS 78.0 &rarr; 22.0 (-71.8% drop, &lt; 35.0 SLA)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-senpay-text-muted">Settlement Eligibility:</span>
                  <span className="text-senpay-amber font-bold">PERFORMANCE_SATISFIED (Simulated Demo)</span>
                </div>
              </div>

              <div className="pt-2 border-t border-senpay-border/60 flex justify-end gap-3">
                <button
                  onClick={() => onLaunchConsole('evidence')}
                  className="text-senpay-cyan hover:underline flex items-center gap-1 text-[11px] font-bold"
                >
                  <span>Inspect Evidence Bundles in Demo</span>
                  <ArrowRight size={12} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 6. PRODUCT CAPABILITIES: EXISTING COMMAND-CENTER MODULES ── */}
      <section
        id="capabilities"
        className="py-16 px-6 lg:px-12 max-w-[1600px] mx-auto border-t border-senpay-border/60"
      >
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-4">
          <div>
            <div className="text-xs font-mono text-senpay-cyan uppercase tracking-wider font-bold mb-2">
              05 • COMMAND CENTER MODULES
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold font-display text-senpay-text-primary tracking-tight">
              Explore Every SENPAY Module Directly in the Interactive Demo
            </h2>
          </div>
          <span className="text-xs font-mono text-senpay-text-muted">
            Click any module card to open it immediately in Demo Mode
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {CAPABILITY_MODULES.map((mod) => {
            const Icon = mod.icon;
            return (
              <div
                key={mod.id}
                onClick={() => onLaunchConsole(mod.id)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onLaunchConsole(mod.id);
                  }
                }}
                className="senpay-card p-6 flex flex-col justify-between hover:border-senpay-cyan/60 transition-all cursor-pointer group focus:outline-none focus-visible:ring-2 focus-visible:ring-senpay-cyan"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[10px] font-mono text-senpay-text-muted uppercase tracking-wider">
                      {mod.category}
                    </span>
                    <span className="px-2 py-0.5 rounded bg-senpay-panel border border-senpay-border text-[10px] font-mono text-senpay-cyan font-bold">
                      {mod.badge}
                    </span>
                  </div>

                  <div className="flex items-center gap-2.5 mb-2">
                    <div className="w-8 h-8 rounded-lg bg-senpay-panel border border-senpay-border flex items-center justify-center text-senpay-cyan group-hover:border-senpay-cyan/50 transition-colors">
                      <Icon size={16} />
                    </div>
                    <h3 className="text-lg font-bold font-display text-senpay-text-primary group-hover:text-senpay-cyan transition-colors">
                      {mod.title}
                    </h3>
                  </div>

                  <p className="text-xs sm:text-sm text-senpay-text-secondary leading-relaxed mb-6">
                    {mod.description}
                  </p>
                </div>

                <div className="pt-3 border-t border-senpay-border/60 flex items-center justify-between text-xs font-mono text-senpay-cyan font-bold">
                  <span>Open Module in Demo</span>
                  <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── 7. FINAL CTA SECTION ── */}
      <section className="py-16 px-6 lg:px-12 max-w-[1600px] mx-auto border-t border-senpay-border/60">
        <div className="senpay-card p-8 lg:p-12 text-center space-y-5 relative overflow-hidden">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-senpay-amber/15 border border-senpay-amber/40 text-xs font-mono text-senpay-amber font-bold">
            <span>INSTANT SANDBOX ACCESS • NO CREDENTIALS REQUIRED</span>
          </div>

          <h2 className="text-2xl sm:text-4xl font-black font-display text-senpay-text-primary max-w-2xl mx-auto">
            Ready to Explore Autonomous Telecom Operations?
          </h2>

          <p className="text-sm sm:text-base text-senpay-text-secondary max-w-xl mx-auto leading-relaxed">
            Enter the live SENPAY Command Center immediately. Inspect network topology, run
            counterfactual congestion simulations, evaluate 11-rule spending policies, and verify
            canonical settlement evidence bundles.
          </p>

          <div className="pt-2 flex items-center justify-center gap-4 flex-wrap">
            <button
              onClick={() => onLaunchConsole('demo')}
              data-testid="footer-launch-demo-btn"
              className={`py-3.5 px-8 rounded-xl bg-senpay-cyan hover:opacity-90 ${
                isLight ? 'text-white' : 'text-black'
              } font-mono font-black text-sm tracking-wider uppercase shadow-[0_0_24px_rgba(0,229,255,0.35)] transition-all hover-elevate inline-flex items-center gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-senpay-cyan`}
            >
              <span>Launch Interactive Demo &rarr;</span>
            </button>
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
          <span>Autonomous Telecom Operations &amp; Outcome-Gated Settlement • HashKey Chain (133)</span>
        </div>
      </footer>
    </div>
  );
}
