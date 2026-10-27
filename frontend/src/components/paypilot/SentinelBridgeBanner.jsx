import { useState, useEffect } from 'react';
import {
  AlertTriangle, Radio, Zap, ArrowRight, ShieldCheck, CheckCircle2,
  X, RefreshCw, Activity, Cpu, Sliders, ChevronDown, ChevronUp, Eye
} from 'lucide-react';
import { proposeSentinelMitigation, fetchSentinelIncidents } from '../../data/paypilotApi';

export default function SentinelBridgeBanner({ zones = [], onNavigate, onSelectMandateForSigning }) {
  const [dismissed, setDismissed] = useState(false);
  const [mitigating, setMitigating] = useState(false);
  const [mitigationResult, setMitigationResult] = useState(null);
  const [showOptimizerModal, setShowOptimizerModal] = useState(false);

  // Find the highest risk zone
  const congestedZone = zones.find(
    (z) => (z.riskScore || 0) >= 40 || (z.congestionScore || 0) >= 40
  );

  const crsScore = congestedZone ? Math.round(congestedZone.riskScore || congestedZone.congestionScore || 0) : 0;
  const isCritical = crsScore >= 75;

  if (!congestedZone || dismissed) return null;

  const handleMitigate = async () => {
    setMitigating(true);
    try {
      const res = await proposeSentinelMitigation(congestedZone.id || congestedZone.zoneId || 'ZONE_CENTRAL');
      setMitigationResult(res);
      if (res.mandate && onSelectMandateForSigning) {
        onSelectMandateForSigning({
          mandate_id: res.mandate.id || res.mandate.mandate_id,
          amount: res.mandate.amount,
          asset: res.mandate.asset,
          network_id: res.mandate.network_id || 133,
          recipient_address: res.mandate.recipient_address || res.service_agreement?.provider_address || res.service_agreement?.provider_id || '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC',
          purpose: res.mandate.purpose || `Autonomous Telecom Slice for ${congestedZone.name || congestedZone.id}`
        });
      }
    } catch (err) {
      console.error('Sentinel mitigation failed:', err);
    } finally {
      setMitigating(false);
    }
  };

  const opt = mitigationResult?.intervention_optimizer;
  const selectedCand = opt?.selected_candidate;

  return (
    <>
      <div className={`p-3.5 rounded-xl border flex flex-col md:flex-row md:items-center justify-between gap-3 font-mono transition-all duration-300 shadow-lg ${
        isCritical
          ? 'bg-crowd-danger/15 border-crowd-danger/40 text-crowd-danger'
          : 'bg-crowd-warning/15 border-crowd-warning/40 text-crowd-warning'
      }`}>
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg flex items-center justify-center ${
            isCritical ? 'bg-crowd-danger/20 text-crowd-danger' : 'bg-crowd-warning/20 text-crowd-warning'
          }`}>
            <Radio size={20} className="animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded bg-black/40">
                Sentinel NOC Trigger
              </span>
              <span className="text-xs font-bold text-crowd-text-primary">
                Zone Congestion in {congestedZone.name || congestedZone.id} (CRS: {crsScore}/100)
              </span>
              {opt && (
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold flex items-center gap-1 ${
                  opt.confidence_level === 'HIGH' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' :
                  opt.confidence_level === 'MEDIUM' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40' :
                  'bg-red-500/20 text-red-400 border border-red-500/40'
                }`}>
                  <Activity size={10} />
                  Confidence: {opt.confidence_level} ({Math.round(opt.confidence_score * 100)}%)
                </span>
              )}
            </div>
            <p className="text-[11px] text-crowd-text-secondary mt-0.5">
              {selectedCand
                ? `Twin Selected: ${selectedCand.provider_name} (-${selectedCand.predicted_crs_reduction} CRS, ${selectedCand.time_to_impact_seconds}s to impact, Utility: ${selectedCand.utility_score})`
                : 'Telecom slice bandwidth degradation detected. Propose emergency 5G QoS slice via PayPilot autonomous agent.'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end md:self-center flex-shrink-0">
          {mitigationResult ? (
            <div className="flex items-center gap-2 text-xs text-crowd-safe font-bold">
              <CheckCircle2 size={16} />
              <button
                onClick={() => setShowOptimizerModal(true)}
                className="px-2.5 py-1 text-xs bg-crowd-surface border border-crowd-border hover:border-crowd-accent text-crowd-accent rounded-lg flex items-center gap-1 font-mono transition-colors"
              >
                <Sliders size={12} />
                Optimizer Rationale
              </button>
              <button
                onClick={() => onNavigate && onNavigate('mandates')}
                className="btn-primary text-xs px-2.5 py-1"
              >
                View Mandate
              </button>
            </div>
          ) : (
            <button
              onClick={handleMitigate}
              disabled={mitigating}
              className={`btn-primary text-xs px-3 py-1.5 flex items-center gap-1.5 font-bold ${
                isCritical ? 'bg-crowd-danger hover:bg-crowd-danger/80' : ''
              }`}
            >
              <Zap size={14} className={mitigating ? 'animate-spin' : ''} />
              {mitigating ? 'Simulating Digital Twin...' : 'Mitigate with PayPilot'}
            </button>
          )}

          <button
            onClick={() => setDismissed(true)}
            className="p-1 text-crowd-text-muted hover:text-white"
            title="Dismiss notification"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Optimizer Candidates & Digital Twin Modal */}
      {showOptimizerModal && opt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in font-mono">
          <div className="bg-crowd-surface border border-crowd-border rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl">
            {/* Header */}
            <div className="p-4 border-b border-crowd-border flex items-center justify-between bg-crowd-dark">
              <div className="flex items-center gap-2">
                <Cpu className="text-crowd-accent" size={18} />
                <div>
                  <h3 className="text-sm font-bold text-white">Network Digital Twin: Candidate Interventions</h3>
                  <p className="text-[11px] text-crowd-text-secondary">
                    Deterministic multi-attribute optimization evaluated against live crowd telemetry
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowOptimizerModal(false)}
                className="p-1 text-crowd-text-muted hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            {/* Content */}
            <div className="p-5 overflow-y-auto space-y-4 text-xs">
              {/* Provenance Banner */}
              <div className="grid grid-cols-3 gap-2 p-3 bg-crowd-dark/60 rounded-xl border border-crowd-border">
                <div>
                  <span className="text-[10px] text-crowd-text-muted uppercase font-bold block">Observed CRS</span>
                  <span className="text-sm font-bold text-amber-400">{opt.data_provenance?.real_measurements?.crs_score || crsScore} / 100</span>
                </div>
                <div>
                  <span className="text-[10px] text-crowd-text-muted uppercase font-bold block">Telemetry Confidence</span>
                  <span className="text-sm font-bold text-emerald-400">{opt.confidence_level} ({Math.round(opt.confidence_score * 100)}%)</span>
                </div>
                <div>
                  <span className="text-[10px] text-crowd-text-muted uppercase font-bold block">Digital Twin Model</span>
                  <span className="text-sm font-bold text-cyan-400">Bounded Crowd-RF v1</span>
                </div>
              </div>

              {/* Rationale explanation */}
              <div className="p-3 bg-crowd-accent/10 border border-crowd-accent/30 rounded-xl text-crowd-text-primary">
                <span className="font-bold text-crowd-accent uppercase text-[10px] block mb-1">Optimizer Recommendation Rationale:</span>
                <p className="text-[11px] leading-relaxed">{opt.selection_rationale}</p>
              </div>

              {/* Candidate Comparison Table */}
              <div>
                <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-2">Evaluated Alternatives</h4>
                <div className="space-y-2">
                  {opt.candidates.map((cand, idx) => (
                    <div
                      key={cand.candidate_id || idx}
                      className={`p-3 rounded-xl border transition-all ${
                        cand.is_recommended
                          ? 'bg-crowd-accent/10 border-crowd-accent/50 text-white'
                          : 'bg-crowd-dark/40 border-crowd-border/60 text-crowd-text-secondary'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                            cand.is_recommended ? 'bg-crowd-accent text-black' : 'bg-crowd-border text-crowd-text-muted'
                          }`}>
                            Rank #{cand.rank}
                          </span>
                          <span className="font-bold text-sm text-white">{cand.provider_name}</span>
                          <span className="text-[10px] text-crowd-text-muted">({cand.service_category})</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-xs font-bold text-amber-400">{cand.estimated_cost_hsk} HSK</span>
                          <span className="text-xs font-bold text-emerald-400">Utility: {cand.utility_score}</span>
                        </div>
                      </div>

                      <div className="grid grid-cols-4 gap-2 text-[11px] text-crowd-text-muted mb-2">
                        <div>Predicted CRS Drop: <span className="font-bold text-white">-{cand.predicted_crs_reduction} pts</span></div>
                        <div>Latency Attenuation: <span className="font-bold text-white">-{cand.predicted_latency_drop_ms} ms</span></div>
                        <div>Time to Impact: <span className="font-bold text-white">{cand.time_to_impact_seconds}s</span></div>
                        <div>Risk Index: <span className="font-bold text-white">{cand.risk_score}</span></div>
                      </div>

                      <p className="text-[10px] text-crowd-text-secondary border-t border-crowd-border/40 pt-1.5">
                        <span className="text-crowd-text-muted">Mechanism:</span> {cand.mechanism}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-3 border-t border-crowd-border bg-crowd-dark flex justify-end">
              <button
                onClick={() => setShowOptimizerModal(false)}
                className="px-4 py-1.5 rounded-lg bg-crowd-border hover:bg-crowd-border/80 text-white text-xs font-bold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

