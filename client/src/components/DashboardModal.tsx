import React, { useEffect, useState } from "react";
import { X, LayoutDashboard, Copy, Check, Pencil, Swords, Skull, CheckCircle } from "lucide-react";
import { MAX_GAME_NAME_LENGTH } from "../lib/constants";

interface DashboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  account: string | null;
  gameName: string | null;
  onUpdateGameName: (name: string) => void;
  level: number;
  highestLevelReached: number;
  totalRepelled: number;
  totalBreached: number;
}

export const DashboardModal: React.FC<DashboardModalProps> = ({
  isOpen,
  onClose,
  account,
  gameName,
  onUpdateGameName,
  level,
  highestLevelReached,
  totalRepelled,
  totalBreached,
}) => {
  const [draftName, setDraftName] = useState(gameName ?? "");
  const [hasCopied, setHasCopied] = useState(false);

  useEffect(() => {
    if (isOpen) setDraftName(gameName ?? "");
  }, [isOpen, gameName]);

  if (!isOpen) return null;

  const handleSave = () => {
    onUpdateGameName(draftName);
  };

  const handleCopyAddress = async () => {
    if (!account) return;
    try {
      await navigator.clipboard.writeText(account);
      setHasCopied(true);
      setTimeout(() => setHasCopied(false), 1800);
    } catch (err) {
      console.error("Failed to copy wallet address:", err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-dark-deep/85 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="panel-parchment rounded-md w-full max-w-lg max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-rule flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-sm border border-accent-500 flex items-center justify-center text-accent-700">
              <LayoutDashboard className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-display text-ink">Commander Dashboard</h2>
              <p className="text-xs text-ink-faint italic">Your identity and record on the Wall</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-ink-faint hover:text-ink transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-5 text-sm">
          {/* Game name */}
          <section className="flex flex-col gap-2">
            <label htmlFor="game-name-input" className="kicker text-[10px] text-accent-700 font-bold flex items-center gap-1.5">
              <Pencil className="w-3.5 h-3.5" /> Commander Name
            </label>
            <div className="flex items-center gap-2">
              <input
                id="game-name-input"
                type="text"
                value={draftName}
                onChange={(e) => setDraftName(e.target.value)}
                maxLength={MAX_GAME_NAME_LENGTH}
                placeholder="Unnamed Commander"
                className="flex-1 bg-paper-lit border border-rule rounded-sm px-3 py-2 text-ink font-body text-sm focus:outline-none focus:border-accent-500"
              />
              <button
                onClick={handleSave}
                disabled={draftName.trim() === (gameName ?? "")}
                className="btn-manuscript px-4 py-2 rounded-sm text-xs"
              >
                Save
              </button>
            </div>
            <p className="text-[11px] text-ink-faint italic">
              Shown on the Wall Watch leaderboard in place of your wallet address. Up to{" "}
              {MAX_GAME_NAME_LENGTH} characters.
            </p>
          </section>

          {/* Wallet address */}
          <section className="flex flex-col gap-2">
            <span className="kicker text-[10px] text-accent-700 font-bold">Wallet Address</span>
            <div className="flex items-center gap-2 border border-rule rounded-sm px-3 py-2">
              <code className="flex-1 text-xs font-mono text-ink-soft truncate">
                {account ?? "Not connected"}
              </code>
              <button
                onClick={handleCopyAddress}
                disabled={!account}
                title="Copy wallet address"
                className="text-accent-700 hover:text-accent-900 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer shrink-0"
              >
                {hasCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          </section>

          {/* Stats */}
          <section className="grid grid-cols-2 gap-2 text-xs font-mono">
            <div className="border border-rule p-2.5 rounded-sm">
              <span className="text-ink-faint text-[10px] flex items-center gap-1 block">
                <Swords className="w-3 h-3" /> Current Level
              </span>
              <span className="text-ink font-bold text-base">{level}</span>
            </div>
            <div className="border border-rule p-2.5 rounded-sm">
              <span className="text-ink-faint text-[10px] flex items-center gap-1 block">
                <CheckCircle className="w-3 h-3" /> Highest Wave Held
              </span>
              <span className="text-accent-700 font-bold text-base">{highestLevelReached}</span>
            </div>
            <div className="border border-rule p-2.5 rounded-sm">
              <span className="text-ink-faint text-[10px] flex items-center gap-1 block">
                <CheckCircle className="w-3 h-3" /> Waves Repelled
              </span>
              <span className="text-accent-700 font-bold text-base">{totalRepelled}</span>
            </div>
            <div className="border border-rule p-2.5 rounded-sm">
              <span className="text-ink-faint text-[10px] flex items-center gap-1 block">
                <Skull className="w-3 h-3" /> Breaches
              </span>
              <span className="text-[#7a2318] font-bold text-base">{totalBreached}</span>
            </div>
          </section>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-rule flex items-center justify-end">
          <button
            onClick={onClose}
            className="btn-manuscript-quiet px-4 py-2 rounded-sm text-xs"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
