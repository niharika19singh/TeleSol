import { useState, useEffect } from 'react';
import {
  ShieldCheck, AlertTriangle, Info, CheckCircle2, XCircle,
  HelpCircle, ExternalLink, Hash, X
} from 'lucide-react';
import { fetchProviderTrust } from '../../data/paypilotApi';
import GlassCard from '../shared/GlassCard';

export default function ProviderTrustModal({ providerId, amount = null, onClose, onSelectForPayment }) {
  const [trustData, setTrustData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!providerId) return;
    const loadTrust = async () => {
      try {
        const data = await fetchProviderTrust(providerId, amount);
        setTrustData(data);
      } catch (err) {
        console.error('Failed to load trust profile:', err);
      } finally {
        setLoading(false);
      }
    };
    loadTrust();
  }, [providerId, amount]);

  if (!providerId) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-xl bg-crowd-surface border border-crowd-border rounded-2xl p-6 shadow-2xl space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-crowd-border pb-3">
          <div className="flex items-center gap-2">
            <ShieldCheck size={20} className="text-crowd-cyan" />
            <h2 className="text-base font-bold font-display text-crowd-text-primary">
              Explainable Provider Trust Profile
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-white/10 text-crowd-text-muted hover:text-white"
          >
            <X size={18} />
          </button>
        </div>

        {loading ? (
          <div className="py-12 text-center text-xs font-mono text-crowd-text-muted">
            Analyzing on-chain and local trust signals...
          </div>
        ) : trustData ? (
          <div className="space-y-4 font-mono text-xs">
            {/* Recommendation Banner */}
            <div className={`p-4 rounded-xl border flex items-center justify-between ${
              (trustData.recommendation === 'RECOMMENDED' || trustData.overall_assessment === 'ESTABLISHED')
                ? 'bg-crowd-safe/15 border-crowd-safe/40 text-crowd-safe'
                : (trustData.recommendation === 'NOT_RECOMMENDED' || trustData.overall_assessment === 'ELEVATED_RISK')
                ? 'bg-crowd-danger/15 border-crowd-danger/40 text-crowd-danger'
                : 'bg-crowd-warning/15 border-crowd-warning/40 text-crowd-warning'
            }`}>
              <div>
                <div className="text-[10px] uppercase font-bold tracking-wider text-crowd-text-muted">
                  ADVISORY TRUST ASSESSMENT
                </div>
                <div className="text-base font-display font-black tracking-wide">
                  {trustData.overall_assessment || trustData.recommendation}
                </div>
              </div>

              {trustData.flags?.includes('INSUFFICIENT_HISTORY') && (
                <div className="px-2.5 py-1 rounded bg-crowd-warning/20 text-crowd-warning border border-crowd-warning/40 text-[10px] font-bold">
                  INSUFFICIENT HISTORY (&lt; 3 SETTLEMENTS)
                </div>
              )}
            </div>

            {/* Provider Summary */}
            <div className="p-3 rounded-lg bg-black/40 border border-crowd-border grid grid-cols-2 gap-3">
              <div>
                <span className="text-crowd-text-muted text-[10px] uppercase block">Provider</span>
                <span className="text-crowd-text-primary font-bold">{trustData.provider_name || trustData.provider_id}</span>
              </div>
              <div>
                <span className="text-crowd-text-muted text-[10px] uppercase block">HSK Address</span>
                <span className="text-crowd-cyan truncate block" title={trustData.payment_address || trustData.wallet_address}>
                  {(trustData.payment_address || trustData.wallet_address)?.substring(0, 16)}...
                </span>
              </div>
            </div>

            {/* Operational Outcome Track Record (Feature F: Outcome-Based Reputation) */}
            {trustData.operational_performance && (
              <div className="p-3.5 rounded-xl bg-white/[0.02] border border-crowd-border space-y-2">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-crowd-text-muted font-bold uppercase tracking-wider flex items-center gap-1.5">
                    <ShieldCheck size={13} className="text-emerald-400" />
                    Operational Outcome Track Record
                  </span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    trustData.operational_performance.performance_tier === 'PROVEN_HIGH_PERFORMER'
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      : trustData.operational_performance.performance_tier === 'ADEQUATE_PERFORMER'
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                      : trustData.operational_performance.performance_tier === 'ELEVATED_BREACH_RISK'
                      ? 'bg-red-500/20 text-red-300 border border-red-500/30'
                      : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                  }`}>
                    {trustData.operational_performance.performance_tier}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center pt-1">
                  <div className="p-2 bg-crowd-dark rounded-lg">
                    <span className="text-[10px] text-crowd-text-muted block">Evaluated Tasks</span>
                    <span className="text-sm font-bold text-white">
                      {trustData.operational_performance.total_evaluated_agreements}
                    </span>
                  </div>
                  <div className="p-2 bg-crowd-dark rounded-lg">
                    <span className="text-[10px] text-crowd-text-muted block">SLA Success Rate</span>
                    <span className="text-sm font-bold text-emerald-400">
                      {trustData.operational_performance.success_rate_pct}%
                    </span>
                  </div>
                  <div className="p-2 bg-crowd-dark rounded-lg">
                    <span className="text-[10px] text-crowd-text-muted block">Avg CRS Drop</span>
                    <span className="text-sm font-bold text-cyan-400">
                      -{trustData.operational_performance.average_attributable_drop} pts
                    </span>
                  </div>
                </div>

                <p className="text-[10px] text-crowd-text-muted border-t border-white/[0.04] pt-1.5">
                  Anti-inflation protected: evaluated against defensible counterfactual baselines and deduplicated by Agreement ID to prevent review farming.
                </p>
              </div>
            )}

            {/* 4 Factor Signals */}
            <div className="space-y-2">
              <span className="text-[11px] font-bold text-crowd-text-primary uppercase tracking-wider block">
                Explainable Factor Breakdown ({trustData.factors?.length || 0})
              </span>

              <div className="space-y-2">
                {trustData.factors?.map((f, i) => (
                  <div key={i} className="p-3 rounded-lg bg-white/[0.02] border border-crowd-border space-y-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {f.score >= 0.8 ? (
                          <CheckCircle2 size={14} className="text-crowd-safe flex-shrink-0" />
                        ) : f.score >= 0.5 ? (
                          <AlertTriangle size={14} className="text-crowd-warning flex-shrink-0" />
                        ) : (
                          <XCircle size={14} className="text-crowd-danger flex-shrink-0" />
                        )}
                        <span className="font-bold text-crowd-text-primary">{f.name}</span>
                      </div>
                      <span className="text-crowd-cyan font-bold">{Math.round(f.score * 100)}%</span>
                    </div>

                    <p className="text-[11px] text-crowd-text-secondary leading-relaxed">
                      {f.detail}
                    </p>

                    <div className="pt-1 flex items-center justify-between text-[10px] text-crowd-text-muted border-t border-white/[0.04]">
                      <span>Source: <strong className="text-crowd-text-secondary">{f.source}</strong></span>
                      <span>Confidence Limits: <strong className="text-crowd-text-secondary">{f.confidence_limits}</strong></span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Advisory Disclaimer */}
            <div className="p-3 rounded-xl bg-crowd-cyan/5 border border-crowd-cyan/20 text-[11px] text-crowd-text-muted flex items-start gap-2.5">
              <Info size={15} className="text-crowd-cyan flex-shrink-0 mt-0.5" />
              <div>
                <strong className="text-crowd-cyan block mb-0.5">Advisory Signal Only</strong>
                Trust signals reflect observable local metrics and on-chain formatting. They do not override deterministic spending rules or replace explicit wallet authorization.
              </div>
            </div>

            {/* Footer Actions */}
            <div className="pt-3 border-t border-crowd-border flex items-center justify-end gap-3">
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-lg bg-white/[0.04] text-crowd-text-secondary hover:text-white"
              >
                Close Profile
              </button>
              {onSelectForPayment && (
                <button
                  onClick={() => {
                    onSelectForPayment(trustData);
                    onClose();
                  }}
                  className="btn-primary px-4 py-2"
                >
                  Initiate Agreement with Provider
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="py-8 text-center text-xs font-mono text-crowd-danger">
            Provider trust data could not be retrieved.
          </div>
        )}
      </div>
    </div>
  );
}
