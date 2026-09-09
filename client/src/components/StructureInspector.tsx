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
    <div className="w-full panel-parchment rounded-md p-4 shadow-xl flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-rule pb-2">
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-accent-700" />
          <h3 className="text-base font-display text-ink">
            {def.name} <span className="text-accent-700 font-mono text-sm">Lv.{structure.level}</span>
          </h3>
          <span
            className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-sm border ${
              structure.condition === "Intact"
                ? "border-accent-500/60 text-accent-700"
                : structure.condition === "Damaged"
                ? "border-[#7a5a11]/60 text-[#7a5a11]"
                : "border-[#7a2318]/60 text-[#7a2318]"
            }`}
          >
            {structure.condition}
          </span>
        </div>
        <button
          onClick={onClose}
          className="text-ink-faint hover:text-ink transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Grid Specs */}
      <div className="grid grid-cols-3 gap-2 text-xs font-mono">
        <div className="border border-rule p-2 rounded-sm">
          <span className="text-ink-faint text-[10px] block">Sector Grid</span>
          <span className="text-ink font-bold">
            [{structure.gridX}, {structure.gridY}]
          </span>
        </div>
        <div className="border border-rule p-2 rounded-sm">
          <span className="text-ink-faint text-[10px] block">Defense Output</span>
          <span className="text-accent-700 font-bold">
            +{def.defensePower * structure.level}
          </span>
        </div>
        <div className="border border-rule p-2 rounded-sm">
          <span className="text-ink-faint text-[10px] block">ERC-721 Token</span>
          <span className="text-ink-soft font-bold">
            #{structure.tokenId ?? 0}
          </span>
        </div>
      </div>

      {/* Durability Bar */}
      <div>
        <div className="flex items-center justify-between text-xs font-mono pb-1">
          <span className="text-ink-faint">Durability Integrity:</span>
          <span className="text-ink">
            {structure.durability} / {structure.maxDurability} HP ({(hpRatio * 100).toFixed(0)}%)
          </span>
        </div>
        <div className="w-full h-2 border border-rule rounded-sm overflow-hidden bg-paper-deep/40">
          <div
            className={`h-full transition-all duration-300 ${
              hpRatio > 0.5 ? "bg-accent-500" : hpRatio > 0.2 ? "bg-[#7a5a11]" : "bg-[#7a2318]"
            }`}
            style={{ width: `${Math.max(0, hpRatio * 100)}%` }}
          ></div>
        </div>
      </div>

      {/* On-Chain Attestation Hash (Phase 3) */}
      <div className="border border-rule p-2 rounded-sm flex items-center justify-between gap-2 text-[11px] font-mono">
        <div className="flex items-center gap-1.5 text-ink-soft truncate">
          <Hash className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate">
            Attested Hash: {structure.attestationHash || "0x89ab...c12f"}
          </span>
        </div>
        <span className="text-[10px] px-1.5 py-0.5 rounded-sm border border-accent-500/50 text-accent-700 shrink-0">
          Immutable
        </span>
      </div>

      {/* Action Buttons */}
      <div className="grid grid-cols-2 gap-2 pt-1">
        <button
          onClick={() => onRepair(structure.id)}
          disabled={!canRepair}
          className="btn-manuscript-quiet py-2 px-3 rounded-sm text-xs"
        >
          <Wrench className="w-3.5 h-3.5" />
          <span>Repair (20 Stone)</span>
        </button>

        <button
          onClick={() => onUpgrade(structure.id)}
          disabled={!canUpgrade}
          className="btn-manuscript py-2 px-3 rounded-sm text-xs"
        >
          <ArrowUpCircle className="w-3.5 h-3.5" />
          <span>{isMaxLevel ? "Max Level" : `Upgrade (Lv.${structure.level + 1})`}</span>
        </button>
      </div>

      <button
        onClick={() => onRemove(structure.id)}
        disabled={!isRemovable}
        title={isRemovable ? undefined : "The Citadel Core cannot be removed"}
        className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-sm border border-[#7a2318]/50 hover:bg-[#7a2318]/10 disabled:opacity-30 disabled:cursor-not-allowed text-[#7a2318] text-xs font-bold transition-all cursor-pointer"
      >
        <Trash2 className="w-3.5 h-3.5" />
        <span>Remove (frees tile, no refund)</span>
      </button>
    </div>
  );
};
