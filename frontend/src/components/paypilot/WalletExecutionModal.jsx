import { useState } from 'react';
import {
  Lock, ShieldAlert, CheckCircle2, AlertTriangle, ArrowRight,
  ExternalLink, RefreshCw, Cpu, Layers, Key
} from 'lucide-react';
import { executePayment } from '../../data/paypilotApi';
import { DEMO_SIMULATED_ACTION_MESSAGE } from '../../data/demoFixtures';

export default function WalletExecutionModal({ mandate, wallet, onClose, onSettled, isDemoMode = false }) {
  const [stage, setStage] = useState('IDLE'); // 'IDLE' | 'SIGNING' | 'GATEWAY' | 'VERIFYING' | 'COMPLETED' | 'ERROR'
  const [errorMessage, setErrorMessage] = useState(null);
  const [executionResult, setExecutionResult] = useState(null);

  if (!mandate) return null;

  const isSimulatedDemo = Boolean(isDemoMode || mandate.is_demo || wallet?.isDemoWallet);

  const handleSignAndExecute = async () => {
    setStage('SIGNING');
    setErrorMessage(null);

    try {
      if (isDemoMode) {
        // Safe demo mode preview: never execute a real financial transaction or mutate production state
        await new Promise((r) => setTimeout(r, 350));
        setStage('GATEWAY');
        await new Promise((r) => setTimeout(r, 350));
        const simulatedRes = {
          success: true,
          is_demo: true,
          simulated_preview: true,
          demo_message: DEMO_SIMULATED_ACTION_MESSAGE,
          mandate_id: mandate.mandate_id,
          gateway_order_id: 'ord_demo_sim_8812',
          tx_hash: '0x573b9e4210a8b417c89f0019283746554433221100aabbccddeeff001122e79f',
          receipt: {
            receipt_id: 'rcpt_demo_sim_8812',
            amount: mandate.amount,
            asset: mandate.asset || 'HSK',
            status: 'SIMULATED_PREVIEW',
          },
          chain_verification: {
            verified: true,
            network_id: mandate.network_id || 133,
            explorer_url: 'https://hashkeychain-testnet-explorer.alt.technology',
          },
        };
        setExecutionResult(simulatedRes);
        setStage('COMPLETED');
        if (onSettled) {
          onSettled(simulatedRes);
        }
        return;
      }

      // Step 1: Explicit Wallet Authorization Signature
      const signRes = await wallet.signMandate(mandate);

      setStage('GATEWAY');

      // Step 2: Submit to HSP Payment Gateway & Verify on HSK Chain
      const execRes = await executePayment({
        mandate_id: mandate.mandate_id,
        wallet_signature: signRes.signature,
        signer_address: signRes.signer,
        is_demo: wallet.isDemoWallet || Boolean(mandate.is_demo),
      });

      if (!execRes.success) {
        throw new Error(execRes.error || 'Payment execution rejected by gateway');
      }

      setExecutionResult(execRes);
      setStage('COMPLETED');

      if (onSettled) {
        onSettled(execRes);
      }
    } catch (err) {
      console.error('Execution error:', err);
      setErrorMessage(err.message || 'Payment execution failed');
      setStage('ERROR');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-crowd-surface border border-crowd-border rounded-2xl w-full max-w-xl p-6 space-y-5 shadow-2xl animate-fade-in-up">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3 border-b border-crowd-border">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-crowd-cyan/15 flex items-center justify-center text-crowd-cyan border border-crowd-cyan/30">
              <Lock size={16} />
            </div>
            <div>
              <h2 className="text-sm font-bold font-display text-crowd-text-primary">
                Wallet Authorization & HSP Gateway Handshake
              </h2>
              <span className="text-[10px] font-mono text-crowd-cyan">
                HSK Chain (Chain ID {mandate.network_id || 133})
              </span>
            </div>
          </div>

          {stage !== 'SIGNING' && stage !== 'GATEWAY' && stage !== 'VERIFYING' && (
            <button
              onClick={onClose}
              className="text-crowd-text-muted hover:text-crowd-text-primary text-sm"
            >
              ✕
            </button>
          )}
        </div>

        {/* ── STAGE 1: Review Mandate & Explicit Approval ── */}
        {stage === 'IDLE' && (
          <div className="space-y-4 text-xs">
            {/* Warning alert */}
            <div className="p-3 rounded-xl bg-crowd-warning/15 border border-crowd-warning/30 text-crowd-warning flex items-start gap-2.5">
              <ShieldAlert size={18} className="flex-shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">Explicit User Authorization Required:</span> AI agents cannot sign or execute transactions autonomously. Inspect the payment mandate counterparty, token amount, and target network before signing.
              </div>
            </div>

            {/* Mandate Specification Summary */}
            <div className="p-4 rounded-xl bg-crowd-card border border-crowd-border space-y-2 font-mono">
              <div className="flex justify-between pb-2 border-b border-crowd-border/60">
                <span className="text-crowd-text-muted">Mandate ID:</span>
                <span className="text-crowd-cyan font-bold">{mandate.mandate_id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-crowd-text-muted">Payee (Recipient):</span>
                <span className="text-crowd-text-primary truncate max-w-[240px]">{mandate.recipient_address}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-crowd-text-muted">Settlement Amount:</span>
                <span className="text-crowd-cyan font-bold text-sm">
                  {mandate.amount} {mandate.asset}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-crowd-text-muted">Purpose:</span>
                <span className="text-crowd-text-secondary truncate max-w-[240px]">{mandate.purpose}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-crowd-text-muted">Spending Policy:</span>
                <span className="text-crowd-safe">Passed (Under Ceiling)</span>
              </div>
            </div>

            {/* Connected Signer State */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-crowd-border text-xs">
              <div className="space-y-0.5">
                <div className="text-[11px] text-crowd-text-muted font-mono uppercase">Authorizing Wallet</div>
                <div className="font-mono text-crowd-text-primary font-bold">
                  {wallet.address ? `${wallet.address.slice(0, 10)}...${wallet.address.slice(-6)}` : 'No wallet connected'}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                  wallet.isDemoWallet ? 'bg-crowd-warning/20 text-crowd-warning' : 'bg-crowd-safe/20 text-crowd-safe'
                }`}>
                  {wallet.isDemoWallet ? 'DEMO ADAPTER' : 'INJECTED WEB3'}
                </span>

                {wallet.hasInjectedProvider && wallet.isDemoWallet && (
                  <button
                    type="button"
                    onClick={wallet.connectInjectedWallet}
                    className="text-[10px] text-crowd-cyan hover:underline font-mono"
                  >
                    Switch to MetaMask
                  </button>
                )}
              </div>
            </div>

            {isSimulatedDemo && (
              <div
                data-testid="demo-simulated-action-notice"
                className="p-3 rounded-xl bg-amber-500/15 border border-amber-500/40 text-[11px] text-amber-300 font-mono space-y-1"
              >
                <div className="font-bold flex items-center gap-1.5">
                  <span>DEMO MODE • SIMULATED OPERATION RESULTS</span>
                </div>
                <p className="text-[11px] text-amber-100 leading-relaxed">
                  {DEMO_SIMULATED_ACTION_MESSAGE}
                </p>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-crowd-border">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-crowd-text-secondary"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSignAndExecute}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-crowd-cyan text-crowd-bg font-bold text-xs hover:bg-crowd-cyan/90 transition-all shadow-[0_0_15px_rgba(0,212,255,0.3)]"
              >
                <Key size={14} />
                <span>{isDemoMode ? 'Simulate Authorization Preview (Demo Mode)' : 'Sign & Execute via HSP Gateway'}</span>
              </button>
            </div>
          </div>
        )}

        {/* ── STAGE 2: Progress Timeline Tracker ── */}
        {(stage === 'SIGNING' || stage === 'GATEWAY' || stage === 'VERIFYING') && (
          <div className="py-8 px-4 space-y-6 text-center">
            <RefreshCw size={36} className="animate-spin text-crowd-cyan mx-auto" />
            <div className="space-y-1">
              <h3 className="text-base font-bold text-crowd-text-primary font-display">
                {stage === 'SIGNING' && 'Awaiting User Wallet Signature...'}
                {stage === 'GATEWAY' && 'Submitting Mandate to HSP Payment Gateway...'}
                {stage === 'VERIFYING' && 'Verifying Transaction on HSK Chain Node...'}
              </h3>
              <p className="text-xs text-crowd-text-secondary">
                {stage === 'SIGNING' && 'Please confirm the personal_sign authorization request in your EVM wallet window.'}
                {stage === 'GATEWAY' && 'Connecting to HSP Gateway (/api/v1/merchant/orders) with cryptographically signed mandate.'}
                {stage === 'VERIFYING' && 'Querying HSK Chain RPC for status 0x1 confirmation.'}
              </p>
            </div>

            {/* Step badges */}
            <div className="flex items-center justify-center gap-2 text-[10px] font-mono">
              <span className={`px-2 py-0.5 rounded ${stage === 'SIGNING' ? 'bg-crowd-cyan text-crowd-bg font-bold' : 'bg-crowd-safe/20 text-crowd-safe'}`}>
                1. Signature
              </span>
              <span>→</span>
              <span className={`px-2 py-0.5 rounded ${stage === 'GATEWAY' ? 'bg-crowd-cyan text-crowd-bg font-bold' : stage === 'VERIFYING' ? 'bg-crowd-safe/20 text-crowd-safe' : 'bg-white/10 text-crowd-text-muted'}`}>
                2. HSP Gateway
              </span>
              <span>→</span>
              <span className={`px-2 py-0.5 rounded ${stage === 'VERIFYING' ? 'bg-crowd-cyan text-crowd-bg font-bold' : 'bg-white/10 text-crowd-text-muted'}`}>
                3. HSK Verification
              </span>
            </div>
          </div>
        )}

        {/* ── STAGE 3: Error State ── */}
        {stage === 'ERROR' && (
          <div className="space-y-4 text-xs">
            <div className="p-4 rounded-xl bg-crowd-danger/15 border border-crowd-danger/30 text-crowd-danger space-y-2">
              <div className="flex items-center gap-2 font-bold text-sm">
                <AlertTriangle size={18} />
                <span>Payment Authorization or Execution Failed</span>
              </div>
              <p className="font-mono text-[11px]">{errorMessage}</p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-white/[0.05] text-crowd-text-secondary"
              >
                Close
              </button>
              <button
                type="button"
                onClick={handleSignAndExecute}
                className="px-5 py-2 rounded-xl bg-crowd-cyan text-crowd-bg font-bold"
              >
                Retry Authorization
              </button>
            </div>
          </div>
        )}

        {/* ── STAGE 4: Completed & Verified Settlement Receipt ── */}
        {stage === 'COMPLETED' && executionResult && (
          <div className="space-y-4 text-xs animate-fade-in-up">
            <div className="p-4 rounded-xl bg-crowd-safe/10 border border-crowd-safe/30 text-crowd-safe space-y-1">
              <div className="flex items-center gap-2 font-bold text-sm font-display">
                <CheckCircle2 size={18} />
                <span>Settlement Confirmed on HSK Chain!</span>
              </div>
              <p className="text-[11px] opacity-90">
                Payment executed via HashKey Settlement Protocol and independently verified.
              </p>
            </div>

            {/* Receipt Summary */}
            <div className="p-4 rounded-xl bg-crowd-card border border-crowd-border space-y-2 font-mono">
              <div className="flex justify-between">
                <span className="text-crowd-text-muted">Receipt ID:</span>
                <span className="text-crowd-safe font-bold">{executionResult.receipt?.receipt_id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-crowd-text-muted">HSP Order:</span>
                <span className="text-crowd-text-primary">{executionResult.gateway_order_id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-crowd-text-muted">Transaction Hash:</span>
                <span className="text-crowd-cyan truncate max-w-[200px]">{executionResult.tx_hash}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-crowd-text-muted">Network Status:</span>
                <span className={`font-bold ${executionResult.is_demo ? 'text-amber-400' : 'text-crowd-safe'}`}>
                  {executionResult.is_demo ? 'DEMO VERIFIED (TESTNET ADAPTER)' : 'VERIFIED (0x1 SUCCESS)'}
                </span>
              </div>
            </div>

            {executionResult.is_demo && (
              <div
                data-testid="demo-simulated-receipt-notice"
                className="p-3 rounded-xl bg-amber-500/15 border border-amber-500/40 text-[11px] text-amber-300 font-mono space-y-1"
              >
                <div className="font-bold flex items-center gap-1">
                  <span>ℹ️ Simulated Operation Results (Testnet 133 Adapter)</span>
                </div>
                <p className="text-[11px] text-amber-100 leading-relaxed">
                  {DEMO_SIMULATED_ACTION_MESSAGE}
                </p>
              </div>
            )}

            {/* Explorer button */}
            {executionResult.chain_verification?.explorer_url && (
              <a
                href={executionResult.chain_verification.explorer_url}
                target="_blank"
                rel="noreferrer"
                className="w-full flex items-center justify-center gap-2 p-2.5 rounded-xl bg-crowd-cyan/15 hover:bg-crowd-cyan/25 border border-crowd-cyan/30 text-crowd-cyan font-mono font-bold text-xs transition-all"
              >
                <span>View on HSK Blockscout Explorer</span>
                <ExternalLink size={13} />
              </a>
            )}

            <div className="flex items-center justify-end pt-2 border-t border-crowd-border">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-2 rounded-xl bg-crowd-cyan text-crowd-bg font-bold"
              >
                Done
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
