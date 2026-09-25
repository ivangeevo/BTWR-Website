import { describe, expect, it } from "vitest";
import { defaultEngineState, engineOnPrestige, normalizeEngineState } from "./state";
import { stageTitle } from "./stages";

describe("normalizeEngineState", () => {
  it("fills missing nested fields over defaults", () => {
    const e = normalizeEngineState({ stage: 5, counters: { cranks: 3 }, ciphers: { solved: ["bp-handCrank"] } });
    expect(e.stage).toBe(5);
    expect(e.counters.cranks).toBe(3);
    expect(e.counters.pops).toBe(0);
    expect(e.ciphers.solved).toEqual(["bp-handCrank"]);
    expect(e.ciphers.keyFragments).toEqual([]);
    expect(e.solvesByKind.modFact).toBe(0);
  });

  it("clamps bad stages and survives garbage", () => {
    expect(normalizeEngineState({ stage: 42 }).stage).toBe(8);
    expect(normalizeEngineState(null).stage).toBe(1);
    expect(normalizeEngineState("nope").insight).toBe(0);
  });

  it("repairs a grid whose cell count doesn't match its size", () => {
    const e = normalizeEngineState({ grid: { w: 3, h: 3, cells: [null], clutch: true, rev: 2 } });
    expect(e.grid.cells).toHaveLength(9);
  });
});

describe("engineOnPrestige", () => {
  it("keeps the mind, dismantles the body, bumps the Mark", () => {
    const e = {
      ...defaultEngineState(),
      stage: 6 as const,
      insight: 1234,
      lifetimeInsight: 99999,
      research: ["r-crank-1"],
      journal: ["hello"],
      blueprints: ["handCrank" as const],
      components: { hopper: 12 },
      inventory: { axle: 3 },
      grid: { w: 1, h: 1, cells: [{ uid: "a", type: "axle" as const, rot: 0 as const }], clutch: true, rev: 1 },
    };
    const p = engineOnPrestige(e, "2026-09-01T00:00:00.000Z");
    expect(p.mark).toBe(2);
    expect(p.insight).toBe(1234);
    expect(p.lifetimeInsight).toBe(99999);
    expect(p.research).toEqual(["r-crank-1"]);
    expect(p.journal).toEqual(["hello"]);
    expect(p.blueprints).toEqual(["handCrank"]);
    expect(p.stage).toBe(6);
    expect(p.components).toEqual({});
    expect(p.inventory).toEqual({});
    expect(p.grid.cells).toEqual([null]);
    expect(p.grid.clutch).toBe(false);
    expect(p.solved).toBeNull();
  });

  it("no Mark without a body yet", () => {
    expect(engineOnPrestige({ ...defaultEngineState(), stage: 3 }, "x").mark).toBe(1);
  });
});

describe("stageTitle", () => {
  it("renames at 4 and 5, with Marks", () => {
    expect(stageTitle(1, 1)).toBe("Ponder");
    expect(stageTitle(4, 1)).toBe("The Contraption");
    expect(stageTitle(5, 1)).toBe("The Analytical Engine");
    expect(stageTitle(8, 3)).toBe("The Analytical Engine, Mark III");
  });
});
