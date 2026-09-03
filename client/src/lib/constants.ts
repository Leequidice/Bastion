export const CREDITCOIN_TESTNET = {
  chainId: 102031,
  chainIdHex: "0x18E8F",
  chainName: "Creditcoin Testnet (CC3)",
  rpcUrl: "https://rpc.cc3-testnet.creditcoin.network",
  currencyName: "Creditcoin Testnet",
  currencySymbol: "tCTC",
  decimals: 18,
  blockExplorerUrl: "https://creditcoin-testnet.blockscout.com",
  precompileVerifier: "0x0000000000000000000000000000000000000FD2",
  proverApiUrl: "https://prover.cc3-testnet.creditcoin.network",
};

export const SOURCE_CHAINS = {
  SEPOLIA: {
    chainKey: 1,
    name: "Ethereum Sepolia",
    explorer: "https://sepolia.etherscan.io",
  },
  MAINNET: {
    chainKey: 3,
    name: "Ethereum Mainnet",
    explorer: "https://etherscan.io",
  },
};

export const CONTRACT_ADDRESSES = {
  // Configured default addresses (can be overridden by environment or deployment)
  incursionEngine: "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512",
  economy: "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0",
  structures: "0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9",
  mockVerifier: "0x5FbDB2315678afecb367f032d93F642f64180aa3",
  seismicBeacon: "0x5FC8d32690cc91D4c39d9d3abcBD16989F875707",
};

export interface BuildingDefinition {
  id: string;
  name: string;
  category: "defense" | "economy" | "core";
  cost: { stone: number; energy: number; food: number; alloy: number };
  defensePower: number;
  maxDurability: number;
  description: string;
  icon: string;
}

export const BUILDINGS: Record<string, BuildingDefinition> = {
  CITADEL: {
    id: "CITADEL",
    name: "Citadel Core",
    category: "core",
    cost: { stone: 0, energy: 0, food: 0, alloy: 0 },
    defensePower: 300,
    maxDurability: 3000,
    description: "The supreme command center of the settlement. Must never fall.",
    icon: "Shield",
  },
  RAMPART: {
    id: "RAMPART",
    name: "Aegis Rampart",
    category: "defense",
    cost: { stone: 40, energy: 5, food: 0, alloy: 0 },
    defensePower: 120,
    maxDurability: 1500,
    description: "Reinforced granite wall designed to absorb devastating blunt siege attacks.",
    icon: "Layers",
  },
  BALLISTA: {
    id: "BALLISTA",
    name: "Ballista Bastion",
    category: "defense",
    cost: { stone: 60, energy: 25, food: 0, alloy: 10 },
    defensePower: 450,
    maxDurability: 800,
    description: "Heavy ranged counter-battery firing forged armor-piercing iron bolts.",
    icon: "Crosshair",
  },
  SUNSTONE_PYLON: {
    id: "SUNSTONE_PYLON",
    name: "Sunstone Battery",
    category: "defense",
    cost: { stone: 50, energy: 70, food: 0, alloy: 20 },
    defensePower: 650,
    maxDurability: 600,
    description: "Arcane energy projector emitting focused plasma arcs against flying and armored Colossi.",
    icon: "Zap",
  },
  QUARRY: {
    id: "QUARRY",
    name: "Stone Quarry",
    category: "economy",
    cost: { stone: 20, energy: 10, food: 15, alloy: 0 },
    defensePower: 20,
    maxDurability: 500,
    description: "Excavates dense raw stone for walls and defensive repairs.",
    icon: "Hammer",
  },
  FARM: {
    id: "FARM",
    name: "Terrace Hydro-Farm",
    category: "economy",
    cost: { stone: 15, energy: 15, food: 10, alloy: 0 },
    defensePower: 10,
    maxDurability: 400,
    description: "Cultivates vital grains and rations to sustain the city garrison.",
    icon: "Wheat",
  },
  ENERGY_COLLECTOR: {
    id: "ENERGY_COLLECTOR",
    name: "Sunstone Collector",
    category: "economy",
    cost: { stone: 30, energy: 30, food: 0, alloy: 5 },
    defensePower: 30,
    maxDurability: 550,
    description: "Channels radiant planetary geothermal energy into stored batteries.",
    icon: "Sun",
  },
};

export const COLOSSI_ARCHETYPES = [
  {
    type: 0,
    name: "Mountainbreaker",
    title: "The Earthshaker",
    description: "A hulking behemoth of petrified rock that smashes outer ramparts with crushing shockwaves.",
    color: "#f97316", // Orange
    weakness: "Sunstone Plasma",
  },
  {
    type: 1,
    name: "Dread Strider",
    title: "The Skittering Nightmare",
    description: "A rapid multi-limbed monstrosity able to scale defenses and snipe defensive watchtowers.",
    color: "#a855f7", // Purple
    weakness: "Ballista Bolts",
  },
  {
    type: 2,
    name: "Ironclad Gorger",
    title: "The Ore Devourer",
    description: "Plated in natural slag armor, it consumes grain silos and raw stone reserves upon breach.",
    color: "#eab308", // Yellow
    weakness: "Aegis Ramparts",
  },
  {
    type: 3,
    name: "Tempest Goliath",
    title: "The Storm Bringer",
    description: "Crackling with uncontrolled lightning, it disrupts energy grids and defense targeting.",
    color: "#06b6d4", // Cyan
    weakness: "Concentrated Fire",
  },
];
