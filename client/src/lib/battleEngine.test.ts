import { describe, it, expect } from "vitest";
import {
  getBossStatsForLevel,
  createTitanForLevel,
  createBattleStateForLevel,
  tickBattle,
} from "./battleEngine";
import { PlacedStructure } from "../components/CityCanvas";
import { BASE_BOSS_HP, BASE_TITAN_SPEED, BASE_LANE_DISTANCE } from "./constants";

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

  it("compounds HP by 70% each level", () => {
    const l1 = getBossStatsForLevel(1).hp;
    const l2 = getBossStatsForLevel(2).hp;
    expect(l2).toBeCloseTo(l1 * 1.7, 0);
  });

  it("has no cap: HP keeps climbing at very high levels with no NaN/overflow", () => {
    const l10 = getBossStatsForLevel(10).hp;
    const l50 = getBossStatsForLevel(50).hp;
    expect(Number.isFinite(l10)).toBe(true);
    expect(Number.isFinite(l50)).toBe(true);
    expect(l50).toBeGreaterThan(l10);
    expect(l10).toBeCloseTo(BASE_BOSS_HP * Math.pow(1.7, 9), -1);
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
    const state = createBattleStateForLevel(1);
    let structures = [makeStructure({ level: 1 })];
    let battle = state;

    const tick1 = tickBattle(battle, structures);
    battle = tick1.state;
    structures = tick1.structures;
    expect(battle.titan.hp).toBe(state.titan.hp - 450); // fired tick 1

    const tick2 = tickBattle(battle, structures);
    battle = tick2.state;
    structures = tick2.structures;
    expect(battle.titan.hp).toBe(tick1.state.titan.hp); // cooling down, no fire tick 2

    const tick3 = tickBattle(battle, structures);
    expect(tick3.state.titan.hp).toBe(battle.titan.hp - 450); // fires again tick 3 (cooldownTicks=2)
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
