import React from "react";
import { useBastionGame } from "./hooks/useBastionGame";
import { DashboardHeader } from "./components/DashboardHeader";
import { ResourceBar } from "./components/ResourceBar";
import { CityCanvas } from "./components/CityCanvas";
import { IncursionRadar } from "./components/IncursionRadar";
import { BuildMenu } from "./components/BuildMenu";
import { StructureInspector } from "./components/StructureInspector";
import { AttestationModal } from "./components/AttestationModal";
import { Leaderboard } from "./components/Leaderboard";
import { HowToPlayModal } from "./components/HowToPlayModal";
import { DashboardModal } from "./components/DashboardModal";
import { ResourcePackModal } from "./components/ResourcePackModal";
import { UpgradeAllModal } from "./components/UpgradeAllModal";
import { ToastStack } from "./components/Toast";
import { ExternalLink, HelpCircle } from "lucide-react";

export function App() {
  const game = useBastionGame();

  return (
    <div className="min-h-screen bg-dark text-dark-text flex flex-col font-body selection:bg-accent-500/40 selection:text-dark-text">
      {/* Top Navigation & Status */}
      <DashboardHeader
        account={game.account}
        balance={game.balance}
        networkId={game.networkId}
        onConnectWallet={game.handleConnectWallet}
        onSwitchNetwork={game.handleSwitchNetwork}
        onOpenProofModal={() => game.setIsProofModalOpen(true)}
        onOpenLeaderboard={() => game.setIsLeaderboardOpen(true)}
        onOpenDashboard={() => game.setIsDashboardOpen(true)}
        isSandboxMode={game.isSandboxMode}
        onToggleSandbox={() => game.setIsSandboxMode(!game.isSandboxMode)}
        onLogout={game.handleLogout}
        onConnectAnotherAccount={game.handleConnectAnotherAccount}
      />

      {/* Resource & Market Multiplier Bar (Phase 2) */}
      <ResourceBar
        resources={game.resources}
        marketCondition={game.marketCondition}
        totalDefensePower={game.totalDefensePower}
        onHarvest={game.handleHarvest}
        isHarvesting={game.isHarvesting}
        onOpenHowToPlay={() => game.setIsHowToPlayOpen(true)}
        onOpenResourcePacks={() => game.setIsResourcePackModalOpen(true)}
      />

      {/* Toast Notifications — replaces native alert()/confirm() dialogs */}
      <ToastStack toasts={game.toasts} onDismiss={game.dismissToast} />

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
            lastQuirkEvents={game.lastQuirkEvents}
          />

          {/* Tactical Instructions & Mechanics Guide */}
          <div className="panel-parchment rounded-md p-4 text-xs flex flex-col gap-2 relative">
            <div className="flex items-center gap-2 font-semibold text-accent-700">
              <HelpCircle className="w-4 h-4 text-accent-500" />
              <span className="kicker text-[11px]">Bastion Chronicle — Core Game Loop</span>
            </div>
            <ol className="list-decimal list-inside space-y-1.5 text-ink-soft leading-relaxed">
              <li>
                <strong className="text-ink">Fortify the Redoubt:</strong> Choose Ramparts, Ballistas, and Sunstone Batteries from the palette and place them on empty sectors before the Titan arrives.
              </li>
              <li>
                <strong className="text-ink">Sound the Horn:</strong> Starting a wave submits a real Ethereum Sepolia proof to Creditcoin's Attestcoin precompile (0x0FD2) via BastionIncursionEngine — the verified on-chain result decides the Titan's archetype and severity as it spawns and begins marching down the lane toward the Wall in real time.
              </li>
              <li>
                <strong className="text-ink">Automatic Defense:</strong> Every placed defense fires on its own cooldown as the Titan approaches — no manual firing needed. Kill it before it reaches the Wall.
              </li>
              <li>
                <strong className="text-ink">Escalating Levels:</strong> Each Titan you repel raises the level — HP grows 70% per wave, the march grows longer, and the Titan creeps slightly faster. There is no level cap; if the Titan ever reaches the Wall, the Wall falls and the run ends.
              </li>
              <li>
                <strong className="text-ink">Attested Resource Economy (Phase 2):</strong> Resource costs dynamically fluctuate based on cross-chain seismic data. Harvest and spend bounty from repelled waves to build and upgrade more defenses.
              </li>
              <li>
                <strong className="text-ink">Portable Structure NFTs (Phase 3):</strong> Click on any wall or tower to inspect its ERC-721 token ID and on-chain Attestation Hash.
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
            onContinue={game.handleContinueFromBreach}
            isContinuing={game.isContinuing}
            continueError={game.continueError}
            continueFeeCTC={game.continueFeeCTC}
            liveAttestation={game.liveAttestation}
            liveAttestationError={game.liveAttestationError}
          />

          {/* Structure Inspector (Phase 3 NFT state) */}
          {game.inspectedStructure && (
            <StructureInspector
              structure={game.inspectedStructure}
              onClose={() => game.setInspectedStructure(null)}
              onRepair={game.handleRepairStructure}
              onUpgrade={game.handleUpgradeStructure}
              onRemove={game.handleRemoveStructure}
              resources={game.resources}
            />
          )}

          {/* Construction Palette */}
          <BuildMenu
            selectedBuildingId={game.selectedBuildingId}
            onSelectBuilding={game.setSelectedBuildingId}
            resources={game.resources}
            structures={game.structures}
            onHealAllOfType={game.handleHealAllOfType}
            onOpenUpgradeAll={game.setUpgradeAllModalType}
            healingType={game.healingType}
            healError={game.healError}
            liveAttestation={game.liveAttestation}
            liveAttestationError={game.liveAttestationError}
          />
        </div>
      </main>

      {/* Attestcoin Proof Inspector Modal */}
      <AttestationModal
        isOpen={game.isProofModalOpen}
        onClose={() => game.setIsProofModalOpen(false)}
        latestPayload={game.latestPayload}
      />

      {/* Wall Watch Leaderboard */}
      <Leaderboard
        isOpen={game.isLeaderboardOpen}
        onClose={() => game.setIsLeaderboardOpen(false)}
      />

      {/* How to Play */}
      <HowToPlayModal
        isOpen={game.isHowToPlayOpen}
        onClose={() => game.setIsHowToPlayOpen(false)}
        hasClaimedLevel15Reward={game.hasClaimedLevel15Reward}
      />

      {/* Commander Dashboard */}
      <DashboardModal
        isOpen={game.isDashboardOpen}
        onClose={() => game.setIsDashboardOpen(false)}
        account={game.account}
        gameName={game.gameName}
        onUpdateGameName={game.handleUpdateGameName}
        level={game.level}
        highestLevelReached={game.highestLevelReached}
        totalRepelled={game.totalRepelled}
        totalBreached={game.totalBreached}
      />

      {/* Resource Packs */}
      <ResourcePackModal
        isOpen={game.isResourcePackModalOpen}
        onClose={() => game.setIsResourcePackModalOpen(false)}
        onPurchase={game.handlePurchaseResourcePack}
        purchasingPackId={game.purchasingPackId}
        purchasePackError={game.purchasePackError}
      />

      {/* Upgrade All — pick a target level */}
      <UpgradeAllModal
        structureType={game.upgradeAllModalType}
        onClose={() => game.setUpgradeAllModalType(null)}
        structures={game.structures}
        getPreview={game.getUpgradeAllPreview}
        onConfirm={game.handleUpgradeAllOfType}
        isUpgrading={game.upgradingType === game.upgradeAllModalType}
        upgradeError={game.upgradeError}
        liveAttestation={game.liveAttestation}
        liveAttestationError={game.liveAttestationError}
      />

      {/* Footer */}
      <footer className="w-full border-t border-dark-rule bg-dark py-4 px-6 text-center text-xs text-dark-muted flex flex-wrap items-center justify-between gap-2">
        <span className="kicker text-[10px]">Bastion © 2026 · Built for BUIDL CTC 2026 Fall Hackathon</span>
        <div className="flex items-center gap-4">
          <a
            href="https://docs.attestcoin.org"
            target="_blank"
            rel="noreferrer"
            className="hover:text-accent-300 transition-colors flex items-center gap-1"
          >
            <span>Attestcoin Docs</span>
            <ExternalLink className="w-3 h-3" />
          </a>
          <a
            href="https://creditcoin.org"
            target="_blank"
            rel="noreferrer"
            className="hover:text-accent-300 transition-colors flex items-center gap-1"
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
