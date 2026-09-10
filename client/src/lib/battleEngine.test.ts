import { describe, it, expect } from "vitest";
import {
  getBossStatsForLevel,
  createTitanForLevel,
  createBattleStateForLevel,
  tickBattle,
  getEffectiveCooldownTicks,
  getCurrentGridRow,
} from "./battleEngine";
import { PlacedStructure } from "../components/CityCanvas";
import {
  BASE_BOSS_HP,
  BASE_TITAN_SPEED,
  BASE_LANE_DISTANCE,
  GRID_SIZE,
  LANE_GRID_COLUMN,
  MAX_COOLDOWN_TICKS,
  ARMORED_HP_BONUS_MULTIPLIER,
  ARMORED_SPRINT_ROWS,
  ARMORED_TIMER_SEQUENCE_MS,
  FEMALE_TIMER_SEQUENCE_MS,
  FEMALE_MINION_HP_RATIO,
  BEAST_ATTACK_INTERVAL_MS,
  TICK_MS,
} from "./constants";

// Class rotation: level 1 is special-cased to index 3 (female); thereafter level % 4.
// index 0 = colossus, 1 = beast, 2 = armored, 3 = female.
const LEVEL_FEMALE = 1; // 1 -> index 3
const LEVEL_ARMORED = 2; // 2 % 4 -> index 2
const LEVEL_FEMALE_2 = 3; // 3 % 4 -> index 3
const LEVEL_COLOSSUS = 4; // 4 % 4 -> index 0
const LEVEL_BEAST = 5; // 5 % 4 -> index 1

function makeStructure(overrides: Partial<PlacedStructure> = {}): PlacedStructure {
  return {
    id: "s1",
    type: "BALLISTA",
    gridX: 0,
    gridY: 0,
    durability: 800,
    maxDurability: 800,
    level: 1,
    condition: "Intact",
    ...overrides,
  };
}

describe("getBossStatsForLevel", () => {
  it("returns BASE_BOSS_HP at level 1", () => {
    expect(getBossStatsForLevel(1).hp).toBe(BASE_BOSS_HP);
  });

  it("compounds HP by 70% each level (levels not affected by the Armored class HP bonus)", () => {
    // Levels 3 and 4 are female/colossus respectively — neither gets the Armored bonus.
    const l3 = getBossStatsForLevel(LEVEL_FEMALE_2).hp;
    const l4 = getBossStatsForLevel(LEVEL_COLOSSUS).hp;
    expect(l4).toBeCloseTo(l3 * 1.7, 0);
  });

  it("has no cap: HP keeps climbing at very high levels with no NaN/overflow", () => {
    // Levels 9 and 49 land on non-Armored classes (beast) so the bonus doesn't skew the check.
    const l9 = getBossStatsForLevel(9).hp;
    const l49 = getBossStatsForLevel(49).hp;
    expect(Number.isFinite(l9)).toBe(true);
    expect(Number.isFinite(l49)).toBe(true);
    expect(l49).toBeGreaterThan(l9);
    expect(l9).toBeCloseTo(BASE_BOSS_HP * Math.pow(1.7, 8), -1);
  });

  it("Armored class gets a +10% HP bonus on top of the level formula", () => {
    const armoredHp = getBossStatsForLevel(LEVEL_ARMORED).hp;
    const unadjusted = BASE_BOSS_HP * Math.pow(1.7, LEVEL_ARMORED - 1);
    expect(armoredHp).toBeCloseTo(unadjusted * ARMORED_HP_BONUS_MULTIPLIER, 0);
  });

  it("HP is strictly increasing level over level", () => {
    let prev = getBossStatsForLevel(1).hp;
    for (let lvl = 2; lvl <= 20; lvl++) {
      const hp = getBossStatsForLevel(lvl).hp;
      expect(hp).toBeGreaterThan(prev);
      prev = hp;
    }
  });

  it("returns BASE_TITAN_SPEED at level 1 and increases only slightly per level", () => {
    const l1 = getBossStatsForLevel(1).speed;
    const l2 = getBossStatsForLevel(2).speed;
    expect(l1).toBe(BASE_TITAN_SPEED);
    expect(l2).toBeGreaterThan(l1);
    // "tiny fraction" — speed growth rate should be far smaller than HP growth rate
    const speedGrowth = l2 / l1 - 1;
    const hpGrowth = getBossStatsForLevel(2).hp / getBossStatsForLevel(1).hp - 1;
    expect(speedGrowth).toBeLessThan(hpGrowth / 10);
  });

  it("lane distance increases with level and starts at BASE_LANE_DISTANCE", () => {
    expect(getBossStatsForLevel(1).totalDistance).toBe(BASE_LANE_DISTANCE);
    const l1 = getBossStatsForLevel(1).totalDistance;
    const l5 = getBossStatsForLevel(5).totalDistance;
    expect(l5).toBeGreaterThan(l1);
  });

  it("spawns the storm archetype (Tempest Goliath, index 3) at level 1", () => {
    expect(getBossStatsForLevel(1).archetype).toBe(3);
  });

  it("maps archetypes to the correct titan class", () => {
    expect(getBossStatsForLevel(LEVEL_COLOSSUS).class).toBe("colossus");
    expect(getBossStatsForLevel(LEVEL_BEAST).class).toBe("beast");
    expect(getBossStatsForLevel(LEVEL_ARMORED).class).toBe("armored");
    expect(getBossStatsForLevel(LEVEL_FEMALE).class).toBe("female");
  });
});

describe("getEffectiveCooldownTicks", () => {
  it("equals the base cooldown at level 1", () => {
    expect(getEffectiveCooldownTicks(2, 1)).toBe(2);
  });

  it("grows with structure level", () => {
    expect(getEffectiveCooldownTicks(2, 5)).toBeGreaterThan(getEffectiveCooldownTicks(2, 1));
  });

  it("never exceeds MAX_COOLDOWN_TICKS even at very high structure levels", () => {
    expect(getEffectiveCooldownTicks(2, 1000)).toBe(MAX_COOLDOWN_TICKS);
  });
});

describe("getCurrentGridRow", () => {
  it("is row 0 at the start of the march and the last row just before breach", () => {
    const state = createBattleStateForLevel(1);
    expect(getCurrentGridRow(state)).toBe(0);

    const almostThere = { ...state, distanceRemaining: 1 };
    expect(getCurrentGridRow(almostThere)).toBe(GRID_SIZE - 1);
  });
});

describe("createTitanForLevel / createBattleStateForLevel", () => {
  it("creates a titan whose hp matches the level's boss stats", () => {
    const titan = createTitanForLevel(3);
    const stats = getBossStatsForLevel(3);
    expect(titan.hp).toBe(stats.hp);
    expect(titan.maxHp).toBe(stats.hp);
    expect(titan.level).toBe(3);
  });

  it("creates an active battle state with full distance remaining", () => {
    const state = createBattleStateForLevel(2);
    expect(state.matchStatus).toBe("active");
    expect(state.distanceRemaining).toBe(state.totalDistance);
    expect(state.titan.level).toBe(2);
  });
});

describe("tickBattle", () => {
  it("with no structures: titan hp is unchanged, distance decreases by exactly the titan's speed", () => {
    const state = createBattleStateForLevel(1);
    const { state: next } = tickBattle(state, []);
    expect(next.titan.hp).toBe(state.titan.hp);
    expect(next.distanceRemaining).toBe(state.distanceRemaining - state.titan.speed);
    expect(next.matchStatus).toBe("active");
  });

  it("applies defense fire and reduces titan hp on a ready structure", () => {
    const state = createBattleStateForLevel(1);
    const structures = [makeStructure({ level: 1 })]; // BALLISTA defensePower 450, cooldownTicks 2
    const { state: next } = tickBattle(state, structures);
    expect(next.titan.hp).toBe(state.titan.hp - 450);
  });

  it("respects structure cooldowns: a structure does not fire again until its cooldown elapses", () => {
    // RAMPART has cooldownTicks=3 (BALLISTA is down to 1 tick after the 25% attack-speed pass,
    // which leaves no cooldown gap to observe here).
    const state = createBattleStateForLevel(1);
    let structures = [makeStructure({ type: "RAMPART", level: 1 })];
    let battle = state;

    const tick1 = tickBattle(battle, structures);
    battle = tick1.state;
    structures = tick1.structures;
    expect(battle.titan.hp).toBe(state.titan.hp - 120); // fired tick 1

    const tick2 = tickBattle(battle, structures);
    battle = tick2.state;
    structures = tick2.structures;
    expect(battle.titan.hp).toBe(tick1.state.titan.hp); // cooling down, no fire tick 2

    const tick3 = tickBattle(battle, structures);
    battle = tick3.state;
    structures = tick3.structures;
    expect(battle.titan.hp).toBe(tick2.state.titan.hp); // still cooling down, no fire tick 3

    const tick4 = tickBattle(battle, structures);
    expect(tick4.state.titan.hp).toBe(battle.titan.hp - 120); // fires again tick 4 (cooldownTicks=3)
  });

  it("Damaged structures deal half damage, Destroyed structures deal none", () => {
    const state = createBattleStateForLevel(1);
    const structures = [
      makeStructure({ id: "a", condition: "Damaged" }),
      makeStructure({ id: "b", condition: "Destroyed" }),
    ];
    const { state: next } = tickBattle(state, structures);
    expect(next.titan.hp).toBe(state.titan.hp - 225); // 450 * 0.5, destroyed contributes 0
  });

  it("economy structures (no cooldownTicks) never fire", () => {
    const state = createBattleStateForLevel(1);
    const structures = [makeStructure({ type: "FARM", id: "farm" })];
    const { state: next } = tickBattle(state, structures);
    expect(next.titan.hp).toBe(state.titan.hp);
  });

  it("sets matchStatus to 'won' when titan hp drops to 0 or below", () => {
    const state = createBattleStateForLevel(1);
    state.titan.hp = 100; // nearly dead
    const structures = [makeStructure({ level: 1 })]; // deals 450
    const { state: next } = tickBattle(state, structures);
    expect(next.titan.hp).toBe(0);
    expect(next.matchStatus).toBe("won");
  });

  it("sets matchStatus to 'lost' when distance remaining drops to 0 with no structures", () => {
    const state = createBattleStateForLevel(1);
    state.distanceRemaining = state.titan.speed; // exactly one tick from the wall
    const { state: next } = tickBattle(state, []);
    expect(next.distanceRemaining).toBe(0);
    expect(next.matchStatus).toBe("lost");
  });

  it("prioritizes a win over a loss when both would happen on the same tick", () => {
    const state = createBattleStateForLevel(1);
    state.titan.hp = 1; // dies to any hit
    state.distanceRemaining = state.titan.speed; // would also breach this tick
    const structures = [makeStructure({ level: 1 })];
    const { state: next } = tickBattle(state, structures);
    expect(next.matchStatus).toBe("won");
    expect(next.titan.hp).toBe(0);
  });

  it("reports which structures fired this tick via firedStructureIds", () => {
    const state = createBattleStateForLevel(1);
    const structures = [
      makeStructure({ id: "ready", condition: "Intact" }),
      makeStructure({ id: "destroyed", condition: "Destroyed" }),
      makeStructure({ id: "farm", type: "FARM" }),
    ];
    const { firedStructureIds } = tickBattle(state, structures);
    expect(firedStructureIds).toEqual(["ready"]);
  });

  it("is a no-op once the match is no longer active", () => {
    const state = createBattleStateForLevel(1);
    state.matchStatus = "won";
    const structures = [makeStructure({ level: 1 })];
    const { state: next, structures: nextStructures } = tickBattle(state, structures);
    expect(next).toEqual(state);
    expect(nextStructures).toEqual(structures);
  });
});

describe("Armored class quirk", () => {
  it("sprints forward, destroys structures in the lane column across the affected rows, and leaves others untouched, when its timer elapses", () => {
    const state = createBattleStateForLevel(LEVEL_ARMORED);
    state.titan.quirkTimerMs = TICK_MS; // about to trigger this tick
    const inPath = makeStructure({ id: "in-path", gridX: LANE_GRID_COLUMN, gridY: 2 });
    const outOfColumn = makeStructure({ id: "out-of-column", gridX: LANE_GRID_COLUMN + 1, gridY: 2 });
    const farRow = makeStructure({ id: "far-row", gridX: LANE_GRID_COLUMN, gridY: GRID_SIZE - 1 });

    expect(getCurrentGridRow(state)).toBe(0); // sprint should affect rows 0..3

    const { state: next, structures } = tickBattle(state, [inPath, outOfColumn, farRow]);

    expect(structures.find((s) => s.id === "in-path")!.condition).toBe("Destroyed");
    expect(structures.find((s) => s.id === "out-of-column")!.condition).toBe("Intact");
    expect(structures.find((s) => s.id === "far-row")!.condition).toBe("Intact");

    expect(next.titan.quirkTimerMs).toBe(ARMORED_TIMER_SEQUENCE_MS[1]);

    const sprintBonus = (state.totalDistance / GRID_SIZE) * ARMORED_SPRINT_ROWS;
    expect(next.distanceRemaining).toBeCloseTo(state.distanceRemaining - state.titan.speed - sprintBonus, 5);
  });

  it("holds at the final timer interval after the third trigger", () => {
    const state = createBattleStateForLevel(LEVEL_ARMORED);
    state.titan.quirkTriggerCount = 3;
    state.titan.quirkTimerMs = TICK_MS;
    const { state: next } = tickBattle(state, []);
    expect(next.titan.quirkTimerMs).toBe(ARMORED_TIMER_SEQUENCE_MS[ARMORED_TIMER_SEQUENCE_MS.length - 1]);
  });
});

describe("Female class quirk", () => {
  it("spawns 2 minions at 20% of max HP when its timer elapses, and leaves the titan untouched by the spawn itself", () => {
    const state = createBattleStateForLevel(LEVEL_FEMALE);
    state.titan.quirkTimerMs = TICK_MS;

    const { state: afterSpawn } = tickBattle(state, []);

    const expectedMinionHp = Math.round(state.titan.maxHp * FEMALE_MINION_HP_RATIO);
    expect(afterSpawn.titan.minions).toHaveLength(2);
    afterSpawn.titan.minions.forEach((m) => {
      expect(m.hp).toBe(expectedMinionHp);
      expect(m.maxHp).toBe(expectedMinionHp);
    });
    expect(afterSpawn.titan.hp).toBe(state.titan.hp);
    expect(afterSpawn.titan.quirkTimerMs).toBe(FEMALE_TIMER_SEQUENCE_MS[1]);
  });

  it("drains the minion HP pool before the titan while any minion is alive", () => {
    const state = createBattleStateForLevel(LEVEL_FEMALE);
    const minionHp = 500;
    state.titan.minions = [
      { id: 1, hp: minionHp, maxHp: minionHp },
      { id: 2, hp: minionHp, maxHp: minionHp },
    ];
    state.titan.quirkTimerMs = 99999; // don't let a respawn interfere with this tick

    const structures = [makeStructure({ level: 1 })]; // 450 dmg, less than combined minion hp
    const { state: next } = tickBattle(state, structures);

    expect(next.titan.hp).toBe(state.titan.hp); // she remains unscathed
    const remainingMinionHp = next.titan.minions.reduce((sum, m) => sum + m.hp, 0);
    expect(remainingMinionHp).toBe(minionHp * 2 - 450);
  });

  it("spills remaining damage to the titan once both minions are dead", () => {
    const state = createBattleStateForLevel(LEVEL_FEMALE);
    const minionHp = 100;
    state.titan.minions = [
      { id: 1, hp: minionHp, maxHp: minionHp },
      { id: 2, hp: minionHp, maxHp: minionHp },
    ];
    state.titan.quirkTimerMs = 99999;

    const structures = [makeStructure({ level: 1 })]; // 450 dmg > 200 combined minion hp
    const { state: next } = tickBattle(state, structures);

    expect(next.titan.minions).toHaveLength(0);
    expect(next.titan.hp).toBe(state.titan.hp - (450 - minionHp * 2));
  });

  it("holds at the final timer interval after the third trigger", () => {
    const state = createBattleStateForLevel(LEVEL_FEMALE);
    state.titan.quirkTriggerCount = 3;
    state.titan.quirkTimerMs = TICK_MS;
    const { state: next } = tickBattle(state, []);
    expect(next.titan.quirkTimerMs).toBe(FEMALE_TIMER_SEQUENCE_MS[FEMALE_TIMER_SEQUENCE_MS.length - 1]);
  });
});

describe("Beast class quirk", () => {
  it("strikes the nearest lane-column structure at or ahead of the titan's row on a fixed 8s interval", () => {
    const state = createBattleStateForLevel(LEVEL_BEAST);
    state.titan.quirkTimerMs = TICK_MS;
    const near = makeStructure({ id: "near", gridX: LANE_GRID_COLUMN, gridY: 0, durability: 800, maxDurability: 800 });
    const far = makeStructure({ id: "far", gridX: LANE_GRID_COLUMN, gridY: 5, durability: 800, maxDurability: 800 });
    const offColumn = makeStructure({
      id: "off-column",
      gridX: LANE_GRID_COLUMN + 2,
      gridY: 0,
      durability: 800,
      maxDurability: 800,
    });

    const { state: next, structures, quirkEvents } = tickBattle(state, [near, far, offColumn]);

    expect(quirkEvents.beastAttackTargetId).toBe("near");
    expect(structures.find((s) => s.id === "near")!.durability).toBeLessThan(800);
    expect(structures.find((s) => s.id === "far")!.durability).toBe(800);
    expect(structures.find((s) => s.id === "off-column")!.durability).toBe(800);
    expect(next.titan.quirkTimerMs).toBe(BEAST_ATTACK_INTERVAL_MS); // fixed, no escalation
  });

  it("does not attack when the lane column has no structures", () => {
    const state = createBattleStateForLevel(LEVEL_BEAST);
    state.titan.quirkTimerMs = TICK_MS;
    const { quirkEvents } = tickBattle(state, []);
    expect(quirkEvents.beastAttackTargetId).toBeNull();
  });
});

describe("Colossus class quirk", () => {
  it("deals proximity-scaled chip damage to every non-destroyed structure each tick without touching its own hp", () => {
    const state = createBattleStateForLevel(LEVEL_COLOSSUS);
    state.distanceRemaining = state.totalDistance * 0.5;
    const structures = [
      // FARM has no cooldownTicks, so it never fires back at the titan — isolates the radioactive effect.
      makeStructure({ id: "a", type: "FARM", durability: 100000, maxDurability: 100000, condition: "Intact" }),
      makeStructure({ id: "destroyed", type: "FARM", condition: "Destroyed", durability: 0 }),
    ];

    const { state: next, structures: nextStructures } = tickBattle(state, structures);

    expect(nextStructures.find((s) => s.id === "a")!.durability).toBeLessThan(100000);
    expect(nextStructures.find((s) => s.id === "destroyed")!.durability).toBe(0);
    expect(next.titan.hp).toBe(state.titan.hp);
  });

  it("scales radioactive damage up as the titan gets closer to the wall", () => {
    const far = createBattleStateForLevel(LEVEL_COLOSSUS);
    far.distanceRemaining = far.totalDistance * 0.9;
    const near = createBattleStateForLevel(LEVEL_COLOSSUS);
    near.distanceRemaining = near.totalDistance * 0.1;

    const { structures: farResult } = tickBattle(far, [makeStructure({ id: "s", durability: 1000000, maxDurability: 1000000 })]);
    const { structures: nearResult } = tickBattle(near, [makeStructure({ id: "s", durability: 1000000, maxDurability: 1000000 })]);

    const farDamage = 1000000 - farResult[0].durability;
    const nearDamage = 1000000 - nearResult[0].durability;
    expect(nearDamage).toBeGreaterThan(farDamage);
  });
});

describe("Level-scaled defense cooldown/damage tradeoff", () => {
  it("a higher-level structure fires less often but deals more damage per shot than a level 1 structure of the same type", () => {
    const makeSurvivableState = () => {
      const base = createBattleStateForLevel(1);
      return { ...base, titan: { ...base.titan, hp: 10_000_000, maxHp: 10_000_000 } };
    };

    const runFor20Ticks = (structureLevel: number) => {
      let battle = makeSurvivableState();
      let structures = [makeStructure({ level: structureLevel })];
      let shots = 0;
      let damage = 0;
      for (let i = 0; i < 20; i++) {
        const before = battle.titan.hp;
        const result = tickBattle(battle, structures);
        battle = result.state;
        structures = result.structures;
        if (result.firedStructureIds.length > 0) {
          shots++;
          damage += before - battle.titan.hp;
        }
      }
      return { shots, damage };
    };

    const low = runFor20Ticks(1);
    const high = runFor20Ticks(5);

    expect(high.shots).toBeLessThan(low.shots);
    expect(high.damage / high.shots).toBeGreaterThan(low.damage / low.shots);
  });
});
