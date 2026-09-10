import React, { useState } from "react";
import { Hammer, Zap, Wheat, Shield, Sparkles, RefreshCw, BookOpen, Plus } from "lucide-react";

export interface Resources {
  stone: number;
  energy: number;
  food: number;
  aegisAlloy: number;
}

export interface MarketConditionState {
  description: string;
  stoneMultiplier: number; // 10000 = 1.0x
  energyMultiplier: number; // 10000 = 1.0x
  foodScarcity: number; // 10000 = 1.0x
}

interface ResourceBarProps {
  resources: Resources;
  marketCondition: MarketConditionState;
  totalDefensePower: number;
  onHarvest: () => void;
  isHarvesting: boolean;
  onOpenHowToPlay: () => void;
  onOpenResourcePacks: () => void;
}

interface ResourceInfo {
  key: string;
  label: string;
  icon: React.ReactNode;
  value: number;
  howToGet: string;
}

export const ResourceBar: React.FC<ResourceBarProps> = ({
  resources,
  marketCondition,
  totalDefensePower,
  onHarvest,
  isHarvesting,
  onOpenHowToPlay,
  onOpenResourcePacks,
}) => {
  const [hoveredResource, setHoveredResource] = useState<string | null>(null);

  const stoneMultFormatted = (marketCondition.stoneMultiplier / 10000).toFixed(2);
  const energyMultFormatted = (marketCondition.energyMultiplier / 10000).toFixed(2);
  const foodMultFormatted = (marketCondition.foodScarcity / 10000).toFixed(2);

  const resourceInfo: ResourceInfo[] = [
    {
      key: "stone",
      label: "Raw Stone",
      icon: <Hammer className="w-4 h-4" />,
      value: resources.stone,
      howToGet:
        "Harvest the Vault, or place Stone Quarries in the Resources palette to boost your yield.",
    },
    {
      key: "energy",
      label: "Sunstone Energy",
      icon: <Zap className="w-4 h-4" />,
      value: resources.energy,
      howToGet:
        "Harvest the Vault, or place Sunstone Collectors in the Resources palette to boost your yield.",
    },
    {
      key: "food",
      label: "Garrison Grain",
      icon: <Wheat className="w-4 h-4" />,
      value: resources.food,
      howToGet:
        "Harvest the Vault, or place Terrace Hydro-Farms in the Resources palette to boost your yield.",
    },
    {
      key: "aegisAlloy",
      label: "Aegis Alloy",
      icon: <Sparkles className="w-4 h-4" />,
      value: resources.aegisAlloy,
      howToGet:
        "Stone Quarries also mine Alloy — every Harvest yields Alloy at 10% of your Stone gain. New commanders start with 100, and reaching Level 15 multiplies your whole vault by 15x.",
    },
  ];

  return (
    <div className="w-full panel-dark border-t-0 px-6 py-2.5 flex flex-wrap items-center justify-between gap-4 text-xs">
      {/* Resource Counters */}
      <div className="flex items-center gap-6">
        {resourceInfo.map((r) => (
          <div
            key={r.key}
            className="relative flex items-center gap-2"
            onMouseEnter={() => setHoveredResource(r.key)}
            onMouseLeave={() => setHoveredResource(null)}
          >
            <div className="w-7 h-7 rounded-sm border border-dark-rule flex items-center justify-center text-dark-muted">
              {r.icon}
            </div>
            <div>
              <div className="kicker text-[9px] text-dark-muted font-semibold">{r.label}</div>
              <div className="flex items-center gap-1.5 font-mono font-bold text-dark-text text-sm">
                <span>{Math.floor(r.value)}</span>
                {r.key === "stone" && (
                  <span
                    className={`text-[10px] px-1 rounded-sm border ${
                      marketCondition.stoneMultiplier > 10000
                        ? "border-red-800/60 text-red-400"
                        : "border-accent-500/50 text-accent-300"
                    }`}
                  >
                    {stoneMultFormatted}x
                  </span>
                )}
                {r.key === "energy" && (
                  <span
                    className={`text-[10px] px-1 rounded-sm border ${
                      marketCondition.energyMultiplier > 10000
                        ? "border-accent-500/50 text-accent-300"
                        : "border-dark-rule text-dark-muted"
                    }`}
                  >
                    {energyMultFormatted}x
                  </span>
                )}
                {r.key === "food" && (
                  <span
                    className={`text-[10px] px-1 rounded-sm border ${
                      marketCondition.foodScarcity > 10000
                        ? "border-red-800/60 text-red-400"
                        : "border-accent-500/50 text-accent-300"
                    }`}
                  >
                    {foodMultFormatted}x
                  </span>
                )}
              </div>
            </div>

            {hoveredResource === r.key && (
              <div
                className="absolute left-0 top-full mt-2 w-56 rounded-sm border border-accent-500/40 p-2.5 text-[11px] leading-relaxed shadow-xl z-50"
                style={{ backgroundColor: "var(--color-accent-900)", color: "var(--color-accent-300)" }}
              >
                {r.howToGet}
              </div>
            )}
          </div>
        ))}

        <button
          onClick={onOpenResourcePacks}
          title="Buy a Resource Pack"
          aria-label="Buy a Resource Pack"
          className="w-7 h-7 rounded-sm border border-accent-500/60 text-accent-300 hover:bg-accent-900/40 transition-colors cursor-pointer flex items-center justify-center"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {/* How to Play */}
      <button
        onClick={onOpenHowToPlay}
        className="flex items-center gap-3 border border-dark-rule px-3 py-1.5 rounded-sm max-w-md hover:border-accent-500/60 hover:bg-dark-rule/10 transition-colors cursor-pointer text-left"
      >
        <BookOpen className="w-4 h-4 text-accent-300 shrink-0" />
        <div className="truncate">
          <span className="kicker text-[9px] text-accent-300 font-bold block">How to Play</span>
          <span className="text-xs text-dark-muted font-medium truncate block italic">
            Resources, transactions & the Level 15 challenge
          </span>
        </div>
      </button>

      {/* Defense Output & Harvest Action */}
      <div className="flex items-center gap-3">
        <div className="text-right">
          <div className="kicker text-[9px] text-dark-muted font-semibold">Total Defense Rating</div>
          <div className="font-mono font-bold text-accent-300 text-sm flex items-center justify-end gap-1">
            <Shield className="w-3.5 h-3.5" />
            <span>{totalDefensePower} DMG</span>
          </div>
        </div>

        <button
          onClick={onHarvest}
          disabled={isHarvesting}
          className="!btn-manuscript-dark px-3 py-2 rounded-sm flex gap-1 border-1 border-grey-200/80"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isHarvesting ? "animate-spin" : ""}`} />
          <span>Harvest Vault</span>
        </button>
      </div>
    </div>
  );
};
