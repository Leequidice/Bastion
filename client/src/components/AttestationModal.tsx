import React from "react";
import { X, Cpu, ShieldCheck, ExternalLink, Code2, Layers, CheckCircle2 } from "lucide-react";
import { CREDITCOIN_TESTNET, SOURCE_CHAINS } from "../lib/constants";
import { AttestationPayload, calculateVerificationCost } from "../lib/attestationHelper";

interface AttestationModalProps {
  isOpen: boolean;
  onClose: () => void;
  latestPayload: AttestationPayload | null;
}

export const AttestationModal: React.FC<AttestationModalProps> = ({
  isOpen,
  onClose,
  latestPayload,
}) => {
  if (!isOpen) return null;

  const cost = calculateVerificationCost(
    latestPayload?.continuityProof.roots.length || 2
  );

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-950 border border-cyan-800/80 rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl shadow-cyan-950/50 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/60">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-cyan-950 border border-cyan-800 flex items-center justify-center text-cyan-400">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100 uppercase tracking-wider flex items-center gap-2">
                Attestcoin Protocol Inspector
                <span className="text-[10px] bg-cyan-900/60 text-cyan-300 px-2 py-0.5 rounded font-mono">
                  0x0FD2
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Native Cryptographic Verification Telemetry & Circuit Prover
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-5 text-xs">
          {/* Architectural Overview Alert */}
          <div className="p-4 rounded-xl bg-cyan-950/30 border border-cyan-800/50 flex flex-col gap-2">
            <div className="flex items-center gap-2 text-cyan-300 font-bold text-sm">
              <ShieldCheck className="w-4 h-4 text-cyan-400" />
              <span>Why Attestcoin is Load-Bearing in Bastion:</span>
            </div>
            <p className="text-slate-300 leading-relaxed">
              Traditional Web3 city-builders rely on client-side RNG (vulnerable to memory modification) or centralized oracle relays (single point of failure). Bastion anchors all Colossi threat vectors and market scarcity directly to foreign chain transactions (Ethereum Sepolia). 
              Creditcoin's <strong className="text-cyan-300">Block Prover Precompile (0x0FD2)</strong> validates inclusion and continuity proofs synchronously in a single block without centralized intermediaries.
            </p>
          </div>

          {/* Verification Metrics Grid */}
          <div className="grid grid-cols-3 gap-3 font-mono">
            <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800">
              <span className="text-slate-400 text-[10px] block uppercase">Verifier Address</span>
              <span className="text-cyan-400 font-bold text-xs truncate block">
                {CREDITCOIN_TESTNET.precompileVerifier}
              </span>
            </div>
            <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800">
              <span className="text-slate-400 text-[10px] block uppercase">Verification Latency</span>
              <span className="text-emerald-400 font-bold text-xs">
                {cost.latencyBlocks} Block (~15s)
              </span>
            </div>
            <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800">
              <span className="text-slate-400 text-[10px] block uppercase">Formula Gas Cost</span>
              <span className="text-amber-400 font-bold text-xs">
                {cost.ctcCost} ({cost.usdEstimate})
              </span>
            </div>
          </div>

          {/* Cryptographic Payload Display */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                <Code2 className="w-4 h-4 text-cyan-400" />
                Live Precompile Payload (EVM V1 Proof Struct)
              </span>
              <span className="text-[11px] font-mono text-slate-400">
                Source: {SOURCE_CHAINS.SEPOLIA.name} (chainKey: {SOURCE_CHAINS.SEPOLIA.chainKey})
              </span>
            </div>

            <div className="bg-slate-900 rounded-xl p-4 border border-slate-800 font-mono text-[11px] text-slate-300 overflow-x-auto max-h-56">
              {latestPayload ? (
                <pre>{JSON.stringify(latestPayload, null, 2)}</pre>
              ) : (
                <div className="text-slate-500 italic">
                  No incursion triggered yet. Trigger an incursion on the radar to inspect proof.
                </div>
              )}
            </div>
          </div>

          {/* Precompile Solidity Call Signature */}
          <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800 flex flex-col gap-2">
            <span className="text-xs font-bold text-slate-300">
              On-Chain ASC Execution Path:
            </span>
            <pre className="text-[11px] font-mono text-cyan-300 bg-slate-950 p-3 rounded-lg border border-slate-900 overflow-x-auto">
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
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-900/60 flex items-center justify-between">
          <a
            href={CREDITCOIN_TESTNET.blockExplorerUrl}
            target="_blank"
            rel="noreferrer"
            className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1 transition-colors"
          >
            <span>View Blockscout Precompile 0x0FD2</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs transition-colors cursor-pointer"
          >
            Close Inspector
          </button>
        </div>
      </div>
    </div>
  );
};
