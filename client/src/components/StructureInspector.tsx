import React from "react";
import { PlacedStructure } from "./CityCanvas";
import { BUILDINGS, MAX_STRUCTURE_LEVEL } from "../lib/constants";
import { Wrench, ArrowUpCircle, X, Shield, Hash, Trash2 } from "lucide-react";
import { Resources } from "./ResourceBar";

interface StructureInspectorProps {
  structure: PlacedStructure | null;
  onClose: () => void;
  onRepair: (structureId: string) => void;
  onUpgrade: (structureId: string) => void;
  onRemove: (structureId: string) => void;
  resources: Resources;
}

export const StructureInspector: React.FC<StructureInspectorProps> = ({
  structure,
  onClose,
  onRepair,
  onUpgrade,
  onRemove,
  resources,
}) => {
  if (!structure) return null;

  const def = BUILDINGS[structure.type] || BUILDINGS.RAMPART;
  const hpRatio = structure.durability / structure.maxDurability;
  const canRepair = structure.durability < structure.maxDurability && resources.stone >= 20;
  const isMaxLevel = structure.level >= MAX_STRUCTURE_LEVEL;
  const canUpgrade =
    structure.condition === "Intact" && !isMaxLevel && resources.stone >= 40 && resources.energy >= 20;
  const isRemovable = structure.type !== "CITADEL";

  return (
    <div className="w-full bg-slate-950/90 border border-slate-800 rounded-xl p-4 shadow-xl backdrop-blur-md flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-cyan-400" />
          <h3 className="text-sm font-bold text-slate-100">
            {def.name} <span className="text-cyan-400 font-mono">Lv.{structure.level}</span>
          </h3>
          <span
            className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded ${
              structure.condition === "Intact"
                ? "bg-emerald-950 text-emerald-400 border border-emerald-800"
                : structure.condition === "Damaged"
                ? "bg-amber-950 text-amber-400 border border-amber-800"
                : "bg-red-950 text-red-400 border border-red-800"
            }`}
          >
            {structure.condition}
          </span>
        </div>
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-white transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Grid Specs */}
      <div className="grid grid-cols-3 gap-2 text-xs font-mono">
        <div className="bg-slate-900/80 p-2 rounded border border-slate-800">
          <span className="text-slate-400 text-[10px] block">Sector Grid</span>
          <span className="text-slate-200 font-bold">
            [{structure.gridX}, {structure.gridY}]
          </span>
        </div>
        <div className="bg-slate-900/80 p-2 rounded border border-slate-800">
          <span className="text-slate-400 text-[10px] block">Defense Output</span>
          <span className="text-emerald-400 font-bold">
            +{def.defensePower * structure.level}
          </span>
        </div>
        <div className="bg-slate-900/80 p-2 rounded border border-slate-800">
          <span className="text-slate-400 text-[10px] block">ERC-721 Token</span>
          <span className="text-purple-400 font-bold">
            #{structure.tokenId ?? 0}
          </span>
        </div>
      </div>

      {/* Durability Bar */}
      <div>
        <div className="flex items-center justify-between text-xs font-mono pb-1">
          <span className="text-slate-400">Durability Integrity:</span>
          <span className="text-slate-200">
            {structure.durability} / {structure.maxDurability} HP ({(hpRatio * 100).toFixed(0)}%)
          </span>
        </div>
        <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-300 ${
              hpRatio > 0.5 ? "bg-emerald-500" : hpRatio > 0.2 ? "bg-amber-500" : "bg-red-500"
            }`}
            style={{ width: `${Math.max(0, hpRatio * 100)}%` }}
          ></div>
        </div>
      </div>

      {/* On-Chain Attestation Hash (Phase 3) */}
      <div className="bg-slate-900/90 p-2 rounded border border-slate-800 flex items-center justify-between gap-2 text-[11px] font-mono">
        <div className="flex items-center gap-1.5 text-cyan-400 truncate">
          <Hash className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate">
            Attested Hash: {structure.attestationHash || "0x89ab...c12f"}
          </span>
        </div>
        <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800 shrink-0">
          IMMUTABLE
        </span>
      </div>

      {/* Action Buttons */}
      <div className="grid grid-cols-2 gap-2 pt-1">
        <button
          onClick={() => onRepair(structure.id)}
          disabled={!canRepair}
          className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 text-xs font-bold transition-all cursor-pointer"
        >
          <Wrench className="w-3.5 h-3.5" />
          <span>Repair (20 Stone)</span>
        </button>

        <button
          onClick={() => onUpgrade(structure.id)}
          disabled={!canUpgrade}
          className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 text-white text-xs font-bold transition-all cursor-pointer shadow-md shadow-cyan-600/20"
        >
          <ArrowUpCircle className="w-3.5 h-3.5" />
          <span>{isMaxLevel ? "Max Level" : `Upgrade (Lv.${structure.level + 1})`}</span>
        </button>
      </div>

      <button
        onClick={() => onRemove(structure.id)}
        disabled={!isRemovable}
        title={isRemovable ? undefined : "The Citadel Core cannot be removed"}
        className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-red-950/60 border border-red-900/60 hover:bg-red-900/60 disabled:opacity-30 disabled:cursor-not-allowed text-red-300 text-xs font-bold transition-all cursor-pointer"
      >
        <Trash2 className="w-3.5 h-3.5" />
        <span>Remove (frees tile, no refund)</span>
      </button>
    </div>
  );
};
