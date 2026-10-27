import { useState, useEffect } from 'react';
import {
  FileText, ShieldCheck, CheckCircle2, AlertTriangle, Download,
  ExternalLink, Hash, RefreshCw, XCircle, ArrowRight, Shield
} from 'lucide-react';
import {
  fetchEvidenceBundles,
  verifyEvidenceBundle,
  getEvidenceBundleExportUrl
} from '../../data/paypilotApi';
import GlassCard from '../shared/GlassCard';

export default function EvidenceBundlesPage() {
  const [bundles, setBundles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedBundle, setSelectedBundle] = useState(null);
  const [verificationResult, setVerificationResult] = useState(null);
  const [verifying, setVerifying] = useState(false);

  const loadBundles = async () => {
    try {
      const res = await fetchEvidenceBundles();
      setBundles(res.evidence_bundles || []);
      if (res.evidence_bundles && res.evidence_bundles.length > 0 && !selectedBundle) {
        setSelectedBundle(res.evidence_bundles[0]);
      }
    } catch (err) {
      console.error('Failed to load evidence bundles:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBundles();
  }, []);

  const handleVerifyBundle = async (bundleId) => {
    setVerifying(true);
    setVerificationResult(null);
    try {
      const res = await verifyEvidenceBundle(bundleId);
      setVerificationResult(res);
    } catch (err) {
      setVerificationResult({
        verified: false,
        error: err.message
      });
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* ── Page Header ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold font-display text-crowd-text-primary flex items-center gap-2">
            <ShieldCheck className="text-crowd-cyan" size={24} />
            Evidence Bundles & Independent Verification
          </h1>
          <p className="text-xs text-crowd-text-muted mt-1">
            Complete cryptographic audit package binding task, agreement, mandate, wallet signature, HSP gateway outcome, and on-chain HSK settlement.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={loadBundles}
            className="p-2 rounded-lg bg-crowd-surface border border-crowd-border hover:border-crowd-cyan text-crowd-text-secondary"
            title="Refresh Evidence Bundles"
          >
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* ── Two Column Layout ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Bundle List (5 cols) */}
        <div className="lg:col-span-5 space-y-3">
          <div className="text-xs font-mono uppercase tracking-wider text-crowd-text-muted px-1 flex items-center justify-between">
            <span>Settled Bundles ({bundles.length})</span>
            <span className="text-[10px] text-crowd-cyan">8-Point Audited</span>
          </div>

          {bundles.length === 0 ? (
            <GlassCard className="p-8 text-center text-crowd-text-muted text-xs">
              No evidence bundles generated yet. Execute a payment mandate to generate an audit bundle.
            </GlassCard>
          ) : (
            bundles.map((b) => {
              const isSelected = selectedBundle?.id === b.id;
              const content = b.bundle_content || {};

              return (
                <GlassCard
                  key={b.id}
                  onClick={() => {
                    setSelectedBundle(b);
                    setVerificationResult(null);
                  }}
                  className={`cursor-pointer transition-all ${
                    isSelected
                      ? 'border-crowd-cyan/50 shadow-[0_0_15px_rgba(0,212,255,0.12)]'
                      : 'hover:border-crowd-border/80'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-xs text-crowd-text-primary">
                          {b.id}
                        </span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-crowd-safe/20 text-crowd-safe font-bold">
                          {b.status || 'SETTLED'}
                        </span>
                      </div>
                      <p className="text-xs font-mono text-crowd-text-secondary mt-1">
                        Task: <span className="text-crowd-text-primary">{b.task_id}</span>
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-mono text-crowd-text-muted block">
                        Mandate: {b.mandate_id}
                      </span>
                    </div>
                  </div>

                  <div className="mt-3 pt-2 border-t border-white/[0.05] flex items-center justify-between text-[11px] font-mono text-crowd-text-muted">
                    <span className="truncate max-w-[160px]">
                      Tx: {(b.transaction_hash || b.payment_tx_hash)?.substring(0, 14)}...
                    </span>
                    <span className="text-crowd-cyan text-[10px]">
                      Hash: {b.bundle_hash?.substring(0, 10)}...
                    </span>
                  </div>
                </GlassCard>
              );
            })
          )}
        </div>

        {/* Right: Bundle Inspection & 8-Point Verification (7 cols) */}
        <div className="lg:col-span-7">
          {selectedBundle ? (
            <GlassCard className="p-6 space-y-6">
              {/* Header */}
              <div className="flex items-start justify-between border-b border-crowd-border/80 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-bold font-display text-crowd-text-primary">
                      {selectedBundle.id}
                    </h2>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-crowd-cyan/15 text-crowd-cyan font-bold border border-crowd-cyan/30">
                      RFC 8785 CANONICAL BUNDLE
                    </span>
                  </div>
                  <p className="text-xs text-crowd-text-secondary mt-1">
                    Agreement: <span className="font-mono text-crowd-text-primary">{selectedBundle.agreement_id}</span>
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <a
                    href={getEvidenceBundleExportUrl(selectedBundle.id)}
                    download={`${selectedBundle.id}.json`}
                    className="btn-secondary text-xs flex items-center gap-1.5 px-3 py-1.5"
                    title="Export canonical JSON"
                  >
                    <Download size={13} />
                    Export JSON
                  </a>
                  <button
                    onClick={() => handleVerifyBundle(selectedBundle.id)}
                    disabled={verifying}
                    className="btn-primary text-xs flex items-center gap-1.5 px-3 py-1.5"
                  >
                    <ShieldCheck size={14} className={verifying ? 'animate-spin' : ''} />
                    {verifying ? 'Verifying...' : 'Verify Bundle'}
                  </button>
                </div>
              </div>

              {/* Cryptographic Bundle Hash */}
              <div className="p-3.5 rounded-xl bg-black/40 border border-crowd-border font-mono space-y-2">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-crowd-text-muted flex items-center gap-1.5 font-bold uppercase tracking-wider">
                    <Hash size={13} className="text-crowd-cyan" />
                    Canonical Bundle SHA-256 Digest
                  </span>
                  <span className="text-[10px] text-crowd-safe">Cryptographically Sealed</span>
                </div>
                <div className="text-xs text-crowd-cyan break-all select-all bg-white/[0.03] p-2 rounded border border-white/[0.05]">
                  {selectedBundle.bundle_hash}
                </div>
              </div>

              {/* Verification Results (8-Point Checklist) */}
              {verificationResult && (
                <div className="p-4 rounded-xl bg-black/50 border border-crowd-border space-y-3 font-mono">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-crowd-text-primary uppercase tracking-wider flex items-center gap-2">
                      <Shield size={15} className="text-crowd-cyan" />
                      Independent 8-Point Verification Result
                    </span>
                    <span className={`text-[11px] font-bold px-2 py-0.5 rounded ${
                      verificationResult.verified
                        ? 'bg-crowd-safe/20 text-crowd-safe'
                        : 'bg-crowd-danger/20 text-crowd-danger'
                    }`}>
                      {verificationResult.verified ? 'ALL CHECKS PASSED' : 'VERIFICATION FAILED'}
                    </span>
                  </div>

                  <div className="space-y-1.5 text-xs">
                    {(verificationResult.checklist || Object.entries(verificationResult.checks || {}).map(([check, passed]) => ({ check, passed, detail: passed ? 'Verified' : 'Verification failed' }))).map((chk, i) => (
                      <div
                        key={i}
                        className={`p-2 rounded flex items-center justify-between ${
                          chk.passed ? 'bg-crowd-safe/[0.03] text-crowd-text-secondary' : 'bg-crowd-danger/[0.08] text-crowd-danger'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          {chk.passed ? (
                            <CheckCircle2 size={14} className="text-crowd-safe" />
                          ) : (
                            <XCircle size={14} className="text-crowd-danger" />
                          )}
                          <span>{chk.check}</span>
                        </div>
                        <span className="text-[11px] text-crowd-text-muted truncate max-w-[200px]" title={chk.detail}>
                          {chk.detail}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Four Pillar Evidence Binding */}
              <div className="space-y-3">
                <span className="text-xs font-mono font-bold text-crowd-text-primary uppercase tracking-wider block">
                  Connected Settlement Artifacts
                </span>

                <div className="grid grid-cols-2 gap-3 font-mono text-xs">
                  <div className="p-3 rounded-lg bg-white/[0.02] border border-crowd-border space-y-1">
                    <span className="text-crowd-text-muted text-[10px] uppercase block">1. Task & Requesting Agent</span>
                    <div className="text-crowd-text-primary font-bold">{selectedBundle.task_id}</div>
                    <div className="text-crowd-text-muted text-[10px]">
                      Agent: {selectedBundle.bundle_content?.requesting_agent_id || 'agent_buyer_sentinel'}
                    </div>
                  </div>

                  <div className="p-3 rounded-lg bg-white/[0.02] border border-crowd-border space-y-1">
                    <span className="text-crowd-text-muted text-[10px] uppercase block">2. Service Agreement Hash</span>
                    <div className="text-crowd-text-primary font-bold">{selectedBundle.agreement_id}</div>
                    <div className="text-crowd-text-muted text-[10px] truncate" title={selectedBundle.bundle_content?.agreement_hash}>
                      Hash: {selectedBundle.bundle_content?.agreement_hash?.substring(0, 16)}...
                    </div>
                  </div>

                  <div className="p-3 rounded-lg bg-white/[0.02] border border-crowd-border space-y-1">
                    <span className="text-crowd-text-muted text-[10px] uppercase block">3. Authorized Mandate</span>
                    <div className="text-crowd-text-primary font-bold">{selectedBundle.mandate_id}</div>
                    <div className="text-crowd-text-muted text-[10px]">
                      Auth: {selectedBundle.bundle_content?.mandate?.authorization_status || 'POLICY_APPROVED'}
                    </div>
                  </div>

                  <div className="p-3 rounded-lg bg-white/[0.02] border border-crowd-border space-y-1">
                    <span className="text-crowd-text-muted text-[10px] uppercase block">4. HSK Chain Settlement</span>
                    <div className="text-crowd-cyan font-bold truncate" title={selectedBundle.transaction_hash || selectedBundle.payment_tx_hash}>
                      {selectedBundle.transaction_hash || selectedBundle.payment_tx_hash}
                    </div>
                    <div className="text-crowd-text-muted text-[10px]">
                      Chain ID: 133 (HSK Testnet)
                    </div>
                  </div>
                </div>
              </div>

              {/* Raw Canonical Content Preview */}
              <div className="space-y-1.5 font-mono">
                <span className="text-[10px] text-crowd-text-muted uppercase font-bold block">
                  Canonical Bundle Contents Preview
                </span>
                <pre className="p-3 rounded-lg bg-black/60 border border-crowd-border text-[11px] text-crowd-text-secondary overflow-x-auto max-h-48">
                  {JSON.stringify(selectedBundle.bundle_content, null, 2)}
                </pre>
              </div>
            </GlassCard>
          ) : (
            <GlassCard className="p-12 text-center text-crowd-text-muted text-xs font-mono">
              Select an evidence bundle to inspect cryptographic proof and run independent verification.
            </GlassCard>
          )}
        </div>
      </div>
    </div>
  );
}
