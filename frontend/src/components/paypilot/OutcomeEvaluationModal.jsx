import { useState } from 'react';
import {
  X, CheckCircle2, AlertTriangle, Activity, ArrowRight, ShieldAlert,
  RotateCcw, Sliders, Scale, FileText, Check, Cpu
} from 'lucide-react';
import { evaluateSentinelOutcome, diagnoseAndProposeRecovery } from '../../data/paypilotApi';

export default function OutcomeEvaluationModal({ agreement, onClose, onOutcomeEvaluated }) {
  const [evaluating, setEvaluating] = useState(false);
  const [evaluationResult, setEvaluationResult] = useState(null);
  const [recovering, setRecovering] = useState(false);
  const [recoveryResult, setRecoveryResult] = useState(null);
  const [error, setError] = useState(null);

  // Form inputs for post-metrics
  const [postCrs, setPostCrs] = useState(agreement?.baseline_value ? Math.max(15, agreement.baseline_value - 30) : 35.0);
  const [postDensity, setPostDensity] = useState(2.8);
  const [postLatency, setPostLatency] = useState(22.0);
  const [postLoss, setPostLoss] = useState(0.8);
  const [postBandwidth, setPostBandwidth] = useState(60.0);

  const handleEvaluate = async (simulateOutcomeType = null) => {
    setEvaluating(true);
    setError(null);
    try {
      let finalPostCrs = postCrs;
      let finalPostDensity = postDensity;
      let finalLatency = postLatency;
      let finalLoss = postLoss;

      if (simulateOutcomeType === 'SUCCESS') {
        finalPostCrs = Math.max(10, (agreement.baseline_value || 70) - (agreement.target_threshold || 25) - 8);
        setPostCrs(finalPostCrs);
      } else if (simulateOutcomeType === 'FAILURE') {
        finalPostCrs = (agreement.baseline_value || 70) - 2; // only 2 points drop
        finalLatency = 65.0;
        finalLoss = 8.5;
        setPostCrs(finalPostCrs);
        setPostLatency(finalLatency);
        setPostLoss(finalLoss);
      } else if (simulateOutcomeType === 'INCONCLUSIVE') {
        finalPostCrs = agreement.baseline_value || 70;
        finalLatency = null;
        finalLoss = null;
      }

      const postMetrics = {
        crs_score: parseFloat(finalPostCrs),
        density: parseFloat(finalPostDensity)
      };
      if (finalLatency != null) postMetrics.latency_ms = parseFloat(finalLatency);
      if (finalLoss != null) postMetrics.packet_loss_pct = parseFloat(finalLoss);
      if (postBandwidth != null) postMetrics.bandwidth_utilization_pct = parseFloat(postBandwidth);

      const res = await evaluateSentinelOutcome({
        agreement_id: agreement.id || agreement.agreement_id,
        post_metrics: postMetrics
      });

      setEvaluationResult(res);
      if (onOutcomeEvaluated) {
        onOutcomeEvaluated(res);
      }
    } catch (err) {
      console.error('Outcome evaluation failed:', err);
      setError(err.message || 'Outcome evaluation failed');
    } finally {
      setEvaluating(false);
    }
  };

  const handleProposeRecovery = async () => {
    if (!evaluationResult?.counterfactual_evaluation) return;
    setRecovering(true);
    setError(null);
    try {
      const rec = await diagnoseAndProposeRecovery({
        incident_id: agreement.task_id || `inc_${agreement.id}`,
        failed_agreement_id: agreement.id || agreement.agreement_id,
        counterfactual_evaluation_id: evaluationResult.counterfactual_evaluation.evaluation_id,
        buyer_agent_id: agreement.requesting_agent_id || 'agent_buyer_sentinel',
        max_attempts: 2
      });
      setRecoveryResult(rec);
    } catch (err) {
      console.error('Recovery proposal failed:', err);
      setError(err.message || 'Recovery proposal failed');
    } finally {
      setRecovering(false);
    }
  };

  const cfe = evaluationResult?.counterfactual_evaluation;
  const agr = evaluationResult?.agreement || agreement;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in font-mono">
      <div className="bg-crowd-surface border border-crowd-border rounded-2xl w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="p-4 border-b border-crowd-border flex items-center justify-between bg-crowd-dark">
          <div className="flex items-center gap-2">
            <Scale className="text-crowd-accent" size={18} />
            <div>
              <h3 className="text-sm font-bold text-white">Counterfactual Mitigation Evaluator</h3>
              <p className="text-[11px] text-crowd-text-secondary">
                Agreement #{agreement.id?.slice(0, 16)}... • {agreement.service_category}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 text-crowd-text-muted hover:text-white">
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs">
          {error && (
            <div className="p-3 bg-crowd-danger/10 border border-crowd-danger/40 rounded-xl text-crowd-danger text-xs">
              {error}
            </div>
          )}

          {/* Outcome Conditions Overview */}
          <div className="p-3.5 bg-crowd-dark/60 rounded-xl border border-crowd-border space-y-2">
            <div className="text-[10px] text-crowd-text-muted uppercase font-bold tracking-wider">
              Service Agreement Outcome Contract (Feature C)
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
              <div>
                <span className="text-[10px] text-crowd-text-muted block">Target Metric</span>
                <span className="font-bold text-white">{agreement.target_metric || 'CRS_REDUCTION'}</span>
              </div>
              <div>
                <span className="text-[10px] text-crowd-text-muted block">Baseline CRS</span>
                <span className="font-bold text-amber-400">{agreement.baseline_value || '—'} / 100</span>
              </div>
              <div>
                <span className="text-[10px] text-crowd-text-muted block">Target Threshold Drop</span>
                <span className="font-bold text-emerald-400">≥ {agreement.target_threshold || '20.0'} pts</span>
              </div>
              <div>
                <span className="text-[10px] text-crowd-text-muted block">Payment State</span>
                <span className="font-bold text-cyan-400">{agreement.status}</span>
              </div>
            </div>
          </div>

          {!evaluationResult ? (
            /* Input Telemetry Form */
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                  Post-Intervention Telemetry Inputs
                </h4>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => handleEvaluate('SUCCESS')}
                    className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/30"
                  >
                    Simulate Success
                  </button>
                  <button
                    onClick={() => handleEvaluate('FAILURE')}
                    className="text-[10px] px-2 py-0.5 rounded bg-red-500/20 text-red-300 border border-red-500/30 hover:bg-red-500/30"
                  >
                    Simulate SLA Failure
                  </button>
                  <button
                    onClick={() => handleEvaluate('INCONCLUSIVE')}
                    className="text-[10px] px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 hover:bg-amber-500/30"
                  >
                    Simulate Inconclusive
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 p-3 bg-crowd-dark/30 rounded-xl border border-crowd-border">
                <div>
                  <label className="text-[10px] text-crowd-text-muted block mb-1">Observed Post-CRS (0-100)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={postCrs}
                    onChange={(e) => setPostCrs(e.target.value)}
                    className="w-full bg-crowd-dark border border-crowd-border rounded px-2.5 py-1.5 text-white"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-crowd-text-muted block mb-1">Crowd Density (ppl/m²)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={postDensity}
                    onChange={(e) => setPostDensity(e.target.value)}
                    className="w-full bg-crowd-dark border border-crowd-border rounded px-2.5 py-1.5 text-white"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-crowd-text-muted block mb-1">Uplink Latency (ms)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={postLatency}
                    onChange={(e) => setPostLatency(e.target.value)}
                    className="w-full bg-crowd-dark border border-crowd-border rounded px-2.5 py-1.5 text-white"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-crowd-text-muted block mb-1">Packet Loss (%)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={postLoss}
                    onChange={(e) => setPostLoss(e.target.value)}
                    className="w-full bg-crowd-dark border border-crowd-border rounded px-2.5 py-1.5 text-white"
                  />
                </div>
              </div>

              <button
                onClick={() => handleEvaluate()}
                disabled={evaluating}
                className="btn-primary w-full py-2.5 font-bold flex items-center justify-center gap-2"
              >
                <Activity size={15} className={evaluating ? 'animate-spin' : ''} />
                {evaluating ? 'Computing Counterfactual Baseline...' : 'Evaluate Mitigation Outcome Against Baseline'}
              </button>
            </div>
          ) : (
            /* Evaluation Results */
            <div className="space-y-4">
              {/* Classification Banner */}
              <div className={`p-4 rounded-xl border ${
                cfe.outcome_classification === 'SUCCESSFUL'
                  ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300'
                  : cfe.outcome_classification === 'PARTIALLY_SUCCESSFUL'
                  ? 'bg-amber-500/10 border-amber-500/40 text-amber-300'
                  : 'bg-red-500/10 border-red-500/40 text-red-300'
              }`}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {cfe.outcome_classification === 'SUCCESSFUL' ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
                    <span className="font-bold text-sm tracking-wide">
                      Outcome Classification: {cfe.outcome_classification}
                    </span>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-black/40">
                    Confidence: {cfe.confidence_level} ({Math.round(cfe.evidence_confidence_score * 100)}%)
                  </span>
                </div>
                <p className="text-xs leading-relaxed">{cfe.explanation}</p>
              </div>

              {/* Counterfactual Decomposition Table */}
              <div className="p-3 bg-crowd-dark/60 rounded-xl border border-crowd-border space-y-2">
                <span className="text-[10px] text-crowd-text-muted uppercase font-bold block">
                  Counterfactual Decomposition (Baseline Hierarchy: {cfe.baseline?.type})
                </span>
                <div className="grid grid-cols-4 gap-2 text-center">
                  <div className="p-2 bg-crowd-dark rounded-lg">
                    <span className="text-[10px] text-crowd-text-muted block">Counterfactual Baseline</span>
                    <span className="text-sm font-bold text-amber-400">{cfe.counterfactual_crs_estimate}</span>
                  </div>
                  <div className="p-2 bg-crowd-dark rounded-lg">
                    <span className="text-[10px] text-crowd-text-muted block">Observed Post-CRS</span>
                    <span className="text-sm font-bold text-white">{cfe.observed_post_crs}</span>
                  </div>
                  <div className="p-2 bg-crowd-dark rounded-lg">
                    <span className="text-[10px] text-crowd-text-muted block">Attributable Drop</span>
                    <span className={`text-sm font-bold ${cfe.attributable_improvement >= (agreement.target_threshold || 20) ? 'text-emerald-400' : 'text-red-400'}`}>
                      -{cfe.attributable_improvement} pts
                    </span>
                  </div>
                  <div className="p-2 bg-crowd-dark rounded-lg">
                    <span className="text-[10px] text-crowd-text-muted block">Settlement Status</span>
                    <span className="text-[11px] font-bold text-cyan-400">{agr.settlement_eligibility}</span>
                  </div>
                </div>
              </div>

              {/* Self-Healing Bounded Recovery (Feature D) */}
              {cfe.outcome_classification !== 'SUCCESSFUL' && !recoveryResult && (
                <div className="p-3.5 bg-amber-500/10 border border-amber-500/30 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                      <ShieldAlert size={14} />
                      {cfe.outcome_classification === 'INCONCLUSIVE'
                        ? 'Inconclusive Telemetry — Safe Measurement Policy'
                        : 'Intervention Failed SLA — Bounded Safe Recovery Available'}
                    </span>
                    <span className="text-[10px] bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded font-bold">
                      Max Attempts: 2
                    </span>
                  </div>
                  <p className="text-[11px] text-crowd-text-secondary">
                    {cfe.outcome_classification === 'INCONCLUSIVE'
                      ? 'Sparse telemetry prevents verifying causal network effect. Safe policy recommends gathering more measurements rather than committing capital to an unverified problem.'
                      : `Self-healing procurement will diagnose the failure, exclude failed provider '${agreement.provider_id}', and formulate an alternative procurement plan within budget.`}
                  </p>
                  <button
                    onClick={handleProposeRecovery}
                    disabled={recovering}
                    className="btn-primary w-full py-2 font-bold flex items-center justify-center gap-2 text-xs"
                  >
                    <RotateCcw size={14} className={recovering ? 'animate-spin' : ''} />
                    {recovering
                      ? 'Formulating Safe Recommendation...'
                      : cfe.outcome_classification === 'INCONCLUSIVE'
                      ? 'Formulate Telemetry-Only Safe Policy'
                      : 'Diagnose & Propose Bounded Recovery'}
                  </button>
                </div>
              )}

              {/* Recovery Action Plan */}
              {recoveryResult && (
                <div className="p-3.5 bg-crowd-accent/10 border border-crowd-accent/40 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-crowd-accent flex items-center gap-1.5">
                      <Cpu size={14} />
                      Recovery Action: {recoveryResult.action_type} (Attempt {recoveryResult.attempt_number} of {recoveryResult.max_attempts})
                    </span>
                    <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                      recoveryResult.status === 'PROPOSED' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-red-500/20 text-red-300'
                    }`}>
                      {recoveryResult.status}
                    </span>
                  </div>

                  {recoveryResult.action_type === 'GATHER_TELEMETRY_ONLY' && (
                    <div className="p-2 rounded bg-amber-500/20 text-amber-300 font-bold text-[11px] border border-amber-500/40">
                      🛡️ Safe Policy Enforced: Zero payment mandate generated. Recommend deploying IoT mmWave radar feed or waiting for next telemetry beacon before committing capital.
                    </div>
                  )}

                  <div className="p-2.5 bg-crowd-dark rounded-lg text-[11px] space-y-1">
                    <div className="text-crowd-text-muted font-bold">Diagnosis: <span className="text-white">{recoveryResult.diagnosis?.code}</span></div>
                    <p className="text-crowd-text-secondary">{recoveryResult.diagnosis?.details}</p>
                    {recoveryResult.recommended_provider_id && (
                      <div className="text-emerald-400 font-bold mt-1">
                        Alternative Provider Selected: {recoveryResult.recommended_provider_id} (Excluded: {recoveryResult.diagnosis?.failed_provider})
                      </div>
                    )}
                  </div>
                  <p className="text-[11px] text-crowd-text-muted">{recoveryResult.justification}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-crowd-border bg-crowd-dark flex justify-between">
          {evaluationResult && (
            <button
              onClick={() => { setEvaluationResult(null); setRecoveryResult(null); }}
              className="px-3 py-1.5 rounded-lg border border-crowd-border text-crowd-text-secondary hover:text-white text-xs"
            >
              Re-evaluate
            </button>
          )}
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-crowd-border hover:bg-crowd-border/80 text-white text-xs font-bold ml-auto"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
