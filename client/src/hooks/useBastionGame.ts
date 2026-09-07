import { useState, useEffect, useCallback, useRef } from "react";
import { usePrivy, useWallets, useLinkAccount } from "@privy-io/react-auth";
import { BUILDINGS, CREDITCOIN_TESTNET, TICK_MS } from "../lib/constants";
import { PlacedStructure } from "../components/CityCanvas";
import { Resources, MarketConditionState } from "../components/ResourceBar";
import { generateAttestationPayload, AttestationPayload } from "../lib/attestationHelper";
import { createBattleStateForLevel, tickBattle, BattleState, QuirkEvents } from "../lib/battleEngine";
import { getState, saveState } from "../lib/api";
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
}

export function useBastionGame() {
  // Settlement Structures Grid
  const [structures, setStructures] = useState<PlacedStructure[]>([
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
  ]);

  // Player Resource Vault
  const [resources, setResources] = useState<Resources>({
    stone: 240,
    energy: 180,
    food: 200,
    aegisAlloy: 45,
  });

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

  // Web3 Wallet State (populated from Privy)
  const { ready, authenticated, login, logout, getAccessToken } = usePrivy();
  const { wallets } = useWallets();
  const { linkWallet } = useLinkAccount();
  const [account, setAccount] = useState<string | null>(null);
  const [balance, setBalance] = useState("12.45");
  const [networkId, setNetworkId] = useState<number | null>(CREDITCOIN_TESTNET.chainId);
  const [isSandboxMode, setIsSandboxMode] = useState(true);
  const [isStateLoaded, setIsStateLoaded] = useState(false);

  // Compute Total Defense Power from Active Structures
  const totalDefensePower = structures.reduce((acc, s) => {
    if (s.condition === "Destroyed") return acc;
    const def = BUILDINGS[s.type];
    const power = def ? def.defensePower * s.level : 0;
    return acc + (s.condition === "Damaged" ? Math.floor(power * 0.5) : power);
  }, 0);

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

  // Upgrade Structure
  const handleUpgradeStructure = useCallback(
    (structureId: string) => {
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
    [resources, inspectedStructure]
  );

  // Start the next Titan wave (level 1 on first call, or the current level after a restart)
  const handleStartWave = useCallback(() => {
    if (battleStateRef.current) return; // a wave is already running
    setIsStarting(true);

    setTimeout(() => {
      // Poll an Attestcoin proof for flavor/inspection; the wave's difficulty
      // itself is driven by the deterministic level-scaling formulas below.
      setLatestPayload(generateAttestationPayload());
      setBattleState(createBattleStateForLevel(levelRef.current));
      setIsStarting(false);
    }, 500);
  }, []);

  // Restart the whole campaign after a Wall breach
  const handleRestart = useCallback(() => {
    setLevel(1);
    setWallStatus("standing");
    setBattleState(createBattleStateForLevel(1));
  }, []);

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

  // Link an additional wallet to the current account without logging out
  const handleConnectAnotherAccount = useCallback(() => {
    linkWallet();
  }, [linkWallet]);

  // Derive account/network/balance from the active Privy wallet (embedded or external)
  useEffect(() => {
    const wallet = wallets[0];
    if (!wallet) return;
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
    account,
    balance,
    networkId,
    isSandboxMode,
    setIsSandboxMode,
    handleHarvest,
    handlePlaceBuilding,
    handleRepairStructure,
    handleUpgradeStructure,
    handleStartWave,
    handleRestart,
    handleConnectWallet,
    handleSwitchNetwork,
    handleLogout,
    handleConnectAnotherAccount,
  };
}
