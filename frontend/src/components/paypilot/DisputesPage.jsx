import { useState, useEffect } from 'react';
import {
  AlertTriangle, ShieldAlert, CheckCircle2, RefreshCw, PlusCircle,
  Clock, ArrowRight, XCircle, Search, HelpCircle, RotateCcw
} from 'lucide-react';
import {
  fetchIncidents,
  createIncident,
  updateIncidentStatus,
  checkSafeRetry,
  fetchMandates
} from '../../data/paypilotApi';
import GlassCard from '../shared/GlassCard';

export default function DisputesPage() {
  const [incidents, setIncidents] = useState([]);
  const [mandates, setMandates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedIncident, setSelectedIncident] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [retryCheckResult, setRetryCheckResult] = useState(null);
  const [checkingRetry, setCheckingRetry] = useState(false);
  const [notification, setNotification] = useState(null);
  const [updating, setUpdating] = useState(false);

  const [formData, setFormData] = useState({
    mandate_id: '',
    incident_type: 'PROVIDER_TIMEOUT',
    description: 'Service provider failed to provide deliverables within SLA timeout window.',
    evidence_notes: 'Telecom QoS probe logged packet loss exceeding 50% SLA threshold.'
  });

  const loadData = async () => {
    try {
      const [incRes, mandRes] = await Promise.all([
        fetchIncidents(),
        fetchMandates()
      ]);
      setIncidents(incRes.incidents || []);
      setMandates(mandRes.mandates || []);
      if (incRes.incidents && incRes.incidents.length > 0 && !selectedIncident) {
        setSelectedIncident(incRes.incidents[0]);
      }
    } catch (err) {
      console.error('Failed to load incidents:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSafeRetryCheck = async (mandateId) => {
    if (!mandateId) return;
    setCheckingRetry(true);
    setRetryCheckResult(null);
    try {
      const res = await checkSafeRetry(mandateId);
      setRetryCheckResult(res);
    } catch (err) {
      setRetryCheckResult({
        can_retry_safely: false,
        reason: err.message
      });
    } finally {
      setCheckingRetry(false);
    }
  };

  const handleUpdateStatus = async (incidentId, newStatus) => {
    setUpdating(true);
    try {
      await updateIncidentStatus(
        incidentId,
        newStatus,
        `Status set to ${newStatus} by admin operator via UI console`,
        'admin_operator'
      );
      setNotification({
        type: 'success',
        text: `Incident ${incidentId} updated to ${newStatus}`
      });
      await loadData();
    } catch (err) {
      setNotification({ type: 'error', text: err.message });
    } finally {
      setUpdating(false);
      setTimeout(() => setNotification(null), 4000);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await createIncident({
        ...formData,
        detection_reason: formData.description || formData.detection_reason || 'Manual incident reported',
        severity: 'MEDIUM'
      });
      setShowCreateModal(false);
      setNotification({
        type: 'success',
        text: 'New payment incident recorded and timeline initialized.'
      });
      await loadData();
    } catch (err) {
      setNotification({ type: 'error', text: err.message });
    } finally {
      setTimeout(() => setNotification(null), 5000);
    }
  };

  return (
    <div className="space-y-6">
      {/* ── Notification Banner ── */}
      {notification && (
        <div className={`p-4 rounded-xl border flex items-center justify-between ${
          notification.type === 'success'
            ? 'bg-crowd-safe/15 border-crowd-safe/40 text-crowd-safe'
            : 'bg-crowd-danger/15 border-crowd-danger/40 text-crowd-danger'
        }`}>
          <div className="flex items-center gap-2">
            {notification.type === 'success' ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
            <span className="text-sm font-medium">{notification.text}</span>
          </div>
          <button onClick={() => setNotification(null)} className="text-xs hover:opacity-75">Dismiss</button>
        </div>
      )}

      {/* ── Page Header ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold font-display text-crowd-text-primary flex items-center gap-2">
            <AlertTriangle className="text-crowd-danger" size={24} />
            Payment Incidents, Disputes & Safe Recovery
          </h1>
          <p className="text-xs text-crowd-text-muted mt-1">
            Structured incident ledger for failed transactions, timeout handling, SLA breaches, and idempotent safe retry checks.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowCreateModal(true)}
            className="btn-primary text-xs flex items-center gap-2 px-3 py-2"
          >
            <PlusCircle size={15} />
            Report Incident
          </button>
          <button
            onClick={loadData}
            className="p-2 rounded-lg bg-crowd-surface border border-crowd-border hover:border-crowd-cyan text-crowd-text-secondary"
            title="Refresh Incidents"
          >
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* ── Main Layout ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Incidents List (5 cols) */}
        <div className="lg:col-span-5 space-y-3">
          <div className="text-xs font-mono uppercase tracking-wider text-crowd-text-muted px-1 flex items-center justify-between">
            <span>Incident Ledger ({incidents.length})</span>
            <span className="text-[10px] text-crowd-danger">State Tracked</span>
          </div>

          {incidents.length === 0 ? (
            <GlassCard className="p-8 text-center text-crowd-text-muted text-xs font-mono">
              No active payment incidents or disputes recorded.
            </GlassCard>
          ) : (
            incidents.map((inc) => {
              const isSelected = selectedIncident?.id === inc.id;

              return (
                <GlassCard
                  key={inc.id}
                  onClick={() => {
                    setSelectedIncident(inc);
                    setRetryCheckResult(null);
                  }}
                  className={`cursor-pointer transition-all ${
                    isSelected
                      ? 'border-crowd-danger/50 shadow-[0_0_15px_rgba(255,59,92,0.12)]'
                      : 'hover:border-crowd-border/80'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-xs text-crowd-text-primary">
                          {inc.id}
                        </span>
                        <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold ${
                          inc.status === 'CLOSED'
                            ? 'bg-white/10 text-crowd-text-muted'
                            : inc.status === 'REFUNDED'
                            ? 'bg-crowd-safe/20 text-crowd-safe'
                            : inc.status === 'INVESTIGATING'
                            ? 'bg-crowd-warning/20 text-crowd-warning'
                            : 'bg-crowd-danger/20 text-crowd-danger'
                        }`}>
                          {inc.status}
                        </span>
                      </div>
                      <p className="text-xs font-mono text-crowd-text-secondary mt-1">
                        Type: <span className="text-crowd-danger font-bold">{inc.incident_type}</span>
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-mono text-crowd-text-muted block">
                        Mandate: {inc.mandate_id}
                      </span>
                    </div>
                  </div>

                  <p className="mt-2 text-xs text-crowd-text-muted line-clamp-2">
                    {inc.detection_reason || inc.description}
                  </p>
                </GlassCard>
              );
            })
          )}
        </div>

        {/* Right: Selected Incident Detail & Safe Retry Action (7 cols) */}
        <div className="lg:col-span-7">
          {selectedIncident ? (
            <GlassCard className="p-6 space-y-6">
              {/* Header */}
              <div className="flex items-start justify-between border-b border-crowd-border/80 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-bold font-display text-crowd-text-primary">
                      {selectedIncident.id}
                    </h2>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-crowd-danger/15 text-crowd-danger font-bold border border-crowd-danger/30">
                      {selectedIncident.incident_type}
                    </span>
                  </div>
                  <p className="text-xs text-crowd-text-secondary mt-1 font-mono">
                    Mandate: <span className="text-crowd-text-primary font-bold">{selectedIncident.mandate_id}</span>
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleSafeRetryCheck(selectedIncident.mandate_id)}
                    disabled={checkingRetry}
                    className="btn-secondary text-xs flex items-center gap-1.5 px-3 py-1.5 font-mono"
                  >
                    <RotateCcw size={13} className={checkingRetry ? 'animate-spin' : ''} />
                    {checkingRetry ? 'Checking...' : 'Safe Retry Check'}
                  </button>
                </div>
              </div>

              {/* Safe Retry Check Result Banner */}
              {retryCheckResult && (
                <div className={`p-3.5 rounded-xl border font-mono text-xs space-y-1.5 ${
                  retryCheckResult.can_retry_safely
                    ? 'bg-crowd-safe/10 border-crowd-safe/30 text-crowd-safe'
                    : 'bg-crowd-danger/10 border-crowd-danger/30 text-crowd-danger'
                }`}>
                  <div className="flex items-center justify-between">
                    <span className="font-bold flex items-center gap-1.5">
                      {retryCheckResult.can_retry_safely ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
                      Safe Retry Status: {retryCheckResult.can_retry_safely ? 'PERMITTED' : 'BLOCKED'}
                    </span>
                    <span className="text-[10px] uppercase font-bold">Idempotency Guard</span>
                  </div>
                  <p className="text-[11px] text-crowd-text-secondary">
                    {retryCheckResult.reason}
                  </p>
                </div>
              )}

              {/* Incident Details Grid */}
              <div className="grid grid-cols-2 gap-3 font-mono text-xs">
                <div className="p-3 rounded-lg bg-white/[0.02] border border-crowd-border">
                  <span className="text-crowd-text-muted text-[10px] uppercase block">Current Lifecycle</span>
                  <span className="text-crowd-text-primary font-bold">{selectedIncident.status}</span>
                </div>
                <div className="p-3 rounded-lg bg-white/[0.02] border border-crowd-border">
                  <span className="text-crowd-text-muted text-[10px] uppercase block">Created Timestamp</span>
                  <span className="text-crowd-text-primary font-bold">
                    {selectedIncident.created_at ? (typeof selectedIncident.created_at === 'number' ? new Date(selectedIncident.created_at * 1000).toLocaleString() : new Date(selectedIncident.created_at).toLocaleString()) : 'N/A'}
                  </span>
                </div>
              </div>

              {/* Description & Evidence */}
              <div className="space-y-3 font-mono text-xs">
                <div className="p-3 rounded-lg bg-black/40 border border-crowd-border space-y-1">
                  <span className="text-crowd-text-muted text-[10px] uppercase font-bold block">
                    Incident Description
                  </span>
                  <p className="text-crowd-text-primary text-xs leading-relaxed">
                    {selectedIncident.detection_reason || selectedIncident.description}
                  </p>
                </div>

                {selectedIncident.evidence_notes && (
                  <div className="p-3 rounded-lg bg-black/40 border border-crowd-border space-y-1">
                    <span className="text-crowd-text-muted text-[10px] uppercase font-bold block">
                      Supporting Telemetry / Evidence Notes
                    </span>
                    <p className="text-crowd-text-secondary text-xs leading-relaxed">
                      {selectedIncident.evidence_notes}
                    </p>
                  </div>
                )}
              </div>

              {/* Lifecycle Actions */}
              <div className="pt-3 border-t border-crowd-border space-y-2">
                <span className="text-[10px] font-mono uppercase font-bold text-crowd-text-muted block">
                  Operator Incident Resolution Actions
                </span>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => handleUpdateStatus(selectedIncident.id, 'INVESTIGATING')}
                    disabled={updating}
                    className="btn-secondary text-xs px-3 py-1.5 font-mono"
                  >
                    Mark Investigating
                  </button>
                  <button
                    onClick={() => handleUpdateStatus(selectedIncident.id, 'REFUNDED')}
                    disabled={updating}
                    className="btn-secondary text-xs px-3 py-1.5 font-mono text-crowd-safe border-crowd-safe/30 hover:border-crowd-safe"
                  >
                    Mark Refunded
                  </button>
                  <button
                    onClick={() => handleUpdateStatus(selectedIncident.id, 'CLOSED')}
                    disabled={updating}
                    className="btn-secondary text-xs px-3 py-1.5 font-mono text-crowd-text-muted"
                  >
                    Close Incident
                  </button>
                </div>
              </div>
            </GlassCard>
          ) : (
            <GlassCard className="p-12 text-center text-crowd-text-muted text-xs font-mono">
              Select an incident from the ledger to view details and execute safe idempotency checks.
            </GlassCard>
          )}
        </div>
      </div>

      {/* ── Report Incident Modal ── */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-crowd-surface border border-crowd-border rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-crowd-border pb-3">
              <h2 className="text-base font-bold font-display text-crowd-text-primary flex items-center gap-2">
                <AlertTriangle size={18} className="text-crowd-danger" />
                Report Payment Incident / SLA Breach
              </h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-crowd-text-muted hover:text-crowd-text-primary text-xs font-mono"
              >
                Cancel
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4 text-xs font-mono">
              <div>
                <label className="text-crowd-text-secondary block mb-1">Target Mandate ID</label>
                <select
                  value={formData.mandate_id}
                  onChange={(e) => setFormData({ ...formData, mandate_id: e.target.value })}
                  className="w-full bg-black/40 border border-crowd-border rounded-lg p-2 text-crowd-text-primary font-mono text-xs"
                  required
                >
                  <option value="" disabled>Select related mandate</option>
                  {mandates.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.id} — {m.amount} {m.asset} ({m.execution_status})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-crowd-text-secondary block mb-1">Incident Type</label>
                <select
                  value={formData.incident_type}
                  onChange={(e) => setFormData({ ...formData, incident_type: e.target.value })}
                  className="w-full bg-black/40 border border-crowd-border rounded-lg p-2 text-crowd-text-primary font-mono text-xs"
                  required
                >
                  <option value="PROVIDER_TIMEOUT">PROVIDER_TIMEOUT (SLA window exceeded)</option>
                  <option value="REVERTED_ON_CHAIN">REVERTED_ON_CHAIN (Smart contract revert)</option>
                  <option value="DELIVERABLE_BREACH">DELIVERABLE_BREACH (QoS telemetry failed)</option>
                  <option value="AMOUNT_MISMATCH">AMOUNT_MISMATCH (Discrepancy with agreement)</option>
                  <option value="GATEWAY_ERROR">GATEWAY_ERROR (HSP gateway communication error)</option>
                </select>
              </div>

              <div>
                <label className="text-crowd-text-secondary block mb-1">Description</label>
                <textarea
                  rows={2}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full bg-black/40 border border-crowd-border rounded-lg p-2 text-crowd-text-primary font-mono text-xs"
                  required
                />
              </div>

              <div>
                <label className="text-crowd-text-secondary block mb-1">Evidence / Probe Notes</label>
                <textarea
                  rows={2}
                  value={formData.evidence_notes}
                  onChange={(e) => setFormData({ ...formData, evidence_notes: e.target.value })}
                  className="w-full bg-black/40 border border-crowd-border rounded-lg p-2 text-crowd-text-primary font-mono text-xs"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-3 border-t border-crowd-border">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-lg bg-white/[0.04] text-crowd-text-secondary hover:text-crowd-text-primary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary px-4 py-2 flex items-center gap-2"
                >
                  Record Incident
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
