import React from "react";
import { Radio, AlertTriangle, ShieldAlert, CheckCircle, Skull, Swords } from "lucide-react";
import { BattleState } from "../lib/battleEngine";
import { COLOSSI_ARCHETYPES } from "../lib/constants";

interface IncursionRadarProps {
  level: number;
  highestLevelReached: number;
  battleState: BattleState | null;
  wallStatus: "standing" | "breached";
  totalRepelled: number;
  totalBreached: number;
  isStarting: boolean;
  onStartWave: () => void;
  onRestart: () => void;
}

export const IncursionRadar: React.FC<IncursionRadarProps> = ({
  level,
  highestLevelReached,
  battleState,
  wallStatus,
  totalRepelled,
  totalBreached,
  isStarting,
  onStartWave,
  onRestart,
}) => {
  const titan = battleState?.titan ?? null;
  const archetypeInfo = titan ? COLOSSI_ARCHETYPES[titan.archetype] || COLOSSI_ARCHETYPES[0] : null;
  const distanceProgress = battleState
    ? Math.min(1, 1 - battleState.distanceRemaining / battleState.totalDistance)
    : 0;

  return (
    <div className="w-full bg-slate-950/80 border border-slate-800 rounded-xl p-4 shadow-xl backdrop-blur-md flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <div className="relative">
            <Radio className="w-5 h-5 text-cyan-400" />
            <span className="absolute top-0 right-0 w-2 h-2 rounded-full bg-cyan-400 animate-ping"></span>
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-100 uppercase tracking-wider">
              Wall Watch // Level {level}
            </h2>
            <p className="text-[11px] text-slate-400">Highest wave held: {highestLevelReached}</p>
          </div>
        </div>

        <div className="flex items-center gap-3 text-xs">
          <span className="flex items-center gap-1 text-emerald-400 font-mono">
            <CheckCircle className="w-3.5 h-3.5" />
            <span>{totalRepelled} Repelled</span>
          </span>
          <span className="flex items-center gap-1 text-red-400 font-mono">
            <Skull className="w-3.5 h-3.5" />
            <span>{totalBreached} Breaches</span>
          </span>
        </div>
      </div>

      {wallStatus === "breached" ? (
        /* Game Over: the Wall has fallen */
        <div className="flex flex-col gap-3 p-4 bg-red-950/30 border border-red-900/60 rounded-lg items-center text-center">
          <Skull className="w-8 h-8 text-red-500" />
          <h3 className="text-lg font-bold text-red-300">The Wall Has Fallen</h3>
          <p className="text-xs text-slate-400">
            The Titan reached the Wall at Level {level}. Humanity's line held for {highestLevelReached - 1} wave
            {highestLevelReached - 1 === 1 ? "" : "s"}.
          </p>
          <button
            onClick={onRestart}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-gradient-to-r from-red-600 via-orange-600 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white font-bold shadow-lg shadow-red-600/30 transition-all cursor-pointer"
          >
            <Swords className="w-4 h-4" />
            <span>Rebuild the Wall &amp; Restart</span>
          </button>
        </div>
      ) : !battleState ? (
        /* Idle: no wave running yet */
        <div className="flex flex-col gap-2">
          <p className="text-xs text-slate-400">
            Fortify your sectors, then sound the horn. The Titan marches down the lane toward the Wall —
            every defense in range fires automatically as it approaches. Let it reach the Wall and the
            Wall falls.
          </p>
          <button
            onClick={onStartWave}
            disabled={isStarting}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-lg bg-gradient-to-r from-cyan-600 via-indigo-600 to-purple-600 hover:from-cyan-500 hover:to-purple-500 text-white font-bold shadow-lg shadow-cyan-600/25 transition-all cursor-pointer disabled:opacity-50"
          >
            <ShieldAlert className="w-4 h-4" />
            <span>{isStarting ? "Verifying Attestcoin Proof..." : `Sound the Horn — Level ${level}`}</span>
          </button>
        </div>
      ) : battleState.matchStatus === "won" ? (
        /* Brief victory banner before the next wave auto-starts */
        <div className="flex flex-col gap-2 p-3 bg-emerald-950/30 border border-emerald-900/60 rounded-lg items-center text-center">
          <CheckCircle className="w-6 h-6 text-emerald-400" />
          <h3 className="text-sm font-bold text-emerald-300">Wave {level} Repelled!</h3>
          <p className="text-xs text-slate-400">The next Titan approaches...</p>
        </div>
      ) : (
        /* Active battle HUD */
        titan &&
        archetypeInfo && (
          <div className="p-3 bg-red-950/20 border border-red-900/50 rounded-lg flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-400 animate-bounce" />
                <span className="text-sm font-bold text-red-200">{titan.name}</span>
              </div>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-red-900/60 text-red-300">
                Marching
              </span>
            </div>

            <p className="text-xs text-slate-300 italic">"{archetypeInfo.description}"</p>

            <div>
              <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1">
                <span>Titan HP</span>
                <span>
                  {Math.max(0, Math.round(titan.hp))} / {titan.maxHp}
                </span>
              </div>
              <div className="w-full h-2 bg-slate-900/80 rounded border border-slate-800 overflow-hidden">
                <div
                  className="h-full bg-red-500 transition-all"
                  style={{ width: `${Math.max(0, (titan.hp / titan.maxHp) * 100)}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1">
                <span>Distance to Wall</span>
                <span>{Math.round((1 - distanceProgress) * 100)}% remaining</span>
              </div>
              <div className="w-full h-2 bg-slate-900/80 rounded border border-slate-800 overflow-hidden">
                <div
                  className="h-full bg-amber-500 transition-all"
                  style={{ width: `${distanceProgress * 100}%` }}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs font-mono pt-1">
              <div className="bg-slate-900/80 p-2 rounded border border-slate-800">
                <span className="text-slate-400 text-[10px] block">Siege Power</span>
                <span className="text-amber-400 font-bold">{titan.siegePower} DMG</span>
              </div>
              <div className="bg-slate-900/80 p-2 rounded border border-slate-800">
                <span className="text-slate-400 text-[10px] block">Tactical Counter</span>
                <span className="text-cyan-400 font-bold truncate block">{archetypeInfo.weakness}</span>
              </div>
            </div>
          </div>
        )
      )}
    </div>
  );
};
