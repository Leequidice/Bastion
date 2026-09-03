import React from "react";
import { Shield, Radio, Activity, Cpu, ExternalLink } from "lucide-react";
import { CREDITCOIN_TESTNET } from "../lib/constants";

interface DashboardHeaderProps {
  account: string | null;
  balance: string;
  networkId: number | null;
  onConnectWallet: () => void;
  onSwitchNetwork: () => void;
  onOpenProofModal: () => void;
  isSandboxMode: boolean;
  onToggleSandbox: () => void;
}

export const DashboardHeader: React.FC<DashboardHeaderProps> = ({
  account,
  balance,
  networkId,
  onConnectWallet,
  onSwitchNetwork,
  onOpenProofModal,
  isSandboxMode,
  onToggleSandbox,
}) => {
  const isCreditcoin = networkId === CREDITCOIN_TESTNET.chainId;

  return (
    <header className="w-full bg-slate-950/90 border-b border-slate-800 backdrop-blur-md px-6 py-3.5 flex flex-wrap items-center justify-between gap-4 sticky top-0 z-40">
      {/* Title & Lore */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-cyan-500 via-indigo-600 to-purple-700 flex items-center justify-center shadow-lg shadow-cyan-500/20">
          <Shield className="w-5 h-5 text-white" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-black tracking-wider text-slate-100 uppercase">
              Bastion
            </h1>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-950 text-cyan-400 border border-cyan-800">
              ATTESTCOIN ENGINE
            </span>
          </div>
          <p className="text-xs text-slate-400">
            Provably Fair Settlement Defense • BUIDL CTC 2026 Fall
          </p>
        </div>
      </div>

      {/* Network & Verifier Telemetry */}
      <div className="flex items-center gap-3 text-xs">
        {/* Attestcoin Precompile Indicator */}
        <button
          onClick={onOpenProofModal}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900 border border-cyan-800/60 text-cyan-300 hover:bg-cyan-950/50 transition-colors cursor-pointer"
          title="Inspect cryptographic proof payload and precompile interface"
        >
          <Cpu className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
          <span className="font-mono">Precompile: 0x0FD2</span>
          <span className="text-[10px] bg-cyan-900/80 px-1.5 py-0.5 rounded text-cyan-200">
            INSPECT
          </span>
        </button>

        {/* Mode Toggle */}
        <button
          onClick={onToggleSandbox}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all cursor-pointer ${
            isSandboxMode
              ? "bg-amber-950/40 border-amber-800/80 text-amber-300"
              : "bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800"
          }`}
        >
          <Activity className="w-3.5 h-3.5" />
          <span>{isSandboxMode ? "Interactive Sandbox" : "Live Testnet Mode"}</span>
        </button>

        {/* Network Badge */}
        {account && (
          <div className="flex items-center gap-2">
            {isCreditcoin ? (
              <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-950/60 border border-emerald-800 text-emerald-400 font-medium">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                Creditcoin CC3 (102031)
              </span>
            ) : (
              <button
                onClick={onSwitchNetwork}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-950/80 border border-amber-700 text-amber-300 font-semibold hover:bg-amber-900 cursor-pointer"
              >
                Switch to Creditcoin CC3
              </button>
            )}
          </div>
        )}

        {/* Wallet Connect Button */}
        {account ? (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-200 font-mono text-xs">
            <span className="text-slate-400">{balance} tCTC</span>
            <span className="w-1.5 h-1.5 rounded-full bg-slate-600"></span>
            <span className="text-cyan-400 font-bold">
              {account.slice(0, 6)}...{account.slice(-4)}
            </span>
          </div>
        ) : (
          <button
            onClick={onConnectWallet}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white font-semibold shadow-lg shadow-cyan-600/25 transition-all cursor-pointer"
          >
            <Radio className="w-4 h-4" />
            Connect Creditcoin Wallet
          </button>
        )}
      </div>
    </header>
  );
};
