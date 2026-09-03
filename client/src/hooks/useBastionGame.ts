import { useState, useEffect, useCallback } from "react";
import { BUILDINGS, COLOSSI_ARCHETYPES, CREDITCOIN_TESTNET } from "../lib/constants";
import { PlacedStructure, ActiveColossus } from "../components/CityCanvas";
import { Resources, MarketConditionState } from "../components/ResourceBar";
import { generateAttestationPayload, AttestationPayload } from "../lib/attestationHelper";
import confetti from "canvas-confetti";
import { ethers } from "ethers";

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

  // Active Incursion Threat (Phase 1)
  const [activeColossus, setActiveColossus] = useState<ActiveColossus | null>(null);
  const [totalRepelled, setTotalRepelled] = useState(2);
  const [totalBreached, setTotalBreached] = useState(0);

  // Animation Triggers
  const [firingAnimationTrigger, setFiringAnimationTrigger] = useState(0);
  const [isTriggering, setIsTriggering] = useState(false);
  const [isDefending, setIsDefending] = useState(false);
  const [isHarvesting, setIsHarvesting] = useState(false);

  // Latest Cryptographic Proof for Inspector Modal
  const [latestPayload, setLatestPayload] = useState<AttestationPayload | null>(null);
  const [isProofModalOpen, setIsProofModalOpen] = useState(false);

  // Web3 Wallet State
  const [account, setAccount] = useState<string | null>(null);
  const [balance, setBalance] = useState("12.45");
  const [networkId, setNetworkId] = useState<number | null>(CREDITCOIN_TESTNET.chainId);
  const [isSandboxMode, setIsSandboxMode] = useState(true);

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

  // Trigger Attested Incursion (Phase 1 Core ASC Call)
  const handleTriggerIncursion = useCallback(() => {
    setIsTriggering(true);

    setTimeout(() => {
      // 1. Generate cryptographic Attestcoin proof
      const payload = generateAttestationPayload();
      setLatestPayload(payload);

      const sim = payload.simulatedColossus!;
      const archetypeInfo = COLOSSI_ARCHETYPES[sim.archetype];

      // 2. Spawn Colossus outside the perimeter on canvas
      const newColossus: ActiveColossus = {
        id: Date.now(),
        archetype: sim.archetype,
        name: archetypeInfo.name,
        severity: sim.severity,
        hp: sim.hp,
        maxHp: sim.hp,
        x: 320, // Center top of canvas
        y: 65,  // Just outside the north wall
        targetX: 320,
        targetY: 280, // Targeting Citadel Core
        status: "Approaching",
        siegePower: sim.siege,
      };

      setActiveColossus(newColossus);
      setIsTriggering(false);
    }, 800);
  }, []);

  // Mobilize Defenses (Combat Resolution)
  const handleMobilizeDefenses = useCallback(() => {
    if (!activeColossus) return;
    setIsDefending(true);
    setFiringAnimationTrigger((prev) => prev + 1);

    setTimeout(() => {
      const damageDealt = totalDefensePower;
      const remainingHp = Math.max(0, activeColossus.hp - damageDealt);

      if (remainingHp === 0) {
        // VICTORY: Colossus repelled
        setActiveColossus((prev) => (prev ? { ...prev, hp: 0, status: "Repelled" } : null));
        setTotalRepelled((prev) => prev + 1);

        // Award battle bounty
        const stoneBounty = activeColossus.severity * 75;
        const energyBounty = activeColossus.severity * 40;
        setResources((prev) => ({
          ...prev,
          stone: prev.stone + stoneBounty,
          energy: prev.energy + energyBounty,
        }));

        // Confetti celebration
        try {
          confetti({
            particleCount: 80,
            spread: 70,
            origin: { y: 0.6 },
          });
        } catch (_) {}

        // Clear Colossus after delay
        setTimeout(() => {
          setActiveColossus(null);
          setIsDefending(false);
        }, 2500);
      } else {
        // Colossus survived and batters defenses
        setActiveColossus((prev) =>
          prev ? { ...prev, hp: remainingHp, status: "Engaged" } : null
        );

        // Inflict damage on outer structures
        setStructures((prev) =>
          prev.map((s) => {
            if (s.type === "RAMPART" && s.durability > 0) {
              const newDur = Math.max(0, s.durability - 400);
              return {
                ...s,
                durability: newDur,
                condition: newDur === 0 ? "Destroyed" : newDur < s.maxDurability / 2 ? "Damaged" : "Intact",
              };
            }
            return s;
          })
        );
        setIsDefending(false);
      }
    }, 1200);
  }, [activeColossus, totalDefensePower]);

  // Connect Web3 Wallet
  const handleConnectWallet = useCallback(async () => {
    if (typeof window !== "undefined" && (window as any).ethereum) {
      try {
        const provider = new ethers.BrowserProvider((window as any).ethereum);
        const accounts = await provider.send("eth_requestAccounts", []);
        const net = await provider.getNetwork();
        setAccount(accounts[0]);
        setNetworkId(Number(net.chainId));
        const bal = await provider.getBalance(accounts[0]);
        setBalance(Number(ethers.formatEther(bal)).toFixed(2));
      } catch (err) {
        console.error("Wallet connection failed:", err);
      }
    } else {
      // Demo simulated account
      setAccount("0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266");
      setNetworkId(CREDITCOIN_TESTNET.chainId);
      setBalance("12.45");
    }
  }, []);

  // Switch to Creditcoin CC3 Testnet
  const handleSwitchNetwork = useCallback(async () => {
    if (typeof window !== "undefined" && (window as any).ethereum) {
      try {
        await (window as any).ethereum.request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId: CREDITCOIN_TESTNET.chainIdHex }],
        });
        setNetworkId(CREDITCOIN_TESTNET.chainId);
      } catch (switchError: any) {
        if (switchError.code === 4902) {
          await (window as any).ethereum.request({
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
    }
  }, []);

  return {
    structures,
    resources,
    marketCondition,
    selectedBuildingId,
    setSelectedBuildingId,
    inspectedStructure,
    setInspectedStructure,
    activeColossus,
    totalRepelled,
    totalBreached,
    totalDefensePower,
    firingAnimationTrigger,
    isTriggering,
    isDefending,
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
    handleTriggerIncursion,
    handleMobilizeDefenses,
    handleConnectWallet,
    handleSwitchNetwork,
  };
}
