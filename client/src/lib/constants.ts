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
  /** Ticks between shots for structures that fire on the Titan each battle tick. Undefined = does not fire. */
  cooldownTicks?: number;
}

export const BUILDINGS: Record<string, BuildingDefinition> = {
  CITADEL: {
    id: "CITADEL",
    name: "Citadel Core",
    category: "core",
    cost: { stone: 0, energy: 0, food: 0, alloy: 0 },
    defensePower: 300,
    maxDurability: 3000,
    description:
      "The supreme command center of the settlement. Must never fall.",
    icon: "Shield",
    cooldownTicks: 1, // was 2; shortened 25% (floor, min 1 tick)
  },
  RAMPART: {
    id: "RAMPART",
    name: "Aegis Rampart",
    category: "defense",
    cost: { stone: 40, energy: 5, food: 0, alloy: 0 },
    defensePower: 120,
    maxDurability: 1500,
    description:
      "Reinforced granite wall designed to absorb devastating blunt siege attacks.",
    icon: "Layers",
    cooldownTicks: 3, // was 2; the fireball attack's cooldown was raised 30% (round to nearest tick)
  },
  BALLISTA: {
    id: "BALLISTA",
    name: "Ballista Bastion",
    category: "defense",
    cost: { stone: 60, energy: 25, food: 0, alloy: 10 },
    defensePower: 450,
    maxDurability: 800,
    description:
      "Heavy ranged counter-battery firing forged armor-piercing iron bolts.",
    icon: "Crosshair",
    cooldownTicks: 1, // was 2; shortened 25% (floor, min 1 tick)
  },
  SUNSTONE_PYLON: {
    id: "SUNSTONE_PYLON",
    name: "Sunstone Battery",
    category: "defense",
    cost: { stone: 50, energy: 70, food: 0, alloy: 20 },
    defensePower: 650,
    maxDurability: 600,
    description:
      "Arcane energy projector emitting focused plasma arcs against flying and armored Colossi.",
    icon: "Zap",
    cooldownTicks: 1, // already at the 1-tick floor; can't shorten further at this TICK_MS granularity
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
    description:
      "Cultivates vital grains and rations to sustain the city garrison.",
    icon: "Wheat",
  },
  ENERGY_COLLECTOR: {
    id: "ENERGY_COLLECTOR",
    name: "Sunstone Collector",
    category: "economy",
    cost: { stone: 30, energy: 30, food: 0, alloy: 5 },
    defensePower: 30,
    maxDurability: 550,
    description:
      "Channels radiant planetary geothermal energy into stored batteries.",
    icon: "Sun",
  },
};

export type TitanClass = "colossus" | "armored" | "female" | "beast";

export const COLOSSI_ARCHETYPES = [
  {
    type: 0,
    name: "Mountain Colossus",
    title: "The Fallout Breaker",
    description:
      "A hulking radioactive behemoth whose fallout intensifies the closer it gets, irradiating every structure in the settlement.",
    color: "#f97316", // Orange
    weakness: "Sunstone Plasma",
    class: "colossus" as TitanClass,
  },
  {
    type: 1,
    name: "Dread Strider",
    title: "The Skittering Nightmare",
    description:
      "A rapid predator that lashes out at the nearest defense every few seconds while closing the distance.",
    color: "#a855f7", // Purple
    weakness: "Ballista Bolts",
    class: "beast" as TitanClass,
  },
  {
    type: 2,
    name: "Ironclad Gorger",
    title: "The Ore Devourer",
    description:
      "Plated in heavy slag armor; periodically breaks into a devastating sprint that flattens anything in its path.",
    color: "#eab308", // Yellow
    weakness: "Aegis Ramparts",
    class: "armored" as TitanClass,
  },
  {
    type: 3,
    name: "Tempest Goliath",
    title: "The Storm Bringer",
    description:
      "Crackling with lightning, she calls forth two lightning wisps to shield herself from focused fire.",
    color: "#06b6d4", // Cyan
    weakness: "Concentrated Fire",
    class: "female" as TitanClass,
  },
];

// --- Grid & Lane Geometry (shared by CityCanvas and battleEngine) ---
export const GRID_SIZE = 12;
export const TILE_SIZE = 48; // 12 * 48 = 576px canvas
export const PADDING = 40;
// The Titan always marches down this fixed grid column — matches the default
// Citadel/Ballista/Rampart column so "in its path" effects land somewhere meaningful.
export const LANE_GRID_COLUMN = 5;

// --- Titan Wave Scaling (tunable) ---
// Levels are uncapped. Each level compounds HP by HP_GROWTH_RATE (70% per the
// design brief), grows lane distance linearly, and creeps Titan speed up by a
// tiny compounding fraction so the march never suddenly becomes trivial or
// unfair as HP scales into very large numbers.
export const BASE_BOSS_HP = 2000;
export const HP_GROWTH_RATE = 0.7; // +70% HP per level, compounding
export const BASE_LANE_DISTANCE = 600; // abstract distance units to reach the Wall
export const LANE_GROWTH_PER_LEVEL = 40; // additional units per level
export const BASE_TITAN_SPEED = 6; // distance units per tick
export const SPEED_GROWTH_RATE = 0.015; // +1.5% speed per level, compounding
export const TICK_MS = 400; // battle tick interval

// --- Defense Cooldown Scaling (tunable) ---
// Stronger (higher-level) defenses hit harder but fire less often, capped so no
// structure ever takes longer than MAX_COOLDOWN_MS between shots.
// Whole formula shortened 25% (base ticks, per-level growth, and the cap all x0.75)
// so every defense fires 25% faster at every level, not just at level 1.
export const MAX_COOLDOWN_MS = 7500; // was 10000; 10s hard cap x0.75
export const MAX_COOLDOWN_TICKS = Math.round(MAX_COOLDOWN_MS / TICK_MS);
export const COOLDOWN_GROWTH_PER_LEVEL = 0.75; // was 1; +1 tick of cooldown per upgrade level x0.75

// --- Defense Structure Progression ---
export const MAX_STRUCTURE_LEVEL = 50;

// --- Paid Continue After Breach ---
// Placeholder — swap in a real treasury/receiving address before this goes live.
export const TREASURY_ADDRESS = "0x36a8a9b451bcc0e3ed75c8b92d0cc2b9b75232a6";
export const CONTINUE_AFTER_BREACH_FEE_CTC = "0.5";

// --- Paid Heal All (per structure type, triggered from the build palette) ---
export const HEAL_ALL_FEE_CTC = "0.2";

// --- Paid Upgrade All (per structure type, triggered from the build palette) ---
// Base network fee for the transaction itself — this is charged regardless of
// whether the player can otherwise afford the in-game Stone/Energy cost.
export const UPGRADE_ALL_BASE_FEE_CTC = "0.2";
// Test-token → resource conversion, used only to cover a *shortfall*: if the
// player doesn't have enough Stone/Energy on hand to pay the normal in-game
// upgrade cost, the missing amount is priced in tCTC and folded into the fee
// ("pay to skip the grind") instead of blocking the upgrade outright.
// A single upgrade normally costs 40 Stone + 20 Energy; a player with zero of
// either resource pays roughly 40/100 + 20/50 = 0.8 tCTC on top of the 0.2
// base fee per upgraded structure — meaningfully more than playing it out
// organically, so the shortcut has a real cost without being unreasonable on
// a testnet where tokens are free from the faucet.
export const STONE_PER_CTC = 100; // 1 tCTC covers ~100 Stone of shortfall
export const ENERGY_PER_CTC = 50; // 1 tCTC covers ~50 Energy of shortfall

// --- Faucet Drip (new-signup funding + manual top-up) ---
// Authoritative drip amount lives server-side (DRIP_AMOUNT_CTC in server/.env); this
// is only used for UI copy ("new accounts receive X tCTC").
export const DRIP_AMOUNT_CTC = "1";
export const FAUCET_URL = "https://discord.gg/RpCUu6Jc";

// Rough headroom above a fee to leave room for gas, used for pre-flight balance checks
// so a paid action can be blocked with a clear message before ever prompting a signature.
export const MIN_TX_GAS_BUFFER_CTC = "0.02";

// --- "Reach Level 15" Challenge ---
// A one-time reward, claimed the moment a commander first reaches this level.
export const LEVEL_15_CHALLENGE_LEVEL = 15;
export const LEVEL_15_CHALLENGE_MULTIPLIER = 15;

// --- Commander Dashboard ---
export const MAX_GAME_NAME_LENGTH = 24;

// --- Resource Packs (paid, via on-chain tCTC transaction to TREASURY_ADDRESS) ---
export interface ResourcePackResources {
  stone: number;
  energy: number;
  food: number;
  aegisAlloy: number;
}

export interface ResourcePack {
  id: string;
  name: string;
  priceCTC: string;
  resources: ResourcePackResources;
}

const BASIC_PACK_RESOURCES: ResourcePackResources = {
  stone: 3000,
  energy: 3000,
  food: 3000,
  aegisAlloy: 500,
};

function scaleResourcePack(multiplier: number): ResourcePackResources {
  return {
    stone: Math.round(BASIC_PACK_RESOURCES.stone * multiplier),
    energy: Math.round(BASIC_PACK_RESOURCES.energy * multiplier),
    food: Math.round(BASIC_PACK_RESOURCES.food * multiplier),
    aegisAlloy: Math.round(BASIC_PACK_RESOURCES.aegisAlloy * multiplier),
  };
}

export const RESOURCE_PACKS: ResourcePack[] = [
  { id: "basic", name: "Basic", priceCTC: "10", resources: scaleResourcePack(1) },
  { id: "standard-plus", name: "Standard+", priceCTC: "20", resources: scaleResourcePack(2) },
  { id: "mega", name: "Mega", priceCTC: "50", resources: scaleResourcePack(2.5) },
];

// --- Titan Class Quirks (tunable) ---
export const RADIOACTIVE_BASE_DAMAGE_PER_TICK = 40; // Colossus: scaled by proximity (0..1)
export const ARMORED_HP_BONUS_MULTIPLIER = 1.2; // +10% HP
export const ARMORED_SPRINT_ROWS = 4;
export const ARMORED_TIMER_SEQUENCE_MS = [15000, 20000, 25000]; // holds at 25000 after
export const FEMALE_TIMER_SEQUENCE_MS = [20000, 30000, 40000]; // holds at 40000 after
export const FEMALE_MINION_HP_RATIO = 0.2; // each minion = 20% of the Titan's max HP
export const BEAST_ATTACK_INTERVAL_MS = 4000; // fixed, no escalation

// --- Aegis Rampart Blockade ---
// A live Rampart directly in the Titan's current lane row halts its advance —
// the Titan grinds against it instead of marching through, dealing a small
// percentage of its own max HP to that Rampart on a fixed interval until the
// Rampart is destroyed, at which point the Titan resumes its march.
export const RAMPART_BLOCK_DAMAGE_PERCENT_OF_MAXHP = 0.005; // 0.01% of the Titan's max HP
export const RAMPART_BLOCK_DAMAGE_INTERVAL_MS = 300;
export const RAMPART_SWAY_PERIOD_MS = 450; // visual side-to-side "attacking" sway while blocked
