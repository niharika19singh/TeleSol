import { useState, useEffect } from 'react';
import {
  ShieldCheck, RefreshCw, AlertTriangle, CheckCircle2,
  Lock, Key, FileText, Database, ShieldAlert
} from 'lucide-react';
import { fetchAuditTrail } from '../../data/paypilotApi';
import GlassCard from '../shared/GlassCard';

export default function AuditTrailPage() {
  const [logs, setLogs] = useState([]);
  const [integrity, setIntegrity] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadLogs = async () => {
    try {
      const res = await fetchAuditTrail(60);
      setLogs(res.audit_logs || []);
      setIntegrity(res.chain_integrity || null);
    } catch (err) {
      console.error('Failed to load audit trail:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, []);

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold font-display text-crowd-text-primary flex items-center gap-2">
            <ShieldCheck size={22} className="text-crowd-safe" />
            Tamper-Evident Cryptographic Audit Trail
          </h1>
          <p className="text-xs text-crowd-text-secondary mt-1">
            Every state transition, policy decision, wallet signature, and gateway response is hashed in a SHA-256 cryptographic chain.
          </p>
        </div>

        <button
          onClick={loadLogs}
          disabled={loading}
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-crowd-card hover:bg-white/[0.05] border border-crowd-border text-crowd-text-primary text-xs font-mono transition-all"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          <span>Verify Integrity</span>
        </button>
      </div>

      {/* ── Integrity Verification Banner ── */}
      {integrity && (
        <div className={`p-4 rounded-xl border flex items-center justify-between gap-4 ${
          integrity.is_valid
            ? 'bg-crowd-safe/10 border-crowd-safe/30 text-crowd-safe'
            : 'bg-crowd-danger/10 border-crowd-danger/30 text-crowd-danger'
        }`}>
          <div className="flex items-center gap-3">
            {integrity.is_valid ? <CheckCircle2 size={22} /> : <AlertTriangle size={22} />}
            <div>
              <div className="text-sm font-bold font-mono">
                {integrity.is_valid
                  ? 'SHA-256 HASH CHAIN: CRYPTOGRAPHICALLY VERIFIED INTACT'
                  : 'INTEGRITY BREACH DETECTED: CHAIN BROKEN'}
              </div>
              <div className="text-[11px] opacity-80 font-mono">
                {integrity.is_valid
                  ? `All ${integrity.total_records_verified} sequential records verified without any modifications.`
                  : integrity.error}
              </div>
            </div>
          </div>

          <span className="px-2.5 py-1 text-[10px] font-mono font-bold rounded uppercase bg-black/30 border border-current">
            {integrity.is_valid ? '100% VALID' : 'TAMPERED'}
          </span>
        </div>
      )}

      {/* ── Security Invariant Explanation ── */}
      <GlassCard className="p-4 text-xs text-crowd-text-secondary space-y-1.5 font-mono">
        <div className="text-crowd-text-primary font-bold flex items-center gap-1.5">
          <Lock size={14} className="text-crowd-cyan" />
          <span>Audit Security Invariants & Redaction Controls</span>
        </div>
        <p className="text-[11px] leading-relaxed">
          1. <strong>Deterministic Hash Chaining:</strong> Record <code>H[n] = SHA256(H[n-1] || EventType || Actor || Entity || Action || Details || Timestamp)</code>.
          <br />
          2. <strong>Credential Redaction:</strong> Private keys, bearer tokens, and gateway secrets are strictly redacted before serialization.
          <br />
          3. <strong>Immutable Settlement Attestation:</strong> Audit logs provide verifiable provenance for Hackathon judges and compliance nodes on HSK Chain.
        </p>
      </GlassCard>

      {/* ── Logs Ledger Table ── */}
      <GlassCard className="overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center p-12 text-crowd-text-muted">
            <RefreshCw size={20} className="animate-spin text-crowd-cyan mr-2" />
            <span className="text-sm font-mono">Verifying audit chain...</span>
          </div>
        ) : logs.length === 0 ? (
          <div className="p-8 text-center text-sm text-crowd-text-secondary">
            No audit records found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-crowd-border bg-white/[0.02] text-crowd-text-muted font-mono uppercase text-[10px]">
                  <th className="py-2.5 px-3">#</th>
                  <th className="py-2.5 px-3">Event Type</th>
                  <th className="py-2.5 px-3">Actor</th>
                  <th className="py-2.5 px-3">Entity & Action</th>
                  <th className="py-2.5 px-3">Cryptographic SHA-256 Digest</th>
                  <th className="py-2.5 px-3 text-right">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-crowd-border/60">
                {logs.map((log) => {
                  let parsedDetails = {};
                  try {
                    parsedDetails = JSON.parse(log.details || '{}');
                  } catch (e) {
                    parsedDetails = {};
                  }

                  return (
                    <tr key={log.id} className="hover:bg-white/[0.02] transition-colors font-mono">
                      <td className="py-3 px-3 text-crowd-text-muted text-[10px]">
                        {log.id}
                      </td>
                      <td className="py-3 px-3">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-crowd-cyan/15 text-crowd-cyan border border-crowd-cyan/30">
                          {log.event_type}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-crowd-text-primary text-[11px] truncate max-w-[120px]">
                        {log.actor}
                      </td>
                      <td className="py-3 px-3 text-[11px]">
                        <div className="text-crowd-text-primary font-bold">{log.action}</div>
                        <div className="text-[10px] text-crowd-text-muted">{log.entity_type}: {log.entity_id}</div>
                      </td>
                      <td className="py-3 px-3">
                        <div className="text-[10px] text-crowd-safe truncate max-w-[180px]" title={log.current_hash}>
                          Current: {log.current_hash}
                        </div>
                        <div className="text-[9px] text-crowd-text-muted truncate max-w-[180px]" title={log.previous_hash}>
                          Prev: {log.previous_hash}
                        </div>
                      </td>
                      <td className="py-3 px-3 text-right text-crowd-text-muted text-[10px]">
                        {new Date(log.timestamp).toLocaleTimeString()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </GlassCard>
    </div>
  );
}
