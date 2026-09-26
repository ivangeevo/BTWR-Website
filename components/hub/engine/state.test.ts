import { describe, expect, it } from "vitest";
import { defaultEngineState, engineOnPrestige, normalizeEngineState } from "./state";
import { stageTitle } from "./stages";

describe("normalizeEngineState", () => {
  it("fills missing nested fields over defaults", () => {
    const e = normalizeEngineState({ stage: 5, counters: { cranks: 3 }, ciphers: { solved: ["bp-windmill"] } });
    expect(e.stage).toBe(5);
    expect(e.counters.cranks).toBe(3);
    expect(e.counters.pops).toBe(0);
    expect(e.ciphers.solved).toEqual(["bp-windmill", "bp-handCrank", "bp-millstone"]);
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

  it("keeps an old save's crank, grows its grid and disengages it", () => {
    const crank = { uid: "c", type: "handCrank", rot: 1 };
    const gearbox = { uid: "g", type: "gearbox", rot: 3 };
    const e = normalizeEngineState({
      stage: 4,
      blueprints: ["handCrank", "windmill"],
      ciphers: { solved: ["bp-handCrank", "bp-windmill"], current: null },
      inventory: { axle: 2 },
      grid: { w: 3, h: 3, cells: [null, null, null, crank, gearbox, null, null, null, null], clutch: true, rev: 4 },
      solved: { idle: { corePU: 0, supplyPU: 1, powered: [], broken: [], warnings: [], sources: [] }, cranked: { corePU: 0, supplyPU: 1, powered: [], broken: [], warnings: [], sources: [] }, boosted: { corePU: 0, supplyPU: 1, powered: [], broken: [], warnings: [], sources: [] }, rev: 4 },
    });
    expect(e.blueprints).toEqual(["handCrank", "windmill", "millstone"]);
    expect(e.ciphers.solved).toEqual(["bp-handCrank", "bp-windmill", "bp-millstone"]);
    expect(e.grid.w).toBe(5);
    expect(e.grid.cells).toHaveLength(25);
    expect(e.grid.cells[1 * 5 + 0]?.uid).toBe("c");
    expect(e.grid.cells[1 * 5 + 1]?.uid).toBe("g");
    expect(e.grid.clutch).toBe(false);
    expect(e.solved).toBeNull();
    expect(e.inventory).toEqual({ axle: 2 });
  });

  it("gives a Stage 4+ body without a crank one for the tray", () => {
    const e = normalizeEngineState({ stage: 5, inventory: { millstone: 1 }, grid: { w: 6, h: 6, cells: Array(36).fill(null), clutch: false, rev: 1 } });
    expect(e.inventory).toEqual({ millstone: 1, handCrank: 1 });
    expect(e.blueprints).toEqual(expect.arrayContaining(["handCrank", "millstone"]));
  });

  it("leaves a Stage 3 cipher in progress alone", () => {
    const e = normalizeEngineState({ stage: 3, ciphers: { solved: [], current: { id: "bp-handCrank", kind: "sub" } } });
    expect(e.ciphers.current?.id).toBe("bp-handCrank");
    expect(e.blueprints).toEqual([]);
  });

  it("keeps an up-to-date body and its cached solve", () => {
    const cells = Array.from({ length: 25 }, (_, i) => (i === 0 ? { uid: "c", type: "handCrank", rot: 0 } : null));
    const e = normalizeEngineState({
      stage: 4,
      blueprints: ["handCrank", "millstone"],
      ciphers: { solved: ["bp-handCrank", "bp-millstone"] },
      inventory: { millstone: 1 },
      grid: { w: 5, h: 5, cells, clutch: true, rev: 7 },
      solved: { idle: { corePU: 0, supplyPU: 1, powered: [], broken: [], warnings: [], sources: [], grinding: 0 }, cranked: { corePU: 0, supplyPU: 1, powered: [], broken: [], warnings: [], sources: [], grinding: 1 }, rev: 7 },
    });
    expect(e.grid.rev).toBe(7);
    expect(e.grid.clutch).toBe(true);
    expect(e.solved?.rev).toBe(7);
    expect(e.solved?.cranked.grinding).toBe(1);
    expect(e.inventory).toEqual({ millstone: 1 });
  });

  it("drops a solve cached before power had to reach the core, and disengages", () => {
    const cells = Array.from({ length: 25 }, (_, i) => (i === 0 ? { uid: "c", type: "handCrank", rot: 0 } : null));
    const old = { corePU: 0, supplyPU: 1, powered: [], broken: [], warnings: [], grinding: 0, sources: [{ uid: "c", type: "handCrank", pu: 1 }] };
    const e = normalizeEngineState({
      stage: 4,
      blueprints: ["handCrank", "millstone"],
      ciphers: { solved: ["bp-handCrank", "bp-millstone"] },
      grid: { w: 5, h: 5, cells, clutch: true, rev: 7 },
      solved: { idle: old, cranked: old, rev: 7 },
    });
    expect(e.solved).toBeNull();
    expect(e.grid.clutch).toBe(false);
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
      blueprints: ["millstone" as const],
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
    expect(p.blueprints).toEqual(["millstone"]);
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
