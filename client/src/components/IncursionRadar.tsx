import React from "react";
import { Radio, AlertTriangle, Swords, ShieldAlert, CheckCircle, Skull, Flame } from "lucide-react";
import { ActiveColossus } from "./CityCanvas";
import { COLOSSI_ARCHETYPES } from "../lib/constants";

interface IncursionRadarProps {
  activeColossus: ActiveColossus | null;
  totalRepelled: number;
  totalBreached: number;
  onTriggerIncursion: () => void;
  onMobilizeDefenses: () => void;
  isTriggering: boolean;
  isDefending: boolean;
}

export const IncursionRadar: React.FC<IncursionRadarProps> = ({
  activeColossus,
  totalRepelled,
  totalBreached,
  onTriggerIncursion,
  onMobilizeDefenses,
  isTriggering,
  isDefending,
}) => {
  const archetypeInfo = activeColossus
    ? COLOSSI_ARCHETYPES[activeColossus.archetype] || COLOSSI_ARCHETYPES[0]
    : null;

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
              Attested Threat Radar
            </h2>
            <p className="text-[11px] text-slate-400">
              Source: Ethereum Sepolia (chainKey: 1)
            </p>
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

      {/* Radar Visual Display */}
      <div className="relative w-full h-44 bg-slate-900/90 rounded-lg border border-slate-800 flex items-center justify-center overflow-hidden">
        {/* Concentric Radar Rings */}
        <div className="absolute w-36 h-36 rounded-full border border-cyan-900/40"></div>
        <div className="absolute w-24 h-24 rounded-full border border-cyan-900/60"></div>
        <div className="absolute w-12 h-12 rounded-full border border-cyan-800/80"></div>
        <div className="absolute w-full h-[1px] bg-cyan-900/30"></div>
        <div className="absolute h-full w-[1px] bg-cyan-900/30"></div>

        {/* Sweeping Radar Beam */}
        <div className="absolute w-40 h-40 rounded-full radar-sweep pointer-events-none">
          <div className="w-1/2 h-1/2 bg-gradient-to-br from-cyan-500/20 to-transparent rounded-tl-full"></div>
        </div>

        {/* Center Settlement Blip */}
        <div className="absolute w-3 h-3 rounded-full bg-indigo-500 shadow-md shadow-indigo-500/50 z-10 flex items-center justify-center">
          <span className="w-1 h-1 rounded-full bg-white"></span>
        </div>

        {/* Colossus Radar Blip */}
        {activeColossus && (activeColossus.status === "Approaching" || activeColossus.status === "Engaged") ? (
          <div className="absolute top-6 right-16 z-20 flex items-center gap-1.5 pulse-red">
            <div className="w-4 h-4 rounded-full bg-red-600 border-2 border-white shadow-lg shadow-red-500/80 flex items-center justify-center">
              <span className="w-1.5 h-1.5 rounded-full bg-white"></span>
            </div>
            <span className="text-[10px] font-bold text-red-400 bg-red-950/80 px-1 rounded border border-red-800">
              TARGET LOCK
            </span>
          </div>
        ) : (
          <div className="absolute text-xs text-slate-500 flex items-center gap-1.5 font-mono">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            No Incursions Active — Perimeter Secure
          </div>
        )}
      </div>

      {/* Active Colossus Threat Dossier */}
      {activeColossus && archetypeInfo ? (
        <div className="p-3 bg-red-950/20 border border-red-900/50 rounded-lg flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-400 animate-bounce" />
              <span className="text-sm font-bold text-red-200">
                {archetypeInfo.name}
              </span>
              <span className="text-xs text-amber-400 font-mono font-bold">
                {"★".repeat(activeColossus.severity)}
              </span>
            </div>
            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-red-900/60 text-red-300">
              {activeColossus.status}
            </span>
          </div>

          <p className="text-xs text-slate-300 italic">
            "{archetypeInfo.description}"
          </p>

          <div className="grid grid-cols-3 gap-2 text-xs font-mono pt-1">
            <div className="bg-slate-900/80 p-2 rounded border border-slate-800">
              <span className="text-slate-400 text-[10px] block">Colossus HP</span>
              <span className="text-red-400 font-bold">
                {activeColossus.hp} / {activeColossus.maxHp}
              </span>
            </div>
            <div className="bg-slate-900/80 p-2 rounded border border-slate-800">
              <span className="text-slate-400 text-[10px] block">Siege Damage</span>
              <span className="text-amber-400 font-bold">
                {activeColossus.siegePower} DMG
              </span>
            </div>
            <div className="bg-slate-900/80 p-2 rounded border border-slate-800">
              <span className="text-slate-400 text-[10px] block">Tactical Counter</span>
              <span className="text-cyan-400 font-bold truncate block">
                {archetypeInfo.weakness}
              </span>
            </div>
          </div>

          {/* Mobilize Defenses Action */}
          <button
            onClick={onMobilizeDefenses}
            disabled={isDefending}
            className="w-full mt-2 flex items-center justify-center gap-2 py-2.5 rounded-lg bg-gradient-to-r from-red-600 via-orange-600 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white font-bold shadow-lg shadow-red-600/30 transition-all cursor-pointer disabled:opacity-50"
          >
            <Swords className="w-4 h-4" />
            <span>{isDefending ? "Opening Fire..." : "Mobilize Defense Artillery"}</span>
          </button>
        </div>
      ) : (
        /* Trigger Incursion Button */
        <div className="flex flex-col gap-2">
          <p className="text-xs text-slate-400">
            Click below to poll verified cross-chain telemetry from Ethereum Sepolia via Attestcoin Protocol (<span className="font-mono text-cyan-400">0x0FD2</span>) and trigger a deterministically derived Colossus siege.
          </p>
          <button
            onClick={onTriggerIncursion}
            disabled={isTriggering}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-lg bg-gradient-to-r from-cyan-600 via-indigo-600 to-purple-600 hover:from-cyan-500 hover:to-purple-500 text-white font-bold shadow-lg shadow-cyan-600/25 transition-all cursor-pointer disabled:opacity-50"
          >
            <ShieldAlert className="w-4 h-4" />
            <span>{isTriggering ? "Verifying Attestcoin Proof..." : "Poll Attested Incursion (Sepolia)"}</span>
          </button>
        </div>
      )}
    </div>
  );
};
