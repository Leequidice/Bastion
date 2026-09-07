import { PlacedStructure } from "../components/CityCanvas";
import {
  BUILDINGS,
  COLOSSI_ARCHETYPES,
  BASE_BOSS_HP,
  HP_GROWTH_RATE,
  BASE_LANE_DISTANCE,
  LANE_GROWTH_PER_LEVEL,
  BASE_TITAN_SPEED,
  SPEED_GROWTH_RATE,
} from "./constants";

const STORM_ARCHETYPE_INDEX = 3; // Tempest Goliath — the level 1 "storm" boss

export interface BossStats {
  hp: number;
  maxHp: number;
  speed: number;
  totalDistance: number;
  archetype: number;
  siegePower: number;
}

export interface ActiveTitan {
  id: number;
  level: number;
  archetype: number;
  name: string;
  hp: number;
  maxHp: number;
  speed: number;
  siegePower: number;
}

export type MatchStatus = "active" | "won" | "lost";

export interface BattleState {
  titan: ActiveTitan;
  distanceRemaining: number;
  totalDistance: number;
  matchStatus: MatchStatus;
}

export function getBossStatsForLevel(level: number): BossStats {
  const hp = Math.round(BASE_BOSS_HP * Math.pow(1 + HP_GROWTH_RATE, level - 1));
  const speed = BASE_TITAN_SPEED * Math.pow(1 + SPEED_GROWTH_RATE, level - 1);
  const totalDistance = BASE_LANE_DISTANCE + LANE_GROWTH_PER_LEVEL * (level - 1);
  const archetype = level === 1 ? STORM_ARCHETYPE_INDEX : level % COLOSSI_ARCHETYPES.length;
  const siegePower = Math.round(50 + hp * 0.05);

  return { hp, maxHp: hp, speed, totalDistance, archetype, siegePower };
}

export function createTitanForLevel(level: number): ActiveTitan {
  const stats = getBossStatsForLevel(level);
  const archetypeInfo = COLOSSI_ARCHETYPES[stats.archetype];

  return {
    id: Date.now(),
    level,
    archetype: stats.archetype,
    name: archetypeInfo.name,
    hp: stats.hp,
    maxHp: stats.maxHp,
    speed: stats.speed,
    siegePower: stats.siegePower,
  };
}

export function createBattleStateForLevel(level: number): BattleState {
  const titan = createTitanForLevel(level);
  const totalDistance = getBossStatsForLevel(level).totalDistance;

  return {
    titan,
    distanceRemaining: totalDistance,
    totalDistance,
    matchStatus: "active",
  };
}

/**
 * Advances the battle by one tick: ready structures fire on the Titan, then
 * either the Titan dies (win) or the Wall gets one tick closer to breaching (loss).
 * A same-tick win always takes priority over a same-tick breach — killing the
 * Titan saves the Wall even if it was one step from reaching it.
 */
export interface TickResult {
  state: BattleState;
  structures: PlacedStructure[];
  firedStructureIds: string[];
}

export function tickBattle(state: BattleState, structures: PlacedStructure[]): TickResult {
  if (state.matchStatus !== "active") {
    return { state, structures, firedStructureIds: [] };
  }

  let totalDamage = 0;
  const firedStructureIds: string[] = [];
  const nextStructures = structures.map((s) => {
    const def = BUILDINGS[s.type];
    if (!def || !def.cooldownTicks || s.condition === "Destroyed") {
      return s;
    }

    const cooldownRemaining = s.cooldownRemaining ?? 0;
    if (cooldownRemaining > 0) {
      return { ...s, cooldownRemaining: cooldownRemaining - 1 };
    }

    const power = def.defensePower * s.level;
    totalDamage += s.condition === "Damaged" ? Math.floor(power * 0.5) : power;
    firedStructureIds.push(s.id);
    return { ...s, cooldownRemaining: def.cooldownTicks - 1 };
  });

  const newTitanHp = Math.max(0, state.titan.hp - totalDamage);

  if (newTitanHp <= 0) {
    return {
      state: {
        ...state,
        titan: { ...state.titan, hp: 0 },
        matchStatus: "won",
      },
      structures: nextStructures,
      firedStructureIds,
    };
  }

  const newDistanceRemaining = Math.max(0, state.distanceRemaining - state.titan.speed);

  return {
    state: {
      ...state,
      titan: { ...state.titan, hp: newTitanHp },
      distanceRemaining: newDistanceRemaining,
      matchStatus: newDistanceRemaining <= 0 ? "lost" : "active",
    },
    structures: nextStructures,
    firedStructureIds,
  };
}
