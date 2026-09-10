import React, { useEffect, useMemo, useState } from "react";
import { X, ArrowUpCircle, Droplets } from "lucide-react";
import { BUILDINGS, MAX_STRUCTURE_LEVEL, CREDITCOIN_TESTNET, FAUCET_URL } from "../lib/constants";
import { PlacedStructure } from "./CityCanvas";

export interface UpgradeAllPreview {
  targetLevel: number;
  eligibleCount: number;
  upgradingCount: number;
  skippedCount: number;
  totalStoneCost: number;
  totalEnergyCost: number;
  feeCTC: number;
}

interface UpgradeAllModalProps {
  structureType: string | null;
  onClose: () => void;
  structures: PlacedStructure[];
  getPreview: (type: string, targetLevel: number) => UpgradeAllPreview;
  onConfirm: (type: string, targetLevel: number) => void;
  isUpgrading: boolean;
  upgradeError: string | null;
}

export const UpgradeAllModal: React.FC<UpgradeAllModalProps> = ({
  structureType,
  onClose,
  structures,
  getPreview,
  onConfirm,
  isUpgrading,
  upgradeError,
}) => {
  const isOpen = structureType !== null;
  const ofType = useMemo(
    () => (structureType ? structures.filter((s) => s.type === structureType && s.condition === "Intact") : []),
    [structures, structureType]
  );
  const currentMaxLevel = ofType.length > 0 ? Math.max(...ofType.map((s) => s.level)) : 1;

  const [targetLevel, setTargetLevel] = useState(Math.min(currentMaxLevel + 1, MAX_STRUCTURE_LEVEL));

  useEffect(() => {
    if (isOpen) setTargetLevel(Math.min(currentMaxLevel + 1, MAX_STRUCTURE_LEVEL));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, structureType]);

  if (!isOpen || !structureType) return null;

  const buildingName = BUILDINGS[structureType]?.name ?? structureType;
  const preview = getPreview(structureType, targetLevel);

  return (
    <div className="fixed inset-0 z-50 bg-dark-deep/85 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="panel-parchment rounded-md w-full max-w-lg max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-rule flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-sm border border-accent-500 flex items-center justify-center text-accent-700">
              <ArrowUpCircle className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-display text-ink">Upgrade All — {buildingName}</h2>
              <p className="text-xs text-ink-faint italic">Choose a target level for every one you've placed</p>
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
          {upgradeError && (
            <div className="text-[11px] text-[#7a2318] border border-[#7a2318]/50 rounded-sm px-3 py-2 flex flex-col gap-1.5" role="alert">
              <span>{upgradeError}</span>
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

          {/* Target level picker */}
          <section className="flex flex-col gap-2">
            <label htmlFor="target-level-slider" className="kicker text-[10px] text-accent-700 font-bold">
              Target Level — {targetLevel}
            </label>
            <input
              id="target-level-slider"
              type="range"
              min={1}
              max={MAX_STRUCTURE_LEVEL}
              value={targetLevel}
              onChange={(e) => setTargetLevel(Number(e.target.value))}
              className="w-full accent-accent-700"
            />
            <div className="flex items-center justify-between text-[10px] font-mono text-ink-faint">
              <span>Lv.1</span>
              <span>Lv.{MAX_STRUCTURE_LEVEL} (cap)</span>
            </div>
          </section>

          {/* Live preview */}
          <section className="grid grid-cols-2 gap-2 text-xs font-mono">
            <div className="border border-rule p-2.5 rounded-sm">
              <span className="text-ink-faint text-[10px] block">Will Upgrade</span>
              <span className="text-accent-700 font-bold text-base">{preview.upgradingCount}</span>
            </div>
            <div className="border border-rule p-2.5 rounded-sm">
              <span className="text-ink-faint text-[10px] block">Already at/above target</span>
              <span className="text-ink font-bold text-base">{preview.skippedCount}</span>
            </div>
            <div className="border border-rule p-2.5 rounded-sm">
              <span className="text-ink-faint text-[10px] block">Stone / Energy Needed</span>
              <span className="text-ink font-bold">
                {preview.totalStoneCost} / {preview.totalEnergyCost}
              </span>
            </div>
            <div className="border border-rule p-2.5 rounded-sm">
              <span className="text-ink-faint text-[10px] block">Total Cost</span>
              <span className="text-accent-700 font-bold text-base">
                {preview.feeCTC.toFixed(2)} {CREDITCOIN_TESTNET.currencySymbol}
              </span>
            </div>
          </section>

          <p className="text-[11px] text-ink-faint italic leading-relaxed">
            Every {buildingName} below Level {targetLevel} jumps straight to it — nothing is added on top of
            a structure's current level. Anything already at or above Level {targetLevel} is left untouched, at
            no cost.
          </p>

          <button
            onClick={() => onConfirm(structureType, targetLevel)}
            disabled={isUpgrading || preview.upgradingCount === 0}
            className="btn-manuscript w-full py-2.5 rounded-sm text-xs"
          >
            {isUpgrading
              ? "Confirming transaction..."
              : preview.upgradingCount === 0
              ? "Nothing to upgrade at this level"
              : `Upgrade ${preview.upgradingCount} to Level ${targetLevel} — ${preview.feeCTC.toFixed(2)} ${CREDITCOIN_TESTNET.currencySymbol}`}
          </button>
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
