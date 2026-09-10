import { PlacedStructure } from "../components/CityCanvas";
import {
  BUILDINGS,
  COLOSSI_ARCHETYPES,
  TitanClass,
  BASE_BOSS_HP,
  HP_GROWTH_RATE,
  BASE_LANE_DISTANCE,
  LANE_GROWTH_PER_LEVEL,
  BASE_TITAN_SPEED,
  SPEED_GROWTH_RATE,
  TICK_MS,
  GRID_SIZE,
  LANE_GRID_COLUMN,
  MAX_COOLDOWN_TICKS,
  COOLDOWN_GROWTH_PER_LEVEL,
  RADIOACTIVE_BASE_DAMAGE_PER_TICK,
  ARMORED_HP_BONUS_MULTIPLIER,
  ARMORED_SPRINT_ROWS,
  ARMORED_TIMER_SEQUENCE_MS,
  FEMALE_TIMER_SEQUENCE_MS,
  FEMALE_MINION_HP_RATIO,
  BEAST_ATTACK_INTERVAL_MS,
  RAMPART_BLOCK_DAMAGE_PERCENT_OF_MAXHP,
  RAMPART_BLOCK_DAMAGE_INTERVAL_MS,
} from "./constants";

const STORM_ARCHETYPE_INDEX = 3; // Tempest Goliath — the level 1 "storm" boss

export interface BossStats {
  hp: number;
  maxHp: number;
  speed: number;
  totalDistance: number;
  archetype: number;
  siegePower: number;
  class: TitanClass;
}

export interface ActiveMinion {
  id: number;
  hp: number;
  maxHp: number;
}

export interface ActiveTitan {
  id: number;
  level: number;
  archetype: number;
  name: string;
  class: TitanClass;
  hp: number;
  maxHp: number;
  speed: number;
  siegePower: number;
  /** Ms remaining until the class's next quirk trigger. Null for classes with no discrete timer (Colossus). */
  quirkTimerMs: number | null;
  /** How many times the quirk has fired — drives the escalating-then-hold timer sequences. */
  quirkTriggerCount: number;
  /** Female class only: shielding minions currently absorbing incoming defense fire. */
  minions: ActiveMinion[];
  /** Ms remaining until the next chip-damage tick against a blocking Rampart. */
  wallAttackTimerMs: number;
}

export type MatchStatus = "active" | "won" | "lost";

export interface BattleState {
  titan: ActiveTitan;
  distanceRemaining: number;
  totalDistance: number;
  matchStatus: MatchStatus;
  /** Id of the Rampart currently halting the Titan's advance, if any. */
  blockedByStructureId: string | null;
}

export interface QuirkEvents {
  sprinted: boolean;
  minionsSpawned: boolean;
  beastAttackTargetId: string | null;
  radioactiveDamage: number;
}

const NO_QUIRK_EVENTS: QuirkEvents = {
  sprinted: false,
  minionsSpawned: false,
  beastAttackTargetId: null,
  radioactiveDamage: 0,
};

export function getBossStatsForLevel(level: number): BossStats {
  const archetype = level === 1 ? STORM_ARCHETYPE_INDEX : level % COLOSSI_ARCHETYPES.length;
  const titanClass = COLOSSI_ARCHETYPES[archetype].class;

  let hp = Math.round(BASE_BOSS_HP * Math.pow(1 + HP_GROWTH_RATE, level - 1));
  if (titanClass === "armored") {
    hp = Math.round(hp * ARMORED_HP_BONUS_MULTIPLIER);
  }

  const speed = BASE_TITAN_SPEED * Math.pow(1 + SPEED_GROWTH_RATE, level - 1);
  const totalDistance = BASE_LANE_DISTANCE + LANE_GROWTH_PER_LEVEL * (level - 1);
  const siegePower = Math.round(50 + hp * 0.05);

  return { hp, maxHp: hp, speed, totalDistance, archetype, siegePower, class: titanClass };
}

function initialQuirkTimerMs(titanClass: TitanClass): number | null {
  switch (titanClass) {
    case "armored":
      return ARMORED_TIMER_SEQUENCE_MS[0];
    case "female":
      return FEMALE_TIMER_SEQUENCE_MS[0];
    case "beast":
      return BEAST_ATTACK_INTERVAL_MS;
    default:
      return null;
  }
}

export function createTitanForLevel(level: number): ActiveTitan {
  const stats = getBossStatsForLevel(level);
  const archetypeInfo = COLOSSI_ARCHETYPES[stats.archetype];

  return {
    id: Date.now(),
    level,
    archetype: stats.archetype,
    name: archetypeInfo.name,
    class: stats.class,
    hp: stats.hp,
    maxHp: stats.maxHp,
    speed: stats.speed,
    siegePower: stats.siegePower,
    quirkTimerMs: initialQuirkTimerMs(stats.class),
    quirkTriggerCount: 0,
    minions: [],
    wallAttackTimerMs: RAMPART_BLOCK_DAMAGE_INTERVAL_MS,
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
    blockedByStructureId: null,
  };
}

/** Cooldown grows with structure level (stronger defenses fire less often), capped at MAX_COOLDOWN_TICKS. */
export function getEffectiveCooldownTicks(baseCooldownTicks: number, structureLevel: number): number {
  const scaled = baseCooldownTicks + (structureLevel - 1) * COOLDOWN_GROWTH_PER_LEVEL;
  return Math.min(MAX_COOLDOWN_TICKS, scaled);
}

/** Which grid row (0..GRID_SIZE-1) the Titan currently occupies along its fixed lane. */
export function getCurrentGridRow(state: BattleState): number {
  const progress = 1 - state.distanceRemaining / state.totalDistance;
  return Math.min(GRID_SIZE - 1, Math.max(0, Math.floor(progress * GRID_SIZE)));
}

function applyDurabilityDamage(s: PlacedStructure, dmg: number): PlacedStructure {
  if (dmg <= 0) return s;
  const newDurability = Math.max(0, s.durability - dmg);
  const condition = newDurability === 0 ? "Destroyed" : newDurability < s.maxDurability / 2 ? "Damaged" : "Intact";
  return { ...s, durability: newDurability, condition };
}

function findNearestPathStructure(structures: PlacedStructure[], currentRow: number): PlacedStructure | null {
  const inColumn = structures.filter((s) => s.gridX === LANE_GRID_COLUMN && s.condition !== "Destroyed");
  if (inColumn.length === 0) return null;

  const ahead = inColumn.filter((s) => s.gridY >= currentRow).sort((a, b) => a.gridY - b.gridY);
  if (ahead.length > 0) return ahead[0];

  return [...inColumn].sort((a, b) => a.gridY - b.gridY)[0];
}

function nextSequenceValue(sequence: number[], triggerCount: number): number {
  return sequence[Math.min(triggerCount, sequence.length - 1)];
}

/**
 * Advances the battle by one tick:
 *   1. Class quirks resolve (Armored sprint / Female minion spawn / Beast strike on
 *      their timers; Colossus's continuous radioactive AoE every tick).
 *   2. Ready structures fire on the Titan (level-scaled cooldown, per getEffectiveCooldownTicks).
 *   3. Damage routes through any Female shielding minions first, then the Titan.
 *   4. Win/loss resolves — a same-tick win always takes priority over a same-tick breach.
 */
export interface TickResult {
  state: BattleState;
  structures: PlacedStructure[];
  firedStructureIds: string[];
  quirkEvents: QuirkEvents;
}

export function tickBattle(state: BattleState, structures: PlacedStructure[]): TickResult {
  if (state.matchStatus !== "active") {
    return { state, structures, firedStructureIds: [], quirkEvents: NO_QUIRK_EVENTS };
  }

  const currentRow = getCurrentGridRow(state);
  let titan: ActiveTitan = { ...state.titan, minions: state.titan.minions.map((m) => ({ ...m })) };
  let workingStructures = structures;
  let distanceBonus = 0;
  const quirkEvents: QuirkEvents = { ...NO_QUIRK_EVENTS };

  // 1a. Timer-driven class quirks (Armored / Female / Beast)
  if (titan.quirkTimerMs !== null) {
    const remaining = titan.quirkTimerMs - TICK_MS;
    if (remaining <= 0) {
      titan.quirkTriggerCount += 1;

      if (titan.class === "armored") {
        const affectedRows = new Set(
          Array.from({ length: ARMORED_SPRINT_ROWS }, (_, i) => currentRow + i)
        );
        workingStructures = workingStructures.map((s) =>
          s.gridX === LANE_GRID_COLUMN && affectedRows.has(s.gridY) && s.condition !== "Destroyed"
            ? { ...s, durability: 0, condition: "Destroyed" as const }
            : s
        );
        distanceBonus = (state.totalDistance / GRID_SIZE) * ARMORED_SPRINT_ROWS;
        quirkEvents.sprinted = true;
        titan.quirkTimerMs = nextSequenceValue(ARMORED_TIMER_SEQUENCE_MS, titan.quirkTriggerCount);
      } else if (titan.class === "female") {
        const minionHp = Math.round(titan.maxHp * FEMALE_MINION_HP_RATIO);
        titan.minions = [
          { id: Date.now(), hp: minionHp, maxHp: minionHp },
          { id: Date.now() + 1, hp: minionHp, maxHp: minionHp },
        ];
        quirkEvents.minionsSpawned = true;
        titan.quirkTimerMs = nextSequenceValue(FEMALE_TIMER_SEQUENCE_MS, titan.quirkTriggerCount);
      } else if (titan.class === "beast") {
        const target = findNearestPathStructure(workingStructures, currentRow);
        if (target) {
          workingStructures = workingStructures.map((s) =>
            s.id === target.id ? applyDurabilityDamage(s, titan.siegePower) : s
          );
          quirkEvents.beastAttackTargetId = target.id;
        }
        titan.quirkTimerMs = BEAST_ATTACK_INTERVAL_MS;
      }
    } else {
      titan.quirkTimerMs = remaining;
    }
  }

  // 1b. Colossus: continuous radioactive AoE, scaling with proximity to the Wall
  if (titan.class === "colossus") {
    const progress = 1 - state.distanceRemaining / state.totalDistance;
    const dmgPerStructure = Math.round(RADIOACTIVE_BASE_DAMAGE_PER_TICK * progress);
    if (dmgPerStructure > 0) {
      workingStructures = workingStructures.map((s) =>
        s.condition === "Destroyed" ? s : applyDurabilityDamage(s, dmgPerStructure)
      );
      quirkEvents.radioactiveDamage = dmgPerStructure;
    }
  }

  // 2. Defense fire, level-scaled cooldown
  let totalDamage = 0;
  const firedStructureIds: string[] = [];
  let nextStructures = workingStructures.map((s) => {
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
    const effectiveCooldown = getEffectiveCooldownTicks(def.cooldownTicks, s.level);
    return { ...s, cooldownRemaining: effectiveCooldown - 1 };
  });

  // 2b. Aegis Rampart blockade: a live Rampart on the Titan's current row halts
  // its advance. The Titan grinds it down (a slice of its own max HP per fixed
  // interval) instead of taking ranged damage — no distance is lost this tick,
  // and it resumes marching once that Rampart is destroyed.
  const blockingRampart = nextStructures.find(
    (s) =>
      s.type === "RAMPART" &&
      s.gridX === LANE_GRID_COLUMN &&
      s.gridY === currentRow &&
      s.condition !== "Destroyed"
  );

  let blockedByStructureId: string | null = null;
  if (blockingRampart) {
    blockedByStructureId = blockingRampart.id;
    const wallAttackRemaining = titan.wallAttackTimerMs - TICK_MS;
    if (wallAttackRemaining <= 0) {
      const wallDamage = Math.max(1, Math.round(titan.maxHp * RAMPART_BLOCK_DAMAGE_PERCENT_OF_MAXHP));
      nextStructures = nextStructures.map((s) =>
        s.id === blockingRampart.id ? applyDurabilityDamage(s, wallDamage) : s
      );
      titan.wallAttackTimerMs = RAMPART_BLOCK_DAMAGE_INTERVAL_MS;
    } else {
      titan.wallAttackTimerMs = wallAttackRemaining;
    }
  } else {
    titan.wallAttackTimerMs = RAMPART_BLOCK_DAMAGE_INTERVAL_MS;
  }

  // 3. Route damage through Female's shielding minions first
  if (titan.minions.length > 0) {
    let remainingDamage = totalDamage;
    const survivingMinions: ActiveMinion[] = [];
    for (const minion of titan.minions) {
      if (remainingDamage <= 0) {
        survivingMinions.push(minion);
        continue;
      }
      const newHp = Math.max(0, minion.hp - remainingDamage);
      remainingDamage = Math.max(0, remainingDamage - minion.hp);
      if (newHp > 0) survivingMinions.push({ ...minion, hp: newHp });
    }
    titan.minions = survivingMinions;
    titan.hp = Math.max(0, titan.hp - remainingDamage);
  } else {
    titan.hp = Math.max(0, titan.hp - totalDamage);
  }

  // 4. Win check
  if (titan.hp <= 0) {
    return {
      state: { ...state, titan: { ...titan, hp: 0 }, matchStatus: "won", blockedByStructureId },
      structures: nextStructures,
      firedStructureIds,
      quirkEvents,
    };
  }

  // 5. Movement — halted entirely while a Rampart blocks the current row,
  // otherwise normal speed + any quirk-triggered bonus (e.g. Armored's sprint).
  const newDistanceRemaining = blockedByStructureId
    ? state.distanceRemaining
    : Math.max(0, state.distanceRemaining - state.titan.speed - distanceBonus);

  return {
    state: {
      ...state,
      titan,
      distanceRemaining: newDistanceRemaining,
      matchStatus: newDistanceRemaining <= 0 ? "lost" : "active",
      blockedByStructureId,
    },
    structures: nextStructures,
    firedStructureIds,
    quirkEvents,
  };
}
