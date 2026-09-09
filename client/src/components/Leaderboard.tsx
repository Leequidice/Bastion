import React, { useEffect, useState } from "react";
import { X, Trophy, Medal, RefreshCw } from "lucide-react";
import { getLeaderboard, LeaderboardEntry } from "../lib/api";

interface LeaderboardProps {
  isOpen: boolean;
  onClose: () => void;
}

const MEDAL_COLORS: Record<number, string> = {
  1: "text-accent-500",
  2: "text-ink-faint",
  3: "text-[#7a5a11]",
};

function formatDisplayName(entry: LeaderboardEntry): string {
  if (!entry.displayName) return `Commander ${entry.userId.slice(0, 8)}`;
  if (entry.displayName.startsWith("0x") && entry.displayName.length > 12) {
    return `${entry.displayName.slice(0, 6)}...${entry.displayName.slice(-4)}`;
  }
  return entry.displayName;
}

export const Leaderboard: React.FC<LeaderboardProps> = ({ isOpen, onClose }) => {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    setIsLoading(true);
    setError(null);
    getLeaderboard()
      .then(setEntries)
      .catch(() => setError("Failed to load the leaderboard. Try again shortly."))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    if (isOpen) load();
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-dark-deep/85 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="panel-parchment rounded-md w-full max-w-lg max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-rule flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-sm border border-accent-500 flex items-center justify-center text-accent-700">
              <Trophy className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-display text-ink">
                Wall Watch Leaderboard
              </h2>
              <p className="text-xs text-ink-faint italic">Highest wave held, across every commander</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={load}
              disabled={isLoading}
              className="text-ink-faint hover:text-ink transition-colors cursor-pointer disabled:opacity-40"
              title="Refresh"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
            </button>
            <button
              onClick={onClose}
              className="text-ink-faint hover:text-ink transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto flex flex-col gap-1.5">
          {error ? (
            <p className="text-xs text-[#7a2318] text-center py-6">{error}</p>
          ) : isLoading && entries.length === 0 ? (
            <p className="text-xs text-ink-faint text-center py-6 italic">Loading rankings...</p>
          ) : entries.length === 0 ? (
            <p className="text-xs text-ink-faint text-center py-6 italic">
              No commanders have repelled a wave yet. Be the first.
            </p>
          ) : (
            entries.map((entry) => (
              <div
                key={entry.userId}
                className="flex items-center justify-between gap-3 px-3 py-2 rounded-sm border border-rule"
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`w-6 text-sm font-mono font-bold text-center ${
                      MEDAL_COLORS[entry.rank] || "text-ink-faint"
                    }`}
                  >
                    {entry.rank <= 3 ? <Medal className="w-4 h-4 inline" /> : entry.rank}
                  </span>
                  <span className="text-xs font-mono text-ink">
                    {formatDisplayName(entry)}
                  </span>
                </div>
                <span className="text-sm font-mono font-bold text-accent-700">
                  Lv.{entry.level}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
