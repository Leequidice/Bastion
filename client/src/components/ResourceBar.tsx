import React from "react";
import { Hammer, Zap, Wheat, Shield, Sparkles, TrendingUp, RefreshCw, HeartPulse, ArrowUpCircle } from "lucide-react";

export interface Resources {
  stone: number;
  energy: number;
  food: number;
  aegisAlloy: number;
}

export interface MarketConditionState {
  description: string;
  stoneMultiplier: number;  // 10000 = 1.0x
  energyMultiplier: number; // 10000 = 1.0x
  foodScarcity: number;     // 10000 = 1.0x
}

interface ResourceBarProps {
  resources: Resources;
  marketCondition: MarketConditionState;
  totalDefensePower: number;
  onHarvest: () => void;
  isHarvesting: boolean;
  onHealAll: () => void;
  canHealAll: boolean;
  onUpgradeAll: () => void;
  canUpgradeAll: boolean;
}

export const ResourceBar: React.FC<ResourceBarProps> = ({
  resources,
  marketCondition,
  totalDefensePower,
  onHarvest,
  isHarvesting,
  onHealAll,
  canHealAll,
  onUpgradeAll,
  canUpgradeAll,
}) => {
  const stoneMultFormatted = (marketCondition.stoneMultiplier / 10000).toFixed(2);
  const energyMultFormatted = (marketCondition.energyMultiplier / 10000).toFixed(2);
  const foodMultFormatted = (marketCondition.foodScarcity / 10000).toFixed(2);

  return (
    <div className="w-full bg-slate-900/90 border-b border-slate-800 px-6 py-2.5 flex flex-wrap items-center justify-between gap-4 text-xs">
      {/* Resource Counters */}
      <div className="flex items-center gap-6">
        {/* Stone */}
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded bg-slate-800 flex items-center justify-center text-slate-300">
            <Hammer className="w-4 h-4 text-slate-300" />
          </div>
          <div>
            <div className="text-[10px] uppercase text-slate-400 font-semibold tracking-wider">
              Raw Stone
            </div>
            <div className="flex items-center gap-1.5 font-mono font-bold text-slate-100 text-sm">
              <span>{Math.floor(resources.stone)}</span>
              <span className={`text-[10px] px-1 rounded ${
                marketCondition.stoneMultiplier > 10000 ? "bg-red-950 text-red-400" : "bg-emerald-950 text-emerald-400"
              }`}>
                {stoneMultFormatted}x
              </span>
            </div>
          </div>
        </div>

        {/* Energy */}
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded bg-cyan-950 flex items-center justify-center text-cyan-400">
            <Zap className="w-4 h-4 text-cyan-400" />
          </div>
          <div>
            <div className="text-[10px] uppercase text-slate-400 font-semibold tracking-wider">
              Sunstone Energy
            </div>
            <div className="flex items-center gap-1.5 font-mono font-bold text-cyan-200 text-sm">
              <span>{Math.floor(resources.energy)}</span>
              <span className={`text-[10px] px-1 rounded ${
                marketCondition.energyMultiplier > 10000 ? "bg-cyan-950 text-cyan-400" : "bg-slate-800 text-slate-400"
              }`}>
                {energyMultFormatted}x
              </span>
            </div>
          </div>
        </div>

        {/* Food */}
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded bg-amber-950 flex items-center justify-center text-amber-400">
            <Wheat className="w-4 h-4 text-amber-400" />
          </div>
          <div>
            <div className="text-[10px] uppercase text-slate-400 font-semibold tracking-wider">
              Garrison Grain
            </div>
            <div className="flex items-center gap-1.5 font-mono font-bold text-amber-200 text-sm">
              <span>{Math.floor(resources.food)}</span>
              <span className={`text-[10px] px-1 rounded ${
                marketCondition.foodScarcity > 10000 ? "bg-red-950 text-red-400" : "bg-emerald-950 text-emerald-400"
              }`}>
                {foodMultFormatted}x
              </span>
            </div>
          </div>
        </div>

        {/* Aegis Alloy */}
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded bg-purple-950 flex items-center justify-center text-purple-400">
            <Sparkles className="w-4 h-4 text-purple-400" />
          </div>
          <div>
            <div className="text-[10px] uppercase text-slate-400 font-semibold tracking-wider">
              Aegis Alloy
            </div>
            <div className="font-mono font-bold text-purple-200 text-sm">
              {Math.floor(resources.aegisAlloy)}
            </div>
          </div>
        </div>
      </div>

      {/* Cross-chain Attested Market Multiplier Status */}
      <div className="flex items-center gap-3 bg-slate-950 border border-slate-800 px-3 py-1.5 rounded-lg max-w-md">
        <TrendingUp className="w-4 h-4 text-cyan-400 shrink-0" />
        <div className="truncate">
          <span className="text-[10px] text-cyan-400 font-bold uppercase tracking-wider block">
            Attested Market Condition (Phase 2):
          </span>
          <span className="text-xs text-slate-300 font-medium truncate block">
            {marketCondition.description}
          </span>
        </div>
      </div>

      {/* Defense Output & Harvest Action */}
      <div className="flex items-center gap-3">
        <div className="text-right">
          <div className="text-[10px] uppercase text-slate-400 font-semibold">Total Defense Rating</div>
          <div className="font-mono font-bold text-emerald-400 text-sm flex items-center justify-end gap-1">
            <Shield className="w-3.5 h-3.5" />
            <span>{totalDefensePower} DMG</span>
          </div>
        </div>

        <button
          onClick={onHarvest}
          disabled={isHarvesting}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-semibold shadow-md shadow-emerald-700/20 transition-all cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isHarvesting ? "animate-spin" : ""}`} />
          <span>Harvest Vault</span>
        </button>

        <button
          onClick={onHealAll}
          disabled={!canHealAll}
          title="Repair every damaged structure (20 Stone each)"
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 font-semibold shadow-md transition-all cursor-pointer"
        >
          <HeartPulse className="w-3.5 h-3.5 text-emerald-400" />
          <span>Heal All</span>
        </button>

        <button
          onClick={onUpgradeAll}
          disabled={!canUpgradeAll}
          title="Upgrade every eligible structure by one level (40 Stone + 20 Energy each)"
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 text-white font-semibold shadow-md shadow-cyan-600/20 transition-all cursor-pointer"
        >
          <ArrowUpCircle className="w-3.5 h-3.5" />
          <span>Upgrade All</span>
        </button>
      </div>
    </div>
  );
};
