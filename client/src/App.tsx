import React from "react";
import { useBastionGame } from "./hooks/useBastionGame";
import { DashboardHeader } from "./components/DashboardHeader";
import { ResourceBar } from "./components/ResourceBar";
import { CityCanvas } from "./components/CityCanvas";
import { IncursionRadar } from "./components/IncursionRadar";
import { BuildMenu } from "./components/BuildMenu";
import { StructureInspector } from "./components/StructureInspector";
import { AttestationModal } from "./components/AttestationModal";
import { Shield, Sparkles, ExternalLink, HelpCircle } from "lucide-react";

export function App() {
  const game = useBastionGame();

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-cyan-500 selection:text-white">
      {/* Top Navigation & Status */}
      <DashboardHeader
        account={game.account}
        balance={game.balance}
        networkId={game.networkId}
        onConnectWallet={game.handleConnectWallet}
        onSwitchNetwork={game.handleSwitchNetwork}
        onOpenProofModal={() => game.setIsProofModalOpen(true)}
        isSandboxMode={game.isSandboxMode}
        onToggleSandbox={() => game.setIsSandboxMode(!game.isSandboxMode)}
      />

      {/* Resource & Market Multiplier Bar (Phase 2) */}
      <ResourceBar
        resources={game.resources}
        marketCondition={game.marketCondition}
        totalDefensePower={game.totalDefensePower}
        onHarvest={game.handleHarvest}
        isHarvesting={game.isHarvesting}
      />

      {/* Main Tactical Grid & Defense Command Workspace */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left / Center Column: 2D City Builder Canvas */}
        <div className="lg:col-span-7 flex flex-col gap-4">
          <CityCanvas
            structures={game.structures}
            selectedBuildingId={game.selectedBuildingId}
            onTileClick={game.handlePlaceBuilding}
            onSelectStructure={game.setInspectedStructure}
            battleState={game.battleState}
            wallStatus={game.wallStatus}
            lastFiredStructureIds={game.lastFiredStructureIds}
          />

          {/* Tactical Instructions & Mechanics Guide */}
          <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-4 text-xs text-slate-300 flex flex-col gap-2">
            <div className="flex items-center gap-2 font-bold text-cyan-300">
              <HelpCircle className="w-4 h-4 text-cyan-400" />
              <span>Attestcoin Core Game Loop:</span>
            </div>
            <ol className="list-decimal list-inside space-y-1 text-slate-400">
              <li>
                <strong>Fortify the Redoubt:</strong> Choose Ramparts, Ballistas, and Sunstone Batteries from the palette and place them on empty sectors before the Titan arrives.
              </li>
              <li>
                <strong>Sound the Horn:</strong> Starting a wave polls an Attestcoin proof from Ethereum Sepolia for flavor while a Titan spawns and begins marching down the lane toward the Wall in real time.
              </li>
              <li>
                <strong>Automatic Defense:</strong> Every placed defense fires on its own cooldown as the Titan approaches — no manual firing needed. Kill it before it reaches the Wall.
              </li>
              <li>
                <strong>Escalating Levels:</strong> Each Titan you repel raises the level — HP grows 70% per wave, the march grows longer, and the Titan creeps slightly faster. There is no level cap; if the Titan ever reaches the Wall, the Wall falls and the run ends.
              </li>
              <li>
                <strong>Attested Resource Economy (Phase 2):</strong> Resource costs dynamically fluctuate based on cross-chain seismic data. Harvest and spend bounty from repelled waves to build and upgrade more defenses.
              </li>
              <li>
                <strong>Portable Structure NFTs (Phase 3):</strong> Click on any wall or tower to inspect its ERC-721 token ID and on-chain Attestation Hash.
              </li>
            </ol>
          </div>
        </div>

        {/* Right Column: Tactical Radar, Build Menu & Structure Inspector */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          {/* Phase 1: Incursion Radar & Siege Terminal */}
          <IncursionRadar
            level={game.level}
            highestLevelReached={game.highestLevelReached}
            battleState={game.battleState}
            wallStatus={game.wallStatus}
            totalRepelled={game.totalRepelled}
            totalBreached={game.totalBreached}
            isStarting={game.isStarting}
            onStartWave={game.handleStartWave}
            onRestart={game.handleRestart}
          />

          {/* Structure Inspector (Phase 3 NFT state) */}
          {game.inspectedStructure && (
            <StructureInspector
              structure={game.inspectedStructure}
              onClose={() => game.setInspectedStructure(null)}
              onRepair={game.handleRepairStructure}
              onUpgrade={game.handleUpgradeStructure}
              resources={game.resources}
            />
          )}

          {/* Construction Palette */}
          <BuildMenu
            selectedBuildingId={game.selectedBuildingId}
            onSelectBuilding={game.setSelectedBuildingId}
            resources={game.resources}
          />
        </div>
      </main>

      {/* Attestcoin Proof Inspector Modal */}
      <AttestationModal
        isOpen={game.isProofModalOpen}
        onClose={() => game.setIsProofModalOpen(false)}
        latestPayload={game.latestPayload}
      />

      {/* Footer */}
      <footer className="w-full border-t border-slate-900 bg-slate-950 py-4 px-6 text-center text-xs text-slate-500 flex flex-wrap items-center justify-between gap-2">
        <span>Bastion © 2026 • Built for BUIDL CTC 2026 Fall Hackathon (Gaming Track)</span>
        <div className="flex items-center gap-4">
          <a
            href="https://docs.attestcoin.org"
            target="_blank"
            rel="noreferrer"
            className="hover:text-cyan-400 transition-colors flex items-center gap-1"
          >
            <span>Attestcoin Docs</span>
            <ExternalLink className="w-3 h-3" />
          </a>
          <a
            href="https://creditcoin.org"
            target="_blank"
            rel="noreferrer"
            className="hover:text-cyan-400 transition-colors flex items-center gap-1"
          >
            <span>Creditcoin Network</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </footer>
    </div>
  );
}

export default App;
