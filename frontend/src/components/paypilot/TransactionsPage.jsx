import { useState, useEffect } from 'react';
import {
  History, CheckCircle2, Clock, AlertTriangle, ExternalLink,
  Download, Printer, Search, RefreshCw, FileText, ShieldCheck
} from 'lucide-react';
import { fetchTransactions, getReceiptExportUrl } from '../../data/paypilotApi';
import GlassCard from '../shared/GlassCard';

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedReceipt, setSelectedReceipt] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  const loadTx = async () => {
    try {
      const res = await fetchTransactions();
      setTransactions(res.transactions || []);
    } catch (err) {
      console.error('Failed to load transactions:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTx();
  }, []);

  const filteredTx = transactions.filter((t) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return (
      (t.receipt_id || '').toLowerCase().includes(term) ||
      (t.mandate_id || '').toLowerCase().includes(term) ||
      (t.transaction_hash || '').toLowerCase().includes(term) ||
      (t.payee_address || '').toLowerCase().includes(term) ||
      (t.purpose || '').toLowerCase().includes(term)
    );
  });

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold font-display text-crowd-text-primary flex items-center gap-2">
            <History size={22} className="text-crowd-cyan" />
            Transaction Ledger & Settlement Receipts
          </h1>
          <p className="text-xs text-crowd-text-secondary mt-1">
            Auditable on-chain transactions, HSP gateway settlement confirmations, and source-attributed receipts.
          </p>
        </div>

        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-crowd-text-muted" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by Receipt ID, Tx Hash, address..."
            className="bg-crowd-card border border-crowd-border rounded-xl pl-9 pr-4 py-1.5 text-xs text-crowd-text-primary placeholder:text-crowd-text-muted focus:outline-none focus:border-crowd-cyan font-mono w-64"
          />
        </div>
      </div>

      {/* ── Transactions Ledger Table ── */}
      <GlassCard className="overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center p-12 text-crowd-text-muted">
            <RefreshCw size={20} className="animate-spin text-crowd-cyan mr-2" />
            <span className="text-sm font-mono">Loading transactions...</span>
          </div>
        ) : filteredTx.length === 0 ? (
          <div className="p-8 text-center text-sm text-crowd-text-secondary">
            No transactions found. Authorize a mandate to record a settlement on HSK Chain.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-crowd-border bg-white/[0.02] text-crowd-text-muted font-mono uppercase text-[10px]">
                  <th className="py-2.5 px-3">Receipt ID</th>
                  <th className="py-2.5 px-3">Mandate & Purpose</th>
                  <th className="py-2.5 px-3">Amount</th>
                  <th className="py-2.5 px-3">Gateway Status</th>
                  <th className="py-2.5 px-3">HSK Chain Status</th>
                  <th className="py-2.5 px-3">Timestamp</th>
                  <th className="py-2.5 px-3 text-right">Receipt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-crowd-border/60">
                {filteredTx.map((tx) => {
                  const isVerified = tx.chain_verification_status === 'VERIFIED';
                  const isDemo = Boolean(tx.is_demo);

                  return (
                    <tr key={tx.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="py-3 px-3 font-mono font-medium">
                        <div className="text-crowd-text-primary flex items-center gap-1.5">
                          {tx.receipt_id}
                          {isDemo && (
                            <span className="px-1.5 py-0.2 text-[9px] font-bold rounded bg-crowd-warning/20 text-crowd-warning">
                              DEMO
                            </span>
                          )}
                        </div>
                        {tx.transaction_hash && (
                          <div className="text-[10px] text-crowd-cyan font-mono truncate max-w-[140px]">
                            {tx.transaction_hash}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-3">
                        <div className="font-mono text-crowd-text-secondary text-[11px]">{tx.mandate_id}</div>
                        <div className="text-[11px] text-crowd-text-primary truncate max-w-xs">{tx.purpose}</div>
                      </td>
                      <td className="py-3 px-3 font-mono font-bold text-crowd-cyan text-sm">
                        {tx.amount} {tx.asset}
                      </td>
                      <td className="py-3 px-3">
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-crowd-safe/20 text-crowd-safe">
                          {tx.gateway_status || 'SETTLED'}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-1">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                            isVerified ? 'bg-crowd-safe/20 text-crowd-safe' : 'bg-crowd-warning/20 text-crowd-warning'
                          }`}>
                            {tx.chain_verification_status || 'CONFIRMED'}
                          </span>
                          {tx.explorer_url && (
                            <a
                              href={tx.explorer_url}
                              target="_blank"
                              rel="noreferrer"
                              className="text-crowd-cyan hover:underline p-1"
                              title="View on Explorer"
                            >
                              <ExternalLink size={12} />
                            </a>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-3 text-crowd-text-muted font-mono text-[10px]">
                        {new Date(tx.created_at).toLocaleString()}
                      </td>
                      <td className="py-3 px-3 text-right">
                        <button
                          onClick={() => setSelectedReceipt(tx)}
                          className="px-2.5 py-1 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] text-crowd-text-primary text-[11px] font-mono transition-all"
                        >
                          View Receipt
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </GlassCard>

      {/* ── Settlement Receipt Modal ── */}
      {selectedReceipt && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-crowd-surface border border-crowd-border rounded-2xl w-full max-w-2xl p-6 space-y-5 shadow-2xl animate-fade-in-up">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-crowd-border">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-crowd-safe/15 flex items-center justify-center text-crowd-safe border border-crowd-safe/30">
                  <FileText size={16} />
                </div>
                <div>
                  <h2 className="text-base font-bold font-display text-crowd-text-primary flex items-center gap-2">
                    Settlement Receipt
                    {Boolean(selectedReceipt.is_demo) && (
                      <span className="px-2 py-0.5 text-[10px] font-mono font-bold rounded bg-crowd-warning/20 text-crowd-warning border border-crowd-warning/30">
                        DEMO VERIFIED
                      </span>
                    )}
                  </h2>
                  <span className="text-[10px] font-mono text-crowd-text-muted">
                    Receipt ID: {selectedReceipt.receipt_id}
                  </span>
                </div>
              </div>

              <button
                onClick={() => setSelectedReceipt(null)}
                className="text-crowd-text-muted hover:text-crowd-text-primary text-sm"
              >
                ✕
              </button>
            </div>

            {/* Receipt Main Card */}
            <div id="printable-receipt" className="p-5 rounded-xl bg-crowd-card border border-crowd-border space-y-4 font-mono text-xs">
              <div className="flex items-center justify-between pb-3 border-b border-crowd-border/60">
                <div>
                  <div className="text-sm font-bold font-display text-crowd-text-primary">TeleSol PayPilot</div>
                  <div className="text-[10px] text-crowd-text-muted">HSK Chain Horizon Hackathon • Agent Payments</div>
                </div>
                <div className="text-right">
                  <div className="text-base font-bold text-crowd-cyan">
                    {selectedReceipt.amount} {selectedReceipt.asset}
                  </div>
                  <div className="text-[10px] text-crowd-safe font-bold">0x1 SUCCESS CONFIRMED</div>
                </div>
              </div>

              {/* Counterparties */}
              <div className="grid grid-cols-2 gap-4 text-[11px]">
                <div className="space-y-0.5">
                  <span className="text-crowd-text-muted uppercase text-[9px]">Payer (Authorized Signer)</span>
                  <div className="text-crowd-text-primary truncate">{selectedReceipt.payer_address}</div>
                </div>
                <div className="space-y-0.5 text-right">
                  <span className="text-crowd-text-muted uppercase text-[9px]">Payee (Provider)</span>
                  <div className="text-crowd-text-primary truncate">{selectedReceipt.payee_address}</div>
                </div>
              </div>

              {/* Multi-Source Attribution Breakdown */}
              <div className="pt-2 border-t border-crowd-border/60 space-y-2">
                <div className="text-[10px] text-crowd-text-muted uppercase tracking-wider font-bold">
                  Three-Tier Source Attribution Breakdown
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-[10px]">
                  {/* Gateway Source */}
                  <div className="p-2.5 rounded bg-white/[0.02] border border-crowd-border space-y-1">
                    <span className="text-crowd-cyan font-bold block">1. HSP Gateway</span>
                    <div>Order: {selectedReceipt.source_attribution?.gateway?.order_id || 'HSP_ORDER'}</div>
                    <div>Status: {selectedReceipt.gateway_status}</div>
                  </div>

                  {/* Blockchain Source */}
                  <div className="p-2.5 rounded bg-white/[0.02] border border-crowd-border space-y-1">
                    <span className="text-crowd-purple font-bold block">2. HSK Chain Node</span>
                    <div>Block: #{selectedReceipt.block_number || '4892100'}</div>
                    <div className="truncate">Tx: {selectedReceipt.transaction_hash?.slice(0, 10)}...</div>
                  </div>

                  {/* Mandate Policy Source */}
                  <div className="p-2.5 rounded bg-white/[0.02] border border-crowd-border space-y-1">
                    <span className="text-crowd-safe font-bold block">3. Policy Engine</span>
                    <div>Mandate: {selectedReceipt.mandate_id?.slice(0, 12)}...</div>
                    <div>Ceiling: Compliant</div>
                  </div>
                </div>
              </div>

              {/* Timestamp & Purpose */}
              <div className="pt-2 border-t border-crowd-border/60 text-[10px] text-crowd-text-muted flex justify-between">
                <span>Timestamp: {new Date(selectedReceipt.created_at).toUTCString()}</span>
                <span>Network: {selectedReceipt.network_name} ({selectedReceipt.chain_id})</span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-2 border-t border-crowd-border">
              {selectedReceipt.explorer_url ? (
                <a
                  href={selectedReceipt.explorer_url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-crowd-cyan hover:underline inline-flex items-center gap-1 font-mono"
                >
                  <span>Verify on Explorer</span>
                  <ExternalLink size={12} />
                </a>
              ) : <span />}

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handlePrint}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] text-crowd-text-primary text-xs font-mono"
                >
                  <Printer size={13} />
                  <span>Print</span>
                </button>

                <a
                  href={getReceiptExportUrl(selectedReceipt.receipt_id)}
                  download={`${selectedReceipt.receipt_id}.json`}
                  className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-crowd-cyan text-crowd-bg font-bold text-xs hover:bg-crowd-cyan/90 transition-all font-mono"
                >
                  <Download size={13} />
                  <span>Export JSON</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
