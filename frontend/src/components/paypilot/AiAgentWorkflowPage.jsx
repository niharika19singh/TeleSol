import { useState } from 'react';
import {
  Bot, Sparkles, Send, ShieldCheck, AlertTriangle, ArrowRight,
  Layers, CheckCircle2, Clock, Globe, Lock, Cpu
} from 'lucide-react';
import { parseUserIntent } from '../../data/paypilotApi';
import GlassCard from '../shared/GlassCard';

const SAMPLE_INTENTS = [
  "Find an emergency 5G slice bandwidth provider for Gate C surge under 25 HSK",
  "Acquire high-resolution mmWave crowd radar telemetry stream under 15 HSK",
  "Procure edge computer vision inference capacity for crowd counting under 30 HSK",
  "Allocate transit rerouting AI feed for Delhi metro feeder advisory under 10 HSK",
];

export default function AiAgentWorkflowPage({ onSelectMandateToExecute }) {
  const [intentInput, setIntentInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [currentPlan, setCurrentPlan] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);

  const handleExecuteIntent = async (textToRun) => {
    const text = (textToRun || intentInput).trim();
    if (!text) return;

    setLoading(true);
    setErrorMsg(null);
    setCurrentPlan(null);

    try {
      const plan = await parseUserIntent(text, 'agent_buyer_sentinel');
      if (!plan.success) {
        throw new Error(plan.error || 'Failed to generate plan for intent');
      }
      setCurrentPlan(plan);
    } catch (err) {
      setErrorMsg(err.message || 'Agent workflow parsing failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* ── Header ── */}
      <div>
        <h1 className="text-xl font-bold font-display text-crowd-text-primary flex items-center gap-2">
          <Bot size={22} className="text-crowd-purple" />
          Conversational AI Agent Payment Workflow
        </h1>
        <p className="text-xs text-crowd-text-secondary mt-1">
          Express high-level service procurement intents. PayPilot's multi-agent orchestrator discovers providers, constructs structured HSP mandates, runs deterministic policy checks, and strictly pauses for your explicit wallet authorization.
        </p>
      </div>

      {/* ── Conversational Intake Box ── */}
      <GlassCard className="p-5 space-y-4">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleExecuteIntent();
          }}
          className="space-y-3"
        >
          <div className="relative">
            <textarea
              rows={3}
              value={intentInput}
              onChange={(e) => setIntentInput(e.target.value)}
              placeholder="e.g. Find an emergency 5G slice bandwidth provider for Gate C surge under 25 HSK and prepare payment request..."
              className="w-full bg-crowd-card border border-crowd-border rounded-xl p-3 text-sm text-crowd-text-primary placeholder:text-crowd-text-muted focus:outline-none focus:border-crowd-purple focus:ring-1 focus:ring-crowd-purple font-sans transition-all"
            />
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            {/* Quick Suggestions */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[10px] text-crowd-text-muted uppercase font-mono mr-1">Suggestions:</span>
              {SAMPLE_INTENTS.slice(0, 2).map((s, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => {
                    setIntentInput(s);
                    handleExecuteIntent(s);
                  }}
                  className="px-2 py-0.5 rounded bg-white/[0.03] hover:bg-white/[0.08] text-[10px] text-crowd-text-secondary border border-crowd-border truncate max-w-xs transition-all"
                >
                  {s.slice(0, 42)}...
                </button>
              ))}
            </div>

            <button
              type="submit"
              disabled={loading || !intentInput.trim()}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-crowd-purple to-crowd-cyan text-white font-bold text-xs hover:opacity-95 disabled:opacity-50 transition-all shadow-[0_0_15px_rgba(168,85,247,0.25)] flex-shrink-0"
            >
              <Sparkles size={14} />
              <span>{loading ? 'Orchestrating Agents...' : 'Parse & Prepare Mandate'}</span>
            </button>
          </div>
        </form>
      </GlassCard>

      {/* ── Error Notification ── */}
      {errorMsg && (
        <div className="p-3.5 rounded-xl bg-crowd-danger/15 border border-crowd-danger/30 text-crowd-danger text-xs flex items-center gap-2">
          <AlertTriangle size={16} />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* ── 6-Step Inspectable Trace ── */}
      {currentPlan && (
        <div className="space-y-4 animate-fade-in-up">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold font-display text-crowd-text-primary uppercase tracking-wider font-mono flex items-center gap-2">
              <Layers size={16} className="text-crowd-cyan" />
              Inspectable Multi-Agent Execution Trace ({currentPlan.trace?.length} Steps)
            </h2>
            <span className="text-[10px] font-mono text-crowd-safe font-bold uppercase">
              Halt At Signing Enforced
            </span>
          </div>

          <div className="space-y-3">
            {currentPlan.trace?.map((step) => {
              const isHalt = step.status === 'AWAITING_WALLET_APPROVAL';
              const isDone = step.status === 'COMPLETED';

              return (
                <GlassCard
                  key={step.step}
                  className={`p-4 transition-all ${
                    isHalt
                      ? 'border-crowd-warning/60 bg-crowd-warning/[0.03] shadow-[0_0_20px_rgba(255,184,0,0.1)]'
                      : 'border-crowd-border'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-mono font-bold flex-shrink-0 mt-0.5 ${
                        isHalt
                          ? 'bg-crowd-warning text-crowd-bg'
                          : 'bg-crowd-cyan/20 text-crowd-cyan border border-crowd-cyan/30'
                      }`}>
                        {step.step}
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-bold text-crowd-text-primary">{step.agent}</span>
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold uppercase bg-white/[0.05] text-crowd-text-muted border border-crowd-border">
                            {step.role}
                          </span>
                        </div>
                        <div className="text-xs text-crowd-text-secondary">{step.details}</div>
                      </div>
                    </div>

                    <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase whitespace-nowrap ${
                      isHalt ? 'bg-crowd-warning/20 text-crowd-warning border border-crowd-warning/40 animate-pulse' :
                      isDone ? 'bg-crowd-safe/20 text-crowd-safe border border-crowd-safe/30' :
                      'bg-crowd-danger/20 text-crowd-danger'
                    }`}>
                      {step.status}
                    </span>
                  </div>
                </GlassCard>
              );
            })}
          </div>

          {/* Proposed Mandate Review Card & User Wallet Signing Action */}
          {currentPlan.proposed_mandate && (
            <GlassCard className="p-5 border-crowd-cyan/40 bg-crowd-cyan/[0.03] space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-crowd-border/60">
                <div className="flex items-center gap-2 text-sm font-bold font-display text-crowd-text-primary">
                  <ShieldCheck size={18} className="text-crowd-safe" />
                  <span>Proposed Payment Mandate Ready for User Signature</span>
                </div>
                <span className="text-base font-bold font-mono text-crowd-cyan">
                  {currentPlan.proposed_mandate.amount} {currentPlan.proposed_mandate.asset}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs font-mono">
                <div>Provider: <span className="text-crowd-text-primary font-bold">{currentPlan.selected_provider?.name}</span></div>
                <div>Recipient: <span className="text-crowd-text-primary truncate">{currentPlan.proposed_mandate.recipient_address}</span></div>
                <div>Network: <span className="text-crowd-cyan">HSK Chain Testnet (133)</span></div>
                <div>Policy Evaluation: <span className="text-crowd-safe font-bold">{currentPlan.policy_decision?.decision}</span></div>
              </div>

              {/* Action Button */}
              <div className="flex items-center justify-between pt-3 border-t border-crowd-border/60">
                <span className="text-xs text-crowd-warning flex items-center gap-1.5 font-mono">
                  <Lock size={13} />
                  <span>Wallet signature required to authorize HSP gateway execution</span>
                </span>

                <button
                  onClick={() => onSelectMandateToExecute(currentPlan.proposed_mandate)}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-crowd-cyan text-crowd-bg font-bold text-xs hover:bg-crowd-cyan/90 transition-all shadow-[0_0_15px_rgba(0,212,255,0.3)]"
                >
                  <span>Review & Authorize Payment</span>
                  <ArrowRight size={14} />
                </button>
              </div>
            </GlassCard>
          )}
        </div>
      )}
    </div>
  );
}
