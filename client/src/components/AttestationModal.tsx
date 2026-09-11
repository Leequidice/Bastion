import React from "react";
import { X, Cpu, ShieldCheck, ExternalLink, Code2 } from "lucide-react";
import { CREDITCOIN_TESTNET, SOURCE_CHAINS, COLOSSI_ARCHETYPES } from "../lib/constants";
import { calculateVerificationCost } from "../lib/attestationHelper";
import { RealIncursionResult } from "../lib/attestcoinClient";

interface AttestationModalProps {
  isOpen: boolean;
  onClose: () => void;
  latestPayload: RealIncursionResult | null;
}

export const AttestationModal: React.FC<AttestationModalProps> = ({
  isOpen,
  onClose,
  latestPayload,
}) => {
  if (!isOpen) return null;

  const cost = calculateVerificationCost(latestPayload?.continuityProof.roots.length || 2);
  const archetypeName = latestPayload ? COLOSSI_ARCHETYPES[latestPayload.archetype]?.name : null;

  return (
    <div className="fixed inset-0 z-50 bg-dark-deep/85 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="panel-parchment rounded-md w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-rule flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-sm border border-accent-500 flex items-center justify-center text-accent-700">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-display text-ink flex items-center gap-2">
                Attestcoin Protocol Inspector
                <span className="text-[10px] border border-accent-500/50 text-accent-700 px-2 py-0.5 rounded-sm font-mono">
                  0x0FD2
                </span>
              </h2>
              <p className="text-xs text-ink-faint italic">
                Native Cryptographic Verification Telemetry &amp; Circuit Prover
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-ink-faint hover:text-ink transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-5 text-xs">
          {/* Architectural Overview Alert */}
          <div className="p-4 rounded-sm border border-accent-500/40 flex flex-col gap-2 bg-accent-300/10">
            <div className="flex items-center gap-2 text-accent-700 font-semibold text-sm">
              <ShieldCheck className="w-4 h-4 text-accent-700" />
              <span>Why Attestcoin is Load-Bearing in Bastion:</span>
            </div>
            <p className="text-ink-soft leading-relaxed">
              Every "Sound the Horn" click reads the latest checkpoint Creditcoin has actually attested from
              Ethereum Sepolia, fetches a real Merkle + continuity proof for a transaction in it from the
              Attestcoin prover, and submits that proof on-chain to <strong className="text-accent-700">BastionIncursionEngine</strong>.
              The contract verifies it against the real <strong className="text-accent-700">Block Prover Precompile (0x0FD2)</strong>{" "}
              and derives this wave's Colossus archetype, severity, HP, and siege power directly from that
              verified data — the numbers below came from the transaction linked underneath, not from this UI.
            </p>
          </div>

          {/* Verification Metrics Grid */}
          <div className="grid grid-cols-3 gap-3 font-mono">
            <div className="border border-rule p-3 rounded-sm">
              <span className="text-ink-faint text-[10px] block uppercase">Verifier Address</span>
              <span className="text-accent-700 font-bold text-xs truncate block">
                {CREDITCOIN_TESTNET.precompileVerifier}
              </span>
            </div>
            <div className="border border-rule p-3 rounded-sm">
              <span className="text-ink-faint text-[10px] block uppercase">Verification Latency</span>
              <span className="text-ink font-bold text-xs">
                {cost.latencyBlocks} Block (~15s)
              </span>
            </div>
            <div className="border border-rule p-3 rounded-sm">
              <span className="text-ink-faint text-[10px] block uppercase">Formula Gas Cost</span>
              <span className="text-[#7a5a11] font-bold text-xs">
                {cost.ctcCost} ({cost.usdEstimate})
              </span>
            </div>
          </div>

          {latestPayload ? (
            <>
              {/* Derived Colossus */}
              <div className="grid grid-cols-2 gap-3 font-mono">
                <div className="border border-rule p-3 rounded-sm">
                  <span className="text-ink-faint text-[10px] block uppercase">Derived Colossus</span>
                  <span className="text-blood font-bold text-sm">
                    {archetypeName ?? `Archetype ${latestPayload.archetype}`} — Severity {latestPayload.severity}/5
                  </span>
                </div>
                <div className="border border-rule p-3 rounded-sm">
                  <span className="text-ink-faint text-[10px] block uppercase">HP / Siege Power</span>
                  <span className="text-ink font-bold text-sm">
                    {latestPayload.hp.toLocaleString()} HP · {latestPayload.siegePower} DMG
                  </span>
                </div>
              </div>

              {/* Real on-chain links */}
              <div className="flex flex-col gap-2">
                <span className="text-xs font-semibold text-ink uppercase tracking-wider flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-accent-700" />
                  On-Chain Proof — Verifiable Right Now
                </span>
                <div className="border border-rule rounded-sm p-3 flex flex-col gap-2 font-mono text-[11px]">
                  <a
                    href={`${SOURCE_CHAINS.SEPOLIA.explorer}/tx/${latestPayload.sourceTxHash}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-accent-700 hover:text-accent-900 flex items-center gap-1 truncate"
                  >
                    <span className="text-ink-faint shrink-0">Source ({SOURCE_CHAINS.SEPOLIA.name}) tx:</span>
                    <span className="truncate">{latestPayload.sourceTxHash}</span>
                    <ExternalLink className="w-3 h-3 shrink-0" />
                  </a>
                  <a
                    href={`${CREDITCOIN_TESTNET.blockExplorerUrl}/tx/${latestPayload.verificationTxHash}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-accent-700 hover:text-accent-900 flex items-center gap-1 truncate"
                  >
                    <span className="text-ink-faint shrink-0">Creditcoin verification tx:</span>
                    <span className="truncate">{latestPayload.verificationTxHash}</span>
                    <ExternalLink className="w-3 h-3 shrink-0" />
                  </a>
                  <span className="text-ink-faint">
                    Sepolia block #{latestPayload.sourceBlockHeight.toLocaleString()} · Incursion #{latestPayload.incursionId} · txKey {latestPayload.txKey.slice(0, 10)}…
                    {latestPayload.cached ? " · proof served from prover cache" : " · freshly generated proof"}
                  </span>
                </div>
              </div>

              {/* Cryptographic Payload Display */}
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-ink uppercase tracking-wider flex items-center gap-1.5">
                    <Code2 className="w-4 h-4 text-accent-700" />
                    Real Precompile Payload (EVM V1 Proof Struct)
                  </span>
                  <span className="text-[11px] font-mono text-ink-faint">
                    Source: {SOURCE_CHAINS.SEPOLIA.name} (chainKey: {latestPayload.sourceChain})
                  </span>
                </div>

                <div className="border border-rule rounded-sm p-4 font-mono text-[11px] text-ink-soft overflow-x-auto max-h-56 bg-paper-deep/30">
                  <pre>
                    {JSON.stringify(
                      { merkleProof: latestPayload.merkleProof, continuityProof: latestPayload.continuityProof },
                      null,
                      2
                    )}
                  </pre>
                </div>
              </div>
            </>
          ) : (
            <div className="border border-rule rounded-sm p-4 font-mono text-[11px] text-ink-faint italic">
              No incursion triggered yet. Sound the Horn to verify a real Attestcoin proof on-chain and inspect it here.
            </div>
          )}

          {/* Precompile Solidity Call Signature */}
          <div className="border border-rule rounded-sm p-4 flex flex-col gap-2">
            <span className="text-xs font-semibold text-ink-soft">
              On-Chain ASC Execution Path (BastionIncursionEngine.triggerIncursionCheck):
            </span>
            <pre className="text-[11px] font-mono text-accent-700 border border-rule bg-paper-deep/30 p-3 rounded-sm overflow-x-auto">
{`INativeQueryVerifier(0x0FD2).verifyAndEmit(
    chainKey,            // 1 = Sepolia
    blockHeight,         // Source block number
    encodedTransaction,  // Receipt & event log bytes
    merkleProof,         // Transaction tree sibling path
    continuityProof      // Attestation checkpoint anchor
);`}
            </pre>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-rule flex items-center justify-between">
          <a
            href={CREDITCOIN_TESTNET.blockExplorerUrl}
            target="_blank"
            rel="noreferrer"
            className="text-xs text-accent-700 hover:text-accent-900 flex items-center gap-1 transition-colors"
          >
            <span>View Blockscout Precompile 0x0FD2</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
          <button
            onClick={onClose}
            className="btn-manuscript px-4 py-2 rounded-sm text-xs"
          >
            Close Inspector
          </button>
        </div>
      </div>
    </div>
  );
};
