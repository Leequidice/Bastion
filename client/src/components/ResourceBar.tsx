import React from "react";
import {
  Hammer,
  Zap,
  Wheat,
  Shield,
  Sparkles,
  TrendingUp,
  RefreshCw,
} from "lucide-react";

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
}

export const ResourceBar: React.FC<ResourceBarProps> = ({
  resources,
  marketCondition,
  totalDefensePower,
  onHarvest,
  isHarvesting,
}) => {
  const stoneMultFormatted = (marketCondition.stoneMultiplier / 10000).toFixed(
    2,
  );
  const energyMultFormatted = (
    marketCondition.energyMultiplier / 10000
  ).toFixed(2);
  const foodMultFormatted = (marketCondition.foodScarcity / 10000).toFixed(2);

  return (
    <div className="w-full panel-dark border-t-0 px-6 py-2.5 flex flex-wrap items-center justify-between gap-4 text-xs">
      {/* Resource Counters */}
      <div className="flex items-center gap-6">
        {/* Stone */}
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-sm border border-dark-rule flex items-center justify-center text-dark-muted">
            <Hammer className="w-4 h-4" />
          </div>
          <div>
            <div className="kicker text-[9px] text-dark-muted font-semibold">
              Raw Stone
            </div>
            <div className="flex items-center gap-1.5 font-mono font-bold text-dark-text text-sm">
              <span>{Math.floor(resources.stone)}</span>
              <span
                className={`text-[10px] px-1 rounded-sm border ${
                  marketCondition.stoneMultiplier > 10000
                    ? "border-red-800/60 text-red-400"
                    : "border-accent-500/50 text-accent-300"
                }`}
              >
                {stoneMultFormatted}x
              </span>
            </div>
          </div>
        </div>

        {/* Energy */}
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-sm border border-dark-rule flex items-center justify-center text-accent-300">
            <Zap className="w-4 h-4" />
          </div>
          <div>
            <div className="kicker text-[9px] text-dark-muted font-semibold">
              Sunstone Energy
            </div>
            <div className="flex items-center gap-1.5 font-mono font-bold text-dark-text text-sm">
              <span>{Math.floor(resources.energy)}</span>
              <span
                className={`text-[10px] px-1 rounded-sm border ${
                  marketCondition.energyMultiplier > 10000
                    ? "border-accent-500/50 text-accent-300"
                    : "border-dark-rule text-dark-muted"
                }`}
              >
                {energyMultFormatted}x
              </span>
            </div>
          </div>
        </div>

        {/* Food */}
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-sm border border-dark-rule flex items-center justify-center text-dark-muted">
            <Wheat className="w-4 h-4" />
          </div>
          <div>
            <div className="kicker text-[9px] text-dark-muted font-semibold">
              Garrison Grain
            </div>
            <div className="flex items-center gap-1.5 font-mono font-bold text-dark-text text-sm">
              <span>{Math.floor(resources.food)}</span>
              <span
                className={`text-[10px] px-1 rounded-sm border ${
                  marketCondition.foodScarcity > 10000
                    ? "border-red-800/60 text-red-400"
                    : "border-accent-500/50 text-accent-300"
                }`}
              >
                {foodMultFormatted}x
              </span>
            </div>
          </div>
        </div>

        {/* Aegis Alloy */}
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-sm border border-dark-rule flex items-center justify-center text-dark-muted">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <div className="kicker text-[9px] text-dark-muted font-semibold">
              Aegis Alloy
            </div>
            <div className="font-mono font-bold text-dark-text text-sm">
              {Math.floor(resources.aegisAlloy)}
            </div>
          </div>
        </div>
      </div>

      {/* Cross-chain Attested Market Multiplier Status */}
      <div className="flex items-center gap-3 border border-dark-rule px-3 py-1.5 rounded-sm max-w-md">
        <TrendingUp className="w-4 h-4 text-accent-300 shrink-0" />
        <div className="truncate">
          <span className="kicker text-[9px] text-accent-300 font-bold block">
            Attested Market Condition
          </span>
          <span className="text-xs text-dark-muted font-medium truncate block italic">
            {marketCondition.description}
          </span>
        </div>
      </div>

      {/* Defense Output & Actions */}
      <div className="flex items-center gap-3">
        <div className="text-right">
          <div className="kicker text-[9px] text-dark-muted font-semibold">
            Total Defense Rating
          </div>
          <div className="font-mono font-bold text-accent-300 text-sm flex items-center justify-end gap-1">
            <Shield className="w-3.5 h-3.5" />
            <span>{totalDefensePower} DMG</span>
          </div>
        </div>

        <button
          onClick={onHarvest}
          disabled={isHarvesting}
          className="!btn-manuscript-dark px-3 py-2 rounded-sm"
        >
          <RefreshCw
            className={`w-3.5 h-3.5 ${isHarvesting ? "animate-spin" : ""}`}
          />
          <span>Harvest Vault</span>
        </button>
      </div>
    </div>
  );
};
