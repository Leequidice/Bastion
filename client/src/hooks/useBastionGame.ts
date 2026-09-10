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
} from "../lib/constants";
import { PlacedStructure } from "../components/CityCanvas";
import { Resources, MarketConditionState } from "../components/ResourceBar";
import { generateAttestationPayload, AttestationPayload } from "../lib/attestationHelper";
import { createBattleStateForLevel, tickBattle, BattleState, QuirkEvents } from "../lib/battleEngine";
import { getState, saveState, requestFaucetDrip } from "../lib/api";
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
  aegisAlloy: 45,
};

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

  // Refs so the tick interval and effects always read the latest value
  // without needing to be re-created (and re-triggering) every tick.
  const battleStateRef = useRef(battleState);
  const structuresRef = useRef(structures);
  const levelRef = useRef(level);
  useEffect(() => {
    battleStateRef.current = battleState;
    structuresRef.current = structures;
    levelRef.current = level;
  });

  // Latest Cryptographic Proof for Inspector Modal
  const [latestPayload, setLatestPayload] = useState<AttestationPayload | null>(null);
  const [isProofModalOpen, setIsProofModalOpen] = useState(false);
  const [isLeaderboardOpen, setIsLeaderboardOpen] = useState(false);

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
    setIsNewUser(false);
  }, []);

  // Harvest Settlement Resources
  const handleHarvest = useCallback(() => {
    setIsHarvesting(true);
    setTimeout(() => {
      const stoneGain = Math.floor((100 * 10000) / marketCondition.stoneMultiplier);
      const energyGain = Math.floor((80 * marketCondition.energyMultiplier) / 10000);
      const foodGain = Math.floor((120 * 10000) / marketCondition.foodScarcity);

      setResources((prev) => ({
        ...prev,
        stone: prev.stone + stoneGain,
        energy: prev.energy + energyGain,
        food: prev.food + foodGain,
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
        alert("Insufficient resources to construct this fortification!");
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
    [selectedBuildingId, resources, structures]
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

      const required = Number(HEAL_ALL_FEE_CTC) + Number(MIN_TX_GAS_BUFFER_CTC);
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
          value: ethers.parseEther(HEAL_ALL_FEE_CTC),
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
    [structures, wallets, balance]
  );

  // Compute the tCTC fee to Upgrade All of a given structure type: a flat base
  // fee plus, if the player is short on Stone/Energy, that shortfall priced in
  // tCTC via STONE_PER_CTC/ENERGY_PER_CTC (see constants.ts for the rationale).
  const getUpgradeAllFeeCTC = useCallback(
    (type: string) => {
      const eligible = structures.filter(
        (s) => s.type === type && s.condition === "Intact" && s.level < MAX_STRUCTURE_LEVEL
      );
      if (eligible.length === 0) return 0;
      const stoneCost = eligible.length * 40;
      const energyCost = eligible.length * 20;
      const stoneShort = Math.max(0, stoneCost - resources.stone);
      const energyShort = Math.max(0, energyCost - resources.energy);
      return Number(UPGRADE_ALL_BASE_FEE_CTC) + stoneShort / STONE_PER_CTC + energyShort / ENERGY_PER_CTC;
    },
    [structures, resources]
  );

  // Upgrade every eligible structure of one type (Intact, below the level cap) at
  // once — gated by an on-chain fee. Any Stone/Energy shortfall is folded into
  // that fee rather than blocking the upgrade outright.
  const handleUpgradeAllOfType = useCallback(
    async (type: string) => {
      const eligible = structures.filter(
        (s) => s.type === type && s.condition === "Intact" && s.level < MAX_STRUCTURE_LEVEL
      );
      if (eligible.length === 0) return;

      const wallet = wallets[0];
      if (!wallet) {
        setUpgradeError("Connect a wallet first.");
        return;
      }

      const stoneCost = eligible.length * 40;
      const energyCost = eligible.length * 20;
      const fee = getUpgradeAllFeeCTC(type);
      const required = fee + Number(MIN_TX_GAS_BUFFER_CTC);

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
          value: ethers.parseEther(fee.toFixed(6)),
        });
        await tx.wait();

        setResources((prev) => ({
          ...prev,
          stone: Math.max(0, prev.stone - stoneCost),
          energy: Math.max(0, prev.energy - energyCost),
        }));
        setStructures((prev) =>
          prev.map((s) => {
            if (s.type !== type || s.condition !== "Intact" || s.level >= MAX_STRUCTURE_LEVEL) return s;
            const newMax = Math.floor(s.maxDurability * 1.3);
            return { ...s, level: s.level + 1, maxDurability: newMax, durability: newMax };
          })
        );
        setInspectedStructure((prev) => {
          if (!prev || prev.type !== type || prev.condition !== "Intact" || prev.level >= MAX_STRUCTURE_LEVEL) {
            return prev;
          }
          const newMax = Math.floor(prev.maxDurability * 1.3);
          return { ...prev, level: prev.level + 1, maxDurability: newMax, durability: newMax };
        });
      } catch (err) {
        console.error("Upgrade All payment failed:", err);
        setUpgradeError("Transaction failed or was rejected.");
      } finally {
        setUpgradingType(null);
      }
    },
    [structures, wallets, balance, getUpgradeAllFeeCTC]
  );

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

  // Start the next Titan wave (level 1 on first call, or the current level after a restart)
  const handleStartWave = useCallback(() => {
    if (battleStateRef.current) return; // a wave is already running
    setIsStarting(true);

    // Play the horn once, only in response to this click.
    new Audio(hornSoundtrack).play().catch((err) => {
      console.error("Failed to play horn soundtrack:", err);
    });

    setTimeout(() => {
      // Poll an Attestcoin proof for flavor/inspection; the wave's difficulty
      // itself is driven by the deterministic level-scaling formulas below.
      setLatestPayload(generateAttestationPayload());
      setBattleState(createBattleStateForLevel(levelRef.current));
      setIsStarting(false);
    }, 500);
  }, []);

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

    const required = Number(CONTINUE_AFTER_BREACH_FEE_CTC) + Number(MIN_TX_GAS_BUFFER_CTC);
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
        value: ethers.parseEther(CONTINUE_AFTER_BREACH_FEE_CTC),
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
  }, [wallets, balance]);

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
    getAccessToken,
  ]);

  return {
    structures,
    resources,
    marketCondition,
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
    isContinuing,
    continueError,
    healingType,
    healError,
    upgradingType,
    upgradeError,
    getUpgradeAllFeeCTC,
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
