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
  CheckCircle2,
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
  upgradingType: string | null;
  upgradeError: string | null;
  getUpgradeAllFeeCTC: (type: string) => number;
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

function buildCostSummary(cost: {
  stone: number;
  energy: number;
  food: number;
  alloy: number;
}): string {
  const parts: string[] = [];
  if (cost.stone > 0) parts.push(`${cost.stone} stone`);
  if (cost.energy > 0) parts.push(`${cost.energy} energy`);
  if (cost.food > 0) parts.push(`${cost.food} food`);
  if (cost.alloy > 0) parts.push(`${cost.alloy} aegis alloy`);
  return parts.length > 0 ? parts.join(", ") : "no resources";
}

export const BuildMenu: React.FC<BuildMenuProps> = ({
  selectedBuildingId,
  onSelectBuilding,
  resources,
  structures,
  onHealAllOfType,
  onUpgradeAllOfType,
  healingType,
  healError,
  upgradingType,
  upgradeError,
  getUpgradeAllFeeCTC,
}) => {
  const groups: Array<{ label: string; category: "defense" | "economy" }> = [
    { label: "Defenses", category: "defense" },
    { label: "Resources", category: "economy" },
  ];

  const renderBuildingCard = (b: (typeof BUILDINGS)[string]) => {
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
    const canUpgrade = upgradeEligibleCount > 0;
    const isHealingThisType = healingType === b.id;
    const isUpgradingThisType = upgradingType === b.id;
    const upgradeFee = getUpgradeAllFeeCTC(b.id);

    const cardAriaLabel = `${b.name}. Costs ${buildCostSummary(b.cost)}.${
      b.defensePower > 0 ? ` Defense power ${b.defensePower}.` : ""
    } ${b.description} ${isSelected ? "Currently selected." : canAfford ? "" : "Not enough resources — unavailable."}`;

    return (
      <div key={b.id} className="flex flex-col gap-1">
        <button
          type="button"
          onClick={() => onSelectBuilding(isSelected ? null : b.id)}
          disabled={!canAfford}
          aria-label={cardAriaLabel}
          aria-pressed={isSelected}
          aria-disabled={!canAfford}
          className={`relative w-full p-2.5 rounded-sm border text-left flex flex-col justify-between gap-1.5 transition-all min-h-[7.5rem] active:scale-[0.97] ${
            isSelected
              ? "border-accent-500 bg-accent-300/15 cursor-pointer"
              : canAfford
                ? "border-rule hover:border-accent-500/60 hover:bg-accent-300/5 cursor-pointer"
                : "border-rule opacity-80 cursor-not-allowed"
          }`}
        >
          {isSelected && (
            <CheckCircle2
              className="absolute top-1.5 right-1.5 w-4 h-4 text-accent-700"
              aria-hidden="true"
            />
          )}
          <div className="flex items-center justify-between w-full pr-4">
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
        </button>

        {ofType.length > 0 && (
          <div className="flex gap-1">
            <button
              type="button"
              onClick={() => onHealAllOfType(b.id)}
              disabled={!canHeal || isHealingThisType}
              aria-label={`Heal all ${b.name} structures — repairs ${damagedCount} damaged of ${ofType.length} placed, small on-chain fee`}
              title="Heal every damaged structure of this type (small on-chain fee)"
              className={`!btn-manuscript-dark flex gap-1 flex-1 py-1.5 items-center justify-center rounded-sm text-[10px] ${
                !canHeal || isHealingThisType
                  ? "opacity-80 cursor-not-allowed"
                  : "cursor-pointer"
              }`}
            >
              <HeartPulse className="w-3 h-3" />
              <span>{isHealingThisType ? "Confirming..." : "Heal All"}</span>
            </button>
            <button
              type="button"
              onClick={() => onUpgradeAllOfType(b.id)}
              disabled={!canUpgrade || isUpgradingThisType}
              aria-label={`Upgrade all ${b.name} structures — levels up ${upgradeEligibleCount} eligible of ${ofType.length} placed for ${upgradeFee.toFixed(2)} tCTC`}
              title={`Upgrade every eligible structure of this type by one level (${upgradeFee.toFixed(2)} tCTC)`}
              className={`!btn-manuscript-dark flex gap-1 items-center justify-center flex-1 py-1.5 rounded-sm text-[10px] ${
                !canUpgrade || isUpgradingThisType
                  ? "opacity-80 cursor-not-allowed"
                  : "cursor-pointer"
              }`}
            >
              <ArrowUpCircle className="w-3 h-3" />
              <span>
                {isUpgradingThisType
                  ? "Confirming..."
                  : canUpgrade
                    ? `${upgradeFee.toFixed(2)} tCTC`
                    : "Upgrade All"}
              </span>
              {/* <span>
                {isUpgradingThisType
                  ? "Confirming..."
                  : canUpgrade
                    ? `Upgrade — ${upgradeFee.toFixed(2)} tCTC`
                    : "Upgrade All"}
              </span> */}
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="w-full panel-parchment rounded-md p-4 shadow-xl flex flex-col gap-4">
      <div className="flex items-center justify-between border-b border-rule pb-2">
        <h2 className="text-base font-display text-ink">
          Construction Palette
        </h2>
        <span className="kicker text-[9px] text-ink-faint">
          Select & click tile
        </span>
      </div>

      {healError && (
        <div
          className="text-[11px] text-[#7a2318] border border-[#7a2318]/50 rounded-sm px-2 py-1.5 flex flex-col gap-1"
          role="alert"
        >
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

      {upgradeError && (
        <div
          className="text-[11px] text-[#7a2318] border border-[#7a2318]/50 rounded-sm px-2 py-1.5 flex flex-col gap-1"
          role="alert"
        >
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

      {groups.map((group) => {
        const buildingList = Object.values(BUILDINGS).filter(
          (b) => b.category === group.category,
        );
        if (buildingList.length === 0) return null;

        return (
          <div key={group.category} className="flex flex-col gap-2">
            <h3 className="kicker text-[10px] text-accent-700 font-bold border-b border-rule/60 pb-1">
              {group.label}
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {buildingList.map(renderBuildingCard)}
            </div>
          </div>
        );
      })}
    </div>
  );
};
