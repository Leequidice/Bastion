import React, { useEffect, useRef, useState } from "react";
import {
  Shield,
  Radio,
  Activity,
  Cpu,
  ExternalLink,
  ChevronDown,
  LayoutDashboard,
  LogOut,
  UserPlus,
  LifeBuoy,
  Trophy,
  Droplets,
} from "lucide-react";
import { CREDITCOIN_TESTNET, FAUCET_URL } from "../lib/constants";

interface DashboardHeaderProps {
  account: string | null;
  balance: string;
  networkId: number | null;
  onConnectWallet: () => void;
  onSwitchNetwork: () => void;
  onOpenProofModal: () => void;
  onOpenLeaderboard: () => void;
  onOpenDashboard: () => void;
  isSandboxMode: boolean;
  onToggleSandbox: () => void;
  onLogout: () => void;
  onConnectAnotherAccount: () => void;
}

export const DashboardHeader: React.FC<DashboardHeaderProps> = ({
  account,
  balance,
  networkId,
  onConnectWallet,
  onSwitchNetwork,
  onOpenProofModal,
  onOpenLeaderboard,
  onOpenDashboard,
  // isSandboxMode,
  // onToggleSandbox,
  onLogout,
  onConnectAnotherAccount,
}) => {
  const isCreditcoin = networkId === CREDITCOIN_TESTNET.chainId;
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);
  const accountMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isAccountMenuOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (
        accountMenuRef.current &&
        !accountMenuRef.current.contains(event.target as Node)
      ) {
        setIsAccountMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isAccountMenuOpen]);

  return (
    <header className="w-full panel-dark backdrop-blur-md px-6 py-3.5 flex flex-wrap items-center justify-between gap-4 sticky top-0 z-40">
      {/* Title & Lore */}
      <div className="flex items-center gap-3">
        {/* <img
          src="/bastion_logo.png"
          alt="bastion logo"
          className="h-[3rem] w-[3rem] object-cover"
        /> */}
        <div
          className="max-w-[4rem] max-h-[4rem] rounded-sm flex items-center justify-center border border-accent-500"
          style={{
            background:
              "linear-gradient(180deg, #7d5a2c 0%, #a97f44 18%, #6b4a20 62%, #3a270d 100%)",
          }}
        >
          <img
            src="/bastion_logo.png"
            alt="bastion logo"
            className="h-[3rem] w-[3rem] object-cover"
          />
          <Shield className="w-5 h-5 text-dark-text hidden" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-display text-dark-text">Bastion</h1>
            <span className="kicker px-2 py-0.5 rounded-sm text-[9px] font-semibold border border-accent-500/60 text-accent-300">
              Attestcoin Engine
            </span>
          </div>
          <p className="text-xs text-dark-muted italic">
            Provably Fair Settlement Defense · BUIDL CTC 2026 Fall
          </p>
        </div>
      </div>

      {/* Network & Verifier Telemetry */}
      <div className="flex items-center gap-3 text-xs">
        {/* Attestcoin Precompile Indicator */}
        <button
          onClick={onOpenProofModal}
          className="!btn-manuscript-dark px-3 py-1.5 rounded-sm flex gap-1"
          title="Inspect cryptographic proof payload and precompile interface"
        >
          <Cpu className="w-3.5 h-3.5 text-accent-300" />
          <span className="font-mono">0x0FD2</span>
          <span className="text-[10px] border border-accent-500/50 px-1.5 py-0.5 rounded-sm text-accent-300">
            Inspect
          </span>
        </button>

        {/* Leaderboard */}
        <button
          onClick={onOpenLeaderboard}
          className="!btn-manuscript-dark px-3 py-1.5 rounded-sm flex gap-1"
          title="View the Wall Watch leaderboard"
        >
          <Trophy className="w-3.5 h-3.5 text-accent-300" />
          <span className="hidden sm:inline">Leaderboard</span>
        </button>

        {/* Mode Toggle */}
        {/* <button
          onClick={onToggleSandbox}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-sm border font-semibold transition-all cursor-pointer ${
            isSandboxMode
              ? "border-accent-500 text-accent-300 bg-accent-900/30"
              : "border-dark-rule text-dark-muted hover:bg-dark-rule/10"
          }`}
        >
          <Activity className="w-3.5 h-3.5" />
          <span>
            {isSandboxMode ? "Interactive Sandbox" : "Live Testnet Mode"}
          </span>
        </button> */}

        {/* Network Badge */}
        {account && (
          <div className="flex items-center gap-2">
            {isCreditcoin ? (
              <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-sm border border-accent-500/60 text-accent-300 font-medium">
                <span className="w-2 h-2 rounded-full bg-accent-300 animate-pulse"></span>
                Creditcoin CC3 (102031)
              </span>
            ) : (
              <button
                onClick={onSwitchNetwork}
                className="!btn-manuscript-dark px-3 py-1.5 rounded-sm"
              >
                Switch to Creditcoin CC3
              </button>
            )}
          </div>
        )}

        {/* Wallet Connect Button / Account Menu */}
        {account ? (
          <div className="relative" ref={accountMenuRef}>
            <button
              onClick={() => setIsAccountMenuOpen((prev) => !prev)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-sm border border-dark-rule text-dark-text font-mono text-xs hover:bg-dark-rule/10 transition-colors cursor-pointer"
            >
              <span className="text-dark-muted">{balance} tCTC</span>
              <span className="w-1.5 h-1.5 rounded-full bg-dark-muted"></span>
              <span className="text-accent-300 font-bold">
                {account.slice(0, 6)}...{account.slice(-4)}
              </span>
              <ChevronDown className="w-3.5 h-3.5 text-dark-muted" />
            </button>

            {isAccountMenuOpen && (
              <div className="absolute right-0 mt-2 w-56 rounded-sm panel-dark shadow-xl shadow-black/40 overflow-hidden z-50 font-body normal-case">
                <button
                  onClick={() => {
                    setIsAccountMenuOpen(false);
                    onOpenDashboard();
                  }}
                  className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs text-dark-text hover:bg-dark-rule/10 transition-colors cursor-pointer"
                >
                  <LayoutDashboard className="w-3.5 h-3.5 text-accent-300" />
                  Dashboard
                </button>
                <button
                  onClick={() => {
                    setIsAccountMenuOpen(false);
                    onConnectAnotherAccount();
                  }}
                  className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs text-dark-text hover:bg-dark-rule/10 transition-colors cursor-pointer"
                >
                  <UserPlus className="w-3.5 h-3.5 text-accent-300" />
                  Switch account
                </button>
                <a
                  href={FAUCET_URL}
                  target="_blank"
                  rel="noreferrer"
                  onClick={() => setIsAccountMenuOpen(false)}
                  className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs text-dark-text hover:bg-dark-rule/10 transition-colors cursor-pointer"
                >
                  <Droplets className="w-3.5 h-3.5 text-accent-300" />
                  Visit Faucet
                </a>
                <button
                  onClick={() => {
                    setIsAccountMenuOpen(false);
                    onLogout();
                  }}
                  className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs text-accent-300 hover:bg-dark-rule/10 transition-colors cursor-pointer border-t border-dark-rule"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Logout
                </button>
                <button
                  disabled
                  className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs text-dark-muted opacity-50 border-t border-dark-rule cursor-not-allowed"
                  title="Coming soon"
                >
                  <LifeBuoy className="w-3.5 h-3.5" />
                  Contact support
                </button>
              </div>
            )}
          </div>
        ) : (
          <button
            onClick={onConnectWallet}
            className="btn-manuscript px-4 py-2 rounded-sm !text-[#d9b877]"
          >
            <Radio className="w-4 h-4" />
            Connect Creditcoin Wallet
          </button>
        )}
      </div>
    </header>
  );
};
