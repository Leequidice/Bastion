import React from "react";
import { BUILDINGS, MAX_STRUCTURE_LEVEL, FAUCET_URL } from "../lib/constants";
import {
  Layers,
  Crosshair,
  Zap,
  Hammer,
  Wheat,
  Sun,
  Shield,
  HeartPulse,
  ArrowUpCircle,
  Droplets,
} from "lucide-react";
import { Resources } from "./ResourceBar";
import { PlacedStructure } from "./CityCanvas";

interface BuildMenuProps {
  selectedBuildingId: string | null;
  onSelectBuilding: (buildingId: string | null) => void;
  resources: Resources;
  structures: PlacedStructure[];
  onHealAllOfType: (type: string) => void;
  onUpgradeAllOfType: (type: string) => void;
  healingType: string | null;
  healError: string | null;
}

const ICONS: Record<string, React.ReactNode> = {
  Layers: <Layers className="w-4 h-4" />,
  Crosshair: <Crosshair className="w-4 h-4" />,
  Zap: <Zap className="w-4 h-4" />,
  Hammer: <Hammer className="w-4 h-4" />,
  Wheat: <Wheat className="w-4 h-4" />,
  Sun: <Sun className="w-4 h-4" />,
  Shield: <Shield className="w-4 h-4" />,
};

export const BuildMenu: React.FC<BuildMenuProps> = ({
  selectedBuildingId,
  onSelectBuilding,
  resources,
  structures,
  onHealAllOfType,
  onUpgradeAllOfType,
  healingType,
  healError,
}) => {
  const buildingList = Object.values(BUILDINGS).filter(
    (b) => b.category !== "core",
  );

  return (
    <div className="w-full panel-parchment rounded-md p-4 shadow-xl flex flex-col gap-3">
      <div className="flex items-center justify-between border-b border-rule pb-2">
        <h2 className="text-base font-display text-ink">
          Construction Palette
        </h2>
        <span className="kicker text-[9px] text-ink-faint">
          Select & click tile
        </span>
      </div>

      {healError && (
        <div className="text-[11px] text-[#7a2318] border border-[#7a2318]/50 rounded-sm px-2 py-1.5 flex flex-col gap-1">
          <span>{healError}</span>
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

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {buildingList.map((b) => {
          const isSelected = selectedBuildingId === b.id;
          const canAfford =
            resources.stone >= b.cost.stone &&
            resources.energy >= b.cost.energy &&
            resources.food >= b.cost.food &&
            resources.aegisAlloy >= b.cost.alloy;

          const ofType = structures.filter((s) => s.type === b.id);
          const damagedCount = ofType.filter(
            (s) => s.durability < s.maxDurability,
          ).length;
          const upgradeEligibleCount = ofType.filter(
            (s) => s.condition === "Intact" && s.level < MAX_STRUCTURE_LEVEL,
          ).length;
          const canHeal = damagedCount > 0;
          const canUpgrade =
            upgradeEligibleCount > 0 &&
            resources.stone >= upgradeEligibleCount * 40 &&
            resources.energy >= upgradeEligibleCount * 20;
          const isHealingThisType = healingType === b.id;

          return (
            <div key={b.id} className="flex flex-col gap-1">
              <button
                onClick={() => onSelectBuilding(isSelected ? null : b.id)}
                className={`w-full p-2.5 rounded-sm border text-left flex flex-col justify-between gap-1.5 transition-all cursor-pointer min-h-[7.5rem] ${
                  isSelected
                    ? "border-accent-500 bg-accent-300/15"
                    : canAfford
                      ? "border-rule hover:border-accent-500/60 hover:bg-accent-300/5"
                      : "border-rule opacity-40 cursor-not-allowed"
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-1.5 font-semibold text-xs text-ink">
                    <span className="text-accent-700">{ICONS[b.icon]}</span>
                    <span className="truncate">{b.name}</span>
                  </div>
                  {b.defensePower > 0 && (
                    <span className="text-[10px] font-mono text-accent-700 font-semibold">
                      +{b.defensePower}
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2 text-[10px] font-mono text-ink-faint">
                  {b.cost.stone > 0 && <span>{b.cost.stone} Stone</span>}
                  {b.cost.energy > 0 && <span>{b.cost.energy} Energy</span>}
                  {b.cost.food > 0 && <span>{b.cost.food} Food</span>}
                  {b.cost.alloy > 0 && <span>{b.cost.alloy} Alloy</span>}
                </div>
                {ofType.length > 0 && (
                  <div className="flex gap-1">
                    <button
                      onClick={() => onHealAllOfType(b.id)}
                      disabled={!canHeal || isHealingThisType}
                      title="Heal every damaged structure of this type (small on-chain fee)"
                      className="!btn-manuscript-dark flex gap-1 flex-1 py-1.5 items-center rounded-sm text-[10px] "
                    >
                      <HeartPulse className="w-3 h-3" />
                      <span>
                        {isHealingThisType ? "Confirming..." : "Heal All"}
                      </span>
                    </button>
                    <button
                      onClick={() => onUpgradeAllOfType(b.id)}
                      disabled={!canUpgrade}
                      title="Upgrade every eligible structure of this type by one level"
                      className="!btn-manuscript-dark flex gap-1 items-center flex-1 py-1.5 rounded-sm text-[10px] "
                    >
                      <ArrowUpCircle className="w-3 h-3" />
                      <span>Upgrade</span>
                    </button>
                  </div>
                )}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};
