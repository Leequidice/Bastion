import React from "react";
import { BUILDINGS, BuildingDefinition } from "../lib/constants";
import { Layers, Crosshair, Zap, Hammer, Wheat, Sun, Shield } from "lucide-react";
import { Resources } from "./ResourceBar";

interface BuildMenuProps {
  selectedBuildingId: string | null;
  onSelectBuilding: (buildingId: string | null) => void;
  resources: Resources;
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
}) => {
  const buildingList = Object.values(BUILDINGS).filter((b) => b.category !== "core");

  return (
    <div className="w-full bg-slate-950/80 border border-slate-800 rounded-xl p-4 shadow-xl backdrop-blur-md flex flex-col gap-3">
      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
        <h2 className="text-sm font-bold text-slate-100 uppercase tracking-wider">
          Construction Palette
        </h2>
        <span className="text-[11px] text-slate-400">
          Select structure & click tile
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {buildingList.map((b) => {
          const isSelected = selectedBuildingId === b.id;
          const canAfford =
            resources.stone >= b.cost.stone &&
            resources.energy >= b.cost.energy &&
            resources.food >= b.cost.food &&
            resources.aegisAlloy >= b.cost.alloy;

          return (
            <button
              key={b.id}
              onClick={() => onSelectBuilding(isSelected ? null : b.id)}
              className={`p-2.5 rounded-lg border text-left flex flex-col justify-between gap-1.5 transition-all cursor-pointer ${
                isSelected
                  ? "bg-cyan-950/70 border-cyan-500 shadow-md shadow-cyan-500/20"
                  : canAfford
                  ? "bg-slate-900/90 border-slate-800 hover:border-slate-700 hover:bg-slate-800/80"
                  : "bg-slate-950 border-slate-900 opacity-40 cursor-not-allowed"
              }`}
            >
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-1.5 font-bold text-xs text-slate-200">
                  <span className="text-cyan-400">{ICONS[b.icon]}</span>
                  <span className="truncate">{b.name}</span>
                </div>
                {b.defensePower > 0 && (
                  <span className="text-[10px] font-mono text-emerald-400 font-semibold">
                    +{b.defensePower}
                  </span>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2 text-[10px] font-mono text-slate-400">
                {b.cost.stone > 0 && <span>{b.cost.stone} Stone</span>}
                {b.cost.energy > 0 && <span>{b.cost.energy} Energy</span>}
                {b.cost.food > 0 && <span>{b.cost.food} Food</span>}
                {b.cost.alloy > 0 && <span>{b.cost.alloy} Alloy</span>}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
