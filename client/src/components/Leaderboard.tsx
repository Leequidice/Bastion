import React, { useEffect, useState } from "react";
import { X, Trophy, Medal, RefreshCw } from "lucide-react";
import { getLeaderboard, LeaderboardEntry } from "../lib/api";

interface LeaderboardProps {
  isOpen: boolean;
  onClose: () => void;
}

const MEDAL_COLORS: Record<number, string> = {
  1: "text-amber-400",
  2: "text-slate-300",
  3: "text-orange-400",
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
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-950 border border-amber-800/60 rounded-2xl w-full max-w-lg max-h-[85vh] flex flex-col shadow-2xl shadow-amber-950/40 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/60">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-amber-950 border border-amber-800 flex items-center justify-center text-amber-400">
              <Trophy className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100 uppercase tracking-wider">
                Wall Watch Leaderboard
              </h2>
              <p className="text-xs text-slate-400">Highest wave held, across every commander</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={load}
              disabled={isLoading}
              className="text-slate-400 hover:text-white transition-colors cursor-pointer disabled:opacity-40"
              title="Refresh"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
            </button>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto flex flex-col gap-1.5">
          {error ? (
            <p className="text-xs text-red-400 text-center py-6">{error}</p>
          ) : isLoading && entries.length === 0 ? (
            <p className="text-xs text-slate-500 text-center py-6">Loading rankings...</p>
          ) : entries.length === 0 ? (
            <p className="text-xs text-slate-500 text-center py-6 italic">
              No commanders have repelled a wave yet. Be the first.
            </p>
          ) : (
            entries.map((entry) => (
              <div
                key={entry.userId}
                className="flex items-center justify-between gap-3 px-3 py-2 rounded-lg bg-slate-900/70 border border-slate-800"
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`w-6 text-sm font-mono font-bold text-center ${
                      MEDAL_COLORS[entry.rank] || "text-slate-500"
                    }`}
                  >
                    {entry.rank <= 3 ? <Medal className="w-4 h-4 inline" /> : entry.rank}
                  </span>
                  <span className="text-xs font-mono text-slate-200">
                    {formatDisplayName(entry)}
                  </span>
                </div>
                <span className="text-sm font-mono font-bold text-cyan-400">
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
