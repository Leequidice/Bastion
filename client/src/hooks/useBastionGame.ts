import { useState, useEffect, useCallback, useRef } from "react";
import { usePrivy, useWallets } from "@privy-io/react-auth";
import {
  BUILDINGS,
  CREDITCOIN_TESTNET,
  TICK_MS,
  MAX_STRUCTURE_LEVEL,
  TREASURY_ADDRESS,
  CONTINUE_AFTER_BREACH_FEE_CTC,
  HEAL_ALL_FEE_CTC,
  UPGRADE_ALL_BASE_FEE_CTC,
  STONE_PER_CTC,
  ENERGY_PER_CTC,
  MIN_TX_GAS_BUFFER_CTC,
  LEVEL_15_CHALLENGE_LEVEL,
  LEVEL_15_CHALLENGE_MULTIPLIER,
  MAX_GAME_NAME_LENGTH,
  RESOURCE_PACKS,
  COLOSSI_ARCHETYPES,
  FAUCET_URL,
} from "../lib/constants";
import { PlacedStructure } from "../components/CityCanvas";
import { Resources, MarketConditionState } from "../components/ResourceBar";
import { createBattleStateForLevel, tickBattle, BattleState, QuirkEvents } from "../lib/battleEngine";
import { getState, saveState, requestFaucetDrip } from "../lib/api";
import {
  triggerRealIncursion,
  fetchLiveAttestationSnapshot,
  applyAttestationDiscount,
  RealIncursionResult,
  LiveAttestationSnapshot,
} from "../lib/attestcoinClient";
import { ToastMessage, ToastVariant } from "../components/Toast";
import hornSoundtrack from "../assets/sounds/horn sound track.mp3";
import confetti from "canvas-confetti";
import { ethers } from "ethers";

interface SavedGameState {
  structures: PlacedStructure[];
  resources: Resources;
  level: number;
  highestLevelReached: number;
  wallStatus: "standing" | "breached";
  totalRepelled: number;
  totalBreached: number;
  account: string | null;
  hasClaimedLevel15Reward: boolean;
  gameName: string | null;
}

// Hoisted so a logout/reset can restore exactly this starting layout.
const INITIAL_STRUCTURES: PlacedStructure[] = [
  {
    id: "citadel-core",
    type: "CITADEL",
    gridX: 5,
    gridY: 5,
    durability: 3000,
    maxDurability: 3000,
    level: 1,
    condition: "Intact",
    tokenId: 0,
    attestationHash: "0x89fa12...citadel",
  },
  {
    id: "rampart-north-1",
    type: "RAMPART",
    gridX: 4,
    gridY: 3,
    durability: 1500,
    maxDurability: 1500,
    level: 1,
    condition: "Intact",
    tokenId: 1,
    attestationHash: "0x33b112...rampart",
  },
  {
    id: "rampart-north-2",
    type: "RAMPART",
    gridX: 5,
    gridY: 3,
    durability: 1500,
    maxDurability: 1500,
    level: 1,
    condition: "Intact",
    tokenId: 2,
    attestationHash: "0x44c213...rampart",
  },
  {
    id: "rampart-north-3",
    type: "RAMPART",
    gridX: 6,
    gridY: 3,
    durability: 1500,
    maxDurability: 1500,
    level: 1,
    condition: "Intact",
    tokenId: 3,
    attestationHash: "0x55d314...rampart",
  },
  {
    id: "ballista-north",
    type: "BALLISTA",
    gridX: 5,
    gridY: 4,
    durability: 800,
    maxDurability: 800,
    level: 1,
    condition: "Intact",
    tokenId: 4,
    attestationHash: "0x66e415...ballista",
  },
  {
    id: "pylon-east",
    type: "SUNSTONE_PYLON",
    gridX: 7,
    gridY: 5,
    durability: 600,
    maxDurability: 600,
    level: 1,
    condition: "Intact",
    tokenId: 5,
    attestationHash: "0x77f516...pylon",
  },
  {
    id: "quarry-1",
    type: "QUARRY",
    gridX: 3,
    gridY: 6,
    durability: 500,
    maxDurability: 500,
    level: 1,
    condition: "Intact",
  },
  {
    id: "farm-1",
    type: "FARM",
    gridX: 4,
    gridY: 6,
    durability: 400,
    maxDurability: 400,
    level: 1,
    condition: "Intact",
  },
];

const INITIAL_RESOURCES: Resources = {
  stone: 240,
  energy: 180,
  food: 200,
  aegisAlloy: 100,
};

// Stone Quarries also yield Aegis Alloy, at 10% of whatever rate Stone comes in at.
const ALLOY_YIELD_RATE_OF_STONE = 0.1;

export function useBastionGame() {
  // Settlement Structures Grid
  const [structures, setStructures] = useState<PlacedStructure[]>(INITIAL_STRUCTURES);

  // Player Resource Vault
  const [resources, setResources] = useState<Resources>(INITIAL_RESOURCES);

  // Cross-Chain Market Multipliers (Phase 2 Economy)
  const [marketCondition, setMarketCondition] = useState<MarketConditionState>({
    description: "Subterranean Tremors: 1.6x Stone Cost, 1.4x Energy Yield",
    stoneMultiplier: 16000,
    energyMultiplier: 14000,
    foodScarcity: 11000,
  });

  // Selected Building from Palette
  const [selectedBuildingId, setSelectedBuildingId] = useState<string | null>(null);

  // Selected Structure for Detailed Inspector (Phase 3)
  const [inspectedStructure, setInspectedStructure] = useState<PlacedStructure | null>(null);

  // Titan Wave / Wall State
  const [level, setLevel] = useState(1);
  const [highestLevelReached, setHighestLevelReached] = useState(1);
  const [wallStatus, setWallStatus] = useState<"standing" | "breached">("standing");
  const [battleState, setBattleState] = useState<BattleState | null>(null);
  const [totalRepelled, setTotalRepelled] = useState(0);
  const [totalBreached, setTotalBreached] = useState(0);
  const [lastFiredStructureIds, setLastFiredStructureIds] = useState<string[]>([]);
  const [lastQuirkEvents, setLastQuirkEvents] = useState<QuirkEvents | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const [isHarvesting, setIsHarvesting] = useState(false);

  // "Reach Level 15" challenge: grants a one-time 15x resource multiplier.
  const [hasClaimedLevel15Reward, setHasClaimedLevel15Reward] = useState(false);

  // Refs so the tick interval and effects always read the latest value
  // without needing to be re-created (and re-triggering) every tick.
  const battleStateRef = useRef(battleState);
  const structuresRef = useRef(structures);
  const levelRef = useRef(level);
  const hasClaimedLevel15RewardRef = useRef(hasClaimedLevel15Reward);
  useEffect(() => {
    battleStateRef.current = battleState;
    structuresRef.current = structures;
    levelRef.current = level;
    hasClaimedLevel15RewardRef.current = hasClaimedLevel15Reward;
  });

  // Latest real, on-chain-verified Attestcoin proof for the Inspector Modal
  const [latestPayload, setLatestPayload] = useState<RealIncursionResult | null>(null);
  const [isProofModalOpen, setIsProofModalOpen] = useState(false);

  // Toast notifications (replaces native alert()/confirm() dialogs)
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);
  const pushToast = useCallback(
    (toast: { variant: ToastVariant; message: string; action?: ToastMessage["action"]; autoDismissMs?: number }) => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      setToasts((prev) => [...prev, { id, variant: toast.variant, message: toast.message, action: toast.action }]);
      if (toast.autoDismissMs) {
        setTimeout(() => dismissToast(id), toast.autoDismissMs);
      }
      return id;
    },
    [dismissToast]
  );
  const updateToast = useCallback(
    (
      id: string,
      patch: { variant?: ToastVariant; message?: string; action?: ToastMessage["action"]; autoDismissMs?: number }
    ) => {
      setToasts((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)));
      if (patch.autoDismissMs) {
        setTimeout(() => dismissToast(id), patch.autoDismissMs);
      }
    },
    [dismissToast]
  );

  // Live Attestcoin attestation snapshot (real read from the ChainInfo precompile) —
  // polled in the background and used to price a small live discount into Heal All,
  // Upgrade All, and Continue After Breach, so real chain data is visible at the
  // exact moment a player spends tCTC, not just inside the read-only inspector.
  const [liveAttestation, setLiveAttestation] = useState<LiveAttestationSnapshot | null>(null);
  const [liveAttestationError, setLiveAttestationError] = useState<string | null>(null);
  const [isLeaderboardOpen, setIsLeaderboardOpen] = useState(false);
  const [isHowToPlayOpen, setIsHowToPlayOpen] = useState(false);
  const [isDashboardOpen, setIsDashboardOpen] = useState(false);
  const [isResourcePackModalOpen, setIsResourcePackModalOpen] = useState(false);

  // Commander profile
  const [gameName, setGameName] = useState<string | null>(null);

  // Web3 Wallet State (populated from Privy)
  const { ready, authenticated, login, logout, getAccessToken } = usePrivy();
  const { wallets } = useWallets();
  const [account, setAccount] = useState<string | null>(null);
  const [balance, setBalance] = useState("12.45");
  const [networkId, setNetworkId] = useState<number | null>(CREDITCOIN_TESTNET.chainId);
  const [isSandboxMode, setIsSandboxMode] = useState(true);
  const [isStateLoaded, setIsStateLoaded] = useState(false);

  // Paid continue-after-breach flow
  const [isContinuing, setIsContinuing] = useState(false);
  const [continueError, setContinueError] = useState<string | null>(null);

  // Per-structure-type "Heal All" flow, triggered from the build palette (on-chain fee)
  const [healingType, setHealingType] = useState<string | null>(null);
  const [healError, setHealError] = useState<string | null>(null);

  // Per-structure-type "Upgrade All" flow, triggered from the build palette (on-chain fee)
  const [upgradingType, setUpgradingType] = useState<string | null>(null);
  const [upgradeError, setUpgradeError] = useState<string | null>(null);
  // Non-null while the Upgrade All target-level modal is open for that structure type.
  const [upgradeAllModalType, setUpgradeAllModalType] = useState<string | null>(null);

  // Resource pack purchase flow (on-chain fee)
  const [purchasingPackId, setPurchasingPackId] = useState<string | null>(null);
  const [purchasePackError, setPurchasePackError] = useState<string | null>(null);

  // Faucet drip: true for the window between "no saved state found" (brand new
  // account) and the one-time drip request resolving.
  const [isNewUser, setIsNewUser] = useState(false);

  // Compute Total Defense Power from Active Structures
  const totalDefensePower = structures.reduce((acc, s) => {
    if (s.condition === "Destroyed") return acc;
    const def = BUILDINGS[s.type];
    const power = def ? def.defensePower * s.level : 0;
    return acc + (s.condition === "Damaged" ? Math.floor(power * 0.5) : power);
  }, 0);

  // Poll the real, live Attestcoin attestation state in the background (independent of
  // wallet/auth) so Heal All / Upgrade All / Continue can price a live discount off it.
  const refreshLiveAttestation = useCallback(async () => {
    try {
      const snapshot = await fetchLiveAttestationSnapshot();
      setLiveAttestation(snapshot);
      setLiveAttestationError(null);
    } catch (err) {
      console.error("Failed to refresh live Attestcoin snapshot:", err);
      setLiveAttestation(null);
      setLiveAttestationError("Live attestation feed unavailable right now — showing full price.");
    }
  }, []);

  useEffect(() => {
    refreshLiveAttestation();
    const interval = setInterval(refreshLiveAttestation, 45000);
    return () => clearInterval(interval);
  }, [refreshLiveAttestation]);

  // Wipe all locally-held game/account state back to a clean slate (logout / session end)
  const resetGameState = useCallback(() => {
    setStructures(INITIAL_STRUCTURES);
    setResources(INITIAL_RESOURCES);
    setLevel(1);
    setHighestLevelReached(1);
    setWallStatus("standing");
    setBattleState(null);
    setTotalRepelled(0);
    setTotalBreached(0);
    setLastFiredStructureIds([]);
    setLastQuirkEvents(null);
    setLatestPayload(null);
    setInspectedStructure(null);
    setSelectedBuildingId(null);
    setAccount(null);
    setBalance("12.45");
    setNetworkId(CREDITCOIN_TESTNET.chainId);
    setIsStateLoaded(false);
    setContinueError(null);
    setHealError(null);
    setUpgradeError(null);
    setUpgradeAllModalType(null);
    setPurchasePackError(null);
    setIsNewUser(false);
    setHasClaimedLevel15Reward(false);
    setGameName(null);
  }, []);

  // Harvest Settlement Resources
  const handleHarvest = useCallback(() => {
    setIsHarvesting(true);
    setTimeout(() => {
      const stoneGain = Math.floor((100 * 10000) / marketCondition.stoneMultiplier);
      const energyGain = Math.floor((80 * marketCondition.energyMultiplier) / 10000);
      const foodGain = Math.floor((120 * 10000) / marketCondition.foodScarcity);
      const alloyGain = Math.floor(stoneGain * ALLOY_YIELD_RATE_OF_STONE);

      setResources((prev) => ({
        ...prev,
        stone: prev.stone + stoneGain,
        energy: prev.energy + energyGain,
        food: prev.food + foodGain,
        aegisAlloy: prev.aegisAlloy + alloyGain,
      }));
      setIsHarvesting(false);
    }, 600);
  }, [marketCondition]);

  // Place Building on Tile
  const handlePlaceBuilding = useCallback(
    (gridX: number, gridY: number) => {
      if (!selectedBuildingId) return;
      const def = BUILDINGS[selectedBuildingId];
      if (!def) return;

      // Check affordability
      if (
        resources.stone < def.cost.stone ||
        resources.energy < def.cost.energy ||
        resources.food < def.cost.food ||
        resources.aegisAlloy < def.cost.alloy
      ) {
        pushToast({ variant: "error", message: "Insufficient resources to construct this fortification!", autoDismissMs: 4000 });
        return;
      }

      // Deduct resources
      setResources((prev) => ({
        stone: prev.stone - def.cost.stone,
        energy: prev.energy - def.cost.energy,
        food: prev.food - def.cost.food,
        aegisAlloy: prev.aegisAlloy - def.cost.alloy,
      }));

      // Create new structure NFT entry
      const newId = `${def.id.toLowerCase()}-${Date.now()}`;
      const newTokenId = structures.length + 1;
      const hash = ethers.keccak256(
        ethers.toUtf8Bytes(`BASTION-${newTokenId}-${gridX}-${gridY}-${Date.now()}`)
      );

      const newStructure: PlacedStructure = {
        id: newId,
        type: def.id,
        gridX,
        gridY,
        durability: def.maxDurability,
        maxDurability: def.maxDurability,
        level: 1,
        condition: "Intact",
        tokenId: newTokenId,
        attestationHash: `${hash.slice(0, 10)}...${hash.slice(-6)}`,
      };

      setStructures((prev) => [...prev, newStructure]);
    },
    [selectedBuildingId, resources, structures, pushToast]
  );

  // Repair Structure
  const handleRepairStructure = useCallback(
    (structureId: string) => {
      if (resources.stone < 20) return;
      setResources((prev) => ({ ...prev, stone: prev.stone - 20 }));
      setStructures((prev) =>
        prev.map((s) =>
          s.id === structureId
            ? { ...s, durability: s.maxDurability, condition: "Intact" }
            : s
        )
      );
      if (inspectedStructure && inspectedStructure.id === structureId) {
        setInspectedStructure((prev) =>
          prev ? { ...prev, durability: prev.maxDurability, condition: "Intact" } : null
        );
      }
    },
    [resources, inspectedStructure]
  );

  // Upgrade Structure (capped at MAX_STRUCTURE_LEVEL)
  const handleUpgradeStructure = useCallback(
    (structureId: string) => {
      const target = structures.find((s) => s.id === structureId);
      if (!target || target.level >= MAX_STRUCTURE_LEVEL) return;
      if (resources.stone < 40 || resources.energy < 20) return;
      setResources((prev) => ({
        ...prev,
        stone: prev.stone - 40,
        energy: prev.energy - 20,
      }));
      setStructures((prev) =>
        prev.map((s) => {
          if (s.id !== structureId) return s;
          const newLevel = s.level + 1;
          const newMax = Math.floor(s.maxDurability * 1.3);
          return {
            ...s,
            level: newLevel,
            maxDurability: newMax,
            durability: newMax,
          };
        })
      );
      if (inspectedStructure && inspectedStructure.id === structureId) {
        setInspectedStructure((prev) =>
          prev
            ? {
                ...prev,
                level: prev.level + 1,
                maxDurability: Math.floor(prev.maxDurability * 1.3),
                durability: Math.floor(prev.maxDurability * 1.3),
              }
            : null
        );
      }
    },
    [resources, inspectedStructure, structures]
  );

  // Heal every damaged/destroyed structure of one type at once — gated by a small
  // on-chain fee (paid once per click, regardless of how many structures are healed)
  // rather than in-game resources.
  const handleHealAllOfType = useCallback(
    async (type: string) => {
      const damaged = structures.filter((s) => s.type === type && s.durability < s.maxDurability);
      if (damaged.length === 0) return;

      const wallet = wallets[0];
      if (!wallet) {
        setHealError("Connect a wallet first.");
        return;
      }

      const feeCTC = applyAttestationDiscount(Number(HEAL_ALL_FEE_CTC), liveAttestation);
      const required = feeCTC + Number(MIN_TX_GAS_BUFFER_CTC);
      if (Number(balance) < required) {
        setHealError(
          `You need at least ${required.toFixed(2)} tCTC to cover this (have ${balance}). Visit the faucet to top up.`
        );
        return;
      }

      setHealingType(type);
      setHealError(null);

      try {
        const injected = await wallet.getEthereumProvider();
        const provider = new ethers.BrowserProvider(injected);
        const signer = await provider.getSigner();
        const tx = await signer.sendTransaction({
          to: TREASURY_ADDRESS,
          value: ethers.parseEther(feeCTC.toFixed(6)),
        });
        await tx.wait();

        setStructures((prev) =>
          prev.map((s) =>
            s.type === type && s.durability < s.maxDurability
              ? { ...s, durability: s.maxDurability, condition: "Intact" }
              : s
          )
        );
        setInspectedStructure((prev) =>
          prev && prev.type === type && prev.durability < prev.maxDurability
            ? { ...prev, durability: prev.maxDurability, condition: "Intact" }
            : prev
        );
      } catch (err) {
        console.error("Heal All payment failed:", err);
        setHealError("Transaction failed or was rejected.");
      } finally {
        setHealingType(null);
      }
    },
    [structures, wallets, balance, liveAttestation]
  );

  // Preview what Upgrade All would do for a given structure type and target level:
  // structures already AT OR ABOVE the target are left alone entirely (no cost, no
  // change) — only structures below the target jump straight to it, each paying for
  // exactly the levels *it* gains, never a flat "+N to everyone" that would leave
  // different starting levels at different ending levels.
  const getUpgradeAllPreview = useCallback(
    (type: string, targetLevel: number) => {
      const clampedTarget = Math.min(Math.max(1, Math.round(targetLevel)), MAX_STRUCTURE_LEVEL);
      const ofType = structures.filter((s) => s.type === type && s.condition === "Intact");
      const upgrading = ofType.filter((s) => s.level < clampedTarget);

      let totalStoneCost = 0;
      let totalEnergyCost = 0;
      upgrading.forEach((s) => {
        const delta = clampedTarget - s.level;
        totalStoneCost += 40 * delta;
        totalEnergyCost += 20 * delta;
      });

      const stoneShort = Math.max(0, totalStoneCost - resources.stone);
      const energyShort = Math.max(0, totalEnergyCost - resources.energy);
      const baseFeeCTC =
        upgrading.length === 0
          ? 0
          : Number(UPGRADE_ALL_BASE_FEE_CTC) + stoneShort / STONE_PER_CTC + energyShort / ENERGY_PER_CTC;
      const feeCTC = upgrading.length === 0 ? 0 : applyAttestationDiscount(baseFeeCTC, liveAttestation);

      return {
        targetLevel: clampedTarget,
        eligibleCount: ofType.length,
        upgradingCount: upgrading.length,
        skippedCount: ofType.length - upgrading.length,
        totalStoneCost,
        totalEnergyCost,
        baseFeeCTC,
        feeCTC,
      };
    },
    [structures, resources, liveAttestation]
  );

  // Upgrade every structure of one type that's below the chosen target level, each
  // straight to that target — gated by an on-chain fee. Any Stone/Energy shortfall
  // is folded into that fee rather than blocking the upgrade outright.
  const handleUpgradeAllOfType = useCallback(
    async (type: string, targetLevel: number) => {
      const preview = getUpgradeAllPreview(type, targetLevel);
      if (preview.upgradingCount === 0) return;

      const wallet = wallets[0];
      if (!wallet) {
        setUpgradeError("Connect a wallet first.");
        return;
      }

      const required = preview.feeCTC + Number(MIN_TX_GAS_BUFFER_CTC);
      if (Number(balance) < required) {
        setUpgradeError(
          `You need at least ${required.toFixed(2)} tCTC to cover this (have ${balance}). Visit the faucet to top up.`
        );
        return;
      }

      setUpgradingType(type);
      setUpgradeError(null);

      try {
        const injected = await wallet.getEthereumProvider();
        const provider = new ethers.BrowserProvider(injected);
        const signer = await provider.getSigner();
        const tx = await signer.sendTransaction({
          to: TREASURY_ADDRESS,
          value: ethers.parseEther(preview.feeCTC.toFixed(6)),
        });
        await tx.wait();

        setResources((prev) => ({
          ...prev,
          stone: Math.max(0, prev.stone - preview.totalStoneCost),
          energy: Math.max(0, prev.energy - preview.totalEnergyCost),
        }));
        setStructures((prev) =>
          prev.map((s) => {
            if (s.type !== type || s.condition !== "Intact" || s.level >= preview.targetLevel) return s;
            const delta = preview.targetLevel - s.level;
            const newMax = Math.round(s.maxDurability * Math.pow(1.3, delta));
            return { ...s, level: preview.targetLevel, maxDurability: newMax, durability: newMax };
          })
        );
        setInspectedStructure((prev) => {
          if (!prev || prev.type !== type || prev.condition !== "Intact" || prev.level >= preview.targetLevel) {
            return prev;
          }
          const delta = preview.targetLevel - prev.level;
          const newMax = Math.round(prev.maxDurability * Math.pow(1.3, delta));
          return { ...prev, level: preview.targetLevel, maxDurability: newMax, durability: newMax };
        });
        setUpgradeAllModalType(null);
      } catch (err) {
        console.error("Upgrade All payment failed:", err);
        setUpgradeError("Transaction failed or was rejected.");
      } finally {
        setUpgradingType(null);
      }
    },
    [wallets, balance, getUpgradeAllPreview]
  );

  // Purchase a Resource Pack (Basic / Standard+ / Mega) — a flat on-chain fee that
  // grants a bundle of Stone/Energy/Food/Alloy on top of whatever the player already has.
  const handlePurchaseResourcePack = useCallback(
    async (packId: string) => {
      const pack = RESOURCE_PACKS.find((p) => p.id === packId);
      if (!pack) return;

      const wallet = wallets[0];
      if (!wallet) {
        setPurchasePackError("Connect a wallet first.");
        return;
      }

      const required = Number(pack.priceCTC) + Number(MIN_TX_GAS_BUFFER_CTC);
      if (Number(balance) < required) {
        setPurchasePackError(
          `You need at least ${required.toFixed(2)} tCTC to cover this (have ${balance}). Visit the faucet to top up.`
        );
        return;
      }

      setPurchasingPackId(packId);
      setPurchasePackError(null);

      try {
        const injected = await wallet.getEthereumProvider();
        const provider = new ethers.BrowserProvider(injected);
        const signer = await provider.getSigner();
        const tx = await signer.sendTransaction({
          to: TREASURY_ADDRESS,
          value: ethers.parseEther(pack.priceCTC),
        });
        await tx.wait();

        setResources((prev) => ({
          stone: prev.stone + pack.resources.stone,
          energy: prev.energy + pack.resources.energy,
          food: prev.food + pack.resources.food,
          aegisAlloy: prev.aegisAlloy + pack.resources.aegisAlloy,
        }));
      } catch (err) {
        console.error("Resource pack payment failed:", err);
        setPurchasePackError("Transaction failed or was rejected.");
      } finally {
        setPurchasingPackId(null);
      }
    },
    [wallets, balance]
  );

  // Update the commander's chosen display name (used on the leaderboard), trimmed and length-capped.
  const handleUpdateGameName = useCallback((name: string) => {
    const trimmed = name.trim().slice(0, MAX_GAME_NAME_LENGTH);
    setGameName(trimmed || null);
  }, []);

  // Remove a structure from the grid, freeing its tile (no refund). The Citadel Core cannot be removed.
  const handleRemoveStructure = useCallback(
    (structureId: string) => {
      setStructures((prev) => {
        const target = prev.find((s) => s.id === structureId);
        if (!target || target.type === "CITADEL") return prev;
        return prev.filter((s) => s.id !== structureId);
      });
      setInspectedStructure((prev) => (prev && prev.id === structureId ? null : prev));
    },
    []
  );

  // Start the next Titan wave (level 1 on first call, or the current level after a restart).
  // This is the core Attestcoin flow: it reads a real Creditcoin-attested Ethereum
  // Sepolia checkpoint, fetches a real proof for it from the Attestcoin prover, and
  // submits that proof on-chain to BastionIncursionEngine, which verifies it against
  // the real Block Prover Precompile (0x0FD2) and derives this wave's Colossus from
  // the verified result — every wave, not just for the inspector modal.
  const handleStartWave = useCallback(async () => {
    if (battleStateRef.current) return; // a wave is already running

    const wallet = wallets[0];
    if (!wallet) {
      pushToast({
        variant: "error",
        message: "Connect a wallet first — sounding the horn verifies a real Attestcoin proof on-chain.",
        autoDismissMs: 6000,
      });
      return;
    }

    const required = Number(MIN_TX_GAS_BUFFER_CTC);
    if (Number(balance) < required) {
      pushToast({
        variant: "error",
        message: `You need at least ${required.toFixed(2)} tCTC to cover the on-chain verification (have ${balance}).`,
        action: { label: "Visit Faucet", href: FAUCET_URL },
        autoDismissMs: 8000,
      });
      return;
    }

    setIsStarting(true);
    new Audio(hornSoundtrack).play().catch((err) => {
      console.error("Failed to play horn soundtrack:", err);
    });

    const toastId = pushToast({ variant: "pending", message: "Reading the latest Attestcoin-attested Ethereum Sepolia checkpoint..." });

    try {
      const injected = await wallet.getEthereumProvider();
      const provider = new ethers.BrowserProvider(injected);
      const signer = await provider.getSigner();

      const result = await triggerRealIncursion(signer, (stage) => updateToast(toastId, { message: stage }));

      setLatestPayload(result);
      setBattleState(createBattleStateForLevel(levelRef.current, { archetype: result.archetype, severity: result.severity }));

      const archetypeName = COLOSSI_ARCHETYPES[result.archetype % COLOSSI_ARCHETYPES.length]?.name ?? "Colossus";
      updateToast(toastId, {
        variant: "success",
        message: `Verified on-chain via precompile 0x0FD2 — ${archetypeName} (Severity ${result.severity}/5) confirmed from Sepolia block #${result.sourceBlockHeight.toLocaleString()}.`,
        autoDismissMs: 7000,
      });
    } catch (err) {
      console.error("Attestcoin incursion trigger failed:", err);
      updateToast(toastId, {
        variant: "error",
        message: err instanceof Error ? err.message : "Attestcoin verification failed. Please try again.",
        autoDismissMs: 9000,
      });
    } finally {
      setIsStarting(false);
    }
  }, [wallets, balance, pushToast, updateToast]);

  // Start Over: reset the campaign to level 1 after a Wall breach (free, structures/resources untouched)
  const handleRestart = useCallback(() => {
    setLevel(1);
    setWallStatus("standing");
    setBattleState(createBattleStateForLevel(1));
  }, []);

  // Continue from the last saved point (current level) after a breach — gated by a small on-chain fee
  const handleContinueFromBreach = useCallback(async () => {
    const wallet = wallets[0];
    if (!wallet) {
      setContinueError("Connect a wallet first.");
      return;
    }

    const feeCTC = applyAttestationDiscount(Number(CONTINUE_AFTER_BREACH_FEE_CTC), liveAttestation);
    const required = feeCTC + Number(MIN_TX_GAS_BUFFER_CTC);
    if (Number(balance) < required) {
      setContinueError(
        `You need at least ${required.toFixed(2)} tCTC to cover this (have ${balance}). Visit the faucet to top up, or start over for free.`
      );
      return;
    }

    setIsContinuing(true);
    setContinueError(null);

    try {
      const injected = await wallet.getEthereumProvider();
      const provider = new ethers.BrowserProvider(injected);
      const signer = await provider.getSigner();
      const tx = await signer.sendTransaction({
        to: TREASURY_ADDRESS,
        value: ethers.parseEther(feeCTC.toFixed(6)),
      });
      await tx.wait();
      setWallStatus("standing");
      setBattleState(null);
    } catch (err) {
      console.error("Continue payment failed:", err);
      setContinueError("Transaction failed or was rejected. Try again, or start over for free.");
    } finally {
      setIsContinuing(false);
    }
  }, [wallets, balance, liveAttestation]);

  // Real-time Battle Tick Loop: advances the Titan and fires ready defenses every TICK_MS
  const isBattleActive = battleState?.matchStatus === "active";
  useEffect(() => {
    if (!isBattleActive) return;

    const interval = setInterval(() => {
      const current = battleStateRef.current;
      if (!current || current.matchStatus !== "active") return;

      const { state: nextState, structures: nextStructures, firedStructureIds, quirkEvents } = tickBattle(
        current,
        structuresRef.current
      );
      setBattleState(nextState);
      setStructures(nextStructures);
      setLastFiredStructureIds(firedStructureIds);
      setLastQuirkEvents(quirkEvents);
    }, TICK_MS);

    return () => clearInterval(interval);
  }, [isBattleActive]);

  // React to a wave's outcome: victory advances the level, a breach ends the campaign
  const matchStatus = battleState?.matchStatus;
  useEffect(() => {
    if (matchStatus === "won") {
      setTotalRepelled((prev) => prev + 1);
      setHighestLevelReached((prev) => Math.max(prev, levelRef.current + 1));

      const stoneBounty = levelRef.current * 75;
      const energyBounty = levelRef.current * 40;
      setResources((prev) => ({
        ...prev,
        stone: prev.stone + stoneBounty,
        energy: prev.energy + energyBounty,
      }));

      try {
        confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } });
      } catch (_) {}

      // "Reach Level 15" challenge: a one-time 15x multiplier on everything in the vault.
      const nextLevel = levelRef.current + 1;
      if (nextLevel === LEVEL_15_CHALLENGE_LEVEL && !hasClaimedLevel15RewardRef.current) {
        setResources((prev) => ({
          stone: prev.stone * LEVEL_15_CHALLENGE_MULTIPLIER,
          energy: prev.energy * LEVEL_15_CHALLENGE_MULTIPLIER,
          food: prev.food * LEVEL_15_CHALLENGE_MULTIPLIER,
          aegisAlloy: prev.aegisAlloy * LEVEL_15_CHALLENGE_MULTIPLIER,
        }));
        setHasClaimedLevel15Reward(true);
        try {
          confetti({ particleCount: 250, spread: 120, origin: { y: 0.5 } });
        } catch (_) {}
      }

      const timeout = setTimeout(() => {
        const nextLevel = levelRef.current + 1;
        setLevel(nextLevel);
        setBattleState(createBattleStateForLevel(nextLevel));
      }, 2200);

      return () => clearTimeout(timeout);
    }

    if (matchStatus === "lost") {
      setTotalBreached((prev) => prev + 1);
      setWallStatus("breached");
    }
  }, [matchStatus]);

  // Connect via Privy (Google / Twitter / Discord / external wallet)
  const handleConnectWallet = useCallback(() => {
    login();
  }, [login]);

  // Log out of the current Privy session entirely
  const handleLogout = useCallback(() => {
    logout();
  }, [logout]);

  // Switch accounts: fully log out of the current identity, then open login for a different one
  const handleConnectAnotherAccount = useCallback(async () => {
    await logout();
    login();
  }, [logout, login]);

  // Derive account/network/balance from the active Privy wallet (embedded or external);
  // clear them back out once the wallet list empties (e.g. after logout).
  useEffect(() => {
    const wallet = wallets[0];
    if (!wallet) {
      setAccount(null);
      setBalance("12.45");
      setNetworkId(CREDITCOIN_TESTNET.chainId);
      return;
    }
    let cancelled = false;

    (async () => {
      try {
        const injected = await wallet.getEthereumProvider();
        const provider = new ethers.BrowserProvider(injected);
        const net = await provider.getNetwork();
        const bal = await provider.getBalance(wallet.address);
        if (cancelled) return;
        setAccount(wallet.address);
        setNetworkId(Number(net.chainId));
        setBalance(Number(ethers.formatEther(bal)).toFixed(2));
      } catch (err) {
        console.error("Failed to read wallet state:", err);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [wallets]);

  // Switch to Creditcoin CC3 Testnet
  const handleSwitchNetwork = useCallback(async () => {
    const wallet = wallets[0];
    if (!wallet) return;

    try {
      await wallet.switchChain(CREDITCOIN_TESTNET.chainId);
      setNetworkId(CREDITCOIN_TESTNET.chainId);
      return;
    } catch (_) {
      // Fall through to manual EIP-3326/3085 flow for wallets Privy can't switch directly
    }

    try {
      const injected = await wallet.getEthereumProvider();
      await injected.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: CREDITCOIN_TESTNET.chainIdHex }],
      });
      setNetworkId(CREDITCOIN_TESTNET.chainId);
    } catch (switchError: any) {
      if (switchError.code === 4902) {
        const injected = await wallet.getEthereumProvider();
        await injected.request({
          method: "wallet_addEthereumChain",
          params: [
            {
              chainId: CREDITCOIN_TESTNET.chainIdHex,
              chainName: CREDITCOIN_TESTNET.chainName,
              rpcUrls: [CREDITCOIN_TESTNET.rpcUrl],
              nativeCurrency: {
                name: CREDITCOIN_TESTNET.currencyName,
                symbol: CREDITCOIN_TESTNET.currencySymbol,
                decimals: CREDITCOIN_TESTNET.decimals,
              },
              blockExplorerUrls: [CREDITCOIN_TESTNET.blockExplorerUrl],
            },
          ],
        });
        setNetworkId(CREDITCOIN_TESTNET.chainId);
      }
    }
  }, [wallets]);

  // Reset all local state once the user is no longer authenticated (logout or session expiry)
  useEffect(() => {
    if (ready && !authenticated) {
      resetGameState();
    }
  }, [ready, authenticated, resetGameState]);

  // Hydrate saved progress from Redis (via the backend) once the user is authenticated
  useEffect(() => {
    if (!ready || !authenticated) return;
    let cancelled = false;

    (async () => {
      try {
        const token = await getAccessToken();
        if (!token) return;
        const saved = (await getState(token)) as SavedGameState | null;
        if (cancelled) return;
        if (saved) {
          setStructures(saved.structures);
          setResources(saved.resources);
          setLevel(saved.level);
          setHighestLevelReached(saved.highestLevelReached);
          setWallStatus(saved.wallStatus);
          setTotalRepelled(saved.totalRepelled);
          setTotalBreached(saved.totalBreached);
          setHasClaimedLevel15Reward(saved.hasClaimedLevel15Reward ?? false);
          setGameName(saved.gameName ?? null);
        } else {
          // No saved state at all — this is the first time we've ever seen this
          // account, so it qualifies for the one-time faucet drip.
          setIsNewUser(true);
        }
      } catch (err) {
        console.error("Failed to load saved state:", err);
      } finally {
        if (!cancelled) setIsStateLoaded(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [ready, authenticated, getAccessToken]);

  // One-time faucet drip for brand-new accounts, once we have a wallet address to send to
  useEffect(() => {
    if (!isNewUser || !account) return;
    let cancelled = false;

    (async () => {
      try {
        const token = await getAccessToken();
        if (!token) return;
        await requestFaucetDrip(token, account);
      } catch (err) {
        console.error("Faucet drip request failed:", err);
      } finally {
        if (!cancelled) setIsNewUser(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isNewUser, account, getAccessToken]);

  // Autosave progress to Redis (debounced) whenever it changes post-hydration
  useEffect(() => {
    if (!authenticated || !isStateLoaded) return;

    const handle = setTimeout(() => {
      (async () => {
        try {
          const token = await getAccessToken();
          if (!token) return;
          await saveState(token, {
            structures,
            resources,
            level,
            highestLevelReached,
            wallStatus,
            totalRepelled,
            totalBreached,
            account,
            hasClaimedLevel15Reward,
            gameName,
          } satisfies SavedGameState);
        } catch (err) {
          console.error("Failed to save state:", err);
        }
      })();
    }, 1000);

    return () => clearTimeout(handle);
  }, [
    authenticated,
    isStateLoaded,
    structures,
    resources,
    level,
    highestLevelReached,
    wallStatus,
    totalRepelled,
    totalBreached,
    account,
    hasClaimedLevel15Reward,
    gameName,
    getAccessToken,
  ]);

  const continueFeeCTC = applyAttestationDiscount(Number(CONTINUE_AFTER_BREACH_FEE_CTC), liveAttestation);

  return {
    structures,
    resources,
    marketCondition,
    toasts,
    dismissToast,
    liveAttestation,
    liveAttestationError,
    continueFeeCTC,
    selectedBuildingId,
    setSelectedBuildingId,
    inspectedStructure,
    setInspectedStructure,
    level,
    highestLevelReached,
    wallStatus,
    battleState,
    lastFiredStructureIds,
    lastQuirkEvents,
    totalRepelled,
    totalBreached,
    totalDefensePower,
    isStarting,
    isHarvesting,
    latestPayload,
    isProofModalOpen,
    setIsProofModalOpen,
    isLeaderboardOpen,
    setIsLeaderboardOpen,
    isHowToPlayOpen,
    setIsHowToPlayOpen,
    isDashboardOpen,
    setIsDashboardOpen,
    isResourcePackModalOpen,
    setIsResourcePackModalOpen,
    gameName,
    handleUpdateGameName,
    isContinuing,
    continueError,
    healingType,
    healError,
    upgradingType,
    upgradeError,
    upgradeAllModalType,
    setUpgradeAllModalType,
    purchasingPackId,
    purchasePackError,
    hasClaimedLevel15Reward,
    getUpgradeAllPreview,
    account,
    balance,
    networkId,
    isSandboxMode,
    setIsSandboxMode,
    handleHarvest,
    handlePlaceBuilding,
    handleRepairStructure,
    handleUpgradeStructure,
    handleHealAllOfType,
    handleUpgradeAllOfType,
    handlePurchaseResourcePack,
    handleRemoveStructure,
    handleStartWave,
    handleRestart,
    handleContinueFromBreach,
    handleConnectWallet,
    handleSwitchNetwork,
    handleLogout,
    handleConnectAnotherAccount,
  };
}
