import React from "react";
import {
  Radio,
  AlertTriangle,
  ShieldAlert,
  CheckCircle,
  Skull,
  Coins,
  RotateCcw,
  Droplets,
} from "lucide-react";
import { BattleState } from "../lib/battleEngine";
import {
  COLOSSI_ARCHETYPES,
  CONTINUE_AFTER_BREACH_FEE_CTC,
  CREDITCOIN_TESTNET,
  FAUCET_URL,
} from "../lib/constants";

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
  onContinue: () => void;
  isContinuing: boolean;
  continueError: string | null;
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
  onContinue,
  isContinuing,
  continueError,
}) => {
  const titan = battleState?.titan ?? null;
  const archetypeInfo = titan
    ? COLOSSI_ARCHETYPES[titan.archetype] || COLOSSI_ARCHETYPES[0]
    : null;
  const distanceProgress = battleState
    ? Math.min(1, 1 - battleState.distanceRemaining / battleState.totalDistance)
    : 0;

  return (
    <div className="w-full panel-parchment rounded-md p-4 shadow-xl flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-rule pb-3">
        <div className="flex items-center gap-2">
          <div className="relative">
            <Radio className="w-5 h-5 text-accent-700" />
            {/* <span className="absolute top-0 right-0 w-2 h-2 rounded-full bg-accent-500 animate-ping"></span> */}
          </div>
          <div>
            <h2 className="text-lg font-display text-ink">
              Wall Watch — Level {level}
            </h2>
            <p className="text-[11px] text-ink-faint italic">
              Highest wave held: {highestLevelReached}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 text-xs">
          <span className="flex items-center gap-1 text-accent-700 font-mono">
            <CheckCircle className="w-3.5 h-3.5" />
            <span>{totalRepelled} Repelled</span>
          </span>
          <span className="flex items-center gap-1 text-[#7a2318] font-mono">
            <Skull className="w-3.5 h-3.5" />
            <span>{totalBreached} Breaches</span>
          </span>
        </div>
      </div>

      {wallStatus === "breached" ? (
        /* Game Over: the Wall has fallen */
        <div className="flex flex-col gap-3 p-4 border border-[#7a2318]/50 rounded-sm items-center text-center bg-[#7a2318]/5">
          <Skull className="w-8 h-8 text-[#7a2318]" />
          <h3 className="text-xl font-display text-[#7a2318]">
            The Wall Has Fallen
          </h3>
          <p className="text-xs text-ink-soft">
            The Titan reached the Wall at Level {level}. Humanity's line held
            for {highestLevelReached - 1} wave
            {highestLevelReached - 1 === 1 ? "" : "s"}.
          </p>

          {continueError && (
            <div className="text-[11px] text-[#7a2318] border border-[#7a2318]/50 rounded-sm px-3 py-2 w-full flex flex-col gap-1.5">
              <span>{continueError}</span>
              <a
                href={FAUCET_URL}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 self-start text-accent-700 hover:text-accent-900 font-semibold"
              >
                <Droplets className="w-3 h-3" />
                Visit Faucet
              </a>
            </div>
          )}

          <button
            onClick={onContinue}
            disabled={isContinuing}
            className="btn-manuscript w-full py-2.5 rounded-sm"
          >
            <Coins className="w-4 h-4" />
            <span>
              {isContinuing
                ? "Confirming transaction..."
                : `Continue from Level ${level} — pay ${CONTINUE_AFTER_BREACH_FEE_CTC} ${CREDITCOIN_TESTNET.currencySymbol}`}
            </span>
          </button>

          <button
            onClick={onRestart}
            disabled={isContinuing}
            className="btn-manuscript-quiet w-full py-2.5 rounded-sm"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Start Over (Free)</span>
          </button>
        </div>
      ) : !battleState ? (
        /* Idle: no wave running yet */
        <div className="flex flex-col gap-2">
          <p className="text-xs text-ink-soft leading-relaxed">
            Fortify your sectors, then sound the horn. The Titan marches down
            the lane toward the Wall — every defense in range fires
            automatically as it approaches. Let it reach the Wall and the Wall
            falls.
          </p>
          <button
            onClick={onStartWave}
            disabled={isStarting}
            className="btn-manuscript w-full py-3 rounded-sm"
          >
            <ShieldAlert className="w-4 h-4" />
            <span>
              {isStarting
                ? "Verifying Attestcoin Proof..."
                : `Sound the Horn — Level ${level}`}
            </span>
          </button>
        </div>
      ) : battleState.matchStatus === "won" ? (
        /* Brief victory banner before the next wave auto-starts */
        <div className="flex flex-col gap-2 p-3 border border-accent-500/50 rounded-sm items-center text-center bg-accent-300/10">
          <CheckCircle className="w-6 h-6 text-accent-700" />
          <h3 className="text-base font-display text-accent-700">
            Wave {level} Repelled!
          </h3>
          <p className="text-xs text-ink-faint italic">
            The next Titan approaches...
          </p>
        </div>
      ) : (
        /* Active battle HUD */
        titan &&
        archetypeInfo && (
          <div className="p-3 border border-[#7a2318]/40 rounded-sm bg-[#7a2318]/5 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-[#7a2318]" />
                <span className="text-sm font-semibold text-blood">
                  {titan.name}
                </span>
                <span className="kicker text-[9px] font-bold px-1.5 py-0.5 rounded-sm border border-rule text-blood">
                  {titan.class}
                </span>
              </div>
              <span className="kicker text-[9px] font-bold px-2 py-0.5 rounded-sm border border-[#7a2318]/50 text-blood">
                {battleState.blockedByStructureId
                  ? "Grinding the Wall"
                  : "Marching"}
              </span>
            </div>

            <p className="text-xs text-blood italic">
              "{archetypeInfo.description}"
            </p>

            <div>
              <div className="flex items-center justify-between text-[10px] text-ink-faint mb-1">
                <span>Titan HP</span>
                <span>
                  {Math.max(0, Math.round(titan.hp))} / {titan.maxHp}
                </span>
              </div>
              <div className="w-full h-2 border border-rule rounded-sm overflow-hidden bg-paper-deep/40">
                <div
                  className="h-full bg-[#7a2318] transition-all"
                  style={{
                    width: `${Math.max(0, (titan.hp / titan.maxHp) * 100)}%`,
                  }}
                />
              </div>
            </div>

            {titan.minions.length > 0 && (
              <div className="flex flex-col gap-1">
                <span className="text-[10px] text-blood">
                  Shielded by {titan.minions.length} minion
                  {titan.minions.length === 1 ? "" : "s"} — she takes no damage
                  until they fall
                </span>
                {titan.minions.map((m) => (
                  <div
                    key={m.id}
                    className="w-full h-1.5 border border-rule rounded-sm overflow-hidden bg-paper-deep/40"
                  >
                    <div
                      className="h-full bg-accent-500 transition-all"
                      style={{
                        width: `${Math.max(0, (m.hp / m.maxHp) * 100)}%`,
                      }}
                    />
                  </div>
                ))}
              </div>
            )}

            <div>
              <div className="flex items-center justify-between text-[10px] text-ink-faint mb-1">
                <span>Distance to Wall</span>
                <span>
                  {Math.round((1 - distanceProgress) * 100)}% remaining
                </span>
              </div>
              <div className="w-full h-2 border border-rule rounded-sm overflow-hidden bg-paper-deep/40">
                <div
                  className="h-full bg-accent-700 transition-all"
                  style={{ width: `${distanceProgress * 100}%` }}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs font-mono pt-1">
              <div className="border border-rule p-2 rounded-sm">
                <span className="text-ink-faint text-[10px] block">
                  Siege Power
                </span>
                <span className="text-blood font-bold">
                  {titan.siegePower} DMG
                </span>
              </div>
              <div className="border border-rule p-2 rounded-sm">
                <span className="text-ink-faint text-[10px] block">
                  Tactical Counter
                </span>
                <span className="text-blood font-bold truncate block">
                  {archetypeInfo.weakness}
                </span>
              </div>
            </div>

            {titan.quirkTimerMs !== null && (
              <div className="border border-rule p-2 rounded-sm text-xs font-mono flex items-center justify-between">
                <span className="text-ink-faint text-[10px]">
                  Next quirk trigger
                </span>
                <span className="text-blood font-bold">
                  {(titan.quirkTimerMs / 1000).toFixed(1)}s
                </span>
              </div>
            )}
          </div>
        )
      )}
    </div>
  );
};
